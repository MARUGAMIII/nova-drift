// NOVA DRIFT — tuning constants.
//
// Every number that shapes how the game feels lives in this one file, so a
// balance change is a one-line edit here and nothing else has to move.

export const CONFIG = {
  // Ship.
  playerRadius: 14,
  playerAccel: 1500, // px/s^2 while thrusting.
  playerMaxSpeed: 430, // px/s.
  playerDrag: 1.6, // exponential damping per second with no thrust.
  playerLives: 3,
  invulnSeconds: 2.2, // brief ghost time after a hit.

  // Cannon.
  bulletSpeed: 660,
  bulletLife: 0.9, // seconds before a bolt fades.
  bulletRadius: 4,
  fireInterval: 0.15, // seconds between shots.
  rapidFireInterval: 0.07,
  spreadAngle: 0.16, // radians either side for a spread shot.

  // Power-ups.
  powerupSeconds: 9, // how long rapid / spread last.
  powerupDropChance: 0.14, // chance an asteroid drops one.

  // Asteroids and wisps.
  asteroidBaseSpeed: 55,
  asteroidSpeedPerWave: 7,
  asteroidRadii: { large: 52, medium: 30, small: 17 },
  wispFirstWave: 3, // wisps start hunting from this wave.
  wispSpeed: 95,
  wispSpeedPerWave: 6,
  wispRadius: 12,

  // Star shards (score pickups).
  shardMagnetRadius: 150, // px: closer than this, shards fly to the ship.
  shardLife: 9, // seconds before a shard fades away.
  shardValue: 25,

  // Combo: chained kills inside the window raise the score multiplier.
  comboWindow: 3, // seconds.
  comboPerTier: 4, // kills per extra multiplier step.
  comboMaxMultiplier: 5,

  // Waves.
  waveBreakSeconds: 2.4, // breather between clearing a wave and the next.
  waveBonus: 100, // points per wave number on a clear.

  // Scoring.
  points: { small: 50, medium: 100, large: 150, wisp: 120 },
};

// The palette: deep space, cyan ship, amber rock, magenta wisps, gold shards.
export const COLORS = {
  background: '#070a1a',
  nebula: ['#3b2a6e', '#0e4a5a', '#6e2a5e', '#1c2f6e'],
  ship: '#7df9ff',
  shipCore: '#e8feff',
  bullet: '#b8f6ff',
  asteroid: '#ffb347',
  asteroidDark: '#8a5a2b',
  wisp: '#ff5ce1',
  shard: '#ffd94a',
  shield: '#59d8ff',
  rapid: '#7dff9e',
  spread: '#ff9d5c',
  life: '#ff6b81',
  text: '#eaf6ff',
  textDim: '#9fb8d8',
  danger: '#ff5c5c',
};
