// All sound is synthesised with WebAudio — no audio files, nothing to
// load. Engine drone follows throttle, wind follows speed, and short
// blips mark rings, landings and crashes. Silent until the first user
// gesture (browsers demand that) and safe to skip in screenshot mode.
export function makeAudio() {
  return { ctx: null, engine: null, engineGain: null, wind: null, windGain: null, muted: false };
}

function ensure(audio) {
  if (audio.ctx) return true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    audio.ctx = new Ctx();
    audio.engine = audio.ctx.createOscillator();
    audio.engine.type = 'sawtooth';
    audio.engine.frequency.value = 55;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engine.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engine.start();
    // Wind: filtered noise from a looping buffer.
    const len = audio.ctx.sampleRate;
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    audio.wind = audio.ctx.createBufferSource();
    audio.wind.buffer = buf;
    audio.wind.loop = true;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    audio.windGain = audio.ctx.createGain();
    audio.windGain.gain.value = 0;
    audio.wind.connect(filter);
    filter.connect(audio.windGain);
    audio.windGain.connect(audio.ctx.destination);
    audio.wind.start();
    return true;
  } catch (err) {
    return false;
  }
}

/** Call on the first key/click: starts the audio graph. */
export function unlockAudio(audio) {
  if (ensure(audio) && audio.ctx.state === 'suspended') audio.ctx.resume();
}

/** Per-frame: engine pitch follows throttle, wind follows speed. */
export function updateAudio(audio, throttle, speed, onGround) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  audio.engine.frequency.setTargetAtTime(48 + throttle * 70, t, 0.1);
  audio.engineGain.gain.setTargetAtTime(onGround ? 0.015 : 0.03 + throttle * 0.035, t, 0.1);
  audio.windGain.gain.setTargetAtTime(Math.min(0.05, speed * 0.00045), t, 0.15);
}

function blip(audio, freq, dur, vol, type) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export function ringChime(audio) {
  blip(audio, 880, 0.25, 0.12);
  setTimeout(() => blip(audio, 1318, 0.3, 0.1), 90);
}

export function thud(audio) {
  blip(audio, 70, 0.4, 0.25, 'triangle');
}

export function fanfare(audio) {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(audio, f, 0.35, 0.12), i * 120));
}
