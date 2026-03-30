<?php

namespace App\Utils;

class RegisterMode
{
    public const OPEN = 0;
    public const INVITE_ONLY = 1;
    public const CLOSED = 2;

    public static function resolve(?array $config = null): int
    {
        $config = $config ?? (array)config('v2board', []);
        $mode = $config['register_mode'] ?? null;
        if ($mode !== null && $mode !== '') {
            $mode = (int)$mode;
            if (in_array($mode, [self::OPEN, self::INVITE_ONLY, self::CLOSED], true)) {
                return $mode;
            }
        }

        $stopRegister = (int)($config['stop_register'] ?? 0);
        $publicRegisterEnable = (int)($config['public_register_enable'] ?? 0);
        $inviteForce = (int)($config['invite_force'] ?? 0);

        if ($stopRegister === 1) {
            return self::CLOSED;
        }

        if ($publicRegisterEnable === 1 && $inviteForce !== 1) {
            return self::OPEN;
        }

        return self::INVITE_ONLY;
    }

    public static function legacyFlagsForMode(?int $mode = null): array
    {
        $mode = $mode ?? self::resolve();

        switch ((int)$mode) {
            case self::OPEN:
                return [
                    'stop_register' => 0,
                    'public_register_enable' => 1,
                    'invite_force' => 0,
                ];
            case self::CLOSED:
                return [
                    'stop_register' => 1,
                    'public_register_enable' => 0,
                    'invite_force' => 0,
                ];
            case self::INVITE_ONLY:
            default:
                return [
                    'stop_register' => 0,
                    'public_register_enable' => 0,
                    'invite_force' => 1,
                ];
        }
    }

    public static function canPublicRegister(?int $mode = null): bool
    {
        $mode = $mode ?? self::resolve();
        return (int)$mode === self::OPEN;
    }

    public static function canInviteLinkRegister(?int $mode = null): bool
    {
        $mode = $mode ?? self::resolve();
        return in_array((int)$mode, [self::OPEN, self::INVITE_ONLY], true);
    }

    public static function isClosed(?int $mode = null): bool
    {
        $mode = $mode ?? self::resolve();
        return (int)$mode === self::CLOSED;
    }

    public static function isInviteOnly(?int $mode = null): bool
    {
        $mode = $mode ?? self::resolve();
        return (int)$mode === self::INVITE_ONLY;
    }
}
