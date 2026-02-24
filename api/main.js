import { decodeUrl, encodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const targetUrl = decodeUrl(url);
        const targetObj = new URL(targetUrl);

        // 1. オリジナルのリクエストを完全に模倣
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                'Accept': '*/*',
                'Accept-Language': 'ja-JP,ja;q=0.9',
                'Referer': targetObj.origin + '/'
            }
        });

        // 2. コンテンツタイプを引き継ぐ
        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);

        // 3. HTMLの場合だけ、ベースURLを１行だけ挿入（破壊を最小限に）
        if (contentType.includes('text/html')) {
            let html = await response.text();
            // リンクを書き換えず、ブラウザに「このページはGame8にあるんだよ」と思わせる
            const baseTag = `<head><base href="${targetObj.origin}/"><script>window.onerror=()=>true;</script>`;
            html = html.replace('<head>', baseTag);
            return res.send(html);
        }

        // 4. 画像・JS・CSSなどは、一切加工せずにそのまま流す（バイナリ転送）
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (e) {
        res.status(500).send(`Proxy Error: ${e.message}`);
    }
}
