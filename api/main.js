import { decodeUrl, encodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const targetUrl = decodeUrl(url);
        const origin = new URL(targetUrl).origin;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'ja-JP,ja;q=0.9'
            }
        });

        let html = await response.text();

        // 【強化】警告画面を強制非表示にするスタイル
        const stealthStyle = `
            <style>
                /* 白い警告ボックスと背景のグレーアウトを抹消 */
                div[class*="Modal"], div[class*="Overlay"], [id*="report-error"], .ad-notice {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
                body {
                    overflow: auto !important;
                    position: static !important;
                }
            </style>
        `;
        html = html.replace('</head>', `${stealthStyle}</head>`);

        // URL置換ロジック
        html = html.replace(/(href)=["'](https?:\/\/[^"']+)["']/g, (m, p1, p2) => `${p1}="/view/${encodeUrl(p2)}"`);
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
