<?php

namespace App\Services\Sso;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class CasdoorService
{
    public function isConfigured(): bool
    {
        return (int)config('v2board.sso_login_enable', 0) === 1
            && (string)config('v2board.sso_casdoor_endpoint')
            && (string)config('v2board.sso_casdoor_client_id')
            && (string)config('v2board.sso_casdoor_client_secret');
    }

    public function getAuthorizeUrl(string $state, ?string $nonce = null): string
    {
        $this->assertConfigured();
        $params = [
            'response_type' => 'code',
            'client_id' => $this->clientId(),
            'redirect_uri' => $this->getCallbackUrl(),
            'scope' => $this->scope(),
            'state' => $state,
        ];
        if ($nonce) {
            $params['nonce'] = $nonce;
        }
        return $this->baseEndpoint() . '/login/oauth/authorize?' . http_build_query($params);
    }

    public function exchangeCode(string $code): array
    {
        $this->assertConfigured();
        $response = Http::asForm()
            ->acceptJson()
            ->post($this->baseEndpoint() . '/api/login/oauth/access_token', [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $this->getCallbackUrl(),
                'client_id' => $this->clientId(),
                'client_secret' => $this->clientSecret(),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Casdoor 授权失败');
        }

        $data = $response->json();
        if (!is_array($data) || empty($data)) {
            parse_str($response->body(), $data);
        }

        if (!is_array($data) || empty($data)) {
            throw new RuntimeException('Casdoor 返回数据解析失败');
        }

        return $data;
    }

    public function fetchUserInfo(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->get($this->baseEndpoint() . '/api/userinfo');

        if ($response->failed()) {
            throw new RuntimeException('Casdoor 用户信息获取失败');
        }

        $data = $response->json();
        if (!is_array($data)) {
            throw new RuntimeException('Casdoor 用户信息解析失败');
        }
        return $data;
    }

    public function getCallbackUrl(): string
    {
        if ($custom = config('v2board.sso_callback_url')) {
            return $custom;
        }
        if ($appUrl = config('v2board.app_url')) {
            return rtrim($appUrl, '/') . '/api/v1/passport/auth/sso/callback';
        }
        return url('/api/v1/passport/auth/sso/callback');
    }

    protected function baseEndpoint(): string
    {
        return rtrim((string)config('v2board.sso_casdoor_endpoint'), '/');
    }

    protected function clientId(): string
    {
        return (string)config('v2board.sso_casdoor_client_id');
    }

    protected function clientSecret(): string
    {
        return (string)config('v2board.sso_casdoor_client_secret');
    }

    protected function scope(): string
    {
        $scope = trim((string)config('v2board.sso_casdoor_scope', 'openid profile email'));
        return $scope === '' ? 'openid profile email' : $scope;
    }

    protected function assertConfigured(): void
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('Casdoor SSO 未完成配置');
        }
    }
}
