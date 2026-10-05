// vk.three post stack (one instance per three layer). Linear HDR (HalfFloat) all the way:
//   N sub-frames (motion-blur times × jittered AA) → additive accumulation (Σ w·frame, w = 1/N)
//   → optional depth-of-field gather → ONE bloom (Karis-averaged 13-tap downsample chain + tent upsample, Jimenez 2014)
//   → composite at output resolution: chromatic aberration, exposure, ACES (three's fit), white balance, lift/gamma/gain,
//     contrast, saturation, split-tone, vignette, grain + dither, sRGB encode, premultiplied alpha for the layer stack.
// Accumulating before the bloom means bright streaks bloom once (no N× bloom cost, no stepped "ghost" halos).
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const ACC = `uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv) * uW; }`;
const DOWN = `uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uPre, uThreshold, uKnee, uClampMax; varying vec2 vUv;
float lum(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
vec3 pre(vec3 c){ c = min(c, vec3(uClampMax)); float br = max(c.r, max(c.g, c.b)); float rq = clamp(br - uThreshold + uKnee, 0., 2. * uKnee); rq = rq * rq / (4. * uKnee + 1e-5); return c * max(rq, br - uThreshold) / max(br, 1e-5); }
vec3 S(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main(){
  vec3 a = S(vec2(-2., 2.)), b = S(vec2(0., 2.)), c = S(vec2(2., 2.)), d = S(vec2(-2., 0.)), e = S(vec2(0.)), f = S(vec2(2., 0.)),
       g = S(vec2(-2., -2.)), h = S(vec2(0., -2.)), i = S(vec2(2., -2.)), j = S(vec2(-1., 1.)), k = S(vec2(1., 1.)), l = S(vec2(-1., -1.)), m = S(vec2(1., -1.));
  vec3 o;
  if (uPre > .5) {   // first level: threshold + Karis average per 2×2 group (kills firefly flicker)
    vec3 g0 = pre((j + k + l + m) * .25), g1 = pre((a + b + d + e) * .25), g2 = pre((b + c + e + f) * .25), g3 = pre((d + e + g + h) * .25), g4 = pre((e + f + h + i) * .25);
    float w0 = .5 / (1. + lum(g0)), w1 = .125 / (1. + lum(g1)), w2 = .125 / (1. + lum(g2)), w3 = .125 / (1. + lum(g3)), w4 = .125 / (1. + lum(g4));
    o = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else o = e * .125 + (a + c + g + i) * .03125 + (b + d + f + h) * .0625 + (j + k + l + m) * .125;
  gl_FragColor = vec4(o, 1.);
}`;
const UP = `uniform sampler2D tLow, tHigh; uniform vec2 uTexel; uniform float uRadius; varying vec2 vUv;
vec3 S(vec2 o){ return texture2D(tLow, vUv + o * uTexel * uRadius).rgb; }
void main(){
  vec3 s = S(vec2(0.)) * 4. + (S(vec2(-1., 0.)) + S(vec2(1., 0.)) + S(vec2(0., -1.)) + S(vec2(0., 1.))) * 2. + S(vec2(-1., -1.)) + S(vec2(1., -1.)) + S(vec2(-1., 1.)) + S(vec2(1., 1.));
  gl_FragColor = vec4(texture2D(tHigh, vUv).rgb + s / 16., 1.);
}`;
// depth of field: gather with golden-angle taps; a tap contributes when its own circle of confusion covers the distance
const DOF = `uniform sampler2D tSrc, tDepth; uniform vec2 uTexel; uniform float uNear, uFar, uFocus, uAperture, uMaxBlur, uPersp; varying vec2 vUv;
float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; if (uPersp > .5) { float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); } return uNear + d * (uFar - uNear); }
float coc(vec2 uv){ float z = viewZ(uv); return clamp(uAperture * abs(z - uFocus) / max(z, 1e-3), 0., uMaxBlur); }
void main(){
  float c0 = coc(vUv); vec4 acc = texture2D(tSrc, vUv); float wsum = 1.;
  if (c0 > .5) {
    for (int i = 0; i < 28; i++) {
      float fi = float(i) + .5, r = sqrt(fi / 28.) * c0, a = fi * 2.39996323;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
      float cs = coc(uv), w = smoothstep(r - 1.5, r + .5, max(cs, c0 * .35));
      acc += texture2D(tSrc, uv) * w; wsum += w;
    }
  }
  gl_FragColor = acc / wsum;
}`;
const COMP = `uniform sampler2D tColor, tBloom; uniform float uBloomOn, uBloom, uExposure, uTone, uCA, uVig, uVigRound, uGrain, uSeed, uSplit, uContrast, uSat, uFade, uAlphaBloom;
uniform vec3 uWB, uLift, uGamma, uGain, uSh, uHi, uFadeColor; uniform vec2 uRes; varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 rrt(vec3 v){ vec3 a = v * (v + .0245786) - .000090537; vec3 b = v * (.983729 * v + .4329510) + .238081; return a / b; }
vec3 aces(vec3 c){ const mat3 I = mat3(.59719, .07600, .02840, .35458, .90834, .13383, .04823, .01566, .83777); const mat3 O = mat3(1.60475, -.10208, -.00327, -.53108, 1.10813, -.07276, -.07367, -.00605, 1.07602);
  c = I * (c / .6); c = rrt(c); return clamp(O * c, 0., 1.); }
float lum(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
vec3 look(vec3 hdr){
  vec3 x = uTone > .5 ? aces(hdr * uExposure) : clamp(hdr * uExposure, 0., 1.);
  x *= uWB;
  x = pow(max(uGain * (x + uLift * (1. - x)), 0.), 1. / uGamma);
  x = (x - .5) * uContrast + .5;
  float l = lum(x); x = l + (x - l) * uSat;
  if (uSplit > 0.) { float s = (1. - l) * (1. - l), h = l * l; x += uSplit * (uSh * s + uHi * h); }
  x = clamp(x, 0., 1.);
  vec2 d = (vUv - .5) * vec2(mix(1., uRes.x / uRes.y, uVigRound), 1.);
  x *= 1. - uVig * smoothstep(.2, .95, length(d) * 1.25);
  x = mix(x, uFadeColor, uFade);
  return x;
}
void main(){
  vec2 uv = vUv; vec4 c;
  if (uCA > 0.) { vec2 o = (uv - .5) * uCA; vec4 g = texture2D(tColor, uv); c = vec4(texture2D(tColor, uv - o).r, g.g, texture2D(tColor, uv + o).b, g.a); }
  else c = texture2D(tColor, uv);
  vec3 b = uBloomOn > .5 ? texture2D(tBloom, uv).rgb * uBloom : vec3(0.);
  float a = clamp(c.a, 0., 1.);
  vec3 col;
  if (a > .999) col = look(c.rgb + b);
  else {   // transparent layer: unpremultiply, grade the surface, add the glow as light over whatever is underneath
    vec3 surf = a > 1e-4 ? look(c.rgb / a + b) : vec3(0.);
    vec3 glow = look(b) - look(vec3(0.));
    float ga = clamp(max(glow.r, max(glow.g, glow.b)) * uAlphaBloom, 0., 1.);
    col = surf * a + glow * (1. - a); a = a + ga * (1. - a);
    col = a > 1e-4 ? col / a : vec3(0.);
  }
  col = srgb(col);
  float n = h12(gl_FragCoord.xy + uSeed * 17.23) + h12(gl_FragCoord.yx * 1.31 + uSeed * 5.1) - 1.;   // triangular noise
  col += n * (uGrain + 1. / 255.) * (0.6 + 0.4 * (1. - lum(col)));
  gl_FragColor = vec4(clamp(col, 0., 1.) * a, a);
}`;

export class Post {
  constructor(THREE, renderer, o = {}) {
    this.T = THREE; this.r = renderer; this.o = o;
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(quadGeo, null); this.quad.frustumCulled = false;
    this.qscene = new THREE.Scene(); this.qscene.add(this.quad);
    const mat = (fs, u, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false, ...extra });
    this.acc = mat(ACC, { tSrc: { value: null }, uW: { value: 1 } }, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
    this.copy = mat(ACC, { tSrc: { value: null }, uW: { value: 1 } }, { blending: THREE.NoBlending });
    this.down = mat(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uPre: { value: 0 }, uThreshold: { value: 1 }, uKnee: { value: .5 }, uClampMax: { value: 64 } }, { blending: THREE.NoBlending });
    this.up = mat(UP, { tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } }, { blending: THREE.NoBlending });
    this.dof = mat(DOF, { tSrc: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2() }, uNear: { value: .1 }, uFar: { value: 100 }, uFocus: { value: 5 }, uAperture: { value: 8 }, uMaxBlur: { value: 12 }, uPersp: { value: 1 } }, { blending: THREE.NoBlending });
    const v3 = x => ({ value: new THREE.Vector3(...x) });
    this.comp = mat(COMP, { tColor: { value: null }, tBloom: { value: null }, uBloomOn: { value: 1 }, uBloom: { value: .5 }, uExposure: { value: 1 }, uTone: { value: 1 }, uCA: { value: 0 }, uVig: { value: 0 }, uVigRound: { value: 1 },
      uGrain: { value: 0 }, uSeed: { value: 0 }, uSplit: { value: 0 }, uContrast: { value: 1 }, uSat: { value: 1 }, uFade: { value: 0 }, uAlphaBloom: { value: 1.6 }, uWB: v3([1, 1, 1]), uLift: v3([0, 0, 0]), uGamma: v3([1, 1, 1]), uGain: v3([1, 1, 1]), uSh: v3([0, 0, 0]), uHi: v3([0, 0, 0]), uFadeColor: v3([0, 0, 0]), uRes: { value: new THREE.Vector2(1, 1) } }, { blending: THREE.NoBlending, transparent: false });
    this.rts = null;
  }
  rt(w, h, depth) {
    const T = this.T, o = { type: T.HalfFloatType, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: !!depth, stencilBuffer: false, generateMipmaps: false, colorSpace: T.NoColorSpace };
    if (depth === 'tex') { o.depthTexture = new T.DepthTexture(w, h); o.depthTexture.type = T.UnsignedIntType; }
    const r = new T.WebGLRenderTarget(w, h, o); return r;
  }
  // allocate targets for an internal size iw×ih (scene, accumulation, dof, bloom chain)
  // depthTex: keep the scene depth as a texture (DOF, and looks with outline / edges / mist)
  size(iw, ih, dof, depthTex) {
    if (this.rts && this.rts.iw === iw && this.rts.ih === ih && this.rts.dof === !!dof && this.rts.depthTex === !!depthTex) return;
    if (this.rts) this.dispose();
    const R = this.rts = { iw, ih, dof: !!dof, depthTex: !!depthTex, scene: this.rt(iw, ih, dof || depthTex ? 'tex' : true), acc: this.rt(iw, ih), dofRT: dof ? this.rt(iw, ih) : null, down: [], up: [] };
    let w = Math.max(1, iw >> 1), h = Math.max(1, ih >> 1);
    for (let i = 0; i < (this.o.levels || 6) && Math.min(w, h) >= 4; i++) { R.down.push(this.rt(w, h)); R.up.push(this.rt(w, h)); w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); }
  }
  dispose() { const R = this.rts; if (!R) return; [R.scene, R.acc, R.dofRT, R.normal, ...R.down, ...R.up].forEach(t => t && t.dispose()); this.rts = null; }
  // view-space normals of the scene (looks that ask for normals: true), rendered once per output frame
  normals(scene, cam) {
    const T = this.T, R = this.rts;
    if (!R.normal) R.normal = new T.WebGLRenderTarget(R.iw, R.ih, { type: T.UnsignedByteType, format: T.RGBAFormat, depthBuffer: true, stencilBuffer: false, generateMipmaps: false, minFilter: T.NearestFilter, magFilter: T.NearestFilter });
    if (!this.nmat) this.nmat = new T.MeshNormalMaterial();
    const bg = scene.background, ov = scene.overrideMaterial; scene.background = null; scene.overrideMaterial = this.nmat;
    this.r.setRenderTarget(R.normal); this.r.setClearColor(0x8080ff, 1); this.r.clear(true, true, false); this.r.render(scene, cam);
    scene.background = bg; scene.overrideMaterial = ov; this.r.setClearColor(0x000000, 0);
    return R.normal.texture;
  }
  pass(material, target) { this.quad.material = material; this.r.setRenderTarget(target); this.r.render(this.qscene, this.cam); }
  // add the scene RT into the accumulator (k = 0: copy)
  accumulate(k, w) {
    const R = this.rts, m = k === 0 ? this.copy : this.acc; m.uniforms.tSrc.value = R.scene.texture; m.uniforms.uW.value = w;
    this.quad.material = m; this.r.setRenderTarget(R.acc); this.r.render(this.qscene, this.cam);
  }
  // HDR source texture → (dof) → bloom → composite into the canvas viewport (0, 0, ow, oh)
  // look (optional): {chain, t, w, h, normal} → the composite goes to the chain's target and the NPR passes draw the canvas
  finish(src, p, ow, oh, cam, look) {
    const R = this.rts, T = this.T; let color = src;
    if (p.dof && R.dofRT) {
      const u = this.dof.uniforms; u.tSrc.value = color; u.tDepth.value = R.scene.depthTexture; u.uTexel.value.set(1 / R.iw, 1 / R.ih);
      u.uNear.value = cam.near; u.uFar.value = cam.far; u.uPersp.value = cam.isPerspectiveCamera ? 1 : 0;
      u.uFocus.value = p.dof.focus; u.uAperture.value = p.dof.aperture * R.ih / 810; u.uMaxBlur.value = p.dof.maxBlur * R.ih / 810;
      this.pass(this.dof, R.dofRT); color = R.dofRT.texture;
    }
    const B = p.bloom, n = R.down.length;
    if (B && n) {
      const lv = Math.min(n, B.levels || n);
      for (let i = 0; i < lv; i++) {
        const s = i ? R.down[i - 1] : null, u = this.down.uniforms;
        u.tSrc.value = i ? s.texture : color; u.uTexel.value.set(1 / (i ? s.width : R.iw), 1 / (i ? s.height : R.ih));
        u.uPre.value = i ? 0 : 1; u.uThreshold.value = B.threshold; u.uKnee.value = Math.max(1e-3, B.knee); u.uClampMax.value = B.clamp;
        this.pass(this.down, R.down[i]);
      }
      let low = R.down[lv - 1];
      for (let i = lv - 2; i >= 0; i--) {
        const u = this.up.uniforms; u.tLow.value = low.texture; u.tHigh.value = R.down[i].texture; u.uTexel.value.set(1 / low.width, 1 / low.height); u.uRadius.value = B.radius;
        this.pass(this.up, R.up[i]); low = R.up[i];
      }
      this.comp.uniforms.tBloom.value = low.texture; this.comp.uniforms.uBloom.value = B.strength / lv; this.comp.uniforms.uBloomOn.value = 1;
    } else { this.comp.uniforms.uBloomOn.value = 0; this.comp.uniforms.tBloom.value = color; }
    const u = this.comp.uniforms, g = p.grade;
    u.tColor.value = color; u.uExposure.value = p.exposure; u.uTone.value = p.tone === 'none' ? 0 : 1; u.uCA.value = p.ca; u.uVig.value = p.vignette; u.uGrain.value = p.grain; u.uSeed.value = p.seed % 997;
    u.uWB.value.set(...g.wb); u.uLift.value.set(...g.lift); u.uGamma.value.set(...g.gamma); u.uGain.value.set(...g.gain); u.uSh.value.set(...g.shadows); u.uHi.value.set(...g.highlights);
    u.uSplit.value = g.split; u.uContrast.value = g.contrast; u.uSat.value = g.saturation; u.uRes.value.set(ow, oh);
    u.uFade.value = p.fade || 0; u.uFadeColor.value.set(...(p.fadeColor || [0, 0, 0])); u.uAlphaBloom.value = p.alphaBloom;
    if (look) {
      const L = look.chain; L.size(look.w, look.h); u.uRes.value.set(look.w, look.h);
      this.quad.material = this.comp; this.r.setRenderTarget(L.rts.a); this.r.render(this.qscene, this.cam);
      L.run(L.rts.a.texture, { t: look.t, seed: p.seed, depth: R.scene.depthTexture || null, dw: R.iw, dh: R.ih, normal: look.normal || null, near: cam.near, far: cam.far, persp: !!cam.isPerspectiveCamera, ow, oh });
      return;
    }
    this.quad.material = this.comp; this.r.setRenderTarget(null); this.r.setViewport(0, 0, ow, oh); this.r.setScissorTest(false);
    this.r.render(this.qscene, this.cam);
  }
}
