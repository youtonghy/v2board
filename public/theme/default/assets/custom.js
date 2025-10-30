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
        defaultText: '使用 Telegram 登录'
    };

    function isLoginPage() {
        var hash = window.location.hash || '';
        return hash.indexOf('#/login') === 0;
    }

    function getEmailInput() {
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
        state.button.classList.remove('btn-primary');
        state.button.classList.add('btn-outline-primary');
    }

    function setButtonLoading() {
        if (!state.button) return;
        state.button.disabled = true;
        state.button.textContent = '发送请求中...';
        state.button.classList.remove('btn-outline-primary');
        state.button.classList.add('btn-primary');
    }

    function setButtonWaiting() {
        if (!state.button) return;
        state.button.disabled = true;
        state.button.textContent = '等待 Telegram 确认...';
        state.button.classList.remove('btn-outline-primary');
        state.button.classList.add('btn-primary');
    }

    function removeButton() {
        if (state.button && state.button.parentNode) {
            state.button.parentNode.removeChild(state.button);
        }
        state.button = null;
    }

    function ensureButton() {
        if (!isLoginPage()) {
            stopPolling();
            removeButton();
            return;
        }
        if (state.button && !document.body.contains(state.button)) {
            state.button = null;
        }
        if (state.button) return;
        var loginButton = document.querySelector('.form-group.mb-0 button.btn-primary');
        if (!loginButton) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-block btn-outline-primary font-w400 mt-3';
        btn.setAttribute('data-telegram-login-button', '1');
        btn.textContent = state.defaultText;
        btn.addEventListener('click', onTelegramLoginClick);
        loginButton.parentNode.appendChild(btn);
        state.button = btn;
    }

    function onTelegramLoginClick() {
        var emailInput = getEmailInput();
        if (!emailInput) {
            showToast('无法获取邮箱输入框，请刷新页面后重试。', 'error');
            return;
        }
        var email = emailInput.value.trim();
        if (!email) {
            showToast('请输入邮箱地址。', 'error');
            emailInput.focus();
            return;
        }
        stopPolling();
        setButtonLoading();
        var redirect = getRedirectParam();
        var payload = {
            email: email
        };
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
            setButtonWaiting();
            startPolling(data.token, redirect || null);
        }).catch(function (err) {
            setButtonIdle();
            showToast(err && err.message ? err.message : '请求失败，请稍后再试。', 'error');
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
            stopPolling();
            if (status === 'approved' && data.verify_code) {
                showToast('已确认，正在登录。', 'success');
                var redirect = data.redirect || state.pollingRedirect || 'dashboard';
                var target = '/#/login?verify=' + encodeURIComponent(data.verify_code);
                if (redirect) {
                    target += '&redirect=' + encodeURIComponent(redirect);
                }
                window.location.href = target;
                return;
            }
            setButtonIdle();
            if (status === 'rejected') {
                showToast('请求已被拒绝。', 'error');
                return;
            }
            if (status === 'expired') {
                showToast('登录请求已过期，请重新尝试。', 'error');
                return;
            }
            showToast('请求处理失败，请稍后再试。', 'error');
        }).catch(function (err) {
            stopPolling();
            setButtonIdle();
            showToast(err && err.message ? err.message : '请求失败，请稍后再试。', 'error');
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
        if (state.attachTimer) return;
        ensureButton();
        state.attachTimer = setInterval(ensureButton, 1000);
        window.addEventListener('hashchange', function () {
            setTimeout(ensureButton, 120);
        });
        window.addEventListener('beforeunload', function () {
            stopPolling();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
