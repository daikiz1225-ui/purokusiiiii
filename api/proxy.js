export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        // 1. URL復元と情報の取得
        const decodedUrl = Buffer.from(url.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString();
        const targetUrl = new URL(decodedUrl);
        const origin = targetUrl.origin;
        const host = targetUrl.hostname;

        // 2. ターゲットサイトへのリクエスト（ヘッダー偽装を強化）
        const response = await fetch(decodedUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': '*/*',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Referer': origin,
                'Origin': origin,
                'Cookie': req.headers.cookie || ''
            }
        });

        const contentType = response.headers.get('content-type') || '';
        
        // 3. バイナリデータ（画像など）の場合はそのまま流す
        if (!contentType.includes('text') && !contentType.includes('javascript') && !contentType.includes('json')) {
            const arrayBuffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.status(200).send(Buffer.from(arrayBuffer));
        }

        // 4. テキストデータ（HTML/CSS/JS）の書き換え処理
        let body = await response.text();

        // --- 全URLの絶対パス化とプロキシ経由化 ---
        
        // HTML/CSS内の「/」から始まるパスを「現在のドメイン/view/Base64(絶対パス)」に変換するのが理想ですが、
        // 処理を確実にするため、まずは全てのパスを「絶対パス」に固定します。
        
        // baseタグの挿入（最優先）
        if (contentType.includes('text/html')) {
            body = body.replace('<head>', `<head><base href="${origin}/"><script>
                // JSによるドメインチェックの無効化
                window.onerror = () => true;
                Object.defineProperty(document, 'domain', { get: () => '${host}' });
                const originalFetch = window.fetch;
                window.fetch = (...args) => {
                    console.log('Intercepted fetch');
                    return originalFetch(...args);
                };
            </script>`);
        }

        // href/src/srcsetの全置換
        body = body.replace(/(href|src|srcset|action)=["']\/(?!\/)/g, `$1="${origin}/`);
        
        // CSS内の url(/...) の全置換
        body = body.replace(/url\(['"]?\/(?!\/)/g, `url("${origin}/`);

        // 5. レスポンスの返却
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        
        // セキュリティ制限の解除
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
        res.setHeader('X-Frame-Options', 'ALLOWALL');

        res.status(200).send(body);

    } catch (e) {
        res.status(500).send(`[Proxy Engine Error]: ${e.message}`);
    }
}
