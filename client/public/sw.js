// Minimal Service Worker to enable 1-tap PWA "Add to my Apps" install prompt
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
    // Network pass-through
});
