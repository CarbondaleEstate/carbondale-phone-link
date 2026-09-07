const VERSION = 'carbondale-phone-link-sw-0.4';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); }
    catch (_) {
      try { data = { body: event.data.text() }; }
      catch (_) { data = {}; }
    }
  }

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
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/carbondale-phone-link/';
  event.waitUntil((async () => {
    const absolute = new URL(target, self.location.origin).href;
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      if ('navigate' in client) {
        try { await client.navigate(absolute); } catch (_) {}
      }
      if ('focus' in client) {
        await client.focus();
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(absolute);
  })());
});
