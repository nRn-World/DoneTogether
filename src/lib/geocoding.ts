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

export async function searchAddress(query: string): Promise<AddressPrediction[]> {
    if (!query || query.trim().length < 2) return [];

    try {
        // Primär: Nominatim (OpenStreetMap) - stöder CORS, bra svensk täckning
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=se&limit=10&addressdetails=1&accept-language=sv`;
        const response = await fetch(nominatimUrl, {
            headers: { 'User-Agent': 'DoneTogether/1.0' }
        });

        if (!response.ok) return [];
        const data = await response.json();

        if (!data || data.length === 0) return [];

        return data.map((item: any) => {
            const addr = item.address || {};
            const road = addr.road || addr.pedestrian || '';
            const houseNumber = addr.house_number || '';
            let mainText = '';

            if (road && houseNumber) {
                mainText = `${road} ${houseNumber}`;
            } else if (road) {
                mainText = road;
            } else if (item.display_name) {
                mainText = item.display_name.split(',')[0];
            } else {
                mainText = 'Okänd adress';
            }

            const city = addr.city || addr.town || addr.village || addr.municipality || '';
            const postcode = addr.postcode || '';
            const context = [city, postcode, "Sverige"].filter(Boolean).join(', ');

            return {
                place_id: item.place_id || `${item.lat},${item.lon}`,
                description: `${mainText}, ${context}`,
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

export async function getPlaceDetails(placeId: string, lat?: string, lon?: string): Promise<GeocodingResult | null> {
    try {
        // Försök med Google Places Details API först (fungerar på native)
        const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (googleApiKey && placeId && !placeId.includes(',')) {
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleApiKey}&fields=geometry,formatted_address,address_components`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'OK' && data.result) {
                    const loc = data.result.geometry.location;
                    const addr = data.result.address_components || [];
                    const address: any = {};
                    addr.forEach((c: any) => {
                        if (c.types.includes('route')) address.road = c.long_name;
                        if (c.types.includes('street_number')) address.house_number = c.long_name;
                        if (c.types.includes('locality')) address.city = c.long_name;
                        if (c.types.includes('postal_code')) address.postcode = c.long_name;
                        if (c.types.includes('country')) address.country = c.long_name;
                    });
                    return {
                        lat: String(loc.lat),
                        lon: String(loc.lng),
                        display_name: data.result.formatted_address || '',
                        address
                    };
                }
            }
        }

        // Fallback: använd koordinater direkt
        if (lat && lon) {
            return { lat, lon, display_name: '', address: {} };
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
