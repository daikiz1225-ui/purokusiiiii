// public/engine.js
(function() {
    if (window.__ENGINE_LOADED__) return;
    window.__ENGINE_LOADED__ = true;

    const targetUrl = window.__PROXY_TARGET__;
    const mode = window.__PROXY_MODE__;

    // URLをプロキシ用に変換するコア関数
    function encodeProxyUrl(originalUrl) {
        if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.startsWith('data:') || originalUrl.startsWith('javascript:') || originalUrl.includes('/api/proxy')) {
            return originalUrl;
        }
        try {
            const absUrl = new URL(originalUrl, targetUrl).href;
            const b64 = btoa(unescape(encodeURIComponent(absUrl))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            return '/api/proxy?url=' + b64 + '&mode=' + mode;
        } catch (e) {
            return originalUrl;
        }
    }

    // 1. Fetch API の乗っ取り
    const originalFetch = window.fetch;
    window.fetch = async function(resource, options) {
        let reqUrl = (typeof resource === 'string') ? resource : resource.url;
        return originalFetch.call(this, encodeProxyUrl(reqUrl), options);
    };

    // 2. XMLHttpRequest の乗っ取り
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        return originalOpen.call(this, method, encodeProxyUrl(url), async, user, password);
    };

    // 3. リンクとフォーム送信の全自動横取り
    document.addEventListener('click', function(e) {
        const a = e.target.closest('a');
        if (a && a.href && !a.href.includes('/api/proxy')) {
            e.preventDefault();
            window.location.href = encodeProxyUrl(a.href);
        }
    }, true);

    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.method.toLowerCase() === 'get' && !form.action.includes('/api/proxy')) {
            e.preventDefault();
            const params = new URLSearchParams(new FormData(form)).toString();
            const joiner = form.action.includes('?') ? '&' : '?';
            window.location.href = encodeProxyUrl(form.action + joiner + params);
        }
    }, true);

    // 4. Service Workerの登録 (最終防衛線)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => console.log('SW registration failed'));
    }

})();
