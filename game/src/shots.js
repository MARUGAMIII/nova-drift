// EMBERDEEP — screenshot staging (?shot=start|play|boss|end&seed=N).
// One job: arrange one exact frame per shot so the shipped screenshots are
// reproducible: title, mid-combat, boss fight, victory screen.

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
  p.x = 560; p.y = 470;
  p.relics = { fury: 1, orbit: 2, split: 1 };
  p.damageMul = 1.25; p.orbits = 2; p.bolts = 2;
  world.score = 1240;
  world.shards = 38;
  world.wave = 2;
  world.waveState = 'fighting';
  // A busy mid-fight frame: several enemy types, shards, bolts in flight.
  // Enemies start spread out so the frame reads at a glance.
  const spots = [
    ['mite', 900, 260], ['mite', 1010, 430], ['spitter', 1050, 300],
    ['splitter', 840, 640], ['wisp', 1080, 560], ['golem', 950, 660],
    ['mite', 360, 280], ['spitter', 300, 540],
  ];
  for (const [type, x, y] of spots) ED_spawnEnemy(world, type, x, y);
  for (let i = 0; i < 5; i++) {
    world.pickups.push({
      kind: 'shard',
      x: 660 + i * 34, y: 380,
      vx: 0, vy: 0, life: 10, r: 6,
    });
  }
  ED_burst(world, 900, 260, 12, '#ff7a3c', 180);
  ED_burst(world, 1050, 300, 8, '#ff4d6a', 140);
  // Let the frame settle: a quarter second of play with the cannon firing,
  // short enough that the staged foes have not closed on the warden yet.
  const input = ED_scriptedInput(900, 300);
  for (let step = 0; step < 15; step++) {
    ED_updateWorld(world, input, 1 / 60);
  }
  world.screen = 'playing';
}

function ED_stageBoss(world) {
  ED_startRun(world);
  world.screen = 'playing';
  world.floor = 3;
  ED_startFloor(world);
  const p = world.player;
  p.invuln = 30;
  p.x = 480; p.y = 620;
  p.relics = { fury: 2, rapid: 1, pierce: 1, orbit: 1 };
  p.damageMul = 1.56; p.fireMul = 0.83; p.pierce = 1; p.orbits = 1;
  world.score = 3120;
  world.shards = 91;
  world.wave = 4;
  world.waveState = 'fighting';
  const boss = ED_spawnBoss(world);
  boss.hp = Math.round(boss.maxHp * 0.55); // mid-fight, boss bar half gone
  boss.x = 720; boss.y = 300;
  ED_spawnEnemy(world, 'mite', 500, 320);
  ED_spawnEnemy(world, 'mite', 960, 420);
  ED_burst(world, 720, 300, 18, '#b78cff', 220);
  const input = ED_scriptedInput(720, 300);
  for (let step = 0; step < 30; step++) {
    ED_updateWorld(world, input, 1 / 60);
  }
  world.screen = 'playing';
}

function ED_stageEnd(world) {
  ED_startRun(world);
  world.screen = 'win';
  world.floor = 5;
  world.score = 8740;
  world.best = 8740;
  world.newBest = true;
  world.kills = 214;
  world.shots = 920;
  world.hits = 731;
  world.runTime = 742;
  world.player.relics = { fury: 3, rapid: 2, split: 1, pierce: 2, orbit: 2, crit: 2, heart: 1 };
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
