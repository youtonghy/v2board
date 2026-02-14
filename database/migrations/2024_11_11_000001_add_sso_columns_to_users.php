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
        });

        if (Schema::hasColumn('v2_user', 'sso_provider') && Schema::hasColumn('v2_user', 'sso_subject')) {
            try {
                Schema::table('v2_user', function (Blueprint $table) {
                    $table->unique(['sso_provider', 'sso_subject'], 'v2_user_sso_unique');
                });
            } catch (\Throwable $e) {
                $message = strtolower($e->getMessage());
                if (strpos($message, 'duplicate key name') === false && strpos($message, 'already exists') === false) {
                    throw $e;
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('v2_user', 'sso_subject')) {
            try {
                Schema::table('v2_user', function (Blueprint $table) {
                $table->dropUnique('v2_user_sso_unique');
                });
            } catch (\Throwable $e) {
                $message = strtolower($e->getMessage());
                if (strpos($message, 'check that column/key exists') === false && strpos($message, 'does not exist') === false) {
                    throw $e;
                }
            }
        }
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
