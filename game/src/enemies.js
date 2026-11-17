// EMBERDEEP — enemies and bosses: spawning, movement AI and boss patterns.
// One job: how every creature in the mountain behaves.

function ED_spawnEnemy(world, type, x, y) {
  const def = ED_ENEMIES[type];
  const floor = world.floor;
  const hpScale = 1 + ED_ENEMY_SCALE.hpPerFloor * (floor - 1);
  const spScale = 1 + ED_ENEMY_SCALE.speedPerFloor * (floor - 1);
  const e = {
    type, x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * spScale,
    damage: def.damage,
    shards: def.shards,
    score: def.score,
    color: def.color, dark: def.dark,
    boss: !!def.boss,
    flash: 0, dead: false, orbitHit: 0,
    t: world.rng.range(0, 6.28), // per-enemy phase for wobble / sine
    shootTimer: world.rng.range(1.2, 2.4),
    slamTimer: 4, spawnTimer: 7, jetTimer: 0, jetAngle: 0,
    enraged: false,
  };
  world.enemies.push(e);
  return e;
}

function ED_spawnBoss(world) {
  const floorDef = ED_FLOORS[world.floor - 1];
  const type = floorDef.boss;
  const a = ED_CONFIG.arena;
  const boss = ED_spawnEnemy(world, type, a.x + a.w / 2, a.y + 150);
  world.boss = boss;
  world.events.push({ type: 'boss' });
  return boss;
}

// Pick a spawn point on the arena edge, away from the player.
function ED_edgePoint(world, rng) {
  const a = ED_CONFIG.arena;
  const side = rng.int(0, 3);
  let x, y;
  if (side === 0) { x = rng.range(a.x + 40, a.x + a.w - 40); y = a.y + 30; }
  else if (side === 1) { x = rng.range(a.x + 40, a.x + a.w - 40); y = a.y + a.h - 30; }
  else if (side === 2) { x = a.x + 30; y = rng.range(a.y + 40, a.y + a.h - 40); }
  else { x = a.x + a.w - 30; y = rng.range(a.y + 40, a.y + a.h - 40); }
  return { x, y };
}

function ED_enemySeparation(e, world) {
  for (const o of world.enemies) {
    if (o === e || o.dead) continue;
    const dx = e.x - o.x, dy = e.y - o.y;
    const d = Math.hypot(dx, dy);
    const min = e.radius + o.radius;
    if (d > 0 && d < min) {
      const push = (min - d) * 0.5;
      e.x += (dx / d) * push;
      e.y += (dy / d) * push;
    }
  }
}

function ED_updateEnemy(world, e, dt) {
  const p = world.player;
  const dx = p.x - e.x, dy = p.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist, ny = dy / dist;
  e.t += dt;
  if (e.flash > 0) e.flash -= dt;

  // The slow aura relic drags nearby foes.
  let slow = 1;
  if (p.aura > 0 && dist < 130) slow = 1 - p.aura;

  switch (e.type) {
    case 'mite':
    case 'golem': {
      e.vx = nx * e.speed * slow;
      e.vy = ny * e.speed * slow;
      break;
    }
    case 'spitter': {
      // Keep a firing distance, strafe slowly, shoot ember globs.
      const want = 260;
      const toward = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
      e.vx = nx * e.speed * slow * toward + -ny * 28;
      e.vy = ny * e.speed * slow * toward + nx * 28;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 560) {
        e.shootTimer = 2.3;
        world.ebullets.push({
          x: e.x, y: e.y,
          vx: nx * 210, vy: ny * 210,
          radius: 7, damage: 1, life: 3.2,
        });
        world.events.push({ type: 'spit' });
      }
      break;
    }
    case 'splitter': {
      e.vx = nx * e.speed * slow;
      e.vy = ny * e.speed * slow;
      break;
    }
    case 'wisp': {
      // Sine-wave hunter: fast, weaving, hard to lead.
      const wob = Math.sin(e.t * 5) * 0.9;
      e.vx = (nx * Math.cos(wob) - ny * Math.sin(wob)) * e.speed * slow;
      e.vy = (nx * Math.sin(wob) + ny * Math.cos(wob)) * e.speed * slow;
      break;
    }
    case 'colossus': {
      ED_updateColossus(world, e, dt, nx, ny, dist);
      break;
    }
    case 'heart': {
      ED_updateHeart(world, e, dt);
      break;
    }
    default:
      break;
  }

  if (e.type !== 'heart') {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
  const a = ED_CONFIG.arena;
  e.x = Math.max(a.x + e.radius, Math.min(a.x + a.w - e.radius, e.x));
  e.y = Math.max(a.y + e.radius, Math.min(a.y + a.h - e.radius, e.y));
  ED_enemySeparation(e, world);
}

// Floor 3 boss: a crystal golem that charges, slams the ground (telegraphed
// shockwave ring) and sheds mites.
function ED_updateColossus(world, e, dt, nx, ny, dist) {
  e.speed = 62;
  e.vx = nx * e.speed;
  e.vy = ny * e.speed;
  e.slamTimer -= dt;
  if (e.slamTimer <= 0 && dist < 260) {
    e.slamTimer = 3.4;
    e.slamming = 0.55; // telegraph window before the ring goes out
    world.events.push({ type: 'slam' });
  }
  if (e.slamming > 0) {
    e.slamming -= dt;
    if (e.slamming <= 0) {
      // Shockwave ring: expanding circle the player must dash out of.
      world.rings.push({ x: e.x, y: e.y, r: e.radius, maxR: 240, speed: 420, damage: 1 });
      world.shake = Math.min(world.shake + 8, 14);
      world.events.push({ type: 'ring' });
    }
  }
  e.spawnTimer -= dt;
  if (e.spawnTimer <= 0) {
    e.spawnTimer = 8;
    for (let i = 0; i < 2; i++) {
      const pt = ED_edgePoint(world, world.rng);
      ED_spawnEnemy(world, 'mite', pt.x, pt.y);
    }
  }
}

// Floor 5 boss: the Magma Heart itself. It sits in the middle of the arena,
// spins flame jets, and sheds spitters. Under half health it enrages.
function ED_updateHeart(world, e, dt) {
  if (!e.enraged && e.hp < e.maxHp / 2) {
    e.enraged = true;
    world.events.push({ type: 'enrage' });
    ED_burst(world, e.x, e.y, 40, '#ff2e1e', 260);
  }
  e.jetTimer -= dt;
  const interval = e.enraged ? 0.32 : 0.5;
  if (e.jetTimer <= 0) {
    e.jetTimer = interval;
    e.jetAngle += 0.55;
    for (let k = 0; k < 3; k++) {
      const ang = e.jetAngle + (k * Math.PI * 2) / 3;
      world.ebullets.push({
        x: e.x + Math.cos(ang) * (e.radius + 6),
        y: e.y + Math.sin(ang) * (e.radius + 6),
        vx: Math.cos(ang) * 165, vy: Math.sin(ang) * 165,
        radius: 7, damage: 1, life: 4,
      });
    }
  }
  e.spawnTimer -= dt;
  if (e.spawnTimer <= 0) {
    e.spawnTimer = e.enraged ? 6 : 9;
    const pt = ED_edgePoint(world, world.rng);
    ED_spawnEnemy(world, 'spitter', pt.x, pt.y);
  }
}
