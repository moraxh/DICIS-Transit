const CACHE_VERSION = "v2";
const STATIC_CACHE = `dicis-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dicis-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Cache-first: static assets
const CACHE_FIRST_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  /\/manifest\.webmanifest/,
];

// Network-first: API auth routes (never cache)
const NETWORK_ONLY_PATTERNS = [/\/api\/auth\//];

// (reserved for future public data routes)
const SWR_PATTERNS = [];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Network-only for auth — pass through, no SW involvement
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname))) return;

  // Cache-first for static assets
  if (CACHE_FIRST_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return res;
        });
      }),
    );
    return;
  }

  // Stale-while-revalidate for public API data
  if (SWR_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((res) => {
            cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        return (
          cached ?? (await networkPromise) ?? new Response("", { status: 503 })
        );
      }),
    );
    return;
  }

  // Navigation: do not intercept — auth middleware redirects make caching unreliable
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "DICIS Transit", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find(
          (c) => c.url.includes(url) && "focus" in c,
        );
        if (existing) return existing.focus();
        return clients.openWindow(url);
      }),
  );
});
