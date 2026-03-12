// ═══════════════════════════════════════
// Astrum KoreLaj — Service Worker
// ═══════════════════════════════════════
const CACHE_NAME = 'astrum-korelaj-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/images/logo.png',
  'https://fonts.googleapis.com/css2?family=Exo+2:wght@200;400;600;700;900&family=Space+Mono:wght@400;700&display=swap'
];

// ─── Install : mise en cache des ressources statiques ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(() => cache.addAll(['/', '/index.html']));
    })
  );
  self.skipWaiting();
});

// ─── Activate : nettoyage des anciens caches ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch : stratégie cache-first pour statique ─────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les appels à l'API Anthropic
  if (url.hostname === 'api.anthropic.com') return;

  // Ne pas intercepter les requêtes POST
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Mettre en cache uniquement les ressources locales et Google Fonts
        if (
          url.origin === self.location.origin ||
          url.hostname === 'fonts.googleapis.com' ||
          url.hostname === 'fonts.gstatic.com'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Page hors-ligne de secours
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
