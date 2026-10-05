// Video: owns the stage, scene graph, timeline, layers, captions and the pure render(t).
import { EASE, getEase, setDefaultEase } from './ease.js';
import { mulberry32, hash } from './random.js';
import { BeatGrid, parseDur, parseTime, gridEnd } from './time.js';
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
import { MusicInfo } from '../audio/music.js';
import { modulator } from '../fx/rhythm.js';
import { alignToCues, chunkCues, mapWords, estimateSpeech, voSegments, voKey, planVoice, speakingAt } from '../audio/words.js';
import { CanvasLayer } from '../layers/canvas.js';
import { WebGLLayer } from '../layers/webgl.js';
import { parseDeclarative } from '../authoring/declarative.js';
import { bake as bakeEl, bakeStats } from '../runtime/bake.js';
import { motionBlurCfg } from '../fx/mg/math.js';
import { ensureLazy } from './plugin.js';

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
    // sub-frame motion blur (opt-in): cfg.motionBlur {shutter:'1/40', samples:4} is read by `vk render` (window.__motionBlur);
    // ?mb=1 = the capture pipeline is averaging sub-frames, so in-page (canvas layer) blur must not blur twice
    this.motionBlur = motionBlurCfg(cfg.motionBlur, this.fps); this.mbPipeline = Q.get('mb') === '1'; this.frameT = null;
    this.theme = resolveTheme(cfg.theme);
    this.k = Math.min(this.W, this.H) / 720;           // type scale factor
    setDefaultEase(cfg.ease || this.theme.ease || 'outCubic');
    // ---- music + beat grid (Phase 2): beats may be a time list, or a `vk analyze` JSON (path or object) ----
    this.lead = cfg.lead != null ? +cfg.lead : 1;                   // visual hits land `lead` frames before the sound
    if (cfg.music && !cfg.audio) cfg.audio = cfg.music;
    this.musicStart = +(cfg.musicStart || 0); this.musicGain = cfg.musicGain != null ? +cfg.musicGain : 1;
    let bdata = typeof cfg.beats === 'string' ? loadJSON(cfg.beats) : (cfg.beats && !Array.isArray(cfg.beats) && cfg.beats.beats ? cfg.beats : null);
    if (bdata) this.music = new MusicInfo(bdata, { start: this.musicStart, fps: this.fps, lead: this.lead });
    this.beats = new BeatGrid(this.music
      ? { fps: this.fps, lead: this.lead, bpm: bdata.bpm, times: this.music.beats, downbeats: this.music.downbeats, meter: this.music.meter }
      : { fps: this.fps, lead: this.lead, bpm: cfg.bpm, offset: cfg.beatOffset, times: Array.isArray(cfg.beats) ? cfg.beats : null, downbeats: cfg.downbeats, meter: cfg.meter, downbeat: cfg.downbeat });
    this.tl = new Timeline();
    this.scenes = []; this.layers = []; this.globalFns = []; this.overlays = [];
    this.caps = typeof cfg.captions === 'string' ? alignToCues(loadJSON(cfg.captions), { offset: this.musicStart }) : (cfg.captions || []).slice();
    // lyrics: align JSON (vk align) → word-timed cues; shown as karaoke captions unless {captions:false}
    this.lyrics = [];
    if (cfg.lyrics) {
      const L = typeof cfg.lyrics === 'string' ? { src: cfg.lyrics } : cfg.lyrics, data = L.src ? loadJSON(L.src) : L.data || L;
      this.lyrics = alignToCues(data, { offset: L.offset != null ? L.offset : this.musicStart, hold: L.hold });
      if (L.captions) this.caps.push(...this.lyrics);
    }
    // voice-over (TTS): manifest written by `vk tts page.html`; scenes with `vo:` get audio, timing and captions
    const VC = cfg.voice ? (typeof cfg.voice === 'string' ? { manifest: cfg.voice } : { ...cfg.voice }) : null;
    this.voiceCfg = VC; this.voices = []; this.voRequests = []; this.voMissing = [];
    if (VC) {
      VC.manifest = VC.manifest || (location.pathname.split('/').pop().replace(/\.html?$/i, '') + '.vo.json');
      this.voManifest = loadJSON(VC.manifest, true);
      this.voBase = new URL(VC.manifest, location.href).href.replace(/[^/]*$/, '');
    }
    this.events = Array.isArray(cfg.score) ? cfg.score.slice() : [];
    this.pendingMedia = []; this.afterFonts = []; this.duration = 0; this.curT = 0; this.finalized = false;
    this.ui = null; this.playing = false; this.ccOn = true;
    // static layer cache (runtime/bake.js): jobs queued while building, rasterised after fonts load, before __ready
    this.bakeOn = cfg.bake !== false && Q.get('cache') !== '0'; this.bakeJobs = [];
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
    st.setProperty('--vk-serif', th.fonts.serif); if (th.fonts.brush) st.setProperty('--vk-brush', th.fonts.brush); st.setProperty('--vk-condensed', th.fonts.condensed || th.fonts.display);
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
  // vk.bake(el, o): rasterise static SVG content once (see runtime/bake.js). Returns a promise → true when baked.
  bake(el, o = {}) {
    if (!this.bakeOn || !el) return Promise.resolve(false);
    let res; const p = new Promise(r => { res = r; });
    this.bakeJobs.push(() => bakeEl(el, o).then(ok => { res(ok); return ok; }));
    if (this.bakesStarted) this.bakesStarted = this.bakesStarted.then(() => this.bakeJobs.splice(0).reduce((q, j) => q.then(j), Promise.resolve()));
    return p;
  }
  // preload work that must finish before capture (vk.three assets, shader compiles …): a promise, or fn() → promise
  // called once web fonts have loaded. Unlike bakeLater it always runs (also with --no-cache).
  waitFor(job) { (this.waits || (this.waits = [])).push(job); return this; }
  runWaits() { const W = (this.waits || []).splice(0); return W.length ? Promise.all(W.map(j => (typeof j === 'function' ? j() : j))) : null; }
  // arbitrary async static-cache work (textures): fn() → promise, awaited before __ready
  bakeLater(fn) { if (this.bakeOn) this.bakeJobs.push(() => Promise.resolve().then(fn).catch(e => console.warn('[vk] bake skipped:', e && e.message || e))); return this.bakeOn; }
  runBakes() {
    this.stage.querySelectorAll('[data-vk-bake],[data-vk-static]').forEach(el => this.bake(el));
    const jobs = this.bakeJobs.splice(0);
    // sequential: bounded memory, and bakes of nested elements (outer after inner) stay ordered
    this.bakesStarted = jobs.reduce((q, j) => q.then(j), Promise.resolve());
    return this.bakesStarted.then(() => { window.__bake = { ...bakeStats, on: this.bakeOn }; });
  }
  applyThemeVars(el, mode) { Object.entries(modeVars(this.theme, mode)).forEach(([k, v]) => el.style.setProperty(k, v)); }
  px(n) { return Math.round(n * this.k); }
  color(name, mode) { const m = this.theme.modes[mode || this.theme.mode]; return m[name] || this.theme[name] || name; }

  /* ---------------- scenes ---------------- */
  // scene(name, dur, [nodes]) | scene(name, dur, opts, [nodes]) | scene({name, dur, ...}, [nodes])
  scene(name, dur, opts, nodes) {
    let o;
    if (typeof name === 'object' && !Array.isArray(name)) { o = { ...name }; nodes = dur; }
    else if (dur && typeof dur === 'object' && !Array.isArray(dur)) { o = { ...dur, name }; nodes = opts; }   // scene(name, {dur|end, …}, nodes)
    else { if (Array.isArray(opts) || typeof opts === 'function') { nodes = opts; opts = {}; } o = { ...(opts || {}), name, dur }; }
    if (this.finalized) console.warn('[vk] scene added after finalize(); call vk.video({manual:true}) and v.start()');
    const sc = new Scene(this, o);
    const prev = this.scenes[this.scenes.length - 1];
    sc.transition = prev ? parseTransition(o.transition != null ? o.transition : this.cfg.transition) : { type: 'none', d: 0 };
    ensureLazy('transitions', sc.transition.type);                 // opt-in packs (stripes, bars …) register on first use
    if (o.start != null) sc.start = parseTime(o.start, this.beats);
    else sc.start = prev ? prev.start + prev.dur - sc.transition.d : 0;
    const auto = (o.dur === 'auto' || o.dur == null) && o.end == null;
    sc.dur = auto ? 0 : parseDur(o.dur, this.beats);
    const cutIn = sc.start + sc.transition.d;                       // the moment the scene is fully on screen
    const gEnd = gridEnd(o.dur, this.beats, cutIn);               // 'b:N' / 'm:N' → end exactly on the grid
    if (gEnd != null) sc.dur = gEnd - sc.start;
    if (o.end != null) sc.dur = parseTime(o.end, this.beats) - sc.start;   // absolute cut time ('m:16', 'b:64', 42.5)
    // palette mode / background
    let mode = o.mode, bg = o.bg;
    if (typeof bg === 'string' && this.theme.modes[bg]) { mode = bg; bg = null; }
    mode = mode || this.theme.mode; sc.mode = mode;
    this.applyThemeVars(sc.el, mode);
    if (typeof bg === 'string' && /^(#|rgb|hsl|linear|radial)/.test(bg)) { sc.el.style.background = bg; bg = null; }
    this.scenes.push(sc); this.scenesEl.appendChild(sc.el); sc.el.style.zIndex = String(sc.index + 1);
    if (bg) [].concat(bg).forEach(b => this.addBackground(sc, b));
    if (o.texture) Object.entries(o.texture).forEach(([n, x]) => x && sc.texture(n, x));
    if (o.camera) sc.camera(o.camera, { hold: o.cameraHold });
    if (o.shots) sc.shots(o.shots, o.shotOptions || {});
    if (o.shake) [].concat(o.shake).forEach(s => typeof s === 'object' ? sc.shake(s.t, s.amp, s.d) : sc.shake(s));
    if (o.beat || o.energy) { sc.ensureCam(); const f = modulator(this, sc.cam, o.beat, o.energy); sc.on((l, p, t) => f(t)); }   // whole-frame rhythm
    if (o.vo) this.planSceneVoice(sc, o);                         // voice timing is known before the nodes → sc.voSegs usable while building
    if (typeof nodes === 'function') nodes(sc, this);
    else if (nodes) this.buildNodes(sc, [].concat(nodes).flat(), sc.content);
    if (auto) sc.dur = Math.max(1.5, sc.maxT + (o.hold != null ? o.hold : 2.2));
    if (o.vo) this.addVoice(sc, o, auto);
    // snap: extend numeric/auto durations so the next cut lands on the next beat / bar ('beat' | 'bar' | 'b:2' | 'm:2')
    const snap = o.snap !== undefined ? o.snap : this.cfg.snap;
    if (snap && gEnd == null && o.end == null && this.beats.active) {
      const m = /^(beat|bar|b|m)(?::(\d+))?$/.exec(String(snap)), unit = m && (m[1] === 'bar' || m[1] === 'm') ? 'bar' : 'beat', n = m && m[2] ? +m[2] : 1;
      sc.dur = this.beats.ceil(sc.start + sc.dur + this.beats.leadT, unit, n) - this.beats.leadT - sc.start;
    }
    if (sc.dur <= sc.transition.d) console.warn(`[vk] scene "${sc.name}" is shorter than its transition`);
    if (o.sfx !== false && this.cfg.autoSfx && prev && sc.transition.d > 0) this.sfx(sc.start + Math.min(.05, sc.transition.d / 2), 'whoosh', .5);
    return sc;
  }
  addBackground(sc, spec) {
    const name = typeof spec === 'string' ? spec : spec.type; ensureLazy('backgrounds', name); const f = registry.backgrounds[name];
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
  gl(effects, o = {}) { if (effects && !Array.isArray(effects) && !effects.render) { const t = effects; effects = o; o = t; } return this.addLayer('gl', null, { z: 'front', zIndex: 30, ...o, effects: [].concat(effects || []) }); }
  sfx(t, name, gain = 1, freq) { t = typeof t === 'string' ? parseTime(t, this.beats) + this.beats.leadT : t; this.events.push([+t.toFixed(3), name, gain, freq]); return this; }
  // ---- voice-over ----
  voiceEntry(text) { const M = this.voManifest; return M && M.items ? M.items[text] || null : null; }
  // plan the scene's voice lines (scene-local times). Multi-line / multi-voice: vo: [{text, voice, rate, pitch, gap, at, who}, …]
  planSceneVoice(sc, o) {
    const VC = this.voiceCfg || {}, cast = VC.cast || {}, segs = voSegments(o.vo).map(sg => (sg.who && cast[sg.who] ? { ...cast[sg.who], ...sg } : sg));
    const lead = o.voLead != null ? o.voLead : Math.max(VC.lead != null ? VC.lead : .45, sc.transition.d + .1);
    const entries = segs.map(sg => this.voiceEntry(voKey(sg)));
    const plan = planVoice(segs, segs.map((sg, i) => entries[i] ? entries[i].duration : estimateSpeech(sg.text)), { lead, gap: o.voGap != null ? o.voGap : (VC.gap != null ? VC.gap : .35) });
    plan.forEach((p, i) => { p.entry = entries[i]; p.key = voKey(segs[i]); p.words = entries[i] && entries[i].words ? entries[i].words : null; });
    sc.voSegs = plan; sc.voLead = lead;
    sc.voEnd = plan.length ? plan[plan.length - 1].end : lead;
  }
  addVoice(sc, o, auto) {
    const VC = this.voiceCfg || {}, plan = sc.voSegs || [];
    const tail = o.voTail != null ? o.voTail : (VC.tail != null ? VC.tail : .7);
    const file = location.pathname.split('/').pop();
    plan.forEach(p => {
      this.voRequests.push({ text: p.text, key: p.key, voice: p.voice || null, rate: p.rate || null, pitch: p.pitch || null, scene: sc.name });
      if (!p.entry) { this.voMissing.push(p.text); console.warn(`[vk] no TTS audio for scene "${sc.name}" line "${p.text.slice(0, 16)}" — run: vk tts ${file}`); }
    });
    const first = plan[0] || { at: sc.voLead }, end = sc.voEnd;
    if (auto) sc.dur = Math.max(sc.dur, end + tail);
    else if (end > sc.dur) console.warn(`[vk] voice-over of "${sc.name}" (${end.toFixed(2)}s) is longer than the scene (${sc.dur.toFixed(2)}s); use dur:'auto'`);
    const allOk = plan.every(p => p.entry);
    sc.vo = { text: plan.map(p => p.text).join(''), at: sc.start + first.at, dur: end - first.at, lead: first.at, entry: allOk ? (plan[0] && plan[0].entry) : null, segs: plan };
    plan.forEach(p => { if (p.entry) this.voices.push({ t: +(sc.start + p.at).toFixed(3), src: this.voBase + p.entry.file, file: p.entry.file, dur: p.entry.duration, gain: p.gain != null ? p.gain : (o.voGain != null ? o.voGain : (VC.gain != null ? VC.gain : 1)), scene: sc.name, text: p.text, voice: p.voice || null, who: p.who || null }); });
    if (o.cap === undefined && VC.captions !== false) {
      const caps = [];
      plan.forEach(p => {
        if (p.words && p.words.length) caps.push(...chunkCues(p.text, p.words, { at: sc.start + p.at, maxChars: VC.maxChars || (this.W < this.H ? 14 : 20) }));
        else p.text.split(/(?<=[。！？!?；;])/).filter(x => x.trim()).forEach((x, j, arr) => { const d = p.dur / arr.length; caps.push([sc.start + p.at + j * d, sc.start + p.at + (j + 1) * d - .05, x]); });
      });
      for (let i = 0; i < caps.length - 1; i++) caps[i][1] = Math.min(caps[i][1], caps[i + 1][0] - .04);   // lines of different speakers never overlap
      this.caps.push(...caps); sc.cap = null;
    }
  }
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
    // cover transitions (stripes, bars …: drawn above both scenes) share one canvas over the scene stack; only pages that use one get it
    if (S.some(sc => sc.transition.d && (registry.transitions[sc.transition.type] || {}).cover)) {
      const dpr = this.coverDpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
      this.coverEl = mk('canvas', 'vk-cover', this.stage); this.coverEl.width = Math.round(this.W * dpr); this.coverEl.height = Math.round(this.H * dpr); this.coverG = this.coverEl.getContext('2d');
    }
    this.flashEl = mk('div', 'vk-flash', this.stage);
    const tex = this.cfg.texture || {};
    Object.entries(tex).forEach(([n, o]) => o && this.texture(n, o));
    this.overlays.forEach(o => { if (o.el) this.stage.appendChild(o.el); });
    if (this.caps.length) this.capEl = mk('div', 'vk-cap', this.stage);
    registry.hooks.init.forEach(f => f(this));
    const fontsCheck = this.cfg.fontsCheck || ['400 20px "Noto Sans SC"', '700 20px "Noto Sans SC"', '900 20px "Noto Sans SC"', '400 20px "JetBrains Mono"', '700 20px "JetBrains Mono"',
      '900 20px "Archivo"', '400 20px "Anton"', '400 20px "Instrument Serif"'].concat(this.theme.fontsCheck || []);   // themes may add fonts (ink: Ma Shan Zheng, Noto Serif SC)
    this.fontsCheck = fontsCheck;
    window.__ready = Promise.all([
      Promise.all(fontsCheck.map(f => document.fonts.load(f, '中文Aa0'))).catch(() => { }),
      Promise.all([...this.stage.querySelectorAll('img')].map(im => im.decode ? im.decode().catch(() => { }) : null)),
    ]).then(() => document.fonts.ready).then(() => { this.afterFonts.forEach(f => f()); return this.runBakes(); }).then(() => this.runWaits()).then(() => { this.render(this.curT); return true; });
    Object.assign(window, {
      __duration: this.duration, __fps: this.fps, __size: { width: this.W, height: this.H }, __captions: this.caps,
      __audio: this.cfg.audio ? new URL(this.cfg.audio, location.href).href : null,
      __music: this.cfg.audio ? { src: new URL(this.cfg.audio, location.href).href, start: this.musicStart, gain: this.musicGain, duck: this.cfg.duck } : null,
      __voice: this.voices, __voRequests: this.voRequests, __voMissing: this.voMissing,
      __voiceCfg: this.voiceCfg ? { ...this.voiceCfg, manifestUrl: new URL(this.voiceCfg.manifest, location.href).href } : null,
      __mix: this.cfg.mix || null,
      __scenes: S.map(s => ({ index: s.index, name: s.name, start: s.start, dur: s.dur, transition: s.transition, settle: this.settleOf(s), vo: s.vo ? { at: s.vo.at, dur: s.vo.dur, missing: !s.vo.entry } : null })),
      __cues: this.events.map(e => e[0]),
      __vk: { theme: this.cfg.theme || 'tech-blue', format: this.format, safe: this.safe, zones: this.zones, title: this.cfg.title || document.title },
      __text: t => { if (t != null) this.render(t); return visibleText(this.stage); },
      // frameT: the nominal frame time when `vk render` samples sub-frames for motion blur (HUDs/timecodes stay sharp on it)
      __seek: (t, frameT) => { this.render(t, frameT); return Promise.all(this.pendingMedia).then(() => t); },
      __motionBlur: this.motionBlur,
      __qa: t => { if (t != null) this.render(t); return runQA(this); },
    });
    if (this.events.length || this.cfg.scoreFn) window.SCORE = this.cfg.scoreFn || makeScore(this.events, this.cfg.scoreOptions || {}, this);
    if (this.cfg.audio && !RENDER) { this.audioEl = new Audio(this.cfg.audio); this.audioEl.preload = 'auto'; }
    if (this.voices.length && !RENDER) this.voiceEls = this.voices.map(x => { const a = new Audio(x.src); a.preload = 'auto'; return { ...x, a }; });
    if (RENDER) this.render(+Q.get('t') || 0);
    else setTimeout(() => { this.ui = buildPreviewUI(this, Q); }, 0);
    return this;
  }

  /* ---------------- render(t): pure ---------------- */
  render(t, frameT) {
    t = Math.max(0, Math.min(t, this.duration - 1e-6)); this.curT = t;
    this.frameT = frameT != null ? Math.max(0, Math.min(+frameT, this.duration - 1e-6)) : t;
    const S = this.scenes, active = [], W = this.W, H = this.H;
    let flash = 0, flashColor = '#fff', covers = null;
    for (const sc of S) {
      const local = t - sc.start, on = local >= 0 && local < sc.dur;
      if (sc.el.classList.contains('on') !== on) sc.el.classList.toggle('on', on);
      if (!on) continue;
      active.push(sc);
      sc.__st = { opacity: '', transform: '', filter: '', clipPath: '', maskImage: '', webkitMaskImage: '', transformOrigin: '', zIndex: String(sc.index + 1) };
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
      if (r.cover) (covers || (covers = [])).push(r.cover);   // cover transitions draw above every scene
    }
    if (this.coverG) {                                            // cover transitions: one canvas above every scene
      const g = this.coverG; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.coverEl.width, this.coverEl.height);
      if (covers) for (const f of covers) { g.setTransform(this.coverDpr, 0, 0, this.coverDpr, 0, 0); g.save(); f(g); g.restore(); }
    }
    // end fade to black (cfg.fadeOut seconds)
    const fo = this.cfg.fadeOut; if (fo && t > this.duration - fo) { const last = active[active.length - 1]; if (last) last.__st.opacity = String(Math.max(0, (this.duration - t) / fo)); }
    for (const sc of active) {
      const st = sc.__st, es = sc.el.style;
      for (const k in st) if (es[k] !== String(st[k])) es[k] = st[k];
      const c = sc.camCfg;
      if (sc.cam && (c.keys || c.fn || c.push || c.shakes.length || c.extra.length)) {
        c.extraZoom = c.extra.length ? lt => c.extra.reduce((m, f) => m + f(lt), 0) : null;
        sc.cam.style.transform = cameraTransform(c, W, H, t - sc.start, sc.dur);
      }
    }
    this.tl.els.forEach((St, el) => {
      if (!St.owner) { this.tl.apply(el, St, t); return; }
      if (active.includes(St.owner)) this.tl.apply(el, St, t - St.owner.start);
    });
    const info = { t, W, H, fps: this.fps, frame: Math.floor(t * this.fps), frameT: this.frameT, beats: this.beats, video: this };
    for (const sc of active) {
      const local = t - sc.start, p = local / sc.dur;
      for (const b of sc.bgs) b(local, p, t);
      for (const f of sc.fns) f(local, p, t);
      for (const L of sc.layers) L.render(local, { ...info, local, p, scene: sc });
      if (sc.el.getAnimations) sc.el.getAnimations({ subtree: true }).forEach(a => { if (a.playState !== 'paused') a.pause(); a.currentTime = local * 1000; });
    }
    for (const L of this.layers) L.render(t, { ...info, local: t, p: t / this.duration });
    if (this.beats.active || this.music) this.setRhythmVars(t);
    for (const f of this.globalFns) f(t);
    if (this.flashEl) { this.flashEl.style.opacity = flash; if (flash) this.flashEl.style.background = flashColor; }
    for (const o of this.overlays) o.update && o.update(t, info);
    this.renderCaption(t);
    this.syncMedia(t, active);
    registry.hooks.frame.forEach(f => f(t, this));
    if (this.ui) this.ui.update(t);
  }
  // CSS custom properties for rhythm-reactive styling: var(--beat) var(--bar) var(--energy) var(--low) var(--mid) var(--high)
  setRhythmVars(t) {
    const st = this.stage.style, B = this.beats, M = this.music;
    st.setProperty('--beat', B.pulse(t).toFixed(3)); st.setProperty('--bar', B.barPulse(t).toFixed(3));
    if (M) { st.setProperty('--energy', M.energy(t).toFixed(3)); st.setProperty('--low', M.energy(t, 'low').toFixed(3)); st.setProperty('--mid', M.energy(t, 'mid').toFixed(3)); st.setProperty('--high', M.energy(t, 'high').toFixed(3)); }
  }
  // captions; cues with word timing render as karaoke: each word gets --p (0→1 while it is spoken, `lead` frames early)
  renderCaption(t) {
    if (!this.capEl) return;
    let c = null;
    for (const x of this.caps) if (t >= x[0] && t < x[1]) { c = x; break; }
    const el = this.capEl;
    if (c && this.ccOn) {
      if (el.__c !== c) {
        el.__c = c;
        if (c[3]) { const P = mapWords(c[2], c[3]); el.innerHTML = P.map(p => p.wi < 0 ? esc(p.s) : `<span class="kw" data-i="${p.wi}">${esc(p.s)}</span>`).join(''); el.__kw = [...el.querySelectorAll('.kw')].map(s => ({ s, w: c[3][+s.dataset.i] })); }
        else { el.textContent = c[2]; el.__kw = null; }
        el.classList.toggle('vk-karaoke', !!c[3]); el.dataset.style = this.cfg.karaoke || 'sweep';
      }
      if (el.__kw) { const tt = t + this.beats.leadT; for (const { s, w } of el.__kw) { const p = Math.max(0, Math.min(1, (tt - w.t) / Math.max(.05, (w.end || w.t + .2) - w.t))); s.style.setProperty('--p', p.toFixed(3)); s.classList.toggle('on', tt >= w.t); } }
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
// synchronous same-origin JSON load at build time (pages are plain scripts; keeps authoring code linear)
export function loadJSON(src, optional) {
  const x = new XMLHttpRequest(); x.open('GET', src, false);
  try { x.send(); } catch (e) { if (optional) return null; throw e; }
  if (x.status >= 400 || x.status === 0 && !x.responseText) { if (optional) return null; throw new Error('[vk] cannot load ' + src + ' (' + x.status + ')'); }
  return JSON.parse(x.responseText);
}
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
export { EASE, hash };
