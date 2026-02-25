export default async function handler(req, res) {
    const { url, mode, ...otherParams } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        let targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);
        
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': req.headers['user-agent'], // iPadのUAをそのまま通す
                'Accept': req.headers['accept'],
                'Accept-Language': req.headers['accept-language'],
                'Referer': targetObj.origin + '/',
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        // HTML以外（JS本体など）は一切書き換えずにそのまま返す（ブロック回避）
        if (!contentType.includes('text/html')) {
            const buffer = await response.arrayBuffer();
            return res.send(Buffer.from(buffer));
        }

        // HTMLの場合のみ、通信の「仕組み」を差し替える隠密スクリプトを注入
        let html = await response.text();
        
        const injector = `
            <head>
            <script>
            (function() {
                const P_URL = (u) => {
                    if(!u || typeof u !== 'string' || u.startsWith('data:') || u.includes('/api/proxy')) return u;
                    try {
                        const abs = new URL(u, "${targetUrl}").href;
                        return '/api/proxy?url=' + btoa(unescape(encodeURIComponent(abs))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '') + '&mode=${mode}';
                    } catch(e) { return u; }
                };

                // 1. Fetchの偽装
                const _f = window.fetch;
                window.fetch = function(u, o) { return _f(P_URL(u), o); };

                // 2. XMLHttpRequestの偽装
                const _o = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(m, u, a, r, p) {
                    return _o.apply(this, [m, P_URL(u), a, r, p]);
                };

                // 3. ビーコンや画像生成の偽装
                const _I = window.Image;
                window.Image = function() {
                    const i = new _I();
                    const setter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
                    Object.defineProperty(i, 'src', { set: function(v) { setter.call(this, P_URL(v)); } });
                    return i;
                };

                // 4. クリックによる遷移の強制プロキシ化
                document.addEventListener('click', e => {
                    const a = e.target.closest('a');
                    if (a && a.href && !a.href.includes('/api/proxy')) {
                        e.preventDefault();
                        window.location.href = P_URL(a.href);
                    }
                }, true);
            })();
            </script>
        `;

        // 物理的なタグの書き換えも、botがチェックしにくい「href」と「src」だけに限定
        html = html.replace(/(href|src)=["']([^"']+)["']/gi, (m, attr, link) => {
            if (link.startsWith('http') || link.startsWith('/') || link.startsWith('./')) {
                // ここでURL変換
                const abs = new URL(link, "${targetUrl}").href;
                const b64 = Buffer.from(abs).toString('base64').replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                return \`\${attr}="/api/proxy?url=\${b64}&mode=${mode}"\`;
            }
            return m;
        });

        html = html.replace('<head>', injector);
        res.send(html);

    } catch (error) {
        res.status(500).send('Proxy Stealth Error: ' + error.message);
    }
}
