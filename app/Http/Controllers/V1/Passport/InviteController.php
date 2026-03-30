<?php

namespace App\Http\Controllers\V1\Passport;

use App\Http\Requests\Passport\AuthRegister;
use App\Models\InviteLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InviteController extends AuthController
{
    public function fetch(Request $request)
    {
        $params = $request->validate([
            'token' => 'required|string'
        ]);

        $inviteLink = InviteLink::where('token', $params['token'])->first();
        if (!$inviteLink || !$inviteLink->isAvailable()) {
            if ($inviteLink) {
                $this->refreshInviteLinkStatus($inviteLink);
            }
            abort(404);
        }

        if ((int)config('v2board.invite_link_stats_enable', 1) === 1) {
            $now = time();
            $inviteLink->forceFill([
                'visit_count' => (int)$inviteLink->visit_count + 1,
                'last_visited_at' => $now
            ])->save();
        }

        return response([
            'data' => [
                'token' => $inviteLink->token,
                'invitee_name' => $inviteLink->invitee_name,
                'content' => $inviteLink->content,
                'remaining_uses' => max(0, (int)$inviteLink->max_use - (int)$inviteLink->use_count),
                'expired_at' => $inviteLink->expired_at,
                'is_email_verify' => (int)config('v2board.email_verify', 0),
                'is_recaptcha' => (int)config('v2board.recaptcha_enable', 0),
                'is_turnstile' => (int)config('v2board.turnstile_enable', 0),
                'recaptcha_site_key' => config('v2board.recaptcha_site_key'),
                'turnstile_site_key' => config('v2board.turnstile_site_key'),
                'app_name' => config('v2board.app_name', 'V2Board'),
                'logo' => config('v2board.logo')
            ]
        ]);
    }

    public function register(AuthRegister $request)
    {
        $params = $request->validate([
            'token' => 'required|string'
        ]);

        return DB::transaction(function () use ($request, $params) {
            $inviteLink = InviteLink::lockForUpdate()->where('token', $params['token'])->first();
            if (!$inviteLink || !$inviteLink->isAvailable()) {
                if ($inviteLink) {
                    $this->refreshInviteLinkStatus($inviteLink);
                }
                abort(404);
            }

            $this->validateRegistrationRequest($request, false);

            $user = $this->createRegisteredUser($request);
            $user->invite_user_id = $inviteLink->user_id;
            $this->applyTryOutPlan($user);
            $authData = $this->persistRegisteredUser($user, $request);

            $inviteLink->use_count = (int)$inviteLink->use_count + 1;
            $inviteLink->last_used_at = time();
            $this->refreshInviteLinkStatus($inviteLink);
            $inviteLink->save();

            return response()->json([
                'data' => $authData
            ]);
        });
    }

    private function refreshInviteLinkStatus(InviteLink $inviteLink): void
    {
        if ((int)$inviteLink->status === InviteLink::STATUS_DISABLED) {
            return;
        }

        if ($inviteLink->isExpired()) {
            $inviteLink->status = InviteLink::STATUS_EXPIRED;
            return;
        }

        if (!$inviteLink->hasRemainingUses()) {
            $inviteLink->status = InviteLink::STATUS_USED_UP;
            return;
        }

        $inviteLink->status = InviteLink::STATUS_ACTIVE;
    }
}
