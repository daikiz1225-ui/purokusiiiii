const http = require('http');
const https = require('https');
const url = require('url');

// Vercel用のエクスポート形式（ここが大事！）
module.exports = async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // 1. /api/proxy (引数なし) にアクセスした時はHTMLを返す
    if (!parsedUrl.query.url) {
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.status(200).send(`
            <body style="background:#121212; color:white; text-align:center; padding-top:100px; font-family:sans-serif;">
                <h1>Vercel Node Proxy</h1>
                <input type="text" id="target" placeholder="https://example.com" style="width:60%; padding:15px; border-radius:30px;">
                <button onclick="go()" style="padding:15px 30px; border-radius:30px; background:#0055ff; color:white; border:none; cursor:pointer;">Go</button>
                <script>
                    function go() {
                        const val = document.getElementById('target').value;
                        if(!val) return;
                        let targetUrl = val.startsWith('http') ? val : 'https://' + val;
                        // Vercelの場合、自分自身のパスを指定する
                        location.href = '/api/proxy?url=' + btoa(encodeURIComponent(targetUrl));
                    }
                </script>
            </body>
        `);
        return;
    }

    // 2. プロキシ実行ロジック
    try {
        const targetFullUrl = decodeURIComponent(Buffer.from(parsedUrl.query.url, 'base64').toString('utf-8'));
        const target = url.parse(targetFullUrl);
        const targetPath = target.path || '/';

        const options = {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: targetPath,
            method: req.method,
            headers: {
                ...req.headers,
                'host': target.hostname,
                'referer': target.protocol + '//' + target.hostname + '/',
                'accept-encoding': 'identity'
            }
        };

        const requestLib = target.protocol === 'https:' ? https : http;

        const proxyReq = requestLib.request(options, (proxyRes) => {
            // セキュリティヘッダーを削除
            const headers = { ...proxyRes.headers };
            delete headers['content-security-policy'];
            delete headers['x-frame-options'];
            
            res.writeHead(proxyRes.statusCode, headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (e) => res.status(500).send("Proxy Error: " + e.message));
        req.pipe(proxyReq);

    } catch (e) {
        res.status(400).send("Invalid URL");
    }
};
