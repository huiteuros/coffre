// Service worker : rend l'appli installable et jouable hors ligne.
// Fichiers du jeu : réseau d'abord (toujours la dernière version en ligne), cache si hors ligne.
// API : jamais mise en cache. Polices Google : cache d'abord.
const CACHE = 'chambre-forte-v1';
const FONT_CACHE = 'chambre-forte-polices';

const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/main.js', 'js/state.js', 'js/data.js', 'js/formulas.js', 'js/rules.js', 'js/achievements.js',
  'js/format.js', 'js/audio.js', 'js/dom.js', 'js/effects.js', 'js/ui.js', 'js/game.js',
  'js/save.js', 'js/api.js', 'js/account.js', 'js/install.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Polices : cache d'abord, elles ne changent pas
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== location.origin || url.pathname.includes('/api/')) return;

  // Fichiers du jeu : réseau d'abord, puis cache
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(async () => (await caches.match(req, { ignoreSearch: true }))
        || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
  );
});
