/* Quotely service worker. Deliberately small and safe:
 *  - pages always come from the network (quotes and invoices must never be stale or shown to the wrong person);
 *  - if the network is down, a friendly offline page is shown instead of the browser's error;
 *  - only immutable build files and the app icons are cached, so repeat visits start faster.
 */
const VERSION = "v1";
const SHELL = `quotely-shell-${VERSION}`;
const STATIC = `quotely-static-${VERSION}`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, STATIC].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never touch saves, sends or approvals
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: network first, offline page as the fallback.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline").then((r) => r || Response.error())));
    return;
  }

  // Build files never change under the same name, so serve them from cache.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then((cache) =>
        cache.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })),
      ),
    );
  }
});
