// NOVA DRIFT — screenshot staging (?shot=start|play|end&seed=N).
//
// The game reads its own query string so a screenshot run can ask for one
// exact frame: the title screen, a mid-action frame, or the game-over screen.
// A seeded run lays out the same field every time, so the screenshots the
// maker ships are reproducible. Normal play ignores all of this.

import { CONFIG } from './config.js';
import { startGame, updateWorld } from './world.js';

// A scripted stand-in for the player's input while a shot is staged.
function scriptedInput(world, aimX, aimY) {
  return {
    anyDown: () => false,
    isDown: () => false,
    mouse: { x: aimX, y: aimY, down: true, clicked: false },
  };
}

function stagePlay(world) {
  startGame(world);
  const player = world.player;
  // Keep the staged pilot alive while the frame is arranged.
  player.invulnUntil = world.time + 6;
  player.x = world.width * 0.42;
  player.y = world.height * 0.58;
  // A run already in progress: score, combo and a second wave.
  world.score = 1250;
  world.combo = 8;
  world.comboTimer = CONFIG.comboWindow * 0.8;
  world.wave = 2;
  // Extra rocks near the middle of the frame, clear of the ship.
  const extra = [
    ['large', 0.72, 0.3],
    ['medium', 0.66, 0.62],
    ['small', 0.58, 0.3],
    ['medium', 0.3, 0.28],
    ['small', 0.82, 0.68],
  ];
  for (const [size, fx, fy] of extra) {
    world.asteroids.push({
      kind: 'asteroid',
      size,
      x: world.width * fx,
      y: world.height * fy,
      vx: world.rng.range(-40, 40),
      vy: world.rng.range(-30, 30),
      r: CONFIG.asteroidRadii[size],
      rot: world.rng.angle(),
      vr: world.rng.range(-0.8, 0.8),
      points: Array.from({ length: 10 }, (_, i) => ({
        angle: (i / 10) * Math.PI * 2,
        factor: world.rng.range(0.72, 1.12),
      })),
    });
  }
  // A wisp closing in, a few shards, and bolts already in flight.
  world.wisps.push({
    kind: 'wisp',
    x: world.width * 0.62,
    y: world.height * 0.42,
    vx: 0,
    vy: 0,
    r: CONFIG.wispRadius,
    hp: 2,
    flash: 0,
    phase: 0,
  });
  for (let i = 0; i < 4; i += 1) {
    world.shards.push({
      x: world.width * (0.5 + i * 0.04),
      y: world.height * 0.42,
      vx: world.rng.range(-30, 30),
      vy: world.rng.range(-30, 30),
      r: 6,
      life: CONFIG.shardLife,
      spin: world.rng.angle(),
    });
  }
  // Let the staged frame settle: one second of play with the cannon firing.
  const input = scriptedInput(world, world.width * 0.72, world.height * 0.3);
  for (let step = 0; step < 60; step += 1) {
    updateWorld(world, input, 1 / 60);
  }
}

function stageEnd(world) {
  startGame(world);
  world.score = 3420;
  world.best = 3420;
  world.newBest = true;
  world.wave = 6;
  world.stats = { shots: 240, hits: 187, kills: 86 };
  world.player.lives = 0;
  world.phase = 'over';
}

export function applyShotMode(world, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  if (shot === 'start') {
    world.phase = 'title';
    return true;
  }
  if (shot === 'play') {
    stagePlay(world);
    return true;
  }
  if (shot === 'end') {
    stageEnd(world);
    return true;
  }
  return false;
}
