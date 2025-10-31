<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Cache;

class MailOAuthService
{
    private const CACHE_PREFIX = 'mail_oauth_token';

    public function getAccessToken(): string
    {
        if ((int)config('v2board.email_oauth_enable', 0) !== 1) {
            throw new \RuntimeException('OAuth 2.0 未启用');
        }

        $provider = strtolower(config('v2board.email_oauth_provider', 'google'));
        $identity = config('v2board.email_username', 'email');
        $cacheKey = self::CACHE_PREFIX . ':' . md5($provider . '|' . $identity);

        if (Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            if (!empty($cached)) {
                return $cached;
            }
        }

        switch ($provider) {
            case 'google':
                $token = $this->requestGoogleToken();
                break;
            case 'microsoft':
            case 'azure':
            case 'office365':
                $token = $this->requestMicrosoftToken();
                break;
            default:
                throw new \RuntimeException("暂不支持的OAuth提供商: {$provider}");
        }

        $accessToken = $token['access_token'] ?? null;
        if (empty($accessToken)) {
            throw new \RuntimeException('OAuth 2.0 未返回访问令牌');
        }
        $expiresIn = (int)($token['expires_in'] ?? 3600);
        $ttl = max(60, $expiresIn - 120);
        Cache::put($cacheKey, $accessToken, $ttl);

        return $accessToken;
    }

    private function requestGoogleToken(): array
    {
        $clientId = config('v2board.email_oauth_client_id');
        $clientSecret = config('v2board.email_oauth_client_secret');
        $refreshToken = config('v2board.email_oauth_refresh_token');

        $this->assertRequired([$clientId, $clientSecret, $refreshToken], 'Google OAuth 配置缺失');

        return $this->sendTokenRequest(
            'https://oauth2.googleapis.com/token',
            [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'refresh_token' => $refreshToken,
                'grant_type' => 'refresh_token',
            ]
        );
    }

    private function requestMicrosoftToken(): array
    {
        $clientId = config('v2board.email_oauth_client_id');
        $clientSecret = config('v2board.email_oauth_client_secret');
        $refreshToken = config('v2board.email_oauth_refresh_token');
        $tenant = config('v2board.email_oauth_tenant', 'common');
        $scope = config('v2board.email_oauth_scope', 'https://outlook.office365.com/.default');

        $this->assertRequired([$clientId, $clientSecret, $refreshToken], 'Microsoft OAuth 配置缺失');

        $tokenUrl = rtrim("https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/token", '/');

        return $this->sendTokenRequest(
            $tokenUrl,
            [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'refresh_token' => $refreshToken,
                'grant_type' => 'refresh_token',
                'scope' => $scope,
            ]
        );
    }

    private function sendTokenRequest(string $url, array $formParams): array
    {
        $client = new Client([
            'timeout' => 10,
        ]);

        try {
            $response = $client->post($url, [
                'form_params' => $formParams,
            ]);
        } catch (\Throwable $e) {
            throw new \RuntimeException('OAuth 2.0 请求失败: ' . $e->getMessage(), $e->getCode(), $e);
        }

        $body = (string)$response->getBody();
        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('OAuth 2.0 返回非JSON数据');
        }
        if (isset($data['error'])) {
            $message = $data['error_description'] ?? $data['error'];
            throw new \RuntimeException('OAuth 2.0 请求错误: ' . $message);
        }

        return $data;
    }

    private function assertRequired(array $values, string $message): void
    {
        foreach ($values as $value) {
            if (empty($value)) {
                throw new \RuntimeException($message);
            }
        }
    }
}
