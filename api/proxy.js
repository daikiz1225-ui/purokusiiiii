export default async function handler(req, res) {
    const { url, mode } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        const targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': req.headers['user-agent'],
                'Accept': req.headers['accept'],
                'Referer': targetObj.origin + '/'
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        // JSファイルそのものをプロキシ化する（ここがCroxy流）
        if (contentType.includes('javascript')) {
            let js = await response.text();
            // location.href などの直接参照を書き換え
            js = js.replace(/location\.href/g, 'p_loc.href');
            js = js.replace(/location\.replace/g, 'p_loc.replace');
            return res.send(js);
        }

        if (!contentType.includes('text/html')) {
            const buffer = await response.arrayBuffer();
            return res.send(Buffer.from(buffer));
        }

        let html = await response.text();

        // 究極の偽装スクリプト（HTMLの最上部に注入）
        const croxyShield = `
            <script>
            (function() {
                const targetOrigin = "${targetObj.origin}";
                const targetUrl = "${targetUrl}";
                const mode = "${mode || 'normal'}";

                // URL変換の核
                const wrap = (u) => {
                    if(!u || typeof u !== 'string' || u.startsWith('data:') || u.startsWith('blob:') || u.includes('/api/proxy')) return u;
                    try {
                        const abs = new URL(u, targetUrl).href;
                        return '/api/proxy?url=' + btoa(unescape(encodeURIComponent(abs))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '') + '&mode=' + mode;
                    } catch(e) { return u; }
                };

                // window.location の完全な偽装
                window.p_loc = new Proxy(window.location, {
                    get: (t, p) => (p === 'href') ? targetUrl : t[p],
                    set: (t, p, v) => { if(p === 'href') window.location.href = wrap(v); return true; }
                });

                // Fetch & XHR
                const _f = window.fetch;
                window.fetch = (u, o) => _f(wrap(u), o);
                const _o = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(m, u) { return _o.apply(this, [m, wrap(u)]); };

                // リンクの強制キャッチ
                document.addEventListener('click', e => {
                    const a = e.target.closest('a');
                    if (a && a.href) {
                        e.preventDefault();
                        window.location.href = wrap(a.getAttribute('href'));
                    }
                }, true);
            })();
            </script>
        `;

        // 物理的な置換
        html = html.replace(/(href|src|action)=["']([^"']+)["']/gi, (m, attr, link) => {
            if (link.startsWith('#') || link.startsWith('javascript:')) return m;
            // 相対パスを壊さないように慎重に変換
            return \`\${attr}="\${wrap(link)}"\`;
        });

        html = html.replace('<head>', '<head>' + croxyShield);
        return res.send(html);

    } catch (error) {
        res.status(500).send('Croxy-Mode Error: ' + error.message);
    }
}
