// Legacy-PWA-Bereinigung: falls diese TV-Domain früher die Smartphone-PWA (Workbox sw.js) ausgeliefert hat,
// deregistriert sich dieser Service Worker automatisch und leert alte Caches.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.caches) {
        const keys = await self.caches.keys();
        await Promise.all(keys.map((key) => self.caches.delete(key)));
      }
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});
