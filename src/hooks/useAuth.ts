import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type User, signOut as firebaseSignOut, GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
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

        // Handle redirect result on native platform
        const handleRedirectResult = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    // This will throw if there's no pending redirect result
                    await getRedirectResult(auth);
                } catch (e) {
                    // No pending result - this is normal
                }
            }
        };
        handleRedirectResult();

        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (cancelled) return;
            try {
                setUser(firebaseUser);
                if (firebaseUser) {
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
    }, []);

    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            setError(null);

            // For native Android, use Google Sign-In plugin
            if (Capacitor.isNativePlatform()) {
                try {
                    const googleUser = await GoogleAuth.signIn();
                    const idToken = googleUser.authentication.idToken;

                    if (!idToken) {
                        throw new Error("No idToken received from Google Auth");
                    }

                    const credential = GoogleAuthProvider.credential(idToken);
                    await signInWithCredential(auth, credential);
                } catch (nativeErr: any) {
                    console.error('Native Google Auth failed:', nativeErr);
                    // Try alternative method using redirect (works in WebView)
                    const provider = new GoogleAuthProvider();
                    provider.setCustomParameters({
                        prompt: 'select_account'
                    });
                    // Use redirect instead of popup for native
                    await signInWithRedirect(auth, provider);
                }
            } else {
                // Web - use popup
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({
                    prompt: 'select_account'
                });
                await signInWithPopup(auth, provider);
            }

        } catch (err: any) {
            console.error('Sign in error:', err);
            const errorMessage = err.message || "Something went wrong";
            setError(`Inloggning misslyckades: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setError(null);
            await firebaseSignOut(auth);
            if (Capacitor.isNativePlatform()) {
                await GoogleAuth.signOut();
            }
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
