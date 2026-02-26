export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');
    try {
        const decoded = Buffer.from(url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        const response = await fetch(decoded, {
            headers: { 'User-Agent': req.headers['user-agent'] },
            redirect: 'follow'
        });

        // ステータスコードをそのまま返す（404なら404としてフロントに渡す）
        res.status(response.status);

        response.headers.forEach((v, k) => {
            if (!['content-encoding', 'content-security-policy', 'x-frame-options'].includes(k.toLowerCase())) {
                res.setHeader(k, v);
            }
        });

        if ((response.headers.get('content-type') || '').includes('text/html')) {
            let html = await response.text();
            const inject = `
            <script>
            window.__TARGET_URL__ = "${decoded}";
            const encode = (u) => btoa(unescape(encodeURIComponent(u))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
            // ページ内のクリックをすべてプロキシURLに変換
            document.addEventListener('click', e => {
                const a = e.target.closest('a');
                if (a && a.href && !a.href.includes(location.host)) {
                    e.preventDefault();
                    window.location.href = window.location.origin + '/api/bare?url=' + encode(a.href);
                }
            }, true);
            if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
            </script>`;
            return res.send(html.replace(/<head>/i, '<head>' + inject));
        }
        res.send(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
        res.status(404).send('Not Found');
    }
}
