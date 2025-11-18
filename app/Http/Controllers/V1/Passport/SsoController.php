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
    public function init(Request $request, CasdoorService $casdoorService)
    {
        $this->assertSsoEnabled();

        $redirect = $this->sanitizeRedirect($request->input('redirect'));
        $state = Helper::guid();
        $nonce = Helper::guid();
        Cache::put($this->stateCacheKey($state), [
            'redirect' => $redirect,
            'nonce' => $nonce,
            'created_at' => time()
        ], 300);

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

    public function callback(Request $request, CasdoorService $casdoorService)
    {
        $this->assertSsoEnabled();

        if ($error = $request->input('error')) {
            return $this->redirectWithError($request->input('error_description', $error));
        }

        $state = (string)$request->input('state');
        $code = (string)$request->input('code');
        if ($state === '' || $code === '') {
            return $this->redirectWithError('缺少必要的授权参数');
        }

        $statePayload = Cache::pull($this->stateCacheKey($state));
        if (!$statePayload) {
            return $this->redirectWithError('登录请求已失效，请重试');
        }

        try {
            $tokenData = $casdoorService->exchangeCode($code);
        } catch (\Throwable $e) {
            return $this->redirectWithError($e->getMessage());
        }

        $accessToken = $tokenData['access_token'] ?? null;
        if (!$accessToken) {
            return $this->redirectWithError('SSO 返回的令牌无效');
        }

        try {
            $profile = $casdoorService->fetchUserInfo($accessToken);
        } catch (\Throwable $e) {
            return $this->redirectWithError($e->getMessage());
        }

        $user = $this->findOrCreateUser($profile);
        if ($user->banned) {
            return $this->redirectWithError(__('Your account has been suspended'));
        }

        $user->last_login_at = time();
        $user->save();

        $verify = Helper::guid();
        Cache::put(CacheKey::get('TEMP_TOKEN', $verify), $user->id, 120);
        $redirect = $statePayload['redirect'] ?? 'dashboard';

        return redirect()->to($this->buildSpaLoginUrl($verify, $redirect));
    }

    protected function findOrCreateUser(array $profile): User
    {
        $email = (string)($profile['email'] ?? '');
        if ($email === '') {
            abort(500, 'SSO 未返回邮箱地址，无法完成登录');
        }

        $user = User::where('email', $email)->first();
        if ($user) {
            return $user;
        }

        $user = new User();
        $user->email = $email;
        $user->password = password_hash(Str::random(48), PASSWORD_DEFAULT);
        $user->uuid = Helper::guid(true);
        $user->token = Helper::guid();
        $user->remarks = 'SSO:' . ($profile['name'] ?? $profile['preferred_username'] ?? 'casdoor');
        $user->save();
        return $user;
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

    protected function redirectWithError(string $message)
    {
        $message = trim($message);
        if ($message === '') {
            $message = '单点登录失败，请重试';
        }
        $message = mb_substr($message, 0, 120);
        $target = '/#/login?sso_error=' . urlencode($message);
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
}
