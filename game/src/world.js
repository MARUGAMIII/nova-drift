// NOVA DRIFT — the world: state, physics, waves, scoring and collisions.
//
// The world is one plain object. main.js owns the loop and the rendering;
// this module owns everything that changes while the game runs. updateWorld
// returns a list of events (shoot, explosion, pickup, hit, wave clear, game
// over) so main.js can play the matching sound without this module knowing
// about audio at all.

import { CONFIG, COLORS } from './config.js';
import { makeRng, hashSeed } from './random.js';

const TAU = Math.PI * 2;
const BEST_KEY = 'novadrift.best';

function loadBest() {
  try {
    const value = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Best score is a nicety; a blocked store must not break the game.
  }
}

function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function randomEdgePoint(world) {
  // A point just outside one of the four edges, for spawning.
  const side = world.rng.int(0, 3);
  const m = 60;
  if (side === 0) return { x: world.rng.range(0, world.width), y: -m };
  if (side === 1) return { x: world.width + m, y: world.rng.range(0, world.height) };
  if (side === 2) return { x: world.rng.range(0, world.width), y: world.height + m };
  return { x: -m, y: world.rng.range(0, world.height) };
}

function makeStars(world) {
  const stars = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const count = 70 - layer * 15;
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: world.rng.range(0, world.width),
        y: world.rng.range(0, world.height),
        layer,
        size: layer === 0 ? 1 : layer === 1 ? 1.6 : 2.4,
        twinkle: world.rng.range(0, TAU),
      });
    }
  }
  return stars;
}

function makeNebula(world) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.floor(world.width / 2));
  canvas.height = Math.max(2, Math.floor(world.height / 2));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const blobs = 7;
  for (let i = 0; i < blobs; i += 1) {
    const cx = world.rng.range(0, canvas.width);
    const cy = world.rng.range(0, canvas.height);
    const radius = world.rng.range(canvas.width * 0.18, canvas.width * 0.42);
    const color = world.rng.pick(COLORS.nebula);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `${color}55`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }
  return canvas;
}

function makeAsteroid(world, size, x, y, vx, vy) {
  const radius = CONFIG.asteroidRadii[size];
  const points = [];
  const count = size === 'large' ? 11 : size === 'medium' ? 10 : 8;
  for (let i = 0; i < count; i += 1) {
    points.push({
      angle: (i / count) * TAU,
      factor: world.rng.range(0.72, 1.12),
    });
  }
  return {
    kind: 'asteroid',
    size,
    x,
    y,
    vx,
    vy,
    r: radius,
    rot: world.rng.angle(),
    vr: world.rng.range(-0.9, 0.9),
    points,
  };
}

function makeWisp(world, x, y) {
  return {
    kind: 'wisp',
    x,
    y,
    vx: 0,
    vy: 0,
    r: CONFIG.wispRadius,
    hp: 2,
    flash: 0,
    phase: world.rng.angle(),
  };
}

export function createWorld(width, height, seed) {
  const rng = makeRng(typeof seed === 'number' ? seed : hashSeed(String(seed ?? Date.now())));
  const world = {
    width,
    height,
    rng,
    phase: 'title', // 'title' | 'playing' | 'paused' | 'over'
    time: 0,
    score: 0,
    best: loadBest(),
    newBest: false,
    wave: 0,
    waveState: 'active', // 'active' | 'break'
    waveTimer: 0,
    waveBanner: 0,
    combo: 0,
    comboTimer: 0,
    shake: 0,
    muted: false,
    hintTimer: 9, // seconds the controls hint stays on screen.
    player: null,
    bullets: [],
    asteroids: [],
    wisps: [],
    shards: [],
    powerups: [],
    particles: [],
    floaters: [],
    stars: [],
    nebula: null,
    titleRocks: [],
    stats: { shots: 0, hits: 0, kills: 0 },
    // Clickable button rectangles, filled in by render.js each frame.
    ui: { launch: null, again: null, resume: null },
  };
  world.player = freshPlayer(world);
  world.stars = makeStars(world);
  world.nebula = makeNebula(world);
  for (let i = 0; i < 6; i += 1) {
    const rock = makeAsteroid(world, world.rng.pick(['large', 'medium']), world.rng.range(0, width), world.rng.range(0, height), world.rng.range(-24, 24), world.rng.range(-18, 18));
    world.titleRocks.push(rock);
  }
  return world;
}

function freshPlayer(world) {
  return {
    x: world.width / 2,
    y: world.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    r: CONFIG.playerRadius,
    lives: CONFIG.playerLives,
    shield: false,
    invulnUntil: 0,
    fireTimer: 0,
    rapidUntil: 0,
    spreadUntil: 0,
    thrusting: false,
  };
}

export function multiplier(world) {
  return Math.min(CONFIG.comboMaxMultiplier, 1 + Math.floor(world.combo / CONFIG.comboPerTier));
}

export function addScore(world, basePoints, x, y) {
  const gained = basePoints * multiplier(world);
  world.score += gained;
  if (Number.isFinite(x)) {
    world.floaters.push({ x, y, text: `+${gained}`, life: 0.9, maxLife: 0.9, color: COLORS.text });
  }
  return gained;
}

function burst(world, x, y, color, count, speed, size) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng.angle();
    const velocity = world.rng.range(speed * 0.25, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: world.rng.range(0.35, 0.9),
      maxLife: 0.9,
      size: world.rng.range(size * 0.5, size * 1.4),
      color,
    });
  }
}

function spawnAsteroidAtEdge(world, size) {
  const point = randomEdgePoint(world);
  const speed = CONFIG.asteroidBaseSpeed + world.wave * CONFIG.asteroidSpeedPerWave;
  const angle = Math.atan2(world.height / 2 - point.y, world.width / 2 - point.x) + world.rng.range(-0.6, 0.6);
  const velocity = world.rng.range(speed * 0.6, speed * 1.3);
  world.asteroids.push(makeAsteroid(world, size, point.x, point.y, Math.cos(angle) * velocity, Math.sin(angle) * velocity));
}

function spawnWave(world) {
  const largeCount = Math.min(4 + world.wave, 12);
  for (let i = 0; i < largeCount; i += 1) spawnAsteroidAtEdge(world, 'large');
  if (world.wave >= CONFIG.wispFirstWave) {
    const wispCount = Math.min(world.wave - 2, 5);
    for (let i = 0; i < wispCount; i += 1) {
      const point = randomEdgePoint(world);
      world.wisps.push(makeWisp(world, point.x, point.y));
    }
  }
  world.waveState = 'active';
  world.waveBanner = 2;
}

export function startGame(world) {
  world.player = freshPlayer(world);
  world.bullets = [];
  world.asteroids = [];
  world.wisps = [];
  world.shards = [];
  world.powerups = [];
  world.particles = [];
  world.floaters = [];
  world.score = 0;
  world.newBest = false;
  world.combo = 0;
  world.comboTimer = 0;
  world.wave = 1;
  world.waveTimer = 0;
  world.shake = 0;
  world.hintTimer = 9;
  world.stats = { shots: 0, hits: 0, kills: 0 };
  world.player.invulnUntil = world.time + 1;
  world.phase = 'playing';
  spawnWave(world);
}

export function togglePause(world) {
  if (world.phase === 'playing') world.phase = 'paused';
  else if (world.phase === 'paused') world.phase = 'playing';
}

function endGame(world, events) {
  world.phase = 'over';
  world.newBest = world.score > world.best;
  if (world.newBest) {
    world.best = world.score;
    saveBest(world.score);
  }
  burst(world, world.player.x, world.player.y, COLORS.ship, 60, 320, 3);
  burst(world, world.player.x, world.player.y, COLORS.danger, 30, 220, 2.5);
  events.push({ type: 'gameover' });
}

function destroyAsteroid(world, index, events, award = true) {
  const rock = world.asteroids[index];
  world.asteroids.splice(index, 1);
  world.stats.kills += 1;
  // A rock that rams the ship shatters but pays no score and feeds no combo.
  if (award) {
    world.combo += 1;
    world.comboTimer = CONFIG.comboWindow;
    addScore(world, CONFIG.points[rock.size], rock.x, rock.y);
  }
  const particleCount = rock.size === 'large' ? 26 : rock.size === 'medium' ? 16 : 10;
  burst(world, rock.x, rock.y, COLORS.asteroid, particleCount, 240, 3);
  burst(world, rock.x, rock.y, '#ffffff', Math.floor(particleCount / 2), 160, 2);
  events.push({ type: 'explosion', size: rock.size });
  // Big rocks break into two medium ones, medium into two small ones.
  const child = rock.size === 'large' ? 'medium' : rock.size === 'medium' ? 'small' : null;
  if (child) {
    for (let i = 0; i < 2; i += 1) {
      const angle = world.rng.angle();
      const speed = world.rng.range(70, 130);
      world.asteroids.push(makeAsteroid(world, child, rock.x, rock.y, Math.cos(angle) * speed, Math.sin(angle) * speed));
    }
  }
  // Shards spill out of the wreck.
  const shardCount = rock.size === 'large' ? 2 : world.rng.chance(0.7) ? 1 : 0;
  for (let i = 0; i < shardCount; i += 1) {
    const angle = world.rng.angle();
    const speed = world.rng.range(40, 120);
    world.shards.push({
      x: rock.x,
      y: rock.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 6,
      life: CONFIG.shardLife,
      spin: world.rng.angle(),
    });
  }
  // Sometimes a power-up drops.
  if (world.rng.chance(CONFIG.powerupDropChance)) {
    const roll = world.rng.next();
    let kind = roll < 0.3 ? 'shield' : roll < 0.6 ? 'rapid' : roll < 0.85 ? 'spread' : 'life';
    if (kind === 'life' && world.player.lives >= 4) kind = 'shield';
    world.powerups.push({ x: rock.x, y: rock.y, vy: 34, kind, life: 11, pulse: 0 });
  }
}

function damagePlayer(world, events, sourceX, sourceY) {
  const player = world.player;
  if (world.time < player.invulnUntil) return;
  if (player.shield) {
    player.shield = false;
    player.invulnUntil = world.time + 1.2;
    world.shake = Math.min(18, world.shake + 10);
    burst(world, player.x, player.y, COLORS.shield, 24, 260, 2.5);
    events.push({ type: 'hit' });
    return;
  }
  player.lives -= 1;
  player.invulnUntil = world.time + CONFIG.invulnSeconds;
  world.shake = Math.min(18, world.shake + 14);
  world.combo = 0;
  world.comboTimer = 0;
  burst(world, player.x, player.y, COLORS.danger, 34, 300, 3);
  events.push({ type: 'hit' });
  if (player.lives <= 0) endGame(world, events);
}

function fireBullet(world, input, events) {
  const player = world.player;
  const rapid = world.time < player.rapidUntil;
  const spread = world.time < player.spreadUntil;
  const interval = rapid ? CONFIG.rapidFireInterval : CONFIG.fireInterval;
  player.fireTimer = interval;
  const angles = spread ? [-CONFIG.spreadAngle, 0, CONFIG.spreadAngle] : [0];
  for (const offset of angles) {
    const angle = player.angle + offset;
    const noseX = player.x + Math.cos(angle) * (player.r + 6);
    const noseY = player.y + Math.sin(angle) * (player.r + 6);
    world.bullets.push({
      x: noseX,
      y: noseY,
      vx: Math.cos(angle) * CONFIG.bulletSpeed + player.vx * 0.4,
      vy: Math.sin(angle) * CONFIG.bulletSpeed + player.vy * 0.4,
      life: CONFIG.bulletLife,
      r: CONFIG.bulletRadius,
    });
  }
  world.stats.shots += angles.length;
  events.push({ type: 'shoot' });
}

function updateParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-2 * dt);
    p.vy *= Math.exp(-2 * dt);
    p.life -= dt;
    if (p.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.floaters.length - 1; i >= 0; i -= 1) {
    const f = world.floaters[i];
    f.y -= 42 * dt;
    f.life -= dt;
    if (f.life <= 0) world.floaters.splice(i, 1);
  }
}

function updateStars(world, dt) {
  for (const star of world.stars) {
    star.y += (6 + star.layer * 9) * dt;
    star.twinkle += dt * 2;
    if (star.y > world.height + 2) {
      star.y = -2;
      star.x = world.rng.range(0, world.width);
    }
  }
}

function wrapPosition(body, width, height) {
  const m = body.r + 4;
  if (body.x < -m) body.x = width + m;
  else if (body.x > width + m) body.x = -m;
  if (body.y < -m) body.y = height + m;
  else if (body.y > height + m) body.y = -m;
}

function updatePlaying(world, input, dt, events) {
  const player = world.player;
  const firing = input.mouse.down || input.isDown('Space');

  // Steering: WASD or arrow keys thrust, with drift.
  let ax = 0;
  let ay = 0;
  if (input.anyDown(['KeyW', 'ArrowUp'])) ay -= 1;
  if (input.anyDown(['KeyS', 'ArrowDown'])) ay += 1;
  if (input.anyDown(['KeyA', 'ArrowLeft'])) ax -= 1;
  if (input.anyDown(['KeyD', 'ArrowRight'])) ax += 1;
  player.thrusting = ax !== 0 || ay !== 0;
  if (player.thrusting) {
    const length = Math.hypot(ax, ay);
    player.vx += (ax / length) * CONFIG.playerAccel * dt;
    player.vy += (ay / length) * CONFIG.playerAccel * dt;
  }
  const drag = Math.exp(-CONFIG.playerDrag * dt);
  player.vx *= drag;
  player.vy *= drag;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > CONFIG.playerMaxSpeed) {
    player.vx = (player.vx / speed) * CONFIG.playerMaxSpeed;
    player.vy = (player.vy / speed) * CONFIG.playerMaxSpeed;
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  // Soft bounce off the arena edges.
  if (player.x < player.r) { player.x = player.r; player.vx = Math.abs(player.vx) * 0.5; }
  if (player.x > world.width - player.r) { player.x = world.width - player.r; player.vx = -Math.abs(player.vx) * 0.5; }
  if (player.y < player.r) { player.y = player.r; player.vy = Math.abs(player.vy) * 0.5; }
  if (player.y > world.height - player.r) { player.y = world.height - player.r; player.vy = -Math.abs(player.vy) * 0.5; }

  // The cannon follows the mouse.
  player.angle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);

  // Engine trail while thrusting.
  if (player.thrusting && world.rng.chance(0.7)) {
    const back = player.angle + Math.PI;
    world.particles.push({
      x: player.x + Math.cos(back) * player.r,
      y: player.y + Math.sin(back) * player.r,
      vx: Math.cos(back) * 60 + world.rng.range(-20, 20),
      vy: Math.sin(back) * 60 + world.rng.range(-20, 20),
      life: world.rng.range(0.2, 0.45),
      maxLife: 0.45,
      size: world.rng.range(1.5, 3),
      color: '#ffcf5c',
    });
  }

  player.fireTimer -= dt;
  if (firing && player.fireTimer <= 0) fireBullet(world, input, events);

  // Bullets fly and hit rocks and wisps.
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = world.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0 || bullet.x < -20 || bullet.x > world.width + 20 || bullet.y < -20 || bullet.y > world.height + 20) {
      world.bullets.splice(i, 1);
      continue;
    }
    let consumed = false;
    for (let j = world.asteroids.length - 1; j >= 0; j -= 1) {
      const rock = world.asteroids[j];
      const rr = rock.r * 0.92 + bullet.r;
      if (distanceSq(bullet, rock) < rr * rr) {
        world.stats.hits += 1;
        destroyAsteroid(world, j, events);
        consumed = true;
        break;
      }
    }
    if (consumed) {
      world.bullets.splice(i, 1);
      continue;
    }
    for (let j = world.wisps.length - 1; j >= 0; j -= 1) {
      const wisp = world.wisps[j];
      const rr = wisp.r + bullet.r;
      if (distanceSq(bullet, wisp) < rr * rr) {
        world.stats.hits += 1;
        wisp.hp -= 1;
        wisp.flash = 0.12;
        burst(world, bullet.x, bullet.y, COLORS.wisp, 6, 160, 2);
        world.bullets.splice(i, 1);
        consumed = true;
        if (wisp.hp <= 0) {
          world.wisps.splice(j, 1);
          world.stats.kills += 1;
          world.combo += 1;
          world.comboTimer = CONFIG.comboWindow;
          addScore(world, CONFIG.points.wisp, wisp.x, wisp.y);
          burst(world, wisp.x, wisp.y, COLORS.wisp, 22, 260, 3);
          events.push({ type: 'explosion', size: 'small' });
        }
        break;
      }
    }
    if (consumed) continue;
  }

  // Asteroids drift, spin and wrap around the edges.
  for (const rock of world.asteroids) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.rot += rock.vr * dt;
    wrapPosition(rock, world.width, world.height);
  }

  // Wisps hunt the ship, turning toward it with limited agility.
  const wispSpeed = CONFIG.wispSpeed + world.wave * CONFIG.wispSpeedPerWave;
  for (const wisp of world.wisps) {
    wisp.phase += dt * 3;
    const angleToPlayer = Math.atan2(player.y - wisp.y, player.x - wisp.x);
    const current = Math.atan2(wisp.vy, wisp.vx);
    let diff = angleToPlayer - current;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    const turn = Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const next = current + turn;
    wisp.vx = Math.cos(next) * wispSpeed;
    wisp.vy = Math.sin(next) * wispSpeed;
    wisp.x += wisp.vx * dt;
    wisp.y += wisp.vy * dt;
    wisp.flash = Math.max(0, wisp.flash - dt);
    wrapPosition(wisp, world.width, world.height);
  }

  // Shards drift, then magnet in and pay out.
  for (let i = world.shards.length - 1; i >= 0; i -= 1) {
    const shard = world.shards[i];
    const dx = player.x - shard.x;
    const dy = player.y - shard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < CONFIG.shardMagnetRadius && dist > 1) {
      shard.vx += (dx / dist) * 900 * dt;
      shard.vy += (dy / dist) * 900 * dt;
    }
    shard.vx *= Math.exp(-1.2 * dt);
    shard.vy *= Math.exp(-1.2 * dt);
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    shard.spin += dt * 5;
    shard.life -= dt;
    if (shard.life <= 0) {
      world.shards.splice(i, 1);
      continue;
    }
    if (dist < player.r + 12) {
      world.shards.splice(i, 1);
      addScore(world, CONFIG.shardValue, shard.x, shard.y);
      burst(world, shard.x, shard.y, COLORS.shard, 6, 120, 2);
      events.push({ type: 'pickup' });
    }
  }

  // Power-ups drift down; touching one applies it.
  for (let i = world.powerups.length - 1; i >= 0; i -= 1) {
    const power = world.powerups[i];
    power.y += power.vy * dt;
    power.pulse += dt * 4;
    power.life -= dt;
    if (power.life <= 0 || power.y > world.height + 20) {
      world.powerups.splice(i, 1);
      continue;
    }
    if (distanceSq(power, player) < (player.r + 16) ** 2) {
      world.powerups.splice(i, 1);
      if (power.kind === 'shield') player.shield = true;
      else if (power.kind === 'rapid') player.rapidUntil = world.time + CONFIG.powerupSeconds;
      else if (power.kind === 'spread') player.spreadUntil = world.time + CONFIG.powerupSeconds;
      else if (power.kind === 'life') player.lives = Math.min(4, player.lives + 1);
      world.floaters.push({ x: player.x, y: player.y - 24, text: power.kind.toUpperCase(), life: 1.1, maxLife: 1.1, color: COLORS.shield });
      burst(world, player.x, player.y, COLORS.shield, 14, 180, 2.5);
      events.push({ type: 'powerup' });
    }
  }

  // The ship against rocks and wisps.
  if (world.time >= player.invulnUntil) {
    for (let j = world.asteroids.length - 1; j >= 0; j -= 1) {
      const rock = world.asteroids[j];
      const rr = rock.r * 0.88 + player.r * 0.8;
      if (distanceSq(player, rock) < rr * rr) {
        destroyAsteroid(world, j, events, false);
        damagePlayer(world, events, rock.x, rock.y);
        break;
      }
    }
    if (world.phase === 'playing') {
      for (let j = world.wisps.length - 1; j >= 0; j -= 1) {
        const wisp = world.wisps[j];
        const rr = wisp.r + player.r * 0.8;
        if (distanceSq(player, wisp) < rr * rr) {
          world.wisps.splice(j, 1);
          burst(world, wisp.x, wisp.y, COLORS.wisp, 18, 240, 3);
          damagePlayer(world, events, wisp.x, wisp.y);
          break;
        }
      }
    }
  }

  // Combo decays when the chain goes cold.
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }

  // Wave clear: the field is empty, so bank the bonus and queue the next.
  if (world.waveState === 'active' && world.asteroids.length === 0 && world.wisps.length === 0) {
    const bonus = CONFIG.waveBonus * world.wave;
    world.score += bonus;
    world.floaters.push({ x: world.width / 2, y: world.height * 0.4, text: `WAVE ${world.wave} CLEAR  +${bonus}`, life: 1.6, maxLife: 1.6, color: COLORS.shard });
    world.waveState = 'break';
    world.waveTimer = CONFIG.waveBreakSeconds;
    events.push({ type: 'waveclear' });
  } else if (world.waveState === 'break') {
    world.waveTimer -= dt;
    if (world.waveTimer <= 0) {
      world.wave += 1;
      spawnWave(world);
    }
  }

  if (world.waveBanner > 0) world.waveBanner -= dt;
  if (world.hintTimer > 0) world.hintTimer -= dt;
  world.shake = Math.max(0, world.shake - dt * 26);
}

export function updateWorld(world, input, dt) {
  const events = [];
  world.time += dt;
  updateStars(world, dt);
  if (world.phase === 'title') {
    for (const rock of world.titleRocks) {
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.rot += rock.vr * dt;
      wrapPosition(rock, world.width, world.height);
    }
    updateParticles(world, dt);
    return events;
  }
  if (world.phase === 'paused') return events;
  updateParticles(world, dt);
  if (world.phase === 'playing') updatePlaying(world, input, dt, events);
  return events;
}

export function resizeWorld(world, width, height) {
  world.width = width;
  world.height = height;
  world.stars = makeStars(world);
  world.nebula = makeNebula(world);
  if (world.player) {
    world.player.x = Math.min(Math.max(world.player.x, 0), width);
    world.player.y = Math.min(Math.max(world.player.y, 0), height);
  }
}

export function pointInRect(x, y, rect) {
  return !!rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
