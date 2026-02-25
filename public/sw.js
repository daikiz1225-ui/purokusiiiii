self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 自分のドメイン(Vercel)へのアクセス、または既にプロキシ済みの場合はスルー
    if (url.origin === self.location.origin || url.pathname.includes('/api/proxy')) {
        return;
    }

    // それ以外の全ての通信（画像、スクリプト、ページ遷移）をプロキシ経由に強制変換
    const encodedUrl = btoa(unescape(encodeURIComponent(url.href)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const proxyUrl = `/api/proxy?url=${encodedUrl}`;
    
    event.respondWith(fetch(proxyUrl));
});

// インストール後すぐに有効化
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
