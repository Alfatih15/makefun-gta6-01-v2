// The wanted system: heat from crimes, stars on the HUD, police cars
// that chase and foot cops that shoot. Losing the cops is a real mechanic:
// break line of sight, stay quiet, and the heat cools.

import { WANTED, starsForHeat, COP_CAR_MAX } from './config.js';
import { PoliceCar } from './vehicles.js';
import { makePersonMesh } from './pedestrians.js';
import { clamp } from './random.js';

export class WantedSystem {
  constructor(THREE, scene, colliders) {
    this.THREE = THREE;
    this.scene = scene;
    this.colliders = colliders;
    this.heat = 0;
    this.stars = 0;
    this.quietTimer = 0;
    this.copCars = [];
    this.cops = [];
    this.spawnTimer = 0;
    this.onCrime = null;
  }

  addHeat(amount, reason) {
    this.heat = clamp(this.heat + amount, 0, 100);
    this.quietTimer = 0;
    const stars = starsForHeat(this.heat);
    if (stars > this.stars && this.onCrime) this.onCrime(stars, reason);
    this.stars = stars;
  }

  clear() {
    this.heat = 0;
    this.stars = 0;
    this.despawnAll();
  }

  despawnAll() {
    this.copCars.forEach((car) => car.remove(this.scene));
    this.copCars = [];
    this.cops.forEach((cop) => this.scene.remove(cop.group));
    this.cops = [];
  }

  nearestCopDistance(px, pz) {
    let best = Infinity;
    for (const car of this.copCars) best = Math.min(best, Math.hypot(car.x - px, car.z - pz));
    for (const cop of this.cops) best = Math.min(best, Math.hypot(cop.x - px, cop.z - pz));
    return best;
  }

  update(dt, px, pz, inCar, onPlayerShot, onBusted) {
    this.quietTimer += dt;
    if (this.stars > 0 && this.quietTimer > WANTED.calmSeconds) {
      const nearest = this.nearestCopDistance(px, pz);
      if (nearest > 55) this.heat = Math.max(0, this.heat - WANTED.decayPerSecond * dt);
    }
    const stars = starsForHeat(this.heat);
    if (stars !== this.stars) {
      this.stars = stars;
      if (stars === 0) this.despawnAll();
    }
    if (this.stars === 0) return;

    // Keep the right number of interceptors on the street.
    this.spawnTimer -= dt;
    const wantCars = Math.min(this.stars, COP_CAR_MAX);
    if (this.copCars.length < wantCars && this.spawnTimer <= 0) {
      this.spawnTimer = 2;
      const angle = Math.random() * Math.PI * 2;
      const x = clamp(px + Math.sin(angle) * 70, -250, 250);
      const z = clamp(pz + Math.cos(angle) * 70, -250, 250);
      const car = new PoliceCar(this.THREE, this.scene, x, z);
      this.copCars.push(car);
    }
    if (!inCar && this.cops.length < Math.min(this.stars, 3) && this.spawnTimer <= 0) {
      this.spawnTimer = 2;
      const angle = Math.random() * Math.PI * 2;
      const cop = makeCop(this.THREE, this.scene, px + Math.sin(angle) * 30, pz + Math.cos(angle) * 30);
      this.cops.push(cop);
    }

    for (const car of this.copCars) {
      const dist = car.update(dt, px, pz, this.colliders);
      if (dist < 4.5 && inCar) {
        // A ram: shove the player's car and slow it.
        onPlayerShot(0, 'ram');
      }
    }
    for (const cop of this.cops) {
      const dx = px - cop.x;
      const dz = pz - cop.z;
      const dist = Math.hypot(dx, dz);
      cop.heading = Math.atan2(dx, dz);
      if (dist > 6) {
        cop.x += Math.sin(cop.heading) * 5.5 * dt;
        cop.z += Math.cos(cop.heading) * 5.5 * dt;
      }
      cop.shootTimer -= dt;
      if (cop.shootTimer <= 0 && dist < 38) {
        cop.shootTimer = 1.6 + Math.random();
        onPlayerShot(4 + Math.random() * 5, 'cop');
      }
      if (dist < 2.2) onBusted();
      cop.group.position.set(cop.x, 0, cop.z);
      cop.group.rotation.y = cop.heading;
    }
  }
}

function makeCop(THREE, scene, x, z) {
  const mesh = makePersonMesh(THREE, 0x1c2f4a, 0x1c2f4a);
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: 0x101820 }),
  );
  hat.position.y = 1.95;
  mesh.group.add(hat);
  mesh.group.position.set(x, 0, z);
  scene.add(mesh.group);
  return { group: mesh.group, x, z, heading: 0, shootTimer: 1 + Math.random() };
}
