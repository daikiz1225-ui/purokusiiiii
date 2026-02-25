export default async function handler(req, res) {
    const { url } = req.query;

    // 1. URLがない場合のガード
    if (!url) {
        return res.status(400).send('URL parameter is required');
    }

    try {
        // 2. Base64デコード処理 (utils.jsを使わずに直接実装)
        const encoded = url.replace(/-/g, '+').replace(/_/g, '/');
        const targetUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        const targetObj = new URL(targetUrl);

        // 3. リクエストヘッダーの構築
        const headers = new Headers();
        const skipHeaders = ['host', 'connection', 'x-vercel-id', 'x-real-ip', 'x-forwarded-for'];
        
        Object.entries(req.headers).forEach(([key, value]) => {
            if (!skipHeaders.includes(key.toLowerCase())) {
                headers.set(key, value);
            }
        });

        // 偽装の仕上げ
        headers.set('User-Agent', 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');
        headers.set('Referer', targetObj.origin + '/');
        headers.set('Origin', targetObj.origin);

        // 4. ターゲットサイトへリクエスト (アメリカ経由)
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            // GET以外の場合はボディを送る
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined,
            redirect: 'follow'
        });

        // 5. レスポンスヘッダーの処理
        const responseHeaders = {};
        const blockHeaders = ['content-security-policy', 'x-frame-options', 'content-encoding', 'transfer-encoding'];
        
        response.headers.forEach((value, key) => {
            if (!blockHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        // CORS許可（iPad内のService Workerが読み込めるように）
        res.setHeader('Access-Control-Allow-Origin', '*');

        // 6. データの送信
        const contentType = response.headers.get('content-type') || '';
        const buffer = await response.arrayBuffer();
        
        res.status(response.status).send(Buffer.from(buffer));

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({
            error: 'Internal Proxy Error',
            message: error.message,
            stack: error.stack
        });
    }
}
