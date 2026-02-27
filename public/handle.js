(function() {
    'use strict';

    // 設定の読み込み
    const config = self.__uv$config;

    // URLの書き換え関数
    const rewriteUrl = (url) => {
        if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#')) return url;
        try {
            return config.prefix + config.encodeUrl(new URL(url, location.href).href);
        } catch(e) { return url; }
    };

    // --- アンチ・アドブロック回避ロジック ---
    // Game8などがチェックする「広告があるか」という変数を常に「あるよ」と嘘をつく設定
    const bypassAds = () => {
        window.adsbygoogle = window.adsbygoogle || [];
        window.google_ad_client = "ca-pub-test";
        // 検知スクリプトが「ブロックされた」と判断する関数を上書きして無効化
        window.canRunAds = true;
    };

    // --- 要素（リンク・画像）の監視と書き換え ---
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                
                // リンク、画像、スクリプトのURLを書き換え
                if (node.tagName === 'A' && node.href) node.href = rewriteUrl(node.href);
                if (node.tagName === 'IMG' && node.src) node.src = rewriteUrl(node.src);
                if (node.tagName === 'SCRIPT' && node.src) node.src = rewriteUrl(node.src);
                
                // 特定の「ブロック警告」を出すIDを持つ要素を強制削除
                if (node.id && node.id.includes('ad-block-warning')) node.remove();
            });
        });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // --- Fetch / XHR (通信) の横取り ---
    const _fetch = window.fetch;
    window.fetch = async (...args) => {
        if (typeof args[0] === 'string') args[0] = rewriteUrl(args[0]);
        return _fetch(...args);
    };

    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        return _open.apply(this, [method, rewriteUrl(url)]);
    };

    // ページ読み込み時に実行
    window.addEventListener('DOMContentLoaded', bypassAds);
    bypassAds();

})();
