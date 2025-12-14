<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class DenyApiV1
{
    public function handle(Request $request, Closure $next)
    {
        if ((int)config('v2board.api_v1_disable', 0) === 1) {
            abort(403, 'API V1 is disabled');
        }
        return $next($request);
    }
}

