# RIDGELINE — Bush Pilot Rescue

[![rank](https://make.fun/badge/best-flight-game-20261126-0057/emafajriana/best-flight-game-20261126-0057-entry/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/emafajriana/best-flight-game-20261126-0057-entry/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/)
[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/)

A complete, original HTML5 flight game for the [make.fun best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057/). It runs offline in a desktop browser from static files — no network, no build step.

## The game

Fly a bush plane down a dusk valley from Ridgeline Field to Storm Ridge, in two legs:

- **Leg 1 — Ring Run:** thread 5 glowing target rings, then land at Pinecrest Strip.
- **Leg 2 — Storm Ridge:** refuelled, thread 5 more rings over the high ridge and land at Storm Ridge.

Flying rewards throttle and pitch discipline: rings pay points with a streak bonus, fuel burns with throttle (green fuel rings top the tanks up), birds and hot-air balloons cost damage, and a hard touchdown on the runway folds the gear. Land gently — low speed, shallow descent, on the numbers — or she goes into the pines.

## Controls

- **↑ / ↓ (or W / S)** — pitch up / down
- **← / → (or A / D)** — throttle down / up
- **Space** — airbrake
- **Mouse** — move to steer pitch toward the pointer
- **M** mute, **P** pause, **R** restart, **Enter / click** to fly

## HUD

Altitude (ft), airspeed (kt) and heading tapes, fuel and damage bars, throttle, artificial horizon, vertical speed, mission banner — and flashing warnings for low fuel, stall, damage and terrain.

## How it is built

Plain HTML5 canvas, no engine, no assets: every pixel is drawn in code (`game/src/` — one file per job: `terrain.js`, `plane.js`, `rings.js`, `hud.js`, `audio.js`, `input.js`, `world.js`, `render.js`, `shots.js`, `main.js`). Sounds are synthesised with WebAudio. The world is seeded, so the same seed always builds the same valley.

Screenshots are real renders of the game's own code, staged deterministically with `?shot=cover|play|land|end` (see `shots.json`): a short autopilot plays the real rules forward from a fresh world.

## Play it

```sh
node serve.ts   # then open http://localhost:8080
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
