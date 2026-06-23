/* sw.js — Service Worker لصفحة المدرب (الجدول المعتمد)
   ضعه في جذر المستودع بجانب index.html (نفس مكان faiz9-sys.github.io/jadwal/sw.js).
   الاستراتيجية: الشبكة أولاً مع رجوع تلقائي للكاش عند انقطاع الإنترنت —
   فيعمل التطبيق بلا اتصال، ولا يحبسك على نسخة قديمة بعد رفع تحديث. */

const CACHE = 'jadwal-coach-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // طلبات GET من نفس الأصل فقط (نتجاهل POST وطلبات Firebase/خارجية)
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      // الشبكة أولاً
      const res = await fetch(req);
      // خزّن نسخة من الردود السليمة للرجوع إليها لاحقاً بلا إنترنت
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      // بلا إنترنت → من الكاش
      const cached = await caches.match(req);
      if (cached) return cached;
      // عند فتح الصفحة (تنقّل) أرجِع آخر نسخة مخزّنة من الصفحة
      if (req.mode === 'navigate') {
        const idx = (await caches.match('./index.html')) || (await caches.match('./'));
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
