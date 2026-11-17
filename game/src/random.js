// EMBERDEEP — seeded random numbers (mulberry32). One job: deterministic
// randomness for floor layouts and screenshot staging.

function ED_Rng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(lo, hi) { return lo + this.next() * (hi - lo); },
    int(lo, hi) { return Math.floor(this.range(lo, hi + 1)); },
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
  };
}
