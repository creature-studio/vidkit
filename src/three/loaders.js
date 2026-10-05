// Preload helpers handed to setup() as ctx.load. Every load is tracked; the layer (and so window.__ready, i.e. the
// capture) waits for all of them. URLs resolve against the page; built-in assets against the vidkit root.
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '../../vendor/three/examples/jsm/loaders/DRACOLoader.js';
import { HDRLoader } from '../../vendor/three/examples/jsm/loaders/HDRLoader.js';
import { FontLoader } from '../../vendor/three/examples/jsm/loaders/FontLoader.js';
import { makeEnv } from './env.js';

export const BUILTIN = { loft: 'vendor/hdri/studio_loft_1k.hdr' };
export function makeLoader(THREE, renderer, base) {
  const pending = new Set(), cache = new Map();
  const track = p => { pending.add(p); p.then(() => pending.delete(p), () => pending.delete(p)); return p; };
  const abs = u => (BUILTIN[u] ? new URL(BUILTIN[u], base || location.href).href : new URL(u, location.href).href);
  const once = (k, f) => { if (!cache.has(k)) cache.set(k, track(f())); return cache.get(k); };
  let gltf, hdr, font;
  const L = {
    url: abs,
    // glTF / GLB (Draco-compressed meshes decode with the bundled decoder in vendor/three/…/libs/draco/gltf/)
    gltf(u) {
      if (!gltf) { gltf = new GLTFLoader(); const d = new DRACOLoader(); d.setDecoderPath(new URL('vendor/three/examples/jsm/libs/draco/gltf/', base || location.href).href); d.setDecoderConfig({ type: 'wasm' }); gltf.setDRACOLoader(d); }
      return once('g:' + abs(u), () => new Promise((res, rej) => gltf.load(abs(u), res, undefined, e => rej(new Error('[vk.three] gltf ' + u + ': ' + (e && e.message || e))))));
    },
    // equirectangular HDR (RGBE) → DataTexture (linear, half float)
    hdr(u) { if (!hdr) hdr = new HDRLoader(); return once('h:' + abs(u), () => new Promise((res, rej) => hdr.load(abs(u), t => { t.mapping = THREE.EquirectangularReflectionMapping; res(t); }, undefined, e => rej(new Error('[vk.three] hdr ' + u))))); },
    // prefiltered (PMREM) environment: 'studio' | 'room' | 'loft' | url.hdr | {procedural studio options} | equirect texture
    env(spec = 'studio', o = {}) { const key = 'e:' + (typeof spec === 'string' ? spec : JSON.stringify(spec && !spec.isTexture ? spec : spec && spec.uuid)) + JSON.stringify(o); return once(key, () => makeEnv(THREE, renderer, spec, o, u => L.hdr(u))); },
    texture(u, o = {}) {
      return once('t:' + abs(u) + (o.srgb === false ? ':lin' : ''), () => new Promise((res, rej) => new THREE.TextureLoader().load(abs(u), t => { t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, () => rej(new Error('[vk.three] texture ' + u)))));
    },
    image(u) { return once('i:' + abs(u), () => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => (im.decode ? im.decode().catch(() => { }) : Promise.resolve()).then(() => res(im)); im.onerror = () => rej(new Error('[vk.three] image ' + u)); im.src = abs(u); })); },
    // typeface JSON (FontLoader, for TextGeometry) — or a CSS font spec ('900 80px Archivo') to wait for a web font
    font(u) {
      if (/\.json(\?|$)/.test(u)) { if (!font) font = new FontLoader(); return once('f:' + abs(u), () => new Promise((res, rej) => font.load(abs(u), res, undefined, () => rej(new Error('[vk.three] font ' + u))))); }
      return once('c:' + u, () => document.fonts.load(u, 'Aa中0').then(() => document.fonts.ready));
    },
    json(u) { return once('j:' + abs(u), () => fetch(abs(u)).then(r => { if (!r.ok) throw new Error('[vk.three] json ' + u); return r.json(); })); },
    // wait until every load started so far (and any started while waiting) has settled
    async idle() { while (pending.size) await Promise.all([...pending]); },
  };
  return L;
}
// opts.assets {name: url | {url, type}} → {name: loaded}; type from the extension: glb/gltf → gltf, hdr → hdr texture,
// png/jpg/webp → texture (type 'image' → HTMLImageElement), json → json; 'env:studio' / 'env:loft' → PMREM env
export function loadAssets(L, assets) {
  if (!assets) return Promise.resolve({});
  const E = Object.entries(assets).map(([k, v]) => {
    const u = typeof v === 'string' ? v : v.url, type = (typeof v === 'object' && v.type) || (/^env:/.test(u) ? 'env' : (/\.(\w+)(\?.*)?$/.exec(u) || [])[1]);
    const t = String(type).toLowerCase();
    const p = t === 'env' ? L.env(u.replace(/^env:/, '')) : t === 'glb' || t === 'gltf' ? L.gltf(u) : t === 'hdr' ? L.hdr(u) : t === 'image' ? L.image(u) : t === 'json' ? L.json(u) : t === 'font' ? L.font(u) : L.texture(u, typeof v === 'object' ? v : {});
    return p.then(x => [k, x]);
  });
  return Promise.all(E).then(Object.fromEntries);
}
