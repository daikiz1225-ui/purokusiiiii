/**
 * Ultraviolet Service Worker Core (Compressed)
 */
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // プロキシのスコープ内（/service/）の通信だけを処理
    if (url.pathname.startsWith('/service/')) {
        event.respondWith(handleRequest(event));
    }
});

async function handleRequest(event) {
    const config = self.__uv$config;
    // 暗号化されたURLを解読
    const targetUrl = config.decodeUrl(event.request.url.split('/service/')[1]);

    // Bareサーバー経由でリクエストを投げる
    const bareUrl = `${config.bare}?url=${encodeURIComponent(targetUrl)}`;
    
    // i-フィルターを回避するため、リクエストヘッダーを「普通のブラウザ」に偽装
    const headers = new Headers(event.request.headers);
    headers.set('Host', new URL(targetUrl).host);

    return fetch(bareUrl, {
        method: event.request.method,
        headers: headers,
        body: event.request.body,
        redirect: 'follow'
    });
}
