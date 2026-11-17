# makefun-gta6-01-v2

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Alfatih15/makefun-gta6-01-v2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Alfatih15/makefun-gta6-01-v2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMARA: an open-world crime story in a sun-soaked coastal city you can explore on foot and by car.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=hjff56h1&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

An original open-world crime game for the make.fun **gta6-01** bounty. Mara Voss
came to Solmara with $150 and a grudge; Dante Kroll, the fixer who runs the
Marina, has work for anyone fast enough to take it. Steal cars, outrun the
Solmara PD, run packages across town, and settle things with the Salt Kings
crew on the plaza — then keep the city in free roam with taxi fares and
hidden cash stashes.

## How to play

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move on foot / drive |
| Mouse drag | Orbit the camera |
| Click | Shoot the pistol |
| E | Enter or steal a car / talk to Dante / get out |
| Shift | Run |
| Space | Brake / handbrake |
| P / Esc | Pause |
| M | Mute / unmute |

## The game

- **A city to explore** — Solmara: a 7×7-block grid of streets, towers with
  lit windows, a central plaza with a fountain, a park, a beach, the sea and
  a pier, with a day / dusk / night cycle and street lights after dark.
- **Traffic and pedestrians** — 14 cars drive the road grid and 26
  pedestrians stroll the sidewalks; peds run from gunfire.
- **Cars to steal and drive** — any traffic or parked car is yours with E,
  with arcade handling, braking and building collisions. A taxi is parked
  on the east side for fares.
- **Wanted level and police** — stealing, shooting and hit-and-runs raise
  heat and up to 5 stars. Police interceptors chase and ram; foot cops
  close in and shoot. Break line of sight, stay quiet, and the heat cools.
  Get busted and you lose $200 bail and wake up at the hospital.
- **Missions and story** — 5 missions: meet Dante at the Marina, steal the
  red coupe, lose the heat, run a package to the north pier against the
  clock, and clear the plaza of the Salt Kings crew.
- **Combat** — a hitscan pistol with tracers; rivals shoot back.
- **Progression** — mission payouts, $25 per rival down, taxi fares,
  6 hidden cash stashes, and a cash total that persists.
- **HUD with minimap** — health, cash, wanted stars, clock, mission
  objective with a timer, speedometer, and a live circular minimap with
  roads, traffic, police blips and the mission marker.
- **Save** — progress (cash, mission, stashes) autosaves to `localStorage`;
  continue from the title screen.
- **Feel** — screen shake, tracers, flashing police light bars, mission
  banners, and fully synthesised WebAudio sound (gunshots, sirens, engine
  hum, pickups, mission jingles) plus a quiet bass-and-pad music loop.
  No audio files.

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

Open `game/index.html` from any static server; the game loads nothing over the
network and plays offline. Node 22+ is needed for `main.ts`.

## Screenshots

The game stages its own screenshot scenes deterministically from `?shot=<scene>&seed=1`
(see `game/src/shots.js`): `start`, `chase`, `street`, `night`. The four files in
`screenshots/` were rendered from those scenes in a headless browser.

## Files

- `game/index.html` — page, canvas, HUD markup and styles, three.js import map
- `game/vendor/three.module.min.js` — three.js r160, minified build (vendored)
- `game/src/config.js` — tuning numbers, palette, story, mission definitions
- `game/src/random.js` — seeded RNG and math helpers
- `game/src/audio.js` — synthesised WebAudio effects and music
- `game/src/input.js` — keyboard + mouse input
- `game/src/city.js` — the city: roads, buildings, beach, pier, palms, lights, time of day
- `game/src/vehicles.js` — car meshes, traffic AI, player driving, police interceptors
- `game/src/pedestrians.js` — pedestrians and rival crew members
- `game/src/player.js` — Mara on foot: movement, pistol, entering cars
- `game/src/police.js` — wanted heat, stars, police spawns and response
- `game/src/missions.js` — the 5-mission story chain, taxi fares, cash stashes
- `game/src/hud.js` — HUD, minimap, menus, banners
- `game/src/save.js` — localStorage save / load
- `game/src/shots.js` — deterministic screenshot scenes + `window.__shotReady`
- `game/src/main.js` — boot, fixed-step loop, camera, interactions
- `main.ts` — entrypoint: copies `game/` + `screenshots/` to `/output`, writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## License

MIT — see `LICENSE`.
