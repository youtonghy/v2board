<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddTotpToUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('v2_user', function (Blueprint $table) {
            $table->string('two_factor_type')->nullable()->default(null)->after('password');
            $table->boolean('two_factor_verified')->default(0)->after('two_factor_type');
            $table->string('totp_secret')->nullable()->default(null)->after('two_factor_verified');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('v2_user', function (Blueprint $table) {
            $table->dropColumn('two_factor_type');
            $table->dropColumn('two_factor_verified');
            $table->dropColumn('totp_secret');
        });
    }
}
