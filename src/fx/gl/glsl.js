// GLSL chunks shared by the vk.gl shaders (WebGL 1 / GLSL ES 1.00). All noise is hash-based and seeded through
// uniforms: no textures of random data, no clocks — identical inputs give identical pixels.
export const PRELUDE = `precision highp float;
varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1., 0.)), u.x), mix(h12(i + vec2(0., 1.)), h12(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.1; a *= .5; } return s / .96875; }
float fbm3(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.1; a *= .5; } return s / .875; }
`;
export const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

// 5-tap binomial blur along uDir (texel units) — σ = 1 texel; used by the Gaussian pyramid
export const BLUR = `uniform sampler2D uTex; uniform vec2 uDir;
void main(){ vec4 s = texture2D(uTex, vUv) * .375 + (texture2D(uTex, vUv + uDir) + texture2D(uTex, vUv - uDir)) * .25
  + (texture2D(uTex, vUv + 2. * uDir) + texture2D(uTex, vUv - 2. * uDir)) * .0625; gl_FragColor = s; }`;
// 2×2 box downsample (bilinear tap at the texel corner)
export const DOWN = `uniform sampler2D uTex; uniform vec2 uTexel;
void main(){ gl_FragColor = .25 * (texture2D(uTex, vUv + uTexel * vec2(-.5, -.5)) + texture2D(uTex, vUv + uTexel * vec2(.5, -.5)) + texture2D(uTex, vUv + uTexel * vec2(-.5, .5)) + texture2D(uTex, vUv + uTexel * vec2(.5, .5))); }`;
export const COPY = `uniform sampler2D uTex; void main(){ gl_FragColor = texture2D(uTex, vUv); }`;

// Paper noise field in scene pixels (generated once per video, sampled by every ink shader so ink follows the same
// fibres the paper shows). R: cloudy low-frequency density · G: mid-frequency mottling · B: fibres · A: fine grain
export const NOISE = `uniform vec2 uSize; uniform float uSeed;
void main(){
  vec2 p = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y) + uSeed * vec2(173.1, 91.7);
  float R = fbm(p / 230.);
  float G = fbm(p / 42. + 5.3);
  float fib = 0.;
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    float a = fk * 1.9 + (fbm3(p / 520. + fk * 3.7) - .5) * 3.5;
    vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    float n = vnoise(q * vec2(.010, .42) + fk * 19.3 + uSeed);
    float ridge = pow(1. - abs(n * 2. - 1.), 12.);
    float gate = smoothstep(.52, .78, vnoise(q * vec2(.018, .06) + fk * 7.1 + uSeed * 2.));
    fib = max(fib, ridge * gate * (.55 + .45 * vnoise(q * vec2(.05, .2) + 3.)));
  }
  float A = .55 * h12(floor(p)) + .45 * vnoise(p / 1.7);
  gl_FragColor = vec4(R, G, fib, A);
}`;
// how an effect finds the scene-space paper noise: uNX = (scene x0, y0, px per layer px x, y), uNS = scene size
export const NOISE_LOOKUP = `uniform sampler2D uN; uniform vec4 uNX; uniform vec2 uNS; uniform vec2 uRes;
vec2 scenePx(vec2 uv){ return vec2(uNX.x + uv.x * uRes.x * uNX.z, uNX.y + (1. - uv.y) * uRes.y * uNX.w); }
vec4 paperN(vec2 sp){ return texture2D(uN, vec2(sp.x / uNS.x, 1. - sp.y / uNS.y)); }
`;
