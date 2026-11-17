// Solmara — main boot and game loop. Builds the city, wires every system,
// runs the fixed-step simulation and the third-person camera.

import * as THREE from 'three';
import { CITY, STEP, PLAYER, CAR, WANTED, MISSIONS, PALETTE } from './config.js';
import { mulberry32, clamp } from './random.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { buildCity } from './city.js';
import { TrafficCar, PlayerCar, makeCarMesh } from './vehicles.js';
import { Pedestrian, Rival } from './pedestrians.js';
import { Player } from './player.js';
import { WantedSystem } from './police.js';
import { MissionRunner, TaxiFare, Stash } from './missions.js';
import { Hud } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { runShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shot = params.get('shot');
const rng = mulberry32(seed);

window.addEventListener('error', (event) => {
  window.__gameError = String(event.message || event.error || 'error');
});

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

const city = buildCity(THREE, scene, rng);
const audio = new AudioEngine();
const input = new Input(canvas);
const hud = new Hud(document);

const state = {
  cash: PLAYER.startCash,
  mode: 'title',
  day: 1,
  hour: 9,
  minute: 0,
  clockMinutes: 9 * 60,
  inCar: false,
  timeOfDay: 'day',
  shake: 0,
  saveTimer: 0,
  fareTimer: 25,
  completeShown: false,
  stolenCar: false,
};

const saved = loadSave();
if (saved) {
  state.cash = saved.cash;
  state.day = saved.day;
  state.clockMinutes = 9 * 60;
}

// World state.
const traffic = [];
for (let i = 0; i < 14; i += 1) traffic.push(new TrafficCar(THREE, scene, rng, city.roads));
const peds = [];
for (let i = 0; i < 26; i += 1) peds.push(new Pedestrian(THREE, scene, rng, city.roads));
const player = new Player(THREE, scene, saved ? saved.x : 0, saved ? saved.z : 40);
const wanted = new WantedSystem(THREE, scene, city.colliders);
const missions = new MissionRunner(THREE, scene, state);
const fare = new TaxiFare(THREE, scene, rng, city.roads);
const stashes = [
  new Stash(THREE, scene, 120, -120),
  new Stash(THREE, scene, -180, 120),
  new Stash(THREE, scene, 250, 60),
  new Stash(THREE, scene, -60, -180),
  new Stash(THREE, scene, 180, 180),
  new Stash(THREE, scene, -210, -60),
];
if (saved && saved.stashes) {
  saved.stashes.forEach((taken, i) => {
    if (taken && stashes[i]) {
      stashes[i].taken = true;
      stashes[i].group.visible = false;
    }
  });
}
const rivals = [];
let playerCar = null;

// Parked cars the player can steal, including the red coupe for mission 2.
const parked = [];
function addParked(x, z, heading, color, kind, isCoupe) {
  const mesh = makeCarMesh(THREE, color, kind || 'car');
  mesh.group.position.set(x, 0, z);
  mesh.group.rotation.y = heading;
  scene.add(mesh.group);
  const entry = { x, z, heading, color, kind: kind || 'car', group: mesh.group, isCoupe: Boolean(isCoupe) };
  parked.push(entry);
  return entry;
}
addParked(-31, 62, Math.PI / 2, 0xd83a2e, 'car', true);
addParked(93, -31, 0, 0x2e6fd8, 'car', false);
addParked(-155, 31, Math.PI, 0xeeeeee, 'car', false);
addParked(31, 155, -Math.PI / 2, 0x3fae6a, 'car', false);
addParked(155, -93, Math.PI / 2, PALETTE.taxi, 'taxi', false);
addParked(-93, -155, 0, 0x222222, 'car', false);

// Camera rig.
const cam = { yaw: Math.PI, pitch: 0.32, dist: 9, height: 3.2 };

// A tracer line for gunfire, reused every shot.
const tracerGeo = new THREE.BufferGeometry();
tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const tracer = new THREE.Line(
  tracerGeo,
  new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }),
);
tracer.frustumCulled = false;
scene.add(tracer);
let tracerTimer = 0;

function showTracer(fromX, fromY, fromZ, toX, toY, toZ) {
  const pos = tracerGeo.attributes.position;
  pos.setXYZ(0, fromX, fromY, fromZ);
  pos.setXYZ(1, toX, toY, toZ);
  pos.needsUpdate = true;
  tracer.material.opacity = 0.9;
  tracerTimer = 0.09;
}

function setMode(mode) {
  state.mode = mode;
  hud.showMenu(mode === 'title' ? 'start' : mode === 'paused' ? 'pause' : mode === 'busted' ? 'busted' : mode === 'complete' ? 'complete' : null);
  hud.setCrosshair(mode === 'playing' && !state.inCar);
}

function saveGame() {
  writeSave({
    cash: state.cash,
    missionIndex: missions.missionIndex,
    day: state.day,
    x: player.x,
    z: player.z,
    stashes: stashes.map((s) => s.taken),
  });
}

function spawnRivals() {
  const spots = [[-40, -12], [-20, 10], [-45, 8], [-15, -14]];
  spots.forEach(([x, z]) => {
    const rival = new Rival(THREE, scene, x, z);
    rivals.push(rival);
  });
  hud.toast('Salt Kings crew on the plaza — take them down.');
}

missions.onMissionStart = (mission) => {
  hud.banner(mission.title, mission.brief);
  audio.missionStart();
  if (mission.id === 'm5-rooftop-standoff') spawnRivals();
};
missions.onMissionDone = () => {
  audio.missionDone();
  saveGame();
  if (missions.missionIndex >= MISSIONS.length - 1) state.fareTimer = 10;
};
missions.onMessage = (text) => hud.toast(text);
wanted.onCrime = (stars, reason) => {
  hud.toast(stars >= 3 ? `WANTED — ${stars} stars. Lose the cops!` : `The PD noticed that (${reason}).`);
};

function carHeading(entry) {
  if (entry.heading !== undefined) return entry.heading;
  if (entry.horizontal) return entry.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  return entry.dir > 0 ? 0 : Math.PI;
}

function enterCar(entry) {
  const isTraffic = entry && entry.__traffic;
  if (isTraffic) {
    const index = traffic.indexOf(entry);
    if (index >= 0) traffic.splice(index, 1);
    scene.remove(entry.mesh.group);
  } else if (entry) {
    const index = parked.indexOf(entry);
    if (index >= 0) parked.splice(index, 1);
    scene.remove(entry.group);
  }
  playerCar = new PlayerCar(THREE, scene, entry.color, entry.x, entry.z, carHeading(entry));
  state.inCar = true;
  player.group.visible = false;
  cam.dist = 11;
  cam.height = 3.6;
  if (entry.isCoupe) {
    state.stolenCar = true;
    wanted.addHeat(WANTED.stealCar, 'grand theft auto');
    hud.toast('You stole the coupe — the PD is on you!');
  } else {
    hud.toast('Car taken. E to get out, Space to brake.');
  }
  audio.engine(true, 0);
  hud.setCrosshair(false);
}

function exitCar() {
  if (!playerCar) return;
  const x = playerCar.x - Math.sin(playerCar.heading + Math.PI / 2) * 3;
  const z = playerCar.z - Math.cos(playerCar.heading + Math.PI / 2) * 3;
  addParked(playerCar.x, playerCar.z, playerCar.heading, playerCar.color, 'car', false);
  scene.remove(playerCar.group);
  playerCar = null;
  state.inCar = false;
  player.x = x;
  player.z = z;
  player.group.visible = true;
  cam.dist = 9;
  cam.height = 3.2;
  audio.engine(false, 0);
  hud.setCrosshair(true);
}

function nearestCar(maxDist) {
  let best = null;
  let bestDist = maxDist;
  const px = player.x;
  const pz = player.z;
  for (const car of traffic) {
    const d = Math.hypot(car.x - px, car.z - pz);
    if (d < bestDist) {
      bestDist = d;
      best = car;
      car.__traffic = true;
    }
  }
  for (const car of parked) {
    const d = Math.hypot(car.x - px, car.z - pz);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

function damagePlayer(amount, kind) {
  if (state.mode !== 'playing') return;
  if (kind === 'ram') {
    if (playerCar) playerCar.speed *= 0.45;
    state.shake = Math.max(state.shake, 0.25);
    return;
  }
  player.hp -= amount;
  state.shake = Math.max(state.shake, 0.3);
  hud.setHealth(player.hp, PLAYER.maxHealth);
  if (player.hp <= 0) bustPlayer();
}

function bustPlayer() {
  wanted.clear();
  audio.busted();
  audio.siren(false);
  audio.engine(false, 0);
  state.cash = Math.max(0, state.cash - 200);
  if (playerCar) {
    addParked(playerCar.x, playerCar.z, playerCar.heading, playerCar.color, 'car', false);
    scene.remove(playerCar.group);
    playerCar = null;
    state.inCar = false;
    player.group.visible = true;
  }
  player.reset(0, 155);
  cam.dist = 9;
  cam.height = 3.2;
  saveGame();
  setMode('busted');
}

function updateCamera(dt) {
  const mouse = input.consumeMouse();
  cam.yaw -= mouse.dx * 0.004;
  cam.pitch = clamp(cam.pitch + mouse.dy * 0.003, 0.08, 0.9);
  const targetX = state.inCar && playerCar ? playerCar.x : player.x;
  const targetZ = state.inCar && playerCar ? playerCar.z : player.z;
  // In a car the camera trails the car's heading; on foot it orbits freely.
  const yaw = state.inCar && playerCar ? playerCar.heading : cam.yaw;
  const backX = -Math.sin(yaw);
  const backZ = -Math.cos(yaw);
  const cx = targetX + backX * cam.dist;
  const cz = targetZ + backZ * cam.dist;
  const cy = cam.height + Math.sin(cam.pitch) * cam.dist * 0.6;
  camera.position.set(cx, cy, cz);
  const lookX = targetX + Math.sin(yaw) * 4;
  const lookZ = targetZ + Math.cos(yaw) * 4;
  camera.lookAt(lookX, 1.6, lookZ);
  if (state.shake > 0) {
    state.shake -= dt;
    camera.position.x += (Math.random() - 0.5) * state.shake * 0.8;
    camera.position.y += (Math.random() - 0.5) * state.shake * 0.8;
  }
}

function step(dt) {
  // Clock: one real second is one game minute.
  state.clockMinutes += dt;
  state.hour = Math.floor(state.clockMinutes / 60) % 24;
  state.minute = Math.floor(state.clockMinutes % 60);
  if (state.clockMinutes >= 24 * 60) {
    state.clockMinutes -= 24 * 60;
    state.day += 1;
  }
  const hour = state.hour;
  const tod = hour >= 20 || hour < 6 ? 'night' : hour >= 17 ? 'dusk' : 'day';
  if (tod !== state.timeOfDay) {
    state.timeOfDay = tod;
    city.setTimeOfDay(tod);
  }

  const px = state.inCar && playerCar ? playerCar.x : player.x;
  const pz = state.inCar && playerCar ? playerCar.z : player.z;

  // Traffic and pedestrians.
  for (const car of traffic) car.update(dt);
  for (const ped of peds) ped.update(dt);

  // Player.
  let speedRatio = 0;
  if (state.inCar && playerCar) {
    const others = [
      ...traffic.map((c) => ({ x: c.x, z: c.z, radius: 2.4 })),
      ...parked.map((c) => ({ x: c.x, z: c.z, radius: 2.4 })),
      ...wanted.copCars,
    ];
    speedRatio = playerCar.update(dt, input, city.colliders, others);
    // Running over a pedestrian is a crime.
    for (const ped of peds) {
      if (Math.hypot(ped.x - px, ped.z - pz) < 2.6 && Math.abs(playerCar.speed) > 6) {
        if (!ped.cooldown || ped.cooldown <= 0) {
          ped.cooldown = 3;
          ped.scare(px, pz);
          wanted.addHeat(WANTED.hitPed, 'hit and run');
          hud.toast('You hit a pedestrian!');
        }
      }
      if (ped.cooldown) ped.cooldown -= dt;
    }
  } else {
    player.update(dt, input, cam.yaw, city.colliders);
  }

  // Shooting.
  if (!state.inCar && input.consumeClick()) {
    const aimX = player.x + Math.sin(cam.yaw) * 40;
    const aimZ = player.z + Math.cos(cam.yaw) * 40;
    const targets = [
      ...rivals.filter((r) => r.alive),
      ...wanted.cops.map((cop) => ({
        x: cop.x,
        z: cop.z,
        radius: 1,
        alive: true,
        damage: () => {
          cop.alive = false;
          scene.remove(cop.group);
          const index = wanted.cops.indexOf(cop);
          if (index >= 0) wanted.cops.splice(index, 1);
          wanted.addHeat(WANTED.kill, 'officer down');
          return true;
        },
      })),
    ];
    const result = player.shoot(aimX, aimZ, targets);
    audio.shot();
    wanted.addHeat(WANTED.shoot, 'shots fired');
    for (const ped of peds) {
      if (Math.hypot(ped.x - player.x, ped.z - player.z) < 25) ped.scare(player.x, player.z);
    }
    const endX = result && result.target ? result.target.x : player.x + Math.sin(cam.yaw) * 45;
    const endZ = result && result.target ? result.target.z : player.z + Math.cos(cam.yaw) * 45;
    showTracer(player.x, 1.3, player.z, endX, 1.2, endZ);
    if (result && result.killed) {
      if (rivals.includes(result.target)) {
        missions.registerKill();
        state.cash += 25;
        hud.toast('Rival down — +$25.');
      } else {
        hud.toast('Cop down — the heat just went up.');
      }
    }
  }

  // Interact: enter/exit a car, talk to Dante.
  if (input.wasPressed('KeyE')) {
    if (state.inCar) exitCar();
    else {
      const car = nearestCar(4.5);
      if (car) enterCar(car);
    }
  }

  // Wanted + police.
  wanted.update(dt, px, pz, state.inCar, (amount, kind) => damagePlayer(amount, kind), () => bustPlayer());

  // Rivals shoot back.
  for (const rival of rivals) {
    rival.update(dt, player.x, player.z, (r, dist) => {
      audio.enemyShot();
      if (Math.random() < 0.45) damagePlayer(3 + Math.random() * 5, 'rival');
      showTracer(r.x, 1.3, r.z, player.x, 1.2, player.z);
    });
  }

  // Missions.
  missions.update(dt, {
    px,
    pz,
    stars: wanted.stars,
    interactPressed: input.wasPressed('KeyE'),
    stolenCar: state.stolenCar,
  });
  if (missions.done && !state.completeShown) {
    state.completeShown = true;
    setMode('complete');
  }

  // Taxi fares, once the story is rolling.
  if (missions.missionIndex >= 1 && !fare.active) {
    state.fareTimer -= dt;
    if (state.fareTimer <= 0) {
      state.fareTimer = 40;
      fare.start(px, pz);
      hud.toast('Taxi fare available — blue marker on the map.');
    }
  }
  if (fare.active) {
    const earned = fare.update(px, pz, state.inCar, (text) => hud.toast(text));
    if (earned) {
      state.cash += earned;
      audio.cash();
      saveGame();
    }
  }

  // Stashes.
  for (const stash of stashes) {
    const found = stash.update(dt, px, pz, (text) => hud.toast(text));
    if (found) {
      state.cash += found;
      audio.cash();
      saveGame();
    }
  }

  // HUD.
  hud.setCash(state.cash);
  hud.setHealth(player.hp, PLAYER.maxHealth);
  hud.setStars(wanted.stars);
  hud.setClock(state.day, state.hour, state.minute);
  hud.setSpeed(state.inCar && playerCar ? Math.abs(playerCar.speed) * 3.6 : 0, state.inCar);
  const mission = missions.currentMission();
  hud.setObjective(
    mission ? mission.title : 'SOLMARA — FREE ROAM',
    missions.stepText(),
    missions.timeLeft > 0 ? `TIME LEFT ${Math.ceil(missions.timeLeft)}s` : '',
  );
  let prompt = '';
  if (!state.inCar) {
    const car = nearestCar(4.5);
    if (car) prompt = car.isCoupe ? 'Press E to steal the coupe' : 'Press E to take the car';
    else if (missions.currentStep() && missions.currentStep().kind === 'talk') {
      const step = missions.currentStep();
      if (Math.hypot(player.x - step.x, player.z - step.z) < step.radius) prompt = 'Press E to talk to Dante';
    }
  } else {
    prompt = 'E to get out · Space to brake';
  }
  hud.setPrompt(prompt);
  hud.drawMinimap({
    roads: city.roads,
    playerX: px,
    playerZ: pz,
    heading: state.inCar && playerCar ? playerCar.heading : cam.yaw,
    traffic,
    police: wanted.copCars,
    marker: fare.active ? fare.markerPos() : missions.markerPos(),
    markerColor: fare.active ? '#35d0ff' : '#ffc93c',
  });

  // Audio follows the state.
  audio.engine(state.inCar, speedRatio);
  audio.siren(wanted.stars > 0);
  if (tracerTimer > 0) {
    tracerTimer -= dt;
    if (tracerTimer <= 0) tracer.material.opacity = 0;
  }

  // Autosave.
  state.saveTimer += dt;
  if (state.saveTimer > 10) {
    state.saveTimer = 0;
    saveGame();
  }

  input.endFrame();
}

// ---- menus ----------------------------------------------------------------

hud.onClick('hud-start-btn', () => {
  audio.ensure();
  setMode('playing');
  missions.startMission(0);
  hud.toast('Welcome to Solmara. Reach Dante at the Marina.');
});
hud.onClick('hud-continue-btn', () => {
  audio.ensure();
  if (saved) {
    player.x = saved.x;
    player.z = saved.z;
    player.sync();
  }
  setMode('playing');
  missions.startMission(saved ? saved.missionIndex : 0);
});
hud.onClick('hud-resume-btn', () => setMode('playing'));
hud.onClick('hud-quit-btn', () => setMode('title'));
hud.onClick('hud-busted-btn', () => setMode('playing'));
hud.onClick('hud-complete-btn', () => setMode('playing'));
input.onFirstGesture = () => audio.ensure();

const continueBtn = document.getElementById('hud-continue-btn');
if (continueBtn) {
  continueBtn.style.display = saved ? 'block' : 'none';
  const dayEl = document.getElementById('hud-continue-day');
  if (dayEl && saved) dayEl.textContent = String(saved.day);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') audio.setMuted(!audio.muted);
  if (event.code === 'KeyP' || event.code === 'Escape') {
    if (state.mode === 'playing') setMode('paused');
    else if (state.mode === 'paused') setMode('playing');
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- frame loop -----------------------------------------------------------

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.25) dt = 0.25;
  if (state.mode === 'playing') {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      step(STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}

// ---- boot -----------------------------------------------------------------

// The game object the screenshot stager drives.
const game = {
  THREE,
  scene,
  camera,
  renderer,
  city,
  traffic,
  peds,
  parked,
  player,
  wanted,
  missions,
  fare,
  stashes,
  rivals,
  hud,
  audio,
  input,
  state,
  cam,
  get playerCar() {
    return playerCar;
  },
  set playerCar(value) {
    playerCar = value;
  },
  step,
  updateCamera,
  enterCar,
  exitCar,
  spawnRivals,
  addParked,
  setMode,
};

window.__solmara = game;

hud.setCash(state.cash);
hud.setHealth(player.hp, PLAYER.maxHealth);
hud.setStars(0);
hud.setClock(state.day, state.hour, state.minute);
hud.setObjective('SOLMARA', 'Press START ENGINE to begin the story.', '');
updateCamera(0);
renderer.render(scene, camera);

if (shot) {
  // Screenshot mode: stage a deterministic scene, render it, then freeze.
  setMode('playing');
  runShot(game, shot);
} else {
  setMode('title');
  requestAnimationFrame(frame);
}
