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
            $router->post('/auth/register', 'V1\\Passport\\AuthController@register')->middleware('dynamic_throttle:ip');
            $router->post('/auth/login', 'V1\\Passport\\AuthController@login')->middleware('dynamic_throttle:ip');
            $router->get ('/auth/token2Login', 'V1\\Passport\\AuthController@token2Login');
            $router->post('/auth/forget', 'V1\\Passport\\AuthController@forget')->middleware('dynamic_throttle:ip');
            $router->post('/auth/getQuickLoginUrl', 'V1\\Passport\\AuthController@getQuickLoginUrl')->middleware('dynamic_throttle:ip');
            $router->post('/auth/loginWithTelegram', 'V1\\Passport\\AuthController@loginWithTelegram')->middleware('dynamic_throttle:ip');
            $router->post('/auth/login2FA', 'V1\\Passport\\AuthController@login2FA')->middleware('dynamic_throttle:ip');
            $router->post('/auth/passkey/login/options', 'V1\\Passport\\PasskeyController@loginOptions')->middleware('dynamic_throttle:ip');
            $router->post('/auth/passkey/login/verify', 'V1\\Passport\\PasskeyController@loginVerify')->middleware('dynamic_throttle:ip');
            $router->get ('/auth/checkTelegramLogin', 'V1\\Passport\\AuthController@checkTelegramLogin');
            $router->get ('/auth/sso/init', 'V1\\Passport\\SsoController@init');
            $router->get ('/auth/sso/callback', 'V1\\Passport\\SsoController@callback');
            $router->post('/auth/thirdPartyLogin/init', 'V1\\Admin\\UserController@thirdPartyLoginInit')->middleware('dynamic_throttle:ip');
            $router->get ('/auth/thirdPartyLogin', 'V1\\Admin\\UserController@thirdPartyLoginAuthorize');
            $router->post('/auth/thirdPartyLogin/approve', 'V1\\Admin\\UserController@thirdPartyLoginApprove')->middleware('dynamic_throttle:ip');
            $router->post('/auth/thirdPartyLogin/reject', 'V1\\Admin\\UserController@thirdPartyLoginReject')->middleware('dynamic_throttle:ip');
            $router->post('/auth/thirdPartyLogin/exchange', 'V1\\Admin\\UserController@thirdPartyLoginExchange')->middleware('dynamic_throttle:ip');
            $router->post('/auth/thirdPartyLogin/exchange', 'V1\\Admin\\UserController@thirdPartyLoginExchange');
            // Comm
            $router->post('/comm/sendEmailVerify', 'V1\\Passport\\CommController@sendEmailVerify');
            $router->post('/comm/pv', 'V1\\Passport\\CommController@pv');
            // Invite
            $router->get('/invite/fetch', 'V1\\Passport\\InviteController@fetch');
            $router->post('/invite/register', 'V1\\Passport\\InviteController@register')->middleware('dynamic_throttle:ip');
        });
    }
}
