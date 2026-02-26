export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('No URL');

    try {
        const targetUrl = Buffer.from(url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        const targetObj = new URL(targetUrl);

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                'Referer': targetObj.origin + '/',
            }
        });

        response.headers.forEach((v, k) => {
            if (!['content-encoding', 'content-length', 'content-security-policy'].includes(k.toLowerCase())) {
                res.setHeader(k, v);
            }
        });

        res.status(response.status);
        
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('text/html')) {
            let html = await response.text();
            
            // 1. エンジン注入
            const inject = `<script src="/config.js"></script><script src="/engine.js"></script><script>window.__TARGET_URL__="${targetUrl}";</script>`;
            html = html.replace(/<head>/i, '<head>' + inject);

            // 2. HTML内のリンクをプロキシURLに強制置換 (ここが重要！)
            // src="http..." や href="http..." を見つけて変換
            html = html.replace(/(src|href|action)="\/(?!\/)/g, `$1="${targetObj.origin}/`); // 相対パスを絶対パスへ
            
            return res.send(html);
        }
        
        res.send(Buffer.from(await response.arrayBuffer()));
    } catch (e) { res.status(500).send(e.message); }
}
