const http = require('http');
const url = require('url');

http.createServer((req, res) => {
    // 1. トップ画面（URL入力欄）
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});
        res.end(`
            <body style="background:#121212; color:white; font-family:sans-serif; text-align:center; padding-top:100px;">
                <h1>My Node Proxy</h1>
                <input type="text" id="url" placeholder="https://example.com" style="width:60%; padding:15px; border-radius:30px; border:none;">
                <button onclick="location.href='/proxy?url=' + btoa(document.getElementById('url').value)" style="padding:15px 30px; border-radius:30px; cursor:pointer; background:#0055ff; color:white; border:none; margin-left:10px;">Go</button>
                <p style="color:#666; margin-top:20px;">※ btoaでURLをエンコードして送信します</p>
            </body>
        `);
        return;
    }

    // 2. プロキシ実行部分
    const query = url.parse(req.url, true).query;
    if (req.url.startsWith('/proxy') && query.url) {
        // Base64で送られたURLを元に戻す
        const targetFullUrl = Buffer.from(query.url, 'base64').toString('utf-8');
        const target = url.parse(targetFullUrl);

        const options = {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: target.path,
            method: req.method,
            headers: { ...req.headers, host: target.hostname } // Hostを偽装
        };

        // ターゲットサイトへリクエストを飛ばす
        const lib = target.protocol === 'https:' ? require('https') : http;
        const proxyReq = lib.request(options, (proxyRes) => {
            // ヘッダーをそのまま返す（セキュリティ関連のヘッダーは一部削除するのがコツ）
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['x-frame-options'];
            
            res.writeHead(proxyRes.statusCode, proxyRes.headers);

            // データを受け取りながら加工する（簡易的なリンク書き換えロジック）
            let body = [];
            proxyRes.on('data', chunk => body.push(chunk));
            proxyRes.on('end', () => {
                let data = Buffer.concat(body);
                // もしHTMLなら、リンクを「/proxy?url=」経由に書き換える（ここが魔法！）
                if (proxyRes.headers['content-type']?.includes('text/html')) {
                    let html = data.toString();
                    // href="http..." を href="/proxy?url=btoa(http...)" に置換するような処理（実際は正規表現などで実装）
                    // 今回はシンプルにそのまま流しますが、ここをいじると「プロキシが外れない」ようになります。
                }
                res.end(data);
            });
        });

        proxyReq.on('error', e => res.end("Error: " + e.message));
        req.pipe(proxyReq);
    }
}).listen(3000);

console.log("Proxy server running at http://localhost:3000");
