const CACHE = 'kosmanager-v10';
const STATIC = ['/icon-192.png', '/icon-512.png', '/manifest.json'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window'}).then(cs => cs.forEach(c => c.navigate(c.url))))
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (!url.hostname.includes('kosmanager') && !url.hostname.includes('pages.dev')) {
    e.respondWith(fetch(e.request).catch(() => new Response('offline',{status:503})));
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
