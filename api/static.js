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

        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        // CSSファイルの場合だけ、中身のURLをさらに書き換える
        if (contentType.includes('text/css')) {
            let cssText = await response.text();
            
            // CSS内の url(...) をすべてプロキシ経由に書き換え
            cssText = cssText.replace(/url\(["']?([^"')]+)["']?\)/g, (match, p1) => {
                let fullPath = p1;
                if (!p1.startsWith('http') && !p1.startsWith('data:')) {
                    // 相対パスを絶対パスに変換
                    fullPath = p1.startsWith('/') ? `${origin}${p1}` : `${targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1)}${p1}`;
                }
                
                if (fullPath.startsWith('http')) {
                    return `url("/asset/${encodeUrl(fullPath)}")`;
                }
                return match;
            });
            
            return res.send(cssText);
        }

        // 画像やフォントなどは、そのままバイナリデータとして送信
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (e) {
        res.status(500).send(`Asset Proxy Error: ${e.message}`);
    }
}
