// Motion-graphics maths (vk.mg): pure, DOM-free functions shared by the painters, text fx, transitions and the
// capture pipeline. Every function is a function of its arguments only (time in, numbers out) — unit tested in Node.
import { EASE } from '../../core/ease.js';
import { clamp, clamp01, lerp } from '../../core/time.js';
import { hash } from '../../core/random.js';

const TAU = Math.PI * 2;
export const P = (t, s, d) => clamp01((t - s) / (d || 1e-9));   // 0 before s, 1 after s + d

/* ---------------- sub-frame motion blur ---------------- */
// shutter: seconds (number), '1/40' (s), '180deg' / '180°' (shutter angle at fps), '25ms'; 0 / 'off' / false → 0
export function parseShutter(v, fps = 30) {
  if (v == null || v === false || v === 'off' || v === 'none') return 0;
  if (typeof v === 'number') return v > 0 ? v : 0;
  const s = String(v).trim();
  let m = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s); if (m) return +m[2] ? +m[1] / +m[2] : 0;
  m = /^(\d+(?:\.\d+)?)\s*(?:deg|°)$/.exec(s); if (m) return (+m[1] / 360) / fps;
  m = /^(\d+(?:\.\d+)?)\s*ms$/.exec(s); if (m) return +m[1] / 1000;
  const n = parseFloat(s); return n > 0 ? n : 0;
}
// {shutter, samples, phase} | true | '1/40' → normalised config, or null when blur is off (samples < 2 or no shutter)
export function motionBlurCfg(o, fps = 30) {
  if (!o) return null;
  if (o === true) o = {};
  else if (typeof o !== 'object') o = { shutter: o };
  const shutter = parseShutter(o.shutter != null ? o.shutter : '1/40', fps), samples = Math.max(1, Math.round(+o.samples || 4));
  if (!(shutter > 0) || samples < 2) return null;
  return { shutter, samples, phase: clamp01(+o.phase || 0) };
}
// the N sample times of frame time t: evenly spread over the shutter window. phase 0 = trailing window
// (t − shutter, t] (the frame shows where things end up, like a film camera's open shutter ending at t),
// .5 = centred. Times are clamped at 0; the last sample (phase 0) is exactly t.
export function subTimes(t, shutter, samples, phase = 0) {
  if (!(shutter > 0) || !(samples >= 2)) return [t];
  return Array.from({ length: samples }, (_, k) => Math.max(0, t + shutter * (k / (samples - 1) - (1 - phase))));
}
// running-average weights: drawing sample k with alpha 1/(k+1) over the previous ones == equal weights 1/N
export const accumAlpha = k => 1 / (k + 1);

/* ---------------- cover transitions (stripes / bars) ---------------- */
// Staggered colour bars drawn above both scenes. Times are in seconds inside the transition window [0, d]; the
// cut (outgoing → incoming swap under the cover) is at tc = d·at. Bar i travels in over `travel` seconds (outExpo),
// the last bar arriving exactly at the cut, then leaves (inExpo) in the same direction, staggered the other way.
// mode 'slide': o = bar offset in frame units (−1 off-screen before, 0 covering, +1 gone);
// mode 'grow' : bar length grows from the leading edge (0→1) and then shrinks towards the far edge.
// Returns { cut, bars: [{ i, a, b }] } with a/b = covered span along the travel axis in 0..1 (only visible bars).
export function coverBars(local, d, o = {}) {
  const n = Math.max(1, o.n || 6), at = o.at != null ? o.at : .5, tc = d * at, st = o.stagger != null ? o.stagger : Math.min(.018, d / (4 * n));
  const tin = o.travel || Math.max(.04, Math.min(tc, d - tc) - st * (n - 1));
  const ein = EASE[o.easeIn || 'outExpo'] || EASE.outExpo, eout = EASE[o.easeOut || 'inExpo'] || EASE.inExpo;
  const bars = [];
  for (let i = 0; i < n; i++) {
    const j = o.reverse ? n - 1 - i : i;
    const pin = P(local, tc - tin - st * (n - 1 - j), tin), pout = P(local, tc + st * j, tin);
    let a, b;
    if (pout > 0) { const e = eout(pout); if (e >= 1 - 1e-6) continue; [a, b] = o.mode === 'grow' ? [e, 1] : [e, 1 + e]; }
    else if (pin > 0) { const e = ein(pin); if (e <= 1e-6) continue; [a, b] = o.mode === 'grow' ? [0, e] : [e - 1, e]; }
    else continue;
    bars.push({ i, a: clamp(a, 0, 1), b: clamp(b, 0, 1) });
  }
  return { cut: tc, bars: bars.filter(x => x.b > x.a) };
}
// 'x' = horizontal bars (stacked rows travelling along x); 'y' = vertical columns travelling along y.
// axis 'alt' alternates per transition index (odd → x), like the reference reel.
export const coverAxis = (axis, index = 0) => (axis === 'x' || axis === 'y' ? axis : index % 2 ? 'x' : 'y');
// pixel rects for coverBars() on a W×H frame (1 px overlap so neighbours never show a seam)
export function coverRects(bars, n, axis, W, H) {
  return bars.map(({ i, a, b }) => axis === 'x'
    ? { i, x: a * W - 1, y: i * H / n - 1, w: (b - a) * W + 2, h: H / n + 2 }
    : { i, x: i * W / n - 1, y: a * H - 1, w: W / n + 2, h: (b - a) * H + 2 });
}

/* ---------------- shapes for beat-locked morphs ---------------- */
// polygon vertices (unit radius, first vertex at the top) for a named kind
export function shapeVerts(kind, o = {}) {
  const top = -Math.PI / 2;
  const ngon = (k, R = 1, rot = top) => Array.from({ length: k }, (_, i) => { const a = rot + i / k * TAU; return [Math.cos(a) * R, Math.sin(a) * R]; });
  switch (kind) {
    case 'square': return ngon(4, o.r || 1.15, top + Math.PI / 4);
    case 'diamond': return ngon(4, o.r || 1.15);
    case 'triangle': return ngon(3, o.r || 1.25);
    case 'hexagon': return ngon(6, o.r || 1.05);
    case 'polygon': return ngon(o.sides || 5, o.r || 1.1);
    case 'star': { const k = o.points || 5, inner = o.inner || .45, v = []; for (let i = 0; i < k * 2; i++) { const a = top + i / (k * 2) * TAU, r = i % 2 ? inner : 1; v.push([Math.cos(a) * r, Math.sin(a) * r]); } return v; }
    default: return null;
  }
}
// N points evenly spaced by arc length along a closed polygon (starting at its first vertex)
export function outlinePoints(verts, N = 120) {
  const segs = []; let L = 0;
  for (let i = 0; i < verts.length; i++) { const a = verts[i], b = verts[(i + 1) % verts.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, d]); L += d; }
  const out = [];
  for (let k = 0; k < N; k++) {
    let s = k / N * L, i = 0;
    while (s > segs[i][2] && i < segs.length - 1) { s -= segs[i][2]; i++; }
    const [a, b, d] = segs[i], u = d ? s / d : 0; out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
  }
  return out;
}
// unit outline with N points for kind (circle, square, diamond, triangle, hexagon, polygon, star); any two outlines
// with the same N interpolate point by point without twisting (all start at the top and run clockwise)
export function shapeOutline(kind, N = 120, o = {}) {
  const v = kind === 'circle' ? null : shapeVerts(kind, o);
  if (v) return outlinePoints(startAtTop(v), N);
  return Array.from({ length: N }, (_, i) => { const a = -Math.PI / 2 + i / N * TAU; return [Math.cos(a), Math.sin(a)]; });
}
// rotate a clockwise polygon so it starts where it crosses the upward ray from the centre (x = 0, y < 0)
function startAtTop(v) {
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length];
    if (Math.abs(a[0]) < 1e-12 && a[1] < 0) return v.slice(i).concat(v.slice(0, i));
    if (a[0] < 0 && b[0] > 0) { const u = -a[0] / (b[0] - a[0]), y = lerp(a[1], b[1], u); if (y < 0) return [[0, y]].concat(v.slice(i + 1), v.slice(0, i + 1)); }
  }
  return v;
}
export const lerpPts = (A, B, p) => A.map((a, i) => [lerp(a[0], B[i][0], p), lerp(a[1], B[i][1], p)]);
// beat-locked morph state at beat position bp (fractional beats since the sequence start):
// step k = floor(bp) (clamped to the last shape), morph progress m inside the step (outBack over `d` beats)
export function morphState(bp, n, o = {}) {
  const k = clamp(Math.floor(bp + 1e-9), 0, n - 1), lb = bp - k, d = o.d || .75;   // morph length in beats
  const m = k === 0 ? 1 : (EASE[o.ease || 'outBack'] || EASE.outBack)(P(lb, 0, d));
  return { k, from: Math.max(0, k - 1), m, lb };
}

/* ---------------- dot-grid wave ---------------- */
// dot radius + hue at grid point (x, y), time t, beat age ba (s since the last beat). Radial sine travelling out from
// (cx, cy), a ring that pulses outwards on every beat, an intro envelope and a soft rectangular "text hole".
export function dotwaveAt(x, y, t, ba, o = {}) {
  const cx = o.cx != null ? o.cx : 960, cy = o.cy != null ? o.cy : 540, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
  const env = o.env != null ? o.env : 1;
  const w = Math.sin(d * (o.freq || .011) - t * (o.speed || 8.5));
  const rB = ba * (o.ringSpeed || 1500), sw = Math.exp(-Math.pow((d - rB) / (o.ringW || 90), 2));
  const hole = o.hole ? clamp01((Math.max(Math.abs(dx - (o.hole.x || 0)) - o.hole.w / 2, Math.abs(dy - (o.hole.y || 0)) - o.hole.h / 2)) / (o.hole.soft || 90)) : 1;
  const size = ((o.base != null ? o.base : 3) + (o.amp != null ? o.amp : 15) * Math.max(0, w) * env + (o.ringAmp != null ? o.ringAmp : 24) * sw * env) * hole * env;
  const hue = (((o.hue != null ? o.hue : 250) + d * (o.hueSpread != null ? o.hueSpread : .12) - t * (o.hueSpeed != null ? o.hueSpeed : 140) + w * 25) % 360 + 360) % 360;
  return { size, hue, w, ring: sw };
}

/* ---------------- text motion ---------------- */
// letter drop with squash & stretch: falls from `from` px above (outBack overshoot = the bounce), tall and narrow
// while falling (sy 1.5, sx .8) and settling to 1:1
export function letterDrop(p, o = {}) {
  const e = EASE.outBack(clamp01(p)), c = EASE.outCubic(clamp01(p));
  return { y: lerp(-(o.from != null ? o.from : 800), 0, e), sx: lerp(o.sx != null ? o.sx : .8, 1, c), sy: lerp(o.sy != null ? o.sy : 1.5, 1, c) };
}
// slam-in: big scale + rotation + side offset collapsing onto the final pose (outExpo)
export function slam(p, o = {}) {
  const e = EASE[o.ease || 'outExpo'](clamp01(p)), dir = o.dir || 1;
  return { s: lerp(o.scale != null ? o.scale : 2.8, 1, e), rot: dir * lerp(o.rot != null ? o.rot : 20, 0, e), x: dir * lerp(o.x || 0, 0, e), y: lerp(o.y || 0, 0, e), a: clamp01(p * (o.fadeK || 8)) };
}
// echo / ghost trail: n copies behind the glyph, each a bit bigger and fainter, fading out as p → 1
export function echoGhosts(p, o = {}) {
  const n = o.n || 3, q = 1 - clamp01(p), out = [];
  if (q <= 0) return out;
  for (let g = n; g >= 1; g--) out.push({ g, s: 1 + g * (o.step != null ? o.step : .16) * q, a: (o.alpha != null ? o.alpha : .15) * q, dx: (o.dx || 0) * g * q, dy: (o.dy || 0) * g * q });
  return out;
}
// hard offset shadow growing from 0 to (dx, dy) with the entrance
export const hardShadow = (p, dx = 10, dy = 10) => { const e = EASE.outCubic(clamp01(p)); return { dx: dx * e, dy: dy * e }; };
// mask-rise: glyph rises from below a clip line (offset in em, 1.2 → 0), outExpo
export const maskRise = (p, from = 1.15) => lerp(from, 0, EASE.outExpo(clamp01(p)));

/* ---------------- UI micro-interactions ---------------- */
// cursor path: keys [[t, x, y], …] with inOutCubic moves between keys; holds before the first / after the last
export function cursorAt(keys, t) {
  if (!keys.length) return [0, 0];
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], p = EASE.inOutCubic(P(t, a[0], b[0] - a[0])); return [lerp(a[1], b[1], p), lerp(a[2], b[2], p)]; }
  const l = keys[keys.length - 1]; return [l[1], l[2]];
}
// click press scale: shrinks to `s` from 20 ms before each click time until `hold` after it
export const pressAt = (clicks, t, s = .88, hold = .08) => (clicks.some(c => t > c - .02 && t < c + hold) ? s : 1);
// toggle knob: travel x 0..1 (outBack overshoot) and squash (stretch along the travel, conserving area)
export function toggleKnob(p) { const q = clamp01(p), sq = 1 + .25 * Math.sin(Math.PI * q); return { x: EASE.outBack(q), sx: sq, sy: 1 / Math.sqrt(sq) }; }
// like button: damped "boing" scale after the click (0 before), colour mix 0..1 and burst-line progress
export function likePop(dt) { if (dt < 0) return { s: 1, c: 0, burst: 0 }; const p = dt / .5; return { s: 1 + .5 * Math.exp(-p * 4.5) * Math.cos(p * 10), c: clamp01(p * 6), burst: clamp01(dt / .4) }; }
// equalizer bar heights 0..1 (deterministic sines, per-bar phase)
export const eqLevel = (t, i, o = {}) => (o.min != null ? o.min : .18) + (1 - (o.min != null ? o.min : .18)) * (.5 + .5 * Math.sin(t * (o.speed || 11) + i * (o.phase || 1.1)));

/* ---------------- montage / HUD / lockup ---------------- */
// fast cuts: slot index (clamped to n−1) and time inside the slot for scene-local lt with slot length `every` (s)
export function montageSlot(lt, every, n) { const idx = clamp(Math.floor(lt / every + 1e-9), 0, n - 1); return { idx, ft: lt - idx * every }; }
// MM:SS:FF timecode at fps
export function timecode(t, fps = 30) { const f = Math.floor(t * fps + 1e-6), s = Math.floor(f / fps), m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f % fps).padStart(2, '0')}`; }
// converge: particle i spirals from a seeded far position into the centre as p (0→1, eased inExpo by the caller)
export function convergeAt(i, p, o = {}) {
  const seed = o.seed || 0, a = hash(i + seed) * TAU + p * (o.spin != null ? o.spin : 1.5), d = ((o.near || 900) + hash(i + 50 + seed) * (o.far || 500)) * (1 - p);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, size: lerp((o.size || 46) + hash(i + 9 + seed) * (o.sizeVar || 40), o.end || 4, p), rot: p * 6 + i, kind: i % 3 };
}
// the last `n` beats at time t on a BeatGrid-like grid ({at, index, leadT}): [{ b, age }] (age ≥ 0 s, newest last).
// Uses the grid's lead (visual hits one frame early). every: beat spacing (1 = every beat, .5 = eighths, 4 = bars)
export function recentBeats(grid, t, n = 4, every = 1, from = -Infinity) {
  const tt = t + (grid.leadT || 0), bi = Math.floor(grid.index(tt) / every + 1e-6), out = [];
  for (let k = bi - n + 1; k <= bi; k++) { const tb = grid.at(k * every); if (tb < from - 1e-6) continue; const age = tt - tb; if (age >= 0) out.push({ b: k, age }); }
  return out;
}
