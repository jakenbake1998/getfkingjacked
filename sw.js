// Spotter offline cache. Bump VERSION when files change so phones pick up the update.
const VERSION = 'gfj-v2.5';
const FILES = ['./', 'index.html', 'js/data.js', 'js/exinfo.js', 'js/figure.js', 'js/figure3d.js', 'js/poses.js', 'js/vendor/three.module.min.js', 'js/vendor/three.core.js', 'js/engine.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'img/splash/end.jpg', 'img/splash/first.jpg'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// App files: network first (so updates land), cache when offline. Fonts: cache first.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('fonts.')) {
    e.respondWith(caches.open(VERSION).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('.mp4')) return; // let video stream straight from the network
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
