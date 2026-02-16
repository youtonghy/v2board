<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\AuthService;
use App\Utils\CacheKey;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AuthServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config()->set('app.key', 'test-app-key');
    }

    public function testGenerateAuthDataContainsSevenDaysExp(): void
    {
        $user = new User();
        $user->id = 1;
        $user->is_admin = 0;
        $user->token = 'subscribe-token';

        $request = Request::create('/api/v1/passport/auth/login', 'POST');
        $request->server->set('REMOTE_ADDR', '127.0.0.1');
        $request->headers->set('User-Agent', 'PHPUnit');

        $authService = new AuthService($user);
        $result = $authService->generateAuthData($request);
        $payload = (array)JWT::decode($result['auth_data'], new Key(config('app.key'), 'HS256'));

        $this->assertArrayHasKey('iat', $payload);
        $this->assertArrayHasKey('exp', $payload);
        $this->assertSame(7 * 24 * 60 * 60, (int)$payload['exp'] - (int)$payload['iat']);
    }

    public function testDecryptAuthDataRejectsLegacyTokenWithoutExp(): void
    {
        $jwt = JWT::encode([
            'id' => 1,
            'session' => 'legacy-session'
        ], config('app.key'), 'HS256');

        Cache::put(CacheKey::get('USER_SESSIONS', 1), [
            'legacy-session' => []
        ], 300);

        $this->assertFalse(AuthService::decryptAuthData($jwt));
    }

    public function testDecryptAuthDataRejectsExpiredToken(): void
    {
        $jwt = JWT::encode([
            'id' => 2,
            'session' => 'expired-session',
            'iat' => time() - 120,
            'exp' => time() - 60
        ], config('app.key'), 'HS256');

        Cache::put(CacheKey::get('USER_SESSIONS', 2), [
            'expired-session' => []
        ], 300);

        $this->assertFalse(AuthService::decryptAuthData($jwt));
    }

    public function testDecryptAuthDataAcceptsValidTokenWithActiveSession(): void
    {
        $jwt = JWT::encode([
            'id' => 3,
            'session' => 'active-session',
            'iat' => time(),
            'exp' => time() + 600
        ], config('app.key'), 'HS256');

        Cache::put(CacheKey::get('USER_SESSIONS', 3), [
            'active-session' => []
        ], 300);
        Cache::put($jwt, [
            'id' => 3,
            'email' => 'user@example.com',
            'is_admin' => 0,
            'is_staff' => 0
        ], 300);

        $this->assertSame([
            'id' => 3,
            'email' => 'user@example.com',
            'is_admin' => 0,
            'is_staff' => 0
        ], AuthService::decryptAuthData($jwt));
    }

    public function testRemoveSessionRevokesAuthDataImmediately(): void
    {
        $jwt = JWT::encode([
            'id' => 4,
            'session' => 'session-to-remove',
            'iat' => time(),
            'exp' => time() + 600
        ], config('app.key'), 'HS256');

        Cache::put(CacheKey::get('USER_SESSIONS', 4), [
            'session-to-remove' => [
                'auth_data' => $jwt
            ]
        ], 300);
        Cache::put($jwt, [
            'id' => 4,
            'email' => 'remove@example.com',
            'is_admin' => 0,
            'is_staff' => 0
        ], 300);

        $user = new User();
        $user->id = 4;
        $authService = new AuthService($user);

        $this->assertTrue($authService->removeSession('session-to-remove'));
        $this->assertFalse(Cache::has($jwt));
        $this->assertFalse(AuthService::decryptAuthData($jwt));
    }
}
