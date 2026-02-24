export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        // 1. URLの復元
        const decodedUrl = Buffer.from(url.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString();
        const targetOrigin = new URL(decodedUrl).origin;

        // 2. ターゲットサイトの取得
        const response = await fetch(decodedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15' }
        });
        let data = await response.text();

        // 3. パスの書き換え (CSSや画像が壊れるのを防ぐ)
        // src="/..." や href="/..." を src="https://site.com/..." に置換
        data = data.replace(/(src|href|action)="\/(?!\/)/g, `$1="${targetOrigin}/`);
        
        // 4. <head> の直後に <base> タグも念のため挿入
        data = data.replace('<head>', `<head><base href="${targetOrigin}/">`);

        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.status(200).send(data);
    } catch (e) {
        res.status(500).send(`Proxy Error: ${e.message}`);
    }
}
