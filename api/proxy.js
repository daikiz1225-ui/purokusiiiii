export default async function handler(req, res) {
    const { url, ...otherParams } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        let targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);
        
        // クエリパラメータの復元
        Object.keys(otherParams).forEach(key => targetObj.searchParams.set(key, otherParams[key]));
        targetUrl = targetObj.href;

        // --- 3. X-Forwarded-For & ヘッダー管理 ---
        const forwardHeaders = {
            'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
            'Referer': targetObj.origin + '/',
            'Origin': targetObj.origin,
            'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            // --- 2. セッションとクッキー管理 ---
            'Cookie': req.headers.cookie || '' 
        };

        // フェッチ実行（リダイレクトを自動追跡せず、手動で処理する設定）
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            redirect: 'manual' 
        });

        // --- 1. & 4. リダイレクトと絶対URLの管理 ---
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
                const absLocation = new URL(location, targetUrl).href;
                const b64 = Buffer.from(absLocation).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                return res.redirect(`/api/proxy?url=${b64}`);
            }
        }

        // --- 2. Set-Cookie ヘッダーの転送 ---
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            res.setHeader('Set-Cookie', setCookie);
        }

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        // --- 4. CORSヘッダーの設定 ---
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        if (contentType.includes('text/html')) {
            let html = await response.text();

            const toProxy = (link) => {
                try {
                    const abs = new URL(link, targetUrl).href;
                    const b64 = Buffer.from(abs).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return `/api/proxy?url=${b64}`;
                } catch(e) { return link; }
            };

            // HTML内のリンク・フォーム・スクリプトの書き換え
            html = html.replace(/(href|src|action)=["']([^"']+)["']/gi, (m, attr, link) => {
                if (link.startsWith('#') || link.startsWith('javascript:')) return m;
                return `${attr}="${toProxy(link)}"`;
            });

            // クライアントサイドでの404防止スクリプト
            const injector = `
                <head>
                <script>
                // リンククリックの絶対URL化
                document.addEventListener('click', e => {
                    const a = e.target.closest('a');
                    if (a && a.href && !a.href.includes('/api/proxy')) {
                        e.preventDefault();
                        const b64 = btoa(unescape(encodeURIComponent(a.href))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                        window.location.href = '/api/proxy?url=' + b64;
                    }
                }, true);
                </script>
            `;
            html = html.replace('<head>', injector);
            return res.send(html);
        }

        // 画像・バイナリデータの転送
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        // --- 5. ログとデバッグ ---
        console.error('Proxy Debug:', error);
        res.status(500).send('Proxy Error (Debug Mode): ' + error.message);
    }
}
