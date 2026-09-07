const VERSION = 'carbondale-phone-link-sw-0.2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data ? event.data.text() : 'Carbondale notification.' }; }
  const title = data.title || 'CARBONDALE';
  const options = {
    body: data.body || 'Estate communication received.',
    tag: data.tag || 'carbondale-phone-link',
    renotify: true,
    data: { url: data.url || '/carbondale-phone-link/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/carbondale-phone-link/';
  event.waitUntil((async () => {
    const list = await clients.matchAll({type:'window', includeUncontrolled:true});
    for (const client of list) {
      if ('focus' in client) { await client.focus(); return; }
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
