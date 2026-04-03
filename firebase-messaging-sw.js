// Import the functions you need from the SDKs you need
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
// Firebase config is injected via index.html into self.__firebaseConfig
// This avoids hardcoding credentials in the service worker
if (!self.__firebaseConfig) {
    console.error('Firebase config not injected. See .env.example for setup.');
} else {
    firebase.initializeApp(self.__firebaseConfig);
}

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    // Customize notification here
    const notification = payload && payload.notification ? payload.notification : {};
    const notificationTitle = notification.title || 'DoneTogether';
    const notificationOptions = {
        body: notification.body || '',
        icon: '/pwa-icon.png'
    };

    self.registration.showNotification(notificationTitle,
        notificationOptions);
});
