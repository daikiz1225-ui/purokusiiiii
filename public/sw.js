importScripts('https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@latest/dist/uv.bundle.js');
importScripts('./uv.config.js');
importScripts('https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@latest/dist/uv.sw.js');

const uv = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
    event.respondWith(uv.fetch(event));
});
