import { decodeUrl, encodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const targetUrl = decodeUrl(url);
        const targetObj = new URL(targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': '*/*',
                'Referer': targetObj.origin + '/'
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);

        // --- HTMLの加工（全てのリンクを自分経由に無理やり変える） ---
        if (contentType.includes('text/html')) {
            let html = await response.text();
            
            // 1. 全ての絶対パス(http...)を /asset/暗号 に変える
            html = html.replace(/(src|href|srcset)=["'](https?:\/\/[^"']+)["']/gi, (m, attr, link) => {
                const folder = (attr === 'href' && !link.includes('.css') && !link.includes('.js')) ? 'view' : 'asset';
                return `${attr}="/${folder}/${encodeUrl(link)}"`;
            });

            // 2. 全ての相対パス(/...)を /asset/暗号 に変える
            html = html.replace(/(src|href|srcset)=["']\/([^"']+)["']/gi, (m, attr, path) => {
                const fullUrl = targetObj.origin + '/' + path;
                const folder = (attr === 'href' && !path.includes('.css') && !path.includes('.js')) ? 'view' : 'asset';
                return `${attr}="/${folder}/${encodeUrl(fullUrl)}"`;
            });

            // 3. エラーで止まらないようにするおまじない
            const inject = `
                <head>
                <base href="${targetObj.origin}/">
                <script>
                    window.onerror = () => true; 
                    // 広告ブロック警告の要素を無理やり消すループ
                    setInterval(() => {
                        document.querySelectorAll('[class*="Modal"], [id*="report-error"], .ad-notice').forEach(el => el.remove());
                    }, 1000);
                </script>`;
            html = html.replace('<head>', inject);

            return res.send(html);
        }

        // --- CSSの加工（中身のURLも書き換える） ---
        if (contentType.includes('text/css')) {
            let css = await response.text();
            css = css.replace(/url\(["']?([^"')]+)["']?\)/g, (m, path) => {
                if (path.startsWith('data:')) return m;
                let full = path.startsWith('http') ? path : new URL(path, targetUrl).href;
                return `url("/asset/${encodeUrl(full)}")`;
            });
            return res.send(css);
        }

        // --- 画像・JSなどはそのまま流す ---
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (e) {
        res.status(500).send(`Stealth Error: ${e.message}`);
    }
}
