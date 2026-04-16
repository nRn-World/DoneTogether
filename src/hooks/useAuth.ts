import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    type User,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { i18n } = useTranslation();

    useEffect(() => {
        let profileUnsubscribe: (() => void) | null = null;
        let cancelled = false;

        console.log('[useAuth] Setting up onAuthStateChanged listener');

        getRedirectResult(auth).catch((err: any) => {
            console.error('[useAuth] getRedirectResult error:', err);
            if (cancelled) return;
            const errorCode = err?.code as string | undefined;
            const errorMessage = err?.message || 'Something went wrong';
            setError(`Inloggning misslyckades: ${errorCode ? `${errorCode}: ` : ''}${errorMessage}`);
        });

        // Add a fallback timeout to prevent infinite loading screen
        const timeoutId = setTimeout(() => {
            if (cancelled) return;
            setLoading((prev) => {
                if (!prev) return prev;
                console.warn('[useAuth] Auth listener timed out after 10s. Forcing loading to false.');
                return false;
            });
        }, 10000);

        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            console.log('[useAuth] onAuthStateChanged triggered, user:', firebaseUser?.email || 'null', 'cancelled:', cancelled);
            clearTimeout(timeoutId);
            if (cancelled) return;
            try {
                setUser(firebaseUser);
                if (firebaseUser) {
                    console.log('[useAuth] User logged in, setting up profile listener for uid:', firebaseUser.uid);
                    const userRef = doc(db, 'users', firebaseUser.uid);

                    profileUnsubscribe = onSnapshot(userRef, async (docSnap) => {
                        if (cancelled) return;
                        if (docSnap.exists()) {
                            const profile = docSnap.data() as UserProfile;
                            setUserProfile(profile);

                            if (profile.language && profile.language !== i18n.language) {
                                i18n.changeLanguage(profile.language);
                            }
                        } else {
                            const newProfile: UserProfile = {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email || '',
                                displayName: firebaseUser.displayName || 'User',
                                photoURL: firebaseUser.photoURL || undefined,
                                friends: [],
                                createdAt: Timestamp.now(),
                                language: i18n.language || 'en',
                            };
                            await setDoc(userRef, newProfile);
                            setUserProfile(newProfile);
                        }
                        setLoading(false);
                    }, () => {
                        if (!cancelled) setLoading(false);
                    });
                } else {
                    setUserProfile(null);
                    if (profileUnsubscribe) {
                        profileUnsubscribe();
                        profileUnsubscribe = null;
                    }
                    setLoading(false);
                }
            } catch {
                if (!cancelled) setLoading(false);
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
            if (profileUnsubscribe) {
                profileUnsubscribe();
                profileUnsubscribe = null;
            }
        };
    }, [i18n]);

    const signInWithGoogle = async () => {
        console.log('[useAuth] signInWithGoogle started');
        try {
            setLoading(true);
            setError(null);

            console.log('[useAuth] Native platform:', Capacitor.isNativePlatform());

            if (Capacitor.isNativePlatform()) {
                console.log('[useAuth] Calling GoogleAuth.signIn()');
                const googleUser = await GoogleAuth.signIn();
                console.log('[useAuth] GoogleAuth.signIn() success, user:', googleUser.email);

                const idToken = googleUser.authentication.idToken;
                if (!idToken) {
                    throw new Error("No idToken received from Google Auth");
                }

                console.log('[useAuth] Creating credential and signing in with Firebase');
                const credential = GoogleAuthProvider.credential(idToken);
                const result = await signInWithCredential(auth, credential);
                console.log('[useAuth] Firebase sign-in success:', result.user.email);
            } else {
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({
                    prompt: 'select_account'
                });
                console.log('[useAuth] Web platform, calling signInWithPopup (fallback to redirect)');
                try {
                    await signInWithPopup(auth, provider);
                } catch (err: any) {
                    const code = err?.code as string | undefined;
                    const shouldFallbackToRedirect = code === 'auth/popup-blocked'
                        || code === 'auth/popup-closed-by-user'
                        || code === 'auth/cancelled-popup-request'
                        || code === 'auth/operation-not-supported-in-this-environment';

                    if (shouldFallbackToRedirect) {
                        await signInWithRedirect(auth, provider);
                        return;
                    }

                    throw err;
                }
            }

        } catch (err: any) {
            console.error('Sign in error:', err);
            const errorCode = err?.code as string | undefined;
            const errorMessage = err?.message || "Something went wrong";
            setError(`Inloggning misslyckades: ${errorCode ? `${errorCode}: ` : ''}${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setError(null);
            await firebaseSignOut(auth);
        } catch (err: any) {
            console.error('Sign out error:', err);
            setError('Utloggning misslyckades');
        }
    };

    return {
        user,
        userProfile,
        loading,
        error,
        signInWithGoogle,
        signOut,
        isAuthenticated: !!user
    };
}
