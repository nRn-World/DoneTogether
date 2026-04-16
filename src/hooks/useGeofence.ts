import { useEffect } from 'react';
import { usePlans } from './useFirestore';
import GeofencePlugin from '../lib/geofence';
import { Capacitor } from '@capacitor/core';

export function useGeofence(userId: string | undefined) {
    const { plans } = usePlans(userId);

    useEffect(() => {
        if (!userId || !plans || !Capacitor.isNativePlatform()) return;

        const setupGeofences = async () => {
            const activeGeofences: Array<{
                id: string;
                latitude: number;
                longitude: number;
                radius: number;
                title?: string;
                message?: string;
            }> = [];

            plans.forEach(plan => {
                if (plan.completed) return;
                
                plan.items.forEach(item => {
                    if (item.location && item.location.active && !item.checked) {
                        const destination = item.location.address || item.location.name;
                        activeGeofences.push({
                            id: `${plan.id}:${item.id}`,
                            latitude: item.location.latitude,
                            longitude: item.location.longitude,
                            radius: item.location.radius || 100,
                            title: plan.name,
                            message: `${item.text} · ${destination}`
                        });
                    }
                });
            });

            try {
                await GeofencePlugin.requestPermission();
                await GeofencePlugin.removeGeofences();
                if (activeGeofences.length > 0) {
                    await GeofencePlugin.addGeofences({ geofences: activeGeofences });
                }
            } catch (error) {
                console.error('Failed to set up geofences:', error);
            }
        };

        setupGeofences();
    }, [userId, plans]);
    return {};
}
