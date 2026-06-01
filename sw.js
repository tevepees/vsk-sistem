// VSK Sistem — Service Worker
// Cache key di-bump setiap ada deploy mayor agar client lama dapat update.
const CACHE = 'vsk-sistem-v2';
const ASSETS = ['/manifest.json', '/shared.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // HTML pages → network-first (selalu coba ambil yang terbaru, fallback cache)
  const htmlRoutes = ['/', '/produksi', '/rawmat', '/penjualan', '/ceo-dashboard'];
  if (htmlRoutes.includes(url.pathname) || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Apps Script API calls → JANGAN di-cache, biar selalu fresh dari Google
  if (url.hostname.indexOf('script.google.com') !== -1 ||
      url.hostname.indexOf('script.googleusercontent.com') !== -1) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Asset lain → cache-first
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
