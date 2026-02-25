export default async function handler(req, res) {
    const { url, ...otherParams } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        let targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);
        
        Object.keys(otherParams).forEach(key => targetObj.searchParams.set(key, otherParams[key]));
        targetUrl = targetObj.href;

        const response = await fetch(targetUrl, {
            method: req.method,
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

        if (contentType.includes('text/html')) {
            let html = await response.text();

            // 最小限の書き換え: ページ内のService Worker登録を確実にする
            const injector = `
                <head>
                <script>
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' });
                }
                // JavaScriptでの遷移(location.href =)を監視
                const originalSet = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href').set;
                Object.defineProperty(window.location, 'href', {
                    set: function(url) {
                        const b64 = btoa(unescape(encodeURIComponent(new URL(url, window.location.href).href))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                        originalSet.call(this, '/api/proxy?url=' + b64);
                    }
                });
                </script>
            `;
            html = html.replace('<head>', injector);
            return res.send(html);
        }

        // 画像・動画はストリーミング
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        res.status(500).send('Proxy Error: ' + error.message);
    }
}
