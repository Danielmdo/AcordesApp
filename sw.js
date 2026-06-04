// Service Worker for AcordesApp PWA
const CACHE_NAME = 'acordesapp-v1';

// Files to cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './sessionManager.js',
  './fileProcessor.js',
  './pageRenderer.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Install event - cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For CDN resources, use cache-first
  if (event.request.url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // For our own files, network first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});
