<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use App\Utils\DynamicRate;

class ServerShadowsocksSave extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $emptyToNullKeys = [
            'parent_id',
            'sort',
            'route_id',
            'tags',
            'obfs',
        ];
        foreach ($emptyToNullKeys as $key) {
            if ($this->input($key) === '') {
                $this->merge([$key => null]);
            }
        }

        $obfs = $this->input('obfs');
        if ($obfs !== 'http') {
            $this->request->remove('obfs_settings');
        }

        $dynamicRate = $this->input('dynamic_rate');
        if ($dynamicRate === '' || $dynamicRate === null || $dynamicRate === []) {
            $this->request->remove('dynamic_rate');
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'show' => '',
            'name' => 'required',
            'group_id' => 'required|array',
            'parent_id' => 'nullable|integer',
            'route_id' => 'nullable|array',
            'host' => 'required',
            'port' => 'required',
            'server_port' => 'required|integer',
            'cipher' => 'required|in:aes-128-gcm,aes-192-gcm,aes-256-gcm,chacha20-ietf-poly1305,2022-blake3-aes-128-gcm,2022-blake3-aes-256-gcm',
            'obfs' => 'nullable|in:http',
            'obfs_settings' => 'nullable|array',
            'tags' => 'nullable|array',
            'rate' => 'required|numeric',
            'dynamic_rate' => 'nullable|array',
            'dynamic_rate.*.start' => 'required_with:dynamic_rate|string',
            'dynamic_rate.*.end' => 'required_with:dynamic_rate|string',
            'dynamic_rate.*.rate' => 'required_with:dynamic_rate|numeric'
        ];
    }

    public function messages()
    {
        return [
            'name.required' => '节点名称不能为空',
            'group_id.required' => '权限组不能为空',
            'group_id.array' => '权限组格式不正确',
            'route_id.array' => '路由组格式不正确',
            'parent_id.integer' => '父节点格式不正确',
            'host.required' => '节点地址不能为空',
            'port.required' => '连接端口不能为空',
            'server_port.required' => '后端服务端口不能为空',
            'server_port.integer' => '后端服务端口格式不正确',
            'cipher.required' => '加密方式不能为空',
            'tags.array' => '标签格式不正确',
            'rate.required' => '倍率不能为空',
            'rate.numeric' => '倍率格式不正确',
            'obfs.in' => '混淆格式不正确',
            'obfs_settings.array' => '混淆设置格式不正确',
            'dynamic_rate.array' => '动态倍率格式不正确',
            'dynamic_rate.*.start.required_with' => '动态倍率开始时间不能为空',
            'dynamic_rate.*.end.required_with' => '动态倍率结束时间不能为空',
            'dynamic_rate.*.rate.required_with' => '动态倍率数值不能为空',
            'dynamic_rate.*.rate.numeric' => '动态倍率需为数字'
        ];
    }

    protected function passedValidation(): void
    {
        $dynamicRate = $this->input('dynamic_rate');

        if (!$dynamicRate) {
            return;
        }

        try {
            $sanitized = DynamicRate::sanitize($dynamicRate);
            $this->merge(['dynamic_rate' => $sanitized]);
        } catch (\InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'dynamic_rate' => $exception->getMessage()
            ]);
        }
    }
}
