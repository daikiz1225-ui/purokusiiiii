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

        // 【強化】もしエラー(404等)でも、空のJS/CSSを返してエラーを回避
        if (!response.ok) {
            if (targetUrl.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
                return res.status(200).send('console.log("Ad script bypassed");');
            }
            if (targetUrl.endsWith('.css')) {
                res.setHeader('Content-Type', 'text/css');
                return res.status(200).send('/* Bypassed */');
            }
            throw new Error('Not found');
        }

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);

        if (contentType.includes('text/css')) {
            let cssText = await response.text();
            cssText = cssText.replace(/url\(["']?([^"')]+)["']?\)/g, (match, p1) => {
                if (p1.startsWith('data:')) return match;
                let fullPath = p1.startsWith('http') ? p1 : (p1.startsWith('/') ? origin + p1 : new URL(p1, targetUrl).href);
                return `url("/asset/${encodeUrl(fullPath)}")`;
            });
            return res.send(cssText);
        }

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (e) {
        // 全てのエラーを「正常な空データ」にすり替える
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(''); 
    }
}
