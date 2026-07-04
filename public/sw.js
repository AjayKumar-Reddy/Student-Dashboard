// Simple pass-through and caching service worker for PWA support
const CACHE_NAME = 'msr-insight-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all fetch requests
  event.respondWith(fetch(event.request));
});
