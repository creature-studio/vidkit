// vk studio: composition scan, style detection, safe STORY scene editing, and an HTTP smoke test of the agent API
// (state → seek → frame → lint → scene-source guard). Browser parts are skipped when Playwright's Chromium is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanCompositions, pageStyle, storyBlock, isComposition } from '../cli/studio.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let hasBrowser = true; try { const { chromium } = await import('playwright'); hasBrowser = fs.existsSync(chromium.executablePath()); } catch (e) { hasBrowser = false; }

test('studio: scans compositions and reads the style pack from the vk.video / vk.film call only', () => {
  const comps = scanCompositions(path.join(ROOT, 'examples'));
  const rel = comps.map(c => c.rel);
  assert.ok(rel.includes('reel/reel.html') && rel.includes('three-promo/three-promo.html'));
  assert.ok(!rel.some(r => /(^|\/)(lib|data|assets)\//.test(r)));
  assert.equal(comps.find(c => c.rel === 'three-promo/three-promo.html').three, true);
  assert.equal(pageStyle(`vk.video({ style: 'reel', fps: 30 }); x.particles({ style: 'converge' })`), 'reel');
  assert.equal(pageStyle(`const v = vk.video({ fps: 30 }); sc.three(vk.three.particles({ style: 'converge' }))`), null);
  assert.equal(pageStyle(`const v = vk.film(STORY, { style: ['ink', 'papercut.chars'] });`), 'ink,papercut.chars');
  assert.ok(isComposition('<script>vk.video({})</script>') && !isComposition('<p>hello</p>'));
});

test('studio: STORY block round-trips (strings with braces, </script escapes)', () => {
  const story = { title: 't', scenes: [{ name: 'a', lines: [{ text: 'brace } { "q"' }] }, { name: 'b </script> c' }] };
  const html = `<script>\nconst STORY = ${JSON.stringify(story, null, 1).replace(/<\/script/gi, '<\\/script')};\nconst v = vk.film(STORY, { style: 'ink' });\n</script>`;
  const b = storyBlock(html);
  assert.ok(b); assert.deepEqual(b.story, story);
  assert.equal(html.slice(b.b).trimStart().slice(0, 1), ';');
  assert.equal(storyBlock('<script>const v = vk.video({});</script>'), null);
});

test('studio: HTTP API smoke (state, seek, frame, lint, scene-source guard)', { skip: !hasBrowser && 'no browser', timeout: 120000 }, async () => {
  const p = spawn(process.execPath, [path.join(ROOT, 'bin/vk.mjs'), 'studio', path.join(ROOT, 'examples/agent-test/agent-test.html'), '--port', '0', '--no-open', '--out-dir', fs.mkdtempSync(path.join(os.tmpdir(), 'vks-'))], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const base = await new Promise((res, rej) => { let s = ''; p.stdout.on('data', d => { s += d; const m = s.match(/http:\/\/[\d.]+:\d+/); if (m) res(m[0]); }); p.on('exit', c => rej(new Error('exit ' + c))); setTimeout(() => rej(new Error('no url')), 20000).unref(); });
    const j = (u, b) => fetch(base + u, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {}).then(r => r.json());
    const idx = await j('/api'); assert.ok(idx.endpoints['GET /api/state']);
    const s = await j('/api/state?wait=1');
    assert.match(s.file, /agent-test\.html$/); assert.equal(s.info.fps, 30); assert.ok(s.info.scenes.length >= 2); assert.equal(s.infoSource, 'probe');
    const sk = await j('/api/seek', { scene: 1 });
    assert.equal(sk.scene.index, 1); assert.ok(Math.abs(sk.t - s.info.scenes[1].start - .001) < 1e-3);
    const fr = await j('/api/seek', { frame: 45 }); assert.equal(fr.frame, 45); assert.ok(Math.abs(fr.t - 1.5) < 1e-6);
    const bad = await fetch(base + '/api/seek', { method: 'POST', body: '{"scene":"nope"}' }); assert.equal(bad.status, 500); await bad.text();
    const img = await fetch(base + '/api/frame?t=1.5'); assert.equal(img.headers.get('content-type'), 'image/jpeg'); assert.ok((await img.arrayBuffer()).byteLength > 2000);
    const lint = await j('/api/lint', {}); assert.equal(lint.errors, 0);
    const src = await j('/api/scene-source?index=0'); assert.equal(src.editable, false);
    const w = await fetch(base + '/api/scene-source', { method: 'POST', body: JSON.stringify({ index: 0, scene: {} }) }); assert.equal(w.status, 400); await w.text();
    const ui = await fetch(base + '/__studio/'); assert.match(await ui.text(), /vidkit Studio/);
  } finally { await new Promise(r => { p.once('exit', r); p.kill('SIGTERM'); setTimeout(r, 5000).unref(); }); p.stdout.destroy(); p.stderr.destroy(); }
});

// the studio's Render button runs `vk render`; style-pack pages build after load (styles/boot.mjs), so the default
// beginframe capture must wait for window.__ready to appear instead of reading it right after navigation
test('render: style-pack page (deferred boot) renders through the default beginframe capture', { skip: !hasBrowser && 'no browser', timeout: 120000 }, async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vks-')), 'a.mp4');
  const r = await new Promise(res => { const p = spawn(process.execPath, [path.join(ROOT, 'bin/vk.mjs'), 'render', path.join(ROOT, 'examples/agent-test/agent-test.html'), '-o', out, '--draft', '--from', '0', '--to', '0.3', '--workers', '1'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); let s = ''; p.stdout.on('data', d => s += d); p.stderr.on('data', d => s += d); p.on('close', code => res({ code, s })); });
  assert.equal(r.code, 0, r.s); assert.ok(fs.statSync(out).size > 1000);
});
