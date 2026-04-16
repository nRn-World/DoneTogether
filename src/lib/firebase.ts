import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCA_1UxB7z86TvyIEpgqnTwnUgqOWTEf_4';
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'donetogether-v1.firebaseapp.com';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'donetogether-v1';
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'donetogether-v1.firebasestorage.app';
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '677287957451';
const appId = import.meta.env.VITE_FIREBASE_APP_ID || '1:677287957451:web:812a897c8f906a63b8dc4e';
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX';

const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true
});

let messagingInstance = null;
try {
  if (!Capacitor.isNativePlatform()) {
    messagingInstance = getMessaging(app);
  }
} catch (err) {
  console.error('Firebase Messaging initialization failed', err);
}
export const messaging = messagingInstance;

export const googleProvider = new GoogleAuthProvider();

// FÖR CAPACITOR: Använd en mycket enklare approach - låt Firebase hantera redirect automatiskt
// Istället för att försöka sätta custom redirect_uri, låt Firebase använda sin standardkonfiguration
// Capacitor's WebView kommer automatiskt att hantera redirecten tillbaka till appen
googleProvider.setCustomParameters({
    prompt: 'select_account'
});
