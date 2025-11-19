<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        $tables = [
            'v2_server_vmess',
            'v2_server_shadowsocks',
            'v2_server_trojan',
            'v2_server_vless',
            'v2_server_tuic',
            'v2_server_hysteria',
            'v2_server_anytls',
            'v2_server_v2node',
        ];

        foreach ($tables as $table) {
            if (!Schema::hasColumn($table, 'dynamic_rate')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->text('dynamic_rate')->nullable()->after('rate');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        $tables = [
            'v2_server_vmess',
            'v2_server_shadowsocks',
            'v2_server_trojan',
            'v2_server_vless',
            'v2_server_tuic',
            'v2_server_hysteria',
            'v2_server_anytls',
            'v2_server_v2node',
        ];

        foreach ($tables as $table) {
            if (Schema::hasColumn($table, 'dynamic_rate')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('dynamic_rate');
                });
            }
        }
    }
};
