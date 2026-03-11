// Minimal service worker for TWA compliance
const CACHE_NAME = 'linguapaws-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/icon-512.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // For the main entry points, always try the network first to avoid "blank screen" ghosting
    if (url.origin === location.origin && (url.pathname === '/' || url.pathname === '/index.html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // For assets like icons and manifest, cache-first is fine
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});
