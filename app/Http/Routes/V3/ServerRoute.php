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

                $class = $request->input('class');
                $action = $request->input('action');
                if (!is_string($class) || $class === '' || !is_string($action) || $action === '') {
                    abort(422, 'class/action is required');
                }
                if (!preg_match('/^[a-zA-Z0-9_]+$/', $class) || !preg_match('/^[a-zA-Z0-9_]+$/', $action)) {
                    abort(404);
                }
                $ctrl = \App::make("\\App\\Http\\Controllers\\V1\\Server\\" . ucfirst($class) . "Controller");
                return \App::call([$ctrl, $action]);
            });
        });
    }
}
