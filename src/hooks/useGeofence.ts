import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePlans } from './useFirestore';
import GeofencePlugin, { type GeofenceData } from '../lib/geofence';

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
                    radius: item.location.radius || 100,
                    title: plan.name,
                    message: `${item.text} · ${destination}`,
                    trigger
                });
            }
        });
    });

    return activeGeofences;
}

async function maybeNotifyWeb(title: string, body: string) {
    try {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/pwa-icon.png' });
        } else {
            // Fallback so user still sees something while tab is open
            console.info(`[GPS] ${title}: ${body}`);
        }
    } catch (e) {
        console.warn('Web notification failed', e);
    }
}

export function useGeofence(userId: string | undefined) {
    const { plans } = usePlans(userId);
    const firedRef = useRef<Set<string>>(new Set());
    const insideRef = useRef<Map<string, boolean>>(new Map());

    // Native Android: sync to Play Services geofencing
    useEffect(() => {
        if (!userId || !plans || !Capacitor.isNativePlatform()) return;

        let cancelled = false;

        const setupGeofences = async () => {
            const activeGeofences = collectActiveGeofences(plans);

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
                    await GeofencePlugin.addGeofences({ geofences: activeGeofences });
                }
            } catch (error) {
                console.error('Failed to set up geofences:', error);
            }
        };

        setupGeofences();
        return () => {
            cancelled = true;
        };
    }, [userId, plans]);

    // Web / foreground: proximity check while the tab is open
    useEffect(() => {
        if (!userId || !plans || Capacitor.isNativePlatform()) return;
        if (!navigator.geolocation) return;

        const activeGeofences = collectActiveGeofences(plans);
        if (activeGeofences.length === 0) return;

        // Drop fired markers for geofences that no longer exist
        const activeIds = new Set(activeGeofences.map((g) => g.id));
        for (const id of firedRef.current) {
            if (!activeIds.has(id)) firedRef.current.delete(id);
        }

        const check = (lat: number, lon: number) => {
            for (const fence of activeGeofences) {
                const dist = haversineMeters(lat, lon, fence.latitude, fence.longitude);
                const radius = fence.radius || 100;
                const inside = dist <= radius;
                const wasInside = insideRef.current.get(fence.id);
                insideRef.current.set(fence.id, inside);

                if (wasInside === undefined) {
                    // First sample — establish baseline, don't fire yet
                    continue;
                }

                const trigger = fence.trigger || 'enter';
                const shouldFire =
                    (trigger === 'enter' && inside && !wasInside) ||
                    (trigger === 'exit' && !inside && wasInside);

                if (shouldFire && !firedRef.current.has(fence.id)) {
                    firedRef.current.add(fence.id);
                    void maybeNotifyWeb(fence.title || 'DoneTogether', fence.message || '');
                }

                // Allow re-fire after leaving then re-entering (or opposite)
                if (trigger === 'enter' && !inside) {
                    firedRef.current.delete(fence.id);
                }
                if (trigger === 'exit' && inside) {
                    firedRef.current.delete(fence.id);
                }
            }
        };

        const watchId = navigator.geolocation.watchPosition(
            (pos) => check(pos.coords.latitude, pos.coords.longitude),
            (err) => console.warn('Web geofence watch error', err),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [userId, plans]);

    return {};
}
