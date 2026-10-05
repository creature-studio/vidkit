// vk.three.diorama — miniature worlds that work with any camera rig and any look:
//   kind 'papercut'   layered paper-cut shadow box: N cut-paper silhouettes at increasing depth, soft shadows between
//                     layers, backlight glow, optional frame; layers can rise / sway / slide (pure in t)
//   kind 'popup'      pop-up book: the book opens, V-fold pieces stand up from the pages, spreads turn
//   kind 'isometric'  low-poly island / village block on a plinth, orthographic camera (true isometric by default)
//   kind 'tiltshift'  the same world through a perspective lens + the 'miniature' look (tilt-shift blur, saturation)
// Shapes: vk.three.shapes names, {shape, …opts}, SVG path data or [[x,y]…]. Paper is matte MeshStandard (or toon)
// with a fibre texture; add post: { look: 'papercut' } (or any look) for the cut-paper finish.
import { shapeOf, bounds } from './shapes.js';
import { rgbOf } from './terrainmath.js';
import { mulberry32 } from '../core/random.js';
import { getEase } from '../core/ease.js';
import { unknownName } from '../core/strict.js';

const D2R = Math.PI / 180, clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
export const DIORAMA_KINDS = ['papercut', 'popup', 'isometric', 'tiltshift'];
// timing helper: {t, d, ease} | number (start) | fn(t) → 0..1
export function prog(spec, t, def = { t: 0, d: 1 }) {
  if (spec == null) return 1;
  if (typeof spec === 'function') return clamp01(spec(t));
  const s = typeof spec === 'number' ? { t: spec, d: def.d } : { ...def, ...spec };
  return getEase(s.ease || 'inOutCubic')(clamp01((t - (s.t || 0)) / (s.d || 1)));
}
// default palettes (front → back)
export const PALETTES = {
  dusk: ['#1f2a44', '#34406a', '#5b5f8e', '#9a7fa6', '#e3a98f', '#f6d6a8'],
  forest: ['#14301f', '#1f4a2c', '#2f6b3a', '#5c8f4f', '#9cc27a', '#e6efc4'],
  sea: ['#0e2a47', '#16426a', '#24628f', '#3f86ad', '#7fb7cf', '#d6ecf0'],
  autumn: ['#3b1d12', '#6b2f1a', '#a4472a', '#d27a3a', '#efb062', '#f8e2b0'],
  ink: ['#1b1c1e', '#3a3c40', '#6a6c70', '#9c9d9e', '#cfcac0', '#efe9dc'],
  red: ['#5c0f12', '#8e1b1f', '#b8282a', '#d9473b', '#ef8a6a', '#f8d9c4'],
};

export function makeDiorama(THREE, terrainMods) {
  const C = c => new THREE.Color().setRGB(...rgbOf(c), THREE.SRGBColorSpace);
  let paperTex = null;
  function paperTexture() {
    if (paperTex) return paperTex;
    const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n), r = mulberry32(77);
    const v = new Float32Array(n * n); for (let i = 0; i < n * n; i++) v[i] = r();
    for (let pass = 0; pass < 2; pass++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; v[i] = (v[i] * 2 + v[y * n + (x + 1) % n] + v[((y + 1) % n) * n + x]) / 4; }
    for (let i = 0; i < n * n; i++) { const k = 232 + (v[i] - .5) * 40 + (r() - .5) * 10; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = k; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); paperTex = new THREE.CanvasTexture(c); paperTex.wrapS = paperTex.wrapT = THREE.RepeatWrapping; paperTex.colorSpace = THREE.NoColorSpace; return paperTex;
  }
  function paperMat(color, o = {}) {
    const m = o.toon ? new THREE.MeshToonMaterial({ color: C(color) }) : new THREE.MeshStandardMaterial({ color: C(color), roughness: 1, metalness: 0, bumpMap: o.texture === false ? null : paperTexture(), bumpScale: o.bump != null ? o.bump : 1.2 });
    if (o.emissive) { m.emissive = C(o.emissive); m.emissiveIntensity = o.emissiveIntensity || 1; }
    m.side = THREE.DoubleSide; return m;
  }
  // shape spec → extruded paper mesh (thickness th), its base (minY) at y = 0 when o.anchor === 'base'
  function paperMesh(spec, color, o = {}) {
    const s = shapeOf(spec, o.shapeOptions || {}), sh = new THREE.Shape(s.outer.map(p => new THREE.Vector2(p[0], p[1])));
    for (const h of s.holes || []) sh.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1]))));
    const g = new THREE.ExtrudeGeometry(sh, { depth: o.thickness != null ? o.thickness : .02, bevelEnabled: false, curveSegments: 6 });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * .35, uv.getY(i) * .35);
    const m = new THREE.Mesh(g, o.material || paperMat(color, o)); m.castShadow = true; m.receiveShadow = true; m.userData.bounds = bounds(s);
    return m;
  }
  function shadows(renderer, light, o = {}) {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    light.castShadow = true; const S = light.shadow; S.mapSize.set(o.mapSize || 2048, o.mapSize || 2048); S.radius = o.radius != null ? o.radius : 4; S.bias = o.bias != null ? o.bias : -.0004; S.normalBias = o.normalBias != null ? o.normalBias : .02;
    const cam = S.camera, e = o.extent || 8; cam.left = -e; cam.right = e; cam.top = e; cam.bottom = -e; cam.near = .1; cam.far = o.far || 40; cam.updateProjectionMatrix();
  }
  /* ---------- papercut ---------- */
  function papercut(o) {
    const mod = { o, kind: 'papercut' };
    mod.setup = ctx => {
      const { scene, renderer } = ctx, W = o.width || 10, Hh = o.height || 5.6, gap = o.gap != null ? o.gap : .32, th = o.thickness || .02;
      const pal = typeof o.palette === 'string' ? (PALETTES[o.palette] || unknownName('palettes', o.palette, Object.keys(PALETTES), { fatal: true })) : (o.palette || PALETTES.dusk);
      let layers = o.layers;
      if (typeof layers === 'number' || layers == null) { const n = layers || 5; layers = Array.from({ length: n }, (_, i) => ({ shape: i === n - 1 ? 'mountains' : i % 2 ? 'hills' : 'forest', height: -Hh * .35 + i * Hh * .12 + (i === n - 1 ? Hh * .08 : 0), seed: i * 7 + 3 })); }
      const root = mod.root = new THREE.Group(); scene.add(root);
      const N = layers.length; mod.layers = [];
      layers.forEach((L, i) => {
        const z = L.z != null ? L.z : -i * gap, col = L.color || pal[Math.min(pal.length - 1, Math.round(i * (pal.length - 2) / Math.max(1, N - 1)))];
        const spec = typeof L === 'string' || Array.isArray(L) || L.outer ? L : (L.shape ? L : { ...L, shape: 'ridge' });
        const opts = typeof spec === 'object' && !Array.isArray(spec) && !spec.outer ? { width: W * (L.over || 1.25), base: -Hh / 2 - .5, ...spec, shape: undefined } : {};
        const m = paperMesh(typeof spec === 'object' && spec.shape ? spec.shape : spec, col, { thickness: th, shapeOptions: opts, toon: o.toon, bump: o.bump });
        const pivot = new THREE.Group(); pivot.position.set(L.x || 0, L.y || 0, z); pivot.add(m); root.add(pivot);
        const props = (L.props || []).map(pp => { const pm = paperMesh(pp.shape || pp, pp.color || col, { thickness: th, shapeOptions: { ...pp, shape: undefined }, toon: o.toon }); pm.position.set(pp.x || 0, pp.y || 0, th * .5 + (pp.dz || 0)); if (pp.scale) pm.scale.setScalar(pp.scale); if (pp.flip) pm.scale.x *= -1; pivot.add(pm); return { pp, m: pm }; });
        mod.layers.push({ L, i, pivot, m, props, z });
      });
      // back wall (sky) + glow disc + frame
      const sky = o.sky !== false ? new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, Hh * 1.6), paperMat(o.sky || pal[pal.length - 1], { emissive: o.sky || pal[pal.length - 1], emissiveIntensity: o.skyGlow != null ? o.skyGlow : .35 })) : null;
      if (sky) { sky.position.z = -N * gap - .25; sky.receiveShadow = true; root.add(sky); mod.sky = sky; }
      if (o.sun) { const s = o.sun === true ? {} : o.sun; const d = paperMesh({ shape: s.shape || 'circle', r: s.r || .7 }, s.color || '#fff4d6', { thickness: th, emissive: s.color || '#fff4d6', emissiveIntensity: s.glow != null ? s.glow : .9 }); d.position.set(s.x != null ? s.x : W * .22, s.y != null ? s.y : Hh * .18, -N * gap - .15); root.add(d); mod.sun = d; }
      if (o.frame !== false) {
        const f = o.frame || {}, fw = f.width || .45, fd = N * gap + .5, fc = paperMat(f.color || '#2b2320', { bump: .4 }), Wf = W + fw * 2, Hf = Hh + fw * 2;
        const bar = (w, h, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, fd), fc); b.position.set(x, y, -fd / 2 + .3); b.castShadow = b.receiveShadow = true; root.add(b); };
        bar(Wf, fw, 0, Hh / 2 + fw / 2); bar(Wf, fw, 0, -Hh / 2 - fw / 2); bar(fw, Hf, W / 2 + fw / 2, 0); bar(fw, Hf, -W / 2 - fw / 2, 0);
      }
      const amb = new THREE.HemisphereLight(0xffffff, C(pal[0]), o.ambient != null ? o.ambient : .9); root.add(amb);
      const key = mod.key = new THREE.DirectionalLight(C(o.light || '#fff1dc'), o.lightIntensity != null ? o.lightIntensity : 2.2);
      key.position.set(...(o.lightDir || [-3, 4, 6])); key.target.position.set(0, 0, -N * gap / 2); root.add(key, key.target);
      if (o.shadows !== false) shadows(renderer, key, { extent: Math.max(W, Hh) * .75, radius: o.softness != null ? o.softness : 6, ...(o.shadow || {}) });
      if (o.backlight !== false) { const bl = new THREE.PointLight(C(o.backlight || pal[pal.length - 1]), o.backlightIntensity != null ? o.backlightIntensity : 6, 0, 1.4); bl.position.set(0, Hh * .1, -N * gap - .05); root.add(bl); }
      if (o.position) root.position.set(...o.position);
      if (o.scale) root.scale.setScalar(o.scale);
    };
    mod.update = (t, info) => {
      for (const Ly of mod.layers) {
        const { L, i, pivot } = Ly; let y = L.y || 0, x = L.x || 0, rx = 0;
        if (o.rise || L.rise) { const r = L.rise || o.rise, st = r.stagger != null ? r.stagger : .12, p = prog({ t: (r.t || 0) + (L.rise ? 0 : (r.order === 'front' ? i : (mod.layers.length - 1 - i)) * st), d: r.d || .9, ease: r.ease || 'outBack' }, t); y -= (1 - p) * (r.dist || (o.height || 5.6)); }
        if (o.fold || L.fold) { const f = L.fold || o.fold, st = f.stagger != null ? f.stagger : .1, p = prog({ t: (f.t || 0) + (mod.layers.length - 1 - i) * st, d: f.d || 1, ease: f.ease || 'outCubic' }, t); rx = -(1 - p) * 90 * D2R; }
        if (L.sway) { const s = L.sway === true ? {} : L.sway; x += Math.sin(t * (s.speed || .6) * Math.PI * 2 / 3 + i) * (s.amp || .25); y += Math.sin(t * (s.speed || .6) * 1.7 + i * 2) * (s.bob || .03); }
        if (L.slide) x += (typeof L.slide === 'function' ? L.slide(t) : L.slide * t);
        pivot.position.set(x, y, Ly.z); pivot.rotation.x = rx;
        for (const P of Ly.props) if (P.pp.animate) P.pp.animate(t, P.m, info);
      }
      if (o.animate) o.animate(t, mod, info);
    };
    return mod;
  }
  /* ---------- pop-up book ---------- */
  // The book lies open on a table: spine along z (x = 0), the reader / camera at +z. Pieces are cut-paper flats facing
  // the reader (shape plane ⟂ z) standing on a page at (x, z); each hinges on its base line and lies flat (top away
  // from the reader) while the book is closed or its spread is not shown, then folds up as the book opens.
  // spreads [{ pieces: [{shape, color, x, z, scale, at, d, stand}], printLeft(g, w, h), printRight(g, w, h) }],
  // turns [{t, d}] turn to the next spread (pieces fold down, a leaf turns, the next pieces stand up).
  function popup(o) {
    const mod = { o, kind: 'popup' };
    mod.setup = ctx => {
      const { scene, renderer } = ctx, PW = o.pageWidth || 3.2, PD = o.pageDepth || 4.2, th = .016, blockH = o.thickness || .16;
      const root = mod.root = new THREE.Group(); scene.add(root);
      const paper = o.paper || '#f4ede0', cover = o.cover || '#7a2b26';
      const coverMat = paperMat(cover, { bump: .6 }), pageMat = paperMat(paper, { bump: .8 });
      const printed = draw => { if (!draw) return pageMat; const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * PD / PW); const g = c.getContext('2d'); g.fillStyle = paper; g.fillRect(0, 0, c.width, c.height); draw(g, c.width, c.height); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; const m = paperMat('#ffffff', { bump: .5 }); m.map = tx; return m; };
      const mkHalf = side => { const g = new THREE.Group(); const cv = new THREE.Mesh(new THREE.BoxGeometry(PW + .14, .05, PD + .24), coverMat); cv.position.set(side * (PW / 2 + .07), -.025, 0); cv.receiveShadow = cv.castShadow = true; g.add(cv);
        const pb = new THREE.Mesh(new THREE.BoxGeometry(PW, blockH, PD), pageMat); pb.position.set(side * PW / 2, blockH / 2, 0); pb.receiveShadow = pb.castShadow = true; g.add(pb); return g; };
      // the left half hinges at page-surface height, so when closed its pages lie face-down ON the right pages
      const right = mod.right = mkHalf(1), leftPivot = mod.leftPivot = new THREE.Group(), left = mkHalf(-1); leftPivot.position.y = blockH; left.position.y = -blockH; leftPivot.add(left); root.add(right, leftPivot);
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, PD + .24, 12, 1, true, 0, Math.PI), coverMat); spine.rotation.x = Math.PI / 2; spine.rotation.y = Math.PI; spine.position.y = -.02; root.add(spine);
      mod.spreads = (o.spreads || [o]).map((S, si) => {
        const R = new THREE.Group(), Lg = new THREE.Group(); R.position.y = blockH + .001; Lg.position.y = blockH + .001; right.add(R); left.add(Lg);
        const surfR = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), printed(S.printRight)); surfR.rotation.x = -Math.PI / 2; surfR.position.x = PW / 2; surfR.receiveShadow = true; R.add(surfR);
        const surfL = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), printed(S.printLeft)); surfL.rotation.x = -Math.PI / 2; surfL.position.x = -PW / 2; surfL.receiveShadow = true; Lg.add(surfL);
        const pieces = (S.pieces || []).map((P, k) => {
          const x = P.x || 0, onLeft = P.page === 'left' || (P.page == null && x < -.15);
          const hinge = new THREE.Group(); hinge.position.set(x, .002 + k * .0015, P.z != null ? P.z : 0); (onLeft ? Lg : R).add(hinge);
          const m = paperMesh(P.shape || 'rect', P.color || '#c0392b', { thickness: th, shapeOptions: { ...P, shape: undefined, x: undefined, z: undefined, color: undefined }, toon: o.toon, emissive: P.glow ? (P.color || '#ffffff') : null, emissiveIntensity: P.glow });
          const b = m.userData.bounds, lift = P.lift || 0; m.position.set(0, -b.minY * (P.scale || 1) + lift, -th / 2); if (P.scale) m.scale.setScalar(P.scale); if (P.flip) m.scale.x *= -1;
          hinge.add(m);
          // lifted pieces (sun, clouds, stars) stand on a thin paper tab, as in a real pop-up
          if (lift > 0) { const tab = new THREE.Mesh(new THREE.BoxGeometry(P.tab || .05, lift + .02, th * .8), paperMat(P.tabColor || P.color || '#c0392b', { bump: .3 })); tab.position.set(0, lift / 2, -th * 1.2); tab.castShadow = true; hinge.add(tab); }
          return { P, hinge, m, onLeft, k };
        });
        return { S, R, Lg, pieces, si, matR: surfR.material, matL: surfL.material };
      });
      // the turning leaf (blank paper), pivot on the spine
      // the turning leaf: front = the current right page print, back = the next left page print
      const leafPivot = mod.leafPivot = new THREE.Group(); leafPivot.position.y = blockH + .004;
      const leafF = mod.leafFront = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), pageMat), leafB = mod.leafBack = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), pageMat);
      leafF.rotation.x = -Math.PI / 2; leafF.position.set(PW / 2, .002, 0); leafB.rotation.x = Math.PI / 2; leafB.rotation.z = Math.PI; leafB.position.set(PW / 2, -.002, 0);
      for (const m of [leafF, leafB]) { m.material = m.material.clone(); m.material.side = THREE.FrontSide; m.castShadow = m.receiveShadow = true; leafPivot.add(m); }
      leafPivot.visible = false; root.add(leafPivot);
      mod.PW = PW; mod.PD = PD;
      const amb = new THREE.HemisphereLight(0xffffff, 0x8a7a66, o.ambient != null ? o.ambient : 1);
      const key = new THREE.DirectionalLight(C(o.light || '#fff3e2'), o.lightIntensity != null ? o.lightIntensity : 2.4); key.position.set(...(o.lightDir || [-2.5, 6, 3.5]));
      root.add(amb, key, key.target); mod.key = key; mod.ambient = amb;
      if (o.shadows !== false) shadows(renderer, key, { extent: Math.max(PW * 2, PD) * .75, radius: o.softness != null ? o.softness : 5 });
      if (o.table !== false) { const tb = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), paperMat(o.table || '#4a3b30', { bump: .3 })); tb.rotation.x = -Math.PI / 2; tb.position.y = -.05; tb.receiveShadow = true; root.add(tb); mod.table = tb; }
      if (o.position) root.position.set(...o.position);
    };
    // book state at t: open (0 closed … 1 flat), current spread index, turn progress toward the next spread
    mod.state = t => {
      const open = prog(o.open || { t: 0, d: 1.6, ease: 'inOutCubic' }, t), turns = o.turns || [];
      let si = 0, turn = 0;
      for (let i = 0; i < turns.length; i++) { const tr = turns[i], p = prog({ t: tr.t != null ? tr.t : tr, d: tr.d || 1.6, ease: 'inOutSine' }, t); if (p >= 1) si = i + 1; else { if (p > 0) turn = p; break; } }
      return { open, si, turn };
    };
    mod.update = (t, info) => {
      const { open, si, turn } = mod.state(t);
      mod.leftPivot.rotation.z = -(1 - open) * Math.PI;
      mod.leafPivot.visible = turn > 0; mod.leafPivot.rotation.z = turn * Math.PI;
      if (turn > 0) { const a = mod.spreads[si], b = mod.spreads[si + 1]; if (a) mod.leafFront.material = a.matR; if (b) mod.leafBack.material = b.matL; }
      for (const S of mod.spreads) {
        const cur = S.si === si, next = S.si === si + 1;
        // pages: the current spread's surfaces until mid-turn, then the next one's
        // the right page under the lifting leaf shows the next spread once its pieces have folded; the left page
        // switches when the leaf lands
        const showR = turn > 0 ? (turn < .46 ? cur : next) : cur, showL = turn > 0 ? (turn < .92 ? cur : next) : cur;
        S.R.visible = showR; S.Lg.visible = showL;
        for (const Pc of S.pieces) {
          const P = Pc.P; let e = open;
          if (cur && turn > 0) e = Math.min(e, 1 - clamp01(turn * 2.2));
          else if (next && turn > 0) e = Pc.onLeft ? clamp01((turn - .92) / .08) : clamp01(turn * 2.2 - 1.2);
          else if (!cur) e = 0;
          if (P.at != null) e = Math.min(e, prog({ t: P.at, d: P.d || .9, ease: P.ease || 'outBack' }, t));
          Pc.hinge.rotation.x = -(1 - e) * (P.stand != null ? P.stand : 90) * D2R;
          // flat pieces are hidden while the book is (nearly) closed so cross-spine flats never poke out of the cover
          Pc.hinge.visible = e > 1e-4 || open > .6;
          if (P.animate) P.animate(t, Pc.m, info, e);
        }
      }
      if (o.animate) o.animate(t, mod, info);
    };
    return mod;
  }
  /* ---------- isometric / tiltshift ---------- */
  function iso(o, kind) {
    const T = terrainMods.terrain({ type: o.world === 'mountains' ? 'mountains' : o.world === 'hills' ? 'hills' : 'island', size: o.size || 8, height: o.height != null ? o.height : 1.6, segments: o.segments || 48, flat: o.flat !== false,
      colors: o.colors || 'island', water: o.water === false ? null : { level: .12, color: '#6d9fb3', opacity: .72, ...(o.water || {}) }, block: o.block === false ? null : { depth: 1, ...(o.block || {}) }, shadows: o.shadows !== false, seed: o.seed || 4, falloff: o.falloff,
      scatter: o.scatter || [{ shape: 'pine', n: o.trees != null ? o.trees : 70, minH: .12, maxH: .7, scale: [.35, .6] }, { shape: 'tree', n: Math.round((o.trees != null ? o.trees : 70) * .4), minH: .1, maxH: .45, scale: [.3, .5] }, { shape: 'rock', n: o.rocks != null ? o.rocks : 25, minH: .1, maxH: .9, scale: [.3, .7] }, { shape: 'house', n: o.houses != null ? o.houses : 6, minH: .12, maxH: .3, maxSlope: .35, scale: [.45, .6] }],
      lights: false, rockSlope: .55, rock: '#8b867c', ...(o.terrain || {}) });
    const mod = { o, kind, terrain: T };
    mod.setup = async ctx => {
      await T.setup(ctx); mod.heightAt = T.heightAt;
      const { scene, renderer, layer } = ctx;
      const amb = new THREE.HemisphereLight(C(o.sky || '#dfefff'), C('#6b5a44'), o.ambient != null ? o.ambient : 1.1);
      const key = new THREE.DirectionalLight(C(o.light || '#fff2dc'), o.lightIntensity != null ? o.lightIntensity : 2.6); key.position.set(...(o.lightDir || [-4, 7, 3])); scene.add(amb, key, key.target);
      if (o.shadows !== false) shadows(renderer, key, { extent: (o.size || 8) * .8, radius: 3, mapSize: 2048 });
      if (kind === 'isometric' && o.ortho !== false) {
        const aspect = ctx.iw / ctx.ih, s = (o.size || 8) / (o.zoom || 1.4) * .75;
        const cam = new THREE.OrthographicCamera(-s * aspect, s * aspect, s, -s, -100, 200); cam.position.set(10, 10 * Math.tan(35.264 * D2R) * Math.SQRT2, 10); cam.lookAt(0, 0, 0);
        mod.camera = cam; mod.extent = s;
        return { camera: cam };
      }
      if (kind === 'tiltshift' && layer && layer.o.look === undefined && !(layer.o.post && layer.o.post.look !== undefined)) layer.o.look = o.look || { preset: 'miniature', tiltshift: { blur: o.blur || 9, band: o.band || .1 } };
    };
    mod.update = (t, info) => {
      T.update(t, info);
      if (mod.camera && o.zoomAt) { const z = typeof o.zoomAt === 'function' ? o.zoomAt(t) : 1; mod.camera.zoom = z; mod.camera.updateProjectionMatrix(); }
      if (o.animate) o.animate(t, mod, info);
    };
    return mod;
  }
  function diorama(o = {}) {
    const kind = o.kind || 'papercut';
    if (kind === 'papercut') return papercut(o);
    if (kind === 'popup') return popup(o);
    if (kind === 'isometric' || kind === 'tiltshift') return iso(o, kind);
    return unknownName('dioramas', kind, DIORAMA_KINDS, { fatal: true });
  }
  // true isometric orbit rig for the ortho camera (and a high miniature orbit for tiltshift)
  diorama.isoRig = (r = {}) => t => { const p = prog({ t: r.t || 0, d: r.dur || 6, ease: r.ease || 'inOutSine' }, t), a = ((r.from != null ? r.from : 45) + ((r.to != null ? r.to : 45) - (r.from != null ? r.from : 45)) * p) * D2R, el = (r.elev != null ? r.elev : 35.264) * D2R, R = r.radius || 20, T = r.target || [0, .4, 0];
    return { pos: [T[0] + Math.sin(a) * Math.cos(el) * R, T[1] + Math.sin(el) * R, T[2] + Math.cos(a) * Math.cos(el) * R], target: T.slice(), fov: r.fov || 30 }; };
  diorama.paperMesh = paperMesh; diorama.paperMaterial = paperMat; diorama.palettes = PALETTES; diorama.kinds = DIORAMA_KINDS;
  return diorama;
}
