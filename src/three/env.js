// Studio lighting environments, prefiltered once with PMREM (deterministic, offline):
//   'studio'  procedural dark product studio: top softbox, tall strip lights, rim strip, front softbox + low bounce card
//   'room'    three's RoomEnvironment (neutral interior)
//   'loft'    bundled Poly Haven "Photo Studio Loft Hall" HDRI (CC0, vendor/hdri/studio_loft_1k.hdr)
//   any .hdr URL (equirectangular) or a loaded equirect texture
import { RoomEnvironment } from '../../vendor/three/examples/jsm/environments/RoomEnvironment.js';

export function studioScene(THREE, o = {}) {
  const s = new THREE.Scene(), k = o.intensity || 1;
  const room = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: new THREE.Color(o.base != null ? o.base : 0x0b0d12) }));
  s.add(room);
  const light = (w, h, x, y, z, I, color, look = [0, 1, 0]) => {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: new THREE.Color(color || 0xffffff).multiplyScalar(I * k) });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.lookAt(look[0], look[1], look[2]); s.add(p); return p;
  };
  light(8, 5, 0, 10, 1, o.top != null ? o.top : 3.2);                       // top softbox
  light(1.2, 9, -6.5, 3, 4, o.strips != null ? o.strips : 9);              // key strip (left, front-ish → edge lines)
  light(1.2, 9, 6.5, 3, -2, (o.strips != null ? o.strips : 9) * .75);      // fill strip (right, behind)
  light(10, .7, 0, 4.5, -9, o.rim != null ? o.rim : 5, o.rimColor);         // rim strip behind (optionally tinted)
  light(9, 4, 0, 2.6, 8.5, o.front != null ? o.front : 2.4);                 // big front softbox (reflects in front faces)
  light(.6, 6, 3.2, 2.5, 7.5, (o.strips != null ? o.strips : 9) * .35);    // thin front-right strip (second edge line)
  // low front bounce card: vertical faces seen from a camera above reflect the space in front of / below the product
  light(12, 4, 0, -1.6, 6.5, o.bounce != null ? o.bounce : 1.0);
  const fl = new THREE.Mesh(new THREE.RingGeometry(7, 14, 48, 1, Math.PI * .1, Math.PI * .8), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: new THREE.Color(o.floor != null ? o.floor : 0x1a1c22) }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = -1.2; s.add(fl);                // dark floor behind / sides only
  if (o.accent) light(.5, 6, -3.5, 2, -7, o.accentI || 6, o.accent);      // coloured kicker
  return s;
}
export function makeEnv(THREE, renderer, spec = 'studio', o = {}, loadHDR) {
  const pm = new THREE.PMREMGenerator(renderer);
  const done = rt => { pm.dispose(); return rt.texture; };
  if (spec && spec.isTexture) { spec.mapping = THREE.EquirectangularReflectionMapping; return Promise.resolve(done(pm.fromEquirectangular(spec))); }
  if (spec === 'room') { const r = new RoomEnvironment(); const t = done(pm.fromScene(r, .04)); return Promise.resolve(t); }
  if (spec === 'studio' || !spec || typeof spec === 'object') { const sc = studioScene(THREE, typeof spec === 'object' ? spec : o); const t = done(pm.fromScene(sc, o.blur != null ? o.blur : .02)); sc.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); return Promise.resolve(t); }
  return loadHDR(spec).then(tex => { const t = done(pm.fromEquirectangular(tex)); return t; });
}
