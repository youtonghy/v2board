<?php

namespace App\Http\Middleware;

use Closure;

class RequestLog
{
    /**
     * Handle an incoming request.
     *
     * @param \Illuminate\Http\Request $request
     * @param \Closure $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if ($request->method() === 'POST') {
            $path = $request->path();
            try {
                info("POST {$path}");
            } catch (\Throwable $e) {
                // Avoid breaking requests when logging fails (e.g., file permission issues).
            }
        };
        return $next($request);
    }
}
