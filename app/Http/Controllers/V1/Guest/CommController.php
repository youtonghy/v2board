<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Utils\Dict;
use App\Utils\RegisterMode;
use Illuminate\Support\Facades\Http;

class CommController extends Controller
{
    public function config()
    {
        $registerMode = RegisterMode::resolve();
        $legacyRegisterFlags = RegisterMode::legacyFlagsForMode($registerMode);
        return response([
            'data' => [
                'tos_url' => config('v2board.tos_url'),
                'is_email_verify' => (int)config('v2board.email_verify', 0) ? 1 : 0,
                'register_mode' => $registerMode,
                'stop_register' => (int)$legacyRegisterFlags['stop_register'],
                'public_register_enable' => (int)$legacyRegisterFlags['public_register_enable'],
                'user_invite_page_enable' => (int)config('v2board.user_invite_page_enable', 0) ? 1 : 0,
                'is_invite_force' => (int)$legacyRegisterFlags['invite_force'],
                'email_whitelist_suffix' => (int)config('v2board.email_whitelist_enable', 0)
                    ? $this->getEmailSuffix()
                    : 0,
                'is_recaptcha' => (int)config('v2board.recaptcha_enable', 0) ? 1 : 0,
                'is_turnstile' => (int)config('v2board.turnstile_enable', 0) ? 1 : 0,
                'recaptcha_site_key' => config('v2board.recaptcha_site_key'),
                'turnstile_site_key' => config('v2board.turnstile_site_key'),
                'is_totp_enable' => (int)config('v2board.totp_enable', 0) ? 1 : 0,
                'telegram_login_enable' => (int)config('v2board.telegram_login_enable', 0),
                'passkey_login_enable' => (int)config('v2board.passkey_login_enable', 0),
                'sso_login_enable' => (int)config('v2board.sso_login_enable', 0),
                'app_description' => config('v2board.app_description'),
                'app_url' => config('v2board.app_url'),
                'logo' => config('v2board.logo'),
                'currency' => config('v2board.currency', 'CNY'),
                'currency_symbol' => config('v2board.currency_symbol', '¥'),
            ]
        ]);
    }

    private function getEmailSuffix()
    {
        $suffix = config('v2board.email_whitelist_suffix', Dict::EMAIL_WHITELIST_SUFFIX_DEFAULT);
        if (!is_array($suffix)) {
            return preg_split('/,/', $suffix);
        }
        return $suffix;
    }
}
