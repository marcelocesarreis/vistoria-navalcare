/* Service Worker — NAVALCARE Vistoria de Veleiro
   Cache-first: depois de aberto uma vez (com internet), funciona 100% offline. */
const CACHE = 'navalcare-vistoria-v5';
/* OCR em cache separado e SEM versão: os arquivos do motor de leitura (16 MB)
   não mudam entre versões do app — atualizações não os re-baixam. */
const OCR_CACHE = 'navalcare-ocr-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
const OCR = [
  './ocr/tesseract.min.js',
  './ocr/worker.min.js',
  './ocr/tesseract-core-lstm.wasm.js',
  './ocr/tesseract-core-simd-lstm.wasm.js',
  './ocr/tesseract-core-relaxedsimd-lstm.wasm.js',
  './ocr/eng.traineddata'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    // OCR: melhor esforço, e só baixa o que ainda não está no cache
    const oc = await caches.open(OCR_CACHE);
    await Promise.allSettled(OCR.map(async (u) => {
      if (!(await oc.match(u))) await oc.add(u);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== OCR_CACHE).map((k) => caches.delete(k))))
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
          const dest = e.request.url.includes('/ocr/') ? OCR_CACHE : CACHE;
          caches.open(dest).then((c) => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
