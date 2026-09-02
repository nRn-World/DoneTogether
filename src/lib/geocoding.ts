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
    lat?: string;
    lon?: string;
    googlePlaceId?: string;
}

declare const google: any;

export async function searchAddress(query: string): Promise<AddressPrediction[]> {
    if (!query || query.trim().length < 2) return [];

    // Google Places Autocomplete — allow addresses AND establishments (ICA Maxi, etc.)
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        return new Promise((resolve) => {
            const service = new google.maps.places.AutocompleteService();
            service.getPlacePredictions(
                {
                    input: query,
                    componentRestrictions: { country: 'se' }
                    // no types filter → streets + POIs (stores, malls, etc.)
                },
                (predictions: any, status: any) => {
                    if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                        searchAddressNominatim(query).then(resolve);
                        return;
                    }

                    const results: AddressPrediction[] = predictions.map((p: any) => ({
                        place_id: p.place_id,
                        description: p.description,
                        main_text: p.structured_formatting?.main_text,
                        secondary_text: p.structured_formatting?.secondary_text,
                        googlePlaceId: p.place_id
                    }));

                    resolve(results);
                }
            );
        });
    }

    return searchAddressNominatim(query);
}

async function searchAddressNominatim(query: string): Promise<AddressPrediction[]> {
    try {
        const trimmedQuery = query.trim();
        const searchQuery = trimmedQuery.includes(',') ? trimmedQuery : `${trimmedQuery}, Sverige`;

        const nominatimUrl =
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchQuery)}` +
            `&countrycodes=se&limit=10&addressdetails=1&accept-language=sv`;
        const response = await fetch(nominatimUrl, {
            headers: { 'User-Agent': 'DoneTogether/1.0' }
        });

        if (!response.ok) return [];
        const data = await response.json();

        if (!data || data.length === 0) return [];

        return data.map((item: any) => {
            const addr = item.address || {};
            const namedPlace =
                item.name ||
                addr.shop ||
                addr.amenity ||
                addr.building ||
                addr.tourism ||
                '';
            const road = addr.road || addr.pedestrian || addr.highway || '';
            const houseNumber = addr.house_number || '';

            let mainText = '';
            if (namedPlace) {
                mainText = namedPlace;
            } else if (road && houseNumber) {
                mainText = `${road} ${houseNumber}`;
            } else if (road) {
                mainText = road;
            } else if (item.display_name) {
                mainText = item.display_name.split(',')[0];
            } else {
                mainText = 'Okänd plats';
            }

            const city = addr.city || addr.town || addr.village || addr.municipality || '';
            const postcode = addr.postcode || '';
            const context = [city, postcode, 'Sverige'].filter(Boolean).join(', ');

            return {
                place_id: item.place_id || `${item.lat},${item.lon}`,
                description: item.display_name || `${mainText}, ${context}`,
                main_text: mainText,
                secondary_text: context,
                lat: String(item.lat),
                lon: String(item.lon)
            };
        });
    } catch (e) {
        console.error('[geocoding] Nominatim search error:', e);
        return [];
    }
}

/**
 * Resolve coordinates for a prediction.
 * Nominatim results already have lat/lon; Google results need Places Details.
 */
export async function getPlaceDetails(
    placeId: string,
    lat?: string,
    lon?: string
): Promise<GeocodingResult | null> {
    try {
        if (lat && lon) {
            return { lat, lon, display_name: '', address: {} };
        }

        if (
            placeId &&
            typeof google !== 'undefined' &&
            google.maps &&
            google.maps.places
        ) {
            return await getGooglePlaceDetails(placeId);
        }

        return null;
    } catch (e) {
        console.error('getPlaceDetails error:', e);
        if (lat && lon) {
            return { lat, lon, display_name: '', address: {} };
        }
        return null;
    }
}

function getGooglePlaceDetails(placeId: string): Promise<GeocodingResult | null> {
    return new Promise((resolve) => {
        try {
            const mapDiv = document.createElement('div');
            const service = new google.maps.places.PlacesService(mapDiv);
            service.getDetails(
                {
                    placeId,
                    fields: ['geometry', 'name', 'formatted_address']
                },
                (place: any, status: any) => {
                    if (
                        status !== google.maps.places.PlacesServiceStatus.OK ||
                        !place?.geometry?.location
                    ) {
                        console.warn('[geocoding] Places Details failed:', status);
                        resolve(null);
                        return;
                    }

                    const location = place.geometry.location;
                    resolve({
                        lat: String(location.lat()),
                        lon: String(location.lng()),
                        display_name: place.formatted_address || place.name || '',
                        name: place.name,
                        address: {}
                    });
                }
            );
        } catch (e) {
            console.error('[geocoding] Places Details exception:', e);
            resolve(null);
        }
    });
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&accept-language=sv`;
        const response = await fetch(url, { headers: { 'User-Agent': 'DoneTogether/1.0' } });
        const data = await response.json();
        const addr = data.address;

        if (addr && addr.road) {
            return `${addr.road}${addr.house_number ? ' ' + addr.house_number : ''}`;
        }
        return data.display_name.split(',')[0];
    } catch {
        return '';
    }
}
