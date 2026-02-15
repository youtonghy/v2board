<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GuestTodayTrafficOverviewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('v2board.api_v1_disable', 0);
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::dropIfExists('v2_stat_user');
        Schema::create('v2_stat_user', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->unsignedBigInteger('u')->default(0);
            $table->unsignedBigInteger('d')->default(0);
            $table->decimal('server_rate', 8, 4)->default(1);
            $table->unsignedInteger('record_at');
            $table->string('record_type', 1)->default('d');
        });
    }

    public function testTodayTrafficOverviewReturnsConvertedTotalAndTop(): void
    {
        $startAt = strtotime(date('Y-m-d'));

        DB::table('v2_stat_user')->insert([
            [
                'user_id' => 1,
                'u' => 1342177280, // 1.25GB => 2.5 => round to 3
                'd' => 0,
                'server_rate' => 1,
                'record_at' => $startAt + 60,
                'record_type' => 'd'
            ],
            [
                'user_id' => 2,
                'u' => 805306368, // 768MB => 1.5 => round to 2
                'd' => 0,
                'server_rate' => 1,
                'record_at' => $startAt + 120,
                'record_type' => 'd'
            ],
            [
                'user_id' => 3,
                'u' => 268435456, // 256MB => 0.5 => round to 1
                'd' => 0,
                'server_rate' => 1,
                'record_at' => $startAt + 180,
                'record_type' => 'd'
            ],
            [
                'user_id' => 4,
                'u' => 1073741824,
                'd' => 0,
                'server_rate' => 1,
                'record_at' => $startAt - 60, // out of today range
                'record_type' => 'd'
            ],
            [
                'user_id' => 5,
                'u' => 1073741824,
                'd' => 0,
                'server_rate' => 1,
                'record_at' => $startAt + 240,
                'record_type' => 'm' // filtered by record_type
            ]
        ]);

        $response = $this->getJson('/api/v1/guest/stat/todayTrafficOverview');

        $response->assertOk();
        $response->assertJsonPath('data.total', 5);
        $response->assertJsonPath('data.top.0', 3);
        $response->assertJsonPath('data.top.1', 2);
        $response->assertJsonPath('data.top.2', 1);

        $data = $response->json('data');
        $this->assertArrayNotHasKey('unit', $data);
        $this->assertArrayNotHasKey('total_usage_gb', $data);
        $this->assertArrayNotHasKey('top_usage_gb', $data);
    }

    public function testTodayTrafficOverviewReturnsZeroWhenNoData(): void
    {
        $response = $this->getJson('/api/v1/guest/stat/todayTrafficOverview');

        $response->assertOk();
        $response->assertExactJson([
            'data' => [
                'total' => 0,
                'top' => []
            ]
        ]);
    }
}
