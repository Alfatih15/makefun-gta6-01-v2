// Deterministic screenshot scenes: ?shot=start|chase|street|night with
// &seed=N. Each stages the world, advances the fixed-step simulation a
// set number of steps, renders twice, then sets window.__shotReady and
// freezes — no timeouts, so headless captures are reproducible.

import { STEP } from './config.js';
import { PoliceCar } from './vehicles.js';

function settle(game, steps) {
  for (let i = 0; i < steps; i += 1) game.step(STEP);
}

function paintTwiceThenReady(game) {
  // Banners and toasts are mid-fade by capture time; hide them so the
  // frame shows the game, not a half-transparent title card.
  game.hud.bannerEl.classList.remove('show');
  game.hud.toastEl.classList.remove('show');
  let painted = 0;
  function paint() {
    requestAnimationFrame(paint);
    game.updateCamera(STEP);
    game.renderer.render(game.scene, game.camera);
    painted += 1;
    if (painted === 2) window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

// Hold W for the sim: the headless browser presses no keys, so the stager
// drives instead.
function holdForward(game) {
  const original = game.input.moveVector.bind(game.input);
  game.input.moveVector = () => ({ x: 0, z: -1, active: true });
  return () => { game.input.moveVector = original; };
}

function stagePolice(game, px, pz, heading, count, heatToAdd) {
  game.wanted.addHeat(heatToAdd, 'staged chase');
  const bx = -Math.sin(heading);
  const bz = -Math.cos(heading);
  const sx = Math.cos(heading);
  const sz = -Math.sin(heading);
  const spots = [
    [bx * -2 + sx * 8, bz * -2 + sz * 8],
    [bx * -2 - sx * 8, bz * -2 - sz * 8],
    [-bx * 25, -bz * 25],
  ];
  for (let i = 0; i < count; i += 1) {
    const car = new PoliceCar(game.THREE, game.scene, px + spots[i][0], pz + spots[i][1]);
    game.wanted.copCars.push(car);
  }
}

function enterParked(game, predicate) {
  const entry = game.parked.find(predicate);
  if (!entry) return null;
  game.enterCar(entry);
  return entry;
}

export function runShot(game, name) {
  window.__shotReady = false;
  const hideContinue = document.getElementById('hud-continue-btn');
  if (hideContinue) hideContinue.style.display = 'none';

  if (name === 'start') {
    // Title over the city: high camera looking down the beach boulevard.
    game.state.clockMinutes = 16 * 60 + 40;
    game.player.x = 0;
    game.player.z = 40;
    game.player.sync();
    game.cam.yaw = 0.93;
    game.cam.pitch = 0.55;
    game.cam.dist = 70;
    game.cam.height = 34;
    settle(game, 10);
    game.setMode('title');
    game.updateCamera(STEP);
    game.renderer.render(game.scene, game.camera);
    paintTwiceThenReady(game);
    return;
  }

  if (name === 'chase') {
    // Driving the stolen coupe down Palm Row with two interceptors behind,
    // wanted level 3, mission objective and minimap on the HUD.
    game.missions.startMission(1);
    game.state.clockMinutes = 10 * 60;
    enterParked(game, (c) => c.isCoupe);
    game.state.stolenCar = true;
    settle(game, 6);
    game.missions.update(STEP, {
      px: game.playerCar.x,
      pz: game.playerCar.z,
      stars: game.wanted.stars,
      interactPressed: false,
      stolenCar: true,
    });
    stagePolice(game, game.playerCar.x, game.playerCar.z, game.playerCar.heading, 3, 25);
    game.cam.dist = 12;
    game.cam.height = 4;
    game.cam.pitch = 0.18;
    const restore = holdForward(game);
    settle(game, 25);
    restore();
    game.updateCamera(STEP);
    game.renderer.render(game.scene, game.camera);
    paintTwiceThenReady(game);
    return;
  }

  if (name === 'street') {
    // On foot in the plaza: Salt Kings crew, a tracer mid-flight, peds
    // scattering, wanted stars on the HUD.
    game.missions.startMission(4);
    game.state.clockMinutes = 13 * 60 + 20;
    game.player.x = -20;
    game.player.z = 20;
    game.player.sync();
    game.cam.yaw = Math.atan2(-20, -32);
    game.cam.pitch = 0.28;
    game.cam.dist = 9;
    game.cam.height = 3.2;
    settle(game, 5);
    const rivals = game.rivals;
    if (rivals[0]) {
      rivals[0].damage();
      rivals[0].damage();
      rivals[0].damage();
      game.missions.registerKill();
    }
    if (rivals[1]) {
      game.wanted.addHeat(25, 'shots fired');
      const from = game.player;
      const t = rivals[1];
      // A tracer from Mara's pistol to the second rival, drawn by hand.
      game.state.shake = 0;
      const tracer = game.scene.children.find((c) => c.type === 'Line');
      if (tracer) {
        const pos = tracer.geometry.attributes.position;
        pos.setXYZ(0, from.x, 1.3, from.z);
        pos.setXYZ(1, t.x, 1.2, t.z);
        pos.needsUpdate = true;
        tracer.material.opacity = 0.9;
      }
    }
    for (const ped of game.peds) {
      if (Math.hypot(ped.x - game.player.x, ped.z - game.player.z) < 30) ped.scare(game.player.x, game.player.z);
    }
    settle(game, 12);
    game.updateCamera(STEP);
    game.renderer.render(game.scene, game.camera);
    paintTwiceThenReady(game);
    return;
  }

  // night: a dusk-to-night drive along the beach road, PD in pursuit.
  game.missions.startMission(2);
  game.state.clockMinutes = 21 * 60 + 30;
  enterParked(game, (c) => c.kind === 'taxi');
  settle(game, 4);
  game.missions.update(STEP, {
    px: game.playerCar ? game.playerCar.x : game.player.x,
    pz: game.playerCar ? game.playerCar.z : game.player.z,
    stars: game.wanted.stars,
    interactPressed: false,
    stolenCar: false,
  });
  if (game.playerCar) stagePolice(game, game.playerCar.x, game.playerCar.z, game.playerCar.heading, 3, 25);
  game.cam.dist = 12;
  game.cam.height = 4;
  game.cam.pitch = 0.18;
  const restore = holdForward(game);
  settle(game, 25);
  restore();
  game.updateCamera(STEP);
  game.renderer.render(game.scene, game.camera);
  paintTwiceThenReady(game);
}
