import {
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { isAdminEmail } from '../lib/admin';
import { db } from '../lib/firebase';
import { sendAppNotification } from '../lib/notifications';
import { isDemoMode } from '../lib/demoMode';
import type { AdminChatMessage, AdminChatSender, AdminThread } from '../types/adminChat';

const THREADS = 'adminThreads';

function startOfTodayMs(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function toMillis(value: unknown): number | null {
    if (!value) return null;
    if (value instanceof Timestamp) return value.toMillis();
    if (typeof value === 'object' && value !== null && 'toMillis' in value) {
        try {
            return (value as Timestamp).toMillis();
        } catch {
            return null;
        }
    }
    return null;
}

export function getUserSendBlockReason(messages: AdminChatMessage[]): string | null {
    const last = messages.length > 0 ? messages[messages.length - 1] : null;
    if (last?.from === 'user') return 'awaiting_reply';
    if (last?.from === 'admin') return null;

    const today = startOfTodayMs();
    const sentToday = messages.some((m) => {
        if (m.from !== 'user') return false;
        const ms = toMillis(m.createdAt);
        return ms != null && ms >= today;
    });
    if (sentToday) return 'daily_limit';
    return null;
}

export async function sendAdminChatMessage(params: {
    threadUserId: string;
    sender: AdminChatSender;
    senderUid: string;
    text: string;
    /** Profile of the thread owner (the regular user), not the admin */
    threadUser: { email: string; displayName: string; photoURL?: string };
}): Promise<void> {
    const text = params.text.trim();
    if (!text) throw new Error('empty');
    if (isDemoMode()) throw new Error('demo');

    const threadRef = doc(db, THREADS, params.threadUserId);
    const messagesRef = collection(db, THREADS, params.threadUserId, 'messages');
    const existing = await getDoc(threadRef);
    const fromUser = params.sender === 'user';
    const now = Timestamp.now();

    await addDoc(messagesRef, {
        from: params.sender,
        fromUid: params.senderUid,
        text,
        createdAt: now,
    });

    const base = {
        userId: params.threadUserId,
        userEmail: params.threadUser.email,
        userName: params.threadUser.displayName,
        ...(params.threadUser.photoURL ? { userPhoto: params.threadUser.photoURL } : {}),
        lastMessage: text.slice(0, 200),
        lastMessageAt: now,
        lastSender: params.sender,
        awaitingAdminReply: fromUser,
        unreadByAdmin: fromUser,
        unreadByUser: !fromUser,
        updatedAt: now,
    };

    if (!existing.exists()) {
        await setDoc(threadRef, { ...base, createdAt: now });
    } else {
        await updateDoc(threadRef, base);
    }

    try {
        // Only notify regular users when admin replies. Admin uses inbox badge instead.
        if (!fromUser) {
            await sendAppNotification(
                params.threadUserId,
                'Svar från admin',
                text.slice(0, 120),
                'admin_chat',
                params.threadUserId
            );
        }
    } catch (err) {
        console.warn('[adminChat] notify skipped', err);
    }
}

export async function deleteAdminChatMessage(threadUserId: string, messageId: string): Promise<void> {
    if (isDemoMode()) return;
    await deleteDoc(doc(db, THREADS, threadUserId, 'messages', messageId));
}

export function useAdminThreadMessages(threadUserId: string | undefined, enabled: boolean) {
    const [messages, setMessages] = useState<AdminChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || !threadUserId || isDemoMode()) {
            setMessages([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, THREADS, threadUserId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                setMessages(
                    snap.docs.map((d) => ({
                        id: d.id,
                        ...(d.data() as Omit<AdminChatMessage, 'id'>),
                    }))
                );
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('[adminChat] messages', err);
                const code = (err as { code?: string })?.code || '';
                if (code.includes('permission')) {
                    setError('Behörighet saknas. Publicera firestore.rules i Firebase Console.');
                } else {
                    setError('Kunde inte ladda meddelanden');
                }
                setLoading(false);
            }
        );

        return () => unsub();
    }, [threadUserId, enabled]);

    return { messages, loading, error };
}

export function useAdminInbox(adminEmail: string | null | undefined, enabled: boolean) {
    const allowed = enabled && isAdminEmail(adminEmail);
    const [threads, setThreads] = useState<Array<AdminThread & { id: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!allowed || isDemoMode()) {
            setThreads([]);
            return;
        }
        setLoading(true);
        const q = query(collection(db, THREADS), orderBy('lastMessageAt', 'desc'));
        const unsub = onSnapshot(
            q,
            (snap) => {
                setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminThread) })));
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('[adminChat] inbox', err);
                setError('Kunde inte ladda inkorg');
                setLoading(false);
            }
        );
        return () => unsub();
    }, [allowed]);

    const unreadCount = useMemo(
        () => threads.filter((t) => t.unreadByAdmin || t.awaitingAdminReply).length,
        [threads]
    );

    return { threads, loading, error, unreadCount, allowed };
}

export function useMyAdminChatAlert(userId: string | undefined, enabled: boolean) {
    const [hasUnread, setHasUnread] = useState(false);
    const [preview, setPreview] = useState('');

    useEffect(() => {
        if (!enabled || !userId || isDemoMode()) {
            setHasUnread(false);
            setPreview('');
            return;
        }

        const ref = doc(db, THREADS, userId);
        return onSnapshot(
            ref,
            (snap) => {
                if (!snap.exists()) {
                    setHasUnread(false);
                    setPreview('');
                    return;
                }
                const data = snap.data() as AdminThread;
                const unread = data.unreadByUser === true && data.lastSender === 'admin';
                setHasUnread(unread);
                setPreview(unread ? data.lastMessage || '' : '');
            },
            () => {
                setHasUnread(false);
                setPreview('');
            }
        );
    }, [userId, enabled]);

    return { hasUnread, preview };
}

export async function markThreadRead(threadUserId: string, as: 'admin' | 'user') {
    if (isDemoMode()) return;
    const ref = doc(db, THREADS, threadUserId);
    try {
        if (as === 'admin') {
            await updateDoc(ref, { unreadByAdmin: false, updatedAt: Timestamp.now() });
        } else {
            await updateDoc(ref, { unreadByUser: false, updatedAt: Timestamp.now() });
        }
    } catch {
        // ignore
    }
}
