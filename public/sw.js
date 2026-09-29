/* EmuRM service worker — offline shell + permanent cache for emulator cores.
 * ROMs and saves never pass through here: they live in IndexedDB. */
const VERSION = "emurm-v1";
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;
const CORES = "emurm-cores-v1"; // survives app updates; cores are versioned by URL

// Derived from where this worker was registered, so the same file works whether
// the app is served from the domain root or a subpath (e.g. GitHub Pages' /repo/).
const BASE = new URL(self.registration.scope).pathname;
const at = (p) => BASE + p;

const PRECACHE = [BASE, at("library/"), at("settings/"), at("play/"), at("manifest.webmanifest"), at("icons/icon.svg"), at("icons/icon-192.png")];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION) && k !== CORES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isCore = (url) =>
  (url.hostname === "cdn.jsdelivr.net" &&
    (url.pathname.includes("/retroarch-emscripten-build@") || url.pathname.includes("/@zip.js/") || url.pathname.includes("/glsl-shaders@"))) ||
  (url.origin === self.location.origin && url.pathname.startsWith(at("cores/")));

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

async function networkFirstPage(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match(BASE)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (isCore(url)) return event.respondWith(cacheFirst(req, CORES));
  if (url.origin !== self.location.origin) return; // ROM downloads etc. go straight to network

  if (req.mode === "navigate") return event.respondWith(networkFirstPage(req));
  if (url.pathname.startsWith(at("_next/static/")) || url.pathname.startsWith(at("icons/"))) {
    return event.respondWith(cacheFirst(req, STATIC));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "rv:skip-waiting") self.skipWaiting();
});
