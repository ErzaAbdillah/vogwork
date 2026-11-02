/* Service worker VogWork: semua aset situs disimpan saat pemasangan,
 * sehingga semua alat bisa dipakai offline setelah kunjungan pertama.
 * __VOG_VERSION__ diganti oleh scripts/postbuild.mjs pada setiap build. */
const VERSION = "__VOG_VERSION__";
const PRECACHE = `vogwork-${VERSION}`;
const RUNTIME = "vogwork-runtime";
const CDN_HOSTS = ["cdn.jsdelivr.net"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      const response = await fetch("/precache.json", { cache: "no-store" });
      const { urls } = await response.json();
      for (let i = 0; i < urls.length; i += 16) {
        await Promise.all(urls.slice(i, i + 16).map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})));
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("vogwork-") && k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function fromCache(request) {
  return (await caches.match(request, { ignoreSearch: true })) ?? undefined;
}

async function cacheFirst(request, cacheName = PRECACHE) {
  const cached = await fromCache(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const url = new URL(request.url);
    const cached = (await fromCache(request)) ?? (await caches.match(url.pathname.replace(/\/$/, "") || "/")) ?? (await caches.match("/"));
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cached = await fromCache(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) (await caches.open(RUNTIME)).put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => cached);
  return cached ?? network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") return event.respondWith(networkFirst(request));
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/")) return event.respondWith(cacheFirst(request));
    return event.respondWith(staleWhileRevalidate(request));
  }

  // Kode OCR dan transformers.js dari CDN berversi tetap, aman disimpan permanen.
  if (CDN_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(request, RUNTIME));
});
