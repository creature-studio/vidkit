// vk.three — optional three.js (r186, vendored) integration for vidkit. Load AFTER dist/vidkit.js:
//   <script src="../dist/vidkit.js"></script><script src="../dist/vidkit-three.js"></script>
// Pages that do not load this file are unchanged (it only adds vk.three, sc.three / v.three and the 'three' layer).
//   sc.three(setup, update, opts)   setup({THREE, scene, camera, renderer, rand, load, assets, layer}) → (Promise),
//                                   update(localT, info) — a pure function of t (called once per sub-frame sample)
//   sc.three(module | [modules], opts) with modules = vk.three.turntable(…) / vk.three.particles(…) / {setup, update}
//   opts: {z, rect, res .75, aa, motionBlur, camera (rig fn | state), fov, background, post {bloom, exposure, tone,
//          grade, vignette, grain, ca, dof, fade}, assets {name: url}, seed, key(lt)}
import * as THREE from '../../vendor/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from '../../vendor/three/examples/jsm/geometries/TextGeometry.js';
import * as BufferGeometryUtils from '../../vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
import * as M from './math.js';
import { unknownName } from '../core/strict.js';
import { makeLayerClass, applyCam, getThree } from './layer.js';
import { makeMaterials, makeSweep } from './materials.js';
import { makeProducts } from './products.js';
import { makeTurntable } from './turntable.js';
import { makeParticles } from './particles.js';
import { studioScene } from './env.js';
import { LookChain, PASSES as LOOK_PASSES, LOOKS, expandLook, makeToon } from './look.js';
import * as SHAPES from './shapes.js';
import { makeTerrain } from './terrain.js';
import * as TM from './terrainmath.js';
import { makeDiorama } from './diorama.js';
import { makePlate, PLATE_PRESETS, GLSL_LIB } from './plate.js';
import { makeText3d, FONTS3D, LETTER_PRESETS } from './text3d.js';
import { makeSim, makeSimCore } from './sim.js';
import { cacheKey, cacheGet, cachePut } from './cache.js';
import { mixerTimeline } from './mixer.js';
import { makeModel } from './model.js';
import techData from '../../styles/three-tech/style.json';
import techPack from '../../styles/three-tech/style.js';

const vk = window.vk;
if (!vk) throw new Error('[vk.three] load dist/vidkit.js before dist/vidkit-three.js');
const src = (document.currentScript && document.currentScript.src) || '';
const env = { base: src ? new URL('../', src).href : new URL('../', location.href).href };
const ThreeLayer = makeLayerClass(THREE, env);
vk.registry.layers.three = ThreeLayer;

// (setup, update, opts) | (setup, opts) | (module | [modules], opts) | (opts) → layer opts with modules
function norm(a, b, c) {
  let mods = [], o = {};
  if (typeof a === 'function') { mods.push({ setup: a, update: typeof b === 'function' ? b : null }); o = (typeof b === 'function' ? c : b) || {}; }
  else if (Array.isArray(a)) { mods = a.slice(); o = b || {}; }
  else if (a && (a.setup || a.update) && !a.modules && !a.post) { mods = [a]; o = b || {}; }
  else o = a || {};
  if (o.modules) mods = mods.concat(o.modules);
  if (o.setup || o.update) mods.push({ setup: o.setup, update: o.update });
  return { ...o, modules: mods };
}
// in a scene the 3D layer sits behind the scene's text/content by default (z: 'front' puts it on top)
vk.Scene.prototype.three = function (a, b, c) { return this.video.addLayer('three', null, { z: 'back', ...norm(a, b, c), scene: this }); };
vk.Video.prototype.three = function (a, b, c) { return this.addLayer('three', null, { z: 'front', zIndex: 30, ...norm(a, b, c) }); };

const MAT = makeMaterials(THREE), PRODUCTS = makeProducts(THREE, MAT);
const turntable = makeTurntable(THREE, MAT, PRODUCTS, makeSweep), particles = makeParticles(THREE);
// AnimationMixer driven by time (never by a clock): mixer(root, clips) → {mixer, at(t)}
// with o.timeline [{t, clip, fade, speed, loop, offset, weight}] at(t) blends clips (cross-fades) as a pure function of t;
// at(t, {Idle: .3, Walk: .7}) sets explicit weights (times follow t)
function mixer(root, clips = [], o = {}) {
  const m = new THREE.AnimationMixer(root);
  if (o.timeline || o.weights) {
    const byName = Object.fromEntries(clips.map(c => [c.name, c])), names = Object.keys(byName);
    const acts = {}; for (const c of clips) { const a = m.clipAction(c); a.play(); a.setEffectiveWeight(0); acts[c.name] = a; }
    const tl = (o.timeline || []).map(e => { if (!byName[e.clip]) unknownName('clips', e.clip, names, { fatal: true }); return e; });
    const at = (t, w) => {
      const st = mixerTimeline(tl, t, Object.fromEntries(clips.map(c => [c.name, c.duration])), w || (o.weights ? Object.fromEntries(Object.entries(o.weights).map(([k, f]) => [k, typeof f === 'function' ? f(t) : f])) : null));
      for (const n of names) { const a = acts[n], s = st[n]; if (!s || s.weight <= 0) { a.enabled = false; a.setEffectiveWeight(0); continue; } a.enabled = true; a.setEffectiveWeight(s.weight); a.time = s.time; }
      m.update(0); return st;
    };
    return { mixer: m, actions: acts, clips: names, at };
  }
  const acts = clips.map(c => { const a = m.clipAction(c); if (o.once) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } a.play(); return a; });
  return { mixer: m, actions: acts, at(t) { m.setTime(Math.max(0, t)); return m; } };
}
const TERRAIN = makeTerrain(THREE, env), toon = makeToon(THREE);
const look = (spec, o) => ({ ...(o || {}), look: spec });   // sugar: post: vk.three.look('ink', {exposure: 1.1})
Object.assign(look, { passes: LOOK_PASSES, presets: LOOKS, expand: expandLook, toonMaterial: toon.toonMaterial, toonify: toon.toonify, Chain: LookChain });
vk.three = {
  THREE, version: THREE.REVISION, Layer: ThreeLayer,
  layer: (target, a, b, c) => (target.video && target.el ? target.three(a, b, c) : target.three(a, b, c)),
  // modules
  turntable, particles, product: (name, o) => (PRODUCTS[name] || unknownName('products', name, Object.keys(PRODUCTS), { fatal: true }))(o || {}), products: PRODUCTS, materials: MAT, sweep: () => makeSweep(THREE), studioScene: o => studioScene(THREE, o),
  // camera rigs (pure: t → {pos, target, fov, roll}); apply(camera, state)
  rig: { ...M.rig, apply: applyCam, lerp: M.lerpCam },
  path: M.crPath, kf: M.kfAt, targets: { galaxy: M.galaxy, sphere: M.sphere, torus: M.torus, cloud: M.cloud, sampleMask: M.sampleMask }, morphAt: M.morphAt,
  frameIdx: M.frameIdx, samplePlan: M.samplePlan, grades: M.GRADES, gradeParams: M.gradeParams, aces: M.aces, math: M,
  mixer, model: makeModel(THREE, mixer, unknownName), addons: { RoundedBoxGeometry, TextGeometry, BufferGeometryUtils },
  // Phase B: NPR looks, dioramas, shader plates, 3D text, seekable sims, terrain / globe, shapes
  look, shapes: { ...SHAPES.SHAPES, of: SHAPES.shapeOf, bounds: SHAPES.bounds, names: SHAPES.SHAPE_NAMES },
  diorama: makeDiorama(THREE, TERRAIN), shaderPlate: makePlate(THREE), plates: PLATE_PRESETS, glsl: GLSL_LIB,
  text3d: makeText3d(THREE, MAT, env), fonts3d: FONTS3D, letterPresets: LETTER_PRESETS,
  sim: Object.assign(makeSim({ cacheKey, cacheGet, cachePut, mulberry32: M.mulberry32 }), { core: makeSimCore }),
  terrain: TERRAIN.terrain, globe: TERRAIN.globe, prop: TERRAIN.propGeo, geo: { latLon: TM.latLon, arc: TM.arcPoints }, heightField: TM.heightField, ramps: TM.RAMPS,
  stats: () => { const v = vk.current; return v ? getThree(THREE, v).stats : null; },
};
// the 3D style pack registers only when this bundle is loaded
vk.style.register(techData, techPack);
