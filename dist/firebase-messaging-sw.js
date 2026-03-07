// Import the functions you need from the SDKs you need
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
    apiKey: "AIzaSyDsGmC9FOrwuJQMqFKhmCuxiJIP0vxoTBU",
    authDomain: "donetogether-v1.firebaseapp.com",
    projectId: "donetogether-v1",
    storageBucket: "donetogether-v1.firebasestorage.app",
    messagingSenderId: "677287957451",
    appId: "1:677287957451:web:812a897c8f906a63b8dc4e",
    measurementId: "G-XXXXXXXXXX"
});

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
