// Missions and side work: a five-mission story chain plus taxi fares and
// hidden cash stashes for free roam. Each step is a small state machine
// the main loop ticks; the HUD reads the current step's text.

import { MISSIONS, PALETTE } from './config.js';

export class MissionRunner {
  constructor(THREE, scene, state) {
    this.THREE = THREE;
    this.scene = scene;
    this.state = state; // { cash, onEvent }
    this.missionIndex = 0;
    this.stepIndex = 0;
    this.done = false;
    this.timeLeft = 0;
    this.kills = 0;
    this.marker = null;
    this.beacon = null;
    this.beaconLight = null;
    this.talkTarget = null;
    this.stealTarget = null;
    this.onMissionStart = null;
    this.onMissionDone = null;
    this.onStep = null;
    this.onMessage = null;
    this.buildBeacon();
  }

  buildBeacon() {
    const geo = new this.THREE.CylinderGeometry(0.3, 1.6, 22, 12, 1, true);
    const mat = new this.THREE.MeshBasicMaterial({
      color: PALETTE.marker,
      transparent: true,
      opacity: 0.35,
      side: this.THREE.DoubleSide,
      depthWrite: false,
    });
    this.beacon = new this.THREE.Mesh(geo, mat);
    this.beacon.visible = false;
    this.scene.add(this.beacon);
    const ring = new this.THREE.Mesh(
      new this.THREE.TorusGeometry(3, 0.25, 8, 32),
      new this.THREE.MeshBasicMaterial({ color: PALETTE.marker }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -10.8;
    this.beacon.add(ring);
    this.marker = new this.THREE.Group();
  }

  currentMission() {
    return MISSIONS[this.missionIndex] || null;
  }

  currentStep() {
    const mission = this.currentMission();
    if (!mission) return null;
    return mission.steps[this.stepIndex] || null;
  }

  startMission(index) {
    this.missionIndex = index;
    this.stepIndex = 0;
    this.kills = 0;
    const mission = this.currentMission();
    if (!mission) {
      this.done = true;
      this.beacon.visible = false;
      return;
    }
    this.timeLeft = mission.timeLimit || 0;
    if (this.onMissionStart) this.onMissionStart(mission);
    if (this.onMessage) this.onMessage(`${mission.title} — ${mission.brief}`);
    this.updateBeacon();
  }

  updateBeacon() {
    const step = this.currentStep();
    if (!step || !step.x) {
      this.beacon.visible = false;
      return;
    }
    this.beacon.visible = true;
    this.beacon.position.set(step.x, 11, step.z);
  }

  stepText() {
    const mission = this.currentMission();
    if (!mission) return 'Free roam — take a taxi fare or find a stash.';
    const step = this.currentStep();
    if (!step) return mission.title;
    if (step.kind === 'clear') return step.text.replace('(0/4)', `(${this.kills}/${step.count})`);
    return step.text;
  }

  markerPos() {
    const step = this.currentStep();
    if (!step || step.x === undefined) return null;
    return { x: step.x, z: step.z };
  }

  // Returns 'advance' when the step completes this tick.
  update(dt, ctx) {
    const mission = this.currentMission();
    if (!mission) return;
    const step = this.currentStep();
    if (!step) {
      this.completeMission();
      return;
    }
    if (this.timeLeft > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        if (this.onMessage) this.onMessage('Too slow — the package run failed. Try again.');
        this.startMission(this.missionIndex);
        return;
      }
    }
    if (step.kind === 'goto' || step.kind === 'drive') {
      const d = Math.hypot(ctx.px - step.x, ctx.pz - step.z);
      if (d < step.radius) this.advance();
    } else if (step.kind === 'talk') {
      const d = Math.hypot(ctx.px - step.x, ctx.pz - step.z);
      if (d < step.radius && ctx.interactPressed) this.advance();
    } else if (step.kind === 'steal') {
      if (ctx.stolenCar) this.advance();
    } else if (step.kind === 'wanted') {
      if (ctx.stars === 0) this.advance();
    } else if (step.kind === 'clear') {
      if (this.kills >= step.count) this.advance();
    }
  }

  advance() {
    this.stepIndex += 1;
    const mission = this.currentMission();
    if (mission && this.stepIndex >= mission.steps.length) {
      this.completeMission();
      return;
    }
    if (this.onStep) this.onStep(this.currentStep());
    this.updateBeacon();
  }

  completeMission() {
    const mission = this.currentMission();
    if (!mission) return;
    this.state.cash += mission.reward;
    if (this.onMissionDone) this.onMissionDone(mission);
    if (this.onMessage) this.onMessage(`Mission complete: ${mission.title} — +$${mission.reward}`);
    this.missionIndex += 1;
    this.stepIndex = 0;
    this.kills = 0;
    if (this.missionIndex >= MISSIONS.length) {
      this.done = true;
      this.beacon.visible = false;
      if (this.onMessage) this.onMessage('Story complete. Solmara is yours — fares and stashes pay from here.');
      return;
    }
    const next = this.currentMission();
    this.timeLeft = next.timeLimit || 0;
    if (this.onMissionStart) this.onMissionStart(next);
    if (this.onMessage) this.onMessage(`${next.title} — ${next.brief}`);
    this.updateBeacon();
  }

  registerKill() {
    this.kills += 1;
  }
}

// A parked taxi fare: pick the passenger up, drive them to the flag.
export class TaxiFare {
  constructor(THREE, scene, rng, roads) {
    this.THREE = THREE;
    this.scene = scene;
    this.roads = roads;
    this.active = false;
    this.pickedUp = false;
    this.pickup = { x: 0, z: 0 };
    this.destination = { x: 0, z: 0 };
    this.fare = 0;
    this.beacon = null;
    this.person = null;
    this.rng = rng;
    const geo = new THREE.CylinderGeometry(0.3, 1.4, 20, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x35d0ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.beacon = new THREE.Mesh(geo, mat);
    this.beacon.visible = false;
    scene.add(this.beacon);
  }

  randomRoadPoint() {
    const road = this.roads[Math.floor(this.rng() * this.roads.length)];
    const along = (this.rng() * 2 - 1) * 200;
    if (this.rng() < 0.5) return { x: road + 9, z: along };
    return { x: along, z: road + 9 };
  }

  start(px, pz) {
    this.pickup = this.randomRoadPoint();
    let guard = 0;
    while (Math.hypot(this.pickup.x - px, this.pickup.z - pz) < 40 && guard < 20) {
      this.pickup = this.randomRoadPoint();
      guard += 1;
    }
    this.destination = this.randomRoadPoint();
    this.fare = 60 + Math.floor(this.rng() * 90);
    this.active = true;
    this.pickedUp = false;
    this.beacon.visible = true;
    this.beacon.position.set(this.pickup.x, 10, this.pickup.z);
  }

  update(px, pz, inCar, onEvent) {
    if (!this.active) return;
    if (!this.pickedUp) {
      if (Math.hypot(px - this.pickup.x, pz - this.pickup.z) < 6) {
        if (inCar) {
          this.pickedUp = true;
          this.beacon.position.set(this.destination.x, 10, this.destination.z);
          onEvent(`Passenger aboard — take them to the flag ($${this.fare}).`);
        } else {
          onEvent('You need a car for the fare. Get in a car first.');
          this.pickup = this.randomRoadPoint();
        }
      }
    } else if (Math.hypot(px - this.destination.x, pz - this.destination.z) < 7) {
      this.active = false;
      this.beacon.visible = false;
      onEvent(`Fare complete — +$${this.fare}.`);
      return this.fare;
    }
    return 0;
  }

  markerPos() {
    if (!this.active) return null;
    return this.pickedUp ? this.destination : this.pickup;
  }

  markerColor() {
    return 0x35d0ff;
  }
}

// Glowing cash stashes hidden around the city, worth $100 each.
export class Stash {
  constructor(THREE, scene, x, z) {
    this.THREE = THREE;
    this.x = x;
    this.z = z;
    this.taken = false;
    this.group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.8, 1.1),
      new THREE.MeshLambertMaterial({ color: 0x8a6a2a, emissive: 0x554400 }),
    );
    box.position.y = 0.4;
    this.group.add(box);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.35 }),
    );
    glow.position.y = 0.9;
    this.group.add(glow);
    this.glow = glow;
    this.group.position.set(x, 0, z);
    scene.add(this.group);
  }

  update(dt, px, pz, onEvent) {
    if (this.taken) return 0;
    this.glow.scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.15);
    if (Math.hypot(px - this.x, pz - this.z) < 2.2) {
      this.taken = true;
      this.group.visible = false;
      onEvent('Stash found — +$100.');
      return 100;
    }
    return 0;
  }
}
