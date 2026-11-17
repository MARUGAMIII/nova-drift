// NOVA DRIFT — small deterministic random helpers.
//
// The game uses a seeded generator (mulberry32) so a screenshot run with
// ?seed=N always lays out the same field, while a normal run seeds from the
// clock. Nothing here touches Math.random after construction.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a over a string, for turning a word seed into a number seed.
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max].
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    // One element of a list, uniformly.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with probability p (0..1).
    chance(p) {
      return next() < p;
    },
    // Angle in [0, 2PI).
    angle() {
      return next() * Math.PI * 2;
    },
  };
}
