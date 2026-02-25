export default async function handler(req, res) {
    const { url, mode } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        // 1. URLのデコード
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        const targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');

        // 2. ターゲットへリクエスト（ヘッダーは最低限にしてエラーを防ぐ）
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': '*/*',
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        // 3. HTML以外（画像、JS、CSSなど）は中身をいじらず即座に返す
        if (!contentType.includes('text/html')) {
            const buffer = await response.arrayBuffer();
            return res.send(Buffer.from(buffer));
        }

        // 4. HTMLの場合だけ、リンクを殺さないためのスクリプトを「末尾」に足す
        let html = await response.text();
        
        const injector = `
            <script>
            (function() {
                const mode = "${mode || 'normal'}";
                const toP = (u) => {
                    if(!u || typeof u !== 'string' || u.startsWith('data:') || u.includes('/api/proxy')) return u;
                    try {
                        const abs = new URL(u, window.location.href).href;
                        return '/api/proxy?url=' + btoa(unescape(encodeURIComponent(abs))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '') + '&mode=' + mode;
                    } catch(e) { return u; }
                };

                // リンククリックを全てプロキシへ（非破壊）
                document.addEventListener('click', e => {
                    const a = e.target.closest('a');
                    if (a && a.href) {
                        e.preventDefault();
                        window.location.href = toP(a.href);
                    }
                }, true);

                // パワーモードならFetchも監視
                if (mode === 'power') {
                    const _f = window.fetch;
                    window.fetch = (u, o) => _f(toP(u), o);
                }
            })();
            </script>
        `;

        // </body>の直前に差し込む（一番安全な場所）
        html = html.replace('</body>', injector + '</body>');
        
        return res.send(html);

    } catch (error) {
        // エラー内容を画面に出してデバッグしやすくする
        res.status(500).send('Proxy Logic Error: ' + error.message);
    }
}
