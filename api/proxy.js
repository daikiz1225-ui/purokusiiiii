// Vercel Serverless Function
const fetch = require('node-fetch');

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('No URL provided');

    try {
        // ぐちゃぐちゃな文字列を元のURLに復元
        const decodedUrl = Buffer.from(url.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString();
        
        const response = await fetch(decodedUrl);
        const data = await response.text();
        
        // 取得したサイトのHTMLをそのまま返す
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send('Error fetching the site');
    }
}
