export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        // Base64をデコードして元のURLを復元
        const decodedUrl = Buffer.from(url.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString();
        
        // ターゲットサイトへアクセス
        const response = await fetch(decodedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15' }
        });

        if (!response.ok) throw new Error(`Status: ${response.status}`);

        const data = await response.text();

        // サイトの中身を返す
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.status(200).send(data);
    } catch (e) {
        // エラー内容を表示（原因特定用）
        res.status(500).send(`Error: ${e.message}`);
    }
}
