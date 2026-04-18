// src/workers/sw.js
// Full Workbox-powered Service Worker.
// Handles: precaching, runtime caching strategies, push notifications,
// notification click navigation, and offline fallback.
// This file is processed by vite-plugin-pwa via workbox-build.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ---- Precache the app shell (injected by vite-plugin-pwa) ----
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ---- SPA Navigation: serve index.html for all app routes ----
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
});
registerRoute(navigationRoute);

// ---- Cache Google Fonts stylesheets (StaleWhileRevalidate) ----
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// ---- Cache Google Fonts files (CacheFirst, 1 year) ----
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// ---- Cache Material Icons (CacheFirst) ----
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' && url.pathname.includes('Material+Symbols'),
  new CacheFirst({
    cacheName: 'material-icons',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// ---- Supabase REST API (NetworkFirst with offline fallback) ----
// Read-only caching — mutations (POST/PATCH/DELETE) bypass cache automatically
registerRoute(
  ({ url, request }) =>
    url.hostname.includes('supabase.co') &&
    url.pathname.includes('/rest/v1/') &&
    request.method === 'GET',
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// ---- Static assets (JS, CSS, images) — CacheFirst ----
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

// ============================================================
// PUSH NOTIFICATION HANDLER
// ============================================================
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: 'Tuition Pro', body: event.data?.text() || 'You have a new update' };
  }

  const title = payload.title || 'Tuition Pro';
  const options = {
    body:              payload.body || '',
    icon:              '/icons/icon-192.png',
    badge:             '/icons/icon-192.png',
    tag:               payload.tag || 'tuition-pro-notification',
    renotify:          true,
    requireInteraction: payload.requireInteraction ?? false,
    vibrate:           [200, 100, 200],
    data:              { url: payload.url || '/' },
    actions:           payload.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ============================================================
// NOTIFICATION CLICK: navigate to relevant page
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Re-focus existing window if available
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ============================================================
// NOTIFICATION CLOSE (analytics hook — optional)
// ============================================================
self.addEventListener('notificationclose', () => {
  // Future: track dismissal via analytics
});

// ============================================================
// BACKGROUND SYNC (future: offline mutation queue)
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    // Future: flush queued attendance records when back online
    event.waitUntil(Promise.resolve());
  }
});

// ============================================================
// ACTIVATE: claim clients immediately
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
