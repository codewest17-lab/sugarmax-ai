// SugarMax AI — service worker
// Caches static assets (CSS/JS/icons) for faster repeat loads and PWA
// installability. Deliberately does NOT cache HTML pages or API calls —
// this app is auth/session-dependent, so serving a stale cached page could
// show the wrong logged-in state. Pages always go to the network; only the
// unchanging static shell is cached.

const CACHE_NAME = "sugarmax-static-v1";
const STATIC_ASSETS = [
  "/css/styles.css",
  "/js/components.js",
  "/js/supabase-client.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for static assets — everything
  // else (HTML navigation, Supabase/Paystack/Gemini calls) goes straight
  // to the network untouched.
  const isStaticAsset =
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/css/") || url.pathname.startsWith("/js/") || url.pathname.startsWith("/icons/"));

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
