// Unami Foundation Moments - Service Worker
const CACHE_NAME = 'unami-moments-v1';
const STATIC_ASSETS = [
  '/',
  '/moments',
  '/css/design-system.css',
  '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => 
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch - network first for API, cache first for static
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // API requests - network first
  if (request.url.includes('/admin') || request.url.includes('/public')) {
    event.respondWith(
      fetch(request)
        .catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }
  
  // Static assets - cache first
  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
      .catch(() => new Response('Offline', { status: 503 }))
  );
});