<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class TurnstileService
{
    public static function verify(?string $token, ?string $ip = null): bool
    {
        if ((int)config('v2board.turnstile_enable', 0) !== 1) {
            return true;
        }
        if (empty($token) || empty(config('v2board.turnstile_secret_key'))) {
            return false;
        }
        try {
            $response = Http::asForm()->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => config('v2board.turnstile_secret_key'),
                'response' => $token,
                'remoteip' => $ip
            ]);
        } catch (\Throwable $e) {
            return false;
        }
        if (!$response->ok()) {
            return false;
        }
        return (bool)data_get($response->json(), 'success');
    }
}
