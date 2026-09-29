// Scene: a time slot in the video with its own DOM subtree, camera, layers and per-frame hooks.
// All times given to scene methods are scene-local seconds (or "b:N" beats on the global grid).
import { parseTime, parseDur } from './time.js';
import { normKeys } from './camera.js';
import { applyFx } from '../fx/apply.js';

export class Scene {
  constructor(video, o) {
    this.video = video; this.o = o;
    this.name = o.name || `scene${video.scenes.length + 1}`;
    this.index = video.scenes.length;
    this.fns = []; this.layers = []; this.bgs = [];
    this.camCfg = { keys: null, push: o.push != null ? o.push : (video.cfg.push || 0), shakes: [], extra: [] };
    this.cursor = null; this.maxT = 0; this.cap = o.cap || null;
    const el = this.el = o.el || document.createElement('section');
    el.classList.add('vk-scene'); el.dataset.name = this.name;
    if (!o.el) {
      this.cam = mk('div', 'vk-cam', el);
      this.content = mk('div', 'vk-content ' + (o.layout || video.cfg.layout || 'center').split(/\s+/).join(' '), this.cam);
    } else { // declarative scene from existing markup
      this.cam = null; this.content = el;
    }
    this.fixed = el; // elements that must not follow the camera go straight into the scene
  }
  // ---- timing ----
  time(v) {
    if (typeof v === 'string' && /^[+-]\d/.test(v)) return (this.cursor == null ? 0 : this.cursor) + parseFloat(v);
    return parseTime(v, this.video.beats, this.start);
  }
  get end() { return this.start + this.dur; }
  // ---- queries ----
  q(sel) { return toEls(sel, this.el); }
  // ---- tweens (engine.js compatible) ----
  tween(target, o) { this.video.tl.tween(toEls(target, this.el), { ...o, t: this.time(o.t || 0) }, this); return this; }
  from(target, from, o = {}) { return this.tween(target, { ...o, from }); }
  to(target, to, o = {}) { return this.tween(target, { ...o, to }); }
  fx(target, fx, o = {}) { toEls(target, this.el).forEach((el, i, arr) => applyFx(el, fx, { ...o, t: this.time(o.t || o.at || 0) + stOff(o, i, arr.length) }, this, false)); return this; }
  exit(target, fx, o = {}) { toEls(target, this.el).forEach((el, i, arr) => applyFx(el, fx, { ...o, t: this.time(o.t || o.at || 0) + stOff(o, i, arr.length) }, this, true)); return this; }
  type(target, o = {}) { return this.fx(target, 'type', o); }
  count(target, o = {}) { return this.fx(target, 'count', o); }
  draw(target, o = {}) { return this.fx(target, 'draw', o); }
  // per-frame hook: fn(local, p, t) while the scene is on screen. Must be a pure function of time.
  on(fn) { this.fns.push(fn); return this; }
  // ---- camera ----
  ensureCam() { if (!this.cam) { const c = document.createElement('div'); c.className = 'vk-cam'; [...this.el.childNodes].forEach(n => { if (!(n.classList && (n.classList.contains('hv-fixed') || n.classList.contains('vk-fixed')))) c.appendChild(n); }); this.el.insertBefore(c, this.el.firstChild); this.cam = c; } return this; }
  camera(keys) { this.ensureCam(); this.el.dataset.camKeys = '1'; this.camCfg.keys = normKeys(keys.map(k => ({ ...k, t: this.time(k.t) })), this.video.W, this.video.H); return this; }
  push(amount) { this.ensureCam(); this.camCfg.push = amount; return this; }
  shake(t, amp = 10, d = .6, k = 6, rot = 0) { this.ensureCam(); this.camCfg.shakes.push({ t: this.time(t), amp, d, k, rot }); return this; }
  // zoom pulse on every beat (music): amount e.g. .02
  beatZoom(amount = .02, k = 6, every = 1) { this.ensureCam(); this.camCfg.extra.push(lt => amount * this.video.beats.pulse(this.start + lt, k, every)); return this; }
  // ---- layers ----
  canvas(draw, o = {}) { return this.video.addLayer('canvas', draw, { ...o, scene: this }); }
  webgl(o = {}) { return this.video.addLayer('webgl', null, { ...o, scene: this }); }
  // ---- authoring ----
  add(...nodes) { this.video.buildNodes(this, nodes.flat(), this.content); return this; }
  // raw HTML string into the scene (fixed layer) or the content flow; returns the created root element
  html(str, o = {}) { const w = document.createElement('div'); w.innerHTML = str.trim(); const els = [...w.children]; const parent = o.flow ? this.content : (o.fixed ? this.fixed : (this.cam || this.el)); els.forEach(e => parent.appendChild(e)); return els.length === 1 ? els[0] : els; }
  // per-scene texture overlay (same presets as video-level textures)
  texture(name, o = {}) {
    const f = this.video.constructor.registry.textures[name]; if (!f) { console.warn('[vk] unknown texture', name); return this; }
    const r = f(this.video, o === true ? {} : typeof o === 'number' ? { amount: o } : o, this);
    if (r && r.el) { r.el.style.zIndex = 20; this.el.appendChild(r.el); }
    if (r && r.update) this.bgs.push((local, p, t) => r.update(t, { local, scene: this }));
    return this;
  }
  sfx(t, name, gain = 1, freq) { this.video.sfx(this.start + this.time(t), name, gain, freq); return this; }
}
function stOff(o, i, n) { if (!o || !o.stagger) return 0; const f = typeof o.stagger === 'function' ? o.stagger : (j => j * o.stagger); return f(i, n); }
export function toEls(target, root) {
  if (!target) return [];
  if (typeof target === 'string') return [...(root || document).querySelectorAll(target)];
  if (target.length !== undefined && !target.nodeType) return [...target];
  return [target];
}
export function mk(tag, cls, parent, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
export { parseDur };
