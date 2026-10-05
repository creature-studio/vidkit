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
import * as CAM from './core/camera.js';
import { motion } from './fx/motion.js';
import { puppet, puppetBones } from './styles/puppet.js';
import { style as makeStyle, registerStyle, listStyles, STYLES, Style, ROLES, material, MATERIALS, color, geom, parseSetting } from './styles/index.js';
import { PACKS } from './styles/packs.js';
import * as STYLE_KIT from './styles/kit.js';
import { bed as musicBed, scaleNotes, SCALES } from './styles/sound.js';
import { STYLE_TRANSITIONS, installStyleTransitions } from './styles/transitions.js';
import { film } from './styles/film.js';
import { parseStory } from './styles/story.js';
import { mg, accents, ui, montage, lockup, hudLayer } from './fx/mg/index.js';
import { listDetail, describe, names as allNames, common as commonParams, KINDS as META_KINDS, normKind, schemas } from './meta/index.js';
import { STRICT, setStrict, unknownMessage, unknownName } from './core/strict.js';
import { suggest, lev } from './core/names.js';

export const version = '0.2.0';
let current = null;
const env = { base: (() => { try { return new URL('../', import.meta.url).href; } catch (e) { return ''; } })() };

export const vk = {
  version,
  // ---- authoring ----
  // cfg.style: a style pack id / combination (see vk.style) — supplies theme, texture, transition, push … defaults
  video(cfg = {}) {
    const S = cfg.style ? makeStyle(cfg.style) : null;
    current = new Video(S ? S.videoCfg(cfg) : cfg, env);
    if (S) S.install(current);
    return current;
  },
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
  register, registry,
  // vk.list(kind) → names · vk.list(kind, {detail:true}) → [{name, description, params:{p:{type, default, range, description}}, example, aliases, …}]
  // vk.list() → kinds · kinds: fx transitions textures backgrounds blocks eases themes formats sounds materials styles three threeMaterials threeRigs
  list(kind, o) { if (kind == null) return META_KINDS.slice(); const k = normKind(kind); return o || !registry[k] || k === 'meta' ? listDetail(k, o || {}) : list(k); },
  describe: (kind, name) => describe(kind, name), commonParams, names: allNames, schemas,
  suggest, lev, get strict() { return STRICT.on; }, setStrict, unknownMessage, unknownName,
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
  // camera shot maths (core/camera.js) — also used by sc.shots(list, o)
  cam: { SHOTS: CAM.SHOTS, frameShot: CAM.frameShot, keepInFrame: CAM.keepInFrame, clampView: CAM.clampView, punchEnv: CAM.punchEnv, smoothFollow: CAM.smoothFollow, headBox: CAM.headBox, shotCamera: CAM.shotCamera, normKeys: CAM.normKeys, subjectHeight: CAM.subjectHeight },
  // reusable motion (fx/motion.js): gait/foot locking, lip-sync visemes, line boil, follow-through
  motion,
  // generic profile puppet on vk.rig, drawn in a style's character material
  puppet: Object.assign((parent, o = {}) => puppet(parent, { video: current, ...o, style: o.style ? (o.style.colour ? o.style : makeStyle(o.style).charView) : current && current.style ? current.style.charView : undefined }), puppetBones),
  // style packs (styles/<id>/): vk.style('ink') → Style; vk.style.list(); vk.style.register(json, runtimeFactory)
  style: Object.assign(spec => makeStyle(spec), {
    list: listStyles, get: id => STYLES[id], get packs() { return STYLES; }, ROLES, Style, parseSetting, material, MATERIALS,
    kit: STYLE_KIT, bed: musicBed, scaleNotes, SCALES, transitions: STYLE_TRANSITIONS, installTransitions: installStyleTransitions,
    register: (data, make) => registerStyle(data, typeof make === 'function' ? make(vk) : make || {}),
  }),
  // story → styled narrated film (styles/film.js); vk make generates pages that call this
  film: Object.assign((story, o) => film(vk, story, o), { parse: parseStory }),
  // motion-graphics pack (fx/mg): maths + painters, beat accents, UI micro-interactions, keyword montage, lockup, HUD
  mg, accents, ui, montage, lockup, hud: o => hudLayer(current, o),
  geom, color,
  MusicInfo, alignToCues, chunkCues, mapWords, estimateSpeech, voSegments, voKey, planVoice, speakingAt, synth,
  Video, Scene,
  _setEnv(e) { Object.assign(env, e); },
};
// blocks & charts registered in the registry are exposed as vk.<name> (terminal, cards, bar, line, …)
Object.entries(registry.blocks).forEach(([n, f]) => { if (!(n in vk)) vk[n] = f; });
// built-in style packs (styles/<id>/style.json + style.js), registered after vk exists (pack factories receive vk)
PACKS.forEach(p => registerStyle(p.data, p.make(vk)));
export default vk;
