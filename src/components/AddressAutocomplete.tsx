import { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { searchAddress, getPlaceDetails, type AddressPrediction } from '../lib/geocoding';

interface AddressAutocompleteProps {
    onSelect: (location: { latitude: number; longitude: number; address: string; name: string }) => void;
    placeholder?: string;
    className?: string;
}

export function AddressAutocomplete({ onSelect, placeholder = "Sök adress...", className = "" }: AddressAutocompleteProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<AddressPrediction[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsSearching(true);
                const searchResults = await searchAddress(query);
                setResults(searchResults);
                setIsSearching(false);
                setIsOpen(true);
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelect = async (prediction: AddressPrediction) => {
        setIsFetchingDetails(true);
        try {
            const details = await getPlaceDetails(prediction.place_id);
            if (details) {
                onSelect({
                    latitude: parseFloat(details.lat),
                    longitude: parseFloat(details.lon),
                    address: details.display_name,
                    name: details.name || details.display_name.split(',')[0]
                });
            }
            setQuery('');
            setIsOpen(false);
        } finally {
            setIsFetchingDetails(false);
        }
    };

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-zinc-900 dark:text-white"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                )}
                {isFetchingDetails && !isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {results.map((result, i) => (
                        <button
                            key={result.place_id || i}
                            onClick={() => handleSelect(result)}
                            disabled={isFetchingDetails}
                            className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors group disabled:opacity-50"
                        >
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                        {result.main_text || result.description.split(',')[0]}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                                        {result.description}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && query.trim().length >= 2 && !isSearching && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-3 text-center">
                    <p className="text-[10px] text-zinc-400 italic">Inga adresser hittades</p>
                </div>
            )}
        </div>
    );
}
