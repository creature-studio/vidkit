// Capture pipeline + static layer cache: scheduler / flag logic (pure) and a small browser round-trip (skipped when
// chrome-headless-shell is not installed).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { makeScheduler, defaultWorkers, toSRT } from '../cli/render.mjs';
import { captureFlags, resolveMode, openWorker, GPU_ARGS } from '../cli/capture.mjs';
import { headlessShellPath } from '../cli/cdp.mjs';
import { startServer, pageUrl, launch, probeInfo } from '../cli/lib.mjs';
import { imgCompare } from '../scripts/compare-capture.mjs';
import { filterRegion, collectRefs } from '../src/runtime/bake.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function drain(total, workers, chunk, order) {
  const s = makeScheduler(total, workers, chunk), seen = new Uint8Array(total), jobs = [];
  const live = new Set([...Array(workers).keys()]);
  let i = 0;
  while (live.size) {
    const w = order ? order(i++, [...live]) : [...live][i++ % live.size];
    const j = s.take(w);
    if (!j) { live.delete(w); continue; }
    assert.ok(j[0] < j[1] && j[1] - j[0] <= Math.max(chunk, 1), `chunk ${j} too big`);
    for (let f = j[0]; f < j[1]; f++) { assert.equal(seen[f], 0, `frame ${f} handed out twice`); seen[f] = 1; }
    jobs.push(j);
  }
  assert.equal(seen.reduce((a, b) => a + b, 0), total, 'every frame exactly once');
  return jobs;
}
test('scheduler: every frame exactly once, chunks bounded, for many shapes', () => {
  for (const [total, workers, chunk] of [[3792, 8, 60], [600, 8, 60], [7, 8, 60], [1, 3, 5], [100, 1, 100], [1000, 7, 13], [0, 4, 10]]) drain(total, workers, chunk);
});
test('scheduler: a fast worker steals work from slow lanes (work stealing)', () => {
  // worker 0 is 10x faster than the others: it must end up rendering far more than its 1/4 lane
  let n0 = 0; const s = makeScheduler(4000, 4, 50), seen = new Uint8Array(4000);
  const busy = [0, 0, 0, 0]; let done = [false, false, false, false];
  for (let tick = 0; !done.every(Boolean); tick++) for (let w = 0; w < 4; w++) {
    if (done[w] || busy[w] > tick) continue;
    const j = s.take(w); if (!j) { done[w] = true; continue; }
    for (let f = j[0]; f < j[1]; f++) { assert.equal(seen[f], 0); seen[f] = 1; }
    busy[w] = tick + (w === 0 ? 1 : 10); if (w === 0) n0 += j[1] - j[0];
  }
  assert.equal(seen.reduce((a, b) => a + b, 0), 4000);
  assert.ok(n0 > 2000, `fast worker rendered ${n0}`);
});
test('scheduler: segments within a lane are contiguous and ascending', () => {
  const s = makeScheduler(300, 3, 30);
  const a = s.take(0), b = s.take(0);
  assert.deepEqual(a, [0, 30]); assert.deepEqual(b, [30, 60]);
  assert.deepEqual(s.take(1), [100, 130]);
});
test('defaultWorkers: all cores for beginframe, ≤4 and < cores for screenshot', () => {
  assert.equal(defaultWorkers('beginframe', 8), 8);
  assert.equal(defaultWorkers('beginframe', 1), 1);
  assert.equal(defaultWorkers('screenshot', 8), 4);
  assert.equal(defaultWorkers('screenshot', 2), 1);
  assert.ok(defaultWorkers('screenshot', 1) >= 1);
});
test('captureFlags: begin-frame switches only for beginframe; gpu profiles', () => {
  const bf = captureFlags('beginframe'), ss = captureFlags('screenshot');
  assert.ok(bf.includes('--enable-begin-frame-control') && bf.includes('--run-all-compositor-stages-before-draw'));
  assert.ok(bf.includes('--disable-gpu-compositing'), 'beginframe defaults to software compositing');
  assert.ok(!ss.includes('--enable-begin-frame-control'));
  assert.ok(!ss.includes('--disable-gpu-compositing'), 'screenshot keeps the old SwiftShader GL path');
  assert.deepEqual(captureFlags('screenshot', 'off').filter(f => GPU_ARGS.off.includes(f)), GPU_ARGS.off);
  assert.throws(() => captureFlags('beginframe', 'metal'), /unknown --gpu/);
  assert.throws(() => resolveMode('webcodecs'), /unknown --capture/);
  assert.equal(resolveMode('screenshot'), 'screenshot');
});
test('toSRT unchanged', () => {
  assert.equal(toSRT([[0, 1.5, 'a'], [2, 3, 'b']]), '1\n00:00:00,000 --> 00:00:01,500\na\n\n2\n00:00:02,000 --> 00:00:03,000\nb\n');
});

// --- tiny DOM stand-ins for the bake helpers ---
const fakeEl = (attrs, kids = [], id) => {
  const el = { id, attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })), getAttribute: k => (k in attrs ? attrs[k] : null), kids };
  el.querySelectorAll = () => { const out = []; const walk = e => e.kids.forEach(k => { out.push(k); walk(k); }); walk(el); return out; };
  el.contains = x => x === el || el.querySelectorAll().includes(x);
  return el;
};
test('filterRegion: objectBoundingBox defaults (-10%/120%), explicit %, userSpaceOnUse', () => {
  const b = { x: 10, y: 20, width: 100, height: 50 };
  assert.deepEqual(filterRegion(fakeEl({}), b), { x: 0, y: 15, width: 120, height: 60 });
  assert.deepEqual(filterRegion(null, b), { x: 0, y: 15, width: 120, height: 60 });
  const r = filterRegion(fakeEl({ x: '-50%', y: '0', width: '200%', height: '1' }), b);
  assert.deepEqual(r, { x: -40, y: 20, width: 200, height: 50 });
  assert.deepEqual(filterRegion(fakeEl({ filterUnits: 'userSpaceOnUse', x: '0', y: '0', width: '640', height: '360' }), b), { x: 0, y: 0, width: 640, height: 360 });
});
test('collectRefs: url(#id) and href="#id", recursive through defs, ignores refs inside the root', () => {
  const noise = fakeEl({}, [], 'noise');
  const grad = fakeEl({ href: '#noise' }, [], 'grad');
  const filt = fakeEl({}, [fakeEl({ style: 'fill:url("#grad")' })], 'rough');
  const inner = fakeEl({}, [], 'inner');
  const root = fakeEl({}, [fakeEl({ filter: 'url(#rough)' }), inner, fakeEl({ 'clip-path': 'url(#inner)' }), fakeEl({ mask: 'url(#missing)' })]);
  const byId = { noise, grad, rough: filt, inner };
  const doc = { getElementById: id => byId[id] || null };
  const refs = collectRefs(root, doc);
  assert.deepEqual(new Set(refs.map(r => r.id)), new Set(['rough', 'grad', 'noise']));
});

// --- browser round-trip ---
const hasShell = !!headlessShellPath();
test('beginframe capture + static layer cache on a filter-heavy fixture', { skip: !hasShell && 'chrome-headless-shell not installed', timeout: 120000 }, async () => {
  const { server, port } = await startServer();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vk-test-'));
  try {
    const abs = path.join(ROOT, 'test/fixtures/bake.html');
    const b = await launch(); const info = await probeInfo(b, pageUrl(port, abs, { render: '1', cache: '0' })); await b.close();
    assert.deepEqual(info.size, { width: 640, height: 360 });
    const errs = [], opts = { type: 'png', onError: e => errs.push(e), onLog: () => { } };
    const on = await openWorker('beginframe', pageUrl(port, abs, { render: '1' }), info, opts);
    const off = await openWorker('beginframe', pageUrl(port, abs, { render: '1', cache: '0' }), info, opts);
    const old = await openWorker('screenshot', pageUrl(port, abs, { render: '1', cache: '0' }), info, opts);
    try {
      const st = await on.evaluate(() => window.__bake);
      assert.equal(st.on, true); assert.ok(st.baked >= 1, 'svg[data-vk-bake] baked');
      assert.equal(await on.evaluate(() => document.querySelectorAll('svg[data-vk-bake] image').length), 1);
      assert.equal((await off.evaluate(() => window.__bake)).baked, 0);
      const shots = {};
      for (const [name, w] of Object.entries({ on, off, old })) for (const t of [0.5, 1.2]) {
        await w.seek(t); const buf = await w.frame('png'); const f = path.join(tmp, `${name}_${t}.png`); fs.writeFileSync(f, buf); shots[`${name}_${t}`] = f;
      }
      // determinism: seeking back reproduces the same pixels
      await on.seek(0.5); const again = await on.frame('png');
      assert.ok(again.equals(fs.readFileSync(shots['on_0.5'])), 'same t → identical frame');
      for (const t of [0.5, 1.2]) {
        const bake = await imgCompare(shots[`on_${t}`], shots[`off_${t}`]);
        const cap = await imgCompare(shots[`off_${t}`], shots[`old_${t}`]);
        assert.ok(bake.ssim >= 0.99, `bake vs live SSIM ${bake.ssim} @${t}`);
        assert.ok(cap.ssim >= 0.99, `beginframe vs screenshot SSIM ${cap.ssim} @${t}`);
      }
      const diff = await imgCompare(shots['on_0.5'], shots['on_1.2']);
      assert.ok(diff.ssim < 0.999, 'frames at different t differ (moving element rendered)');
      assert.deepEqual(errs, []);
    } finally { await Promise.all([on.close(), off.close(), old.close()]); }
  } finally { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
});
