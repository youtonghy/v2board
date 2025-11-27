<?php

namespace App\Http\Controllers\V1\Passport;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Sso\CasdoorService;
use App\Utils\CacheKey;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class SsoController extends Controller
{
    private const MODE_LOGIN = 'login';
    private const MODE_BIND = 'bind';

    // Rate limiting constants
    private const SSO_INIT_RATE_LIMIT = 10;     // max requests
    private const SSO_INIT_RATE_DECAY = 60;     // per minute
    private const SSO_CALLBACK_RATE_LIMIT = 20;
    private const SSO_CALLBACK_RATE_DECAY = 60;

    public function init(Request $request, CasdoorService $casdoorService)
    {
        $this->assertSsoEnabled();
        $this->checkRateLimit('sso_init', $request->ip(), self::SSO_INIT_RATE_LIMIT, self::SSO_INIT_RATE_DECAY);

        $redirect = $this->sanitizeRedirect($request->input('redirect'));
        return $this->respondAuthorizeUrl($casdoorService, $request, [
            'redirect' => $redirect,
            'mode' => self::MODE_LOGIN,
        ]);
    }

    public function bindInit(Request $request, CasdoorService $casdoorService)
    {
        $this->assertSsoEnabled();
        $this->checkRateLimit('sso_bind_init', $request->ip(), self::SSO_INIT_RATE_LIMIT, self::SSO_INIT_RATE_DECAY);

        return $this->respondAuthorizeUrl($casdoorService, $request, [
            'mode' => self::MODE_BIND,
            'user_id' => $request->user['id'],
        ]);
    }

    public function callback(Request $request, CasdoorService $casdoorService)
    {
        $this->assertSsoEnabled();
        $this->checkRateLimit('sso_callback', $request->ip(), self::SSO_CALLBACK_RATE_LIMIT, self::SSO_CALLBACK_RATE_DECAY);

        if ($error = $request->input('error')) {
            Log::warning('SSO callback error', ['error' => $error, 'ip' => $request->ip()]);
            return $this->redirectFlowError([], $request->input('error_description', $error));
        }

        $state = (string)$request->input('state');
        $code = (string)$request->input('code');
        if ($state === '' || $code === '') {
            Log::warning('SSO callback missing params', ['ip' => $request->ip()]);
            return $this->redirectFlowError([], '缺少必要的授权参数');
        }

        $statePayload = Cache::pull($this->stateCacheKey($state));
        if (!$statePayload) {
            Log::warning('SSO callback invalid state', ['state' => $state, 'ip' => $request->ip()]);
            return $this->redirectToLoginError('登录请求已失效，请重试');
        }

        // Verify IP address binding for security
        $boundIp = $statePayload['ip'] ?? null;
        if ($boundIp && $boundIp !== $request->ip()) {
            Log::warning('SSO callback IP mismatch', [
                'bound_ip' => $boundIp,
                'request_ip' => $request->ip(),
            ]);
            return $this->redirectFlowError($statePayload, '请求来源IP不匹配，请重新登录');
        }

        // Verify state hasn't expired (extra check beyond cache TTL)
        $createdAt = $statePayload['created_at'] ?? 0;
        if (time() - $createdAt > 300) {
            Log::warning('SSO callback state expired', ['created_at' => $createdAt]);
            return $this->redirectFlowError($statePayload, '登录请求已过期，请重试');
        }

        try {
            $tokenData = $casdoorService->exchangeCode($code);
        } catch (\Throwable $e) {
            Log::error('SSO token exchange failed', ['error' => $e->getMessage()]);
            return $this->redirectFlowError($statePayload, $e->getMessage());
        }

        $accessToken = $tokenData['access_token'] ?? null;
        if (!$accessToken) {
            return $this->redirectFlowError($statePayload, 'SSO 返回的令牌无效');
        }

        try {
            $profile = $casdoorService->fetchUserInfo($accessToken);
        } catch (\Throwable $e) {
            Log::error('SSO user info fetch failed', ['error' => $e->getMessage()]);
            return $this->redirectFlowError($statePayload, $e->getMessage());
        }

        // Verify nonce if present in token (for OpenID Connect)
        $expectedNonce = $statePayload['nonce'] ?? null;
        if ($expectedNonce && isset($profile['nonce']) && $profile['nonce'] !== $expectedNonce) {
            Log::warning('SSO nonce mismatch', [
                'expected' => $expectedNonce,
                'received' => $profile['nonce'] ?? 'null'
            ]);
            return $this->redirectFlowError($statePayload, '安全验证失败，请重试');
        }

        $mode = $statePayload['mode'] ?? self::MODE_LOGIN;
        if ($mode === self::MODE_BIND) {
            return $this->handleBindCallback($statePayload, $profile);
        }

        $user = $this->findOrCreateUser($profile);
        if ($user->banned) {
            Log::info('SSO login attempt by banned user', ['user_id' => $user->id]);
            return $this->redirectToLoginError(__('Your account has been suspended'));
        }

        $user->last_login_at = time();
        $user->save();

        Log::info('SSO login successful', ['user_id' => $user->id, 'email' => $user->email]);

        $verify = Helper::guid();
        Cache::put(CacheKey::get('TEMP_TOKEN', $verify), $user->id, 120);
        $redirect = $statePayload['redirect'] ?? 'dashboard';

        return redirect()->to($this->buildSpaLoginUrl($verify, $redirect));
    }

    protected function respondAuthorizeUrl(CasdoorService $casdoorService, Request $request, array $payload)
    {
        $state = Helper::guid();
        $nonce = Helper::guid();
        $payload['nonce'] = $nonce;
        $payload['created_at'] = time();
        // Bind IP address to prevent CSRF
        $payload['ip'] = $request->ip();
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
        Log::info('SSO bind successful', ['user_id' => $userId, 'subject' => $subject]);
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

        // SECURITY FIX: Default to disabled auto-registration (0)
        if ((int)config('v2board.sso_auto_register', 0) !== 1) {
            abort(403, __('SSO账号尚未绑定，请先在个人中心绑定后再登录'));
        }

        if ($email === '') {
            abort(500, 'SSO 未返回邮箱地址，无法完成登录');
        }

        Log::info('SSO auto-register new user', ['email' => $email, 'subject' => $subject]);
        return $this->createUserFromProfile($profile, $subject);
    }

    protected function createUserFromProfile(array $profile, string $subject): User
    {
        $user = new User();
        $user->email = (string)$profile['email'];
        // Use Laravel's Hash facade for consistency
        $user->password = Hash::make(Str::random(48));
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

    /**
     * Check rate limit for SSO operations
     */
    protected function checkRateLimit(string $key, string $ip, int $maxAttempts, int $decaySeconds): void
    {
        $rateLimitKey = $key . ':' . $ip;

        if (RateLimiter::tooManyAttempts($rateLimitKey, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            Log::warning('SSO rate limit exceeded', ['key' => $key, 'ip' => $ip]);
            abort(429, "请求过于频繁，请在 {$seconds} 秒后重试");
        }

        RateLimiter::hit($rateLimitKey, $decaySeconds);
    }
}
