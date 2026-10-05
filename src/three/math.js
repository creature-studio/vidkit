// vk.three pure maths (no THREE, no DOM — unit tested in Node): frame index, sub-frame sample plan (motion blur +
// jittered AA), tone mapping / grading mirrors of the post shaders, Catmull-Rom paths with arc-length
// parameterisation, camera rigs (orbit, dolly/push, flythrough, crane, zoom-of-scale, shake, keyframes, sequences),
// particle target generators and the morph timeline. Every function is a pure function of its arguments (and of t).
import { getEase } from '../core/ease.js';
import { punchEnv } from '../core/camera.js';
import { mulberry32, noise1 } from '../core/random.js';
import { unknownName } from '../core/strict.js';
import { subTimes } from '../fx/mg/math.js';

export const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, p) => a + (b - a) * p;
const ease = e => getEase(e || 'inOutCubic');
export const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s], len: a => Math.hypot(a[0], a[1], a[2]), lerp: (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)], norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) };
const D2R = Math.PI / 180;

/* ---------------- frames & sub-frame plan ---------------- */
// integer frame index of time t (stable for t = i / fps despite float noise): flicker / boil / grain seeds
export const frameIdx = (t, fps = 30) => Math.floor(t * fps + 1e-6);
// radical inverse (Halton) in base b, i ≥ 1
export function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
// sub-pixel AA jitter for sample k of n (pixels, in [-.5, .5)); n = 1 → no jitter
export const jitter = (k, n) => (n <= 1 ? [0, 0] : [halton(k + 1, 2) - .5, halton(k + 1, 3) - .5]);
// the samples a three layer renders for one output frame: n = max(motion-blur samples, aa) sub-times spread over the
// (trailing) shutter window ending at frameT, each with its own AA jitter and an equal weight (Σw = 1)
export function samplePlan(frameT, mb, aa = 1) {
  const n = Math.max(1, Math.round(aa || 1), mb ? mb.samples : 1);
  const ts = mb && mb.shutter > 0 && n > 1 ? subTimes(frameT, mb.shutter, n, mb.phase || 0) : Array(n).fill(frameT);
  return ts.map((t, k) => { const [jx, jy] = jitter(k, n); return { k, t, jx, jy, w: 1 / n }; });
}

/* ---------------- tone mapping & grade (JS mirrors of post.js GLSL) ---------------- */
// three.js ACESFilmicToneMapping (Stephen Hill's RRT+ODT fit, incl. three's exposure / 0.6)
const AIN = [[.59719, .35458, .04823], [.07600, .90834, .01566], [.02840, .13383, .83777]];
const AOUT = [[1.60475, -.53108, -.07367], [-.10208, 1.10813, -.00605], [-.00327, -.07276, 1.07602]];
const mul3 = (M, c) => M.map(r => r[0] * c[0] + r[1] * c[1] + r[2] * c[2]);
const rrt = v => (v * (v + .0245786) - .000090537) / (v * (.983729 * v + .4329510) + .238081);
export function aces(c, exposure = 1) { const x = mul3(AIN, c.map(v => v * exposure / .6)); return mul3(AOUT, x.map(rrt)).map(clamp01); }
export const linearToSrgb = x => (x <= .0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - .055);
export const luma = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
// white balance: temperature (−1 cool … +1 warm) and tint (−1 green … +1 magenta) → RGB gains at constant luminance
export function whiteBalance(temp = 0, tint = 0) { const g = [1 + .18 * temp + .06 * tint, 1 - .12 * tint, 1 - .2 * temp + .06 * tint]; const l = luma(g); return g.map(x => x / l); }
// grade presets ("LUT-ish"): parameters for the display-referred grade in the composite shader
export const GRADES = {
  neutral: {},
  'teal-orange': { temperature: .05, contrast: 1.08, saturation: 1.05, shadows: [0, .022, .04], highlights: [.06, .025, -.02], split: 1 },
  cool: { temperature: -.14, contrast: 1.05, saturation: .97, shadows: [0, .008, .022], split: 1 },
  warm: { temperature: .25, contrast: 1.04, saturation: 1.05, highlights: [.06, .02, -.02], split: 1 },
  bleach: { contrast: 1.18, saturation: .55, lift: [.01, .01, .012] },
  mono: { saturation: 0, contrast: 1.12 },
  cyber: { temperature: -.12, tint: .12, contrast: 1.1, saturation: 1.15, shadows: [.015, 0, .045], highlights: [0, .035, .045], split: 1 },
};
export function gradeParams(g = {}) {
  const known = n => GRADES[n] || (unknownName('grades', n, Object.keys(GRADES)), {});
  const base = typeof g === 'string' ? known(g) : g.preset ? { ...known(g.preset), ...g } : g;
  const w = whiteBalance(base.temperature || 0, base.tint || 0);
  return { wb: w, lift: base.lift || [0, 0, 0], gamma: base.gamma || [1, 1, 1], gain: base.gain || [1, 1, 1], contrast: base.contrast != null ? base.contrast : 1, saturation: base.saturation != null ? base.saturation : 1, shadows: base.shadows || [0, 0, 0], highlights: base.highlights || [0, 0, 0], split: base.split || 0 };
}
// display-referred grade of a tone-mapped colour c ∈ [0,1]³ (same order as the shader)
export function grade(c, p) {
  let x = c.map((v, i) => v * p.wb[i]);
  x = x.map((v, i) => Math.pow(Math.max(0, p.gain[i] * (v + p.lift[i] * (1 - v))), 1 / p.gamma[i]));
  x = x.map(v => (v - .5) * p.contrast + .5);
  const l = luma(x); x = x.map(v => l + (v - l) * p.saturation);
  if (p.split) { const s = (1 - l) * (1 - l), h = l * l; x = x.map((v, i) => v + p.split * (p.shadows[i] * s + p.highlights[i] * h)); }
  return x.map(clamp01);
}

/* ---------------- Catmull-Rom paths ---------------- */
// centripetal Catmull-Rom (Barry–Goldman) point between p1 and p2, u ∈ [0,1]; alpha .5 = centripetal (no cusps)
export function crPoint(p0, p1, p2, p3, u, alpha = .5) {
  const tj = (ti, a, b) => ti + Math.max(1e-6, Math.pow(v3.dist(a, b), alpha));
  const t0 = 0, t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3), t = lerp(t1, t2, u);
  const L = (a, b, ta, tb) => v3.lerp(a, b, (t - ta) / (tb - ta));
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
// path through points (≥ 2) with arc-length parameterisation: at(s) for s ∈ [0,1] moves at constant speed
export function crPath(points, o = {}) {
  const P = points.map(p => p.slice()), closed = !!o.closed, n = P.length, segs = closed ? n : n - 1, alpha = o.alpha != null ? o.alpha : .5;
  const get = i => closed ? P[(i % n + n) % n] : i < 0 ? v3.sub(v3.scale(P[0], 2), P[1]) : i >= n ? v3.sub(v3.scale(P[n - 1], 2), P[n - 2]) : P[i];
  const raw = u => { u = Math.min(Math.max(u, 0), 1); const x = u * segs, i = Math.min(segs - 1, Math.floor(x)); return crPoint(get(i - 1), get(i), get(i + 1), get(i + 2), x - i, alpha); };
  const N = Math.max(64, segs * (o.res || 96)), cum = new Float64Array(N + 1); let prev = raw(0);
  for (let k = 1; k <= N; k++) { const q = raw(k / N); cum[k] = cum[k - 1] + v3.dist(prev, q); prev = q; }
  const total = cum[N] || 1;
  const uOf = s => { const d = clamp01(s) * total; let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; } const span = cum[hi] - cum[lo] || 1; return (lo + (d - cum[lo]) / span) / N; };
  const at = s => raw(uOf(s));
  return { at, raw, uOf, length: total, tangent: (s, e = 1e-3) => v3.norm(v3.sub(at(Math.min(1, s + e)), at(Math.max(0, s - e)))), points: P, closed };
}

/* ---------------- keyframes ---------------- */
// keys [{t, v (number | array), ease}] → value at t (the ease of key i shapes the segment that ends at key i)
export function kfAt(keys, t) {
  if (!keys.length) return undefined;
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t < b.t) { const p = ease(b.ease)((t - a.t) / Math.max(1e-9, b.t - a.t)); return Array.isArray(a.v) ? a.v.map((x, j) => lerp(x, b.v[j], p)) : lerp(a.v, b.v, p); }
  }
  return keys[keys.length - 1].v;
}

/* ---------------- camera rigs: (t) → {pos, target, fov, roll} ---------------- */
// t is the layer-local time in seconds; every rig has o.t (start, default 0) and o.dur (default 1) and o.ease
const prog = (o, t) => ease(o.ease)(clamp01((t - (o.t || 0)) / (o.dur || 1)));
const range = (a, b, p, d) => (a == null ? d : b == null ? a : lerp(a, b, p));
export const rig = {
  // circle around target: angles in degrees (from → to over dur, or speed deg/s), radius / height / elev may animate (r0 → r1)
  orbit(o = {}) {
    const T = o.target || [0, 0, 0];
    return t => {
      const p = prog(o, t), a = (o.speed != null ? (o.from || 0) + o.speed * (t - (o.t || 0)) : range(o.from || 0, o.to, p, 0)) * D2R;
      const r = range(o.radius != null ? o.radius : 5, o.radius2, p), el = o.elev != null || o.elev2 != null ? range(o.elev || 0, o.elev2, p) * D2R : null;
      const h = el != null ? r * Math.sin(el) : range(o.height != null ? o.height : 1, o.height2, p), rh = el != null ? r * Math.cos(el) : r;
      return { pos: [T[0] + Math.sin(a) * rh, T[1] + h, T[2] + Math.cos(a) * rh], target: T.slice(), fov: range(o.fov || 35, o.fov2, p), roll: o.roll || 0 };
    };
  },
  // straight move from → to (positions), looking at target (or from a target pair); fov may animate
  dolly(o = {}) {
    return t => { const p = prog(o, t), tg = o.target2 ? v3.lerp(o.target || [0, 0, 0], o.target2, p) : (o.target || [0, 0, 0]).slice(); return { pos: v3.lerp(o.from, o.to || o.from, p), target: tg, fov: range(o.fov || 35, o.fov2, p), roll: range(o.roll || 0, o.roll2, p) }; };
  },
  // push-in / pull-out along the view direction: distance d0 → d1 from target, direction dir (from target to camera)
  push(o = {}) {
    const T = o.target || [0, 0, 0], dir = v3.norm(o.dir || [0, .25, 1]);
    return t => { const p = prog(o, t), d = range(o.from != null ? o.from : 6, o.to != null ? o.to : 4, p); return { pos: v3.add(T, v3.scale(dir, d)), target: T.slice(), fov: range(o.fov || 35, o.fov2, p), roll: 0 }; };
  },
  // flythrough along a Catmull-Rom path (constant speed, eased), looking ahead along the path (or at o.look: point | path points)
  fly(o = {}) {
    const P = crPath(o.points, o), L = o.look && Array.isArray(o.look[0]) ? crPath(o.look, o) : null, ahead = o.ahead != null ? o.ahead : .04;
    return t => {
      const s = prog({ ease: 'linear', ...o }, t), pos = P.at(s);
      let target = L ? L.at(s) : o.look ? o.look.slice() : null;
      if (!target) { const q = P.at(Math.min(1, s + ahead)); target = s + ahead <= 1 ? q : v3.add(pos, P.tangent(s)); }
      let roll = 0;
      if (o.bank) { const t0 = P.tangent(Math.max(0, s - .02)), t1 = P.tangent(Math.min(1, s + .02)); roll = -o.bank * (t0[0] * t1[2] - t0[2] * t1[0]) * 25; }
      return { pos, target, fov: range(o.fov || 40, o.fov2, s), roll };
    };
  },
  // crane: rise (or drop) from y0 to y1 at radius around the target while the aim point tilts from aim0 to aim1 (heights)
  crane(o = {}) {
    const T = o.target || [0, 0, 0];
    return t => {
      const p = prog(o, t), a = range(o.angle || 0, o.angle2, p) * D2R, r = range(o.radius || 6, o.radius2, p), y = range(o.y0 != null ? o.y0 : .3, o.y1 != null ? o.y1 : 4, p);
      return { pos: [T[0] + Math.sin(a) * r, y, T[2] + Math.cos(a) * r], target: [T[0], range(o.aim0 != null ? o.aim0 : T[1], o.aim1 != null ? o.aim1 : T[1], p), T[2]], fov: range(o.fov || 35, o.fov2, p), roll: 0 };
    };
  },
  // zoom-of-scale ("powers of ten"): distance from target goes r0 → r1 geometrically (log-linear), so every second
  // covers the same factor of scale; optional slow spin (deg over the move) and fov
  zoomScale(o = {}) {
    const T = o.target || [0, 0, 0], dir = v3.norm(o.dir || [0, .3, 1]), r0 = o.from || 100, r1 = o.to || 1;
    return t => {
      const p = prog({ ease: 'inOutSine', ...o }, t), r = Math.exp(lerp(Math.log(r0), Math.log(r1), p)), a = (o.spin || 0) * p * D2R;
      const d = [dir[0] * Math.cos(a) + dir[2] * Math.sin(a), dir[1], -dir[0] * Math.sin(a) + dir[2] * Math.cos(a)];
      return { pos: v3.add(T, v3.scale(d, r)), target: T.slice(), fov: range(o.fov || 35, o.fov2, p), roll: 0, scale: r };
    };
  },
  // camera keyframes [{t, pos, target, fov, roll, ease}]
  keys(list) {
    const K = f => list.filter(k => k[f] != null).map(k => ({ t: k.t, v: k[f], ease: k.ease }));
    const kp = K('pos'), kt = K('target'), kf = K('fov'), kr = K('roll');
    return t => ({ pos: kfAt(kp, t), target: kt.length ? kfAt(kt, t) : [0, 0, 0], fov: kf.length ? kfAt(kf, t) : 35, roll: kr.length ? kfAt(kr, t) : 0 });
  },
  // sequence of rigs: [{t, rig, blend (s, crossfade into this rig; 0 = cut)}]; each rig gets time relative to its own start
  // when {local: true}, else the layer time
  seq(list, o = {}) {
    const L = list.slice().sort((a, b) => a.t - b.t);
    const at = (e, t) => e.rig(o.local ? t - e.t : t);
    return t => {
      let i = 0; for (let j = 0; j < L.length; j++) if (t >= L[j].t) i = j;
      const cur = at(L[i], t), b = L[i].blend || 0;
      if (i > 0 && b > 0 && t < L[i].t + b) return lerpCam(at(L[i - 1], t), cur, smooth((t - L[i].t) / b));
      return cur;
    };
  },
  // additive handheld shake: amp (world units), rot (deg roll), freq (Hz), seed; window [t0, t1] with fade, or env(t) → 0..1
  shake(o = {}) {
    const f = o.freq || 6, A = o.amp != null ? o.amp : .03, R = o.rot != null ? o.rot : .4, s = (o.seed || 1) * 17.13;
    return t => {
      let e = o.env ? o.env(t) : 1;
      if (o.at) { const [a, b] = o.at, fd = o.fade != null ? o.fade : .25; e *= smooth((t - a) / fd) * smooth((b - t) / fd); }
      if (!e) return { dpos: [0, 0, 0], droll: 0 };
      const n = k => (noise1(t * f + s + k * 31.7) - .5) * 2 + .5 * (noise1(t * f * 2.3 + s + k * 57.1) - .5);
      return { dpos: [n(0) * A * e, n(1) * A * e, n(2) * A * e * .5], droll: n(3) * R * e };
    };
  },
  // punch-in (fov kick) at times [t…] with vk.cam's punch envelope (attack, decay k, duration d)
  punch(o = {}) { const ts = [].concat(o.t != null ? o.t : o.times || []); return t => ({ fovMul: 1 - (o.amount != null ? o.amount : .08) * ts.reduce((m, t0) => Math.max(m, punchEnv(t, t0, o)), 0) }); },
  // base rig + modifiers (shake / punch …)
  add(base, ...mods) {
    return t => {
      const s = { ...base(t) }; s.pos = s.pos.slice(); s.target = s.target.slice();
      for (const m of mods) { const d = m(t); if (d.dpos) { s.pos = v3.add(s.pos, d.dpos); s.target = v3.add(s.target, v3.scale(d.dpos, .6)); } if (d.droll) s.roll = (s.roll || 0) + d.droll; if (d.fovMul) s.fov *= d.fovMul; }
      return s;
    };
  },
};
export function lerpCam(a, b, p) { return { pos: v3.lerp(a.pos, b.pos, p), target: v3.lerp(a.target, b.target, p), fov: lerp(a.fov || 35, b.fov || 35, p), roll: lerp(a.roll || 0, b.roll || 0, p) }; }

/* ---------------- particle targets (Float32Array xyz [+ rgb]) ---------------- */
// spiral galaxy: arms, radius, thickness, twist (radians per unit radius), core fraction; colours core → rim
export function galaxy(n, o = {}, rand = mulberry32(o.seed || 7)) {
  const arms = o.arms || 3, R = o.radius || 4, th = o.thickness != null ? o.thickness : .12, tw = o.twist != null ? o.twist : 1.6, core = o.core != null ? o.core : .22;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c0 = o.colors ? o.colors[0] : [1.6, 1.1, .7], c1 = o.colors ? o.colors[1] : [.35, .55, 1.6];
  for (let i = 0; i < n; i++) {
    const inCore = rand() < core, r = inCore ? Math.pow(rand(), 2) * R * .25 : Math.pow(rand(), .7) * R;
    const arm = Math.floor(rand() * arms), spread = (rand() - .5) * (inCore ? Math.PI * 2 : .5 + .9 * r / R), a = arm / arms * Math.PI * 2 + r * tw + spread;
    const y = (rand() - .5) * th * (1.6 - r / R) * (inCore ? 2.4 : 1) + (rand() - .5) * .02;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r;
    const k = clamp01(r / R + (rand() - .5) * .2); for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(c0[j], c1[j], k);
  }
  return { pos, col, n };
}
// (fibonacci) sphere of radius r: shell (default) or volume (o.volume)
export function sphere(n, o = {}, rand = mulberry32(o.seed || 3)) {
  const R = o.radius || 2, pos = new Float32Array(n * 3), ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - 2 * (i + .5) / n, rr = Math.sqrt(1 - y * y), a = i * ga, k = o.volume ? Math.cbrt(rand()) : 1 + (rand() - .5) * (o.jitter != null ? o.jitter : .03);
    pos[i * 3] = Math.cos(a) * rr * R * k; pos[i * 3 + 1] = y * R * k; pos[i * 3 + 2] = Math.sin(a) * rr * R * k;
  }
  return { pos, col: o.color ? fill(n, o.color) : null, n };
}
// torus knot-ish ring cloud (radius R, tube r)
export function torus(n, o = {}, rand = mulberry32(o.seed || 5)) {
  const R = o.radius || 2.2, r = o.tube || .5, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = rand() * Math.PI * 2, v = rand() * Math.PI * 2, rr = r * Math.sqrt(rand()); pos[i * 3] = (R + rr * Math.cos(v)) * Math.cos(u); pos[i * 3 + 1] = rr * Math.sin(v); pos[i * 3 + 2] = (R + rr * Math.cos(v)) * Math.sin(u); }
  return { pos, col: o.color ? fill(n, o.color) : null, n };
}
// random cloud in a box (scatter / "dust" state)
export function cloud(n, o = {}, rand = mulberry32(o.seed || 11)) {
  // box of size [x, y, z] (default 12 × 7 × 8), or o.radius → a 2r × 1.2r × 2r box
  const s = o.size || (o.radius ? [2 * o.radius, 1.2 * o.radius, 2 * o.radius] : [12, 7, 8]), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (rand() - .5) * s[0]; pos[i * 3 + 1] = (rand() - .5) * s[1]; pos[i * 3 + 2] = (rand() - .5) * s[2]; }
  return { pos, col: o.color ? fill(n, o.color) : null, n };
}
function fill(n, c) { const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } return a; }
// sample n points from an RGBA pixel buffer (canvas getImageData), weighted by alpha·luma (o.by 'alpha' | 'luma' |
// 'both') plus o.edge × gradient magnitude (crisp outlines). Stratified inverse-CDF sampling → exactly n points, even
// coverage. World mapping: width units across, centred; depth = z spread. colours from the pixels (linearised) unless o.color.
export function sampleMask(data, w, h, n, o = {}, rand = mulberry32(o.seed || 13)) {
  const by = o.by || 'alpha', thr = o.threshold != null ? o.threshold : .08, edge = o.edge || 0, N = w * h, wt = new Float64Array(N);
  const a = i => data[i * 4 + 3] / 255, l = i => (.2126 * data[i * 4] + .7152 * data[i * 4 + 1] + .0722 * data[i * 4 + 2]) / 255 * a(i);
  const val = by === 'luma' ? l : by === 'both' ? (i => a(i) * Math.max(.15, l(i) / Math.max(1e-3, a(i)))) : a;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = val(i); if (v < thr) v = 0;
    if (edge && v > 0) { const gx = x > 0 && x < w - 1 ? val(i + 1) - val(i - 1) : 0, gy = y > 0 && y < h - 1 ? val(i + w) - val(i - w) : 0; v += edge * Math.hypot(gx, gy); }
    wt[i] = v;
  }
  const cdf = new Float64Array(N); let s = 0; for (let i = 0; i < N; i++) { s += wt[i]; cdf[i] = s; }
  const width = o.width || 8, height = width * h / w, depth = o.depth != null ? o.depth : .15;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), lin = c => Math.pow(c / 255, 2.2);
  if (s <= 0) return { pos, col, n, empty: true };
  for (let k = 0; k < n; k++) {
    const u = (k + rand()) / n * s; let lo = 0, hi = N - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m + 1; else hi = m; }
    const x = lo % w + rand(), y = Math.floor(lo / w) + rand();
    pos[k * 3] = (x / w - .5) * width; pos[k * 3 + 1] = -(y / h - .5) * height; pos[k * 3 + 2] = (rand() - .5) * depth;
    if (o.color) { col[k * 3] = o.color[0]; col[k * 3 + 1] = o.color[1]; col[k * 3 + 2] = o.color[2]; }
    else { const g = o.gain || 1; col[k * 3] = lin(data[lo * 4]) * g; col[k * 3 + 1] = lin(data[lo * 4 + 1]) * g; col[k * 3 + 2] = lin(data[lo * 4 + 2]) * g; }
  }
  // shuffle the order (seeded): stratified samples run in scanline order, and the morph pairs particle i of every target
  for (let k = n - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); for (let q = 0; q < 3; q++) { let t = pos[k * 3 + q]; pos[k * 3 + q] = pos[j * 3 + q]; pos[j * 3 + q] = t; t = col[k * 3 + q]; col[k * 3 + q] = col[j * 3 + q]; col[j * 3 + q] = t; } }
  return { pos, col, n };
}
// morph timeline: keys [{t, to, d, style, ease}] (the first key = the initial shape, no d). At t → {a, b, p, style, i}
// (a/b are target names; p eased 0..1; before a key's start the previous shape is held)
export function morphAt(keys, t) {
  let i = 0; for (let j = 0; j < keys.length; j++) if (t >= keys[j].t) i = j;
  const k = keys[i];
  if (i === 0) return { a: k.to, b: k.to, p: 1, raw: 1, style: 'none', i, k };
  const raw = clamp01((t - k.t) / (k.d || 1));
  return { a: keys[i - 1].to, b: k.to, p: ease(k.ease || 'inOutCubic')(raw), raw, style: k.style || 'converge', i, k };
}
export { mulberry32, noise1, punchEnv };
