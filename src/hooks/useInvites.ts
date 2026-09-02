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
import { addMemberToPlan } from './useFirestore';
import type { UserProfile } from '../types';

function generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/** Normalize pasted invite input → 6-char code */
export function extractInviteCode(raw: string): string {
    let code = raw.trim();
    try {
        if (code.includes('://') || code.startsWith('/')) {
            const url = code.includes('://') ? new URL(code) : new URL(code, window.location.origin);
            code = url.pathname;
        }
    } catch {
        /* keep as-is */
    }

    if (code.includes('/join/')) {
        code = code.split('/join/').pop() || code;
    }

    code = code.split('?')[0].split('#')[0].replace(/\/+$/, '');
    code = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return code;
}

function appBasePath(): string {
    const path = window.location.pathname;
    if (path.includes('/DoneTogether')) {
        return '/DoneTogether';
    }
    return '';
}

export async function getOrCreatePlanInvite(
    planId: string,
    planName: string,
    createdBy: string,
    createdByName: string
): Promise<string> {
    const q = query(collection(db, 'planInvites'), where('planId', '==', planId));
    const querySnapshot = await getDocs(q);

    const activeInvite = querySnapshot.docs.find((d) => {
        const data = d.data();
        if (!data.expiresAt) return true;
        return data.expiresAt.toMillis() > Date.now();
    });

    if (activeInvite) {
        return activeInvite.id;
    }

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

    await setDoc(doc(db, 'planInvites', code), invite);
    return code;
}

export async function validateAndIncrementInvite(code: string): Promise<PlanInvite | null> {
    const normalized = extractInviteCode(code);
    if (!normalized) return null;

    const inviteRef = doc(db, 'planInvites', normalized);

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

            return { ...inviteData, id: inviteSnap.id } as PlanInvite;
        });

        return invite;
    } catch (err) {
        console.error('[validateAndIncrementInvite]', err);
        // Fallback: read without increment (still allow join if invite is valid)
        try {
            const snap = await getDoc(inviteRef);
            if (!snap.exists()) return null;
            const data = { id: snap.id, ...snap.data() } as PlanInvite;
            if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) return null;
            if (data.maxUses && data.useCount >= data.maxUses) return null;
            return data;
        } catch (e2) {
            console.error('[validateAndIncrementInvite fallback]', e2);
            return null;
        }
    }
}

/**
 * Full join flow with clear errors for the UI.
 */
export async function joinPlanWithInviteCode(
    rawCode: string,
    profile: Pick<UserProfile, 'uid' | 'email' | 'displayName' | 'photoURL'>
): Promise<{ planId: string; planName: string }> {
    const code = extractInviteCode(rawCode);
    if (!code) {
        throw new Error('INVALID_CODE');
    }

    const invite = await validateAndIncrementInvite(code);
    if (!invite?.planId) {
        throw new Error('INVALID_CODE');
    }

    try {
        await addMemberToPlan(
            invite.planId,
            profile.uid,
            profile.email,
            profile.displayName,
            profile.photoURL
        );
    } catch (err: unknown) {
        const codeName =
            err && typeof err === 'object' && 'code' in err
                ? String((err as { code?: string }).code)
                : '';
        const message =
            err && typeof err === 'object' && 'message' in err
                ? String((err as { message?: string }).message)
                : String(err);
        console.error('[joinPlanWithInviteCode] addMember failed:', codeName, message);
        if (codeName === 'permission-denied' || /permission/i.test(message)) {
            throw new Error('PERMISSION_DENIED');
        }
        if (/unsupported field value|undefined/i.test(message)) {
            throw new Error('INVALID_DATA');
        }
        throw new Error('JOIN_FAILED');
    }

    return { planId: invite.planId, planName: invite.planName };
}

export function generateInviteLink(code: string): string {
    const base = appBasePath();
    return `${window.location.origin}${base}/join/${code}`;
}
