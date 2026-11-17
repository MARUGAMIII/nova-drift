// NOVA DRIFT — entry point: the loop, the screens and the wiring.
//
// Owns the canvas, the resize, the frame loop and the menu shortcuts; the
// world module owns the rules and render.js owns the drawing. Sounds are
// played here from the events updateWorld returns, so the simulation never
// touches audio directly.

import { createWorld, startGame, togglePause, updateWorld, resizeWorld, pointInRect } from './world.js';
import { renderWorld } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { applyShotMode } from './shots.js';
import { hashSeed } from './random.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);

// A ?seed= value makes a run deterministic (used for screenshots); a normal
// run seeds from the clock.
const seedParam = params.get('seed');
const seed = seedParam ? (Number(seedParam) || hashSeed(seedParam)) : (Date.now() % 2147483647);

const world = createWorld(window.innerWidth, window.innerHeight, seed);
const input = new Input(canvas);
const sound = new SoundBank();
input.onFirstGesture = () => sound.ensure();
input.attach();

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeWorld(world, w, h);
}

window.addEventListener('resize', resize);
resize();

// The mouse starts aimed above the ship so the cannon has a sane direction
// before the first mouse move.
input.mouse.x = world.width / 2;
input.mouse.y = world.height / 2 - 120;

applyShotMode(world, params);

// Testing hook: lets automated play-tests inspect and drive the world.
// Harmless in normal play; the game never reads it.
window.__nova = { world, startGame };

let lastStatus = '';

function updateStatus() {
  const player = world.player;
  const parts = [
    `NOVA DRIFT: ${world.phase}`,
    `score ${world.score}`,
    `wave ${Math.max(1, world.wave)}`,
    `${player.lives} lives`,
  ];
  if (world.phase === 'title') parts.push('press Enter to launch');
  if (world.phase === 'over') parts.push('press R to fly again');
  const next = parts.join(', ');
  if (next !== lastStatus) {
    lastStatus = next;
    statusEl.textContent = next;
  }
}

function playEvent(event) {
  switch (event.type) {
    case 'shoot':
      sound.shoot();
      break;
    case 'explosion':
      sound.explosion(event.size);
      break;
    case 'pickup':
      sound.pickup();
      break;
    case 'powerup':
      sound.powerup();
      break;
    case 'hit':
      sound.hit();
      break;
    case 'waveclear':
      sound.waveClear();
      break;
    case 'gameover':
      sound.gameOver();
      break;
    default:
      break;
  }
}

function handleShortcuts() {
  // Enter / Space launches from the title screen.
  if (world.phase === 'title' && input.anyPressed(['Enter', 'Space'])) {
    sound.ensure();
    sound.click();
    startGame(world);
    return;
  }
  // R flies again from the game-over screen or a pause.
  if ((world.phase === 'over' || world.phase === 'paused') && input.wasPressed('KeyR')) {
    sound.ensure();
    sound.click();
    startGame(world);
    return;
  }
  // P or Escape pauses and resumes.
  if ((world.phase === 'playing' || world.phase === 'paused') && input.anyPressed(['KeyP', 'Escape'])) {
    togglePause(world);
    sound.click();
  }
  // M mutes and unmutes.
  if (input.wasPressed('KeyM')) {
    sound.ensure();
    sound.toggleMute();
  }
}

function handleClicks() {
  if (!input.mouse.clicked) return;
  const { x, y } = input.mouse;
  if (world.phase === 'title') {
    // Any click on the title launches the game.
    sound.ensure();
    sound.click();
    startGame(world);
    return;
  }
  if (world.phase === 'over' && pointInRect(x, y, world.ui.again)) {
    sound.ensure();
    sound.click();
    startGame(world);
    return;
  }
  if (world.phase === 'paused' && pointInRect(x, y, world.ui.resume)) {
    sound.click();
    togglePause(world);
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
  last = now;
  handleShortcuts();
  handleClicks();
  world.muted = sound.muted;
  const events = updateWorld(world, input, dt);
  for (const event of events) playEvent(event);
  renderWorld(ctx, world);
  updateStatus();
  input.endFrame();
  requestAnimationFrame(frame);
}

// Stepping away mid-run pauses the game instead of letting it kill you.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && world.phase === 'playing') togglePause(world);
});

requestAnimationFrame(frame);
