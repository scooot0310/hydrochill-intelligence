// ─────────────────────────────────────────────
//  HydroChill Intelligence — Service Worker
// ─────────────────────────────────────────────
//  Strategy:
//    • HTML & manifest → network-first (so updates show up fast)
//    • Icons & static assets → cache-first
//    • Firebase requests → never cached (always live)
//
//  When you change HTML/manifest/sw, bump CACHE_VERSION below.
//  Old caches are auto-deleted on activation.
// ─────────────────────────────────────────────

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME    = `hydrochill-${CACHE_VERSION}`;

// Files to pre-cache on install (the app shell)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

// ── INSTALL ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())  // activate new SW immediately
  );
});

// ── ACTIVATE ─────────────────────────────────
//  Delete any old caches that don't match the current version.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('hydrochill-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // take control of open pages
  );
});

// ── FETCH ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache Firebase API calls — always go live.
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firebasedatabase.app') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
    return;  // let the browser handle it normally
  }

  // Only handle GETs.
  if (req.method !== 'GET') return;

  // HTML & manifest → network-first (fall back to cache when offline).
  const isAppShell = req.mode === 'navigate' ||
                     req.destination === 'document' ||
                     url.pathname.endsWith('.html') ||
                     url.pathname.endsWith('.webmanifest');

  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Update cache in the background so next offline load is fresh.
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Everything else (icons, etc.) → cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((res) => {
        // Only cache successful, same-origin responses.
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

// ── MESSAGE (optional: lets the page force an update) ─────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
