(function() {
    if (window.__DIP_ENGINE__) return;
    window.__DIP_ENGINE__ = true;

    const config = window.__DIP_CONFIG__;
    const target = window.__TARGET_URL__ || window.location.href;
    const origin = new URL(target).origin;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    const rewrite = (u) => {
        if (!u || typeof u !== 'string' || u.startsWith('data:') || u.includes(location.host)) return u;
        let absolute = u;
        if (u.startsWith('/')) absolute = origin + u;
        else if (!u.startsWith('http')) absolute = new URL(u, target).href;
        return config.prefix + config.encodeUrl(absolute);
    };

    // 既存の要素の属性を書き換える
    const fixElements = () => {
        document.querySelectorAll('link[rel="stylesheet"], img, script[src]').forEach(el => {
            const attr = el.tagName === 'LINK' ? 'href' : 'src';
            const val = el.getAttribute(attr);
            if (val && !val.includes(location.host)) {
                el.setAttribute(attr, rewrite(val));
            }
        });
    };

    // DOM変更を監視して新しく追加されたCSSなどもプロキシ化
    const observer = new MutationObserver(() => fixElements());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 通信フック
    window.fetch = new Proxy(window.fetch, { apply: (t, g, a) => t.apply(g, [rewrite(a[0]), a[1]]) });
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, u, ...args) { return _open.apply(this, [m, rewrite(u), ...args]); };

    fixElements();
})();
