/**
 * Offline GPS geofence simulation — no phone movement required.
 * Run: node scripts/test-geofence.mjs
 */

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function evaluateGeofenceSample(opts) {
  const accuracyBoost = Math.min(Math.max(opts.accuracyMeters || 0, 0), 40);
  const radius = Math.max(opts.radiusMeters, 50) + accuracyBoost;
  const distMeters = haversineMeters(opts.userLat, opts.userLon, opts.fenceLat, opts.fenceLon);
  const inside = distMeters <= radius;

  if (opts.prevInside === undefined) {
    const shouldNotify = opts.trigger === 'enter' && inside && !opts.alreadyFired;
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
  if (opts.trigger === 'enter' && !inside) fired = false;
  if (opts.trigger === 'exit' && inside) fired = false;

  return { inside, fired, shouldNotify, distMeters };
}

function offsetLatLon(lat, lon, northMeters, eastMeters) {
  const dLat = northMeters / 111320;
  const dLon = eastMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return { latitude: lat + dLat, longitude: lon + dLon };
}

// Fake "job" near Stockholm
const JOB = { lat: 59.3293, lon: 18.0686, radius: 100 };
const outside = offsetLatLon(JOB.lat, JOB.lon, 250, 0);
const inside = offsetLatLon(JOB.lat, JOB.lon, 10, 0);

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

console.log('\n=== DoneTogether GPS geofence simulation ===\n');

// Distance sanity
{
  const dOut = haversineMeters(outside.latitude, outside.longitude, JOB.lat, JOB.lon);
  const dIn = haversineMeters(inside.latitude, inside.longitude, JOB.lat, JOB.lon);
  console.log('1) Avstånd till jobb');
  assert('utanför zonen (~250 m)', dOut > JOB.radius, `dist=${Math.round(dOut)}m`);
  assert('inne i zonen (~10 m)', dIn < JOB.radius, `dist=${Math.round(dIn)}m`);
}

// ENTER: outside → inside
{
  console.log('\n2) ENTER — "glöm inte parkera" när du närmar dig jobbet');
  let prev;
  let fired = false;

  let r = evaluateGeofenceSample({
    userLat: outside.latitude,
    userLon: outside.longitude,
    fenceLat: JOB.lat,
    fenceLon: JOB.lon,
    radiusMeters: JOB.radius,
    accuracyMeters: 10,
    trigger: 'enter',
    prevInside: prev,
    alreadyFired: fired
  });
  prev = r.inside;
  fired = r.fired;
  assert('första fix utanför → ingen notis', !r.shouldNotify, `inside=${r.inside}`);

  r = evaluateGeofenceSample({
    userLat: inside.latitude,
    userLon: inside.longitude,
    fenceLat: JOB.lat,
    fenceLon: JOB.lon,
    radiusMeters: JOB.radius,
    accuracyMeters: 10,
    trigger: 'enter',
    prevInside: prev,
    alreadyFired: fired
  });
  assert('går in i zonen → NOTIS', r.shouldNotify, `dist=${Math.round(r.distMeters)}m`);
  fired = r.fired;
  prev = r.inside;

  r = evaluateGeofenceSample({
    userLat: inside.latitude,
    userLon: inside.longitude,
    fenceLat: JOB.lat,
    fenceLon: JOB.lon,
    radiusMeters: JOB.radius,
    accuracyMeters: 10,
    trigger: 'enter',
    prevInside: prev,
    alreadyFired: fired
  });
  assert('stannar inne → ingen dubbelnotis', !r.shouldNotify);
}

// EXIT: inside → outside
{
  console.log('\n3) EXIT — "glöm inte matsäck" när du lämnar hemmet');
  let prev;
  let fired = false;

  let r = evaluateGeofenceSample({
    userLat: inside.latitude,
    userLon: inside.longitude,
    fenceLat: JOB.lat,
    fenceLon: JOB.lon,
    radiusMeters: JOB.radius,
    accuracyMeters: 10,
    trigger: 'exit',
    prevInside: prev,
    alreadyFired: fired
  });
  prev = r.inside;
  fired = r.fired;
  assert('första fix inne → ingen notis (EXIT)', !r.shouldNotify);

  r = evaluateGeofenceSample({
    userLat: outside.latitude,
    userLon: outside.longitude,
    fenceLat: JOB.lat,
    fenceLon: JOB.lon,
    radiusMeters: JOB.radius,
    accuracyMeters: 10,
    trigger: 'exit',
    prevInside: prev,
    alreadyFired: fired
  });
  assert('lämnar zonen → NOTIS', r.shouldNotify, `dist=${Math.round(r.distMeters)}m`);
}

// Already inside on first ENTER sample
{
  console.log('\n4) ENTER — redan inne när GPS startar');
  const r = evaluateGeofenceSample({
    userLat: inside.latitude,
    userLon: inside.longitude,
    fenceLat: JOB.lat,
    fenceLon: JOB.lon,
    radiusMeters: JOB.radius,
    accuracyMeters: 10,
    trigger: 'enter',
    prevInside: undefined,
    alreadyFired: false
  });
  assert('initial ENTER när redan inne → NOTIS', r.shouldNotify);
}

console.log(`\n=== Resultat: ${passed} OK, ${failed} FAIL ===\n`);
process.exit(failed > 0 ? 1 : 0);
