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
        console.log('Nominatim results:', data.length);
        return data.map((item: any) => ({
            place_id: String(item.place_id),
            description: item.display_name,
            main_text: item.name || item.address?.road || item.address?.city || '',
            secondary_text: [item.address?.city, item.address?.town, item.address?.village, item.address?.country].filter(Boolean).join(', ')
        }));
    } catch (e) {
        console.log('Nominatim error:', e);
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

    console.log('Searching for:', query);
    return searchWithNominatim(query);
}

export async function getPlaceDetails(placeId: string, lat?: string, lon?: string): Promise<GeocodingResult | null> {
    if (!placeId && !(lat && lon)) return null;

    if (lat && lon) {
        return getDetailsWithNominatim(placeId, lat, lon);
    }

    return getDetailsWithNominatim(placeId);
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
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
