<?php

use App\Models\InviteLink;
use App\Services\ThemeService;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function (Request $request) {
    if (config('v2board.app_url') && config('v2board.safe_mode_enable', 0)) {
        if ($request->server('HTTP_HOST') !== parse_url(config('v2board.app_url'))['host']) {
            abort(403);
        }
    }
    $renderParams = [
        'title' => config('v2board.app_name', 'V2Board'),
        'theme' => config('v2board.frontend_theme', 'default'),
        'version' => config('app.version'),
        'description' => config('v2board.app_description', 'V2Board is best'),
        'logo' => config('v2board.logo'),
        'telegram_login_enable' => (int)config('v2board.telegram_login_enable', 0),
        'passkey_login_enable' => (int)config('v2board.passkey_login_enable', 0),
        'sso_login_enable' => (int)config('v2board.sso_login_enable', 0),
        'sso_provider' => config('v2board.sso_provider', 'casdoor')
    ];

    if (!config("theme.{$renderParams['theme']}")) {
        $themeService = new ThemeService($renderParams['theme']);
        $themeService->init();
    }

    $renderParams['theme_config'] = config('theme.' . config('v2board.frontend_theme', 'default'));
    return view('theme::' . config('v2board.frontend_theme', 'default') . '.dashboard', $renderParams);
});

Route::get('/invite/{token}', function (Request $request, string $token) {
    if (config('v2board.app_url') && config('v2board.safe_mode_enable', 0)) {
        if ($request->server('HTTP_HOST') !== parse_url(config('v2board.app_url'))['host']) {
            abort(403);
        }
    }

    $inviteLink = InviteLink::where('token', $token)->first();
    if (!$inviteLink || !$inviteLink->isAvailable()) {
        if ($inviteLink && (int)$inviteLink->status !== InviteLink::STATUS_DISABLED) {
            if ($inviteLink->isExpired()) {
                $inviteLink->status = InviteLink::STATUS_EXPIRED;
                $inviteLink->save();
            } elseif (!$inviteLink->hasRemainingUses()) {
                $inviteLink->status = InviteLink::STATUS_USED_UP;
                $inviteLink->save();
            }
        }
        return redirect('/');
    }

    $theme = 'fantastic';
    if (!config("theme.{$theme}")) {
        $themeService = new ThemeService($theme);
        $themeService->init();
    }

    return view('theme::fantastic.invite', [
        'title' => config('v2board.app_name', 'V2Board'),
        'theme' => $theme,
        'version' => config('app.version'),
        'description' => config('v2board.app_description', 'V2Board is best'),
        'logo' => config('v2board.logo'),
        'token' => $token,
        'theme_config' => config('theme.' . $theme)
    ]);
});

//TODO:: 兼容
Route::get('/' . config('v2board.secure_path', config('v2board.frontend_admin_path', hash('crc32b', config('app.key')))), function () {
    return view('admin', [
        'title' => config('v2board.app_name', 'V2Board'),
        'theme_sidebar' => config('v2board.frontend_theme_sidebar', 'light'),
        'theme_header' => config('v2board.frontend_theme_header', 'dark'),
        'theme_color' => config('v2board.frontend_theme_color', 'default'),
        'background_url' => config('v2board.frontend_background_url'),
        'version' => config('app.version'),
        'logo' => config('v2board.logo'),
        'secure_path' => config('v2board.secure_path', config('v2board.frontend_admin_path', hash('crc32b', config('app.key'))))
    ]);
});

if (!empty(config('v2board.subscribe_path'))) {
    Route::get(config('v2board.subscribe_path'), 'V1\\Client\\ClientController@subscribe')->middleware('client');
}
