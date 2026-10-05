// Pure 2D geometry for style packs: polygons as [[x, y], …], seeded noise only (DOM-free, testable in node).
// Characters and world props are described as polygons with a colour role; a style's material decides how they are
// painted (cut paper, ink wash, translucent leather, neon line, crayon …).
import { hash, noise1 } from '../core/random.js';

const TAU = Math.PI * 2;
export const r1 = x => Math.round(x * 10) / 10;
export const rnd = (seed, i) => hash(seed * 7.31 + i * 1.618 + .5);

// ---- primitives ----
export function ellipse(cx, cy, rx, ry = rx, rot = 0, n = 28) {
  const c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180), out = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
// tapered limb outline from (x0, y0) radius r0 to (x1, y1) radius r1 (rounded ends)
export function capsule(x0, y0, r0, x1, y1, r1_, n = 10) {
  const a = Math.atan2(y1 - y0, x1 - x0), out = [];
  for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + i / n * Math.PI; out.push([x0 + Math.cos(t) * r0, y0 + Math.sin(t) * r0]); }
  for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + i / n * Math.PI; out.push([x1 + Math.cos(t) * r1_, y1 + Math.sin(t) * r1_]); }
  return out;
}
// noisy round blob (clouds, bushes, crowns)
export function blob(cx, cy, rx, ry = rx, seed = 1, k = .18, n = 30) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, r = 1 + k * (noise1(seed * 9.1 + Math.cos(a) * 1.3 + 4) - .5) * 2 + k * .5 * (noise1(seed * 3.3 + Math.sin(a) * 2.1) - .5); out.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
  return out;
}
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function star(cx, cy, r0, r1_, n = 5, rot = -90) { const out = []; for (let i = 0; i < n * 2; i++) { const a = (rot + i * 180 / n) * Math.PI / 180, r = i % 2 ? r1_ : r0; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; }
export const translate = (pts, dx, dy) => pts.map(p => [p[0] + dx, p[1] + dy]);
export const scale = (pts, sx, sy = sx, cx = 0, cy = 0) => pts.map(p => [cx + (p[0] - cx) * sx, cy + (p[1] - cy) * sy]);
export function rotate(pts, deg, cx = 0, cy = 0) { const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180); return pts.map(p => [cx + (p[0] - cx) * c - (p[1] - cy) * s, cy + (p[0] - cx) * s + (p[1] - cy) * c]); }
export function bbox(pts) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a, b, c, d]; }
export function area(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; }
export function perimeter(pts, closed = true) { let L = 0; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; L += Math.hypot(q[0] - p[0], q[1] - p[1]); } return L; }
// even resampling along a polygon (closed) or polyline
export function resample(pts, step = 6, closed = true) {
  const L = perimeter(pts, closed), n = Math.max(closed ? 6 : 2, Math.round(L / step)), out = [];
  const segs = []; let acc = 0;
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const p = pts[i], q = pts[(i + 1) % pts.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); segs.push([p, q, acc, l]); acc += l; }
  for (let k = 0; k < (closed ? n : n + 1); k++) {
    const d = L * k / n; let s = segs[segs.length - 1];
    for (const g of segs) if (d <= g[2] + g[3]) { s = g; break; }
    const u = s[3] ? (d - s[2]) / s[3] : 0; out.push([s[0][0] + (s[1][0] - s[0][0]) * u, s[0][1] + (s[1][1] - s[0][1]) * u]);
  }
  return out;
}
// scissor-cut / hand-drawn edge: resample, then offset each vertex along the normal by seeded noise (an occasional nick)
export function wobble(pts, o = {}) {
  const amp = o.amp != null ? o.amp : .9, step = o.step || 5, seed = o.seed || 1, closed = o.closed !== false;
  const q = resample(pts, step, closed), m = q.length;
  return q.map((p, i) => {
    if (!closed && (i === 0 || i === m - 1)) return p;
    const a = q[(i - 1 + m) % m], b = q[(i + 1) % m], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nick = rnd(seed * 3.1, i * 1.93) > .94 ? 1.9 : 1, k = amp * (rnd(seed * 13.7, i * .731) - .5) * 2 * nick;
    return [p[0] - dy / l * k, p[1] + dx / l * k];
  });
}
// ---- paths ----
export const polyD = (pts, closed = true) => pts.length ? 'M' + pts.map(p => r1(p[0]) + ' ' + r1(p[1])).join(' L') + (closed ? ' Z' : '') : '';
// smooth closed/open curve through the points (uniform Catmull–Rom → cubic Bézier)
export function smoothD(pts, closed = true, k = 1) {
  const n = pts.length; if (n < 3) return polyD(pts, closed);
  const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6 * k)} ${r1(p1[1] + (p2[1] - p0[1]) / 6 * k)} ${r1(p2[0] - (p3[0] - p1[0]) / 6 * k)} ${r1(p2[1] - (p3[1] - p1[1]) / 6 * k)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + (closed ? ' Z' : '');
}
// tapered stroke outline along a polyline (brush / ribbon / slit): width w (or w(u)), tapered ends
export function strokeOutline(pts, w = 4, taper = true) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const u = n > 1 ? i / (n - 1) : .5, ww = (typeof w === 'function' ? w(u) : w) / 2 * (taper ? Math.pow(Math.sin(Math.PI * Math.min(1, .06 + u * .9)), .7) : 1);
    L.push([pts[i][0] - dy / l * ww, pts[i][1] + dx / l * ww]); R.push([pts[i][0] + dy / l * ww, pts[i][1] - dx / l * ww]);
  }
  return L.concat(R.reverse());
}
// quadratic arc from a to b bulging by `bend` (perpendicular units) sampled to n+1 points
export function arc(a, b, bend = 0, n = 8) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, cx = mx - dy / l * bend, cy = my + dx / l * bend, out = [];
  for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; out.push([v * v * a[0] + 2 * u * v * cx + u * u * b[0], v * v * a[1] + 2 * u * v * cy + u * u * b[1]]); }
  return out;
}
// spiral polyline (祥云 cloud scroll curls): centre, start radius, turns, growth per turn
export function spiral(cx, cy, r0, turns = 1.5, grow = .5, rot = 0, dir = 1, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) { const u = i / n, a = rot + dir * u * turns * TAU, r = r0 * (1 - grow * u); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}

// ---- world shapes ----
// ridge line across [x0, x1] at height top ± amp (seeded smooth noise), closed down to `base`
export function hills(x0, x1, top, amp, seed = 1, o = {}) {
  const step = o.step || 16, freq = o.freq || .006, base = o.base != null ? o.base : 760, out = [[x0, base]];
  for (let x = x0; x <= x1 + .1; x += step) {
    const n = noise1(x * freq + seed * 17.3) * .7 + noise1(x * freq * 2.7 + seed * 5.1) * .3;
    const peak = o.peaks ? Math.pow(Math.max(0, n), o.peaks) : n;
    out.push([x, top + amp * (1 - 2 * peak)]);
  }
  out.push([x1, base]);
  return out;
}
// rounded "immortal mountain" peaks (重彩 / 仙山): a row of tall rounded humps
export function peaks(x0, x1, base, hMin, hMax, n = 5, seed = 1) {
  const out = []; const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + w * (i + .5) + (rnd(seed, i) - .5) * w * .4, h = hMin + (hMax - hMin) * rnd(seed + 3, i), ww = w * (.55 + .4 * rnd(seed + 7, i));
    const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16, a = Math.PI * u; pts.push([cx - ww * Math.cos(a), base - h * Math.pow(Math.sin(a), .65) * (1 + .06 * Math.sin(a * 5 + i))]); }
    out.push({ cx, h, pts: [[cx - ww, base + 40], ...pts, [cx + ww, base + 40]] });
  }
  return out;
}
// tree: {trunk, crown: [polys], kind}
export function tree(x, y, h, o = {}) {
  const kind = o.kind || 'round', seed = o.seed || 1, lean = o.lean || 0, tw = o.trunk || h * .07;
  const top = [x + lean * h, y - h * (kind === 'pine' ? .95 : .62)];
  const trunk = [[x - tw, y], [x - tw * .5 + lean * h * .6, y - h * .5], [top[0] - tw * .35, top[1]], [top[0] + tw * .35, top[1]], [x + tw * .5 + lean * h * .6, y - h * .5], [x + tw, y]];
  const crown = [];
  if (kind === 'pine') {
    for (let i = 0; i < 4; i++) { const yy = y - h * (.38 + i * .17), ww = h * (.36 - i * .07); crown.push([[x + lean * h * (.4 + i * .15) - ww, yy + h * .05], [x + lean * h * (.5 + i * .15), yy - h * .2], [x + lean * h * (.4 + i * .15) + ww, yy + h * .05]]); }
  } else if (kind === 'willow') {
    crown.push(blob(top[0], top[1], h * .3, h * .2, seed, .22));
    for (let i = 0; i < 5; i++) { const sx = top[0] - h * .28 + i * h * .14; crown.push(strokeOutline(arc([sx, top[1]], [sx - h * .05, top[1] + h * .45], 8), h * .05)); }
  } else {
    const n = o.lobes || 3;
    for (let i = 0; i < n; i++) { const a = (i / n - .5) * 1.8, r = h * (.26 + .06 * rnd(seed, i)); crown.push(blob(top[0] + Math.sin(a) * h * .22, top[1] - Math.cos(a) * h * .1 + h * .04, r, r * .85, seed + i, .14)); }
  }
  return { trunk, crown, top, kind };
}
// house (profile-less front elevation): walls, roof (eaves curl up for 'temple'), door, window
export function house(x, y, w, h, o = {}) {
  const kind = o.kind || 'cottage', rh = h * (kind === 'temple' ? .55 : .45), ov = w * .12, curl = kind === 'temple' ? h * .12 : 0;
  const walls = rect(x - w / 2, y - h, w, h);
  const roof = kind === 'flat' ? rect(x - w / 2 - ov * .3, y - h - h * .1, w + ov * .6, h * .1)
    : [[x - w / 2 - ov, y - h + curl * .2], [x - w / 2 - ov - curl * .6, y - h - curl], [x - w / 2 - ov * .2, y - h - rh * .1], [x, y - h - rh], [x + w / 2 + ov * .2, y - h - rh * .1], [x + w / 2 + ov + curl * .6, y - h - curl], [x + w / 2 + ov, y - h + curl * .2]];
  const door = rect(x - w * .1, y - h * .55, w * .2, h * .55), win = rect(x + w * .18, y - h * .7, w * .18, h * .2), win2 = rect(x - w * .36, y - h * .7, w * .18, h * .2);
  return { walls, roof, door, windows: [win, win2] };
}
// wave band (water surface) from x0 to x1 at y, closed to base
export function waves(x0, x1, y, amp = 8, len = 90, phase = 0, base = 760, step = 8) {
  const out = [[x0, base]]; for (let x = x0; x <= x1 + .1; x += step) out.push([x, y + amp * Math.sin((x / len) * TAU + phase) + amp * .4 * Math.sin((x / len) * 2.3 * TAU + phase * 1.7)]); out.push([x1, base]); return out;
}
// tuft of grass blades (each a thin tapered stroke) → list of polygons
export function grass(x, y, h = 28, n = 5, seed = 1) {
  const out = [];
  for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 5, lean = (i - (n - 1) / 2) * .22 + (rnd(seed, i) - .5) * .3, hh = h * (.6 + .5 * rnd(seed + 2, i)); out.push(strokeOutline(arc([x + dx, y], [x + dx + lean * hh, y - hh], -lean * 6, 6), 4.2)); }
  return out;
}
// 祥云 cloud scroll: a puffy body with curled ends → {body: poly, curls: [polyline]}
export function cloudScroll(cx, cy, w, o = {}) {
  const seed = o.seed || 1, h = w * .32, body = [];
  const bumps = 4;
  for (let i = 0; i <= bumps; i++) { const u = i / bumps, x = cx - w / 2 + u * w; const r = h * (.55 + .35 * Math.sin(Math.PI * u)) * (.9 + .2 * rnd(seed, i)); for (let k = 0; k <= 6; k++) { const a = Math.PI + k / 6 * Math.PI; body.push([x + Math.cos(a) * r * .6, cy + Math.sin(a) * r]); } }
  body.push([cx + w / 2 + h * .2, cy + h * .25], [cx - w / 2 - h * .2, cy + h * .25]);
  const curls = [spiral(cx - w / 2 + h * .1, cy - h * .05, h * .55, 1.3, .75, Math.PI * .1, -1), spiral(cx + w / 2 - h * .1, cy - h * .05, h * .55, 1.3, .75, Math.PI * .9, 1), spiral(cx - w * .08, cy - h * .45, h * .42, 1.1, .7, Math.PI * .5, 1)];
  return { body, curls, h };
}
