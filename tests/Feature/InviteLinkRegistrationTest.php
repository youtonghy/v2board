<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\User;
use App\Services\AuthService;
use Tests\TestCase;

class InviteLinkRegistrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('v2board.api_v1_disable', 0);
        config()->set('v2board.stop_register', 0);
        config()->set('v2board.public_register_enable', 0);
        config()->set('v2board.email_verify', 0);
        config()->set('v2board.turnstile_enable', 0);
        config()->set('v2board.recaptcha_enable', 0);
        config()->set('v2board.register_limit_by_ip_enable', 0);
        config()->set('v2board.invite_link_stats_enable', 1);
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::dropAllTables();

        Schema::create('v2_user', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('invite_user_id')->nullable();
            $table->string('email', 64)->unique();
            $table->string('password', 255);
            $table->integer('balance')->default(0);
            $table->integer('commission_balance')->default(0);
            $table->integer('transfer_enable')->default(0);
            $table->integer('device_limit')->default(0);
            $table->integer('plan_id')->nullable();
            $table->integer('group_id')->nullable();
            $table->integer('expired_at')->nullable();
            $table->integer('speed_limit')->nullable();
            $table->string('uuid', 36)->nullable();
            $table->string('token', 255)->nullable();
            $table->tinyInteger('is_admin')->default(0);
            $table->tinyInteger('is_staff')->default(0);
            $table->integer('last_login_at')->nullable();
            $table->integer('created_at')->nullable();
            $table->integer('updated_at')->nullable();
        });

        Schema::create('v2_invite_link', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->char('token', 64)->unique();
            $table->string('invitee_name')->nullable();
            $table->text('content')->nullable();
            $table->unsignedInteger('visit_count')->default(0);
            $table->unsignedInteger('use_count')->default(0);
            $table->unsignedInteger('max_use')->default(1);
            $table->unsignedInteger('expired_at')->nullable();
            $table->unsignedTinyInteger('status')->default(0);
            $table->unsignedInteger('last_visited_at')->nullable();
            $table->unsignedInteger('last_used_at')->nullable();
            $table->unsignedInteger('created_at')->nullable();
            $table->unsignedInteger('updated_at')->nullable();
        });

        DB::table('v2_user')->insert([
            'id' => 1,
            'email' => 'inviter@example.com',
            'password' => bcrypt('password123'),
            'uuid' => 'inviter-uuid',
            'token' => 'inviter-token',
            'is_admin' => 1,
            'created_at' => time(),
            'updated_at' => time(),
        ]);
    }

    private function getAdminAuthData(): string
    {
        $user = User::find(1);
        return (new AuthService($user))->generateAuthData(Request::create('/admin-test', 'GET'))['auth_data'];
    }

    public function testPublicRegisterEndpointIsClosedWhenDisabled(): void
    {
        $response = $this->postJson('/api/v1/passport/auth/register', [
            'email' => 'user@example.com',
            'password' => 'password123'
        ]);

        $response->assertStatus(500);
        $this->assertNotEmpty($response->json('message'));
    }

    public function testInviteFetchIncrementsVisitCount(): void
    {
        DB::table('v2_invite_link')->insert([
            'user_id' => 1,
            'token' => str_repeat('a', 64),
            'invitee_name' => 'Alice',
            'content' => 'Welcome aboard.',
            'visit_count' => 0,
            'use_count' => 0,
            'max_use' => 2,
            'expired_at' => time() + 3600,
            'status' => 0,
            'created_at' => time(),
            'updated_at' => time(),
        ]);

        $response = $this->getJson('/api/v1/passport/invite/fetch?token=' . str_repeat('a', 64));

        $response->assertOk();
        $response->assertJsonPath('data.invitee_name', 'Alice');
        $this->assertSame(1, (int) DB::table('v2_invite_link')->where('token', str_repeat('a', 64))->value('visit_count'));
    }

    public function testInviteRegisterCreatesUserAndInvalidatesSingleUseLink(): void
    {
        DB::table('v2_invite_link')->insert([
            'user_id' => 1,
            'token' => str_repeat('b', 64),
            'invitee_name' => 'Bob',
            'content' => 'Welcome aboard.',
            'visit_count' => 0,
            'use_count' => 0,
            'max_use' => 1,
            'expired_at' => time() + 3600,
            'status' => 0,
            'created_at' => time(),
            'updated_at' => time(),
        ]);

        $response = $this->postJson('/api/v1/passport/invite/register', [
            'token' => str_repeat('b', 64),
            'email' => 'invitee@example.com',
            'password' => 'password123'
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => ['token', 'auth_data']
        ]);

        $registeredUser = DB::table('v2_user')->where('email', 'invitee@example.com')->first();
        $this->assertNotNull($registeredUser);
        $this->assertSame(1, (int) $registeredUser->invite_user_id);

        $inviteLink = DB::table('v2_invite_link')->where('token', str_repeat('b', 64))->first();
        $this->assertSame(1, (int) $inviteLink->use_count);
        $this->assertSame(1, (int) $inviteLink->status);
    }

    public function testAdminInviteLinkFetchSupportsEmailAndStatusFilters(): void
    {
        DB::table('v2_user')->insert([
            'id' => 2,
            'email' => 'another@example.com',
            'password' => bcrypt('password123'),
            'uuid' => 'another-uuid',
            'token' => 'another-token',
            'created_at' => time(),
            'updated_at' => time(),
        ]);

        DB::table('v2_invite_link')->insert([
            [
                'user_id' => 1,
                'token' => str_repeat('d', 64),
                'invitee_name' => 'Filter One',
                'content' => 'Match inviter email',
                'visit_count' => 0,
                'use_count' => 0,
                'max_use' => 1,
                'expired_at' => time() + 3600,
                'status' => 0,
                'created_at' => time(),
                'updated_at' => time(),
            ],
            [
                'user_id' => 2,
                'token' => str_repeat('e', 64),
                'invitee_name' => 'Filter Two',
                'content' => 'Different inviter',
                'visit_count' => 0,
                'use_count' => 1,
                'max_use' => 1,
                'expired_at' => time() + 3600,
                'status' => 1,
                'created_at' => time(),
                'updated_at' => time(),
            ],
        ]);

        $response = $this->withHeaders([
            'authorization' => $this->getAdminAuthData()
        ])->getJson('/api/v1/' . config('v2board.secure_path', 'd63e0a01') . '/user/inviteLink/fetch?user_email=inviter@example.com&status=0');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.user_email', 'inviter@example.com');
        $response->assertJsonPath('data.0.status', 0);
    }

    public function testInvalidInviteRouteRedirectsHome(): void
    {
        $response = $this->get('/invite/' . str_repeat('c', 64));

        $response->assertRedirect('/');
    }
}
