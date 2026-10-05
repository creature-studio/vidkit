// Phase B 3D primitives: one recipe/test per module. Pure tests run everywhere; the browser smoke test (every module on
// one page, strict, determinism re-check through vk peek) is skipped when Playwright's Chromium is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expandLook, passParams, needsDepth, LOOKS, PASSES, rgb } from '../src/three/look.js';
import { shapeOf, bounds, SHAPE_NAMES, path as svgPath } from '../src/three/shapes.js';
import { heightField, RAMPS, ramp, latLon, arcPoints, FIELD_TYPES } from '../src/three/terrainmath.js';
import { plateSource, PLATE_NAMES } from '../src/three/plate.js';
import { letterProgress, presetPose, LETTER_PRESETS, FONTS3D } from '../src/three/text3d.js';
import { makeSimCore } from '../src/three/sim.js';
import { mixerTimeline } from '../src/three/mixer.js';
import { DIORAMA_KINDS, PALETTES, prog } from '../src/three/diorama.js';
import { timeshimSource } from '../cli/adopt.mjs';
import { lockEntry, sha256, writeLock, readLock, verifyLock } from '../cli/asset.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VK = path.join(ROOT, 'bin/vk.mjs');
let hasBrowser = true; try { const { chromium } = await import('playwright'); hasBrowser = fs.existsSync(chromium.executablePath()); } catch (e) { hasBrowser = false; }

test('look: presets expand to known passes; overrides and drops; t-functions evaluate', () => {
  for (const [name, passes] of Object.entries(LOOKS)) for (const p of expandLook(name)) assert.ok(PASSES[p.type], `${name}: unknown pass ${p.type}`);
  const ink = expandLook({ preset: 'ink', outline: { width: 3 }, paper: false });
  assert.equal(ink.find(p => p.type === 'outline').width, 3);
  assert.ok(!ink.some(p => p.type === 'paper'));
  assert.deepEqual(expandLook(['toon', { type: 'halftone', size: 6 }]).map(p => p.type), ['toon', 'halftone']);
  assert.equal(passParams({ type: 'pixel', size: t => t * 2 }, 3).size, 6);
  assert.ok(needsDepth(expandLook('ink')));
  assert.deepEqual(rgb('#ff8000').map(x => +x.toFixed(3)), [1, .502, 0]);
  assert.throws(() => expandLook('inkk'), /did you mean.*ink/i);
});

test('shapes: every generator yields a closed outline with finite bounds; SVG path parser', () => {
  for (const n of SHAPE_NAMES) {
    if (n === 'path') continue;
    const s = shapeOf({ shape: n, seed: 3 }), b = bounds(s);
    assert.ok(s.outer.length >= 3, n); for (const k of ['minX', 'maxX', 'minY', 'maxY']) assert.ok(Number.isFinite(b[k]), `${n}.${k}`);
    assert.deepEqual(shapeOf({ shape: n, seed: 3 }), s, `${n} deterministic`);
  }
  const p = shapeOf({ shape: 'path', d: 'M0 0 L2 0 Q2 2 1 3 C0 2 0 1 0 0 Z' }), b = bounds(p);
  assert.ok(b.maxX <= 2 + 1e-9 && b.minY < -2.5 && b.maxY <= 1e-9);   // SVG y-down → flipped (flipY: false keeps it)
  assert.ok(typeof svgPath === 'function');
});

test('terrain math: height fields in [0,1], deterministic, island falls off; ramps; geo helpers', () => {
  for (const type of FIELD_TYPES) {
    const f = heightField({ type, size: 10, seed: 7 });
    for (let i = 0; i < 50; i++) { const x = ((i * 37) % 100) / 10 - 5, z = ((i * 53) % 100) / 10 - 5, v = f(x, z); assert.ok(v >= 0 && v <= 1.0001, `${type} ${v}`); assert.equal(v, heightField({ type, size: 10, seed: 7 })(x, z)); }
  }
  const isl = heightField({ type: 'island', size: 10, seed: 3 }); assert.ok(isl(0, 0) > isl(4.9, 4.9));
  for (const r of Object.keys(RAMPS)) { const c = ramp(r)(.5); assert.equal(c.length, 3); assert.ok(c.every(v => v >= 0 && v <= 1), r); }
  const [x, y, z] = latLon(90, 0, 2); assert.ok(Math.abs(y - 2) < 1e-9 && Math.abs(x) < 1e-9 && Math.abs(z) < 1e-9);
  const arc = arcPoints([0, 0], [0, 90], { n: 16, radius: 1, height: .2 }); assert.equal(arc.length, 17); assert.ok(Math.hypot(...arc[8]) > 1.05);
});

test('shaderPlate: presets compile to a fragment source with the library + map/shade; raw glsl mode', () => {
  for (const n of PLATE_NAMES) { const s = plateSource({ preset: n }); assert.ok(s.fs.length > 500, n); assert.match(s.fs, /void main/); }
  const sdf = plateSource({ sdf: 'float map(vec3 p){ return sdSphere(p, 1.); }' });
  assert.match(sdf.fs, /sdSphere/); assert.match(sdf.fs, /float map/);
  const raw = plateSource({ glsl: 'vec4 image(vec2 uv, vec3 ro, vec3 rd){ return vec4(uv, 0., 1.); }' }); assert.ok(raw.raw);
  assert.throws(() => plateSource({ preset: 'metaball' }), /metaballs/);
});

test('text3d: letter progress staggers, settles, orders; presets settle to identity', () => {
  const s = { preset: 'rise', t: 0, d: 1, stagger: .1 };
  assert.equal(letterProgress(s, 0, 5, 0), 0); assert.equal(letterProgress(s, 4, 5, 2), 1);
  assert.ok(letterProgress(s, 0, 5, .5) > letterProgress(s, 4, 5, .5));
  assert.ok(letterProgress({ ...s, order: 'reverse' }, 4, 5, .5) > letterProgress({ ...s, order: 'reverse' }, 0, 5, .5));
  for (const p of LETTER_PRESETS) { const a = presetPose(p, 1, 1); for (const k of ['dy', 'dz', 'rx', 'ry', 'rz']) assert.ok(!a[k], `${p}.${k}`); assert.ok(a.s == null || Math.abs(a.s - 1) < 1e-9); assert.ok(a.vis); }
  for (const f of Object.values(FONTS3D)) { const j = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); assert.ok(j.glyphs.A && j.resolution, f); }
});

test('sim: seeking from snapshots is bit-identical to a straight run, in any order', () => {
  const o = { dt: 1 / 120, duration: 4, every: .5, init: r => ({ p: Float64Array.from({ length: 64 }, () => r()), v: new Float64Array(64), n: 0 }),
    step: (s, dt) => { for (let i = 0; i < 64; i++) { s.v[i] += (-9.8 - s.v[i] * .1) * dt; s.p[i] += s.v[i] * dt; if (s.p[i] < 0) { s.p[i] = -s.p[i]; s.v[i] *= -.9; } } s.n++; } };
  const mk = () => { let a = 7; return () => (a = (a * 16807) % 2147483647) / 2147483647; };
  const A = makeSimCore(o, mk()).build(), B = makeSimCore(o, mk()).build();
  const seq = [0, .4, 1.1, 2.5, 3.9].map(t => Array.from(A.at(t).p));
  const rnd = [3.9, .4, 2.5, 0, 1.1].map(t => [t, Array.from(B.at(t).p)]);
  for (const [t, p] of rnd) assert.deepEqual(p, seq[[0, .4, 1.1, 2.5, 3.9].indexOf(t)], `t=${t}`);
  assert.equal(A.snapshots.length, 9);
});

test('mixer timeline: cross-fade weights sum to 1, clip times loop / clamp', () => {
  const tl = [{ t: 0, clip: 'Idle' }, { t: 2, clip: 'Walk', fade: .5 }, { t: 4, clip: 'Wave', fade: .4, loop: false }];
  const D = { Idle: 1.5, Walk: 1, Wave: .8 };
  assert.deepEqual(Object.keys(mixerTimeline(tl, 1, D)), ['Idle']);
  const mid = mixerTimeline(tl, 2.25, D); assert.ok(Math.abs(mid.Idle.weight + mid.Walk.weight - 1) < 1e-9); assert.ok(mid.Idle.weight > 0 && mid.Walk.weight > 0);
  assert.ok(Math.abs(mixerTimeline(tl, 1, D).Idle.time - 1) < 1e-9 && Math.abs(mixerTimeline(tl, 2, D).Idle.time - .5) < 1e-9);
  assert.ok(mixerTimeline(tl, 9, D).Wave.time < .8);
  assert.deepEqual(mixerTimeline(tl, 1, D, { Idle: .3, Walk: .7 }).Walk.weight, .7);
});

test('diorama: kinds / palettes / prog', () => {
  assert.deepEqual(DIORAMA_KINDS, ['papercut', 'popup', 'isometric', 'tiltshift']);
  for (const p of Object.values(PALETTES)) assert.ok(p.length >= 4);
  assert.equal(prog({ t: 1, d: 2 }, 0), 0); assert.equal(prog({ t: 1, d: 2 }, 5), 1);
});

test('vk adopt timeshim: frozen clock, hijacked rAF, seeded random, virtual timers in due order', () => {
  const log = [], perf = { now: () => 123456 };
  const ctx = { performance: perf, Date, Math: Object.create(Math), console };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(timeshimSource({ seed: 5, timers: true }), ctx);
  assert.equal(ctx.performance.now(), 0); assert.equal(ctx.Date.now(), Date.UTC(2026, 0, 1));
  vm.runInContext(`requestAnimationFrame(t => log.push('raf ' + t)); setTimeout(() => log.push('t50 ' + performance.now()), 50); setInterval(() => log.push('iv ' + performance.now()), 40);`, Object.assign(ctx, { log }));
  ctx.__advance(100);
  assert.deepEqual(log, ['iv 40', 't50 50', 'iv 80', 'raf 100']);
  assert.equal(new ctx.Date().getTime(), Date.UTC(2026, 0, 1) + 100);
  const r1 = [ctx.Math.random(), ctx.Math.random()];
  const c2 = { performance: { now: () => 0 }, Date, Math: Object.create(Math), console }; c2.window = c2; vm.createContext(c2); vm.runInContext(timeshimSource({ seed: 5 }), c2);
  assert.deepEqual([c2.Math.random(), c2.Math.random()], r1);
});

test('vk asset: lock entries are sorted + verify detects drift', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vk-lock-'));
  try {
    fs.writeFileSync(path.join(dir, 'b.glb'), 'bbb'); fs.writeFileSync(path.join(dir, 'a.glb'), 'aaa');
    let lock = lockEntry(null, 'b', { file: 'b.glb', sha256: sha256(Buffer.from('bbb')) }); lock = lockEntry(lock, 'a', { file: 'a.glb', sha256: sha256(Buffer.from('aaa')) });
    assert.deepEqual(Object.keys(lock.assets), ['a', 'b']); writeLock(dir, lock); assert.deepEqual(readLock(dir), lock);
    assert.deepEqual(verifyLock(dir), []); fs.writeFileSync(path.join(dir, 'a.glb'), 'changed'); assert.match(verifyLock(dir)[0], /a: sha256 drift/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const shipped = path.join(ROOT, 'examples/assets/models');
  if (fs.existsSync(path.join(shipped, 'assets.lock.json'))) assert.deepEqual(verifyLock(shipped), []);
});

test('vk font3d: converts an OFL font subset to typeface JSON', async t => {
  let ok = true; try { await import('opentype.js'); } catch (e) { ok = false; }
  if (!ok) return t.skip('opentype.js not installed');
  const { convert } = await import('../cli/font3d.mjs');
  const { json, missing } = await convert(path.join(ROOT, 'fonts/MaShanZheng-Regular.ttf'), '山水 ');
  assert.ok(json.glyphs['山'] && json.glyphs['水'] && json.glyphs[' ']); assert.deepEqual(missing, []);
  assert.match(json.glyphs['山'].o, /^m /);
});

test('browser: every Phase B module renders strict + deterministic (vk peek --draft)', { skip: !hasBrowser && 'no Chromium' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vk-b-')), page = path.join(dir, 'b.html');
  fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><body>
<script src="${ROOT}/dist/vidkit.js"></script><script src="${ROOT}/dist/vidkit-three.js"></script><script>
const v = vk.video({ fps: 30, transition: 'none', width: 640, height: 360 }), R = vk.three.rig, T3 = vk.three;
const cam = R.orbit({ target: [0, 0, 0], radius: 6, height: 2, from: -10, to: 10, dur: 1 });
vk.scene('look', 1, {}, sc => sc.three(T3.terrain({ type: 'mountains', colors: 'ink', segments: 48, scatter: [{ shape: 'pine', n: 40, maxH: .6 }] }), { camera: cam, post: { look: 'ink' } }));
vk.scene('papercut', 1, {}, sc => sc.three(T3.diorama({ kind: 'papercut', layers: 4 }), { camera: R.orbit({ target: [0, 0, -1], radius: 10, dur: 1 }), look: 'papercut' }));
vk.scene('popup', 1, {}, sc => sc.three(T3.diorama({ kind: 'popup', open: { t: 0, d: .8 } }), { camera: R.orbit({ target: [0, .5, 0], radius: 7, height: 4, dur: 1 }) }));
vk.scene('iso', 1, {}, sc => sc.three(T3.diorama({ kind: 'isometric', trees: 20 }), { camera: T3.diorama.isoRig({ dur: 1 }) }));
vk.scene('plate', 1, {}, sc => sc.three(T3.shaderPlate({ preset: 'metaballs', steps: 48 }), { camera: cam }));
vk.scene('text', 1, {}, sc => sc.three(T3.text3d({ text: 'Vk', in: 'pop' }), { camera: { pos: [0, 0, 5], target: [0, 0, 0] } }));
vk.scene('globe', 1, {}, sc => sc.three(T3.globe({ arcs: [{ from: [31, 121], to: [51, 0], t: 0, d: .8 }] }), { camera: { pos: [0, 0, 5], target: [0, 0, 0] } }));
const S = T3.sim({ duration: 1.2, every: .25, init: () => ({ y: 2, v: 0 }), step: (s, dt) => { s.v -= 9.8 * dt; s.y += s.v * dt; if (s.y < 0) { s.y = 0; s.v *= -.8; } } });
vk.scene('sim', 1, {}, sc => sc.three([S.module({ setup(ctx) { this.m = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(.3), new ctx.THREE.MeshNormalMaterial()); ctx.scene.add(this.m); }, render(st) { this.m.position.y = st.y - 1; } })], { camera: { pos: [0, 0, 5], target: [0, 0, 0] } }));
vk.scene('model', 1, {}, sc => sc.three(T3.model('${ROOT}/examples/assets/models/robot.glb', { size: 2, timeline: [{ t: 0, clip: 'Idle' }, { t: .5, clip: 'Wave' }] }), { camera: { pos: [0, 1.2, 5], target: [0, 1, 0] } }));
</script>`);
  try {
    const r = spawnSync(process.execPath, [VK, 'peek', page, '--every', '1', '--draft', '--json', '-o', path.join(dir, 'peek')], { cwd: ROOT, encoding: 'utf8', timeout: 240000 });
    const j = JSON.parse(fs.readFileSync(path.join(dir, 'peek', 'peek.json'), 'utf8'));
    const errs = j.issues.filter(i => i.severity === 'error');
    assert.deepEqual(errs, [], r.stdout + r.stderr);
    assert.ok(j.stills.length >= 9);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
