export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const decodedUrl = Buffer.from(url.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString();
        const targetUrl = new URL(decodedUrl);
        const origin = targetUrl.origin;

        const response = await fetch(decodedUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Referer': origin,
                'Cookie': req.headers.cookie || '' // ユーザーのCookieを転送
            }
        });

        let data = await response.text();

        // 1. 基本のパス書き換え
        data = data.replace('<head>', `<head><base href="${origin}/">`);
        data = data.replace(/(href|src|srcset|action)="\/(?!\/)/g, `$1="${origin}/`);

        // 2. JavaScriptによるブロックを回避するための「ダミーオブジェクト」挿入
        const antiBlockScript = `
        <script>
            // ドメインチェックを回避するハック
            Object.defineProperty(document, 'domain', { get: () => '${targetUrl.hostname}' });
            // エラーで止まらないようにする
            window.onerror = () => true;
        </script>`;
        data = data.replace('<head>', `<head>${antiBlockScript}`);

        // 3. セキュリティヘッダーを極限まで緩める
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');

        res.status(200).send(data);
    } catch (e) {
        res.status(500).send(`Critical Error: ${e.message}`);
    }
}
