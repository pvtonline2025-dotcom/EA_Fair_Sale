// EA Fair Sale - Service Worker with Background Sync & Offline Support
const CACHE_NAME = 'ea-fair-sale-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.js',
  '/supabase-config.js',
  '/fetch-wrapper.js',
  '/manifest.json',
  '/css/pages/pos.css',
  '/css/pages/dashboard.css',
  '/assets/icons/logo-192.png'
];

// Never replay sales from a service worker using an anonymous credential.
// A foreground client coordinates authenticated, idempotent replays.

// Install: Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(STATIC_ASSETS.map(async (asset) => {
        try { await cache.add(asset); }
        catch (err) { console.warn('[SW] Optional asset not cached:', asset, err); }
      }));
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches & take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for local assets, Network-First for API/Supabase
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET and chrome-extension schemes
  if (req.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Network-first for Supabase or external APIs
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: 'Network unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache only same-origin static assets. Never store third-party API responses.
  if (url.origin !== self.location.origin) return;

  // Stale-While-Revalidate for app assets
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const contentType = networkResponse.headers.get('content-type') || '';
          const isAssetReq = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
          // Avoid caching HTML fallbacks for JS/CSS files
          if (!isAssetReq || !contentType.includes('text/html')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// =========================================================
// BACKGROUND SYNC: SYNC PENDING POS TRANSACTIONS
// =========================================================

// Listen to Background Sync Event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pos-transactions') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Periodic Sync (if supported by browser)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-pos-transactions') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Message listener for communication with clients
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'TRIGGER_SYNC') {
    event.waitUntil(handleBackgroundSync());
  } else if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notify all active window clients
async function broadcastToClients(msg) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(msg);
  }
}

// Main background sync handler
async function handleBackgroundSync() {
  console.log('[SW] Background sync triggered: checking pending POS transactions...');

  // 1. If any active client window is open, delegate sync to client (it has active Supabase session & UI feedback)
  const windowClients = await self.clients.matchAll({ type: 'window' });
  if (windowClients.length > 0) {
    await broadcastToClients({ type: 'EXECUTE_PENDING_SYNC', reason: 'BACKGROUND_SYNC' });
    return;
  }

  // No window is available: preserve all queued sales until the app is opened.
  // Direct retries after an ambiguous network response could otherwise double-charge stock.
  console.log('[SW] No active client. Sales remain in IndexedDB until a client can sync safely.');
}
