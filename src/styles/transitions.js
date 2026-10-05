// Style-pack transitions (pure functions of eased progress e and c {W, H, raw, frame, o}).
//   tear      paper tear: a jagged, slightly diagonal torn edge sweeps across (剪纸 / 拼贴)
//   pixel     blocky column-staggered fill in 80 px cells (像素)
//   cloud     scalloped 祥云 iris (重彩装饰)
//   scribble  wobbly hand-drawn blob iris whose outline boils 8×/s (蜡笔绘本)
//   lamp      lamp dip: the screen fades to warm darkness with a flicker, then the next scene lights up (皮影)
//   scan      CRT scan open: a bright line expands vertically into the next scene (赛博霓虹)
import { registry } from '../core/plugin.js';
import { hash } from '../core/random.js';
import { clamp01 } from '../core/time.js';

// registered lazily (installStyleTransitions) the first time a style pack is used, so pages without styles see the
// exact same transition registry as before (e.g. the FX gallery's transition count)
const T = {};
const px = v => v.toFixed(1) + 'px';
const poly = pts => `polygon(${pts.map(p => px(p[0]) + ' ' + px(p[1])).join(',')})`;
const focal = c => ({ x: c.o.x == null ? c.W / 2 : c.o.x <= 1 ? c.o.x * c.W : c.o.x, y: c.o.y == null ? c.H / 2 : c.o.y <= 1 ? c.o.y * c.H : c.o.y });

export function tearEdge(e, W, H, o = {}) {
  const J = o.jag || 26, n = o.n || 34, seed = o.seed || 3, tilt = (o.tilt != null ? o.tilt : .18) * H;
  const x0 = -J * 2 - tilt + e * (W + J * 4 + tilt * 2), pts = [[-10, -10]];
  for (let i = 0; i <= n; i++) { const y = -10 + (H + 20) * i / n, j = (hash(seed * 31 + i) - .5) * 2 * J + (i % 2 ? .4 : -.4) * J; pts.push([x0 + j + tilt * (i / n - .5), y]); }
  pts.push([-10, H + 10]);
  return pts;
}
T.tear = (e, c) => ({ in: { clipPath: poly(tearEdge(e, c.W, c.H, c.o)), filter: e < 1 ? 'drop-shadow(-4px 0 6px rgba(0,0,0,.35))' : '' }, out: { transform: `translateX(${(-e * 18).toFixed(1)}px)` } });

export function pixelCols(e, W, H, o = {}) {
  const cell = o.cell || 80, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), pts = [[0, 0]];
  for (let i = 0; i < cols; i++) {
    const d = (i / cols) * .55 + hash(i * 7.1 + (o.seed || 1)) * .15, k = clamp01((e - d) / .3);
    const hgt = Math.round(k * rows) * cell;
    pts.push([i * cell, hgt], [(i + 1) * cell, hgt]);
  }
  pts.push([cols * cell, 0]);
  return pts;
}
T.pixel = (e, c) => (e >= 1 ? {} : { in: { clipPath: poly(pixelCols(e, c.W, c.H, c.o)) } });

export function scallop(e, cx, cy, R, o = {}) {
  const k = o.lobes || 9, n = 180, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, lobe = Math.abs(Math.sin(a * k / 2 + (o.phase || 0))); pts.push([cx + Math.cos(a) * R * e * (.82 + .18 * Math.sqrt(lobe)), cy + Math.sin(a) * R * e * (.82 + .18 * Math.sqrt(lobe))]); }
  return pts;
}
T.cloud = (e, c) => { const f = focal(c), R = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y)) * 1.25; return e >= 1 ? {} : { in: { clipPath: poly(scallop(Math.max(e, .001), f.x, f.y, R, { phase: e * 1.2 })) } }; };

export function blobIris(e, cx, cy, R, o = {}) {
  const n = 96, st = Math.floor((o.frame || 0) / (o.every || 4)), pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = 1 + .07 * Math.sin(3 * a + st * 1.7) + .04 * Math.sin(7 * a - st * 2.3) + .025 * (hash(st * 131 + i) - .5); pts.push([cx + Math.cos(a) * R * e * w, cy + Math.sin(a) * R * e * w]); }
  return pts;
}
T.scribble = (e, c) => { const f = focal(c), R = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y)) * 1.15; return e >= 1 ? {} : { in: { clipPath: poly(blobIris(Math.max(e, .001), f.x, f.y, R, { frame: c.frame })) } }; };

T.lamp = (e, c) => { const r = c.raw, fl = .08 * Math.sin(c.frame * 2.7) * Math.sin(Math.PI * r); return { in: { opacity: r >= .5 ? 1 : 0 }, flash: clamp01(1 - Math.abs(2 * r - 1) * 1.15 + fl), flashColor: c.o.color || '#1c0c05' }; };

T.scan = (e, c) => { const r = c.raw, h = Math.max(.004, e); return r >= 1 ? {} : { in: { clipPath: `inset(${((1 - h) / 2 * 100).toFixed(3)}% 0% ${((1 - h) / 2 * 100).toFixed(3)}% 0%)`, filter: `brightness(${(1 + 1.4 * (1 - e)).toFixed(3)})` }, out: { filter: `brightness(${(1 - .6 * e).toFixed(3)})` } }; };

export const STYLE_TRANSITIONS = ['tear', 'pixel', 'cloud', 'scribble', 'lamp', 'scan'];
let installed = false;
export function installStyleTransitions() {
  if (installed) return STYLE_TRANSITIONS; installed = true;
  for (const k of STYLE_TRANSITIONS) if (!registry.transitions[k]) registry.transitions[k] = T[k];
  return STYLE_TRANSITIONS;
}
