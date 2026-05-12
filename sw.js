// Chronicle & Shadow — Service Worker
// Caches the app shell for offline use and fast loading

const CACHE_NAME = 'chronicle-shadow-v1';

// Files to cache for offline use
const CACHE_URLS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap'
];

// Install — cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        // Non-fatal — some resources may not be cacheable
        console.log('Cache partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept API calls — always go to network for AI requests
  if (url.hostname.includes('workers.dev') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('generativelanguage')) {
    return; // Let it go straight to network
  }

  // For everything else: cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        // If offline and not cached, return the main app
        return caches.match('/index.html');
      });
    })
  );
});
