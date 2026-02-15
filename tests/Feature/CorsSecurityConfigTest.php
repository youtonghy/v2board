<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsSecurityConfigTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('v2board.api_v1_disable', 0);
    }

    public function testCorsHeadersAreNotReturnedWhenSeparationIsDisabled(): void
    {
        config()->set('v2board.cors_separate_frontend_enable', 0);
        config()->set('v2board.cors_allowed_origins', ['https://frontend.example.com']);

        $response = $this->withHeaders([
            'Origin' => 'https://frontend.example.com'
        ])->getJson('/api/v1/guest/comm/config');

        $response->assertOk();
        $response->assertHeaderMissing('Access-Control-Allow-Origin');
    }

    public function testCorsHeadersAreReturnedForWhitelistedOrigin(): void
    {
        config()->set('v2board.cors_separate_frontend_enable', 1);
        config()->set('v2board.cors_allowed_origins', ['https://frontend.example.com']);

        $response = $this->withHeaders([
            'Origin' => 'https://frontend.example.com'
        ])->getJson('/api/v1/guest/comm/config');

        $response->assertOk();
        $response->assertHeader('Access-Control-Allow-Origin', 'https://frontend.example.com');
        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
        $this->assertStringContainsString('Origin', (string)$response->headers->get('Vary'));
    }

    public function testCorsHeadersAreNotReturnedForNonWhitelistedOrigin(): void
    {
        config()->set('v2board.cors_separate_frontend_enable', 1);
        config()->set('v2board.cors_allowed_origins', ['https://frontend.example.com']);

        $response = $this->withHeaders([
            'Origin' => 'https://evil.example.com'
        ])->getJson('/api/v1/guest/comm/config');

        $response->assertOk();
        $response->assertHeaderMissing('Access-Control-Allow-Origin');
    }

    public function testPreflightRequiresWhitelistedOrigin(): void
    {
        config()->set('v2board.cors_separate_frontend_enable', 1);
        config()->set('v2board.cors_allowed_origins', ['https://frontend.example.com']);

        $allowed = $this->call(
            'OPTIONS',
            '/api/v1/guest/comm/config',
            [],
            [],
            [],
            [
                'HTTP_ORIGIN' => 'https://frontend.example.com',
                'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            ]
        );
        $allowed->assertStatus(204);
        $allowed->assertHeader('Access-Control-Allow-Origin', 'https://frontend.example.com');

        $blocked = $this->call(
            'OPTIONS',
            '/api/v1/guest/comm/config',
            [],
            [],
            [],
            [
                'HTTP_ORIGIN' => 'https://evil.example.com',
                'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            ]
        );
        $blocked->assertStatus(403);
    }
}
