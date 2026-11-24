/* ERP Studio — uygulama kabuğu önbelleği.
   Kapalı çevrim: sunucuya erişim kesilse de arayüz açılmaya devam eder. */

// Şema sürümüyle birlikte yükseltildi: modüler kurulum çekirdeği, adaptör sözleşmesi,
// menü tanımı ve kurulum sihirbazı çevrimdışı ilk açılışta da önbellekte bulunmalıdır.
const CACHE = 'erp-studio-v5';
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
  './js/calc.js',
  './js/posting.js',
  './js/modularity.js',
  './js/adapters.js',
  './js/icons.js',
  './js/ui.js',
  './js/views/index.js',
  './js/views/nav.js',
  './js/views/setup.js',
  './js/views/dashboard.js',
  './js/views/purchasing.js',
  './js/views/inventory.js',
  './js/views/production.js',
  './js/views/shipping.js',
  './js/views/reports.js',
  './js/views/system.js',
  './js/views/engineering.js',
  './js/views/enterprise.js',
  './js/views/sim.js'
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
