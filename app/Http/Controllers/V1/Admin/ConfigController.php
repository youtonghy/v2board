<?php

namespace App\Http\Controllers\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ConfigSave;
use App\Jobs\SendEmailJob;
use App\Http\Requests\Admin\TelegramBroadcast;
use App\Models\Plan;
use App\Models\User;
use App\Services\TelegramService;
use App\Utils\Dict;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ConfigController extends Controller
{
    public function getEmailTemplate()
    {
        $path = resource_path('views/mail/');
        $files = array_map(function ($item) use ($path) {
            return str_replace($path, '', $item);
        }, glob($path . '*'));
        return response([
            'data' => $files
        ]);
    }

    public function getThemeTemplate()
    {
        $path = public_path('theme/');
        $files = array_map(function ($item) use ($path) {
            return str_replace($path, '', $item);
        }, glob($path . '*'));
        return response([
            'data' => $files
        ]);
    }

    public function testSendMail(Request $request)
    {
        $obj = new SendEmailJob([
            'email' => $request->user['email'],
            'subject' => 'This is v2board test email',
            'template_name' => 'notify',
            'template_value' => [
                'name' => config('v2board.app_name', 'V2Board'),
                'content' => 'This is v2board test email',
                'url' => config('v2board.app_url')
            ]
        ]);
        return response([
            'data' => true,
            'log' => $obj->handle()
        ]);
    }

    public function setTelegramWebhook(Request $request)
    {
        $hookUrl = secure_url('/api/v3/guest/telegram/webhook?access_token=' . md5(config('v2board.telegram_bot_token', $request->input('telegram_bot_token'))));
        $telegramService = new TelegramService($request->input('telegram_bot_token'));
        $telegramService->getMe();
        $telegramService->setWebhook($hookUrl);
        return response([
            'data' => true
        ]);
    }

    public function telegramBroadcast(TelegramBroadcast $request)
    {
        if ((int)config('v2board.telegram_bot_enable', 0) !== 1 || !config('v2board.telegram_bot_token')) {
            abort(400, '请先启用 Telegram 机器人并配置 Token');
        }

        $target = $request->input('target');
        $message = trim((string)$request->input('message', ''));
        if ($message === '') {
            abort(422, '群发内容不能为空');
        }

        @set_time_limit(0);

        $now = time();
        $query = User::query()
            ->whereNotNull('telegram_id')
            ->where('telegram_id', '>', 0)
            ->where('banned', 0);

        $selectedPlans = collect();

        switch ($target) {
            case 'active':
                $query->whereNotNull('plan_id')
                    ->where(function ($sub) use ($now) {
                        $sub->whereNull('expired_at')
                            ->orWhere('expired_at', '>', $now);
                    });
                break;
            case 'history':
                $query->where(function ($sub) {
                    $sub->where(function ($inner) {
                        $inner->whereNotNull('plan_id')
                            ->where('plan_id', '>', 0);
                    })->orWhereExists(function ($exists) {
                        $exists->select(DB::raw(1))
                            ->from('v2_order')
                            ->whereColumn('v2_order.user_id', 'v2_user.id')
                            ->where('status', 3);
                    });
                });
                break;
            case 'plan':
                $planIds = collect($request->input('plan_ids', []))
                    ->map(static function ($id) {
                        return (int)$id;
                    })
                    ->filter()
                    ->unique()
                    ->values();
                if ($planIds->isEmpty()) {
                    abort(422, '请选择需要群发的订阅套餐');
                }
                $selectedPlans = Plan::whereIn('id', $planIds)->get(['id', 'name']);
                $query->where(function ($sub) use ($planIds, $now) {
                    $sub->whereIn('plan_id', $planIds)
                        ->where(function ($inner) use ($now) {
                            $inner->whereNull('expired_at')
                                ->orWhere('expired_at', '>', $now);
                        })
                        ->orWhereExists(function ($exists) use ($planIds) {
                            $exists->select(DB::raw(1))
                                ->from('v2_order')
                                ->whereColumn('v2_order.user_id', 'v2_user.id')
                                ->where('status', 3)
                                ->whereIn('plan_id', $planIds);
                        });
                });
                break;
            case 'all':
            default:
                break;
        }

        $summary = [
            'target' => $target,
            'total' => 0,
            'success' => 0,
            'failed' => 0,
            'plans' => $selectedPlans->map(static function (Plan $plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                ];
            })->values()->all(),
        ];

        $logs = [];
        $logLimit = 200;
        $telegramService = new TelegramService();

        $query->select(['id', 'email', 'telegram_id'])
            ->orderBy('id')
            ->chunkById(100, function ($users) use (&$summary, &$logs, $logLimit, $telegramService, $message) {
                foreach ($users as $user) {
                    $summary['total']++;
                    try {
                        $telegramService->sendMessage((int)$user->telegram_id, $message);
                        $summary['success']++;
                        if (count($logs) < $logLimit) {
                            $logs[] = [
                                'user_id' => $user->id,
                                'email' => $user->email,
                                'status' => 'success',
                            ];
                        }
                    } catch (\Throwable $e) {
                        $summary['failed']++;
                        if (count($logs) < $logLimit) {
                            $logs[] = [
                                'user_id' => $user->id,
                                'email' => $user->email,
                                'status' => 'failed',
                                'error' => mb_substr($e->getMessage(), 0, 200),
                            ];
                        }
                    }
                }
            }, 'id');

        return response([
            'data' => [
                'summary' => $summary,
                'logs' => $logs,
            ]
        ]);
    }

    public function fetch(Request $request)
    {
        $key = $request->input('key');
        $data = [
            'ticket' => [
                'ticket_status' => config('v2board.ticket_status', 0)
            ],
            'deposit' => [
                'deposit_bounus' => config('v2board.deposit_bounus', [])
            ],
            'invite' => [
                'invite_force' => (int)config('v2board.invite_force', 0),
                'invite_commission' => config('v2board.invite_commission', 10),
                'invite_gen_limit' => config('v2board.invite_gen_limit', 5),
                'invite_never_expire' => config('v2board.invite_never_expire', 0),
                'user_invite_page_enable' => (int)config('v2board.user_invite_page_enable', 0),
                'invite_link_default_max_use' => (int)config('v2board.invite_link_default_max_use', 1),
                'invite_link_default_expire_hours' => (int)config('v2board.invite_link_default_expire_hours', 72),
                'invite_link_stats_enable' => (int)config('v2board.invite_link_stats_enable', 1),
                'commission_first_time_enable' => config('v2board.commission_first_time_enable', 1),
                'commission_auto_check_enable' => config('v2board.commission_auto_check_enable', 1),
                'commission_withdraw_limit' => config('v2board.commission_withdraw_limit', 100),
                'commission_withdraw_method' => config('v2board.commission_withdraw_method', Dict::WITHDRAW_METHOD_WHITELIST_DEFAULT),
                'withdraw_close_enable' => config('v2board.withdraw_close_enable', 0),
                'commission_distribution_enable' => config('v2board.commission_distribution_enable', 0),
                'commission_distribution_l1' => config('v2board.commission_distribution_l1'),
                'commission_distribution_l2' => config('v2board.commission_distribution_l2'),
                'commission_distribution_l3' => config('v2board.commission_distribution_l3')
            ],
            'site' => [
                'logo' => config('v2board.logo'),
                'force_https' => (int)config('v2board.force_https', 0),
                'stop_register' => (int)config('v2board.stop_register', 0),
                'public_register_enable' => (int)config('v2board.public_register_enable', 0),
                'app_name' => config('v2board.app_name', 'V2Board'),
                'app_description' => config('v2board.app_description', 'V2Board is best!'),
                'app_url' => config('v2board.app_url'),
                'subscribe_url' => config('v2board.subscribe_url'),
                'subscribe_path' => config('v2board.subscribe_path'),
                'subscribe_ua_whitelist_enable' => (int)config('v2board.subscribe_ua_whitelist_enable', 0),
                'subscribe_ua_whitelist' => config('v2board.subscribe_ua_whitelist', Dict::SUBSCRIBE_UA_WHITELIST_DEFAULT),
                'try_out_plan_id' => (int)config('v2board.try_out_plan_id', 0),
                'try_out_hour' => (int)config('v2board.try_out_hour', 1),
                'tos_url' => config('v2board.tos_url'),
                'currency' => config('v2board.currency', 'CNY'),
                'currency_symbol' => config('v2board.currency_symbol', '¥'),
            ],
            'subscribe' => [
                'plan_change_enable' => (int)config('v2board.plan_change_enable', 1),
                'reset_traffic_method' => (int)config('v2board.reset_traffic_method', 0),
                'reset_traffic_never_expire_enable' => (int)config('v2board.reset_traffic_never_expire_enable', 0),
                'surplus_enable' => (int)config('v2board.surplus_enable', 1),
                'allow_new_period' => (int)config('v2board.allow_new_period', 0),
                'new_order_event_id' => (int)config('v2board.new_order_event_id', 0),
                'renew_order_event_id' => (int)config('v2board.renew_order_event_id', 0),
                'change_order_event_id' => (int)config('v2board.change_order_event_id', 0),
                'show_info_to_server_enable' => (int)config('v2board.show_info_to_server_enable', 0),
                'show_subscribe_method' => (int)config('v2board.show_subscribe_method', 0),
                'show_subscribe_expire' => (int)config('v2board.show_subscribe_expire', 5),
            ],
            'frontend' => [
                'frontend_theme' => config('v2board.frontend_theme', 'v2board'),
                'frontend_theme_sidebar' => config('v2board.frontend_theme_sidebar', 'light'),
                'frontend_theme_header' => config('v2board.frontend_theme_header', 'dark'),
                'frontend_theme_color' => config('v2board.frontend_theme_color', 'default'),
                'frontend_background_url' => config('v2board.frontend_background_url'),
            ],
            'server' => [
                'server_api_url' => config('v2board.server_api_url'),
                'server_token' => config('v2board.server_token'),
                'server_pull_interval' => config('v2board.server_pull_interval', 60),
                'server_push_interval' => config('v2board.server_push_interval', 60),
                'server_node_report_min_traffic' => config('v2board.server_node_report_min_traffic', 0),
                'server_device_online_min_traffic' => config('v2board.server_device_online_min_traffic', 0),
                'device_limit_mode' => config('v2board.device_limit_mode', 0)
            ],
            'email' => [
                'email_template' => config('v2board.email_template', 'default'),
                'email_host' => config('v2board.email_host'),
                'email_port' => config('v2board.email_port'),
                'email_username' => config('v2board.email_username'),
                'email_password' => config('v2board.email_password'),
                'email_encryption' => config('v2board.email_encryption'),
                'email_from_address' => config('v2board.email_from_address'),
                'email_oauth_enable' => (int)config('v2board.email_oauth_enable', 0),
                'email_oauth_provider' => config('v2board.email_oauth_provider', 'google'),
                'email_oauth_client_id' => config('v2board.email_oauth_client_id'),
                'email_oauth_client_secret' => config('v2board.email_oauth_client_secret'),
                'email_oauth_refresh_token' => config('v2board.email_oauth_refresh_token'),
                'email_oauth_tenant' => config('v2board.email_oauth_tenant'),
                'email_oauth_scope' => config('v2board.email_oauth_scope'),
            ],
            'telegram' => [
                'telegram_bot_enable' => config('v2board.telegram_bot_enable', 0),
                'telegram_bot_token' => config('v2board.telegram_bot_token'),
                'telegram_discuss_link' => config('v2board.telegram_discuss_link'),
                'telegram_login_enable' => config('v2board.telegram_login_enable', 0)
            ],
            'sso' => [
                'sso_login_enable' => (int)config('v2board.sso_login_enable', 0),
                'sso_provider' => config('v2board.sso_provider', 'casdoor'),
                'sso_casdoor_endpoint' => config('v2board.sso_casdoor_endpoint'),
                'sso_casdoor_client_id' => config('v2board.sso_casdoor_client_id'),
                'sso_casdoor_client_secret' => config('v2board.sso_casdoor_client_secret'),
                'sso_casdoor_scope' => config('v2board.sso_casdoor_scope', 'openid profile email'),
                'sso_callback_url' => config('v2board.sso_callback_url'),
                'sso_auto_register' => (int)config('v2board.sso_auto_register', 1),
                'sso_callback_suggest' => $this->buildDefaultSsoCallbackUrl()
            ],
            'app' => [
                'windows_version' => config('v2board.windows_version'),
                'windows_download_url' => config('v2board.windows_download_url'),
                'macos_version' => config('v2board.macos_version'),
                'macos_download_url' => config('v2board.macos_download_url'),
                'android_version' => config('v2board.android_version'),
                'android_download_url' => config('v2board.android_download_url'),
                'third_party_login_app_name' => config('v2board.third_party_login_app_name', 'Third-Party App'),
                'third_party_login_redirect_uri_whitelist' => config('v2board.third_party_login_redirect_uri_whitelist', [])
            ],
            'safe' => [
                'email_verify' => (int)config('v2board.email_verify', 0),
                'safe_mode_enable' => (int)config('v2board.safe_mode_enable', 0),
                'cors_separate_frontend_enable' => (int)config('v2board.cors_separate_frontend_enable', 0),
                'cors_allowed_origins' => is_array(config('v2board.cors_allowed_origins', []))
                    ? array_values(config('v2board.cors_allowed_origins', []))
                    : [],
                'subscribe_burn_after_read' => (int)config('v2board.subscribe_burn_after_read', 0),
                'secure_path' => config('v2board.secure_path', config('v2board.frontend_admin_path', hash('crc32b', config('app.key')))),
                'email_whitelist_enable' => (int)config('v2board.email_whitelist_enable', 0),
                'email_whitelist_suffix' => config('v2board.email_whitelist_suffix', Dict::EMAIL_WHITELIST_SUFFIX_DEFAULT),
                'email_gmail_limit_enable' => config('v2board.email_gmail_limit_enable', 0),
                'recaptcha_enable' => (int)config('v2board.recaptcha_enable', 0),
                'recaptcha_key' => config('v2board.recaptcha_key'),
                'recaptcha_site_key' => config('v2board.recaptcha_site_key'),
                'turnstile_enable' => (int)config('v2board.turnstile_enable', 0),
                'turnstile_secret_key' => config('v2board.turnstile_secret_key'),
                'turnstile_site_key' => config('v2board.turnstile_site_key'),
                'register_limit_by_ip_enable' => (int)config('v2board.register_limit_by_ip_enable', 0),
                'register_limit_count' => config('v2board.register_limit_count', 3),
                'register_limit_expire' => config('v2board.register_limit_expire', 60),
                'password_limit_enable' => (int)config('v2board.password_limit_enable', 1),
                'password_limit_count' => config('v2board.password_limit_count', 5),
                'password_limit_expire' => config('v2board.password_limit_expire', 60),
                'totp_enable' => (int)config('v2board.totp_enable', 0),
                'passkey_login_enable' => (int)config('v2board.passkey_login_enable', 0),
                'api_v1_disable' => (int)config('v2board.api_v1_disable', 0),
                'ip_no_log' => (int)config('v2board.ip_no_log', 0),
                'rate_limit_ip' => (int)config('v2board.rate_limit_ip', 0),
                'rate_limit_gateway' => (int)config('v2board.rate_limit_gateway', 0)
            ]
        ];
        if ($key && isset($data[$key])) {
            return response([
                'data' => [
                    $key => $data[$key]
                ]
            ]);
        };
        // TODO: default should be in Dict
        return response([
            'data' => $data
        ]);
    }

    public function save(ConfigSave $request)
    {
        $data = $request->validated();
        $data = $this->normalizeCorsSafeConfig($data);
        $config = config('v2board');
        foreach (ConfigSave::RULES as $k => $v) {
            if (!in_array($k, array_keys(ConfigSave::RULES))) {
                unset($config[$k]);
                continue;
            }
            if (array_key_exists($k, $data)) {
                $config[$k] = $data[$k];
            }
        }
        $data = var_export($config, 1);
        if (!File::put(base_path() . '/config/v2board.php', "<?php\n return $data ;")) {
            abort(500, '修改失败');
        }
        if (function_exists('opcache_reset')) {
            try {
                opcache_reset();
            } catch (\Throwable $e) {
                try {
                    Log::warning('Opcache reset failed', ['error' => $e->getMessage()]);
                } catch (\Throwable $e) {
                }
            }
        }
        $cacheDir = base_path('bootstrap/cache');
        if (is_dir($cacheDir) && is_writable($cacheDir)) {
            try {
                Artisan::call('config:cache');
            } catch (\Throwable $e) {
                try {
                    Log::warning('Config cache failed', ['error' => $e->getMessage()]);
                } catch (\Throwable $e) {
                }
            }
        } else {
            try {
                Log::warning('Config cache skipped: bootstrap/cache not writable', ['path' => $cacheDir]);
            } catch (\Throwable $e) {
            }
        }
        if(Cache::has('WEBMANPID')) {
            $pid = Cache::get('WEBMANPID');
            Cache::forget('WEBMANPID');
            return response([
                'data' => posix_kill($pid, 15)
            ]);
        }
        return response([
            'data' => true
        ]);
    }

    private function normalizeCorsSafeConfig(array $data): array
    {
        if (array_key_exists('cors_allowed_origins', $data)) {
            $data['cors_allowed_origins'] = $this->normalizeCorsOriginList((array)$data['cors_allowed_origins']);
        }

        $corsEnabled = array_key_exists('cors_separate_frontend_enable', $data)
            ? (int)$data['cors_separate_frontend_enable']
            : (int)config('v2board.cors_separate_frontend_enable', 0);

        if ($corsEnabled !== 1) {
            return $data;
        }

        $origins = array_key_exists('cors_allowed_origins', $data)
            ? $data['cors_allowed_origins']
            : config('v2board.cors_allowed_origins', []);
        $origins = $this->normalizeCorsOriginList(is_array($origins) ? $origins : []);
        if (!empty($origins)) {
            $data['cors_allowed_origins'] = $origins;
            return $data;
        }

        $appUrl = array_key_exists('app_url', $data)
            ? (string)$data['app_url']
            : (string)config('v2board.app_url');
        $defaultOrigin = $this->normalizeOrigin($appUrl);
        if ($defaultOrigin === null) {
            throw ValidationException::withMessages([
                'cors_allowed_origins' => '启用前后端分离部署时，必须配置 CORS 白名单，且站点URL需为可解析 Origin 的合法 URL。'
            ]);
        }

        $data['cors_allowed_origins'] = [$defaultOrigin];
        return $data;
    }

    private function normalizeCorsOriginList(array $origins): array
    {
        $result = [];
        foreach ($origins as $origin) {
            $normalized = $this->normalizeOrigin((string)$origin);
            if ($normalized !== null) {
                $result[$normalized] = true;
            }
        }

        return array_keys($result);
    }

    private function normalizeOrigin(string $origin): ?string
    {
        $origin = trim($origin);
        if ($origin === '') {
            return null;
        }

        $parts = parse_url($origin);
        if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
            return null;
        }

        $scheme = strtolower($parts['scheme']);
        if (!in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        if (isset($parts['query']) || isset($parts['fragment']) || isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }

        if (isset($parts['path']) && $parts['path'] !== '' && $parts['path'] !== '/') {
            return null;
        }

        $host = strtolower($parts['host']);
        $port = isset($parts['port']) ? ':' . (int)$parts['port'] : '';

        return "{$scheme}://{$host}{$port}";
    }

    private function buildDefaultSsoCallbackUrl(): string
    {
        if ($custom = config('v2board.sso_callback_url')) {
            return $custom;
        }
        if ($appUrl = config('v2board.app_url')) {
            return rtrim($appUrl, '/') . '/api/v1/passport/auth/sso/callback';
        }
        return url('/api/v1/passport/auth/sso/callback');
    }
}
