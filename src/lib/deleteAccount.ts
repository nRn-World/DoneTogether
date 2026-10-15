import {
    GoogleAuthProvider,
    deleteUser,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
} from 'firebase/auth';
import { collection, deleteDoc, deleteField, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth, db } from './firebase';
import GeofencePlugin from './geofence';
import type { Plan } from '../types';

/** True while deleteAccount runs, so useAuth doesn't recreate the profile it just deleted. */
export let deletingAccount = false;

/** Fresh Google sign-in is required by Firebase before deleting an account. */
async function reauthenticate() {
    const user = auth.currentUser;
    if (!user) throw new Error('NOT_SIGNED_IN');
    if (Capacitor.isNativePlatform()) {
        const google = await GoogleAuth.signIn();
        const idToken = google.authentication.idToken;
        if (!idToken) throw new Error('NO_ID_TOKEN');
        await reauthenticateWithCredential(user, GoogleAuthProvider.credential(idToken));
    } else {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
    }
}

/**
 * Permanently deletes the signed-in user's account and data:
 * plans only they belong to are deleted, shared plans just lose them as a member,
 * friendships and the profile are removed, then the Firebase Auth user.
 * Friend requests, invites and admin-chat messages cannot be deleted by clients (see firestore.rules).
 */
export async function deleteAccount(): Promise<void> {
    await reauthenticate();
    deletingAccount = true;
    try {
        await deleteAccountData();
    } finally {
        deletingAccount = false;
    }
}

async function deleteAccountData(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('NOT_SIGNED_IN');
    const uid = user.uid;

    const plans = await getDocs(query(collection(db, 'plans'), where(`members.${uid}`, '!=', null)));
    for (const snap of plans.docs) {
        const plan = snap.data() as Plan;
        const others = Object.keys(plan.members || {}).filter((m) => m !== uid);
        if (others.length === 0) {
            await deleteDoc(snap.ref);
            continue;
        }
        const update: Record<string, unknown> = { [`members.${uid}`]: deleteField() };
        if (plan.ownerId === uid) update.ownerId = others[0];
        await updateDoc(snap.ref, update);
    }

    const friendships = await getDocs(query(collection(db, 'friendships'), where('members', 'array-contains', uid)));
    await Promise.all(friendships.docs.map((d) => deleteDoc(d.ref)));

    if (Capacitor.isNativePlatform()) {
        await GeofencePlugin.removeGeofences().catch(() => undefined);
    }

    await deleteDoc(doc(db, 'users', uid));
    await deleteUser(user);
}
