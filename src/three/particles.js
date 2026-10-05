// Shader-driven particle field (50k–200k points) morphing between targets: galaxy, sphere, torus, cloud, text or logo
// sampled from a 2D canvas, image. All motion happens in the vertex shader from uniforms that are pure functions of
// t (morph progress, style, spin, drift, beat) — no per-frame CPU work besides picking the two target buffers.
// Additive points; o.intensity (default .35) scales per-point energy — lower it for dense targets / high n.
//   vk.three.particles({ n: 120000, targets: { g: 'galaxy', logo: { text: 'vidkit', font: '900 220px Archivo' } },
//     morph: [{ t: 0, to: 'g' }, { t: 2.5, to: 'logo', d: 2, style: 'converge' }], beat: { amp: .15 } })
// styles: 'converge' (scatter cloud mid-way, then lock in), 'burst' (explode outward then re-form), 'swirl' (spin
// around the y axis while re-forming), 'direct' (straight lerp). Per-particle stagger makes the morph ripple.
import * as M from './math.js';
import { unknownName } from '../core/strict.js';
import { cacheKey, cacheGet, cachePut, bytesKey } from './cache.js';
const TARGET_TYPES = ['galaxy', 'sphere', 'torus', 'cloud', 'text', 'logo', 'image'];

const VS = `attribute vec3 aA, aB, cA, cB; attribute vec4 aR;
uniform float uP, uT, uStyle, uSpinA, uSpinB, uSize, uPx, uBeat, uBeatAmp, uDrift, uStagger, uBurst, uSwirl, uScatter, uFlare, uMinPx, uAlpha, uTwinkle;
uniform vec3 uCenter; varying vec3 vCol; varying float vA;
vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 spin(vec3 p, float k){ if (k == 0.) return p; float r = length(p.xz); return rotY(p, k * uT / (.35 + r * .3)); }
void main(){
  vec3 a = spin(aA, uSpinA), b = spin(aB, uSpinB);
  float q = clamp(uP * (1. + uStagger) - aR.x * uStagger, 0., 1.); q = q * q * (3. - 2. * q);
  vec3 p = mix(a, b, q); float bell = sin(3.14159265 * q);
  vec3 rd = normalize(vec3(aR.y, aR.z, aR.w) - .5 + 1e-4);
  if (uStyle > .5 && uStyle < 1.5) p += normalize(p - uCenter + rd * .6) * uBurst * bell * (.35 + aR.y);
  else if (uStyle > 1.5 && uStyle < 2.5) { p = rotY(p - uCenter, uSwirl * bell * (.5 + aR.z)) + uCenter; p.y += bell * (aR.y - .5) * .5; }
  else if (uStyle > 2.5) p += rd * uScatter * bell * (.4 + aR.w);
  p += uDrift * vec3(sin(uT * .9 + aR.x * 40.), sin(uT * 1.13 + aR.y * 40.), sin(uT * .71 + aR.z * 40.));
  p += normalize(p - uCenter + 1e-4) * uBeat * uBeatAmp * (.5 + aR.w);
  vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
  float sz = uSize * (.5 + aR.w * 1.0) * (1. + uBeat * .5) * uPx / max(-mv.z, 1e-3);
  vA = uAlpha * (1. - uTwinkle * .5 * (1. + sin(uT * (2. + aR.y * 3.) + aR.x * 60.)));
  if (sz < uMinPx) { vA *= (sz * sz) / (uMinPx * uMinPx); sz = uMinPx; }
  gl_PointSize = min(sz, 64.);
  vCol = mix(cA, cB, q) * (1. + bell * uFlare + uBeat * .7);
}`;
const FS = `varying vec3 vCol; varying float vA;
void main(){ vec2 d = gl_PointCoord - .5; float r2 = dot(d, d) * 4.; if (r2 > 1.) discard; float a = (1. - r2); a *= a; gl_FragColor = vec4(vCol * a * vA, a * vA * .5); }`;
const STYLE = { none: 0, direct: 0, burst: 1, swirl: 2, converge: 3 };

export function makeParticles(THREE) {
  // 2D canvas sources → pixel buffer (drawn after web fonts have loaded: setup runs after fonts)
  function rasterText(o) {
    const font = o.font || '900 200px Archivo, "Noto Sans SC", sans-serif', c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
    g.font = font; const lines = String(o.text).split('\n'), lh = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)[1]) * (o.lead || 1.1);
    const w = Math.ceil(Math.max(...lines.map(l => g.measureText(l).width)) + lh * .4), h = Math.ceil(lh * lines.length + lh * .3);
    c.width = w; c.height = h; g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
    lines.forEach((l, i) => g.fillText(l, w / 2, lh * (i + .5) + lh * .15));
    return { data: g.getImageData(0, 0, w, h).data, w, h };
  }
  function rasterDraw(o) {
    const w = o.w || 1024, h = o.h || 512, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
    o.draw(g, w, h); return { data: g.getImageData(0, 0, w, h).data, w, h };
  }
  function rasterImage(o) {
    const img = o.image, k = Math.min(1, (o.max || 640) / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
    return { data: g.getImageData(0, 0, w, h).data, w, h };
  }
  const lin = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  // phase 1 (cheap, no randomness): normalise the spec and rasterise text / logo / image masks
  function prep(spec, ctx) {
    if (typeof spec === 'string') spec = { type: spec };
    const type = spec.type || (spec.text != null ? 'text' : spec.draw ? 'logo' : spec.image || spec.asset ? 'image' : 'galaxy');
    if (!TARGET_TYPES.includes(type)) unknownName('targets', type, TARGET_TYPES, { fatal: true });
    let px = null;
    if (!['galaxy', 'sphere', 'torus', 'cloud'].includes(type)) {
      const img = spec.asset ? ctx.assets[spec.asset] : spec.image;
      px = type === 'text' ? rasterText(spec) : type === 'logo' ? rasterDraw(spec) : rasterImage({ ...spec, image: img && img.image ? img.image : img });
    }
    return { spec, type, px };
  }
  // phase 2 (the expensive part: sampling n points, consumes the shared seeded stream)
  function build({ spec, type, px }, n, rand) {
    let r;
    if (type === 'galaxy') r = M.galaxy(n, { ...spec, colors: spec.colors && spec.colors.map(c => (typeof c === 'string' ? lin(c).map(x => x * (spec.gain || 1.6)) : c)) }, rand);
    else if (type === 'sphere') r = M.sphere(n, spec, rand);
    else if (type === 'torus') r = M.torus(n, spec, rand);
    else if (type === 'cloud') r = M.cloud(n, spec, rand);
    else {
      r = M.sampleMask(px.data, px.w, px.h, n, { width: spec.width || 7, depth: spec.depth, edge: spec.edge != null ? spec.edge : (type === 'image' ? 0 : .6), by: spec.by || (type === 'image' ? 'both' : 'alpha'), color: spec.color && !Array.isArray(spec.color) ? lin(spec.color).map(x => x * (spec.gain || 1.5)) : spec.color, gain: spec.gain || 1.4 }, rand);
      if (spec.colors) { const c0 = lin(spec.colors[0]), c1 = lin(spec.colors[1]), W = spec.width || 7, g = spec.gain || 1.5; for (let i = 0; i < n; i++) { const u = M.clamp01(r.pos[i * 3] / W + .5); for (let j = 0; j < 3; j++) r.col[i * 3 + j] = (c0[j] + (c1[j] - c0[j]) * u) * g; } }
    }
    if (!r.col && spec.colors && spec.colors.length > 1) {   // procedural shapes: left → right gradient between two colours
      const c0 = lin(spec.colors[0]), c1 = lin(spec.colors[1]), g = spec.gain || 1.4; let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < n; i++) { const x = r.pos[i * 3]; if (x < lo) lo = x; if (x > hi) hi = x; }
      r.col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = (r.pos[i * 3] - lo) / Math.max(1e-6, hi - lo); for (let j = 0; j < 3; j++) r.col[i * 3 + j] = (c0[j] + (c1[j] - c0[j]) * u) * g; }
    }
    if (!r.col) { const c = spec.color ? (typeof spec.color === 'string' ? lin(spec.color).map(x => x * (spec.gain || 1.4)) : spec.color) : [.9, 1.0, 1.4]; r.col = new Float32Array(n * 3); for (let i = 0; i < n; i++) r.col.set(c, i * 3); }
    const off = spec.offset || [0, 0, 0], sc = spec.scale || 1;
    if (off[0] || off[1] || off[2] || sc !== 1) for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) r.pos[i * 3 + j] = r.pos[i * 3 + j] * sc + off[j];
    return { pos: new THREE.BufferAttribute(r.pos, 3), col: new THREE.BufferAttribute(r.col, 3), spin: spec.spin || 0, spec };
  }
  return function particles(o = {}) {
    const n = o.n || 100000, mod = { o, targets: {} };
    mod.setup = async ctx => {
      const rand = M.mulberry32(o.seed || 21);
      const P = window.__vkThreeProf, t0 = performance.now();
      const preps = Object.entries(o.targets || { galaxy: 'galaxy' }).map(([k, s]) => [k, prep(s, ctx)]);
      // disk cache (src/three/cache.js): keyed by the specs, the rasterised masks' pixels and the sampling code
      const key = await cacheKey({ kind: 'particles', v: 1, n, seed: o.seed || 21, rev: THREE.REVISION, code: [prep, build, M.galaxy, M.sphere, M.torus, M.cloud, M.sampleMask, M.mulberry32].map(String),
        targets: await Promise.all(preps.map(async ([k, p]) => [k, p.type, { ...p.spec, image: undefined, draw: undefined }, p.px ? [p.px.w, p.px.h, await bytesKey(p.px.data)] : null])) });
      const hit = await cacheGet(key);
      let R;
      if (hit && hit.arrays.R) {
        for (const [k, p] of preps) mod.targets[k] = { pos: new THREE.BufferAttribute(hit.arrays['p:' + k], 3), col: new THREE.BufferAttribute(hit.arrays['c:' + k], 3), spin: p.spec.spin || 0, spec: p.spec };
        R = hit.arrays.R; if (P) P.targetsCached++;
      } else {
        for (const [k, p] of preps) mod.targets[k] = build(p, n, rand);
        R = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) R[i] = rand();
        const arrays = { R }; for (const [k] of preps) { arrays['p:' + k] = mod.targets[k].pos.array; arrays['c:' + k] = mod.targets[k].col.array; }
        cachePut(key, {}, arrays);
      }
      if (P) P.targets += performance.now() - t0;
      for (const k of o.morph || []) if (!mod.targets[k.to]) unknownName('targets', k.to, Object.keys(mod.targets), { fatal: true });   // morph to a key of o.targets
      const first = mod.targets[(o.morph && o.morph[0] && o.morph[0].to) || Object.keys(mod.targets)[0]];
      const geo = mod.geometry = new THREE.BufferGeometry();
      geo.setAttribute('position', first.pos); geo.setAttribute('aA', first.pos); geo.setAttribute('aB', first.pos); geo.setAttribute('cA', first.col); geo.setAttribute('cB', first.col);
      geo.setAttribute('aR', new THREE.BufferAttribute(R, 4));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
      const u = mod.uniforms = { uP: { value: 1 }, uT: { value: 0 }, uStyle: { value: 0 }, uSpinA: { value: 0 }, uSpinB: { value: 0 }, uSize: { value: (typeof o.size === 'number' ? o.size : .035) * (o.scale || 1) }, uPx: { value: 500 }, uBeat: { value: 0 }, uBeatAmp: { value: o.beat && o.beat.amp != null ? o.beat.amp : .12 },
        uDrift: { value: o.drift != null ? o.drift : .015 }, uStagger: { value: o.stagger != null ? o.stagger : .35 }, uBurst: { value: o.burst || 2.4 }, uSwirl: { value: o.swirl || 4 }, uScatter: { value: o.scatter || 1.6 }, uFlare: { value: o.flare != null ? o.flare : .8 },
        uMinPx: { value: 1.2 }, uAlpha: { value: (typeof o.alpha === 'number' ? o.alpha : 1) * (o.intensity != null ? o.intensity : .35) }, uTwinkle: { value: o.twinkle || 0 }, uCenter: { value: new THREE.Vector3(...(o.center || [0, 0, 0])) } };
      const mat = mod.material = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: o.depthTest !== false,
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
      const pts = mod.object = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = o.renderOrder || 5;
      if (o.position) pts.position.set(...o.position); if (o.rotation) pts.rotation.set(...o.rotation.map(x => x * Math.PI / 180)); if (o.scale) pts.scale.setScalar(o.scale);
      (o.parent || ctx.scene).add(pts);
    };
    mod.update = (t, info) => {
      const st = M.morphAt(o.morph || [{ t: 0, to: Object.keys(mod.targets)[0] }], t), A = mod.targets[st.a], B = mod.targets[st.b], g = mod.geometry, u = mod.uniforms;
      if (g.attributes.aA !== A.pos) { g.setAttribute('aA', A.pos); g.setAttribute('cA', A.col); }
      if (g.attributes.aB !== B.pos) { g.setAttribute('aB', B.pos); g.setAttribute('cB', B.col); }
      u.uP.value = st.p; u.uT.value = t; u.uStyle.value = STYLE[st.style] != null ? STYLE[st.style] : 3;
      u.uSpinA.value = A.spin; u.uSpinB.value = B.spin;
      if (st.k && st.k.burst != null) u.uBurst.value = st.k.burst; if (st.k && st.k.swirl != null) u.uSwirl.value = st.k.swirl; if (st.k && st.k.scatter != null) u.uScatter.value = st.k.scatter;
      const cam = info && info.camera; if (cam) u.uPx.value = (info.layer ? info.layer.ih : 810) / (2 * Math.tan(cam.fov * Math.PI / 360));
      let b = 0; const bo = o.beat;
      if (typeof bo === 'function') b = bo(t, info);
      else if (bo && info && info.beats && info.beats.active) b = info.beats.pulse(info.t, bo.k || 8, bo.every || 1);
      u.uBeat.value = b;
      if (o.size && typeof o.size === 'function') u.uSize.value = o.size(t) * (o.scale || 1);   // point size lives in object space (scaled with o.scale)
      if (typeof o.alpha === 'function') u.uAlpha.value = o.alpha(t) * (o.intensity != null ? o.intensity : .35);
      if (o.animate) o.animate(t, mod, info);
    };
    return mod;
  };
}
