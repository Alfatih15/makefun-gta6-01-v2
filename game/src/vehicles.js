// Cars: box-built meshes, traffic that follows the road grid, and the
// arcade driving model the player uses. No imported models, no textures.

import { CAR, CITY, PALETTE } from './config.js';
import { range, pick, clamp, angleDelta } from './random.js';
import { resolveCollisions } from './city.js';

const CAR_COLORS = [0xd83a2e, 0x2e6fd8, 0xe8c93a, 0xeeeeee, 0x222222, 0x3fae6a, 0xd87a2e, 0x8a4fd8];

export function makeCarMesh(THREE, color, kind) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: PALETTE.glass });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(CAR.width, 0.75, CAR.length), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(CAR.width - 0.3, 0.65, CAR.length * 0.45), glassMat);
  cabin.position.set(0, 1.3, -0.2);
  group.add(cabin);
  const lightMat = new THREE.MeshLambertMaterial({
    color: kind === 'cop' ? 0xffffff : 0xffe9a8,
    emissive: kind === 'cop' ? 0x888888 : 0x554400,
  });
  [-0.8, 0.8].forEach((x) => {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    head.position.set(x, 0.7, CAR.length / 2);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x550000 }));
    tail.position.set(x, 0.7, -CAR.length / 2);
    group.add(tail);
  });
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    group.add(wheel);
    wheels.push(wheel);
  });
  let lightbar = null;
  if (kind === 'cop') {
    lightbar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshLambertMaterial({ color: PALETTE.copLightRed, emissive: 0xaa0000 }));
    red.position.x = -0.35;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshLambertMaterial({ color: PALETTE.copLightBlue, emissive: 0x0022aa }));
    blue.position.x = 0.35;
    lightbar.add(red);
    lightbar.add(blue);
    lightbar.position.y = 1.75;
    group.add(lightbar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(CAR.width + 0.02, 0.2, CAR.length + 0.02), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    stripe.position.y = 0.75;
    group.add(stripe);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    sign.position.y = 1.75;
    group.add(sign);
  }
  return { group, wheels, lightbar };
}

// One traffic car: drives along a road, turns at intersections, stops for
// nothing — it is a city, not a driving exam.
export class TrafficCar {
  constructor(THREE, scene, rng, roads) {
    this.THREE = THREE;
    this.roads = roads;
    const horizontal = rng() < 0.5;
    const road = pick(rng, roads);
    const along = range(rng, -220, 220);
    this.x = horizontal ? along : road + (rng() < 0.5 ? 3.5 : -3.5);
    this.z = horizontal ? road + (rng() < 0.5 ? 3.5 : -3.5) : along;
    this.horizontal = horizontal;
    this.dir = rng() < 0.5 ? 1 : -1;
    this.speed = range(rng, 7, 12);
    this.color = pick(rng, CAR_COLORS);
    const mesh = makeCarMesh(THREE, this.color, rng() < 0.12 ? 'taxi' : 'car');
    this.mesh = mesh;
    this.mesh.group.position.set(this.x, 0, this.z);
    scene.add(this.mesh.group);
    this.syncHeading();
  }

  syncHeading() {
    this.mesh.group.rotation.y = this.horizontal
      ? (this.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (this.dir > 0 ? 0 : Math.PI);
  }

  update(dt) {
    const step = this.speed * dt * this.dir;
    if (this.horizontal) this.x += step;
    else this.z += step;
    const bound = CITY.bound + 10;
    if (this.x > bound || this.x < -bound || this.z > bound || this.z < -bound) {
      this.dir *= -1;
      this.syncHeading();
    }
    // At an intersection, sometimes turn onto the crossing road.
    const nearRoad = this.roads.some((r) => Math.abs((this.horizontal ? this.z : this.x) - r) < 1.2);
    const crossing = this.roads.some((r) => Math.abs((this.horizontal ? this.x : this.z) - r) < 1.0);
    if (nearRoad && crossing && Math.random() < 0.002) {
      this.horizontal = !this.horizontal;
      if (this.horizontal) this.z = this.roads.reduce((a, b) => (Math.abs(b - this.z) < Math.abs(a - this.z) ? b : a)) + (Math.random() < 0.5 ? 3.5 : -3.5);
      else this.x = this.roads.reduce((a, b) => (Math.abs(b - this.x) < Math.abs(a - this.x) ? b : a)) + (Math.random() < 0.5 ? 3.5 : -3.5);
      this.dir = Math.random() < 0.5 ? 1 : -1;
      this.syncHeading();
    }
    this.mesh.group.position.set(this.x, 0, this.z);
    this.mesh.wheels.forEach((w) => { w.rotation.x += this.speed * dt * 0.8; });
  }
}

// The car the player drives: arcade physics, building and car collisions.
export class PlayerCar {
  constructor(THREE, scene, color, x, z, heading) {
    this.THREE = THREE;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.color = color;
    const mesh = makeCarMesh(THREE, color, 'car');
    this.mesh = mesh;
    this.group = mesh.group;
    scene.add(this.group);
    this.sync();
  }

  sync() {
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
  }

  update(dt, input, colliders, others) {
    const move = input.moveVector();
    const forward = -move.z;
    if (forward > 0) this.speed += CAR.accel * dt;
    else if (forward < 0) {
      if (this.speed > 0.5) this.speed -= CAR.brake * dt;
      else this.speed -= CAR.accel * 0.7 * dt;
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    }
    if (input.down('Space')) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 26 * dt);
    this.speed = clamp(this.speed, -CAR.maxReverse, CAR.maxSpeed);
    const steer = move.x * CAR.steer * clamp(Math.abs(this.speed) / 10, 0, 1);
    this.heading += steer * dt * Math.sign(this.speed || 1) * (this.speed >= 0 ? 1 : -1) * 0.9;
    // Forward is -Z rotated by heading: x = sin(heading), z = cos(heading) with a sign.
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    this.x += fx * this.speed * dt;
    this.z += fz * this.speed * dt;
    this.x = clamp(this.x, -CITY.bound - 20, CITY.beachX + 30);
    this.z = clamp(this.z, -CITY.bound - 20, CITY.bound + 20);
    const push = resolveCollisions(this.x, this.z, CAR.radius, colliders);
    if (push.hit) {
      this.x += push.ox;
      this.z += push.oz;
      this.speed *= 0.4;
    }
    for (const other of others) {
      if (!other || other === this) continue;
      const dx = this.x - other.x;
      const dz = this.z - other.z;
      const d = Math.hypot(dx, dz);
      const min = CAR.radius + (other.radius || 2.2);
      if (d > 0.01 && d < min) {
        const pushBack = (min - d) / d;
        this.x += dx * pushBack * 0.5;
        this.z += dz * pushBack * 0.5;
        this.speed *= 0.6;
      }
    }
    this.sync();
    this.mesh.wheels.forEach((w) => { w.rotation.x += this.speed * dt * 0.9; });
    return Math.abs(this.speed) / CAR.maxSpeed;
  }
}

// A police interceptor: faster than traffic, steers toward the player and
// rams. Its light bar flashes.
export class PoliceCar {
  constructor(THREE, scene, x, z) {
    this.THREE = THREE;
    this.x = x;
    this.z = z;
    this.heading = 0;
    this.speed = 0;
    this.radius = 2.4;
    const mesh = makeCarMesh(THREE, PALETTE.copCar, 'cop');
    this.mesh = mesh;
    this.group = mesh.group;
    scene.add(this.group);
    this.flash = 0;
    this.sync();
  }

  sync() {
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
  }

  update(dt, targetX, targetZ, colliders) {
    const dx = targetX - this.x;
    const dz = targetZ - this.z;
    const dist = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(dx, dz);
    this.heading += clamp(angleDelta(this.heading, want), -2.4 * dt, 2.4 * dt);
    this.speed = Math.min(this.speed + 18 * dt, dist > 60 ? 46 : 38);
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    this.x += fx * this.speed * dt;
    this.z += fz * this.speed * dt;
    const push = resolveCollisions(this.x, this.z, CAR.radius, colliders);
    if (push.hit) {
      this.x += push.ox;
      this.z += push.oz;
      this.speed *= 0.5;
    }
    this.sync();
    this.flash += dt * 8;
    if (this.mesh.lightbar) {
      this.mesh.lightbar.children.forEach((light, i) => {
        const on = Math.floor(this.flash + i) % 2 === 0;
        light.material.emissive.setHex(on ? 0xffffff : 0x220000);
      });
    }
    return dist;
  }

  remove(scene) {
    scene.remove(this.group);
  }
}
