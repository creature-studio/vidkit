// vk.three.shaderPlate — fullscreen raymarched / SDF shader plates rendered INTO the layer's HDR scene target, so they
// go through the same sub-frame accumulate (motion blur + jittered AA), bloom and look chain as meshes (Ex-Nihilo-like).
//   vk.three.shaderPlate({ preset: 'metaballs' | 'tunnel' | 'nebula' | 'rings' })
//   vk.three.shaderPlate({ sdf: 'float map(vec3 p){ return sdTorus(p, vec2(1., .3)); }',
//                          shade: 'vec3 shade(vec3 p, vec3 n, vec3 rd, float id){ … }', background: 'vec3 bg(vec3 rd){ … }' })
//   vk.three.shaderPlate({ glsl: 'vec4 image(vec2 uv, vec3 ro, vec3 rd){ … }' })     raw: any colour per pixel
// The ray comes from the layer camera (rigs work; AA jitter included), uTime is the sample time (pure in t), extra
// uniforms: { uniforms: { uGlow: 1.5, uTint: [1, .5, .2], uK: t => … } }. depth: true writes gl_FragDepth so meshes
// in the same layer intersect the SDF correctly. Library (always available): hash3 noise3 fbm3 sdSphere sdBox
// sdRoundBox sdTorus sdCapsule sdCyl sdPlane opU opSU opSub opI rot2 pal (iq palette) calcNormal softShadow calcAO.
import { unknownName } from '../core/strict.js';

export const GLSL_LIB = `
float hash1(float n){ return fract(sin(n) * 43758.5453123); }
float hash3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * noise3(p); p = p * 2.02 + 3.1; a *= .5; } return s; }
float sdSphere(vec3 p, float r){ return length(p) - r; }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdRoundBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdCyl(vec3 p, float h, float r){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }
float sdPlane(vec3 p, float h){ return p.y - h; }
float opU(float a, float b){ return min(a, b); }
float opSU(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float opSub(float a, float b){ return max(a, -b); }
float opI(float a, float b){ return max(a, b); }
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b * cos(6.2831853 * (c * t + d)); }
`;
const VS = `varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 1., 1.); }`;
const HEAD = `uniform float uTime, uSteps, uMaxD, uEps, uDepth, uExposure; uniform mat4 uInvProj, uCamWorld, uProj, uView; uniform vec3 uCamPos; uniform vec2 uRes; varying vec2 vNdc;\n`;
// high-level raymarcher around user map / shade / bg
const MARCH = `
vec3 calcNormal(vec3 p){ const vec2 k = vec2(1, -1); float e = uEps * 2.; return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) + k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e)); }
float softShadow(vec3 ro, vec3 rd, float k){ float r = 1., t = .02; for (int i = 0; i < 40; i++) { float h = map(ro + rd * t); r = min(r, k * h / t); t += clamp(h, .02, .3); if (r < .001 || t > 12.) break; } return clamp(r, 0., 1.); }
float calcAO(vec3 p, vec3 n){ float o = 0., s = 1.; for (int i = 0; i < 5; i++) { float h = .02 + .1 * float(i); o += (h - map(p + n * h)) * s; s *= .7; } return clamp(1. - 2.5 * o, 0., 1.); }
void main(){
  vec4 v = uInvProj * vec4(vNdc, 1., 1.); vec3 rd = normalize((uCamWorld * vec4(normalize(v.xyz / v.w), 0.)).xyz), ro = uCamPos;
  float t = 0., hit = 0.; int I = int(uSteps);
  for (int i = 0; i < 512; i++) { if (i >= I) break; float d = map(ro + rd * t); if (d < uEps * max(1., t)) { hit = 1.; break; } t += d * .9; if (t > uMaxD) break; }
  vec3 col; float depth = 1.;
  if (hit > .5) { vec3 p = ro + rd * t, n = calcNormal(p); col = shade(p, n, rd, t); vec4 c = uProj * uView * vec4(p, 1.); depth = clamp(c.z / c.w * .5 + .5, 0., 1.); }
  else col = bg(rd);
  gl_FragColor = vec4(col * uExposure, 1.);
  gl_FragDepth = uDepth > .5 ? depth : 1.;
}`;
const RAW = `
void main(){ vec4 v = uInvProj * vec4(vNdc, 1., 1.); vec3 rd = normalize((uCamWorld * vec4(normalize(v.xyz / v.w), 0.)).xyz); vec4 c = image(vNdc * .5 + .5, uCamPos, rd); gl_FragColor = vec4(c.rgb * uExposure, c.a); gl_FragDepth = 1.; }`;
const DEF_SHADE = `vec3 shade(vec3 p, vec3 n, vec3 rd, float t){ vec3 L = normalize(vec3(-.5, .8, .4)); float dif = clamp(dot(n, L), 0., 1.) * softShadow(p + n * .01, L, 12.), ao = calcAO(p, n);
  vec3 base = vec3(.8); vec3 c = base * (dif * 1.6 + .25 * ao) + bg(reflect(rd, n)) * .25 * pow(1. - max(dot(-rd, n), 0.), 3.); return mix(c, bg(rd), 1. - exp(-.002 * t * t)); }`;
const DEF_BG = `vec3 bg(vec3 rd){ return mix(vec3(.02, .025, .04), vec3(.12, .16, .24), clamp(rd.y * .5 + .5, 0., 1.)); }`;

export const PLATE_PRESETS = {
  // chrome metaballs (smooth-union spheres on Lissajous paths), studio gradient + hot strip reflections
  metaballs: { uniforms: { uBlobs: 7, uK: .55, uTint: [1, .82, .62] }, steps: 110,
    sdf: `uniform float uBlobs, uK; uniform vec3 uTint;
float map(vec3 p){ float d = 1e9; for (int i = 0; i < 9; i++) { if (float(i) >= uBlobs) break; float fi = float(i);
  vec3 c = vec3(sin(uTime * (.41 + fi * .07) + fi * 1.7) * 1.25, sin(uTime * (.53 + fi * .05) + fi * 2.9) * .75, cos(uTime * (.37 + fi * .06) + fi * .8) * .9);
  d = opSU(d, sdSphere(p - c, .42 + .14 * sin(fi * 3.1)), uK); } return d; }`,
    background: `vec3 env(vec3 rd){ vec3 c = mix(vec3(.05, .055, .065), vec3(.35, .38, .45), smoothstep(-.3, .8, rd.y)); c += vec3(7.) * smoothstep(.985, .995, 1. - abs(rd.x - .35 * rd.y)) * smoothstep(-.1, .3, rd.y); c += uTint * 3. * pow(max(dot(rd, normalize(vec3(.6, .5, -.6))), 0.), 30.); c += vec3(.6, .7, 1.) * 1.5 * smoothstep(.97, .99, 1. - abs(rd.x + .5 + .2 * rd.y)) * smoothstep(-.2, .4, rd.y); return c; }
vec3 bg(vec3 rd){ vec3 c = mix(vec3(.012, .013, .018), vec3(.05, .055, .07), smoothstep(-.4, .7, rd.y)); return c + uTint * .08 * pow(max(dot(rd, normalize(vec3(.3, .4, -1.))), 0.), 6.); }`,
    shade: `vec3 shade(vec3 p, vec3 n, vec3 rd, float t){ vec3 r = reflect(rd, n); float fr = .45 + .55 * pow(1. - max(dot(-rd, n), 0.), 3.); vec3 L = normalize(vec3(.6, .8, .4)); float sp = pow(max(dot(r, L), 0.), 60.) * 4.; return (env(r) * mix(vec3(.9), uTint, .35) * fr + sp + uTint * .05 * max(dot(n, L), 0.)) * calcAO(p, n); }` },
  // flight through a lit tunnel of repeated rings (pair with a fly / dolly rig along -z)
  tunnel: { uniforms: { uGap: 2., uHue: .58 }, steps: 120, maxDist: 80,
    sdf: `uniform float uGap, uHue;
float map(vec3 p){ vec3 q = p; q.z = mod(q.z + uGap * .5, uGap) - uGap * .5; float tube = -(length(p.xy) - 2.2); float ring = sdTorus(vec3(q.x, q.z, q.y), vec2(2.05, .08)); vec3 b = q; b.xy *= rot2(floor((p.z + uGap * .5) / uGap) * .4); float rib = sdBox(b - vec3(0., 1.95, 0.), vec3(.6, .12, .1)); return min(min(tube, ring), rib); }`,
    background: `vec3 bg(vec3 rd){ return vec3(0.); }`,
    shade: `vec3 shade(vec3 p, vec3 n, vec3 rd, float t){ float k = floor((p.z + uGap * .5) / uGap); vec3 h = pal(uHue + k * .03, vec3(.5), vec3(.5), vec3(1.), vec3(0., .33, .67));
  float ring = smoothstep(.12, .0, abs(mod(p.z + uGap * .5, uGap) - uGap * .5) - .05) * step(2., length(p.xy)); float pulse = .5 + .5 * sin(k * 1.7 - uTime * 4.);
  vec3 c = vec3(.04, .045, .06) * (.4 + .6 * calcAO(p, n)) + h * ring * (2. + 6. * pulse); return c * exp(-.03 * t); }` },
  // emissive fbm nebula (raw image mode; volumetric-ish accumulation along the view ray)
  nebula: { uniforms: { uA: [.9, .35, .55], uB: [.25, .45, 1.] },
    glsl: `uniform vec3 uA, uB;
vec4 image(vec2 uv, vec3 ro, vec3 rd){ vec3 acc = vec3(0.); float T = 1.; for (int i = 0; i < 48; i++) { vec3 p = ro + rd * (2. + float(i) * .18); float d = fbm3(p * .45 + vec3(0., 0., uTime * .05)); d = smoothstep(.45, .85, d);
  vec3 c = mix(uB, uA, fbm3(p * .2 + 4.)); acc += T * c * d * .09; T *= 1. - d * .06; } float st = pow(hash3(floor(rd * 400.)), 60.) * 3.; return vec4(acc * 1.8 + st * T, 1.); }` },
  // concentric glowing rings (raw), good as a logo backdrop
  rings: { uniforms: { uCol: [1., .55, .25] },
    glsl: `uniform vec3 uCol;
vec4 image(vec2 uv, vec3 ro, vec3 rd){ vec2 p = (uv - .5) * vec2(uRes.x / uRes.y, 1.); float r = length(p), a = atan(p.y, p.x); float w = 0.;
  for (int i = 0; i < 6; i++) { float fi = float(i), rr = .12 + fi * .07 + .01 * sin(uTime * (1. + fi * .3) + a * (2. + fi)); w += .0025 / abs(r - rr) * (.6 + .4 * sin(a * 3. + uTime * (1.5 - fi * .2) + fi)); }
  return vec4(uCol * w + uCol * .02 / (r + .05), 1.); }` },
};
export const PLATE_NAMES = Object.keys(PLATE_PRESETS);

// assemble the fragment shader of a plate spec (pure — unit tested)
export function plateSource(o = {}) {
  const P = o.preset ? (PLATE_PRESETS[o.preset] || unknownName('plates', o.preset, PLATE_NAMES, { fatal: true })) : {};
  const s = { ...P, ...o, uniforms: { ...(P.uniforms || {}), ...(o.uniforms || {}) } };
  const decl = Object.entries(s.uniforms).filter(([k]) => !new RegExp('uniform\\s+\\w+\\s+[^;]*\\b' + k + '\\b').test((s.sdf || '') + (s.glsl || '') + (s.shade || '') + (s.background || ''))).map(([k, v]) => { const x = typeof v === 'function' ? v(0) : v; return `uniform ${Array.isArray(x) ? 'vec' + x.length : 'float'} ${k};`; }).join('\n');
  if (s.glsl) return { fs: HEAD + GLSL_LIB + decl + '\n' + s.glsl + RAW, spec: s, raw: true };
  if (!s.sdf) throw new Error('[vk.three.shaderPlate] give sdf (float map(vec3 p)), glsl (vec4 image(uv, ro, rd)) or a preset (' + PLATE_NAMES.join(', ') + ')');
  return { fs: HEAD + GLSL_LIB + decl + '\n' + s.sdf + '\n' + (s.background || DEF_BG) + '\n' + MARCH.split('void main(){')[0] + '\n' + (s.shade || DEF_SHADE) + '\nvoid main(){' + MARCH.split('void main(){')[1], spec: s, raw: false };
}

export function makePlate(THREE) {
  return function shaderPlate(o = {}) {
    const mod = { o };
    mod.setup = ctx => {
      const { fs, spec } = plateSource(o), U = {
        uTime: { value: 0 }, uSteps: { value: spec.steps || 96 }, uMaxD: { value: spec.maxDist || 40 }, uEps: { value: spec.eps || .0015 }, uDepth: { value: o.depth ? 1 : 0 }, uExposure: { value: 1 },
        uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() }, uView: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uRes: { value: new THREE.Vector2(ctx.iw, ctx.ih) },
      };
      for (const [k, v] of Object.entries(spec.uniforms)) { const x = typeof v === 'function' ? v(0) : v; U[k] = { value: Array.isArray(x) ? new (x.length === 2 ? THREE.Vector2 : x.length === 3 ? THREE.Vector3 : THREE.Vector4)(...x) : x }; }
      const mat = mod.material = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: U, depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth, transparent: false });
      const m = mod.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); m.frustumCulled = false; m.renderOrder = -1000;
      m.onBeforeRender = (r, s, cam) => { U.uInvProj.value.copy(cam.projectionMatrixInverse); U.uCamWorld.value.copy(cam.matrixWorld); U.uProj.value.copy(cam.projectionMatrix); U.uView.value.copy(cam.matrixWorldInverse); U.uCamPos.value.setFromMatrixPosition(cam.matrixWorld); mat.uniformsNeedUpdate = true; };
      ctx.scene.add(m); mod.spec = spec;
    };
    mod.update = t => {
      const U = mod.material.uniforms; U.uTime.value = (o.speed != null ? o.speed : 1) * t + (o.offset || 0); U.uExposure.value = typeof o.exposure === 'function' ? o.exposure(t) : (o.exposure != null ? o.exposure : 1);
      for (const [k, v] of Object.entries(mod.spec.uniforms)) if (typeof v === 'function') { const x = v(t); if (Array.isArray(x)) U[k].value.set(...x); else U[k].value = x; }
    };
    return mod;
  };
}
