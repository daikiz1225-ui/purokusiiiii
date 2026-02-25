export default async function handler(req, res) {
    const { url, mode, ...otherParams } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        let targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);
        
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': targetObj.origin + '/',
                'Cookie': req.headers.cookie || ''
            },
            redirect: 'follow'
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType.includes('text/html')) {
            let html = await response.text();

            const toProxy = (link) => {
                try {
                    const abs = new URL(link, targetUrl).href;
                    const b64 = Buffer.from(abs).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return `/api/proxy?url=${b64}&mode=${mode}`;
                } catch(e) { return link; }
            };

            // 1. 全モード共通: href, src, action の書き換え
            html = html.replace(/(href|src|action)=["']([^"']+)["']/gi, (m, attr, link) => {
                if (link.startsWith('#') || link.startsWith('javascript:')) return m;
                return `${attr}="${toProxy(link)}"`;
            });

            // 2. パワーモードのみ: スクリプト注入
            let injector = `
                <head>
                <script>
                const toP = (u) => {
                    if(!u || typeof u !== 'string' || u.includes('/api/proxy')) return u;
                    try {
                        const abs = new URL(u, location.href).href;
                        return '/api/proxy?url=' + btoa(unescape(encodeURIComponent(abs))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '') + '&mode=${mode}';
                    } catch(e) { return u; }
                };
            `;

            if (mode === 'power') {
                injector += `
                // JS遷移の横取り
                const _o = window.open; window.open = (u,n,f) => _o(toP(u),n,f);
                const _f = window.fetch; window.fetch = (u,o) => _f(toP(u),o);
                // locationプロパティの簡易監視
                setInterval(() => {
                    document.querySelectorAll('a').forEach(a => {
                        if(a.href && !a.href.includes('/api/proxy')) a.href = toP(a.href);
                    });
                }, 1000);
                `;
            }

            injector += `
                document.addEventListener('click', e => {
                    const a = e.target.closest('a');
                    if (a && a.href && !a.href.includes('/api/proxy')) {
                        e.preventDefault();
                        window.location.href = toP(a.href);
                    }
                }, true);
                </script>
            `;
            
            html = html.replace('<head>', injector);
            return res.send(html);
        }

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        res.status(500).send('Proxy Error: ' + error.message);
    }
}
