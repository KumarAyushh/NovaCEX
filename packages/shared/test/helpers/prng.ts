// Seeded random numbers for property tests (CLAUDE.md Appendix D).
// Same seed -> same sequence, so a failing case can be replayed exactly.

/** mulberry32: returns a function giving floats in [0, 1). */
export const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type Rnd = () => number;

/** Integer in [lo, hi]. */
export const randInt = (rnd: Rnd, lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

/** Random bigint in [0, 10^maxDigits): random length first, so small and huge values both show up. */
export function randBigint(rnd: Rnd, maxDigits: number): bigint {
  const len = randInt(rnd, 1, maxDigits);
  let s = "";
  for (let i = 0; i < len; i++) s += String(randInt(rnd, 0, 9));
  return BigInt(s);
}
