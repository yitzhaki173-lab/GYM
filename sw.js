/* ICON GYM service worker.
 * Bump VERSION on every release (together with APP_VERSION in js/app.js):
 * installed apps detect the change and show "גרסה חדשה זמינה".
 */
const VERSION = '1.1.0';
const CACHE = 'icongym-' + VERSION;
const FONT_CACHE = 'icongym-fonts';
const DB_CACHE = 'icongym-exdb'; // online exercise database + its photos
const PHOTO_KEYS = ['incline_press', 'bench_press', 'pec_deck', 'pec_deck_straight', 'reverse_fly', 'dips', 'push_up', 'db_curl', 'hammer_curl', 'cable_curl', 'ez_curl', 'lat_pulldown', 'close_pulldown', 'pullup', 'seated_row', 'db_shoulder_press', 'lateral_raise', 'rope_pushdown', 'bar_pushdown', 'overhead_ext', 'one_arm_ext', 'leg_press', 'leg_curl', 'leg_extension', 'squat', 'calf_raise', 'plank', 'crunch', 'run'];
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/photos.js', 'js/musclemap.js', 'js/media.js', 'js/program.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  ...PHOTO_KEYS.flatMap((k) => [`img/ex/${k}/0.jpg`, `img/ex/${k}/1.jpg`]),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  const keep = [CACHE, FONT_CACHE, DB_CACHE];
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// cache-first for things that never change (fonts, dataset photos); network-first for the dataset index
const cacheFirst = (cacheName, req) => caches.open(cacheName).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; })));
const networkFirst = (cacheName, req) => caches.open(cacheName).then((c) => fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => c.match(req).then((hit) => hit || Promise.reject(new Error('offline')))));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(cacheFirst(FONT_CACHE, req)); return; }
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/free-exercise-db/')) {
    e.respondWith(url.pathname.endsWith('.json') ? networkFirst(DB_CACHE, req) : cacheFirst(DB_CACHE, req));
    return;
  }
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
