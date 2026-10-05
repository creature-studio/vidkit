// vk.three looks: non-photorealistic (NPR) post passes that chain after the HDR composite, so any 3D scene can be
// pushed into ink-wash, paper-cut, pixel, neon, comic … without dedicated style code. A look is an array of passes:
//   post: { look: 'ink' }                                   named preset
//   post: { look: ['toon', { type: 'outline', width: 2 }, 'paper'] }   passes (strings = defaults)
//   post: { look: ['ink', { type: 'halftone', size: 6 }] }  presets expand in place, later passes append
//   post: { look: { preset: 'ink', paper: { amount: .6 }, outline: false } }   tweak / drop passes of a preset
// Every parameter may be a function of the layer time (t => value). Passes run in display space (sRGB, after tone
// mapping and grade) at the layer's output size (draft: internal size), premultiplied alpha in and out.
// Passes: toon posterize palette ink outline edges kuwahara paper halftone pixel glow tiltshift mist hatch.
// Pure parts (presets, expandLook, colour parsing) have no THREE/DOM dependency and are unit tested in Node.
import { unknownName } from '../core/strict.js';

/* ---------------- pass catalogue (defaults + one-line docs; vk list three look) ---------------- */
export const PASSES = {
  toon: { doc: 'quantise luminance into flat bands (keeps hue); shadowTint colours the darkest band', d: { bands: 4, soft: .08, mix: 1, shadowTint: null, shadow: .35 } },
  posterize: { doc: 'per-channel levels', d: { levels: 6, mix: 1 } },
  palette: { doc: "map to a colour set: mode 'ramp' (luminance through colours, dark → light) or 'nearest'", d: { colors: ['#1d1d1f', '#f4efe2'], mode: 'ramp', mix: 1, dither: 0 } },
  ink: { doc: 'sumi ink: desaturate toward an ink ramp, lift whites to paper, keep some colour (sat), crush blacks', d: { ink: '#1b1c1e', paper: '#f2ecdd', sat: .12, contrast: 1.25, gamma: 1, mix: 1 } },
  outline: { doc: 'object outlines from depth + normal discontinuities (and colour if color edges on); boil = redraw rate (fps) of the wobble', d: { width: 1.5, color: '#111111', depth: .08, normal: .45, luma: 0, wobble: 0, boil: 0, fade: 0, opacity: 1, near: 0 } },
  edges: { doc: 'neon/blueprint edges: edge lines coloured by the image (or color) over a darkened background', d: { width: 1.2, color: null, bg: .85, bgColor: '#000000', depth: .06, normal: .4, luma: .25, gain: 2.2 } },
  kuwahara: { doc: 'painterly Kuwahara smoothing (flat strokes, kept edges); radius ≤ 8 px', d: { radius: 4, mix: 1 } },
  paper: { doc: 'paper / watercolour wash: fibre texture, granulation, edge darkening (pigment pooling), wet bleed; opaque composites over the paper colour', d: { color: '#f3eee2', amount: .55, fiber: .5, grain: .35, edge: .6, bleed: 1.5, scale: 1, opaque: true } },
  halftone: { doc: "print dots: mode 'mono' | 'cmyk' | 'color'; size = cell px", d: { size: 6, angle: 45, mode: 'mono', ink: '#151515', paper: '#f7f3e8', mix: 1, soft: 1 } },
  pixel: { doc: 'pixel art: block size px, optional palette / level count with ordered (Bayer) dithering', d: { size: 6, levels: 6, colors: null, dither: .3, mix: 1 } },
  glow: { doc: 'soft glow of bright areas (display-space, after the look; the HDR bloom happens earlier)', d: { radius: 10, strength: .9, threshold: .55 } },
  tiltshift: { doc: 'miniature lens: blur outside a horizontal focus band (+ saturation boost)', d: { focus: .5, band: .12, blur: 8, saturate: 1.15, angle: 0 } },
  mist: { doc: 'depth mist toward a colour (ink-wash distance, aerial perspective); sky = fill empty pixels too', d: { color: '#f2ecdd', near: 4, far: 30, density: 1, power: 1.3, sky: true } },
  hatch: { doc: 'pen hatching in the dark tones (1–3 directions by darkness)', d: { size: 6, color: '#1a1a1a', angle: 35, amount: .8, threshold: .7 } },
};
export const PASS_NAMES = Object.keys(PASSES);
// presets: plain pass lists (a preset may reference other presets)
export const LOOKS = {
  ink: [{ type: 'mist', color: '#f2ecdd', near: 6, far: 40 }, { type: 'ink', sat: .1 }, { type: 'kuwahara', radius: 3 }, { type: 'outline', width: 1.6, color: '#16171a', wobble: 1.2, boil: 8, fade: .015 }, { type: 'paper', color: '#f2ecdd', amount: .6, edge: .8, bleed: 2 }],
  watercolor: [{ type: 'kuwahara', radius: 4 }, { type: 'outline', width: 1, color: '#3a3330', opacity: .5, wobble: 1.5, boil: 6 }, { type: 'paper', amount: .7, edge: 1, bleed: 2.5, grain: .5 }],
  papercut: [{ type: 'toon', bands: 3, soft: .03, shadowTint: '#6b3b2a', shadow: .3 }, { type: 'outline', width: 1.1, color: '#2a1a14', opacity: .55, depth: .04, normal: .6 }, { type: 'paper', amount: .4, fiber: .7, grain: .25, edge: .15, bleed: 0 }],
  pixel: [{ type: 'pixel', size: 6, levels: 6, dither: .3 }, { type: 'outline', width: 1, color: '#0d0d12', depth: .05, normal: .7 }],
  neon: [{ type: 'edges', bg: .9, gain: 2.6 }, { type: 'glow', radius: 12, strength: 1.2, threshold: .35 }],
  comic: [{ type: 'toon', bands: 3, soft: .02 }, { type: 'outline', width: 2, color: '#0b0b0b' }, { type: 'halftone', size: 5, mode: 'mono', mix: .35 }],
  blueprint: [{ type: 'edges', color: '#cfe8ff', bg: 1, bgColor: '#123a6b', luma: .1, gain: 1.6 }, { type: 'paper', color: '#123a6b', amount: .25, edge: 0, bleed: 0, opaque: false }],
  sketch: [{ type: 'ink', sat: 0, contrast: 1.1 }, { type: 'hatch', size: 5 }, { type: 'outline', width: 1.3, wobble: 1.2, boil: 6 }, { type: 'paper', amount: .45, edge: .2, bleed: 0 }],
  miniature: [{ type: 'tiltshift' }],
};
export const LOOK_NAMES = Object.keys(LOOKS);

// spec → [{type, …params}] (presets expanded; strings → defaults; {preset, <type>: {…}|false} tweaks)
export function expandLook(spec, depth = 0) {
  if (spec == null || spec === false) return [];
  if (depth > 6) throw new Error('[vk.three.look] preset recursion');
  if (typeof spec === 'string') {
    if (LOOKS[spec]) return expandLook(LOOKS[spec], depth + 1);
    if (PASSES[spec]) return [{ type: spec }];
    unknownName('looks', spec, LOOK_NAMES.concat(PASS_NAMES), { fatal: true });
  }
  if (Array.isArray(spec)) return spec.flatMap(s => expandLook(s, depth + 1));
  if (typeof spec === 'object') {
    if (spec.preset) {
      const base = expandLook(spec.preset, depth + 1), out = [];
      for (const p of base) { const tw = spec[p.type]; if (tw === false) continue; out.push(tw && typeof tw === 'object' ? { ...p, ...tw } : p); }
      for (const k of Object.keys(spec)) if (k !== 'preset' && PASSES[k] && spec[k] && typeof spec[k] === 'object' && !base.some(p => p.type === k)) out.push({ type: k, ...spec[k] });
      return out;
    }
    if (!spec.type) throw new Error('[vk.three.look] pass needs a type (one of ' + PASS_NAMES.join(', ') + ')');
    if (!PASSES[spec.type]) { if (LOOKS[spec.type]) return expandLook({ ...spec, preset: spec.type, type: undefined }, depth + 1); unknownName('lookPasses', spec.type, PASS_NAMES, { fatal: true }); }
    return [spec];
  }
  throw new Error('[vk.three.look] bad look spec ' + String(spec));
}
// resolved params of one pass at layer time t (defaults ← pass, functions evaluated)
export function passParams(p, t) {
  const d = PASSES[p.type].d, out = {};
  for (const k in d) { const v = p[k] !== undefined ? p[k] : d[k]; out[k] = typeof v === 'function' ? v(t) : v; }
  return out;
}
export const needsDepth = passes => passes.some(p => p.type === 'outline' || p.type === 'edges' || p.type === 'mist');
export const needsNormals = passes => passes.some(p => (p.type === 'outline' || p.type === 'edges') && p.normals === true);
// '#rgb' | '#rrggbb' | 0xRRGGBB | [r,g,b] (0..1) → [r,g,b] in display (sRGB) space
export function rgb(c, d = [0, 0, 0]) {
  if (c == null) return d;
  if (Array.isArray(c)) return c.slice(0, 3);
  if (typeof c === 'number') return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
  let s = String(c).trim();
  if (/^#([0-9a-f]{3})$/i.test(s)) s = '#' + s.slice(1).split('').map(x => x + x).join('');
  const m = /^#([0-9a-f]{6})$/i.exec(s); if (m) { const n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  const r = /^rgba?\(([^)]+)\)$/i.exec(s); if (r) { const v = r[1].split(/[\s,\/]+/).map(Number); return [v[0] / 255, v[1] / 255, v[2] / 255]; }
  throw new Error('[vk.three.look] bad colour ' + c);
}
// a toon gradient ramp (Uint8 luminance steps) for MeshToonMaterial.gradientMap
export function toonRamp(bands = 3, o = {}) {
  const n = Math.max(2, Math.round(bands)), out = new Uint8Array(n), lo = o.min != null ? o.min : .25;
  for (let i = 0; i < n; i++) out[i] = Math.round(255 * (lo + (1 - lo) * (i / (n - 1))));
  return out;
}

/* ---------------- GLSL ---------------- */
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const HEAD = `uniform sampler2D tSrc, tDepth, tNormal; uniform vec2 uRes, uDRes; uniform float uTime, uSeed, uNear, uFar, uPersp, uHasDepth, uHasNormal; varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float lum(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
vec4 S(vec2 uv){ return texture2D(tSrc, uv); }
vec3 unpm(vec4 c){ return c.a > 1e-4 ? c.rgb / c.a : vec3(0.); }
float rawD(vec2 uv){ return texture2D(tDepth, uv).x; }
float viewZ(vec2 uv){ float d = rawD(uv); if (uPersp > .5) { float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); } return uNear + d * (uFar - uNear); }
vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2. - 1.; }
// view-space normal from the depth buffer (when no normal pass): cross of the position derivatives (one-sided, smallest step)
vec3 posV(vec2 uv){ return vec3((uv - .5) * vec2(uRes.x / uRes.y, 1.), 1.) * viewZ(uv); }
vec3 dnrm(vec2 uv){ vec2 e = 1. / uDRes; vec3 p = posV(uv), l = posV(uv - vec2(e.x, 0.)), r = posV(uv + vec2(e.x, 0.)), b = posV(uv - vec2(0., e.y)), t = posV(uv + vec2(0., e.y));
  vec3 dx = abs(r.z - p.z) < abs(p.z - l.z) ? r - p : p - l, dy = abs(t.z - p.z) < abs(p.z - b.z) ? t - p : p - b; return normalize(cross(dx, dy)); }
vec3 anyN(vec2 uv){ return uHasNormal > .5 ? nrm(uv) : dnrm(uv); }
`;
const FS = {
  toon: `uniform float uBands, uSoft, uMix, uShadow; uniform vec3 uTint; uniform float uHasTint;
void main(){ vec4 c = S(vUv); vec3 x = unpm(c); float l = lum(x), b = l * uBands, f = fract(b), w = clamp(uSoft * uBands, 1e-3, .5), k = floor(b) + smoothstep(1. - w, 1., f);
  float q = clamp((k + .5) / uBands, 0., 1.); vec3 y = x * min(q / max(l, 1e-3), 1.6); y = min(y, vec3(1.));
  if (uHasTint > .5) y = mix(y, y * uTint * 1.6, uShadow * (1. - smoothstep(0., 1.5 / uBands, q)));
  gl_FragColor = vec4(mix(x, y, uMix) * c.a, c.a); }`,
  posterize: `uniform float uLevels, uMix; void main(){ vec4 c = S(vUv); vec3 x = unpm(c), y = floor(x * uLevels + .5) / uLevels; gl_FragColor = vec4(mix(x, y, uMix) * c.a, c.a); }`,
  palette: `uniform vec3 uC[8]; uniform float uN, uMode, uMix, uDither;
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.); int i = int(q.x) + int(q.y) * 4; float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return m[i] / 16. - .5; }
void main(){ vec4 c = S(vUv); vec3 x = unpm(c), y;
  if (uMode < .5) { float l = clamp(lum(x) + uDither * bayer(vUv * uRes) / uN, 0., 1.) * (uN - 1.); int i = int(floor(l)); float f = fract(l); y = uC[0];
    for (int k = 0; k < 7; k++) if (k == i) y = mix(uC[k], uC[k + 1], smoothstep(.0, 1., f)); if (i >= int(uN) - 1) y = uC[int(uN) - 1]; }
  else { float best = 1e9; y = uC[0]; vec3 xd = x + uDither * bayer(vUv * uRes) * .12; for (int k = 0; k < 8; k++) { if (float(k) >= uN) break; vec3 d = (xd - uC[k]) * vec3(.3, .59, .11); float e = dot(d, d); if (e < best) { best = e; y = uC[k]; } } }
  gl_FragColor = vec4(mix(x, y, uMix) * c.a, c.a); }`,
  ink: `uniform vec3 uInk, uPaper; uniform float uSat, uContrast, uGamma, uMix;
void main(){ vec4 c = S(vUv); vec3 x = unpm(c); float l = lum(x); l = clamp((l - .5) * uContrast + .5, 0., 1.); l = pow(l, uGamma);
  vec3 y = mix(uInk, uPaper, l); y = mix(y, y * (x / max(lum(x), 1e-3)), uSat); gl_FragColor = vec4(mix(x, y, uMix) * c.a, c.a); }`,
  outline: `uniform float uW, uDepthT, uNormalT, uLumaT, uWob, uBoil, uFade, uOpacity, uNearCut; uniform vec3 uCol;
float edgeAt(vec2 uv){ vec2 e = uW / uRes; float z = viewZ(uv), zx = viewZ(uv + vec2(e.x, 0.)), zy = viewZ(uv + vec2(0., e.y)), zx2 = viewZ(uv - vec2(e.x, 0.)), zy2 = viewZ(uv - vec2(0., e.y));
  float dz = (abs(zx + zx2 - 2. * z) + abs(zy + zy2 - 2. * z)) / max(z, 1e-3); float ed = smoothstep(uDepthT, uDepthT * 2., dz);
  float en = 0.; if (uNormalT > 0.) { vec3 n = anyN(uv), nx = anyN(uv + vec2(e.x, 0.)), ny = anyN(uv + vec2(0., e.y)), nx2 = anyN(uv - vec2(e.x, 0.)), ny2 = anyN(uv - vec2(0., e.y));
    float dn = max(max(1. - dot(n, nx), 1. - dot(n, nx2)), max(1. - dot(n, ny), 1. - dot(n, ny2))); en = smoothstep(uNormalT, uNormalT * 1.6, dn); }
  float el = 0.; if (uLumaT > 0.) { float l = lum(unpm(S(uv))); float g = abs(lum(unpm(S(uv + vec2(e.x, 0.)))) - lum(unpm(S(uv - vec2(e.x, 0.))))) + abs(lum(unpm(S(uv + vec2(0., e.y)))) - lum(unpm(S(uv - vec2(0., e.y))))); el = smoothstep(uLumaT, uLumaT * 2., g); }
  float bg = step(.99999, rawD(uv)) * step(.99999, max(max(rawD(uv + vec2(e.x, 0.)), rawD(uv - vec2(e.x, 0.))), max(rawD(uv + vec2(0., e.y)), rawD(uv - vec2(0., e.y)))));
  float k = max(max(ed, en * (1. - bg)), el); if (uFade > 0.) k *= exp(-uFade * max(0., z - 1.)); if (uNearCut > 0.) k *= smoothstep(uNearCut, uNearCut * 1.5, z); return k; }
void main(){ vec2 uv = vUv; float fr = uBoil > 0. ? floor(uTime * uBoil) : 0.;
  if (uWob > 0.) uv += (vec2(vnoise(vUv * uRes / 18. + fr * 7.31), vnoise(vUv * uRes / 18. + 41.7 + fr * 3.17)) - .5) * uWob * 2. / uRes;
  float k = edgeAt(uv) * uOpacity; if (uWob > 0.) k *= .75 + .5 * vnoise(vUv * uRes / 6. + fr * 1.7);
  vec4 c = S(vUv); float a = max(c.a, clamp(k, 0., 1.)); vec3 x = mix(unpm(c) * c.a, uCol * a, clamp(k, 0., 1.)); gl_FragColor = vec4(x, a); }`,
  edges: `uniform float uW, uBg, uDepthT, uNormalT, uLumaT, uGain, uHasCol; uniform vec3 uCol, uBgCol;
void main(){ vec2 e = uW / uRes, uv = vUv; vec4 c = S(uv); vec3 x = unpm(c);
  float ed = 0., en = 0.; if (uHasDepth > .5) { float z = viewZ(uv); float dz = (abs(viewZ(uv + vec2(e.x, 0.)) + viewZ(uv - vec2(e.x, 0.)) - 2. * z) + abs(viewZ(uv + vec2(0., e.y)) + viewZ(uv - vec2(0., e.y)) - 2. * z)) / max(z, 1e-3); ed = smoothstep(uDepthT, uDepthT * 2., dz);
    vec3 n = anyN(uv); float dn = max(1. - dot(n, anyN(uv + vec2(e.x, 0.))), 1. - dot(n, anyN(uv + vec2(0., e.y)))); en = smoothstep(uNormalT, uNormalT * 1.6, dn) * (1. - step(.99999, rawD(uv))); }
  float g = abs(lum(unpm(S(uv + vec2(e.x, 0.)))) - lum(unpm(S(uv - vec2(e.x, 0.))))) + abs(lum(unpm(S(uv + vec2(0., e.y)))) - lum(unpm(S(uv - vec2(0., e.y)))));
  float el = uLumaT > 0. ? smoothstep(uLumaT, uLumaT * 2., g) : 0.; float k = max(max(ed, en), el);
  vec3 hue = uHasCol > .5 ? uCol : normalize(x + .05) * 1.2; vec3 base = mix(x, uBgCol, uBg); vec3 y = base + hue * k * uGain; float a = max(c.a, uBg > .99 ? 1. : 0.);
  a = max(a, clamp(k, 0., 1.)); gl_FragColor = vec4(clamp(y, 0., 1.) * a, a); }`,
  kuwahara: `uniform float uR, uMix;
void main(){ vec2 px = 1. / uRes; int R = int(uR); vec3 m0 = vec3(0.), m1 = vec3(0.), m2 = vec3(0.), m3 = vec3(0.), s0 = vec3(0.), s1 = vec3(0.), s2 = vec3(0.), s3 = vec3(0.); float a0 = 0., n = float((R + 1) * (R + 1));
  for (int j = -8; j <= 8; j++) { if (j < -R || j > R) continue; for (int i = -8; i <= 8; i++) { if (i < -R || i > R) continue;
    vec4 t = S(vUv + vec2(float(i), float(j)) * px); vec3 c = t.rgb;
    if (i <= 0 && j <= 0) { m0 += c; s0 += c * c; } if (i >= 0 && j <= 0) { m1 += c; s1 += c * c; } if (i <= 0 && j >= 0) { m2 += c; s2 += c * c; } if (i >= 0 && j >= 0) { m3 += c; s3 += c * c; } } }
  m0 /= n; m1 /= n; m2 /= n; m3 /= n; vec3 v0 = s0 / n - m0 * m0, v1 = s1 / n - m1 * m1, v2 = s2 / n - m2 * m2, v3 = s3 / n - m3 * m3;
  float q0 = v0.r + v0.g + v0.b, q1 = v1.r + v1.g + v1.b, q2 = v2.r + v2.g + v2.b, q3 = v3.r + v3.g + v3.b;
  vec3 best = m0; float bq = q0; if (q1 < bq) { bq = q1; best = m1; } if (q2 < bq) { bq = q2; best = m2; } if (q3 < bq) { bq = q3; best = m3; }
  vec4 c = S(vUv); float a = c.a; gl_FragColor = vec4(mix(c.rgb, best, uMix), a); }`,
  paper: `uniform vec3 uCol; uniform float uAmt, uFiber, uGrain, uEdge, uBleed, uScale, uOpaque;
float paperTex(vec2 p){ float f = fbm(p * vec2(1., 3.2) * .9) * .55 + fbm(p * 2.7 + 9.) * .45; float fib = smoothstep(.55, .9, vnoise(p * vec2(9., 1.3) + fbm(p * 1.3) * 3.)) * uFiber; return f - fib * .25; }
void main(){ vec2 P = vUv * uRes / (180. * uScale);
  vec2 w = (vec2(fbm(P * 2.1 + 3.3), fbm(P * 2.1 + 8.8)) - .5) * uBleed * 2. / uRes; vec4 c = S(vUv + w);
  vec2 e = 2. / uRes; float l = lum(unpm(c)), g = abs(lum(unpm(S(vUv + w + vec2(e.x, 0.)))) - lum(unpm(S(vUv + w - vec2(e.x, 0.))))) + abs(lum(unpm(S(vUv + w + vec2(0., e.y)))) - lum(unpm(S(vUv + w - vec2(0., e.y)))));
  float pt = paperTex(P), gr = h12(floor(vUv * uRes) + 3.1);
  vec3 x = c.rgb; float a = c.a;
  if (uOpaque > .5) { x = x + uCol * (1. - a); a = 1.; }
  vec3 y = x * (1. - uEdge * clamp(g * 1.6, 0., .6));
  float ink = 1. - lum(y); y *= 1. - uGrain * .35 * ink * (gr - .5 + (pt - .5) * 1.4);
  y *= mix(1., .86 + .28 * pt, uAmt); y = mix(y, y * (1. + (gr - .5) * .06), uAmt);
  gl_FragColor = vec4(clamp(y, 0., 1.) * (uOpaque > .5 ? 1. : 1.), a); }`,
  halftone: `uniform float uSize, uAng, uMode, uMix, uSoft; uniform vec3 uInk, uPaper;
float dotL(vec2 p, float ang, float v){ float s = sin(ang), c = cos(ang); vec2 q = mat2(c, -s, s, c) * p / uSize; vec2 f = fract(q) - .5; float r = sqrt(clamp(v, 0., 1.)) * .62; return 1. - smoothstep(r - .06 * uSoft, r + .06 * uSoft, length(f)); }
void main(){ vec2 p = vUv * uRes; vec4 c = S(vUv); vec3 x = unpm(c), y; float A = uAng * .0174533;
  if (uMode < .5) { float d = dotL(p, A, 1. - lum(x)); y = mix(uPaper, uInk, d); }
  else if (uMode < 1.5) { float k = 1. - max(x.r, max(x.g, x.b)); vec3 cmy = (1. - x - k) / max(1. - k, 1e-3);
    float C = dotL(p, A + .2618, cmy.r), M = dotL(p, A + 1.309, cmy.g), Y = dotL(p, A, cmy.b), K = dotL(p, A + .7854, k);
    y = uPaper * (1. - C * vec3(1., .2, 0.)) * (1. - M * vec3(.05, 1., .1)) * (1. - Y * vec3(0., .05, 1.)); y *= 1. - K * .9; }
  else { float d = dotL(p, A, 1. - lum(x) * .85); y = mix(uPaper, x * .8, d); }
  gl_FragColor = vec4(mix(x, y, uMix) * c.a, c.a); }`,
  pixel: `uniform float uSize, uLevels, uDither, uMix, uN; uniform vec3 uC[8];
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.); int i = int(q.x) + int(q.y) * 4; float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return m[i] / 16. - .5; }
void main(){ vec2 cell = floor(vUv * uRes / uSize), uv = (cell + .5) * uSize / uRes; vec4 c = S(uv); vec3 x = unpm(c), y; float b = bayer(cell) * uDither;
  if (uN > 0.) { float best = 1e9; y = uC[0]; vec3 xd = x + b * .18; for (int k = 0; k < 8; k++) { if (float(k) >= uN) break; vec3 d = (xd - uC[k]) * vec3(.3, .59, .11); float e = dot(d, d); if (e < best) { best = e; y = uC[k]; } } }
  else y = floor(x * (uLevels - 1.) + .5 + b) / (uLevels - 1.);
  float a = step(.5, c.a); gl_FragColor = vec4(mix(unpm(S(vUv)), clamp(y, 0., 1.), uMix) * a, a); }`,
  glow: `uniform float uR, uStr, uThr;
void main(){ vec4 c = S(vUv); vec3 acc = vec3(0.); float ws = 0.;
  for (int i = 0; i < 24; i++) { float fi = float(i) + .5, r = sqrt(fi / 24.) * uR, a = fi * 2.39996323; vec4 t = S(vUv + vec2(cos(a), sin(a)) * r / uRes); vec3 v = unpm(t) * t.a; float l = lum(v); float w = exp(-r * r / (uR * uR) * 2.);
    acc += v * smoothstep(uThr, 1., l) * w; ws += w; }
  vec3 g = acc / ws * uStr * 2.; float a = clamp(max(c.a, max(g.r, max(g.g, g.b))), 0., 1.); gl_FragColor = vec4(clamp(c.rgb + g, 0., 1.), a); }`,
  tiltshift: `uniform float uFocus, uBand, uBlur, uSat, uAng;
void main(){ vec2 d = vUv - .5; float s = sin(uAng * .0174533), co = cos(uAng * .0174533); float y = (d.x * s + d.y * co) + .5;
  float k = smoothstep(uBand, uBand + .25, abs(y - uFocus)), r = k * uBlur; vec4 acc = S(vUv); float ws = 1.;
  if (r > .3) for (int i = 0; i < 24; i++) { float fi = float(i) + .5, rr = sqrt(fi / 24.) * r, a = fi * 2.39996323; acc += S(vUv + vec2(cos(a), sin(a)) * rr / uRes); ws += 1.; }
  acc /= ws; vec3 x = unpm(acc); float l = lum(x); x = clamp(l + (x - l) * uSat, 0., 1.); gl_FragColor = vec4(x * acc.a, acc.a); }`,
  mist: `uniform vec3 uCol; uniform float uNearM, uFarM, uDen, uPow, uSky;
void main(){ vec4 c = S(vUv); float d = rawD(vUv); float k;
  if (d > .99999) k = uSky; else { float z = viewZ(vUv); k = pow(clamp((z - uNearM) / max(uFarM - uNearM, 1e-3), 0., 1.), uPow) * uDen; }
  k = clamp(k, 0., 1.); float a = uSky > .5 && d > .99999 ? 1. : c.a; vec3 x = mix(unpm(c), uCol, k); a = mix(a, max(a, k), step(.5, uSky)); gl_FragColor = vec4(x * a, a); }`,
  hatch: `uniform float uSize, uAng, uAmt, uThr; uniform vec3 uCol;
float line(vec2 p, float ang, float w){ float s = sin(ang), c = cos(ang); float v = (p.x * c + p.y * s) / uSize; float f = abs(fract(v) - .5); return 1. - smoothstep(w, w + .12, f); }
void main(){ vec4 c = S(vUv); vec3 x = unpm(c); float l = lum(x), d = clamp((uThr - l) / uThr, 0., 1.); vec2 p = vUv * uRes; float A = uAng * .0174533;
  float h = line(p, A, .12 * d + .02) * step(.05, d); h = max(h, line(p, A + 1.5708, .1 * d) * step(.4, d)); h = max(h, line(p, A + .7854, .08 * d) * step(.7, d));
  h *= uAmt; gl_FragColor = vec4(mix(x, uCol, h) * c.a, c.a); }`,
};

/* ---------------- runtime chain (one per layer; THREE passed in) ---------------- */
export class LookChain {
  constructor(THREE, renderer) {
    this.T = THREE; this.r = renderer; this.mats = new Map(); this.rts = null; this.spec = undefined; this.passes = [];
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const black = new Uint8Array([128, 128, 255, 255]); this.flat = new THREE.DataTexture(black, 1, 1); this.flat.needsUpdate = true;
  }
  setSpec(spec) { if (spec === this.spec) return this.passes; this.spec = spec; this.passes = expandLook(spec); return this.passes; }
  size(w, h) {
    if (this.rts && this.rts.w === w && this.rts.h === h) return;
    if (this.rts) { this.rts.a.dispose(); this.rts.b.dispose(); }
    const T = this.T, o = { type: T.HalfFloatType, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false, colorSpace: T.NoColorSpace };
    this.rts = { w, h, a: new T.WebGLRenderTarget(w, h, o), b: new T.WebGLRenderTarget(w, h, o) };
  }
  mat(type) {
    if (this.mats.has(type)) return this.mats.get(type);
    const T = this.T, V2 = () => ({ value: new T.Vector2() }), V3 = () => ({ value: new T.Vector3() });
    const u = { tSrc: { value: null }, tDepth: { value: null }, tNormal: { value: this.flat }, uRes: V2(), uDRes: V2(), uTime: { value: 0 }, uSeed: { value: 0 }, uNear: { value: .1 }, uFar: { value: 100 }, uPersp: { value: 1 }, uHasDepth: { value: 0 }, uHasNormal: { value: 0 } };
    const src = FS[type];
    for (const m of src.matchAll(/uniform\s+(float|vec3|vec2)\s+([^;]+);/g)) {
      if (/^tSrc|^uRes,/.test(m[2])) continue;
      for (let n of m[2].split(',')) { n = n.trim(); const arr = /^(\w+)\[(\d+)\]$/.exec(n); if (arr) { u[arr[1]] = { value: Array.from({ length: +arr[2] }, () => new T.Vector3()) }; continue; } if (u[n]) continue; u[n] = m[1] === 'float' ? { value: 0 } : m[1] === 'vec3' ? V3() : V2(); }
    }
    const mat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: HEAD + src, uniforms: u, depthTest: false, depthWrite: false, blending: T.NoBlending });
    this.mats.set(type, mat); return mat;
  }
  // run the chain: src (texture at w×h, premultiplied display colour) → … → canvas viewport (0, 0, ow, oh)
  run(src, ctx) {
    const R = this.rts, P = this.passes, n = P.length; let cur = src;
    for (let i = 0; i < n; i++) {
      const p = P[i], m = this.mat(p.type), u = m.uniforms, v = passParams(p, ctx.t);
      u.tSrc.value = cur; u.uRes.value.set(R.w, R.h); u.uTime.value = ctx.t; u.uSeed.value = ctx.seed % 997;
      u.tDepth.value = ctx.depth || this.flat; u.uHasDepth.value = ctx.depth ? 1 : 0; u.uDRes.value.set(ctx.dw || R.w, ctx.dh || R.h);
      u.tNormal.value = ctx.normal || this.flat; u.uHasNormal.value = ctx.normal ? 1 : 0; u.uNear.value = ctx.near; u.uFar.value = ctx.far; u.uPersp.value = ctx.persp ? 1 : 0;
      setUniforms(p.type, u, v);
      const last = i === n - 1, dst = last ? null : (cur === R.a.texture ? R.b : R.a);
      this.quad.material = m; this.r.setRenderTarget(dst);
      if (last) { this.r.setViewport(0, 0, ctx.ow, ctx.oh); this.r.setScissorTest(false); }
      this.r.render(this.scene, this.cam);
      if (!last) cur = dst.texture;
    }
  }
  dispose() { if (this.rts) { this.rts.a.dispose(); this.rts.b.dispose(); } this.mats.forEach(m => m.dispose()); }
}
const set3 = (u, k, c, d) => { const x = rgb(c, d); u[k].value.set(x[0], x[1], x[2]); };
const setPal = (u, cols) => { const C = (cols || []).slice(0, 8); C.forEach((c, i) => { const x = rgb(c); u.uC.value[i].set(x[0], x[1], x[2]); }); for (let i = C.length; i < 8; i++) u.uC.value[i].copy(u.uC.value[Math.max(0, C.length - 1)]); u.uN.value = C.length; };
function setUniforms(type, u, v) {
  switch (type) {
    case 'toon': u.uBands.value = Math.max(1, v.bands); u.uSoft.value = v.soft; u.uMix.value = v.mix; u.uShadow.value = v.shadow; u.uHasTint.value = v.shadowTint ? 1 : 0; if (v.shadowTint) set3(u, 'uTint', v.shadowTint); break;
    case 'posterize': u.uLevels.value = Math.max(1, v.levels); u.uMix.value = v.mix; break;
    case 'palette': setPal(u, v.colors); u.uMode.value = v.mode === 'nearest' ? 1 : 0; u.uMix.value = v.mix; u.uDither.value = v.dither; break;
    case 'ink': set3(u, 'uInk', v.ink); set3(u, 'uPaper', v.paper); u.uSat.value = v.sat; u.uContrast.value = v.contrast; u.uGamma.value = v.gamma; u.uMix.value = v.mix; break;
    case 'outline': u.uW.value = v.width; set3(u, 'uCol', v.color); u.uDepthT.value = v.depth; u.uNormalT.value = v.normal; u.uLumaT.value = v.luma; u.uWob.value = v.wobble; u.uBoil.value = v.boil; u.uFade.value = v.fade; u.uOpacity.value = v.opacity; u.uNearCut.value = v.near; break;
    case 'edges': u.uW.value = v.width; u.uHasCol.value = v.color ? 1 : 0; if (v.color) set3(u, 'uCol', v.color); u.uBg.value = v.bg; set3(u, 'uBgCol', v.bgColor); u.uDepthT.value = v.depth; u.uNormalT.value = v.normal; u.uLumaT.value = v.luma; u.uGain.value = v.gain; break;
    case 'kuwahara': u.uR.value = Math.max(1, Math.min(8, Math.round(v.radius))); u.uMix.value = v.mix; break;
    case 'paper': set3(u, 'uCol', v.color); u.uAmt.value = v.amount; u.uFiber.value = v.fiber; u.uGrain.value = v.grain; u.uEdge.value = v.edge; u.uBleed.value = v.bleed; u.uScale.value = v.scale || 1; u.uOpaque.value = v.opaque ? 1 : 0; break;
    case 'halftone': u.uSize.value = Math.max(2, v.size); u.uAng.value = v.angle; u.uMode.value = v.mode === 'cmyk' ? 1 : v.mode === 'color' ? 2 : 0; set3(u, 'uInk', v.ink); set3(u, 'uPaper', v.paper); u.uMix.value = v.mix; u.uSoft.value = v.soft; break;
    case 'pixel': u.uSize.value = Math.max(1, v.size); u.uLevels.value = Math.max(2, v.levels); u.uDither.value = v.dither; u.uMix.value = v.mix; if (v.colors) setPal(u, v.colors); else u.uN.value = 0; break;
    case 'glow': u.uR.value = v.radius; u.uStr.value = v.strength; u.uThr.value = v.threshold; break;
    case 'tiltshift': u.uFocus.value = v.focus; u.uBand.value = v.band; u.uBlur.value = v.blur; u.uSat.value = v.saturate; u.uAng.value = v.angle; break;
    case 'mist': set3(u, 'uCol', v.color); u.uNearM.value = v.near; u.uFarM.value = v.far; u.uDen.value = v.density; u.uPow.value = v.power; u.uSky.value = v.sky ? 1 : 0; break;
    case 'hatch': u.uSize.value = Math.max(2, v.size); set3(u, 'uCol', v.color); u.uAng.value = v.angle; u.uAmt.value = v.amount; u.uThr.value = v.threshold; break;
  }
}
// material helpers (need THREE): toon material with a banded gradient map; toonify(root) swaps lit materials in place
export function makeToon(THREE) {
  const ramps = new Map();
  const ramp = (bands, o = {}) => { const k = bands + ':' + (o.min != null ? o.min : ''); if (!ramps.has(k)) { const d = toonRamp(bands, o), t = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; ramps.set(k, t); } return ramps.get(k); };
  const toonMaterial = (o = {}) => new THREE.MeshToonMaterial({ color: o.color != null ? o.color : 0xffffff, map: o.map || null, gradientMap: ramp(o.bands || 3, o), emissive: o.emissive != null ? o.emissive : 0x000000, side: o.side != null ? o.side : THREE.FrontSide, transparent: !!o.transparent, opacity: o.opacity != null ? o.opacity : 1, vertexColors: !!o.vertexColors, flatShading: !!o.flat });
  function toonify(root, o = {}) {
    const done = new Map();
    root.traverse(x => {
      if (!x.isMesh || !x.material) return;
      const one = m => { if (!m || m.isShaderMaterial || m.isMeshToonMaterial || m.isMeshBasicMaterial) return m; if (done.has(m)) return done.get(m);
        const t = toonMaterial({ ...o, color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, emissive: m.emissive ? m.emissive.clone() : 0, transparent: m.transparent, opacity: m.opacity, vertexColors: m.vertexColors, side: m.side, flat: o.flat != null ? o.flat : m.flatShading });
        if (x.isSkinnedMesh) t.skinning = true; done.set(m, t); return t; };
      x.material = Array.isArray(x.material) ? x.material.map(one) : one(x.material);
    });
    return root;
  }
  return { toonMaterial, toonify, ramp };
}
