<?php

namespace Tests\Unit;

use App\Http\Controllers\V1\Admin\UserController;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ThirdPartyRedirectWhitelistTest extends TestCase
{
    private function invokePrivate(object $object, string $method, array $args = [])
    {
        $reflection = new \ReflectionMethod($object, $method);
        $reflection->setAccessible(true);
        return $reflection->invokeArgs($object, $args);
    }

    public function testAbsoluteWhitelistRequiresSameHostNotPrefix(): void
    {
        config()->set('v2board.third_party_login_redirect_uri_whitelist', [
            'https://trusted.example.com'
        ]);

        $controller = new UserController();

        $this->assertTrue($this->invokePrivate($controller, 'isThirdPartyRedirectAllowed', [
            'https://trusted.example.com/callback'
        ]));

        $this->assertFalse($this->invokePrivate($controller, 'isThirdPartyRedirectAllowed', [
            'https://trusted.example.com.evil.tld/callback'
        ]));

        $this->assertFalse($this->invokePrivate($controller, 'isThirdPartyRedirectAllowed', [
            'https://trusted.example.com@evil.tld/callback'
        ]));
    }

    public function testAbsoluteWhitelistWithPathStillAllowsSubpaths(): void
    {
        config()->set('v2board.third_party_login_redirect_uri_whitelist', [
            'https://trusted.example.com/oauth/callback'
        ]);

        $controller = new UserController();

        $this->assertTrue($this->invokePrivate($controller, 'isThirdPartyRedirectAllowed', [
            'https://trusted.example.com/oauth/callback/complete'
        ]));

        $this->assertFalse($this->invokePrivate($controller, 'isThirdPartyRedirectAllowed', [
            'https://trusted.example.com/oauth/other'
        ]));
    }

    public function testSanitizeRejectsHttpUserInfoRedirectUri(): void
    {
        $controller = new UserController();

        $this->expectException(HttpException::class);
        $this->invokePrivate($controller, 'sanitizeThirdPartyRedirectUri', [
            'https://trusted.example.com@evil.tld/callback'
        ]);
    }
}
