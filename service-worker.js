const VERSION = 'carbondale-phone-link-sw-0.3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      try {
        data = { body: event.data.text() };
      } catch (_) {
        data = {};
      }
    }
  }

  // Declarative Web Push may arrive in the standardized envelope.
  if (data && data.web_push === 8030 && data.notification) {
    const n = data.notification;
    event.waitUntil(self.registration.showNotification(
      n.title || 'CARBONDALE',
      {
        body: n.body || 'Estate communication received.',
        tag: 'carbondale-phone-link',
        renotify: true,
        data: { url: n.navigate || '/carbondale-phone-link/' }
      }
    ));
    return;
  }

  const title = (data && data.title) || 'CARBONDALE';
  const options = {
    body: (data && data.body) || 'Estate communication received.',
    tag: (data && data.tag) || 'carbondale-phone-link',
    renotify: true,
    data: { url: (data && data.url) || '/carbondale-phone-link/' }
  };

  // Deliberately no icon/badge URLs here. This build has no external
  // notification assets, so notification display cannot fail on a missing file.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/carbondale-phone-link/';
  event.waitUntil((async () => {
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      if ('focus' in client) {
        await client.focus();
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
