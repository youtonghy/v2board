<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class DenyApiV3Direct
{
    public function handle(Request $request, Closure $next)
    {
        $path = '/' . ltrim($request->path(), '/');
        $path = rtrim($path, '/');

        if ($path === '/api/v3/server') {
            return $next($request);
        }

        if ($request->attributes->get('v2b_gateway') === true) {
            return $next($request);
        }

        $allowed = [
            '/api/v3/guest/payment/notify',
            '/api/v3/guest/telegram/webhook',
            '/api/v3/passport/auth/thirdPartyLogin',
            '/api/v3/passport/auth/thirdPartyLogin/init',
            '/api/v3/passport/auth/thirdPartyLogin/approve',
            '/api/v3/passport/auth/thirdPartyLogin/reject',
            '/api/v3/passport/auth/thirdPartyLogin/exchange',
        ];

        if (in_array($path, $allowed, true)) {
            return $next($request);
        }

        abort(403, 'Direct API access is disabled');
    }
}
