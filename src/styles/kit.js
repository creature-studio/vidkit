// Small shared helpers for style-pack runtimes (exposed as vk.style.kit). All animation is a pure function of the
// scene-local time passed to sc.on().
import { clamp01, smooth01 } from '../core/time.js';

const NS = 'http://www.w3.org/2000/svg';
export const ease = { out: u => 1 - Math.pow(1 - clamp01(u), 3), inOut: u => smooth01(clamp01(u)), back: u => { u = clamp01(u); const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } };
// 0→1 over [at, at + d]
export const prog = (l, at, d) => clamp01((l - at) / Math.max(1e-6, d));
// visible window with fades: 0 before at, 1 in the middle, 0 after out (+ fade)
export const win = (l, at, d = .35, out = Infinity, fo = .35) => Math.min(prog(l, at, d), 1 - prog(l, out, fo));
// cached style / attribute setters (only touch the DOM when the value changes)
export function css(el, k, v) { const s = String(v); if (!el.__c) el.__c = {}; if (el.__c[k] !== s) { el.__c[k] = s; el.style[k] = s; } }
export function attr(el, k, v) { const s = String(v); if (!el.__a) el.__a = {}; if (el.__a[k] !== s) { el.__a[k] = s; el.setAttribute(k, s); } }
// an absolutely positioned W×H svg in the scene (fixed: does not follow the camera)
export function svgLayer(sc, o = {}) {
  const v = sc.video, W = v.W, H = v.H;
  const el = sc.html(`<svg class="${o.cls || 'vk-style-layer'}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none${o.z != null ? ';z-index:' + o.z : ''}"></svg>`, { fixed: !!o.fixed });
  return el;
}
export function svgEl(parent, tag, a = {}, inner) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (inner != null) e.innerHTML = inner; parent.appendChild(e); return e; }
// HTML block on top of the scene (fixed by default) with a per-frame updater
export function overlay(sc, html, o = {}) {
  const el = sc.html(`<div class="vk-style-ov" style="position:absolute;left:0;top:0;width:${sc.video.W}px;height:${sc.video.H}px;pointer-events:none;${o.css || ''}">${html}</div>`, { fixed: o.fixed !== false });
  if (o.z != null) el.style.zIndex = o.z;
  return el;
}
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export { escH as esc };
// x / y / at / out normaliser for title-like blocks
export function placeOpts(sc, o, dx = .5, dy = .32) {
  const W = sc.video.W, H = sc.video.H;
  const X = o.x == null ? W * dx : o.x <= 1 ? o.x * W : o.x, Y = o.y == null ? H * dy : o.y <= 1 ? o.y * H : o.y;
  return { x: X, y: Y, at: o.at != null ? o.at : .3, out: o.out != null ? o.out : Infinity, size: o.size };
}
// particle burst on a GL layer in the scene (follows the camera unless fixed). o: particle opts + shape, colors, blend
export function burst(sc, o = {}) {
  const vk = window.vk, t = o.at || 0, fixed = o.fixed !== false;
  // world coords → screen at the burst time (fixed layer: sharp at any camera zoom, sizes in screen px)
  const [x, y] = fixed && sc.toScreen ? sc.toScreen([o.x != null ? o.x : 640, o.y != null ? o.y : 360], t) : [o.x || 640, o.y || 360];
  const P = vk.particles({ seed: o.seed || 3, burst: [{ t, n: o.n || 46, dur: o.spawn || 0 }], x, y, angle: o.angle != null ? o.angle : -90, spread: o.spread != null ? o.spread : 300,
    speed: o.speed || [220, 620], gravity: o.gravity != null ? o.gravity : 700, drag: o.drag != null ? o.drag : 1.1, life: o.life || [1.1, 1.9], size: o.size || [8, 18], spin: o.spin || [-260, 260], rot: [0, 360], sway: o.sway, fadeOut: o.fadeOut != null ? o.fadeOut : .35, alpha: o.alpha || [.85, 1], ...(o.particle || {}) });
  return sc.gl([vk.gl.particles({ system: P, shape: o.shape || 'petal', colors: o.colors || ['#c0392b'], color2: o.color2, blend: o.blend })], { fixed, blend: o.css, z: o.z, zIndex: o.zIndex != null ? o.zIndex : (fixed ? 15 : undefined) });
}
export const clamp = clamp01;
