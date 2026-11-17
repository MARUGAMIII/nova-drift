// EMBERDEEP — tuning, floor palettes, enemy definitions and relic definitions.
// One job: every number that balances the game lives here, nowhere else.

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

// A floor's look and its enemy mix. Later floors are hotter, darker, faster.
const ED_FLOORS = [
  {
    name: 'Ash Caverns',
    sub: 'Floor 1 — the mountain breathes',
    bg: '#191411', wall: '#2e211a', floor: '#241a14', accent: '#e07830',
    glow: '#ff9a3c', ember: '#ffb35c', text: '#f5d9b0',
    mix: ['mite', 'mite', 'mite', 'spitter'],
  },
  {
    name: 'Ember Halls',
    sub: 'Floor 2 — the halls remember fire',
    bg: '#1d100c', wall: '#3a1c12', floor: '#2a130c', accent: '#e04830',
    glow: '#ff6a3c', ember: '#ff8a4c', text: '#ffd9b0',
    mix: ['mite', 'spitter', 'spitter', 'splitter', 'wisp'],
  },
  {
    name: 'Crystal Deep',
    sub: 'Floor 3 — the colossus wakes',
    bg: '#120e1e', wall: '#2a1e44', floor: '#1c142e', accent: '#8a5cf0',
    glow: '#b78cff', ember: '#d0a5ff', text: '#e6dcff',
    mix: ['spitter', 'splitter', 'wisp', 'wisp', 'golem'],
    boss: 'colossus',
  },
  {
    name: 'Obsidian Vault',
    sub: 'Floor 4 — black glass, old hunger',
    bg: '#0e0c16', wall: '#241c33', floor: '#171224', accent: '#5c8cf0',
    glow: '#7ca8ff', ember: '#a8c8ff', text: '#dce8ff',
    mix: ['splitter', 'wisp', 'wisp', 'golem', 'spitter'],
  },
  {
    name: 'The Magma Heart',
    sub: 'Floor 5 — kill the heart, end the mountain',
    bg: '#200b06', wall: '#471409', floor: '#2e0d05', accent: '#ff2e1e',
    glow: '#ff5a2e', ember: '#ffc23c', text: '#ffe9c4',
    mix: ['wisp', 'golem', 'spitter', 'splitter'],
    boss: 'heart',
  },
];

// Enemy types. hp and speed scale with the floor (see ED_ENEMY_SCALE).
const ED_ENEMIES = {
  mite:     { hp: 2,  speed: 135, radius: 12, damage: 1, shards: 1, score: 10, color: '#ff7a3c', dark: '#c24a12' },
  spitter:  { hp: 3,  speed: 92,  radius: 13, damage: 1, shards: 2, score: 20, color: '#ff4d6a', dark: '#a11e38' },
  splitter: { hp: 4,  speed: 102, radius: 16, damage: 1, shards: 2, score: 25, color: '#ffb03c', dark: '#b97a10' },
  wisp:     { hp: 2,  speed: 195, radius: 10, damage: 1, shards: 2, score: 25, color: '#c98cff', dark: '#7a3fd1' },
  golem:    { hp: 15, speed: 56,  radius: 24, damage: 2, shards: 5, score: 60, color: '#9a8a7a', dark: '#5c4a3a' },
  colossus: { hp: 240, speed: 62, radius: 46, damage: 2, shards: 25, score: 500, color: '#b78cff', dark: '#5a2e9e', boss: true },
  heart:    { hp: 340, speed: 0,  radius: 54, damage: 2, shards: 40, score: 1000, color: '#ff2e1e', dark: '#8e0f05', boss: true },
};

const ED_ENEMY_SCALE = { hpPerFloor: 0.38, speedPerFloor: 0.06 };

// How many enemies each wave of a floor spawns (before the boss wave).
function ED_WAVE_SIZE(floor, wave) {
  return 3 + floor * 2 + wave * 2;
}

// Relics: the draft pool. apply() runs once per level gained.
const ED_RELICS = [
  { id: 'fury',    name: 'Ember Fury',   max: 5, desc: '+25% bolt damage',        apply: (p) => { p.damageMul *= 1.25; } },
  { id: 'rapid',   name: 'Rapid Ember',  max: 5, desc: '+20% fire rate',          apply: (p) => { p.fireMul *= 0.83; } },
  { id: 'split',   name: 'Split Shot',   max: 2, desc: '+1 bolt per shot',        apply: (p) => { p.bolts += 1; } },
  { id: 'pierce',  name: 'Piercing Ember', max: 3, desc: 'Bolts pierce +1 enemy',  apply: (p) => { p.pierce += 1; } },
  { id: 'orbit',   name: 'Orbiting Embers', max: 3, desc: '+1 ember orbiting you', apply: (p) => { p.orbits += 1; } },
  { id: 'chain',   name: 'Chain Lightning', max: 2, desc: 'Bolts arc to +1 nearby foe', apply: (p) => { p.chain += 1; } },
  { id: 'dash',    name: 'Swift Dash',   max: 2, desc: 'Dash recharges 30% faster', apply: (p) => { p.dashCdMul *= 0.7; } },
  { id: 'heart',   name: 'Heartstone',   max: 3, desc: '+1 max heart, heal 1',    apply: (p) => { p.maxHearts = Math.min(8, p.maxHearts + 1); p.hearts = Math.min(p.maxHearts, p.hearts + 1); } },
  { id: 'leech',   name: 'Ember Leech',  max: 2, desc: 'Kills may drop a heart',   apply: (p) => { p.leech += 0.08; } },
  { id: 'magnet',  name: 'Shard Magnet', max: 3, desc: '+60% pickup radius',      apply: (p) => { p.pickupMul *= 1.6; } },
  { id: 'crit',    name: 'Cinder Crit',  max: 3, desc: '+10% crit chance (2x dmg)', apply: (p) => { p.crit += 0.10; } },
  { id: 'ward',    name: 'Floor Ward',   max: 1, desc: 'Start each floor shielded', apply: (p) => { p.ward = true; } },
  { id: 'thorns',  name: 'Thornmail',    max: 2, desc: 'Touching foes take 2 damage', apply: (p) => { p.thorns += 2; } },
  { id: 'aura',    name: 'Slow Aura',    max: 2, desc: 'Nearby foes slowed 25%',   apply: (p) => { p.aura += 0.25; } },
];
