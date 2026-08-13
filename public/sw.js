// NexCivic Smart Service Worker (Sprint 9 — PWA Production Hardening)

const APP_VERSION = '1.0.3';
const CACHE_PREFIX = 'nexcivic-';
const CACHE_NAME = `${CACHE_PREFIX}shell-v${APP_VERSION}`;

// Pre-cached App Shell Assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-192.png',
  '/maskable-512.png',
  '/apple-touch-icon.png',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

// Helper: Network First with timeout
async function networkFirstWithTimeout(request, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw err;
  }
}

// 1. Install Event — Resilient Pre-caching & Skip Waiting
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing Service Worker ${CACHE_NAME}...`);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching App Shell assets');
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) => cache.add(asset).catch((err) => {
          console.warn(`[SW] Non-critical precache asset load failed (${asset}):`, err);
        }))
      );
    })
  );
});

// 2. Activate Event — Safe Cache Purging & Immediate Clients Claim
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating Service Worker ${CACHE_NAME}...`);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            console.log(`[SW] Purging old NexCivic cache: ${key}`);
            return caches.delete(key);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event — Chrome Required PWA Fetch Handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. Firestore writes, POST APIs)
  if (request.method !== 'GET') {
    return;
  }

  // A. Network-First for APIs, Firebase, and User-Uploaded Media
  const isApiOrFirebase = 
    url.hostname.includes('firebase') || 
    url.hostname.includes('googleapis') || 
    url.pathname.startsWith('/api') ||
    url.pathname.includes('firestore');

  const isUserPhoto = 
    url.pathname.includes('user_uploads') || 
    url.pathname.includes('complaints');

  if (isApiOrFirebase || isUserPhoto) {
    event.respondWith(
      networkFirstWithTimeout(request, 5000).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline mode: Network request unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // B. Cache-First for Static UI Assets
  const isStaticUiAsset = 
    url.origin === self.location.origin && 
    (url.pathname.endsWith('.js') || 
     url.pathname.endsWith('.css') || 
     url.pathname.endsWith('.png') || 
     url.pathname.endsWith('.ico') || 
     url.pathname.endsWith('.json') ||
     url.pathname.includes('/assets/'));

  if (isStaticUiAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. HTML Navigation Requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Default: Cache First with Network Fallback
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// 4. Message Event — Immediate SW Update Activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received. Activating new Service Worker immediately.');
    self.skipWaiting();
  }
});
