// Myostat Service Worker — Stage 14
const CACHE_VERSION = "v1";
const STATIC_CACHE = `myostat-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `myostat-dynamic-${CACHE_VERSION}`;
const API_CACHE = `myostat-api-${CACHE_VERSION}`;

// Static assets to precache on install
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.json",
  "/logo.svg",
  "/icons/icon.svg",
];

// API routes to cache with stale-while-revalidate
const SWR_API_PATTERNS = [
  /\/api\/readiness/,
  /\/api\/recovery/,
  /\/api\/nutrition/,
  /\/api\/workouts/,
  /\/api\/analytics/,
  /\/api\/reports/,
  /\/api\/wearables\/metrics/,
];

// API routes with longer cache (24h)
const LONG_CACHE_API_PATTERNS = [
  /\/api\/analytics\/trends/,
  /\/api\/reports\/yearly/,
  /\/api\/reports\/monthly/,
];

const LONG_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h in ms
const SHORT_CACHE_TTL = 10 * 60 * 1000; // 10 min in ms

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k !== STATIC_CACHE &&
                k !== DYNAMIC_CACHE &&
                k !== API_CACHE
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, chrome-extension, and Supabase direct calls
  if (
    request.method !== "GET" ||
    url.protocol === "chrome-extension:" ||
    url.hostname.includes("supabase.co")
  ) {
    return;
  }

  // API routes — stale-while-revalidate or long-cache
  if (url.pathname.startsWith("/api/")) {
    if (LONG_CACHE_API_PATTERNS.some((p) => p.test(url.pathname))) {
      event.respondWith(cacheFirst(request, API_CACHE, LONG_CACHE_TTL));
    } else if (SWR_API_PATTERNS.some((p) => p.test(url.pathname))) {
      event.respondWith(staleWhileRevalidate(request, API_CACHE, SHORT_CACHE_TTL));
    }
    return;
  }

  // Next.js internals — network only
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // HTML navigation — network first, offline fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/offline");
        })
    );
    return;
  }

  // Everything else — cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()));
        }
        return res;
      });
    })
  );
});

// ── Background sync ───────────────────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "offline-queue-sync") {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.postMessage({ type: "SYNC_REQUESTED" }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function staleWhileRevalidate(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok) {
        const clone = res.clone();
        const headers = new Headers(clone.headers);
        headers.set("sw-cached-at", Date.now().toString());
        // Store with timestamp metadata
        cache.put(request, new Response(clone.body, { status: clone.status, headers }));
      }
      return res;
    })
    .catch(() => cached);

  if (cached) {
    const cachedAt = parseInt(cached.headers.get("sw-cached-at") || "0");
    if (Date.now() - cachedAt < ttl) {
      return cached;
    }
  }

  return fetchPromise;
}

async function cacheFirst(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const cachedAt = parseInt(cached.headers.get("sw-cached-at") || "0");
    if (Date.now() - cachedAt < ttl) {
      return cached;
    }
  }

  try {
    const res = await fetch(request);
    if (res.ok) {
      const headers = new Headers(res.headers);
      headers.set("sw-cached-at", Date.now().toString());
      cache.put(request, new Response(res.clone().body, { status: res.status, headers }));
    }
    return res;
  } catch {
    return cached || new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
