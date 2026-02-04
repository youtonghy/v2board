<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class DynamicThrottle
{
    private const WINDOW_SECONDS = 120;

    public function handle(Request $request, Closure $next, string $scope = 'ip')
    {
        $limit = $this->resolveLimit($scope);
        if ($limit <= 0) {
            return $next($request);
        }

        $key = $this->buildKey($request, $scope);
        if (RateLimiter::tooManyAttempts($key, $limit)) {
            abort(429, __('Too many requests, please try again later.'));
        }
        RateLimiter::hit($key, self::WINDOW_SECONDS);

        return $next($request);
    }

    private function resolveLimit(string $scope): int
    {
        if ($scope === 'gateway') {
            return (int)config('v2board.rate_limit_gateway', 0);
        }
        return (int)config('v2board.rate_limit_ip', 0);
    }

    private function buildKey(Request $request, string $scope): string
    {
        $ip = $request->ip() ?: 'unknown';
        return 'dynamic_throttle:' . $scope . ':' . $ip;
    }
}
