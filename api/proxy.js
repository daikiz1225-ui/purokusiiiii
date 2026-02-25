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
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': targetObj.origin + '/',
                'Origin': targetObj.origin
            }
        });

        if (!response.ok) throw new Error(`Target returned ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType.includes('text/html')) {
            let html = await response.text();

            // 変換ロジックをシンプルに
            const toProxyUrl = (link) => {
                try {
                    const abs = new URL(link, targetUrl).href;
                    const b64 = Buffer.from(abs).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return `/api/proxy?url=${b64}`;
                } catch(e) { return link; }
            };

            // HTML内のリンクと画像を書き換え
            html = html.replace(/(href|src|action)=["']([^"']+)["']/gi, (m, attr, link) => {
                if (link.startsWith('#') || link.startsWith('javascript:')) return m;
                return `${attr}="${toProxyUrl(link)}"`;
            });

            // 404防止用のスクリプト注入 (エラーが出にくい形式)
            const injector = `
                <head>
                <script>
                window._PROXY_BASE_ = "${targetObj.origin}";
                
                // クリックを横取りしてプロキシへ
                document.addEventListener('click', e => {
                    const a = e.target.closest('a');
                    if (a && a.href && !a.href.includes('/api/proxy')) {
                        e.preventDefault();
                        const rawUrl = a.href;
                        const b64 = btoa(unescape(encodeURIComponent(rawUrl))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                        window.location.href = '/api/proxy?url=' + b64;
                    }
                }, true);

                // fetchなどの通信をプロキシ経由にする(簡易版)
                const _fetch = window.fetch;
                window.fetch = function(u, o) {
                    if (typeof u === 'string' && !u.includes('/api/proxy') && !u.startsWith('data:')) {
                        const b64 = btoa(unescape(encodeURIComponent(new URL(u, location.href).href))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                        u = '/api/proxy?url=' + b64;
                    }
                    return _fetch(u, o);
                };
                </script>
            `;
            html = html.replace('<head>', injector);
            html = html.replace(/<base[^>]*>/gi, '');

            return res.send(html);
        }

        // 画像などはそのまま流す
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error(error);
        res.status(500).send('Proxy Error (Stable Mode): ' + error.message);
    }
}
