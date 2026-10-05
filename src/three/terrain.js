// vk.three.terrain / vk.three.globe — procedural or heightmap terrain and a stylable globe (modules for sc.three).
//   vk.three.terrain({ type: 'mountains', size: 24, height: 4, segments: 180, colors: 'alpine', flat: false,
//                      water: { level: .18 }, block: false, contours: false, scatter: [{ shape: 'pine', n: 300 }] })
//   vk.three.globe({ texture: 'earth' | 'procedural' | url, land, ocean, atmosphere, markers, arcs, spin, tilt })
// Geometry and colours are built once in setup; everything per-frame (reveal, water, spin, arcs, markers) is a pure
// function of t. 'earth' rasterises the vendored Natural Earth 1:110m land polygons (public domain) — no network.
import { heightField, imageField, ramp, rgbOf, latLon, arcPoints } from './terrainmath.js';
import { mulberry32 } from '../core/random.js';
import { getEase } from '../core/ease.js';

const D2R = Math.PI / 180;
export function makeTerrain(THREE, env) {
  const C = c => new THREE.Color().setRGB(...rgbOf(c), THREE.SRGBColorSpace);
  function material(o, vcol) {
    if (o.material && o.material.isMaterial) return o.material;
    const base = { vertexColors: vcol, flatShading: !!o.flat };
    if (o.material === 'toon') { const d = new Uint8Array([70, 150, 255]), g = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); g.minFilter = g.magFilter = THREE.NearestFilter; g.needsUpdate = true; return new THREE.MeshToonMaterial({ ...base, gradientMap: g }); }
    if (o.material === 'lambert') return new THREE.MeshLambertMaterial(base);
    return new THREE.MeshStandardMaterial({ ...base, roughness: o.roughness != null ? o.roughness : .95, metalness: 0 });
  }
  // heightfield geometry (+ optional skirt block) with vertex colours from the ramp / slope / snow
  function build(o, hf) {
    const [W, D] = Array.isArray(o.size) ? o.size : [o.size || 24, o.size || 24], H = o.height != null ? o.height : 4;
    const seg = o.segments || 160, sx = seg, sz = Math.max(2, Math.round(seg * D / W));
    const g = new THREE.PlaneGeometry(W, D, sx, sz); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), rp = ramp(o.colors || 'alpine'), rock = o.rock ? rgbOf(o.rock) : null;
    const yAt = (x, z) => hf(x, z) * H;
    for (let i = 0; i < pos.count; i++) pos.setY(i, yAt(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    const nor = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i) / H, slope = 1 - nor.getY(i); let c = rp(h);
      if (rock && slope > (o.rockSlope || .35)) { const k = Math.min(1, (slope - (o.rockSlope || .35)) * 4); c = c.map((v, j) => v + (rock[j] - v) * k); }
      if (o.snow != null && h > o.snow && slope < .5) { const k = Math.min(1, (h - o.snow) * 8); c = c.map(v => v + (.95 - v) * k); }
      const lin = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); col[i * 3] = lin.r; col[i * 3 + 1] = lin.g; col[i * 3 + 2] = lin.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { geo: o.flat ? g.toNonIndexed() : g, W, D, H, yAt, sx, sz };
  }
  // side walls of a diorama block: strata bands from the surface down to -depth
  function skirt(o, T) {
    const depth = (o.block && o.block.depth) || T.H * .35 + .4, strata = ((o.block && o.block.strata) || ['#8a6a46', '#6e5236', '#57402b']).map(c => C(c));
    const verts = [], cols = [], n = T.sx, edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const push = (x, y, z, c) => { verts.push(x, y, z); cols.push(c.r, c.g, c.b); };
    for (const [ex, ez] of edges) {
      const len = ex ? T.D : T.W, m = ex ? T.sz : n;
      for (let i = 0; i < m; i++) {
        const a = -len / 2 + len * i / m, b = -len / 2 + len * (i + 1) / m;
        const P = s => ex ? [ex * T.W / 2, s] : [s, ez * T.D / 2];
        const [x0, z0] = P(a), [x1, z1] = P(b), y0 = T.yAt(x0, z0), y1 = T.yAt(x1, z1);
        // bands: top band follows the surface, lower bands flat
        const levels = [Math.min(y0, y1) - .001, ...strata.map((_, k) => -depth * (k + 1) / strata.length)];
        for (let k = 0; k < strata.length; k++) {
          const ta = k === 0 ? y0 : levels[k], tb = k === 0 ? y1 : levels[k], bot = levels[k + 1], c = strata[k];
          const flip = (ex === 1 || ez === -1);
          const q = [[x0, ta, z0], [x1, tb, z1], [x1, bot, z1], [x0, bot, z0]];
          const tri = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]; for (const t of tri) push(...q[t], c);
        }
      }
    }
    // bottom
    const c = strata[strata.length - 1], y = -depth, w = T.W / 2, d = T.D / 2; [[-w, y, -d], [w, y, -d], [w, y, d], [-w, y, -d], [w, y, d], [-w, y, d]].forEach(p => push(...p, c));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  }
  // scatter props (instanced): shapes 'pine' | 'tree' | 'rock' | 'house' | THREE.BufferGeometry, placed by height / slope rules
  function propGeo(shape) {
    if (shape && shape.isBufferGeometry) return shape;
    switch (shape) {
      case 'tree': { const a = new THREE.IcosahedronGeometry(.45, 0); a.translate(0, .95, 0); const t = new THREE.CylinderGeometry(.06, .08, .6, 5); t.translate(0, .3, 0); return mergeColored([[t, '#6b4a2b'], [a, '#4f8a3c']]); }
      case 'rock': { const r = new THREE.DodecahedronGeometry(.35, 0); r.scale(1, .6, .9); r.translate(0, .12, 0); return mergeColored([[r, '#8b867c']]); }
      case 'house': { const b = new THREE.BoxGeometry(.6, .45, .5); b.translate(0, .225, 0); const rf = new THREE.ConeGeometry(.5, .35, 4); rf.rotateY(Math.PI / 4); rf.scale(1.05, 1, .9); rf.translate(0, .62, 0); return mergeColored([[b, '#efe3cf'], [rf, '#b5523b']]); }
      case 'pine': default: { const t = new THREE.CylinderGeometry(.05, .07, .3, 5); t.translate(0, .15, 0); const c1 = new THREE.ConeGeometry(.38, .7, 6); c1.translate(0, .55, 0); const c2 = new THREE.ConeGeometry(.28, .55, 6); c2.translate(0, .9, 0); return mergeColored([[t, '#5b3f28'], [c1, '#2f6b3a'], [c2, '#3a7d44']]); }
    }
  }
  function mergeColored(parts) {
    const geos = parts.map(([g, c]) => { const n = g.toNonIndexed(), col = C(c), a = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b; } n.setAttribute('color', new THREE.BufferAttribute(a, 3)); n.deleteAttribute('uv'); return n; });
    const out = new THREE.BufferGeometry(), keys = ['position', 'normal', 'color'];
    for (const k of keys) { const tot = geos.reduce((s, g) => s + g.attributes[k].array.length, 0), arr = new Float32Array(tot); let o = 0; for (const g of geos) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(arr, 3)); }
    return out;
  }
  function scatter(T, s, rand, o) {
    const n = s.n || 100, geo = propGeo(s.shape), mat = s.material || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: s.flat !== false });
    const im = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const [a, b] = s.scale ? (Array.isArray(s.scale) ? s.scale : [s.scale, s.scale]) : [.7, 1.3], minH = s.minH != null ? s.minH : .05, maxH = s.maxH != null ? s.maxH : .7, area = s.area || [T.W * .95, T.D * .95];
    const placed = [];
    let k = 0, tries = 0;
    while (k < n && tries++ < n * 40) {
      const x = (rand() - .5) * area[0], z = (rand() - .5) * area[1], y = T.yAt(x, z), h = y / T.H;
      if (h < minH || h > maxH) continue;
      if (s.water != null && h < s.water) continue;
      const e2 = .25, sl = Math.hypot(T.yAt(x + e2, z) - T.yAt(x - e2, z), T.yAt(x, z + e2) - T.yAt(x, z - e2)) / (2 * e2);
      if (sl > (s.maxSlope != null ? s.maxSlope : .9)) continue;
      if (s.where && !s.where(x, z, h, sl)) continue;
      const k2 = a + (b - a) * rand(); e.set(0, rand() * Math.PI * 2, 0); q.setFromEuler(e); v.set(x, y - .02, z); sc.set(k2, k2 * (s.stretch ? .8 + rand() * .5 : 1), k2);
      m4.compose(v, q, sc); im.setMatrixAt(k, m4); placed.push({ x, y, z, s: k2, i: k, r: rand() }); k++;
    }
    im.count = k; im.castShadow = !!o.shadows; im.receiveShadow = !!o.shadows; im.instanceMatrix.needsUpdate = true; im.userData.placed = placed;
    return im;
  }
  function terrain(o = {}) {
    const mod = { o };
    mod.setup = async ctx => {
      const { scene, load } = ctx;
      let hf;
      if (o.heightmap) { const im = await load.image(o.heightmap), c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); hf = imageField(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, o.size || 24); }
      else hf = heightField({ ...o, type: o.type || 'mountains' });
      const T = mod.T = build(o, hf); mod.heightAt = T.yAt; mod.size = [T.W, T.D]; mod.H = T.H;
      const group = mod.group = new THREE.Group(); scene.add(group);
      const mat = material(o, true);
      if (o.contours) {
        const ct = o.contours === true ? {} : o.contours, every = ct.every || T.H / 10, cc = C(ct.color || '#3a2f25'), w = ct.width || 1;
        mat.onBeforeCompile = sh => { sh.uniforms.uEvery = { value: every }; sh.uniforms.uCC = { value: cc }; sh.uniforms.uCW = { value: w };
          sh.vertexShader = 'varying float vH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vH = (modelMatrix * vec4(transformed, 1.)).y;');
          sh.fragmentShader = 'varying float vH; uniform float uEvery, uCW; uniform vec3 uCC;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n { float f = vH / uEvery; float d = abs(fract(f - .5) - .5) / fwidth(f); gl_FragColor.rgb = mix(uCC, gl_FragColor.rgb, clamp(d / uCW, 0., 1.)); }'); };
      }
      const mesh = mod.mesh = new THREE.Mesh(T.geo, mat); mesh.receiveShadow = !!o.shadows; mesh.castShadow = !!o.shadows; group.add(mesh);
      if (o.block) { const sk = mod.skirt = skirt(o, T); group.add(sk); }
      if (o.water) {
        const w = o.water === true ? {} : o.water, lvl = (w.level != null ? w.level : .15) * T.H;
        const wm = new THREE.MeshStandardMaterial({ color: C(w.color || '#3d7fa6'), roughness: w.roughness != null ? w.roughness : .25, metalness: 0, transparent: true, opacity: w.opacity != null ? w.opacity : .82, flatShading: !!o.flat });
        const wg = o.block ? new THREE.BoxGeometry(T.W * .999, lvl + ((o.block && o.block.depth) || T.H * .35 + .4) * .98, T.D * .999) : new THREE.PlaneGeometry(T.W, T.D, 1, 1);
        if (o.block) wg.translate(0, (lvl - ((o.block && o.block.depth) || T.H * .35 + .4) * .98) / 2, 0); else wg.rotateX(-Math.PI / 2);
        const wmsh = mod.water = new THREE.Mesh(wg, wm); if (!o.block) wmsh.position.y = lvl; wmsh.receiveShadow = !!o.shadows; group.add(wmsh); mod.waterLevel = lvl;
      }
      const rand = mulberry32(o.seed || 1); mod.props = [];
      for (const s of [].concat(o.scatter || [])) { const im = scatter(T, { water: o.water ? ((o.water.level != null ? o.water.level : .15) + .02) : null, ...s }, rand, o); group.add(im); mod.props.push(im); }
      if (o.position) group.position.set(...o.position);
      if (o.lights !== false) { const hl = new THREE.HemisphereLight(0xffffff, C(o.ground || '#6b5a44'), o.ambient != null ? o.ambient : 1.1); const dl = mod.sun = new THREE.DirectionalLight(0xffffff, o.sun != null ? o.sun : 2.2); dl.position.set(...(o.sunDir || [-.5, 1, .35]).map(v => v * T.W)); group.add(hl, dl, dl.target); }
    };
    mod.update = (t, info) => {
      if (o.grow) { const g = o.grow, p = getEase(g.ease || 'outCubic')(Math.min(1, Math.max(0, (t - (g.t || 0)) / (g.d || 1.5)))); mod.mesh.scale.y = Math.max(1e-3, p); if (mod.skirt) mod.skirt.scale.y = 1; for (const im of mod.props) im.visible = p > .98; }
      if (mod.water && o.water && o.water.bob) mod.water.position.y = (o.block ? 0 : mod.waterLevel) + Math.sin(t * 1.3) * o.water.bob;
      if (o.animate) o.animate(t, mod, info);
    };
    return mod;
  }
  /* ---------------- globe ---------------- */
  let landCache = null;
  async function landRings(load) { if (!landCache) landCache = load.json(new URL('vendor/naturalearth/land-110m.json', env.base).href).then(j => j.rings); return landCache; }
  function earthCanvas(rings, o) {
    const w = o.texSize || 2048, h = w / 2, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const ocean = o.ocean || '#24496b', land = o.land || '#d7cba8';
    const og = g.createLinearGradient(0, 0, 0, h); og.addColorStop(0, o.oceanPole || ocean); og.addColorStop(.5, ocean); og.addColorStop(1, o.oceanPole || ocean); g.fillStyle = og; g.fillRect(0, 0, w, h);
    const X = lon => (lon + 180) / 360 * w, Y = lat => (90 - lat) / 180 * h;
    g.fillStyle = land; g.strokeStyle = o.coast || 'rgba(0,0,0,.35)'; g.lineWidth = o.coastWidth || 1.2; g.lineJoin = 'round';
    for (const r of rings) { g.beginPath(); for (let i = 0; i < r.length; i += 2) { const x = X(r[i]), y = Y(r[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); g.fill(); if (o.coast !== false) g.stroke(); }
    if (o.graticule) { g.strokeStyle = o.graticule === true ? 'rgba(255,255,255,.18)' : o.graticule; g.lineWidth = 1; for (let lo = -180; lo <= 180; lo += 30) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), h); g.stroke(); } for (let la = -60; la <= 60; la += 30) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(w, Y(la)); g.stroke(); } }
    return c;
  }
  function proceduralCanvas(o) {
    const w = o.texSize || 1024, h = w / 2, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), img = g.createImageData(w, h);
    const hf = heightField({ type: 'fbm', size: 4, seed: o.seed || 3 }), oc = rgbOf(o.ocean || '#24496b'), ld = rgbOf(o.land || '#cdbf8f'), hi = rgbOf(o.high || '#8a7f62');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [px, py, pz] = latLon(90 - y / h * 180, x / w * 360 - 180, 1), v = hf(px * 1.3 + pz * .2, pz * 1.3 + py * 1.1) + py * .0;
      const land = v > (o.sea || .52), k = Math.min(1, (v - .52) * 4), col = land ? ld.map((a, i) => a + (hi[i] - a) * k) : oc, i = (y * w + x) * 4;
      img.data[i] = col[0] * 255; img.data[i + 1] = col[1] * 255; img.data[i + 2] = col[2] * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  }
  function globe(o = {}) {
    const mod = { o };
    mod.setup = async ctx => {
      const { scene, load } = ctx, R = o.radius || 1;
      let tex;
      if (o.texture && o.texture !== 'earth' && o.texture !== 'procedural') tex = typeof o.texture === 'string' ? await load.texture(o.texture) : o.texture;
      else { const cv = o.texture === 'procedural' ? proceduralCanvas(o) : earthCanvas(await landRings(load), o); tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }
      const root = mod.root = new THREE.Group(), spin = mod.spin = new THREE.Group(); root.add(spin); scene.add(root);
      root.rotation.z = -(o.tilt != null ? o.tilt : 0) * D2R;
      const mat = o.material === 'toon' ? new THREE.MeshToonMaterial({ map: tex }) : new THREE.MeshStandardMaterial({ map: tex, roughness: o.roughness != null ? o.roughness : .85, metalness: 0 });
      const ball = mod.ball = new THREE.Mesh(new THREE.SphereGeometry(R, o.segments || 96, (o.segments || 96) / 2), mat); ball.rotation.y = -Math.PI / 2; spin.add(ball);
      if (o.atmosphere !== false) {
        const at = o.atmosphere || {}, ac = C(at.color || '#7fb8ff');
        const am = new THREE.ShaderMaterial({ uniforms: { uC: { value: ac }, uS: { value: at.strength != null ? at.strength : 1.2 }, uP: { value: at.power || 3.5 } }, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
          vertexShader: 'varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
          fragmentShader: 'uniform vec3 uC; uniform float uS, uP; varying vec3 vN, vV; void main(){ float f = pow(clamp(1. - abs(dot(vN, vV)), 0., 1.), uP); float rim = smoothstep(0., .35, -dot(vN, vV) + .35); gl_FragColor = vec4(uC * f * uS * rim, 1.); }' });
        const a = mod.atmo = new THREE.Mesh(new THREE.SphereGeometry(R * (at.size || 1.12), 64, 32), am); root.add(a);
      }
      mod.markers = (o.markers || []).map(m => { const g = new THREE.Mesh(new THREE.SphereGeometry((m.size || .025) * R, 16, 8), new THREE.MeshBasicMaterial({ color: C(m.color || '#ff5a3c') })); g.position.set(...latLon(m.lat, m.lon, R * 1.005)); spin.add(g); return { m, g }; });
      mod.arcs = (o.arcs || []).map(a => { const pts = arcPoints(a.from, a.to, { radius: R * 1.003, height: a.height, n: 96 }).map(p => new THREE.Vector3(...p)); const curve = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(curve, 96, (a.width || .006) * R, 6, false);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C(a.color || '#ffd166') })); spin.add(mesh); return { a, mesh, count: geo.index.count }; });
      if (o.lights !== false) { const dl = new THREE.DirectionalLight(0xffffff, o.sun != null ? o.sun : 2.4); dl.position.set(...(o.sunDir || [-3, 1.5, 4])); const hl = new THREE.HemisphereLight(0xffffff, 0x223344, o.ambient != null ? o.ambient : .6); root.add(dl, hl); }
      if (o.position) root.position.set(...o.position);
    };
    mod.update = (t, info) => {
      mod.spin.rotation.y = ((o.lon0 != null ? -o.lon0 : 0) + (typeof o.spin === 'function' ? o.spin(t) : (o.spin != null ? o.spin : 6) * t)) * D2R;
      for (const { m, g } of mod.markers) { const p = m.at != null ? getEase('outBack')(Math.min(1, Math.max(0, (t - m.at) / .45))) : 1; g.scale.setScalar(Math.max(1e-3, p)); g.visible = p > 0.001; }
      for (const A of mod.arcs) { const a = A.a, p = getEase(a.ease || 'inOutCubic')(Math.min(1, Math.max(0, (t - (a.t || 0)) / (a.d || 1.5)))), tail = a.tail != null ? getEase('inOutCubic')(Math.min(1, Math.max(0, (t - (a.t || 0) - (a.d || 1.5) - a.tail) / (a.d || 1.5)))) : 0;
        const seg = A.count / 96; const s0 = Math.floor(tail * 96) * seg, s1 = Math.floor(p * 96) * seg; A.mesh.geometry.setDrawRange(s0, Math.max(0, s1 - s0)); A.mesh.visible = s1 > s0; }
      if (o.animate) o.animate(t, mod, info);
    };
    return mod;
  }
  return { terrain, globe, propGeo };
}
