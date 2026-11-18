// EMBERDEEP v3 — the Ember Warden: movement, dash, firing and the stats
// relics buy. One job: the player object and how it answers the controls.

function ED_newPlayer() {
  const base = ED_CONFIG.player;
  return {
    x: 640, y: 480, vx: 0, vy: 0,
    radius: base.radius,
    aim: -Math.PI / 2,
    hearts: base.hearts,
    maxHearts: base.hearts,
    speed: base.speed,
    fireTimer: 0,
    dashTimer: 0,
    dashCd: 0,
    dashDirX: 0, dashDirY: -1,
    invuln: 0,
    shield: false,
    // Relic-driven stats (multipliers start at 1).
    damageMul: 1, fireMul: 1, bolts: 1, pierce: 0, orbits: 0, chain: 0,
    dashCdMul: 1, leech: 0, pickupMul: 1, crit: 0, ward: false, thorns: 0,
    aura: 0, nova: 0, regen: 0, greed: 0, armor: 0, shardBonus: 0,
    relics: {},
    orbitAngle: 0,
    walkPhase: 0,
    regenTimer: 40,
    wasDashing: false,
  };
}

function ED_playerPickupRadius(p) {
  return ED_CONFIG.player.pickupRadius * p.pickupMul;
}

function ED_playerFireInterval(p) {
  return ED_CONFIG.player.fireInterval * p.fireMul;
}

function ED_playerDashCooldown(p) {
  return ED_CONFIG.player.dashCooldown * p.dashCdMul;
}

// Fire one volley of bolts toward the aim point. Returns the bolts made.
function ED_fireVolley(p, targetX, targetY, rng) {
  const made = [];
  const baseAngle = Math.atan2(targetY - p.y, targetX - p.x);
  const n = p.bolts;
  const spread = 0.14;
  for (let i = 0; i < n; i++) {
    const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
    const a = baseAngle + off;
    const isCrit = rng.next() < p.crit;
    made.push({
      x: p.x + Math.cos(a) * (p.radius + 8),
      y: p.y + Math.sin(a) * (p.radius + 8),
      vx: Math.cos(a) * ED_CONFIG.player.boltSpeed,
      vy: Math.sin(a) * ED_CONFIG.player.boltSpeed,
      damage: ED_CONFIG.player.boltDamage * p.damageMul * (isCrit ? 2 : 1),
      crit: isCrit,
      pierce: p.pierce,
      life: 0.85,
      radius: ED_CONFIG.player.boltRadius,
    });
  }
  return made;
}

// The Ember Nova relic: when a dash ends, fire bursts out of the warden.
function ED_dashNova(world) {
  const p = world.player;
  const power = 3 * p.nova * p.damageMul;
  world.events.push({ type: 'nova' });
  world.rings.push({ x: p.x, y: p.y, r: 10, maxR: 120, speed: 520, damage: 0, friendly: true });
  ED_burst(world, p.x, p.y, 22, '#ffb35c', 260);
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < 120 + e.radius) {
      ED_damageEnemy(world, e, power, e.x, e.y);
    }
  }
}

function ED_updatePlayer(p, input, dt, world) {
  const base = ED_CONFIG.player;
  const ax = input.axis();
  const len = Math.hypot(ax.x, ax.y) || 1;
  const mx = ax.x / len;
  const my = ax.y / len;
  const moving = ax.x !== 0 || ax.y !== 0;

  // Dash: a short burst in the move direction (or the aim direction idle).
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashDirX * base.dashSpeed * dt;
    p.y += p.dashDirY * base.dashSpeed * dt;
    if (p.dashTimer <= 0 && p.nova > 0) ED_dashNova(world);
  } else {
    if (input.dashPressed() && p.dashCd <= 0 && moving) {
      p.dashTimer = base.dashTime;
      p.dashCd = ED_playerDashCooldown(p);
      p.dashDirX = mx;
      p.dashDirY = my;
      p.invuln = Math.max(p.invuln, base.dashInvuln);
      world.events.push({ type: 'dash' });
      ED_burst(world, p.x, p.y, 10, '#ffb35c', 160);
    }
    p.x += mx * p.speed * dt;
    p.y += my * p.speed * dt;
  }
  if (moving) p.walkPhase += dt * 11;

  // Stay inside the arena.
  const a = ED_CONFIG.arena;
  p.x = Math.max(a.x + p.radius, Math.min(a.x + a.w - p.radius, p.x));
  p.y = Math.max(a.y + p.radius, Math.min(a.y + a.h - p.radius, p.y));

  // Aim follows the mouse.
  p.aim = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

  // Firing.
  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0 && p.dashTimer <= 0) {
    p.fireTimer = ED_playerFireInterval(p);
    const volley = ED_fireVolley(p, input.mouse.x, input.mouse.y, world.rng);
    for (const b of volley) world.bullets.push(b);
    world.shots += volley.length;
    world.events.push({ type: 'shoot' });
    world.shake = Math.min(world.shake + 0.6, 3);
  }

  // Orbiting embers damage anything they touch.
  p.orbitAngle += dt * 3.2;
  if (p.orbits > 0) {
    for (let i = 0; i < p.orbits; i++) {
      const ang = p.orbitAngle + (i / p.orbits) * Math.PI * 2;
      const ox = p.x + Math.cos(ang) * 52;
      const oy = p.y + Math.sin(ang) * 52;
      for (const e of world.enemies) {
        if (e.dead || e.orbitHit > 0) continue;
        if (Math.hypot(e.x - ox, e.y - oy) < e.radius + 12) {
          e.orbitHit = 0.45;
          ED_damageEnemy(world, e, 1 * p.damageMul, ox, oy);
        }
      }
    }
    for (const e of world.enemies) {
      if (e.orbitHit > 0) e.orbitHit -= dt;
    }
  }

  // The Cinder Heart relic slowly regrows a lost heart.
  if (p.regen > 0 && p.hearts < p.maxHearts) {
    p.regenTimer -= dt;
    if (p.regenTimer <= 0) {
      p.regenTimer = 40 / p.regen;
      p.hearts = Math.min(p.maxHearts, p.hearts + 1);
      world.events.push({ type: 'heart' });
      ED_burst(world, p.x, p.y, 10, '#ff6b81', 120);
    }
  }

  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.invuln > 0) p.invuln -= dt;
}
