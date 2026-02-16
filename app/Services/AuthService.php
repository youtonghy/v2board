<?php

namespace App\Services;

use App\Utils\CacheKey;
use App\Utils\Helper;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;

class AuthService
{
    private const AUTH_DATA_EXPIRE_SECONDS = 7 * 24 * 60 * 60;

    private $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function generateAuthData(Request $request)
    {
        $now = time();
        $exp = $now + self::AUTH_DATA_EXPIRE_SECONDS;
        $guid = Helper::guid();
        $authData = JWT::encode([
            'id' => $this->user->id,
            'session' => $guid,
            'iat' => $now,
            'exp' => $exp,
        ], config('app.key'), 'HS256');
        self::addSession($this->user->id, $guid, [
            'ip' => $request->ip(),
            'login_at' => $now,
            'exp_at' => $exp,
            'ua' => $request->userAgent(),
            'auth_data' => $authData
        ]);
        $this->recordRecentLoginIp($request->ip(), $now);
        return [
            'token' => $this->user->token,
            'is_admin' => $this->user->is_admin,
            'auth_data' => $authData
        ];
    }

    public static function decryptAuthData($jwt)
    {
        try {
            $data = (array)JWT::decode($jwt, new Key(config('app.key'), 'HS256'));
            if (!isset($data['id'], $data['session'], $data['exp'])) return false;

            $now = time();
            $expAt = (int)$data['exp'];
            if ($expAt <= $now) return false;
            if (!self::checkSession((int)$data['id'], (string)$data['session'])) return false;

            if (Cache::has($jwt)) {
                return Cache::get($jwt);
            }

            $user = User::select([
                'id',
                'email',
                'is_admin',
                'is_staff'
            ])
                ->find($data['id']);
            if (!$user) return false;

            $ttl = max(1, min(3600, $expAt - $now));
            Cache::put($jwt, $user->toArray(), $ttl);
            return $user->toArray();
        } catch (\Exception $e) {
            return false;
        }
    }

    private static function checkSession($userId, $session)
    {
        $sessions = (array)Cache::get(CacheKey::get("USER_SESSIONS", $userId), []);
        return isset($sessions[$session]);
    }

    private static function addSession($userId, $guid, $meta)
    {
        $cacheKey = CacheKey::get("USER_SESSIONS", $userId);
        $sessions = (array)Cache::get($cacheKey, []);
        $sessions[$guid] = $meta;
        if (!Cache::put(
            $cacheKey,
            $sessions
        )) return false;
        return true;
    }

    public function getSessions()
    {
        return (array)Cache::get(CacheKey::get("USER_SESSIONS", $this->user->id), []);
    }

    public function removeSession($sessionId)
    {
        $cacheKey = CacheKey::get("USER_SESSIONS", $this->user->id);
        $sessions = (array)Cache::get($cacheKey, []);
        if (isset($sessions[$sessionId]['auth_data'])) {
            Cache::forget($sessions[$sessionId]['auth_data']);
        }
        unset($sessions[$sessionId]);
        if (!Cache::put(
            $cacheKey,
            $sessions
        )) return false;
        return true;
    }

    public function removeAllSession()
    {
        $cacheKey = CacheKey::get("USER_SESSIONS", $this->user->id);
        $sessions = (array)Cache::get($cacheKey, []);
        foreach ($sessions as $guid => $meta) {
            if (isset($meta['auth_data'])) {
                Cache::forget($meta['auth_data']);
            }
        }
        return Cache::forget($cacheKey);
    }

    private function recordRecentLoginIp($ip, $loginAt)
    {
        if ((int)config('v2board.ip_no_log', 0) === 1) {
            return;
        }
        if (!is_string($ip) || $ip === '') {
            return;
        }
        if (!is_int($loginAt)) {
            $loginAt = time();
        }

        $cacheKey = 'RECENT_LOGIN_IPS_30D_USER_' . (int)$this->user->id;
        $recent = Cache::get($cacheKey);
        if (!is_array($recent)) {
            $recent = [];
        }

        $recent[$ip] = $loginAt;

        $cutoff = $loginAt - (60 * 60 * 24 * 30);
        foreach ($recent as $recentIp => $lastSeenAt) {
            if (!is_int($lastSeenAt) || $lastSeenAt < $cutoff) {
                unset($recent[$recentIp]);
            }
        }

        if (count($recent) > 50) {
            arsort($recent);
            $recent = array_slice($recent, 0, 50, true);
        }

        Cache::put($cacheKey, $recent, 60 * 60 * 24 * 31);
    }
}
