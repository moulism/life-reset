// Service worker – aplikace funguje offline. Při každé nové verzi zvyš VERSION.
const VERSION = 'lr-v1.1.0';
const SHELL = [
  './', 'index.html', 'config.js', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/auth-ui.js', 'js/store.js', 'js/sync.js', 'js/game.js', 'js/ui.js', 'js/common.js',
  'js/data/defaults.js', 'js/data/books.js', 'js/data/mealplan.js',
  'js/pages/home.js', 'js/pages/calendar.js', 'js/pages/tasks.js', 'js/pages/food.js', 'js/pages/map.js',
  'js/pages/diary.js', 'js/pages/hustles.js', 'js/pages/school.js', 'js/pages/archive.js', 'js/pages/gym.js',
  'js/pages/finance.js', 'js/pages/books.js', 'js/pages/notes.js', 'js/pages/shop.js', 'js/pages/settings.js',
  'js/pages/onboarding.js', 'vendor/chart.umd.min.js', 'vendor/supabase.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return; // data vždy živě
  const cdn = /(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com)$/.test(url.hostname);
  if (url.origin !== location.origin && !cdn) return;
  // stale-while-revalidate: hned z cache, na pozadí aktualizuj
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: url.origin === location.origin });
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit || (req.mode === 'navigate' ? cache.match('index.html') : undefined));
    return hit || net;
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(w => 'focus' in w);
    return c ? c.focus() : self.clients.openWindow('./#/calendar');
  }));
});
