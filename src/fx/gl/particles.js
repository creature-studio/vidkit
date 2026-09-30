// Deterministic particle systems: every particle's state is a closed-form function of (seed, index, t) — no
// simulation state, no integration across frames — so any frame can be rendered first. Emission happens in fixed
// slots (bursts at given times, or a steady rate over [from, to]); motion is ballistic with linear drag and gravity,
// plus optional value-noise sway; an optional floor turns a particle into a landed splat (ink blot, puddle).
//
//   const P = vk.particles({ seed: 3, burst: [{ t: 1.2, n: 40 }], x: 640, y: 300, angle: -90, spread: 70,
//                            speed: [300, 700], gravity: 900, drag: .8, life: [1.2, 2], size: [3, 12], floor: 560 });
//   P.at(t) → [{ id, x, y, size, alpha, rot, age, life, landed, land: {x, y, t} | null, u (per-particle random) }, …]
//
// Presets (vk.particles.presets): inkDrops · spray · petals · sparks · mist. Any option may be a [min, max] range
// (picked per particle from the seed) or a function (i, r) → value where r(k) is the particle's k-th random number.
import { hash, noise1 } from '../../core/random.js';

const D2R = Math.PI / 180;
const isR = v => Array.isArray(v) && v.length === 2 && typeof v[0] === 'number';

export function particles(opts = {}) {
  const o = { ...(opts.preset ? PRESETS[opts.preset] : {}), ...opts };
  const seed = o.seed != null ? o.seed : 1;
  const r = (i, k) => hash(seed * 131.7 + i * 17.13 + k * 3.917 + .31);
  const pick = (v, i, k, d) => { if (v == null) return d; if (typeof v === 'function') return v(i, kk => r(i, 100 + kk)); if (isR(v)) return v[0] + (v[1] - v[0]) * r(i, k); return v; };
  const bursts = [].concat(o.burst || []).map(b => (typeof b === 'number' ? { t: b } : b));
  const counts = bursts.map(b => b.n != null ? b.n : o.n != null ? o.n : 30);
  const rate = o.rate || 0, from = o.from || 0, to = o.to != null ? o.to : Infinity;
  const maxLife = isR(o.life) ? o.life[1] : typeof o.life === 'number' ? o.life : 2;
  const nBurst = counts.reduce((a, b) => a + b, 0);

  // particle i: emission time + origin (a burst may override the emitter position / direction)
  function spawn(i) {
    let t0, b = null;
    if (i < nBurst) { let j = 0, c = i; while (c >= counts[j]) { c -= counts[j]; j++; } b = bursts[j]; t0 = b.t + (b.dur ? r(i, 0) * b.dur : 0); }
    else t0 = from + (i - nBurst) / rate;
    const src = b || {};
    const ex = src.x != null ? src.x : o.x || 0, ey = src.y != null ? src.y : o.y || 0;
    // emitter shape: point, line [x0,y0,x1,y1] (o.line), circle radius (o.radius), box [w,h] (o.box)
    let x = ex, y = ey; const line = src.line || o.line, box = src.box || o.box, rad = src.radius != null ? src.radius : o.radius;
    if (line) { const u = r(i, 1); x = line[0] + (line[2] - line[0]) * u; y = line[1] + (line[3] - line[1]) * u; }
    else if (box) { x = ex + (r(i, 1) - .5) * box[0]; y = ey + (r(i, 2) - .5) * box[1]; }
    else if (rad) { const a = r(i, 1) * Math.PI * 2, rr = rad * Math.sqrt(r(i, 2)); x = ex + Math.cos(a) * rr; y = ey + Math.sin(a) * rr; }
    const ang = ((src.angle != null ? src.angle : o.angle != null ? o.angle : -90) + ((r(i, 3) - .5) * (src.spread != null ? src.spread : o.spread != null ? o.spread : 360))) * D2R;
    const sp = pick(src.speed || o.speed, i, 4, 100);
    return { t0, x, y, vx: Math.cos(ang) * sp + (o.wind || 0), vy: Math.sin(ang) * sp };
  }
  // position at age a: v' = g - k v  →  closed form (k → 0: plain ballistic)
  const G = o.gravity || 0, GX = o.gravityX || 0, K = o.drag || 0;
  function pos(s, a) {
    if (K < 1e-6) return [s.x + s.vx * a + .5 * GX * a * a, s.y + s.vy * a + .5 * G * a * a];
    const e = (1 - Math.exp(-K * a)) / K;
    return [s.x + (s.vx - GX / K) * e + GX / K * a, s.y + (s.vy - G / K) * e + G / K * a];
  }
  // first time the particle crosses the floor (descending), or null — coarse scan + bisection, deterministic
  function landing(s, life, i) {
    if (o.landAt != null) return Math.min(life, pick(o.landAt, i, 12, life));   // top-down splatter: lands after a flight time
    const fl = o.floor; if (fl == null) return null;
    const floorY = typeof fl === 'function' ? fl : () => fl;
    let prev = 0, py = pos(s, 0)[1];
    if (py >= floorY(s.x)) return null;                                 // born below the floor: never lands
    const steps = 48;
    for (let k = 1; k <= steps; k++) {
      const a = life * k / steps, p = pos(s, a);
      if (p[1] >= floorY(p[0])) { let lo = prev, hi = a; for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2, q = pos(s, m); if (q[1] >= floorY(q[0])) hi = m; else lo = m; } return hi; }
      prev = a; py = p[1];
    }
    return null;
  }
  const total = n => (rate ? nBurst + n : nBurst);
  function state(i, t) {
    const s = spawn(i), age = t - s.t0; if (age < 0) return null;
    const life = pick(o.life, i, 5, 2), lands = o.floor != null || o.landAt != null; if (age > life + (lands ? (o.splatLife != null ? o.splatLife : life) : 0)) return null;
    const la = landing(s, life, i);
    let x, y, landed = false, land = null, a = age;
    if (la != null && age >= la) { [x, y] = pos(s, la); landed = true; land = { x, y, t: s.t0 + la, age: age - la }; a = la; }
    else { if (age > life) return null; [x, y] = pos(s, age); }
    const sway = o.sway || 0;
    if (sway && !landed) { const f = o.swayFreq || 1.3; x += (noise1(i * 7.7 + a * f) - .5) * 2 * sway; y += (noise1(i * 3.1 + 40 + a * f) - .5) * sway * .5; }
    const size0 = pick(o.size, i, 6, 6), grow = o.grow != null ? o.grow : 1;
    const lifeP = Math.min(1, age / life), fin = o.fadeIn != null ? o.fadeIn : .05, fout = o.fadeOut != null ? o.fadeOut : .3;
    let alpha = pick(o.alpha, i, 7, 1) * Math.min(1, age / Math.max(1e-6, fin)) * (landed ? 1 : Math.min(1, (life - age) / Math.max(1e-6, fout * life)));
    if (landed) { const sl = o.splatLife != null ? o.splatLife : life, sf = o.splatFade != null ? o.splatFade : .4; alpha *= Math.min(1, (sl - land.age) / Math.max(1e-6, sf * sl)); }
    if (alpha <= 0) return null;
    const rot = pick(o.rot, i, 8, 0) + pick(o.spin, i, 9, 0) * a;
    // landed splat grows like a blot soaking in (1 - e^-3a), up to `splat` × the drop size
    // (exactly the final size once e^-k·age < 1e-3, so a fully soaked splat is bit-identical from then on → cacheable)
    const soakK = (o.soak || 5) * (landed ? land.age : 0), settledSize = landed && soakK > 6.9;
    const size = landed ? size0 * (1 + ((o.splat != null ? o.splat : 2.2) - 1) * (settledSize ? 1 : 1 - Math.exp(-soakK))) : size0 * (1 + (grow - 1) * lifeP);
    const A = Math.min(1, alpha);
    return { id: i, x, y, size, alpha: A, rot, age, life, landed, land, u: r(i, 11), t0: s.t0, settled: settledSize && age >= fin && land.age <= (o.splatLife != null ? o.splatLife : life) * (1 - (o.splatFade != null ? o.splatFade : .4)) };
  }
  return {
    o, seed,
    // number of particles that may exist at time t (upper bound of the index range)
    count(t) { return rate ? total(Math.max(0, Math.min(Math.floor((Math.min(t, to) - from) * rate) + 1, Math.ceil((to - from) * rate)))) : nBurst; },
    at(t) {
      const out = [];
      for (let i = 0; i < nBurst; i++) { const p = state(i, t); if (p) out.push(p); }
      if (rate) {
        const extra = o.floor != null || o.landAt != null ? (o.splatLife != null ? o.splatLife : maxLife) : 0;
        const lo = Math.max(0, Math.floor((t - maxLife - extra - from) * rate)), hi = Math.floor((Math.min(t, to) - from) * rate + 1e-9);
        const cap = to === Infinity ? Infinity : Math.ceil((to - from) * rate);
        for (let j = lo; j <= hi && j < cap; j++) { const p = state(nBurst + j, t); if (p) out.push(p); }
      }
      return out;
    },
    spawn, pos,
  };
}
// shape ids understood by the GL particle shader (vk.gl.particles)
export const SHAPES = { drop: 0, splat: 1, mist: 2, petal: 3, spark: 4, dot: 5 };
export const PRESETS = {
  // ink flicked off a brush: dense drops, fall, splat on the floor and soak in
  inkDrops: { angle: -80, spread: 80, speed: [260, 620], gravity: 1100, drag: .7, life: [1.4, 2.2], size: [3, 11], alpha: [.75, 1], splat: 2.4, soak: 6, splatLife: 30, splatFade: .02, shape: 'drop', color: '#1f2529', n: 26 },
  // top-down splatter around an impact (paper seen from above): drops fly out, slow down and soak in where they stop
  splatter: { angle: 0, spread: 360, speed: [120, 900], drag: 5, life: [.12, .3], landAt: [.08, .26], size: [1.5, 7], alpha: [.8, 1], splat: 1.8, soak: 8, splatLife: 60, splatFade: .01, shape: 'drop', color: '#1f2529', n: 60, fadeIn: .001 },
  // water spray: many fine pale droplets, strong drag, fade out
  spray: { angle: -90, spread: 120, speed: [120, 520], gravity: 700, drag: 2.2, life: [.6, 1.3], size: [1.5, 5], alpha: [.45, .9], fadeOut: .6, shape: 'mist', color: '#f4f6ee', n: 90 },
  // falling petals: slow, swaying, spinning
  petals: { angle: 90, spread: 30, speed: [20, 60], gravity: 30, drag: 1.2, life: [5, 8], size: [9, 16], sway: 38, swayFreq: .6, spin: [-120, 120], rot: [0, 360], fadeIn: .4, fadeOut: .2, shape: 'petal', color: '#d0675f', color2: '#f3e3da' },
  // sparks: fast, short, additive glow
  sparks: { angle: -90, spread: 360, speed: [150, 520], gravity: 260, drag: 3, life: [.35, .9], size: [2, 5], grow: .4, shape: 'spark', color: '#f2c45a', blend: 'add', n: 60 },
  // slow drifting mist motes
  mist: { angle: -90, spread: 60, speed: [8, 25], gravity: -4, drag: .2, life: [4, 7], size: [30, 70], alpha: [.12, .25], sway: 30, swayFreq: .25, fadeIn: .3, fadeOut: .4, shape: 'mist', color: '#f4f4ea' },
};
