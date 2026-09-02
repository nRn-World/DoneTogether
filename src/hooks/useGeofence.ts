import { useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePlans } from './useFirestore';
import GeofencePlugin, { type GeofenceData } from '../lib/geofence';
import { showLocalNotification } from '../lib/notify';

export const GEOFENCE_EVENT = 'donetogether:geofence';

export type GeofenceEventDetail = { title: string; body: string };

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

export function useGeofence(userId: string | undefined) {
    const { plans } = usePlans(userId);
    const firedRef = useRef<Set<string>>(new Set());
    const insideRef = useRef<Map<string, boolean>>(new Map());
    const lastNativeSig = useRef<string>('');

    const activeGeofences = useMemo(() => collectActiveGeofences(plans), [plans]);
    const signature = useMemo(() => signatureOf(activeGeofences), [activeGeofences]);

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

    // Foreground proximity (web/PWA always; Android Capacitor as backup while open)
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

        const check = (lat: number, lon: number, accuracy: number) => {
            for (const fence of activeGeofences) {
                const dist = haversineMeters(lat, lon, fence.latitude, fence.longitude);
                const radius = (fence.radius || 100) + Math.min(Math.max(accuracy || 0, 0), 40);
                const inside = dist <= radius;
                const wasInside = insideRef.current.get(fence.id);
                const trigger = fence.trigger || 'enter';

                if (wasInside === undefined) {
                    insideRef.current.set(fence.id, inside);
                    if (trigger === 'enter' && inside && !firedRef.current.has(fence.id)) {
                        firedRef.current.add(fence.id);
                        console.info('[GPS] Initial ENTER', fence.id, Math.round(dist), 'm');
                        notifyGeofence(fence.title || 'DoneTogether', fence.message || '', fence.id);
                    }
                    continue;
                }

                insideRef.current.set(fence.id, inside);

                const shouldFire =
                    (trigger === 'enter' && inside && !wasInside) ||
                    (trigger === 'exit' && !inside && wasInside);

                if (shouldFire && !firedRef.current.has(fence.id)) {
                    firedRef.current.add(fence.id);
                    console.info('[GPS] Fired', trigger, fence.id, Math.round(dist), 'm');
                    notifyGeofence(fence.title || 'DoneTogether', fence.message || '', fence.id);
                }

                if (trigger === 'enter' && !inside) {
                    firedRef.current.delete(fence.id);
                }
                if (trigger === 'exit' && inside) {
                    firedRef.current.delete(fence.id);
                }
            }
        };

        console.info(
            '[GPS] Watching',
            activeGeofences.length,
            'fence(s)',
            Capacitor.isNativePlatform() ? '(native+fg)' : '(pwa/web)'
        );

        const watchId = navigator.geolocation.watchPosition(
            (pos) => check(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
            (err) => console.warn('Geofence watch error', err),
            { enableHighAccuracy: true, maximumAge: 5000 }
        );

        // Re-check when user returns to the installed PWA
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            navigator.geolocation.getCurrentPosition(
                (pos) => check(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                () => undefined,
                { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
            );
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [userId, signature, activeGeofences]);

    return { activeCount: activeGeofences.length };
}
