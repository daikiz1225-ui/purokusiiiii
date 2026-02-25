export default async function handler(req, res) {
    const { url, mode } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        const targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);

        // iPadからのリクエストをそのまま中継
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)',
                'Accept': req.headers['accept'] || '*/*',
                'Referer': targetObj.origin + '/'
            },
            redirect: 'manual' // リダイレクトは手動で処理
        });

        // リダイレクト処理
        if (response.status >= 300 && response.status < 400) {
            const loc = response.headers.get('location');
            if (loc) {
                const absLoc = new URL(loc, targetUrl).href;
                const b64 = Buffer.from(absLoc).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                return res.redirect(`/api/proxy?url=${b64}&mode=${mode}`);
            }
        }

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (!contentType.includes('text/html')) {
            const buffer = await response.arrayBuffer();
            return res.send(Buffer.from(buffer));
        }

        let html = await response.text();

        // 【最重要】HTMLの書き換えは最小限にし、外部ファイル「engine.js」を最優先で読み込ませる
        const engineScript = `
            <script>
                window.__PROXY_TARGET__ = "${targetUrl}";
                window.__PROXY_MODE__ = "${mode || 'normal'}";
            </script>
            <script src="/engine.js"></script>
            <base href="${targetObj.origin}/">
        `;
        
        // <head>の直後にエンジンをねじ込む
        html = html.replace(/<head>/i, '<head>' + engineScript);
        if (!html.toLowerCase().includes('<head>')) {
            html = engineScript + html;
        }

        return res.send(html);

    } catch (error) {
        res.status(500).send('Backend Proxy Error: ' + error.message);
    }
}
