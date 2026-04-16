import { db, auth } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface AppNotification {
    id: string;
    to: string;
    from: string;
    title: string;
    body: string;
    type: 'friend_request' | 'plan_update' | 'plan_complete';
    relatedId?: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt: Timestamp;
}

export async function sendAppNotification(
    to: string,
    title: string,
    body: string,
    type: AppNotification['type'],
    relatedId?: string
) {
    try {
        const notificationsRef = collection(db, 'notifications');
        await addDoc(notificationsRef, {
            to,
            from: auth.currentUser?.uid || 'system',
            title,
            body,
            type,
            relatedId,
            status: 'pending',
            createdAt: Timestamp.now()
        });
    } catch (err) {
        console.error('[sendAppNotification] Failed:', err);
    }
}
