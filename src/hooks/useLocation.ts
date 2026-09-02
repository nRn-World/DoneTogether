import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';

function toWebPosition(position: GeolocationPosition): Position {
    return {
        coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
        },
        timestamp: position.timestamp
    };
}

/** Browser getCurrentPosition that NEVER rejects — resolves null on failure. */
function readBrowserPosition(options: PositionOptions): Promise<Position | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        try {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(toWebPosition(position)),
                (error) => {
                    console.warn('[GPS] getCurrentPosition failed:', error?.code, error?.message);
                    resolve(null);
                },
                options
            );
        } catch (e) {
            console.warn('[GPS] getCurrentPosition threw:', e);
            resolve(null);
        }
    });
}

export function useLocation(userId: string | undefined) {
    const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef<string | number | null>(null);
    const positionRef = useRef<Position | null>(null);

    useEffect(() => {
        positionRef.current = currentPosition;
    }, [currentPosition]);

    useEffect(() => {
        const isNative = Capacitor.isNativePlatform();
        let cancelled = false;

        const startWatching = async () => {
            try {
                if (!isNative) {
                    if (!navigator.geolocation) {
                        setPermissionStatus('denied');
                        setIsTracking(false);
                        return;
                    }

                    try {
                        const permission = await navigator.permissions.query({
                            name: 'geolocation' as PermissionName
                        });
                        if (cancelled) return;
                        setPermissionStatus(permission.state);
                        if (permission.state === 'denied') {
                            setIsTracking(false);
                            return;
                        }
                        permission.onchange = () => {
                            setPermissionStatus(permission.state);
                            if (permission.state === 'denied') setIsTracking(false);
                        };
                    } catch {
                        setPermissionStatus('prompt');
                    }

                    // Soft watch — no short timeout (timeout on watchPosition causes repeated errors)
                    watchIdRef.current = navigator.geolocation.watchPosition(
                        (position) => {
                            if (cancelled) return;
                            setPermissionStatus('granted');
                            setIsTracking(true);
                            const webPos = toWebPosition(position);
                            positionRef.current = webPos;
                            setCurrentPosition(webPos);
                        },
                        (error) => {
                            console.warn('[GPS] watchPosition error:', error?.code, error?.message);
                            if (error?.code === 1) {
                                setPermissionStatus('denied');
                                setIsTracking(false);
                            }
                        },
                        {
                            enableHighAccuracy: false,
                            maximumAge: 15000
                            // no timeout — avoids GeolocationPositionError spam
                        }
                    );
                } else {
                    let permission = await Geolocation.checkPermissions();
                    if (cancelled) return;

                    if (permission.location !== 'granted') {
                        permission = await Geolocation.requestPermissions();
                    }
                    if (cancelled) return;

                    setPermissionStatus(permission.location);

                    if (permission.location !== 'granted') {
                        setIsTracking(false);
                        return;
                    }

                    setIsTracking(true);

                    if (watchIdRef.current) {
                        await Geolocation.clearWatch({ id: watchIdRef.current as string });
                    }

                    watchIdRef.current = await Geolocation.watchPosition(
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
                        (position, err) => {
                            if (err) {
                                console.warn('[GPS] native watch error:', err);
                                return;
                            }
                            if (position && !cancelled) {
                                positionRef.current = position;
                                setCurrentPosition(position);
                            }
                        }
                    );
                }
            } catch (error) {
                console.warn('[GPS] startWatching failed:', error);
                setIsTracking(false);
            }
        };

        if (userId) {
            void startWatching();
        }

        return () => {
            cancelled = true;
            if (watchIdRef.current !== null) {
                try {
                    if (!Capacitor.isNativePlatform()) {
                        navigator.geolocation.clearWatch(watchIdRef.current as number);
                    } else {
                        void Geolocation.clearWatch({ id: watchIdRef.current as string });
                    }
                } catch {
                    /* ignore */
                }
                watchIdRef.current = null;
            }
        };
    }, [userId]);

    const getCurrentLocation = useCallback(async (): Promise<Position | null> => {
        // Prefer last known position from the watch (instant, no new prompt)
        if (positionRef.current?.coords) {
            return positionRef.current;
        }

        try {
            if (!Capacitor.isNativePlatform()) {
                // Try accurate first, then coarse — never throw
                let position = await readBrowserPosition({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                });

                if (!position) {
                    position = await readBrowserPosition({
                        enableHighAccuracy: false,
                        timeout: 20000,
                        maximumAge: 60000
                    });
                }

                if (position) {
                    setPermissionStatus('granted');
                    setIsTracking(true);
                    positionRef.current = position;
                    setCurrentPosition(position);
                    return position;
                }

                // If we got here, GPS failed — don't change permission unless we know it's denied
                return null;
            }

            try {
                const coordinates = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 30000
                });
                positionRef.current = coordinates;
                setCurrentPosition(coordinates);
                return coordinates;
            } catch (nativeErr) {
                console.warn('[GPS] native getCurrentPosition failed:', nativeErr);
                return null;
            }
        } catch (error) {
            console.warn('[GPS] getCurrentLocation unexpected error:', error);
            return null;
        }
    }, []);

    return {
        currentPosition,
        permissionStatus,
        isTracking,
        getCurrentLocation
    };
}
