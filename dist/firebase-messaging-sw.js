/* eslint-disable no-undef */
// Firebase Messaging service worker for DoneTogether PWA (GitHub Pages /DoneTogether/)
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCA_1UxB7z86TvyIEpgqnTwnUgqOWTEf_4',
  authDomain: 'donetogether-v1.firebaseapp.com',
  projectId: 'donetogether-v1',
  storageBucket: 'donetogether-v1.firebasestorage.app',
  messagingSenderId: '677287957451',
  appId: '1:677287957451:web:812a897c8f906a63b8dc4e',
  measurementId: 'G-8L45T1C49B'
});

const messaging = firebase.messaging();

function iconUrl() {
  try {
    return new URL('pwa-icon.png', self.registration.scope).href;
  } catch (e) {
    return 'pwa-icon.png';
  }
}

messaging.onBackgroundMessage(function (payload) {
  const notification = (payload && payload.notification) || {};
  const title = notification.title || 'DoneTogether';
  const options = {
    body: notification.body || '',
    icon: iconUrl(),
    badge: iconUrl(),
    data: {
      url: self.registration.scope
    }
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    })
  );
});

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});
