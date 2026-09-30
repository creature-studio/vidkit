// Fragment shaders of the vk.gl effects (the prelude from glsl.js is prepended by GLCore.program()).
import { NOISE_LOOKUP } from './glsl.js';

// bicubic B-spline lookup from 4 bilinear taps (smooth upsampling of coarse pyramid levels → round contours)
const CUBIC = `vec4 cubicTex(sampler2D t, vec2 uv, vec2 sz){
  vec2 st = uv * sz - .5, i = floor(st), f = fract(st);
  vec2 w0 = (1. - f) * (1. - f) * (1. - f) / 6., w1 = (4. - 6. * f * f + 3. * f * f * f) / 6., w2 = (1. + 3. * f + 3. * f * f - 3. * f * f * f) / 6., w3 = f * f * f / 6.;
  vec2 g0 = w0 + w1, g1 = w2 + w3, h0 = (w1 / g0) - 1. + i + .5, h1 = (w3 / g1) + 1. + i + .5;
  return g0.y * (g0.x * texture2D(t, vec2(h0.x, h0.y) / sz) + g1.x * texture2D(t, vec2(h1.x, h0.y) / sz))
       + g1.y * (g0.x * texture2D(t, vec2(h0.x, h1.y) / sz) + g1.x * texture2D(t, vec2(h1.x, h1.y) / sz)); }
`;

// ---- rice paper (xuan): cloudy density, fibres, grain, specks, soft vignette. uMode 0 = opaque paper, 1 = multiply map
export const PAPER = NOISE_LOOKUP + `uniform vec3 uBase; uniform float uAmt, uFib, uVig, uMode, uSpeck;
void main(){
  vec2 sp = scenePx(vUv); vec4 n = paperN(sp);
  vec3 col = uBase * (1. - uAmt * (.075 * (n.r - .5) + .035 * (n.g - .5)));
  float fib = n.b;
  col = mix(col, min(vec3(1.), col * vec3(1.045, 1.045, 1.05)), uFib * fib * .8);   // fibre strands: lighter pulp
  col = mix(col, col * vec3(.965, .962, .95), uFib * smoothstep(.35, 1., fib) * .45); // …with a faint darker core
  float cl = smoothstep(.55, .85, fbm3(sp / 14. + 3.1)) * smoothstep(.5, .7, n.r);
  col = mix(col, min(vec3(1.), col * 1.03), uFib * cl * .6);                      // pulp clouds
  col *= 1. - .05 * uAmt * (n.a - .5);
  vec2 sc = floor(sp / 5.); float sh = h12(sc + 7.3);
  float sk = step(.9993, sh) * smoothstep(1.6, .4, length(fract(sp / 5.) * 5. - 2.5 - (vec2(h12(sc + 1.), h12(sc + 2.)) - .5) * 2.));
  col *= 1. - sk * .28 * uSpeck;
  vec2 v = (sp / uNS - .5) * vec2(1., .82);
  col *= 1. - uVig * smoothstep(.3, .9, length(v) * 1.25) * vec3(1., 1.02, 1.08);
  gl_FragColor = uMode > .5 ? vec4(min(vec3(1.), col / uBase), 1.) : vec4(col, 1.);
}`;

// ---- ink bleed: mask pyramid → condensing strokes + a wet halo with a tide-line rim, following the paper fibres
export const BLEED = NOISE_LOOKUP + CUBIC + `uniform sampler2D uM0, uM1, uM3, uHa, uHb; uniform vec2 uHaSize, uHbSize, uM3Size; uniform float uHmix;
uniform float uX, uDraw, uDur, uHaloEnd, uFade, uSoft; uniform vec3 uWipe;
uniform vec3 uColor; uniform float uDensity, uHaloDensity, uRim, uFibre, uFeather, uMottle, uGrain, uSeedF, uPool, uHWarp;
void main(){
  vec2 sp = scenePx(vUv); vec4 n = paperN(sp);
  float dl = 0.;
  if (uWipe.z > 0.) { float pos = dot(vec2(vUv.x, 1. - vUv.y) - .5, uWipe.xy) + .5; dl = uWipe.z * clamp(pos + (n.g - .5) * .06, 0., 1.); }
  float x = uX - dl;
  if (x < 0.) { gl_FragColor = vec4(0.); return; }
  // far from any ink (coarsest halo level and the lightly blurred mask both empty): nothing to draw
  if (texture2D(uHb, vUv).a < .003 && texture2D(uM3, vUv).a < .003) { gl_FragColor = vec4(0.); return; }
  float d = clamp(x / max(uDraw, 1e-4), 0., 1.), sd = d * d * (3. - 2. * d);
  float w = clamp((x - uDraw * .35) / max(uDur, 1e-4), 0., 1.), wet = sqrt(w);
  float thC = .98 - .48 * sd, thH = 1. - (1. - uHaloEnd) * wet;
  // domain warp (organic outlines): a few px for the stroke, a fraction of the spread for the halo
  vec2 wq = sp / 23. + uSeedF, wv = (vec2(fbm3(wq), fbm3(wq + 9.7)) - .5) * 3.;
  vec2 pxUv = 1. / uRes;
  float Fc = mix(texture2D(uM0, vUv + wv * 1.6 * uFeather * pxUv).a, texture2D(uM1, vUv + wv * 1.6 * uFeather * pxUv).a, .6);
  vec2 wq2 = sp / 61. + uSeedF * 1.7, wv2 = (vec2(fbm3(wq2), fbm3(wq2 + 4.1)) - .5) * 3.;
  vec2 huv = vUv + (wv2 * uHWarp + wv * uHWarp * .35) * pxUv;
  float Fh = mix(cubicTex(uHa, huv, uHaSize).a, cubicTex(uHb, huv, uHbSize).a, uHmix);
  // paper-driven irregularity: cloudy (R) + mid (G) noise, fine ragged edge, a little wicking along fibres (B)
  float lo = (n.r - .5) * 2.2, mid = (n.g - .5) * 2.2, fine = vnoise(sp * .6 + uSeedF) - .5;
  float cth = thC + (mid * .07 + fine * .12 * (1. - .8 * uSoft)) * uFeather - n.b * .08 * uFibre * (1. - .6 * uSoft);
  float cov = smoothstep(cth - .02 - .5 * uSoft, cth + .02, Fc);
  float hth = thH * (1. + (lo * .45 + mid * .3 + fine * .25) * uFeather) - n.b * .16 * uFibre;
  float hcov = wet > 0. ? smoothstep(hth - .006, hth + .02, Fh) : 0.;
  // halo density: fades from the stroke outwards; darker tide line at the front, softer while still wet
  float Fn = cubicTex(uM3, huv, uM3Size).a;
  float hg = clamp((Fh - hth) / max(.05, 1. - hth) * .8, 0., 1.) * .5 + smoothstep(.02, .45, Fn) * .5;
  float rim = hcov * (1. - smoothstep(hth + .005, hth + .03 + .05 * (1. - wet), Fh)) * (.35 + .65 * wet);
  float mott = 1. - uMottle * (.35 * lo + .2 * mid);
  // pigment pools at the edges of the core (the stroke dries darker at its border)
  float pool = cov * (1. - smoothstep(cth, cth + .3, Fc)) * uPool;
  float a = cov * uDensity * mott * mix(.86, 1., Fc) + pool * (1. - uDensity * .8);
  float ha = (hcov * uHaloDensity * mix(.25, 1.25, hg) + rim * uRim) * mott;
  a = a + ha * (1. - a);
  a *= 1. - uGrain * ((n.a - .5) * .8 * (1. - .6 * uSoft) + .25 * n.b);
  a = clamp(a * clamp(sd * 2.5, 0., 1.) * uFade, 0., 1.);
  gl_FragColor = vec4(uColor * a, a);
}`;

// ---- ink-wash post filter on coloured shapes: boiling wobble, pooled dark edges, mottled pigment, grain, soft bleed
export const WASH = NOISE_LOOKUP + CUBIC + `uniform sampler2D uS, uL2, uL3, uL4; uniform vec2 uL4Size;
uniform float uBoil, uWob, uWobF, uDark, uEdge, uBleed, uGrain, uMottle, uAlpha, uSeedF, uInk, uTide; uniform vec3 uInkC;
void main(){
  vec2 sp = scenePx(vUv); vec4 n = paperN(sp);
  vec2 q = sp / uWobF + uBoil * 17.13 + uSeedF;
  vec2 off = (vec2(vnoise(q), vnoise(q + 31.7)) - .5) * 2. * uWob / (uRes * uNX.zw);
  vec2 uv = vUv + off;
  vec4 c = texture2D(uS, uv), b = mix(texture2D(uL2, uv), texture2D(uL3, uv), .5), bb = cubicTex(uL4, uv, uL4Size);
  float a0 = c.a;
  vec3 base = c.rgb / max(a0, 1e-4);
  // pigment pools at the borders of every wash (irregular band)
  float edge = clamp((a0 - b.a) * uEdge + (n.g - .5) * .5 * a0, 0., 1.);
  vec3 pooled = mix(base * base * .62, uInkC, .2 * uInk);
  base = mix(base, pooled, edge * uDark);
  // wet-wash mottling and tide lines (water marks) inside large shapes
  float lo = (n.r - .5) * 2.2, mid = (n.g - .5) * 2.2;
  base *= 1. + lo * uMottle * .22 - mid * uMottle * .08;
  float wm = fbm3(sp / 70. + uSeedF + 3.);
  float tide = smoothstep(.028, .0, abs(wm - .52)) * clamp(b.a * 1.4 - .3, 0., 1.);
  base = mix(base, base * base * .75, tide * uTide);
  float a = a0 * clamp(1. - uGrain * ((n.a - .5) * .9 + .4 * n.b), 0., 1.);
  // soft bleed of diluted colour into the paper around shapes
  float hth = .14 + (n.g - .5) * .3 - n.b * .12;
  float halo = smoothstep(hth, hth + .2, bb.a) * uBleed * (1. - a0);
  vec3 hc = bb.rgb / max(bb.a, 1e-4);
  float ha = halo * .45 * (1. - .4 * smoothstep(hth + .2, hth + .6, bb.a));
  gl_FragColor = vec4(base * a + hc * ha * (1. - a), a + ha * (1. - a)) * uAlpha;
}`;

// ---- drifting mist band (留白): paper-coloured fbm clouds, stretched horizontally, moving with scene time
export const MIST = NOISE_LOOKUP + `uniform float uTime, uY, uH, uSpeed, uDensity, uScale, uSeedF; uniform vec3 uColor;
void main(){
  vec2 sp = scenePx(vUv);
  float band = exp(-pow((sp.y - uY) / uH, 2.));
  if (band < .004) { gl_FragColor = vec4(0.); return; }
  vec2 q = vec2(sp.x / (uScale * 3.2) + uTime * uSpeed / uScale, sp.y / uScale) + uSeedF;
  float f = fbm(q) * .75 + fbm(q * 2.3 + 7.) * .25;
  float a = smoothstep(.36, .72, f) * band * uDensity;
  gl_FragColor = vec4(uColor * a, a);
}`;

// ---- particles as point sprites. a0 = (x, y, radius, alpha) scene px · a1 = (rot deg, shape, u, landed age) · a2 = rgb
export const PVERT = `attribute vec4 a0; attribute vec4 a1; attribute vec4 a2;
uniform vec2 uRes; uniform vec4 uNX; uniform float uMaxPt;
varying vec4 v1; varying vec3 vC; varying float vA, vM;
void main(){
  vec2 lp = (a0.xy - uNX.xy) / uNX.zw;
  gl_Position = vec4(lp.x / uRes.x * 2. - 1., 1. - lp.y / uRes.y * 2., 0., 1.);
  float m = a1.y == 1. ? 1.8 : a1.y == 2. || a1.y == 4. ? 1.6 : 1.15;
  float want = a0.z * 2. * m / uNX.z;
  gl_PointSize = min(want, uMaxPt);
  vM = m;
  v1 = a1; vC = a2.rgb; vA = a0.w;
}`;
export const PFRAG = `precision highp float;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1., 0.)), u.x), mix(h12(i + vec2(0., 1.)), h12(i + vec2(1., 1.)), u.x), u.y); }
uniform vec3 uC2; uniform float uSoak;
varying vec4 v1; varying vec3 vC; varying float vA, vM;
void main(){
  vec2 pc = gl_PointCoord * 2. - 1.;
  float shape = v1.y, u = v1.z, r = length(pc) * vM, a = 0.; vec3 col = vC;
  if (shape < .5) {                                     // drop in flight: round, slightly ragged, dense
    float e = 1. + .12 * (vnoise(vec2(atan(pc.y, pc.x) * 1.3 + u * 40., u * 9.)) - .5);
    a = smoothstep(e, e - .18, r);
  } else if (shape < 1.5) {                             // landed splat soaking into the paper
    float ang = atan(pc.y, pc.x);
    float e = 1. + .36 * (vnoise(vec2(ang * 1.1 + u * 40., u * 9.)) - .5) + .16 * (vnoise(vec2(ang * 4.3 + u * 70., 3.)) - .5);
    e += .5 * pow(max(0., vnoise(vec2(ang * 3.2 + u * 13., 7.)) - .6) / .4, 2.);
    float blot = smoothstep(e, e - .07, r);
    float rim = smoothstep(e - .3, e - .03, r) * blot;
    float soak = clamp(v1.w * 2., 0., 1.);
    float halo = smoothstep(e * 1.55, e * 1.02, r) * (1. - blot) * .3 * soak * uSoak;
    a = blot * (.78 + .22 * rim) + halo;
  } else if (shape < 2.5) {                             // mist / spray: soft gaussian
    a = exp(-r * r * 3.2);
  } else if (shape < 3.5) {                             // petal: rotated, pointed ellipse, pale base → coloured tip
    float t = radians(v1.x); vec2 q = mat2(cos(t), -sin(t), sin(t), cos(t)) * pc * vM;
    float y = q.y, w = .52 * (1. - .35 * y) * sqrt(max(0., 1. - y * y));
    float notch = .12 * smoothstep(.2, 0., abs(q.x)) * smoothstep(.75, 1., -y);
    a = smoothstep(.03, -.03, abs(q.x) - w) * smoothstep(1., .92, abs(y) + notch);
    col = mix(uC2, vC, smoothstep(.9, -.6, y));
    col *= .92 + .08 * smoothstep(.05, 0., abs(q.x));
  } else if (shape < 4.5) {                             // spark: hot core + glow (use blend: 'add')
    a = exp(-r * r * 5.) * .7 + smoothstep(.3, .05, r) * .6;
    col = mix(vC, vec3(1., .97, .85), smoothstep(.35, 0., r));
  } else {                                              // plain dot
    a = smoothstep(1., .85, r);
  }
  a = clamp(a * vA, 0., 1.);
  gl_FragColor = vec4(col * a, a);
}`;
// ---- custom shader prelude: uTime (scene-local s), uStep (time on twos), uRes, noise lookups
export const CUSTOM_HEAD = NOISE_LOOKUP + 'uniform float uTime, uStep, uProgress;\n';
