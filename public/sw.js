const CACHE_NAME = 'polski-pwa-v2';
const DYNAMIC_CACHE = 'polski-dynamic-v2';
const IMAGE_CACHE = 'polski-image-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (![CACHE_NAME, DYNAMIC_CACHE, IMAGE_CACHE].includes(key)) {
          return caches.delete(key);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ZAPYTANIA O OBRAZKI: Cache First z weryfikacją no-cors (opaque responses)
  if (event.request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          // Zapisz odpowiedź do cache, jeśli jest prawidłowa LUB jest to odpowiedź typu opaque (status 0 z innych domen)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(IMAGE_CACHE).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Opcjonalny fallback np. obrazek zastępczy przy braku sieci
        });
      })
    );
    return;
  }

  // HTML, JS i API GITHUB (JSON): Strategia Network First
  if (
    event.request.mode === 'navigate' || 
    event.request.destination === 'script' || 
    url.hostname === 'api.github.com' || 
    url.hostname === 'raw.githubusercontent.com' ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        // Zapisz odpowiedź do cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback do cache w razie braku połączenia
        return caches.match(event.request);
      })
    );
    return;
  }

  // POZOSTAŁE ZASOBY (np. style, fonty zewnętrzne): Strategia Network First (fallback do cache)
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
      }
      return networkResponse;
    }).catch(() => caches.match(event.request))
  );
});
