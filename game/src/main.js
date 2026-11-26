// RIDGELINE — Bush Pilot Rescue. Bootstrap: build the world, wire input
// and audio, run the fixed-step simulation under requestAnimationFrame,
// and draw every frame. With ?shot=cover|play|land|end the game stages a
// deterministic screenshot scene instead of waiting for a player.
import { VIEW, WORLD } from './config.js';
import { makeWorld, stepWorld, STEP } from './world.js';
import { drawScene } from './render.js';
import { makeInput, attachInput } from './input.js';
import { makeAudio, unlockAudio, updateAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') || '', 10);
const seed = Number.isFinite(seedParam) ? seedParam : WORLD.seed;
const shot = params.get('shot');

const world = makeWorld(seed);
const input = makeInput();
const audio = makeAudio();
attachInput(input, canvas);
window.addEventListener('keydown', () => unlockAudio(audio), { once: true });
canvas.addEventListener('mousedown', () => unlockAudio(audio), { once: true });

let shotStaged = false;
if (shot) {
  stageShot(shot, world, stepWorld);
  shotStaged = true;
  // Screenshot scenes hold still: the frame is the staged moment.
  drawScene(ctx, world, world.timeSec);
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shotStaged) {
    acc += dt;
    while (acc >= STEP) {
      stepWorld(world, input, audio);
      acc -= STEP;
    }
    updateAudio(audio, world.plane.throttle, world.plane.speed, world.plane.onGround);
  }
  drawScene(ctx, world, world.timeSec);
  requestAnimationFrame(frame);
}
if (!shotStaged) requestAnimationFrame(frame);
