<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TurnstileService
{
    private static function safeLog(string $level, string $message, array $context = []): void
    {
        try {
            Log::{$level}($message, $context);
        } catch (\Throwable $exception) {
        }
    }

    /**
     * Verify Cloudflare Turnstile token
     *
     * @param string|null $token The Turnstile token from client
     * @param string|null $ip The client IP address
     * @return bool True if verification passed, false otherwise
     */
    public static function verify(?string $token, ?string $ip = null): bool
    {
        // If Turnstile is disabled, skip verification
        if ((int)config('v2board.turnstile_enable', 0) !== 1) {
            return true;
        }

        $secretKey = config('v2board.turnstile_secret_key');

        if (empty($token)) {
            self::safeLog('warning', 'Turnstile verification failed: empty token', ['ip' => $ip]);
            return false;
        }

        if (empty($secretKey)) {
            self::safeLog('error', 'Turnstile verification failed: secret key not configured');
            return false;
        }

        try {
            $response = Http::timeout(10)
                ->asForm()
                ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                    'secret' => $secretKey,
                    'response' => $token,
                    'remoteip' => $ip
                ]);

            if (!$response->ok()) {
                self::safeLog('warning', 'Turnstile API request failed', [
                    'status' => $response->status(),
                    'ip' => $ip
                ]);
                return false;
            }

            $result = $response->json();
            $success = (bool)data_get($result, 'success', false);

            if (!$success) {
                $errorCodes = data_get($result, 'error-codes', []);
                self::safeLog('warning', 'Turnstile verification rejected', [
                    'error_codes' => $errorCodes,
                    'ip' => $ip
                ]);
            }

            return $success;
        } catch (\Throwable $e) {
            self::safeLog('error', 'Turnstile verification exception', [
                'error' => $e->getMessage(),
                'ip' => $ip
            ]);
            return false;
        }
    }
}
