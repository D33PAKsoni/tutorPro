// public/sw-push.js
// Standalone service worker served from the root (required for push scope).
// Handles push notification display and click routing.
// This is a minimal SW registered alongside the Workbox SW from vite-plugin-pwa.
//
// IMPORTANT: This file must be served at /sw-push.js (public/ folder in Vite)
// so its scope covers the entire origin.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ---- Push event: show notification ----
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = {
      title: 'Tuition Pro',
      body: event.data?.text() || 'New notification',
    };
  }

  const title = data.title || 'Tuition Pro';
  const options = {
    body:    data.body || '',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    tag:     data.tag || 'tuition-pro',
    renotify: true,
    vibrate: [200, 100, 200],
    data:    { url: data.url || '/' },
    requireInteraction: !!data.requireInteraction,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ---- Notification click: open/focus app ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if (c.url.startsWith(self.location.origin) && 'focus' in c) {
            c.navigate(url);
            return c.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
