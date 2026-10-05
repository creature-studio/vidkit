// Product turntable: studio environment (PMREM), seamless cyclorama backdrop, glossy floor with a mirrored product
// reflection and a blurred contact shadow, strip-light sweep highlights, optional depth of field. Works with a
// procedural product ('earbuds' | 'earbud' | 'phone' | 'bottle') or a GLB (o.model: url | loaded gltf).
//   sc.three(vk.three.turntable({ product: 'earbuds', spin: 18, sweeps: [{t: 1, d: 1.4}], floor: 'reflect' }),
//            { camera: vk.three.rig.orbit({...}), post: { dof: true } })
// Pure function of t: spin / float / lid / sweep are evaluated from the layer time; the contact shadow is re-rendered
// once per output frame (from the frame's first sample) and only depends on that time.
import { getEase } from '../core/ease.js';
const D2R = Math.PI / 180;
const BLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec4 s = texture2D(tSrc, vUv) * .2270270; for (int i = 1; i < 5; i++) { float fi = float(i); float w = i == 1 ? .1945946 : i == 2 ? .1216216 : i == 3 ? .0540540 : .0162162; s += (texture2D(tSrc, vUv + uDir * fi) + texture2D(tSrc, vUv - uDir * fi)) * w; } gl_FragColor = s; }`;
const QV = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

export function makeTurntable(THREE, MAT, PRODUCTS, makeSweep) {
  const col = c => new THREE.Color(c);
  function backdrop(o) {
    const u = { uTop: { value: col(o.top != null ? o.top : 0x07080b) }, uHorizon: { value: col(o.horizon != null ? o.horizon : 0x1c2028) }, uGlow: { value: col(o.glow != null ? o.glow : 0x34415e) }, uGlowPow: { value: o.glowSize || 3.5 }, uGlowDir: { value: new THREE.Vector3(...(o.glowDir || [0, .18, -1])).normalize() } };
    const m = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `varying vec3 vDir; uniform vec3 uTop, uHorizon, uGlow, uGlowDir; uniform float uGlowPow;
        void main(){ vec3 d = normalize(vDir); vec3 c = mix(uHorizon, uTop, smoothstep(-.02, .55, d.y)); c += uGlow * pow(max(dot(d, uGlowDir), 0.), uGlowPow) * smoothstep(-.03, .3, d.y); gl_FragColor = vec4(c, 1.); }` });
    const s = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), m); s.renderOrder = -10; s.frustumCulled = false; s.userData.uniforms = u; return s;
  }
  function floorMesh(o, hz) {
    const u = { uColor: { value: col(o.color != null ? o.color : 0x15171c) }, uFar: { value: hz }, uRefl: { value: o.reflect != null ? o.reflect : .09 }, uR0: { value: o.r0 != null ? o.r0 : .5 }, uR1: { value: o.r1 || 3.5 }, uPool: { value: o.pool != null ? o.pool : .6 } };
    const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: true,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `varying vec3 vW; uniform vec3 uColor, uFar; uniform float uRefl, uR0, uR1, uPool;
        void main(){ float r = length(vW.xz), k = smoothstep(uR0, uR1, r); vec3 c = mix(uColor * (1. + uPool * exp(-r * r / 1.6)), uFar, k); gl_FragColor = vec4(c, mix(1. - uRefl, 1., sqrt(k))); }` });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), m); f.rotation.x = -Math.PI / 2; f.renderOrder = 1; f.userData.uniforms = u; return f;
  }
  function contactShadow(renderer, o) {
    const res = o.res || 512, size = o.size || 3.2, A = new THREE.WebGLRenderTarget(res, res), B = new THREE.WebGLRenderTarget(res, res);
    const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, o.height || 1.4); cam.rotation.x = Math.PI / 2; cam.layers.set(2);
    const dm = new THREE.MeshDepthMaterial(); const dark = { value: o.darkness || 1.6 };
    dm.onBeforeCompile = sh => { sh.uniforms.darkness = dark; sh.fragmentShader = 'uniform float darkness;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'); };
    dm.depthTest = false; dm.depthWrite = false;
    const bm = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: QV, fragmentShader: BLUR, depthTest: false, depthWrite: false });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bm), qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); q.frustumCulled = false; qs.add(q);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: A.texture, transparent: true, opacity: o.opacity != null ? o.opacity : .85, depthWrite: false, side: THREE.DoubleSide }));
    plane.rotation.x = -Math.PI / 2; plane.scale.y = -1; plane.position.y = .003; plane.renderOrder = 2;
    const blur = (src, dst, dx, dy) => { bm.uniforms.tSrc.value = src.texture; bm.uniforms.uDir.value.set(dx / res, dy / res); renderer.setRenderTarget(dst); renderer.render(qs, qc); };
    return {
      plane, cam,
      render(scene) {
        const prev = renderer.getRenderTarget(), bg = scene.background; scene.background = null; scene.overrideMaterial = dm;
        renderer.setRenderTarget(A); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, false); renderer.render(scene, cam);
        scene.overrideMaterial = null; scene.background = bg;
        const b = o.blur || 2.4; blur(A, B, b, 0); blur(B, A, 0, b); blur(A, B, b * .45, 0); blur(B, A, 0, b * .45);
        renderer.setRenderTarget(prev);
      },
    };
  }
  // keep a mirrored copy's transforms in step with the live product (same node order in both trees)
  const nodes = root => { const a = []; root.traverse(x => a.push(x)); return a; };
  function spinAt(o, t) {
    const s = o.spin != null ? o.spin : 16;
    if (typeof s === 'function') return s(t);
    if (typeof s === 'number') return (o.angle || 0) + s * t;
    const p = Math.min(1, Math.max(0, (t - (s.t || 0)) / (s.dur || 1))); return s.from + (s.to - s.from) * getEase(s.ease || 'inOutCubic')(p);
  }
  return function turntable(o = {}) {
    const mod = { o, focus: 4 };
    mod.setup = async ctx => {
      const { scene, load, renderer, layer, camera } = ctx;
      const env = await load.env(o.env || 'studio', o.envOptions || {});
      scene.environment = env; scene.environmentIntensity = o.envIntensity != null ? o.envIntensity : 1;
      if (o.envRotation) scene.environmentRotation.set(0, o.envRotation * D2R, 0);
      const stage = mod.stage = new THREE.Group(); scene.add(stage);
      const bd = o.backdrop === false ? null : backdrop(o.backdrop || {}); if (bd) stage.add(bd); mod.backdrop = bd;
      // product
      let prod;
      if (o.model) {
        const g = typeof o.model === 'string' ? await load.gltf(o.model) : o.model; prod = g.scene || g; mod.gltf = g;
        const box = new THREE.Box3().setFromObject(prod), sz = box.getSize(new THREE.Vector3()), k = (o.height || 1.2) / Math.max(1e-6, sz.y);
        prod.scale.multiplyScalar(k); const b2 = new THREE.Box3().setFromObject(prod), c = b2.getCenter(new THREE.Vector3()); prod.position.sub(new THREE.Vector3(c.x, b2.min.y, c.z));
        if (g.animations && g.animations.length) { mod.mixer = new THREE.AnimationMixer(prod); g.animations.forEach(a => mod.mixer.clipAction(a).play()); }
      } else prod = (PRODUCTS[o.product || 'earbuds'] || PRODUCTS.earbuds)(o.productOptions || {});
      if (o.material) { const mk = typeof o.material === 'string' ? MAT[o.material] : null; const m = mk ? mk(o.materialOptions || {}) : o.material; prod.traverse(x => { if (x.isMesh && !/screen|led|lens/.test(x.name)) x.material = m; }); }
      const pivot = mod.pivot = new THREE.Group(); pivot.add(prod); stage.add(pivot); mod.product = prod;
      const S = mod.sweep = makeSweep(THREE); S.applyAll(prod);
      prod.traverse(x => { x.layers.enable(2); });
      // floor, reflection, contact shadow
      const fo = o.floor === false ? null : typeof o.floor === 'object' ? o.floor : { mode: o.floor || 'both' };
      if (fo) {
        const hz = bd ? bd.userData.uniforms.uHorizon.value : col(fo.far != null ? fo.far : 0x1a1d24);
        const fl = floorMesh(fo, hz); stage.add(fl); mod.floor = fl;
        if (fo.mode !== 'shadow') { const R = mod.refl = new THREE.Group(); R.scale.y = -1; const rp = mod.reflPivot = pivot.clone(true); R.add(rp); stage.add(R); rp.traverse(x => { x.layers.disable(2); x.renderOrder = -1; }); mod.pairs = [nodes(pivot), nodes(rp)]; }
        else fl.userData.uniforms.uRefl.value = 0;
        if (fo.mode !== 'reflect') { const cs = mod.shadow = contactShadow(renderer, { ...(o.shadow || {}) }); stage.add(cs.plane); }
      }
      if (o.key !== false) { const L = new THREE.DirectionalLight(0xffffff, o.key != null ? o.key : 1.1); L.position.set(-2.5, 4, 3); stage.add(L); }
      const box = new THREE.Box3().setFromObject(pivot), h = box.max.y; mod.height = h; mod.center = new THREE.Vector3(0, h * .48, 0);
      if (!layer.rig && !o.keepCamera) { camera.position.set(0, h * .72, h * 3.1 + 1); camera.lookAt(mod.center); }
      const P = layer.o.post; if (P && P.dof) { if (P.dof === true) P.dof = {}; if (P.dof.focus == null) P.dof.focus = () => mod.focus; }
    };
    mod.update = (t, info) => {
      const ang = spinAt(o, t), pv = mod.pivot;
      pv.rotation.set((o.tilt || 0) * D2R, ang * D2R, 0);
      pv.position.y = o.float ? o.float * (.5 + .5 * Math.sin(t * (o.floatSpeed || 1.2) * Math.PI)) : 0;
      if (o.lid && mod.product.userData.parts && mod.product.userData.parts.lidPivot) mod.product.userData.parts.lidPivot.rotation.x = -o.lid(t) * D2R;
      if (o.animate) o.animate(t, mod, info);
      if (mod.mixer) mod.mixer.setTime(o.clipTime ? o.clipTime(t) : t);
      let sw = o.sweeps || [];
      if (o.sweep) { const e = o.sweep.every || 4, k = Math.floor((t - (o.sweep.t || 0)) / e); sw = sw.concat([k - 1, k].filter(i => i >= 0).map(i => ({ ...o.sweep, t: (o.sweep.t || 0) + i * e }))); }
      mod.sweep.at(sw, t, getEase('inOutSine'));
      pv.updateMatrixWorld(true);
      if (mod.pairs) { const [A, B] = mod.pairs; for (let i = 0; i < A.length; i++) { B[i].position.copy(A[i].position); B[i].quaternion.copy(A[i].quaternion); B[i].scale.copy(A[i].scale); B[i].visible = A[i].visible; } }
      if (mod.shadow && (info.sub === 0 || info.sub == null)) mod.shadow.render(info.scene || mod.stage.parent);
      if (info.camera) mod.focus = info.camera.position.distanceTo(mod.center);
    };
    return mod;
  };
}
