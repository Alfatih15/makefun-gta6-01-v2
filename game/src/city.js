// Solmara itself: a sun-soaked coastal city built from boxes, canvas
// window textures and a few props. One seeded layout, so the city is the
// same for every player and every screenshot.

import { CITY, PALETTE } from './config.js';
import { range, pick } from './random.js';

function roadCoord(index) {
  return -CITY.bound + 18 + index * CITY.pitch;
}

function windowTexture(THREE, rng, base, lit) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 128);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const on = rng() < (lit ? 0.55 : 0.28);
      ctx.fillStyle = on ? '#ffd98a' : '#23384a';
      ctx.fillRect(6 + col * 14, 8 + row * 15, 9, 10);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(THREE, scene, rng) {
  const colliders = [];
  const streetLights = [];
  const palms = [];

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sunDay, 2.2);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(sun.target);
  scene.background = new THREE.Color(PALETTE.skyDay);
  scene.fog = new THREE.Fog(PALETTE.fogDay, 260, 700);

  // Ground: one big slab, then road strips, sidewalks and the beach.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(60, -0.05, 0);
  scene.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const lineMat = new THREE.MeshLambertMaterial({ color: PALETTE.roadLine });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const roads = [];
  for (let i = 0; i <= CITY.blocks; i += 1) roads.push(roadCoord(i));
  roads.forEach((c) => {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, 560), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, 0, 0);
    scene.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(560, CITY.roadWidth), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.01, c);
    scene.add(ew);
    // Dashed centre lines.
    for (let t = -260; t < 260; t += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 5), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(c, 0.02, t);
      scene.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.6), lineMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(t, 0.02, c);
      scene.add(dash2);
    }
    // Sidewalks flanking each road.
    [-1, 1].forEach((side) => {
      const walkNS = new THREE.Mesh(new THREE.PlaneGeometry(4, 560), walkMat);
      walkNS.rotation.x = -Math.PI / 2;
      walkNS.position.set(c + side * (CITY.roadWidth / 2 + 2), 0.015, 0);
      scene.add(walkNS);
      const walkEW = new THREE.Mesh(new THREE.PlaneGeometry(560, 4), walkMat);
      walkEW.rotation.x = -Math.PI / 2;
      walkEW.position.set(0, 0.015, c + side * (CITY.roadWidth / 2 + 2));
      scene.add(walkEW);
    });
  });

  // The beach and the sea, east of the city.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 620),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(CITY.beachX + 20, 0.02, 0);
  scene.add(sand);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 900),
    new THREE.MeshLambertMaterial({ color: PALETTE.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(CITY.waterX + 200, -0.4, 0);
  scene.add(water);

  // The pier, running out to sea from the north-east corner.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(70, 0.8, 8), pierMat);
  pier.position.set(CITY.beachX + 45, 0.6, -186);
  scene.add(pier);
  for (let i = 0; i < 8; i += 1) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.4, 6), pierMat);
    post.position.set(CITY.beachX + 12 + i * 9, -0.4, -186 + (i % 2 === 0 ? 3.4 : -3.4));
    scene.add(post);
  }

  // Buildings, one or two per block, with lit-window canvas textures.
  const textures = PALETTE.building.map((c) => {
    const hex = `#${c.toString(16).padStart(6, '0')}`;
    return windowTexture(THREE, rng, hex, false);
  });
  const litTextures = PALETTE.building.map((c) => {
    const hex = `#${c.toString(16).padStart(6, '0')}`;
    return windowTexture(THREE, rng, hex, true);
  });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4640 });
  for (let bi = 0; bi < CITY.blocks; bi += 1) {
    for (let bj = 0; bj < CITY.blocks; bj += 1) {
      const cx = -186 + bi * CITY.pitch;
      const cz = -186 + bj * CITY.pitch;
      // The central block is the plaza; the south-east blocks are a park.
      if (bi === 3 && bj === 3) continue;
      if (bi >= 5 && bj >= 5) continue;
      const count = rng() < 0.45 ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = range(rng, 16, 26);
        const d = range(rng, 16, 26);
        const h = range(rng, 9, 42);
        const ox = count === 2 ? (k === 0 ? -11 : 11) : 0;
        const oz = count === 2 ? (k === 0 ? 10 : -10) : 0;
        const x = cx + ox;
        const z = cz + oz;
        const mat = new THREE.MeshLambertMaterial({ map: pick(rng, textures) });
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(x, h / 2, z);
        scene.add(building);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.6, d * 0.5), roofMat);
        roof.position.set(x, h + 0.8, z);
        scene.add(roof);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // The plaza: fountain, benches and palms at the city centre.
  const fountainMat = new THREE.MeshLambertMaterial({ color: 0x9fb8c8 });
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.2, 20), fountainMat);
  fountain.position.set(0, 0.6, 0);
  scene.add(fountain);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 0.4, 20),
    new THREE.MeshLambertMaterial({ color: PALETTE.water }),
  );
  fountainWater.position.set(0, 1.2, 0);
  scene.add(fountainWater);
  colliders.push({ minX: -8, maxX: 8, minZ: -8, maxZ: 8 });

  // The park: grass, palms and a pond, south-east.
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshLambertMaterial({ color: 0x4a7a3a }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(155, 0.03, 155);
  scene.add(grass);
  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 14, 0.5, 24),
    new THREE.MeshLambertMaterial({ color: PALETTE.water }),
  );
  pond.position.set(170, 0.25, 170);
  scene.add(pond);

  // Palm trees: along the beach, the plaza and the park.
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.trunk });
  const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palm });
  function palm(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = 0.08;
    group.add(trunk);
    for (let i = 0; i < 5; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 4), leafMat);
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      group.add(leaf);
    }
    group.position.set(x, 0, z);
    scene.add(group);
    palms.push(group);
    return group;
  }
  for (let z = -240; z <= 240; z += 40) palm(CITY.beachX + 8, z);
  for (let i = 0; i < 6; i += 1) palm(range(rng, -24, 24), range(rng, -24, 24) + (i % 2 === 0 ? 18 : -18));
  for (let i = 0; i < 8; i += 1) palm(range(rng, 110, 200), range(rng, 110, 200));

  // Street lights on every other intersection.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0x554400 });
  for (let i = 0; i <= CITY.blocks; i += 2) {
    for (let j = 0; j <= CITY.blocks; j += 2) {
      const x = roads[i] + 9;
      const z = roads[j] + 9;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), poleMat);
      pole.position.set(x, 3.5, z);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), lampMat);
      lamp.position.set(x, 7.2, z);
      scene.add(lamp);
      streetLights.push(lamp);
    }
  }

  // A big "SOLMARA" sign on the tallest tower, built from boxes — no font file.
  const signMat = new THREE.MeshLambertMaterial({ color: 0xff5a3c, emissive: 0x881100 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(18, 3, 0.8), signMat);
  sign.position.set(-93, 44, -93);
  scene.add(sign);

  function setTimeOfDay(mode) {
    if (mode === 'night') {
      scene.background.set(PALETTE.skyNight);
      scene.fog.color.set(0x11162e);
      sun.intensity = 0.25;
      sun.color.set(0x9ab8ff);
      sun.position.set(-80, 120, -40);
      hemi.intensity = 0.25;
      streetLights.forEach((lamp) => {
        lamp.material.emissive.set(0xffc93c);
      });
    } else if (mode === 'dusk') {
      scene.background.set(PALETTE.skyDusk);
      scene.fog.color.set(0x5a4a6a);
      sun.intensity = 1.1;
      sun.color.set(PALETTE.sunDusk);
      sun.position.set(-160, 60, 80);
      hemi.intensity = 0.5;
      streetLights.forEach((lamp) => {
        lamp.material.emissive.set(0xaa7722);
      });
    } else {
      scene.background.set(PALETTE.skyDay);
      scene.fog.color.set(PALETTE.fogDay);
      sun.intensity = 2.2;
      sun.color.set(PALETTE.sunDay);
      sun.position.set(120, 180, 60);
      hemi.intensity = 0.9;
      streetLights.forEach((lamp) => {
        lamp.material.emissive.set(0x554400);
      });
    }
  }

  return {
    colliders,
    roads,
    roadCoord,
    setTimeOfDay,
    textures,
    litTextures,
  };
}

// Push a circle (x, z, radius) out of every building AABB it overlaps.
// Returns true when a push happened.
export function resolveCollisions(x, z, radius, colliders) {
  let hit = false;
  for (const box of colliders) {
    const cx = Math.max(box.minX, Math.min(x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      hit = true;
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = (radius - dist) / dist;
        // Caller reads the corrected position back via the returned offset.
        return { hit: true, ox: dx * push, oz: dz * push };
      }
      return { hit: true, ox: radius, oz: 0 };
    }
  }
  return { hit, ox: 0, oz: 0 };
}
