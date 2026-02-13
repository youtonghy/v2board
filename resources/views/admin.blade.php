<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no">
    <title>{{$title}}</title>
    <style>html.__admin_auth_blocked{display:none}</style>
    <script>
        (function () {
            try { document.documentElement.classList.add('__admin_auth_blocked'); } catch (e) {}

            function redirectHome(clearToken) {
                if (clearToken) {
                    try { localStorage.removeItem('auth_data'); } catch (e) {}
                }
                window.location.replace('/');
            }

            function redirectLogin(clearToken) {
                if (clearToken) {
                    try { localStorage.removeItem('auth_data'); } catch (e) {}
                }
                window.location.replace('/#/login');
            }

            function installAdminAssets() {
                var scripts = [
                    "/assets/admin/vendors.async.js?v={{$version}}",
                    "/assets/admin/components.async.js?v={{$version}}",
                    "/assets/admin/umi.js?v={{$version}}&m={{ filemtime(public_path('assets/admin/umi.js')) }}",
                    "/assets/admin/broadcast.js?v={{$version}}"
                ];

                function loadNext(index) {
                    if (index >= scripts.length) return;
                    if (!document.body) {
                        return document.addEventListener('DOMContentLoaded', function () {
                            loadNext(index);
                        }, { once: true });
                    }
                    var s = document.createElement('script');
                    s.src = scripts[index];
                    s.async = false;
                    s.onload = function () { loadNext(index + 1); };
                    s.onerror = function () { redirectHome(false); };
                    document.body.appendChild(s);
                }

                loadNext(0);
            }

            function parseUrl(rawUrl) {
                try {
                    return new URL(rawUrl, window.location.origin);
                } catch (e) {
                    return null;
                }
            }

            function extractApiRoute(rawUrl) {
                var u = parseUrl(rawUrl);
                if (!u) return null;

                var path = u.pathname || '';
                if (path === '/api/v3/server' || path === '/api/v3/server/') return null;

                var prefix = null;
                if (path.startsWith('/api/v1/')) prefix = '/api/v1/';
                else if (path.startsWith('/api/v3/')) prefix = '/api/v3/';
                else return null;

                var rest = path.slice(prefix.length);
                rest = rest.replace(/^\/+/, '');
                if (!rest) return null;

                if (rest.startsWith('server/')) {
                    var parts = rest.split('/').filter(Boolean);
                    if (parts.length >= 3) {
                        return { mode: 'classAction', class: parts[1], action: parts[2], url: u };
                    }
                    return null;
                }

                return { mode: 'endpoint', endpoint: rest, url: u };
            }

            function collectQueryParams(urlObj) {
                var params = {};
                try {
                    urlObj.searchParams.forEach(function (value, key) {
                        if (typeof params[key] === 'undefined') params[key] = value;
                    });
                } catch (e) {}
                return params;
            }

            function tryParseJson(str) {
                if (typeof str !== 'string') return null;
                var trimmed = str.trim();
                if (!trimmed) return null;
                try {
                    return JSON.parse(trimmed);
                } catch (e) {
                    return null;
                }
            }

            function mergeObject(target, source) {
                if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
                Object.keys(source).forEach(function (k) {
                    target[k] = source[k];
                });
                return target;
            }

            function installApiGateway() {
                if (window.__v2bApiGatewayInstalled) return;
                window.__v2bApiGatewayInstalled = true;

                var gatewayPath = '/api/v3/server';

                if (window.fetch) {
                    var originalFetch = window.fetch.bind(window);
                    window.fetch = function (input, init) {
                        var url = (typeof input === 'string') ? input : (input && input.url ? input.url : null);
                        if (!url) return originalFetch(input, init);

                        var route = extractApiRoute(url);
                        if (!route) return originalFetch(input, init);

                        var options = init || {};
                        var originalMethod = (options.method || (input && input.method) || 'GET').toUpperCase();

                        var params = collectQueryParams(route.url);
                        if (options.body) {
                            if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
                                var fd = new FormData();
                                if (route.mode === 'endpoint') {
                                    fd.append('endpoint', route.endpoint);
                                    fd.append('method', originalMethod);
                                } else {
                                    fd.append('class', route.class);
                                    fd.append('action', route.action);
                                }
                                Object.keys(params).forEach(function (k) { fd.append(k, params[k]); });
                                options.body.forEach(function (value, key) { fd.append(key, value); });
                                var headers = new Headers(options.headers || (input && input.headers) || {});
                                headers.delete('content-type');
                                var init2 = Object.assign({}, options, { method: 'POST', headers: headers, body: fd });
                                return originalFetch(gatewayPath, init2);
                            }

                            if (typeof options.body === 'string') {
                                var parsed = tryParseJson(options.body);
                                if (parsed) mergeObject(params, parsed);
                                else {
                                    try {
                                        var usp = new URLSearchParams(options.body);
                                        usp.forEach(function (value, key) { params[key] = value; });
                                    } catch (e) {}
                                }
                            } else if (typeof URLSearchParams !== 'undefined' && options.body instanceof URLSearchParams) {
                                options.body.forEach(function (value, key) { params[key] = value; });
                            }
                        }

                        var payload = route.mode === 'endpoint'
                            ? { endpoint: route.endpoint, method: originalMethod, params: params }
                            : { class: route.class, action: route.action, params: params };

                        var headers2 = new Headers(options.headers || (input && input.headers) || {});
                        if (!headers2.get('Content-Type') && !headers2.get('content-type')) {
                            headers2.set('Content-Type', 'application/json');
                        }

                        var init3 = Object.assign({}, options, { method: 'POST', headers: headers2, body: JSON.stringify(payload) });
                        return originalFetch(gatewayPath, init3);
                    };
                }

                if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
                    var XHRProto = window.XMLHttpRequest.prototype;
                    var originalOpen = XHRProto.open;
                    var originalSend = XHRProto.send;
                    var originalSetHeader = XHRProto.setRequestHeader;

                    XHRProto.open = function (method, url, async, user, password) {
                        var route = extractApiRoute(url);
                        this.__v2b_gw = null;
                        this.__v2b_headers = {};

                        if (route) {
                            this.__v2b_gw = {
                                route: route,
                                originalMethod: (method || 'GET').toUpperCase(),
                                originalUrl: url,
                                originalAsync: (typeof async === 'undefined') ? true : async,
                                originalUser: user,
                                originalPassword: password
                            };
                            return originalOpen.call(this, 'POST', gatewayPath, async, user, password);
                        }
                        return originalOpen.call(this, method, url, async, user, password);
                    };

                    XHRProto.setRequestHeader = function (header, value) {
                        try {
                            if (this.__v2b_headers && typeof header === 'string') {
                                this.__v2b_headers[header.toLowerCase()] = String(value);
                            }
                        } catch (e) {}
                        return originalSetHeader.call(this, header, value);
                    };

                    XHRProto.send = function (body) {
                        if (!this.__v2b_gw) {
                            return originalSend.call(this, body);
                        }

                        var meta = this.__v2b_gw;
                        var route = meta.route;
                        var params = collectQueryParams(route.url);

                        if (typeof FormData !== 'undefined' && body instanceof FormData) {
                            var fd2 = new FormData();
                            if (route.mode === 'endpoint') {
                                fd2.append('endpoint', route.endpoint);
                                fd2.append('method', meta.originalMethod);
                            } else {
                                fd2.append('class', route.class);
                                fd2.append('action', route.action);
                            }
                            Object.keys(params).forEach(function (k) { fd2.append(k, params[k]); });
                            body.forEach(function (value, key) { fd2.append(key, value); });
                            return originalSend.call(this, fd2);
                        }

                        if (typeof body === 'string') {
                            var parsed = tryParseJson(body);
                            if (parsed) mergeObject(params, parsed);
                            else {
                                try {
                                    var usp2 = new URLSearchParams(body);
                                    usp2.forEach(function (value, key) { params[key] = value; });
                                } catch (e) {}
                            }
                        } else if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
                            body.forEach(function (value, key) { params[key] = value; });
                        } else if (body != null) {
                            // Unknown body type (Blob/ArrayBuffer/etc), fall back to original URL request.
                            this.__v2b_gw = null;
                            try {
                                originalOpen.call(
                                    this,
                                    meta.originalMethod,
                                    meta.originalUrl,
                                    meta.originalAsync,
                                    meta.originalUser,
                                    meta.originalPassword
                                );
                                var preservedHeaders = this.__v2b_headers || {};
                                Object.keys(preservedHeaders).forEach(function (key) {
                                    if (!key) return;
                                    originalSetHeader.call(this, key, preservedHeaders[key]);
                                }, this);
                            } catch (e) {}
                            return originalSend.call(this, body);
                        }

                        var payload2 = route.mode === 'endpoint'
                            ? { endpoint: route.endpoint, method: meta.originalMethod, params: params }
                            : { class: route.class, action: route.action, params: params };

                        try {
                            var ct = (this.__v2b_headers && this.__v2b_headers['content-type']) || '';
                            if (!ct || ct.indexOf('application/json') === -1) {
                                originalSetHeader.call(this, 'Content-Type', 'application/json');
                            }
                        } catch (e) {}

                        return originalSend.call(this, JSON.stringify(payload2));
                    };
                }
            }

            var token = null;
            try { token = localStorage.getItem('auth_data'); } catch (e) {}
            if (!token) return redirectLogin(false);

            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/v3/server', true);
            xhr.setRequestHeader('Authorization', token);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) return;
                if (xhr.status !== 200) return redirectLogin(xhr.status === 401 || xhr.status === 403);
                try {
                    var res = JSON.parse(xhr.responseText || '{}');
                    var data = res && res.data ? res.data : null;
                    if (!data || !data.is_login) return redirectLogin(true);
                    if (!data.is_admin) return redirectHome(false);
                    installApiGateway();
                    try { document.documentElement.classList.remove('__admin_auth_blocked'); } catch (e) {}
                    installAdminAssets();
                } catch (e) {
                    return redirectLogin(false);
                }
            };
            xhr.send(JSON.stringify({ endpoint: 'user/checkLogin', method: 'GET', params: {} }));
        })();
    </script>
    <link rel="stylesheet" href="/assets/admin/components.chunk.css?v={{$version}}">
    <link rel="stylesheet" href="/assets/admin/umi.css?v={{$version}}">
    <link rel="stylesheet" href="/assets/admin/custom.css?v={{$version}}">
    <!-- <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Nunito+Sans:300,400,400i,600,700"> -->
    <script>window.routerBase = "/";</script>
    <script>
        window.settings = {
            title: '{{$title}}',
            theme: {
                sidebar: '{{$theme_sidebar}}',
                header: '{{$theme_header}}',
                color: '{{$theme_color}}',
            },
            version: '{{$version}}',
            background_url: '{{$background_url}}',
            logo: '{{$logo}}',
            secure_path: '{{$secure_path}}',
            apiHost: '{{ request()->getSchemeAndHttpHost() }}'
        }
    </script>
</head>

<body>
<div id="root"></div>
</body>

</html>
