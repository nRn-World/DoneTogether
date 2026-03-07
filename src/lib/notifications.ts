import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface AppNotification {
    id: string;
    to: string; // recipient userId
    title: string;
    body: string;
    type: 'friend_request' | 'plan_update' | 'plan_complete';
    relatedId?: string; // planId or requestId
    status: 'pending' | 'sent' | 'failed';
    createdAt: Timestamp;
}

/**
 * Queues a notification in Firestore to be sent via Cloud Functions (or handled by an observer)
 */
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
            title,
            body,
            type,
            relatedId,
            status: 'pending',
            createdAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error queuing notification:', error);
    }
}
