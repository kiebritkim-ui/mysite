// Service Worker for Life OS — background reminder notifications
const CACHE_NAME = 'lifeos-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
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
