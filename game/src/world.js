// EMBERDEEP — the run: floors, waves, collisions, pickups, particles and
// the descent gate. One job: the simulation and its rules.

function ED_newRun(seed) {
  const rng = ED_Rng(seed);
  return {
    seed, rng,
    screen: 'title', // title | card | playing | draft | paused | over | win
    floor: 1,
    wave: 0,
    waveState: 'idle', // idle | fighting | clearing | done
    waveTimer: 0,
    spawnQueue: 0,
    spawnTimer: 0,
    enemies: [],
    bullets: [],
    ebullets: [],
    rings: [],
    pickups: [],
    particles: [],
    texts: [],
    gate: null,
    boss: null,
    player: ED_newPlayer(),
    score: 0,
    shards: 0,
    kills: 0,
    shots: 0,
    hits: 0,
    time: 0,
    runTime: 0,
    shake: 0,
    flashRed: 0,
    cardTimer: 0,
    draft: [],
    draftRects: [],
    best: 0,
    newBest: false,
    events: [],
    decor: [],
    muted: false,
  };
}

function ED_loadBest(world) {
  try {
    world.best = Number(window.localStorage.getItem('emberdeep-best') || 0) || 0;
  } catch (e) { world.best = 0; }
}

function ED_saveBest(world) {
  try {
    window.localStorage.setItem('emberdeep-best', String(world.best));
  } catch (e) {}
}

// Scatter floor decoration (rocks and crystal shards) for this floor.
function ED_makeDecor(world) {
  const a = ED_CONFIG.arena;
  const rng = world.rng;
  world.decor = [];
  for (let i = 0; i < 26; i++) {
    world.decor.push({
      x: rng.range(a.x + 30, a.x + a.w - 30),
      y: rng.range(a.y + 30, a.y + a.h - 30),
      r: rng.range(4, 16),
      crystal: rng.next() < 0.35,
      rot: rng.range(0, 6.28),
    });
  }
}

function ED_startRun(world) {
  world.screen = 'card';
  world.cardTimer = 2.2;
  world.floor = 1;
  world.score = 0;
  world.shards = 0;
  world.kills = 0;
  world.shots = 0;
  world.hits = 0;
  world.runTime = 0;
  world.newBest = false;
  world.player = ED_newPlayer();
  world.enemies = [];
  world.bullets = [];
  world.ebullets = [];
  world.rings = [];
  world.pickups = [];
  world.particles = [];
  world.texts = [];
  world.gate = null;
  world.boss = null;
  ED_makeDecor(world);
}

function ED_startFloor(world) {
  const def = ED_FLOORS[world.floor - 1];
  world.wave = 0;
  world.waveState = 'idle';
  world.waveTimer = 1.2;
  world.enemies = [];
  world.bullets = [];
  world.ebullets = [];
  world.rings = [];
  world.pickups = [];
  world.gate = null;
  world.boss = null;
  world.player.x = 640;
  world.player.y = 560;
  world.player.invuln = 1.2;
  if (world.player.ward) world.player.shield = true;
  ED_makeDecor(world);
  if (def.boss) world.events.push({ type: 'floorboss' });
}

function ED_spawnWave(world) {
  world.wave += 1;
  const def = ED_FLOORS[world.floor - 1];
  if (def.boss && world.wave > ED_CONFIG.wavesPerFloor) {
    // The boss wave: the boss plus a small escort.
    ED_spawnBoss(world);
    for (let i = 0; i < 2; i++) {
      const pt = ED_edgePoint(world, world.rng);
      ED_spawnEnemy(world, 'mite', pt.x, pt.y);
    }
    world.waveState = 'fighting';
    return;
  }
  const size = ED_WAVE_SIZE(world.floor, world.wave);
  world.spawnQueue = size;
  world.spawnTimer = 0;
  world.waveState = 'fighting';
}

function ED_spawnOne(world) {
  const def = ED_FLOORS[world.floor - 1];
  const pt = ED_edgePoint(world, world.rng);
  const type = world.rng.pick(def.mix);
  ED_spawnEnemy(world, type, pt.x, pt.y);
}

function ED_burst(world, x, y, n, color, speed) {
  for (let i = 0; i < n; i++) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: world.rng.range(0.3, 0.8), maxLife: 0.8,
      size: world.rng.range(2, 5),
      color,
    });
  }
}

function ED_addText(world, x, y, text, color) {
  world.texts.push({ x, y, text, color, life: 0.9 });
}

function ED_dropShards(world, e) {
  for (let i = 0; i < e.shards; i++) {
    world.pickups.push({
      kind: 'shard',
      x: e.x + world.rng.range(-14, 14),
      y: e.y + world.rng.range(-14, 14),
      vx: world.rng.range(-40, 40),
      vy: world.rng.range(-40, 40),
      life: 10, r: 6,
    });
  }
  // Hearts are rare: leech relic raises the chance.
  const p = world.player;
  if (world.rng.next() < 0.03 + p.leech && p.hearts < p.maxHearts) {
    world.pickups.push({
      kind: 'heart',
      x: e.x, y: e.y, vx: 0, vy: 0, life: 12, r: 9,
    });
  }
}

function ED_damageEnemy(world, e, dmg, hx, hy) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.12;
  ED_burst(world, hx, hy, 3, e.color, 120);
  if (e.hp <= 0) ED_killEnemy(world, e);
}

function ED_killEnemy(world, e) {
  e.dead = true;
  world.kills += 1;
  world.score += e.score;
  world.events.push({ type: 'die', big: e.boss });
  ED_burst(world, e.x, e.y, e.boss ? 46 : 14, e.color, e.boss ? 320 : 220);
  ED_burst(world, e.x, e.y, 8, '#ffffff', 140);
  ED_dropShards(world, e);
  ED_addText(world, e.x, e.y - e.radius - 6, '+' + e.score, '#ffd94a');
  world.shake = Math.min(world.shake + (e.boss ? 12 : 2.5), 14);
  if (e.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const m = ED_spawnEnemy(world, 'mite', e.x + (i === 0 ? -14 : 14), e.y);
      m.hp = 1; m.maxHp = 1;
    }
  }
  if (e.boss) {
    world.boss = null;
    world.score += ED_CONFIG.floorClearBonus * world.floor;
  }
}

function ED_hurtPlayer(world, dmg) {
  const p = world.player;
  if (p.invuln > 0 || p.dashTimer > 0) return;
  if (p.shield) {
    p.shield = false;
    p.invuln = 1.0;
    world.events.push({ type: 'shieldbreak' });
    ED_burst(world, p.x, p.y, 16, '#59d8ff', 200);
    return;
  }
  p.hearts -= dmg;
  p.invuln = ED_CONFIG.player.hurtInvuln;
  world.flashRed = 0.45;
  world.shake = Math.min(world.shake + 7, 14);
  world.events.push({ type: 'hurt' });
  ED_burst(world, p.x, p.y, 18, '#ff5c5c', 220);
  if (p.hearts <= 0) {
    p.hearts = 0;
    world.screen = 'over';
    if (world.score > world.best) {
      world.best = world.score;
      world.newBest = true;
      ED_saveBest(world);
    }
    world.events.push({ type: 'lose' });
  }
}

function ED_openGate(world) {
  const a = ED_CONFIG.arena;
  world.gate = { x: a.x + a.w / 2, y: a.y + 70, r: 34 };
  world.waveState = 'done';
  world.events.push({ type: 'floorclear' });
  world.score += ED_CONFIG.floorClearBonus * world.floor;
}

function ED_descend(world) {
  if (world.floor >= ED_CONFIG.floors) {
    // Should not happen: the Heart's death wins the run.
    return;
  }
  world.floor += 1;
  world.draft = ED_draftRelics(world.rng, world.player.relics);
  world.screen = 'draft';
  ED_Sound.relic();
}

function ED_pickRelic(world, index) {
  const relic = world.draft[index];
  if (!relic) return;
  ED_applyRelic(world.player, relic);
  world.events.push({ type: 'relic' });
  world.screen = 'card';
  world.cardTimer = 2.0;
}

function ED_winRun(world) {
  world.screen = 'win';
  const timeBonus = Math.max(0, 1200 - Math.floor(world.runTime) * 2);
  world.score += ED_CONFIG.victoryBonus + timeBonus;
  if (world.score > world.best) {
    world.best = world.score;
    world.newBest = true;
    ED_saveBest(world);
  }
  world.events.push({ type: 'win' });
}

function ED_updatePlaying(world, input, dt) {
  world.runTime += dt;
  const p = world.player;

  // Spawn the queued wave members over time.
  if (world.waveState === 'idle') {
    world.waveTimer -= dt;
    if (world.waveTimer <= 0) ED_spawnWave(world);
  } else if (world.spawnQueue > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = 0.45;
      world.spawnQueue -= 1;
      ED_spawnOne(world);
    }
  }

  ED_updatePlayer(p, input, dt, world);

  // Enemies.
  for (const e of world.enemies) {
    if (!e.dead) ED_updateEnemy(world, e, dt);
  }

  // Player bolts.
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }

  // Bolt vs enemy collisions.
  for (const b of world.bullets) {
    if (b.life <= 0) continue;
    for (const e of world.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < e.radius + b.radius) {
        world.hits += 1;
        const wasAlive = !e.dead;
        ED_damageEnemy(world, e, b.damage, b.x, b.y);
        if (b.crit) ED_addText(world, b.x, b.y - 10, 'CRIT ' + Math.round(b.damage), '#ffd94a');
        // Chain lightning arcs to one nearby foe.
        if (p.chain > 0 && wasAlive) {
          let best = null, bestD = 170;
          for (const o of world.enemies) {
            if (o === e || o.dead) continue;
            const od = Math.hypot(o.x - e.x, o.y - e.y);
            if (od < bestD) { bestD = od; best = o; }
          }
          if (best) ED_damageEnemy(world, best, b.damage * 0.6, best.x, best.y);
        }
        if (b.pierce > 0) { b.pierce -= 1; }
        else { b.life = 0; }
        break;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);

  // Enemy bullets.
  for (const b of world.ebullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < p.radius + b.radius) {
      b.life = 0;
      ED_hurtPlayer(world, b.damage);
    }
  }
  world.ebullets = world.ebullets.filter((b) => b.life > 0);

  // Shockwave rings.
  for (const r of world.rings) {
    r.r += r.speed * dt;
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    if (Math.abs(d - r.r) < p.radius + 8 && !r.hit) {
      r.hit = true;
      ED_hurtPlayer(world, r.damage);
    }
  }
  world.rings = world.rings.filter((r) => r.r < r.maxR);

  // Touch damage.
  for (const e of world.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < p.radius + e.radius) {
      ED_hurtPlayer(world, e.damage);
      if (p.thorns > 0) ED_damageEnemy(world, e, p.thorns, e.x, e.y);
      // Push the enemy off so it does not sit on the player.
      const nx = (e.x - p.x) / (d || 1), ny = (e.y - p.y) / (d || 1);
      e.x = p.x + nx * (p.radius + e.radius + 2);
      e.y = p.y + ny * (p.radius + e.radius + 2);
    }
  }
  world.enemies = world.enemies.filter((e) => !e.dead);

  // Pickups: drift, magnet toward the player, collect.
  const magnetR = ED_playerPickupRadius(p);
  for (const pk of world.pickups) {
    pk.life -= dt;
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    pk.vx *= 0.98; pk.vy *= 0.98;
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (d < magnetR) {
      const pull = 420 * dt;
      pk.x += ((p.x - pk.x) / (d || 1)) * pull;
      pk.y += ((p.y - pk.y) / (d || 1)) * pull;
    }
    if (d < p.radius + pk.r + 4) {
      pk.life = 0;
      if (pk.kind === 'shard') {
        world.shards += 1;
        world.score += 5;
        world.events.push({ type: 'pickup' });
      } else if (pk.kind === 'heart') {
        p.hearts = Math.min(p.maxHearts, p.hearts + 1);
        world.events.push({ type: 'heart' });
      }
    }
  }
  world.pickups = world.pickups.filter((pk) => pk.life > 0);

  // Particles and floating text.
  for (const pt of world.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96; pt.vy *= 0.96;
    pt.life -= dt;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const t of world.texts) { t.y -= 34 * dt; t.life -= dt; }
  world.texts = world.texts.filter((t) => t.life > 0);

  // Wave cleared?
  if (world.waveState === 'fighting' && world.spawnQueue === 0 && world.enemies.length === 0 && world.screen === 'playing') {
    const def = ED_FLOORS[world.floor - 1];
    if (def.boss && world.wave > ED_CONFIG.wavesPerFloor) {
      ED_winRun(world);
    } else if (world.wave >= ED_CONFIG.wavesPerFloor && !def.boss) {
      ED_openGate(world);
    } else {
      world.waveState = 'idle';
      world.waveTimer = 1.6;
      world.events.push({ type: 'waveclear' });
    }
  }

  // Walk into the gate to descend.
  if (world.gate) {
    const d = Math.hypot(p.x - world.gate.x, p.y - world.gate.y);
    if (d < world.gate.r + p.radius) {
      world.gate = null;
      ED_descend(world);
    }
  }

  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.flashRed > 0) world.flashRed -= dt;
}

function ED_updateWorld(world, input, dt) {
  world.time += dt;
  world.events = [];
  if (world.screen === 'card') {
    world.cardTimer -= dt;
    if (world.cardTimer <= 0) {
      world.screen = 'playing';
      ED_startFloor(world);
    }
  } else if (world.screen === 'playing') {
    ED_updatePlaying(world, input, dt);
  }
  // Draft / title / paused / over / win screens are static: no simulation.
  return world.events;
}
