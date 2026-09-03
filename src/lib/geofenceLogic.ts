/** Pure geofence math + transition rules (testable without a phone). */

export type GeofenceTrigger = 'enter' | 'exit';

export type FenceState = {
    inside: boolean;
    fired: boolean;
};

export type TransitionResult = {
    inside: boolean;
    fired: boolean;
    shouldNotify: boolean;
    distMeters: number;
};

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Evaluate one GPS sample against one fence.
 * Mirrors the rules used in useGeofence (web + Android foreground backup).
 */
export function evaluateGeofenceSample(opts: {
    userLat: number;
    userLon: number;
    fenceLat: number;
    fenceLon: number;
    radiusMeters: number;
    accuracyMeters?: number;
    trigger: GeofenceTrigger;
    prevInside: boolean | undefined;
    alreadyFired: boolean;
}): TransitionResult {
    const accuracyBoost = Math.min(Math.max(opts.accuracyMeters || 0, 0), 40);
    const radius = Math.max(opts.radiusMeters, 50) + accuracyBoost;
    const distMeters = haversineMeters(opts.userLat, opts.userLon, opts.fenceLat, opts.fenceLon);
    const inside = distMeters <= radius;

    // First sample: establish baseline; ENTER may fire if already inside
    if (opts.prevInside === undefined) {
        const shouldNotify =
            opts.trigger === 'enter' && inside && !opts.alreadyFired;
        return {
            inside,
            fired: shouldNotify ? true : opts.alreadyFired,
            shouldNotify,
            distMeters
        };
    }

    const crossedIn = inside && !opts.prevInside;
    const crossedOut = !inside && opts.prevInside;
    const shouldNotify =
        !opts.alreadyFired &&
        ((opts.trigger === 'enter' && crossedIn) || (opts.trigger === 'exit' && crossedOut));

    let fired = opts.alreadyFired;
    if (shouldNotify) fired = true;
    // Allow re-fire after leaving then re-entering (or opposite for exit)
    if (opts.trigger === 'enter' && !inside) fired = false;
    if (opts.trigger === 'exit' && inside) fired = false;

    return { inside, fired, shouldNotify, distMeters };
}
