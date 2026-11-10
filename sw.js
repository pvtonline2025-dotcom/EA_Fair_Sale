// EA Fair Sale - Service Worker with Background Sync & Offline Support
const CACHE_NAME = 'ea-fair-sale-v122';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/supabase-config.js',
  '/js/fetch-wrapper.js',
  '/js/icons.js',
  '/js/clean-text.js',
  '/js/contrast-guard.js',
  '/css/icons.css',
  '/css/pages/pos-theme.css',
  '/css/pages/stock-theme.css',
  '/css/cashbox.css',
  '/css/reservations.css',
  '/css/phone-count.css',
  '/css/audit-review.css',
  '/css/light-clean.css',
  '/css/requisition.css',
  '/css/petty-cash.css',
  '/css/clean.css',
  '/css/toast-popup.css',
  '/manifest.json',
  '/js/offline-sync.js',
  '/js/install-app.js',
  '/js/remote-cart.js',
  '/css/remote-cart.css',
  '/js/phone-scan.js',
  '/css/phone-scan.css',
  '/css/phone-scan-clean.css',
  '/css/light-calm.css',
  '/js/hub.js',
  '/js/hub-report.js',
  '/js/cashbox.js',
  '/js/reservations.js',
  '/js/mini-printer.js',
  '/js/audit-review.js',
  '/js/requisition-receive.js',
  '/js/petty-cash.js',
  '/js/phone-count.js',
  '/css/hub.css',
  '/css/variables.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/light-mode.css',
  '/css/tablet.css',
  '/css/tablet-enhancements.css',
  '/css/components/buttons.css',
  '/css/components/cards.css',
  '/css/components/tables.css',
  '/css/components/forms.css',
  '/css/pages/home.css',
  '/css/pages/pos.css',
  '/css/pages/dashboard.css',
  '/css/pages/stock.css',
  '/css/pages/movement.css',
  '/css/pages/audit.css',
  '/css/pages/sales-history.css',
  '/css/pages/expenses.css',
  '/css/pages/reports.css',
  '/css/pages/settings.css',
  '/css/pages/modals.css',
  '/images/btn-sale.png',
  '/images/btn-dashboard-today.png',
  '/images/btn-dashboard-all.png',
  '/images/btn-add-stock.png',
  '/images/btn-out-stock.png',
  '/images/btn-new-product.png',
  '/images/btn-stock.png',
  '/images/btn-low-stock.png',
  '/images/btn-export.png',
  '/images/btn-setting.png',
  '/assets/icons/logo-192.png?v=20261110',
  '/assets/icons/logo-512.png?v=20261110',
  '/assets/icons/logo-maskable-512.png?v=20261110',
  '/assets/icons/apple-touch-icon.png?v=20261110',
  '/assets/icons/splash-logo.webp?v=20261110',
  '/assets/icons/app-emblem.png?v=20261110',
  '/assets/manifest-cashier.json?v=20261110',
  '/assets/icons/cashier-192.png?v=20261110',
  '/assets/icons/cashier-512.png?v=20261110',
  '/assets/icons/cashier-maskable-512.png?v=20261110',
  '/assets/icons/cashier-apple-touch.png?v=20261110',
  // CDN libraries (pinned versions) so the POS still opens offline
  'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js',
  'https://unpkg.com/@zxing/browser@0.2.1/umd/zxing-browser.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
];

// Never replay sales from a service worker using an anonymous credential.
// A foreground client coordinates authenticated, idempotent replays.

// Install: Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(STATIC_ASSETS.map(async (asset) => {
        // cache:'reload' bypasses the browser HTTP cache so a new deploy never
        // precaches yesterday's logo/JS/CSS.
        const sameOrigin = asset.startsWith('/');
        try { await cache.add(sameOrigin ? new Request(asset, { cache: 'reload' }) : asset); }
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

  // Cache same-origin static assets and known CDN libraries (d3, supabase, zxing, jsbarcode)
  const isCdnAsset = (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'unpkg.com') &&
                     (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));
  if (url.origin !== self.location.origin && !isCdnAsset) return;

  // Network-first for page navigations so a new deploy is picked up on the next
  // open; fall back to the cached app shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
        }
        return networkResponse;
      }).catch(async () => {
        return (await caches.match(req)) || (await caches.match('/index.html')) || (await caches.match('/')) ||
          new Response('ออฟไลน์ และยังไม่มีแอปในแคช กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วเปิดใหม่', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      })
    );
    return;
  }

  // Network-first (with timeout) for ALL of the app's own files (JS, CSS, logos,
  // images, manifest) so a new deploy - including a replaced logo that keeps the
  // same file name - shows on the very first load; fall back to cache offline.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const net = await Promise.race([
          fetch(req, { cache: 'no-cache' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
        ]);
        const ct = net.headers.get('content-type') || '';
        if (net && net.status === 200 && !ct.includes('text/html')) cache.put(req, net.clone());
        return net;
      } catch (_) {
        const cached = await cache.match(req) || await caches.match(req);
        if (cached) return cached;
        return fetch(req);
      }
    })());
    return;
  }

  // Stale-While-Revalidate for other assets (versioned CDN libs, images, fonts)
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
