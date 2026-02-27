self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/service/')) {
        event.respondWith(
            (async () => {
                try {
                    // /service/ 以降をそのままURLとして扱う
                    const targetUrl = decodeURIComponent(url.pathname.split('/service/')[1]);

                    const bareUrl = `/bare/?url=${encodeURIComponent(targetUrl)}`;
                    const response = await fetch(bareUrl, {
                        headers: event.request.headers,
                        method: event.request.method,
                        body: event.request.body,
                        redirect: 'follow'
                    });

                    return response;
                } catch (err) {
                    return new Response('Error: ' + err, { status: 500 });
                }
            })()
        );
    }
});
