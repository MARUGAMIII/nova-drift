// EMBERDEEP v3 — entry point: canvas, frame loop, screens and shortcuts.
// One job: own the loop and the wiring; the world module owns the rules,
// render.js owns the drawing, and sounds play here from the events the
// update returns.

const ED_canvas = document.getElementById('game');
const ED_status = document.getElementById('status');
const ED_ctx = ED_canvas.getContext('2d');
const ED_params = new URLSearchParams(window.location.search);

const ED_seedParam = ED_params.get('seed');
const ED_seed = ED_seedParam ? (Number(ED_seedParam) || 20261117) : (Date.now() % 2147483647);

const ED_world = ED_newRun(ED_seed);
ED_loadBest(ED_world);
ED_Input.init(ED_canvas);
ED_Input.mouse.x = 640;
ED_Input.mouse.y = 300;

ED_applyShot(ED_world, ED_params);

// Testing hook: lets automated play-tests inspect and drive the world.
window.__emberdeep = { world: ED_world, startRun: ED_startRun };

let ED_lastStatus = '';

function ED_updateStatus() {
  const w = ED_world;
  const parts = [
    'EMBERDEEP: ' + w.screen,
    'score ' + w.score,
    'floor ' + w.floor,
    'wave ' + Math.max(1, w.wave),
    w.player.hearts + ' hearts',
    ED_DIFFICULTIES[w.difficulty].label,
  ];
  if (w.screen === 'title') parts.push('pick a difficulty: 1, 2 or 3');
  if (w.screen === 'over' || w.screen === 'win') parts.push('press R to delve again');
  const next = parts.join(', ');
  if (next !== ED_lastStatus) {
    ED_lastStatus = next;
    ED_status.textContent = next;
  }
}

function ED_playEvent(event) {
  switch (event.type) {
    case 'shoot': ED_Sound.shoot(); break;
    case 'spit': ED_Sound.blip(420, 200, 0.1, 'square', 0.08); break;
    case 'die': ED_Sound.die(); break;
    case 'pickup': ED_Sound.pickup(); break;
    case 'heart': ED_Sound.heart(); break;
    case 'dash': ED_Sound.dash(); break;
    case 'hurt': ED_Sound.hurt(); break;
    case 'shieldbreak': ED_Sound.blip(900, 300, 0.15, 'triangle', 0.2); break;
    case 'relic': ED_Sound.relic(); break;
    case 'floorclear': ED_Sound.floorClear(); break;
    case 'waveclear': ED_Sound.blip(523, 784, 0.14, 'triangle', 0.18); break;
    case 'boss': ED_Sound.boss(); break;
    case 'slam': ED_Sound.noise(0.4, 500, 0.4); break;
    case 'ring': ED_Sound.noise(0.35, 900, 0.45); break;
    case 'enrage': ED_Sound.boss(); break;
    case 'nova': ED_Sound.nova(); break;
    case 'teleport': ED_Sound.teleport(); break;
    case 'boom': ED_Sound.boom(); break;
    case 'win': ED_Sound.win(); break;
    case 'lose': ED_Sound.lose(); break;
    default: break;
  }
}

function ED_rectHit(x, y, r) {
  return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function ED_beginRun(diffKey) {
  ED_Sound.ensure();
  ED_Sound.startDrone();
  ED_Sound.click();
  ED_world.difficulty = diffKey;
  ED_startRun(ED_world);
}

function ED_handleShortcuts() {
  const w = ED_world;
  if (w.screen === 'title') {
    if (ED_Input.wasPressed('Digit1') || ED_Input.wasPressed('Numpad1')) { ED_beginRun('normal'); return; }
    if (ED_Input.wasPressed('Digit2') || ED_Input.wasPressed('Numpad2')) { ED_beginRun('hard'); return; }
    if (ED_Input.wasPressed('Digit3') || ED_Input.wasPressed('Numpad3')) { ED_beginRun('endless'); return; }
    if (ED_Input.wasPressed('Enter') || ED_Input.wasPressed('Space')) { ED_beginRun('normal'); return; }
  }
  if ((w.screen === 'over' || w.screen === 'win') && ED_Input.wasPressed('KeyR')) {
    ED_Sound.ensure();
    ED_Sound.click();
    ED_startRun(w);
    return;
  }
  if (w.screen === 'draft') {
    if (ED_Input.wasPressed('Digit1')) ED_pickRelic(w, 0);
    else if (ED_Input.wasPressed('Digit2')) ED_pickRelic(w, 1);
    else if (ED_Input.wasPressed('Digit3')) ED_pickRelic(w, 2);
  }
  if ((w.screen === 'playing' || w.screen === 'paused') && (ED_Input.wasPressed('KeyP') || ED_Input.wasPressed('Escape'))) {
    w.screen = w.screen === 'playing' ? 'paused' : 'playing';
    ED_Sound.click();
  }
  if (ED_Input.wasPressed('KeyM')) {
    ED_Sound.ensure();
    ED_Sound.toggleMute();
  }
}

function ED_handleClicks() {
  const w = ED_world;
  if (!ED_Input.mouse.clicked) return;
  const x = ED_Input.mouse.x, y = ED_Input.mouse.y;
  if (w.screen === 'title') {
    for (const rect of w.titleRects) {
      if (ED_rectHit(x, y, rect)) {
        ED_beginRun(rect.diff);
        return;
      }
    }
    // A click anywhere else on the title starts a Normal delve.
    ED_beginRun('normal');
    return;
  }
  if (w.screen === 'draft') {
    for (let i = 0; i < w.draftRects.length; i++) {
      if (ED_rectHit(x, y, w.draftRects[i])) {
        ED_Sound.click();
        ED_pickRelic(w, i);
        return;
      }
    }
  }
  if ((w.screen === 'over' || w.screen === 'win')) {
    ED_Sound.ensure();
    ED_Sound.click();
    ED_startRun(w);
  }
}

let ED_last = performance.now();

function ED_frame(now) {
  const dt = Math.min(1 / 30, Math.max(0, (now - ED_last) / 1000));
  ED_last = now;
  ED_handleShortcuts();
  ED_handleClicks();
  ED_world.muted = ED_Sound.muted;
  const events = ED_updateWorld(ED_world, ED_Input, dt);
  for (const event of events) ED_playEvent(event);
  ED_draw(ED_ctx, ED_world);
  ED_updateStatus();
  ED_Input.endFrame();
  requestAnimationFrame(ED_frame);
}

// Stepping away mid-run pauses instead of letting the mountain kill you.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ED_world.screen === 'playing') ED_world.screen = 'paused';
});

requestAnimationFrame(ED_frame);
