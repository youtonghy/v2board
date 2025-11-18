<?php

namespace App\Http\Controllers\V1\Passport;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Sso\CasdoorService;
use App\Utils\CacheKey;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SsoController extends Controller
{
    private const MODE_LOGIN = 'login';
    private const MODE_BIND = 'bind';

    public function init(Request $request, CasdoorService $casdoorService)
    {
        $this->assertSsoEnabled();

        $redirect = $this->sanitizeRedirect($request->input('redirect'));
        return $this->respondAuthorizeUrl($casdoorService, [
            'redirect' => $redirect,
            'mode' => self::MODE_LOGIN,
        ]);
    }

    public function bindInit(Request $request, CasdoorService $casdoorService)
    {
        $this->assertSsoEnabled();

        return $this->respondAuthorizeUrl($casdoorService, [
            'mode' => self::MODE_BIND,
            'user_id' => $request->user['id'],
        ]);
    }

    public function callback(Request $request, CasdoorService $casdoorService)
    {
        $this->assertSsoEnabled();

        if ($error = $request->input('error')) {
            return $this->redirectFlowError([], $request->input('error_description', $error));
        }

        $state = (string)$request->input('state');
        $code = (string)$request->input('code');
        if ($state === '' || $code === '') {
            return $this->redirectFlowError([], '缺少必要的授权参数');
        }

        $statePayload = Cache::pull($this->stateCacheKey($state));
        if (!$statePayload) {
            return $this->redirectToLoginError('登录请求已失效，请重试');
        }

        try {
            $tokenData = $casdoorService->exchangeCode($code);
        } catch (\Throwable $e) {
            return $this->redirectFlowError($statePayload, $e->getMessage());
        }

        $accessToken = $tokenData['access_token'] ?? null;
        if (!$accessToken) {
            return $this->redirectFlowError($statePayload, 'SSO 返回的令牌无效');
        }

        try {
            $profile = $casdoorService->fetchUserInfo($accessToken);
        } catch (\Throwable $e) {
            return $this->redirectFlowError($statePayload, $e->getMessage());
        }

        $mode = $statePayload['mode'] ?? self::MODE_LOGIN;
        if ($mode === self::MODE_BIND) {
            return $this->handleBindCallback($statePayload, $profile);
        }

        $user = $this->findOrCreateUser($profile);
        if ($user->banned) {
            return $this->redirectToLoginError(__('Your account has been suspended'));
        }

        $user->last_login_at = time();
        $user->save();

        $verify = Helper::guid();
        Cache::put(CacheKey::get('TEMP_TOKEN', $verify), $user->id, 120);
        $redirect = $statePayload['redirect'] ?? 'dashboard';

        return redirect()->to($this->buildSpaLoginUrl($verify, $redirect));
    }

    protected function respondAuthorizeUrl(CasdoorService $casdoorService, array $payload)
    {
        $state = Helper::guid();
        $nonce = Helper::guid();
        $payload['nonce'] = $nonce;
        $payload['created_at'] = time();
        Cache::put($this->stateCacheKey($state), $payload, 300);

        try {
            $url = $casdoorService->getAuthorizeUrl($state, $nonce);
        } catch (\Throwable $e) {
            Cache::forget($this->stateCacheKey($state));
            abort(500, $e->getMessage());
        }

        return response([
            'data' => [
                'url' => $url
            ]
        ]);
    }

    protected function handleBindCallback(array $statePayload, array $profile)
    {
        $userId = (int)($statePayload['user_id'] ?? 0);
        if ($userId <= 0) {
            return $this->redirectToProfileError('绑定信息已失效，请重试');
        }
        $user = User::find($userId);
        if (!$user) {
            return $this->redirectToProfileError('用户不存在或已删除');
        }
        $subject = $this->extractSubject($profile);
        if ($subject === '') {
            return $this->redirectToProfileError('SSO 返回的用户标识为空，无法完成绑定');
        }
        try {
            $this->attachSubjectToUser($user, $subject);
        } catch (\Throwable $e) {
            return $this->redirectToProfileError($e->getMessage());
        }
        return $this->redirectToProfileSuccess('SSO 绑定成功');
    }

    protected function findOrCreateUser(array $profile): User
    {
        $subject = $this->extractSubject($profile);
        $user = null;
        if ($subject !== '') {
            $user = User::where('sso_provider', 'casdoor')
                ->where('sso_subject', $subject)
                ->first();
        }

        $email = (string)($profile['email'] ?? '');
        if (!$user && $email !== '') {
            $user = User::where('email', $email)->first();
        }

        if ($user) {
            if ($subject !== '' && $user->sso_subject !== $subject) {
                $this->attachSubjectToUser($user, $subject);
            }
            return $user;
        }

        if ((int)config('v2board.sso_auto_register', 1) !== 1) {
            abort(403, __('SSO账号尚未绑定，请先在个人中心绑定后再登录'));
        }

        if ($email === '') {
            abort(500, 'SSO 未返回邮箱地址，无法完成登录');
        }

        return $this->createUserFromProfile($profile, $subject);
    }

    protected function createUserFromProfile(array $profile, string $subject): User
    {
        $user = new User();
        $user->email = (string)$profile['email'];
        $user->password = password_hash(Str::random(48), PASSWORD_DEFAULT);
        $user->uuid = Helper::guid(true);
        $user->token = Helper::guid();
        $user->remarks = 'SSO:' . ($profile['name'] ?? $profile['preferred_username'] ?? 'casdoor');
        if ($subject !== '') {
            $user->sso_provider = 'casdoor';
            $user->sso_subject = $subject;
        }
        $user->save();
        return $user;
    }

    protected function attachSubjectToUser(User $user, string $subject): void
    {
        if (User::where('sso_provider', 'casdoor')
            ->where('sso_subject', $subject)
            ->where('id', '!=', $user->id)
            ->exists()
        ) {
            throw new \RuntimeException('该 SSO 账户已绑定其他用户');
        }
        $user->sso_provider = 'casdoor';
        $user->sso_subject = $subject;
        $user->save();
    }

    protected function extractSubject(array $profile): string
    {
        return trim((string)($profile['sub'] ?? $profile['id'] ?? ''));
    }

    protected function sanitizeRedirect(?string $redirect): string
    {
        $redirect = trim((string)$redirect);
        if ($redirect === '' || strlen($redirect) > 128 || preg_match('/^https?:/i', $redirect)) {
            return 'dashboard';
        }
        return $redirect;
    }

    protected function buildSpaLoginUrl(string $verify, ?string $redirect): string
    {
        $path = '/#/login?verify=' . urlencode($verify);
        if ($redirect) {
            $path .= '&redirect=' . urlencode($redirect);
        }

        if ($appUrl = config('v2board.app_url')) {
            return rtrim($appUrl, '/') . $path;
        }

        return url($path);
    }

    protected function redirectToLoginError(string $message)
    {
        $message = $this->normalizeMessage($message, '单点登录失败，请重试');
        $target = '/#/login?sso_error=' . urlencode($message);
        if ($appUrl = config('v2board.app_url')) {
            return redirect()->to(rtrim($appUrl, '/') . $target);
        }
        return redirect()->to(url($target));
    }

    protected function redirectToProfileSuccess(string $message)
    {
        $message = $this->normalizeMessage($message, 'SSO 绑定成功');
        return $this->redirectToProfile('sso_message', $message);
    }

    protected function redirectToProfileError(string $message)
    {
        $message = $this->normalizeMessage($message, 'SSO 绑定失败，请重试');
        return $this->redirectToProfile('sso_error', $message);
    }

    protected function redirectToProfile(string $key, string $message)
    {
        $target = '/#/profile?' . $key . '=' . urlencode($message);
        if ($appUrl = config('v2board.app_url')) {
            return redirect()->to(rtrim($appUrl, '/') . $target);
        }
        return redirect()->to(url($target));
    }

    protected function stateCacheKey(string $state): string
    {
        return CacheKey::get('SSO_STATE', $state);
    }

    protected function assertSsoEnabled(): void
    {
        if ((int)config('v2board.sso_login_enable', 0) !== 1) {
            abort(404);
        }
        if (config('v2board.sso_provider', 'casdoor') !== 'casdoor') {
            abort(400, '当前仅支持 Casdoor SSO');
        }
    }

    protected function redirectFlowError(array $statePayload, string $message)
    {
        $mode = $statePayload['mode'] ?? self::MODE_LOGIN;
        if ($mode === self::MODE_BIND) {
            return $this->redirectToProfileError($message);
        }
        return $this->redirectToLoginError($message);
    }

    protected function normalizeMessage(string $message, string $fallback): string
    {
        $message = trim($message);
        if ($message === '') {
            $message = $fallback;
        }
        return mb_substr($message, 0, 120);
    }
}
