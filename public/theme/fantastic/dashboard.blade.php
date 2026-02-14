<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" content="#e6f0f8" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">
    <title>{{$title}}</title>
    <style>
        [x-cloak] { display: none !important; }
    </style>
    <style id="fantastic-preauth-style">
        body { display: none !important; }
    </style>
    <script>
        (function () {
            try {
                var v = localStorage.getItem('fantastic_theme');
                if (v === 'light' || v === 'dark') document.documentElement.setAttribute('data-theme', v);
            } catch (e) {}
        })();
    </script>
    <script>
        (function () {
            function parseQuery(query) {
                var out = {};
                var raw = String(query || '').replace(/^\?/, '');
                if (!raw) return out;
                raw.split('&').forEach(function (pair) {
                    if (!pair) return;
                    var idx = pair.indexOf('=');
                    var key = idx >= 0 ? pair.slice(0, idx) : pair;
                    var val = idx >= 0 ? pair.slice(idx + 1) : '';
                    try { key = decodeURIComponent(key.replace(/\+/g, '%20')); } catch (e) {}
                    try { val = decodeURIComponent(val.replace(/\+/g, '%20')); } catch (e) {}
                    if (key && typeof out[key] === 'undefined') out[key] = val;
                });
                return out;
            }

            function stringifyQuery(pairs) {
                var items = [];
                Object.keys(pairs || {}).forEach(function (key) {
                    if (pairs[key] === null || typeof pairs[key] === 'undefined') return;
                    var k = encodeURIComponent(String(key));
                    var v = encodeURIComponent(String(pairs[key]));
                    items.push(k + '=' + v);
                });
                return items.join('&');
            }

            function parseHash(hash) {
                var cleaned = String(hash || '').replace(/^#\/?/, '');
                var parts = cleaned.split('?');
                var path = (parts[0] || '').replace(/^\/+/, '');
                var query = parts[1] || '';
                return { path: path, query: query };
            }

            function parseViewFromPath(path) {
                var normalized = String(path || '').replace(/^\/+/, '');
                var segments = normalized.split('/').filter(Boolean);
                return segments[0] || 'dashboard';
            }

            function getLocalToken() {
                try { return localStorage.getItem('auth_data'); } catch (e) { return null; }
            }

            function buildRedirectTarget(path, query) {
                var cleanPath = String(path || '').replace(/^\/+/, '');
                var cleanQuery = String(query || '');
                if (!cleanPath) return 'dashboard';
                if (!cleanQuery) return cleanPath;

                var paramsObj = parseQuery(cleanQuery);
                delete paramsObj.redirect;
                delete paramsObj.verify;
                delete paramsObj.sso_error;
                delete paramsObj.sso_message;
                var rest = stringifyQuery(paramsObj);
                return rest ? (cleanPath + '?' + rest) : cleanPath;
            }

            function gate() {
                var preauthStyle = document.getElementById('fantastic-preauth-style');
                var token = getLocalToken();
                var parsed = parseHash(window.location.hash || '');
                var view = parseViewFromPath(parsed.path);
                var isPublic = (view === 'login' || view === 'register');

                if (!token && !isPublic) {
                    var redirectTarget = null;
                    var verify = null;
                    var ssoError = null;
                    var ssoMessage = null;

                    var q = parseQuery(parsed.query || '');
                    redirectTarget = q.redirect || null;
                    verify = q.verify || null;
                    ssoError = q.sso_error || null;
                    ssoMessage = q.sso_message || null;

                    redirectTarget = redirectTarget || buildRedirectTarget(parsed.path, parsed.query);

                    var loginParams = {};
                    if (verify) loginParams.verify = verify;
                    if (ssoError) loginParams.sso_error = ssoError;
                    if (ssoMessage) loginParams.sso_message = ssoMessage;
                    if (redirectTarget) loginParams.redirect = redirectTarget;

                    var queryString = stringifyQuery(loginParams);
                    var nextHash = '#/login' + (queryString ? ('?' + queryString) : '');
                    if (window.location.hash !== nextHash) {
                        window.location.hash = nextHash;
                    }
                    return;
                }

                if (preauthStyle) preauthStyle.remove();
            }

            window.addEventListener('hashchange', gate);
            gate();
        })();
    </script>
    <link rel="stylesheet" href="/theme/{{$theme}}/assets/css/style.css?v={{$version}}">
    <link rel="stylesheet" href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css">
    <script defer src="/assets/vendor/alpinejs/alpine.min.js"></script>
    <script>
        window.settings = {
            title: '{{$title}}',
            assets_path: '/theme/{{$theme}}/assets',
            theme: {
                color: '{{$theme_config['theme_color']}}',
            },
            version: '{{$version}}',
            background_url: '{{$theme_config['background_url']}}',
            description: '{{$description}}',
            i18n: [
                'zh-CN',
                'en-US',
                'ja-JP',
                'vi-VN',
                'ko-KR',
                'zh-TW',
                'fa-IR'
            ],
            logo: '{{$logo}}',
            telegram_login_enable: {{$telegram_login_enable}},
            sso_login_enable: {{$sso_login_enable ?? 0}},
            sso_provider: '{{$sso_provider ?? 'casdoor'}}'
        }
    </script>
</head>
<body>
    <div id="app" x-data="app()" x-cloak>
        <!-- Navigation Bar -->
        <nav class="navbar" x-show="!['login', 'register'].includes(view)" style="display: none;">
            <div class="container nav-container">
                <div class="logo">
                    @if($logo)
                        <img src="{{$logo}}" alt="{{$title}}">
                    @else
                        {{$title}}
                    @endif
                </div>
                
                <!-- Desktop Navigation -->
                <div class="nav-links desktop-nav">
                    <div class="nav-item" :class="{ 'active': ['dashboard', 'servers'].includes(view) }">
                        <a href="#" class="nav-link">Dashboard</a>
                        <div class="nav-dropdown">
                            <a href="#" @click.prevent="view = 'dashboard'" :class="{ 'active': view === 'dashboard' }">Dashboard</a>
                            <a href="#" @click.prevent="view = 'servers'" :class="{ 'active': view === 'servers' }">Servers</a>
                            <a href="#" @click.prevent="view = 'transfer'" :class="{ 'active': view === 'transfer' }">Transfer Data</a>
                        </div>
                    </div>
                    
                    <div class="nav-item" :class="{ 'active': ['plan', 'orders'].includes(view) }">
                        <a href="#" class="nav-link">Shop</a>
                        <div class="nav-dropdown">
                            <a href="#" @click.prevent="view = 'plan'" :class="{ 'active': view === 'plan' }">Plans</a>
                            <a href="#" @click.prevent="view = 'orders'" :class="{ 'active': view === 'orders' }">My Orders</a>
                            <a href="#" @click.prevent="view = 'redeem'" :class="{ 'active': view === 'redeem' }">Redeem</a>
                        </div>
                    </div>
                    
                    <div class="nav-item" :class="{ 'active': ['tickets', 'ticket_detail', 'knowledge', 'knowledge_detail'].includes(view) }">
                        <a href="#" class="nav-link">Support</a>
                        <div class="nav-dropdown">
                            <a href="#" @click.prevent="view = 'tickets'" :class="{ 'active': view === 'tickets' || view === 'ticket_detail' }">Support Tickets</a>
                            <a href="#" @click.prevent="view = 'knowledge'" :class="{ 'active': view === 'knowledge' || view === 'knowledge_detail' }">Knowledge Base</a>
                        </div>
                    </div>
                    
                    <div class="nav-item" :class="{ 'active': ['profile', 'invites'].includes(view) }">
                        <a href="#" class="nav-link">Profile</a>
                        <div class="nav-dropdown">
                            <a href="#" @click.prevent="view = 'profile'" :class="{ 'active': view === 'profile' }">Profile</a>
                            <a href="#" @click.prevent="view = 'invites'" :class="{ 'active': view === 'invites' }">Invites</a>
                        </div>
                    </div>
                </div>
                
                <!-- Mobile Breadcrumb Navigation -->
                <div class="breadcrumb-nav mobile-nav">
                    <button class="breadcrumb-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
                        <span class="breadcrumb-current" x-text="getCurrentBreadcrumb()"></span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 6l4 4 4-4"/>
                        </svg>
                    </button>
                    <div class="breadcrumb-dropdown" x-show="mobileMenuOpen" @click.away="mobileMenuOpen = false" style="display: none;">
                        <div class="breadcrumb-section">
                            <div class="breadcrumb-title">Dashboard</div>
                            <a href="#" @click.prevent="view = 'dashboard'; mobileMenuOpen = false" :class="{ 'active': view === 'dashboard' }">Dashboard</a>
                            <a href="#" @click.prevent="view = 'servers'; mobileMenuOpen = false" :class="{ 'active': view === 'servers' }">Servers</a>
                            <a href="#" @click.prevent="view = 'transfer'; mobileMenuOpen = false" :class="{ 'active': view === 'transfer' }">Transfer Data</a>
                        </div>
                        <div class="breadcrumb-section">
                            <div class="breadcrumb-title">Shop</div>
                            <a href="#" @click.prevent="view = 'plan'; mobileMenuOpen = false" :class="{ 'active': view === 'plan' }">Plans</a>
                            <a href="#" @click.prevent="view = 'orders'; mobileMenuOpen = false" :class="{ 'active': view === 'orders' }">My Orders</a>
                            <a href="#" @click.prevent="view = 'redeem'; mobileMenuOpen = false" :class="{ 'active': view === 'redeem' }">Redeem</a>
                        </div>
                        <div class="breadcrumb-section">
                            <div class="breadcrumb-title">Support</div>
                            <a href="#" @click.prevent="view = 'tickets'; mobileMenuOpen = false" :class="{ 'active': view === 'tickets' || view === 'ticket_detail' }">Support Tickets</a>
                            <a href="#" @click.prevent="view = 'knowledge'; mobileMenuOpen = false" :class="{ 'active': view === 'knowledge' || view === 'knowledge_detail' }">Knowledge Base</a>
                        </div>
                        <div class="breadcrumb-section">
                            <div class="breadcrumb-title">Profile</div>
                            <a href="#" @click.prevent="view = 'profile'; mobileMenuOpen = false" :class="{ 'active': view === 'profile' }">Profile</a>
                            <a href="#" @click.prevent="view = 'invites'; mobileMenuOpen = false" :class="{ 'active': view === 'invites' }">Invites</a>
                        </div>
                        <div class="breadcrumb-section logout-section">
                            <a href="#" class="btn-logout-mobile" @click.prevent="mobileMenuOpen = false; logout()">Logout</a>
                        </div>
                    </div>
                </div>
                
                <div class="user-menu">
                    <button type="button"
                            class="theme-toggle"
                            @click="toggleTheme()"
                            :aria-label="themeResolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                            :title="themeResolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
                        <svg x-show="themeResolved !== 'dark'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" style="display:none;">
                            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M12 20v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="m4.93 4.93 1.41 1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="m17.66 17.66 1.41 1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M2 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M20 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="m6.34 17.66-1.41 1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="m19.07 4.93-1.41 1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <svg x-show="themeResolved === 'dark'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" style="display:none;">
                            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <a href="#" @click.prevent="logout()" class="btn-logout">Logout</a>
                </div>
        </div>

        <!-- Server Detail Modal -->
        <div x-show="serverModalOpen" class="modal-overlay" @click.self="serverModalOpen = false" style="display: none;">
            <div class="modal-content server-modal">
                    <div class="modal-header">
                        <h3 x-text="selectedServer?.name || 'Server'"></h3>
                        <button class="modal-close" @click="serverModalOpen = false">×</button>
                    </div>
                    <div class="modal-body" x-show="selectedServer">
                        <p><strong>Status:</strong> <span x-text="selectedServer.online ? 'Online' : 'Offline'"></span></p>
                        <p><strong>Rate:</strong> <span x-text="(selectedServer.rate || 1) + 'x'"></span></p>
                        <p><strong>Type:</strong> <span x-text="selectedServer.type || 'Unknown'"></span></p>
                        <p x-show="selectedServer.label"><strong>Label:</strong> <span x-text="selectedServer.label"></span></p>
                        <div class="server-modal-tags" x-show="getServerTags(selectedServer).length > 0">
                            <strong>Tags:</strong>
                            <div class="server-modal-tag-list">
                                <template x-for="(tag, tagIdx) in getServerTags(selectedServer)" :key="'server-tag-' + tagIdx + '-' + (selectedServer?.id || 'x')">
                                    <span class="badge" x-text="tag"></span>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="container">
            <!-- Login View -->
            <div x-show="view === 'login'" class="view-auth" style="display: none;">
                <div class="auth-container">
                    <div class="card auth-card">
                        <h2 class="text-center">Login</h2>
                        <div class="form-group">
                            <input type="email" x-model="authForm.email" placeholder="Email" class="form-input">
                        </div>
                        <div class="form-group">
                            <input type="password" x-model="authForm.password" placeholder="Password" class="form-input" @keyup.enter="login()">
                        </div>
                        <div id="captcha-login" class="form-group" x-show="captcha.loginRequested" x-cloak style="display: none;"></div>
                        <button class="btn-3d btn-block" @click="login()" :disabled="loading" x-text="loading ? 'Logging in...' : 'Login'"></button>
                        
                        <!-- Alternative Login Methods -->
                        @if ($telegram_login_enable || $sso_login_enable)
                        <div class="auth-divider">
                            <span>Or continue with</span>
                        </div>
                        @endif
                        
                        <!-- Telegram Login Button -->
                        @if ($telegram_login_enable)
                        <button class="btn-3d btn-block btn-telegram" 
                                @click="showTelegramLogin = true"
                                type="button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                            </svg>
                            Telegram Login
                        </button>
                        @endif
                        
                        <!-- SSO Login Button -->
                        @if ($sso_login_enable)
                        <button class="btn-3d btn-block btn-sso" 
                                @click="startSsoLogin()"
                                :disabled="ssoLoading"
                                type="button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                            </svg>
                            <span x-text="ssoLoading ? 'Redirecting...' : 'SSO Single Sign-On'"></span>
                        </button>
                        @endif
                        
                        <div class="auth-links">
                            <a href="#" @click.prevent="view = 'register'" x-show="!isRegisterDisabled()">Create Account</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Register View -->
            <div x-show="view === 'register' && !isRegisterDisabled()" class="view-auth" style="display: none;">
                <div class="auth-container">
                    <div class="card auth-card">
                        <h2 class="text-center">Register</h2>
                        <div class="form-group">
                            <input type="email" x-model="authForm.email" placeholder="Email" class="form-input">
                        </div>
                        <div class="form-group" x-show="siteConfig.is_email_verify">
                            <div class="input-group">
                                <input type="text" x-model="authForm.email_code" placeholder="Email Code" class="form-input">
                                <button class="btn-3d btn-sm" @click="sendEmailVerify()" :disabled="loading">Send Code</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <input type="password" x-model="authForm.password" placeholder="Password" class="form-input">
                        </div>
                        <div class="form-group">
                            <input type="text"
                                   x-model="authForm.invite_code"
                                   :placeholder="isInviteRequired() ? 'Invite Code' : 'Invite Code (Optional)'"
                                   :required="isInviteRequired()"
                                   class="form-input">
                        </div>
                        <div id="captcha-register" class="form-group"></div>
                        <button class="btn-3d btn-block"
                                @click="register()"
                                :disabled="loading || (isInviteRequired() && !authForm.invite_code)"
                                x-text="loading ? 'Registering...' : 'Register'"></button>
                        <div class="auth-links">
                            <a href="#" @click.prevent="view = 'login'">Already have an account? Login</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Notices Modal/Banner -->
            <div x-show="notices.length > 0 && view === 'dashboard' && showNotices" class="card notice-card">
                <div class="notice-slider" aria-label="Announcements" @mouseenter="noticeSliderHovered = true; stopNoticeAutoplay()" @mouseleave="noticeSliderHovered = false; startNoticeAutoplay()">
                    <button class="notice-dismiss notice-dismiss-floating" @click="dismissNotices()" aria-label="Dismiss announcements">
                        &times;
                    </button>
                    <button
                        type="button"
                        class="notice-slide-card"
                        :class="{ 'is-no-image': !getActiveNotice()?.img_url }"
                        @click="openNotice(getActiveNotice())">
                        <div class="notice-slide-main">
                            <div class="notice-slide-content">
                                <strong class="notice-slide-title" x-text="getActiveNotice()?.title || 'Announcement'"></strong>
                                <div class="notice-tags notice-slide-tags" x-show="getNoticeTags(getActiveNotice()).length > 0">
                                    <template x-for="(tag, tagIndex) in getNoticeTags(getActiveNotice())" :key="`notice-tag-${tagIndex}-${tag}`">
                                        <span class="notice-tag" x-text="tag"></span>
                                    </template>
                                </div>
                            </div>
                            <div class="notice-slide-image" x-show="getActiveNotice()?.img_url">
                                <img :src="getActiveNotice()?.img_url" :alt="getActiveNotice()?.title || 'Announcement'" loading="lazy">
                            </div>
                        </div>
                    </button>

                    <div class="notice-slide-controls" x-show="notices.length > 1">
                        <button type="button" class="notice-nav-btn" @click.stop="prevNoticeSlide()" aria-label="Previous announcement">‹</button>
                        <div class="notice-dots" role="tablist" aria-label="Notice slides">
                            <template x-for="(notice, index) in notices" :key="notice.id || index">
                                <button
                                    type="button"
                                    class="notice-dot"
                                    :class="{ 'is-active': noticeSlideIndex === index }"
                                    :aria-label="`Go to announcement ${index + 1}`"
                                    :aria-current="noticeSlideIndex === index ? 'true' : 'false'"
                                    @click.stop="goToNoticeSlide(index)">
                                </button>
                            </template>
                        </div>
                        <button type="button" class="notice-nav-btn" @click.stop="nextNoticeSlide()" aria-label="Next announcement">›</button>
                    </div>
                </div>
            </div>

            <!-- Notice Detail Modal -->
            <div x-show="noticeModalOpen" class="modal-overlay" @click.self="closeNoticeModal()" style="display: none;">
                <div class="modal-content notice-modal">
                    <div class="modal-header">
                        <h3 x-text="activeNotice?.title || 'Announcement'"></h3>
                        <button class="modal-close" @click="closeNoticeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="notice-tags" x-show="activeNotice?.tags && activeNotice.tags.length > 0">
                            <template x-for="tag in (activeNotice?.tags || [])" :key="tag">
                                <span class="notice-tag" x-text="tag"></span>
                            </template>
                        </div>
                        <div class="notice-image" x-show="activeNotice?.img_url">
                            <img :src="activeNotice?.img_url" :alt="activeNotice?.title || 'Announcement'" loading="lazy">
                        </div>
                        <div class="notice-content" x-html="activeNotice?.content || ''"></div>
                    </div>
                </div>
            </div>

            <!-- Dashboard View -->
            <div x-show="view === 'dashboard'" class="view-dashboard">
                <div class="card welcome-card">
                    <h1>Welcome back, <span x-text="user.email"></span></h1>
                    <p>Your subscription is <span :class="getSubscriptionStatusClass()" x-text="getSubscriptionStatusText()"></span></p>
                    <div x-show="user.plan_id" style="margin-top: 0.5rem;">
                        <p style="font-size: 1.1rem; color: var(--primary-color); font-weight: 600;">
                            Current Plan: <span x-text="getCurrentPlanName()"></span>
                        </p>
                    </div>
                    <div class="quick-actions" style="margin-top: 1rem;">
                        <button class="btn-3d btn-sm" @click="showSubscriptionModal = true">Subscription</button>
                        <button class="btn-3d btn-sm btn-secondary" @click="view = 'transfer'">Transfer Data</button>
                    </div>
                </div>
                
                <div class="stats-grid">
                    <div class="card stat-card stat-card-chart">
                        <h3>Remaining</h3>
                        <div class="circular-progress progress-blue" 
                             :style="`--progress: ${getTimeRemainingPercentage()}`"
                             x-init="$watch('user', () => $el.style.setProperty('--progress', getTimeRemainingPercentage()))">
                            <div class="progress-circle">
                                <div class="progress-value">
                                    <div class="percentage" x-text="getTimeRemainingPercentage() + '%'"></div>
                                    <div class="amount" x-text="formatRemainingTime()"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card stat-card stat-card-chart">
                        <h3>Traffic Used</h3>
                        <div class="circular-progress progress-yellow" 
                             :style="`--progress: ${getTrafficUsedPercentage()}`"
                             x-init="$watch('user', () => $el.style.setProperty('--progress', getTrafficUsedPercentage()))">
                            <div class="progress-circle">
                                <div class="progress-value">
                                    <div class="percentage" x-text="getTrafficUsedPercentage() + '%'"></div>
                                    <div class="amount" x-text="formatBytes(user.d + user.u)"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card stat-card stat-card-chart">
                        <h3>Traffic Remaining</h3>
                        <div class="circular-progress progress-green" 
                             :style="`--progress: ${getTrafficRemainingPercentage()}`"
                             x-init="$watch('user', () => $el.style.setProperty('--progress', getTrafficRemainingPercentage()))">
                            <div class="progress-circle">
                                <div class="progress-value">
                                    <div class="percentage" x-text="getTrafficRemainingPercentage() + '%'"></div>
                                    <div class="amount" x-text="formatBytes(user.transfer_enable - (user.d + user.u))"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card today-traffic-card">
                    <div class="today-traffic-header">
                        <h3>今日统计</h3>
                        <span class="today-traffic-loading" x-show="todayTrafficLoading">更新中...</span>
                    </div>
                    <div class="today-traffic-total">
                        <span class="today-traffic-total-label">今日总流量</span>
                        <span class="today-traffic-total-value" x-text="formatTrafficGb(todayTrafficOverview.total_usage_gb, todayTrafficOverview.unit)"></span>
                    </div>
                    <div class="today-traffic-podium">
                        <template x-for="item in getTodayTrafficPodium()" :key="item.rank">
                            <div :class="'podium-item podium-rank-' + item.rank + ' podium-' + item.medal">
                                <div class="podium-rank" x-text="'#' + item.rank"></div>
                                <div class="podium-name" x-text="item.name"></div>
                                <div class="podium-bar">
                                    <span class="podium-usage" x-text="formatTrafficGb(item.usage, todayTrafficOverview.unit)"></span>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Plan View -->
            <div x-show="view === 'plan'" class="view-plan" style="display: none;">
                <h2>Available Plans</h2>
                <div x-show="plans.length === 0" class="card">
                    <p>No plans available at the moment.</p>
                </div>
                <div class="plans-grid">
                    <template x-for="plan in plans" :key="plan.id">
                        <div class="card plan-card">
                            <h3 x-text="plan.name"></h3>
                            <div class="plan-content" x-html="plan.content"></div>
                            
                            <div class="plan-period-actions">
                                <template x-for="key in ['month_price', 'quarter_price', 'half_year_price', 'year_price', 'two_year_price', 'three_year_price', 'onetime_price', 'reset_price']">
                                    <div class="plan-period-row" x-show="plan[key] !== null && plan[key] !== undefined">
                                        <button class="btn-3d btn-sm" @click="subscribeWithPlan(plan, key)" :disabled="loading" x-text="loading ? 'Processing...' : getPeriodNameShort(key) + ' · ' + formatCurrency(plan[key])"></button>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
            
            <!-- Servers View -->
            <div x-show="view === 'servers'" class="view-servers" style="display: none;">
                <h2>Node List</h2>
                <div class="card servers-map-card">
                    <div class="servers-map-header">
                        <div>
                            <h3>World Node Map</h3>
                            <p>Locations are resolved from two-letter country tags such as US.</p>
                        </div>
                        <div class="servers-map-stats">
                            <span x-text="'Mapped: ' + (serverMap.matchedServers || 0)"></span>
                            <span x-text="'Skipped: ' + (serverMap.skippedServers || 0)"></span>
                        </div>
                    </div>
                    <div id="servers-world-map" class="servers-world-map"></div>
                    <div class="servers-map-empty" x-show="!serverMap.ready">
                        Loading world map...
                    </div>
                    <div class="servers-map-empty servers-map-error" x-show="serverMap.loadFailed">
                        Map tiles are temporarily unavailable, but node cards are still available below.
                    </div>
                    <div class="servers-map-empty" x-show="serverMap.ready && !serverMap.hasMarkers">
                        No valid country tags were found. Add two-letter tags like US to show markers.
                    </div>
                </div>
                <div class="servers-node-section">
                    <div class="servers-node-header">
                        <h3>Node Cards</h3>
                        <span x-text="'Total: ' + (servers.length || 0)"></span>
                    </div>
                    <div class="server-grid">
                        <template x-for="(server, idx) in servers" :key="(server.type || 'node') + '-' + (server.id || idx) + '-' + idx">
                            <div class="server-card" 
                                 :class="{ 'server-offline': !server.online }"
                                 @click="openServerModal(server)">
                                <div class="server-card-header">
                                    <span class="server-name" x-text="server.name || 'Unnamed Node'"></span>
                                </div>
                                <div class="server-meta">
                                    <span class="badge" x-text="(server.type || 'unknown').toUpperCase()"></span>
                                    <span class="badge" x-text="'Rate ' + (server.rate || 1) + 'x'"></span>
                                    <span class="badge" :class="server.online ? 'badge-success' : 'badge-muted'" x-text="server.online ? 'Online' : 'Offline'"></span>
                                </div>
                            </div>
                        </template>
                        <div class="server-empty" x-show="servers.length === 0">
                            No servers available.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Orders View -->
            <div x-show="view === 'orders'" class="view-orders" style="display: none;">
                <h2>My Orders</h2>
                <div class="card">
                    <div class="table-wrapper">
                    <table class="table-3d">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Amount</th>
                                <th>Cycle</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template x-for="order in orders" :key="order.trade_no">
                                <tr>
                                <td x-text="order.trade_no"></td>
                                <td><span style="font-weight: 700; color: var(--primary-color);" x-text="formatCurrency(order.total_amount)"></span></td>
                                <td x-text="getPeriodName(order.period)"></td>
                                <td><span class="status-badge" :style="'background: ' + getOrderStatusColor(order.status)" x-text="getOrderStatus(order.status)"></span></td>
                                <td>
                                    <div class="order-actions">
                                        <button x-show="order.status === 0" class="btn-3d btn-sm" @click="goToPayment(order)">Pay Now</button>
                                        <button x-show="order.status === 0" class="btn-3d btn-sm btn-secondary" @click="cancelOrder(order)" style="margin-left: 0.4rem;">Cancel</button>
                                        <span x-show="order.status !== 0" style="opacity: 0.5;">-</span>
                                    </div>
                                </td>
                            </tr>
                            </template>
                            <tr x-show="orders.length === 0">
                                <td colspan="5" style="text-align: center; opacity: 0.6;">No orders yet</td>
                            </tr>
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>

            <!-- Redeem View -->
            <div x-show="view === 'redeem'" class="view-redeem" style="display: none;">
                <h2>Redeem Code</h2>
                <div class="card">
                    <p>Apply your gift code to extend service, add balance, or reset quota.</p>
                    <div class="form-group">
                        <input type="text" x-model="redeemForm.code" placeholder="Enter redeem code" class="form-input">
                    </div>
                    <div class="form-group">
                        <button class="btn-3d" @click="redeemCode()" :disabled="loading">Redeem</button>
                    </div>
                    <div class="redeem-result" x-show="redeemResult.message">
                        <span :class="'badge ' + (redeemResult.success ? 'badge-success' : 'badge-error')" x-text="redeemResult.message"></span>
                    </div>
                </div>
            </div>

            <!-- Transfer Data View -->
            <div x-show="view === 'transfer'" class="view-transfer" style="display: none;">
                <h2>Transfer Data</h2>

                <!-- Traffic Heatmap -->
                <div class="card heatmap-card">
                    <div class="heatmap-header">
                        <h3>Traffic Heatmap</h3>
                        <div class="heatmap-legend">
                            <span class="legend-label">Less</span>
                            <div class="legend-item level-0"></div>
                            <div class="legend-item level-1"></div>
                            <div class="legend-item level-2"></div>
                            <div class="legend-item level-3"></div>
                            <div class="legend-item level-4"></div>
                            <div class="legend-item level-5"></div>
                            <div class="legend-item level-6"></div>
                            <span class="legend-label">More</span>
                        </div>
                    </div>
                    <div class="heatmap-container">
                        <div class="heatmap-months">
                            <template x-for="month in getHeatmapMonths()" :key="month">
                                <span class="month-label" x-text="month"></span>
                            </template>
                        </div>
                        <div class="heatmap-wrapper">
                            <div class="heatmap-days">
                                <span>Mon</span>
                                <span>Wed</span>
                                <span>Fri</span>
                            </div>
                            <div class="heatmap-grid">
                                <template x-for="(week, weekIndex) in getHeatmapData()" :key="weekIndex">
                                    <div class="heatmap-week">
                                        <template x-for="(day, dayIndex) in week" :key="dayIndex">
                                            <div class="heatmap-day"
                                                 :class="'level-' + day.level"
                                                 :title="day.date + ': ' + formatBytes(day.traffic)"
                                                 x-show="day.visible">
                                            </div>
                                        </template>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                    <div class="heatmap-stats">
                        <div class="stat-item">
                            <span class="stat-value" x-text="formatBytes(getTotalTraffic())"></span>
                            <span class="stat-label">Total (This Period)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" x-text="formatBytes(getAverageDailyTraffic())"></span>
                            <span class="stat-label">Daily Average</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" x-text="formatBytes(getMaxDailyTraffic())"></span>
                            <span class="stat-label">Peak Day</span>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>Traffic Details (This Month)</h3>
                    <div class="table-wrapper">
                        <table class="table-3d">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Upload</th>
                                    <th>Download</th>
                                    <th>Total</th>
                                    <th>Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template x-for="item in traffics" :key="item.record_at">
                                    <tr>
                                        <td x-text="formatDateTime(item.record_at)"></td>
                                        <td x-text="formatBytes(item.u)"></td>
                                        <td x-text="formatBytes(item.d)"></td>
                                        <td x-text="formatBytes(item.u + item.d)"></td>
                                        <td x-text="item.server_rate || 1"></td>
                                    </tr>
                                </template>
                                <tr x-show="traffics.length === 0">
                                    <td colspan="5" style="text-align: center; opacity: 0.6;">No traffic records.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Payment View -->
            <div x-show="view === 'payment'" class="view-payment" style="display: none;">
                <button class="btn-3d btn-sm" @click="view = 'orders'" style="margin-bottom: 1rem;">← Back to orders</button>
                
                <div x-show="currentOrder" class="payment-container">
                    <h2>Order Payment</h2>
                    <div x-show="loading" style="text-align: center; padding: 2rem; opacity: 0.7;">
                        <p>Loading payment methods...</p>
                    </div>
                    
                    <!-- Order Details Card -->
                    <div class="card payment-order-card">
                        <h3>Order Details</h3>
                        <div class="order-detail-item full-row">
                            <span class="label">Order #</span>
                            <span class="value" x-text="currentOrder.trade_no"></span>
                        </div>
                        <div class="order-detail-grid">
                            <div class="order-detail-item">
                                <span class="label">Plan</span>
                                <span class="value" x-text="getOrderPlanName(currentOrder)"></span>
                            </div>
                            <div class="order-detail-item">
                                <span class="label">Billing Cycle</span>
                                <span class="value" x-text="getPeriodName(currentOrder.period)"></span>
                            </div>
                            <div class="order-detail-item">
                                <span class="label">Created At</span>
                                <span class="value" x-text="new Date(currentOrder.created_at * 1000).toLocaleString('en-US')"></span>
                            </div>
                        </div>
                        <div class="order-amount">
                            <span class="label">Amount Due</span>
                            <span class="amount" x-text="formatCurrency(currentOrder.total_amount)"></span>
                        </div>
                    </div>

                    <!-- Coupon Redeem -->
                    <div class="card payment-coupon-card">
                        <div class="coupon-header">
                            <div>
                                <h3>Redeem Coupon</h3>
                                <p class="coupon-subtitle">Apply a discount code before paying</p>
                            </div>
                            <div class="coupon-status" x-show="appliedCoupon">
                                <span class="badge badge-success">Applied</span>
                                <span class="coupon-saving" x-text="describeCoupon(appliedCoupon)"></span>
                            </div>
                        </div>
                        <div class="coupon-form">
                            <div class="coupon-input-group">
                                <input type="text" class="form-input" placeholder="Enter coupon code" x-model="couponForm.code" :disabled="couponApplying">
                                <button class="btn-3d btn-primary btn-coupon" @click="applyCoupon()" :disabled="couponApplying || !couponForm.code.trim()">
                                    <span x-show="!couponApplying">Verify</span>
                                    <span x-show="couponApplying">Checking...</span>
                                </button>
                            </div>
                        </div>
                        <div class="coupon-applied" x-show="appliedCoupon">
                            <div class="coupon-pill">
                                <span class="coupon-code" x-text="appliedCoupon.code"></span>
                                <span class="coupon-desc" x-text="describeCoupon(appliedCoupon)"></span>
                            </div>
                        </div>
                        <p class="coupon-hint">Coupon will regenerate this order with the discount before payment.</p>
                    </div>
                    
                    <!-- Payment Methods -->
                    <div class="card payment-methods-card">
                        <h3>Choose Payment Method <span style="font-size: 0.85rem; font-weight: 400; opacity: 0.7;" x-show="paymentMethods.length > 0" x-text="'(' + paymentMethods.length + ' available)'"></span></h3>
                        <div x-show="paymentMethods.length > 0" class="payment-methods-grid">
                            <template x-for="method in paymentMethods" :key="method.id">
                                <div class="payment-method-card" 
                                     :class="{ 'selected': selectedPaymentMethod === method.id }"
                                     @click="selectPaymentMethod(method)">
                                    <div class="payment-method-icon">
                                        <img x-show="method.icon" :src="method.icon" :alt="method.name" style="width: 40px; height: 40px; object-fit: contain;" onerror="this.style.display='none'">
                                        <svg x-show="!method.icon" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                        </svg>
                                    </div>
                                    <div class="payment-method-name" x-text="method.name"></div>
                                    <div class="payment-method-fee" x-show="getPaymentFeeText(method)" x-text="getPaymentFeeText(method)"></div>
                                    <div class="payment-method-check">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                        </svg>
                                    </div>
                                </div>
                            </template>
                        </div>
                        <div x-show="paymentMethods.length === 0 && !loading" class="payment-empty" style="text-align: center; padding: 3rem 1rem;">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.2; margin: 0 auto 1.5rem;">
                                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                            </svg>
                            <p style="margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 600; opacity: 0.7;">No payment methods available</p>
                            <p style="margin: 0 0 1rem 0; font-size: 0.9rem; opacity: 0.5;">The admin has not configured payment methods, or the gateway is unavailable</p>
                            <button class="btn-3d btn-sm" @click="fetchPaymentMethods()" style="margin-top: 1rem;">
                                Reload
                            </button>
                        </div>
                    </div>
                    
                    <!-- Payment Button -->
                    <div class="payment-action">
                        <button class="btn-3d btn-primary btn-payment"
                                @click="confirmPayment()"
                                :disabled="!selectedPaymentMethod || loading || couponApplying"
                                x-text="loading ? 'Processing...' : 'Confirm Payment ' + formatCurrency(currentOrder.total_amount)">
                        </button>
                    </div>
                </div>
            </div>

            <!-- Invites View -->
            <div x-show="view === 'invites'" class="view-invites" style="display: none;">
                <h2>My Invites</h2>
                <div class="stats-grid">
                    <div class="card stat-card">
                        <h3>Registered Users</h3>
                        <div class="value" x-text="invites.stat[0] || 0"></div>
                    </div>
                    <div class="card stat-card">
                        <h3>Commission Rate</h3>
                        <div class="value" x-text="(invites.stat[3] || 0) + '%'"></div>
                    </div>
                    <div class="card stat-card">
                        <h3>Available Commission</h3>
                        <div class="value" x-text="formatCurrency(invites.stat[4] || 0)"></div>
                    </div>
                </div>
                
                <div class="card">
                    <div x-show="!invites.invite_admin_only">
                        <h3>Generate Invite Code</h3>
                        <button class="btn-3d" @click="generateInvite()" :disabled="loading">Generate New Code</button>
                    </div>
                    <div x-show="invites.invite_admin_only" class="alert alert-info" style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: #e3f2fd; border-radius: 8px; color: #1565c0;">
                        <span>Invite codes can only be generated by administrators. Please contact support if you need an invite code.</span>
                    </div>

                    <h3>My Codes</h3>
                    <div class="table-wrapper">
                    <table class="table-3d">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template x-for="code in invites.codes" :key="code.id">
                                <tr>
                                    <td>
                                        <span
                                            @click="copyToClipboard(code.code)"
                                            x-text="code.code"
                                            style="cursor: pointer; padding: 2px 6px; border-radius: 4px; background: #f0f0f0; font-family: monospace;"
                                            title="Click to copy"
                                        ></span>
                                    </td>
                                    <td x-text="code.status === 0 ? 'Active' : 'Used'"></td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>

            <!-- Tickets View -->
            <div x-show="view === 'tickets'" class="view-tickets" style="display: none;">
                <h2>Support Tickets</h2>
                <div class="card">
                    <h3>Create Ticket</h3>
                    <div class="form-group">
                        <input type="text" x-model="ticketForm.subject" placeholder="Subject" class="form-input">
                    </div>
                    <div class="form-group">
                        <textarea x-model="ticketForm.message" placeholder="Message" class="form-input" rows="4"></textarea>
                    </div>
                    <button class="btn-3d" @click="createTicket()" :disabled="loading">Submit Ticket</button>
                </div>

                <div class="card">
                    <h3>My Tickets</h3>
                    <div class="table-wrapper">
                    <table class="table-3d">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template x-for="ticket in tickets" :key="ticket.id">
                                <tr>
                                    <td x-text="ticket.subject"></td>
                                    <td x-text="getTicketStatus(ticket.status)"></td>
                                    <td><button class="btn-3d btn-sm" @click="viewTicket(ticket)">View</button></td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
            
            <!-- Ticket Detail View -->
            <div x-show="view === 'ticket_detail'" class="view-ticket-detail" style="display: none;">
                <button class="btn-3d btn-sm" @click="view = 'tickets'">Back to Tickets</button>
                <h2 x-text="selectedTicket ? selectedTicket.subject : 'Ticket Details'"></h2>
                
                <div class="card" x-show="selectedTicket">
                    <div class="ticket-messages">
                        <template x-for="msg in selectedTicket.message" :key="msg.id">
                            <div class="message" :class="msg.is_me ? 'message-me' : 'message-support'">
                                <div class="message-content" x-text="msg.message"></div>
                                <div class="message-meta" x-text="new Date(msg.created_at * 1000).toLocaleString()"></div>
                            </div>
                        </template>
                    </div>
                    
                    <div class="reply-box" x-show="selectedTicket.status !== 2">
                        <div class="form-group">
                            <textarea x-model="ticketReplyForm.message" placeholder="Reply..." class="form-input" rows="3"></textarea>
                        </div>
                        <button class="btn-3d" @click="replyTicket()" :disabled="loading">Reply</button>
                    </div>
                </div>
            </div>

            <!-- Knowledge View -->
            <div x-show="view === 'knowledge'" class="view-knowledge" style="display: none;">
                <h2>Knowledge Base</h2>
                <div class="card">
                    <template x-for="(articles, category) in knowledge.categories" :key="category">
                        <div class="knowledge-category">
                            <h3 x-text="category"></h3>
                            <ul class="article-list">
                                <template x-for="article in articles" :key="article.id">
                                    <li><a href="#" @click.prevent="viewArticle(article.id)" x-text="article.title"></a></li>
                                </template>
                            </ul>
                        </div>
                    </template>
                </div>
            </div>
            
            <!-- Knowledge Detail View -->
            <div x-show="view === 'knowledge_detail'" class="view-knowledge-detail" style="display: none;">
                <button class="btn-3d btn-sm" @click="view = 'knowledge'">Back to Knowledge Base</button>
                <div class="card" x-show="knowledge.currentArticle">
                    <h2 x-text="knowledge.currentArticle.title"></h2>
                    <div class="article-content" x-html="knowledge.currentArticle.body"></div>
                </div>
            </div>

            <!-- Profile View -->
            <div x-show="view === 'profile'" class="view-profile" style="display: none;">
                <h2>Profile Settings</h2>
                
                <div class="card">
                    <h3>Subscription Info</h3>
                    <div class="form-group">
                        <label>Subscription URL</label>
                        <input type="text" :value="user.subscribe_url" class="form-input" readonly>
                    </div>
                    <button class="btn-3d" @click="copySubscribeUrl()">Copy URL</button>
                    <button class="btn-3d" @click="resetSecurity()" :disabled="loading" style="margin-top: 10px;">Reset Subscription Token</button>
                </div>

                <div class="card">
                    <h3>Account Linking</h3>
                    
                    <!-- Telegram Linking -->
                    <div class="binding-item">
                        <div class="binding-header">
                            <div class="binding-icon" style="background: linear-gradient(135deg, #0088cc, #00aaff);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                                </svg>
                            </div>
                            <div class="binding-info">
                                <h4>Telegram</h4>
                                <p class="binding-status" x-show="user.telegram_id">
                                    <span class="status-dot" style="background: #10b981;"></span>
                                    Linked
                                    <span class="binding-account" x-show="user.telegram_id" x-text="'ID: ' + user.telegram_id"></span>
                                </p>
                                <p class="binding-status" x-show="!user.telegram_id">
                                    <span class="status-dot" style="background: #6b7280;"></span>
                                    Not linked
                                </p>
                            </div>
                        </div>
                        <div class="binding-actions">
                            <button x-show="!user.telegram_id" class="btn-3d btn-sm" @click="bindTelegram()" :disabled="loading">
                                Link
                            </button>
                            <button x-show="user.telegram_id" class="btn-3d btn-sm btn-danger" @click="unbindTelegram()" :disabled="loading">
                                Unlink
                            </button>
                        </div>
                    </div>
                    
                    <!-- SSO Linking -->
                    @if ($sso_login_enable)
                    <div class="binding-item">
                        <div class="binding-header">
                            <div class="binding-icon" style="background: linear-gradient(135deg, #4f9cff, #82c4ff);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                </svg>
                            </div>
                            <div class="binding-info">
                                <h4>SSO Account</h4>
                                <p class="binding-status" x-show="user.sso_subject || user.sso_id">
                                    <span class="status-dot" style="background: #10b981;"></span>
                                    Linked
                                    <span class="binding-account" x-show="user.sso_subject || user.sso_id" x-text="(user.sso_provider ? (user.sso_provider + ' / ') : '') + (user.sso_subject || user.sso_id)"></span>
                                </p>
                                <p class="binding-status" x-show="!user.sso_subject && !user.sso_id">
                                    <span class="status-dot" style="background: #6b7280;"></span>
                                    Not linked
                                </p>
                            </div>
                        </div>
                        <div class="binding-actions">
                            <button x-show="!user.sso_subject && !user.sso_id" class="btn-3d btn-sm" @click="bindSSO()" :disabled="loading">
                                Link
                            </button>
                            <button x-show="user.sso_subject || user.sso_id" class="btn-3d btn-sm btn-danger" @click="unbindSSO()" :disabled="loading">
                                Unlink
                            </button>
                        </div>
                    </div>
                    @endif
                    <!-- TOTP Binding -->
                    <div class="binding-item" x-show="siteConfig.is_totp_enable">
                        <div class="binding-header">
                            <div class="binding-icon" style="background: linear-gradient(135deg, #6366f1, #818cf8);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                                </svg>
                            </div>
                            <div class="binding-info">
                                <h4>Two-Factor Authentication (TOTP)</h4>
                                <p class="binding-status" x-show="user.two_factor_verified">
                                    <span class="status-dot" style="background: #10b981;"></span>
                                    Enabled
                                </p>
                                <p class="binding-status" x-show="!user.two_factor_verified">
                                    <span class="status-dot" style="background: #6b7280;"></span>
                                    Not enabled
                                </p>
                            </div>
                        </div>
                        <div class="binding-actions">
                            <button x-show="!user.two_factor_verified" class="btn-3d btn-sm" @click="enableTOTP()" :disabled="loading">
                                Enable
                            </button>
                            <button x-show="user.two_factor_verified" class="btn-3d btn-sm btn-danger" @click="disableTOTP()" :disabled="loading">
                                Disable
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>Change Password</h3>
                    <div class="form-group">
                        <input type="password" x-model="passwordForm.old_password" placeholder="Old Password" class="form-input">
                    </div>
                    <div class="form-group">
                        <input type="password" x-model="passwordForm.new_password" placeholder="New Password" class="form-input">
                    </div>
                    <button class="btn-3d" @click="changePassword()" :disabled="loading">Update Password</button>
                </div>
            </div>
        </main>

        <!-- Site Footer -->
        <footer class="site-footer" x-show="!['login', 'register'].includes(view)" style="display: none;">
            <div class="container">
                <div class="site-footer-inner">
                    <div class="site-footer-brand">
                        @if($logo)
                            <img src="{{$logo}}" alt="{{$title}}" class="site-footer-logo">
                        @endif
                        <span class="site-footer-title">{{$title}}</span>
                    </div>
                    <nav class="site-footer-links" aria-label="Quick links">
                        <a href="#/dashboard"
                           class="site-footer-link"
                           :class="{ 'active': ['dashboard', 'servers', 'transfer'].includes(view) }"
                           :aria-current="['dashboard', 'servers', 'transfer'].includes(view) ? 'page' : 'false'"
                           aria-label="Go to dashboard"
                           @click.prevent="view = 'dashboard'">/dashboard</a>
                        <a href="#/plan"
                           class="site-footer-link"
                           :class="{ 'active': ['plan', 'orders', 'redeem', 'payment'].includes(view) }"
                           :aria-current="['plan', 'orders', 'redeem', 'payment'].includes(view) ? 'page' : 'false'"
                           aria-label="Go to plan"
                           @click.prevent="view = 'plan'">/plan</a>
                        <a href="#/tickets"
                           class="site-footer-link"
                           :class="{ 'active': ['tickets', 'ticket_detail', 'knowledge', 'knowledge_detail'].includes(view) }"
                           :aria-current="['tickets', 'ticket_detail', 'knowledge', 'knowledge_detail'].includes(view) ? 'page' : 'false'"
                           aria-label="Go to tickets"
                           @click.prevent="view = 'tickets'">/tickets</a>
                        <a href="#/profile"
                           class="site-footer-link"
                           :class="{ 'active': ['profile', 'invites'].includes(view) }"
                           :aria-current="['profile', 'invites'].includes(view) ? 'page' : 'false'"
                           aria-label="Go to profile"
                           @click.prevent="view = 'profile'">/profile</a>
                    </nav>
                </div>
            </div>
        </footer>

        <!-- Telegram Login Modal -->
        <div x-show="showTelegramLogin" class="modal-overlay" @click.self="showTelegramLogin = false" style="display: none;">
            <div class="modal-content telegram-modal">
                <div class="modal-header">
                    <h3>Telegram Login</h3>
                    <button class="modal-close" @click="showTelegramLogin = false" :disabled="telegramLoading">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 1rem; color: var(--text-color); opacity: 0.8;">Enter the email that is linked to Telegram</p>
                    <div class="form-group">
                        <input type="email" 
                               x-model="telegramForm.email" 
                               placeholder="Email address" 
                               class="form-input"
                               @keyup.enter="submitTelegramLogin()"
                               :disabled="telegramLoading || telegramWaiting">
                    </div>
                    <div x-show="telegramMessage" 
                         class="telegram-message" 
                         :class="'message-' + telegramMessageType"
                         x-text="telegramMessage"></div>
                    <button class="btn-3d btn-block" 
                            @click="submitTelegramLogin()" 
                            :disabled="telegramLoading || telegramWaiting">
                        <span x-show="!telegramLoading && !telegramWaiting">Submit</span>
                        <span x-show="telegramLoading">Sending request...</span>
                        <span x-show="telegramWaiting">Waiting for Telegram approval...</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 2FA Login Modal -->
        <div x-show="show2FAModal" class="modal-overlay" style="display: none;">
            <div class="modal-content telegram-modal">
                <div class="modal-header">
                    <h3>Two-Factor Authentication</h3>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 1rem; color: var(--text-color); opacity: 0.8;">
                        Please enter the code from your authenticator app
                    </p>
                    <div class="form-group">
                        <input type="text" 
                               x-model="twoFactorCode" 
                               placeholder="6-digit code" 
                               class="form-input" 
                               maxlength="6"
                               @keyup.enter="submit2FA()">
                    </div>
                    <button class="btn-3d btn-block" @click="submit2FA()" :disabled="loading">
                        <span x-show="!loading">Verify</span>
                        <span x-show="loading">Verifying...</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- TOTP Setup Modal -->
        <div x-show="showTOTPModal" class="modal-overlay" @click.self="showTOTPModal = false" style="display: none;">
            <div class="modal-content telegram-modal">
                <div class="modal-header">
                    <h3>Setup TOTP</h3>
                    <button class="modal-close" @click="showTOTPModal = false">×</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <input type="text"
                               class="form-input"
                               readonly
                               :value="totpData.otpauth"
                               style="font-size: 12px;"
                               @click="$event.target.select()">
                    </div>
                    <p style="margin-bottom: 1rem; color: var(--text-color); opacity: 0.8; font-size: 0.9rem;">
                        Add this account in your authenticator app.
                        <br>
                        Secret key: <strong x-text="totpData.secret" style="user-select: all;"></strong>
                    </p>
                    <div class="form-group">
                        <input type="text" 
                               x-model="totpVerifyCode" 
                               placeholder="Enter 6-digit code to verify" 
                               class="form-input"
                               maxlength="6">
                    </div>
                    <button class="btn-3d btn-block" @click="verifyTOTPSetup()" :disabled="loading">
                        Verify & Enable
                    </button>
                </div>
            </div>
        </div>

        <!-- Global Dialog -->
        <div x-show="dialog.open" class="modal-overlay" @click.self="handleDialogCancel()" style="display: none;">
            <div class="modal-content dialog-modal">
                <div class="modal-header">
                    <h3 x-text="dialog.title"></h3>
                    <button class="modal-close" @click="handleDialogCancel()">×</button>
                </div>
                <div class="modal-body">
                    <p x-text="dialog.message" style="margin: 0;"></p>
                </div>
                <div class="modal-actions">
                    <button class="btn-3d" x-show="dialog.cancelText" @click="handleDialogCancel()" x-text="dialog.cancelText"></button>
                    <button class="btn-3d btn-primary" @click="handleDialogConfirm()" x-text="dialog.confirmText"></button>
                </div>
            </div>
        </div>

        <!-- Subscription Modal -->
        <div x-show="showSubscriptionModal" class="modal-overlay" @click.self="showSubscriptionModal = false" style="display: none;">
            <div class="modal-content subscription-modal">
                <div class="modal-header">
                    <h3>Subscription Links</h3>
                    <button class="modal-close" @click="showSubscriptionModal = false">×</button>
                </div>
                <div class="modal-body">
                    <div class="subscription-option">
                        <h4>Universal Link</h4>
                        <p>Copy this subscription link into your client</p>
                        <button class="btn-3d btn-block" @click="copySubscribeUrl(); showNotification('Subscription link copied')">Copy Link</button>
                    </div>
                    <div class="subscription-divider">or</div>
                    <div class="subscription-option">
                        <h4>One-click Import</h4>
                        <p>Import directly into supported clients</p>
                        <div class="import-buttons">
                            <a :href="'clash://install-config?url=' + encodeURIComponent(user.subscribe_url)" class="btn-3d btn-import" aria-label="Clash" title="Clash">
                                <img src="/theme/{{$theme}}/assets/images/clash.png" alt="Clash">
                            </a>
                            <a :href="'sing-box://import-remote-profile?url=' + encodeURIComponent(user.subscribe_url) + '#' + encodeURIComponent((window.settings && window.settings.title) ? window.settings.title : '')" class="btn-3d btn-import" aria-label="Sing-box" title="Sing-box">
                                <img src="/theme/{{$theme}}/assets/images/singbox.png" alt="Sing-box">
                            </a>
                            <a :href="'loon://import?sub=' + encodeURIComponent(user.subscribe_url)" class="btn-3d btn-import" aria-label="Loon" title="Loon">
                                <img src="/theme/{{$theme}}/assets/images/loon.png" alt="Loon">
                            </a>
                            <a :href="'quantumult://add-resource?remote-resource=' + encodeURIComponent(user.subscribe_url)" class="btn-3d btn-import" aria-label="Quantumult X" title="Quantumult X">
                                <img src="/theme/{{$theme}}/assets/images/quantumultx.png" alt="Quantumult X">
                            </a>
                            <a :href="'shadowrocket://add/' + encodeURIComponent(user.subscribe_url)" class="btn-3d btn-import" aria-label="Shadowrocket" title="Shadowrocket">
                                <img src="/theme/{{$theme}}/assets/images/shadowrocket.png" alt="Shadowrocket">
                            </a>
                            <a :href="'surge://install-config?url=' + encodeURIComponent(user.subscribe_url)" class="btn-3d btn-import" aria-label="Surge" title="Surge">
                                <img src="/theme/{{$theme}}/assets/images/surge.png" alt="Surge">
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile Bottom Navigation -->
        <nav class="bottom-nav" x-show="!['login', 'register'].includes(view)" style="display: none;">
            <a href="#" 
               class="bottom-nav-item" 
               :class="{ 'active': view === 'dashboard' }"
               @click.prevent="view = 'dashboard'">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span>Dashboard</span>
            </a>
            <a href="#" 
               class="bottom-nav-item" 
               :class="{ 'active': ['plan', 'orders', 'redeem', 'payment'].includes(view) }"
               @click.prevent="view = 'plan'">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
                <span>Shop</span>
            </a>
            <a href="#" 
               class="bottom-nav-item" 
               :class="{ 'active': ['servers', 'transfer'].includes(view) }"
               @click.prevent="view = 'servers'">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.37 7.69 9.48 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3s-1.34 3-3 3z"/>
                </svg>
                <span>Servers</span>
            </a>
            <a href="#" 
               class="bottom-nav-item" 
               :class="{ 'active': ['tickets', 'ticket_detail', 'knowledge', 'knowledge_detail'].includes(view) }"
               @click.prevent="view = 'tickets'">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
                </svg>
                <span>Support</span>
            </a>
            <a href="#" 
               class="bottom-nav-item" 
               :class="{ 'active': ['profile', 'invites'].includes(view) }"
               @click.prevent="view = 'profile'">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span>Profile</span>
            </a>
        </nav>

        <div class="confetti-container" x-ref="confettiContainer" id="fantastic-confetti" aria-hidden="true"></div>
    </div>

    <div id="fantastic-custom-html" x-cloak>
        {!! $theme_config['custom_html'] !!}
    </div>
    <script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js"></script>
    <script src="/theme/{{$theme}}/assets/js/app.js?v={{$version}}"></script>
</body>
</html>
