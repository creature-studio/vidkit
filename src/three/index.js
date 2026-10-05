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
import { makeLayerClass, applyCam, getThree } from './layer.js';
import { makeMaterials, makeSweep } from './materials.js';
import { makeProducts } from './products.js';
import { makeTurntable } from './turntable.js';
import { makeParticles } from './particles.js';
import { studioScene } from './env.js';
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
function mixer(root, clips = [], o = {}) {
  const m = new THREE.AnimationMixer(root); const acts = clips.map(c => { const a = m.clipAction(c); if (o.once) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } a.play(); return a; });
  return { mixer: m, actions: acts, at(t) { m.setTime(Math.max(0, t)); return m; } };
}
vk.three = {
  THREE, version: THREE.REVISION, Layer: ThreeLayer,
  layer: (target, a, b, c) => (target.video && target.el ? target.three(a, b, c) : target.three(a, b, c)),
  // modules
  turntable, particles, product: (name, o) => PRODUCTS[name](o || {}), products: PRODUCTS, materials: MAT, sweep: () => makeSweep(THREE), studioScene: o => studioScene(THREE, o),
  // camera rigs (pure: t → {pos, target, fov, roll}); apply(camera, state)
  rig: { ...M.rig, apply: applyCam, lerp: M.lerpCam },
  path: M.crPath, kf: M.kfAt, targets: { galaxy: M.galaxy, sphere: M.sphere, torus: M.torus, cloud: M.cloud, sampleMask: M.sampleMask }, morphAt: M.morphAt,
  frameIdx: M.frameIdx, samplePlan: M.samplePlan, grades: M.GRADES, gradeParams: M.gradeParams, aces: M.aces, math: M,
  mixer, addons: { RoundedBoxGeometry, TextGeometry, BufferGeometryUtils },
  stats: () => { const v = vk.current; return v ? getThree(THREE, v).stats : null; },
};
// the 3D style pack registers only when this bundle is loaded
vk.style.register(techData, techPack);
