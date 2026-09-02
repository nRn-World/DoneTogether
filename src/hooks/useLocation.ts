import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';

export function useLocation(userId: string | undefined) {
    const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef<string | number | null>(null);

    useEffect(() => {
        const isNative = Capacitor.isNativePlatform();

        const startWatching = async () => {
            try {
                if (!isNative) {
                    if (!navigator.geolocation) {
                        console.error('Geolocation is not supported by this browser');
                        setPermissionStatus('denied');
                        setIsTracking(false);
                        return;
                    }

                    try {
                        const permission = await navigator.permissions.query({
                            name: 'geolocation' as PermissionName
                        });
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

                    watchIdRef.current = navigator.geolocation.watchPosition(
                        (position) => {
                            setPermissionStatus('granted');
                            setIsTracking(true);
                            setCurrentPosition({
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
                            });
                        },
                        (error) => {
                            console.error('Web geolocation error:', error);
                            if (error.code === 1) {
                                setPermissionStatus('denied');
                                setIsTracking(false);
                            }
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 3000
                        }
                    );
                } else {
                    let permission = await Geolocation.checkPermissions();

                    if (permission.location !== 'granted') {
                        permission = await Geolocation.requestPermissions();
                    }

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
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 },
                        (position, err) => {
                            if (err) {
                                console.error('Watch position error:', err);
                                return;
                            }
                            if (position) {
                                setCurrentPosition(position);
                            }
                        }
                    );
                }
            } catch (error) {
                console.error('Error starting location watch:', error);
                setIsTracking(false);
            }
        };

        if (userId) {
            startWatching();
        }

        return () => {
            if (watchIdRef.current !== null) {
                if (!Capacitor.isNativePlatform()) {
                    navigator.geolocation.clearWatch(watchIdRef.current as number);
                } else {
                    Geolocation.clearWatch({ id: watchIdRef.current as string });
                }
            }
        };
    }, [userId]);

    const getCurrentLocation = async () => {
        try {
            if (!Capacitor.isNativePlatform()) {
                return new Promise<Position>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            setPermissionStatus('granted');
                            setIsTracking(true);
                            const webPosition: Position = {
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
                            resolve(webPosition);
                        },
                        (error) => {
                            console.error('Web geolocation error:', error);
                            if (error.code === 1) {
                                setPermissionStatus('denied');
                                setIsTracking(false);
                            }
                            reject(error);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 0
                        }
                    );
                });
            }

            const coordinates = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            });
            return coordinates;
        } catch (error) {
            console.error('Error getting current position:', error);
            if (!Capacitor.isNativePlatform()) {
                alert(
                    'Could not fetch your location. Please make sure location is enabled in your browser settings.'
                );
            }
            return null;
        }
    };

    return {
        currentPosition,
        permissionStatus,
        isTracking,
        getCurrentLocation
    };
}
