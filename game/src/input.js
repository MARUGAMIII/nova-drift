// EMBERDEEP — keyboard and mouse input. One job: turn DOM events into a
// plain state object the game loop reads (keys held, keys just pressed,
// mouse position and buttons).

const ED_Input = {
  keys: {},
  pressed: {},
  mouse: { x: 640, y: 400, down: false, rightDown: false, clicked: false },
  anyKey: false,

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      this.anyKey = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; this.mouse.rightDown = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.mouse.rightDown = true; else this.mouse.down = true;
      if (e.button === 0) this.mouse.clicked = true;
      this.anyKey = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.mouse.rightDown = false; else this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  down(code) { return !!this.keys[code]; },
  wasPressed(code) { return !!this.pressed[code]; },
  axis() {
    let x = 0, y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    return { x, y };
  },
  firing() { return this.mouse.down || this.down('Space'); },
  dashPressed() { return this.wasPressed('ShiftLeft') || this.wasPressed('ShiftRight') || this.mouse.rightDown; },

  endFrame() { this.pressed = {}; this.anyKey = false; this.mouse.clicked = false; },
};
