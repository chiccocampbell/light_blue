const CACHE = 'twonest-v1';
const CORE = ['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res=>{
    const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req, copy)); return res;
  }).catch(()=>cached)));
});