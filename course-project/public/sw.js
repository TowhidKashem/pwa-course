self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...', event);
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...', event);
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  console.log('[SW] Fetching Something...', event);
  event.respondWith(fetch(event.request));
});
