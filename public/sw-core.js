/**
 * Ultraviolet Service Worker Core (Final Fix)
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // /service/ から始まる通信をプロキシとして処理
    if (url.pathname.startsWith('/service/')) {
        event.respondWith(
            (async () => {
                const config = self.__uv$config;
                const targetUrl = config.decodeUrl(url.pathname.split('/service/')[1]);

                // ターゲットへのリクエストをBare Server経由で構築
                const bareUrl = `/bare/?url=${encodeURIComponent(targetUrl)}`;

                try {
                    const response = await fetch(bareUrl, {
                        headers: event.request.headers,
                        method: event.request.method,
                        body: event.request.body
                    });
                    return response;
                } catch (err) {
                    return new Response('Proxy Error: ' + err, { status: 500 });
                }
            })()
        );
    }
});
