// The valley the game flies through: a seeded ridgeline profile, a river,
// pine forest, two towns and two airstrips. The terrain is a pure function
// of world x (plus the seed), so the physics, the renderer and the
// screenshot autopilot all agree on where the ground is.
import { WORLD } from './config.js';
import { makeRng } from './random.js';

// Smooth ridges: a few sine octaves, seeded per 400 m segment so the
// profile is continuous but never repeats.
function ridgeHeight(x, seed) {
  const s = Math.sin(x * 0.00021 + seed * 1.7) * 0.5
    + Math.sin(x * 0.00053 + seed * 3.1) * 0.3
    + Math.sin(x * 0.00131 + seed * 5.3) * 0.2;
  return WORLD.valleyFloor + (s * 0.5 + 0.5) * (WORLD.ridgeTop - WORLD.valleyFloor);
}

/** Build every fixed feature of the valley once, from the seed. */
export function buildTerrain(seed) {
  const rng = makeRng(seed * 7919 + 13);
  // Flatten the ground into a runway wherever a strip sits.
  const strips = [
    { x: WORLD.homeStripX, name: 'RIDGELINE FIELD', home: true },
    { x: WORLD.midStripX, name: 'PINECREST STRIP', home: false },
    { x: WORLD.farStripX, name: 'STORM RIDGE', home: false },
  ];
  const stripAlt = 120;
  // Pine clusters, towns and the river are placed by the same stream.
  const pines = [];
  for (let x = 300; x < WORLD.routeLength; x += 90) {
    if (rng.chance(0.55)) pines.push({ x: x + rng.range(-30, 30), s: rng.range(0.7, 1.5) });
  }
  const towns = [];
  for (const tx of [5200, 10800, 21000, 27200]) {
    const houses = [];
    for (let i = 0; i < 9; i += 1) houses.push({ dx: rng.range(-260, 260), w: rng.range(26, 44), h: rng.range(20, 36) });
    towns.push({ x: tx, houses });
  }
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    clouds.push({ x: rng.range(0, WORLD.routeLength), y: rng.range(40, 260), s: rng.range(0.7, 1.9), drift: rng.range(2, 7) });
  }
  const birds = [];
  return { strips, stripAlt, pines, towns, clouds, birds };
}

function smooth(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Ground altitude in metres at world x. Each strip sits in a valley bowl:
 * the ridge eases down to the runway over the 4,000 m before it and back
 * up over 800 m past it, so there is a real approach corridor — a
 * 3-degree glidepath clears the ground all the way to the numbers — and
 * the runway is visible ahead instead of hidden behind a cliff.
 */
export function groundAt(terrain, x) {
  for (const strip of terrain.strips) {
    const s0 = strip.x - 4000;
    const s1 = strip.x;
    const s2 = strip.x + WORLD.stripLength;
    const s3 = s2 + 800;
    if (x >= s0 && x <= s3) {
      const base = ridgeHeight(x, WORLD.seed);
      let t;
      if (x < s1) t = smooth((x - s0) / (s1 - s0));
      else if (x <= s2) t = 1;
      else t = 1 - smooth((x - s2) / (s3 - s2));
      return base + (terrain.stripAlt - base) * t;
    }
  }
  return ridgeHeight(x, WORLD.seed);
}

/** The runway under world x, or null when the plane is not over one. */
export function stripAt(terrain, x) {
  for (const strip of terrain.strips) {
    if (x >= strip.x && x <= strip.x + WORLD.stripLength) return strip;
  }
  return null;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Paint the sky: dusk gradient, low sun, stars overhead, drifting clouds. */
export function drawSky(ctx, camX, timeSec, clouds) {
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, '#1b2340');
  g.addColorStop(0.45, '#4a4a72');
  g.addColorStop(0.72, '#b06a4e');
  g.addColorStop(1, '#e8a35c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  // Stars, only high up where the sky is dark.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 70; i += 1) {
    const sx = (i * 173.3) % 1280;
    const sy = (i * 97.7) % 190;
    const tw = 0.35 + 0.3 * Math.sin(timeSec * 1.3 + i);
    ctx.globalAlpha = Math.max(0.08, tw);
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Low sun with a warm halo, fixed to the horizon ahead.
  const sunX = 1010;
  const sunY = 470;
  const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
  halo.addColorStop(0, 'rgba(255,214,140,0.95)');
  halo.addColorStop(0.25, 'rgba(255,170,90,0.45)');
  halo.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  // Clouds drift slowly with the world.
  for (const cloud of clouds) {
    const cx = ((cloud.x - camX * 0.12 + timeSec * cloud.drift) % (WORLD.routeLength + 800) + WORLD.routeLength + 800) % (WORLD.routeLength + 800) - 400;
    if (cx < -260 || cx > 1540) continue;
    ctx.fillStyle = 'rgba(255,205,170,0.20)';
    ctx.beginPath();
    ctx.ellipse(cx, cloud.y, 120 * cloud.s, 22 * cloud.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 70 * cloud.s, cloud.y + 8, 80 * cloud.s, 16 * cloud.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Paint one parallax ridge layer (far = hazy purple, near = dark green). */
function drawRidge(ctx, camX, parallax, baseY, amp, colour, seedOff) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-20, 720);
  for (let sx = -20; sx <= 1300; sx += 26) {
    const wx = camX * parallax + sx * 2.4;
    const y = baseY - (Math.sin(wx * 0.0011 + seedOff) * 0.5 + Math.sin(wx * 0.0027 + seedOff * 2.3) * 0.3 + 0.8) * amp;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(1300, 720);
  ctx.closePath();
  ctx.fill();
}

/** Paint the ground: the terrain profile, pines, towns, river and strips. */
export function drawGround(ctx, terrain, camX, screenY, timeSec) {
  // Far and near ridges behind the playable ground.
  drawRidge(ctx, camX, 0.25, 470, 120, 'rgba(84,74,128,0.75)', 1.3);
  drawRidge(ctx, camX, 0.5, 520, 110, 'rgba(58,66,94,0.9)', 4.1);
  // The ground itself, sampled every 12 screen pixels.
  ctx.beginPath();
  ctx.moveTo(-20, 740);
  for (let sx = -20; sx <= 1300; sx += 12) {
    const wx = camX + sx * VIEW_METRES;
    ctx.lineTo(sx, screenY(groundAt(terrain, wx)));
  }
  ctx.lineTo(1300, 740);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 300, 0, 720);
  g.addColorStop(0, '#3d5a3a');
  g.addColorStop(1, '#22331f');
  ctx.fillStyle = g;
  ctx.fill();
  // River: a bright ribbon where the valley dips low.
  ctx.strokeStyle = 'rgba(232,163,92,0.55)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  for (let sx = -20; sx <= 1300; sx += 12) {
    const wx = camX + sx * VIEW_METRES;
    const gy = screenY(groundAt(terrain, wx));
    if (sx === -20) ctx.moveTo(sx, gy - 6);
    else ctx.lineTo(sx, gy - 6);
  }
  ctx.stroke();
  // Pines on the near ground.
  ctx.fillStyle = '#1c2b1a';
  for (const pine of terrain.pines) {
    const sx = (pine.x - camX) / VIEW_METRES;
    if (sx < -30 || sx > 1310) continue;
    const gy = screenY(groundAt(terrain, pine.x));
    const h = 26 * pine.s;
    ctx.beginPath();
    ctx.moveTo(sx, gy - h);
    ctx.lineTo(sx - 8 * pine.s, gy);
    ctx.lineTo(sx + 8 * pine.s, gy);
    ctx.closePath();
    ctx.fill();
  }
  // Towns: little houses with lit windows.
  for (const town of terrain.towns) {
    for (const house of town.houses) {
      const wx = town.x + house.dx;
      const sx = (wx - camX) / VIEW_METRES;
      if (sx < -50 || sx > 1330) continue;
      const gy = screenY(groundAt(terrain, wx));
      ctx.fillStyle = '#2a2118';
      ctx.fillRect(sx, gy - house.h, house.w, house.h);
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(sx + 5, gy - house.h + 6, 6, 7);
      ctx.fillRect(sx + house.w - 12, gy - house.h + 6, 6, 7);
    }
  }
  // Airstrips: flat tarmac, threshold bars, windsock and a hangar.
  for (const strip of terrain.strips) {
    const x0 = (strip.x - camX) / VIEW_METRES;
    const x1 = (strip.x + WORLD.stripLength - camX) / VIEW_METRES;
    if (x1 < -40 || x0 > 1320) continue;
    const gy = screenY(terrain.stripAlt);
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(x0, gy - 4, x1 - x0, 8);
    ctx.fillStyle = '#f2ead8';
    for (let d = 40; d < WORLD.stripLength - 40; d += 90) {
      const dx = (strip.x + d - camX) / VIEW_METRES;
      ctx.fillRect(dx, gy - 2, 26, 3);
    }
    // Windsock on a pole at the strip's near end.
    const wx = (strip.x + 60 - camX) / VIEW_METRES;
    ctx.strokeStyle = '#d8d2c2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx, gy - 4);
    ctx.lineTo(wx, gy - 46);
    ctx.stroke();
    ctx.fillStyle = '#e2574c';
    ctx.beginPath();
    ctx.moveTo(wx, gy - 46);
    ctx.lineTo(wx + 26, gy - 41);
    ctx.lineTo(wx, gy - 36);
    ctx.closePath();
    ctx.fill();
    // Hangar + fuel drums at the far end.
    const hx = (strip.x + WORLD.stripLength - 90 - camX) / VIEW_METRES;
    ctx.fillStyle = '#4a4038';
    ctx.fillRect(hx, gy - 42, 74, 42);
    ctx.fillStyle = '#c8552e';
    ctx.fillRect(hx + 8, gy - 12, 12, 12);
    ctx.fillRect(hx + 26, gy - 12, 12, 12);
    // Strip name painted under the runway, clear of the parked plane.
    ctx.fillStyle = 'rgba(242,234,216,0.85)';
    ctx.font = 'bold 15px ui-monospace, Menlo, monospace';
    ctx.fillText(strip.name, x0 + 8, gy + 26);
  }
}

// Metres of world per screen pixel horizontally (the camera zoom).
export const VIEW_METRES = 1.15;
export { lerp };
