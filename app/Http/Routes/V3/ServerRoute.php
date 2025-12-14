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
                $endpoint = $request->input('endpoint');
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

                    $method = strtoupper($request->getMethod());
                    $forwardParams = $request->except(['endpoint']);
                    $uri = '/api/v3/' . $endpoint;

                    $content = null;
                    if ($method !== 'GET' && $method !== 'HEAD') {
                        $content = json_encode($forwardParams, JSON_UNESCAPED_UNICODE);
                    }

                    $subRequest = Request::create(
                        $uri,
                        $method,
                        $forwardParams,
                        $request->cookies->all(),
                        $request->files->all(),
                        $request->server->all(),
                        $content
                    );
                    $subRequest->headers->replace($request->headers->all());

                    if ($method !== 'GET' && $method !== 'HEAD') {
                        $subRequest->headers->set('content-type', 'application/json');
                    }

                    return app('router')->dispatch($subRequest);
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
