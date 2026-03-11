const CACHE_NAME = 'gei-1.13'; // <--- Hier einfach v3, v4... eintragen
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// 1. Installation: Dateien in den Cache laden
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Erzwingt, dass der neue SW sofort aktiv wird
});

// 2. Aktivierung: Alten Cache löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Lösche alten Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Strategie: Erst Cache, dann Netzwerk
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});