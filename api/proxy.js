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

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType.includes('text/html')) {
            let html = await response.text();

            // URL変換用の関数を共通化してHTMLのトップに仕込む
            const injector = `
                <head>
                <script>
                (function() {
                    const targetBase = "${targetObj.origin}";
                    const currentTargetUrl = "${targetUrl}";

                    const toProxy = (u) => {
                        if (!u || typeof u !== 'string' || u.startsWith('data:') || u.startsWith('javascript:') || u.includes('/api/proxy')) return u;
                        try {
                            const abs = new URL(u, currentTargetUrl).href;
                            return '/api/proxy?url=' + btoa(unescape(encodeURIComponent(abs))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                        } catch(e) { return u; }
                    };

                    // JavaScriptによるURL移動をすべてプロキシ経由に強制
                    const originalLocation = window.location.href;
                    Object.defineProperty(window, 'location', {
                        configurable: true,
                        enumerable: true,
                        get: () => window.document.location,
                        set: (v) => { window.document.location.href = toProxy(v); }
                    });

                    // リンク、フォーム送信の横取り
                    document.addEventListener('click', e => {
                        const a = e.target.closest('a');
                        if (a && a.href) {
                            e.preventDefault();
                            window.top.location.href = toProxy(a.href);
                        }
                    }, true);

                    document.addEventListener('submit', e => {
                        const f = e.target;
                        if (f.method.toLowerCase() === 'get') {
                            e.preventDefault();
                            const params = new URLSearchParams(new FormData(f)).toString();
                            window.location.href = toProxy(f.action + (f.action.includes('?') ? '&' : '?') + params);
                        }
                    }, true);

                    // XMLHttpRequestとFetchの横取り（ゲームのデータ通信用）
                    const _open = XMLHttpRequest.prototype.open;
                    XMLHttpRequest.prototype.open = function(m, u) { return _open.apply(this, [m, toProxy(u)]); };
                    
                    const _fetch = window.fetch;
                    window.fetch = (u, o) => _fetch(toProxy(u), o);
                })();
                </script>
            `;
            
            // HTML内の物理的なリンクも書き換える
            const toProxyUrl = (link) => {
                try {
                    const abs = new URL(link, targetUrl).href;
                    return '/api/proxy?url=' + btoa(unescape(encodeURIComponent(abs))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                } catch(e) { return link; }
            };
            
            html = html.replace(/(href|src|action)=["']([^"']+)["']/gi, (m, attr, link) => {
                if(link.startsWith('#') || link.startsWith('javascript:')) return m;
                return \`\${attr}="\${toProxyUrl(link)}"\`;
            });

            html = html.replace('<head>', injector);
            return res.send(html);
        }

        // バイナリデータ（画像など）はストリーム
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
