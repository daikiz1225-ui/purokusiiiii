import { decodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    const targetUrl = Buffer.from(url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    const targetObj = new URL(targetUrl);

    try {
        // 1. リクエストヘッダーの模倣
        const requestHeaders = { ...req.headers };
        delete requestHeaders.host;
        delete requestHeaders.connection;
        requestHeaders['origin'] = targetObj.origin;
        requestHeaders['referer'] = targetObj.origin + '/';
        requestHeaders['user-agent'] = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15';

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: requestHeaders,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
            redirect: 'follow'
        });

        // 2. レスポンスヘッダーのクリーンアップ
        const forbiddenHeaders = [
            'content-security-policy',
            'content-security-policy-report-only',
            'x-frame-options',
            'strict-transport-security',
            'content-encoding' // Vercelが自動で圧縮するため
        ];

        response.headers.forEach((value, key) => {
            if (!forbiddenHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        // CORSを許可して、iPad内部での通信をスムーズにする
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        // 3. バイナリデータをストリーミングで送信
        const buffer = await response.arrayBuffer();
        res.status(response.status).send(Buffer.from(buffer));

    } catch (e) {
        console.error('Proxy Engine Error:', e);
        res.status(500).send(`Engine Error: ${e.message}`);
    }
}
