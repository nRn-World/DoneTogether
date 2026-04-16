import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FriendRequest, UserProfile } from '../types';
import { sendAppNotification } from '../lib/notifications';

function getFriendshipId(a: string, b: string) {
    return [a, b].sort().join('_');
}

async function ensureFriendship(a: string, b: string) {
    const friendshipId = getFriendshipId(a, b);
    const ref = doc(db, 'friendships', friendshipId);
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    await setDoc(ref, {
        members: [a, b],
        createdAt: Timestamp.now()
    });
}

export function useFriends(userId: string | undefined) {
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setFriends([]);
            setLoading(false);
            return;
        }

        const migrateLegacyFriends = async () => {
            try {
                const userSnap = await getDoc(doc(db, 'users', userId));
                const legacyFriends = (userSnap.data() as UserProfile | undefined)?.friends || [];
                if (!Array.isArray(legacyFriends) || legacyFriends.length === 0) return;
                await Promise.all(
                    legacyFriends.map(async (friendId) => {
                        if (typeof friendId !== 'string' || friendId.length === 0) return;
                        await ensureFriendship(userId, friendId);
                    })
                );
            } catch (err) {
                console.error('Error migrating legacy friends:', err);
            }
        };
        migrateLegacyFriends();

        const friendshipsQuery = query(
            collection(db, 'friendships'),
            where('members', 'array-contains', userId)
        );

        const unsubscribe = onSnapshot(friendshipsQuery, async (snapshot) => {
            const friendIds = snapshot.docs
                .map((d) => (d.data() as { members?: string[] })?.members || [])
                .map((members) => members.find((m) => m !== userId))
                .filter((id): id is string => typeof id === 'string' && id.length > 0);

            if (friendIds.length === 0) {
                setFriends([]);
                setLoading(false);
                return;
            }

            const friendProfiles = await Promise.all(
                friendIds.map(async (friendId) => {
                    const friendDoc = await getDoc(doc(db, 'users', friendId));
                    return friendDoc.exists() ? (friendDoc.data() as UserProfile) : null;
                })
            );

            setFriends(friendProfiles.filter((f): f is UserProfile => f !== null));
            setLoading(false);
        }, (error) => {
            console.error('Error fetching friendships:', error);
            setFriends([]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { friends, loading };
}

export function useFriendRequests(userId: string | undefined) {
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setIncomingRequests([]);
            setOutgoingRequests([]);
            setLoading(false);
            return;
        }

        // Listen to incoming requests
        const incomingQuery = query(
            collection(db, 'friendRequests'),
            where('to', '==', userId),
            where('status', '==', 'pending')
        );

        const unsubscribe1 = onSnapshot(incomingQuery, (snapshot) => {
            const requests: FriendRequest[] = [];
            snapshot.forEach((doc) => {
                requests.push({ id: doc.id, ...doc.data() } as FriendRequest);
            });
            setIncomingRequests(requests);
            setLoading(false);
        });

        // Listen to outgoing requests
        const outgoingQuery = query(
            collection(db, 'friendRequests'),
            where('from', '==', userId),
            where('status', '==', 'pending')
        );

        const unsubscribe2 = onSnapshot(outgoingQuery, (snapshot) => {
            const requests: FriendRequest[] = [];
            snapshot.forEach((doc) => {
                requests.push({ id: doc.id, ...doc.data() } as FriendRequest);
            });
            setOutgoingRequests(requests);
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, [userId]);

    return { incomingRequests, outgoingRequests, loading };
}

export async function searchUserByEmail(email: string): Promise<UserProfile | null> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    return snapshot.docs[0].data() as UserProfile;
}

export async function sendFriendRequest(
    fromUser: UserProfile,
    toUser: UserProfile
): Promise<void> {
    const friendshipId = getFriendshipId(fromUser.uid, toUser.uid);
    const existingFriendship = await getDoc(doc(db, 'friendships', friendshipId));
    if (existingFriendship.exists()) {
        throw new Error('Already friends');
    }

    // Check if request already exists
    const existingQuery = query(
        collection(db, 'friendRequests'),
        where('from', '==', fromUser.uid),
        where('to', '==', toUser.uid),
        where('status', '==', 'pending')
    );
    const existing = await getDocs(existingQuery);

    if (!existing.empty) {
        throw new Error('Friend request already sent');
    }

    // Create friend request
    await addDoc(collection(db, 'friendRequests'), {
        from: fromUser.uid,
        fromEmail: fromUser.email,
        fromName: fromUser.displayName,
        fromPhoto: fromUser.photoURL || '',
        to: toUser.uid,
        toEmail: toUser.email,
        status: 'pending',
        createdAt: Timestamp.now(),
    });

    // Send notification
    await sendAppNotification(
        toUser.uid,
        'Ny vänförfrågan! 👋',
        `${fromUser.displayName} vill lägga till dig som vän.`,
        'friend_request'
    );
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) return;

    const request = requestSnap.data() as FriendRequest;

    await ensureFriendship(request.from, request.to);

    // Update request status
    await updateDoc(requestRef, {
        status: 'accepted',
    });

    // Send notification to the sender that the request was accepted
    await sendAppNotification(
        request.from,
        'Vänförfrågan accepterad! 🎉',
        `${request.toEmail} har accepterat din förfrågan.`,
        'friend_request'
    );
}

export async function declineFriendRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, 'friendRequests', requestId);
    await updateDoc(requestRef, {
        status: 'declined',
    });
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
    const friendshipId = getFriendshipId(userId, friendId);
    await deleteDoc(doc(db, 'friendships', friendshipId));
}
