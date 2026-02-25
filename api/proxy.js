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
            }
        });

        let contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        // URL変換用の関数（サーバーサイド）
        const toProxy = (link) => {
            try {
                const abs = new URL(link, targetUrl).href;
                const b64 = Buffer.from(abs).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                return `/api/proxy?url=${b64}&mode=${mode}`;
            } catch(e) { return link; }
        };

        // HTMLまたはJavaScriptの場合、中身を書き換える
        if (contentType.includes('text/html') || contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
            let content = await response.text();

            if (mode === 'power') {
                // 【最強置換】スクリプト内の引用符に囲まれたURLっぽい文字列を強引に書き換える
                // 例: "stage1.html" -> "/api/proxy?url=..."
                content = content.replace(/(["'])(https?:\/\/[^"']+|(?:\/|\.\/)[^"']+\.(?:html|php|js|png|jpg))(["'])/gi, (m, q1, link, q2) => {
                    return `${q1}${toProxy(link)}${q2}`;
                });
            } else {
                // 通常モード: HTMLタグの属性のみ
                content = content.replace(/(href|src|action)=["']([^"']+)["']/gi, (m, attr, link) => {
                    if (link.startsWith('#') || link.startsWith('javascript:')) return m;
                    return `${attr}="${toProxy(link)}"`;
                });
            }

            // HTMLの場合のみ、追加のスクリプトを注入
            if (contentType.includes('text/html')) {
                const injector = `
                    <head>
                    <script>
                    // 予備：動的に生成される要素への対策
                    document.addEventListener('click', e => {
                        const a = e.target.closest('a');
                        if (a && a.href && !a.href.includes('/api/proxy')) {
                            e.preventDefault();
                            const b64 = btoa(unescape(encodeURIComponent(a.href))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                            window.location.href = '/api/proxy?url=' + b64 + '&mode=${mode}';
                        }
                    }, true);
                    </script>
                `;
                content = content.replace('<head>', injector);
            }

            return res.send(content);
        }

        // その他（画像など）
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        res.status(500).send('Proxy Error: ' + error.message);
    }
}
