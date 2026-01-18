// Service Worker for Offline Support
const CACHE_NAME = 'moments-admin-v2.0.4';
const STATIC_CACHE = 'moments-static-v2.0.4';
const DYNAMIC_CACHE = 'moments-dynamic-v2.0.4';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/admin-dashboard.html',
    '/css/design-system.css',
    '/css/admin-header.css',
    '/css/admin-dashboard.css',
    '/js/admin-dashboard-core.js',
    '/js/admin.js',
    '/js/dark-mode.js',
    '/js/keyboard-shortcuts.js',
    '/js/export-data.js',
    '/js/bulk-actions.js',
    '/js/phase3-enhancements.js',
    '/js/chart.min.js',
    '/logo.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map(key => caches.delete(key))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // API requests - network first, cache fallback
    if (url.pathname.startsWith('/admin/') || url.pathname.includes('supabase.co')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone and cache successful responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache
                    return caches.match(request)
                        .then(cached => {
                            if (cached) {
                                return cached;
                            }
                            // Return offline page for API failures
                            return new Response(
                                JSON.stringify({ error: 'Offline', offline: true }),
                                { headers: { 'Content-Type': 'application/json' } }
                            );
                        });
                })
        );
        return;
    }
    
    // Static assets - cache first, network fallback
    event.respondWith(
        caches.match(request)
            .then(cached => {
                if (cached) {
                    return cached;
                }
                return fetch(request)
                    .then(response => {
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => cache.put(request, responseClone));
                        }
                        return response;
                    });
            })
    );
});

// Background sync for queued actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-moments') {
        event.waitUntil(syncQueuedActions());
    }
});

async function syncQueuedActions() {
    const db = await openDB();
    const queue = await db.getAll('queue');
    
    for (const action of queue) {
        try {
            await fetch(action.url, action.options);
            await db.delete('queue', action.id);
            console.log('[SW] Synced action:', action.id);
        } catch (error) {
            console.error('[SW] Failed to sync:', action.id, error);
        }
    }
}

// IndexedDB helper
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('moments-offline', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('queue')) {
                db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}
