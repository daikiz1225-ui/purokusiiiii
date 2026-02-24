import { decodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const targetUrl = decodeUrl(url);
        const targetObj = new URL(targetUrl);

        // アメリカのVercelからターゲットへ「そのまま」リクエスト
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': '*/*',
                'Referer': targetObj.origin + '/'
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);

        // HTMLなら、ベースURLだけ指定して「あとはブラウザ任せ」にする
        if (contentType.includes('text/html')) {
            let html = await response.text();
            // これだけで画像やCSSは自動的に正規の場所（game8.jp等）から読み込まれます
            // ※学校の制限がURL（game8.jp）にかかっている場合は、ここだけ修正が必要です。
            const baseTag = `<head><base href="${targetObj.origin}/">`;
            return res.send(html.replace('<head>', baseTag));
        }

        // 画像などはそのまま流す
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (e) {
        res.status(500).send(`Error: ${e.message}`);
    }
}
