// VSK Sistem — Service Worker
// Cache key di-bump setiap ada deploy mayor agar client lama dapat update.
const CACHE = 'vsk-sistem-v1';
const ASSETS = ['/manifest.json'];

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

  // Index.html → network-first (selalu coba ambil yang terbaru, fallback cache)
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
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
