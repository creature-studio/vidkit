// Scene transitions: pure functions of eased progress e (0→1) returning styles for the incoming ("in")
// and outgoing ("out") scene. The incoming scene is on top unless `under:true`.
import { registry } from '../core/plugin.js';
import { hash } from '../core/random.js';
import { seg } from '../core/time.js';
import { shapePolygon } from './shapes.js';

const T = registry.transitions;
const pct = v => (v * 100).toFixed(3) + '%';
const focal = (c) => ({ x: c.o.x == null ? c.W / 2 : c.o.x <= 1 ? c.o.x * c.W : c.o.x, y: c.o.y == null ? c.H / 2 : c.o.y <= 1 ? c.o.y * c.H : c.o.y });

T.none = () => ({});
T.fade = e => ({ in: { opacity: e } });
T.crossfade = e => ({ in: { opacity: e }, out: { opacity: 1 - e } });
// slide: incoming moves over a static outgoing scene
const DIRS = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] };   // "slide-left" = content travels leftwards
Object.entries(DIRS).forEach(([d, [dx, dy]]) => {
  const tf = v => `translate(${pct(dx * v)},${pct(dy * v)})`;
  T['slide-' + d] = e => ({ in: { transform: tf(1 - e) } });
  T['push-' + d] = e => ({ in: { transform: tf(1 - e) }, out: { transform: tf(-e) } });
  T['whip-' + d] = (e, c) => { const b = Math.sin(Math.PI * c.raw) * 18; return { in: { transform: tf(1 - e), filter: `blur(${b.toFixed(2)}px)` }, out: { transform: tf(-e), filter: `blur(${b.toFixed(2)}px)` } }; };
  const clip = { left: v => `inset(0% 0% 0% ${pct(1 - v)})`, right: v => `inset(0% ${pct(1 - v)} 0% 0%)`, up: v => `inset(${pct(1 - v)} 0% 0% 0%)`, down: v => `inset(0% 0% ${pct(1 - v)} 0%)` }[d];
  T['wipe-' + d] = e => ({ in: { clipPath: clip(e) } });                 // wipe-left: edge travels leftwards
});
T.wipe = T['wipe-right'] = e => ({ in: { clipPath: `inset(0% ${pct(1 - e)} 0% 0%)` } });
T['wipe-right'] = T.wipe;
T['zoom-in'] = e => ({ in: { opacity: e, transform: `scale(${1.25 - .25 * e})` }, out: { transform: `scale(${1 + .18 * e})` } });
T.zoom = T['zoom-in'];
T['zoom-out'] = e => ({ in: { opacity: e, transform: `scale(${.82 + .18 * e})` }, out: { transform: `scale(${1 - .1 * e})` } });
T.blur = e => ({ in: { opacity: e, filter: `blur(${((1 - e) * 22).toFixed(2)}px)` }, out: { filter: `blur(${(e * 22).toFixed(2)}px)` } });
T.iris = (e, c) => { const f = focal(c), R = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y)); return { in: { clipPath: `circle(${(e * R).toFixed(1)}px at ${f.x}px ${f.y}px)` } }; };
T.circle = T.iris;
T['iris-out'] = (e, c) => { const f = focal(c), R = Math.hypot(c.W, c.H) / 2 * 1.05; return { under: true, out: { clipPath: `circle(${((1 - e) * R).toFixed(1)}px at ${f.x}px ${f.y}px)` } }; };
// clip-path shape reveals (fixed vertex count polygons)
const COVER = { circle: 1, diamond: 1.45, square: 1.05, triangle: 2.1, hexagon: 1.2, star: 2.35, heart: 1.5, blob: 1.2 };
['diamond', 'star', 'hexagon', 'triangle', 'heart', 'square', 'blob'].forEach(k => {
  T['shape-' + k] = (e, c) => { const f = focal(c), R = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y)) * COVER[k] * e; return { in: { clipPath: shapePolygon(k, f.x, f.y, Math.max(R, .01), { points: c.o.points }) } }; };
});
T.split = e => ({ in: { clipPath: `inset(0% ${pct((1 - e) / 2)} 0% ${pct((1 - e) / 2)})` } });   // opens from a vertical centre line
T['split-h'] = e => ({ in: { clipPath: `inset(${pct((1 - e) / 2)} 0% ${pct((1 - e) / 2)} 0%)` } });
// outgoing scene splits into two halves that slide apart
T['split-open'] = e => ({ under: true, out: { clipPath: `polygon(0% 0%, ${pct(.5 - e / 2)} 0%, ${pct(.5 - e / 2)} 100%, 0% 100%, 0% 0%, 100% 0%, 100% 100%, ${pct(.5 + e / 2)} 100%, ${pct(.5 + e / 2)} 0%, 100% 0%)` } });
T.diagonal = e => { const a = -40 + e * 180; return { in: { clipPath: `polygon(0% 0%,${a}% 0%,${a - 40}% 100%,0% 100%)` } }; };
// venetian blinds: n strips grow simultaneously (one zig-zag polygon)
T.blinds = (e, c) => {
  const n = c.o.n || 8, pts = [];
  for (let i = 0; i < n; i++) { const y0 = i / n * 100, y1 = y0 + e * 100 / n; pts.push(`0% ${y0}%`, `100% ${y0}%`, `100% ${y1}%`, `0% ${y1}%`, `0% ${y0}%`); }
  return { in: { clipPath: `polygon(${pts.join(',')})` } };
};
T.flash = (e, c) => ({ in: { opacity: c.raw >= .5 ? 1 : 0 }, flash: Math.pow(1 - Math.abs(2 * c.raw - 1), 1.5), flashColor: c.o.color || '#fff' });
T.dip = (e, c) => ({ in: { opacity: c.raw >= .5 ? 1 : 0 }, flash: 1 - Math.abs(2 * c.raw - 1), flashColor: c.o.color || '#000' });
// slice glitch + hue jitter
T.glitch = (e, c) => {
  const raw = c.raw; if (raw >= 1) return {};
  const f = c.frame, j = hash(f * 1.3) - .5;
  if (raw > .7) return { in: { transform: `translateX(${(j * 24 * (1 - raw)).toFixed(1)}px)` } };
  const top = hash(f * 3.1) * 70, h = 12 + hash(f * 7.7) * 40 * raw / .7;
  return { in: { clipPath: `inset(${top.toFixed(1)}% 0% ${Math.max(0, 100 - top - h).toFixed(1)}% 0%)`, transform: `translateX(${(j * 90).toFixed(1)}px)`, filter: `hue-rotate(${Math.round(hash(f + 2) * 180)}deg) saturate(1.6)` }, out: { transform: `translateX(${(-j * 30).toFixed(1)}px)` } };
};
T.slice = T.glitch;
// zoom through: outgoing scene scales ×40 into a focal point (e.g. the counter of a letter) and dissolves
T['zoom-through'] = (e, c) => { const f = focal(c), s = 1 + Math.pow(c.raw, 3) * (c.o.scale || 40); return { under: true, out: { transformOrigin: `${f.x}px ${f.y}px`, transform: `scale(${s.toFixed(3)})`, opacity: 1 - seg(c.raw, .55, 1) }, in: { transform: `scale(${(1.15 - .15 * e).toFixed(4)})` } }; };
