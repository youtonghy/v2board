<?php

namespace App\Utils;

use Illuminate\Support\Facades\Cache;
use Throwable;

class ResilientCache
{
    private const FALLBACK_STORE = 'file';

    public static function get(string $key, $default = null)
    {
        try {
            return Cache::get($key, $default);
        } catch (Throwable $exception) {
            return Cache::store(self::FALLBACK_STORE)->get($key, $default);
        }
    }

    public static function put(string $key, $value, $ttl = null): bool
    {
        try {
            return Cache::put($key, $value, $ttl);
        } catch (Throwable $exception) {
            return Cache::store(self::FALLBACK_STORE)->put($key, $value, $ttl);
        }
    }

    public static function has(string $key): bool
    {
        try {
            return Cache::has($key);
        } catch (Throwable $exception) {
            return Cache::store(self::FALLBACK_STORE)->has($key);
        }
    }

    public static function forget(string $key): bool
    {
        try {
            return Cache::forget($key);
        } catch (Throwable $exception) {
            return Cache::store(self::FALLBACK_STORE)->forget($key);
        }
    }
}
