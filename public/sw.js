// Offline shell: app files come from the network first (so updates land), the cache is the fallback.
const CACHE = 'pawdiary-v9';
const SHELL = ['/', '/index.html', '/style.css?v=9', '/app.js?v=9', '/manifest.webmanifest', '/icon-192.png', '/apple-touch-icon.png',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js', 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return; // friends data is always live
  const isShell = url.origin === location.origin || url.hostname === 'unpkg.com';
  if (!isShell) return; // map tiles, fonts and place names go straight to the network
  e.respondWith(
    // always check the server for a newer copy instead of trusting the browser's HTTP cache
    (url.origin === location.origin ? fetch(e.request.url, {cache: 'no-cache', credentials: 'same-origin'}) : fetch(e.request)).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});
