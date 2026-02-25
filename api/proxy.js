export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing URL');

    // Base64デコード
    const targetUrl = Buffer.from(url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();

    try {
        const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15' }
        });

        const contentType = response.headers.get('content-type');
        res.setHeader('Content-Type', contentType);

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (e) {
        res.status(500).send(e.message);
    }
}
