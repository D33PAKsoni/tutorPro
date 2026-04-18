// src/workers/sw.js
// Service Worker — push notification handler + read-only app-shell cache
// Placed in src/workers/ so Vite can process and register it via vite-plugin-pwa
// or via the explicit url: new URL('./workers/sw.js', import.meta.url) pattern.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ---- PUSH NOTIFICATION HANDLER ----
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'Tuition Pro', body: event.data?.text() || 'New update' };
  }

  const title = data.title || 'Tuition Pro';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'tuition-pro',
    renotify: true,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction ?? false,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ---- NOTIFICATION CLICK HANDLER ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ---- FETCH CACHE (App Shell — read-only offline support) ----
const CACHE_NAME = 'tuition-pro-v1';

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin (Supabase API, Google, fonts CDN handled by browser)
  if (url.origin !== self.location.origin) return;

  // Skip Supabase REST calls — always go network
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
