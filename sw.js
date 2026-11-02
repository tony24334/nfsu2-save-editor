const CACHE_NAME = 'nfsu2-save-editor-fork-v4-widebody';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/app.bundle.min.js', './js/unique-integrated.js',
  './manifest.webmanifest', './assets/DEMO', './assets/JANE'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
