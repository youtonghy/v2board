<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('v2_user', function (Blueprint $table) {
            if (!Schema::hasColumn('v2_user', 'sso_provider')) {
                $table->string('sso_provider', 32)->nullable()->after('token');
            }
            if (!Schema::hasColumn('v2_user', 'sso_subject')) {
                $table->string('sso_subject', 191)->nullable()->after('sso_provider');
            }
            $table->unique(['sso_provider', 'sso_subject'], 'v2_user_sso_unique');
        });
    }

    public function down(): void
    {
        Schema::table('v2_user', function (Blueprint $table) {
            if (Schema::hasColumn('v2_user', 'sso_subject')) {
                $table->dropUnique('v2_user_sso_unique');
            }
        });
        Schema::table('v2_user', function (Blueprint $table) {
            if (Schema::hasColumn('v2_user', 'sso_provider')) {
                $table->dropColumn('sso_provider');
            }
            if (Schema::hasColumn('v2_user', 'sso_subject')) {
                $table->dropColumn('sso_subject');
            }
        });
    }
};
