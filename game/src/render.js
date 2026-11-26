// Scene composition: sky, ground, route objects, the plane, the HUD and
// the title / pause / crash / complete screens. The camera follows the
// plane (fixed screen x, vertical centre on the plane's altitude) so the
// valley scrolls past and the next ring is always ahead on screen.
import { VIEW } from './config.js';
import { drawSky, drawGround, groundAt, VIEW_METRES } from './terrain.js';
import { drawPlane, verticalSpeed } from './plane.js';
import { drawRing, drawFuel, drawBird, drawBalloon, nextRing } from './rings.js';
import { drawHud } from './hud.js';
import { missionOf, SCREEN_TITLE, SCREEN_PAUSED, SCREEN_CRASHED, SCREEN_COMPLETE } from './world.js';

export { SCREEN_TITLE, SCREEN_PAUSED, SCREEN_CRASHED, SCREEN_COMPLETE };

function screenYFactory(planeAlt) {
  return (alt) => 360 - (alt - planeAlt) / VIEW_METRES;
}

// A centred panel for the title / pause / crash / complete screens. The
// title and complete panels sit right of centre (cx 910) so the plane on
// the runway still shows on the left of the frame.
function bigPanel(ctx, title, lines, accent, cx) {
  const centre = cx || 640;
  ctx.fillStyle = 'rgba(8,12,22,0.72)';
  ctx.beginPath();
  ctx.roundRect(centre - 350, 150, 700, 400, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px ui-monospace, Menlo, monospace';
  ctx.fillText(title, centre, 230);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px ui-monospace, Menlo, monospace';
  lines.forEach((line, i) => ctx.fillText(line, centre, 292 + i * 34));
  ctx.textAlign = 'left';
}

/** Draw one frame of the game. */
export function drawScene(ctx, world, timeSec) {
  const plane = world.plane;
  const camX = plane.x - VIEW.planeScreenX * VIEW_METRES;
  const screenY = screenYFactory(plane.altitude);
  const shakeX = world.shake > 0 ? (Math.sin(timeSec * 47) * world.shake * 7) : 0;
  const shakeY = world.shake > 0 ? (Math.cos(timeSec * 39) * world.shake * 5) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawSky(ctx, camX, timeSec, world.terrain.clouds);
  drawGround(ctx, world.terrain, camX, screenY, timeSec);

  const toScreen = (wx, alt) => [(wx - camX) / VIEW_METRES, screenY(alt)];
  const onScreen = (sx, sy) => sx > -120 && sx < 1400 && sy > -120 && sy < 840;

  // Route objects: rings, fuel, birds, balloons.
  const ring = nextRing(world.route);
  for (const r of world.route.rings) {
    if (r.passed) continue;
    const [sx, sy] = toScreen(r.x, r.altitude);
    if (onScreen(sx, sy)) drawRing(ctx, r, sx, sy, timeSec, r === ring);
  }
  for (const fuel of world.route.fuels) {
    if (fuel.taken) continue;
    const [sx, sy] = toScreen(fuel.x, fuel.altitude);
    if (onScreen(sx, sy)) drawFuel(ctx, fuel, sx, sy, timeSec);
  }
  for (const bird of world.route.birds) {
    if (bird.hit) continue;
    const bx = bird.x + Math.sin(timeSec * 2 + bird.phase) * 8;
    const [sx, sy] = toScreen(bx, bird.altitude);
    if (onScreen(sx, sy)) drawBird(ctx, bird, sx, sy, timeSec);
  }
  for (const balloon of world.route.balloons) {
    if (balloon.hit) continue;
    const by = balloon.altitude + Math.sin(timeSec * 0.8 + balloon.bob) * 6;
    const [sx, sy] = toScreen(balloon.x, by);
    if (onScreen(sx, sy)) drawBalloon(ctx, balloon, sx, sy, timeSec);
  }

  // Arrow toward the next ring when it is off-screen ahead.
  if (ring && world.screen !== SCREEN_TITLE) {
    const [rx] = toScreen(ring.x, ring.altitude);
    if (rx > 1300) {
      const dist = Math.round(ring.x - plane.x);
      ctx.fillStyle = '#ffd27a';
      ctx.font = 'bold 15px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`RING ${ring.index + 1} — ${dist} m`, 1218, 110);
      ctx.beginPath();
      ctx.moveTo(1230, 98);
      ctx.lineTo(1246, 106);
      ctx.lineTo(1230, 114);
      ctx.closePath();
      ctx.fill();
      ctx.textAlign = 'left';
    }
  }

  // Dust kicked up on the ground roll.
  if (plane.onGround && plane.speed > 8) {
    ctx.fillStyle = 'rgba(210,190,160,0.35)';
    for (let i = 0; i < 5; i += 1) {
      const px = VIEW.planeScreenX - 60 - i * 14 - ((timeSec * 90 + i * 37) % 40);
      const py = screenY(groundAt(world.terrain, plane.x)) - 4 - ((i * 13 + timeSec * 20) % 26);
      ctx.beginPath();
      ctx.arc(px, py, 5 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The plane herself.
  drawPlane(ctx, plane, VIEW.planeScreenX, screenY(plane.altitude), timeSec);

  // HUD + transient message.
  const vs = verticalSpeed(plane);
  drawHud(ctx, {
    plane,
    score: world.score,
    fuel: world.fuel,
    damage: world.damage,
    verticalSpeed: vs,
    terrainWarning: world.terrainWarning,
    missionName: missionOf(world).name,
    missionBrief: missionOf(world).brief,
  }, timeSec);
  if (world.message && timeSec < world.messageUntil) {
    ctx.fillStyle = 'rgba(8,12,22,0.66)';
    const w = ctx.measureText(world.message).width + 36;
    ctx.beginPath();
    ctx.roundRect(640 - w / 2, 566, w, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 16px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, 640, 589);
    ctx.textAlign = 'left';
  }

  // Screens over the scene.
  if (world.screen === SCREEN_TITLE) {
    ctx.fillStyle = 'rgba(8,12,22,0.45)';
    ctx.fillRect(0, 0, 1280, 720);
    bigPanel(ctx, 'RIDGELINE', [
      'BUSH PILOT RESCUE  —  a flight game',
      '',
      `${missionOf(world).name}: ${missionOf(world).brief}`,
      'Thread the glowing rings  •  mind your fuel  •  land gently',
      '',
      '↑ ↓ pitch    ← → throttle    SPACE airbrake    mouse steers too',
      'M mute    P pause    R restart',
      '',
      'Press ENTER or click to fly',
    ], '#ffd27a', 910);
  } else if (world.screen === SCREEN_PAUSED) {
    ctx.fillStyle = 'rgba(8,12,22,0.55)';
    ctx.fillRect(0, 0, 1280, 720);
    bigPanel(ctx, 'PAUSED', ['Press P or ENTER to keep flying'], '#7fd4ff');
  } else if (world.screen === SCREEN_CRASHED) {
    ctx.fillStyle = 'rgba(20,6,8,0.55)';
    ctx.fillRect(0, 0, 1280, 720);
    bigPanel(ctx, 'CRASHED', [
      world.crashReason,
      '',
      `Score ${world.score}   •   Rings ${world.ringsDone} / 10   •   Landings ${world.landings}`,
      '',
      'Press ENTER to fly again',
    ], '#ff5a4d');
  } else if (world.screen === SCREEN_COMPLETE) {
    ctx.fillStyle = 'rgba(8,18,10,0.55)';
    ctx.fillRect(0, 0, 1280, 720);
    bigPanel(ctx, 'MISSION COMPLETE', [
      'Both legs flown — Ridgeline Field to Storm Ridge.',
      '',
      `Rings ${world.ringsDone} / 10   •   Landings ${world.landings}   •   Time bonus +${world.timeBonus || 0}`,
      `Final score ${world.score}`,
      '',
      'Press ENTER to fly it again',
    ], '#5fd68a', 910);
  }
  ctx.restore();
}
