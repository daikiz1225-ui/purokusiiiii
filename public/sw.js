self.addEventListener('fetch', e => {
    const url = e.request.url;
    // 自鯖への通信、または既にプロキシ済みのURLはスルー
    if (url.includes('/api/bare') || url.includes(location.host) || url.startsWith('data:')) return;

    // 生URLへのリクエスト（画像、CSS、リンク等）をすべてプロキシ経由に書き換えて奪い取る
    const encode = (u) => btoa(unescape(encodeURIComponent(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const proxiedUrl = '/api/bare?url=' + encode(url);

    e.respondWith(Response.redirect(proxiedUrl, 302));
});
