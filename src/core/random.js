// Deterministic randomness. Never use Math.random()/Date inside render: values must depend on t only.
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); } // [0,1)
export function hash2(x, y) { return hash(x * 157.31 + y * 113.97); }
export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const rand = mulberry32;
// seeded helpers: range / pick from a hash index
export function hrange(i, a, b) { return a + (b - a) * hash(i); }
export function hpick(i, arr) { return arr[Math.floor(hash(i) * arr.length) % arr.length]; }
// smooth 1D/2D value noise (deterministic, cheap) in [0,1]
const sm = t => t * t * (3 - 2 * t);
export function noise1(x) { const i = Math.floor(x), f = x - i; return hash(i) + (hash(i + 1) - hash(i)) * sm(f); }
export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
// "boil": integer seed that changes `rate` times per second — hand-drawn line boil (Phase 3 uses it)
export function boil(t, rate = 12) { return Math.floor(t * rate + 1e-6); }
