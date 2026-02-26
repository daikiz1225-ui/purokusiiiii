const http = require('http');
const https = require('https');
const url = require('url');

// サーバー作成
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // 1. トップ画面 (URL入力フォーム)
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Node Proxy Server</title>
                <style>
                    body { background: #121212; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .box { background: #1e1e1e; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; width: 90%; max-width: 500px; }
                    input { width: 80%; padding: 12px; border-radius: 25px; border: none; outline: none; margin-bottom: 20px; font-size: 16px; }
                    button { background: #0055ff; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: bold; }
                    button:hover { background: #0044cc; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>Node Proxy</h1>
                    <input type="text" id="target" placeholder="https://example.com" spellcheck="false">
                    <br>
                    <button onclick="go()">サイトへ移動</button>
                </div>
                <script>
                    function go() {
                        const val = document.getElementById('target').value;
                        if(!val) return;
                        let targetUrl = val.startsWith('http') ? val : 'https://' + val;
                        // URLをBase64に変換してサーバーに送る
                        location.href = '/proxy?url=' + btoa(encodeURIComponent(targetUrl));
                    }
                    document.getElementById('target').onkeydown = (e) => { if(e.key === 'Enter') go(); };
                </script>
            </body>
            </html>
        `);
        return;
    }

    // 2. プロキシ実行ロジック
    if (parsedUrl.pathname === '/proxy' && parsedUrl.query.url) {
        try {
            // Base64をデコードして元のURLに戻す
            const targetFullUrl = decodeURIComponent(Buffer.from(parsedUrl.query.url, 'base64').toString('utf-8'));
            const target = url.parse(targetFullUrl);

            // 404対策: ターゲットのパスが空なら '/' をセット
            const targetPath = target.path || '/';

            const options = {
                protocol: target.protocol,
                hostname: target.hostname,
                port: target.port || (target.protocol === 'https:' ? 443 : 80),
                path: targetPath,
                method: req.method,
                headers: {
                    ...req.headers,
                    'host': target.hostname, // 404/403回避に必須
                    'referer': target.protocol + '//' + target.hostname + '/',
                    'accept-encoding': 'identity' // 圧縮されると加工しにくいので非圧縮を要求
                }
            };

            // HTTPSかHTTPか自動判別
            const requestLib = target.protocol === 'https:' ? https : http;

            const proxyReq = requestLib.request(options, (proxyRes) => {
                // セキュリティヘッダーを削除して、自分のサーバーでも表示できるようにする
                const headers = { ...proxyRes.headers };
                delete headers['content-security-policy'];
                delete headers['x-frame-options'];
                delete headers['content-length']; // 加工するので一度消す

                res.writeHead(proxyRes.statusCode, headers);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (e) => {
                res.writeHead(500);
                res.end("Proxy Error: " + e.message);
            });

            // ユーザーからのデータをターゲットに流す
            req.pipe(proxyReq);

        } catch (e) {
            res.writeHead(400);
            res.end("Invalid URL: " + e.message);
        }
    } else {
        // どちらにも当てはまらない場合はトップへ
        res.writeHead(302, { 'Location': '/' });
        res.end();
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});
