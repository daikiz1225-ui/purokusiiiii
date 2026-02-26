export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');
    try {
        const decoded = Buffer.from(url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        const response = await fetch(decoded, {
            headers: { 'User-Agent': req.headers['user-agent'] },
            redirect: 'follow'
        });

        // 404ならあえてステータスを返し、フロントエンドに「切り替え」を促す
        res.status(response.status);

        response.headers.forEach((v, k) => {
            if (!['content-encoding', 'content-security-policy', 'x-frame-options'].includes(k.toLowerCase())) {
                res.setHeader(k, v);
            }
        });

        if ((response.headers.get('content-type') || '').includes('text/html')) {
            let html = await response.text();
            // 再プロキシ化の核となるスクリプトを注入
            const inject = `
            <script>
            window.__TARGET_URL__ = "${decoded}";
            const encode = (u) => btoa(unescape(encodeURIComponent(u))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
            // 全てのリンクを自サイトのプロキシURLに書き換える
            setInterval(() => {
                document.querySelectorAll('a').forEach(a => {
                    if (a.href && !a.href.includes(location.host)) {
                        a.href = window.location.origin + '/api/bare?url=' + encode(new URL(a.href, window.__TARGET_URL__).href);
                    }
                });
            }, 500);
            </script>`;
            return res.send(html.replace(/<head>/i, '<head>' + inject));
        }
        res.send(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
        res.status(404).send('Not Found');
    }
}
