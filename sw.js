/* sw.js — Service Worker لصفحة المدرب (الجدول المعتمد)
   ضعه في جذر المستودع بجانب index.html.
   - تصفّح/تحميل: الشبكة أولاً مع رجوع للكاش عند انقطاع الإنترنت (لا يحبسك على نسخة قديمة).
   - إشعارات Web Push: يستقبلها ويعرضها حتى والتطبيق مغلق والشاشة مقفلة. */

const CACHE = 'jadwal-coach-v2';

self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = (await caches.match('./index.html')) || (await caches.match('./'));
        if (idx) return idx;
      }
      throw err;
    }
  })());
});

/* ---------- Web Push ---------- */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (_) { try { d = { body: e.data ? e.data.text() : '' }; } catch (e2) { d = {}; } }
  const title = d.title || 'الجدول المعتمد';
  const opts = {
    body: d.body || '',
    data: { url: d.url || './' },
    dir: 'rtl',
    lang: 'ar',
    tag: d.tag || 'jadwal',
    renotify: true,
    vibrate: [120, 60, 120]
  };
  if (d.icon) opts.icon = d.icon;
  if (d.badge) opts.badge = d.badge;
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { c.focus(); return; } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
