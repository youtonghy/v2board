function findAuthActionContainer() {
    var container = document.querySelector('.v2board-auth-box .form-group.mb-0');
    if (!container) {
        container = document.querySelector('.form-group.mb-0');
    }
    if (!container) {
        var candidates = document.querySelectorAll('.v2board-auth-box .block-content button.btn');
        if (candidates.length) {
            var lastButton = candidates[candidates.length - 1];
            container = lastButton ? lastButton.parentNode : null;
        }
    }
    return container;
}

(function () {
    var globalSettings = window.settings || {};
    if (!globalSettings || parseInt(globalSettings.telegram_login_enable, 10) !== 1) {
        return;
    }

    var state = {
        button: null,
        pollingTimer: null,
        pollingAttempts: 0,
        pollingMaxAttempts: 40,
        pendingToken: null,
        pollingRedirect: null,
        hideToastTimer: null,
        attachTimer: null,
        defaultText: '使用 Telegram 登录',
        overlay: null,
        overlayEmailInput: null,
        overlaySubmit: null,
        overlayClose: null,
        overlayMessage: null,
        overlayIsActive: false
    };

    function injectStyles() {
        if (document.getElementById('telegram-login-style')) {
            return;
        }
        var style = document.createElement('style');
        style.id = 'telegram-login-style';
        style.textContent = `
            body.telegram-login-lock { overflow: hidden; }
            #telegram-login-overlay { position: fixed; inset: 0; width: 100%; height: 100%; background: rgba(17, 24, 39, 0.72); z-index: 3200; display: none; align-items: center; justify-content: center; padding: 24px; }
            #telegram-login-overlay.telegram-active { display: flex; }
            #telegram-login-overlay .telegram-card { position: relative; width: 100%; max-width: 420px; background: #ffffff; border-radius: 18px; box-shadow: 0 24px 55px rgba(15, 23, 42, 0.25); padding: 36px 32px 32px; text-align: center; }
            #telegram-login-overlay .telegram-title { font-size: 20px; font-weight: 600; color: #1f2937; margin-bottom: 12px; }
            #telegram-login-overlay .telegram-desc { font-size: 14px; color: #6b7280; margin-bottom: 28px; }
            #telegram-login-overlay .telegram-input { width: 100%; height: 46px; border-radius: 10px; border: 1px solid #d1d5db; padding: 0 14px; font-size: 15px; outline: none; transition: border-color .15s ease, box-shadow .15s ease; }
            #telegram-login-overlay .telegram-input:focus { border-color: #0665d0; box-shadow: 0 0 0 3px rgba(6, 101, 208, 0.16); }
            #telegram-login-overlay .telegram-submit { margin-top: 26px; width: 100%; height: 46px; border-radius: 10px; border: none; background: #0665d0; color: #ffffff; font-size: 15px; font-weight: 600; cursor: pointer; transition: background .2s ease; }
            #telegram-login-overlay .telegram-submit:hover:not([disabled]) { background: #0559b8; }
            #telegram-login-overlay .telegram-submit:disabled { background: #93c5fd; cursor: default; }
            #telegram-login-overlay .telegram-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 18px; border: none; background: rgba(243, 244, 246, 0.9); color: #6b7280; font-size: 20px; cursor: pointer; transition: background .2s ease, color .2s ease; }
            #telegram-login-overlay .telegram-close:hover:not([disabled]) { background: rgba(209, 213, 219, 0.95); color: #374151; }
            #telegram-login-overlay .telegram-close:disabled { cursor: default; color: #d1d5db; }
            #telegram-login-overlay .telegram-message { margin-top: 20px; min-height: 18px; font-size: 13px; color: #6b7280; }
            #telegram-login-overlay .telegram-message[data-type="error"] { color: #dc2626; }
            #telegram-login-overlay .telegram-message[data-type="success"] { color: #16a34a; }
            #telegram-login-overlay .telegram-message[data-type="info"] { color: #2563eb; }
        `;
        document.head.appendChild(style);
    }

    function isLoginPage() {
        var hash = window.location.hash || '';
        return hash.indexOf('#/login') === 0;
    }

    function getPrimaryLoginEmailInput() {
        return document.querySelector('.v2board-auth-box input[type="text"]');
    }

    function getRedirectParam() {
        var hash = window.location.hash || '';
        var query = hash.split('?')[1] || '';
        if (!query) return null;
        try {
            var params = new URLSearchParams(query);
            var redirect = params.get('redirect');
            return redirect ? decodeURIComponent(redirect) : null;
        } catch (err) {
            return null;
        }
    }

    function showToast(text, type) {
        var el = document.getElementById('telegram-login-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'telegram-login-toast';
            el.style.position = 'fixed';
            el.style.right = '24px';
            el.style.bottom = '24px';
            el.style.padding = '12px 16px';
            el.style.borderRadius = '6px';
            el.style.color = '#fff';
            el.style.fontSize = '14px';
            el.style.lineHeight = '1.4';
            el.style.maxWidth = '280px';
            el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.18)';
            el.style.zIndex = '2222';
            el.style.transition = 'opacity .25s ease, transform .25s ease';
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';
            document.body.appendChild(el);
        }
        var colors = {
            success: '#16a34a',
            error: '#dc3545',
            info: '#0d6efd'
        };
        el.textContent = text;
        el.style.display = 'block';
        el.style.backgroundColor = colors[type] || 'rgba(0,0,0,0.85)';
        requestAnimationFrame(function () {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
        if (state.hideToastTimer) {
            clearTimeout(state.hideToastTimer);
        }
        state.hideToastTimer = setTimeout(function () {
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';
            setTimeout(function () {
                el.style.display = 'none';
            }, 260);
        }, 3200);
    }

    function setButtonIdle() {
        if (!state.button) return;
        state.button.disabled = false;
        state.button.textContent = state.defaultText;
        state.button.classList.remove('btn-secondary');
        state.button.classList.add('btn-primary');
    }

    function setButtonLoading() {
        if (!state.button) return;
        state.button.disabled = true;
        state.button.textContent = '发送请求中...';
        state.button.classList.remove('btn-primary');
        state.button.classList.add('btn-secondary');
    }

    function setButtonLoggingIn() {
        if (!state.button) return;
        state.button.disabled = true;
        state.button.textContent = '正在登录...';
        state.button.classList.remove('btn-secondary');
        state.button.classList.add('btn-primary');
    }

    function setButtonWaiting() {
        if (!state.button) return;
        state.button.disabled = true;
        state.button.textContent = '等待 Telegram 确认...';
        state.button.classList.remove('btn-secondary');
        state.button.classList.add('btn-primary');
    }

    function ensureButton() {
        if (!isLoginPage()) {
            stopPolling();
            removeButton();
            closeOverlay(true);
            return;
        }
        if (state.button && !document.body.contains(state.button)) {
            state.button = null;
        }
        if (state.button) return;
        var formGroup = findAuthActionContainer();
        if (!formGroup) return;
        var loginButton = formGroup.querySelector('button.btn-primary');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-block btn-primary font-w400 mt-3';
        btn.setAttribute('data-telegram-login-button', '1');
        btn.textContent = state.defaultText;
        btn.addEventListener('click', onTelegramLoginClick);
        if (loginButton && loginButton.parentNode) {
            loginButton.parentNode.appendChild(btn);
        } else {
            formGroup.appendChild(btn);
        }
        state.button = btn;
        setButtonIdle();
    }

    function removeButton() {
        if (state.button && state.button.parentNode) {
            state.button.parentNode.removeChild(state.button);
        }
        state.button = null;
    }

    function ensureOverlay() {
        if (state.overlay) return;
        var overlay = document.createElement('div');
        overlay.id = 'telegram-login-overlay';
        overlay.innerHTML = `
            <div class="telegram-card">
                <button type="button" class="telegram-close" aria-label="关闭">×</button>
                <div class="telegram-title">Telegram 登录</div>
                <div class="telegram-desc">请输入已绑定 Telegram 的账户邮箱</div>
                <form class="telegram-form">
                    <input type="email" class="telegram-input" placeholder="邮箱地址" required />
                    <button type="submit" class="telegram-submit">提交</button>
                </form>
                <div class="telegram-message" data-role="message"></div>
            </div>`;
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
                if (state.overlayClose && state.overlayClose.disabled) return;
                closeOverlay(true);
            }
        });
        document.body.appendChild(overlay);
        state.overlay = overlay;
        state.overlayEmailInput = overlay.querySelector('.telegram-input');
        state.overlaySubmit = overlay.querySelector('.telegram-submit');
        state.overlayClose = overlay.querySelector('.telegram-close');
        state.overlayMessage = overlay.querySelector('[data-role="message"]');
        var form = overlay.querySelector('.telegram-form');
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            submitTelegramLogin();
        });
        state.overlayClose.addEventListener('click', function () {
            if (state.overlayClose.disabled) return;
            closeOverlay(true);
        });
    }

    function resetOverlay() {
        if (!state.overlay) return;
        if (state.overlayEmailInput) {
            state.overlayEmailInput.value = '';
        }
        setOverlayMessage('');
        setOverlayStateIdle();
    }

    function openOverlay() {
        ensureOverlay();
        resetOverlay();
        var loginInput = getPrimaryLoginEmailInput();
        if (loginInput && loginInput.value) {
            state.overlayEmailInput.value = loginInput.value.trim();
        }
        state.overlay.classList.add('telegram-active');
        document.body.classList.add('telegram-login-lock');
        state.overlayIsActive = true;
        setTimeout(function () {
            state.overlayEmailInput.focus();
        }, 50);
    }

    function closeOverlay(forceReset) {
        if (!state.overlay || !state.overlayIsActive) return;
        state.overlay.classList.remove('telegram-active');
        document.body.classList.remove('telegram-login-lock');
        state.overlayIsActive = false;
        if (forceReset) {
            resetOverlay();
        }
    }

    function setOverlayStateIdle() {
        if (state.overlaySubmit) {
            state.overlaySubmit.disabled = false;
            state.overlaySubmit.textContent = '提交';
        }
        if (state.overlayClose) {
            state.overlayClose.disabled = false;
        }
    }

    function setOverlayStateLoading() {
        if (state.overlaySubmit) {
            state.overlaySubmit.disabled = true;
            state.overlaySubmit.textContent = '发送请求中...';
        }
        if (state.overlayClose) {
            state.overlayClose.disabled = true;
        }
    }

    function setOverlayStateWaiting() {
        if (state.overlaySubmit) {
            state.overlaySubmit.disabled = true;
            state.overlaySubmit.textContent = '等待 Telegram 确认...';
        }
        if (state.overlayClose) {
            state.overlayClose.disabled = true;
        }
    }

    function setOverlayMessage(message, type) {
        if (!state.overlayMessage) return;
        state.overlayMessage.textContent = message || '';
        if (type) {
            state.overlayMessage.setAttribute('data-type', type);
        } else {
            state.overlayMessage.removeAttribute('data-type');
        }
    }

    function onTelegramLoginClick() {
        openOverlay();
    }

    function submitTelegramLogin() {
        ensureOverlay();
        var email = state.overlayEmailInput ? state.overlayEmailInput.value.trim() : '';
        if (!email) {
            setOverlayMessage('请输入邮箱地址。', 'error');
            if (state.overlayEmailInput) {
                state.overlayEmailInput.focus();
            }
            return;
        }
        setOverlayMessage('');
        stopPolling();
        setOverlayStateLoading();
        setButtonLoading();
        var redirect = getRedirectParam();
        var payload = { email: email };
        if (redirect) {
            payload.redirect = redirect;
        }
        requestJson('/api/v1/passport/auth/loginWithTelegram', {
            method: 'POST',
            body: JSON.stringify(payload)
        }).then(function (body) {
            var data = body && body.data ? body.data : {};
            if (!data.token) {
                throw new Error('请求失败，请稍后再试。');
            }
            showToast('请求已发送，请在 Telegram 中确认。', 'info');
            setOverlayStateWaiting();
            setOverlayMessage('请求已发送，请在 Telegram 中确认。', 'info');
            setButtonWaiting();
            startPolling(data.token, redirect || null);
        }).catch(function (err) {
            setOverlayStateIdle();
            setButtonIdle();
            var message = err && err.message ? err.message : '请求失败，请稍后再试。';
            setOverlayMessage(message, 'error');
            showToast(message, 'error');
        });
    }

    function startPolling(token, redirect) {
        stopPolling();
        state.pendingToken = token;
        state.pollingRedirect = redirect;
        state.pollingAttempts = 0;
        state.pollingTimer = setInterval(function () {
            pollTelegramLogin(token);
        }, 3000);
    }

    function stopPolling() {
        if (state.pollingTimer) {
            clearInterval(state.pollingTimer);
            state.pollingTimer = null;
        }
        state.pendingToken = null;
        state.pollingAttempts = 0;
        state.pollingRedirect = null;
    }

    function pollTelegramLogin(token) {
        if (!token) return;
        state.pollingAttempts += 1;
        if (state.pollingAttempts > state.pollingMaxAttempts) {
            stopPolling();
            setButtonIdle();
            setOverlayStateIdle();
            setOverlayMessage('登录请求已超时，请重新尝试。', 'error');
            showToast('登录请求已超时，请重新尝试。', 'error');
            return;
        }
        requestJson('/api/v1/passport/auth/checkTelegramLogin?token=' + encodeURIComponent(token), {
            method: 'GET'
        }).then(function (body) {
            var data = body && body.data ? body.data : {};
            var status = data.status || 'pending';
            if (status === 'pending') {
                return;
            }
            if (status === 'approved' && data.verify_code) {
                var redirectTarget = data.redirect || state.pollingRedirect || 'dashboard';
                stopPolling();
                setOverlayMessage('已确认，正在登录...', 'success');
                if (state.overlaySubmit) {
                    state.overlaySubmit.disabled = true;
                    state.overlaySubmit.textContent = '正在登录...';
                }
                if (state.overlayClose) {
                    state.overlayClose.disabled = true;
                }
                setButtonLoggingIn();
                var target = '/#/login?verify=' + encodeURIComponent(data.verify_code);
                if (redirectTarget) {
                    target += '&redirect=' + encodeURIComponent(redirectTarget);
                }
                setTimeout(function () {
                    closeOverlay(false);
                    if (typeof window.location.replace === 'function') {
                        window.location.replace(target);
                    } else {
                        window.location.href = target;
                    }
                    setTimeout(function () {
                        window.location.reload();
                    }, 400);
                }, 200);
                return;
            }
            stopPolling();
            setButtonIdle();
            setOverlayStateIdle();
            if (status === 'rejected') {
                setOverlayMessage('请求已被拒绝。', 'error');
                showToast('请求已被拒绝。', 'error');
                return;
            }
            if (status === 'expired') {
                setOverlayMessage('登录请求已过期，请重新尝试。', 'error');
                showToast('登录请求已过期，请重新尝试。', 'error');
                return;
            }
            setOverlayMessage('请求处理失败，请稍后再试。', 'error');
            showToast('请求处理失败，请稍后再试。', 'error');
        }).catch(function (err) {
            stopPolling();
            setButtonIdle();
            setOverlayStateIdle();
            var message = err && err.message ? err.message : '请求失败，请稍后再试。';
            setOverlayMessage(message, 'error');
            showToast(message, 'error');
        });
    }

    function requestJson(url, options) {
        var opts = options || {};
        opts.credentials = 'include';
        opts.headers = opts.headers || {};
        if (opts.body && !opts.headers['Content-Type']) {
            opts.headers['Content-Type'] = 'application/json';
        }
        return fetch(url, opts).then(function (res) {
            return res.json().catch(function () {
                return {};
            }).then(function (body) {
                if (!res.ok) {
                    var message = body && body.message ? body.message : '请求失败，请稍后再试。';
                    throw new Error(message);
                }
                return body;
            });
        });
    }

    function init() {
        injectStyles();
        ensureButton();
        state.attachTimer = setInterval(ensureButton, 1000);
        window.addEventListener('hashchange', function () {
            setTimeout(ensureButton, 120);
        });
        window.addEventListener('beforeunload', function () {
            stopPolling();
        });
        window.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && state.overlayIsActive) {
                if (state.overlayClose && state.overlayClose.disabled) return;
                event.preventDefault();
                closeOverlay(true);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
(function () {
    var settings = window.settings || {};
    if (!settings || parseInt(settings.sso_login_enable, 10) !== 1) {
        return;
    }

    var ssoState = {
        button: null,
        attachTimer: null,
        loading: false,
        defaultText: 'SSO 单点登录',
        displayedError: null
    };

    function isLoginPage() {
        var hash = window.location.hash || '';
        return hash.indexOf('#/login') === 0;
    }

    function parseHashParams() {
        var hash = window.location.hash || '';
        var query = hash.split('?')[1] || '';
        if (!query) {
            return null;
        }
        try {
            return new URLSearchParams(query);
        } catch (e) {
            return null;
        }
    }

    function getSsoErrorFromHash() {
        var params = parseHashParams();
        if (!params) return null;
        var error = params.get('sso_error');
        if (!error) return null;
        try {
            return decodeURIComponent(error);
        } catch (err) {
            return error;
        }
    }

    function showErrorFromHash() {
        var error = getSsoErrorFromHash();
        if (!error || error === ssoState.displayedError) {
            return;
        }
        ssoState.displayedError = error;
        showToast(error, 'error');
    }

    function getRedirectParam() {
        var params = parseHashParams();
        if (!params) return null;
        var redirect = params.get('redirect');
        if (!redirect) return null;
        try {
            return decodeURIComponent(redirect);
        } catch (err) {
            return redirect;
        }
    }

    function ensureButton() {
        if (!isLoginPage()) {
            removeButton();
            return;
        }
        if (ssoState.button && !document.body.contains(ssoState.button)) {
            ssoState.button = null;
        }
        if (ssoState.button) {
            return;
        }
        var container = findAuthActionContainer();
        if (!container) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-block btn-primary font-w400 mt-3';
        btn.textContent = ssoState.defaultText;
        btn.addEventListener('click', startSsoLogin);
        container.appendChild(btn);
        ssoState.button = btn;
        setButtonIdle();
    }

    function removeButton() {
        if (ssoState.button && ssoState.button.parentNode) {
            ssoState.button.parentNode.removeChild(ssoState.button);
        }
        ssoState.button = null;
        ssoState.loading = false;
    }

    function setButtonIdle() {
        if (!ssoState.button) return;
        ssoState.button.disabled = false;
        ssoState.button.textContent = ssoState.defaultText;
        ssoState.button.classList.remove('btn-secondary');
        ssoState.button.classList.add('btn-primary');
    }

    function setButtonLoading() {
        if (!ssoState.button) return;
        ssoState.button.disabled = true;
        ssoState.button.textContent = '正在跳转...';
        ssoState.button.classList.remove('btn-primary');
        ssoState.button.classList.add('btn-secondary');
    }

    function showToast(message, type) {
        var el = document.getElementById('sso-login-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'sso-login-toast';
            el.style.position = 'fixed';
            el.style.left = '50%';
            el.style.bottom = '40px';
            el.style.transform = 'translateX(-50%)';
            el.style.padding = '10px 18px';
            el.style.borderRadius = '6px';
            el.style.color = '#fff';
            el.style.fontSize = '14px';
            el.style.lineHeight = '1.4';
            el.style.maxWidth = '320px';
            el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
            el.style.zIndex = '3333';
            el.style.opacity = '0';
            el.style.transition = 'opacity .25s ease, transform .25s ease';
            document.body.appendChild(el);
        }
        var colors = {
            error: '#dc3545',
            success: '#16a34a',
            info: '#0d6efd'
        };
        el.textContent = message;
        el.style.backgroundColor = colors[type] || 'rgba(0,0,0,0.85)';
        el.style.display = 'block';
        el.style.transform = 'translate(-50%, 0)';
        requestAnimationFrame(function () {
            el.style.opacity = '1';
        });
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(function () {
            el.style.opacity = '0';
            setTimeout(function () {
                el.style.display = 'none';
            }, 260);
        }, 3000);
    }

    function startSsoLogin() {
        if (ssoState.loading) {
            return;
        }
        ssoState.loading = true;
        setButtonLoading();
        var redirect = getRedirectParam();
        var url = '/api/v1/passport/auth/sso/init';
        if (redirect) {
            url += '?redirect=' + encodeURIComponent(redirect);
        }
        fetchJson(url).then(function (body) {
            var target = body && body.data ? body.data.url : null;
            if (!target) {
                throw new Error('服务器未返回登录链接，请稍后重试。');
            }
            window.location.href = target;
        }).catch(function (err) {
            ssoState.loading = false;
            setButtonIdle();
            showToast(err && err.message ? err.message : '请求失败，请稍后再试。', 'error');
        });
    }

    function fetchJson(url) {
        return fetch(url, {
            method: 'GET',
            credentials: 'include'
        }).then(function (response) {
            return response.json().catch(function () {
                return {};
            }).then(function (body) {
                if (!response.ok) {
                    var message = body && body.message ? body.message : '请求失败，请稍后再试。';
                    throw new Error(message);
                }
                return body;
            });
        });
    }

    function init() {
        ensureButton();
        ssoState.attachTimer = setInterval(ensureButton, 1200);
        window.addEventListener('hashchange', function () {
            setTimeout(ensureButton, 150);
            showErrorFromHash();
        });
        setTimeout(showErrorFromHash, 120);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
