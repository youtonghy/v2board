<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateUserPasskeysTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Schema::hasTable('v2_user_passkey')) {
            return;
        }

        Schema::create('v2_user_passkey', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id')->index();
            $table->string('credential_id', 255)->unique();
            $table->longText('public_key');
            $table->unsignedBigInteger('sign_count')->default(0);
            $table->string('transports', 255)->nullable()->default(null);
            $table->string('name', 64)->nullable()->default(null);
            $table->string('aaguid', 64)->nullable()->default(null);
            $table->boolean('is_multi_device')->default(0);
            $table->boolean('is_backup_eligible')->default(0);
            $table->unsignedInteger('last_used_at')->nullable()->default(null);
            $table->unsignedInteger('created_at');
            $table->unsignedInteger('updated_at');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('v2_user_passkey');
    }
}
