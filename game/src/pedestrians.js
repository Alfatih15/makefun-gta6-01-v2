// Pedestrians: simple box people who stroll the sidewalks, cross at
// corners, and run from gunfire. They are the city's life, and the reason
// a wanted level exists.

import { CITY } from './config.js';
import { range, pick, clamp } from './random.js';

const SHIRTS = [0xe8e8e8, 0x3a6fd8, 0xd83a5e, 0x3fae6a, 0xe8a93a, 0x8a4fd8, 0x222222, 0xd87a2e];
const PANTS = [0x2b3440, 0x4a3a2b, 0x5a5a5a, 0x2e4a3a];

export function makePersonMesh(THREE, shirt, pants) {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9a986 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.3), pantsMat);
  legs.position.y = 0.4;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirtMat);
  torso.position.y = 1.15;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skinMat);
  head.position.y = 1.7;
  group.add(head);
  const armGeo = new THREE.BoxGeometry(0.13, 0.62, 0.13);
  const armL = new THREE.Mesh(armGeo, shirtMat);
  armL.position.set(-0.36, 1.15, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, shirtMat);
  armR.position.set(0.36, 1.15, 0);
  group.add(armR);
  return { group, armL, armR };
}

export class Pedestrian {
  constructor(THREE, scene, rng, roads) {
    this.THREE = THREE;
    this.roads = roads;
    this.rng = rng;
    const mesh = makePersonMesh(THREE, pick(rng, SHIRTS), pick(rng, PANTS));
    this.mesh = mesh;
    this.group = mesh.group;
    scene.add(this.group);
    this.x = range(rng, -200, 200);
    this.z = range(rng, -200, 200);
    this.heading = rng() * Math.PI * 2;
    this.speed = range(rng, 1.2, 2.0);
    this.target = this.pickTarget(rng);
    this.fleeing = 0;
    this.walkPhase = rng() * 10;
    this.sync();
  }

  pickTarget(rng) {
    const road = pick(rng, this.roads);
    const along = range(rng, -220, 220);
    if (rng() < 0.5) return { x: road + (rng() < 0.5 ? 9 : -9), z: along };
    return { x: along, z: road + (rng() < 0.5 ? 9 : -9) };
  }

  sync() {
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
  }

  scare(x, z) {
    this.fleeing = 3;
    const dx = this.x - x;
    const dz = this.z - z;
    this.heading = Math.atan2(dx, dz);
  }

  update(dt) {
    if (this.fleeing > 0) {
      this.fleeing -= dt;
      this.x += Math.sin(this.heading) * 4.5 * dt;
      this.z += Math.cos(this.heading) * 4.5 * dt;
    } else {
      const dx = this.target.x - this.x;
      const dz = this.target.z - this.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        this.target = this.pickTarget(this.rng);
      } else {
        const want = Math.atan2(dx, dz);
        let diff = want - this.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.heading += clamp(diff, -2.5 * dt, 2.5 * dt);
        this.x += Math.sin(this.heading) * this.speed * dt;
        this.z += Math.cos(this.heading) * this.speed * dt;
      }
    }
    this.x = clamp(this.x, -CITY.bound - 5, CITY.beachX + 25);
    this.z = clamp(this.z, -CITY.bound - 5, CITY.bound + 5);
    this.walkPhase += dt * (this.fleeing > 0 ? 14 : 8);
    const swing = Math.sin(this.walkPhase) * 0.5;
    this.mesh.armL.rotation.x = swing;
    this.mesh.armR.rotation.x = -swing;
    this.sync();
  }
}

// Rival crew members for the final mission: they stand their ground and
// shoot back.
export class Rival {
  constructor(THREE, scene, x, z) {
    this.THREE = THREE;
    this.x = x;
    this.z = z;
    this.hp = 3;
    this.alive = true;
    this.shootTimer = 1 + Math.random() * 1.5;
    const mesh = makePersonMesh(THREE, 0x8a1f2e, 0x1a1a1a);
    this.mesh = mesh;
    this.group = mesh.group;
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.55),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    gun.position.set(0.36, 1.2, 0.3);
    this.group.add(gun);
    scene.add(this.group);
    this.heading = 0;
    this.sync();
  }

  sync() {
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
  }

  update(dt, playerX, playerZ, onShoot) {
    if (!this.alive) return;
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    this.heading = Math.atan2(dx, dz);
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && dist < 45) {
      this.shootTimer = 1.4 + Math.random() * 1.2;
      onShoot(this, dist);
    }
    this.sync();
  }

  damage() {
    this.hp -= 1;
    if (this.hp <= 0) {
      this.alive = false;
      this.group.visible = false;
      return true;
    }
    return false;
  }
}
