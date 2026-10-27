import { describe, expect, it } from 'vitest';
import { evaluateGeofenceSample, haversineMeters } from './geofenceLogic';

const fence = { fenceLat: 59.33, fenceLon: 18.06, radiusMeters: 100, trigger: 'enter' as const };
const near = { userLat: 59.33, userLon: 18.06 };
const far = { userLat: 59.34, userLon: 18.06 }; // ~1.1 km north

describe('geofenceLogic', () => {
  it('measures distance', () => {
    expect(haversineMeters(59.33, 18.06, 59.34, 18.06)).toBeGreaterThan(1100);
    expect(haversineMeters(59.33, 18.06, 59.33, 18.06)).toBe(0);
  });
  it('fires on enter when crossing in', () => {
    const r = evaluateGeofenceSample({ ...fence, ...near, prevInside: false, alreadyFired: false });
    expect(r.shouldNotify).toBe(true);
  });
  it('fires on first sample if already inside (enter)', () => {
    const r = evaluateGeofenceSample({ ...fence, ...near, prevInside: undefined, alreadyFired: false });
    expect(r.shouldNotify).toBe(true);
  });
  it('does not fire twice while staying inside', () => {
    const r = evaluateGeofenceSample({ ...fence, ...near, prevInside: true, alreadyFired: true });
    expect(r.shouldNotify).toBe(false);
  });
  it('re-arms after leaving', () => {
    const r = evaluateGeofenceSample({ ...fence, ...far, prevInside: true, alreadyFired: true });
    expect(r.fired).toBe(false);
  });
  it('fires on exit when crossing out, not on first sample', () => {
    const exit = { ...fence, trigger: 'exit' as const };
    expect(evaluateGeofenceSample({ ...exit, ...far, prevInside: true, alreadyFired: false }).shouldNotify).toBe(true);
    expect(evaluateGeofenceSample({ ...exit, ...far, prevInside: undefined, alreadyFired: false }).shouldNotify).toBe(false);
  });
  it('enforces a 50 m minimum radius', () => {
    const r = evaluateGeofenceSample({ ...fence, radiusMeters: 1, userLat: 59.33 + 40 / 111320, userLon: 18.06, prevInside: false, alreadyFired: false });
    expect(r.inside).toBe(true);
  });
});
