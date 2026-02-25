// Service Worker: iPad内部で全通信をインターセプトする
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 自分のドメイン(vercel)以外のリクエスト、または/view/以外のリクエストを対象にする
    if (!url.hostname.includes(location.hostname)) {
        // 全てのリクエストを暗号化して、自分のAPI経由に飛ばし直す
        const targetUrl = event.request.url;
        const encodedUrl = btoa(targetUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        event.respondWith(
            fetch(`/api/proxy?url=${encodedUrl}`)
        );
    }
});
