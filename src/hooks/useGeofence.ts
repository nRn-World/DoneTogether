import { useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePlans } from './useFirestore';
import GeofencePlugin, { type GeofenceData } from '../lib/geofence';
import { showLocalNotification } from '../lib/notify';
import { evaluateGeofenceSample } from '../lib/geofenceLogic';

export const GEOFENCE_EVENT = 'donetogether:geofence';
/** Dispatch to inject a fake GPS fix (for testing without moving). */
export const FAKE_LOCATION_EVENT = 'donetogether:fake-location';

export type GeofenceEventDetail = { title: string; body: string };
export type FakeLocationDetail = { latitude: number; longitude: number; accuracy?: number };

function collectActiveGeofences(plans: ReturnType<typeof usePlans>['plans']): GeofenceData[] {
    const activeGeofences: GeofenceData[] = [];
    if (!plans) return activeGeofences;

    plans.forEach((plan) => {
        if (plan.completed) return;

        plan.items.forEach((item) => {
            if (item.location && item.location.active && !item.checked) {
                const destination = item.location.address || item.location.name;
                const trigger = item.location.trigger === 'exit' ? 'exit' : 'enter';
                activeGeofences.push({
                    id: `${plan.id}:${item.id}`,
                    latitude: item.location.latitude,
                    longitude: item.location.longitude,
                    radius: Math.max(item.location.radius || 100, 50),
                    title: plan.name,
                    message: `${item.text} · ${destination}`,
                    trigger
                });
            }
        });
    });

    return activeGeofences;
}

function signatureOf(fences: GeofenceData[]): string {
    return fences
        .map((g) => `${g.id}|${g.latitude}|${g.longitude}|${g.radius}|${g.trigger}|${g.title}|${g.message}`)
        .sort()
        .join(';');
}

function notifyGeofence(title: string, body: string, fenceId: string) {
    try {
        window.dispatchEvent(
            new CustomEvent<GeofenceEventDetail>(GEOFENCE_EVENT, {
                detail: { title, body }
            })
        );
    } catch {
        // ignore
    }

    void showLocalNotification(title, body, {
        tag: `geo-${fenceId}`,
        requireInteraction: true
    });
}

/** ~offset degrees ≈ meters / 111320 (rough, fine for sim near fence). */
export function offsetLatLon(lat: number, lon: number, northMeters: number, eastMeters: number) {
    const dLat = northMeters / 111320;
    const dLon = eastMeters / (111320 * Math.cos((lat * Math.PI) / 180));
    return { latitude: lat + dLat, longitude: lon + dLon };
}

/**
 * Simulate walking: first outside the zone, then inside (ENTER),
 * or first inside then outside (EXIT). Fires the same path as real GPS.
 */
export async function simulateGeofenceApproach(
    fence: { latitude: number; longitude: number; radius: number; trigger?: 'enter' | 'exit' },
    pauseMs = 800
): Promise<void> {
    const trigger = fence.trigger === 'exit' ? 'exit' : 'enter';
    const outside = offsetLatLon(fence.latitude, fence.longitude, (fence.radius || 100) + 120, 0);
    const inside = offsetLatLon(fence.latitude, fence.longitude, 5, 0);

    const send = (latitude: number, longitude: number) => {
        window.dispatchEvent(
            new CustomEvent<FakeLocationDetail>(FAKE_LOCATION_EVENT, {
                detail: { latitude, longitude, accuracy: 10 }
            })
        );
    };

    if (trigger === 'enter') {
        send(outside.latitude, outside.longitude);
        await new Promise((r) => setTimeout(r, pauseMs));
        send(inside.latitude, inside.longitude);
    } else {
        send(inside.latitude, inside.longitude);
        await new Promise((r) => setTimeout(r, pauseMs));
        send(outside.latitude, outside.longitude);
    }
}

export function useGeofence(userId: string | undefined) {
    const { plans } = usePlans(userId);
    const firedRef = useRef<Set<string>>(new Set());
    const insideRef = useRef<Map<string, boolean>>(new Map());
    const lastNativeSig = useRef<string>('');
    const fencesRef = useRef<GeofenceData[]>([]);

    const activeGeofences = useMemo(() => collectActiveGeofences(plans), [plans]);
    const signature = useMemo(() => signatureOf(activeGeofences), [activeGeofences]);
    fencesRef.current = activeGeofences;

    const runCheck = (lat: number, lon: number, accuracy: number) => {
        for (const fence of fencesRef.current) {
            const prevInside = insideRef.current.get(fence.id);
            const alreadyFired = firedRef.current.has(fence.id);
            const result = evaluateGeofenceSample({
                userLat: lat,
                userLon: lon,
                fenceLat: fence.latitude,
                fenceLon: fence.longitude,
                radiusMeters: fence.radius || 100,
                accuracyMeters: accuracy,
                trigger: fence.trigger === 'exit' ? 'exit' : 'enter',
                prevInside,
                alreadyFired
            });

            insideRef.current.set(fence.id, result.inside);

            if (result.shouldNotify) {
                firedRef.current.add(fence.id);
                console.info('[GPS] Fired', fence.trigger || 'enter', fence.id, Math.round(result.distMeters), 'm');
                notifyGeofence(fence.title || 'DoneTogether', fence.message || '', fence.id);
            } else if (!result.fired) {
                firedRef.current.delete(fence.id);
            } else {
                firedRef.current.add(fence.id);
            }
        }
    };

    // Native Android: sync to Play Services only when fence set actually changes
    useEffect(() => {
        if (!userId || !Capacitor.isNativePlatform()) return;
        if (signature === lastNativeSig.current && signature !== '') return;

        let cancelled = false;

        const setupGeofences = async () => {
            try {
                const perm = await GeofencePlugin.requestPermission();
                if (cancelled) return;
                if (!perm?.granted) {
                    console.warn('Geofence permission not granted');
                    return;
                }

                await GeofencePlugin.removeGeofences();
                if (cancelled) return;

                if (activeGeofences.length > 0) {
                    const result = await GeofencePlugin.addGeofences({ geofences: activeGeofences });
                    console.info('[GPS] Native geofences registered:', result);
                } else {
                    console.info('[GPS] No active geofences to register');
                }

                if (!cancelled) lastNativeSig.current = signature;
            } catch (error) {
                console.error('Failed to set up geofences:', error);
            }
        };

        setupGeofences();
        return () => {
            cancelled = true;
        };
    }, [userId, signature, activeGeofences]);

    // Foreground proximity + fake GPS for testing
    useEffect(() => {
        if (!userId) return;
        if (!navigator.geolocation) return;
        if (activeGeofences.length === 0) return;

        const activeIds = new Set(activeGeofences.map((g) => g.id));
        for (const id of firedRef.current) {
            if (!activeIds.has(id)) firedRef.current.delete(id);
        }
        for (const id of insideRef.current.keys()) {
            if (!activeIds.has(id)) insideRef.current.delete(id);
        }

        console.info(
            '[GPS] Watching',
            activeGeofences.length,
            'fence(s)',
            Capacitor.isNativePlatform() ? '(native+fg)' : '(pwa/web)'
        );

        const watchId = navigator.geolocation.watchPosition(
            (pos) => runCheck(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
            (err) => console.warn('Geofence watch error', err),
            { enableHighAccuracy: true, maximumAge: 5000 }
        );

        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            navigator.geolocation.getCurrentPosition(
                (pos) => runCheck(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                () => undefined,
                { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
            );
        };
        document.addEventListener('visibilitychange', onVisible);

        const onFake = (event: Event) => {
            const detail = (event as CustomEvent<FakeLocationDetail>).detail;
            if (!detail) return;
            console.info('[GPS] Fake location', detail.latitude, detail.longitude);
            runCheck(detail.latitude, detail.longitude, detail.accuracy ?? 10);
        };
        window.addEventListener(FAKE_LOCATION_EVENT, onFake);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener(FAKE_LOCATION_EVENT, onFake);
        };
    }, [userId, signature, activeGeofences]);

    return { activeCount: activeGeofences.length, activeGeofences };
}
