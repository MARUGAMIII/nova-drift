// EMBERDEEP — all drawing: the arena, the creatures, the particles, the HUD
// and every screen. One job: turn the world state into a picture.

function ED_floorColors(world) {
  return ED_FLOORS[world.floor - 1];
}

function ED_drawBackground(ctx, world) {
  const c = ED_floorColors(world);
  const a = ED_CONFIG.arena;
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);

  // Arena floor with a soft radial glow in the middle.
  const g = ctx.createRadialGradient(640, 430, 80, 640, 430, 700);
  g.addColorStop(0, c.floor);
  g.addColorStop(1, c.bg);
  ctx.fillStyle = g;
  ctx.fillRect(a.x, a.y, a.w, a.h);

  // Decor: rocks and glowing crystals.
  for (const d of world.decor) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    if (d.crystal) {
      ctx.fillStyle = c.glow;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, -d.r);
      ctx.lineTo(d.r * 0.6, 0);
      ctx.lineTo(0, d.r);
      ctx.lineTo(-d.r * 0.6, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = c.wall;
      ctx.beginPath();
      ctx.arc(0, 0, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Arena border.
  ctx.strokeStyle = c.accent;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 3;
  ctx.strokeRect(a.x, a.y, a.w, a.h);
  ctx.globalAlpha = 1;

  // The descent gate, when open.
  if (world.gate) {
    const gt = world.gate;
    const pulse = 1 + Math.sin(world.time * 4) * 0.08;
    ctx.save();
    ctx.translate(gt.x, gt.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(0, 0, gt.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a130c';
    ctx.beginPath();
    ctx.arc(0, 0, gt.r - 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▼', 0, 1);
    ctx.restore();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DESCEND — walk in', gt.x, gt.y + gt.r + 22);
  }
}

function ED_drawPickups(ctx, world) {
  for (const pk of world.pickups) {
    const blink = pk.life < 3 ? (Math.sin(world.time * 12) > 0 ? 1 : 0.35) : 1;
    ctx.globalAlpha = blink;
    if (pk.kind === 'shard') {
      ctx.fillStyle = '#ffd94a';
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.rotate(world.time * 3);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath();
      ctx.arc(pk.x - 4, pk.y - 2, 5, 0, Math.PI * 2);
      ctx.arc(pk.x + 4, pk.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pk.x - 8, pk.y);
      ctx.lineTo(pk.x + 8, pk.y);
      ctx.lineTo(pk.x, pk.y + 9);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function ED_drawEnemy(ctx, world, e) {
  const c = ED_floorColors(world);
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.flash > 0) {
    ctx.fillStyle = '#ffffff';
  } else {
    ctx.fillStyle = e.color;
  }
  const wob = Math.sin(e.t * 6) * 0.08;
  ctx.rotate(wob);

  if (e.type === 'mite') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * e.radius, py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = e.dark;
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'spitter') {
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.dark;
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(4, -3, 3, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'splitter') {
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-e.radius * 0.6, 0); ctx.lineTo(e.radius * 0.6, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -e.radius * 0.6); ctx.lineTo(0, e.radius * 0.6); ctx.stroke();
  } else if (e.type === 'wisp') {
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(0, 0, e.radius + 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.5, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'golem') {
    ctx.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
    ctx.fillStyle = e.dark;
    ctx.fillRect(-e.radius * 0.6, -e.radius * 0.6, e.radius * 1.2, e.radius * 1.2);
    ctx.fillStyle = c.glow;
    ctx.beginPath(); ctx.arc(-6, -4, 3, 0, Math.PI * 2); ctx.arc(6, -4, 3, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'colossus') {
    // Crystal golem: big faceted body, glowing core, crown spikes.
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.cos(a) * e.radius, py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = e.dark;
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.color; ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.radius * 0.8, Math.sin(a) * e.radius * 0.8);
      ctx.lineTo(Math.cos(a) * (e.radius + 16), Math.sin(a) * (e.radius + 16));
      ctx.stroke();
    }
    if (e.slamming > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 14, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (e.type === 'heart') {
    // The Magma Heart: pulsing core with flame petals.
    const pulse = 1 + Math.sin(world.time * 3) * 0.06;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = e.dark;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + world.time * 0.4;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * e.radius * 0.9, Math.sin(a) * e.radius * 0.9, 16, 9, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.18, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // Health bar for tough enemies and bosses.
  if ((e.boss || e.type === 'golem') && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 14, w, 5);
    ctx.fillStyle = e.boss ? '#ff5a2e' : '#ffd94a';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 14, w * (e.hp / e.maxHp), 5);
  }
}

function ED_drawPlayer(ctx, world) {
  const p = world.player;
  const c = ED_floorColors(world);
  ctx.save();
  ctx.translate(p.x, p.y);

  // Dash trail.
  if (p.dashTimer > 0) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = c.ember;
    ctx.beginPath(); ctx.arc(-p.dashDirX * 26, -p.dashDirY * 26, p.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Slow aura ring.
  if (p.aura > 0) {
    ctx.strokeStyle = c.glow;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 130, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Orbiting embers.
  if (p.orbits > 0) {
    for (let i = 0; i < p.orbits; i++) {
      const ang = p.orbitAngle + (i / p.orbits) * Math.PI * 2;
      ctx.fillStyle = '#ffb35c';
      ctx.beginPath(); ctx.arc(Math.cos(ang) * 52, Math.sin(ang) * 52, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(Math.cos(ang) * 52, Math.sin(ang) * 52, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Blink while invulnerable.
  if (p.invuln > 0 && Math.floor(world.time * 14) % 2 === 0) ctx.globalAlpha = 0.45;

  // The warden: hooded figure with a glowing staff, rotated toward the aim.
  ctx.rotate(p.aim);
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath(); ctx.arc(0, 0, p.radius - 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a130c';
  ctx.beginPath(); ctx.arc(-2, 0, p.radius - 8, 0, Math.PI * 2); ctx.fill();
  // Staff pointing at the aim.
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(26, -2); ctx.stroke();
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath(); ctx.arc(28, -2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(28, -2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Bright ring so the warden always reads as the player, never as a foe.
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;

  // Shield ring.
  if (p.shield) {
    ctx.strokeStyle = '#59d8ff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Dash cooldown arc under the player.
  if (p.dashCd > 0) {
    const frac = 1 - p.dashCd / ED_playerDashCooldown(p);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 14, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  }
}

function ED_drawHud(ctx, world) {
  const c = ED_floorColors(world);
  const p = world.player;
  ctx.textBaseline = 'alphabetic';

  // Top bar.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.hudHeight);

  // Hearts.
  for (let i = 0; i < p.maxHearts; i++) {
    const x = 56 + i * 34, y = 40;
    ctx.fillStyle = i < p.hearts ? '#ff6b81' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 7, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 11, y);
    ctx.lineTo(x + 11, y);
    ctx.lineTo(x, y + 12);
    ctx.closePath();
    ctx.fill();
  }

  // Floor and wave.
  ctx.fillStyle = c.text;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(c.name.toUpperCase(), 56, 84);
  const nameW = ctx.measureText(c.name.toUpperCase()).width;
  ctx.font = '16px sans-serif';
  ctx.fillStyle = c.accent;
  const waveLabel = world.boss ? 'BOSS' : (world.waveState === 'done' ? 'FLOOR CLEAR' : 'Wave ' + Math.max(1, world.wave) + ' / ' + ED_CONFIG.wavesPerFloor);
  ctx.fillText(waveLabel, 56 + nameW + 24, 84);

  // Score and shards, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('SCORE ' + world.score, 1224, 44);
  ctx.fillStyle = c.text;
  ctx.font = '16px sans-serif';
  ctx.fillText('◆ ' + world.shards + ' shards   •   Floor ' + world.floor + ' / ' + ED_CONFIG.floors, 1224, 72);

  // Relics owned, as a row of small badges.
  const ids = Object.keys(p.relics);
  ctx.textAlign = 'left';
  ctx.font = '13px sans-serif';
  let rx = 560;
  for (const id of ids) {
    const relic = ED_RELICS.find((r) => r.id === id);
    if (!relic) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(rx, 40, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.textAlign = 'center';
    ctx.fillText(relic.name[0], rx, 45);
    ctx.fillStyle = c.text;
    ctx.font = '11px sans-serif';
    ctx.fillText('x' + p.relics[id], rx, 62);
    ctx.font = '13px sans-serif';
    rx += 34;
  }
  ctx.textAlign = 'left';

  // Boss bar.
  if (world.boss) {
    const b = world.boss;
    const bw = 560;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.type === 'colossus' ? 'CINDER COLOSSUS' : 'THE MAGMA HEART', 640, 76);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(640 - bw / 2, 82, bw, 12);
    ctx.fillStyle = '#ff5a2e';
    ctx.fillRect(640 - bw / 2, 82, bw * Math.max(0, b.hp / b.maxHp), 12);
  }

  // Low-health vignette pulse.
  if (p.hearts <= 2 && world.screen === 'playing') {
    const a = 0.14 + Math.sin(world.time * 5) * 0.07;
    const g = ctx.createRadialGradient(640, 400, 260, 640, 400, 720);
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, 'rgba(255,0,0,' + a + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);
  }
}

function ED_centerPanel(ctx, w, h, color) {
  ctx.fillStyle = 'rgba(8,4,2,0.72)';
  ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);
  ctx.fillStyle = color;
  ctx.fillRect(640 - w / 2, 400 - h / 2, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(640 - w / 2, 400 - h / 2, w, h);
}

function ED_drawTitle(ctx, world) {
  const c = ED_floorColors(world);
  ctx.fillStyle = '#160d08';
  ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);
  // Drifting embers behind the title.
  for (let i = 0; i < 70; i++) {
    const x = (i * 173 + world.time * (20 + (i % 5) * 9)) % 1280;
    const y = 800 - ((i * 269 + world.time * (12 + (i % 3) * 7)) % 820);
    ctx.fillStyle = i % 3 === 0 ? '#ffb35c' : '#ff6a3c';
    ctx.globalAlpha = 0.25 + (i % 4) * 0.15;
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff9a3c';
  ctx.font = 'bold 92px sans-serif';
  ctx.fillText('EMBERDEEP', 640, 250);
  ctx.fillStyle = '#f5d9b0';
  ctx.font = '22px sans-serif';
  ctx.fillText('Delve of the Living Mountain', 640, 292);
  ctx.fillStyle = c.accent;
  ctx.font = '17px sans-serif';
  ctx.fillText('Five floors. Two bosses. One heart to kill.', 640, 326);

  ctx.fillStyle = '#e8d9c0';
  ctx.font = '18px sans-serif';
  const lines = [
    'WASD / arrows — move      Mouse — aim      Click / Space — fire embers',
    'Shift / right-click — dash through danger      1 / 2 / 3 — pick a relic',
    'Clear every wave, walk into the gate, choose a relic, descend deeper.',
    'P — pause      M — mute      R — delve again',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 640, 420 + i * 30));

  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 24px sans-serif';
  const blink = Math.sin(world.time * 3) > -0.2;
  if (blink) ctx.fillText('— click or press Enter to descend —', 640, 580);
  if (world.best > 0) {
    ctx.fillStyle = '#9fb8d8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Best score: ' + world.best, 640, 622);
  }
  ctx.textAlign = 'left';
}

function ED_drawCard(ctx, world) {
  const c = ED_floorColors(world);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = c.glow;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(c.name.toUpperCase(), 640, 380);
  ctx.fillStyle = c.text;
  ctx.font = '22px sans-serif';
  ctx.fillText(c.sub, 640, 424);
  if (c.boss) {
    ctx.fillStyle = '#ff5a2e';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('⚠ BOSS FLOOR ⚠', 640, 466);
  }
  ctx.textAlign = 'left';
}

function ED_drawDraft(ctx, world) {
  const c = ED_floorColors(world);
  ctx.fillStyle = 'rgba(8,4,2,0.82)';
  ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('CHOOSE A RELIC', 640, 170);
  ctx.fillStyle = c.text;
  ctx.font = '18px sans-serif';
  ctx.fillText('The mountain offers three. Take one, then descend.', 640, 204);

  const bw = 280, bh = 220, gap = 40;
  const total = bw * 3 + gap * 2;
  const x0 = 640 - total / 2;
  world.draftRects = [];
  world.draft.forEach((relic, i) => {
    const x = x0 + i * (bw + gap);
    const y = 260;
    world.draftRects.push({ x, y, w: bw, h: bh });
    ctx.fillStyle = '#241a14';
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(relic.name, x + bw / 2, y + 52);
    ctx.fillStyle = c.text;
    ctx.font = '16px sans-serif';
    ctx.fillText(relic.desc, x + bw / 2, y + 92);
    const lvl = ED_relicLevel(world.player, relic.id);
    ctx.fillStyle = '#9fb8d8';
    ctx.font = '15px sans-serif';
    ctx.fillText(lvl > 0 ? 'Owned level ' + lvl + ' → ' + (lvl + 1) : 'New relic', x + bw / 2, y + 128);
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Press ' + (i + 1) + ' or click', x + bw / 2, y + 178);
  });
  ctx.textAlign = 'left';
}

function ED_drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5d9b0';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('PAUSED', 640, 380);
  ctx.font = '18px sans-serif';
  ctx.fillText('P / Esc — resume      R — restart the delve      M — mute', 640, 424);
  ctx.textAlign = 'left';
}

function ED_drawEnd(ctx, world, won) {
  const c = ED_floorColors(world);
  ctx.fillStyle = won ? 'rgba(20,12,2,0.78)' : 'rgba(10,2,2,0.78)';
  ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffd94a' : '#ff5c5c';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(won ? 'THE HEART IS STILL' : 'THE MOUNTAIN TAKES YOU', 640, 300);
  ctx.fillStyle = c.text;
  ctx.font = '22px sans-serif';
  ctx.fillText(won
    ? 'The Magma Heart cools. Asha climbs out into the dawn.'
    : 'The ember fades… but wardens do not stay down.', 640, 346);

  const acc = world.shots > 0 ? Math.round((world.hits / world.shots) * 100) : 0;
  const mins = Math.floor(world.runTime / 60);
  const secs = Math.floor(world.runTime % 60);
  ctx.fillStyle = '#e8d9c0';
  ctx.font = '20px sans-serif';
  const stats = [
    'Score: ' + world.score + (world.newBest ? '  —  NEW BEST!' : '   (best ' + world.best + ')'),
    'Floors reached: ' + world.floor + ' / 5      Kills: ' + world.kills,
    'Accuracy: ' + acc + '%      Time: ' + mins + ':' + String(secs).padStart(2, '0'),
  ];
  stats.forEach((line, i) => ctx.fillText(line, 640, 420 + i * 34));

  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 24px sans-serif';
  const blink = Math.sin(world.time * 3) > -0.2;
  if (blink) ctx.fillText('— press R or click to delve again —', 640, 580);
  ctx.textAlign = 'left';
}

function ED_draw(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * world.shake,
      (Math.random() - 0.5) * world.shake,
    );
  }
  if (world.screen === 'title') {
    ED_drawTitle(ctx, world);
  } else {
    ED_drawBackground(ctx, world);
    ED_drawPickups(ctx, world);
    // Shockwave rings under everything else.
    for (const r of world.rings) {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = Math.max(0, 1 - r.r / r.maxR);
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const e of world.enemies) ED_drawEnemy(ctx, world, e);
    // Player bolts.
    for (const b of world.bullets) {
      ctx.fillStyle = b.crit ? '#ffd94a' : '#ffb35c';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    // Enemy globs.
    for (const b of world.ebullets) {
      ctx.fillStyle = '#ff4d6a';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8aa0';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    if (world.screen !== 'over' && world.screen !== 'win') ED_drawPlayer(ctx, world);
    // Particles.
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Floating text.
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif';
    for (const t of world.texts) {
      ctx.globalAlpha = Math.max(0, t.life / 0.9);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    ED_drawHud(ctx, world);
    if (world.screen === 'card') ED_drawCard(ctx, world);
    else if (world.screen === 'draft') ED_drawDraft(ctx, world);
    else if (world.screen === 'paused') ED_drawPaused(ctx, world);
    else if (world.screen === 'over') ED_drawEnd(ctx, world, false);
    else if (world.screen === 'win') ED_drawEnd(ctx, world, true);
  }
  ctx.restore();

  // Red hurt flash over everything.
  if (world.flashRed > 0) {
    ctx.fillStyle = 'rgba(255,30,20,' + Math.min(0.28, world.flashRed * 0.5) + ')';
    ctx.fillRect(0, 0, ED_CONFIG.width, ED_CONFIG.height);
  }
}
