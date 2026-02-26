importScripts('/config.js');
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
    // 自身のサーバーリソースやデータURLは除外
    if (e.request.url.includes(location.origin) || e.request.url.startsWith('data:')) return;

    const bareUrl = `/api/bare?url=${self.__DIP_CONFIG__.encodeUrl(e.request.url)}&mode=stealth`;

    e.respondWith(
        fetch(bareUrl, { 
            method: e.request.method, 
            headers: e.request.headers, 
            body: e.request.method!=='GET' ? e.request.blob() : undefined 
        })
    );
});
