const SERVERS_MAP_STYLE = {
    version: 8,
    sources: {
        osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors'
        }
    },
    layers: [
        {
            id: 'osm',
            type: 'raster',
            source: 'osm'
        }
    ]
};
const SERVER_COUNTRY_COORDINATES = {
    AE: [54.37, 24.45],
    AR: [-64.19, -34.61],
    AT: [14.13, 47.52],
    AU: [133.78, -25.27],
    BD: [90.36, 23.68],
    BE: [4.47, 50.5],
    BG: [25.49, 42.73],
    BH: [50.56, 26.07],
    BO: [-63.59, -16.29],
    BR: [-51.92, -14.24],
    BY: [27.95, 53.71],
    CA: [-106.35, 56.13],
    CH: [8.23, 46.82],
    CL: [-71.54, -35.68],
    CN: [104.2, 35.86],
    CO: [-74.3, 4.57],
    CR: [-83.75, 9.75],
    CY: [33.43, 35.13],
    CZ: [15.47, 49.82],
    DE: [10.45, 51.17],
    DK: [9.5, 56.26],
    DO: [-70.16, 18.74],
    DZ: [1.66, 28.03],
    EC: [-78.18, -1.83],
    EE: [25.01, 58.6],
    EG: [30.8, 26.82],
    ES: [-3.75, 40.46],
    FI: [25.75, 61.92],
    FR: [2.21, 46.23],
    GB: [-3.44, 55.38],
    GE: [43.36, 42.32],
    GH: [-1.02, 7.95],
    GR: [21.82, 39.07],
    HK: [114.17, 22.32],
    HR: [15.2, 45.1],
    HU: [19.5, 47.16],
    ID: [113.92, -0.79],
    IE: [-8.24, 53.41],
    IL: [34.85, 31.05],
    IN: [78.96, 20.59],
    IQ: [43.68, 33.22],
    IR: [53.69, 32.43],
    IS: [-19.02, 64.96],
    IT: [12.57, 41.87],
    JO: [36.24, 30.59],
    JP: [138.25, 36.2],
    KE: [37.91, -0.02],
    KG: [74.77, 41.2],
    KH: [104.99, 12.57],
    KR: [127.77, 35.91],
    KW: [47.48, 29.31],
    KZ: [66.92, 48.02],
    LA: [102.5, 19.86],
    LB: [35.86, 33.85],
    LK: [80.77, 7.87],
    LT: [23.88, 55.17],
    LU: [6.13, 49.82],
    LV: [24.6, 56.88],
    MA: [-7.09, 31.79],
    MD: [28.37, 47.41],
    MK: [21.75, 41.61],
    MM: [95.96, 21.91],
    MN: [103.85, 46.86],
    MO: [113.54, 22.2],
    MT: [14.38, 35.94],
    MU: [57.55, -20.35],
    MX: [-102.55, 23.63],
    MY: [101.98, 4.21],
    NG: [8.68, 9.08],
    NL: [5.29, 52.13],
    NO: [8.47, 60.47],
    NP: [84.12, 28.39],
    NZ: [174.89, -40.9],
    OM: [55.92, 21.47],
    PA: [-80.78, 8.54],
    PE: [-75.02, -9.19],
    PH: [121.77, 12.88],
    PK: [69.35, 30.38],
    PL: [19.15, 51.92],
    PT: [-8.22, 39.4],
    PY: [-58.44, -23.44],
    QA: [51.18, 25.35],
    RO: [24.97, 45.94],
    RS: [21.01, 44.02],
    RU: [105.32, 61.52],
    SA: [45.08, 23.89],
    SE: [18.64, 60.13],
    SG: [103.82, 1.35],
    SI: [14.99, 46.15],
    SK: [19.7, 48.67],
    TH: [100.99, 15.87],
    TN: [9.54, 33.89],
    TR: [35.24, 38.96],
    TW: [120.96, 23.7],
    UA: [31.17, 48.38],
    US: [-98.58, 39.83],
    UY: [-55.77, -32.52],
    UZ: [64.59, 41.38],
    VE: [-66.59, 6.42],
    VN: [108.28, 14.06],
    ZA: [22.94, -30.56]
};

document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        view: 'dashboard',
        user: {
            email: 'Loading...',
            balance: 0,
            d: 0,
            u: 0,
            transfer_enable: 0,
            plan_id: null,
            commission_balance: 0,
            telegram_id: null,
            sso_id: null,
            sso_subject: null,
            sso_provider: null,
            passkey_count: 0,
            uuid: '',
            token: '',
            expired_at: null,
            plan_started_at: null
        },
        plans: [],
        orders: [],
        tickets: [],
        invites: {
            codes: [],
            stat: [],
            invite_admin_only: 0
        },
        traffics: [],
        trafficsLoaded: false,
        todayTrafficOverview: {
            total_usage_gb: 0,
            top_usage_gb: [],
            unit: 'GB'
        },
        todayTrafficLoaded: false,
        todayTrafficLoading: false,
        knowledge: {
            categories: {},
            currentArticle: null
        },
        servers: [],
        serverMap: {
            map: null,
            ready: false,
            markers: [],
            popup: null,
            initialized: false,
            loadFailed: false,
            hasMarkers: false,
            matchedServers: 0,
            skippedServers: 0,
            retryTimer: null,
            resizeTimer: null,
            resizeHandler: null
        },
        notices: [],
        showNotices: true,
        noticeModalOpen: false,
        activeNotice: null,
        noticeSlideIndex: 0,
        noticeSlideTimer: null,
        noticeSlideIntervalMs: 3000,
        noticeSliderHovered: false,
        paymentMethods: [],
        serverModalOpen: false,
        selectedServer: null,
        dialog: {
            open: false,
            title: '',
            message: '',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: null,
            onCancel: null
        },

        selectedPlan: null,
        selectedPeriod: 'month_price',
        loading: false,

        // Payment
        currentOrder: null,
        selectedPaymentMethod: null,

        // Mobile menu
        mobileMenuOpen: false,

        // Theme
        themePreference: 'system', // system | light | dark
        themeResolved: 'light', // light | dark
        _themeMediaQuery: null,
        _themeMediaListener: null,

        // Subscription modal
        showSubscriptionModal: false,

        // Telegram Login
        telegram_login_enable: window.settings?.telegram_login_enable || 0,
        passkey_login_enable: window.settings?.passkey_login_enable || 0,
        showTelegramLogin: false,
        telegramForm: { email: '' },
        telegramLoading: false,
        telegramWaiting: false,
        telegramMessage: '',
        telegramMessageType: 'info',
        telegramPendingToken: null,
        telegramPollingTimer: null,
        telegramPollingAttempts: 0,
        telegramPollingMaxAttempts: 40,

        // Passkey
        passkeySupported: typeof window !== 'undefined'
            && window.isSecureContext
            && typeof window.PublicKeyCredential !== 'undefined',
        passkeyLoading: false,
        passkeyLoginLoading: false,
        passkeys: [],

        // SSO Login
        sso_login_enable: window.settings?.sso_login_enable || 0,
        sso_provider: window.settings?.sso_provider || 'casdoor',
        ssoLoading: false,

        // TOTP
        showTOTPModal: false,
        totpData: { secret: '', otpauth: '' },
        totpVerifyCode: '',

        // 2FA Login
        show2FAModal: false,
        twoFactorCode: '',
        twoFactorToken: null,

        // Forms
        authForm: { email: '', password: '', invite_code: '', email_code: '' },
        ticketForm: { subject: '', message: '' },
        ticketReplyForm: { id: null, message: '' },
        passwordForm: { old_password: '', new_password: '' },
        redeemForm: { code: '' },
        redeemResult: { success: false, message: '' },
        couponForm: { code: '' },
        appliedCoupon: null,
        couponApplying: false,

        // Routing
        routeParams: {
            paymentTradeNo: null,
            ticketId: null,
            articleId: null
        },
        currentRoute: { view: 'dashboard', params: {} },
        routerReady: false,
        suppressHashUpdate: false,

        // Details Views
        selectedTicket: null,

        // Captcha
        siteConfig: {},
        captcha: {
            token: '',
            loginWidget: null,
            registerWidget: null,
            loginRequested: false,
            loginPending: false
        },

        init() {
            this.initTheme();
            this.initRouter();
            // Check for Telegram verify code first
            this.checkTelegramVerify();

            this.fetchSiteConfig().then(() => {
                this.fetchUserInfo();
            });

            // Check for SSO errors
            this.checkSsoError();

            this.$watch('view', (value) => {
                if (value === 'register' && this.isRegisterDisabled()) {
                    this.view = 'login';
                    return;
                }
                this.resetRouteParamsForView(value);
                this.syncHashWithView();
                this.handleViewEntered(value);
            });

            this.handleViewEntered(this.view);

            // Watch for Telegram login modal open
            this.$watch('showTelegramLogin', (value) => {
                if (value) {
                    // Auto-fill email from login form if available
                    if (this.authForm.email) {
                        this.telegramForm.email = this.authForm.email;
                    }
                    // Reset states
                    this.telegramMessage = '';
                    this.telegramLoading = false;
                    this.telegramWaiting = false;
                } else {
                    // Cleanup when closing
                    this.stopTelegramPolling();
                    this.telegramForm.email = '';
                    this.telegramMessage = '';
                    this.telegramLoading = false;
                    this.telegramWaiting = false;
                }
            });

            this.$watch('showNotices', (value) => {
                if (!value) {
                    this.stopNoticeAutoplay();
                    return;
                }
                this.startNoticeAutoplay();
            });

            this.$watch('noticeModalOpen', (value) => {
                if (value) {
                    this.stopNoticeAutoplay();
                    return;
                }
                this.startNoticeAutoplay();
            });
        },

        initTheme() {
            const storageKey = 'fantastic_theme';
            let preference = 'system';
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved === 'light' || saved === 'dark' || saved === 'system') preference = saved;
            } catch (e) {}

            this.themePreference = preference;
            this.applyThemePreference();

            const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
            this._themeMediaQuery = mq;
            this._themeMediaListener = () => {
                if (this.themePreference === 'system') this.applyThemePreference();
            };
            if (mq) {
                try {
                    mq.addEventListener('change', this._themeMediaListener);
                } catch (e) {
                    try { mq.addListener(this._themeMediaListener); } catch (e2) {}
                }
            }
        },

        applyThemePreference() {
            const root = document.documentElement;
            const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
            const systemIsDark = !!(mq && mq.matches);

            const preference = this.themePreference;
            if (preference === 'light' || preference === 'dark') {
                root.setAttribute('data-theme', preference);
            } else {
                root.removeAttribute('data-theme');
            }

            const resolved = (preference === 'dark') || (preference === 'system' && systemIsDark) ? 'dark' : 'light';
            this.themeResolved = resolved;
        },

        toggleTheme() {
            const storageKey = 'fantastic_theme';
            const next = this.themeResolved === 'dark' ? 'light' : 'dark';
            this.themePreference = next;
            try { localStorage.setItem(storageKey, next); } catch (e) {}
            this.applyThemePreference();
        },

        initRouter() {
            const handleHash = () => {
                if (this.suppressHashUpdate) return;
                this.applyRouteFromHash();
                this.checkSsoError();
                this.checkTelegramVerify();
            };

            handleHash();
            window.addEventListener('hashchange', handleHash);
            this.routerReady = true;
        },

        applyRouteFromHash() {
            const route = this.parseRouteFromHash(window.location.hash || '');
            this.currentRoute = route;
            const baseRouteParams = {
                paymentTradeNo: null,
                ticketId: null,
                articleId: null
            };
            this.routeParams = { ...baseRouteParams, ...route.params };
            this.suppressHashUpdate = true;
            this.view = route.view;
            this.$nextTick(() => { this.suppressHashUpdate = false; });
            this.hydrateRouteContext(route);
        },

        parseRouteFromHash(rawHash) {
            const cleaned = (rawHash || '').replace(/^#/, '');
            const [pathPart = '', queryString = ''] = cleaned.split('?');
            const path = pathPart.replace(/^\/+/, '');
            const segments = path.split('/').filter(Boolean);
            const params = {};
            let view = segments[0] || 'dashboard';

            try {
                const search = new URLSearchParams(queryString);
                if (search.has('trade_no')) params.paymentTradeNo = search.get('trade_no');
                if (search.has('redirect')) params.redirect = search.get('redirect');
                if (search.has('verify')) params.verify = search.get('verify');
                if (search.has('sso_error')) params.sso_error = search.get('sso_error');
                if (search.has('sso_message')) params.sso_message = search.get('sso_message');
            } catch (err) {
                console.warn('Failed to parse hash params', err);
            }

            if (segments[0] === 'tickets' && segments[1]) {
                view = 'ticket_detail';
                params.ticketId = segments[1];
            } else if (segments[0] === 'knowledge' && segments[1]) {
                view = 'knowledge_detail';
                params.articleId = segments[1];
            } else if (segments[0] === 'payment') {
                view = 'payment';
            } else if (!segments[0]) {
                view = 'dashboard';
            }

            const allowedViews = [
                'dashboard', 'servers', 'plan', 'orders', 'redeem', 'transfer',
                'invites', 'tickets', 'knowledge', 'profile', 'login', 'register',
                'payment', 'ticket_detail', 'knowledge_detail'
            ];
            if (!allowedViews.includes(view)) {
                view = 'dashboard';
            }

            return { view, params };
        },

        buildHashFromState(view, extraParams = {}) {
            const params = new URLSearchParams();
            const mergedParams = { ...this.routeParams, ...extraParams };
            let path = view || 'dashboard';

            if (view === 'ticket_detail') {
                const ticketId = mergedParams.ticketId || this.ticketReplyForm.id || this.selectedTicket?.id;
                path = ticketId ? `tickets/${ticketId}` : 'tickets';
            } else if (view === 'knowledge_detail') {
                const articleId = mergedParams.articleId || this.knowledge.currentArticle?.id;
                path = articleId ? `knowledge/${articleId}` : 'knowledge';
            } else if (view === 'payment') {
                path = 'payment';
                if (mergedParams.paymentTradeNo) {
                    params.set('trade_no', mergedParams.paymentTradeNo);
                } else if (this.currentOrder?.trade_no) {
                    params.set('trade_no', this.currentOrder.trade_no);
                }
            }

            const query = params.toString();
            return `#/${path}${query ? `?${query}` : ''}`;
        },

        syncHashWithView() {
            if (!this.routerReady || this.suppressHashUpdate) return;
            const targetHash = this.buildHashFromState(this.view);
            if (targetHash !== window.location.hash) {
                this.suppressHashUpdate = true;
                window.location.hash = targetHash;
                setTimeout(() => { this.suppressHashUpdate = false; }, 0);
            }
        },

        hydrateRouteContext(route) {
            if (route.view === 'payment' && route.params.paymentTradeNo) {
                this.routeParams.paymentTradeNo = route.params.paymentTradeNo;
                this.tryHydratePaymentFromOrders();
            }
            if (route.view === 'ticket_detail' && route.params.ticketId) {
                this.routeParams.ticketId = route.params.ticketId;
                this.viewTicket({ id: route.params.ticketId });
            }
            if (route.view === 'knowledge_detail' && route.params.articleId) {
                this.routeParams.articleId = route.params.articleId;
                this.viewArticle(route.params.articleId);
            }
        },

        tryHydratePaymentFromOrders() {
            if (!this.routeParams.paymentTradeNo || !Array.isArray(this.orders) || this.orders.length === 0) return;
            if (this.currentOrder && String(this.currentOrder.trade_no) === String(this.routeParams.paymentTradeNo)) return;
            const match = this.orders.find((order) => String(order.trade_no) === String(this.routeParams.paymentTradeNo));
            if (match) {
                this.goToPayment(match);
            }
        },

        resetRouteParamsForView(view) {
            if (view !== 'payment') this.routeParams.paymentTradeNo = null;
            if (view !== 'ticket_detail') this.routeParams.ticketId = null;
            if (view !== 'knowledge_detail') this.routeParams.articleId = null;
        },

        handleViewEntered(value) {
            this.$nextTick(() => {
                if (value === 'login') {
                    // Check for verify code when entering login page
                    this.checkTelegramVerify();
                }
                if (value === 'register' && !this.isRegisterDisabled()) {
                    this.renderCaptcha('captcha-register', 'registerWidget');
                }
                if (value === 'transfer' && !this.trafficsLoaded) {
                    this.fetchTraffics();
                }
                if (value === 'dashboard' && !this.todayTrafficLoaded && !this.todayTrafficLoading) {
                    this.fetchTodayTrafficOverview();
                }
                if (value === 'dashboard') {
                    this.startNoticeAutoplay();
                } else {
                    this.stopNoticeAutoplay();
                }
                if (value === 'servers') {
                    this.refreshServersMap(true);
                } else {
                    this.closeServersMapPopup();
                    clearTimeout(this.serverMap.retryTimer);
                    clearTimeout(this.serverMap.resizeTimer);
                }
                if (value !== 'login') {
                    this.captcha.loginRequested = false;
                    this.captcha.loginPending = false;
                    this.captcha.token = '';
                }
            });
        },

        isRegisterDisabled() {
            return Number(this.siteConfig?.stop_register) === 1;
        },

        isInviteRequired() {
            return Number(this.siteConfig?.is_invite_force) === 1;
        },

        ensureRegisterAllowed() {
            if (!this.isRegisterDisabled()) return;
            if (this.view === 'register') {
                this.view = 'login';
            }
        },

        normalizeGatewayRequest(url, options = {}) {
            if (typeof url !== 'string') return { url, options };
            if (!url.startsWith('/api/v3/') || url.startsWith('/api/v3/server')) return { url, options };

            const originalMethod = String(options.method || 'GET').toUpperCase();
            const [rawPath, rawQuery = ''] = url.split('?');
            const endpoint = rawPath.slice('/api/v3/'.length).replace(/^\/+/, '');
            if (!endpoint) return { url, options };

            const params = {};

            try {
                const queryParams = new URLSearchParams(rawQuery);
                queryParams.forEach((value, key) => {
                    if (typeof params[key] === 'undefined') params[key] = value;
                });
            } catch (e) {
                // ignore invalid query string
            }

            if (typeof options.body === 'string' && options.body.trim() !== '') {
                try {
                    const parsed = JSON.parse(options.body);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        Object.keys(parsed).forEach((key) => {
                            params[key] = parsed[key];
                        });
                    }
                } catch (e) {
                    // ignore non-JSON body
                }
            } else if (typeof URLSearchParams !== 'undefined' && options.body instanceof URLSearchParams) {
                options.body.forEach((value, key) => {
                    params[key] = value;
                });
            } else if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
                for (const [key, value] of options.body.entries()) {
                    params[key] = value;
                }
            }

            const payload = {
                endpoint,
                method: originalMethod,
                params
            };

            const headers = options.headers || {};
            headers['Content-Type'] = headers['Content-Type'] || headers['content-type'] || 'application/json';

            return {
                url: '/api/v3/server',
                options: {
                    ...options,
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                }
            };
        },

        async request(url, options = {}) {
            ({ url, options } = this.normalizeGatewayRequest(url, options));
            const headers = options.headers || {};
            const skipAuth = options.skipAuth === true;
            if ('skipAuth' in options) delete options.skipAuth;
            if (skipAuth) {
                delete headers.Authorization;
                delete headers.authorization;
            } else {
                const token = localStorage.getItem('auth_data');
                if (token) {
                    headers['Authorization'] = token;
                }
            }
            // Ensure Content-Type is set for POST requests if not already
            if (options.method === 'POST' && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
            options.headers = headers;

            try {
                const response = await fetch(url, options);
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('auth_data');
                    this.view = 'login';
                    // Don't throw, just return null or handle gracefully
                    return null;
                }
                return response;
            } catch (error) {
                console.error('Request error:', error);
                throw error;
            }
        },

        async safeJsonParse(response) {
            if (!response) return null;

            // Handle 304 Not Modified - means data hasn't changed, keep existing data
            if (response.status === 304) {
                return null;
            }

            // Check response status - but still try to parse error responses
            if (!response.ok) {
                return null;
            }

            try {
                // Validate Content-Type
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return null;
                }

                const data = await response.json();
                return data;
            } catch (error) {
                return null;
            }
        },

        async fetchSiteConfig() {
            try {
                const response = await this.request('/api/v3/guest/comm/config'); // Public endpoint, no auth needed
                const data = await response.json();
                if (data.data) {
                    this.siteConfig = data.data;
                    if (typeof data.data.passkey_login_enable !== 'undefined') {
                        this.passkey_login_enable = Number(data.data.passkey_login_enable) || 0;
                    }
                    this.ensureRegisterAllowed();
                    if (this.siteConfig.is_recaptcha || this.siteConfig.is_turnstile) {
                        this.loadCaptchaScript();
                        this.$nextTick(() => {
                            if (this.view === 'register' && !this.isRegisterDisabled()) {
                                this.renderCaptcha('captcha-register', 'registerWidget');
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching site config:', error);
            }
        },

        loadCaptchaScript() {
            if (this.siteConfig.is_turnstile) {
                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            } else if (this.siteConfig.is_recaptcha) {
                const script = document.createElement('script');
                script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
        },

        renderCaptcha(containerId, widgetKey) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = ''; // Clear previous
            this.captcha.token = ''; // Reset token

            if (this.siteConfig.is_turnstile) {
                if (window.turnstile) {
                    this.captcha[widgetKey] = turnstile.render('#' + containerId, {
                        sitekey: this.siteConfig.turnstile_site_key,
                        callback: (token) => {
                            this.captcha.token = token;
                            if (widgetKey === 'loginWidget' && this.captcha.loginPending) {
                                this.captcha.loginPending = false;
                                this.$nextTick(() => this.login());
                            }
                        }
                    });
                } else {
                    setTimeout(() => this.renderCaptcha(containerId, widgetKey), 500);
                }
            } else if (this.siteConfig.is_recaptcha) {
                if (window.grecaptcha) {
                    this.captcha[widgetKey] = grecaptcha.render(containerId, {
                        sitekey: this.siteConfig.recaptcha_site_key,
                        callback: (token) => {
                            this.captcha.token = token;
                            if (widgetKey === 'loginWidget' && this.captcha.loginPending) {
                                this.captcha.loginPending = false;
                                this.$nextTick(() => this.login());
                            }
                        }
                    });
                } else {
                    setTimeout(() => this.renderCaptcha(containerId, widgetKey), 500);
                }
            }
        },

        ensureLoginCaptchaVisible() {
            const captchaRequired = this.siteConfig.is_turnstile || this.siteConfig.is_recaptcha;
            if (!captchaRequired) return false;
            if (!this.captcha.loginRequested) {
                this.captcha.loginRequested = true;
                this.$nextTick(() => this.renderCaptcha('captcha-login', 'loginWidget'));
            }
            return true;
        },

        async fetchUserInfo() {
            try {
                const response = await this.request('/api/v3/user/info');
                if (!response) return; // Handled by request (401)

                const data = await this.safeJsonParse(response);
                if (data && data.data) {
                    const ssoSubject = data.data.sso_subject || data.data.sso_id || data.data.casdoor_user_id || null;
                    const ssoProvider = data.data.sso_provider || this.user.sso_provider || 'casdoor';
                    // Merge user data, ensuring sso_id is included
                    this.user = {
                        ...this.user,
                        ...data.data,
                        // Normalize SSO fields for UI
                        sso_subject: ssoSubject,
                        sso_provider: ssoProvider,
                        sso_id: ssoSubject
                    };

                    // Only fetch other data if logged in
                    this.fetchPlans();
                    this.fetchOrders();
                    this.fetchTickets();
                    this.fetchInvites();
                    this.fetchKnowledge();
                    this.fetchServers();
                    this.fetchNotices();
                    this.fetchPaymentMethods();
                    this.fetchSubscribe();
                    this.fetchTodayTrafficOverview();
                    this.fetchPasskeys();
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
            }
        },

        async login() {
            if (this.loading) return;
            const captchaRequired = this.siteConfig.is_turnstile || this.siteConfig.is_recaptcha;
            if (captchaRequired && !this.captcha.token) {
                this.ensureLoginCaptchaVisible();
                this.captcha.loginPending = true;
                return;
            }
            this.loading = true;
            try {
                const params = {
                    email: this.authForm.email,
                    password: this.authForm.password
                };
                if (this.siteConfig.is_turnstile) params.turnstile_token = this.captcha.token;
                else if (this.siteConfig.is_recaptcha) params.recaptcha_data = this.captcha.token;

                const response = await this.request('/api/v3/passport/auth/login', { // Login is public
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params),
                    skipAuth: true
                });
                const data = await response.json();
                if (data.data) {
                    if (data.data.need_2fa) {
                        this.twoFactorToken = data.data.token;
                        this.show2FAModal = true;
                        this.loading = false;
                        return;
                    }
                    localStorage.setItem('auth_data', data.data.auth_data); // Save token
                    // Also set authorization for admin panel compatibility
                    localStorage.setItem('authorization', data.data.auth_data);
                    this.fetchUserInfo();
                    const redirectTarget = this.normalizeRedirectTarget(
                        data.data.redirect || this.getRedirectParam() || 'dashboard'
                    );
                    this.suppressHashUpdate = true;
                    window.location.hash = `#/${redirectTarget}`;
                    this.applyRouteFromHash();
                    this.$nextTick(() => { this.suppressHashUpdate = false; });
                    this.authForm.password = ''; // Clear password
                    this.captcha.loginRequested = false;
                    this.captcha.token = '';
                } else {
                    this.showMessage(data.message || 'Login failed');
                    // Reset captcha on failure
                    if (this.siteConfig.is_turnstile && window.turnstile) turnstile.reset(this.captcha.loginWidget);
                    if (this.siteConfig.is_recaptcha && window.grecaptcha) grecaptcha.reset(this.captcha.loginWidget);
                    this.captcha.token = '';
                }
            } catch (error) {
                console.error('Login error:', error);
                this.showMessage('Login failed');
            } finally {
                this.loading = false;
            }
        },

        async register() {
            this.loading = true;
            try {
                if (this.isRegisterDisabled()) {
                    this.showMessage('Registration is currently disabled.');
                    return;
                }
                if (this.isInviteRequired() && !this.authForm.invite_code) {
                    this.showMessage('Please enter an invite code.');
                    return;
                }
                const params = {
                    email: this.authForm.email,
                    password: this.authForm.password,
                    invite_code: this.authForm.invite_code,
                    email_code: this.authForm.email_code
                };
                if (this.siteConfig.is_turnstile) params.turnstile_token = this.captcha.token;
                else if (this.siteConfig.is_recaptcha) params.recaptcha_data = this.captcha.token;

                const response = await this.request('/api/v3/passport/auth/register', { // Register is public
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params),
                    skipAuth: true
                });
                const data = await response.json();
                if (data.data) {
                    localStorage.setItem('auth_data', data.data.auth_data); // Save token (auto login)
                    // Also set authorization for admin panel compatibility
                    localStorage.setItem('authorization', data.data.auth_data);
                    this.showMessage('Registration successful!');
                    this.fetchUserInfo();
                    const redirectTarget = this.normalizeRedirectTarget(
                        data.data.redirect || this.getRedirectParam() || 'dashboard'
                    );
                    this.suppressHashUpdate = true;
                    window.location.hash = `#/${redirectTarget}`;
                    this.applyRouteFromHash();
                    this.$nextTick(() => { this.suppressHashUpdate = false; });
                } else {
                    this.showMessage(data.message || 'Registration failed');
                    // Reset captcha on failure
                    if (this.siteConfig.is_turnstile && window.turnstile) turnstile.reset(this.captcha.registerWidget);
                    if (this.siteConfig.is_recaptcha && window.grecaptcha) grecaptcha.reset(this.captcha.registerWidget);
                }
            } catch (error) {
                console.error('Registration error:', error);
                this.showMessage('Registration failed');
            } finally {
                this.loading = false;
            }
        },

        async sendEmailVerify() {
            if (!this.authForm.email) {
                this.showMessage('Please enter your email first.');
                return;
            }
            this.loading = true;
            try {
                const params = { email: this.authForm.email };
                if (this.siteConfig.is_turnstile) params.turnstile_token = this.captcha.token;
                else if (this.siteConfig.is_recaptcha) params.recaptcha_data = this.captcha.token;

                const response = await this.request('/api/v3/passport/comm/sendEmailVerify', { // Public
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params),
                    skipAuth: true
                });
                const data = await response.json();
                if (data.data) {
                    this.showMessage('Verification code sent to your email.');
                } else {
                    this.showMessage(data.message || 'Failed to send verification code.');
                }
            } catch (error) {
                console.error('Send email error:', error);
                this.showMessage('Failed to send verification code.');
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            this.stopNoticeAutoplay();
            localStorage.removeItem('auth_data');
            localStorage.removeItem('authorization');
            window.location.reload();
        },

        async fetchSubscribe() {
            try {
                const response = await this.request('/api/v3/user/getSubscribe');
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.user = { ...this.user, ...data.data };
                }
            } catch (error) {
                console.error('Error fetching subscribe info:', error);
            }
        },

        async fetchPlans() {
            try {
                const response = await this.request('/api/v3/user/plan/fetch');
                if (!response) return;
                const data = await this.safeJsonParse(response);
                if (data && data.data) {
                    this.plans = data.data.map((plan) => ({
                        ...plan,
                        content: this.normalizePlanContent(plan.content)
                    }));
                    // Auto-select first plan if available
                    if (this.plans.length > 0) {
                        this.selectPlan(this.plans[0]);
                    }
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
            }
        },

        async fetchOrders() {
            try {
                const response = await this.request('/api/v3/user/order/fetch');
                if (!response) return;
                const data = await this.safeJsonParse(response);
                if (data && data.data) {
                    this.orders = data.data;
                    this.tryHydratePaymentFromOrders();
                }
            } catch (error) {
                console.error('Error fetching orders:', error);
            }
        },

        async fetchTickets() {
            try {
                const response = await this.request('/api/v3/user/ticket/fetch');
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.tickets = data.data;
                }
            } catch (error) {
                console.error('Error fetching tickets:', error);
            }
        },

        async fetchInvites() {
            try {
                const response = await this.request('/api/v3/user/invite/fetch');
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.invites = data.data;
                }
            } catch (error) {
                console.error('Error fetching invites:', error);
            }
        },

        async fetchKnowledge() {
            try {
                const response = await this.request('/api/v3/user/knowledge/fetch?language=en-US');
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.knowledge.categories = data.data;
                }
            } catch (error) {
                console.error('Error fetching knowledge:', error);
            }
        },

        async fetchServers() {
            try {
                const response = await this.request('/api/v3/user/server/fetch');
                if (!response) return;
                const data = await this.safeJsonParse(response);
                if (data && data.data) {
                    this.servers = data.data.map((s) => {
                        const hasIsOnline = s.is_online !== undefined;
                        const fromFlag = hasIsOnline ? Number(s.is_online) === 1 : null;
                        const fromOnline = s.online !== undefined ? !!s.online : null;
                        const fromLastCheck = s.last_check_at ? (Date.now() / 1000 - s.last_check_at) <= 300 : null;
                        const online = [fromFlag, fromOnline, fromLastCheck].find(v => v !== null);
                        return {
                            ...s,
                            online: online !== null ? online : true
                        };
                    });
                    if (this.view === 'servers') {
                        this.$nextTick(() => this.refreshServersMap());
                    }
                }
            } catch (error) {
                console.error('Error fetching servers:', error);
            }
        },

        isServersMapLibReady() {
            return !!(window.maplibregl && typeof window.maplibregl.Map === 'function');
        },

        refreshServersMap(forceResize = false) {
            if (this.view !== 'servers') return;

            if (!this.isServersMapLibReady()) {
                clearTimeout(this.serverMap.retryTimer);
                this.serverMap.retryTimer = setTimeout(() => this.refreshServersMap(forceResize), 300);
                return;
            }

            if (!this.initServersMap()) return;

            if (forceResize) {
                clearTimeout(this.serverMap.resizeTimer);
                this.serverMap.resizeTimer = setTimeout(() => {
                    if (!this.serverMap.map) return;
                    this.serverMap.map.resize();
                    this.renderServersMapMarkers();
                }, 80);
                return;
            }

            this.renderServersMapMarkers();
        },

        initServersMap() {
            if (this.serverMap.initialized && this.serverMap.map) return true;

            const container = document.getElementById('servers-world-map');
            if (!container) return false;

            this.serverMap.map = new window.maplibregl.Map({
                container,
                style: SERVERS_MAP_STYLE,
                center: [12, 18],
                zoom: 1.15,
                minZoom: 1,
                maxZoom: 7,
                attributionControl: true,
                dragRotate: false,
                pitchWithRotate: false,
                renderWorldCopies: true
            });
            this.serverMap.initialized = true;
            this.serverMap.ready = false;
            this.serverMap.loadFailed = false;

            this.serverMap.map.addControl(new window.maplibregl.NavigationControl({
                showCompass: false
            }), 'top-right');
            this.serverMap.map.touchZoomRotate.disableRotation();
            this.serverMap.map.on('load', () => {
                this.serverMap.ready = true;
                this.serverMap.map.resize();
                this.renderServersMapMarkers();
            });
            this.serverMap.map.on('click', () => this.closeServersMapPopup());
            this.serverMap.map.on('error', (event) => {
                console.error('World map render error:', event?.error || event);
                // Avoid blocking the whole section in loading state when map style/tiles fail.
                this.serverMap.loadFailed = true;
                this.serverMap.ready = true;
            });

            if (!this.serverMap.resizeHandler) {
                this.serverMap.resizeHandler = () => {
                    if (this.view !== 'servers' || !this.serverMap.map) return;
                    this.serverMap.map.resize();
                };
                window.addEventListener('resize', this.serverMap.resizeHandler);
            }

            return true;
        },

        clearServersMapMarkers() {
            if (!Array.isArray(this.serverMap.markers)) {
                this.serverMap.markers = [];
            }
            this.serverMap.markers.forEach((marker) => marker.remove());
            this.serverMap.markers = [];
            this.serverMap.hasMarkers = false;
            this.closeServersMapPopup();
        },

        closeServersMapPopup() {
            if (!this.serverMap.popup) return;
            this.serverMap.popup.remove();
            this.serverMap.popup = null;
        },

        extractCountryCodeFromTags(server) {
            const tags = Array.isArray(server?.tags) ? server.tags : [];
            for (let i = 0; i < tags.length; i += 1) {
                if (typeof tags[i] !== 'string') continue;
                const candidate = tags[i].trim().toUpperCase();
                if (/^[A-Z]{2}$/.test(candidate)) {
                    return candidate;
                }
            }
            return null;
        },

        buildServerCountryBuckets() {
            const buckets = {};
            const servers = Array.isArray(this.servers) ? this.servers : [];
            let matchedServers = 0;
            let skippedServers = 0;

            servers.forEach((server) => {
                const countryCode = this.extractCountryCodeFromTags(server);
                if (!countryCode || !SERVER_COUNTRY_COORDINATES[countryCode]) {
                    skippedServers += 1;
                    return;
                }
                if (!buckets[countryCode]) {
                    buckets[countryCode] = [];
                }
                buckets[countryCode].push(server);
                matchedServers += 1;
            });

            return {
                buckets,
                matchedServers,
                skippedServers
            };
        },

        escapeServerMapHtml(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        buildServerMapTooltipHtml(countryCode, nodes) {
            const list = nodes.map((node) => {
                const nodeName = this.escapeServerMapHtml(node?.name || 'Unnamed Node');
                return `<li class="servers-map-tooltip-item">${nodeName}</li>`;
            }).join('');
            const countLabel = `${nodes.length} node${nodes.length > 1 ? 's' : ''}`;
            return `
                <div class="servers-map-tooltip">
                    <div class="servers-map-tooltip-title">${countryCode}</div>
                    <div class="servers-map-tooltip-subtitle">${countLabel}</div>
                    <ul class="servers-map-tooltip-list">${list}</ul>
                </div>
            `;
        },

        renderServersMapMarkers() {
            if (!this.serverMap.map || !this.serverMap.ready) return;

            this.clearServersMapMarkers();
            const { buckets, matchedServers, skippedServers } = this.buildServerCountryBuckets();
            this.serverMap.matchedServers = matchedServers;
            this.serverMap.skippedServers = skippedServers;

            Object.keys(buckets).forEach((countryCode) => {
                const coords = SERVER_COUNTRY_COORDINATES[countryCode];
                if (!coords) return;

                const nodes = buckets[countryCode];
                const markerEl = document.createElement('button');
                markerEl.type = 'button';
                markerEl.className = 'server-country-marker';
                markerEl.setAttribute('data-country', countryCode);
                markerEl.setAttribute('aria-label', `${countryCode} (${nodes.length} nodes)`);

                if (nodes.length > 1) {
                    const countEl = document.createElement('span');
                    countEl.className = 'server-country-marker-count';
                    countEl.textContent = String(nodes.length);
                    markerEl.appendChild(countEl);
                }

                const marker = new window.maplibregl.Marker({
                    element: markerEl,
                    anchor: 'center'
                })
                    .setLngLat(coords)
                    .addTo(this.serverMap.map);

                const showPopup = () => {
                    this.closeServersMapPopup();
                    this.serverMap.popup = new window.maplibregl.Popup({
                        closeButton: false,
                        closeOnClick: false,
                        offset: 14,
                        className: 'servers-map-popup'
                    })
                        .setLngLat(coords)
                        .setHTML(this.buildServerMapTooltipHtml(countryCode, nodes))
                        .addTo(this.serverMap.map);
                };

                markerEl.addEventListener('mouseenter', showPopup);
                markerEl.addEventListener('focus', showPopup);
                markerEl.addEventListener('mouseleave', () => this.closeServersMapPopup());
                markerEl.addEventListener('blur', () => this.closeServersMapPopup());
                markerEl.addEventListener('click', (event) => {
                    event.preventDefault();
                    showPopup();
                });

                this.serverMap.markers.push(marker);
            });

            this.serverMap.hasMarkers = this.serverMap.markers.length > 0;
        },

        async fetchTraffics() {
            try {
                const response = await this.request('/api/v3/user/stat/getTrafficLog');
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.traffics = Array.isArray(data.data) ? data.data : [];
                    this.trafficsLoaded = true;
                }
            } catch (error) {
                console.error('Error fetching traffic log:', error);
            }
        },

        async fetchTodayTrafficOverview() {
            if (this.todayTrafficLoading || this.todayTrafficLoaded) return;
            const token = localStorage.getItem('auth_data');
            if (!token) return;
            this.todayTrafficLoading = true;
            try {
                const response = await this.request('/api/v1/guest/stat/todayTrafficOverview');
                if (!response) return;
                const data = await this.safeJsonParse(response);
                if (data && data.data) {
                    const total = Number(data.data.total_usage_gb);
                    const unit = typeof data.data.unit === 'string' && data.data.unit.trim()
                        ? data.data.unit.trim()
                        : 'GB';
                    const rawTop = Array.isArray(data.data.top_usage_gb) ? data.data.top_usage_gb : [];
                    const top = rawTop.map((item) => {
                        const usage = Number(item);
                        return Number.isFinite(usage) && usage > 0 ? usage : 0;
                    });
                    this.todayTrafficOverview = {
                        total_usage_gb: Number.isFinite(total) && total > 0 ? total : 0,
                        top_usage_gb: top,
                        unit
                    };
                    this.todayTrafficLoaded = true;
                }
            } catch (error) {
                console.error('Error fetching today traffic overview:', error);
            } finally {
                this.todayTrafficLoading = false;
            }
        },

        getNoticeTags(notice) {
            if (!notice) return [];
            const tags = notice.tags;
            if (Array.isArray(tags)) {
                return tags
                    .filter((tag) => typeof tag === 'string' && tag.trim())
                    .map((tag) => tag.trim());
            }
            if (typeof tags === 'string' && tags.trim()) {
                return [tags.trim()];
            }
            return [];
        },

        getActiveNotice() {
            if (!Array.isArray(this.notices) || this.notices.length === 0) return null;
            const index = Number.isInteger(this.noticeSlideIndex)
                && this.noticeSlideIndex >= 0
                && this.noticeSlideIndex < this.notices.length
                ? this.noticeSlideIndex
                : 0;
            return this.notices[index] || null;
        },

        resetNoticeSlideIndexIfNeeded() {
            if (!Array.isArray(this.notices) || this.notices.length === 0) {
                this.noticeSlideIndex = 0;
                return;
            }
            if (!Number.isInteger(this.noticeSlideIndex)) {
                this.noticeSlideIndex = 0;
                return;
            }
            if (this.noticeSlideIndex < 0 || this.noticeSlideIndex >= this.notices.length) {
                this.noticeSlideIndex = 0;
            }
        },

        startNoticeAutoplay() {
            this.stopNoticeAutoplay();
            if (this.view !== 'dashboard' || !this.showNotices || this.noticeModalOpen || this.noticeSliderHovered) return;
            if (!Array.isArray(this.notices) || this.notices.length <= 1) return;

            this.noticeSlideTimer = setInterval(() => {
                if (document.hidden) return;
                if (this.view !== 'dashboard' || !this.showNotices || this.noticeModalOpen) return;
                this.nextNoticeSlide(false);
            }, this.noticeSlideIntervalMs);
        },

        stopNoticeAutoplay() {
            if (this.noticeSlideTimer) {
                clearInterval(this.noticeSlideTimer);
                this.noticeSlideTimer = null;
            }
        },

        restartNoticeAutoplay() {
            if (this.noticeSliderHovered) return;
            this.stopNoticeAutoplay();
            this.startNoticeAutoplay();
        },

        nextNoticeSlide(restartTimer = true) {
            if (!Array.isArray(this.notices) || this.notices.length <= 1) return;
            this.noticeSlideIndex = (this.noticeSlideIndex + 1) % this.notices.length;
            if (restartTimer) this.restartNoticeAutoplay();
        },

        prevNoticeSlide() {
            if (!Array.isArray(this.notices) || this.notices.length <= 1) return;
            this.noticeSlideIndex = (this.noticeSlideIndex - 1 + this.notices.length) % this.notices.length;
            this.restartNoticeAutoplay();
        },

        goToNoticeSlide(index) {
            if (!Array.isArray(this.notices) || this.notices.length <= 1) return;
            const target = Number(index);
            if (!Number.isInteger(target) || target < 0 || target >= this.notices.length) return;
            this.noticeSlideIndex = target;
            this.restartNoticeAutoplay();
        },

        async fetchNotices() {
            try {
                const response = await this.request('/api/v3/user/notice/fetch');
                if (!response) return;
                const data = await response.json();
                const notices = Array.isArray(data.data) ? data.data : [];
                this.notices = notices;
                this.resetNoticeSlideIndexIfNeeded();

                if (notices.length > 0) {
                    const version = this.getNoticesVersion(notices);
                    const dismissedVersion = localStorage.getItem('fantastic_notices_version');
                    this.showNotices = !(dismissedVersion && dismissedVersion === version);
                } else {
                    this.showNotices = false;
                }

                this.startNoticeAutoplay();
            } catch (error) {
                console.error('Error fetching notices:', error);
                this.stopNoticeAutoplay();
            }
        },

        openNotice(notice) {
            if (!notice) return;
            this.stopNoticeAutoplay();
            this.activeNotice = notice;
            this.noticeModalOpen = true;
        },

        closeNoticeModal() {
            this.noticeModalOpen = false;
            this.activeNotice = null;
            this.startNoticeAutoplay();
        },

        async fetchPaymentMethods() {
            try {
                const response = await this.request('/api/v3/user/order/getPaymentMethod');
                if (!response) {
                    this.paymentMethods = [];
                    return;
                }

                const data = await this.safeJsonParse(response);
                if (!data) {
                    this.paymentMethods = [];
                    return;
                }

                if (data.data) {
                    this.paymentMethods = Array.isArray(data.data) ? data.data : [];
                } else {
                    this.paymentMethods = [];
                }
            } catch (error) {
                console.error('Error fetching payment methods:', error);
                this.paymentMethods = [];
            }
        },

        selectPlan(plan) {
            this.selectedPlan = plan;
            // Auto-pick the shortest available billing period
            const periods = [
                'month_price',
                'quarter_price',
                'half_year_price',
                'year_price',
                'two_year_price',
                'three_year_price',
                'onetime_price',
                'reset_price'
            ];

            // Iterate periods and select the first available option (shortest period)
            // Note: zero-priced plans are valid; only check for non-null/undefined
            for (const period of periods) {
                if (plan[period] !== null && plan[period] !== undefined) {
                    this.selectedPeriod = period;
                    break;
                }
            }
        },

        async subscribe() {
            if (!this.selectedPlan) return;
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/order/save', {
                    method: 'POST',
                    body: JSON.stringify({
                        plan_id: this.selectedPlan.id,
                        period: this.selectedPeriod
                    })
                });
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.showMessage('Order created! Trade No: ' + data.data);
                    this.fetchOrders();
                    this.view = 'orders';
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error subscribing:', error);
                this.showMessage('Failed to subscribe');
            } finally {
                this.loading = false;
            }
        },

        async subscribeWithPlan(plan, periodKey) {
            if (!plan || !periodKey) return;
            this.selectedPlan = plan;
            this.selectedPeriod = periodKey;
            await this.subscribe();
        },

        async goToPayment(order) {
            this.routeParams.paymentTradeNo = order?.trade_no || null;
            this.currentOrder = order;
            this.view = 'payment';
            this.couponForm.code = '';
            this.appliedCoupon = null;
            this.couponApplying = false;
            // Refresh payment methods so they are up to date
            await this.fetchPaymentMethods();
            // Auto-select the first payment method
            if (this.paymentMethods.length > 0) {
                this.selectedPaymentMethod = this.paymentMethods[0].id;
            } else {
                this.selectedPaymentMethod = null;
            }
        },

        async enableTOTP() {
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/enable2FA', { method: 'POST' });
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.totpData = data.data;
                    this.showTOTPModal = true;
                    this.totpVerifyCode = '';
                } else {
                    this.showMessage(data.message || 'Failed to enable TOTP');
                }
            } catch (error) {
                console.error('Enable TOTP error:', error);
                this.showMessage('Failed to enable TOTP');
            } finally {
                this.loading = false;
            }
        },

        async verifyTOTPSetup() {
            if (!this.totpVerifyCode || this.totpVerifyCode.length !== 6) {
                this.showMessage('Please enter a valid 6-digit code');
                return;
            }
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/verify2FA', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: this.totpVerifyCode })
                });
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.showMessage('Two-Factor Authentication Enabled!');
                    this.showTOTPModal = false;
                    this.fetchUserInfo(); // Refresh user state
                } else {
                    this.showMessage(data.message || 'Verification failed');
                }
            } catch (error) {
                console.error('Verify TOTP error:', error);
                this.showMessage('Verification failed');
            } finally {
                this.loading = false;
            }
        },

        async disableTOTP() {
            if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) return;
            const codeInput = prompt('Please enter your 6-digit authenticator code');
            if (!codeInput) {
                return;
            }
            const code = codeInput.replace(/\s+/g, '');
            if (code.length !== 6) {
                this.showMessage('Please enter a valid 6-digit code');
                return;
            }
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/disable2FA', {
                    method: 'POST',
                    body: JSON.stringify({ code })
                });
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.showMessage('Two-Factor Authentication Disabled');
                    this.fetchUserInfo(); // Refresh user state
                } else {
                    this.showMessage(data.message || 'Failed to disable TOTP');
                }
            } catch (error) {
                console.error('Disable TOTP error:', error);
                this.showMessage('Failed to disable TOTP');
            } finally {
                this.loading = false;
            }
        },

        async submit2FA() {
            if (!this.twoFactorCode || this.twoFactorCode.length !== 6) {
                this.showMessage('Please enter a valid 6-digit code');
                return;
            }
            this.loading = true;
            try {
                const response = await this.request('/api/v3/passport/auth/login2FA', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: this.twoFactorToken,
                        code: this.twoFactorCode
                    }),
                    skipAuth: true
                });
                const data = await response.json();
                if (data.data) {
                    localStorage.setItem('auth_data', data.data.auth_data);
                    localStorage.setItem('authorization', data.data.auth_data);
                    this.show2FAModal = false;
                    this.fetchUserInfo();
                    const redirectTarget = this.normalizeRedirectTarget(
                        data.data.redirect || this.getRedirectParam() || 'dashboard'
                    );
                    this.suppressHashUpdate = true;
                    window.location.hash = `#/${redirectTarget}`;
                    this.applyRouteFromHash();
                    this.$nextTick(() => { this.suppressHashUpdate = false; });
                    this.authForm.password = '';
                    this.twoFactorCode = '';
                    this.twoFactorToken = null;
                } else {
                    this.showMessage(data.message || 'Verification failed');
                }
            } catch (error) {
                console.error('Login 2FA error:', error);
                this.showMessage('Verification failed');
            } finally {
                this.loading = false;
            }
        },

        async confirmPayment() {
            if (!this.currentOrder || !this.selectedPaymentMethod) {
                this.showMessage('Please choose a payment method');
                return;
            }
            await this.checkout(this.currentOrder.trade_no, this.selectedPaymentMethod);
        },

        describeCoupon(coupon) {
            if (!coupon) return '';
            const value = Number(coupon.value || 0);
            if (coupon.type === 1) return '-' + this.formatCurrency(value);
            if (coupon.type === 2) return value + '% off';
            return 'Coupon applied';
        },

        async applyCoupon() {
            const code = (this.couponForm.code || '').trim();
            if (!code) {
                this.showMessage('Please enter a coupon code');
                return;
            }
            if (!this.currentOrder) {
                this.showMessage('No order selected');
                return;
            }

            this.couponApplying = true;
            try {
                const response = await this.request('/api/v3/user/coupon/check', {
                    method: 'POST',
                    body: JSON.stringify({
                        code,
                        plan_id: this.currentOrder.plan_id,
                        period: this.currentOrder.period
                    })
                });
                if (!response) return;
                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data?.data) {
                    this.appliedCoupon = null;
                    this.showMessage(data?.message || 'Invalid coupon');
                    return;
                }

                const couponData = data.data;
                const recreated = await this.recreateOrderWithCoupon(code);
                if (recreated) {
                    this.appliedCoupon = couponData;
                    this.showMessage('Coupon applied and order updated');
                } else {
                    this.appliedCoupon = null;
                }
            } catch (error) {
                console.error('Error applying coupon:', error);
                this.appliedCoupon = null;
                this.showMessage(error?.message || 'Failed to apply coupon');
            } finally {
                this.couponApplying = false;
            }
        },

        async recreateOrderWithCoupon(code) {
            if (!this.currentOrder) return false;
            const originalTradeNo = this.currentOrder.trade_no;
            try {
                const response = await this.request('/api/v3/user/order/save', {
                    method: 'POST',
                    body: JSON.stringify({
                        plan_id: this.currentOrder.plan_id,
                        period: this.currentOrder.period,
                        coupon_code: code
                    })
                });
                if (!response) return false;
                const data = await response.json().catch(() => ({}));
                if (response.ok && data?.data) {
                    const newTradeNo = data.data;
                    await this.fetchOrders();
                    const newOrder = this.orders.find(o => o.trade_no === newTradeNo);
                    if (newOrder) {
                        this.currentOrder = newOrder;
                    } else {
                        this.currentOrder = { ...this.currentOrder, trade_no: newTradeNo };
                    }
                    if (originalTradeNo && originalTradeNo !== newTradeNo) {
                        this.cancelOrderSilently(originalTradeNo);
                    }
                    return true;
                }

                this.showMessage(data?.message || 'Failed to apply coupon');
                return false;
            } catch (error) {
                console.error('Error recreating order with coupon:', error);
                this.showMessage(error?.message || 'Failed to apply coupon');
                return false;
            }
        },

        async cancelOrderSilently(tradeNo) {
            if (!tradeNo) return;
            try {
                await this.request('/api/v3/user/order/cancel', {
                    method: 'POST',
                    body: JSON.stringify({ trade_no: tradeNo })
                });
                await this.fetchOrders();
            } catch (error) {
                console.warn('Failed to cancel previous order', tradeNo, error);
            }
        },

        selectPaymentMethod(method) {
            if (!method || !method.id) return;
            this.selectedPaymentMethod = method.id;
        },

        getPaymentFeeText(method) {
            if (!method) return '';
            const parts = [];
            if (method.handling_fee_fixed && method.handling_fee_fixed > 0) {
                parts.push('Fixed ' + this.formatCurrency(method.handling_fee_fixed));
            }
            if (method.handling_fee_percent && method.handling_fee_percent > 0) {
                parts.push(method.handling_fee_percent + '%');
            }
            return parts.length > 0 ? 'Fee: ' + parts.join(' + ') : '';
        },

        async checkout(tradeNo, methodId) {
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/order/checkout', {
                    method: 'POST',
                    body: JSON.stringify({
                        trade_no: tradeNo,
                        method: methodId
                    })
                });
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    if (data.type === -1) {
                        this.showMessage('Payment successful!');
                        this.fetchOrders();
                        this.fetchUserInfo();
                        this.view = 'orders';
                    } else {
                        window.location.href = data.data;
                    }
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error checking out:', error);
                this.showMessage('Payment failed');
            } finally {
                this.loading = false;
            }
        },

        async cancelOrder(order) {
            if (!order || !order.trade_no) return;
            const ok = await this.showConfirm('Cancel this order?');
            if (!ok) return;
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/order/cancel', {
                    method: 'POST',
                    body: JSON.stringify({ trade_no: order.trade_no })
                });
                if (!response) return;
                const data = await response.json();
                if (data.data === true || data.message === 'success') {
                    this.showMessage('Order cancelled');
                    this.fetchOrders();
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error cancelling order:', error);
                this.showMessage('Cancel failed');
            } finally {
                this.loading = false;
            }
        },

        getOrderPlanName(order) {
            if (!order || !order.plan_id) return 'Unknown plan';
            const plan = this.plans.find(p => p.id === order.plan_id);
            return plan ? plan.name : 'Plan #' + order.plan_id;
        },

        getOrderStatusColor(status) {
            const colors = {
                0: '#ffa502', // Pending - Orange
                1: '#26de81', // Paid - Green
                2: '#fc5c65', // Cancelled - Red
                3: '#a55eea'  // Commission - Purple
            };
            return colors[status] || '#95a5a6';
        },

        async createTicket() {
            this.loading = true;
            try {
                const payload = { ...this.ticketForm, level: 0 };
                const response = await this.request('/api/v3/user/ticket/save', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.showMessage('Ticket created!');
                    this.ticketForm = { subject: '', message: '' };
                    this.fetchTickets();
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error creating ticket:', error);
                this.showMessage('Failed to create ticket');
            } finally {
                this.loading = false;
            }
        },

        async viewTicket(ticket) {
            this.loading = true;
            try {
                const response = await this.request(`/api/v3/user/ticket/fetch?id=${ticket.id}`);
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.selectedTicket = data.data;
                    this.ticketReplyForm.id = ticket.id;
                    this.routeParams.ticketId = ticket.id;
                    this.view = 'ticket_detail';
                }
            } catch (error) {
                console.error('Error fetching ticket details:', error);
            } finally {
                this.loading = false;
            }
        },

        async replyTicket() {
            if (!this.ticketReplyForm.message) return;
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/ticket/reply', {
                    method: 'POST',
                    body: JSON.stringify(this.ticketReplyForm)
                });
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.ticketReplyForm.message = '';
                    this.viewTicket({ id: this.ticketReplyForm.id }); // Refresh details
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error replying to ticket:', error);
                this.showMessage('Failed to reply');
            } finally {
                this.loading = false;
            }
        },

        async generateInvite() {
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/invite/save');
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.fetchInvites();
                } else {
                    this.showMessage(data.message || 'Failed');
                }
            } catch (e) {
                this.showMessage('Error');
            } finally {
                this.loading = false;
            }
        },

        async viewArticle(id) {
            this.loading = true;
            try {
                const response = await this.request(`/api/v3/user/knowledge/fetch?id=${id}`);
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.knowledge.currentArticle = data.data;
                    this.routeParams.articleId = id;
                    this.view = 'knowledge_detail';
                }
            } catch (error) {
                console.error('Error fetching article:', error);
            } finally {
                this.loading = false;
            }
        },

        async changePassword() {
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/change_password', {
                    method: 'POST',
                    body: JSON.stringify(this.passwordForm)
                });
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.showMessage('Password changed successfully!');
                    this.passwordForm = { old_password: '', new_password: '' };
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error changing password:', error);
                this.showMessage('Failed to change password');
            } finally {
                this.loading = false;
            }
        },

        async resetSecurity() {
            const ok = await this.showConfirm('Are you sure you want to reset your subscription URL and Token?');
            if (!ok) return;
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/reset_security');
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    this.showMessage('Security reset successful!');
                    this.fetchSubscribe();
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error resetting security:', error);
                this.showMessage('Failed to reset security');
            } finally {
                this.loading = false;
            }
        },

        copySubscribeUrl() {
            if (this.user.subscribe_url) {
                navigator.clipboard.writeText(this.user.subscribe_url).catch(() => {
                    // Silent failure: the notification handler will still run; log for debugging
                    console.warn('Failed to copy subscription URL to clipboard');
                });
            }
        },

        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                this.showMessage('Copied!');
            }).catch(() => {
                console.warn('Failed to copy to clipboard');
            });
        },

        showNotification(message) {
            const notify = () => this.showMessage(message);

            // Close subscription modal first so the dialog isn't blocked
            if (this.showSubscriptionModal) {
                this.showSubscriptionModal = false;
                if (typeof this.$nextTick === 'function') {
                    this.$nextTick(notify);
                } else {
                    setTimeout(notify, 0);
                }
                return;
            }

            notify();
        },

        decodeBase64UrlToBuffer(value) {
            const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
            const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
            const base64 = normalized + padding;
            const raw = atob(base64);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) {
                bytes[i] = raw.charCodeAt(i);
            }
            return bytes.buffer;
        },

        encodeBufferToBase64Url(value) {
            const bytes = value instanceof ArrayBuffer
                ? new Uint8Array(value)
                : new Uint8Array(value.buffer, value.byteOffset || 0, value.byteLength || value.length || 0);
            let binary = '';
            bytes.forEach((byte) => {
                binary += String.fromCharCode(byte);
            });
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        },

        encodeMaybeBuffer(value) {
            if (!value) return null;
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
                return this.encodeBufferToBase64Url(value);
            }
            if (typeof value === 'string') {
                return value;
            }
            return null;
        },

        publicKeyCredentialToJSON(value) {
            if (value && typeof value === 'object' && value.response) {
                const response = value.response || {};
                const out = {
                    id: value.id || this.encodeMaybeBuffer(value.rawId),
                    rawId: this.encodeMaybeBuffer(value.rawId),
                    type: value.type || 'public-key',
                    response: {
                        clientDataJSON: this.encodeMaybeBuffer(response.clientDataJSON),
                        attestationObject: this.encodeMaybeBuffer(response.attestationObject),
                        authenticatorData: this.encodeMaybeBuffer(response.authenticatorData),
                        signature: this.encodeMaybeBuffer(response.signature),
                        userHandle: this.encodeMaybeBuffer(response.userHandle)
                    }
                };

                if (typeof response.getTransports === 'function') {
                    try {
                        out.response.transports = response.getTransports();
                    } catch (e) {}
                } else if (Array.isArray(response.transports)) {
                    out.response.transports = response.transports;
                }

                if (typeof value.getClientExtensionResults === 'function') {
                    try {
                        out.clientExtensionResults = value.getClientExtensionResults();
                    } catch (e) {}
                }

                if (value.authenticatorAttachment) {
                    out.authenticatorAttachment = value.authenticatorAttachment;
                }
                return out;
            }

            if (value instanceof ArrayBuffer) {
                return this.encodeBufferToBase64Url(value);
            }
            if (ArrayBuffer.isView(value)) {
                return this.encodeBufferToBase64Url(value.buffer);
            }
            if (Array.isArray(value)) {
                return value.map((item) => this.publicKeyCredentialToJSON(item));
            }
            if (value && typeof value === 'object') {
                const result = {};
                Object.keys(value).forEach((key) => {
                    result[key] = this.publicKeyCredentialToJSON(value[key]);
                });
                return result;
            }
            return value;
        },

        toPublicKeyCreationOptions(raw) {
            const options = JSON.parse(JSON.stringify(raw?.publicKey ? raw.publicKey : raw));
            options.challenge = this.decodeBase64UrlToBuffer(options.challenge);
            if (options.user && options.user.id) {
                options.user.id = this.decodeBase64UrlToBuffer(options.user.id);
            }
            if (Array.isArray(options.excludeCredentials)) {
                options.excludeCredentials = options.excludeCredentials.map((item) => ({
                    ...item,
                    id: this.decodeBase64UrlToBuffer(item.id)
                }));
            }
            return options;
        },

        toPublicKeyRequestOptions(raw) {
            const options = JSON.parse(JSON.stringify(raw?.publicKey ? raw.publicKey : raw));
            options.challenge = this.decodeBase64UrlToBuffer(options.challenge);
            if (Array.isArray(options.allowCredentials) && options.allowCredentials.length > 0) {
                options.allowCredentials = options.allowCredentials.map((item) => ({
                    ...item,
                    id: this.decodeBase64UrlToBuffer(item.id)
                }));
            }
            return options;
        },

        async startPasskeyLogin() {
            if (this.passkeyLoginLoading) return;
            if (Number(this.passkey_login_enable) !== 1) {
                this.showMessage('Passkey login is disabled by administrator');
                return;
            }
            if (!this.passkeySupported) {
                this.showMessage('Current browser does not support Passkey');
                return;
            }

            this.passkeyLoginLoading = true;
            try {
                const redirect = this.getRedirectParam();
                const payload = {};
                if (redirect) payload.redirect = redirect;

                const optionsResponse = await this.request('/api/v3/passport/auth/passkey/login/options', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    skipAuth: true
                });
                if (!optionsResponse) return;

                const optionsData = await optionsResponse.json();
                if (!optionsData?.data) {
                    throw new Error(optionsData?.message || 'Unable to initialize passkey login');
                }

                const assertion = await navigator.credentials.get({
                    publicKey: this.toPublicKeyRequestOptions(optionsData.data)
                });
                if (!assertion) {
                    throw new Error('Passkey request cancelled');
                }

                const verifyResponse = await this.request('/api/v3/passport/auth/passkey/login/verify', {
                    method: 'POST',
                    body: JSON.stringify({
                        credential: this.publicKeyCredentialToJSON(assertion)
                    }),
                    skipAuth: true
                });
                if (!verifyResponse) return;

                const verifyData = await verifyResponse.json();
                if (!verifyData?.data?.auth_data) {
                    throw new Error(verifyData?.message || 'Passkey login failed');
                }

                localStorage.setItem('auth_data', verifyData.data.auth_data);
                localStorage.setItem('authorization', verifyData.data.auth_data);
                this.fetchUserInfo();

                const redirectTarget = this.normalizeRedirectTarget(
                    verifyData.data.redirect || this.getRedirectParam() || 'dashboard'
                );
                this.suppressHashUpdate = true;
                window.location.hash = `#/${redirectTarget}`;
                this.applyRouteFromHash();
                this.$nextTick(() => {
                    this.suppressHashUpdate = false;
                });
            } catch (error) {
                if (error?.name === 'NotAllowedError') {
                    this.showMessage('Passkey request cancelled');
                } else {
                    this.showMessage(error?.message || 'Passkey login failed');
                }
            } finally {
                this.passkeyLoginLoading = false;
            }
        },

        async registerPasskey() {
            if (this.passkeyLoading) return;
            if (Number(this.passkey_login_enable) !== 1) {
                this.showMessage('Passkey feature is disabled by administrator');
                return;
            }
            if (!this.passkeySupported) {
                this.showMessage('Current browser does not support Passkey');
                return;
            }

            const passkeyName = prompt('Passkey name (optional, e.g. My iPhone)');
            this.passkeyLoading = true;
            try {
                const optionsResponse = await this.request('/api/v3/user/passkey/register/options', {
                    method: 'POST',
                    body: JSON.stringify({})
                });
                if (!optionsResponse) return;

                const optionsData = await optionsResponse.json();
                if (!optionsData?.data) {
                    throw new Error(optionsData?.message || 'Unable to initialize passkey registration');
                }

                const credential = await navigator.credentials.create({
                    publicKey: this.toPublicKeyCreationOptions(optionsData.data)
                });
                if (!credential) {
                    throw new Error('Passkey registration cancelled');
                }

                const payload = {
                    credential: this.publicKeyCredentialToJSON(credential)
                };
                if (typeof passkeyName === 'string' && passkeyName.trim() !== '') {
                    payload.name = passkeyName.trim();
                }

                const verifyResponse = await this.request('/api/v3/user/passkey/register/verify', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (!verifyResponse) return;
                const verifyData = await verifyResponse.json();
                if (!verifyData?.data) {
                    throw new Error(verifyData?.message || 'Passkey registration failed');
                }

                this.showMessage('Passkey linked successfully');
                await this.fetchPasskeys();
            } catch (error) {
                if (error?.name === 'NotAllowedError') {
                    this.showMessage('Passkey request cancelled');
                } else {
                    this.showMessage(error?.message || 'Passkey registration failed');
                }
            } finally {
                this.passkeyLoading = false;
            }
        },

        async fetchPasskeys() {
            if (Number(this.passkey_login_enable) !== 1 || !this.passkeySupported) {
                this.passkeys = [];
                this.user.passkey_count = 0;
                return;
            }
            try {
                const response = await this.request('/api/v3/user/passkey/list');
                if (!response) return;
                const data = await response.json();
                if (Array.isArray(data?.data)) {
                    this.passkeys = data.data;
                    this.user.passkey_count = data.data.length;
                } else {
                    this.passkeys = [];
                    this.user.passkey_count = 0;
                }
            } catch (error) {
                console.error('Error fetching passkeys:', error);
            }
        },

        async removePasskey(item) {
            if (!item?.id) return;
            const ok = await this.showConfirm('Are you sure you want to remove this passkey?');
            if (!ok) return;

            this.passkeyLoading = true;
            try {
                const response = await this.request('/api/v3/user/passkey/delete', {
                    method: 'POST',
                    body: JSON.stringify({ id: item.id })
                });
                if (!response) return;
                const data = await response.json();
                if (data?.data === true || response.status === 200) {
                    this.showMessage('Passkey removed');
                    await this.fetchPasskeys();
                } else {
                    throw new Error(data?.message || 'Failed to remove passkey');
                }
            } catch (error) {
                this.showMessage(error?.message || 'Failed to remove passkey');
            } finally {
                this.passkeyLoading = false;
            }
        },

        // Telegram Login Functions
        submitTelegramLogin() {
            const email = this.telegramForm.email?.trim();
            if (!email) {
                this.telegramMessage = 'Please enter your email address';
                this.telegramMessageType = 'error';
                return;
            }

            this.telegramMessage = '';
            this.stopTelegramPolling();
            this.telegramLoading = true;

            const redirect = this.getRedirectParam();
            const payload = { email };
            if (redirect) payload.redirect = redirect;

            this.request('/api/v3/passport/auth/loginWithTelegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                skipAuth: true
            })
                .then(res => res.json())
                .then(data => {
                    if (data.data && data.data.token) {
                        this.telegramMessage = 'Request sent, please approve in Telegram';
                        this.telegramMessageType = 'info';
                        this.telegramLoading = false;
                        this.telegramWaiting = true;
                        this.startTelegramPolling(data.data.token, redirect);
                    } else {
                        throw new Error(data.message || 'Request failed, please try again later');
                    }
                })
                .catch(error => {
                    this.telegramLoading = false;
                    this.telegramMessage = error.message || 'Request failed, please try again later';
                    this.telegramMessageType = 'error';
                });
        },

        startTelegramPolling(token, redirect) {
            this.stopTelegramPolling();
            this.telegramPendingToken = token;
            this.telegramPollingAttempts = 0;
            this.telegramPollingTimer = setInterval(() => {
                this.pollTelegramLogin(token, redirect);
            }, 3000);
        },

        stopTelegramPolling() {
            if (this.telegramPollingTimer) {
                clearInterval(this.telegramPollingTimer);
                this.telegramPollingTimer = null;
            }
            this.telegramPendingToken = null;
            this.telegramPollingAttempts = 0;
        },

        pollTelegramLogin(token, redirect) {
            if (!token) return;

            this.telegramPollingAttempts++;
            if (this.telegramPollingAttempts > this.telegramPollingMaxAttempts) {
                this.stopTelegramPolling();
                this.telegramWaiting = false;
                this.telegramMessage = 'Login request timed out, please try again';
                this.telegramMessageType = 'error';
                return;
            }

            this.request(`/api/v3/passport/auth/checkTelegramLogin?token=${encodeURIComponent(token)}`, {
                skipAuth: true
            })
                .then(res => res.json())
                .then(data => {
                    const status = data.data?.status || 'pending';

                    if (status === 'pending') {
                        return;
                    }

                    if (status === 'approved' && data.data.verify_code) {
                        const redirectTarget = data.data.redirect || redirect || this.getRedirectParam() || 'dashboard';
                        this.stopTelegramPolling();
                        this.telegramMessage = 'Approved, signing you in...';
                        this.telegramMessageType = 'success';

                        // Use verify_code directly to sign in
                        setTimeout(async () => {
                            this.showTelegramLogin = false;
                            await this.loginWithVerifyCode(data.data.verify_code, redirectTarget);
                        }, 500);
                        return;
                    }

                    this.stopTelegramPolling();
                    this.telegramWaiting = false;

                    if (status === 'rejected') {
                        this.telegramMessage = 'Request was rejected';
                        this.telegramMessageType = 'error';
                    } else if (status === 'expired') {
                        this.telegramMessage = 'Login request expired, please try again';
                        this.telegramMessageType = 'error';
                    } else {
                        this.telegramMessage = 'Request failed, please try again later';
                        this.telegramMessageType = 'error';
                    }
                })
                .catch(error => {
                    this.stopTelegramPolling();
                    this.telegramWaiting = false;
                    this.telegramMessage = error.message || 'Request failed, please try again later';
                    this.telegramMessageType = 'error';
                });
        },

        getRedirectParam() {
            const hash = window.location.hash || '';
            const query = hash.split('?')[1] || '';
            if (!query) return null;
            try {
                const params = new URLSearchParams(query);
                const redirect = params.get('redirect');
                return redirect ? decodeURIComponent(redirect) : null;
            } catch (err) {
                return null;
            }
        },

        normalizeRedirectTarget(target) {
            if (!target) return 'dashboard';
            const cleaned = String(target).trim();
            const normalized = cleaned.replace(/^\/?#?\/?/, '');
            return normalized || 'dashboard';
        },

        getNoticesVersion(notices = []) {
            if (!Array.isArray(notices) || notices.length === 0) return '';
            return notices.map(n => n.id || '').join('-');
        },

        dismissNotices() {
            const version = this.getNoticesVersion(this.notices);
            if (version) {
                localStorage.setItem('fantastic_notices_version', version);
            }
            this.showNotices = false;
            this.stopNoticeAutoplay();
        },

        openServerModal(server) {
            this.selectedServer = server;
            this.serverModalOpen = true;
        },

        getServerTags(server) {
            if (!server) return [];
            const tags = server.tags;
            if (Array.isArray(tags)) {
                return tags
                    .filter((tag) => typeof tag === 'string' && tag.trim())
                    .map((tag) => tag.trim());
            }
            if (typeof tags === 'string' && tags.trim()) {
                return [tags.trim()];
            }
            return [];
        },

        async redeemCode() {
            if (!this.redeemForm.code.trim()) {
                this.showMessage('Please enter a redeem code');
                return;
            }
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/redeemgiftcard', {
                    method: 'POST',
                    body: JSON.stringify({ giftcard: this.redeemForm.code.trim() })
                });
                if (!response) return;
                const data = await response.json();
                if (data.data === true) {
                    this.redeemResult = { success: true, message: 'Redeemed successfully' };
                    this.redeemForm.code = '';
                    this.fetchUserInfo();
                    this.fireConfetti();
                } else {
                    this.redeemResult = { success: false, message: data.message || 'Redeem failed' };
                }
            } catch (error) {
                console.error('Error redeeming code:', error);
                this.redeemResult = { success: false, message: 'Redeem failed' };
            } finally {
                this.loading = false;
            }
        },

        getConfettiContainer() {
            if (this.$refs?.confettiContainer) return this.$refs.confettiContainer;
            return document.getElementById('fantastic-confetti');
        },

        fireConfetti() {
            const container = this.getConfettiContainer();
            if (!container) return;

            const colors = ['#4f9cff', '#ff8ec7', '#ffd166', '#6ee7b7', '#a78bfa'];
            const totalPiecesPerSide = 16;

            const spawn = (side) => {
                const piece = document.createElement('div');
                piece.className = `confetti-piece confetti-${side}`;
                piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                piece.style.animationDuration = `${1.1 + Math.random() * 0.6}s`;
                piece.style.animationDelay = `${Math.random() * 0.2}s`;
                piece.style.setProperty('--confetti-offset', `${Math.random() * 25}vw`);
                piece.style.setProperty('--confetti-rotate', `${side === 'left' ? 420 : -420}deg`);

                piece.addEventListener('animationend', () => piece.remove());
                container.appendChild(piece);
            };

            for (let i = 0; i < totalPiecesPerSide; i++) {
                spawn('left');
                spawn('right');
            }
        },

        openDialog(payload = {}) {
            this.dialog = {
                open: true,
                title: payload.title || 'Notice',
                message: payload.message || '',
                confirmText: payload.confirmText || 'OK',
                cancelText: payload.cancelText || null,
                onConfirm: payload.onConfirm || null,
                onCancel: payload.onCancel || null
            };
        },

        showMessage(message, title = 'Notice') {
            const open = () => this.openDialog({ title, message, confirmText: 'OK', cancelText: null });

            // Ensure previous dialog is closed before opening a new one to avoid stacking
            if (this.dialog.open) {
                this.dialog.open = false;
                this.dialog.onConfirm = null;
                this.dialog.onCancel = null;

                if (typeof this.$nextTick === 'function') {
                    this.$nextTick(open);
                } else {
                    setTimeout(open, 0);
                }
                return;
            }

            open();
        },

        showConfirm(message, title = 'Confirm') {
            return new Promise((resolve) => {
                this.openDialog({
                    title,
                    message,
                    confirmText: 'Confirm',
                    cancelText: 'Cancel',
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false)
                });
            });
        },

        handleDialogConfirm() {
            const cb = this.dialog.onConfirm;
            this.dialog.open = false;
            this.dialog.onConfirm = null;
            this.dialog.onCancel = null;
            if (typeof cb === 'function') cb();
        },

        handleDialogCancel() {
            const cb = this.dialog.onCancel;
            this.dialog.open = false;
            this.dialog.onConfirm = null;
            this.dialog.onCancel = null;
            if (typeof cb === 'function') cb();
        },

        isLongTermPlan() {
            return Boolean(this.user.plan_id) && this.user.expired_at === null;
        },

        getTimeRemainingPercentage() {
            if (this.isLongTermPlan()) return 100;

            const exp = Number(this.user.expired_at || 0);
            const started = Number(this.user.plan_started_at || 0);

            // 如果没有过期时间，返回0
            if (!exp) return 0;

            const nowSec = Date.now() / 1000;

            // 如果已过期，返回0
            if (nowSec >= exp) return 0;

            // 如果有套餐开始时间，使用实际套餐周期计算
            if (started && started > 0) {
                const totalDuration = exp - started;
                const remainingDuration = exp - nowSec;
                if (totalDuration <= 0) return 0;
                const pct = Math.round((remainingDuration / totalDuration) * 100);
                return Math.min(100, Math.max(0, pct));
            }

            // 回退到旧的计算方式（使用 reset_day）
            const remainingSeconds = this.getRemainingSeconds();
            const cycleSeconds = this.getCycleDurationSeconds();
            if (cycleSeconds <= 0) return 0;
            const pct = Math.round((remainingSeconds / cycleSeconds) * 100);
            return Math.min(100, Math.max(0, pct));
        },

        getRemainingSeconds() {
            const exp = Number(this.user.expired_at || 0);
            if (!exp) return 0;
            const nowSec = Date.now() / 1000;
            return Math.max(0, exp - nowSec);
        },

        getCycleDurationSeconds() {
            const resetDay = Number(this.user.reset_day);
            if (resetDay && resetDay > 0) return resetDay * 86400;
            // fallback: use 30 days if not provided
            return 30 * 86400;
        },

        formatRemainingTime() {
            if (this.isLongTermPlan()) return 'PP';

            const seconds = this.getRemainingSeconds();
            if (!seconds) return 'Expired';
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            if (days > 0) return `${days}d ${hours}h`;
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${mins}m`;
        },

        formatDateTime(ts) {
            if (!ts) return '-';
            const d = new Date(ts * 1000);
            return d.toLocaleString('en-US');
        },

        // Check for Telegram verify code and auto-login
        checkTelegramVerify() {
            const hash = window.location.hash || '';
            const query = hash.split('?')[1] || '';
            if (!query) return;

            try {
                const params = new URLSearchParams(query);
                const verifyCode = params.get('verify');
                if (verifyCode) {
                    // Found verify code, attempt auto-login
                    this.loginWithVerifyCode(verifyCode);
                }
            } catch (err) {
                console.error('Error checking telegram verify:', err);
            }
        },

        // Login with verify code from Telegram
        async loginWithVerifyCode(verifyCode, redirectTarget = null) {
            if (this.loading) return;

            this.loading = true;
            try {
                const response = await this.request(`/api/v3/passport/auth/token2Login?verify=${encodeURIComponent(verifyCode)}`, {
                    skipAuth: true
                });
                const data = await response.json();

                if (data.data && data.data.auth_data) {
                    localStorage.setItem('auth_data', data.data.auth_data);
                    localStorage.setItem('authorization', data.data.auth_data);

                    // Clean URL and redirect
                    const redirect = this.normalizeRedirectTarget(redirectTarget || this.getRedirectParam() || 'dashboard');
                    this.view = redirect; // Ensure UI switches away from login
                    window.location.hash = `#/${redirect}`;
                    // Kick off a user refresh but don't block navigation
                    this.fetchUserInfo().catch((err) => console.error('Post-login fetchUserInfo error:', err));

                    // Refresh once to ensure all auth-aware components rehydrate
                    setTimeout(() => window.location.reload(), 200);
                } else {
                    this.showMessage('Login failed: ' + (data.message || 'Invalid verify code'));
                    // Clean URL on error
                    window.location.hash = '#/login';
                }
            } catch (error) {
                console.error('Error logging in with verify code:', error);
                this.showMessage('Login failed, please retry');
                window.location.hash = '#/login';
            } finally {
                this.loading = false;
            }
        },

        // SSO Login Functions
        startSsoLogin() {
            if (this.ssoLoading) return;

            this.ssoLoading = true;
            const redirect = this.getRedirectParam();
            let url = '/api/v3/passport/auth/sso/init';
            if (redirect) {
                url += `?redirect=${encodeURIComponent(redirect)}`;
            }

            this.request(url, {
                method: 'GET',
                credentials: 'include',
                skipAuth: true
            })
                .then(res => res.json())
                .then(data => {
                    const target = data?.data?.url;
                    if (!target) {
                        throw new Error('Server did not return a login link, please try again later');
                    }
                    window.location.href = target;
                })
                .catch(error => {
                    this.ssoLoading = false;
                    this.showMessage(error.message || 'Request failed, please try again later');
                });
        },

        checkSsoError() {
            const hash = window.location.hash || '';
            const [rawPath, query = ''] = (hash.replace(/^#/, '')).split('?');
            if (!query) return;

            try {
                const params = new URLSearchParams(query);
                const error = params.get('sso_error');
                const message = params.get('sso_message');
                const basePath = (rawPath || 'login').replace(/^\/?/, '');
                const cleanHash = '#/' + basePath;

                if (error) {
                    const decodedError = decodeURIComponent(error);
                    this.showMessage('SSO action failed: ' + decodedError);
                    if (basePath === 'profile') this.view = 'profile';
                    if (basePath === 'login') this.view = 'login';
                    window.location.hash = cleanHash;
                    return;
                }

                if (message) {
                    const decodedMsg = decodeURIComponent(message);
                    this.showMessage(decodedMsg || 'SSO action completed');
                    // Refresh user info to reflect binding status
                    this.fetchUserInfo();
                    if (basePath === 'profile') this.view = 'profile';
                    window.location.hash = cleanHash;
                }
            } catch (err) {
                console.error('Error checking SSO messages:', err);
            }
        },

        // Telegram Binding
        async bindTelegram() {
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/telegram/bind');
                if (!response) return;
                const data = await response.json();
                if (data.data) {
                    if (data.data.url) {
                        // If a URL is returned, open the Telegram Bot binding link
                        window.open(data.data.url, '_blank');
                        this.showMessage('Please complete the Telegram binding in the new page');
                    } else {
                        this.showMessage('Binding request sent, please finish in the Telegram Bot');
                    }
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error binding Telegram:', error);
                this.showMessage('Binding failed, please try again later');
            } finally {
                this.loading = false;
            }
        },

        async unbindTelegram() {
            const ok = await this.showConfirm('Are you sure you want to unbind the Telegram account?');
            if (!ok) return;
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/telegram/unbind', {
                    method: 'POST'
                });
                if (!response) return;
                const data = await response.json();
                if (data.data === true || data.message === 'success' || response.status === 200) {
                    this.showMessage('Telegram account has been unbound');
                    this.user.telegram_id = null;
                    // Refresh user info
                    await this.fetchUserInfo();
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error unbinding Telegram:', error);
                this.showMessage('Unbinding failed, please try again later');
            } finally {
                this.loading = false;
            }
        },

        // SSO Binding
        async bindSSO() {
            if (this.loading) return;
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/sso/init', { method: 'GET' });
                if (!response) {
                    this.loading = false;
                    return;
                }
                const data = await response.json();
                const target = data?.data?.url;
                if (!target) {
                    throw new Error(data?.message || 'Server did not return a binding link, please try again later');
                }
                window.location.href = target;
            } catch (error) {
                console.error('Error binding SSO:', error);
                this.showMessage('Binding failed, please try again later');
                this.loading = false;
            } finally {
                // Reset loading state if we are still on the page (in case redirect failed)
                this.loading = false;
            }
        },

        async unbindSSO() {
            const ok = await this.showConfirm('Are you sure you want to unbind the SSO account?');
            if (!ok) return;
            this.loading = true;
            try {
                const response = await this.request('/api/v3/user/sso/unbind', {
                    method: 'POST'
                });
                if (!response) return;
                const data = await response.json();
                if (data.data === true || data.message === 'success' || response.status === 200) {
                    this.showMessage('SSO account has been unbound');
                    this.user.sso_id = null;
                    this.user.sso_subject = null;
                    this.user.sso_provider = null;
                    this.user.casdoor_user_id = null;
                    // Refresh user info
                    await this.fetchUserInfo();
                } else {
                    this.showMessage('Error: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error unbinding SSO:', error);
                this.showMessage('Unbinding failed, please try again later');
            } finally {
                this.loading = false;
            }
        },

        normalizePlanContent(content) {
            if (content === null || content === undefined) return '';
            if (typeof content !== 'string') return String(content);
            return this.normalizeHtmlBreaks(this.decodeHtml(content));
        },

        decodeHtml(html) {
            if (!html) return '';
            const textarea = document.createElement('textarea');
            textarea.innerHTML = html;
            return textarea.value;
        },

        normalizeHtmlBreaks(html) {
            if (!html) return '';
            return html
                .replace(/<\/\s*br\s*>/gi, '<br>')
                .replace(/<\s*br\s*\/\s*>/gi, '<br>');
        },

        formatBytes(bytes, decimals = 2) {
            if (!+bytes) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
        },

        normalizeTrafficGb(value) {
            const usage = Number(value);
            return Number.isFinite(usage) && usage > 0 ? usage : 0;
        },

        formatTrafficGb(value, unit = 'GB') {
            const usage = this.normalizeTrafficGb(value);
            let decimals = 4;
            if (usage >= 100) decimals = 1;
            else if (usage >= 10) decimals = 2;
            else if (usage >= 1) decimals = 3;
            return `${parseFloat(usage.toFixed(decimals))} ${unit || 'GB'}`;
        },

        getTodayTrafficPodium() {
            const topUsage = Array.isArray(this.todayTrafficOverview.top_usage_gb)
                ? this.todayTrafficOverview.top_usage_gb
                : [];

            const ranking = [
                {
                    rank: 1,
                    name: 'Fang Binxing',
                    usage: this.normalizeTrafficGb(topUsage[0]),
                    medal: 'gold'
                },
                {
                    rank: 2,
                    name: 'CAC',
                    usage: this.normalizeTrafficGb(topUsage[1]),
                    medal: 'silver'
                },
                {
                    rank: 3,
                    name: 'breakwa11',
                    usage: this.normalizeTrafficGb(topUsage[2]),
                    medal: 'bronze'
                }
            ];

            return [ranking[1], ranking[0], ranking[2]];
        },

        // Currency formatting
        getCurrencySymbol() {
            return this.siteConfig.currency_symbol || '¥';
        },

        formatCurrency(cents, decimals = 2) {
            const symbol = this.getCurrencySymbol();
            const amount = (cents / 100).toFixed(decimals);
            return `${symbol}${amount}`;
        },

        // Heatmap helper functions
        getTrafficLevel(bytes) {
            const GB = 1024 * 1024 * 1024;
            const MB = 1024 * 1024;
            if (bytes === 0) return 0;
            if (bytes < 100 * MB) return 1;      // < 100MB
            if (bytes < 500 * MB) return 2;      // 100MB - 500MB
            if (bytes < 1 * GB) return 3;        // 500MB - 1GB
            if (bytes < 3 * GB) return 4;        // 1GB - 3GB
            if (bytes < 10 * GB) return 5;       // 3GB - 10GB
            return 6;                             // > 10GB
        },

        getHeatmapData() {
            const weeks = [];
            const today = new Date();
            const trafficMap = {};

            // Build traffic map from data
            this.traffics.forEach(item => {
                const date = new Date(item.record_at * 1000);
                const dateKey = date.toISOString().split('T')[0];
                trafficMap[dateKey] = (trafficMap[dateKey] || 0) + (item.u || 0) + (item.d || 0);
            });

            // Generate last 15 weeks (about 3.5 months)
            const totalDays = 15 * 7;
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - totalDays + 1);

            // Adjust to start from Sunday
            const dayOfWeek = startDate.getDay();
            startDate.setDate(startDate.getDate() - dayOfWeek);

            let currentDate = new Date(startDate);

            for (let week = 0; week < 15; week++) {
                const weekData = [];
                for (let day = 0; day < 7; day++) {
                    const dateKey = currentDate.toISOString().split('T')[0];
                    const traffic = trafficMap[dateKey] || 0;
                    const isInRange = currentDate <= today;

                    weekData.push({
                        date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        traffic: traffic,
                        level: isInRange ? this.getTrafficLevel(traffic) : 0,
                        visible: isInRange
                    });

                    currentDate.setDate(currentDate.getDate() + 1);
                }
                weeks.push(weekData);
            }

            return weeks;
        },

        getHeatmapMonths() {
            const months = [];
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 14 * 7);

            let currentMonth = -1;
            let currentDate = new Date(startDate);

            for (let week = 0; week < 15; week++) {
                const month = currentDate.getMonth();
                if (month !== currentMonth) {
                    months.push(currentDate.toLocaleDateString('en-US', { month: 'short' }));
                    currentMonth = month;
                } else {
                    months.push('');
                }
                currentDate.setDate(currentDate.getDate() + 7);
            }

            return months;
        },

        getTotalTraffic() {
            return this.traffics.reduce((sum, item) => sum + (item.u || 0) + (item.d || 0), 0);
        },

        getAverageDailyTraffic() {
            if (this.traffics.length === 0) return 0;
            const total = this.getTotalTraffic();
            const uniqueDays = new Set(this.traffics.map(item => {
                const date = new Date(item.record_at * 1000);
                return date.toISOString().split('T')[0];
            })).size;
            return uniqueDays > 0 ? Math.round(total / uniqueDays) : 0;
        },

        getMaxDailyTraffic() {
            const dailyTraffic = {};
            this.traffics.forEach(item => {
                const date = new Date(item.record_at * 1000);
                const dateKey = date.toISOString().split('T')[0];
                dailyTraffic[dateKey] = (dailyTraffic[dateKey] || 0) + (item.u || 0) + (item.d || 0);
            });
            return Math.max(0, ...Object.values(dailyTraffic));
        },

        getPeriodName(key) {
            const map = {
                'month_price': 'Monthly',
                'quarter_price': 'Quarterly',
                'half_year_price': 'Semi-Annually',
                'year_price': 'Annually',
                'two_year_price': 'Biennially',
                'three_year_price': 'Triennially',
                'onetime_price': 'One Time',
                'reset_price': 'Reset Data'
            };
            return map[key] || key;
        },

        getOrderStatus(status) {
            const map = {
                0: 'Pending',
                1: 'Paid',
                2: 'Cancelled',
                3: 'Commission'
            };
            return map[status] || 'Unknown';
        },

        getTicketStatus(status) {
            const map = {
                0: 'Pending',
                1: 'Answered',
                2: 'Closed'
            };
            return map[status] || 'Unknown';
        },

        getCurrentBreadcrumb() {
            const breadcrumbs = {
                'dashboard': 'Dashboard',
                'servers': 'Dashboard / Servers',
                'plan': 'Shop / Plans',
                'orders': 'Shop / Orders',
                'payment': 'Shop / Payment',
                'tickets': 'Support / Tickets',
                'ticket_detail': 'Support / Ticket Detail',
                'knowledge': 'Support / Knowledge Base',
                'knowledge_detail': 'Support / Article',
                'profile': 'Profile / Settings',
                'invites': 'Profile / Invites'
            };
            return breadcrumbs[this.view] || 'Dashboard';
        },

        getCurrentPlanName() {
            if (!this.user.plan_id) return 'No plan';
            const plan = this.plans.find(p => p.id === this.user.plan_id);
            return plan ? plan.name : 'Plan #' + this.user.plan_id;
        },

        // Subscription status helpers
        getSubscriptionStatus() {
            // Check if banned
            if (this.user.banned) {
                return { text: 'Banned', type: 'danger' };
            }
            // Check if no plan
            if (!this.user.plan_id) {
                return { text: 'Inactive', type: 'inactive' };
            }
            // Check if expired
            const now = Math.floor(Date.now() / 1000);
            if (this.user.expired_at && this.user.expired_at < now) {
                return { text: 'Expired', type: 'danger' };
            }
            // Active subscription
            return { text: 'Active', type: 'success' };
        },

        getSubscriptionStatusText() {
            return this.getSubscriptionStatus().text;
        },

        getSubscriptionStatusClass() {
            const type = this.getSubscriptionStatus().type;
            return 'status-badge status-' + type;
        },

        getPeriodNameShort(key) {
            const map = {
                'month_price': 'MO',
                'quarter_price': 'QTR',
                'half_year_price': 'H1',
                'year_price': 'YR',
                'two_year_price': '2YR',
                'three_year_price': '3YR',
                'onetime_price': 'ONE',
                'reset_price': 'RST'
            };
            return map[key] || this.getPeriodName(key);
        },

        getTrafficUsedPercentage() {
            const used = this.user.d + this.user.u;
            const total = this.user.transfer_enable;
            if (!total || total === 0) return 0;
            const percentage = Math.round((used / total) * 100);
            return Math.min(percentage, 100);
        },

        getTrafficRemainingPercentage() {
            const used = this.user.d + this.user.u;
            const remaining = this.user.transfer_enable - used;
            const total = this.user.transfer_enable;
            if (!total || total === 0) return 0;
            const percentage = Math.round((remaining / total) * 100);
            return Math.max(Math.min(percentage, 100), 0);
        }
    }))
});
