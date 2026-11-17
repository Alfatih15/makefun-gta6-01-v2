# SOLMARA — build log (gta6-01)

## What was built

An original open-world crime game, **SOLMARA**, written in this session
under the running make.fun recording (id
01a1ea2b-efc5-7406-9d73-ac67683924a3). All code was written with file
write/edit tools only — no shell-written code, no copied starter, no
code imported from outside the repo. The one exception is the vendored
library: three.js r160, fetched as the official minified build
(`three.module.min.js`, 670,681 bytes) into `game/vendor/`.

- **City** (`game/src/city.js`): a seeded 7×7-block coastal city — road
  grid with dashed centre lines and sidewalks, towers with canvas
  window textures, central plaza with fountain, park with pond, beach,
  sea, pier, palms, street lights, and a day / dusk / night cycle.
- **Driving** (`game/src/vehicles.js`): box-built cars, 14 traffic cars
  following the road grid and turning at intersections, arcade player
  driving (accelerate, brake, reverse, steering by speed), building and
  car collisions, police interceptors with flashing light bars that
  chase and ram.
- **On foot** (`game/src/player.js`): third-person movement relative to
  the camera, run, hitscan pistol with tracers, entering/stealing any
  traffic or parked car with E.
- **Wanted** (`game/src/police.js`): heat from crimes (steal +25, shots,
  hit-and-run, officer down), 0–5 stars, police cars and foot cops that
  spawn, chase and shoot; heat cools when the player breaks contact and
  stays quiet; busted costs $200 and respawns at the hospital.
- **Missions** (`game/src/missions.js`): a 5-mission story chain (meet
  Dante, steal the red coupe, lose the heat, timed package run, clear
  the plaza of 4 Salt Kings rivals), plus taxi fares and 6 hidden cash
  stashes for free roam.
- **HUD** (`game/src/hud.js`): health, cash, wanted stars, clock,
  mission objective with timer, speedometer, live circular minimap
  (roads, traffic, police blips, mission marker), start / pause /
  busted / story-complete menus, banners and toasts.
- **Sound** (`game/src/audio.js`): synthesised WebAudio only — gunshots,
  sirens, engine hum, pickups, mission jingles, bass-and-pad music loop.
- **Save** (`game/src/save.js`): cash, mission, stashes and position in
  `localStorage`, autosaved; continue from the title screen.

## Sizes

- `game/`: 767,083 bytes, 16 files (three.module.min.js 670,681 bytes;
  own source ~90 KB across 13 modules + index.html)
- `screenshots/`: 408,980 bytes, 4 JPEGs at 1280×720, q88
  (1-start 141,837; 2-chase 95,817; 3-street 100,759; 4-night 70,567)
- `main.ts` + `dossier.json`: two `main.ts` runs write byte-identical
  output (`diff -r` clean); `/output` 1,822,556 bytes, 21 files;
  `dossier.json` 646,493 bytes (under the 1.5 MiB cap)

## Verification

- `node --check` on every `game/src/*.js` module: clean.
- Served with `node serve.ts` and played in headless Chromium
  (`chromium_headless_shell-1187`): the plain page loads the title
  screen over the live city with no console errors; all four
  `?shot=start|chase|street|night&seed=1` scenes render and set
  `window.__shotReady`, and were eyeballed as PNGs before conversion.
- No network references in `game/`: every script, module and import-map
  entry resolves to a file inside `game/` (grep clean).
- Kit check (`node cli/makefun.mjs check --kit . --repo … --worktree`):
  **4 passed, 0 failed, 16 skipped, 5 at submission** — the 5
  at-submission rows (repo public / owner / created after open /
  commit in repo / duplicate snapshot) are the site's at submit time;
  the repo is public, created 2026-11-17T15:40:10Z (after the 15:00Z
  opening), and this commit is pushed to it.

## Fixes during the build

- Car camera yaw: the chase camera sat in front of the car; fixed to
  trail the car's heading.
- Staged police cars first spawned behind the camera and were invisible,
  then rammed the player car to a stop; re-staged flanking slightly
  ahead plus one head-on, and shortened the settle so the chase still
  moves (24 km/h in the shot).
- Mission banner/toast caught mid-fade in captures; hidden before the
  paint that sets `window.__shotReady`.
- Mission beacon ring floated mid-air; moved to ground level.
- `game` object in `main.js` was referenced before definition in the
  shot path; moved above the boot section.
- System Chrome (`/opt/meta-chromium/chrome`) refuses to start here
  ("Hatch WebGL domain policy is required"); all captures used the
  Playwright headless shell, which renders WebGL fine.

## Not done here (parent's job)

- Sealing the recording and submitting the entry.
