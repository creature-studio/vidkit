// Disk cache for expensive, deterministic vk.three start-up work (PMREM environments, particle targets), shared by
// every capture worker of a `vk render` / `vk peek` run and across runs. The CLI's static server answers
//   GET/PUT /__vk/cache/<key>   (files in $VK_CACHE_DIR or ~/.cache/vidkit)
// Keys are content hashes of everything the result depends on (inputs, the generating code, three.js revision, GL
// renderer string), so a stale entry is never read. Without the CLI server (file://, other servers) every lookup
// misses and the work is done as before; ?cache3d=0 turns it off. Values: [u32 header length][JSON header][arrays].
const Q = new URLSearchParams(location.search);
const ON = Q.get('cache3d') !== '0' && /^https?:$/.test(location.protocol);
let alive = null;   // first miss tells whether the endpoint exists (404 with x-vk-cache header) — otherwise stop asking
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h.toString(16).padStart(8, '0'); };
export async function cacheKey(obj) {
  const s = JSON.stringify(obj, (k, v) => (typeof v === 'function' ? 'fn:' + v.toString() : v));
  try { const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); return [...b.slice(0, 16)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { return fnv(s) + fnv(s.split('').reverse().join('')) + s.length.toString(16); }
}
// hash of raw bytes (raster masks): SHA-256 when available
export async function bytesKey(u8) {
  try { const b = new Uint8Array(await crypto.subtle.digest('SHA-256', u8)); return [...b.slice(0, 16)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 2166136261; for (let i = 0; i < u8.length; i++) h = Math.imul(h ^ u8[i], 16777619) >>> 0; return h.toString(16) + ':' + u8.length; }
}
const TYPES = { Float32Array, Uint16Array, Uint8Array, Uint32Array, Int32Array };
export async function cacheGet(key) {
  if (!ON || alive === false) return null;
  try {
    const r = await fetch('/__vk/cache/' + key, { cache: 'no-store' });
    if (!r.ok) { if (!r.headers.get('x-vk-cache')) alive = false; return null; }
    alive = true;
    const buf = await r.arrayBuffer(), n = new DataView(buf).getUint32(0, true);
    const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
    let off = (4 + n + 7) & ~7; const arrays = {};
    for (const a of head.arrays) { const T = TYPES[a.type]; arrays[a.name] = new T(buf.slice(off, off + a.bytes)); off = (off + a.bytes + 7) & ~7; }
    return { meta: head.meta, arrays };
  } catch (e) { return null; }
}
export function cachePut(key, meta, arrays) {
  if (!ON || alive === false) return;
  const enc = new TextEncoder().encode(JSON.stringify({ meta, arrays: Object.entries(arrays).map(([name, a]) => ({ name, type: a.constructor.name, bytes: a.byteLength })) }));
  let size = (4 + enc.length + 7) & ~7; for (const a of Object.values(arrays)) size = (size + a.byteLength + 7) & ~7;
  const out = new Uint8Array(size); new DataView(out.buffer).setUint32(0, enc.length, true); out.set(enc, 4);
  let off = (4 + enc.length + 7) & ~7; for (const a of Object.values(arrays)) { out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), off); off = (off + a.byteLength + 7) & ~7; }
  fetch('/__vk/cache/' + key, { method: 'PUT', body: out }).catch(() => { });
}
