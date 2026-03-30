<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InviteLink extends Model
{
    protected $table = 'v2_invite_link';

    protected $dateFormat = 'U';

    protected $guarded = ['id'];

    protected $casts = [
        'created_at' => 'timestamp',
        'updated_at' => 'timestamp'
    ];

    public const STATUS_ACTIVE = 0;
    public const STATUS_USED_UP = 1;
    public const STATUS_EXPIRED = 2;
    public const STATUS_DISABLED = 3;

    public function isExpired(): bool
    {
        return $this->expired_at !== null && (int)$this->expired_at <= time();
    }

    public function hasRemainingUses(): bool
    {
        return (int)$this->use_count < max(1, (int)$this->max_use);
    }

    public function isAvailable(): bool
    {
        if ((int)$this->status !== self::STATUS_ACTIVE) {
            return false;
        }

        if ($this->isExpired()) {
            return false;
        }

        return $this->hasRemainingUses();
    }
}
