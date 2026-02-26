export default async function handler(req, res) {
    const { url, mode } = req.query;
    if (!url) return res.status(400).send('No URL provided');

    try {
        const targetUrl = Buffer.from(url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        const targetObj = new URL(targetUrl);

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: { 
                ...req.headers, 
                host: targetObj.host, 
                referer: targetObj.origin + '/' 
            },
            body: req.method !== 'GET' ? await req.arrayBuffer() : undefined,
            redirect: 'manual'
        });

        // ヘッダー処理（安全なもののみ転送）
        response.headers.forEach((v, k) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k.toLowerCase())) {
                res.setHeader(k, v);
            }
        });

        res.status(response.status);

        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('text/html')) {
            let html = await response.text();
            const inject = `
                <script src="/config.js"></script>
                <script src="/engine.js"></script>
                <script>window.__TARGET_URL__="${targetUrl}";</script>
            `;
            // <head>の直後にエンジンを注入
            return res.send(html.replace(/<head>/i, '<head>' + inject));
        }

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (e) {
        res.status(500).send('Bare Server Error: ' + e.message);
    }
}
