<?php
namespace App\Http\Routes\V1;

use Illuminate\Contracts\Routing\Registrar;

class PassportRoute
{
    public function map(Registrar $router)
    {
        $router->group([
            'prefix' => 'passport'
        ], function ($router) {
            // Auth
            $router->post('/auth/register', 'V1\\Passport\\AuthController@register');
            $router->post('/auth/login', 'V1\\Passport\\AuthController@login');
            $router->get ('/auth/token2Login', 'V1\\Passport\\AuthController@token2Login');
            $router->post('/auth/forget', 'V1\\Passport\\AuthController@forget');
            $router->post('/auth/getQuickLoginUrl', 'V1\\Passport\\AuthController@getQuickLoginUrl');
            $router->post('/auth/loginWithMailLink', 'V1\\Passport\\AuthController@loginWithMailLink');
            $router->post('/auth/loginWithTelegram', 'V1\\Passport\\AuthController@loginWithTelegram');
            $router->get ('/auth/checkTelegramLogin', 'V1\\Passport\\AuthController@checkTelegramLogin');
            $router->get ('/auth/sso/init', 'V1\\Passport\\SsoController@init');
            $router->get ('/auth/sso/callback', 'V1\\Passport\\SsoController@callback');
            // Comm
            $router->post('/comm/sendEmailVerify', 'V1\\Passport\\CommController@sendEmailVerify');
            $router->post('/comm/pv', 'V1\\Passport\\CommController@pv');
        });
    }
}
