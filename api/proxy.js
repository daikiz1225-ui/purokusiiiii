export default async function handler(req, res) {
    const { url, ...otherParams } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        let targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');

        // URLに検索ワードなどを結合
        const targetObj = new URL(targetUrl);
        Object.keys(otherParams).forEach(key => {
            targetObj.searchParams.set(key, otherParams[key]);
        });
        targetUrl = targetObj.href;

        const response = await fetch(targetUrl, {
            method: req.method,
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

            const toProxyUrl = (link) => {
                if (!link || link.startsWith('data:') || link.startsWith('javascript:') || link.startsWith('#')) return link;
                try {
                    const absoluteUrl = new URL(link, targetUrl).href;
                    const encodedLink = btoa(unescape(encodeURIComponent(absoluteUrl))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    return `/api/proxy?url=${encodedLink}`;
                } catch (e) { return link; }
            };

            html = html.replace(/(href|src|data-src|action)=["']([^"']+)["']/gi, (m, attr, link) => `${attr}="${toProxyUrl(link)}"`);

            // 【重要】検索ボタンが押された時の挙動を修正
            const injector = `
                <head>
                <script>
                document.addEventListener('submit', e => {
                    const form = e.target;
                    // GET送信（検索など）の場合
                    if (form.method.toLowerCase() === 'get') {
                        e.preventDefault();
                        const formData = new FormData(form);
                        const params = new URLSearchParams(formData);
                        
                        // 現在のプロキシURL（Base64部分）を維持しつつ、検索パラメータを合体
                        const currentUrl = new URL(window.location.href);
                        const baseUrl = currentUrl.origin + currentUrl.pathname;
                        const proxyUrlKey = currentUrl.searchParams.get('url');
                        
                        window.location.href = baseUrl + '?url=' + proxyUrlKey + '&' + params.toString();
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
        res.status(500).send('Proxy Error: ' + error.message);
    }
}
