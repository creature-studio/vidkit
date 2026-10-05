// vk.three layer: a three.js scene composited into the vidkit layer stack like vk.gl. ONE hidden WebGL2 renderer per
// video renders every three layer; each layer copies its pixels into its own 2D canvas synchronously inside render(t)
// (so the beginFrame capture never sees a stale or blank GL frame). Every frame is a pure function of time:
//   frame time → sample plan (motion-blur sub-times × jittered AA) → for each sample: camera rig + update(t) →
//   HDR render → accumulate → post (dof, bloom, tone map, grade, grain) → 2D canvas.
// Under `vk render --shutter …` (pipeline motion blur, ?mb=1) a layer that blurs in-layer renders at the nominal frame
// time and keeps its pixels for the N pipeline sub-seeks, so the pipeline average leaves it untouched (no double blur)
// and the 3D work is done once per frame instead of N times.
import { samplePlan, frameIdx, gradeParams, mulberry32 } from './math.js';
import { Post } from './post.js';
import { LookChain, needsDepth, needsNormals } from './look.js';
import { makeLoader, loadAssets } from './loaders.js';
import { motionBlurCfg } from '../fx/mg/math.js';

const D2R = Math.PI / 180, cores = new WeakMap();
// cold-start profile (ms) of this page's three layers: window.__vkThreeProf {setup, env, targets, idle, compile, warm}
export const PROF = (window.__vkThreeProf = window.__vkThreeProf || { setup: 0, env: 0, envCached: 0, targets: 0, targetsCached: 0, idle: 0, compile: 0, warm: 0 });
const now = () => performance.now();
let warned = false;
export function getThree(THREE, video) {
  let c = cores.get(video); if (c) return c;
  const dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1)), canvas = document.createElement('canvas');
  canvas.width = Math.round(video.W * dpr); canvas.height = Math.round(video.H * dpr);
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false, depth: true }); }
  catch (e) { if (!warned) console.warn('[vk.three] WebGL2 unavailable: three layers render nothing (vk render --gpu soft|swiftshader keeps WebGL on) —', e.message); warned = true; }
  c = { ok: !!renderer, canvas, renderer, dpr, stats: { frames: 0, samples: 0, ms: 0, skipped: 0, layers: 0 } };
  if (renderer) {
    renderer.setPixelRatio(1); renderer.setSize(canvas.width, canvas.height, false);
    renderer.autoClear = false; renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    renderer.transmissionResolutionScale = .5;
    c.fit = (w, h) => { if (canvas.width < w || canvas.height < h) renderer.setSize(Math.max(canvas.width, w), Math.max(canvas.height, h), false); };
  }
  cores.set(video, c); return c;
}
export function applyCam(camera, s) {
  if (!s) return;
  if (s.pos) camera.position.set(s.pos[0], s.pos[1], s.pos[2]);
  camera.up.set(0, 1, 0);
  if (s.target) camera.lookAt(s.target[0], s.target[1], s.target[2]);
  if (s.roll) camera.rotateZ(s.roll * D2R);
  if (s.fov && camera.isPerspectiveCamera) camera.fov = s.fov;
}
const POST_DEFAULTS = { exposure: 1, tone: 'aces', grade: 'neutral', vignette: .18, grain: .02, ca: 0, fade: 0, alphaBloom: 1.6, dof: false,
  bloom: { strength: .55, threshold: 1, knee: .6, radius: 1, clamp: 40 } };
const fv = (x, t) => (typeof x === 'function' ? x(t) : x);

export function makeLayerClass(THREE, env) {
  return class ThreeLayer {
    constructor(video, _draw, o = {}) {
      this.video = video; this.o = o; this.sc = o.scene || null; this.THREE = THREE;
      const core = this.core = getThree(THREE, video); core.stats.layers++;
      const r = this.rect = o.rect ? o.rect.slice() : [0, 0, video.W, video.H], dpr = core.dpr;
      this.ow = Math.max(1, Math.round(r[2] * dpr * (o.outScale || 1))); this.oh = Math.max(1, Math.round(r[3] * dpr * (o.outScale || 1)));
      this.res = o.res != null ? o.res : o.resolution != null ? o.resolution : .75;
      // draft (vk peek/render --draft, vk.video({draft:true})): cheap preview — low internal res, 1 sample, no DOF / bloom
      this.draft = !!video.draft; if (this.draft) this.res = Math.min(this.res, .35);
      this.iw = Math.max(2, Math.round(this.ow * this.res)); this.ih = Math.max(2, Math.round(this.oh * this.res));
      const c = this.el = document.createElement('canvas'); c.className = 'vk-canvas vk-three' + (o.class ? ' ' + o.class : '');
      c.width = this.ow; c.height = this.oh;
      c.style.cssText = `left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px` + (o.blend ? `;mix-blend-mode:${o.blend}` : '') + (o.opacity != null ? `;opacity:${o.opacity}` : '');
      this.g = c.getContext('2d', { willReadFrequently: true });
      // motion blur: o.motionBlur false = none in-layer (the capture pipeline may still average sub-frames over it);
      // true / 'video' / omitted = the video's (or the CLI's) shutter, blurred in-layer before the bloom
      const Q = new URLSearchParams(location.search), mbo = o.motionBlur;
      let cfg = null;
      if (mbo !== false && Q.get('mb') !== '0') {
        if (mbo && typeof mbo === 'object') cfg = mbo;
        else if (video.mbPipeline && Q.get('mbs')) cfg = { shutter: +Q.get('mbs'), samples: +(Q.get('mbn') || 4) };
        else if (mbo === true || mbo === 'video' || mbo == null) cfg = video.cfg.motionBlur || (mbo === true ? {} : null);
      }
      this.mb = cfg && !this.draft ? motionBlurCfg(cfg, video.fps) : null;
      if (this.mb && o.samples) this.mb.samples = Math.max(2, o.samples);
      this.aa = this.draft ? 1 : o.aa != null ? o.aa : 1;
      this.capture = Q.get('render') === '1';   // under vk render / peek / qa every capture seeks first
      this.scene = new THREE.Scene();
      if (o.background != null && o.background !== 'transparent') this.scene.background = new THREE.Color(o.background);
      this.camera = new THREE.PerspectiveCamera(o.fov || 35, this.iw / this.ih, o.near || .05, o.far || 200);
      this.camera.position.set(0, 1, 6); this.camera.lookAt(0, 0, 0);
      this.rig = typeof o.camera === 'function' ? o.camera : null;
      if (o.camera && typeof o.camera === 'object') applyCam(this.camera, o.camera);
      this.modules = (o.modules || []).filter(Boolean); this.updaters = [];
      this.ready = false; this.lastKey = null; this.stats = { frames: 0, samples: 0, ms: 0, last: 0 };
      if (!core.ok) return;
      this.renderer = core.renderer; core.fit(this.ow, this.oh);
      this.post = new Post(THREE, this.renderer, o.post || {});
      this.load = makeLoader(THREE, this.renderer, env.base);
      const assets = loadAssets(this.load, o.assets);
      assets.catch(() => { });
      if (PROF.ctor == null) PROF.ctor = now();
      if (video.waitFor) video.waitFor(() => assets.then(a => this.init(a)));
      else console.warn('[vk.three] this dist/vidkit.js has no video.waitFor (rebuild it): capture may not wait for 3D assets');
    }
    async init(assets) {
      const T = this.THREE, v = this.video;
      const ctx = this.ctx = { draft: this.draft, THREE: T, scene: this.scene, camera: this.camera, renderer: this.renderer, rand: mulberry32(this.o.seed || 1), load: this.load, assets, layer: this, video: v, W: v.W, H: v.H, iw: this.iw, ih: this.ih, add: (...x) => this.scene.add(...x) };
      let t0 = now(); if (PROF.start == null) PROF.start = t0;
      for (const m of this.modules) {
        let r = m.setup ? await m.setup(ctx) : null;
        if (typeof r === 'function') r = { update: r };
        if (m.update) this.updaters.push(m.update.bind(m));
        if (r && r.update) this.updaters.push(r.update);
        if (r && r.camera) { this.camera = ctx.camera = r.camera; }
      }
      PROF.setup += now() - t0; t0 = now();
      await this.load.idle();
      PROF.idle += now() - t0; t0 = now();
      this.post.size(this.iw, this.ih, this.useDof(), this.lookDepth());
      // compile every material's program up front; compileAsync lets the GL driver build them in parallel (KHR_parallel_shader_compile)
      if (this.renderer.compileAsync && this.renderer.extensions.has('KHR_parallel_shader_compile')) await this.renderer.compileAsync(this.scene, this.camera); else this.renderer.compile(this.scene, this.camera);   // (SwiftShader has no parallel compile: compileAsync would only warn)
      PROF.compile += now() - t0; t0 = now();
      this.ready = true;
      // warm-up: run the whole pipeline once (compiles the post shaders, uploads every buffer) and forget the pixels
      // …at a tiny internal size: programs and buffers do not depend on it, the fill cost does (150k additive particles
      // filling the frame cost seconds per sample on SwiftShader, and the GPU queue would execute it before the first capture)
      const tw = now(), IW = this.iw, IH = this.ih, k = Math.min(1, 64 / Math.max(IW, IH));
      this.iw = Math.max(2, Math.round(IW * k)); this.ih = Math.max(2, Math.round(IH * k));
      try { this.draw(0, { t: this.sc ? this.sc.start : 0, frameT: this.sc ? this.sc.start : 0, fps: v.fps, W: v.W, H: v.H, beats: v.beats, video: v, scene: this.sc, p: 0 }, true); } finally { this.iw = IW; this.ih = IH; }
      // drain the GL queue (PMREM, uploads, program links) now, inside __ready, instead of inside the first capture
      try { const gl = this.renderer.getContext(); this.renderer.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); } catch (e) { }
      this.lastKey = null; (PROF.warms = PROF.warms || []).push([this.sc ? this.sc.index : -1, Math.round(now() - tw)]);
      PROF.warm += now() - t0; PROF.end = now();
    }
    useDof() { return !this.draft && !!(this.o.post && this.o.post.dof); }
    // NPR look chain (post.look or the layer's look option; src/three/look.js) — null when the layer has none
    lookSpec(lt) { const P = this.o.post || {}; let s = P.look !== undefined ? P.look : this.o.look; if (typeof s === 'function' && !s.type) s = s(lt); return s || null; }
    lookChain(lt) {
      const s = this.lookSpec(lt); if (!s) return null;
      if (!this.look) this.look = new LookChain(this.THREE, this.renderer);
      return this.look.setSpec(s).length ? this.look : null;
    }
    lookDepth() { const s = this.lookSpec(0); if (!s) return false; if (!this.look) this.look = new LookChain(this.THREE, this.renderer); return needsDepth(this.look.setSpec(s)); }
    params(lt) {
      const P = { ...POST_DEFAULTS, ...(this.o.post || {}) }, out = {};
      for (const k in P) out[k] = fv(P[k], lt);
      out.bloom = out.bloom === false ? null : { ...POST_DEFAULTS.bloom, ...(out.bloom === true ? {} : out.bloom || {}) };
      for (const k in out.bloom) out.bloom[k] = fv(out.bloom[k], lt);
      out.grade = gradeParams(out.grade || 'neutral');
      if (this.draft) { out.bloom = null; out.dof = false; }
      if (out.dof) { const d = out.dof === true ? {} : out.dof; out.dof = { focus: fv(d.focus, lt) || this.camera.position.length(), aperture: d.aperture != null ? fv(d.aperture, lt) : 6, maxBlur: d.maxBlur != null ? d.maxBlur : 14 }; }
      return out;
    }
    render(local, info) {
      if (!this.ready || !this.core.ok) return;
      // the page's own first render at __ready: a capture run seeks every frame it needs, so skip the (possibly heavy) GL work
      if (this.capture && this.video.booting) return;
      const inLayer = !!this.mb || this.aa > 1, fT = info.frameT != null ? info.frameT : info.t;
      // in-layer blur / AA renders the nominal frame (pipeline sub-seeks then reuse it); otherwise follow t exactly
      const lt = inLayer ? local - (info.t - fT) : local;
      const key = lt.toFixed(6) + (this.o.key ? '|' + this.o.key(lt) : '');
      if (key === this.lastKey) { this.core.stats.skipped++; return; }
      this.draw(lt, info, false);
      this.lastKey = key;
    }
    draw(lt, info, warm) {
      const t0 = performance.now(), T = this.THREE, R = this.renderer, cam = this.camera, post = this.post;
      const fps = info.fps || this.video.fps, plan = samplePlan(lt, this.mb, this.aa), n = plan.length;
      const fT = info.frameT != null ? info.frameT : info.t, fi = frameIdx(fT, fps);
      const look = this.lookChain(lt), lp = look ? look.passes : null;
      post.size(this.iw, this.ih, this.useDof(), !!lp && needsDepth(lp));
      const RT = post.rts;
      for (const s of plan) {
        const sub = { ...info, t: fT + (s.t - lt), local: s.t, frameT: fT, frameLocal: lt, frameIdx: fi, sub: s.k, samples: n, dt: n > 1 ? (plan[n - 1].t - plan[0].t) / (n - 1) : 0, layer: this, camera: cam, scene: this.scene, THREE: T, warm };
        if (this.rig) applyCam(cam, this.rig(s.t, sub));
        for (const u of this.updaters) u(s.t, sub);
        cam.aspect = this.iw / this.ih;
        if (n > 1) cam.setViewOffset(this.iw, this.ih, s.jx, s.jy, this.iw, this.ih); else cam.clearViewOffset();
        cam.updateProjectionMatrix();
        R.setRenderTarget(RT.scene); R.setClearColor(0x000000, 0); R.clear(true, true, false);
        R.render(this.scene, cam);
        if (n > 1) post.accumulate(s.k, s.w);
      }
      const p = this.params(lt); p.seed = fi;
      const L = look ? { chain: look, t: lt, w: this.draft ? this.iw : this.ow, h: this.draft ? this.ih : this.oh, normal: needsNormals(lp) ? post.normals(this.scene, cam) : null } : null;
      post.finish(n > 1 ? RT.acc.texture : RT.scene.texture, p, this.ow, this.oh, cam, L);
      if (!warm) {
        const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.ow, this.oh);
        g.drawImage(this.core.canvas, 0, this.core.canvas.height - this.oh, this.ow, this.oh, 0, 0, this.ow, this.oh);
        const ms = performance.now() - t0, S = this.core.stats; if (!PROF.draws) PROF.draws = []; if (PROF.draws.length < 12) PROF.draws.push([this.sc ? this.sc.index : -1, +lt.toFixed(3), Math.round(ms), n]); this.stats.frames++; this.stats.samples += n; this.stats.ms += ms; this.stats.last = ms;
        S.frames++; S.samples += n; S.ms += ms;
      }
    }
  };
}
