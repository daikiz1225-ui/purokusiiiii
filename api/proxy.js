export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        const targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': targetObj.origin + '/',
                'Origin': targetObj.origin,
                'Cookie': req.headers.cookie || ''
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType.includes('text/html')) {
            let html = await response.text();

            // 相対パスを絶対パスにしてからプロキシURLに変換する魔法の関数
            const toProxyUrl = (link) => {
                if (link.startsWith('data:') || link.startsWith('javascript:') || link.startsWith('#')) return link;
                try {
                    const absoluteUrl = new URL(link, targetUrl).href;
                    const encodedLink = Buffer.from(absoluteUrl).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return `/api/proxy?url=${encodedLink}`;
                } catch (e) {
                    return link;
                }
            };

            // href(リンク), src(画像), data-src(遅延読み込み画像) をすべてプロキシ経由に！
            html = html.replace(/(href|src|data-src)=["']([^"']+)["']/gi, (match, attr, link) => {
                return `${attr}="${toProxyUrl(link)}"`;
            });

            // srcset(複数サイズの画像指定) の書き換え (Game8対策)
            html = html.replace(/srcset=["']([^"']+)["']/gi, (match, links) => {
                const newLinks = links.split(',').map(part => {
                    const [imgUrl, size] = part.trim().split(/\s+/);
                    if (!imgUrl) return part;
                    return `${toProxyUrl(imgUrl)}${size ? ' ' + size : ''}`;
                }).join(', ');
                return `srcset="${newLinks}"`;
            });

            // プロキシの邪魔になるbaseタグを消す
            html = html.replace(/<base[^>]*>/gi, '');
            // エラー無視のおまじない
            html = html.replace('<head>', '<head><script>window.onerror=()=>true;</script>');

            return res.send(html);
        }

        // 画像などのデータはそのままiPadへ流す
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        res.status(500).send('Proxy Error: ' + error.message);
    }
}
