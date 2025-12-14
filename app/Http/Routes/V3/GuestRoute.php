<?php
namespace App\Http\Routes\V3;

use Illuminate\Contracts\Routing\Registrar;
use Illuminate\Http\Request;

class GuestRoute
{
    public function map(Registrar $router)
    {
        $router->group([
            'prefix' => 'guest'
        ], function ($router) {
            // Telegram
            $router->post('/telegram/webhook', 'V1\\Guest\\TelegramController@webhook');
            // Payment (params in request)
            $router->match(['get', 'post'], '/payment/notify', function (Request $request) {
                $method = $request->input('method');
                $uuid = $request->input('uuid');
                if (!is_string($method) || $method === '' || !is_string($uuid) || $uuid === '') {
                    abort(422, 'method/uuid is required');
                }
                $ctrl = \App::make("\\App\\Http\\Controllers\\V1\\Guest\\PaymentController");
                return \App::call([$ctrl, 'notify'], [
                    'method' => $method,
                    'uuid' => $uuid,
                    'request' => $request
                ]);
            });
            // Comm
            $router->get('/comm/config', 'V1\\Guest\\CommController@config');
            // Stat (public, anonymized)
            $router->get('/stat/todayTrafficOverview', 'V1\\Guest\\StatController@todayTrafficOverview');
        });
    }
}

