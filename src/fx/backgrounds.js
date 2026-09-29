// Animated backgrounds: gradient, mesh, grid, dots, noise. Scene option: bg:{type:'mesh', colors:[…]} or bg:'grid'.
import { registry } from '../core/plugin.js';
import { noise1, noise2 } from '../core/random.js';

const G = registry.backgrounds;
const div = () => document.createElement('div');
const col = (sc, v, name) => v || `var(--${name})`;

G.gradient = (sc, o, v) => {
  const e = div(), cs = o.colors || [v.color('bg', sc.mode), v.color('accent', sc.mode)];
  return { el: e, update(local) { const a = (o.angle || 135) + (o.spin || 0) * local; e.style.background = `linear-gradient(${a.toFixed(2)}deg, ${cs.join(',')})`; } };
};
// soft moving colour blobs (radial gradients) — "gradient mesh"
G.mesh = (sc, o, v) => {
  const e = div(), cs = o.colors || [v.color('accent', sc.mode), v.color('accent2', sc.mode), v.color('accent', sc.mode)], sp = o.speed || .12, base = o.base || v.color('bg', sc.mode);
  return { el: e, update(local) {
    const t = sc.start + local; // continuous across scenes
    e.style.background = cs.map((c, i) => { const x = 15 + 70 * noise1(t * sp + i * 7.1), y = 15 + 70 * noise1(t * sp + i * 3.7 + 50), r = (o.size || 55) + 10 * noise1(t * sp * .7 + i); return `radial-gradient(circle at ${x.toFixed(2)}% ${y.toFixed(2)}%, ${c} 0%, transparent ${r.toFixed(1)}%)`; }).join(',') + ',' + base;
    e.style.opacity = o.opacity != null ? o.opacity : 1; if (o.blur) e.style.filter = `blur(${v.px(o.blur)}px)`;
  } };
};
G.grid = (sc, o, v) => {
  const e = div(), s = v.px(o.size || 64), c = col(sc, o.color, 'line'), lw = o.width || 1;
  e.style.backgroundImage = `linear-gradient(${c} ${lw}px, transparent ${lw}px), linear-gradient(90deg, ${c} ${lw}px, transparent ${lw}px)`; e.style.backgroundSize = `${s}px ${s}px`;
  if (o.fade !== false) { e.style.webkitMaskImage = e.style.maskImage = 'radial-gradient(ellipse at 50% 50%, #000 30%, transparent 80%)'; }
  if (o.opacity != null) e.style.opacity = o.opacity;
  return { el: e, update(local) { const d = (o.drift != null ? o.drift : 10) * local; e.style.backgroundPosition = `${(o.dx || 0) * d}px ${(o.dy == null ? 1 : o.dy) * d}px`; } };
};
G.dots = (sc, o, v) => {
  const e = div(), s = v.px(o.size || 28), c = col(sc, o.color, 'line');
  e.style.backgroundImage = `radial-gradient(circle, ${c} ${v.px(o.r || 2)}px, transparent ${v.px(o.r || 2) + .5}px)`; e.style.backgroundSize = `${s}px ${s}px`;
  if (o.fade !== false) e.style.webkitMaskImage = e.style.maskImage = 'radial-gradient(ellipse at 50% 50%, #000 25%, transparent 75%)';
  if (o.opacity != null) e.style.opacity = o.opacity;
  return { el: e, update(local) { const d = (o.drift != null ? o.drift : 8) * local; e.style.backgroundPosition = `${d}px ${d * .5}px`; } };
};
// animated value noise on a tiny canvas, upscaled smoothly (clouds / plasma), tinted between two colours
G.noise = (sc, o, v) => {
  const c = document.createElement('canvas'), w = o.res || 64, h = Math.round(w * v.H / v.W); c.width = w; c.height = h; c.style.cssText = 'width:100%;height:100%;display:block';
  const e = div(); e.appendChild(c); if (o.opacity != null) e.style.opacity = o.opacity;
  const g = c.getContext('2d'), im = g.createImageData(w, h);
  const hex = s => { const m = /^#?([0-9a-f]{6})$/i.exec(s.trim()); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const A = hex(o.from || v.color('bg', sc.mode)), B = hex(o.to || v.color('accent', sc.mode)), sc2 = o.scale || 3.2, sp = o.speed || .15;
  return { el: e, update(local) {
    const t = local * sp;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let n = noise2(x / w * sc2 + t, y / h * sc2 - t * .7) * .65 + noise2(x / w * sc2 * 2.1 - t, y / h * sc2 * 2.1 + t) * .35; n = Math.pow(n, o.contrast || 1.6); const p = (y * w + x) * 4; im.data[p] = A[0] + (B[0] - A[0]) * n; im.data[p + 1] = A[1] + (B[1] - A[1]) * n; im.data[p + 2] = A[2] + (B[2] - A[2]) * n; im.data[p + 3] = 255; }
    g.putImageData(im, 0, 0);
  } };
};
