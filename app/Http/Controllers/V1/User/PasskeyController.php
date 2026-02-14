<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PasskeyService;
use Illuminate\Http\Request;

class PasskeyController extends Controller
{
    public function registerOptions(Request $request)
    {
        $this->ensurePasskeyEnabled();
        $user = $this->resolveCurrentUser($request);
        $service = new PasskeyService();
        try {
            return response([
                'data' => $service->beginRegistration($user, $request)
            ]);
        } catch (\Throwable $e) {
            abort(500, $e->getMessage());
        }
    }

    public function registerVerify(Request $request)
    {
        $this->ensurePasskeyEnabled();
        $user = $this->resolveCurrentUser($request);
        $params = $request->validate([
            'credential' => 'required|array',
            'credential.id' => 'nullable|string',
            'credential.rawId' => 'nullable|string',
            'credential.response' => 'required|array',
            'credential.response.clientDataJSON' => 'required|string',
            'credential.response.attestationObject' => 'required|string',
            'credential.response.transports' => 'nullable|array',
            'name' => 'nullable|string|max:64'
        ]);
        $service = new PasskeyService();
        try {
            return response([
                'data' => $service->finishRegistration($user, $request, $params['credential'], $params['name'] ?? null)
            ]);
        } catch (\Throwable $e) {
            abort(500, $e->getMessage());
        }
    }

    public function fetch(Request $request)
    {
        $this->ensurePasskeyEnabled();
        $user = $this->resolveCurrentUser($request);
        $service = new PasskeyService();
        try {
            return response([
                'data' => $service->listPasskeys($user)
            ]);
        } catch (\Throwable $e) {
            abort(500, $e->getMessage());
        }
    }

    public function remove(Request $request)
    {
        $this->ensurePasskeyEnabled();
        $user = $this->resolveCurrentUser($request);
        $params = $request->validate([
            'id' => 'required|integer|min:1'
        ]);
        $service = new PasskeyService();
        try {
            $result = $service->deletePasskey($user, (int)$params['id']);

            return response([
                'data' => $result
            ]);
        } catch (\Throwable $e) {
            abort(500, $e->getMessage());
        }
    }

    private function resolveCurrentUser(Request $request): User
    {
        $user = User::find($request->user['id'] ?? null);
        if (!$user) {
            abort(500, __('The user does not exist'));
        }
        return $user;
    }

    private function ensurePasskeyEnabled(): void
    {
        if ((int)config('v2board.passkey_login_enable', 0) !== 1) {
            abort(404, __('Passkey login is disabled'));
        }
    }
}
