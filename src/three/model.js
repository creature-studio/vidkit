// vk.three.model(url, opts) — a glTF/GLB as a ready scene module: load (Draco / meshopt OK), normalise to `size`
// (height in world units), centre on the origin with feet on y = 0, optional time-driven animation via mixer
// timelines (pure in t), shadows, auto lights when the scene has none, optional ground disc and spin.
//   vk.three.model('assets/models/robot.glb', { size: 2, timeline: [{ t: 0, clip: 'Idle' }, { t: 2, clip: 'Walking', fade: .4 }] })
// mod.gltf, mod.root, mod.clips (names), mod.anim (mixer.at) are available after setup.
import { clone as skeletonClone } from '../../vendor/three/examples/jsm/utils/SkeletonUtils.js';
export function makeModel(THREE, mixer, unknownName) {
  return function model(url, o = {}) {
    if (url && typeof url === 'object' && !url.isObject3D) { o = url; url = o.url; }
    const mod = { o, kind: 'model' };
    mod.setup = async ctx => {
      const g = mod.gltf = await ctx.load.gltf(url);
      const obj = skeletonClone(g.scene), root = mod.root = new THREE.Group(), inner = new THREE.Group();
      inner.add(obj); root.add(inner); ctx.scene.add(root);
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const k = o.size ? o.size / Math.max(1e-6, o.fit === 'max' ? Math.max(sz.x, sz.y, sz.z) : sz.y) : (o.scale || 1);
      inner.scale.setScalar(k); inner.position.set(-c.x * k, o.center ? -c.y * k : -box.min.y * k, -c.z * k);
      mod.height = sz.y * k; mod.box = box;
      obj.traverse(m => { if (m.isMesh) { m.castShadow = o.shadows !== false; m.receiveShadow = o.shadows !== false; m.frustumCulled = false; if (o.envIntensity != null && m.material) m.material.envMapIntensity = o.envIntensity; } });
      if (o.rotation) root.rotation.set(...o.rotation.map(d => d * Math.PI / 180));
      if (o.position) root.position.set(...o.position);
      const clips = g.animations || []; mod.clips = clips.map(c => c.name);
      if (clips.length && (o.timeline || o.weights || o.clip)) {
        const tl = o.timeline || (o.clip ? [{ t: 0, clip: o.clip, speed: o.speed || 1 }] : undefined);
        mod.anim = mixer(obj, clips, { timeline: tl, weights: o.weights }).at;
      }
      if (o.ground) {
        const gr = o.ground === true ? {} : o.ground, R = gr.radius || Math.max(sz.x, sz.z) * k * 2.5 + 1;
        const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 64), gr.shadowOnly ? new THREE.ShadowMaterial({ opacity: gr.opacity != null ? gr.opacity : .3 }) : new THREE.MeshStandardMaterial({ color: new THREE.Color(gr.color || '#d9d4cc'), roughness: .9 }));
        disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true; root.add(disc); mod.ground = disc;
      }
    };
    mod.update = (t, info) => {
      if (mod.needLights === undefined) {
        let lit = !!info.scene && !!info.scene.environment; if (info.scene) info.scene.traverse(x => { if (x.isLight) lit = true; });
        mod.needLights = !lit && o.lights !== false;
        if (mod.needLights) {
          const h = new THREE.HemisphereLight(0xffffff, 0x5a5048, 1.3), d = new THREE.DirectionalLight(0xfff2e0, 2.6), H = mod.height || 2;
          d.position.set(-H * 1.5, H * 3, H * 2); d.castShadow = o.shadows !== false; d.shadow.mapSize.set(2048, 2048); const e = H * 2; Object.assign(d.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: .1, far: H * 10 }); d.shadow.bias = -.0005; d.shadow.normalBias = .02;
          const rr = info.renderer || (info.layer && info.layer.renderer); if (rr && o.shadows !== false) rr.shadowMap.enabled = true;
          mod.root.add(h, d, d.target);
        }
      }
      if (mod.anim) mod.anim(t);
      if (o.spin) mod.root.rotation.y = (o.rotation ? o.rotation[1] * Math.PI / 180 : 0) + t * o.spin * Math.PI / 180;
      if (o.animate) o.animate(t, mod, info);
    };
    return mod;
  };
}
