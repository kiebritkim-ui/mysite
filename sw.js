// Service Worker for Life OS — background reminder notifications
const CACHE_NAME = 'lifeos-v2';

self.addEventListener('install', event => {
  self.skipWaiting(); // Force immediate activation
});

self.addEventListener('activate', event => {
  // Clear ALL old caches
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Listen for messages from main app to schedule notifications
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    const { name, delay, body } = event.data;
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(`🔔 ${name}`, {
          body: body,
          icon: '/mysite/icon-192.png',
          badge: '/mysite/icon-192.png',
          tag: name,
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [{ action: 'open', title: 'Open Life OS' }]
        });
      }, delay);
    }
  }
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/mysite/index.html')
  );
});
