<?php

namespace App\Http\Controllers\V1\Client;

use App\Http\Controllers\Controller;
use App\Protocols\General;
use App\Protocols\Singbox\Singbox;
use App\Protocols\Singbox\SingboxOld;
use App\Protocols\ClashMeta;
use App\Services\ServerService;
use App\Services\UserService;
use App\Utils\Dict;
use App\Utils\Helper;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function subscribe(Request $request)
    {
        $flag = $request->input('flag')
            ?? ($_SERVER['HTTP_USER_AGENT'] ?? '');
        $flag = strtolower($flag);
        if ((int)config('v2board.subscribe_ua_whitelist_enable', 0) === 1) {
            $userAgent = $request->header('User-Agent', '');
            if (!$this->isAllowedSubscribeUserAgent($userAgent)) {
                abort(403, '订阅仅限授权客户端');
            }
        }
        $user = $request->user;
        // account not expired and is not banned.
        $userService = new UserService();
        if ($userService->isAvailable($user)) {
            $serverService = new ServerService();
            $servers = $serverService->getAvailableServers($user);
            if ($flag) {
                if (strpos($flag, 'tjxt') !== false) {
                    $this->setSubscribeInfoToServers($servers, $user);
                    $class = new ClashMeta($user, $servers);
                    return $class->handle();
                }
                if (!strpos($flag, 'sing')) {
                    $this->setSubscribeInfoToServers($servers, $user);
                    foreach (array_reverse(glob(app_path('Protocols') . '/*.php')) as $file) {
                        $file = 'App\\Protocols\\' . basename($file, '.php');
                        $class = new $file($user, $servers);
                        if (strpos($flag, $class->flag) !== false) {
                            return $class->handle();
                        }
                    }
                }
                if (strpos($flag, 'sing') !== false) {
                    $version = null;
                    if (preg_match('/sing-box\s+([0-9.]+)/i', $flag, $matches)) {
                        $version = $matches[1];
                    }
                    if (!is_null($version) && $version >= '1.12.0') {
                        $class = new Singbox($user, $servers);
                    } else {
                        $class = new SingboxOld($user, $servers);
                    }
                    return $class->handle();
                }
            }
            $class = new General($user, $servers);
            return $class->handle();
        }
    }

    private function isAllowedSubscribeUserAgent(?string $userAgent): bool
    {
        $userAgent = strtolower($userAgent ?? '');
        $whitelist = config('v2board.subscribe_ua_whitelist', Dict::SUBSCRIBE_UA_WHITELIST_DEFAULT);
        if (!is_array($whitelist)) {
            $whitelist = preg_split('/[\r\n,]+/', (string)$whitelist);
        }
        $whitelist = array_filter(array_map(static function ($item) {
            return strtolower(trim($item));
        }, $whitelist));
        if (empty($whitelist)) {
            return true;
        }
        if ($userAgent === '') {
            return false;
        }
        foreach ($whitelist as $needle) {
            if ($needle === '*') {
                return true;
            }
            if ($needle !== '' && strpos($userAgent, $needle) !== false) {
                return true;
            }
        }
        return false;
    }

    private function setSubscribeInfoToServers(&$servers, $user)
    {
        if (!isset($servers[0])) return;
        if (!(int)config('v2board.show_info_to_server_enable', 0)) return;
        $useTraffic = $user['u'] + $user['d'];
        $totalTraffic = $user['transfer_enable'];
        $remainingTraffic = Helper::trafficConvert($totalTraffic - $useTraffic);
        $expiredDate = $user['expired_at'] ? date('Y-m-d', $user['expired_at']) : '长期有效';
        $userService = new UserService();
        $resetDay = $userService->getResetDay($user);
        array_unshift($servers, array_merge($servers[0], [
            'name' => "套餐到期：{$expiredDate}",
        ]));
        if ($resetDay) {
            array_unshift($servers, array_merge($servers[0], [
                'name' => "距离下次重置剩余：{$resetDay} 天",
            ]));
        }
        array_unshift($servers, array_merge($servers[0], [
            'name' => "剩余流量：{$remainingTraffic}",
        ]));
    }
}
