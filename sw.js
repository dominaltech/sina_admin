// SINA Admin - Service Worker for Offline Management Portal
const CACHE_NAME = 'sina-admin-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'login.html',
  'representatives.html',
  'rep-detail.html',
  'catalog.html',
  'firms.html',
  'history.html',
  'approvals.html',
  'manifest.json',
  'css/base.css',
  'css/components.css',
  'css/admin.css',
  'js/config.js',
  'js/icons.js',
  'js/db.js',
  'js/auth.js',
  'js/nav.js',
  'js/dashboard.js',
  'js/representatives.js',
  'js/rep-detail.js',
  'js/catalog.js',
  'js/firms.js',
  'js/history.js',
  'js/approvals.js',
  'assets/icon-192.svg',
  'assets/icon-512.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('chrome-extension://')) return;
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
