// 2D silhouettes for paper-cut / pop-up / diorama layers. Pure (no THREE, no DOM): every generator returns
// {outer: [[x, y], …], holes: [[[x, y], …], …]} in world units (y up), deterministic from its options and seed.
//   ridge  hills  mountains  waves  forest  city  pine  tree  house  pagoda  cloud  circle  crescent  star  bird  boat
//   grass  rect  path (SVG path data: M L H V Q C S T Z, absolute + relative)
// vk.three.shapes.<name>(o) → shape; vk.three.diorama turns shapes into extruded paper.
import { mulberry32, noise1 } from '../core/random.js';
import { unknownName } from '../core/strict.js';

const TAU = Math.PI * 2;
const P = (outer, holes = []) => ({ outer, holes });
// value noise in [0,1] with octaves (seeded by offset)
const fbm1 = (x, oct, seed) => { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * noise1(x * f + seed * 13.37 + i * 71.3); n += a; a *= .5; f *= 2.03; } return s / n; };
// ridge line: y(x) over [-w/2, w/2], filled down to base. sharp > 0 → ridged (|noise|) peaks
export function ridge(o = {}) {
  const w = o.width || 10, base = o.base != null ? o.base : -2.5, h = o.height != null ? o.height : 1, amp = o.amp != null ? o.amp : .8, fr = o.freq || .6, seed = o.seed || 1, oct = o.octaves || 4, n = o.res || 120, sharp = o.sharp || 0;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + w * i / n; let v = fbm1(x * fr, oct, seed);
    if (sharp) { const r = 1 - Math.abs(v * 2 - 1); v = v * (1 - sharp) + r * r * sharp; }
    let y = h + (v - .5) * 2 * amp;
    if (o.peaks) for (const pk of o.peaks) y += (pk.h || 1) * Math.exp(-((x - (pk.x || 0)) ** 2) / (2 * (pk.w || 1) ** 2));
    if (o.edge) y = Math.min(y, h + amp * 1.5);
    pts.push([x, y]);
  }
  return P([[w / 2, base], [-w / 2, base], ...pts]);
}
export const hills = (o = {}) => ridge({ octaves: 2, freq: .35, amp: .45, ...o });
export const mountains = (o = {}) => ridge({ octaves: 5, freq: .5, amp: 1.2, sharp: .75, ...o });
// sine waves with a little noise (ocean / river layers); phase shifts the pattern
export function waves(o = {}) {
  const w = o.width || 10, base = o.base != null ? o.base : -2.5, h = o.height != null ? o.height : 0, amp = o.amp != null ? o.amp : .12, k = o.freq || 2.2, ph = o.phase || 0, n = o.res || 160;
  const pts = []; for (let i = 0; i <= n; i++) { const x = -w / 2 + w * i / n; pts.push([x, h + amp * Math.sin(x * k + ph) + amp * .35 * Math.sin(x * k * 2.3 + ph * 1.7 + 1.3)]); }
  return P([[w / 2, base], [-w / 2, base], ...pts]);
}
// a ridge with pine tips standing on it
export function forest(o = {}) {
  const r = mulberry32(o.seed || 3), w = o.width || 10, base = o.base != null ? o.base : -2.5, h = o.height != null ? o.height : 0, gap = o.gap || .35, th = o.tree || .7, n = Math.floor(w / gap);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x0 = -w / 2 + i * gap, s = th * (.6 + .7 * r()), g = gap * (.75 + .25 * r()), y0 = h + (fbm1(x0 * .4, 2, o.seed || 3) - .5) * .5;
    pts.push([x0, y0], [x0 + g * .25, y0 + s * .45], [x0 + g * .15, y0 + s * .45], [x0 + g * .5, y0 + s], [x0 + g * .85, y0 + s * .45], [x0 + g * .75, y0 + s * .45], [x0 + g, y0]);
  }
  const clip = pts.filter(p => p[0] <= w / 2 + gap).map(p => [Math.min(p[0], w / 2), p[1]]);
  return P([[w / 2, base], [-w / 2, base], ...clip]);
}
// skyline of boxes (windows as holes when o.windows)
export function city(o = {}) {
  const r = mulberry32(o.seed || 5), w = o.width || 10, base = o.base != null ? o.base : -2.5, h = o.height != null ? o.height : 0, holes = [];
  const pts = []; let x = -w / 2;
  while (x < w / 2) {
    const bw = (o.minW || .35) + r() * (o.maxW || .6), bh = (o.minH || .3) + r() * (o.maxH || 1.4), x1 = Math.min(w / 2, x + bw);
    pts.push([x, h], [x, h + bh]); if (r() < .25) pts.push([(x + x1) / 2, h + bh + bw * .3]); pts.push([x1, h + bh], [x1, h]);
    if (o.windows) for (let wy = h + .15; wy < h + bh - .15; wy += .22) for (let wx = x + .08; wx < x1 - .12; wx += .16) if (r() < (o.windows === true ? .5 : o.windows)) holes.push([[wx, wy], [wx + .07, wy], [wx + .07, wy + .1], [wx, wy + .1]]);
    x = x1;
  }
  return P([[w / 2, base], [-w / 2, base], ...pts.reverse().reverse()], holes);
}
// pine: stacked triangles on a trunk (height h, width w at the base)
export function pine(o = {}) {
  const h = o.h || 1.4, w = o.w || .7, tiers = o.tiers || 3, tr = o.trunk != null ? o.trunk : .12;
  const th = h * .15, tierH = (h - th) / tiers, right = [[tr / 2, 0], [tr / 2, th]];
  for (let i = 0; i < tiers; i++) { const y = th + i * tierH * .85, ww = w * (1 - i / (tiers + .5)) / 2; right.push([Math.max(ww, tr / 2 + .01), y], [Math.max(ww * .3, tr / 2), y + tierH * .85]); }
  right.pop();
  const left = right.map(([x, y]) => [-x, y]).reverse();
  return P([...right, [0, h], ...left]);
}
// round tree: trunk + lumpy crown
export function tree(o = {}) {
  const h = o.h || 1.3, r = o.r || h * .32, tr = o.trunk || .1, cy = h - r, n = 40, s = o.seed || 2, out = [[tr / 2, 0], [tr / 2, cy - r * .7]];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + .35 + (TAU - .7) * i / n, k = 1 + .12 * Math.sin(a * 5 + s) + .06 * Math.sin(a * 9 + s * 2); out.push([Math.cos(a) * r * k * 1.05, cy + Math.sin(a) * r * k]); }
  out.push([-tr / 2, cy - r * .7], [-tr / 2, 0]);
  return P(out);
}
// house: walls + pitched roof (+ door/window holes)
export function house(o = {}) {
  const w = o.w || 1, h = o.h || .7, rh = o.roof != null ? o.roof : .5, ov = o.overhang != null ? o.overhang : .12;
  const outer = [[-w / 2, 0], [w / 2, 0], [w / 2, h], [w / 2 + ov, h], [0, h + rh], [-w / 2 - ov, h], [-w / 2, h]];
  const holes = o.windows === false ? [] : [[[-w * .32, h * .45], [-w * .12, h * .45], [-w * .12, h * .75], [-w * .32, h * .75]], [[w * .08, 0.001 + h * .0], [w * .28, h * .0 + .001], [w * .28, h * .6], [w * .08, h * .6]].map(([x, y]) => [x, Math.max(y, h * .04)])];
  return P(outer, holes);
}
// pagoda: tiers of flared roofs
export function pagoda(o = {}) {
  const tiers = o.tiers || 3, w = o.w || 1.1, th = o.tierH || .45, out = [];
  let y = 0; const right = [];
  for (let i = 0; i < tiers; i++) { const ww = w * (1 - i * .18) / 2, bw = ww * .62; right.push([bw, y], [bw, y + th * .55], [ww * 1.25, y + th * .5], [ww * .55, y + th * .85]); y += th; }
  right.push([.04, y], [.02, y + th * .6]);
  const left = right.map(([x, yy]) => [-x, yy]).reverse();
  out.push(...right, [0, y + th * .7], ...left);
  return P(out);
}
export function cloud(o = {}) {
  const w = o.w || 1.6, h = o.h || .55, r = mulberry32(o.seed || 9), n = o.puffs || 5, puffs = [];
  for (let i = 0; i < n; i++) { const cx = -w / 2 + w * (i + .5) / n, rr = h * (.5 + .5 * Math.sin(Math.PI * (i + .5) / n)) * (.8 + .4 * r()); puffs.push([cx, rr]); }
  const out = [], m = 64, x0 = -w / 2 - h * .2, x1 = w / 2 + h * .2;
  for (let k = 0; k <= m; k++) { const x = x0 + (x1 - x0) * k / m; let y = 0; for (const [cx, rr] of puffs) { const d = rr * rr - (x - cx) * (x - cx); if (d > 0) y = Math.max(y, Math.sqrt(d)); } out.push([x, y]); }
  return P([[x1, 0], ...out.reverse().filter(p => p[1] > 0), [x0, 0]].reverse());
}
export function circle(o = {}) { const r = o.r || .5, n = o.res || 64, cx = o.x || 0, cy = o.y || 0; return P(Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * TAU) * r, cy + Math.sin(i / n * TAU) * r])); }
export function crescent(o = {}) { const r = o.r || .5, k = o.cut != null ? o.cut : .35, n = 48, out = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI * i / n; out.push([Math.cos(a) * r, Math.sin(a) * r]); } for (let i = n; i >= 0; i--) { const a = -Math.PI / 2 + Math.PI * i / n; out.push([Math.cos(a) * r * k, Math.sin(a) * r * .98]); } return P(out); }
export function star(o = {}) { const r = o.r || .5, ri = o.inner || r * .45, n = o.points || 5, out = []; for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? ri : r; out.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return P(out); }
export function bird(o = {}) { const s = o.s || .3, f = o.flap != null ? o.flap : .5; const up = s * (.15 + .4 * f); return P([[-s, up], [-s * .45, s * .05 + up * .3], [0, 0], [s * .45, s * .05 + up * .3], [s, up], [s * .5, -s * .02 + up * .1], [0, -s * .12], [-s * .5, -s * .02 + up * .1]]); }
export function boat(o = {}) { const w = o.w || 1.2, h = o.h || .25, m = o.mast != null ? o.mast : .9; const out = [[-w / 2, h], [-w * .35, 0], [w * .35, 0], [w / 2, h], [w * .05, h], [w * .05, h + m], [w * .38, h + m * .2], [w * .05, h + m * .15], [w * .02, h]]; return P(out); }
export function grass(o = {}) {
  const w = o.width || 3, n = o.blades || 24, hh = o.h || .3, r = mulberry32(o.seed || 4), out = [[w / 2, -.05], [-w / 2, -.05]];
  for (let i = 0; i < n; i++) { const x = -w / 2 + w * (i + .5) / n, bw = w / n * .5, bh = hh * (.5 + .8 * r()), lean = (r() - .5) * bw * 2; out.push([x - bw, 0], [x + lean, bh], [x + bw, 0]); }
  return P(out);
}
export function rect(o = {}) { const w = o.w || 1, h = o.h || 1, x = o.x || 0, y = o.y || 0; return P([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + h], [x - w / 2, y + h]]); }
// SVG path data → shape(s): the first closed subpath is the outer contour, later ones become holes (o.scale, o.flipY default true)
export function path(o = {}) {
  const d = typeof o === 'string' ? o : o.d, sc = (typeof o === 'object' && o.scale) || 1, flip = typeof o === 'object' && o.flipY === false ? 1 : -1, res = (typeof o === 'object' && o.res) || 12;
  const toks = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0;
  const subs = []; let cur = null;
  const num = () => +toks[i++], push = (px, py) => cur.push([px * sc, py * sc * flip]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; cur = []; subs.push(cur); push(x, y); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') { x = ox + num(); y = oy + num(); push(x, y); }
    else if (C === 'H') { x = ox + num(); push(x, y); }
    else if (C === 'V') { y = oy + num(); push(x, y); }
    else if (C === 'Q' || C === 'T') { let qx, qy; if (C === 'Q') { qx = ox + num(); qy = oy + num(); } else { qx = 2 * x - cx; qy = 2 * y - cy; } const ex = ox + num(), ey = oy + num(); for (let k = 1; k <= res; k++) { const t = k / res, u = 1 - t; push(u * u * x + 2 * u * t * qx + t * t * ex, u * u * y + 2 * u * t * qy + t * t * ey); } cx = qx; cy = qy; x = ex; y = ey; continue; }
    else if (C === 'C' || C === 'S') { let ax, ay; if (C === 'C') { ax = ox + num(); ay = oy + num(); } else { ax = 2 * x - cx; ay = 2 * y - cy; } const bx = ox + num(), by = oy + num(), ex = ox + num(), ey = oy + num(); for (let k = 1; k <= res; k++) { const t = k / res, u = 1 - t; push(u * u * u * x + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * ex, u * u * u * y + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * ey); } cx = bx; cy = by; x = ex; y = ey; continue; }
    else if (C === 'Z') { x = sx; y = sy; }
    else throw new Error('[vk.three.shapes] unsupported path command ' + cmd);
    cx = x; cy = y;
  }
  const clean = subs.filter(s => s.length > 2);
  if (!clean.length) throw new Error('[vk.three.shapes] empty path');
  return P(clean[0], clean.slice(1));
}
export const SHAPES = { ridge, hills, mountains, waves, forest, city, pine, tree, house, pagoda, cloud, circle, crescent, star, bird, boat, grass, rect, path };
export const SHAPE_NAMES = Object.keys(SHAPES);
// 'name' | {shape: 'name', …opts} | {outer, holes} | [[x,y]…] | fn(o) → {outer, holes}
export function shapeOf(spec, extra = {}) {
  if (!spec) throw new Error('[vk.three.shapes] missing shape');
  if (Array.isArray(spec)) return P(spec);
  if (typeof spec === 'function') return spec(extra);
  if (typeof spec === 'string') { if (/^[Mm][\s\d.-]/.test(spec)) return path({ d: spec, ...extra }); const f = SHAPES[spec] || unknownName('shapes', spec, SHAPE_NAMES, { fatal: true }); return f(extra); }
  if (spec.outer) return spec;
  if (spec.d) return path(spec);
  const { shape, ...rest } = spec; return shapeOf(shape, { ...rest, ...extra });
}
// bounds of a shape: {minX, maxX, minY, maxY}
export function bounds(s) { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const [x, y] of s.outer) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > d) d = y; } return { minX: a, maxX: b, minY: c, maxY: d }; }
