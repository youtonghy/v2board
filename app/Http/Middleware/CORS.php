<?php

namespace App\Http\Middleware;

use Closure;

class CORS
{
    private const ALLOW_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD';
    private const ALLOW_HEADERS = 'Origin,Content-Type,Accept,Authorization,X-Request-With';
    private const MAX_AGE = '600';

    public function handle($request, Closure $next)
    {
        if (!$request->is('api/*')) {
            return $next($request);
        }

        $origin = $this->normalizeOrigin($request->header('Origin'));
        $isCorsEnabled = (int) config('v2board.cors_separate_frontend_enable', 0) === 1;
        $originAllowed = false;
        if ($isCorsEnabled && !empty($origin)) {
            $originAllowed = in_array($origin, $this->allowedOrigins(), true);
        }

        if ($request->isMethod('OPTIONS') && !empty($origin)) {
            if (!$originAllowed) {
                return response('', 403);
            }
            return $this->withCorsHeaders(response('', 204), $origin);
        }

        $response = $next($request);
        if ($originAllowed) {
            $this->withCorsHeaders($response, $origin);
        }
        return $response;
    }

    private function allowedOrigins(): array
    {
        $origins = config('v2board.cors_allowed_origins', []);
        if (!is_array($origins)) {
            return [];
        }

        $allowed = [];
        foreach ($origins as $item) {
            $origin = $this->normalizeOrigin($item);
            if (!empty($origin)) {
                $allowed[$origin] = true;
            }
        }
        return array_keys($allowed);
    }

    private function normalizeOrigin($origin): ?string
    {
        if (!is_string($origin)) {
            return null;
        }

        $origin = trim($origin);
        if ($origin === '') {
            return null;
        }

        $parts = parse_url($origin);
        if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
            return null;
        }

        $scheme = strtolower($parts['scheme']);
        if (!in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        if (isset($parts['query']) || isset($parts['fragment']) || isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }

        if (isset($parts['path']) && $parts['path'] !== '' && $parts['path'] !== '/') {
            return null;
        }

        $host = strtolower($parts['host']);
        $port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';

        return "{$scheme}://{$host}{$port}";
    }

    private function withCorsHeaders($response, string $origin)
    {
        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Access-Control-Allow-Methods', self::ALLOW_METHODS);
        $response->headers->set('Access-Control-Allow-Headers', self::ALLOW_HEADERS);
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Max-Age', self::MAX_AGE);
        $response->headers->set('Vary', $this->appendVary($response->headers->get('Vary'), 'Origin'));

        return $response;
    }

    private function appendVary(?string $current, string $value): string
    {
        if (empty($current)) {
            return $value;
        }

        $parts = array_filter(array_map('trim', explode(',', $current)));
        $lowerParts = array_map('strtolower', $parts);
        if (!in_array(strtolower($value), $lowerParts, true)) {
            $parts[] = $value;
        }

        return implode(', ', $parts);
    }
}
