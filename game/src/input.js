// Keyboard + mouse input. WASD/arrows move, mouse drag orbits the camera,
// click shoots, E interacts, Shift runs, Space brakes/handbrakes, M mutes,
// P or Escape pauses, Enter starts.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.clicked = false;
    this.dragging = false;
    this.pressed = new Set();
    this.canvas = canvas;
    this.onFirstGesture = null;
    this.gestureSeen = false;

    window.addEventListener('keydown', (event) => {
      const code = event.code;
      if (!event.repeat) this.pressed.add(code);
      this.keys.add(code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        event.preventDefault();
      }
      this.noteGesture();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    canvas.addEventListener('mousedown', (event) => {
      this.dragging = true;
      if (event.button === 0) this.clicked = true;
      this.noteGesture();
    });
    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });
    window.addEventListener('mousemove', (event) => {
      if (!this.dragging) return;
      this.mouseDX += event.movementX || 0;
      this.mouseDY += event.movementY || 0;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  noteGesture() {
    if (!this.gestureSeen) {
      this.gestureSeen = true;
      if (this.onFirstGesture) this.onFirstGesture();
    }
  }

  down(code) {
    return this.keys.has(code);
  }

  // True once, on the frame the key went down.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  endFrame() {
    this.pressed.clear();
  }

  moveVector() {
    let x = 0;
    let z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    const len = Math.hypot(x, z) || 1;
    return { x: x / len, z: z / len, active: x !== 0 || z !== 0 };
  }
}
