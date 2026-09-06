const CACHE_NAME = 'polski-pwa-v1';
const DYNAMIC_CACHE = 'polski-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (![CACHE_NAME, DYNAMIC_CACHE].includes(key)) {
          return caches.delete(key);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ZAPYTANIA DO GITHUBA (JSON): Strategia Stale-While-Revalidate
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => cachedResponse); // Jeśli offline, zwróć to co z cache
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // ZASOBY STATYCZNE: Strategia Cache-First
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(networkResponse => {
        // Zapisujemy zewnętrzne skrypty (Tailwind, Marked) do pamięci
        if (event.request.url.startsWith('http')) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    })
  );
});
