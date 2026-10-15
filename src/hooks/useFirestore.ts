import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    updateDoc,
    Timestamp,
    arrayUnion,
    addDoc,
    deleteDoc,
    deleteField,
    runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Plan, PlanMember, Item } from '../types';
import { sendAppNotification } from '../lib/notifications';
import {
    isDemoMode,
    getDemoPlans,
    subscribeDemoPlans,
    createDemoPlan,
    updateDemoPlan,
    deleteDemoPlan,
    getDemoPlan,
    addDemoItem,
    updateDemoItems,
} from '../lib/demoMode';

export function usePlans(userId: string | undefined) {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setPlans([]);
            setLoading(false);
            return;
        }

        if (isDemoMode()) {
            const sync = () => {
                setPlans(
                    getDemoPlans().sort((a, b) => {
                        const timeA = a.created?.toMillis?.() || 0;
                        const timeB = b.created?.toMillis?.() || 0;
                        return timeB - timeA;
                    })
                );
                setLoading(false);
                setError(null);
            };
            sync();
            return subscribeDemoPlans(sync);
        }

        const plansRef = collection(db, 'plans');
        const q = query(plansRef, where(`members.${userId}`, '!=', null));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const plansData: Plan[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    plansData.push({
                        id: doc.id,
                        ...data,
                        items: data.items || [],
                        members: data.members || {},
                    } as Plan);
                });
                setPlans(plansData.sort((a, b) => {
                    const timeA = a.created?.toMillis?.() || 0;
                    const timeB = b.created?.toMillis?.() || 0;
                    return timeB - timeA;
                }));
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching plans:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    return { plans, loading, error };
}

export function usePlan(planId: string | null) {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!planId) {
            setPlan(null);
            setLoading(false);
            return;
        }

        if (isDemoMode()) {
            const sync = () => {
                setPlan(getDemoPlan(planId));
                setLoading(false);
                setError(null);
            };
            sync();
            return subscribeDemoPlans(sync);
        }

        const planRef = doc(db, 'plans', planId);

        const unsubscribe = onSnapshot(
            planRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setPlan({
                        id: snapshot.id,
                        ...data,
                        items: data.items || [],
                        members: data.members || {},
                    } as Plan);
                } else {
                    setPlan(null);
                }
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching plan:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [planId]);

    return { plan, loading, error };
}

// Plan CRUD operations
export async function createPlan(
    name: string,
    userId: string,
    userEmail: string,
    userName: string,
    userPhoto?: string,
    imageUrl?: string
): Promise<string> {
    if (isDemoMode()) {
        return createDemoPlan(name, userId, userEmail, userName, userPhoto, imageUrl);
    }

    const plansRef = collection(db, 'plans');
    const ownerMember: PlanMember = {
        uid: userId,
        email: userEmail || '',
        displayName: userName || 'Ägare',
        role: 'owner',
        joinedAt: Timestamp.now(),
    };
    if (userPhoto) ownerMember.photoURL = userPhoto;

    const newPlan: Omit<Plan, 'id'> = {
        name,
        ownerId: userId,
        members: {
            [userId]: ownerMember,
        },
        items: [],
        created: Timestamp.now(),
        completed: false,
        lastModified: Timestamp.now(),
        notificationsEnabled: false,
    };
    if (imageUrl) newPlan.imageUrl = imageUrl;

    const docRef = await addDoc(plansRef, newPlan);
    return docRef.id;
}

export async function updatePlan(planId: string, updates: Partial<Plan>) {
    if (isDemoMode()) {
        updateDemoPlan(planId, updates);
        return;
    }

    const planRef = doc(db, 'plans', planId);

    // If we are reopening a plan, clear the completedAt timestamp
    const finalUpdates: Record<string, unknown> = { ...updates };
    if (updates.completed === false) {
        finalUpdates.completedAt = deleteField();
    }

    await updateDoc(planRef, {
        ...finalUpdates,
        lastModified: Timestamp.now(),
    });
}

export async function deletePlan(planId: string) {
    if (isDemoMode()) {
        deleteDemoPlan(planId);
        return;
    }
    const planRef = doc(db, 'plans', planId);
    await deleteDoc(planRef);
}

export async function addItemToPlan(planId: string, text: string, userId: string, userName: string, imageUrl?: string, location?: Item['location']): Promise<void> {
    if (isDemoMode()) {
        addDemoItem(planId, text, imageUrl, location);
        return;
    }

    const planRef = doc(db, 'plans', planId);
    const newItem: Item = {
        id: crypto.randomUUID(),
        text,
        checked: false,
        imageUrl,
        location
    };
    await updateDoc(planRef, {
        items: arrayUnion(newItem),
        lastModified: Timestamp.now(),
        completed: false, // Reset completed if new item added
        completedAt: null, // Clear completion timestamp
    });

    // Notify others only when the plan owner has enabled plan notifications
    const planSnap = await getDoc(planRef);
    if (planSnap.exists()) {
        const plan = planSnap.data() as Plan;
        if (plan.notificationsEnabled === true) {
            Object.keys(plan.members).forEach(uid => {
                if (uid !== userId) {
                    sendAppNotification(uid, 'Ny punkt! 💡', `${userName} la till "${text}" i ${plan.name}`, 'plan_update', planId);
                }
            });
        }
    }
}

/**
 * Read-modify-write of plan.items inside a transaction, so two members editing at once
 * don't overwrite each other. `compute` returns the new items, or null to abort.
 */
async function mutatePlanItems(
    planId: string,
    compute: (plan: Plan) => Item[] | null,
    updateCompletion = true
): Promise<{ plan: Plan; items: Item[]; allChecked: boolean } | null> {
    const planRef = doc(db, 'plans', planId);
    return runTransaction(db, async (tx) => {
        const snap = await tx.get(planRef);
        if (!snap.exists()) return null;
        const plan = snap.data() as Plan;
        const items = compute(plan);
        if (!items) return null;
        const allChecked = items.length > 0 && items.every((i) => i.checked);
        const update: Record<string, unknown> = { items, lastModified: Timestamp.now() };
        if (updateCompletion) {
            update.completed = allChecked;
            update.completedAt = allChecked ? Timestamp.now() : null;
        }
        tx.update(planRef, update);
        return { plan, items, allChecked };
    });
}

export async function updateItem(planId: string, itemId: string, updates: Partial<Item>): Promise<void> {
    if (isDemoMode()) {
        const plan = getDemoPlan(planId);
        if (!plan) return;
        const updatedItems = plan.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
        );
        const allChecked = updatedItems.length > 0 && updatedItems.every((i) => i.checked);
        updateDemoItems(planId, updatedItems, allChecked);
        return;
    }

    const result = await mutatePlanItems(planId, (plan) =>
        plan.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
    if (!result) return;
    const { plan, allChecked } = result;

    if (allChecked && plan.notificationsEnabled === true) {
        Object.keys(plan.members).forEach(uid => {
            sendAppNotification(uid, 'Plan slutförd! 🎉', `Planen "${plan.name}" är nu helt klar!`, 'plan_complete', planId);
        });
    }
}

export async function deleteItem(planId: string, itemId: string): Promise<void> {
    if (isDemoMode()) {
        const plan = getDemoPlan(planId);
        if (!plan) return;
        const updatedItems = plan.items.filter((item) => item.id !== itemId);
        const allChecked = updatedItems.length > 0 && updatedItems.every((i) => i.checked);
        updateDemoItems(planId, updatedItems, allChecked);
        return;
    }

    const result = await mutatePlanItems(planId, (plan) =>
        plan.items.filter((item) => item.id !== itemId)
    );
    if (!result) return;
    const { plan, allChecked } = result;

    if (allChecked && plan.notificationsEnabled === true) {
        Object.keys(plan.members).forEach(uid => {
            sendAppNotification(uid, 'Plan slutförd! 🎉', `Planen "${plan.name}" är nu helt klar!`, 'plan_complete', planId);
        });
    }
}

export async function toggleItemChecked(
    planId: string,
    itemId: string,
    userId: string,
    displayName: string
): Promise<void> {
    if (isDemoMode()) {
        const plan = getDemoPlan(planId);
        if (!plan) return;
        const item = plan.items.find(i => i.id === itemId);
        if (!item) return;
        const updatedItems = plan.items.map((i) => {
            if (i.id === itemId) {
                const newChecked = !i.checked;
                return {
                    ...i,
                    checked: newChecked,
                    checkedBy: newChecked ? displayName : undefined,
                    checkedByUid: newChecked ? userId : undefined,
                };
            }
            return i;
        });
        const allChecked = updatedItems.length > 0 && updatedItems.every((i) => i.checked);
        updateDemoItems(planId, updatedItems, allChecked);
        return;
    }

    let item: Item | undefined;
    const result = await mutatePlanItems(planId, (plan) => {
        item = plan.items.find((i) => i.id === itemId);
        if (!item) return null;
        return plan.items.map((i) => {
            if (i.id !== itemId) return i;
            const newChecked = !i.checked;
            return {
                ...i,
                checked: newChecked,
                checkedBy: newChecked ? displayName : undefined,
                checkedByUid: newChecked ? userId : undefined,
            };
        });
    });
    if (!result || !item) return;
    const { plan, allChecked } = result;
    const isNowChecked = !item.checked;
    const itemText = item.text;

    if (plan.notificationsEnabled === true) {
        Object.keys(plan.members).forEach(uid => {
            if (uid !== userId) { // Don't notify the person who did it
                if (allChecked && isNowChecked) {
                    sendAppNotification(uid, 'Plan slutförd! 🎉', `Planen "${plan.name}" är nu helt klar!`, 'plan_complete', planId);
                } else if (isNowChecked) {
                    sendAppNotification(uid, 'Punkt avklarad! ✅', `${displayName} fixade "${itemText}" i ${plan.name}`, 'plan_update', planId);
                }
            }
        });
    }
}

export async function addMemberToPlan(
    planId: string,
    userId: string,
    userEmail: string,
    displayName: string,
    photoURL?: string,
    role: 'editor' | 'viewer' = 'editor'
): Promise<void> {
    const planRef = doc(db, 'plans', planId);

    const member: PlanMember = {
        uid: userId,
        email: userEmail || '',
        displayName: displayName || 'Medlem',
        role,
        joinedAt: Timestamp.now(),
    };
    if (photoURL) {
        member.photoURL = photoURL;
    }

    try {
        await updateDoc(planRef, {
            [`members.${userId}`]: member,
            lastModified: Timestamp.now(),
        });
    } catch (err: unknown) {
        // If already a member, some rule sets reject "re-adding" — treat as success when readable
        const existing = await getDoc(planRef).catch(() => null);
        if (existing?.exists() && existing.data()?.members?.[userId]) {
            return;
        }
        throw err;
    }

    try {
        const planSnap = await getDoc(planRef);
        const plan = planSnap.data();
        const planName = plan?.name || 'en plan';
        const memberIds = Object.keys(plan?.members || {}).filter((uid) => uid !== userId);
        await Promise.all(
            memberIds.map((uid) =>
                sendAppNotification(
                    uid,
                    'Ny medlem i planen! 🤝',
                    `${displayName || 'Någon'} gick med i "${planName}".`,
                    'plan_update',
                    planId
                )
            )
        );
    } catch (err) {
        console.warn('[addMemberToPlan] notify skipped:', err);
    }
}

export async function removeMemberFromPlan(planId: string, userId: string): Promise<void> {
    const planRef = doc(db, 'plans', planId);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) return;

    const plan = planSnap.data() as Plan;
    const updatedMembers = { ...plan.members };
    delete updatedMembers[userId];

    await updateDoc(planRef, {
        members: updatedMembers,
        lastModified: Timestamp.now(),
    });
}

export async function toggleReaction(
    planId: string,
    itemId: string,
    userId: string,
    userName: string,
    emoji: string
): Promise<void> {
    if (isDemoMode()) {
        const plan = getDemoPlan(planId);
        if (!plan) return;
        const item = plan.items.find(i => i.id === itemId);
        if (!item) return;
        const reactions = item.reactions || [];
        const existingIndex = reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
        const updatedReactions = existingIndex > -1
            ? reactions.filter((_, i) => i !== existingIndex)
            : [...reactions, { userId, userName, emoji }];
        const updatedItems = plan.items.map(i =>
            i.id === itemId ? { ...i, reactions: updatedReactions } : i
        );
        updateDemoItems(planId, updatedItems, plan.completed);
        return;
    }

    let added = false;
    let target: Item | undefined;
    const result = await mutatePlanItems(
        planId,
        (plan) => {
            target = plan.items.find((i) => i.id === itemId);
            if (!target) return null;
            const reactions = target.reactions || [];
            const existingIndex = reactions.findIndex((r) => r.userId === userId && r.emoji === emoji);
            added = existingIndex === -1;
            const updatedReactions = added
                ? [...reactions, { userId, userName, emoji }]
                : reactions.filter((_, i) => i !== existingIndex);
            return plan.items.map((i) => (i.id === itemId ? { ...i, reactions: updatedReactions } : i));
        },
        false
    );
    if (!result || !target) return;
    const { plan } = result;
    const item = target as Item;

    if (added) {
        // Notify the person who checked/uploaded the item (if it's not the same person)
        const recipientId = item.checkedByUid || plan.ownerId;
        if (recipientId !== userId) {
            sendAppNotification(
                recipientId,
                `${userName} reagerade! ${emoji}`,
                `${userName} gav en reaktion på "${item.text}" i ${plan.name}`,
                'plan_update',
                planId
            );
        }
    }
}
