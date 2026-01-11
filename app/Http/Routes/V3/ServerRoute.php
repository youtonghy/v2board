<?php
namespace App\Http\Routes\V3;

use Illuminate\Contracts\Routing\Registrar;
use Illuminate\Http\Request;

class ServerRoute
{
    public function map(Registrar $router)
    {
        $router->group([
            'prefix' => 'server'
        ], function ($router) {
            $router->any('', function (Request $request) {
                $payload = $request->json()->all();
                $endpoint = $payload['endpoint'] ?? $request->input('endpoint');
                if (is_string($endpoint) && $endpoint !== '') {
                    $endpoint = ltrim($endpoint, '/');
                    if (
                        $endpoint === 'server' ||
                        str_starts_with($endpoint, 'server/') ||
                        str_contains($endpoint, '..') ||
                        !preg_match('/^[a-zA-Z0-9_\\/-]+$/', $endpoint)
                    ) {
                        abort(404);
                    }

                    $method = strtoupper((string) ($payload['method'] ?? $request->input('method', 'GET')));
                    $allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
                    if (!in_array($method, $allowedMethods, true)) {
                        abort(422, 'method is invalid');
                    }

                    $forwardParams = $payload['params'] ?? $request->input('params');
                    if (is_string($forwardParams) && $forwardParams !== '') {
                        $decoded = json_decode($forwardParams, true);
                        if (is_array($decoded)) {
                            $forwardParams = $decoded;
                        }
                    }
                    if (!is_array($forwardParams)) {
                        $forwardParams = $request->except(['endpoint', 'method', 'params']);
                    }
                    $forwardParams = $this->normalizeParams($forwardParams);

                    $isPublicEndpoint = $this->isPublicEndpoint($endpoint);
                    $uri = '/api/v3/' . $endpoint;

                    $subRequest = Request::create(
                        $uri,
                        $method,
                        $forwardParams,
                        $request->cookies->all(),
                        $request->files->all(),
                        $request->server->all(),
                        ($method === 'GET' || $method === 'HEAD')
                            ? null
                            : json_encode($forwardParams, JSON_UNESCAPED_UNICODE)
                    );
                    $subRequest->headers->replace($request->headers->all());
                    if ($isPublicEndpoint) {
                        $subRequest->headers->remove('authorization');
                    }
                    $subRequest->attributes->set('v2b_gateway', true);

                    if ($method !== 'GET' && $method !== 'HEAD') {
                        $subRequest->headers->set('content-type', 'application/json');
                    } else {
                        $subRequest->headers->remove('content-type');
                    }

                    $originalRequest = app('request');
                    app()->instance('request', $subRequest);
                    try {
                        return app('router')->dispatch($subRequest);
                    } finally {
                        app()->instance('request', $originalRequest);
                    }
                }

                abort(422, 'endpoint is required');
            });
        });
    }

    private function normalizeParams(array $params): array
    {
        $normalized = [];
        foreach ($params as $key => $value) {
            if (is_string($key) && strpos($key, '[') !== false) {
                $this->assignBracketParam($normalized, $key, $value);
                continue;
            }
            if (isset($normalized[$key]) && is_array($normalized[$key]) && is_array($value)) {
                $normalized[$key] = array_replace_recursive($normalized[$key], $value);
                continue;
            }
            $normalized[$key] = $value;
        }
        return $normalized;
    }

    private function assignBracketParam(array &$target, string $key, $value): void
    {
        $segments = explode('[', str_replace(']', '', $key));
        if (!$segments) {
            $target[$key] = $value;
            return;
        }

        $cursor = &$target;
        $lastIndex = count($segments) - 1;
        foreach ($segments as $index => $segment) {
            $isLast = $index === $lastIndex;
            if ($segment === '') {
                $segment = count($cursor);
            } elseif (ctype_digit($segment)) {
                $segment = (int) $segment;
            }

            if ($isLast) {
                $cursor[$segment] = $value;
                return;
            }

            if (!isset($cursor[$segment]) || !is_array($cursor[$segment])) {
                $cursor[$segment] = [];
            }
            $cursor = &$cursor[$segment];
        }
    }

    private function isPublicEndpoint(string $endpoint): bool
    {
        if (str_starts_with($endpoint, 'guest/')) {
            return true;
        }
        if (str_starts_with($endpoint, 'passport/comm/')) {
            return true;
        }
        if (!str_starts_with($endpoint, 'passport/auth/')) {
            return false;
        }

        $publicAuthEndpoints = [
            'passport/auth/login',
            'passport/auth/register',
            'passport/auth/forget',
            'passport/auth/login2FA',
            'passport/auth/loginWithTelegram',
            'passport/auth/loginWithMailLink',
            'passport/auth/checkTelegramLogin',
            'passport/auth/token2Login',
            'passport/auth/sso/init',
            'passport/auth/sso/callback',
        ];

        return in_array($endpoint, $publicAuthEndpoints, true);
    }
}
