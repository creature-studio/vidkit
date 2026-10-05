// vk asset add <url|file.glb|file.gltf> [--name id] [--dir examples/assets/models] [--draco | --meshopt | --raw]
//              [--licence CC0-1.0] [--author "…"] [--source url] [--no-thumb] [--no-weld]
// Bring a 3D model into the project the reproducible way: optimise with glTF-Transform (dedup, prune, resample
// animation, then EXT_meshopt_compression (default) or KHR_draco_mesh_compression), write <dir>/<name>.glb, record
// it in <dir>/assets.lock.json (source, licence, author, sha256 + bytes of source and output, compression, clips),
// and render a turntable contact sheet <dir>/<name>.thumb.png. vk.three loads both compressions (decoders are vendored).
// vk asset list [--dir …]   ·   vk asset verify [--dir …]   (re-hash every locked file; exit 1 on drift)
// Needs the optional dependencies @gltf-transform/{core,extensions,functions} + meshoptimizer (+ draco3dgltf for --draco).
import crypto from 'node:crypto';
import { parseArgs, fs, path, os, run, ROOT } from './lib.mjs';

export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
export const LOCK = 'assets.lock.json';
// pure: merge one entry into a lock object (sorted keys → stable diffs)
export function lockEntry(lock, name, entry) {
  const assets = { ...((lock && lock.assets) || {}), [name]: entry };
  return { version: 1, note: 'written by vk asset add — sha256 of the optimised file; verify with vk asset verify', assets: Object.fromEntries(Object.keys(assets).sort().map(k => [k, assets[k]])) };
}
export function readLock(dir) { const f = path.join(dir, LOCK); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { version: 1, assets: {} }; }
export function writeLock(dir, lock) { fs.writeFileSync(path.join(dir, LOCK), JSON.stringify(lock, null, 2) + '\n'); }
export function verifyLock(dir) {
  const lock = readLock(dir), bad = [];
  for (const [name, e] of Object.entries(lock.assets || {})) {
    const f = path.join(dir, e.file);
    if (!fs.existsSync(f)) { bad.push(`${name}: missing ${e.file}`); continue; }
    const h = sha256(fs.readFileSync(f)); if (h !== e.sha256) bad.push(`${name}: sha256 drift (${h.slice(0, 12)} ≠ ${e.sha256.slice(0, 12)})`);
  }
  return bad;
}

async function deps(draco) {
  try {
    const core = await import('@gltf-transform/core'), ext = await import('@gltf-transform/extensions'), fn = await import('@gltf-transform/functions'), mo = await import('meshoptimizer');
    const d = { 'meshopt.decoder': mo.MeshoptDecoder, 'meshopt.encoder': mo.MeshoptEncoder };
    await mo.MeshoptDecoder.ready; await mo.MeshoptEncoder.ready;
    const dr = await import('draco3dgltf').then(m => m.default || m).catch(() => null);
    if (dr) { d['draco3d.decoder'] = await dr.createDecoderModule(); if (draco) d['draco3d.encoder'] = await dr.createEncoderModule(); }
    else if (draco) throw new Error('--draco needs the optional dependency draco3dgltf');
    return { core, ext, fn, io: new core.NodeIO(fetch).setAllowNetwork(true).registerExtensions(ext.ALL_EXTENSIONS).registerDependencies(d) };
  } catch (e) { if (/draco3dgltf/.test(e.message)) throw e; throw new Error('vk asset needs the optional dependencies: npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer draco3dgltf (' + e.message + ')'); }
}

async function thumb(glb, out) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vk-asset-')), page = path.join(tmp, 'thumb.html');
  fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script src="${path.join(ROOT, 'dist/vidkit.js')}"></script><script src="${path.join(ROOT, 'dist/vidkit-three.js')}"></script>
<script>
const v = vk.video({ fps: 30, width: 640, height: 640, transition: 'none' });
vk.scene('turntable', 4, { bg: '#e9e5de' }, sc => sc.three(vk.three.model(${JSON.stringify(glb)}, { size: 2, ground: { color: '#d8d2c8' }, spin: 90 }),
  { background: 0xe9e5de, camera: { pos: [0, 1.6, 4.6], target: [0, .95, 0], fov: 35 }, env: 'studio' }));
</script></body></html>`);
  try { await run(process.execPath, [path.join(ROOT, 'bin/vk.mjs'), 'contact', page, '-o', out, '--times', '0.2,1.2,2.2,3.2', '--cols', '4']); }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

export default async function asset(argv) {
  const opt = parseArgs(argv, ['draco', 'meshopt', 'raw', 'no-thumb', 'no-weld']), [sub, src] = opt._;
  const dir = path.resolve(opt.dir || 'examples/assets/models');
  if (sub === 'list') { const l = readLock(dir); for (const [n, e] of Object.entries(l.assets)) console.log(`${n.padEnd(18)} ${e.file.padEnd(22)} ${(e.bytes / 1024).toFixed(0).padStart(6)} KB  ${e.compression.padEnd(7)} ${e.licence}  ${e.source}`); return; }
  if (sub === 'verify') { const bad = verifyLock(dir); if (bad.length) { bad.forEach(b => console.log('  ✗ ' + b)); process.exitCode = 1; } else console.log(`[vk asset] ${Object.keys(readLock(dir).assets).length} asset(s) match ${path.relative(process.cwd(), path.join(dir, LOCK))}`); return; }
  if (sub !== 'add' || !src) { console.log('usage: vk asset add <url|file.glb|file.gltf> [--name id] [--dir examples/assets/models] [--draco|--raw] [--licence id] [--author …] [--source url] [--no-thumb]\n       vk asset list | verify [--dir …]'); process.exitCode = sub ? 1 : 0; return; }
  const isUrl = /^https?:\/\//.test(src), name = (opt.name || path.basename(src.split('?')[0]).replace(/\.(glb|gltf)$/i, '')).replace(/[^\w.-]+/g, '-');
  const comp = opt.raw ? 'none' : opt.draco ? 'draco' : 'meshopt';
  const { fn, io } = await deps(comp === 'draco');
  const t0 = Date.now();
  let srcBuf;
  if (isUrl) { const r = await fetch(src); if (!r.ok) throw new Error(`download failed: ${r.status} ${src}`); srcBuf = Buffer.from(await r.arrayBuffer()); }
  else srcBuf = fs.readFileSync(path.resolve(src));
  const doc = isUrl ? (/\.glb(\?|$)/i.test(src) || srcBuf.slice(0, 4).toString() === 'glTF' ? await io.readBinary(new Uint8Array(srcBuf)) : await io.read(src)) : await io.read(path.resolve(src));
  const steps = [fn.dedup(), fn.prune(), fn.resample()];
  if (!opt.noWeld) steps.push(fn.weld());
  if (comp === 'meshopt') steps.push(fn.meshopt({ encoder: (await import('meshoptimizer')).MeshoptEncoder, level: 'medium' }));
  if (comp === 'draco') steps.push(fn.draco({ method: 'edgebreaker' }));
  await doc.transform(...steps);
  fs.mkdirSync(dir, { recursive: true });
  const file = name + '.glb', out = await io.writeBinary(doc), outBuf = Buffer.from(out);
  fs.writeFileSync(path.join(dir, file), outBuf);
  const root = doc.getRoot(), clips = root.listAnimations().map(a => a.getName());
  let verts = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'); if (a) verts += a.getCount(); }
  if (!opt.licence && !opt.license) console.log('  ! no --licence given: recorded as UNKNOWN — check the source before shipping');
  const entry = { file, source: opt.source || (isUrl ? src : path.basename(src)), licence: opt.licence || opt.license || 'UNKNOWN', author: opt.author || '', sha256: sha256(outBuf), bytes: outBuf.length,
    sourceSha256: sha256(srcBuf), sourceBytes: srcBuf.length, compression: comp, meshes: root.listMeshes().length, vertices: verts, clips, thumb: opt.noThumb ? null : name + '.thumb.png' };
  writeLock(dir, lockEntry(readLock(dir), name, entry));
  console.log(`[vk asset] ${name}: ${(srcBuf.length / 1024).toFixed(0)} KB → ${(outBuf.length / 1024).toFixed(0)} KB (${comp}) · ${verts} verts · clips: ${clips.join(', ') || '—'} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  wrote ${path.relative(process.cwd(), path.join(dir, file))} + ${path.relative(process.cwd(), path.join(dir, LOCK))}`);
  if (!opt.noThumb) { const th = path.join(dir, name + '.thumb.png'); await thumb(path.join(dir, file), th); console.log(`  thumb ${path.relative(process.cwd(), th)}`); }
}
