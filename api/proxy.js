export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        const targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': targetObj.origin + '/',
                'Origin': targetObj.origin,
                'Cookie': req.headers.cookie || ''
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        // --- HTMLの場合：サイト内移動ができるようにリンクを書き換える ---
        if (contentType.includes('text/html')) {
            let html = await response.text();
            
            // リンク(href)をプロキシ経由に書き換える（サイト内移動対策）
            html = html.replace(/(href)=["'](https?:\/\/[^"']+)["']/gi, (m, attr, link) => {
                const encodedLink = Buffer.from(link).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                return `${attr}="/api/proxy?url=${encodedLink}"`;
            });

            // ベースURLを埋め込んで相対パスの崩れを防ぐ
            const baseTag = `<head><base href="${targetObj.origin}/"><script>window.onerror=()=>true;</script>`;
            html = html.replace('<head>', baseTag);

            return res.send(html);
        }

        // --- 画像やその他の場合：安定して流し込む ---
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        res.status(500).send('Proxy Error: ' + error.message);
    }
}
