// public/push-handler.js
// Imported by the Workbox-generated sw.js via importScripts().
// Contains ONLY push and notification click handlers.
// DO NOT add install/activate/fetch handlers here — Workbox owns those.

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; }
  catch { data = { title: 'Tuition Pro', body: event.data?.text() || 'New update' }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tuition Pro', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'tuition-pro',
      renotify: true,
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction ?? false,
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
