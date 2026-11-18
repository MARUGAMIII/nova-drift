// EMBERDEEP v4 — the run: floors, waves, collisions, pickups, particles,
// the descent gate, and the Endless depths. One job: the simulation and
// its rules. v4 adds per-floor background set-pieces, the Molten Plate
// block chance, the Shard Siphon score bonus, and the Ember Workshop —
// banked shards and permanent upgrades that persist between runs.

function ED_newRun(seed) {
  const rng = ED_Rng(seed);
  return {
    seed, rng,
    screen: 'title', // title | card | playing | draft | paused | over | win
    difficulty: 'normal',
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
    flashWhite: 0,
    cardTimer: 0,
    draft: [],
    draftRects: [],
    titleRects: [],
    best: 0,
    newBest: false,
    events: [],
    decor: [],
    muted: false,
    // Ember Workshop: banked shards + permanent upgrade levels, loaded
    // from localStorage once per page load.
    bank: ED_loadBank(),
    workshop: ED_loadWorkshop(),
    workshopRects: [],
  };
}

function ED_loadBank() {
  try { return Number(window.localStorage.getItem('emberdeep-bank') || 0) || 0; }
  catch (e) { return 0; }
}

function ED_saveBank(world) {
  try { window.localStorage.setItem('emberdeep-bank', String(world.bank)); } catch (e) {}
}

function ED_loadWorkshop() {
  try {
    const raw = JSON.parse(window.localStorage.getItem('emberdeep-workshop') || '{}');
    const out = {};
    for (const item of ED_WORKSHOP) out[item.id] = Math.min(item.max, Math.max(0, Number(raw[item.id]) || 0));
    return out;
  } catch (e) {
    const out = {};
    for (const item of ED_WORKSHOP) out[item.id] = 0;
    return out;
  }
}

function ED_saveWorkshop(world) {
  try { window.localStorage.setItem('emberdeep-workshop', JSON.stringify(world.workshop)); } catch (e) {}
}

// Buy one workshop level with banked shards. Returns true on success.
function ED_buyWorkshop(world, index) {
  const item = ED_WORKSHOP[index];
  if (!item) return false;
  const lvl = world.workshop[item.id] || 0;
  if (lvl >= item.max) return false;
  const cost = item.costs[lvl];
  if (world.bank < cost) return false;
  world.bank -= cost;
  world.workshop[item.id] = lvl + 1;
  ED_saveBank(world);
  ED_saveWorkshop(world);
  return true;
}

// Apply the owned permanent upgrades to a fresh player.
function ED_applyWorkshop(world, player) {
  for (const item of ED_WORKSHOP) {
    const lvl = world.workshop[item.id] || 0;
    for (let i = 0; i < lvl; i++) item.apply(player, lvl);
  }
}

// Bank this run's shards when the run ends.
function ED_bankRun(world) {
  world.bank += world.shards;
  ED_saveBank(world);
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

// The floor definition for an absolute floor number. Past floor 5 the
// Endless depths cycle the five palettes again, hotter each time round.
function ED_floorDef(world) {
  return ED_FLOORS[(world.floor - 1) % ED_FLOORS.length];
}

// Which boss, if any, guards this absolute floor number.
function ED_bossForFloor(world, floor) {
  if (floor <= ED_FLOORS.length) return ED_FLOORS[floor - 1].boss || null;
  if (!ED_DIFFICULTIES[world.difficulty].endless) return null;
  // Endless boss floors: every third depth past the Heart.
  const past = floor - ED_FLOORS.length;
  if (past % 3 !== 0) return null;
  return ED_ENDLESS_BOSSES[(Math.floor(past / 3) - 1) % ED_ENDLESS_BOSSES.length];
}

// Display name for the HUD: plain floors by name, Endless by depth.
function ED_floorLabel(world) {
  if (world.floor <= ED_FLOORS.length) return ED_floorDef(world).name;
  return 'Endless Depth ' + (world.floor - ED_FLOORS.length);
}

// Scatter floor decoration (rocks and crystal shards) for this floor,
// plus the floor's set-piece: ash dunes, ember veins, crystal clusters,
// obsidian shards or lava pools — one per realm feature.
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
  const feature = ED_floorDef(world).feature;
  const spots = [
    [0.22, 0.3], [0.78, 0.25], [0.5, 0.62], [0.15, 0.72], [0.85, 0.68], [0.62, 0.22],
  ];
  for (const [fx, fy] of spots) {
    world.decor.push({
      x: a.x + a.w * fx + rng.range(-30, 30),
      y: a.y + a.h * fy + rng.range(-24, 24),
      r: rng.range(22, 42),
      kind: feature,
      rot: rng.range(0, 6.28),
      seed: rng.next() * 100,
    });
  }
}

function ED_startRun(world) {
  const diff = ED_DIFFICULTIES[world.difficulty];
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
  const vessel = world.workshop.heart || 0;
  ED_applyWorkshop(world, world.player);
  // Difficulty sets the base hearts; workshop Heart Vessels add on top.
  world.player.maxHearts = diff.hearts + vessel;
  world.player.hearts = diff.hearts + vessel;
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
  world.flashWhite = 0.35;
  if (ED_bossForFloor(world, world.floor)) world.events.push({ type: 'floorboss' });
}

function ED_spawnWave(world) {
  world.wave += 1;
  const bossType = ED_bossForFloor(world, world.floor);
  if (bossType && world.wave > ED_CONFIG.wavesPerFloor) {
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
  // Wave 3 of a floor past the first (and every wave in the Endless
  // depths) hides an elite: bigger, tougher, worth triple.
  const endless = ED_DIFFICULTIES[world.difficulty].endless && world.floor > ED_FLOORS.length;
  if ((world.wave === ED_CONFIG.wavesPerFloor && world.floor > 1) || endless) {
    world.spawnQueue += 1;
    world.eliteQueued = true;
  }
}

function ED_spawnOne(world) {
  const def = ED_floorDef(world);
  const pt = ED_edgePoint(world, world.rng);
  const type = world.rng.pick(def.mix);
  const e = ED_spawnEnemy(world, type, pt.x, pt.y);
  if (world.eliteQueued) {
    world.eliteQueued = false;
    ED_makeElite(e);
  }
  return e;
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
  const bonus = world.player.greed || 0;
  for (let i = 0; i < e.shards + bonus; i++) {
    world.pickups.push({
      kind: 'shard',
      x: e.x + world.rng.range(-14, 14),
      y: e.y + world.rng.range(-14, 14),
      vx: world.rng.range(-40, 40),
      vy: world.rng.range(-40, 40),
      life: 10, r: 6,
    });
  }
  // Hearts are rare: the leech relic raises the chance.
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
  if (e.type === 'bomber' && !e.blasted) {
    e.blasted = true;
    ED_bomberBlast(world, e);
  }
  if (e.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const m = ED_spawnEnemy(world, 'mite', e.x + (i === 0 ? -14 : 14), e.y);
      m.hp = 1;
      m.maxHp = 1;
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
  // Molten Plate: a flat chance to shrug a hit off entirely.
  if (p.armor > 0 && world.rng.next() < p.armor) {
    p.invuln = 0.5;
    world.events.push({ type: 'shieldbreak' });
    ED_addText(world, p.x, p.y - 24, 'BLOCKED', '#59d8ff');
    return;
  }
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
    ED_bankRun(world);
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
  const endless = ED_DIFFICULTIES[world.difficulty].endless;
  if (world.floor >= ED_CONFIG.floors && !endless) return; // the Heart's death wins the run
  world.floor += 1;
  world.draft = ED_draftRelics(world.rng, world.player.relics);
  world.screen = 'draft';
  ED_Sound.relic();
}

// Endless: a boss falls, the mountain reforms one floor deeper.
function ED_endlessNext(world) {
  world.score += ED_CONFIG.floorClearBonus * world.floor;
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
  ED_bankRun(world);
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
          let best = null;
          let bestD = 170;
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

  // Shockwave rings (friendly nova rings only glow, they never hurt).
  for (const r of world.rings) {
    r.r += r.speed * dt;
    if (!r.friendly) {
      const d = Math.hypot(p.x - r.x, p.y - r.y);
      if (Math.abs(d - r.r) < p.radius + 8 && !r.hit) {
        r.hit = true;
        ED_hurtPlayer(world, r.damage);
      }
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
      const nx = (e.x - p.x) / (d || 1);
      const ny = (e.y - p.y) / (d || 1);
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
    pk.vx *= 0.98;
    pk.vy *= 0.98;
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
        world.score += 5 + (p.shardBonus || 0);
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
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    pt.life -= dt;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const t of world.texts) { t.y -= 34 * dt; t.life -= dt; }
  world.texts = world.texts.filter((t) => t.life > 0);

  // Wave cleared?
  if (world.waveState === 'fighting' && world.spawnQueue === 0 && world.enemies.length === 0 && world.screen === 'playing') {
    const bossType = ED_bossForFloor(world, world.floor);
    const bossWave = bossType && world.wave > ED_CONFIG.wavesPerFloor;
    if (bossWave) {
      if (ED_DIFFICULTIES[world.difficulty].endless) ED_endlessNext(world);
      else ED_winRun(world);
    } else if (world.wave >= ED_CONFIG.wavesPerFloor && !bossType) {
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
  if (world.flashWhite > 0) world.flashWhite -= dt;
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
