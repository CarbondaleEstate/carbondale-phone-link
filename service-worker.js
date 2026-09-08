const VERSION = '1.8';
const DB_NAME = 'carbondale-phone-link';
const DB_VERSION = 1;
const STORE = 'state';
const PENDING_KEY = 'pending-request';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  await self.clients.claim();
  const list = await clients.matchAll({ type:'window', includeUncontrolled:true });
  for (const client of list) {
    try { client.postMessage({ type:'carbondale-app-update', version:VERSION }); } catch (_) {}
  }
})()));

// Never serve a stale application shell from a service-worker cache. GitHub
// Pages remains the source of truth; navigation requests go to the network.
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(new Request(event.request, { cache:'reload' })));
  }
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open request store.'));
  });
}

async function dbPut(key, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not save request.'));
      tx.onabort = () => reject(tx.error || new Error('Could not save request.'));
    });
  } finally { db.close(); }
}

function parseRequestUrl(rawUrl) {
  try {
    const u = new URL(rawUrl, self.location.origin);
    const requestID = u.searchParams.get('request') || '';
    const relayTopic = u.searchParams.get('topic') || '';
    const app = (u.searchParams.get('app') || 'Carbondale').slice(0, 80);
    if (!/^[a-f0-9]{32}$/.test(requestID)) return null;
    if (!/^carbondale-[a-f0-9]{48}$/.test(relayTopic)) return null;
    return {
      version: 1,
      requestID,
      relayTopic,
      app,
      receivedAt: Date.now(),
      url: u.href
    };
  } catch (_) { return null; }
}

async function rememberRequest(rawUrl) {
  const req = parseRequestUrl(rawUrl);
  if (!req) return null;
  await dbPut(PENDING_KEY, req);
  return req;
}

async function tellOpenClients(rawUrl) {
  const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of list) {
    try { client.postMessage({ type:'carbondale-request', url:rawUrl }); } catch (_) {}
  }
  return list;
}

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data = {};
    if (event.data) {
      try { data = event.data.json(); }
      catch (_) {
        try { data = { body: event.data.text() }; }
        catch (_) { data = {}; }
      }
    }

    let title = 'CARBONDALE';
    let body = 'Estate communication received.';
    let target = '/carbondale-phone-link/';

    if (data && data.web_push === 8030 && data.notification) {
      const n = data.notification;
      title = n.title || title;
      body = n.body || body;
      target = n.navigate || target;
    } else {
      title = (data && data.title) || title;
      body = (data && data.body) || body;
      target = (data && data.url) || target;
    }

    const absolute = new URL(target, self.location.origin).href;
    const req = await rememberRequest(absolute).catch(() => null);
    await tellOpenClients(absolute).catch(() => {});

    await self.registration.showNotification(title, {
      body,
      tag: req ? ('carbondale-request-' + req.requestID) : ('carbondale-phone-link-' + Date.now()),
      data: { url:absolute }
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/carbondale-phone-link/';
  event.waitUntil((async () => {
    const absolute = new URL(target, self.location.origin).href;
    await rememberRequest(absolute).catch(() => null);
    const list = await clients.matchAll({ type:'window', includeUncontrolled:true });

    for (const client of list) {
      try { client.postMessage({ type:'carbondale-request', url:absolute }); } catch (_) {}
      if ('navigate' in client) {
        try { await client.navigate(absolute); } catch (_) {}
      }
      if ('focus' in client) {
        try { await client.focus(); } catch (_) {}
        return;
      }
    }

    if (clients.openWindow) await clients.openWindow(absolute);
  })());
});
