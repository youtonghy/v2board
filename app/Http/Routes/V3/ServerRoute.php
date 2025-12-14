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

