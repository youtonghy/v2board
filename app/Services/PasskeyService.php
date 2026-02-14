<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserPasskey;
use App\Utils\CacheKey;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use lbuchs\WebAuthn\Binary\ByteBuffer;
use lbuchs\WebAuthn\WebAuthn;
use lbuchs\WebAuthn\WebAuthnException;

class PasskeyService
{
    private const CHALLENGE_EXPIRE_SECONDS = 900;

    public function beginRegistration(User $user, Request $request): array
    {
        $webAuthn = $this->buildWebAuthn($request);
        $excludeCredentialIds = [];
        $credentials = UserPasskey::query()
            ->where('user_id', $user->id)
            ->pluck('credential_id')
            ->toArray();

        foreach ($credentials as $credentialId) {
            if (!is_string($credentialId) || $credentialId === '') {
                continue;
            }
            try {
                $excludeCredentialIds[] = $this->decodeBase64Url($credentialId);
            } catch (\Throwable $e) {
                continue;
            }
        }

        $options = $webAuthn->getCreateArgs(
            $this->buildUserHandle($user),
            $user->email,
            $user->email,
            60,
            'required',
            'preferred',
            null,
            $excludeCredentialIds
        );

        $challenge = $this->encodeBase64Url($webAuthn->getChallenge()->getBinaryString());
        Cache::put(
            CacheKey::get('PASSKEY_REGISTER_CHALLENGE', (int)$user->id),
            ['challenge' => $challenge, 'created_at' => time()],
            self::CHALLENGE_EXPIRE_SECONDS
        );
        Cache::put(
            CacheKey::get('PASSKEY_REGISTER_CHALLENGE_TOKEN', $challenge),
            ['user_id' => (int)$user->id, 'created_at' => time()],
            self::CHALLENGE_EXPIRE_SECONDS
        );

        return json_decode(json_encode($options), true);
    }

    public function finishRegistration(User $user, Request $request, array $credential, ?string $name = null): array
    {
        $clientData = $credential['response']['clientDataJSON'] ?? null;
        $attestationObject = $credential['response']['attestationObject'] ?? null;
        $responseTransports = $credential['response']['transports'] ?? [];

        if (!is_string($clientData) || !is_string($attestationObject)) {
            throw new \Exception(__('Invalid passkey registration data'));
        }

        $clientDataBinary = $this->decodeBase64Url($clientData);
        $clientDataObject = json_decode($clientDataBinary, true);
        $challengeFromClient = is_array($clientDataObject)
            ? ($clientDataObject['challenge'] ?? null)
            : null;

        $challengeValue = null;
        if (is_string($challengeFromClient) && $challengeFromClient !== '') {
            $challengeTokenCache = Cache::get(CacheKey::get('PASSKEY_REGISTER_CHALLENGE_TOKEN', $challengeFromClient));
            if (
                is_array($challengeTokenCache) &&
                (int)($challengeTokenCache['user_id'] ?? 0) === (int)$user->id
            ) {
                $challengeValue = $challengeFromClient;
            }
        }

        if (!$challengeValue) {
            $cacheKey = CacheKey::get('PASSKEY_REGISTER_CHALLENGE', (int)$user->id);
            $cached = Cache::get($cacheKey);
            if (!is_array($cached) || empty($cached['challenge'])) {
                throw new \Exception(__('Passkey registration challenge expired, please retry'));
            }
            $challengeValue = (string)$cached['challenge'];
        }

        $webAuthn = $this->buildWebAuthn($request);
        $challenge = $this->decodeBase64Url($challengeValue);

        try {
            $registerData = $webAuthn->processCreate(
                $clientDataBinary,
                $this->decodeBase64Url($attestationObject),
                $challenge,
                false,
                true,
                false
            );
        } catch (WebAuthnException $e) {
            throw new \Exception(__('Passkey registration verification failed: :reason', [
                'reason' => $e->getMessage()
            ]));
        }

        if (empty($registerData->credentialId)) {
            throw new \Exception(__('Unable to parse passkey credential id'));
        }

        $requestCredentialId = $credential['id'] ?? ($credential['rawId'] ?? null);
        if (!is_string($requestCredentialId) || $requestCredentialId === '') {
            throw new \Exception(__('Missing passkey credential id'));
        }

        $credentialId = $this->encodeBase64Url((string)$registerData->credentialId);
        $exists = UserPasskey::query()->where('credential_id', $credentialId)->first();
        if ($exists) {
            throw new \Exception(__('This passkey already exists'));
        }

        $label = $this->normalizePasskeyName($name);
        if ($label === null) {
            $label = 'Passkey ' . date('Y-m-d H:i');
        }

        $passkey = new UserPasskey();
        $passkey->user_id = (int)$user->id;
        $passkey->credential_id = $credentialId;
        $passkey->public_key = (string)$registerData->credentialPublicKey;
        $passkey->sign_count = (int)($registerData->signatureCounter ?? 0);
        $passkey->transports = $this->normalizeTransports($responseTransports);
        $passkey->name = $label;
        $passkey->aaguid = $this->extractAaguid($registerData->AAGUID ?? null);
        $passkey->is_multi_device = !empty($registerData->isBackedUp) ? 1 : 0;
        $passkey->is_backup_eligible = !empty($registerData->isBackupEligible) ? 1 : 0;
        $passkey->last_used_at = null;
        if (!$passkey->save()) {
            throw new \Exception(__('Failed to save passkey'));
        }

        Cache::forget(CacheKey::get('PASSKEY_REGISTER_CHALLENGE', (int)$user->id));
        Cache::forget(CacheKey::get('PASSKEY_REGISTER_CHALLENGE_TOKEN', $challengeValue));
        return $this->formatPasskey($passkey);
    }

    public function beginLogin(Request $request, ?string $redirect = null): array
    {
        $webAuthn = $this->buildWebAuthn($request);
        $options = $webAuthn->getGetArgs([], 60, true, true, true, true, true, 'preferred');
        $challenge = $this->encodeBase64Url($webAuthn->getChallenge()->getBinaryString());
        Cache::put(
            CacheKey::get('PASSKEY_LOGIN_CHALLENGE', $challenge),
            [
                'challenge' => $challenge,
                'redirect' => $redirect,
                'created_at' => time()
            ],
            self::CHALLENGE_EXPIRE_SECONDS
        );

        return json_decode(json_encode($options), true);
    }

    public function finishLogin(Request $request, array $credential): array
    {
        $credentialId = $credential['id'] ?? ($credential['rawId'] ?? null);
        $clientData = $credential['response']['clientDataJSON'] ?? null;
        $authenticatorData = $credential['response']['authenticatorData'] ?? null;
        $signature = $credential['response']['signature'] ?? null;
        $userHandle = $credential['response']['userHandle'] ?? null;

        if (
            !is_string($credentialId) ||
            !is_string($clientData) ||
            !is_string($authenticatorData) ||
            !is_string($signature)
        ) {
            throw new \Exception(__('Invalid passkey login payload'));
        }

        $clientDataJson = $this->decodeBase64Url($clientData);
        $clientDataObject = json_decode($clientDataJson, true);
        $challenge = is_array($clientDataObject) ? ($clientDataObject['challenge'] ?? null) : null;
        if (!is_string($challenge) || $challenge === '') {
            throw new \Exception(__('Missing passkey challenge'));
        }

        $cacheKey = CacheKey::get('PASSKEY_LOGIN_CHALLENGE', $challenge);
        $cached = Cache::get($cacheKey);
        if (!is_array($cached) || empty($cached['challenge'])) {
            throw new \Exception(__('Passkey login challenge expired, please retry'));
        }

        $passkey = UserPasskey::query()
            ->where('credential_id', $credentialId)
            ->first();
        if (!$passkey) {
            throw new \Exception(__('Passkey not found'));
        }

        $user = User::find($passkey->user_id);
        if (!$user) {
            throw new \Exception(__('The user does not exist'));
        }
        if ((int)$user->banned === 1) {
            throw new \Exception(__('Your account has been suspended'));
        }

        if (is_string($userHandle) && $userHandle !== '') {
            $decodedUserHandle = $this->decodeBase64Url($userHandle);
            if ($decodedUserHandle !== $this->buildUserHandle($user)) {
                throw new \Exception(__('Passkey user handle mismatch'));
            }
        }

        $webAuthn = $this->buildWebAuthn($request);
        try {
            $webAuthn->processGet(
                $clientDataJson,
                $this->decodeBase64Url($authenticatorData),
                $this->decodeBase64Url($signature),
                $passkey->public_key,
                $this->decodeBase64Url($challenge),
                (int)$passkey->sign_count,
                false,
                true
            );
        } catch (WebAuthnException $e) {
            throw new \Exception(__('Passkey login verification failed: :reason', [
                'reason' => $e->getMessage()
            ]));
        }

        $newCounter = $webAuthn->getSignatureCounter();
        if (is_int($newCounter)) {
            $passkey->sign_count = $newCounter;
        }
        $passkey->last_used_at = time();
        $passkey->save();
        Cache::forget($cacheKey);

        $authService = new AuthService($user);
        $authData = $authService->generateAuthData($request);
        if (!empty($cached['redirect']) && is_string($cached['redirect'])) {
            $authData['redirect'] = $cached['redirect'];
        }
        return $authData;
    }

    public function listPasskeys(User $user): array
    {
        $list = UserPasskey::query()
            ->where('user_id', (int)$user->id)
            ->orderByDesc('id')
            ->get();

        $result = [];
        foreach ($list as $item) {
            $result[] = $this->formatPasskey($item);
        }
        return $result;
    }

    public function deletePasskey(User $user, int $id): bool
    {
        $passkey = UserPasskey::query()
            ->where('id', $id)
            ->where('user_id', (int)$user->id)
            ->first();
        if (!$passkey) {
            throw new \Exception(__('Passkey not found'));
        }
        return (bool)$passkey->delete();
    }

    public function countPasskeys(User $user): int
    {
        return (int)UserPasskey::query()
            ->where('user_id', (int)$user->id)
            ->count();
    }

    private function buildWebAuthn(Request $request): WebAuthn
    {
        return new WebAuthn(
            config('v2board.app_name', 'V2Board'),
            $this->resolveRpId($request),
            ['none'],
            true
        );
    }

    private function resolveRpId(Request $request): string
    {
        $host = null;
        $appUrl = config('v2board.app_url');
        if (is_string($appUrl) && $appUrl !== '') {
            $host = parse_url($appUrl, PHP_URL_HOST);
        }
        if (!is_string($host) || $host === '') {
            $host = $request->getHost();
        }
        if (!is_string($host) || $host === '') {
            throw new \Exception(__('Unable to determine RP ID'));
        }
        return strtolower(trim($host));
    }

    private function buildUserHandle(User $user): string
    {
        return 'uid:' . (int)$user->id;
    }

    private function encodeBase64Url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function decodeBase64Url(string $value): string
    {
        return ByteBuffer::fromBase64Url($value)->getBinaryString();
    }

    private function normalizePasskeyName(?string $name): ?string
    {
        if (!is_string($name)) {
            return null;
        }
        $cleanName = trim($name);
        if ($cleanName === '') {
            return null;
        }
        return mb_substr($cleanName, 0, 64);
    }

    private function normalizeTransports($transports): ?string
    {
        if (!is_array($transports) || count($transports) === 0) {
            return null;
        }
        $allowed = ['usb', 'nfc', 'ble', 'hybrid', 'internal', 'smart-card', 'cable'];
        $normalized = [];
        foreach ($transports as $transport) {
            if (!is_string($transport)) {
                continue;
            }
            $transport = trim($transport);
            if ($transport === '' || !in_array($transport, $allowed, true)) {
                continue;
            }
            if (!in_array($transport, $normalized, true)) {
                $normalized[] = $transport;
            }
        }
        if (count($normalized) === 0) {
            return null;
        }
        return json_encode($normalized, JSON_UNESCAPED_UNICODE);
    }

    private function extractAaguid($aaguid): ?string
    {
        if ($aaguid === null) {
            return null;
        }
        if (is_object($aaguid) && method_exists($aaguid, 'getHex')) {
            $hex = strtolower(trim((string)$aaguid->getHex()));
            if ($hex === '') {
                return null;
            }
            return mb_substr(str_replace('-', '', $hex), 0, 64);
        }
        if (is_string($aaguid)) {
            $raw = trim($aaguid);
            if ($raw === '') {
                return null;
            }

            $lower = strtolower($raw);
            if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $lower)) {
                return str_replace('-', '', $lower);
            }
            if (preg_match('/^[0-9a-f]{32}$/', $lower)) {
                return $lower;
            }

            // lbuchs/webauthn returns binary 16-byte AAGUID by default.
            if (strlen($raw) === 16 || preg_match('/[^\x20-\x7E]/', $raw)) {
                return strtolower(bin2hex($raw));
            }

            return mb_substr($lower, 0, 64);
        }
        return null;
    }

    private function formatPasskey(UserPasskey $passkey): array
    {
        $transports = [];
        if (is_string($passkey->transports) && $passkey->transports !== '') {
            $decoded = json_decode($passkey->transports, true);
            if (is_array($decoded)) {
                $transports = array_values($decoded);
            }
        }

        return [
            'id' => (int)$passkey->id,
            'name' => $passkey->name ?: 'Passkey',
            'credential_id' => $passkey->credential_id,
            'credential_id_suffix' => mb_substr((string)$passkey->credential_id, -8),
            'transports' => $transports,
            'is_multi_device' => (int)$passkey->is_multi_device,
            'is_backup_eligible' => (int)$passkey->is_backup_eligible,
            'last_used_at' => $passkey->last_used_at ? (int)$passkey->last_used_at : null,
            'created_at' => $passkey->created_at ? (int)$passkey->created_at : null
        ];
    }
}
