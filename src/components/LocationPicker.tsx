import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { reverseGeocodeDetailed } from '../lib/geocoding';

declare const google: any;

export const RADIUS_PRESETS = [
    { meters: 5, label: '5 m' },
    { meters: 10, label: '10 m' },
    { meters: 25, label: '25 m' },
    { meters: 50, label: '50 m' },
    { meters: 100, label: '100 m' },
    { meters: 250, label: '250 m' },
    { meters: 500, label: '500 m' },
    { meters: 1000, label: '1 km' },
    { meters: 2000, label: '2 km' },
    { meters: 5000, label: '5 km' },
    { meters: 10000, label: '10 km' }
] as const;

export type PickedLocation = {
    latitude: number;
    longitude: number;
    name: string;
    address?: string;
    radius: number;
};

interface LocationPickerProps {
    latitude: number;
    longitude: number;
    radius: number;
    name?: string;
    address?: string;
    onChange: (next: PickedLocation) => void;
}

function zoomForRadius(r: number): number {
    if (r <= 25) return 19;
    if (r <= 100) return 17;
    if (r <= 500) return 15;
    if (r <= 2000) return 14;
    if (r <= 5000) return 12;
    return 11;
}

export function LocationPicker({
    latitude,
    longitude,
    radius,
    name,
    address,
    onChange
}: LocationPickerProps) {
    const { t } = useTranslation();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapObjRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const circleRef = useRef<any>(null);
    const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const propsRef = useRef({ latitude, longitude, radius, name, address, onChange, t });
    const [resolvingAddress, setResolvingAddress] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState(false);
    const didResolveRef = useRef<string | null>(null);

    propsRef.current = { latitude, longitude, radius, name, address, onChange, t };

    const displayAddress = address || name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    const applyCoords = (lat: number, lng: number) => {
        const { radius: r, name: n, onChange: cb, t: tr } = propsRef.current;
        cb({
            latitude: lat,
            longitude: lng,
            radius: r,
            name: n || tr('profile.manual_location_name'),
            address: propsRef.current.address
        });

        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
        setResolvingAddress(true);
        geocodeTimer.current = setTimeout(async () => {
            const details = await reverseGeocodeDetailed(lat, lng);
            setResolvingAddress(false);
            didResolveRef.current = `${lat.toFixed(5)},${lng.toFixed(5)}`;
            propsRef.current.onChange({
                latitude: lat,
                longitude: lng,
                radius: propsRef.current.radius,
                name: details.name || propsRef.current.name || propsRef.current.t('profile.manual_location_name'),
                address: details.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            });
        }, 350);
    };

    useEffect(() => {
        if (!mapRef.current) return;
        if (typeof google === 'undefined' || !google.maps) {
            setMapError(true);
            return;
        }

        try {
            const center = { lat: latitude, lng: longitude };
            const map = new google.maps.Map(mapRef.current, {
                center,
                zoom: zoomForRadius(radius),
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                gestureHandling: 'greedy',
                styles: [
                    { elementType: 'geometry', stylers: [{ color: '#1d1d21' }] },
                    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d21' }] },
                    { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2e' }] },
                    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c0c0e' }] },
                    { featureType: 'poi', stylers: [{ visibility: 'off' }] }
                ]
            });

            const marker = new google.maps.Marker({
                map,
                position: center,
                draggable: true,
                title: t('profile.map_pin_hint')
            });

            const circle = new google.maps.Circle({
                map,
                center,
                radius,
                fillColor: '#10b981',
                fillOpacity: 0.15,
                strokeColor: '#10b981',
                strokeOpacity: 0.7,
                strokeWeight: 2
            });

            map.addListener('click', (e: any) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                marker.setPosition({ lat, lng });
                circle.setCenter({ lat, lng });
                applyCoords(lat, lng);
            });

            marker.addListener('dragend', () => {
                const pos = marker.getPosition();
                if (!pos) return;
                const lat = pos.lat();
                const lng = pos.lng();
                circle.setCenter({ lat, lng });
                applyCoords(lat, lng);
            });

            mapObjRef.current = map;
            markerRef.current = marker;
            circleRef.current = circle;
            setMapReady(true);
        } catch (e) {
            console.error('[LocationPicker] map init failed', e);
            setMapError(true);
        }

        return () => {
            if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
            markerRef.current = null;
            circleRef.current = null;
            mapObjRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!mapReady || !mapObjRef.current || !markerRef.current || !circleRef.current) return;
        const center = { lat: latitude, lng: longitude };
        const markerPos = markerRef.current.getPosition();
        const moved =
            !markerPos ||
            Math.abs(markerPos.lat() - latitude) > 0.00001 ||
            Math.abs(markerPos.lng() - longitude) > 0.00001;

        if (moved) {
            markerRef.current.setPosition(center);
            circleRef.current.setCenter(center);
            mapObjRef.current.panTo(center);
        }
        circleRef.current.setRadius(radius);
        mapObjRef.current.setZoom(zoomForRadius(radius));
    }, [latitude, longitude, radius, mapReady]);

    // Resolve address once per coordinate if missing
    useEffect(() => {
        const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
        if (address || didResolveRef.current === key) return;

        let cancelled = false;
        (async () => {
            setResolvingAddress(true);
            const details = await reverseGeocodeDetailed(latitude, longitude);
            if (cancelled) return;
            setResolvingAddress(false);
            didResolveRef.current = key;
            propsRef.current.onChange({
                latitude,
                longitude,
                radius: propsRef.current.radius,
                name: propsRef.current.name || details.name || propsRef.current.t('profile.manual_location_name'),
                address: details.address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [latitude, longitude, address]);

    return (
        <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#121214]">
                <div ref={mapRef} className="w-full h-52 bg-zinc-900" />
                {mapError && (
                    <div className="p-4 text-[10px] text-zinc-500 text-center">
                        {t('profile.map_unavailable')}
                    </div>
                )}
                <div className="p-3 border-t border-zinc-800/80 space-y-1">
                    <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-zinc-200 leading-snug break-words">
                                {resolvingAddress ? t('profile.resolving_address') : displayAddress}
                            </p>
                            <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                                {latitude.toFixed(5)}, {longitude.toFixed(5)}
                            </p>
                        </div>
                    </div>
                    <p className="text-[9px] text-zinc-600 italic pl-5">{t('profile.map_pin_hint')}</p>
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">
                    {t('profile.gps_radius_label')}
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {RADIUS_PRESETS.map((preset) => {
                        const active = radius === preset.meters;
                        return (
                            <button
                                key={preset.meters}
                                type="button"
                                onClick={() =>
                                    onChange({
                                        latitude,
                                        longitude,
                                        name: name || t('profile.manual_location_name'),
                                        address,
                                        radius: preset.meters
                                    })
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide transition-all border ${
                                    active
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                        : 'bg-[#18181b] border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                }`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
                <p className="text-[9px] text-zinc-600 mt-2 ml-1 italic">
                    {t('profile.gps_radius_hint', { radius: formatRadius(radius) })}
                </p>
            </div>
        </div>
    );
}

export function formatRadius(meters: number): string {
    if (meters >= 1000) {
        const km = meters / 1000;
        return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
    }
    return `${meters} m`;
}
