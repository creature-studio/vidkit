// Procedural hero products (used when no model is given): 'earbuds' (case + two buds), 'earbud', 'phone', 'bottle'.
// Each returns a THREE.Group standing on y = 0, about 1–1.6 units tall, centred on the y axis, with named parts
// (group.userData.parts) so callers can swap materials or animate the lid / buds.
import { RoundedBoxGeometry } from '../../vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function makeProducts(THREE, MAT) {
  const mesh = (g, m, name) => { const x = new THREE.Mesh(g, m); x.name = name || ''; return x; };
  function bud(o = {}) {
    const g = new THREE.Group(), body = o.body || MAT.ceramic({ color: o.color || 0xe6e6e3 }), chrome = o.chrome || MAT.chrome(), dark = MAT.plastic({ color: 0x15161a, roughness: .55 });
    const head = mesh(new THREE.SphereGeometry(.16, 64, 48), body, 'head'); head.scale.set(1, .92, 1.08); head.position.set(0, .5, 0); g.add(head);
    const stem = mesh(new THREE.CapsuleGeometry(.052, .4, 12, 32), body, 'stem'); stem.position.set(0, .26, -.035); stem.rotation.x = .12; g.add(stem);
    const tip = mesh(new THREE.SphereGeometry(.085, 40, 24), MAT.rubber({ color: 0xe8e8e4 }), 'tip'); tip.scale.set(1, 1, .7); tip.position.set(-.15, .52, .02); g.add(tip);
    const grille = mesh(new THREE.CircleGeometry(.05, 40), dark, 'grille'); grille.position.set(.045, .54, .168); grille.rotation.y = .3; g.add(grille);
    const ring = mesh(new THREE.TorusGeometry(.05, .008, 12, 48), chrome, 'ring'); ring.position.copy(grille.position); ring.rotation.y = .3; g.add(ring);
    const cap = mesh(new THREE.CylinderGeometry(.052, .052, .03, 32), chrome, 'cap'); cap.position.set(0, .045, -.008); cap.rotation.x = .12; g.add(cap);
    g.userData.parts = { head, stem, tip, grille, ring, cap }; return g;
  }
  function earbuds(o = {}) {
    const g = new THREE.Group(), body = o.body || MAT.ceramic({ color: o.color || 0xe6e6e3 }), chrome = o.chrome || MAT.chrome();
    // one pebble-shaped shell (front-view stadium, bevelled extrusion) split at the seam into base + hinged lid
    const W = 1.0, H = .8, Dp = .3, r = .3, split = .53, bev = .07;
    const part = (y0, y1, rb, rt) => { const s = new THREE.Shape(), x0 = -W / 2, x1 = W / 2;
      s.moveTo(x0 + rb, y0); s.lineTo(x1 - rb, y0); if (rb) s.quadraticCurveTo(x1, y0, x1, y0 + rb); s.lineTo(x1, y1 - rt); if (rt) s.quadraticCurveTo(x1, y1, x1 - rt, y1);
      s.lineTo(x0 + rt, y1); if (rt) s.quadraticCurveTo(x0, y1, x0, y1 - rt); s.lineTo(x0, y0 + rb); if (rb) s.quadraticCurveTo(x0, y0, x0 + rb, y0);
      const g = new THREE.ExtrudeGeometry(s, { depth: Dp, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .6, bevelSegments: 8, curveSegments: 32 }); g.translate(0, 0, -Dp / 2); g.computeVertexNormals(); return g; };
    const base = mesh(part(bev * .6, split - .006, r, 0), body, 'case'); g.add(base);
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, split, -Dp / 2 - bev * .5); g.add(lidPivot);
    const lid = mesh(part(split + .006, H - bev * .6, 0, r * .75), body, 'lid'); lid.position.set(0, -split, Dp / 2 + bev * .5); lidPivot.add(lid);
    // two dark bud wells on the base's top face (seen when the lid opens)
    const wellM = MAT.plastic({ color: 0x0b0b0d, roughness: .6, clearcoat: 0 });
    [-.24, .24].forEach((x, i) => { const w = mesh(new THREE.CircleGeometry(.1, 40), wellM, 'well' + i); w.rotation.x = -Math.PI / 2; w.scale.set(1, .75, 1); w.position.set(x, split - .004, .02); g.add(w); });
    const seam = mesh(new THREE.BoxGeometry(W - .02, .01, Dp + bev * 1.4), MAT.plastic({ color: 0x0c0c0e, roughness: .7 }), 'seam'); seam.position.y = split; g.add(seam);
    const hinge = mesh(new THREE.CylinderGeometry(.03, .03, .3, 24), chrome, 'hinge'); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, split, -Dp / 2 - bev * .7); g.add(hinge);
    const led = mesh(new THREE.SphereGeometry(.012, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(.4, 3.5, 1.2) }), 'led'); led.position.set(0, .36, Dp / 2 + bev + .002); g.add(led);
    const L = bud(o), R = bud(o); L.position.set(-.78, 0, .28); L.rotation.y = .5; R.position.set(.78, 0, .28); R.rotation.y = Math.PI - .5; R.scale.x = -1;
    g.add(L, R);
    g.userData.parts = { case: base, lid, lidPivot, led, budL: L, budR: R }; return g;
  }
  function screenTexture(o = {}) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 1040; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 512, 1040); gr.addColorStop(0, o.c0 || '#1c2b7a'); gr.addColorStop(.55, o.c1 || '#5b2bd1'); gr.addColorStop(1, o.c2 || '#0aa5c9');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 1040);
    const rg = x.createRadialGradient(330, 330, 10, 330, 330, 420); rg.addColorStop(0, 'rgba(255,255,255,.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 512, 1040);
    x.fillStyle = 'rgba(255,255,255,.92)'; x.font = '600 26px "JetBrains Mono", monospace'; x.fillText('9:41', 46, 70);
    x.font = '900 92px Archivo, "Noto Sans SC", sans-serif'; x.fillText(o.title || 'vidkit', 46, 560); x.font = '600 40px Archivo, sans-serif'; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(o.sub || '3D · render(t)', 50, 616);
    for (let i = 0; i < 3; i++) { x.fillStyle = `rgba(255,255,255,${.16 + .06 * i})`; x.beginPath(); x.roundRect(46, 700 + i * 92, 420, 70, 22); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function phone(o = {}) {
    const g = new THREE.Group(), W = .78, H = 1.6, D = .085, frame = o.frame || MAT.titanium({ color: o.color || 0x9a9ea6 });
    const body = mesh(new RoundedBoxGeometry(W, H, D, 8, .1), frame, 'frame'); g.add(body);
    const rr = (w, h, r) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return new THREE.ShapeGeometry(s, 12); };
    const uvFit = (geo, w, h) => { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5); return geo; };
    const scr = mesh(uvFit(rr(W - .05, H - .05, .085), W - .05, H - .05), MAT.screen({ map: o.screen || screenTexture(o), intensity: o.screenIntensity || 1.25 }), 'screen'); scr.position.z = D / 2 + .0015; g.add(scr);
    const back = mesh(rr(W - .04, H - .04, .09), MAT.ceramic({ color: o.back || 0x2e3442, roughness: .38 }), 'back'); back.position.z = -D / 2 - .0015; back.rotation.y = Math.PI; g.add(back);
    const bump = mesh(new RoundedBoxGeometry(.34, .34, .03, 6, .07), MAT.ceramic({ color: o.back || 0x2e3442, roughness: .2 }), 'bump'); bump.position.set(.14, .54, -D / 2 - .012); g.add(bump);
    const lens = (x, y) => {
      const ring = mesh(new THREE.CylinderGeometry(.062, .066, .03, 40), MAT.chrome(), 'lensRing'); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, -D / 2 - .035); g.add(ring);
      const gl = mesh(new THREE.CircleGeometry(.05, 40), MAT.plastic({ color: 0x050608, roughness: .05, clearcoat: 1 }), 'lens'); gl.position.set(x, y, -D / 2 - .0505); gl.rotation.y = Math.PI; g.add(gl);
    };
    lens(.07, .61); lens(.07, .47); lens(.21, .54);
    const btn = mesh(new RoundedBoxGeometry(.012, .18, .03, 2, .005), frame, 'button'); btn.position.set(W / 2 + .004, .3, 0); g.add(btn);
    const pivot = new THREE.Group(); pivot.add(g); g.position.y = H / 2 + .01;
    pivot.userData.parts = { body, screen: scr, back, bump }; return pivot;
  }
  function bottle(o = {}) {
    const g = new THREE.Group(), prof = [[0, 0], [.3, 0], [.33, .03], [.34, .12], [.34, .62], [.31, .74], [.2, .82], [.11, .86], [.1, .95], [0, .95]].map(([x, y]) => new THREE.Vector2(x, y));
    const glass = mesh(new THREE.LatheGeometry(prof, 96), o.glass || MAT.glass({ thickness: .9, tint: o.tint || 0xeaf2ff }), 'glass'); g.add(glass);
    const lq = [[0, .05], [.29, .05], [.3, .1], [.3, .5], [0, .5]].map(([x, y]) => new THREE.Vector2(x, y));
    const liquid = mesh(new THREE.LatheGeometry(lq, 96), MAT.glass({ color: o.liquid || 0xffc48a, tint: o.liquid || 0xff9f4a, attenuation: .6, thickness: 1.2, roughness: .02 }), 'liquid'); g.add(liquid);
    const cap = mesh(new THREE.CylinderGeometry(.15, .15, .34, 64), o.cap || MAT.gold(), 'cap'); cap.position.y = .95 + .17; g.add(cap);
    const ring = mesh(new THREE.TorusGeometry(.15, .012, 12, 64), MAT.chrome(), 'ring'); ring.rotation.x = Math.PI / 2; ring.position.y = .95 + .02; g.add(ring);
    g.userData.parts = { glass, liquid, cap }; return g;
  }
  return { earbuds, earbud: bud, phone, bottle, screenTexture };
}
