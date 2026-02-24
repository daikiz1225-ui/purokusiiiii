export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        // 1. URLの復元
        const decodedUrl = Buffer.from(url.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString();
        const targetUrl = new URL(decodedUrl);
        const origin = targetUrl.origin;

        // 2. ターゲットサイトの取得
        const response = await fetch(decodedUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Referer': origin
            }
        });

        let data = await response.text();

        // --- 強力な書き換え処理（レイアウト復旧用） ---

        // ① <head>の直後に <base> タグを挿入（相対パスの基準を強制固定）
        data = data.replace('<head>', `<head><base href="${origin}/">`);

        // ② HTML内の href="/..." や src="/..." を https://game8.jp/... のように絶対パスへ置換
        // ※ // で始まるものや http で始まるものは除外する正規表現
        data = data.replace(/(href|src|srcset|action)="\/(?!\/)/g, `$1="${origin}/`);

        // ③ CSS内（styleタグ）の url("/...") も絶対パスに置換
        data = data.replace(/url\(['"]?\/(?!\/)/g, `url("${origin}/`);

        // ④ セキュリティ制限（CSP）を解除し、外部のCSS/画像を強制的に許可する
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Access-Control-Allow-Origin', '*');

        res.status(200).send(data);
    } catch (e) {
        res.status(500).send(`レイアウト復旧エラー: ${e.message}`);
    }
}
