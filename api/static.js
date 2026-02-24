import { decodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('Asset URL is required');

    try {
        const targetUrl = decodeUrl(url);

        // アメリカのサーバーから画像やCSSを「生データ」として取得
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
            }
        });

        if (!response.ok) throw new Error(`Asset fetch failed: ${response.status}`);

        // 相手サイトのファイル形式（image/png, text/css等）をそのまま引き継ぐ
        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        // キャッシュ設定（一度読み込んだ画像などはiPadに保存させて速くする）
        res.setHeader('Cache-Control', 'public, max-age=86400');

        // データを「バッファ（生データ）」として取り出して送信
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (e) {
        // エラー時は透明な1x1ピクセルの画像を返すか、エラーを出す
        res.status(500).send(`Asset Error: ${e.message}`);
    }
}
