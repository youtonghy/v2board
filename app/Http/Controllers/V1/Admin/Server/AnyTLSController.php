<?php

namespace App\Http\Controllers\V1\Admin\Server;

use App\Http\Controllers\Controller;
use App\Models\ServerAnytls;
use App\Utils\DynamicRate;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AnyTLSController extends Controller
{
    public function save(Request $request)
    {
        $this->normalizeEmptyStringsToNull($request, [
            'parent_id',
            'route_id',
            'tags',
            'server_name',
            'padding_scheme',
            'dynamic_rate',
        ]);

        $params = $request->validate([
            'show' => '',
            'name' => 'required',
            'group_id' => 'required|array',
            'route_id' => 'nullable|array',
            'parent_id' => 'nullable|integer',
            'host' => 'required',
            'port' => 'required',
            'server_port' => 'required',
            'tags' => 'nullable|array',
            'rate' => 'required|numeric',
            'server_name' => 'nullable',
            'insecure' => 'required|in:0,1',
            'padding_scheme' => 'nullable',
            'dynamic_rate' => 'nullable|array',
            'dynamic_rate.*.start' => 'required_with:dynamic_rate|string',
            'dynamic_rate.*.end' => 'required_with:dynamic_rate|string',
            'dynamic_rate.*.rate' => 'required_with:dynamic_rate|numeric',
        ]);

        try {
            $params['dynamic_rate'] = DynamicRate::sanitize($params['dynamic_rate'] ?? null);
        } catch (\InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'dynamic_rate' => $exception->getMessage()
            ]);
        }

        if (array_key_exists('padding_scheme', $params)) {
            if (is_string($params['padding_scheme'])) {
                $params['padding_scheme'] = json_decode($params['padding_scheme'], true);
            }
        }

        if ($request->input('id')) {
            $server = ServerAnytls::find($request->input('id'));
            if (!$server) {
                abort(500, '服务器不存在');
            }
            try {
                $server->update($params);
            } catch (\Exception $e) {
                abort(500, '保存失败');
            }
            return response([
                'data' => true
            ]);
        }

        if (!ServerAnytls::create($params)) {
            abort(500, '创建失败');
        }

        return response([
            'data' => true
        ]);
    }

    public function drop(Request $request)
    {
        $id = (int)$request->input('id');
        if ($id <= 0) {
            abort(500, '节点ID不存在');
        }
        $server = ServerAnytls::find($id);
        if (!$server) {
            abort(500, '节点ID不存在');
        }
        return response([
            'data' => $server->delete()
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'show' => 'in:0,1'
        ], [
            'show.in' => '显示状态格式不正确'
        ]);
        $params = $request->only([
            'show',
        ]);

        $server = ServerAnytls::find($request->input('id'));

        if (!$server) {
            abort(500, '该服务器不存在');
        }
        try {
            $server->update($params);
        } catch (\Exception $e) {
            abort(500, '保存失败');
        }

        return response([
            'data' => true
        ]);
    }

    public function copy(Request $request)
    {
        $id = (int)$request->input('id');
        if ($id <= 0) {
            abort(500, '服务器不存在');
        }
        $server = ServerAnytls::find($id);
        if (!$server) {
            abort(500, '服务器不存在');
        }
        $server->show = 0;
        if (!ServerAnytls::create($server->toArray())) {
            abort(500, '复制失败');
        }

        return response([
            'data' => true
        ]);
    }
}
