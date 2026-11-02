/* ERP Studio — uygulama kabuğu önbelleği.
   Kapalı çevrim: sunucuya erişim kesilse de arayüz açılmaya devam eder. */

const CACHE = 'erp-studio-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './js/app.js',
  './js/store.js',
  './js/seed.js',
  './js/icons.js',
  './js/ui.js',
  './js/views/index.js',
  './js/views/dashboard.js',
  './js/views/purchasing.js',
  './js/views/inventory.js',
  './js/views/production.js',
  './js/views/shipping.js',
  './js/views/reports.js',
  './js/views/system.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return response;
      }).catch(() => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
      return cached || network;
    })
  );
});
