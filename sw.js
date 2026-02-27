importScripts('/config.js');
importScripts('/lib.js');
importScripts('/sw-core.js');

const uv = new UVServiceWorker();

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // /service/ 以下のリクエストだけを処理
    if (event.request.url.includes('/service/')) {
        event.respondWith(uv.fetch(event));
    }
});
