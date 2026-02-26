export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('No URL');

    try {
        const targetUrl = Buffer.from(url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        const targetObj = new URL(targetUrl);

        // iPad Safariを完璧に模倣するヘッダー
        const headers = {
            'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja-JP,ja;q=0.9',
            'Referer': targetObj.origin + '/',
            'Origin': targetObj.origin
        };

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: req.method !== 'GET' ? await req.arrayBuffer() : undefined,
            redirect: 'follow'
        });

        response.headers.forEach((v, k) => {
            if (!['content-encoding', 'content-length', 'content-security-policy'].includes(k.toLowerCase())) {
                res.setHeader(k, v);
            }
        });

        res.status(response.status);
        
        if ((response.headers.get('content-type') || '').includes('text/html')) {
            let html = await response.text();
            const inject = `<script src="/config.js"></script><script src="/engine.js"></script><script>window.__TARGET_URL__="${targetUrl}";</script>`;
            // 広告ブロック検知スクリプトを無効化する処理をHTMLレベルでねじ込む
            html = html.replace(/<head>/i, '<head>' + inject);
            return res.send(html);
        }
        res.send(Buffer.from(await response.arrayBuffer()));
    } catch (e) { res.status(500).send(e.message); }
}
