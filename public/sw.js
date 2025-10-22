// Service Worker for offline support
const CACHE_NAME = 'wlpl-v2';
const PHOTO_CACHE_NAME = 'wlpl-photos-v1';
const OFFLINE_URL = '/offline.html';
const MAX_PHOTO_CACHE_SIZE = 50; // Max number of photos to cache

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== PHOTO_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper: Cache meal photos with size limit
async function cachePhoto(request, response) {
  if (response.status !== 200) {
    return response;
  }

  const cache = await caches.open(PHOTO_CACHE_NAME);
  const cachedRequests = await cache.keys();

  // Remove oldest photo if cache is full
  if (cachedRequests.length >= MAX_PHOTO_CACHE_SIZE) {
    await cache.delete(cachedRequests[0]);
  }

  await cache.put(request, response.clone());
  return response;
}

// Fetch event - enhanced with photo caching
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Special handling for Firebase Storage meal photos (cache-first)
  if (
    event.request.url.includes('firebasestorage') &&
    event.request.url.includes('/meals/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Photo served from cache');
          return cachedResponse;
        }

        // Fetch from network and cache
        return fetch(event.request)
          .then((response) => cachePhoto(event.request, response))
          .catch(() => {
            return new Response('Photo unavailable offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
    );
    return;
  }

  // Skip other Firebase/Google API requests (no caching)
  if (
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis.com')
  ) {
    return;
  }

  // Default: Network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If HTML page not cached, show offline page
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }

          // For other resources, return error
          return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});

// Background Sync - sync offline queue when connection restored
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag);

  if (event.tag === 'sync-meal-queue') {
    event.waitUntil(
      // Notify all clients to start sync
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_QUEUE',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
