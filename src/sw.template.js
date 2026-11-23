/* Service worker (generated into dist/sw.js at build time; __VERSION__ and __PRECACHE__ are filled in).
   - The app shell (HTML, hashed JS/CSS, vendor libraries, icons) is cached on install, so the app opens offline.
   - Pages load network-first, so an online launch always gets the newest HTML; offline falls back to the cached copy.
   - Other same-origin files are cache-first (they are content-hashed or versioned).
   - Google Fonts are stale-while-revalidate. Everything else (Supabase) always goes to the network.
   A new version waits until the page asks it to take over (the "update" bar), so nothing swaps mid-session. */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = 'skipd-shell-' + VERSION;
const RUNTIME = 'skipd-runtime';
const FONTS = 'skipd-fonts';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [SHELL, RUNTIME, FONTS];
    for(const key of await caches.keys()) if(key.startsWith('skipd-') && !keep.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(req.mode === 'navigate') { event.respondWith(page(req)); return; }
  if(url.origin === location.origin) {
    if(url.pathname.startsWith('/cdn-cgi/') || url.pathname === '/sw.js') return;
    event.respondWith(cacheFirst(req));
    return;
  }
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') event.respondWith(staleWhileRevalidate(req));
});

async function page(req) {
  try {
    return await Promise.race([fetch(req), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))]);
  } catch {
    return (await caches.match('/', { cacheName: SHELL, ignoreVary: true })) || (await caches.match('/', { ignoreVary: true })) || Response.error();
  }
}

async function cacheFirst(req) {
  // ignoreVary: servers may send Vary: Origin, and script/style requests carry an Origin header
  const hit = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
  if(hit) return hit;
  const res = await fetch(req);
  if(res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  const fresh = fetch(req).then(res => { if(res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || fresh;
}
