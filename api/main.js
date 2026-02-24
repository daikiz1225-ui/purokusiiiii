import { decodeUrl, encodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL is required');

    try {
        const targetUrl = decodeUrl(url);
        const origin = new URL(targetUrl).origin;

        // アメリカのサーバーからターゲットサイトへリクエスト
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
            }
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        
        let html = await response.text();

        // 1. リンク (href) の書き換え -> /view/暗号化URL へ
        html = html.replace(/(href)=["'](https?:\/\/[^"']+)["']/g, (m, p1, p2) => {
            return `${p1}="/view/${encodeUrl(p2)}"`;
        });

        // 2. 画像やCSS (src/href) の書き換え -> /asset/暗号化URL へ
        // ※画像などは /api/static.js に担当させる
        html = html.replace(/(src|srcset|data-src)=["'](https?:\/\/[^"']+)["']/g, (m, p1, p2) => {
            return `${p1}="/asset/${encodeUrl(p2)}"`;
        });

        // 3. 相対パス ( / から始まるパス ) の解決と書き換え
        html = html.replace(/(src|href|srcset)=["']\/(?!\/)([^"']+)["']/g, (m, p1, p2) => {
            const absolute = `${origin}/${p2}`;
            const folder = (p1 === 'href' && !p2.endsWith('.css')) ? 'view' : 'asset';
            return `${p1}="/${folder}/${encodeUrl(absolute)}"`;
        });

        // 4. <head> の先頭にベースタグを挿入（念のための保険）
        html = html.replace('<head>', `<head><base href="${origin}/">`);

        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.status(200).send(html);

    } catch (e) {
        res.status(500).send(`Proxy Error: ${e.message}`);
    }
}
