/* =========================================================
   MEHFIL — PWA Service Worker
   App-shell caching only. Live APIs and media stay network-only.
   ========================================================= */
"use strict";

const CACHE_NAME = "mehfil-shell-v1";
const APP_SHELL = [
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/css/style.css",
    "/css/modals.css",
    "/js/api.js",
    "/js/socket.js",
    "/js/player.js",
    "/js/visualizer.js",
    "/js/app.js",
    "/js/pwa.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key.startsWith("mehfil-shell-") && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Never serve API, serverless, or Socket.IO responses from the app-shell cache.
    if (
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/.netlify/") ||
        url.pathname.startsWith("/socket.io/")
    ) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            const response = await fetch(request);
            if (response && response.ok && response.type === "basic") {
                try {
                    await cache.put(request, response.clone());
                } catch (cacheError) {
                    // A cache quota issue must not prevent the online response.
                    console.warn("[MEHFIL PWA] Cache update skipped:", cacheError);
                }
            }
            return response;
        } catch (networkError) {
            const cached = await cache.match(request);
            if (cached) return cached;

            if (request.mode === "navigate") {
                return (await cache.match("/index.html")) || Response.error();
            }
            return Response.error();
        }
    })());
});
