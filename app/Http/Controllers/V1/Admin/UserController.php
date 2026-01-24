<?php

namespace App\Http\Controllers\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\UserUpdateParamUtils;
use App\Http\Requests\Admin\UserFetch;
use App\Http\Requests\Admin\UserGenerate;
use App\Http\Requests\Admin\UserSendMail;
use App\Http\Requests\Admin\UserUpdate;
use App\Jobs\SendEmailJob;
use App\Models\InviteCode;
use App\Models\Ticket;
use App\Models\Order;
use App\Models\Plan;
use App\Models\TicketMessage;
use App\Models\User;
use App\Services\AuthService;
use App\Utils\CacheKey;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    use UserUpdateParamUtils;

    private const THIRD_PARTY_APP_NAME = 'Third-Party App';
    private const THIRD_PARTY_LOGIN_TTL = 300;
    private const THIRD_PARTY_LOGIN_CODE_TTL = 120;
    private const THIRD_PARTY_LOGIN_REDIRECT_MAX_LENGTH = 512;

    public function resetSecret(Request $request)
    {
        $user = User::find($request->input('id'));
        if (!$user) abort(500, '用户不存在');
        $user->token = Helper::guid();
        $user->uuid = Helper::guid(true);
        return response([
            'data' => $user->save()
        ]);
    }

    private function filter(Request $request, $builder)
    {
        $filters = $request->input('filter');
        if ($filters) {
            foreach ($filters as $k => $filter) {
                if ($filter['condition'] === '模糊') {
                    $filter['condition'] = 'like';
                    $filter['value'] = "%{$filter['value']}%";
                }
                if ($filter['key'] === 'd' || $filter['key'] === 'transfer_enable') {
                    $filter['value'] = $filter['value'] * 1073741824;
                }
                if ($filter['key'] === 'invite_by_email') {
                    $user = User::where('email', $filter['condition'], $filter['value'])->first();
                    $inviteUserId = isset($user->id) ? $user->id : 0;
                    $builder->where('invite_user_id', $inviteUserId);
                    unset($filters[$k]);
                    continue;
                }
                if ($filter['key'] === 'plan_id' && $filter['value'] == 'null') {
                    $builder->whereNull('plan_id');
                    continue;
                }
                $builder->where($filter['key'], $filter['condition'], $filter['value']);
            }
        }
    }

    public function fetch(UserFetch $request)
    {
        $current = $request->input('current') ? $request->input('current') : 1;
        $pageSize = $request->input('pageSize') >= 10 ? $request->input('pageSize') : 10;
        $sortType = in_array($request->input('sort_type'), ['ASC', 'DESC']) ? $request->input('sort_type') : 'DESC';
        $sort = $request->input('sort') ? $request->input('sort') : 'created_at';
        $userModel = User::select(
            DB::raw('*'),
            DB::raw('(u+d) as total_used')
        )
            ->orderBy($sort, $sortType);
        $this->filter($request, $userModel);
        $total = $userModel->count();
        $res = $userModel->forPage($current, $pageSize)
            ->get();
        $plan = Plan::get();
        for ($i = 0; $i < count($res); $i++) {
            for ($k = 0; $k < count($plan); $k++) {
                if ($plan[$k]['id'] == $res[$i]['plan_id']) {
                    $res[$i]['plan_name'] = $plan[$k]['name'];
                }
            }
            $recentIps = [];
            $recentIpRecords = [];
            $recentIpsData = Cache::get('RECENT_IPS_30D_USER_' . $res[$i]['id']);
            if (is_array($recentIpsData)) {
                $cutoff = time() - (60 * 60 * 24 * 30);
                foreach ($recentIpsData as $ip => $lastSeenAt) {
                    if (!is_int($lastSeenAt) || $lastSeenAt < $cutoff) {
                        unset($recentIpsData[$ip]);
                    }
                }
                arsort($recentIpsData);
                $recentIps = array_slice(array_keys($recentIpsData), 0, 20);
                foreach ($recentIpsData as $ip => $lastSeenAt) {
                    $recentIpRecords[] = [
                        'ip' => $ip,
                        'last_seen_at' => $lastSeenAt
                    ];
                }
                $recentIpRecords = array_slice($recentIpRecords, 0, 50);
            }
            $res[$i]['recent_ips'] = $recentIps;
            $res[$i]['recent_ip_records'] = $recentIpRecords;
            $recentLoginIps = [];
            $recentLoginIpRecords = [];
            $recentLoginIpsData = Cache::get('RECENT_LOGIN_IPS_30D_USER_' . $res[$i]['id']);
            if (is_array($recentLoginIpsData)) {
                $cutoff = time() - (60 * 60 * 24 * 30);
                foreach ($recentLoginIpsData as $ip => $lastSeenAt) {
                    if (!is_int($lastSeenAt) || $lastSeenAt < $cutoff) {
                        unset($recentLoginIpsData[$ip]);
                    }
                }
                arsort($recentLoginIpsData);
                $recentLoginIps = array_slice(array_keys($recentLoginIpsData), 0, 20);
                foreach ($recentLoginIpsData as $ip => $lastSeenAt) {
                    $recentLoginIpRecords[] = [
                        'ip' => $ip,
                        'last_seen_at' => $lastSeenAt
                    ];
                }
                $recentLoginIpRecords = array_slice($recentLoginIpRecords, 0, 50);
            }
            $res[$i]['recent_login_ips'] = $recentLoginIps;
            $res[$i]['recent_login_ip_records'] = $recentLoginIpRecords;
            //统计在线设备
            $countalive = 0;
            $ips = [];
            $ips_array = Cache::get('ALIVE_IP_USER_'. $res[$i]['id']);
            if ($ips_array) {
                $countalive = $ips_array['alive_ip'];
                foreach($ips_array as $nodetypeid => $data) {
                    if (!is_int($data) && isset($data['aliveips'])) {
                        foreach($data['aliveips'] as $ip_NodeId) {
                            $ip = explode("_", $ip_NodeId)[0];
                            $ips[] = $ip . '_' . $nodetypeid;
                        }
                    }
                }
            }
            $res[$i]['alive_ip'] = $countalive;
            $res[$i]['ips'] = implode(', ', $ips);
            $res[$i]['subscribe_url'] = Helper::getSubscribeUrl($res[$i]['token']);
        }
        return response([
            'data' => $res,
            'total' => $total
        ]);
    }

    public function getUserInfoById(Request $request)
    {
        if (empty($request->input('id'))) {
            abort(500, '参数错误');
        }
        $user = User::find($request->input('id'));
        if ($user->invite_user_id) {
            $user['invite_user'] = User::find($user->invite_user_id);
        }
        return response([
            'data' => $user
        ]);
    }

    public function update(UserUpdate $request)
    {
        $params = $request->validated();
        $user = User::find($request->input('id'));
        if (!$user) {
            abort(500, '用户不存在');
        }
        if (User::where('email', $params['email'])->first() && $user->email !== $params['email']) {
            abort(500, '邮箱已被使用');
        }
        if (isset($params['password'])) {
            $params['password'] = Hash::make($params['password']);
            $params['password_algo'] = NULL;
        } else {
            unset($params['password']);
        }
        if (isset($params['plan_id'])) {
            $plan = Plan::find($params['plan_id']);
            if (!$plan) {
                abort(500, '订阅计划不存在');
            }
            $params['group_id'] = $plan->group_id;
        } else {
            $params['group_id'] = null;
        }
        if ($request->input('invite_user_email')) {
            $inviteUser = User::where('email', $request->input('invite_user_email'))->first();
            if ($inviteUser) {
                $params['invite_user_id'] = $inviteUser->id;
            }
        } else {
            $params['invite_user_id'] = null;
        }

        if (isset($params['banned']) && (int)$params['banned'] === 1) {
            $authService = new AuthService($user);
            $authService->removeAllSession();
        }

        try {
            if (array_key_exists('transfer_enable', $params)) {
                $params['transfer_enable'] = $this->normalizeOptionalInt($params['transfer_enable']) ?? 0;
            }
            foreach ([
                'u',
                'd',
                'balance',
                'commission_balance',
                'expired_at',
                'device_limit',
                'plan_id',
                'commission_rate',
                'discount',
                'commission_type',
                'speed_limit',
                'banned',
                'is_admin',
                'is_staff',
            ] as $key) {
                if (array_key_exists($key, $params)) {
                    $params[$key] = $this->normalizeOptionalInt($params[$key]);
                }
            }
            $params = $this->filterParamsByExistingColumns($user->getTable(), $params);
            $user->update($params);
        } catch (QueryException $e) {
            Log::channel('daily')->error('Admin user update failed', [
                'user_id' => $user->id ?? null,
                'params_keys' => array_keys($params),
                'error' => $e->getMessage(),
                'exception' => $e,
            ]);
            if (preg_match("/Unknown column '([^']+)'/", $e->getMessage(), $matches)) {
                abort(500, sprintf('保存失败：数据库缺少字段 %s，请执行 `php artisan migrate` 或导入 `database/update.sql`', $matches[1]));
            }
            if (preg_match("/for column '([^']+)'/i", $e->getMessage(), $matches)) {
                abort(500, sprintf('保存失败：字段 %s 写入失败（请检查输入格式/数据库字段类型）', $matches[1]));
            }
            abort(500, '保存失败');
        } catch (\Throwable $e) {
            Log::channel('daily')->error('Admin user update failed', [
                'user_id' => $user->id ?? null,
                'params_keys' => array_keys($params),
                'error' => $e->getMessage(),
                'exception' => $e,
            ]);
            abort(500, '保存失败');
        }
        return response([
            'data' => true
        ]);
    }

    public function ipGeo(Request $request)
    {
        return response([
            'data' => $this->getIpGeo($request->input('ip'), $request->input('provider'))
        ]);
    }

    public function ipGeoProviders(Request $request)
    {
        $providers = $this->getIpGeoProviders();
        $list = [];
        foreach ($providers as $key => $provider) {
            $list[] = [
                'key' => $key,
                'name' => $provider['name']
            ];
        }
        return response([
            'data' => [
                'providers' => $list,
                'default' => $this->getDefaultIpGeoProvider()
            ]
        ]);
    }

    public function dumpCSV(Request $request)
    {
        $userModel = User::orderBy('id', 'asc');
        $this->filter($request, $userModel);
        $res = $userModel->get();
        $plan = Plan::get();
        for ($i = 0; $i < count($res); $i++) {
            for ($k = 0; $k < count($plan); $k++) {
                if ($plan[$k]['id'] == $res[$i]['plan_id']) {
                    $res[$i]['plan_name'] = $plan[$k]['name'];
                }
            }
        }

        $data = "邮箱,余额,推广佣金,总流量,设备数限制,剩余流量,套餐到期时间,订阅计划,订阅地址\r\n";
        foreach($res as $user) {
            $expireDate = $user['expired_at'] === NULL ? '长期有效' : date('Y-m-d H:i:s', $user['expired_at']);
            $balance = $user['balance'] / 100;
            $commissionBalance = $user['commission_balance'] / 100;
            $transferEnable = $user['transfer_enable'] ? $user['transfer_enable'] / 1073741824 : 0;
            $deviceLimit = $user['devce_limit'] ? $user['devce_limit'] : NULL;
            $notUseFlow = (($user['transfer_enable'] - ($user['u'] + $user['d'])) / 1073741824) ?? 0;
            $planName = $user['plan_name'] ?? '无订阅';
            $subscribeUrl =  Helper::getSubscribeUrl($user['token']);
            $data .= "{$user['email']},{$balance},{$commissionBalance},{$transferEnable}, {$deviceLimit}, {$notUseFlow},{$expireDate},{$planName},{$subscribeUrl}\r\n";

        }
        echo "\xEF\xBB\xBF" . $data;
    }

    public function generate(UserGenerate $request)
    {
        if ($request->input('email_prefix')) {
            if ($request->input('plan_id')) {
                $plan = Plan::find($request->input('plan_id'));
                if (!$plan) {
                    abort(500, '订阅计划不存在');
                }
            }
            $user = [
                'email' => $request->input('email_prefix') . '@' . $request->input('email_suffix'),
                'plan_id' => isset($plan->id) ? $plan->id : NULL,
                'group_id' => isset($plan->group_id) ? $plan->group_id : NULL,
                'transfer_enable' => isset($plan->transfer_enable) ? $plan->transfer_enable * 1073741824 : 0,
                'device_limit' => isset($plan->device_limit) ? $plan->device_limit : NULL,
                'expired_at' => $request->input('expired_at') ?? NULL,
                'uuid' => Helper::guid(true),
                'token' => Helper::guid()
            ];
            if (User::where('email', $user['email'])->first()) {
                abort(500, '邮箱已存在于系统中');
            }
            $user['password'] = Hash::make($request->input('password') ?? $user['email']);
            if (!User::create($user)) {
                abort(500, '生成失败');
            }
            return response([
                'data' => true
            ]);
        }
        if ($request->input('generate_count')) {
            $this->multiGenerate($request);
        }
    }

    private function multiGenerate(Request $request)
    {
        if ($request->input('plan_id')) {
            $plan = Plan::find($request->input('plan_id'));
            if (!$plan) {
                abort(500, '订阅计划不存在');
            }
        }
        $users = [];
        for ($i = 0;$i < $request->input('generate_count');$i++) {
            $user = [
                'email' => Helper::randomChar(6) . '@' . $request->input('email_suffix'),
                'plan_id' => isset($plan->id) ? $plan->id : NULL,
                'group_id' => isset($plan->group_id) ? $plan->group_id : NULL,
                'transfer_enable' => isset($plan->transfer_enable) ? $plan->transfer_enable * 1073741824 : 0,
                'device_limit' => isset($plan->device_limit) ? $plan->device_limit : NULL,
                'expired_at' => $request->input('expired_at') ?? NULL,
                'uuid' => Helper::guid(true),
                'token' => Helper::guid(),
                'created_at' => time(),
                'updated_at' => time()
            ];
            $user['password'] = Hash::make($request->input('password') ?? $user['email']);
            array_push($users, $user);
        }
        DB::beginTransaction();
        if (!User::insert($users)) {
            DB::rollBack();
            abort(500, '生成失败');
        }
        DB::commit();
        $data = "账号,密码,过期时间,UUID,创建时间,订阅地址\r\n";
        foreach($users as $user) {
            $expireDate = $user['expired_at'] === NULL ? '长期有效' : date('Y-m-d H:i:s', $user['expired_at']);
            $createDate = date('Y-m-d H:i:s', $user['created_at']);
            $password = $request->input('password') ?? $user['email'];
            $subscribeUrl = Helper::getSubscribeUrl($user['token']);
            $data .= "{$user['email']},{$password},{$expireDate},{$user['uuid']},{$createDate},{$subscribeUrl}\r\n";
        }
        echo $data;
    }

    public function sendMail(UserSendMail $request)
    {
        $sortType = in_array($request->input('sort_type'), ['ASC', 'DESC']) ? $request->input('sort_type') : 'DESC';
        $sort = $request->input('sort') ? $request->input('sort') : 'created_at';
        $builder = User::orderBy($sort, $sortType);
        $this->filter($request, $builder);
        foreach ($builder->cursor() as $user) {
            SendEmailJob::dispatch([
                'email' => $user->email,
                'subject' => $request->input('subject'),
                'template_name' => 'notify',
                'template_value' => [
                    'name' => config('v2board.app_name', 'V2Board'),
                    'url' => config('v2board.app_url'),
                    'content' => $request->input('content')
                ]
            ], 'send_email_mass');
        }

        return response([
            'data' => true
        ]);
    }

    public function ban(Request $request)
    {
        $sortType = in_array($request->input('sort_type'), ['ASC', 'DESC']) ? $request->input('sort_type') : 'DESC';
        $sort = $request->input('sort') ? $request->input('sort') : 'created_at';
        $builder = User::orderBy($sort, $sortType);
        $this->filter($request, $builder);
        try {
            $builder->each(function ($user){
                $authService = new AuthService($user);
                $authService->removeAllSession();
            });
            $builder->update([
                'banned' => 1
            ]);
        } catch (\Exception $e) {
            abort(500, '处理失败');
        }

        return response([
            'data' => true
        ]);
    }

    public function allDel(Request $request)
    {
        $sortType = in_array($request->input('sort_type'), ['ASC', 'DESC']) ? $request->input('sort_type') : 'DESC';
        $sort = $request->input('sort') ? $request->input('sort') : 'created_at';
        $builder = User::orderBy($sort, $sortType);
        $this->filter($request, $builder);

        DB::beginTransaction();
        try {
            $builder->each(function ($user){
                $authService = new AuthService($user);
                $authService->removeAllSession();
                Order::where('user_id', $user->id)->delete();
                InviteCode::where('user_id', $user->id)->delete();
                $tickets = Ticket::where('user_id', $user->id)->get();
                foreach($tickets as $ticket) {
                    TicketMessage::where('ticket_id', $ticket->id)->delete();
                }
                Ticket::where('user_id', $user->id)->delete();
                User::where('invite_user_id', $user->id)->update(['invite_user_id' => null]);
            });
            $builder->delete();
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            abort(500, '批量删除用户信息失败');
        }  

        return response([
            'data' => true
        ]);
    }

    public function delUser(Request $request)
    {
        $user = User::find($request->input('id'));
        if (!$user) {
            abort(500, '用户不存在');
        }
        DB::beginTransaction();
        try {
            $authService = new AuthService($user);
            $authService->removeAllSession();
            Order::where('user_id', $request->input('id'))->delete();
            User::where('invite_user_id', $request->input('id'))->update(['invite_user_id' => null]);
            InviteCode::where('user_id', $request->input('id'))->delete();
            
            $tickets = Ticket::where('user_id', $request->input('id'))->get();
            foreach($tickets as $ticket) {
                TicketMessage::where('ticket_id', $ticket->id)->delete();
            }
            Ticket::where('user_id', $request->input('id'))->delete();
    
            $user->delete();
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            abort(500, '删除用户失败');
        }

        return response([
            'data' => true
        ]);
    }

    public function generateInviteCode(Request $request)
    {
        $userId = $request->input('user_id');
        if (!$userId) {
            abort(500, '请选择用户');
        }
        $user = User::find($userId);
        if (!$user) {
            abort(500, '用户不存在');
        }

        $inviteCode = new InviteCode();
        $inviteCode->user_id = $userId;
        $inviteCode->code = Helper::randomChar(8);
        if (!$inviteCode->save()) {
            abort(500, '生成邀请码失败');
        }

        return response([
            'data' => $inviteCode->code
        ]);
    }

    public function thirdPartyLoginInit(Request $request)
    {
        $params = $request->validate([
            'redirect_uri' => 'required|string',
            'state' => 'nullable|string'
        ]);

        $redirectUri = $this->sanitizeThirdPartyRedirectUri($params['redirect_uri']);
        $state = isset($params['state']) ? trim((string)$params['state']) : null;
        if ($state !== null && $state !== '' && strlen($state) > 128) {
            abort(422, 'state is too long');
        }
        if ($state === '') {
            $state = null;
        }

        $token = Helper::guid();
        Cache::put(CacheKey::get('THIRD_PARTY_LOGIN_REQUEST', $token), [
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'created_at' => time()
        ], self::THIRD_PARTY_LOGIN_TTL);

        $apiVersion = $this->resolveApiVersion($request);
        return response([
            'data' => [
                'token' => $token,
                'url' => $this->buildThirdPartyLoginUrl($token, $apiVersion),
                'expires_in' => self::THIRD_PARTY_LOGIN_TTL,
                'app_name' => $this->getThirdPartyAppName()
            ]
        ]);
    }

    public function thirdPartyLoginAuthorize(Request $request)
    {
        $token = trim((string)$request->input('token'));
        if ($token === '') {
            return response($this->renderThirdPartyLoginError('Missing login token.'), 400)
                ->header('Content-Type', 'text/html; charset=UTF-8');
        }

        $payload = Cache::get(CacheKey::get('THIRD_PARTY_LOGIN_REQUEST', $token));
        if (!$payload) {
            return response($this->renderThirdPartyLoginError('Login request expired.'), 410)
                ->header('Content-Type', 'text/html; charset=UTF-8');
        }

        return response($this->renderThirdPartyLoginPage($token), 200)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function thirdPartyLoginApprove(Request $request)
    {
        return $this->handleThirdPartyLoginDecision($request, true);
    }

    public function thirdPartyLoginReject(Request $request)
    {
        return $this->handleThirdPartyLoginDecision($request, false);
    }

    public function thirdPartyLoginExchange(Request $request)
    {
        $params = $request->validate([
            'code' => 'required|string',
            'redirect_uri' => 'required|string'
        ]);

        $code = trim((string)$params['code']);
        if ($code === '') {
            abort(422, 'code is required');
        }

        $redirectUri = $this->sanitizeThirdPartyRedirectUri($params['redirect_uri']);

        $cacheKey = CacheKey::get('THIRD_PARTY_LOGIN_CODE', $code);
        $payload = Cache::pull($cacheKey);
        if (!$payload) {
            abort(410, '授权码已过期');
        }
        if (!isset($payload['redirect_uri']) || $payload['redirect_uri'] !== $redirectUri) {
            abort(422, 'redirect_uri is invalid');
        }

        $user = User::find($payload['user_id'] ?? null);
        if (!$user) {
            abort(404, '用户不存在');
        }
        if ($user->banned) {
            abort(403, '账号已被封禁');
        }

        $authService = new AuthService($user);
        $authData = $authService->generateAuthData($request);

        return response([
            'data' => [
                'access_token' => $authData['auth_data'] ?? null,
                'token_type' => 'bearer'
            ]
        ]);
    }

    private function handleThirdPartyLoginDecision(Request $request, bool $approved)
    {
        $params = $request->validate([
            'token' => 'required|string'
        ]);
        $token = trim((string)$params['token']);
        $cacheKey = CacheKey::get('THIRD_PARTY_LOGIN_REQUEST', $token);
        $payload = Cache::get($cacheKey);
        if (!$payload) {
            abort(410, '登录请求已过期');
        }

        $authUser = $this->resolveAuthUser($request);
        if (!$authUser) {
            abort(403, '未登录或登陆已过期');
        }

        $user = User::find($authUser['id']);
        if (!$user) {
            abort(404, '用户不存在');
        }
        if ($user->banned) {
            abort(403, '账号已被封禁');
        }

        Cache::forget($cacheKey);

        $authCode = null;
        $params = [
            'state' => $payload['state'] ?? null
        ];

        if ($approved) {
            $authCode = Helper::guid();
            Cache::put(CacheKey::get('THIRD_PARTY_LOGIN_CODE', $authCode), [
                'user_id' => $user->id,
                'redirect_uri' => $payload['redirect_uri'],
                'created_at' => time()
            ], self::THIRD_PARTY_LOGIN_CODE_TTL);
            $params['code'] = $authCode;
        } else {
            $params['error'] = 'access_denied';
        }

        $redirectUrl = $this->buildThirdPartyRedirectUrl($payload['redirect_uri'], $params);

        return response([
            'data' => [
                'redirect_url' => $redirectUrl,
                'code' => $authCode,
                'expires_in' => $approved ? self::THIRD_PARTY_LOGIN_CODE_TTL : null
            ]
        ]);
    }

    private function resolveAuthUser(Request $request): ?array
    {
        $authorization = $request->input('auth_data') ?? $request->header('authorization');
        if (!$authorization) {
            return null;
        }
        $user = AuthService::decryptAuthData($authorization);
        if (!$user || !isset($user['id'])) {
            return null;
        }
        return $user;
    }

    private function sanitizeThirdPartyRedirectUri(string $redirectUri): string
    {
        $redirectUri = trim($redirectUri);
        if ($redirectUri === '') {
            abort(422, 'redirect_uri is required');
        }
        if (strlen($redirectUri) > self::THIRD_PARTY_LOGIN_REDIRECT_MAX_LENGTH) {
            abort(422, 'redirect_uri is too long');
        }
        if (preg_match('/\\s/', $redirectUri)) {
            abort(422, 'redirect_uri is invalid');
        }

        $parts = parse_url($redirectUri);
        if ($parts === false || empty($parts['scheme'])) {
            abort(422, 'redirect_uri is invalid');
        }

        $scheme = strtolower($parts['scheme']);
        if ($scheme === 'javascript') {
            abort(422, 'redirect_uri is invalid');
        }
        if (in_array($scheme, ['http', 'https'], true) && empty($parts['host'])) {
            abort(422, 'redirect_uri is invalid');
        }

        if (!$this->isThirdPartyRedirectAllowed($redirectUri)) {
            abort(422, 'redirect_uri is not allowed');
        }

        return $redirectUri;
    }

    private function isThirdPartyRedirectAllowed(string $redirectUri): bool
    {
        $whitelist = $this->getThirdPartyRedirectWhitelist();
        if (empty($whitelist)) {
            return $this->isRedirectSameOrigin($redirectUri);
        }

        foreach ($whitelist as $allowed) {
            if ($allowed === '') {
                continue;
            }
            if (stripos($allowed, '://') !== false) {
                if (str_starts_with($redirectUri, $allowed)) {
                    return true;
                }
                continue;
            }
            $host = parse_url($redirectUri, PHP_URL_HOST);
            if (!$host) {
                continue;
            }
            if (strcasecmp($host, $allowed) === 0) {
                return true;
            }
            if (str_starts_with($allowed, '*.')) {
                $domain = substr($allowed, 2);
                if ($domain !== '' && $this->hostMatchesDomain($host, $domain)) {
                    return true;
                }
                continue;
            }
            if ($this->hostMatchesDomain($host, $allowed)) {
                return true;
            }
        }

        return false;
    }

    private function hostMatchesDomain(string $host, string $domain): bool
    {
        if (strcasecmp($host, $domain) === 0) {
            return true;
        }
        return str_ends_with($host, '.' . $domain);
    }

    private function isRedirectSameOrigin(string $redirectUri): bool
    {
        $appUrl = config('v2board.app_url');
        if (!$appUrl) {
            return false;
        }
        $appHost = parse_url($appUrl, PHP_URL_HOST);
        $redirectHost = parse_url($redirectUri, PHP_URL_HOST);
        if (!$appHost || !$redirectHost) {
            return false;
        }
        return strcasecmp($appHost, $redirectHost) === 0;
    }

    private function getThirdPartyRedirectWhitelist(): array
    {
        $whitelist = config('v2board.third_party_login_redirect_uri_whitelist', []);
        if (is_string($whitelist)) {
            $whitelist = preg_split('/[\r\n,]+/', $whitelist);
        }
        if (!is_array($whitelist)) {
            return [];
        }
        return array_values(array_filter(array_map('trim', $whitelist), static function ($value) {
            return $value !== '';
        }));
    }

    private function buildThirdPartyLoginUrl(string $token, string $apiVersion): string
    {
        $version = $apiVersion === 'v3' ? 'v3' : 'v1';
        $path = '/api/' . $version . '/passport/auth/thirdPartyLogin?token=' . urlencode($token);
        if ($appUrl = config('v2board.app_url')) {
            return rtrim($appUrl, '/') . $path;
        }
        return url($path);
    }

    private function buildThirdPartyRedirectUrl(string $redirectUri, array $params): string
    {
        $filtered = array_filter($params, function ($value) {
            return $value !== null && $value !== '';
        });

        $fragment = '';
        $base = $redirectUri;
        $hashPos = strpos($base, '#');
        if ($hashPos !== false) {
            $fragment = substr($base, $hashPos + 1);
            $base = substr($base, 0, $hashPos);
        }

        $query = '';
        $queryPos = strpos($base, '?');
        if ($queryPos !== false) {
            $query = substr($base, $queryPos + 1);
            $base = substr($base, 0, $queryPos);
        }

        parse_str($query, $queryParams);
        $queryParams = array_merge($queryParams, $filtered);
        $queryString = http_build_query($queryParams);

        $result = $base;
        if ($queryString !== '') {
            $result .= '?' . $queryString;
        }
        if ($fragment !== '') {
            $result .= '#' . $fragment;
        }
        return $result;
    }

    private function renderThirdPartyLoginPage(string $token): string
    {
        $appName = htmlspecialchars($this->getThirdPartyAppName(), ENT_QUOTES, 'UTF-8');
        $safeToken = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorize {$appName}</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f6f8; color: #111827; font-family: "Segoe UI", Arial, sans-serif; }
        .card { max-width: 520px; margin: 8vh auto; background: #ffffff; border-radius: 12px; padding: 28px; box-shadow: 0 18px 38px rgba(15, 23, 42, 0.12); }
        h1 { font-size: 22px; margin: 0 0 12px; }
        p { margin: 6px 0; line-height: 1.5; }
        .status { font-weight: 600; margin-top: 12px; }
        .user { margin-top: 6px; color: #4b5563; }
        .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
        button { padding: 12px 16px; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .primary { background: #2563eb; color: #fff; }
        .secondary { background: #e2e8f0; color: #1f2937; }
        .ghost { background: #f1f5f9; color: #0f172a; }
        .hint { font-size: 13px; color: #6b7280; margin-top: 12px; }
        .error { display: none; margin-top: 12px; color: #b91c1c; }
    </style>
</head>
<body data-request-token="{$safeToken}" data-app-name="{$appName}">
    <div class="card">
        <h1>{$appName} Login Request</h1>
        <p>This application wants to access your account.</p>
        <p class="status" id="status">Checking login status...</p>
        <p class="user" id="user"></p>
        <div class="actions">
            <button class="ghost" id="login-btn">Log in to continue</button>
            <button class="primary" id="approve-btn" disabled>Authorize</button>
            <button class="secondary" id="reject-btn" disabled>Reject</button>
        </div>
        <p class="hint" id="login-hint">If the login page opens in a new tab, complete login and return here.</p>
        <p class="error" id="error"></p>
    </div>
    <script>
        (function () {
            var requestToken = document.body.getAttribute('data-request-token') || '';
            var statusEl = document.getElementById('status');
            var userEl = document.getElementById('user');
            var loginBtn = document.getElementById('login-btn');
            var approveBtn = document.getElementById('approve-btn');
            var rejectBtn = document.getElementById('reject-btn');
            var errorEl = document.getElementById('error');

            function setError(message) {
                if (!message) {
                    errorEl.textContent = '';
                    errorEl.style.display = 'none';
                    return;
                }
                errorEl.textContent = message;
                errorEl.style.display = 'block';
            }

            function setLoggedIn(email) {
                statusEl.textContent = 'Logged in';
                userEl.textContent = email ? ('Account: ' + email) : '';
                approveBtn.disabled = false;
                rejectBtn.disabled = false;
                loginBtn.disabled = true;
            }

            function setLoggedOut() {
                statusEl.textContent = 'Not logged in';
                userEl.textContent = '';
                approveBtn.disabled = true;
                rejectBtn.disabled = true;
                loginBtn.disabled = false;
            }

            function getAuthToken() {
                try {
                    var authData = localStorage.getItem('auth_data');
                    if (authData) {
                        return authData;
                    }
                    return localStorage.getItem('authorization');
                } catch (e) {
                    return null;
                }
            }

            function fetchJson(url, options) {
                var opts = options || {};
                opts.headers = opts.headers || {};
                if (opts.body && !opts.headers['Content-Type']) {
                    opts.headers['Content-Type'] = 'application/json';
                }
                return fetch(url, opts).then(function (res) {
                    return res.json().catch(function () {
                        return {};
                    }).then(function (body) {
                        if (!res.ok) {
                            var message = body && body.message ? body.message : 'Request failed';
                            throw new Error(message);
                        }
                        return body;
                    });
                });
            }

            function getApiBase() {
                var path = window.location.pathname || '';
                if (path.indexOf('/api/v3/') === 0) {
                    return '/api/v3';
                }
                return '/api/v1';
            }

            function buildUserInfoRequest(authToken) {
                var apiBase = getApiBase();
                if (apiBase === '/api/v3') {
                    return {
                        url: apiBase + '/server',
                        options: {
                            method: 'POST',
                            headers: {
                                authorization: authToken
                            },
                            body: JSON.stringify({
                                endpoint: 'user/info',
                                method: 'GET',
                                params: {}
                            })
                        }
                    };
                }
                return {
                    url: apiBase + '/user/info',
                    options: {
                        method: 'GET',
                        headers: {
                            authorization: authToken
                        }
                    }
                };
            }

            function checkLogin() {
                var authToken = getAuthToken();
                if (!authToken) {
                    setLoggedOut();
                    return;
                }
                var request = buildUserInfoRequest(authToken);
                fetchJson(request.url, request.options).then(function (body) {
                    var data = body && body.data ? body.data : {};
                    setLoggedIn(data.email || '');
                }).catch(function () {
                    setLoggedOut();
                });
            }

            function sendDecision(action) {
                setError('');
                var authToken = getAuthToken();
                if (!authToken) {
                    setLoggedOut();
                    return;
                }
                approveBtn.disabled = true;
                rejectBtn.disabled = true;
                fetchJson(getApiBase() + '/passport/auth/thirdPartyLogin/' + action, {
                    method: 'POST',
                    headers: {
                        authorization: authToken
                    },
                    body: JSON.stringify({
                        token: requestToken
                    })
                }).then(function (body) {
                    var redirectUrl = body && body.data ? body.data.redirect_url : null;
                    if (!redirectUrl) {
                        throw new Error('Missing redirect URL');
                    }
                    window.location.href = redirectUrl;
                }).catch(function (err) {
                    approveBtn.disabled = false;
                    rejectBtn.disabled = false;
                    setError(err && err.message ? err.message : 'Request failed');
                });
            }

            loginBtn.addEventListener('click', function () {
                setError('');
                try {
                    window.open('/#/login', '_blank');
                } catch (e) {
                    window.location.href = '/#/login';
                }
                statusEl.textContent = 'Login page opened. Complete login and return here.';
            });

            approveBtn.addEventListener('click', function () {
                sendDecision('approve');
            });

            rejectBtn.addEventListener('click', function () {
                sendDecision('reject');
            });

            window.addEventListener('storage', function (event) {
                if (!event) {
                    return;
                }
                if (event.key === 'auth_data' || event.key === 'authorization') {
                    checkLogin();
                }
            });

            if (!requestToken) {
                setError('Missing login token.');
                setLoggedOut();
                return;
            }

            checkLogin();
        })();
    </script>
</body>
</html>
HTML;
    }

    private function getIpGeo($ip, ?string $provider = null): array
    {
        $normalized = $this->normalizeIp($ip);
        if (!$normalized) {
            return [
                'status' => 'failed',
                'message' => '获取失败'
            ];
        }
        if (!filter_var($normalized, FILTER_VALIDATE_IP)) {
            return [
                'status' => 'failed',
                'message' => '获取失败'
            ];
        }

        $provider = $this->resolveIpGeoProvider($provider);
        $cacheKey = 'IP_GEO_' . $provider . '_' . md5($normalized);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        if ($this->isPrivateIp($normalized)) {
            $geo = [
                'status' => 'success',
                'provider' => $provider,
                'country' => 'LOCAL',
                'city' => '-',
                'isp' => '-',
                'organization' => '-'
            ];
            Cache::put($cacheKey, $geo, 60 * 60 * 24 * 30);
            return $geo;
        }

        $geo = $this->fetchIpGeoFromProvider($provider, $normalized);
        if (!$geo) {
            $failed = [
                'status' => 'failed',
                'provider' => $provider,
                'message' => '获取失败'
            ];
            Cache::put($cacheKey, $failed, 60 * 60 * 6);
            return $failed;
        }

        $geo['status'] = 'success';
        $geo['provider'] = $provider;
        Cache::put($cacheKey, $geo, 60 * 60 * 24 * 30);
        return $geo;
    }

    private function getIpGeoProviders(): array
    {
        return [
            'ipinfo' => [
                'name' => 'ipinfo.io'
            ],
            'ip-api' => [
                'name' => 'ip-api.com'
            ],
            'ipsb' => [
                'name' => 'ip.sb'
            ],
        ];
    }

    private function getDefaultIpGeoProvider(): string
    {
        $providers = $this->getIpGeoProviders();
        foreach ($providers as $key => $provider) {
            return $key;
        }
        return 'ipinfo';
    }

    private function resolveIpGeoProvider(?string $provider): string
    {
        $providers = $this->getIpGeoProviders();
        if (is_string($provider) && isset($providers[$provider])) {
            return $provider;
        }
        return $this->getDefaultIpGeoProvider();
    }

    private function fetchIpGeoFromProvider(string $provider, string $ip): ?array
    {
        switch ($provider) {
            case 'ip-api':
                return $this->fetchIpGeoFromIpApi($ip);
            case 'ipsb':
                return $this->fetchIpGeoFromIpSb($ip);
            case 'ipinfo':
            default:
                return $this->fetchIpGeoFromIpInfo($ip);
        }
    }

    private function buildGeoStreamContext()
    {
        return stream_context_create([
            'http' => [
                'timeout' => 4,
                'user_agent' => 'v2board-ip-geo'
            ]
        ]);
    }

    private function fetchIpGeoFromIpInfo(string $ip): ?array
    {
        $apiUrl = 'https://ipinfo.io/widget/demo/' . rawurlencode($ip);
        $context = $this->buildGeoStreamContext();
        $response = @file_get_contents($apiUrl, false, $context);
        if (!$response) {
            return null;
        }

        $payload = json_decode($response, true);
        $data = is_array($payload) ? ($payload['data'] ?? null) : null;
        if (!is_array($data)) {
            return null;
        }

        return [
            'country' => $data['country'] ?? '',
            'city' => isset($data['city']) && $data['city']
                ? $data['city'] . (isset($data['region']) && $data['region'] ? ', ' . $data['region'] : '')
                : ($data['region'] ?? ''),
            'isp' => isset($data['asn']['name']) && $data['asn']['name']
                ? $data['asn']['name']
                : (isset($data['company']['name']) && $data['company']['name']
                    ? $data['company']['name']
                    : ($data['org'] ?? '')),
            'organization' => $data['org']
                ?? (isset($data['company']['name']) ? $data['company']['name'] : '')
                ?? (isset($data['asn']['name']) ? $data['asn']['name'] : '')
        ];
    }

    private function fetchIpGeoFromIpApi(string $ip): ?array
    {
        $apiUrls = [
            'https://ip-api.com/json/' . rawurlencode($ip) . '?lang=zh-CN&fields=status,country,regionName,city,isp,org',
            'http://ip-api.com/json/' . rawurlencode($ip) . '?lang=zh-CN&fields=status,country,regionName,city,isp,org'
        ];
        $context = $this->buildGeoStreamContext();
        $response = null;
        foreach ($apiUrls as $apiUrl) {
            $response = @file_get_contents($apiUrl, false, $context);
            if ($response) {
                break;
            }
        }
        if (!$response) {
            return null;
        }

        $payload = json_decode($response, true);
        if (!is_array($payload) || ($payload['status'] ?? '') !== 'success') {
            return null;
        }

        return [
            'country' => $payload['country'] ?? '',
            'city' => $payload['city'] ?? ($payload['regionName'] ?? ''),
            'isp' => $payload['isp'] ?? '',
            'organization' => $payload['org'] ?? ''
        ];
    }

    private function fetchIpGeoFromIpSb(string $ip): ?array
    {
        $apiUrl = 'https://api.ip.sb/geoip/' . rawurlencode($ip);
        $context = $this->buildGeoStreamContext();
        $response = @file_get_contents($apiUrl, false, $context);
        if (!$response) {
            return null;
        }

        $payload = json_decode($response, true);
        if (!is_array($payload)) {
            return null;
        }

        $region = $payload['region'] ?? '';
        $city = $payload['city'] ?? '';
        $city = $city ? $city . ($region ? ', ' . $region : '') : $region;

        return [
            'country' => $payload['country'] ?? '',
            'city' => $city,
            'isp' => $payload['isp'] ?? '',
            'organization' => $payload['organization'] ?? ($payload['asn_organization'] ?? '')
        ];
    }

    private function normalizeIp($ip): ?string
    {
        if (!is_string($ip)) {
            return null;
        }
        $ip = trim($ip);
        if ($ip === '') {
            return null;
        }
        if (strpos($ip, ',') !== false) {
            $ip = trim(explode(',', $ip)[0]);
        }
        if (strpos($ip, '|') !== false) {
            $ip = trim(explode('|', $ip)[0]);
        }
        if (strpos($ip, '_') !== false) {
            $ip = trim(explode('_', $ip)[0]);
        }
        if (strpos($ip, '::ffff:') === 0) {
            $ip = substr($ip, 7);
        }
        if (strpos($ip, '[') === 0 && strpos($ip, ']') !== false) {
            $parts = explode(']', $ip, 2);
            $ip = ltrim($parts[0], '[');
        }
        if (preg_match('/^[0-9.]+:\d+$/', $ip) && count(explode('.', $ip)) === 4) {
            $ip = preg_replace('/:\d+$/', '', $ip);
        }
        return $ip !== '' ? $ip : null;
    }

    private function isPrivateIp(string $ip): bool
    {
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }
        return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }

    private function renderThirdPartyLoginError(string $message): string
    {
        $safeMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        return <<<HTML
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Request</title>
    <style>
        body { margin: 0; padding: 0; background: #f8fafc; color: #111827; font-family: "Segoe UI", Arial, sans-serif; }
        .card { max-width: 520px; margin: 12vh auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 18px 38px rgba(15, 23, 42, 0.12); }
        h1 { margin: 0 0 12px; font-size: 20px; }
        p { margin: 0; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Login request error</h1>
        <p>{$safeMessage}</p>
    </div>
</body>
</html>
HTML;
    }

    private function getThirdPartyAppName(): string
    {
        $name = trim((string)config('v2board.third_party_login_app_name', self::THIRD_PARTY_APP_NAME));
        if ($name === '') {
            return self::THIRD_PARTY_APP_NAME;
        }
        return mb_substr($name, 0, 80);
    }

    private function resolveApiVersion(Request $request): string
    {
        $path = ltrim((string)$request->path(), '/');
        if (strpos($path, 'api/v3/') === 0) {
            return 'v3';
        }
        return 'v1';
    }
}
