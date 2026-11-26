// The game state and its rules: screens, the two legs, rings, fuel,
// damage, landings and crashes. One fixed step (1/60 s) keeps the
// simulation deterministic for any frame rate and for the screenshot
// autopilot, which plays the same rules forward.
import { WORLD, PLANE, FUEL, DAMAGE, MISSIONS, SHOTS } from './config.js';
import { buildTerrain, groundAt, stripAt } from './terrain.js';
import { buildRoute, nextRing, dist2 } from './rings.js';
import { makePlane, stepPlane, verticalSpeed } from './plane.js';
import { ringChime, thud, fanfare } from './audio.js';

export const STEP = 1 / 60;
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CRASHED = 'crashed';
export const SCREEN_COMPLETE = 'complete';

export function makeWorld(seed) {
  const terrain = buildTerrain(seed);
  const route = buildRoute(terrain, seed);
  const plane = makePlane();
  plane.x = WORLD.homeStripX + 80;
  plane.altitude = terrain.stripAlt + 1.2;
  return {
    seed,
    terrain,
    route,
    plane,
    screen: SCREEN_TITLE,
    leg: 0,
    score: 0,
    streak: 0,
    ringsDone: 0,
    fuel: FUEL.start,
    damage: 0,
    timeSec: 0,
    crashReason: '',
    landings: 0,
    distanceBest: 0,
    terrainWarning: false,
    landedAt: null,
    // Transient effects for the renderer.
    shake: 0,
    flash: 0,
    message: '',
    messageUntil: 0,
  };
}

export function missionOf(world) {
  return MISSIONS[Math.min(world.leg, MISSIONS.length - 1)];
}

function showMessage(world, text, seconds) {
  world.message = text;
  world.messageUntil = world.timeSec + seconds;
}

function startLeg(world, leg) {
  world.leg = leg;
  const strip = world.terrain.strips[leg === 0 ? 0 : 1];
  world.plane.x = strip.x + 80;
  world.plane.altitude = world.terrain.stripAlt + 1.2;
  world.plane.speed = 0;
  world.plane.pitch = 0;
  world.plane.throttle = 0;
  world.plane.onGround = true;
  world.plane.gearDown = true;
  world.fuel = FUEL.start;
  world.screen = SCREEN_TITLE;
  showMessage(world, missionOf(world).brief, 6);
}

/** Reset the whole flight to the title screen (R / restart). */
export function resetWorld(world) {
  const fresh = makeWorld(world.seed);
  Object.assign(world, fresh);
  showMessage(world, missionOf(world).brief, 6);
}

/** Begin flying from the title screen. The plane stays on the ground and
 * rolls until rotation speed — the ground branch lifts her off. */
function takeOff(world) {
  if (world.screen !== SCREEN_TITLE) return;
  world.screen = SCREEN_PLAY;
  showMessage(world, 'Full throttle — pull up to rotate!', 3);
}

function crash(world, reason) {
  world.screen = SCREEN_CRASHED;
  world.crashReason = reason;
  world.shake = 1;
  thud(world.audio);
}

function completeFlight(world) {
  world.screen = SCREEN_COMPLETE;
  const timeBonus = Math.max(0, 900 - Math.round(world.timeSec)) * 2;
  world.score += timeBonus;
  world.timeBonus = timeBonus;
  fanfare(world.audio);
}

/** Land on a runway. Landing on the current leg's destination strip
 * advances the flight (or finishes it at Storm Ridge); landing anywhere
 * else just refuels the plane where she sits. */
function land(world, strip) {
  world.landings += 1;
  world.score += WORLD.landingScore;
  world.plane.onGround = true;
  world.plane.speed = Math.min(world.plane.speed, 12);
  world.plane.throttle = 0;
  world.plane.pitch = 0;
  world.landedAt = strip;
  world.fuel = FUEL.start;
  ringChime(world.audio);
  const destination = world.terrain.strips[world.leg + 1];
  if (strip === destination) {
    if (world.leg === 1) {
      completeFlight(world);
      return;
    }
    showMessage(world, `Landed at ${strip.name} — refuelled, next leg!`, 4);
    world.screen = SCREEN_TITLE;
    startLeg(world, world.leg + 1);
    return;
  }
  showMessage(world, `Down at ${strip.name} — refuelled. Take off and carry on.`, 4);
  world.screen = SCREEN_TITLE;
}

/** One fixed simulation step. `input` is the live input state. */
export function stepWorld(world, input, audio) {
  world.audio = audio;
  if (input.mutePressed) {
    audio.muted = !audio.muted;
    input.mutePressed = false;
  }
  if (input.pausePressed) {
    input.pausePressed = false;
    if (world.screen === SCREEN_PLAY) world.screen = SCREEN_PAUSED;
    else if (world.screen === SCREEN_PAUSED) world.screen = SCREEN_PLAY;
  }
  if (input.startPressed) {
    input.startPressed = false;
    if (world.screen === SCREEN_TITLE) takeOff(world);
    else if (world.screen === SCREEN_CRASHED || world.screen === SCREEN_COMPLETE) resetWorld(world);
    else if (world.screen === SCREEN_PAUSED) world.screen = SCREEN_PLAY;
  }
  if (world.screen !== SCREEN_PLAY) return;

  const plane = world.plane;
  const dt = STEP;
  world.timeSec += dt;

  // On the ground the plane rolls; in the air it flies.
  if (plane.onGround) {
    if (input.throttleUp) plane.throttle = Math.min(1, plane.throttle + dt * 0.55);
    if (input.throttleDown) plane.throttle = Math.max(0, plane.throttle - dt * 0.7);
    const targetSpeed = PLANE.minSpeed + plane.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    plane.speed = Math.min(targetSpeed, plane.speed + PLANE.accel * dt);
    plane.x += plane.speed * dt;
    plane.propAngle += dt * (4 + plane.throttle * 46);
    if (plane.speed > 34 && (input.up || (input.mousePitch !== null && input.mousePitch > 4))) {
      plane.onGround = false;
      plane.pitch = 8;
      showMessage(world, 'Airborne — gear up, watch the ridges.', 3);
    }
    const strip = stripAt(world.terrain, plane.x);
    const stripEnd = strip ? strip.x + WORLD.stripLength - plane.x : 0;
    if (stripEnd < 320 && plane.speed > 22 && plane.onGround) {
      showMessage(world, 'ROTATE — pull up, runway ending!', 1);
    }
    // Rolling off the strip's end without flying is a crash into the trees.
    if (!strip && plane.speed > 5) crash(world, 'Ran off the end of the runway into the pines.');
    return;
  }

  stepPlane(plane, input, dt);
  plane.gearDown = plane.speed < 55;

  // Fuel burns with throttle; empty tanks end the flight.
  world.fuel -= (FUEL.idleBurn + FUEL.throttleBurn * plane.throttle) * dt;
  if (world.fuel <= 0) {
    world.fuel = 0;
    crash(world, 'Out of fuel — she glided down into the valley.');
    return;
  }

  // Terrain: the ground is always there, and it is always hard.
  const ground = groundAt(world.terrain, plane.x);
  const clearance = plane.altitude - ground;
  // No terrain shout on a configured final approach: a gentle descent
  // toward the destination strip is the plan, not a mistake.
  const destStrip = world.terrain.strips[world.leg + 1];
  const distToDest = destStrip ? destStrip.x - plane.x : Infinity;
  const onFinal = distToDest < 2000 && distToDest > -620 && verticalSpeed(plane) > -4 && plane.speed < 50;
  world.terrainWarning = clearance < 55 && verticalSpeed(plane) < -1 && !onFinal;
  if (clearance <= 1.2) {
    const strip = stripAt(world.terrain, plane.x);
    const vs = verticalSpeed(plane);
    if (strip && vs >= -6 && plane.speed <= PLANE.maxLandingSpeed && Math.abs(plane.pitch) < 12) {
      // Down on the runway. A firm arrival (vs below the gentle band)
      // bends the gear and costs damage, but she is down — it counts.
      if (vs < PLANE.safeTouchdownVs) {
        world.damage += DAMAGE.hardTouchdown;
        world.shake = 0.8;
        thud(audio);
        if (world.damage >= DAMAGE.max) {
          crash(world, 'Hard landing — the gear folded on touchdown.');
          return;
        }
      }
      plane.altitude = ground + 1.2;
      land(world, strip);
      return;
    }
    if (strip && vs < -6) {
      crash(world, 'Slammed into the runway — too steep, too fast down.');
      return;
    }
    crash(world, clearance <= 0.5 ? 'Flew into the ridgeline.' : 'Clipped the valley floor.');
    return;
  }

  // Rings: fly through the glowing hoop.
  const ring = nextRing(world.route);
  if (ring) {
    const d2 = dist2(plane.x, plane.altitude, ring.x, ring.altitude);
    if (d2 < WORLD.ringRadius * WORLD.ringRadius) {
      ring.passed = true;
      world.ringsDone += 1;
      world.streak += 1;
      const gained = WORLD.ringScore + (world.streak - 1) * WORLD.streakBonus;
      world.score += gained;
      ringChime(audio);
      showMessage(world, `Ring ${ring.index + 1} — +${gained}`, 2);
    }
  }

  // Fuel rings refill the tanks.
  for (const fuel of world.route.fuels) {
    if (fuel.taken) continue;
    if (dist2(plane.x, plane.altitude, fuel.x, fuel.altitude) < 30 * 30) {
      fuel.taken = true;
      world.fuel = Math.min(100, world.fuel + FUEL.ringRefill);
      ringChime(audio);
      showMessage(world, `Fuel +${FUEL.ringRefill}%`, 2);
    }
  }

  // Birds and balloons: a hit costs damage and breaks the streak.
  for (const bird of world.route.birds) {
    if (bird.hit) continue;
    bird.x -= bird.speed * dt;
    const bx = bird.x + Math.sin(world.timeSec * 2 + bird.phase) * 8;
    if (dist2(plane.x, plane.altitude, bx, bird.altitude) < 26 * 26) {
      bird.hit = true;
      world.damage += DAMAGE.birdHit;
      world.streak = 0;
      world.shake = 0.6;
      thud(audio);
      showMessage(world, 'Bird strike! Damage +22%', 2.5);
      if (world.damage >= DAMAGE.max) {
        crash(world, 'Bird strike tore the wing off.');
        return;
      }
    }
  }
  for (const balloon of world.route.balloons) {
    if (balloon.hit) continue;
    const by = balloon.altitude + Math.sin(world.timeSec * 0.8 + balloon.bob) * 6;
    if (dist2(plane.x, plane.altitude, balloon.x, by) < 40 * 40) {
      balloon.hit = true;
      world.damage += DAMAGE.balloonHit;
      world.streak = 0;
      world.shake = 0.6;
      thud(audio);
      showMessage(world, 'Balloon! Damage +18%', 2.5);
      if (world.damage >= DAMAGE.max) {
        crash(world, 'Tangled with a balloon envelope.');
        return;
      }
    }
  }

  // Distance score ticks over as the valley passes below.
  world.distanceBest = Math.max(world.distanceBest, plane.x);
  world.score += Math.floor(plane.x / 400) - Math.floor((plane.x - plane.speed * dt) / 400);
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 1.4);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 2);
}
