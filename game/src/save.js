// Save and load: one localStorage key, plain JSON, written on mission
// completion, on cash changes and every 10 seconds of play.

import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      cash: typeof data.cash === 'number' ? data.cash : 150,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
      day: typeof data.day === 'number' ? data.day : 1,
      x: typeof data.x === 'number' ? data.x : 0,
      z: typeof data.z === 'number' ? data.z : 40,
      stashes: Array.isArray(data.stashes) ? data.stashes : [],
    };
  } catch (e) {
    return null;
  }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage full or blocked: the game still plays, it just does not save.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    /* ignore */
  }
}
