<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('v2_invite_link', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->char('token', 64)->unique();
            $table->string('invitee_name', 255)->nullable();
            $table->text('content')->nullable();
            $table->unsignedInteger('visit_count')->default(0);
            $table->unsignedInteger('use_count')->default(0);
            $table->unsignedInteger('max_use')->default(1);
            $table->unsignedInteger('expired_at')->nullable();
            $table->unsignedTinyInteger('status')->default(0)->comment('0 active 1 used_up 2 expired 3 disabled');
            $table->unsignedInteger('last_visited_at')->nullable();
            $table->unsignedInteger('last_used_at')->nullable();
            $table->unsignedInteger('created_at');
            $table->unsignedInteger('updated_at');

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('v2_invite_link');
    }
};
