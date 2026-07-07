/* Service Worker — NAVALCARE Vistoria de Veleiro
   Cache-first: depois de aberto uma vez (com internet), funciona 100% offline. */
const CACHE = 'navalcare-vistoria-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
/* Motor de OCR (leitura das placas) — cacheado em melhor esforço:
   se algum arquivo falhar, o app instala mesmo assim e o OCR
   é cacheado no primeiro uso online. */
const OCR = [
  './ocr/tesseract.min.js',
  './ocr/worker.min.js',
  './ocr/tesseract-core-lstm.wasm.js',
  './ocr/tesseract-core-simd-lstm.wasm.js',
  './ocr/tesseract-core-relaxedsimd-lstm.wasm.js',
  './ocr/eng.traineddata'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS)
        .then(() => Promise.allSettled(OCR.map((u) => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
