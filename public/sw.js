self.addEventListener('fetch', e => {
    if (e.request.url.includes(location.origin) || e.request.url.startsWith('data:')) return;
    const encodeUrl = (u) => btoa(unescape(encodeURIComponent(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // 404時などのフォールバック処理
    e.respondWith(
        fetch('/api/bare?url=' + encodeUrl(e.request.url)).catch(() => {
            return new Response('Retry manually', { status: 404 });
        })
    );
});
