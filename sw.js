// Service Worker для Sudoku Duel
// Стратегия: Network First для HTML, Cache Fallback для статики

const CACHE_NAME = 'sudoku-duel-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Установка: кешируем статику
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Активация: чистим старые кеши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: HTML — сначала сеть, фолбэк кеш. Статика — кеш, фолбэк сеть.
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Не вмешиваемся в Supabase / Telegram / Google auth / CDN
  if (
    url.host.includes('supabase.co') ||
    url.host.includes('telegram.org') ||
    url.host.includes('googleapis.com') ||
    url.host.includes('gstatic.com') ||
    url.host.includes('accounts.google.com') ||
    url.host.includes('jsdelivr.net')
  ) {
    return;
  }

  // HTML-навигация: network first
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Статика: cache first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});