// Service worker PM Gudang — naikkan VERSION setiap ada update agar cache diperbarui
const VERSION = 'v12';
const CACHE = 'pm-gudang-' + VERSION;
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('pm-gudang-') && x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  // Share target: file dari app permintaan (menu bagikan) disimpan sementara, lalu dibaca index.html
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const files = (await req.formData()).getAll('files').filter(f => f && f.size);
        const c = await caches.open('pmg-share'), base = self.registration.scope;
        await Promise.all(files.map((f, i) => c.put(base + 'shared/' + i, new Response(f))));
        await c.put(base + 'shared/count', new Response(String(files.length)));
      } catch (x) {}
      return Response.redirect(self.registration.scope + 'index.html?shared=1', 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
  if (/\/(config|pin)\.js$/.test(new URL(req.url).pathname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return res; }).catch(() => caches.match('./index.html')));
    return;
  }
  if (new URL(req.url).origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; })));
  }
});
