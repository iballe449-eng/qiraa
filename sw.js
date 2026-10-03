/* Qirāʾa : fonctionnement hors ligne.
   Change VERSION à chaque mise à jour de index.html pour forcer le rafraîchissement. */
const VERSION = 'qiraa-v2';
const CDN = [];
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Pages : réseau d'abord, copie en cache en secours
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put('index.html', copy));
        return r;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }
  // Le reste (icônes, polices, MathJax) : cache d'abord, mise à jour en arrière-plan
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
