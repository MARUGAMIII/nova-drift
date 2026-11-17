// NOVA DRIFT — keyboard and mouse input.
//
// Tracks held keys, edge-triggered presses (wasPressed, cleared once a frame
// by the main loop), and the mouse position in canvas CSS pixels. The canvas
// is the only element listened to for the mouse, so clicks on a menu button
// never leak into the page.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set(); // codes currently held down.
    this.pressed = new Set(); // codes pressed since the last endFrame().
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this.onFirstGesture = null; // set by main: unlocks audio on first input.
    this._gestured = false;
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  _gesture() {
    if (this._gestured) return;
    this._gestured = true;
    if (this.onFirstGesture) this.onFirstGesture();
  }

  _onKeyDown = (event) => {
    this._gesture();
    if (event.code === 'Space' || event.code.startsWith('Arrow')) {
      event.preventDefault(); // keep the page from scrolling.
    }
    if (!event.repeat) this.pressed.add(event.code);
    this.keys.add(event.code);
  };

  _onKeyUp = (event) => {
    this.keys.delete(event.code);
  };

  _onBlur = () => {
    this.keys.clear();
    this.mouse.down = false;
  };

  _onMouseMove = (event) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
  };

  _onMouseDown = (event) => {
    this._gesture();
    if (event.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
    this.mouse.down = true;
    this.mouse.clicked = true;
  };

  _onMouseUp = () => {
    this.mouse.down = false;
  };

  _onContextMenu = (event) => {
    event.preventDefault();
  };

  isDown(code) {
    return this.keys.has(code);
  }

  // True only on the frame the key went down.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  // Any of the given codes held or just pressed.
  anyDown(codes) {
    return codes.some((code) => this.keys.has(code));
  }

  anyPressed(codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  // The main loop calls this at the end of every frame.
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
