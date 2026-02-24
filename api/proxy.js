export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        // 1. URL復元
        const decodedUrl = Buffer.from(url.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString();
        const targetUrl = new URL(decodedUrl);
        const origin = targetUrl.origin;
        const host = targetUrl.hostname;

        // 2. ターゲットサイトへのリクエスト（偽装ヘッダー）
        const response = await fetch(decodedUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': '*/*',
                'Referer': origin,
                'Origin': origin,
                'Cookie': req.headers.cookie || ''
            }
        });

        const contentType = response.headers.get('content-type') || '';
        
        // 3. 画像・フォントなどのバイナリデータ処理
        if (!contentType.includes('text') && !contentType.includes('javascript') && !contentType.includes('json')) {
            const arrayBuffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.status(200).send(Buffer.from(arrayBuffer));
        }

        // 4. テキスト（HTML/CSS/JS）の書き換え処理
        let body = await response.text();

        // HTMLの場合のみJSハックを挿入
        if (contentType.includes('text/html')) {
            const stealthScript = `
            <script>
                // ドメイン制限の回避
                try {
                    Object.defineProperty(document, 'domain', { get: () => '${host}' });
                } catch(e) {}
                window.onerror = () => true;
            </script>`;
            body = body.replace('<head>', `<head><base href="${origin}/">${stealthScript}`);
        }

        // あらゆる絶対パス（/から始まるもの）を固定
        body = body.replace(/(href|src|srcset|action)=["']\/(?!\/)/g, `$1="${origin}/`);
        body = body.replace(/url\(['"]?\/(?!\/)/g, `url("${origin}/`);

        // 5. 強力なセキュリティ解除ヘッダーの付与
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
        res.setHeader('X-Frame-Options', 'ALLOWALL');

        res.status(200).send(body);

    } catch (e) {
        res.status(500).send(`[Proxy Engine Error]: ${e.message}`);
    }
}
