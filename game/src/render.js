// NOVA DRIFT — rendering: everything the player sees.
//
// One entry point, renderWorld(ctx, world), draws the background, the field,
// the HUD and whichever screen the game is on. The title and game-over
// screens also measure their buttons and store the rectangles in world.ui,
// so main.js can answer clicks on them.

import { CONFIG, COLORS } from './config.js';
import { multiplier } from './world.js';

const TAU = Math.PI * 2;

const FONT_UI = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, font, color, align = 'center', alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
}

// The ship, drawn nose-up at (0,0) so callers can rotate it freely.
function shipPath(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.25);
  ctx.lineTo(r * 0.55, r * 0.35);
  ctx.lineTo(r * 1.05, r * 0.95);
  ctx.lineTo(r * 0.45, r * 0.7);
  ctx.lineTo(0, r * 0.45);
  ctx.lineTo(-r * 0.45, r * 0.7);
  ctx.lineTo(-r * 1.05, r * 0.95);
  ctx.lineTo(-r * 0.55, r * 0.35);
  ctx.closePath();
}

function drawPlayer(ctx, world) {
  const player = world.player;
  const blink = world.time < player.invulnUntil && Math.floor(world.time * 12) % 2 === 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);
  if (blink) ctx.globalAlpha = 0.35;
  // Engine flame while thrusting.
  if (player.thrusting) {
    const flicker = 0.7 + Math.random() * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffcf5c';
    ctx.beginPath();
    ctx.moveTo(-5, player.r * 0.55);
    ctx.lineTo(0, player.r * (1.1 + 0.5 * flicker));
    ctx.lineTo(5, player.r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowColor = COLORS.ship;
  ctx.shadowBlur = 18;
  shipPath(ctx, player.r);
  ctx.fillStyle = COLORS.ship;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.shipCore;
  ctx.beginPath();
  ctx.arc(0, -player.r * 0.35, player.r * 0.22, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Shield ring.
  if (player.shield) {
    ctx.save();
    ctx.strokeStyle = COLORS.shield;
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(world.time * 5);
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.shield;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 9, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawAsteroid(ctx, rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.rot);
  ctx.beginPath();
  rock.points.forEach((point, i) => {
    const px = Math.cos(point.angle) * rock.r * point.factor;
    const py = Math.sin(point.angle) * rock.r * point.factor;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = '#241a12';
  ctx.fill();
  ctx.shadowColor = COLORS.asteroid;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = COLORS.asteroid;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Inner ridge for depth.
  ctx.beginPath();
  rock.points.forEach((point, i) => {
    const px = Math.cos(point.angle) * rock.r * point.factor * 0.55;
    const py = Math.sin(point.angle) * rock.r * point.factor * 0.55;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.strokeStyle = COLORS.asteroidDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawWisp(ctx, wisp, world) {
  const pulse = 1 + 0.18 * Math.sin(wisp.phase);
  ctx.save();
  ctx.translate(wisp.x, wisp.y);
  ctx.shadowColor = COLORS.wisp;
  ctx.shadowBlur = 16;
  ctx.fillStyle = wisp.flash > 0 ? '#ffffff' : COLORS.wisp;
  ctx.beginPath();
  ctx.arc(0, 0, wisp.r * pulse, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd7f6';
  ctx.beginPath();
  ctx.arc(-wisp.r * 0.25, -wisp.r * 0.25, wisp.r * 0.35, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLORS.wisp;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, wisp.r * pulse + 6, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawShard(ctx, shard) {
  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.spin);
  ctx.shadowColor = COLORS.shard;
  ctx.shadowBlur = 12;
  ctx.fillStyle = COLORS.shard;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 8);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(3, 0);
  ctx.lineTo(0, 4);
  ctx.lineTo(-3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const POWERUP_STYLE = {
  shield: { color: COLORS.shield, label: 'SHIELD' },
  rapid: { color: COLORS.rapid, label: 'RAPID' },
  spread: { color: COLORS.spread, label: 'SPREAD' },
  life: { color: COLORS.life, label: '+1 LIFE' },
};

function drawPowerup(ctx, power) {
  const style = POWERUP_STYLE[power.kind];
  const bob = Math.sin(power.pulse) * 3;
  const alpha = power.life < 3 ? 0.45 + 0.4 * Math.sin(power.pulse * 2) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(power.x, power.y + bob);
  ctx.shadowColor = style.color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#0d1526';
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = style.color;
  if (power.kind === 'shield') {
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.stroke();
  } else if (power.kind === 'rapid') {
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(-4, 1);
    ctx.lineTo(0, 1);
    ctx.lineTo(-2, 8);
    ctx.lineTo(4, -1);
    ctx.lineTo(0, -1);
    ctx.closePath();
    ctx.fill();
  } else if (power.kind === 'spread') {
    for (const [dx, dy] of [[-5, 3], [0, -4], [5, 3]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, 2.6, 0, TAU);
      ctx.fill();
    }
  } else {
    ctx.fillRect(-2, -7, 4, 14);
    ctx.fillRect(-7, -2, 14, 4);
  }
  ctx.restore();
  text(ctx, style.label, power.x, power.y + bob + 26, `700 10px ${FONT_UI}`, style.color, 'center', alpha);
}

function drawBackground(ctx, world) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, world.width, world.height);
  if (world.nebula) {
    ctx.drawImage(world.nebula, 0, 0, world.width, world.height);
  }
  for (const star of world.stars) {
    const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(star.twinkle));
    ctx.globalAlpha = twinkle * (0.35 + star.layer * 0.25);
    ctx.fillStyle = star.layer === 2 ? '#cfe8ff' : '#8fb8dd';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
  // Soft vignette so the edges fall away from the action.
  const vignette = ctx.createRadialGradient(
    world.width / 2, world.height / 2, Math.min(world.width, world.height) * 0.45,
    world.width / 2, world.height / 2, Math.max(world.width, world.height) * 0.75,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawBullets(ctx, world) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const bullet of world.bullets) {
    const tailX = bullet.x - bullet.vx * 0.022;
    const tailY = bullet.y - bullet.vy * 0.022;
    ctx.strokeStyle = COLORS.bullet;
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(bullet.x, bullet.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  for (const f of world.floaters) {
    const alpha = Math.max(0, Math.min(1, f.life / f.maxLife));
    text(ctx, f.text, f.x, f.y, `800 17px ${FONT_UI}`, f.color, 'center', alpha);
  }
}

function drawLivesIcon(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(scale, scale);
  shipPath(ctx, 10);
  ctx.fillStyle = COLORS.ship;
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, world) {
  const pad = 18;
  // Score, top left.
  text(ctx, 'SCORE', pad, pad + 8, `700 11px ${FONT_UI}`, COLORS.textDim, 'left');
  text(ctx, String(world.score), pad, pad + 30, `800 26px ${FONT_UI}`, COLORS.text, 'left');
  text(ctx, `BEST ${Math.max(world.best, world.score)}`, pad, pad + 54, `600 12px ${FONT_UI}`, COLORS.textDim, 'left');
  // Combo meter under the score.
  const mult = multiplier(world);
  if (mult > 1 && world.comboTimer > 0) {
    const barW = 110;
    const frac = world.comboTimer / CONFIG.comboWindow;
    text(ctx, `COMBO x${mult}`, pad, pad + 78, `800 14px ${FONT_UI}`, COLORS.shard, 'left');
    ctx.fillStyle = 'rgba(255,217,74,0.25)';
    ctx.fillRect(pad, pad + 88, barW, 5);
    ctx.fillStyle = COLORS.shard;
    ctx.fillRect(pad, pad + 88, barW * frac, 5);
  }
  // Wave, top center.
  text(ctx, `WAVE ${Math.max(1, world.wave)}`, world.width / 2, pad + 16, `800 18px ${FONT_UI}`, COLORS.text, 'center');
  const remaining = world.asteroids.length + world.wisps.length;
  text(ctx, `${remaining} HOSTILE${remaining === 1 ? '' : 'S'} LEFT`, world.width / 2, pad + 38, `600 11px ${FONT_UI}`, COLORS.textDim, 'center');
  // Lives and power-ups, top right.
  const lives = world.player.lives;
  for (let i = 0; i < lives; i += 1) {
    drawLivesIcon(ctx, world.width - pad - 12 - i * 26, pad + 16, 1);
  }
  let chipY = pad + 44;
  const chips = [];
  if (world.player.shield) chips.push(['SHIELD', COLORS.shield]);
  if (world.time < world.player.rapidUntil) chips.push([`RAPID ${Math.ceil(world.player.rapidUntil - world.time)}s`, COLORS.rapid]);
  if (world.time < world.player.spreadUntil) chips.push([`SPREAD ${Math.ceil(world.player.spreadUntil - world.time)}s`, COLORS.spread]);
  for (const [label, color] of chips) {
    ctx.font = `700 11px ${FONT_UI}`;
    const w = ctx.measureText(label).width + 16;
    ctx.fillStyle = 'rgba(10,18,36,0.7)';
    roundRectPath(ctx, world.width - pad - w, chipY, w, 20, 10);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, label, world.width - pad - w / 2, chipY + 11, `700 11px ${FONT_UI}`, color, 'center');
    chipY += 26;
  }
  // Controls hint, fading out after a few seconds of play.
  if (world.hintTimer > 0 && world.phase === 'playing') {
    const alpha = Math.min(1, world.hintTimer / 2);
    text(ctx, 'WASD / ARROWS — steer    ·    MOUSE — aim    ·    CLICK / SPACE — fire    ·    P — pause    ·    M — mute', world.width / 2, world.height - 22, `600 13px ${FONT_UI}`, COLORS.textDim, 'center', alpha);
  }
  // Mute state, bottom right.
  if (world.muted) {
    text(ctx, 'SOUND OFF  (M)', world.width - pad, world.height - 22, `700 12px ${FONT_UI}`, COLORS.textDim, 'right');
  }
  // Wave banner.
  if (world.waveBanner > 0 && world.phase === 'playing') {
    const alpha = Math.min(1, world.waveBanner);
    text(ctx, `WAVE ${world.wave}`, world.width / 2, world.height * 0.38, `900 54px ${FONT_DISPLAY}`, COLORS.text, 'center', alpha);
    text(ctx, world.wave >= CONFIG.wispFirstWave ? 'WARNING: VOID WISPS INBOUND' : 'CLEAR THE FIELD', world.width / 2, world.height * 0.38 + 44, `700 14px ${FONT_UI}`, COLORS.shard, 'center', alpha);
  }
}

function drawButton(ctx, label, cx, y, w, h, color) {
  const x = cx - w / 2;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(10,20,40,0.85)';
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, cx, y + h / 2 + 1, `800 18px ${FONT_UI}`, color, 'center');
  ctx.restore();
  return { x, y, w, h };
}

function drawTitle(ctx, world) {
  // A dim veil over the drifting field so the text reads.
  const veil = ctx.createLinearGradient(0, 0, 0, world.height);
  veil.addColorStop(0, 'rgba(4,6,18,0.25)');
  veil.addColorStop(0.5, 'rgba(4,6,18,0.55)');
  veil.addColorStop(1, 'rgba(4,6,18,0.8)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, world.width, world.height);

  const cx = world.width / 2;
  // A big ship gliding above the title, with orbiting shards.
  const shipY = world.height * 0.2;
  ctx.save();
  ctx.translate(cx, shipY);
  ctx.rotate(Math.sin(world.time * 0.5) * 0.12);
  ctx.shadowColor = COLORS.ship;
  ctx.shadowBlur = 26;
  shipPath(ctx, 30);
  ctx.fillStyle = COLORS.ship;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.shipCore;
  ctx.beginPath();
  ctx.arc(0, -10, 6, 0, TAU);
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < 3; i += 1) {
    const angle = world.time * 0.7 + (i * TAU) / 3;
    const sx = cx + Math.cos(angle) * 86;
    const sy = shipY + Math.sin(angle) * 30;
    drawShard(ctx, { x: sx, y: sy, spin: angle });
  }

  ctx.save();
  try { ctx.letterSpacing = '10px'; } catch { /* older canvas: no letter spacing */ }
  ctx.shadowColor = COLORS.ship;
  ctx.shadowBlur = 22;
  text(ctx, 'NOVA DRIFT', cx, world.height * 0.38, `900 64px ${FONT_DISPLAY}`, COLORS.text);
  ctx.restore();
  text(ctx, 'A NEON ASTEROID SURVIVAL ARCADE', cx, world.height * 0.38 + 48, `700 15px ${FONT_UI}`, COLORS.shard);
  text(ctx, 'Blast the rocks. Grab the shards. Chain kills for combos. Survive the drift.', cx, world.height * 0.38 + 78, `400 14px ${FONT_UI}`, COLORS.textDim);

  const lines = [
    'WASD / ARROW KEYS — steer the ship',
    'MOUSE — aim the cannon      CLICK / SPACE — fire',
    'SHATTER BIG ROCKS — they split in two      DODGE THE VOID WISPS',
    '3 LIVES — shields, rapid fire and spread shot drop from the wreckage',
  ];
  const boxY = world.height * 0.52;
  lines.forEach((line, i) => {
    text(ctx, line, cx, boxY + i * 24, `600 14px ${FONT_UI}`, COLORS.text, 'center');
  });

  if (world.best > 0) {
    text(ctx, `BEST SCORE  ${world.best}`, cx, boxY + lines.length * 24 + 14, `800 15px ${FONT_UI}`, COLORS.shard);
  }

  const pulse = 0.75 + 0.25 * Math.sin(world.time * 4);
  world.ui.launch = drawButton(ctx, '▶  LAUNCH', cx, world.height * 0.74, 220, 54, COLORS.ship);
  text(ctx, 'or press ENTER', cx, world.height * 0.74 + 74, `600 13px ${FONT_UI}`, COLORS.textDim, 'center', pulse);
  text(ctx, 'M — mute sound      ·      P — pause      ·      R — restart', cx, world.height - 24, `600 12px ${FONT_UI}`, COLORS.textDim);
}

function drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(4,6,18,0.72)';
  ctx.fillRect(0, 0, world.width, world.height);
  text(ctx, 'PAUSED', world.width / 2, world.height * 0.4, `900 52px ${FONT_DISPLAY}`, COLORS.text);
  text(ctx, 'The drift waits for no one — except now.', world.width / 2, world.height * 0.4 + 44, `400 15px ${FONT_UI}`, COLORS.textDim);
  world.ui.resume = drawButton(ctx, 'RESUME', world.width / 2, world.height * 0.52, 200, 50, COLORS.ship);
  text(ctx, 'or press P', world.width / 2, world.height * 0.52 + 70, `600 13px ${FONT_UI}`, COLORS.textDim);
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(4,6,18,0.78)';
  ctx.fillRect(0, 0, world.width, world.height);
  const cx = world.width / 2;
  text(ctx, 'GAME OVER', cx, world.height * 0.28, `900 56px ${FONT_DISPLAY}`, COLORS.danger);
  text(ctx, 'The drift claims another pilot.', cx, world.height * 0.28 + 44, `400 15px ${FONT_UI}`, COLORS.textDim);

  const accuracy = world.stats.shots > 0 ? Math.round((world.stats.hits / world.stats.shots) * 100) : 0;
  const rows = [
    ['SCORE', String(world.score), COLORS.text],
    ['BEST', String(Math.max(world.best, world.score)), COLORS.shard],
    ['WAVE REACHED', String(Math.max(1, world.wave)), COLORS.text],
    ['ROCKS SHATTERED', String(world.stats.kills), COLORS.text],
    ['ACCURACY', `${accuracy}%`, COLORS.text],
  ];
  const panelW = 340;
  const panelH = rows.length * 34 + 28;
  const panelX = cx - panelW / 2;
  const panelY = world.height * 0.38;
  ctx.fillStyle = 'rgba(10,18,36,0.85)';
  roundRectPath(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(125,249,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  rows.forEach(([label, value, color], i) => {
    const y = panelY + 28 + i * 34;
    text(ctx, label, panelX + 20, y, `700 13px ${FONT_UI}`, COLORS.textDim, 'left');
    text(ctx, value, panelX + panelW - 20, y, `800 16px ${FONT_UI}`, color, 'right');
  });
  if (world.newBest) {
    text(ctx, '★ NEW BEST SCORE ★', cx, panelY + panelH + 26, `800 16px ${FONT_UI}`, COLORS.shard);
  }

  world.ui.again = drawButton(ctx, '↻  FLY AGAIN', cx, world.height * 0.78, 230, 54, COLORS.ship);
  text(ctx, 'or press R', cx, world.height * 0.78 + 74, `600 13px ${FONT_UI}`, COLORS.textDim);
}

export function renderWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0.5) {
    const magnitude = world.shake * 0.6;
    ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
  }
  drawBackground(ctx, world);

  if (world.phase === 'title') {
    for (const rock of world.titleRocks) drawAsteroid(ctx, rock);
    drawParticles(ctx, world);
    drawTitle(ctx, world);
    ctx.restore();
    return;
  }

  for (const shard of world.shards) drawShard(ctx, shard);
  for (const power of world.powerups) drawPowerup(ctx, power);
  for (const rock of world.asteroids) drawAsteroid(ctx, rock);
  for (const wisp of world.wisps) drawWisp(ctx, wisp, world);
  drawBullets(ctx, world);
  if (world.phase !== 'over') drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  drawHud(ctx, world);

  if (world.phase === 'paused') drawPaused(ctx, world);
  if (world.phase === 'over') drawGameOver(ctx, world);
  ctx.restore();
}
