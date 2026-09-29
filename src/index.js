// vidkit — deterministic HTML/JS → video framework. ES module entry; dist/vidkit.js exposes the same object as window.vk.
import { EASE, getEase, bezier, spring, steps, setDefaultEase } from './core/ease.js';
import { hash, hash2, mulberry32, noise1, noise2, boil, hrange, hpick } from './core/random.js';
import { clamp, clamp01, lerp, frac, seg, progress, kf, window01, BeatGrid, parseTime } from './core/time.js';
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
import './audio/score.js';

export const version = '0.1.0';
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
  clamp, clamp01, lerp, frac, seg, progress, kf, window01, stagger, lerpStr, compatible,
  BeatGrid, parseTime, shapePath, shapePoints, shapePolygon, resample, splitText,
  // beat helpers bound to the current video's grid
  beat: n => current.beats.at(n), pulse: (t, k, every) => current.beats.pulse(t, k, every), hit: (t, t0, k) => current.beats.hit(t, t0, k), snap: (t, t1, d) => current.beats.snap(t, t1, d),
  Video, Scene,
  _setEnv(e) { Object.assign(env, e); },
};
// blocks & charts registered in the registry are exposed as vk.<name> (terminal, cards, bar, line, …)
Object.entries(registry.blocks).forEach(([n, f]) => { if (!(n in vk)) vk[n] = f; });
export default vk;
