import { decodeUrl, encodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('Asset URL missing');

    try {
        const targetUrl = decodeUrl(url);
        const origin = new URL(targetUrl).origin;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        // CSSの中身を書き換え
        if (contentType.includes('text/css')) {
            let cssText = await response.text();
            cssText = cssText.replace(/url\(["']?([^"')]+)["']?\)/g, (match, p1) => {
                if (p1.startsWith('data:')) return match;
                let fullPath = p1.startsWith('http') ? p1 : (p1.startsWith('/') ? origin + p1 : new URL(p1, targetUrl).href);
                return `url("/asset/${encodeUrl(fullPath)}")`;
            });
            return res.send(cssText);
        }

        // JSや画像などはそのまま転送（JSを消さないことで警告を回避）
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (e) {
        res.status(500).send(`Asset Error: ${e.message}`);
    }
}
