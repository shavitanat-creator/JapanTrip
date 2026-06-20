// Japan Trip Planner — service worker
// Goal: make the app itself open instantly & reliably once installed.
// Everything else (map tiles, Google Maps links, booking sites, fonts) always
// goes straight to the network — this never tries to work fully offline.

const CACHE_NAME = 'japan-trip-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only manage requests for our own app shell (same-origin, GET).
  // Everything else — Leaflet, fonts, map tiles, Google Maps, booking
  // sites, ticket links — is left completely alone and goes to the network.
  const isAppShellRequest =
    event.request.method === 'GET' &&
    url.origin === self.location.origin;

  if (!isAppShellRequest) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // offline & not cached → fall back if we have something

      // Stale-while-revalidate: show cached instantly, refresh in background.
      return cached || networkFetch;
    })
  );
});
