<?php

namespace App\Http\Controllers\V1\Staff;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\UserUpdateParamUtils;
use App\Http\Requests\Admin\UserSendMail;
use App\Http\Requests\Staff\UserUpdate;
use App\Jobs\SendEmailJob;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    use UserUpdateParamUtils;

    public function getUserInfoById(Request $request)
    {
        if (empty($request->input('id'))) {
            abort(500, '参数错误');
        }
        $user = User::where('is_admin', 0)
            ->where('id', $request->input('id'))
            ->where('is_staff', 0)
            ->first();
        if (!$user) abort(500, '用户不存在');
        return response([
            'data' => $user
        ]);
    }

    public function update(UserUpdate $request)
    {
        $params = $request->validated();
        $user = User::where('id', $request->input('id'))
            ->where('is_admin', 0)
            ->where('is_staff', 0)
            ->first();
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
                'banned',
            ] as $key) {
                if (array_key_exists($key, $params)) {
                    $params[$key] = $this->normalizeOptionalInt($params[$key]);
                }
            }
            $params = $this->filterParamsByExistingColumns($user->getTable(), $params);
            $user->update($params);
        } catch (QueryException $e) {
            Log::channel('daily')->error('Staff user update failed', [
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
            Log::channel('daily')->error('Staff user update failed', [
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

    public function sendMail(UserSendMail $request)
    {
        $sortType = in_array($request->input('sort_type'), ['ASC', 'DESC']) ? $request->input('sort_type') : 'DESC';
        $sort = $request->input('sort') ? $request->input('sort') : 'created_at';
        $builder = User::where('is_admin', 0)
            ->where('is_staff', 0)
            ->orderBy($sort, $sortType);
        $this->filter($request, $builder);
        $users = $builder->get();
        foreach ($users as $user) {
            SendEmailJob::dispatch([
                'email' => $user->email,
                'subject' => $request->input('subject'),
                'template_name' => 'notify',
                'template_value' => [
                    'name' => config('v2board.app_name', 'V2Board'),
                    'url' => config('v2board.app_url'),
                    'content' => $request->input('content')
                ]
            ]);
        }

        return response([
            'data' => true
        ]);
    }

    public function ban(Request $request)
    {
        $sortType = in_array($request->input('sort_type'), ['ASC', 'DESC']) ? $request->input('sort_type') : 'DESC';
        $sort = $request->input('sort') ? $request->input('sort') : 'created_at';
        $builder = User::where('is_admin', 0)
            ->where('is_staff', 0)
            ->orderBy($sort, $sortType);
        $this->filter($request, $builder);
        try {
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
}
