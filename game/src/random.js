// Seeded random numbers (mulberry32) so the world, the weather and the
// screenshot scenes are identical every run for a given seed. Nothing in
// the simulation uses Math.random: the same seed always builds the same
// valley, the same rings and the same birds.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small helper bundle around one seeded stream. */
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    /** Float in [min, max). */
    range(min, max) {
      return min + (max - min) * next();
    },
    /** Integer in [min, max]. */
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
    /** Pick one element of an array. */
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}
