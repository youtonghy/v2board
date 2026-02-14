<?php

namespace App\Http\Controllers\V1\Passport;

use App\Http\Controllers\Controller;
use App\Services\PasskeyService;
use Illuminate\Http\Request;

class PasskeyController extends Controller
{
    public function loginOptions(Request $request)
    {
        $this->ensurePasskeyEnabled();
        $params = $request->validate([
            'redirect' => 'nullable|string|max:255'
        ]);

        $service = new PasskeyService();
        return response([
            'data' => $service->beginLogin($request, $params['redirect'] ?? null)
        ]);
    }

    public function loginVerify(Request $request)
    {
        $this->ensurePasskeyEnabled();
        $params = $request->validate([
            'credential' => 'required|array',
            'credential.id' => 'nullable|string',
            'credential.rawId' => 'nullable|string',
            'credential.response' => 'required|array',
            'credential.response.clientDataJSON' => 'required|string',
            'credential.response.authenticatorData' => 'required|string',
            'credential.response.signature' => 'required|string',
            'credential.response.userHandle' => 'nullable|string'
        ]);

        $service = new PasskeyService();
        return response([
            'data' => $service->finishLogin($request, $params['credential'])
        ]);
    }

    private function ensurePasskeyEnabled(): void
    {
        if ((int)config('v2board.passkey_login_enable', 0) !== 1) {
            abort(404, __('Passkey login is disabled'));
        }
    }
}
