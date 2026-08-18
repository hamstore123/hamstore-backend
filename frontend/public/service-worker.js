/* Service worker sederhana untuk PWA Hamstore */
const CACHE_NAME = "hamstore-cache-v1";

// Saat install, langsung aktif
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Saat aktif, bersihkan cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Strategi: selalu ambil dari network dulu (biar data toko selalu terbaru),
// kalau offline baru pakai cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});