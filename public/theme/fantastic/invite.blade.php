<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }} Invitation</title>
    <meta name="description" content="{{ $description }}">
    <link rel="icon" href="{{ $logo ?: '/favicon.ico' }}">
    <link rel="stylesheet" href="{{ asset('theme/fantastic/assets/css/style.css') }}?v={{ $version }}">
    <script defer src="{{ asset('assets/vendor/alpinejs/alpine.min.js') }}"></script>
    <style>
        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
        }
        .invite-shell {
            width: min(100%, 560px);
        }
        .invite-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .invite-header img {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            object-fit: cover;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
        }
        .invite-title {
            margin: 0;
            font-size: 1.8rem;
        }
        .invite-subtitle {
            margin: 0.35rem 0 0;
            opacity: 0.75;
        }
        .invite-copy {
            margin-bottom: 1.5rem;
            padding: 1rem 1.1rem;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.68);
            border: 1px solid rgba(148, 163, 184, 0.18);
            white-space: pre-wrap;
            line-height: 1.7;
        }
        .invite-meta {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
        }
        .invite-pill {
            padding: 0.55rem 0.85rem;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.06);
            font-size: 0.9rem;
        }
        .invite-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 1rem;
        }
        .invite-message {
            margin-top: 1rem;
            font-size: 0.95rem;
            min-height: 1.25rem;
        }
        .invite-message.error {
            color: #b42318;
        }
        .invite-message.success {
            color: #027a48;
        }
        @media (max-width: 640px) {
            .invite-title {
                font-size: 1.45rem;
            }
            .invite-actions {
                flex-direction: column;
            }
        }
    </style>
    <script>
        window.inviteSettings = {
            token: @json($token),
            appName: @json($title),
            logo: @json($logo),
            version: @json($version)
        };
    </script>
</head>
<body>
<div class="invite-shell" x-data="invitePage()" x-init="init()">
    <div class="card auth-card">
        <div class="invite-header">
            @if($logo)
                <img src="{{ $logo }}" alt="{{ $title }}">
            @endif
            <div>
                <h1 class="invite-title">Private Invitation</h1>
                <p class="invite-subtitle" x-text="headerSubtitle"></p>
            </div>
        </div>

        <div class="invite-copy" x-show="invite.content" x-text="invite.content"></div>

        <div class="invite-meta">
            <div class="invite-pill" x-show="invite.invitee_name">
                For: <span x-text="invite.invitee_name"></span>
            </div>
            <div class="invite-pill">
                Remaining uses: <span x-text="invite.remaining_uses ?? 0"></span>
            </div>
        </div>

        <div class="form-group">
            <input type="email" x-model="form.email" placeholder="Email" class="form-input">
        </div>
        <div class="form-group" x-show="invite.is_email_verify">
            <div class="input-group">
                <input type="text" x-model="form.email_code" placeholder="Email Code" class="form-input">
                <button class="btn-3d btn-sm" @click="sendEmailVerify()" :disabled="loading">Send Code</button>
            </div>
        </div>
        <div class="form-group">
            <input type="password" x-model="form.password" placeholder="Password" class="form-input">
        </div>
        <div id="invite-captcha" class="form-group" x-show="showCaptcha"></div>

        <div class="invite-actions">
            <button class="btn-3d btn-block" @click="register()" :disabled="loading" x-text="loading ? 'Submitting...' : 'Accept Invitation'"></button>
            <button class="btn-3d btn-secondary" @click="goHome()" :disabled="loading">Back Home</button>
        </div>
        <div class="invite-message" :class="messageType" x-text="message"></div>
    </div>
</div>

<div id="fantastic-custom-html" x-cloak>
    {!! $theme_config['custom_html'] ?? '' !!}
</div>

<script>
document.addEventListener('alpine:init', () => {
    Alpine.data('invitePage', () => ({
        token: window.inviteSettings.token,
        invite: {},
        form: { email: '', password: '', email_code: '' },
        loading: false,
        message: '',
        messageType: '',
        captchaToken: '',
        captchaWidget: null,
        showCaptcha: false,
        headerSubtitle: 'Loading invitation...',

        async init() {
            await this.fetchInvite();
        },

        goHome() {
            window.location.href = '/';
        },

        showMessage(text, type = '') {
            this.message = text;
            this.messageType = type;
        },

        async gateway(endpoint, method = 'GET', params = {}) {
            const response = await fetch('/api/v3/server', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint, method, params })
            });

            if (response.status === 404) {
                this.goHome();
                return null;
            }

            return response;
        },

        async fetchInvite() {
            const response = await this.gateway('passport/invite/fetch', 'GET', { token: this.token });
            if (!response) return;

            const payload = await response.json();
            if (!payload.data) {
                this.goHome();
                return;
            }

            this.invite = payload.data;
            this.headerSubtitle = this.invite.invitee_name
                ? `Welcome, ${this.invite.invitee_name}.`
                : 'You have received a private registration link.';

            this.showCaptcha = Number(this.invite.is_turnstile) === 1 || Number(this.invite.is_recaptcha) === 1;
            if (this.showCaptcha) {
                await this.loadCaptchaScript();
                this.$nextTick(() => this.renderCaptcha());
            }
        },

        async loadCaptchaScript() {
            if (Number(this.invite.is_turnstile) === 1) {
                if (window.turnstile) return;
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                    script.async = true;
                    script.defer = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
                return;
            }
            if (Number(this.invite.is_recaptcha) === 1) {
                if (window.grecaptcha) return;
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = `https://www.google.com/recaptcha/api.js?render=explicit`;
                    script.async = true;
                    script.defer = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
        },

        renderCaptcha() {
            const container = document.getElementById('invite-captcha');
            if (!container) return;

            if (Number(this.invite.is_turnstile) === 1 && window.turnstile) {
                if (this.captchaWidget) return;
                this.captchaWidget = window.turnstile.render(container, {
                    sitekey: this.invite.turnstile_site_key,
                    callback: (token) => {
                        this.captchaToken = token;
                    }
                });
                return;
            }

            if (Number(this.invite.is_recaptcha) === 1 && window.grecaptcha) {
                if (this.captchaWidget !== null) return;
                this.captchaWidget = window.grecaptcha.render(container, {
                    sitekey: this.invite.recaptcha_site_key,
                    callback: (token) => {
                        this.captchaToken = token;
                    }
                });
            }
        },

        resetCaptcha() {
            this.captchaToken = '';
            if (Number(this.invite.is_turnstile) === 1 && window.turnstile && this.captchaWidget) {
                window.turnstile.reset(this.captchaWidget);
            }
            if (Number(this.invite.is_recaptcha) === 1 && window.grecaptcha && this.captchaWidget !== null) {
                window.grecaptcha.reset(this.captchaWidget);
            }
        },

        async sendEmailVerify() {
            if (!this.form.email) {
                this.showMessage('Please enter your email first.', 'error');
                return;
            }

            this.loading = true;
            try {
                const params = { email: this.form.email };
                if (Number(this.invite.is_turnstile) === 1) {
                    params.turnstile_token = this.captchaToken;
                } else if (Number(this.invite.is_recaptcha) === 1) {
                    params.recaptcha_data = this.captchaToken;
                }

                const response = await this.gateway('passport/comm/sendEmailVerify', 'POST', params);
                if (!response) return;

                const payload = await response.json();
                if (payload.data) {
                    this.showMessage('Verification code sent.', 'success');
                    return;
                }
                this.showMessage(payload.message || 'Failed to send verification code.', 'error');
            } catch (error) {
                this.showMessage('Failed to send verification code.', 'error');
            } finally {
                this.loading = false;
            }
        },

        async register() {
            if (!this.form.email || !this.form.password) {
                this.showMessage('Email and password are required.', 'error');
                return;
            }

            if (this.showCaptcha && !this.captchaToken) {
                this.showMessage('Please complete the verification check.', 'error');
                return;
            }

            this.loading = true;
            try {
                const params = {
                    token: this.token,
                    email: this.form.email,
                    password: this.form.password,
                    email_code: this.form.email_code
                };

                if (Number(this.invite.is_turnstile) === 1) {
                    params.turnstile_token = this.captchaToken;
                } else if (Number(this.invite.is_recaptcha) === 1) {
                    params.recaptcha_data = this.captchaToken;
                }

                const response = await this.gateway('passport/invite/register', 'POST', params);
                if (!response) return;
                const payload = await response.json();

                if (!payload.data) {
                    this.showMessage(payload.message || 'Registration failed.', 'error');
                    this.resetCaptcha();
                    return;
                }

                localStorage.setItem('auth_data', payload.data.auth_data);
                localStorage.setItem('authorization', payload.data.auth_data);
                this.showMessage('Invitation accepted. Redirecting...', 'success');
                window.location.href = '/';
            } catch (error) {
                this.showMessage('Registration failed.', 'error');
                this.resetCaptcha();
            } finally {
                this.loading = false;
            }
        }
    }));
});
</script>
</body>
</html>
