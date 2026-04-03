import {
    collection,
    setDoc,
    getDoc,
    getDocs,
    doc,
    updateDoc,
    increment,
    Timestamp,
    query,
    where,
    runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PlanInvite } from '../types';

function generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}



export async function getOrCreatePlanInvite(
    planId: string,
    planName: string,
    createdBy: string,
    createdByName: string
): Promise<string> {
    // Check for existing invite
    // querying only by planId to avoid needing a composite index for (planId + expiresAt)
    const q = query(
        collection(db, 'planInvites'),
        where('planId', '==', planId)
    );
    const querySnapshot = await getDocs(q);

    // Find valid active invite in memory
    const activeInvite = querySnapshot.docs.find(doc => {
        const data = doc.data();
        // Check if expired (if expiresAt exists)
        if (!data.expiresAt) return true;
        return data.expiresAt.toMillis() > Date.now();
    });

    if (activeInvite) {
        return activeInvite.id;
    }

    // Create new one if none exists
    // Default expiration: 7 days
    return createPlanInvite(planId, planName, createdBy, createdByName, 7);
}

export async function createPlanInvite(
    planId: string,
    planName: string,
    createdBy: string,
    createdByName: string,
    expiresInDays?: number,
    maxUses?: number
): Promise<string> {
    const code = generateInviteCode();

    const invite: Omit<PlanInvite, 'id'> = {
        planId,
        planName,
        createdBy,
        createdByName,
        createdAt: Timestamp.now(),
        expiresAt: expiresInDays
            ? Timestamp.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000))
            : null,
        maxUses: maxUses || null,
        useCount: 0,
    };

    // Use setDoc with custom ID (the code) instead of addDoc to make lookup easier if needed, 
    // but here we use the code as ID for easy joining.
    await setDoc(doc(db, 'planInvites', code), invite);
    return code;
}

export async function getInviteByCode(code: string): Promise<PlanInvite | null> {
    const inviteRef = doc(db, 'planInvites', code);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) return null;

    const invite = { id: inviteSnap.id, ...inviteSnap.data() } as PlanInvite;

    // Check if expired
    if (invite.expiresAt && invite.expiresAt.toMillis() < Date.now()) {
        return null;
    }

    // Check if max uses reached
    if (invite.maxUses && invite.useCount >= invite.maxUses) {
        return null;
    }

    return invite;
}

export async function incrementInviteUse(code: string): Promise<void> {
    const inviteRef = doc(db, 'planInvites', code);
    await updateDoc(inviteRef, {
        useCount: increment(1),
    });
}

export async function validateAndIncrementInvite(code: string): Promise<PlanInvite | null> {
    const inviteRef = doc(db, 'planInvites', code);

    try {
        const invite = await runTransaction(db, async (transaction) => {
            const inviteSnap = await transaction.get(inviteRef);

            if (!inviteSnap.exists()) return null;

            const inviteData = inviteSnap.data() as PlanInvite;

            if (inviteData.expiresAt && inviteData.expiresAt.toMillis() < Date.now()) {
                return null;
            }

            if (inviteData.maxUses && inviteData.useCount >= inviteData.maxUses) {
                return null;
            }

            transaction.update(inviteRef, {
                useCount: increment(1),
            });

            return { id: inviteSnap.id, ...inviteData } as PlanInvite;
        });

        return invite;
    } catch {
        return null;
    }
}

export function generateInviteLink(code: string): string {
    return `${window.location.origin}/join/${code}`;
}
