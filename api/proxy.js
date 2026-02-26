const http = require('http');
const https = require('https');
const url = require('url');

module.exports = async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const queryUrl = parsedUrl.query.url;

    // 1. 入力画面
    if (!queryUrl) {
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        return res.status(200).send(`
            <body style="background:#121212; color:white; text-align:center; padding-top:100px; font-family:sans-serif;">
                <h1>🌐 Anti-Block Proxy</h1>
                <input type="text" id="target" placeholder="example.com" style="width:60%; padding:15px; border-radius:30px;">
                <button onclick="go()" style="padding:15px 30px; border-radius:30px; background:#0055ff; color:white; border:none; cursor:pointer;">Go</button>
                <script>
                    function go() {
                        const val = document.getElementById('target').value;
                        if(!val) return;
                        let targetUrl = val.startsWith('http') ? val : 'https://' + val;
                        window.location.href = '/api/proxy?url=' + btoa(encodeURIComponent(targetUrl));
                    }
                </script>
            </body>
        `);
    }

    // 2. プロキシ実行
    try {
        const targetFullUrl = decodeURIComponent(Buffer.from(queryUrl, 'base64').toString('utf-8'));
        const target = url.parse(targetFullUrl);
        const baseUrl = target.protocol + '//' + target.hostname;

        const options = {
            protocol: target.protocol,
            hostname: target.hostname,
            path: target.path || '/',
            method: req.method,
            headers: {
                ...req.headers,
                'host': target.hostname,
                'referer': baseUrl,
                'accept-encoding': 'identity' 
            }
        };

        const requestLib = target.protocol === 'https:' ? https : http;

        const proxyReq = requestLib.request(options, (proxyRes) => {
            let body = [];
            proxyRes.on('data', (chunk) => body.push(chunk));
            proxyRes.on('end', () => {
                let data = Buffer.concat(body);
                const contentType = proxyRes.headers['content-type'] || '';

                // HTMLの場合のみ、中身のリンクを書き換える
                if (contentType.includes('text/html')) {
                    let html = data.toString();
                    
                    // 【魔法の書き換えロジック】
                    // src="..." や href="..." を見つけて、プロキシURLに変換する
                    html = html.replace(/(href|src)="(https?:\/\/[^"]+)"/g, (match, p1, p2) => {
                        const encoded = Buffer.from(encodeURIComponent(p2)).toString('base64');
                        return `${p1}="/api/proxy?url=${encoded}"`;
                    });

                    // 相対パス（/style.css など）を絶対パスに直してプロキシを通す
                    html = html.replace(/(href|src)="\/([^"]+)"/g, (match, p1, p2) => {
                        const fullUrl = baseUrl + '/' + p2;
                        const encoded = Buffer.from(encodeURIComponent(fullUrl)).toString('base64');
                        return `${p1}="/api/proxy?url=${encoded}"`;
                    });

                    data = Buffer.from(html);
                }

                const headers = { ...proxyRes.headers };
                delete headers['content-security-policy'];
                delete headers['x-frame-options'];
                delete headers['content-length'];

                res.writeHead(proxyRes.statusCode, headers);
                res.end(data);
            });
        });

        proxyReq.on('error', (e) => res.status(500).send("Error: " + e.message));
        req.pipe(proxyReq);

    } catch (e) {
        res.status(400).send("Invalid URL");
    }
};
