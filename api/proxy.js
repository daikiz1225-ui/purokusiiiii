export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const decodedUrl = Buffer.from(url.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString();
        const targetUrl = new URL(decodedUrl);
        const origin = targetUrl.origin;
        const host = targetUrl.hostname;

        // リクエストヘッダーをターゲットサイトに完全に合わせる
        const forwardHeaders = {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': req.headers['accept'] || '*/*',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Referer': origin + '/',
            'Origin': origin,
            'Cookie': req.headers.cookie || ''
        };

        const response = await fetch(decodedUrl, {
            method: req.method,
            headers: forwardHeaders,
            redirect: 'follow'
        });

        const contentType = response.headers.get('content-type') || '';
        
        // 画像、フォント、その他のバイナリデータ
        if (!contentType.includes('text') && !contentType.includes('javascript')) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.status(200).send(Buffer.from(buffer));
        }

        let body = await response.text();

        // --- 強力な書き換えロジック ---

        if (contentType.includes('text/html')) {
            // 1. <head>の最上部に最強のハックを注入
            const ultraStealth = `
            <head>
            <base href="${origin}/">
            <script>
                // 実行環境の偽装
                try {
                    Object.defineProperty(document, 'domain', { get: () => '${host}' });
                    Object.defineProperty(window, 'location', { 
                        value: new Proxy(window.location, {
                            get: (target, prop) => prop === 'host' ? '${host}' : target[prop]
                        })
                    });
                } catch(e) {}
                // エラーでデザイン停止するのを防ぐ
                window.onerror = () => true;
                console.warn = () => {};
            </script>`;
            body = body.replace('<head>', ultraStealth);
        }

        // 2. CSS/JS/画像のパスを全て「絶対URL」に置換（正規表現を強化）
        // 引用符あり/なしの両方に対応
        body = body.replace(/(href|src|srcset|action)=["']?\/(?!\/)([^"'>\s]+)["']?/g, `$1="${origin}/$2"`);
        
        // 3. CSS内のurl()を置換
        body = body.replace(/url\(['"]?\/(?!\/)([^'"]+)?['"]?\)/g, `url("${origin}/$1")`);

        // 4. セキュリティ解除（ブラウザのブロックを無理やり外す）
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; style-src * 'unsafe-inline';");
        res.setHeader('X-Frame-Options', 'ALLOWALL');

        res.status(200).send(body);

    } catch (e) {
        res.status(500).send(`[Ultimate Engine Error]: ${e.message}`);
    }
}
