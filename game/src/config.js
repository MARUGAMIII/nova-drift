// EMBERDEEP v3 — every number that tunes the game lives in this file.
// Floors, palettes, enemy stats, difficulties and the relic pool.
// v3 adds: three difficulties (Normal / Hard / Endless), a third boss on
// floor 4, elites, a bomber enemy, and three new relics.

const ED_CONFIG = {
  width: 1280,
  height: 800,
  arena: { x: 48, y: 104, w: 1184, h: 648 },
  hudHeight: 96,
  player: {
    radius: 14,
    speed: 265,
    hearts: 5,
    maxHearts: 8,
    fireInterval: 0.24,
    boltSpeed: 540,
    boltDamage: 1,
    boltRadius: 5,
    dashSpeed: 920,
    dashTime: 0.16,
    dashCooldown: 1.6,
    dashInvuln: 0.28,
    pickupRadius: 90,
    hurtInvuln: 0.9,
  },
  wavesPerFloor: 3,
  floors: 5,
  floorClearBonus: 100,
  victoryBonus: 500,
};

// Difficulties: picked on the title screen. Endless never ends — after the
// Magma Heart dies the mountain reforms and the floors keep coming.
const ED_DIFFICULTIES = {
  normal: {
    label: 'NORMAL',
    tag: 'Five floors, one heart',
    hearts: 5, hpMul: 1, speedMul: 1, scoreMul: 1, endless: false,
  },
  hard: {
    label: 'HARD',
    tag: 'Fewer hearts, hotter foes, +50% score',
    hearts: 3, hpMul: 1.35, speedMul: 1.12, scoreMul: 1.5, endless: false,
  },
  endless: {
    label: 'ENDLESS',
    tag: 'Kill the heart — the mountain reforms',
    hearts: 5, hpMul: 1, speedMul: 1, scoreMul: 1, endless: true,
  },
};

// One floor's look and its enemy mix. Deeper floors run hotter and darker.
const ED_FLOORS = [
  {
    name: 'Ash Caverns', sub: 'Floor 1 — the mountain breathes',
    bg: '#191411', wall: '#2e211a', floor: '#241a14', accent: '#e07830',
    glow: '#ff9a3c', ember: '#ffb35c', text: '#f5d9b0',
    mix: ['mite', 'mite', 'mite', 'spitter'],
  },
  {
    name: 'Ember Halls', sub: 'Floor 2 — the halls remember fire',
    bg: '#220e08', wall: '#421a0e', floor: '#2e120a', accent: '#ff4a2e',
    glow: '#ff7a3c', ember: '#ff9a4c', text: '#ffe0b8',
    mix: ['mite', 'spitter', 'spitter', 'splitter', 'wisp', 'bomber'],
  },
  {
    name: 'Crystal Deep', sub: 'Floor 3 — the colossus wakes',
    bg: '#120e1e', wall: '#2a1e44', floor: '#1c142e', accent: '#8a5cf0',
    glow: '#b78cff', ember: '#d0a5ff', text: '#e6dcff',
    mix: ['spitter', 'splitter', 'wisp', 'wisp', 'golem', 'bomber'],
    boss: 'colossus',
  },
  {
    name: 'Obsidian Vault', sub: 'Floor 4 — the warden watches',
    bg: '#0a0d18', wall: '#1c2438', floor: '#11182a', accent: '#4ac8ff',
    glow: '#6ad8ff', ember: '#a8e4ff', text: '#dceeff',
    mix: ['splitter', 'wisp', 'wisp', 'golem', 'spitter', 'bomber'],
    boss: 'warden',
  },
  {
    name: 'The Magma Heart', sub: 'Floor 5 — kill the heart, end the mountain',
    bg: '#200b06', wall: '#471409', floor: '#2e0d05', accent: '#ff2e1e',
    glow: '#ff5a2e', ember: '#ffc23c', text: '#ffe9c4',
    mix: ['wisp', 'golem', 'spitter', 'splitter', 'bomber'],
    boss: 'heart',
  },
];

// Enemy types. hp and speed scale with the absolute floor number.
const ED_ENEMIES = {
  mite:     { hp: 2,  speed: 135, radius: 12, damage: 1, shards: 1, score: 10,  color: '#ff7a3c', dark: '#c24a12' },
  spitter:  { hp: 3,  speed: 92,  radius: 13, damage: 1, shards: 2, score: 20,  color: '#ff4d6a', dark: '#a11e38' },
  splitter: { hp: 4,  speed: 102, radius: 16, damage: 1, shards: 2, score: 25,  color: '#ffb03c', dark: '#b97a10' },
  wisp:     { hp: 2,  speed: 195, radius: 10, damage: 1, shards: 2, score: 25,  color: '#c98cff', dark: '#7a3fd1' },
  golem:    { hp: 15, speed: 56,  radius: 24, damage: 2, shards: 5, score: 60,  color: '#9a8a7a', dark: '#5c4a3a' },
  bomber:   { hp: 2,  speed: 150, radius: 11, damage: 1, shards: 2, score: 30,  color: '#ffe14a', dark: '#b98a00' },
  colossus: { hp: 240, speed: 62, radius: 46, damage: 2, shards: 25, score: 500, color: '#b78cff', dark: '#5a2e9e', boss: true },
  warden:   { hp: 200, speed: 70, radius: 40, damage: 2, shards: 25, score: 700, color: '#4ac8ff', dark: '#14507a', boss: true },
  heart:    { hp: 340, speed: 0,  radius: 54, damage: 2, shards: 40, score: 1000, color: '#ff2e1e', dark: '#8e0f05', boss: true },
};

const ED_ENEMY_SCALE = { hpPerFloor: 0.38, speedPerFloor: 0.06 };

// Bosses that return in Endless mode, cycling one per endless boss floor.
const ED_ENDLESS_BOSSES = ['warden', 'colossus', 'heart'];

// How many enemies a wave spawns (before the boss wave). The first floor
// runs one lighter per wave so the opening stays welcoming.
function ED_WAVE_SIZE(floor, wave) {
  return 3 + floor * 2 + wave * 2 - (floor === 1 ? 1 : 0);
}

// The relic draft pool. apply() runs once per level gained.
const ED_RELICS = [
  { id: 'fury',   name: 'Ember Fury',    max: 5, desc: '+25% bolt damage',         apply: (p) => { p.damageMul *= 1.25; } },
  { id: 'rapid',  name: 'Rapid Ember',   max: 5, desc: '+20% fire rate',           apply: (p) => { p.fireMul *= 0.83; } },
  { id: 'split',  name: 'Split Shot',    max: 2, desc: '+1 bolt per shot',         apply: (p) => { p.bolts += 1; } },
  { id: 'pierce', name: 'Piercing Ember', max: 3, desc: 'Bolts pierce +1 enemy',   apply: (p) => { p.pierce += 1; } },
  { id: 'orbit',  name: 'Orbiting Embers', max: 3, desc: '+1 ember orbiting you',  apply: (p) => { p.orbits += 1; } },
  { id: 'chain',  name: 'Chain Lightning', max: 2, desc: 'Bolts arc to +1 nearby foe', apply: (p) => { p.chain += 1; } },
  { id: 'dash',   name: 'Swift Dash',    max: 2, desc: 'Dash recharges 30% faster', apply: (p) => { p.dashCdMul *= 0.7; } },
  { id: 'heart',  name: 'Heartstone',    max: 3, desc: '+1 max heart, heal 1',     apply: (p) => { p.maxHearts = Math.min(8, p.maxHearts + 1); p.hearts = Math.min(p.maxHearts, p.hearts + 1); } },
  { id: 'leech',  name: 'Ember Leech',   max: 2, desc: 'Kills may drop a heart',    apply: (p) => { p.leech += 0.08; } },
  { id: 'magnet', name: 'Shard Magnet',  max: 3, desc: '+60% pickup radius',       apply: (p) => { p.pickupMul *= 1.6; } },
  { id: 'crit',   name: 'Cinder Crit',   max: 3, desc: '+10% crit chance (2x dmg)', apply: (p) => { p.crit += 0.10; } },
  { id: 'ward',   name: 'Floor Ward',    max: 1, desc: 'Start each floor shielded', apply: (p) => { p.ward = true; } },
  { id: 'thorns', name: 'Thornmail',     max: 2, desc: 'Touching foes take 2 damage', apply: (p) => { p.thorns += 2; } },
  { id: 'aura',   name: 'Slow Aura',     max: 2, desc: 'Nearby foes slowed 25%',    apply: (p) => { p.aura += 0.25; } },
  { id: 'nova',   name: 'Ember Nova',    max: 2, desc: 'Dash ends in a damaging nova', apply: (p) => { p.nova += 1; } },
  { id: 'regen',  name: 'Cinder Heart',  max: 2, desc: 'Regrow 1 heart every 40s',  apply: (p) => { p.regen += 1; } },
  { id: 'greed',  name: 'Shard Greed',   max: 3, desc: 'Kills drop +1 shard',       apply: (p) => { p.greed += 1; } },
];
