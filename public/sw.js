const CACHE_NAME = 'purokusiiiii-assets';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // 内部ファイルやAPIリクエストはそのまま
    if (url.origin === location.origin && !url.searchParams.has('url')) {
        return;
    }

    // 画像リクエストの場合はキャッシュを確認して高速化
    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request).then((cached) => {
                return cached || fetch(request).then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    return response;
                });
            })
        );
        return;
    }

    // 通常のプロキシ処理
    const targetUrl = request.url;
    const encoded = btoa(unescape(encodeURIComponent(targetUrl)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    event.respondWith(
        fetch(`/api/proxy?url=${encoded}`, {
            headers: request.headers,
            method: request.method,
            body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.clone().blob() : undefined
        })
    );
});
