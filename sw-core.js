/**
 * Ultraviolet Service Worker Core (Final Fix for Encoding)
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/service/')) {
        event.respondWith(
            (async () => {
                try {
                    // /service/ の後の文字列を取り出す
                    const encodedPath = url.pathname.split('/service/')[1];
                    
                    // シンプルなBase64で解読（config.jsに合わせる）
                    let targetUrl;
                    try {
                        targetUrl = decodeURIComponent(atob(encodedPath));
                    } catch (e) {
                        return new Response('URL解読エラー: 設定が一致していません', { status: 500 });
                    }

                    // Bare Server（中継局）へのリクエスト作成
                    const bareUrl = `/bare/?url=${encodeURIComponent(targetUrl)}`;
                    
                    const response = await fetch(bareUrl, {
                        headers: event.request.headers,
                        method: event.request.method,
                        body: event.request.body,
                        redirect: 'follow'
                    });

                    // 正常に応答を返す
                    return response;

                } catch (err) {
                    return new Response('通信エラー: ' + err, { status: 500 });
                }
            })()
        );
    }
});
