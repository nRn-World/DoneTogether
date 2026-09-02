import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
    ensureMessagingServiceWorker,
    ensureNotificationPermission,
    showLocalNotification
} from '../lib/notify';

const VAPID_KEY =
    import.meta.env.VITE_VAPID_KEY ||
    'BN4q6ahLqD56ssLIqw8C0CYOb70yDq_7ePfJ8xLO1wL8Uxz9nds2RzRB8gPsJ6_JSq37AxVI-z3ssg11Hz7KU3A';

export function useNotifications(userId: string | undefined) {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        if (!userId || Capacitor.isNativePlatform() || !messaging) return;

        let unsubscribeFirestore: (() => void) | undefined;
        let unsubscribeFCM: (() => void) | undefined;
        let cancelled = false;

        const setup = async () => {
            try {
                const permissionOk = await ensureNotificationPermission();
                if (cancelled || !permissionOk) return;

                const registration = await ensureMessagingServiceWorker();
                if (cancelled) return;

                if (registration && messaging) {
                    try {
                        const currentToken = await getToken(messaging, {
                            vapidKey: VAPID_KEY,
                            serviceWorkerRegistration: registration
                        });
                        if (currentToken && !cancelled) {
                            setToken(currentToken);
                            const userRef = doc(db, 'users', userId);
                            await updateDoc(userRef, {
                                fcmTokens: arrayUnion(currentToken)
                            });
                            console.info('[notify] FCM token saved');
                        }
                    } catch (error) {
                        console.error('[notify] Error getting FCM token:', error);
                    }
                }

                // Firestore "smart notifications" while the PWA is open
                const q = query(
                    collection(db, 'notifications'),
                    where('to', '==', userId),
                    where('status', '==', 'pending')
                );

                unsubscribeFirestore = onSnapshot(q, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type !== 'added') return;
                        const data = change.doc.data();
                        void showLocalNotification(
                            data.title || 'DoneTogether',
                            data.body || '',
                            { tag: `fs-${change.doc.id}`, requireInteraction: false }
                        );
                        updateDoc(change.doc.ref, { status: 'sent' }).catch((error) => {
                            console.error('Error updating notification status:', error);
                        });
                    });
                });

                if (messaging) {
                    unsubscribeFCM = onMessage(messaging, (payload) => {
                        if (!payload.notification) return;
                        void showLocalNotification(
                            payload.notification.title || 'DoneTogether',
                            payload.notification.body || '',
                            { tag: `fcm-fg-${Date.now()}`, requireInteraction: false }
                        );
                    });
                }
            } catch (e) {
                console.error('[notify] setup failed', e);
            }
        };

        void setup();

        return () => {
            cancelled = true;
            unsubscribeFirestore?.();
            unsubscribeFCM?.();
        };
    }, [userId]);

    return { token };
}
