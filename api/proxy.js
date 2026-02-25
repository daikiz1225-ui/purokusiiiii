export default async function handler(req, res) {
    const { url, ...otherParams } = req.query; // 'url'以外の検索パラメータ(q=など)を取得
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        let targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');

        // 検索ワードなどの追加パラメータをURLに復元して結合する
        const targetObj = new URL(targetUrl);
        Object.keys(otherParams).forEach(key => {
            targetObj.searchParams.append(key, otherParams[key]);
        });
        targetUrl = targetObj.href;

        const response = await fetch(targetUrl, {
            method: req.method, // POST検索などにも対応
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': targetObj.origin + '/',
                'Origin': targetObj.origin,
                'Cookie': req.headers.cookie || ''
            },
            // POST送信の場合はボディも送る（高度な検索用）
            body: req.method === 'POST' ? JSON.stringify(req.body) : undefined
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType.includes('text/html')) {
            let html = await response.text();

            const toProxyUrl = (link) => {
                if (!link || link.startsWith('data:') || link.startsWith('javascript:') || link.startsWith('#')) return link;
                try {
                    const absoluteUrl = new URL(link, targetUrl).href;
                    const encodedLink = Buffer.from(absoluteUrl).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return `/api/proxy?url=${encodedLink}`;
                } catch (e) { return link; }
            };

            // HTML内の書き換えロジック
            html = html.replace(/(href|src|data-src|action)=["']([^"']+)["']/gi, (match, attr, link) => {
                return `${attr}="${toProxyUrl(link)}"`;
            });

            // リンク横取りスクリプト（検索ボタンの挙動をサポート）
            const injector = `
                <head>
                <script>
                document.addEventListener('submit', e => {
                    const form = e.target;
                    if (form.method.toLowerCase() === 'get' && !form.action.includes('/api/proxy')) {
                        e.preventDefault();
                        const formData = new FormData(form);
                        const params = new URLSearchParams(formData);
                        const target = new URL(form.action, window.location.href);
                        // 元のURLをベースに検索ワードを合体させてからプロキシへ
                        window.location.href = form.action + (form.action.includes('?') ? '&' : '?') + params.toString();
                    }
                }, true);
                window.onerror = () => true;
                </script>
            `;
            html = html.replace('<head>', injector);
            html = html.replace(/<base[^>]*>/gi, '');

            return res.send(html);
        }

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        res.status(500).send('Proxy Search Error: ' + error.message);
    }
}
