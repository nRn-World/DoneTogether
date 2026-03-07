import { useState, useEffect, useRef } from 'react';
import { Geolocation, type Position } from '@capacitor/geolocation';

// Check if we're in a web browser
const isWeb = typeof window !== 'undefined' && !('Capacitor' in window);

export function useLocation(userId: string | undefined) {
    const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef<string | number | null>(null);

    // Request permissions and start watching
    useEffect(() => {
        const startWatching = async () => {
            try {
                if (isWeb) {
                    // Web browser geolocation

                    if (!navigator.geolocation) {
                        console.error('Geolocation is not supported by this browser');
                        setPermissionStatus('denied');
                        return;
                    }

                    // Check permission status (may not exist in all browsers, e.g. Safari)
                    try {
                        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                        setPermissionStatus(permission.state);
                        if (permission.state === 'denied') {
                            return;
                        }
                        // Listen for permission changes
                        permission.onchange = () => setPermissionStatus(permission.state);
                    } catch {
                        // permissions.query not supported (e.g. Safari) – assume prompt, let getCurrentPosition trigger dialog
                        setPermissionStatus('prompt');
                    }

                    // Start watching position (will prompt user on first fix if permission is 'prompt')
                    watchIdRef.current = navigator.geolocation.watchPosition(
                        (position) => {
                            setPermissionStatus('granted'); // We got position, so permission was granted
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
                            setCurrentPosition(webPosition);
                        },
                        (error) => {
                            console.error('Web geolocation error:', error);
                            if (error.code === 1) setPermissionStatus('denied'); // PERMISSION_DENIED
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 3000
                        }
                    );
                    setIsTracking(true);
                } else {
                    // Capacitor native geolocation
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

                    // Clear any existing watch
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
                if (isWeb) {
                    navigator.geolocation.clearWatch(watchIdRef.current as number);
                } else {
                    Geolocation.clearWatch({ id: watchIdRef.current as string });
                }
            }
        };
    }, [userId]);

    // Get current location manually
    const getCurrentLocation = async () => {
        try {
            if (isWeb) {
                return new Promise<Position>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            setPermissionStatus('granted');
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
                            if (error.code === 1) setPermissionStatus('denied'); // PERMISSION_DENIED
                            reject(error);
                        },
                        { 
                            enableHighAccuracy: true, 
                            timeout: 15000, 
                            maximumAge: 0
                        }
                    );
                });
            } else {
                const coordinates = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
                return coordinates;
            }
        } catch (error) {
            console.error('Error getting current position:', error);
            if (isWeb) {
                alert('Kunde inte hämta din position. Kontrollera att du har tillåtit GPS i din webbläsare.');
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
