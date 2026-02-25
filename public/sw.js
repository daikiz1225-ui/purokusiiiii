// 登録時に自分を最新版にアップデート
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Vercel内のAPIや内部ファイルへのアクセスはスルーする
    if (url.origin === location.origin && !url.pathname.startsWith('/api/proxy')) {
        return;
    }

    // 外部（game8等）へのリクエストを全て検知
    const targetUrl = request.url;
    const encoded = btoa(unescape(encodeURIComponent(targetUrl)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    event.respondWith(
        fetch(`/api/proxy?url=${encoded}`, {
            headers: request.headers,
            method: request.method,
            // POSTリクエストなどのボディも転送（ログインに必要）
            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.clone().blob() : undefined
        })
    );
});
