<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RestrictSubscribeAccess
{
    public function handle(Request $request, Closure $next)
    {
        $subscribeUrls = config('v2board.subscribe_url');
        if (empty($subscribeUrls)) {
            return $next($request);
        }

        $mappings = $this->buildHostMappings($subscribeUrls);
        if (empty($mappings)) {
            return $next($request);
        }

        $requestHost = strtolower($request->getHost());
        $requestPort = (int)$request->getPort();
        $matchedHosts = array_filter($mappings, function (array $mapping) use ($requestHost, $requestPort) {
            if ($mapping['host'] !== $requestHost) {
                return false;
            }

            if (!is_null($mapping['port']) && (int)$mapping['port'] !== $requestPort) {
                return false;
            }

            return true;
        });

        if (empty($matchedHosts)) {
            return $next($request);
        }

        $currentPath = $request->getPathInfo();
        foreach ($matchedHosts as $mapping) {
            if ($this->pathsMatch($currentPath, $mapping['path'])) {
                return $next($request);
            }
        }

        abort(404);
    }

    private function buildHostMappings(string $subscribeUrls): array
    {
        $urls = preg_split('/[\s,]+/', $subscribeUrls, -1, PREG_SPLIT_NO_EMPTY);
        if (empty($urls)) {
            return [];
        }

        $subscribePath = config('v2board.subscribe_path', '/api/v1/client/subscribe');
        if (empty($subscribePath)) {
            $subscribePath = '/api/v1/client/subscribe';
        }
        $subscribePath = '/' . ltrim($subscribePath, '/');

        $mappings = [];
        foreach ($urls as $url) {
            $parsed = parse_url($url);
            if (!isset($parsed['host'])) {
                $parsed = parse_url('http://' . ltrim($url));
            }
            if (!isset($parsed['host'])) {
                continue;
            }

            $basePath = '';
            if (!empty($parsed['path'])) {
                $trimmedPath = trim($parsed['path'], '/');
                $basePath = $trimmedPath !== '' ? '/' . $trimmedPath : '';
            }

            $mappings[] = [
                'host' => strtolower($parsed['host']),
                'port' => $parsed['port'] ?? null,
                'path' => $this->normalizePath($basePath, $subscribePath),
            ];
        }

        return $mappings;
    }

    private function normalizePath(string $basePath, string $subscribePath): string
    {
        $fullPath = $basePath . $subscribePath;
        $fullPath = preg_replace('#/+#', '/', $fullPath);
        return $fullPath === '' ? '/' : $fullPath;
    }

    private function pathsMatch(string $currentPath, string $allowedPath): bool
    {
        $normalize = function (string $path): string {
            $path = preg_replace('#/+#', '/', $path);
            $trimmed = trim($path, '/');
            return $trimmed === '' ? '/' : '/' . $trimmed;
        };

        return $normalize($currentPath) === $normalize($allowedPath);
    }
}
