import { decodeUrl, encodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const targetUrl = decodeUrl(url);
        const origin = new URL(targetUrl).origin;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
            }
        });

        let html = await response.text();

        // 【新機能】強制的に警告を消すスタイルを注入
        const stealthStyle = `
            <style>
                /* 広告ブロック警告系の要素を根こそぎ非表示に */
                [class*="adblock"], [id*="adblock"], .ad-notice, .ad-permission-request {
                    display: none !important;
                }
                /* スクロール制限（overflow: hidden）を解除 */
                body, html {
                    overflow: auto !important;
                    position: static !important;
                }
            </style>
        `;
        html = html.replace('</head>', `${stealthStyle}</head>`);

        // リンク書き換え（/view/ 経由）
        html = html.replace(/(href)=["'](https?:\/\/[^"']+)["']/g, (m, p1, p2) => `${p1}="/view/${encodeUrl(p2)}"`);

        // アセット書き換え（/asset/ 経由）
        html = html.replace(/(src|srcset|data-src|href)=["']((https?:\/\/|\/)[^"']+\.(png|jpg|jpeg|gif|css|js|webp|svg)[^"']*)["']/gi, (m, p1, p2) => {
            let fullUrl = p2.startsWith('/') ? origin + p2 : p2;
            const isHtml = p1 === 'href' && !p2.includes('.css') && !p2.includes('.js');
            return `${p1}="/${isHtml ? 'view' : 'asset'}/${encodeUrl(fullUrl)}"`;
        });

        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.status(200).send(html);
    } catch (e) {
        res.status(500).send(`Error: ${e.message}`);
    }
}
