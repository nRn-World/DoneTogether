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

/** Prediction from Autocomplete (address suggestions); lat/lon from getPlaceDetails. */
export interface AddressPrediction {
    place_id: string;
    description: string;
    main_text?: string;
    secondary_text?: string;
}

let googleMapsLoaded = false;
let googleMapsLoadingPromise: Promise<void> | null = null;

async function loadGoogleMaps(): Promise<void> {
    if (googleMapsLoaded) return;
    if (googleMapsLoadingPromise) return googleMapsLoadingPromise;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyCqyQBJ5NkThxyguGymmHSEOIfVDitD7vY";
    if (!apiKey) {
        console.error("Google Maps API Key is missing!");
        return;
    }

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
        script.onerror = (err) => {
            console.error("Failed to load Google Maps API", err);
            reject(err);
        };
        document.head.appendChild(script);
    });

    return googleMapsLoadingPromise;
}

export async function searchAddress(query: string): Promise<AddressPrediction[]> {
    if (!query || query.trim().length < 2) return [];

    try {
        await loadGoogleMaps();

        const g = (window as any).google;
        if (!g?.maps?.places?.AutocompleteService) return [];

        const service = new g.maps.places.AutocompleteService();

        return new Promise((resolve) => {
            service.getPlacePredictions(
                {
                    input: query.trim(),
                    types: ['address'],
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
                        if (status !== 'ZERO_RESULTS') console.log('Places Autocomplete:', status);
                        resolve([]);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Error in address autocomplete:', error);
        return [];
    }
}

/** Get lat/lon and address for a place_id (call when user selects a prediction). */
export async function getPlaceDetails(placeId: string): Promise<GeocodingResult | null> {
    if (!placeId) return null;

    try {
        await loadGoogleMaps();

        const g = (window as any).google;
        if (!g?.maps?.places?.PlacesService) return null;

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
    } catch (error) {
        console.error('Error getting place details:', error);
        return null;
    }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
        await loadGoogleMaps();
        if (!(window as any).google) return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

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
    } catch (error) {
        console.error('Error reverse geocoding with Google Maps:', error);
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
}
