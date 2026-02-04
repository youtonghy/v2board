<?php

namespace App\Http\Controllers\V1\Admin\Server;

use App\Http\Controllers\Controller;
use App\Models\ServerTuic;
use App\Utils\DynamicRate;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TuicController extends Controller
{
    public function save(Request $request)
    {
        $this->normalizeEmptyStringsToNull($request, [
            'parent_id',
            'route_id',
            'tags',
            'server_name',
            'udp_relay_mode',
            'congestion_control',
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
            'disable_sni' => 'required|in:0,1',
            'udp_relay_mode' => 'nullable',
            'zero_rtt_handshake' => 'required|in:0,1',
            'congestion_control' => 'nullable',
            'dynamic_rate' => 'nullable|array',
            'dynamic_rate.*.start' => 'required_with:dynamic_rate|string',
            'dynamic_rate.*.end' => 'required_with:dynamic_rate|string',
            'dynamic_rate.*.rate' => 'required_with:dynamic_rate|numeric'
        ]);

        try {
            $params['dynamic_rate'] = DynamicRate::sanitize($params['dynamic_rate'] ?? null);
        } catch (\InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'dynamic_rate' => $exception->getMessage()
            ]);
        }

        if ($request->input('id')) {
            $server = ServerTuic::find($request->input('id'));
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

        if (!ServerTuic::create($params)) {
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
        $server = ServerTuic::find($id);
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

        $server = ServerTuic::find($request->input('id'));

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
        $server = ServerTuic::find($id);
        if (!$server) {
            abort(500, '服务器不存在');
        }
        $server->show = 0;
        if (!ServerTuic::create($server->toArray())) {
            abort(500, '复制失败');
        }

        return response([
            'data' => true
        ]);
    }
}
