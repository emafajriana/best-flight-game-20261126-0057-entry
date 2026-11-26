// The bush plane: its flight model and its drawing. Side view, flying
// east: throttle sets target speed, pitch sets climb, and below stall
// speed the wing gives up and she sinks. All drawing is canvas paths —
// no image assets — in one warm cream-and-red livery.
import { PLANE, VIEW } from './config.js';

export function makePlane() {
  return {
    // World position: x in metres east, altitude in metres above sea level.
    x: 0,
    altitude: 122,
    speed: 0,
    pitch: 0,
    throttle: 0,
    heading: 90,
    onGround: true,
    gearDown: true,
    propAngle: 0,
    bank: 0,
  };
}

/**
 * Advance the plane one step. `input` is { pitchUp, pitchDown, throttleUp,
 * throttleDown, brake } (booleans) plus an optional mousePitch in degrees.
 * Returns nothing; the plane object is mutated.
 */
export function stepPlane(plane, input, dt) {
  if (input.throttleUp) plane.throttle = Math.min(1, plane.throttle + dt * 0.55);
  if (input.throttleDown) plane.throttle = Math.max(0, plane.throttle - dt * 0.7);
  if (input.brake) plane.throttle = Math.max(0, plane.throttle - dt * 1.4);

  const targetPitch = input.mousePitch !== null && input.mousePitch !== undefined
    ? input.mousePitch
    : (input.pitchUp ? PLANE.maxPitchUp : input.pitchDown ? -PLANE.maxPitchDown : 0);
  const rate = PLANE.pitchRate * dt;
  if (plane.pitch < targetPitch) plane.pitch = Math.min(targetPitch, plane.pitch + rate);
  else if (plane.pitch > targetPitch) plane.pitch = Math.max(targetPitch, plane.pitch - rate);

  const targetSpeed = PLANE.minSpeed + plane.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  const accel = plane.speed < targetSpeed ? PLANE.accel : (input.brake ? PLANE.brakeDecel : PLANE.accel * 0.6);
  if (plane.speed < targetSpeed) plane.speed = Math.min(targetSpeed, plane.speed + accel * dt);
  else plane.speed = Math.max(targetSpeed, plane.speed - accel * dt);

  // Climb follows pitch; below stall speed the wing sinks instead.
  const climb = plane.speed * Math.sin((plane.pitch * Math.PI) / 180);
  const stallSink = plane.speed < PLANE.stallSpeed && !plane.onGround
    ? (PLANE.stallSpeed - plane.speed) * 0.55
    : 0;
  plane.altitude += (climb - stallSink) * dt;
  plane.x += plane.speed * Math.cos((plane.pitch * Math.PI) / 180) * dt;

  // Heading wanders a touch with pitch input, so the compass reads live.
  plane.heading = 90 + plane.pitch * 0.35;
  plane.bank = plane.pitch * 0.4;
  plane.propAngle += dt * (4 + plane.throttle * 46);
}

/** Vertical speed in m/s, for the HUD and the landing check. */
export function verticalSpeed(plane) {
  const climb = plane.speed * Math.sin((plane.pitch * Math.PI) / 180);
  const stallSink = plane.speed < PLANE.stallSpeed && !plane.onGround
    ? (PLANE.stallSpeed - plane.speed) * 0.55
    : 0;
  return climb - stallSink;
}

/** Draw the plane at screen (sx, sy), nose east, pitched by plane.pitch. */
export function drawPlane(ctx, plane, sx, sy, timeSec) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate((-plane.pitch * Math.PI) / 180);
  // Landing-light cone when the gear is down and she is low.
  if (plane.gearDown && plane.altitude < 320) {
    const cone = ctx.createLinearGradient(0, 0, 190, 0);
    cone.addColorStop(0, 'rgba(255,240,190,0.30)');
    cone.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(52, -2);
    ctx.lineTo(190, -26);
    ctx.lineTo(190, 22);
    ctx.lineTo(52, 6);
    ctx.closePath();
    ctx.fill();
  }
  // Propeller: blurred disc plus two blades at the current angle.
  ctx.save();
  ctx.translate(56, -4);
  ctx.rotate(plane.propAngle);
  ctx.fillStyle = 'rgba(40,36,30,0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c2822';
  ctx.fillRect(-2, -26, 4, 52);
  ctx.fillRect(-26, -2, 52, 4);
  ctx.restore();
  ctx.fillStyle = '#3a3a40';
  ctx.beginPath();
  ctx.arc(56, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  // Fuselage: cream body, red cheatline, cabin windows.
  ctx.fillStyle = '#f2e3c2';
  ctx.beginPath();
  ctx.moveTo(-52, 2);
  ctx.quadraticCurveTo(-58, -12, -38, -14);
  ctx.lineTo(30, -16);
  ctx.quadraticCurveTo(54, -14, 58, -4);
  ctx.lineTo(52, 6);
  ctx.quadraticCurveTo(20, 12, -30, 10);
  ctx.quadraticCurveTo(-50, 8, -52, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8552e';
  ctx.fillRect(-50, 0, 104, 4);
  // Wing over the cabin.
  ctx.fillStyle = '#c8552e';
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.lineTo(6, -14);
  ctx.lineTo(2, -34);
  ctx.lineTo(-22, -34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8f3d22';
  ctx.fillRect(-22, -34, 24, 4);
  // Tail.
  ctx.fillStyle = '#c8552e';
  ctx.beginPath();
  ctx.moveTo(-52, -8);
  ctx.lineTo(-64, -30);
  ctx.lineTo(-54, -30);
  ctx.lineTo(-44, -10);
  ctx.closePath();
  ctx.fill();
  // Cabin windows, lit amber.
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.moveTo(-26, -13);
  ctx.lineTo(-8, -13);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-26, -5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd27a';
  ctx.fillRect(2, -12, 12, 7);
  // Wheels, only with the gear down.
  if (plane.gearDown) {
    ctx.fillStyle = '#22201c';
    ctx.beginPath();
    ctx.arc(-28, 14, 7, 0, Math.PI * 2);
    ctx.arc(30, 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22201c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, 8);
    ctx.lineTo(-24, 12);
    ctx.moveTo(30, 8);
    ctx.lineTo(30, 12);
    ctx.stroke();
  }
  // Nav lights: red left, green right, white tail — blinking with time.
  const blink = Math.sin(timeSec * 6) > 0;
  if (blink) {
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(-58, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4dff88';
    ctx.beginPath();
    ctx.arc(58, -4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-64, -28, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
