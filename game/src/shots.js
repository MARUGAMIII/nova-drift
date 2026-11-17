// EMBERDEEP v3 — screenshot staging (?shot=start|play|boss|end&seed=N).
// One job: arrange one exact frame per shot so the shipped screenshots are
// reproducible: title with difficulty cards, a busy mid-combat frame, the
// Obsidian Warden boss fight, and an Endless victory screen.

function ED_scriptedInput(aimX, aimY) {
  return {
    axis: () => ({ x: 0, y: 0 }),
    firing: () => true,
    dashPressed: () => false,
    down: () => false,
    wasPressed: () => false,
    mouse: { x: aimX, y: aimY, down: true, rightDown: false },
    endFrame: () => {},
  };
}

function ED_stagePlay(world) {
  ED_startRun(world);
  world.screen = 'playing';
  ED_startFloor(world);
  world.floor = 2;
  ED_startFloor(world);
  const p = world.player;
  p.invuln = 30; // the staged warden cannot die mid-shot
  p.x = 560;
  p.y = 470;
  p.relics = { fury: 1, orbit: 2, split: 1, nova: 1 };
  p.damageMul = 1.25;
  p.orbits = 2;
  p.bolts = 2;
  p.nova = 1;
  world.score = 1560;
  world.shards = 44;
  world.wave = 2;
  world.waveState = 'fighting';
  // A busy mid-fight frame: every enemy kind on screen at once, shards,
  // bolts in flight, and a gold-ringed elite for the eye to land on.
  const spots = [
    ['mite', 900, 260], ['mite', 1010, 430], ['spitter', 1050, 300],
    ['splitter', 840, 640], ['wisp', 1080, 560], ['golem', 950, 660],
    ['mite', 360, 280], ['spitter', 300, 540], ['bomber', 760, 330],
    ['mite', 1080, 180], ['wisp', 320, 660], ['splitter', 1120, 660],
    ['spitter', 240, 200], ['bomber', 1060, 700],
  ];
  for (const [type, x, y] of spots) ED_spawnEnemy(world, type, x, y);
  const elite = ED_spawnEnemy(world, 'golem', 700, 240);
  ED_makeElite(elite);
  for (let i = 0; i < 5; i++) {
    world.pickups.push({
      kind: 'shard',
      x: 660 + i * 34, y: 380,
      vx: 0, vy: 0, life: 10, r: 6,
    });
  }
  ED_burst(world, 900, 260, 12, '#ff7a3c', 180);
  ED_burst(world, 1050, 300, 8, '#ff4d6a', 140);
  ED_burst(world, 760, 330, 10, '#ffe14a', 180);
  // Let the frame settle: a short burst of play with the cannon firing,
  // short enough that the staged foes have not closed on the warden yet.
  const input = ED_scriptedInput(900, 300);
  for (let step = 0; step < 8; step++) {
    ED_updateWorld(world, input, 1 / 60);
  }
  world.screen = 'playing';
}

function ED_stageBoss(world) {
  ED_startRun(world);
  world.screen = 'playing';
  world.floor = 4;
  ED_startFloor(world);
  const p = world.player;
  p.invuln = 30;
  p.x = 480;
  p.y = 620;
  p.relics = { fury: 2, rapid: 1, pierce: 1, orbit: 1 };
  p.damageMul = 1.56;
  p.fireMul = 0.83;
  p.pierce = 1;
  p.orbits = 1;
  world.score = 4860;
  world.shards = 122;
  world.wave = 4;
  world.waveState = 'fighting';
  const boss = ED_spawnBoss(world); // the Obsidian Warden, floor 4
  boss.hp = Math.round(boss.maxHp * 0.55); // mid-fight, boss bar half gone
  boss.x = 720;
  boss.y = 300;
  ED_spawnEnemy(world, 'wisp', 500, 320);
  ED_spawnEnemy(world, 'bomber', 960, 420);
  ED_spawnEnemy(world, 'wisp', 1020, 220);
  ED_spawnEnemy(world, 'spitter', 340, 380);
  ED_burst(world, 720, 300, 18, '#4ac8ff', 220);
  const input = ED_scriptedInput(720, 300);
  for (let step = 0; step < 20; step++) {
    ED_updateWorld(world, input, 1 / 60);
  }
  world.screen = 'playing';
}

function ED_stageEnd(world) {
  world.difficulty = 'endless';
  ED_startRun(world);
  world.screen = 'win';
  world.floor = 9; // four depths past the Heart
  world.score = 12480;
  world.best = 12480;
  world.newBest = true;
  world.kills = 311;
  world.shots = 1420;
  world.hits = 1103;
  world.runTime = 1084;
  world.player.relics = { fury: 3, rapid: 2, split: 1, pierce: 2, orbit: 2, crit: 2, heart: 1, nova: 1 };
}

function ED_applyShot(world, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  if (shot === 'start') {
    world.screen = 'title';
    return true;
  }
  if (shot === 'play') { ED_stagePlay(world); return true; }
  if (shot === 'boss') { ED_stageBoss(world); return true; }
  if (shot === 'end') { ED_stageEnd(world); return true; }
  return false;
}
