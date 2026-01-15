// Service Worker for offline support
const CACHE_NAME = 'wlpl-v5';
const PHOTO_CACHE_NAME = 'wlpl-photos-v1';
const MEDICAL_CACHE_NAME = 'wlpl-medical-v1';
const SHOPPING_CACHE_NAME = 'wlpl-shopping-v1';
const OFFLINE_URL = '/offline.html';
const MAX_PHOTO_CACHE_SIZE = 50; // Max number of photos to cache
const MAX_MEDICAL_IMG_CACHE = 100; // Max medication images
const MAX_SHOPPING_CACHE = 50; // Max shopping list items

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Precaching assets');
      // Cache assets individually to handle failures gracefully
      const cachePromises = PRECACHE_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            console.log('[Service Worker] Cached:', url);
          } else {
            console.warn('[Service Worker] Failed to cache (non-200):', url, response.status);
          }
        } catch (error) {
          console.warn('[Service Worker] Failed to cache:', url, error);
        }
      });
      await Promise.all(cachePromises);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  const validCaches = [CACHE_NAME, PHOTO_CACHE_NAME, MEDICAL_CACHE_NAME, SHOPPING_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!validCaches.includes(cacheName)) {
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

  // ============================================================================
  // MEDICAL DATA CACHING (for offline doctor visits)
  // ============================================================================

  // Cache medication images (cache-first for offline access)
  if (
    event.request.url.includes('firebasestorage') &&
    event.request.url.includes('/medications/')
  ) {
    event.respondWith(
      caches.open(MEDICAL_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Medication image served from cache');
            return cachedResponse;
          }

          // Fetch from network and cache
          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => {
            return new Response('Medication image unavailable offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
      })
    );
    return;
  }

  // Cache patient document images (cache-first for offline access)
  if (
    event.request.url.includes('firebasestorage') &&
    (event.request.url.includes('/documents/') || event.request.url.includes('/patients/'))
  ) {
    event.respondWith(
      caches.open(MEDICAL_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Document image served from cache');
            return cachedResponse;
          }

          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => {
            return new Response('Document unavailable offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
      })
    );
    return;
  }

  // ============================================================================
  // SHOPPING DATA CACHING (for offline in-store use)
  // ============================================================================

  // Cache shopping list API responses
  if (event.request.url.includes('/api/shopping')) {
    event.respondWith(
      caches.open(SHOPPING_CACHE_NAME).then((cache) => {
        return fetch(event.request).then((response) => {
          // Network-first, cache on success
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {
          // Network failed, try cache
          return cache.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Shopping list served from cache');
              return cachedResponse;
            }
            return new Response(JSON.stringify({ error: 'Offline - using IndexedDB cache' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
    return;
  }

  // Cache product lookup API responses (barcode scanning)
  if (event.request.url.includes('/api/products/lookup')) {
    event.respondWith(
      caches.open(SHOPPING_CACHE_NAME).then((cache) => {
        return fetch(event.request).then((response) => {
          // Cache successful product lookups
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {
          // Network failed, try cache
          return cache.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Product lookup served from cache');
              return cachedResponse;
            }
            return new Response(JSON.stringify({ error: 'Offline - product not cached' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
    return;
  }

  // Skip other Firebase/Google API requests (no caching)
  if (
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('accounts.google.com') ||
    event.request.url.includes('apis.google.com')
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

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  let notificationData = {
    title: 'Weight Loss Project Lab',
    body: 'You have a new notification',
    icon: '/icon-192x192.svg',
    badge: '/icon-192x192.svg',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.notification?.title || notificationData.title,
        body: payload.notification?.body || notificationData.body,
        icon: payload.notification?.icon || notificationData.icon,
        badge: payload.notification?.badge || notificationData.badge,
        data: payload.data || {}
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push payload:', error);
    }
  }

  const { title, ...options } = notificationData;

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.data);

  event.notification.close();

  const urlToOpen = event.notification.data?.action === 'log_meal'
    ? '/log-meal'
    : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((client) => {
            // Navigate to target URL
            if (client.url !== urlToOpen) {
              return client.navigate(urlToOpen);
            }
            return client;
          });
        }
      }

      // If app not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
