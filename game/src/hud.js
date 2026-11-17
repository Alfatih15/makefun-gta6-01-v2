// The HUD: health, cash, wanted stars, a live minimap, the mission
// objective, and every menu (start, pause, busted, story complete).
// All DOM, drawn over the 3D canvas.

import { CITY, STORY } from './config.js';

export class Hud {
  constructor(document) {
    this.document = document;
    this.root = document.getElementById('hud');
    this.buildDom();
    this.toastTimer = null;
    this.bannerTimer = null;
  }

  buildDom() {
    const d = this.document;
    this.root.innerHTML = `
      <div id="hud-top-left">
        <div id="hud-cash">$150</div>
        <div id="hud-health"><div id="hud-health-fill"></div><span id="hud-health-text">100</span></div>
        <div id="hud-ammo"></div>
      </div>
      <div id="hud-top-right"><div id="hud-stars"></div><div id="hud-clock">DAY 1 · 09:00</div></div>
      <div id="hud-objective"><div id="hud-mission-title"></div><div id="hud-mission-text"></div><div id="hud-mission-sub"></div></div>
      <div id="hud-toast"></div>
      <div id="hud-banner"></div>
      <div id="hud-speed"><span id="hud-speed-num">0</span><span id="hud-speed-unit">km/h</span></div>
      <div id="hud-prompt"></div>
      <div id="hud-crosshair">+</div>
      <canvas id="hud-minimap" width="190" height="190"></canvas>
      <div id="hud-start" class="hud-menu">
        <div class="hud-menu-inner">
          <div class="hud-kicker">SOLMARA · AN OPEN-WORLD CRIME STORY</div>
          <h1>SOLMARA</h1>
          <p class="hud-story">${STORY.intro}</p>
          <p class="hud-controls">WASD move / drive · Mouse drag to look · Click shoot · E enter car / talk<br>
          Shift run · Space brake · M mute · P pause · Progress saves automatically</p>
          <button id="hud-start-btn">START ENGINE</button>
          <button id="hud-continue-btn" class="hud-secondary">CONTINUE — DAY <span id="hud-continue-day">1</span></button>
          <div class="hud-foot">An original game. No real city, no borrowed names.</div>
        </div>
      </div>
      <div id="hud-pause" class="hud-menu hud-hidden">
        <div class="hud-menu-inner">
          <h2>PAUSED</h2>
          <p class="hud-controls">P or Esc to resume · M mute</p>
          <button id="hud-resume-btn">RESUME</button>
          <button id="hud-quit-btn" class="hud-secondary">QUIT TO TITLE</button>
        </div>
      </div>
      <div id="hud-busted" class="hud-menu hud-hidden">
        <div class="hud-menu-inner">
          <h2>BUSTED</h2>
          <p class="hud-story">The Solmara PD hauled you in. Bail cost you $200 — the street never sleeps.</p>
          <button id="hud-busted-btn">BACK ON THE STREET</button>
        </div>
      </div>
      <div id="hud-complete" class="hud-menu hud-hidden">
        <div class="hud-menu-inner">
          <h2>SOLMARA IS YOURS</h2>
          <p class="hud-story">Every mission done. Dante's crew runs the Marina now — and the city is open for fares, stashes and joyrides.</p>
          <button id="hud-complete-btn">KEEP PLAYING</button>
        </div>
      </div>`;
    this.cashEl = d.getElementById('hud-cash');
    this.healthFill = d.getElementById('hud-health-fill');
    this.healthText = d.getElementById('hud-health-text');
    this.ammoEl = d.getElementById('hud-ammo');
    this.starsEl = d.getElementById('hud-stars');
    this.clockEl = d.getElementById('hud-clock');
    this.titleEl = d.getElementById('hud-mission-title');
    this.textEl = d.getElementById('hud-mission-text');
    this.subEl = d.getElementById('hud-mission-sub');
    this.toastEl = d.getElementById('hud-toast');
    this.bannerEl = d.getElementById('hud-banner');
    this.speedEl = d.getElementById('hud-speed');
    this.speedNum = d.getElementById('hud-speed-num');
    this.promptEl = d.getElementById('hud-prompt');
    this.crosshairEl = d.getElementById('hud-crosshair');
    this.minimap = d.getElementById('hud-minimap');
    this.minimapCtx = this.minimap.getContext('2d');
    this.menus = {
      start: d.getElementById('hud-start'),
      pause: d.getElementById('hud-pause'),
      busted: d.getElementById('hud-busted'),
      complete: d.getElementById('hud-complete'),
    };
  }

  showMenu(name) {
    Object.entries(this.menus).forEach(([key, el]) => {
      el.classList.toggle('hud-hidden', key !== name);
    });
    if (!name) Object.values(this.menus).forEach((el) => el.classList.add('hud-hidden'));
    this.root.classList.toggle('hud-in-menu', Boolean(name));
  }

  onClick(id, fn) {
    const el = this.document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  setCash(cash) {
    this.cashEl.textContent = `$${cash}`;
  }

  setHealth(hp, max) {
    const pct = Math.max(0, Math.round((hp / max) * 100));
    this.healthFill.style.width = `${pct}%`;
    this.healthFill.style.background = pct > 50 ? '#3fae6a' : pct > 25 ? '#e8a93a' : '#d83a2e';
    this.healthText.textContent = String(Math.max(0, Math.round(hp)));
  }

  setAmmo(ammo) {
    this.ammoEl.textContent = ammo === null ? '' : `AMMO ∞ · ${ammo} in the clip`;
  }

  setStars(stars) {
    let html = '';
    for (let i = 0; i < 5; i += 1) html += `<span class="hud-star${i < stars ? ' on' : ''}">★</span>`;
    this.starsEl.innerHTML = html;
  }

  setClock(day, hour, minute) {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    this.clockEl.textContent = `DAY ${day} · ${hh}:${mm}`;
  }

  setObjective(title, text, sub) {
    this.titleEl.textContent = title || '';
    this.textEl.textContent = text || '';
    this.subEl.textContent = sub || '';
  }

  setSpeed(kmh, inCar) {
    this.speedEl.style.display = inCar ? 'block' : 'none';
    this.speedNum.textContent = String(Math.round(kmh));
  }

  setPrompt(text) {
    this.promptEl.textContent = text || '';
  }

  setCrosshair(visible) {
    this.crosshairEl.style.display = visible ? 'block' : 'none';
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 3600);
  }

  banner(title, sub) {
    this.bannerEl.innerHTML = `<div class="hud-banner-title">${title}</div><div class="hud-banner-sub">${sub || ''}</div>`;
    this.bannerEl.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.bannerEl.classList.remove('show'), 3200);
  }

  // Top-down map: roads, plaza, beach, player arrow, cars, police, marker.
  drawMinimap(state) {
    const ctx = this.minimapCtx;
    const size = 190;
    const half = 260;
    const toMap = (x, z) => [((x + half) / (half * 2)) * size, ((z + half) / (half * 2)) * size];
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 0, size, size);
    // Sea and sand.
    ctx.fillStyle = '#1e6f8e';
    ctx.fillRect(toMap(285, -half)[0], 0, size, size);
    ctx.fillStyle = '#e3c98f';
    ctx.fillRect(toMap(245, -half)[0], 0, toMap(285, -half)[0] - toMap(245, -half)[0], size);
    // Roads.
    ctx.strokeStyle = '#5a5f6a';
    ctx.lineWidth = 5;
    state.roads.forEach((r) => {
      const [x] = toMap(r, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
      const [, z] = toMap(0, r);
      ctx.beginPath();
      ctx.moveTo(0, z);
      ctx.lineTo(size, z);
      ctx.stroke();
    });
    // Plaza.
    ctx.fillStyle = '#7a8a9a';
    const [px0, pz0] = toMap(-8, -8);
    ctx.fillRect(px0, pz0, 6, 6);
    // Mission / fare marker.
    if (state.marker) {
      const [mx, mz] = toMap(state.marker.x, state.marker.z);
      ctx.fillStyle = state.markerColor || '#ffc93c';
      ctx.beginPath();
      ctx.arc(mx, mz, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Traffic dots.
    ctx.fillStyle = '#c8c8c8';
    state.traffic.forEach((car) => {
      const [cx, cz] = toMap(car.x, car.z);
      ctx.fillRect(cx - 1.5, cz - 1.5, 3, 3);
    });
    // Police blips.
    ctx.fillStyle = '#ff2a2a';
    state.police.forEach((car) => {
      const [cx, cz] = toMap(car.x, car.z);
      ctx.beginPath();
      ctx.arc(cx, cz, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    // Player arrow.
    const [px, pz] = toMap(state.playerX, state.playerZ);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(Math.PI - state.heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e8533f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    // North tick.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('N', size - 12, 12);
  }
}
