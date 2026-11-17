// EMBERDEEP v3 — seeded random numbers (mulberry32).
// One job: deterministic randomness for floor layouts and screenshot
// staging, so a seed always replays the same run.

function ED_Rng(seed) {
  let a = seed >>> 0;
  const rng = {
    next() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(lo, hi) {
      return lo + rng.next() * (hi - lo);
    },
    int(lo, hi) {
      return Math.floor(rng.range(lo, hi + 1));
    },
    pick(list) {
      return list[Math.floor(rng.next() * list.length)];
    },
    shuffle(list) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        const tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      return list;
    },
  };
  return rng;
}
