/* Ru-Le PWA Service Worker
   方針: network-first。常に最新を取りに行き(更新を即反映＝スマホにすぐ反映)、
         取得できたらキャッシュも更新。オフライン時のみキャッシュへフォールバック。
   skipWaiting + clients.claim で新バージョンが即座に主導権を握る。 */
const CACHE = 'rule-pwa-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// ページからの skipWaiting 要求(新SWを待たせず即有効化)
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      // 同一オリジンの正常応答のみキャッシュ更新(CDNのPeerJS等は素通し)
      try {
        if (fresh && fresh.ok && new URL(req.url).origin === self.location.origin) {
          const c = await caches.open(CACHE);
          c.put(req, fresh.clone());
        }
      } catch (e2) {}
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = await caches.match('./index.html');
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
