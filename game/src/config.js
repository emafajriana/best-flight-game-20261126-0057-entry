// RIDGELINE — Bush Pilot Rescue. Tuning constants for the whole game.
// One place for every number a designer would want to tweak: speeds are in
// metres per second, altitudes in metres, distances in metres. Display code
// converts to feet / knots at the HUD.
export const VIEW = {
  width: 1280,
  height: 720,
  // Screen x where the plane sits; the world scrolls past it.
  planeScreenX: 430,
  // Metres shown per screen pixel (vertical scale of the world).
  metresPerPixel: 1.15,
};

export const PLANE = {
  // Cruise band: below stallSpeed the wing stops flying and she sinks.
  minSpeed: 24,
  stallSpeed: 30,
  maxSpeed: 96,
  // Throttle 0 -> minSpeed, 1 -> maxSpeed.
  accel: 9,
  brakeDecel: 16,
  // Pitch limits in degrees; climb rate follows speed * sin(pitch).
  maxPitchUp: 24,
  maxPitchDown: 20,
  pitchRate: 55,
  // Gentle touchdown: vertical speed above this on terrain contact is a crash.
  safeTouchdownVs: -3.2,
  // Landing speed window on a runway.
  maxLandingSpeed: 46,
};

export const FUEL = {
  start: 100,
  // Percent burned per second at idle, plus this times throttle.
  idleBurn: 0.16,
  throttleBurn: 0.38,
  ringRefill: 35,
};

export const DAMAGE = {
  birdHit: 22,
  balloonHit: 18,
  hardTouchdown: 45,
  max: 100,
};

export const WORLD = {
  seed: 7,
  // Three strips along one eastward route: home, Pinecrest, Storm Ridge.
  routeLength: 32000,
  homeStripX: 0,
  midStripX: 15600,
  farStripX: 31000,
  stripLength: 620,
  // Rings per leg, spaced along the route.
  ringsPerLeg: 5,
  ringRadius: 30,
  ringScore: 100,
  streakBonus: 25,
  landingScore: 250,
  // Terrain heights in metres above sea level.
  valleyFloor: 40,
  ridgeTop: 430,
};

export const MISSIONS = [
  { name: 'LEG 1 — RING RUN', brief: 'Thread 5 rings, land at Pinecrest Strip.' },
  { name: 'LEG 2 — STORM RIDGE', brief: 'Thread 5 more rings, land at Storm Ridge.' },
];

export const SHOTS = {
  startSeconds: 4,
  playSeconds: 120,
  landSeconds: 320,
  endSeconds: 900,
};
