(function() {
    if (window.__DIP_ENGINE__) return;
    window.__DIP_ENGINE__ = true;

    // 1. 広告ブロック検知をだます
    window.canRunAds = true; // よくあるチェック変数
    window.adblock = false;
    
    // 2. Google AdSenseなどの読み込み失敗を偽装
    const noop = () => {};
    window.adsbygoogle = { push: noop, loaded: true };

    // 3. 通信の隠蔽
    const config = window.__DIP_CONFIG__;
    const target = window.__TARGET_URL__ || window.location.href;

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

    const wrap = (u) => {
        if (!u || typeof u !== 'string' || u.includes(location.origin) || u.startsWith('data:')) return u;
        return config.prefix + config.encodeUrl(new URL(u, target).href);
    };

    window.fetch = new Proxy(window.fetch, { apply: (t, g, a) => t.apply(g, [wrap(a[0]), a[1]]) });
    
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, u, ...args) { 
        return _open.apply(this, [m, wrap(u), ...args]); 
    };

    // 4. iPad用のタッチイベントの修正
    document.addEventListener('touchstart', noop, {passive: true});
})();
