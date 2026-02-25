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
                'Origin': targetObj.origin,
                'Cookie': req.headers.cookie || ''
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType.includes('text/html')) {
            let html = await response.text();

            const toProxyUrl = (link) => {
                if (!link || link.startsWith('data:') || link.startsWith('javascript:') || link.startsWith('#')) return link;
                try {
                    const abs = new URL(link, targetUrl).href;
                    const b64 = btoa(unescape(encodeURIComponent(abs))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return `/api/proxy?url=${b64}`;
                } catch (e) { return link; }
            };

            // 1. 基本の書き換え
            html = html.replace(/(href|src|data-src|action)=["']([^"']+)["']/gi, (m, attr, link) => `${attr}="${toProxyUrl(link)}"`);

            // 2. JavaScriptのジャンプ機能を「プロキシ化」する魔法
            const injector = `
                <head>
                <script>
                // URLをプロキシ用に変換する共通関数
                const p = (u) => {
                    if(!u || typeof u !== 'string' || u.includes('/api/proxy')) return u;
                    try {
                        const abs = new URL(u, location.href).href;
                        return '/api/proxy?url=' + btoa(unescape(encodeURIComponent(abs))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                    } catch(e) { return u; }
                };

                // window.open を横取り
                const _open = window.open;
                window.open = (u, n, f) => _open(p(u), n, f);

                // location.assign と replace を横取り
                const _assign = location.assign;
                location.assign = (u) => window.location.href = p(u);
                location.replace = (u) => window.location.href = p(u);

                // 全てのクリックを監視して、漏れがあればプロキシへ
                document.addEventListener('click', e => {
                    const a = e.target.closest('a');
                    if (a && a.href && !a.href.includes('/api/proxy')) {
                        e.preventDefault();
                        window.location.href = p(a.href);
                    }
                }, true);
                </script>
            `;
            html = html.replace('<head>', injector);
            html = html.replace(/<base[^>]*>/gi, '');

            return res.send(html);
        }

        // 画像などはストリーミング
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
