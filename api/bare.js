export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');
    try {
        const decoded = Buffer.from(url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        const targetObj = new URL(decoded);
        const response = await fetch(decoded, {
            method: req.method,
            headers: { ...req.headers, host: targetObj.host, referer: targetObj.origin + '/' },
            redirect: 'follow'
        });

        // 404が出た場合、特別なヘッダーを付けてブラウザに知らせる
        if (response.status === 404) res.setHeader('X-Proxy-Retry', 'true');

        response.headers.forEach((v, k) => {
            if (!['content-encoding', 'content-security-policy', 'x-frame-options'].includes(k.toLowerCase())) res.setHeader(k, v);
        });
        res.status(response.status);

        if ((response.headers.get('content-type') || '').includes('text/html')) {
            let html = await response.text();
            const inject = `
            <script>
            window.__TARGET_URL__="${decoded}";
            const config = { prefix: '/api/bare?url=', encodeUrl: (u) => btoa(unescape(encodeURIComponent(u))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '') };
            const rewrite = (u) => {
                if (!u || typeof u !== 'string' || u.startsWith('data:') || u.includes(location.host)) return u;
                try { return config.prefix + config.encodeUrl(new URL(u, window.__TARGET_URL__).href); } catch(e) { return u; }
            };
            // 404やエラー時に即座にリロードして再プロキシ化する
            if (document.title.includes('404') || window.performance.navigation.type === 2) {
                location.href = config.prefix + config.encodeUrl(window.__TARGET_URL__);
            }
            window.fetch = new Proxy(window.fetch, { apply: (t, g, a) => t.apply(g, [rewrite(a[0]), a[1]]) });
            const _open = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(m, u, ...args) { return _open.apply(this, [m, rewrite(u), ...args]); };
            setInterval(() => {
                document.querySelectorAll('a, img, link, script').forEach(el => {
                    ['href', 'src'].forEach(attr => {
                        const val = el.getAttribute(attr);
                        if (val && !val.startsWith(config.prefix) && !val.includes(location.host)) el.setAttribute(attr, rewrite(val));
                    });
                });
            }, 1000);
            if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
            </script>`;
            return res.send(html.replace(/<head>/i, '<head>' + inject));
        }
        res.send(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
        // 通信失敗時は即座に再試行URLへ飛ばす
        res.status(200).send(`<script>location.href='/api/bare?url=${url}';</script>`);
    }
}
