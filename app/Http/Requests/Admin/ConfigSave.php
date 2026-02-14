<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ConfigSave extends FormRequest
{
    const RULES = [
        // deposit
        'deposit_bounus' => [
            'nullable',
            'array',
        ],
        // invite & commission
        'ticket_status' => 'in:0,1,2',
        'invite_force' => 'in:0,1',
        'invite_commission' => 'integer',
        'invite_gen_limit' => 'integer',
        'invite_never_expire' => 'in:0,1',
        'invite_admin_only' => 'in:0,1',
        'commission_first_time_enable' => 'in:0,1',
        'commission_auto_check_enable' => 'in:0,1',
        'commission_withdraw_limit' => 'nullable|numeric',
        'commission_withdraw_method' => 'nullable|array',
        'withdraw_close_enable' => 'in:0,1',
        'commission_distribution_enable' => 'in:0,1',
        'commission_distribution_l1' => 'nullable|numeric',
        'commission_distribution_l2' => 'nullable|numeric',
        'commission_distribution_l3' => 'nullable|numeric',
        // site
        'logo' => 'nullable|url',
        'force_https' => 'in:0,1',
        'stop_register' => 'in:0,1',
        'app_name' => '',
        'app_description' => '',
        'app_url' => 'nullable|url',
        'subscribe_url' => 'nullable',
        'subscribe_path' => 'nullable|regex:/^\\//',
        'subscribe_ua_whitelist_enable' => 'in:0,1',
        'subscribe_ua_whitelist' => 'nullable|array',
        'try_out_enable' => 'in:0,1',
        'try_out_plan_id' => 'integer',
        'try_out_hour' => 'numeric',
        'tos_url' => 'nullable|url',
        'currency' => '',
        'currency_symbol' => '',
        // subscribe
        'plan_change_enable' => 'in:0,1',
        'reset_traffic_method' => 'in:0,1,2,3,4',
        'reset_traffic_never_expire_enable' => 'in:0,1',
        'surplus_enable' => 'in:0,1',
        'allow_new_period' => 'in:0,1',
        'new_order_event_id' => 'in:0,1',
        'renew_order_event_id' => 'in:0,1',
        'change_order_event_id' => 'in:0,1',
        'show_info_to_server_enable' => 'in:0,1',
        'show_subscribe_method' => 'in:0,1,2',
        'show_subscribe_expire' => 'nullable|integer',
        // server
        'server_api_url' => 'nullable|string',
        'server_token' => 'nullable|min:16',
        'server_pull_interval' => 'integer',
        'server_push_interval' => 'integer',
        'device_limit_mode' => 'in:0,1',
        'server_node_report_min_traffic' => 'integer', 
        'server_device_online_min_traffic' => 'integer', 
        // frontend
        'frontend_theme' => '',
        'frontend_theme_sidebar' => 'nullable|in:dark,light',
        'frontend_theme_header' => 'nullable|in:dark,light',
        'frontend_theme_color' => 'nullable|in:default,darkblue,black,green',
        'frontend_background_url' => 'nullable|url',
        // email
        'email_template' => '',
        'email_host' => '',
        'email_port' => '',
        'email_username' => '',
        'email_password' => '',
        'email_encryption' => '',
        'email_from_address' => '',
        'email_oauth_enable' => 'in:0,1',
        'email_oauth_provider' => 'nullable|string',
        'email_oauth_client_id' => 'nullable|string',
        'email_oauth_client_secret' => 'nullable|string',
        'email_oauth_refresh_token' => 'nullable|string',
        'email_oauth_tenant' => 'nullable|string',
        'email_oauth_scope' => 'nullable|string',
        // telegram
        'telegram_bot_enable' => 'in:0,1',
        'telegram_bot_token' => '',
        'telegram_discuss_id' => '',
        'telegram_channel_id' => '',
        'telegram_discuss_link' => 'nullable|url',
        'telegram_login_enable' => 'in:0,1',
        // app
        'windows_version' => '',
        'windows_download_url' => '',
        'macos_version' => '',
        'macos_download_url' => '',
        'android_version' => '',
        'android_download_url' => '',
        'third_party_login_app_name' => 'nullable|string',
        'third_party_login_redirect_uri_whitelist' => 'nullable|array',
        // safe
        'email_whitelist_enable' => 'in:0,1',
        'email_whitelist_suffix' => 'nullable|array',
        'email_gmail_limit_enable' => 'in:0,1',
        'recaptcha_enable' => 'in:0,1',
        'recaptcha_key' => '',
        'recaptcha_site_key' => '',
        'turnstile_enable' => 'in:0,1',
        'turnstile_secret_key' => 'nullable|string',
        'turnstile_site_key' => 'nullable|string',
        'email_verify' => 'in:0,1',
        'safe_mode_enable' => 'in:0,1',
        'subscribe_burn_after_read' => 'in:0,1',
        'register_limit_by_ip_enable' => 'in:0,1',
        'register_limit_count' => 'integer',
        'register_limit_expire' => 'integer',
        'secure_path' => 'min:8|regex:/^[\w-]*$/',
        'password_limit_enable' => 'in:0,1',
        'password_limit_count' => 'integer',
        'password_limit_expire' => 'integer',
        'totp_enable' => 'in:0,1',
        'passkey_login_enable' => 'in:0,1',
        'api_v1_disable' => 'in:0,1',
        'ip_no_log' => 'in:0,1',
        'rate_limit_ip' => 'nullable|integer|min:0',
        'rate_limit_gateway' => 'nullable|integer|min:0',
        // sso
        'sso_login_enable' => 'in:0,1',
        'sso_provider' => 'nullable|in:casdoor',
        'sso_casdoor_endpoint' => 'nullable|url',
        'sso_casdoor_client_id' => 'nullable|string',
        'sso_casdoor_client_secret' => 'nullable|string',
        'sso_casdoor_scope' => 'nullable|string',
        'sso_callback_url' => 'nullable|url',
        'sso_auto_register' => 'nullable|in:0,1',
    ];
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        $rules = self::RULES;

        $rules['deposit_bounus'] = array_merge(
            $this->normalizeRule($rules['deposit_bounus']),
            [function ($attribute, $value, $fail) {
                if (!is_array($value)) {
                    return;
                }
                foreach ($value as $tier) {
                    if (!preg_match('/^\d+(\.\d+)?:\d+(\.\d+)?$/', $tier)) {
                        if ($tier == '') {
                            continue;
                        }
                        $fail('充值奖励格式不正确，必须为充值金额:奖励金额');
                    }
                }
            }]
        );
        $rules['email_oauth_client_id'] = array_merge(
            $this->normalizeRule($rules['email_oauth_client_id']),
            [function ($attribute, $value, $fail) {
                if ((int)$this->input('email_oauth_enable', config('v2board.email_oauth_enable', 0)) !== 1) {
                    return;
                }
                if (empty($value)) {
                    $fail('启用OAuth 2.0时，Client ID不能为空');
                }
            }]
        );
        $rules['email_oauth_client_secret'] = array_merge(
            $this->normalizeRule($rules['email_oauth_client_secret']),
            [function ($attribute, $value, $fail) {
                if ((int)$this->input('email_oauth_enable', config('v2board.email_oauth_enable', 0)) !== 1) {
                    return;
                }
                if (empty($value)) {
                    $fail('启用OAuth 2.0时，Client Secret不能为空');
                }
            }]
        );
        $rules['email_oauth_refresh_token'] = array_merge(
            $this->normalizeRule($rules['email_oauth_refresh_token']),
            [function ($attribute, $value, $fail) {
                if ((int)$this->input('email_oauth_enable', config('v2board.email_oauth_enable', 0)) !== 1) {
                    return;
                }
                if (empty($value)) {
                    $fail('启用OAuth 2.0时，Refresh Token不能为空');
                }
            }]
        );
        $rules['sso_casdoor_endpoint'] = array_merge(
            $this->normalizeRule($rules['sso_casdoor_endpoint']),
            [function ($attribute, $value, $fail) {
                if ((int)$this->input('sso_login_enable', config('v2board.sso_login_enable', 0)) !== 1) {
                    return;
                }
                $endpoint = $value ?: config('v2board.sso_casdoor_endpoint');
                if (empty($endpoint)) {
                    $fail('启用SSO时，Casdoor Endpoint不能为空');
                }
            }]
        );
        $rules['sso_casdoor_client_id'] = array_merge(
            $this->normalizeRule($rules['sso_casdoor_client_id']),
            [function ($attribute, $value, $fail) {
                if ((int)$this->input('sso_login_enable', config('v2board.sso_login_enable', 0)) !== 1) {
                    return;
                }
                $clientId = $value ?: config('v2board.sso_casdoor_client_id');
                if (empty($clientId)) {
                    $fail('启用SSO时，Casdoor Client ID不能为空');
                }
            }]
        );
        $rules['sso_casdoor_client_secret'] = array_merge(
            $this->normalizeRule($rules['sso_casdoor_client_secret']),
            [function ($attribute, $value, $fail) {
                if ((int)$this->input('sso_login_enable', config('v2board.sso_login_enable', 0)) !== 1) {
                    return;
                }
                $clientSecret = $value ?: config('v2board.sso_casdoor_client_secret');
                if (empty($clientSecret)) {
                    $fail('启用SSO时，Casdoor Client Secret不能为空');
                }
            }]
        );
        $rules['turnstile_secret_key'] = array_merge(
            $this->normalizeRule($rules['turnstile_secret_key']),
            [function ($attribute, $value, $fail) {
                if ((int)$this->input('turnstile_enable', config('v2board.turnstile_enable', 0)) !== 1) {
                    return;
                }
                $secretKey = $value ?: config('v2board.turnstile_secret_key');
                if (empty($secretKey)) {
                    $fail('启用验证码时，Turnstile Secret Key不能为空');
                }
            }]
        );
        $rules['turnstile_site_key'] = array_merge(
            $this->normalizeRule($rules['turnstile_site_key']),
            [function ($attribute, $value, $fail) {
                if ((int)$this->input('turnstile_enable', config('v2board.turnstile_enable', 0)) !== 1) {
                    return;
                }
                $siteKey = $value ?: config('v2board.turnstile_site_key');
                if (empty($siteKey)) {
                    $fail('启用验证码时，Turnstile Site Key不能为空');
                }
            }]
        );
        return $rules;
    }

    public function messages()
    {
        // illiteracy prompt
        return [
            'app_url.url' => '站点URL格式不正确，必须携带http(s)://',
            'subscribe_url.url' => '订阅URL格式不正确，必须携带http(s)://',
            'subscribe_path.regex' => '订阅路径必须以/开头',
            'server_token.min' => '通讯密钥长度必须大于16位',
            'tos_url.url' => '服务条款URL格式不正确，必须携带http(s)://',
            'telegram_discuss_link.url' => 'Telegram群组地址必须为URL格式，必须携带http(s)://',
            'logo.url' => 'LOGO URL格式不正确，必须携带https(s)://',
            'secure_path.min' => '后台路径长度最小为8位',
            'secure_path.regex' => '后台路径只能为字母或数字',
        ];
    }

    private function normalizeRule($rule): array
    {
        if (is_array($rule)) {
            return $rule;
        }
        if (is_string($rule)) {
            return array_filter(explode('|', $rule));
        }
        return (array)$rule;
    }
}
