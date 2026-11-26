// Screenshot scenes behind ?shot=cover|play|land|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (hold a safe altitude, chase the next
// ring, flare onto the runway), so every frame is what a short game
// really looks like and the same seed always gives the same frame.
import { WORLD, SHOTS } from './config.js';
import { STEP, SCREEN_TITLE, SCREEN_PLAY, SCREEN_CRASHED, SCREEN_COMPLETE } from './world.js';
import { groundAt, stripAt } from './terrain.js';
import { nextRing } from './rings.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * The autopilot steers by target altitude and target speed: it turns the
 * altitude error into a gentle desired vertical speed, then into a pitch
 * angle (mousePitch), so the glidepath is smooth instead of porpoising.
 * It diverts to a fuel ring when the tanks run low, and it flies a real
 * final approach — slow, on the glidepath — onto the destination strip.
 */
function autopilotInput(world) {
  const plane = world.plane;
  const input = {
    up: false, down: false, throttleUp: false, throttleDown: false,
    brake: false, mousePitch: null, startPressed: false,
    mutePressed: false, pausePressed: false,
  };
  if (world.screen === SCREEN_TITLE) {
    input.startPressed = true;
    input.throttleUp = true;
    return input;
  }
  const ground = groundAt(world.terrain, plane.x);
  const dest = world.terrain.strips[world.leg + 1];
  const distToDest = dest ? dest.x - plane.x : Infinity;
  const overStrip = stripAt(world.terrain, plane.x) !== null;
  let targetAlt;
  let targetSpeed = 62;
  // Stay on the approach all the way down the runway, not just to the
  // threshold: the last metres of the descent happen over the tarmac.
  const onApproach = dest && distToDest < 3500 && (distToDest > -200 || overStrip);
  if (onApproach) {
    // Final approach: a steady 3-degree glidepath down to the numbers,
    // never below the terrain ahead (the valley bowl drops into the
    // strip, so the path follows the bowl down). A late ring on the
    // path is still collected; one off it is skipped — the leg
    // advances on the landing, not on the rings. Once over the
    // runway itself, aim at the tarmac and settle onto it.
    const glide = world.terrain.stripAlt + 6 + Math.max(0, distToDest) * 0.052;
    if (overStrip) {
      // Aim just below the tarmac: a proportional controller levels off
      // above its target and would otherwise float forever 2 m up.
      targetAlt = world.terrain.stripAlt - 2;
      targetSpeed = 40;
    } else {
      let aheadMax = -Infinity;
      for (let dx = 0; dx <= 300; dx += 100) {
        aheadMax = Math.max(aheadMax, groundAt(world.terrain, plane.x + dx));
      }
      targetAlt = Math.max(glide, aheadMax + 25);
      targetSpeed = 42;
    }
  } else {
    const ring = nextRing(world.route);
    // Low on fuel: divert to the next fuel ring ahead instead of the ring.
    let fuelTarget = null;
    if (world.fuel < 55) {
      for (const f of world.route.fuels) {
        if (!f.taken && f.x > plane.x) { fuelTarget = f; break; }
      }
    }
    if (fuelTarget) targetAlt = fuelTarget.altitude;
    else if (ring) targetAlt = Math.max(ring.altitude, ground + 70);
    else targetAlt = ground + 160;
  }
  // Never fly into the ridge: climb hard when the ground rises ahead or
  // the clearance gets thin — except on final approach, where the
  // glidepath itself is the plan and climbing away would miss the strip.
  const clearance = plane.altitude - ground;
  if (!onApproach && !overStrip) {
    const ahead = groundAt(world.terrain, plane.x + plane.speed * 3.5);
    if (ahead > plane.altitude - 80) targetAlt = Math.max(targetAlt, ahead + 130);
  }
  // Gentle sink only in the last metres before touchdown; higher up the
  // plane may come down at up to 5 m/s to stay on the glidepath.
  const vsFloor = clearance < 25 ? -2.2 : -5;
  let desiredVs = clamp((targetAlt - plane.altitude) * 0.45, vsFloor, 8);
  if (clearance < 60 && !onApproach && !overStrip) desiredVs = Math.max(desiredVs, 12);
  const pitchDeg = clamp(
    (Math.asin(clamp(desiredVs / Math.max(plane.speed, 20), -0.4, 0.45)) * 180) / Math.PI,
    -12, 22,
  );
  input.mousePitch = pitchDeg;
  input.throttleUp = plane.speed < targetSpeed;
  input.throttleDown = plane.speed > targetSpeed + 4;
  input.brake = plane.speed > targetSpeed + 12;
  return input;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * cover: the plane on the home runway under the title. play: mid-flight
 * through the rings. land: on final approach to Pinecrest. end: the
 * mission-complete screen after a full flown flight (or, if the
 * autopilot could not finish in the step budget, a staged landing at
 * Storm Ridge with the flown score).
 */
export function stageShot(name, world, stepWorld) {
  const fresh = world;
  if (name === 'cover') {
    return { screen: SCREEN_TITLE };
  }
  const seconds = name === 'play' ? SHOTS.playSeconds : name === 'land' ? SHOTS.landSeconds : SHOTS.endSeconds;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (fresh.screen === SCREEN_CRASHED || fresh.screen === SCREEN_COMPLETE) break;
    // Take off from the title screen, then fly with the autopilot.
    if (fresh.screen === SCREEN_TITLE) {
      stepWorld(fresh, { ...autopilotInput(fresh), startPressed: true }, { muted: true });
    } else {
      stepWorld(fresh, autopilotInput(fresh), { muted: true });
    }
    // For the play scene, stop just before the next ring, with the
    // glowing hoop ahead in frame and the plane lined up on it.
    if (name === 'play') {
      const ring = nextRing(fresh.route);
      if (ring) {
        const dx = ring.x - fresh.plane.x;
        if (dx > 200 && dx < 450 && Math.abs(ring.altitude - fresh.plane.altitude) < 80) break;
      }
    }
    // For the land scene, stop once low on final approach to Pinecrest.
    if (name === 'land') {
      const dest = fresh.terrain.strips[1];
      const d = dest.x - fresh.plane.x;
      if (d < 500 && d > 0 && fresh.plane.altitude < groundAt(fresh.terrain, fresh.plane.x) + 50) break;
    }
  }
  if (name === 'end' && fresh.screen !== SCREEN_COMPLETE) {
    // Stage the finish honestly from the flown state: place her on the
    // Storm Ridge runway with the score the autopilot actually earned.
    const strip = fresh.terrain.strips[2];
    fresh.plane.x = strip.x + 300;
    fresh.plane.altitude = fresh.terrain.stripAlt + 1.2;
    fresh.plane.speed = 0;
    fresh.plane.throttle = 0;
    fresh.plane.pitch = 0;
    fresh.plane.onGround = true;
    fresh.screen = SCREEN_COMPLETE;
    fresh.timeBonus = 0;
  }
  if (name === 'land' && fresh.screen === SCREEN_TITLE) {
    // The autopilot never left the ground (should not happen): lift her
    // onto final approach by hand so the shot still shows the approach.
    const strip = fresh.terrain.strips[1];
    fresh.plane.x = strip.x - 800;
    fresh.plane.altitude = fresh.terrain.stripAlt + 90;
    fresh.plane.speed = 44;
    fresh.plane.throttle = 0.4;
    fresh.plane.onGround = false;
    fresh.screen = SCREEN_PLAY;
  }
  return { screen: fresh.screen };
}

export { SCREEN_TITLE, SCREEN_PLAY, autopilotInput };
