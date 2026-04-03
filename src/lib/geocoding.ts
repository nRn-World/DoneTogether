export interface GeocodingResult {
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    address?: {
        road?: string;
        house_number?: string;
        city?: string;
        town?: string;
        village?: string;
        postcode?: string;
        country?: string;
    };
}

export interface AddressPrediction {
    place_id: string;
    description: string;
    main_text?: string;
    secondary_text?: string;
}

let googleMapsLoaded = false;
let googleMapsLoadingPromise: Promise<void> | null = null;

async function loadGoogleMaps(): Promise<boolean> {
    if (googleMapsLoaded) return true;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCA_1UxB7z86TvyIEpgqnTwnUgqOWTEf_4';
    if (!apiKey) return false;

    if (googleMapsLoadingPromise) return googleMapsLoadingPromise.then(() => true);

    googleMapsLoadingPromise = new Promise((resolve, reject) => {
        if ((window as any).google && (window as any).google.maps) {
            googleMapsLoaded = true;
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            googleMapsLoaded = true;
            resolve();
        };
        script.onerror = () => {
            reject(new Error('Failed to load Google Maps API'));
        };
        document.head.appendChild(script);
    });

    return googleMapsLoadingPromise.then(() => true).catch(() => false);
}

async function searchWithNominatim(query: string): Promise<AddressPrediction[]> {
    try {
        const lang = 'sv';
        const country = 'se';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8&accept-language=${lang}&countrycodes=${country}&viewbox=10.0,55.0,24.0,69.0&bounded=0`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'DoneTogether/1.0' }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item: any) => ({
            place_id: String(item.place_id),
            description: item.display_name,
            main_text: item.name || item.address?.road || item.address?.city || '',
            secondary_text: [item.address?.city, item.address?.town, item.address?.village, item.address?.country].filter(Boolean).join(', ')
        }));
    } catch {
        return [];
    }
}

async function getDetailsWithNominatim(placeId: string, lat?: string, lon?: string): Promise<GeocodingResult | null> {
    try {
        if (lat && lon) {
            return {
                lat,
                lon,
                display_name: `${lat}, ${lon}`,
                name: '',
                address: {}
            };
        }
        const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=${placeId}&format=json&addressdetails=1&accept-language=${navigator.language || 'en'}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'DoneTogether/1.0' }
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data || data.length === 0) return null;
        const item = data[0];
        return {
            lat: item.lat,
            lon: item.lon,
            display_name: item.display_name,
            name: item.name || item.display_name.split(',')[0],
            address: item.address || {}
        };
    } catch {
        return null;
    }
}

export async function searchAddress(query: string): Promise<AddressPrediction[]> {
    if (!query || query.trim().length < 2) return [];

    const googleAvailable = await loadGoogleMaps();

    if (googleAvailable) {
        try {
            const g = (window as any).google;
            if (g?.maps?.places?.AutocompleteService) {
                const service = new g.maps.places.AutocompleteService();
                return new Promise((resolve) => {
                    service.getPlacePredictions(
                        {
                            input: query.trim(),
                            types: ['geocode'],
                            language: 'sv',
                            componentRestrictions: { country: 'se' }
                        },
                        (predictions: any[] | null, status: string) => {
                            if (status === 'OK' && predictions && predictions.length > 0) {
                                resolve(predictions.map((p: any) => ({
                                    place_id: p.place_id,
                                    description: p.description,
                                    main_text: p.structured_formatting?.main_text,
                                    secondary_text: p.structured_formatting?.secondary_text
                                })));
                            } else {
                                resolve([]);
                            }
                        }
                    );
                });
            }
        } catch {
        }
    }

    return searchWithNominatim(query);
}

export async function getPlaceDetails(placeId: string, lat?: string, lon?: string): Promise<GeocodingResult | null> {
    if (!placeId && !(lat && lon)) return null;

    if (lat && lon) {
        return getDetailsWithNominatim(placeId, lat, lon);
    }

    const googleAvailable = await loadGoogleMaps();

    if (googleAvailable) {
        try {
            const g = (window as any).google;
            if (g?.maps?.places?.PlacesService) {
                const dummyDiv = document.createElement('div');
                const service = new g.maps.places.PlacesService(dummyDiv);
                return new Promise((resolve) => {
                    service.getDetails(
                        { placeId, fields: ['geometry', 'formatted_address', 'name', 'address_components'] },
                        (place: any, status: string) => {
                            if (status === 'OK' && place?.geometry?.location) {
                                const lat = place.geometry.location.lat();
                                const lng = place.geometry.location.lng();
                                const display_name = place.formatted_address || `${lat}, ${lng}`;
                                const name = place.name || place.formatted_address?.split(',')[0]?.trim();
                                resolve({
                                    lat: String(lat),
                                    lon: String(lng),
                                    display_name,
                                    name,
                                    address: {}
                                });
                            } else {
                                resolve(null);
                            }
                        }
                    );
                });
            }
        } catch {
        }
    }

    return getDetailsWithNominatim(placeId);
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    const googleAvailable = await loadGoogleMaps();

    if (googleAvailable && (window as any).google) {
        try {
            const geocoder = new (window as any).google.maps.Geocoder();
            return new Promise((resolve) => {
                geocoder.geocode({ location: { lat, lng: lon } }, (results: any[], status: string) => {
                    if (status === 'OK' && results && results[0]) {
                        resolve(results[0].formatted_address);
                    } else {
                        resolve(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
                    }
                });
            });
        } catch {
        }
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=${navigator.language || 'en'}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'DoneTogether/1.0' }
        });
        if (!response.ok) return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        const data = await response.json();
        return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch {
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
}
