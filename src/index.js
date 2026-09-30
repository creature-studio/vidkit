// vidkit — deterministic HTML/JS → video framework. ES module entry; dist/vidkit.js exposes the same object as window.vk.
import { EASE, getEase, bezier, spring, steps, setDefaultEase } from './core/ease.js';
import { hash, hash2, mulberry32, noise1, noise2, boil, hrange, hpick } from './core/random.js';
import { clamp, clamp01, lerp, frac, seg, progress, kf, window01, BeatGrid, parseTime, smooth01, bump, plat, hold, inRanges, kfSpline } from './core/time.js';
import { stagger } from './core/stagger.js';
import { lerpStr, compatible } from './core/interp.js';
import { registry, register, use as usePlugin, list } from './core/plugin.js';
import { Video } from './core/video.js';
import { Scene } from './core/scene.js';
import { node, md } from './authoring/node.js';
import * as A from './authoring/api.js';
import { resolveFormat } from './authoring/formats.js';
import { resolveTheme } from './authoring/themes.js';
import { shapePath, shapePoints, shapePolygon } from './fx/shapes.js';
import { resample } from './fx/svg.js';
import { split as splitText } from './fx/text.js';
import './fx/transitions.js';
import './fx/blocks.js';
import './fx/charts.js';
import './fx/textures.js';
import './fx/backgrounds.js';
import './fx/lyrics.js';
import { inkDefs, installInk, brushPath, sampleLine, attr, INK } from './fx/ink.js';
import { createRig, solve2BoneIK, blink as rigBlink, blendPose, valueAt, mat, rootMatrix } from './fx/rig.js';
import './audio/score.js';
import { lyricVideo } from './fx/lyrics.js';
import { MusicInfo } from './audio/music.js';
import { alignToCues, chunkCues, mapWords, estimateSpeech, voSegments, voKey, planVoice, speakingAt } from './audio/words.js';
import * as synth from './audio/synth.js';
import { bakeStats, collectRefs, filterRegion } from './runtime/bake.js';
import { gl, particleSystem } from './fx/gl/index.js';

export const version = '0.2.0';
let current = null;
const env = { base: (() => { try { return new URL('../', import.meta.url).href; } catch (e) { return ''; } })() };

export const vk = {
  version,
  // ---- authoring ----
  video(cfg) { current = new Video(cfg, env); return current; },
  get current() { return current; },
  scene(...a) { if (!current) throw new Error('[vk] call vk.video({...}) first'); return current.scene(...a); },
  ...A,
  node, md,
  // JSON data: '#script-id' (inline <script type="application/json">) or same-origin URL (sync load at build time)
  json(src) {
    if (src.startsWith('#')) return JSON.parse(document.querySelector(src).textContent);
    const x = new XMLHttpRequest(); x.open('GET', src, false); x.send(); if (x.status >= 400) throw new Error('[vk] json ' + src + ' ' + x.status); return JSON.parse(x.responseText);
  },
  // ---- plugins ----
  use(plugin, opts) { usePlugin(vk, plugin, opts); return vk; },
  register, registry, list,
  get fx() { return registry.fx; }, get transitions() { return registry.transitions; }, get textures() { return registry.textures; },
  get backgrounds() { return registry.backgrounds; }, get themes() { return registry.themes; }, get formats() { return registry.formats; }, get sounds() { return registry.sounds; },
  resolveFormat, resolveTheme,
  // ---- core utilities (pure) ----
  ease: EASE, getEase, bezier, spring, steps, setDefaultEase,
  hash, hash2, rand: mulberry32, mulberry32, noise1, noise2, boil, hrange, hpick,
  clamp, clamp01, lerp, frac, seg, progress, kf, window01, stagger, lerpStr, compatible, smooth01, bump, plat, hold, inRanges, kfSpline,
  BeatGrid, parseTime, shapePath, shapePoints, shapePolygon, resample, splitText,
  // beat helpers bound to the current video's grid
  beat: n => current.beats.at(n), pulse: (t, k, every) => current.beats.pulse(t, k, every), hit: (t, t0, k) => current.beats.hit(t, t0, k), snap: (t, t1, d) => current.beats.snap(t, t1, d),
  // Phase 2 rhythm helpers (absolute video time). Bars are "measures" so they never clash with the vk.bar() chart.
  measure: n => current.beats.measure(n), beatIndex: t => current.beats.index(t), measureIndex: t => current.beats.barIndex(t),
  beatInBar: t => current.beats.beatInBar(t), barPulse: (t, k, every) => current.beats.barPulse(t, k, every),
  onBeat: (t, o = {}) => o.unit === 'bar' ? current.beats.barPulse(t, o.k || 4, o.every || 1) : o.unit === 'onset' ? vk.onsetHit(t, o.k, o.min) : current.beats.pulse(t, o.k || 6, o.every || 1),
  onsetHit: (t, k, min) => current.music ? current.music.onsetHit(t, k, min) : 0,
  energy: (t, band, smooth) => current.music ? current.music.energy(t, band, smooth) : 0,
  section: t => current.music ? current.music.section(t) : null,
  get sections() { return current && current.music ? current.music.sections : []; },
  get music() { return current && current.music; },
  get lyricLines() { return current ? current.lyrics : []; },
  quantize: (t, sub) => current.beats.quantize(t, sub),
  lyricVideo: o => lyricVideo(vk, o),
  // static layer cache: vk.bake(svgOrGroup, {scale}) → rasterised once (see runtime/bake.js)
  bake: (el, o) => current.bake(el, o), bakeStats, collectRefs, filterRegion,
  inkDefs, brushPath, sampleLine, attr, INK, installInk: o => installInk(current, o),
  // skeletal rigs (fx/rig.js): vk.rig(def) → rig; helpers on vk.rig.*
  rig: Object.assign(def => createRig(def), { create: createRig, solve2BoneIK, blink: rigBlink, blend: blendPose, valueAt, mat, rootMatrix }),
  // WebGL effects (fx/gl): vk.gl.layer / paper / inkBleed / inkWash / particles / shader / boil / paperCut …; vk.particles = pure particle system
  gl: Object.assign({}, gl, { stats: () => current && gl.core(current).stats }), particles: Object.assign(o => particleSystem(o), { presets: gl.presets }),
  MusicInfo, alignToCues, chunkCues, mapWords, estimateSpeech, voSegments, voKey, planVoice, speakingAt, synth,
  Video, Scene,
  _setEnv(e) { Object.assign(env, e); },
};
// blocks & charts registered in the registry are exposed as vk.<name> (terminal, cards, bar, line, …)
Object.entries(registry.blocks).forEach(([n, f]) => { if (!(n in vk)) vk[n] = f; });
export default vk;
