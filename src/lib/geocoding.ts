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

// Extraherar husnummer från Nominatim display_name
function extractHouseNumber(item: any): { mainText: string; houseNumber: string } {
    const addr = item.address || {};
    const road = addr.road || addr.pedestrian || addr.highway || '';
    const osmHouseNumber = addr.house_number || '';
    const displayName = item.display_name || '';
    const firstPart = displayName.split(',')[0];

    if (osmHouseNumber && road) {
        return { mainText: `${road} ${osmHouseNumber}`, houseNumber: osmHouseNumber };
    }

    // Försök hitta husnummer i display_name
    // Mönster: "Gatunamn 144, Stad" eller "Gatunamn 144A, Stad"
    const patterns = [
        /^(.+?)\s+(\d+[a-zA-Z]?)\s*[,]/,  // "Ribegatan 144,"
        /^(.+?)\s+(\d+[a-zA-Z]?)$/,         // "Ribegatan 144"
    ];

    for (const pattern of patterns) {
        const match = firstPart.match(pattern);
        if (match) {
            const streetName = match[1].trim();
            const extractedNumber = match[2];
            // Verifiera att gatunamnet liknar road
            if (road && streetName.toLowerCase().includes(road.toLowerCase().split(' ')[0])) {
                return { mainText: `${road} ${extractedNumber}`, houseNumber: extractedNumber };
            }
            // Även om vi inte matchar road, använd det extraherade
            if (extractedNumber.match(/^\d+[a-zA-Z]?$/)) {
                return { mainText: `${road || streetName} ${extractedNumber}`, houseNumber: extractedNumber };
            }
        }
    }

    if (road) {
        return { mainText: road, houseNumber: '' };
    }

    return { mainText: firstPart || 'Okänd adress', houseNumber: '' };
}

export async function searchAddress(query: string): Promise<AddressPrediction[]> {
    if (!query || query.trim().length < 2) return [];

    try {
        const trimmedQuery = query.trim();
        
        // Försök med specifikt svensk adressformat
        const queries = [
            `${trimmedQuery}, Sverige`,
            trimmedQuery
        ];

        const allResults: AddressPrediction[] = [];

        for (const searchQuery of queries) {
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchQuery)}&countrycodes=se&limit=15&addressdetails=1&accept-language=sv`;
            const response = await fetch(nominatimUrl, {
                headers: { 'User-Agent': 'DoneTogether/1.0' }
            });

            if (!response.ok) continue;
            const data = await response.json();

            if (!data || data.length === 0) continue;

            for (const item of data) {
                const { mainText } = extractHouseNumber(item);
                const addr = item.address || {};
                const city = addr.city || addr.town || addr.village || addr.municipality || '';
                const postcode = addr.postcode || '';
                const context = [city, postcode, "Sverige"].filter(Boolean).join(', ');

                const prediction: AddressPrediction = {
                    place_id: item.place_id || `${item.lat},${item.lon}`,
                    description: `${mainText}, ${context}`,
                    main_text: mainText,
                    secondary_text: context,
                    lat: String(item.lat),
                    lon: String(item.lon)
                };

                // Undvik dupliceringar
                if (!allResults.some(r => r.place_id === prediction.place_id)) {
                    allResults.push(prediction);
                }
            }

            // Om vi fick resultat med husnummer, sluta här
            if (allResults.some(r => r.main_text?.match(/\d+[a-zA-Z]?$/))) {
                break;
            }
        }

        return allResults.slice(0, 10);
    } catch (e) {
        console.error('[geocoding] Search error:', e);
        return [];
    }
}

export async function getPlaceDetails(_placeId: string, lat?: string, lon?: string): Promise<GeocodingResult | null> {
    try {
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
