const SW_VERSION = 'ru-le-2026-06-25-01';
const CACHE_NAME = `ru-le-${SW_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data === 'skipWaiting' || (event.data && event.data.type === 'skipWaiting')){
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  if(url.origin !== location.origin) return;

  if(request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')){
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function networkFirst(request, fallbackUrl){
  const cache = await caches.open(CACHE_NAME);
  try{
    const fresh = await fetch(new Request(request, { cache: 'reload' }));
    if(fresh && fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  }catch(err){
    const cached = await cache.match(request);
    if(cached) return cached;
    if(fallbackUrl){
      const fallback = await cache.match(fallbackUrl);
      if(fallback) return fallback;
    }
    throw err;
  }
}
