const CACHE_NAME = 'polski-pwa-v5';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => caches.delete(key)) // Zabijamy zombie: czyszczenie WSZYSTKICH starych cache bez wyjątku
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ZAPYTANIA O HTML I JSON: Strategia Network Only
  if (
    url.pathname === '/' ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('.json') ||
    url.hostname === 'api.github.com' ||
    url.hostname === 'raw.githubusercontent.com'
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Obrazki i zewnętrzne zasoby: Cache-First z network fallback
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(networkResponse => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
