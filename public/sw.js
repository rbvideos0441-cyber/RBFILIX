const CACHE_NAME = 'rbflix-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html'
];

// Install Event - cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up legacy versions of caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning up old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - network-first for index navigation, cache-first/update for media, dynamic caching
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip tracking non-standard protocols (e.g. extension downloads, analytics)
  if (!req.url.startsWith(self.location.origin) && !req.url.includes('api.themoviedb.org')) {
    return;
  }

  // Handle API Requests - Network First, fallback to cached TMDB answers
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const cacheResponseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, cacheResponseCopy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(req).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(JSON.stringify({ 
              error: "offline", 
              message: "Offline. Você está vendo informações salvas localmente." 
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Handle SPA Assets & Pages - Cache First, with dynamic network updates
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background for asset staleness updates
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
          }
        }).catch(() => {/* Background error swallow */});

        return cachedResponse;
      }

      return fetch(req).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/offline.html');
        }
      });
    })
  );
});
