<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPasskey extends Model
{
    protected $table = 'v2_user_passkey';

    protected $dateFormat = 'U';

    protected $guarded = ['id'];

    protected $casts = [
        'created_at' => 'timestamp',
        'updated_at' => 'timestamp'
    ];
}
