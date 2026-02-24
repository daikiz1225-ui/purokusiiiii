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
                'Referer': origin
            }
        });

        let data = await response.text();

        // --- 強力な書き換え処理 ---

        // 1. <head>の直後に <base> タグを挿入（これで相対パスの多くが解決する）
        data = data.replace('<head>', `<head><base href="${origin}/">`);

        // 2. HTML内の href="/..." や src="/..." を https://game8.jp/... に強制置換
        // ※「//」から始まるものや「http」から始まるものは除外
        data = data.replace(/(href|src|srcset|action)="\/(?!\/)/g, `$1="${origin}/`);

        // 3. インラインCSS内の url("/...") も置換
        data = data.replace(/url\(['"]?\/(?!\/)/g, `url("${origin}/`);

        // セキュリティ制限（CSP）を解除してCSSや画像を無理やり読み込ませる
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Access-Control-Allow-Origin', '*');

        res.status(200).send(data);
    } catch (e) {
        res.status(500).send(`レイアウト復旧失敗: ${e.message}`);
    }
}
