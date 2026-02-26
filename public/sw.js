self.addEventListener('fetch', e => {
    // すでにプロキシ経由の通信、または自鯖への通信はスルー
    if (e.request.url.includes('/api/bare') || e.request.url.includes(location.host)) return;

    // それ以外の「生URL」への通信をすべてプロキシURLに変換して強制リダイレクト
    const encode = (u) => btoa(unescape(encodeURIComponent(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const proxiedUrl = '/api/bare?url=' + encode(e.request.url);

    e.respondWith(Response.redirect(proxiedUrl, 302));
});
