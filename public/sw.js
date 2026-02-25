// public/sw.js
self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // 自分のサーバーへの通信（プロキシURLそのもの、engine.js、app.html等）は絶対に横取りしない（無限ループ防止）
    if (requestUrl.origin === self.location.origin) {
        return;
    }

    // data: や blob: は無視
    if (requestUrl.protocol === 'data:' || requestUrl.protocol === 'blob:') {
        return;
    }

    // 外部サイトへの直接通信を検知したら、強制的にプロキシへ書き換える
    const b64 = btoa(unescape(encodeURIComponent(requestUrl.href))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const proxyUrl = `/api/proxy?url=${b64}&mode=power`;

    event.respondWith(
        fetch(proxyUrl, {
            method: event.request.method,
            headers: event.request.headers,
            // POSTデータなどがある場合は引き継ぐ
            body: event.request.method === 'POST' ? event.request.body : undefined,
            redirect: 'manual'
        }).catch(err => {
            console.error('SW Proxy Fetch Failed:', err);
            return new Response('Proxy Network Error', { status: 502 });
        })
    );
});
