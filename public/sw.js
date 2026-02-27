importScripts('./lib.js');
importScripts('./config.js');
importScripts('./sw-core.js');

const uv = new UVServiceWorker();
self.addEventListener('fetch', event => {
    event.respondWith(uv.fetch(event));
});
