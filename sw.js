/* Band Quest service worker: network-first (so a redeployed pieces.json shows up right away),
   falling back to the cache so the app works offline. */
const CACHE = 'band-quest-v10';
const SHELL = ['./','index.html','styles.css','app.js','sprites.js','game.js','teacher.js','pieces.json','manifest.webmanifest','fonts/LilitaOne-Regular.ttf',
  'icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // YouTube etc. go straight to the network
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const timeout = new Promise(r => setTimeout(() => r(null), 3500)); // slow network? use the cache
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    const r = await Promise.race([net, timeout]);
    if (r) return r;
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    return hit || (await net) || new Response('', { status: 504 });
  })());
});
