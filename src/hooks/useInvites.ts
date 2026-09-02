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

    // Strip query/hash/trailing slash and non-code chars
    code = code.split('?')[0].split('#')[0].replace(/\/+$/, '');
    code = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return code;
}

function appBasePath(): string {
    // Vite base is "./" on GitHub Pages → pathname like /DoneTogether/ or /DoneTogether/index.html
    const path = window.location.pathname;
    if (path.includes('/DoneTogether')) {
        return '/DoneTogether';
    }
    // Local / custom domain
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0 && !segments[0].includes('.')) {
        // If hosted in a subfolder SPA, keep first segment only when not join
        if (segments[0].toLowerCase() !== 'join') {
            // default: origin root for local vite
        }
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

export async function getInviteByCode(code: string): Promise<PlanInvite | null> {
    const inviteRef = doc(db, 'planInvites', code);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) return null;

    const invite = { id: inviteSnap.id, ...inviteSnap.data() } as PlanInvite;

    if (invite.expiresAt && invite.expiresAt.toMillis() < Date.now()) {
        return null;
    }

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
        return null;
    }
}

export function generateInviteLink(code: string): string {
    const base = appBasePath();
    return `${window.location.origin}${base}/join/${code}`;
}
