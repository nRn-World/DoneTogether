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

type GeoReadResult = {
    position: Position | null;
    /** 1 = denied, 2 = unavailable, 3 = timeout, 0 = ok / unknown */
    errorCode: number;
};

/** Browser getCurrentPosition that NEVER rejects. */
function readBrowserPosition(options: PositionOptions): Promise<GeoReadResult> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ position: null, errorCode: 2 });
            return;
        }
        try {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({ position: toWebPosition(position), errorCode: 0 }),
                (error) => {
                    console.warn('[GPS] getCurrentPosition failed:', error?.code, error?.message);
                    resolve({ position: null, errorCode: error?.code || 2 });
                },
                options
            );
        } catch (e) {
            console.warn('[GPS] getCurrentPosition threw:', e);
            resolve({ position: null, errorCode: 2 });
        }
    });
}

async function requestNotificationPermission(): Promise<boolean> {
    try {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
        const result = await Notification.requestPermission();
        return result === 'granted';
    } catch {
        return false;
    }
}

export function useLocation(userId: string | undefined) {
    const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
    const [isTracking, setIsTracking] = useState(false);
    const [notificationsAllowed, setNotificationsAllowed] = useState(
        typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false
    );
    const watchIdRef = useRef<string | number | null>(null);
    const positionRef = useRef<Position | null>(null);

    useEffect(() => {
        positionRef.current = currentPosition;
    }, [currentPosition]);

    const applyGrantedPosition = useCallback((position: Position) => {
        setPermissionStatus('granted');
        setIsTracking(true);
        positionRef.current = position;
        setCurrentPosition(position);
    }, []);

    const startWebWatch = useCallback(() => {
        if (!navigator.geolocation) return;
        if (watchIdRef.current !== null) {
            try {
                navigator.geolocation.clearWatch(watchIdRef.current as number);
            } catch {
                /* ignore */
            }
            watchIdRef.current = null;
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                applyGrantedPosition(toWebPosition(position));
            },
            (error) => {
                console.warn('[GPS] watchPosition error:', error?.code, error?.message);
                // Only mark denied on explicit permission denial
                if (error?.code === 1) {
                    setPermissionStatus('denied');
                    setIsTracking(false);
                }
            },
            {
                enableHighAccuracy: false,
                maximumAge: 15000
            }
        );
    }, [applyGrantedPosition]);

    /**
     * Explicitly ask the user for GPS (+ notifications on web).
     * Safe to call from a button (user gesture) or after login.
     */
    const requestPermissions = useCallback(async (): Promise<boolean> => {
        const notifOk = await requestNotificationPermission();
        setNotificationsAllowed(notifOk);

        if (Capacitor.isNativePlatform()) {
            try {
                let permission = await Geolocation.checkPermissions();
                if (permission.location !== 'granted') {
                    permission = await Geolocation.requestPermissions();
                }
                setPermissionStatus(permission.location);
                if (permission.location !== 'granted') {
                    setIsTracking(false);
                    return false;
                }
                setIsTracking(true);
                const coordinates = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 30000
                }).catch(() => null);
                if (coordinates) applyGrantedPosition(coordinates);
                return true;
            } catch (e) {
                console.warn('[GPS] native requestPermissions failed:', e);
                setPermissionStatus('denied');
                return false;
            }
        }

        if (!navigator.geolocation) {
            setPermissionStatus('denied');
            return false;
        }

        // This triggers the browser's location permission dialog
        let result = await readBrowserPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        });

        if (!result.position) {
            result = await readBrowserPosition({
                enableHighAccuracy: false,
                timeout: 20000,
                maximumAge: 60000
            });
        }

        if (result.position) {
            applyGrantedPosition(result.position);
            startWebWatch();
            return true;
        }

        if (result.errorCode === 1) {
            setPermissionStatus('denied');
            setIsTracking(false);
            return false;
        }

        // Unavailable/timeout — keep as prompt so user can retry
        setPermissionStatus('prompt');
        setIsTracking(false);
        return false;
    }, [applyGrantedPosition, startWebWatch]);

    // After login: sync permission state (do not auto-spam dialog if already decided)
    useEffect(() => {
        const isNative = Capacitor.isNativePlatform();
        let cancelled = false;

        const init = async () => {
            if (!userId) return;

            if (!isNative) {
                if (!navigator.geolocation) {
                    setPermissionStatus('denied');
                    return;
                }

                try {
                    const permission = await navigator.permissions.query({
                        name: 'geolocation' as PermissionName
                    });
                    if (cancelled) return;
                    setPermissionStatus(permission.state);
                    permission.onchange = () => {
                        setPermissionStatus(permission.state);
                        if (permission.state === 'denied') setIsTracking(false);
                        if (permission.state === 'granted') startWebWatch();
                    };

                    if (permission.state === 'granted') {
                        startWebWatch();
                    }
                    // If 'prompt' — App shows permission modal and calls requestPermissions()
                } catch {
                    setPermissionStatus('prompt');
                }

                if ('Notification' in window) {
                    setNotificationsAllowed(Notification.permission === 'granted');
                }
                return;
            }

            try {
                const permission = await Geolocation.checkPermissions();
                if (cancelled) return;
                setPermissionStatus(permission.location);
                if (permission.location === 'granted') {
                    setIsTracking(true);
                    watchIdRef.current = await Geolocation.watchPosition(
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
                        (position, err) => {
                            if (err || !position || cancelled) return;
                            applyGrantedPosition(position);
                        }
                    );
                }
            } catch (e) {
                console.warn('[GPS] native init failed:', e);
            }
        };

        void init();

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
    }, [userId, applyGrantedPosition, startWebWatch]);

    const getCurrentLocation = useCallback(async (): Promise<Position | null> => {
        if (positionRef.current?.coords) {
            return positionRef.current;
        }

        // Ask again if needed (triggers browser dialog when still "prompt")
        if (permissionStatus !== 'granted') {
            const ok = await requestPermissions();
            if (ok && positionRef.current) return positionRef.current;
        }

        try {
            if (!Capacitor.isNativePlatform()) {
                const first = await readBrowserPosition({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                });
                const result =
                    first.position != null
                        ? first
                        : await readBrowserPosition({
                              enableHighAccuracy: false,
                              timeout: 20000,
                              maximumAge: 60000
                          });

                if (result.position) {
                    applyGrantedPosition(result.position);
                    return result.position;
                }
                if (result.errorCode === 1) setPermissionStatus('denied');
                return null;
            }

            const coordinates = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            }).catch(() => null);
            if (coordinates) {
                applyGrantedPosition(coordinates);
                return coordinates;
            }
            return null;
        } catch (error) {
            console.warn('[GPS] getCurrentLocation unexpected error:', error);
            return null;
        }
    }, [permissionStatus, requestPermissions, applyGrantedPosition]);

    return {
        currentPosition,
        permissionStatus,
        isTracking,
        notificationsAllowed,
        getCurrentLocation,
        requestPermissions
    };
}
