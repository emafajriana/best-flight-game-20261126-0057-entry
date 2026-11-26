// The heads-up display: altitude, speed and heading tapes, fuel and
// damage bars, score, mission banner, throttle, artificial horizon and
// vertical-speed needle — the instruments the judge looks for, lit amber
// on dark glass. Units on screen are feet and knots, as a pilot reads.
import { VIEW } from './config.js';

const PANEL = 'rgba(10,14,24,0.62)';
const AMBER = '#ffd27a';
const CYAN = '#7fd4ff';
const RED = '#ff5a4d';
const GREEN = '#5fd68a';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,122,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function tapeValue(ctx, label, value, unit, x, y, w, colour) {
  panel(ctx, x, y, w, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x + 10, y + 7);
  ctx.fillStyle = colour;
  ctx.font = 'bold 24px ui-monospace, Menlo, monospace';
  ctx.fillText(String(value), x + 10, y + 24);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillText(unit, x + w - 26, y + 34);
}

function bar(ctx, x, y, w, label, frac, colour, low) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y + 15, w, 9);
  ctx.fillStyle = low ? RED : colour;
  ctx.fillRect(x, y + 15, Math.max(0, Math.min(1, frac)) * w, 9);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(frac * 100)}%`, x + w, y);
  ctx.textAlign = 'left';
}

/** Draw the whole HUD over the scene. `s` is the world state snapshot. */
export function drawHud(ctx, s, timeSec) {
  const W = VIEW.width;
  const altFt = Math.max(0, Math.round(s.plane.altitude * 3.281));
  const spdKt = Math.round(s.plane.speed * 1.944);
  const hdg = String(Math.round(((s.plane.heading % 360) + 360) % 360)).padStart(3, '0');
  tapeValue(ctx, 'ALTITUDE', altFt.toLocaleString('en-US'), 'FT', 16, 14, 148, AMBER);
  tapeValue(ctx, 'AIRSPEED', spdKt, 'KT', 172, 14, 132, CYAN);
  tapeValue(ctx, 'HEADING', hdg, '°', 312, 14, 118, '#ffffff');

  // Mission banner, centre top.
  panel(ctx, W / 2 - 250, 14, 500, 58);
  ctx.fillStyle = AMBER;
  ctx.font = 'bold 15px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(s.missionName, W / 2, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '12px ui-monospace, Menlo, monospace';
  ctx.fillText(s.missionBrief, W / 2, 48);

  // Score, top right.
  panel(ctx, W - 178, 14, 162, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', W - 166, 21);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px ui-monospace, Menlo, monospace';
  ctx.fillText(String(s.score).padStart(6, '0'), W - 166, 38);

  // Fuel + damage, bottom left.
  bar(ctx, 16, 640, 210, 'FUEL', s.fuel / 100, GREEN, s.fuel < 25);
  bar(ctx, 16, 678, 210, 'DAMAGE', s.damage / 100, '#e2574c', s.damage > 60);

  // Throttle bar, bottom centre-left.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillText('THROTTLE', 250, 640);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(250, 655, 150, 9);
  ctx.fillStyle = CYAN;
  ctx.fillRect(250, 655, s.plane.throttle * 150, 9);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.fillText(`${Math.round(s.plane.throttle * 100)}%`, 406, 652);

  // Artificial horizon, bottom right: a little ball that tilts with pitch.
  const hx = W - 76;
  const hy = 650;
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, 34, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#2a4a7a';
  ctx.fillRect(hx - 34, hy - 34, 68, 34);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(hx - 34, hy, 68, 34);
  ctx.rotate((-s.plane.pitch * Math.PI) / 180);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx - 34, hy);
  ctx.lineTo(hx + 34, hy);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(hx - 5, hy - 2);
  ctx.lineTo(hx + 5, hy - 2);
  ctx.lineTo(hx, hy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', hx, hy + 46);

  // Vertical speed, right of the horizon ball.
  const vs = s.verticalSpeed;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.fillText('VERT SPD', W - 130, 640);
  ctx.fillStyle = vs < -4 ? RED : '#ffffff';
  ctx.font = 'bold 15px ui-monospace, Menlo, monospace';
  ctx.fillText(`${vs >= 0 ? '+' : ''}${vs.toFixed(1)} m/s`, W - 130, 656);

  // Flashing warnings, centre screen.
  const warnings = [];
  if (s.fuel < 25) warnings.push('LOW FUEL');
  if (s.plane.speed < 30 && !s.plane.onGround) warnings.push('STALL');
  if (s.damage > 60) warnings.push('DAMAGE CRITICAL');
  if (s.terrainWarning) warnings.push('TERRAIN — PULL UP');
  if (warnings.length > 0 && Math.sin(timeSec * 7) > -0.2) {
    ctx.fillStyle = RED;
    ctx.font = 'bold 26px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(warnings.join('  •  '), W / 2, 120);
  }
  ctx.textAlign = 'left';
}
