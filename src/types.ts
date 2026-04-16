import { Timestamp } from 'firebase/firestore';

export interface Reaction {
    userId: string;
    emoji: string;
    userName?: string;
    createdAt?: Timestamp;
}

export interface Item {
    id: string;
    text: string;
    checked: boolean;
    checkedBy?: string;
    checkedByUid?: string;
    imageUrl?: string;
    reactions?: Reaction[];
    location?: {
        latitude: number;
        longitude: number;
        name: string;
        address?: string;
        radius: number; // in meters
        active: boolean; // if tracking is enabled
    };
}

export interface PlanMember {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Timestamp;
}

export interface Plan {
    id: string;
    name: string;
    ownerId: string;
    members: { [uid: string]: PlanMember };
    items: Item[];
    created: Timestamp;
    completed: boolean;
    completedAt?: Timestamp;
    lastModified: Timestamp;
    imageUrl?: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    friends: string[];
    createdAt: Timestamp;
    fcmTokens?: string[];
    language?: string;
    savedLocations?: {
        home?: { latitude: number; longitude: number; address: string };
        work?: { latitude: number; longitude: number; address: string };
        fav1?: { latitude: number; longitude: number; address: string };
        fav2?: { latitude: number; longitude: number; address: string };
        customLabels?: { [key: string]: string };
    };
}

export interface PlanInvite {
    id: string;
    planId: string;
    planName: string;
    createdBy: string;
    createdByName: string;
    createdAt: Timestamp;
    expiresAt: Timestamp | null;
    maxUses: number | null;
    useCount: number;
}

export interface FriendRequest {
    id: string;
    from: string;
    fromEmail: string;
    fromName: string;
    fromPhoto?: string;
    to: string;
    toEmail: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Timestamp;
}
