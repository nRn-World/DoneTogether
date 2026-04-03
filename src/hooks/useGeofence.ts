import { useEffect, useRef } from 'react';
import { usePlans } from './useFirestore';
import GeofencePlugin from '../lib/geofence';

export function useGeofence(userId: string | undefined) {
    const { plans } = usePlans(userId);
    const processedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!userId || !plans) return;

        const setupGeofences = async () => {
            const activeGeofences: Array<{
                id: string;
                latitude: number;
                longitude: number;
                radius: number;
            }> = [];

            plans.forEach(plan => {
                if (plan.completed) return;
                
                plan.items.forEach(item => {
                    if (item.location && item.location.active && !item.checked) {
                        const key = `${plan.id}-${item.id}`;
                        if (!processedRef.current.has(key)) {
                            processedRef.current.add(key);
                            activeGeofences.push({
                                id: item.id,
                                latitude: item.location.latitude,
                                longitude: item.location.longitude,
                                radius: item.location.radius || 100
                            });
                        }
                    }
                });
            });

            if (activeGeofences.length > 0) {
                try {
                    await GeofencePlugin.addGeofences(activeGeofences);
                    console.log('Geofences set up:', activeGeofences.length);
                } catch (error) {
                    console.error('Failed to set up geofences:', error);
                }
            }
        };

        setupGeofences();
    }, [userId, plans]);

    const refreshGeofences = async () => {
        processedRef.current.clear();
    };

    return { refreshGeofences };
}