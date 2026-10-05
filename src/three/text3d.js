// vk.three.text3d — extruded, bevelled 3D text with per-letter animation (pure in t). Fonts: the bundled OFL typefaces
// converted to three.js typeface JSON ('archivo-black' | 'anton' | 'instrument-serif', fonts/typeface/*.json), any
// typeface JSON url (make one with `vk font3d font.ttf --chars "…"`, e.g. a CJK subset), or a loaded Font.
//   vk.three.text3d({ text: 'HELLO', font: 'archivo-black', size: 1, depth: .3, bevel: { size: .02, thickness: .03 },
//     material: 'gold' | THREE.Material | { color }, align: 'center', letterSpacing: .02,
//     in: { preset: 'rise', t: .2, d: .8, stagger: .06 }, out: { preset: 'drop', t: 4 }, wave: { amp: .05 } })
// in/out presets: rise drop flip scale spin swing type pop. animate(letter, i, t, info) for your own per-letter motion
// (letter = {mesh, i, char, x, line, width}; write mesh.position / rotation / scale from t only).
import { unknownName } from '../core/strict.js';
import { getEase } from '../core/ease.js';

export const FONTS3D = { 'archivo-black': 'fonts/typeface/archivo-black.json', anton: 'fonts/typeface/anton.json', 'instrument-serif': 'fonts/typeface/instrument-serif.json' };
export const LETTER_PRESETS = ['rise', 'drop', 'flip', 'scale', 'spin', 'swing', 'type', 'pop'];
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x), D2R = Math.PI / 180;
// per-letter progress for an in/out spec at time t (pure): letter i of n
export function letterProgress(spec, i, n, t, out = false) {
  if (!spec) return out ? 0 : 1;
  const s = typeof spec === 'string' ? { preset: spec } : spec, st = s.stagger != null ? s.stagger : .05, order = s.order || 'forward';
  const k = order === 'reverse' ? n - 1 - i : order === 'center' ? Math.abs(i - (n - 1) / 2) : order === 'random' ? ((i * 7919) % n) : i;
  const p = clamp01((t - (s.t || 0) - k * st) / (s.d || (out ? .5 : .7)));
  return getEase(s.ease || (out ? 'inCubic' : (s.preset === 'drop' ? 'outBounce' : s.preset === 'pop' || s.preset === 'scale' ? 'outBack' : 'outCubic')))(p);
}
// transform offsets for preset at progress p (1 = settled): {dy, dz, rx, ry, rz, s, vis}
export function presetPose(preset, p, size = 1) {
  const q = 1 - p;
  switch (preset) {
    case 'rise': return { dy: -q * size * 1.1, rx: q * 80, s: 1, vis: p > 0 };
    case 'drop': return { dy: q * size * 3, s: 1, vis: p > 0 };
    case 'flip': return { ry: -q * 180, s: .3 + .7 * p, vis: p > 0 };
    case 'scale': return { s: Math.max(1e-3, p), vis: p > 0 };
    case 'pop': return { s: Math.max(1e-3, p), dz: q * size * .8, vis: p > 0 };
    case 'spin': return { rz: q * 360, s: Math.max(1e-3, p), vis: p > 0 };
    case 'swing': return { rx: -q * 100, vis: p > 0 };
    case 'type': return { vis: p > 0 };
    default: unknownName('letterPresets', preset, LETTER_PRESETS, { fatal: true });
  }
}
export function makeText3d(THREE, MAT, env) {
  return function text3d(o = {}) {
    const mod = { o, letters: [] };
    mod.setup = async ctx => {
      const { load, scene } = ctx;
      const fspec = o.font || 'archivo-black', font = typeof fspec === 'object' ? fspec : await load.font(FONTS3D[fspec] ? new URL(FONTS3D[fspec], env.base).href : (/\.json(\?|$)/.test(fspec) ? fspec : unknownName('fonts3d', fspec, Object.keys(FONTS3D), { fatal: true })));
      const size = o.size || 1, depth = o.depth != null ? o.depth : size * .25, bv = o.bevel === false ? null : { size: size * .02, thickness: size * .025, segments: 3, ...(o.bevel || {}) };
      const mat = o.material && o.material.isMaterial ? o.material : typeof o.material === 'string' ? (MAT[o.material] || unknownName('threeMaterials', o.material, Object.keys(MAT), { fatal: true }))(o.materialOptions || {}) : new THREE.MeshStandardMaterial({ color: new THREE.Color((o.material && o.material.color) || o.color || '#f2ede2'), roughness: (o.material && o.material.roughness) != null ? o.material.roughness : .45, metalness: (o.material && o.material.metalness) || 0 });
      const side = o.sideMaterial ? (o.sideMaterial.isMaterial ? o.sideMaterial : new THREE.MeshStandardMaterial({ color: new THREE.Color(o.sideMaterial.color || o.sideMaterial), roughness: .6 })) : null;
      const root = mod.root = new THREE.Group(); scene.add(root);
      const res = font.data.resolution || 1000, sc = size / res, geoCache = new Map(), lines = String(o.text != null ? o.text : 'vidkit').split('\n');
      const lh = (o.lineHeight || 1.25) * size, ls = (o.letterSpacing || 0) * size;
      const glyphGeo = ch => {
        if (geoCache.has(ch)) return geoCache.get(ch);
        const shapes = font.generateShapes(ch, size); let g = null;
        if (shapes.length) { g = new THREE.ExtrudeGeometry(shapes, { depth, curveSegments: o.curveSegments || 8, bevelEnabled: !!bv, bevelSize: bv ? bv.size : 0, bevelThickness: bv ? bv.thickness : 0, bevelSegments: bv ? bv.segments : 0 }); g.computeBoundingBox(); const bb = g.boundingBox, cx = (bb.min.x + bb.max.x) / 2; g.translate(-cx, 0, -depth / 2); g.userData.cx = cx; }
        geoCache.set(ch, g); return g;
      };
      let idx = 0;
      lines.forEach((line, li) => {
        const chars = [...line], adv = chars.map(ch => { const gl = font.data.glyphs[ch] || font.data.glyphs['?']; return (gl ? gl.ha : res * .5) * sc + ls; });
        const W = adv.reduce((a, b) => a + b, 0) - ls, x0 = o.align === 'left' ? 0 : o.align === 'right' ? -W : -W / 2; let x = x0;
        chars.forEach((ch, ci) => {
          const g = glyphGeo(ch);
          if (g) { const m = new THREE.Mesh(g, side ? [mat, side] : mat); m.castShadow = m.receiveShadow = !!o.shadows; const L = { mesh: m, i: idx, char: ch, x: x + g.userData.cx, y: -li * lh, line: li, width: adv[ci] }; m.position.set(L.x, L.y, 0); root.add(m); mod.letters.push(L); idx++; }
          x += adv[ci];
        });
      });
      // centre the block vertically on its first baseline … middle of the cap height
      const cap = (font.data.glyphs.H ? font.data.boundingBox.yMax * .7 : res * .7) * sc;
      mod.offsetY = o.valign === 'baseline' ? 0 : -cap / 2 + (lines.length - 1) * lh / 2;
      if (o.position) root.position.set(...o.position); if (o.rotation) root.rotation.set(...o.rotation.map(v => v * D2R)); if (o.scale) root.scale.setScalar(o.scale);
      mod.size = size; mod.font = font;
    };
    mod.update = (t, info) => {
      if (mod.needLights === undefined) { let lit = !!info.scene && !!info.scene.environment; if (info.scene) info.scene.traverse(x => { if (x.isLight) lit = true; }); mod.needLights = !lit && o.lights !== false; if (mod.needLights) { const h = new THREE.HemisphereLight(0xffffff, 0x404040, 1.4), d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(-2, 3, 4); mod.root.add(h, d); } }
      const n = mod.letters.length, sz = mod.size;
      for (const L of mod.letters) {
        const m = L.mesh, pin = letterProgress(o.in, L.i, n, t), pout = o.out ? letterProgress(o.out, L.i, n, t, true) : 0;
        let dy = 0, dz = 0, rx = 0, ry = 0, rz = 0, s = 1, vis = true;
        if (o.in) { const a = presetPose((typeof o.in === 'string' ? o.in : o.in.preset) || 'rise', pin, sz); dy += a.dy || 0; dz += a.dz || 0; rx += a.rx || 0; ry += a.ry || 0; rz += a.rz || 0; s *= a.s != null ? a.s : 1; vis = vis && a.vis; }
        if (o.out && pout > 0) { const b = presetPose((typeof o.out === 'string' ? o.out : o.out.preset) || 'drop', 1 - pout, sz); dy += (b.dy || 0) * (b.dy > 0 ? -1 : 1); dz += b.dz || 0; rx += b.rx || 0; ry += b.ry || 0; rz += b.rz || 0; s *= b.s != null ? b.s : 1; vis = vis && b.vis; }
        if (o.wave) { const w = o.wave === true ? {} : o.wave; dy += (w.amp != null ? w.amp : .05) * sz * Math.sin(t * (w.speed || 2.4) - L.i * (w.freq || .5)); }
        m.position.set(L.x, L.y + mod.offsetY + dy, dz); m.rotation.set(rx * D2R, ry * D2R, rz * D2R); m.scale.setScalar(s); m.visible = vis;
        if (o.animate) o.animate(L, L.i, t, info);
      }
      if (o.spin) mod.root.rotation.y = (typeof o.spin === 'function' ? o.spin(t) : o.spin * t) * D2R + (o.rotation ? o.rotation[1] * D2R : 0);
    };
    return mod;
  };
}
