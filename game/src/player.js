// Mara Voss on foot: third-person movement relative to the camera, a
// pistol with a hitscan shot, and getting in and out of cars.

import { PLAYER, PALETTE } from './config.js';
import { clamp } from './random.js';
import { makePersonMesh } from './pedestrians.js';
import { resolveCollisions } from './city.js';

export class Player {
  constructor(THREE, scene, x, z) {
    this.THREE = THREE;
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.heading = 0;
    this.hp = PLAYER.maxHealth;
    this.ammo = Infinity;
    this.walkPhase = 0;
    this.moving = false;
    const mesh = makePersonMesh(THREE, PALETTE.playerJacket, PALETTE.playerPants);
    this.mesh = mesh;
    this.group = mesh.group;
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.55),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    gun.position.set(0.36, 1.2, 0.3);
    this.group.add(gun);
    this.gun = gun;
    scene.add(this.group);
    this.sync();
  }

  sync() {
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
  }

  reset(x, z) {
    this.x = x;
    this.z = z;
    this.hp = PLAYER.maxHealth;
    this.heading = 0;
    this.sync();
  }

  // Move relative to the camera yaw; returns true when moving.
  update(dt, input, cameraYaw, colliders) {
    const move = input.moveVector();
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    this.moving = move.active;
    if (move.active) {
      const sin = Math.sin(cameraYaw);
      const cos = Math.cos(cameraYaw);
      // Camera looks along -Z rotated by yaw; forward on the ground is
      // (sin yaw, cos yaw) in (x, z) when the camera sits behind.
      const fx = Math.sin(cameraYaw);
      const fz = Math.cos(cameraYaw);
      const rx = Math.cos(cameraYaw);
      const rz = -Math.sin(cameraYaw);
      const dx = fx * -move.z + rx * move.x;
      const dz = fz * -move.z + rz * move.x;
      const len = Math.hypot(dx, dz) || 1;
      this.x += (dx / len) * speed * dt;
      this.z += (dz / len) * speed * dt;
      this.heading = Math.atan2(dx, dz);
      this.walkPhase += dt * (running ? 13 : 9);
    }
    const push = resolveCollisions(this.x, this.z, PLAYER.radius, colliders);
    if (push.hit) {
      this.x += push.ox;
      this.z += push.oz;
    }
    this.x = clamp(this.x, -260, 290);
    this.z = clamp(this.z, -260, 260);
    const swing = this.moving ? Math.sin(this.walkPhase) * 0.55 : 0;
    this.mesh.armL.rotation.x = swing;
    this.mesh.armR.rotation.x = -swing;
    this.sync();
    return this.moving;
  }

  // Hitscan pistol shot along the camera's aim. Targets are {x, z, radius,
  // damage()} — rivals and cops. Returns the target hit, or null.
  shoot(aimX, aimZ, targets) {
    const dx = aimX - this.x;
    const dz = aimZ - this.z;
    const aimDist = Math.hypot(dx, dz);
    if (aimDist < 0.01) return null;
    const aimAngle = Math.atan2(dx, dz);
    let best = null;
    let bestDist = Infinity;
    for (const target of targets) {
      if (!target.alive) continue;
      const tx = target.x - this.x;
      const tz = target.z - this.z;
      const dist = Math.hypot(tx, tz);
      if (dist > 55 || dist > bestDist) continue;
      let diff = Math.atan2(tx, tz) - aimAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.12 + (target.radius || 1) / dist) {
        best = target;
        bestDist = dist;
      }
    }
    if (best) {
      const killed = best.damage();
      return { target: best, killed, dist: bestDist };
    }
    return { target: null, killed: false, dist: Math.min(aimDist, 55) };
  }
}
