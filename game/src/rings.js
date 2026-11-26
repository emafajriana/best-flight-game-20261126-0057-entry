// The things to fly through and the things to dodge: glowing target
// rings (the mission), green fuel rings, birds and hot-air balloons
// (hazards). Everything is placed from the seed, so the route is fixed
// and the autopilot can learn it.
import { WORLD } from './config.js';
import { makeRng } from './random.js';
import { groundAt } from './terrain.js';

/** Lay out both legs of the route: rings, fuel and hazards. */
export function buildRoute(terrain, seed) {
  const rng = makeRng(seed * 104729 + 77);
  const rings = [];
  const fuels = [];
  const birds = [];
  const balloons = [];
  const legs = [
    { from: 1200, to: WORLD.midStripX - 1200, count: WORLD.ringsPerLeg },
    { from: WORLD.midStripX + 1400, to: WORLD.farStripX - 1200, count: WORLD.ringsPerLeg },
  ];
  let n = 0;
  for (const leg of legs) {
    for (let i = 0; i < leg.count; i += 1) {
      const x = leg.from + ((leg.to - leg.from) * (i + 0.5)) / leg.count + rng.range(-160, 160);
      const ground = groundAt(terrain, x);
      const altitude = Math.max(ground + 90, ground + rng.range(90, 260));
      rings.push({ x, altitude, index: n, passed: false, pulse: rng.range(0, 6) });
      n += 1;
    }
  }
  // Fuel rings sit low over the valley, between the target rings.
  for (const fx of [3800, 7600, 11800, 14200, 19000, 23000, 27000, 29600]) {
    const ground = groundAt(terrain, fx);
    fuels.push({ x: fx, altitude: ground + rng.range(70, 130), taken: false });
  }
  // Birds drift across the route; balloons hang over the ridge.
  for (let i = 0; i < 14; i += 1) {
    const x = rng.range(1500, WORLD.routeLength - 800);
    birds.push({
      x, altitude: groundAt(terrain, x) + rng.range(120, 300),
      speed: rng.range(6, 14), phase: rng.range(0, 6), hit: false,
    });
  }
  for (const bx of [6400, 9200, 12900, 20500, 25200, 29200]) {
    balloons.push({
      x: bx, altitude: groundAt(terrain, bx) + rng.range(180, 260),
      bob: rng.range(0, 6), hit: false,
    });
  }
  return { rings, fuels, birds, balloons };
}

/** The next ring the pilot still has to fly through, or null. */
export function nextRing(route) {
  for (const ring of route.rings) {
    if (!ring.passed) return ring;
  }
  return null;
}

/** Distance in metres from the plane to a point (for ring capture). */
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Draw a target ring: a glowing hoop with its number, pulsing gently. */
export function drawRing(ctx, ring, sx, sy, timeSec, isNext) {
  const r = 34;
  const pulse = 1 + 0.07 * Math.sin(timeSec * 2.4 + ring.pulse);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = isNext ? '#ffd27a' : 'rgba(255,210,122,0.45)';
  ctx.lineWidth = isNext ? 7 : 5;
  ctx.shadowColor = '#ffae42';
  ctx.shadowBlur = isNext ? 22 : 8;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.25, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = isNext ? '#ffd27a' : 'rgba(255,210,122,0.6)';
  ctx.font = 'bold 20px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(ring.index + 1), 0, 2);
  ctx.restore();
}

/** Draw a fuel ring: green hoop with a droplet. */
export function drawFuel(ctx, fuel, sx, sy, timeSec) {
  const r = 24;
  ctx.save();
  ctx.translate(sx, sy + Math.sin(timeSec * 2 + fuel.x * 0.01) * 4);
  ctx.strokeStyle = '#5fd68a';
  ctx.lineWidth = 5;
  ctx.shadowColor = '#2fae5f';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#5fd68a';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.quadraticCurveTo(8, 2, 0, 10);
  ctx.quadraticCurveTo(-8, 2, 0, -10);
  ctx.fill();
  ctx.restore();
}

/** Draw a bird: two flapping arcs, drifting across the sky. */
export function drawBird(ctx, bird, sx, sy, timeSec) {
  const flap = Math.sin(timeSec * 9 + bird.phase) * 7;
  ctx.strokeStyle = '#1d1a16';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx - 12, sy + flap * 0.4);
  ctx.quadraticCurveTo(sx - 4, sy - 6 - flap, sx, sy);
  ctx.quadraticCurveTo(sx + 4, sy - 6 - flap, sx + 12, sy + flap * 0.4);
  ctx.stroke();
}

/** Draw a hot-air balloon: striped envelope, basket, burner glow. */
export function drawBalloon(ctx, balloon, sx, sy, timeSec) {
  const bob = Math.sin(timeSec * 0.8 + balloon.bob) * 6;
  ctx.save();
  ctx.translate(sx, sy + bob);
  ctx.fillStyle = '#e2574c';
  ctx.beginPath();
  ctx.ellipse(0, -18, 26, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2e3c2';
  ctx.beginPath();
  ctx.ellipse(0, -18, 9, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c8552e';
  ctx.beginPath();
  ctx.ellipse(0, -18, 26, 32, 0, Math.PI * 0.25, Math.PI * 0.75);
  ctx.fill();
  ctx.strokeStyle = '#5a4632';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.lineTo(-8, 20);
  ctx.moveTo(14, 8);
  ctx.lineTo(8, 20);
  ctx.stroke();
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(-9, 18, 18, 12);
  const flicker = 0.5 + 0.5 * Math.sin(timeSec * 11 + balloon.bob);
  ctx.fillStyle = `rgba(255,190,80,${0.35 + flicker * 0.4})`;
  ctx.beginPath();
  ctx.moveTo(-6, 14);
  ctx.lineTo(0, 22 + flicker * 4);
  ctx.lineTo(6, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
