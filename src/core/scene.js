// Scene: a time slot in the video with its own DOM subtree, camera, layers and per-frame hooks.
// All times given to scene methods are scene-local seconds (or "b:N" beats on the global grid).
import { parseTime, parseDur } from './time.js';
import { normKeys } from './camera.js';
import { applyFx } from '../fx/apply.js';
import { modulator } from '../fx/rhythm.js';
import { speakingAt } from '../audio/words.js';

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
  beatZoom(amount = .02, k = 6, every = 1, unit = 'beat') { this.ensureCam(); const B = this.video.beats; this.camCfg.extra.push(lt => amount * (unit === 'bar' ? B.barPulse(this.start + lt, k, every) : B.pulse(this.start + lt, k, every))); return this; }
  // camera zoom follows the music loudness (0..amount), e.g. .06 — needs vk.video({beats:'song.beats.json'})
  energyZoom(amount = .05, band = 'loud', smooth = .15) { this.ensureCam(); const v = this.video; this.camCfg.extra.push(lt => v.music ? amount * v.music.energy(this.start + lt, band, smooth) : 0); return this; }
  // rhythm modulation of elements: onBeat('.logo', {scale:.08, brightness:.4, unit:'beat'|'bar'|'onset', every, k, beats:[2,4]})
  onBeat(target, o = { scale: .06 }) { toEls(target, this.el).forEach(el => { const f = modulator(this.video, el, o, null); this.on((l, p, t) => f(t)); }); return this; }
  // energize('.bg', {scale:[1,1.1], brightness:[.7,1.3], band:'low', smooth:.1})
  energize(target, o = { scale: [1, 1.08] }) { toEls(target, this.el).forEach(el => { const f = modulator(this.video, el, null, o); this.on((l, p, t) => f(t)); }); return this; }
  // ---- layers ----
  canvas(draw, o = {}) { return this.video.addLayer('canvas', draw, { ...o, scene: this }); }
  webgl(o = {}) { return this.video.addLayer('webgl', null, { ...o, scene: this }); }
  // vk.gl effects layer (fx/gl): sc.gl([effects], {z, rect, scale, blend}) or sc.gl({…opts}, [effects])
  gl(effects, o = {}) { if (effects && !Array.isArray(effects) && !effects.render) { const t = effects; effects = o; o = t; } return this.video.addLayer('gl', null, { ...o, scene: this, effects: [].concat(effects || []) }); }
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
  // ---- voice lines (scene vo:) ----
  voAt(i = 0) { const s = this.voSegs && this.voSegs[i]; return s ? s.at : 0; }        // scene-local start of line i
  voEndAt(i) { const S = this.voSegs || []; if (i == null) return this.voEnd || 0; const s = S[i]; return s ? s.end : 0; }
  // 0..1 "is talking" envelope at scene-local time for line i (or any line when i is null / a `who` string).
  // Uses TTS word timings; without TTS audio yet, a 4 Hz syllable estimate over the planned span.
  speaking(local, i) {
    const S = (this.voSegs || []).filter((s, j) => i == null || j === i || s.who === i);
    let v = 0;
    for (const s of S) {
      if (local < s.at - .1 || local > s.end + .1) continue;
      v = Math.max(v, s.words ? speakingAt(s.words, local - s.at) : Math.abs(Math.sin((local - s.at) * Math.PI * 4)));
    }
    return v;
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
