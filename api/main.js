import { decodeUrl, encodeUrl } from './utils.js';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');

    try {
        const targetUrl = decodeUrl(url);
        const origin = new URL(targetUrl).origin;

        // 1. 徹底した偽装ヘッダー (これで「まともなiPad」に見せかける)
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': origin + '/'
            }
        });

        let html = await response.text();

        // 2. 邪魔な警告スクリプトや広告検知コードを根こそぎ削除
        // 広告ブロック警告を出している可能性のあるJSを無効化
        html = html.replace(/<script\b[^>]*?src=["'][^"']*?(adsbygoogle|google-analytics|doubleclick|amazon-adsystem)[^"']*?["'][^>]*?><\/script>/gi, '');
        
        // 3. リンクの書き換え（メイン機能）
        // <a>タグのリンクを自分経由に
        html = html.replace(/(href)=["'](https?:\/\/[^"']+)["']/g, (m, p1, p2) => `/view/${encodeUrl(p2)}`);

        // 4. 画像・CSS・JSの書き換え（/asset/ 経由にする）
        // Game8の複雑なパスに対応するため、属性を広めにキャッチ
        html = html.replace(/(src|srcset|data-src|href)=["']((https?:\/\/|\/)[^"']+\.(png|jpg|jpeg|gif|css|js|webp|svg)[^"']*)["']/gi, (m, p1, p2) => {
            let fullUrl = p2;
            if (p2.startsWith('/')) {
                fullUrl = origin + p2;
            }
            // HTMLファイル以外のリンク（CSSや画像）なら /asset/ へ
            const isHtmlLink = p1 === 'href' && !p2.includes('.css') && !p2.includes('.js');
            return `${p1}="/${isHtmlLink ? 'view' : 'asset'}/${encodeUrl(fullUrl)}"`;
        });

        // 5. CSS内のURLも置換できるようにベースタグを強制挿入
        html = html.replace('<head>', `<head><base href="${origin}/">`);

        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.status(200).send(html);

    } catch (e) {
        res.status(500).send(`USA Proxy Error: ${e.message}`);
    }
}
