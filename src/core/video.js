// Video: owns the stage, scene graph, timeline, layers, captions and the pure render(t).
import { EASE, getEase, setDefaultEase } from './ease.js';
import { mulberry32, hash } from './random.js';
import { BeatGrid, parseDur, parseTime } from './time.js';
import { Timeline } from './timeline.js';
import { cameraTransform } from './camera.js';
import { registry } from './plugin.js';
import { Scene, mk } from './scene.js';
import { resolveFormat } from '../authoring/formats.js';
import { resolveTheme, modeVars } from '../authoring/themes.js';
import { fontFaces, stageCSS } from '../runtime/css.js';
import { buildPreviewUI } from '../runtime/preview.js';
import { runQA, visibleText } from '../runtime/qa.js';
import { makeScore } from '../audio/score.js';
import { CanvasLayer } from '../layers/canvas.js';
import { WebGLLayer } from '../layers/webgl.js';
import { parseDeclarative } from '../authoring/declarative.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const RENDER = Q.get('render') === '1';

export class Video {
  static registry = registry;
  constructor(cfg = {}, env = {}) {
    this.cfg = cfg = Object.assign({ fps: 30, transition: 'fade:0.4', localFonts: true, holdLast: true }, cfg);
    this.base = env.base || '';
    const fmtName = Q.get('format') || cfg.format || (cfg.w && cfg.h ? null : '16:9');
    const fmt = resolveFormat(fmtName, Q.get('format') ? 0 : (cfg.w || cfg.width), Q.get('format') ? 0 : (cfg.h || cfg.height));
    this.format = fmtName; this.W = fmt.w; this.H = fmt.h;
    this.safe = Object.assign({}, fmt.safe, cfg.safe || {}); this.zones = cfg.zones || fmt.zones; this.captionBottom = cfg.captionBottom != null ? cfg.captionBottom : fmt.captionBottom;
    this.fps = +(Q.get('fps') || cfg.fps);
    this.theme = resolveTheme(cfg.theme);
    this.k = Math.min(this.W, this.H) / 720;           // type scale factor
    setDefaultEase(cfg.ease || this.theme.ease || 'outCubic');
    this.beats = new BeatGrid({ fps: this.fps, bpm: cfg.bpm, offset: cfg.beatOffset, times: cfg.beats });
    this.tl = new Timeline();
    this.scenes = []; this.layers = []; this.globalFns = []; this.overlays = []; this.caps = (cfg.captions || []).slice();
    this.events = Array.isArray(cfg.score) ? cfg.score.slice() : [];
    this.pendingMedia = []; this.afterFonts = []; this.duration = 0; this.curT = 0; this.finalized = false;
    this.ui = null; this.playing = false; this.ccOn = true;
    if (RENDER) document.documentElement.classList.add('vk-render');
    // seeded Math.random (setup code only; inside render use vk.hash(i + frame))
    const r = mulberry32(+(Q.get('seed') || cfg.seed || 1)); Math.random = () => r();
    this.stage = document.getElementById('stage') || mk('div', null, document.body);
    this.stage.id = 'stage'; this.stage.classList.add('vk-stage');
    this.injectCSS();
    this.applyThemeVars(this.stage, this.theme.mode);
    const existing = [...this.stage.querySelectorAll(':scope > section.scene, :scope > section.vk-scene')];
    this.scenesEl = mk('div', 'vk-scenes', null); this.stage.insertBefore(this.scenesEl, this.stage.firstChild);
    existing.forEach(sec => this.scenesEl.appendChild(sec));
    if (existing.length) parseDeclarative(this, existing);
    if (!cfg.manual) setTimeout(() => this.finalize(), 0);
  }

  /* ---------------- style ---------------- */
  injectCSS() {
    const s = document.createElement('style'); s.id = 'vk-style';
    s.textContent = (this.cfg.localFonts ? fontFaces(this.base + 'fonts/') : '') + stageCSS(this);
    document.head.appendChild(s);
    const th = this.theme, k = this.k, st = this.stage.style;
    st.setProperty('--vk-sans', th.fonts.sans); st.setProperty('--vk-display', th.fonts.display); st.setProperty('--vk-mono', th.fonts.mono);
    st.setProperty('--vk-serif', th.fonts.serif); st.setProperty('--vk-condensed', th.fonts.condensed || th.fonts.display);
    Object.entries(th.scale).forEach(([n, px]) => st.setProperty('--vk-fs-' + n, Math.round(px * k) + 'px'));
    st.setProperty('--vk-gap', Math.round(28 * k) + 'px'); st.setProperty('--vk-radius', Math.round(th.radius * k) + 'px');
    st.setProperty('--vk-marker', th.marker); st.setProperty('--vk-caret', th.caret);
    const vert = this.W < this.H;
    st.setProperty('--cap-size', Math.round(this.cfg.captionSize || th.scale.caption * k) + 'px');
    st.setProperty('--cap-bottom', Math.round(this.captionBottom) + 'px');
    st.setProperty('--safe-top', this.safe.top + 'px'); st.setProperty('--safe-right', this.safe.right + 'px');
    st.setProperty('--safe-bottom', this.safe.bottom + 'px'); st.setProperty('--safe-left', this.safe.left + 'px');
    if (vert) this.stage.classList.add('vk-vertical');
  }
  applyThemeVars(el, mode) { Object.entries(modeVars(this.theme, mode)).forEach(([k, v]) => el.style.setProperty(k, v)); }
  px(n) { return Math.round(n * this.k); }
  color(name, mode) { const m = this.theme.modes[mode || this.theme.mode]; return m[name] || this.theme[name] || name; }

  /* ---------------- scenes ---------------- */
  // scene(name, dur, [nodes]) | scene(name, dur, opts, [nodes]) | scene({name, dur, ...}, [nodes])
  scene(name, dur, opts, nodes) {
    let o;
    if (typeof name === 'object' && !Array.isArray(name)) { o = { ...name }; nodes = dur; }
    else { if (Array.isArray(opts) || typeof opts === 'function') { nodes = opts; opts = {}; } o = { ...(opts || {}), name, dur }; }
    if (this.finalized) console.warn('[vk] scene added after finalize(); call vk.video({manual:true}) and v.start()');
    const sc = new Scene(this, o);
    const prev = this.scenes[this.scenes.length - 1];
    sc.transition = prev ? parseTransition(o.transition != null ? o.transition : this.cfg.transition) : { type: 'none', d: 0 };
    if (o.start != null) sc.start = parseTime(o.start, this.beats);
    else sc.start = prev ? prev.start + prev.dur - sc.transition.d : 0;
    const auto = o.dur === 'auto' || o.dur == null;
    sc.dur = auto ? 0 : parseDur(o.dur, this.beats);
    // palette mode / background
    let mode = o.mode, bg = o.bg;
    if (typeof bg === 'string' && this.theme.modes[bg]) { mode = bg; bg = null; }
    mode = mode || this.theme.mode; sc.mode = mode;
    this.applyThemeVars(sc.el, mode);
    if (typeof bg === 'string' && /^(#|rgb|hsl|linear|radial)/.test(bg)) { sc.el.style.background = bg; bg = null; }
    this.scenes.push(sc); this.scenesEl.appendChild(sc.el); sc.el.style.zIndex = String(sc.index + 1);
    if (bg) [].concat(bg).forEach(b => this.addBackground(sc, b));
    if (o.texture) Object.entries(o.texture).forEach(([n, x]) => x && sc.texture(n, x));
    if (o.camera) sc.camera(o.camera);
    if (o.shake) [].concat(o.shake).forEach(s => typeof s === 'object' ? sc.shake(s.t, s.amp, s.d) : sc.shake(s));
    if (typeof nodes === 'function') nodes(sc, this);
    else if (nodes) this.buildNodes(sc, [].concat(nodes).flat(), sc.content);
    if (auto) sc.dur = Math.max(1.5, sc.maxT + (o.hold != null ? o.hold : 2.2));
    if (o.sfx !== false && this.cfg.autoSfx && prev && sc.transition.d > 0) this.sfx(sc.start + Math.min(.05, sc.transition.d / 2), 'whoosh', .5);
    return sc;
  }
  addBackground(sc, spec) {
    const name = typeof spec === 'string' ? spec : spec.type, f = registry.backgrounds[name];
    if (!f) { console.warn('[vk] unknown background', name); return; }
    const r = f(sc, typeof spec === 'string' ? {} : spec, this);
    if (r && r.el) { r.el.classList.add('vk-bg'); (sc.cam || sc.el).insertBefore(r.el, (sc.cam || sc.el).firstChild); }
    if (r && r.update) sc.bgs.push(r.update);
  }
  // Build authoring nodes (see authoring/api.js). A node is {build(ctx) → Element|Element[]|null}.
  buildNodes(sc, nodes, parent) {
    const ctx = makeCtx(this, sc);
    nodes.forEach(n => { if (!n) return; const el = typeof n === 'function' ? n(ctx) : n.build ? n.build(ctx) : n; if (el && el.nodeType) placeNode(el, n, sc, parent); else if (Array.isArray(el)) el.forEach(e => e && e.nodeType && placeNode(e, n, sc, parent)); });
  }
  addLayer(kind, draw, o) {
    const Cls = kind === 'webgl' ? WebGLLayer : kind === 'canvas' ? CanvasLayer : registry.layers[kind];
    const layer = new Cls(this, draw, o);
    const host = o.scene ? (o.fixed || !o.scene.cam ? o.scene.el : o.scene.cam) : this.stage;
    if (layer.el) {
      if (o.z === 'back' || o.z === 'below') { const bgs = [...host.children].filter(c => c.classList.contains('vk-bg')); host.insertBefore(layer.el, bgs.length ? bgs[bgs.length - 1].nextSibling : host.firstChild); }
      else host.appendChild(layer.el);
      if (o.zIndex != null) layer.el.style.zIndex = o.zIndex;
    }
    (o.scene ? o.scene.layers : this.layers).push(layer);
    return layer;
  }
  // absolute-time helpers
  tween(target, o) { this.tl.tween(typeof target === 'string' ? [...this.stage.querySelectorAll(target)] : [].concat(target), o, null); return this; }
  onRender(fn) { this.globalFns.push(fn); return this; }
  canvas(draw, o = {}) { return this.addLayer('canvas', draw, { z: 'front', zIndex: 30, ...o }); }
  sfx(t, name, gain = 1, freq) { this.events.push([+t.toFixed(3), name, gain, freq]); return this; }
  caption(start, end, text, words) { this.caps.push(words ? [start, end, text, words] : [start, end, text]); return this; }
  texture(name, opts) { const f = registry.textures[name]; if (!f) { console.warn('[vk] unknown texture', name); return this; } const r = f(this, opts === true ? {} : typeof opts === 'number' ? { amount: opts } : (opts || {})); if (r) this.overlays.push(r); return this; }

  // local time when the scene's entrance animations are done (latest tween end before the scene hands over);
  // used by QA / stills / contact sheets to pick a representative frame
  settleOf(sc) {
    const nx = this.scenes[sc.index + 1], visEnd = (nx ? nx.start : sc.end) - sc.start - .25;
    let m = Math.max(sc.transition.d || 0, Math.min(sc.maxT, visEnd));
    this.tl.els.forEach(S => { if (S.owner !== sc) return; Object.values(S.props).forEach(arr => arr.forEach(tr => { const e = tr.t0 + tr.d; if (e <= visEnd && e > m) m = e; })); });
    return +m.toFixed(3);
  }
  /* ---------------- finalize ---------------- */
  start() { return this.finalize(); }
  finalize() {
    if (this.finalized) return this; this.finalized = true;
    const S = this.scenes;
    // a scene overlapped by the next one stays fully visible underneath (the incoming scene does the transition)
    this.duration = this.cfg.duration || S.reduce((m, s) => Math.max(m, s.start + s.dur), 0);
    // captions from per-scene `cap`
    S.forEach((sc, i) => {
      if (!sc.cap) return; const nx = S[i + 1];
      const end = Math.min(sc.end, nx ? nx.start + Math.min(.15, nx.transition.d) : sc.end) - .3;
      [].concat(sc.cap).forEach((c, j, arr) => { // array → split scene time evenly
        const a = sc.start + (i ? Math.max(.35, sc.transition.d) : .4), span = (end - a) / arr.length;
        if (typeof c === 'string') this.caps.push([a + j * span, a + (j + 1) * span - (j < arr.length - 1 ? .05 : 0), c]);
        else this.caps.push([sc.start + c[0], sc.start + c[1], c[2], c[3]]);
      });
    });
    this.caps.sort((a, b) => a[0] - b[0]);
    // overlays & textures
    this.flashEl = mk('div', 'vk-flash', this.stage);
    const tex = this.cfg.texture || {};
    Object.entries(tex).forEach(([n, o]) => o && this.texture(n, o));
    this.overlays.forEach(o => { if (o.el) this.stage.appendChild(o.el); });
    if (this.caps.length) this.capEl = mk('div', 'vk-cap', this.stage);
    registry.hooks.init.forEach(f => f(this));
    const fontsCheck = this.cfg.fontsCheck || ['400 20px "Noto Sans SC"', '700 20px "Noto Sans SC"', '900 20px "Noto Sans SC"', '400 20px "JetBrains Mono"', '700 20px "JetBrains Mono"',
      '900 20px "Archivo"', '400 20px "Anton"', '400 20px "Instrument Serif"'];
    this.fontsCheck = fontsCheck;
    window.__ready = Promise.all([
      Promise.all(fontsCheck.map(f => document.fonts.load(f, '中文Aa0'))).catch(() => { }),
      Promise.all([...this.stage.querySelectorAll('img')].map(im => im.decode ? im.decode().catch(() => { }) : null)),
    ]).then(() => document.fonts.ready).then(() => { this.afterFonts.forEach(f => f()); this.render(this.curT); return true; });
    Object.assign(window, {
      __duration: this.duration, __fps: this.fps, __size: { width: this.W, height: this.H }, __captions: this.caps,
      __audio: this.cfg.audio ? new URL(this.cfg.audio, location.href).href : null,
      __scenes: S.map(s => ({ index: s.index, name: s.name, start: s.start, dur: s.dur, transition: s.transition, settle: this.settleOf(s) })),
      __cues: this.events.map(e => e[0]),
      __vk: { theme: this.cfg.theme || 'tech-blue', format: this.format, safe: this.safe, zones: this.zones, title: this.cfg.title || document.title },
      __text: t => { if (t != null) this.render(t); return visibleText(this.stage); },
      __seek: t => { this.render(t); return Promise.all(this.pendingMedia).then(() => t); },
      __qa: t => { if (t != null) this.render(t); return runQA(this); },
    });
    if (this.events.length || this.cfg.scoreFn) window.SCORE = this.cfg.scoreFn || makeScore(this.events, this.cfg.scoreOptions || {}, this);
    if (this.cfg.audio && !RENDER) { this.audioEl = new Audio(this.cfg.audio); this.audioEl.preload = 'auto'; }
    if (RENDER) this.render(+Q.get('t') || 0);
    else setTimeout(() => { this.ui = buildPreviewUI(this, Q); }, 0);
    return this;
  }

  /* ---------------- render(t): pure ---------------- */
  render(t) {
    t = Math.max(0, Math.min(t, this.duration - 1e-6)); this.curT = t;
    const S = this.scenes, active = [], W = this.W, H = this.H;
    let flash = 0, flashColor = '#fff';
    for (const sc of S) {
      const local = t - sc.start, on = local >= 0 && local < sc.dur;
      if (sc.el.classList.contains('on') !== on) sc.el.classList.toggle('on', on);
      if (!on) continue;
      active.push(sc);
      sc.__st = { opacity: '', transform: '', filter: '', clipPath: '', transformOrigin: '', zIndex: String(sc.index + 1) };
    }
    // transitions: scene i's transition drives both i (incoming) and i-1 (outgoing)
    for (const sc of active) {
      const tr = sc.transition, local = t - sc.start;
      if (!tr.d || local >= tr.d) continue;
      const T = registry.transitions[tr.type] || registry.transitions.fade;
      const raw = local / tr.d, prev = S[sc.index - 1];
      const r = T(getEase(tr.ease || 'inOutCubic')(raw), { raw, local, W, H, fps: this.fps, frame: Math.floor(t * this.fps), o: tr, video: this, inScene: sc, outScene: prev }) || {};
      if (r.in) Object.assign(sc.__st, r.in);
      if (r.out && prev && prev.__st) Object.assign(prev.__st, r.out);
      if (r.under && prev && prev.__st) { sc.__st.zIndex = String(prev.index); prev.__st.zIndex = String(prev.index + 2); }
      if (r.flash != null && r.flash > flash) { flash = r.flash; flashColor = r.flashColor || '#fff'; }
    }
    // end fade to black (cfg.fadeOut seconds)
    const fo = this.cfg.fadeOut; if (fo && t > this.duration - fo) { const last = active[active.length - 1]; if (last) last.__st.opacity = String(Math.max(0, (this.duration - t) / fo)); }
    for (const sc of active) {
      const st = sc.__st, es = sc.el.style;
      for (const k in st) if (es[k] !== String(st[k])) es[k] = st[k];
      const c = sc.camCfg;
      if (sc.cam && (c.keys || c.push || c.shakes.length || c.extra.length)) {
        c.extraZoom = c.extra.length ? lt => c.extra.reduce((m, f) => m + f(lt), 0) : null;
        sc.cam.style.transform = cameraTransform(c, W, H, t - sc.start, sc.dur);
      }
    }
    this.tl.els.forEach((St, el) => {
      if (!St.owner) { this.tl.apply(el, St, t); return; }
      if (active.includes(St.owner)) this.tl.apply(el, St, t - St.owner.start);
    });
    const info = { t, W, H, fps: this.fps, frame: Math.floor(t * this.fps), beats: this.beats, video: this };
    for (const sc of active) {
      const local = t - sc.start, p = local / sc.dur;
      for (const b of sc.bgs) b(local, p, t);
      for (const f of sc.fns) f(local, p, t);
      for (const L of sc.layers) L.render(local, { ...info, local, p, scene: sc });
      if (sc.el.getAnimations) sc.el.getAnimations({ subtree: true }).forEach(a => { if (a.playState !== 'paused') a.pause(); a.currentTime = local * 1000; });
    }
    for (const L of this.layers) L.render(t, { ...info, local: t, p: t / this.duration });
    for (const f of this.globalFns) f(t);
    if (this.flashEl) { this.flashEl.style.opacity = flash; if (flash) this.flashEl.style.background = flashColor; }
    for (const o of this.overlays) o.update && o.update(t, info);
    this.renderCaption(t);
    this.syncMedia(t, active);
    registry.hooks.frame.forEach(f => f(t, this));
    if (this.ui) this.ui.update(t);
  }
  renderCaption(t) {
    if (!this.capEl) return;
    let c = null;
    for (const x of this.caps) if (t >= x[0] && t < x[1]) { c = x; break; }
    const el = this.capEl;
    if (c && this.ccOn) {
      if (el.__c !== c) { el.__c = c; if (c[3]) el.innerHTML = c[3].map(w => `<span class="kw">${esc(w.w)}</span>`).join(''); else el.textContent = c[2]; }
      if (c[3]) [...el.children].forEach((s, i) => s.classList.toggle('on', t >= c[3][i].t));  // word-level timing (Phase 2 VO / lyrics)
      el.style.opacity = Math.max(0, Math.min(1, (t - c[0]) / .2, (c[1] - t) / .2));
    } else el.style.opacity = 0;
  }
  syncMedia(t, active) {
    this.pendingMedia = [];
    for (const sc of active) sc.el.querySelectorAll('video[data-t]').forEach(v => {
      const lt = Math.max(0, t - sc.start - (+v.dataset.t || 0));
      if (RENDER || !this.playing) {
        if (Math.abs(v.currentTime - lt) > .001) { v.pause(); v.currentTime = lt; this.pendingMedia.push(new Promise(r => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 2000); })); }
      } else if (Math.abs(v.currentTime - lt) > .25) v.currentTime = lt;
    });
  }
  seek(t) { this.render(t); }
}

export function parseTransition(v) {
  if (!v || v === 'none' || v === 'cut') return { type: 'none', d: 0 };
  if (typeof v === 'object') return { d: .5, ...v, type: v.type || 'fade' };
  const [type, d] = String(v).split(':');
  return { type, d: d != null ? +d : (DEFAULT_TR_D[type] || .5) };
}
const DEFAULT_TR_D = { fade: .4, flash: .4, blur: .45, glitch: .4, slice: .4, dip: .6, 'zoom-through': .7 };

function makeCtx(v, sc) {
  return {
    video: v, scene: sc, theme: v.theme, W: v.W, H: v.H, px: n => v.px(n),
    // resolve an element's start time and advance the scene's authoring cursor
    at(o = {}) {
      let t;
      if (o.at != null) t = sc.time(o.at);
      else t = sc.cursor == null ? .3 : sc.cursor + (o.gap != null ? o.gap : v.theme.cascade);
      sc.cursor = t; sc.maxT = Math.max(sc.maxT, t + .6); return t;
    },
    advance(t) { sc.cursor = Math.max(sc.cursor || 0, t); sc.maxT = Math.max(sc.maxT, t); },
    extend(t) { sc.maxT = Math.max(sc.maxT, t); },
    build(nodes, parent) { v.buildNodes(sc, [].concat(nodes).flat(), parent); },
  };
}
function placeNode(el, n, sc, parent) {
  if (el.parentNode) return;
  const o = (n && n.o) || {};
  if (o.fixed) sc.fixed.appendChild(el);
  else if (o.pos || el.classList.contains('vk-abs')) (sc.cam || sc.el).appendChild(el);
  else parent.appendChild(el);
}
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
export { EASE, hash };
