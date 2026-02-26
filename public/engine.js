(function() {
    if (window.__DIP_ENGINE__) return;
    window.__DIP_ENGINE__ = true;
    const config = window.__DIP_CONFIG__;
    const target = window.__TARGET_URL__ || window.location.href;

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

    const wrap = (u) => {
        if (!u || typeof u !== 'string' || u.includes(location.origin) || u.startsWith('data:')) return u;
        try {
            return config.prefix + config.encodeUrl(new URL(u, target).href);
        } catch(e) { return u; }
    };

    // API フック
    window.fetch = new Proxy(window.fetch, { 
        apply: (t, g, a) => t.apply(g, [wrap(a[0]), a[1]]) 
    });
    
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, u, ...args) { 
        return _open.apply(this, [m, wrap(u), ...args]); 
    };

    // クリックフック
    document.addEventListener('click', e => {
        const a = e.target.closest('a');
        if (a && a.href && !a.href.includes(location.origin)) {
            e.preventDefault(); 
            window.location.href = wrap(a.href);
        }
    }, true);

    console.log("Engine Virtualization Active: " + target);
})();
