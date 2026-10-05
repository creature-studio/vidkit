// Phase A agent infrastructure: names / did-you-mean, static lint, registry metadata + generated docs, strict mode in
// the browser, vk list / vk lint / vk peek CLIs. Browser tests are skipped when Playwright's Chromium is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lev, suggest } from '../src/core/names.js';
import { unknownMessage } from '../src/core/strict.js';
import { lintSource, lintPage, registeredNames, RULES } from '../cli/lintcore.mjs';
import { param } from '../src/meta/schemas.js';
import { startServer, pageUrl, launch } from '../cli/lib.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VK = path.join(ROOT, 'bin/vk.mjs');
const vk = (...args) => spawnSync(process.execPath, [VK, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
let hasBrowser = true; try { const { chromium } = await import('playwright'); hasBrowser = fs.existsSync(chromium.executablePath()); } catch (e) { hasBrowser = false; }

test('names: Levenshtein + did-you-mean', () => {
  assert.equal(lev('kitten', 'sitting'), 3); assert.equal(lev('', 'abc'), 3); assert.equal(lev('same', 'same'), 0);
  assert.deepEqual(suggest('letterz', ['letters', 'words', 'fade']).slice(0, 1), ['letters']);
  assert.ok(suggest('push-lft', ['push-left', 'push-right', 'iris']).includes('push-left'));
  const m = unknownMessage('fx', 'letterz', ['letters', 'words']);
  assert.match(m, /unknown fx "letterz"/); assert.match(m, /did you mean "letters"/);
});

test('lint: flags wall-clock / random / timers / THREE.Clock / mixer.update in render closures, with lines', () => {
  const src = [
    'const v = vk.video({});',                                   // 1
    'vk.scene("a", 3, sc => {',                                  // 2
    '  sc.on(local => { el.style.opacity = Math.random(); });', // 3
    '  sc.canvas((g, t) => { const n = Date.now(); requestAnimationFrame(() => {}); });',   // 4
    '  sc.three(({ THREE }) => { const c = new THREE.Clock(); return t => { mixer.update(c.getDelta()); }; });',   // 5
    '  sc.on(local => { el.style.left = vk.hash(3) * 100 + local + "px"; });',   // 6: fine
    '  const r = vk.rand(3); const pts = [r(), r()];',          // 7: fine (setup)
    '});',
  ].join('\n');
  const is = lintSource(src, { file: 'x.js' }), by = r => is.filter(i => i.rule === r);
  assert.deepEqual(by('math-random').map(i => i.line), [3]);
  assert.deepEqual(by('wall-clock').map(i => i.line), [4]);
  assert.deepEqual(by('timer').map(i => i.line), [4]);
  assert.ok(by('three-clock').length >= 1 && by('three-clock').every(i => i.line === 5));
  assert.deepEqual(by('mixer-update').map(i => i.line), [5]);
  assert.ok(!is.some(i => i.line >= 6), 'hash / setup-time rand are fine: ' + JSON.stringify(is.filter(i => i.line >= 6)));
  for (const i of is) assert.ok(RULES[i.rule] && i.hint, 'every issue carries a hint');
});

test('lint: setup-time randomness and top-level timers; vk-lint-ignore; accumulation', () => {
  const ok = lintSource('const r = vk.rand(1); const xs = [...Array(9)].map(() => Math.random());\nvk.scene("a", 2, sc => sc.on(t => { el.x = xs[0] * t; }));');
  assert.ok(!ok.some(i => i.severity === 'error'), JSON.stringify(ok));
  const ig = lintSource('vk.scene("a", 2, sc => sc.on(t => { el.x = Math.random(); // vk-lint-ignore\n }));');
  assert.equal(ig.filter(i => i.rule === 'math-random').length, 0);
  const acc = lintSource('let x = 0;\nvk.scene("a", 2, sc => sc.on(t => { x += 1; el.x = x; }));');
  assert.equal(acc.filter(i => i.rule === 'accumulate').length, 1);
  const top = lintSource('setTimeout(() => {}, 10);');
  assert.equal(top[0].rule, 'timer-toplevel'); assert.equal(top[0].severity, 'warn');
});

test('lint: unknown names with suggestions; plugin-registered names are accepted', () => {
  const names = { fx: ['letters', 'words', 'up'], transitions: ['fade', 'iris'], eases: ['house'], themes: ['bold'], styles: ['ink'], backgrounds: ['grid'], textures: ['grain'] };
  const is = lintSource("vk.title('x', { fx: 'letterz' }); vk.scene('a', 2, { transition: 'iriss:0.5', bg: { type: 'gird' } }, []);", { names });
  const u = is.filter(i => i.rule === 'unknown-name').map(i => i.message);
  assert.ok(u.some(m => /letterz.*letters/.test(m)), u.join('\n'));
  assert.ok(u.some(m => /iriss.*iris/.test(m)), u.join('\n'));
  assert.ok(u.some(m => /gird.*grid/.test(m)), u.join('\n'));
  assert.deepEqual(registeredNames("vk.use({ name: 'p', fx: { tilt: {} }, transitions: { 'spin-in': p => ({}) } })"), { fx: ['tilt'], transitions: ['spin-in'] });
  const page = `<body><script>vk.use({ fx: { tilt: {} } });</script><script>vk.title('x', { fx: 'tilt' });</script>`;
  assert.equal(lintPage(page, { names }).issues.filter(i => i.rule === 'unknown-name').length, 0);
});

test('schemas: param shorthand parsing', () => {
  assert.deepEqual(param('number|0.6|0..2|duration'), { type: 'number', default: .6, range: [0, 2], description: 'duration' });
  const u = param('number|string|||font size'); assert.equal(u.type, 'number|string'); assert.equal(u.description, 'font size');
  assert.equal(param({ type: 'color', description: 'x' }).type, 'color');
});

test('docs: llms.txt, docs/api.json and docs/vk.d.ts are up to date with the registry', { skip: !hasBrowser && 'no browser' }, () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/docs.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  const api = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/api.json'), 'utf8'));
  for (const k of ['elements', 'fx', 'transitions', 'textures', 'backgrounds', 'blocks', 'eases', 'themes', 'formats', 'sounds', 'materials', 'styles', 'three', 'threeMaterials', 'threeRigs']) {
    assert.ok(api.kinds[k] && api.kinds[k].count > 0, 'kind ' + k);
    for (const e of api.kinds[k].entries) { assert.ok(typeof e.description === 'string', `${k}.${e.name} description`); assert.ok(e.params && typeof e.params === 'object', `${k}.${e.name} params`); }
  }
  const fx = Object.fromEntries(api.kinds.fx.entries.map(e => [e.name, e]));
  assert.ok(fx.letters.description.length > 3 && fx.letters.example);
  const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
  assert.match(llms, /Golden rules/); assert.match(llms, /vk peek/); assert.match(llms, /- fx .*letters/);
  assert.match(fs.readFileSync(path.join(ROOT, 'docs/vk.d.ts'), 'utf8'), /"letters"/);
  assert.ok(fs.existsSync(path.join(ROOT, 'AGENTS.md')));
});

test('vk list: kinds, names, one entry, --json', { skip: !fs.existsSync(path.join(ROOT, 'docs/api.json')) && 'no api.json' }, () => {
  const kinds = vk('list'); assert.equal(kinds.status, 0); assert.match(kinds.stdout, /^fx\s+\d+/m); assert.match(kinds.stdout, /^elements\s+\d+/m);
  const one = vk('list', 'transitions', 'iris'); assert.equal(one.status, 0); assert.match(one.stdout, /transitions iris/); assert.match(one.stdout, /example:/);
  const js = JSON.parse(vk('list', 'fx', 'letters', '--json').stdout); assert.equal(js.name, 'letters');
  const bad = vk('list', 'fx', 'letterz'); assert.notEqual(bad.status, 0); assert.match(bad.stdout + bad.stderr, /letters/);
});

test('vk lint CLI: exit codes, file:line output', () => {
  const bad = vk('lint', 'test/fixtures/agent/bad.html');
  assert.equal(bad.status, 1); assert.match(bad.stdout, /bad\.html:7:\d+\s+error\s+unknown-name/); assert.match(bad.stdout, /bad\.html:10:\d+\s+error\s+math-random/);
  const good = vk('lint', 'test/fixtures/agent/good.html', '--json');
  assert.equal(good.status, 0); const r = JSON.parse(good.stdout); assert.equal((Array.isArray(r) ? r[0] : r).errors, 0);
});

test('strict mode in the page: unknown names throw with did-you-mean, Math.random during a frame throws', { skip: !hasBrowser && 'no browser', timeout: 120000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vk-strict-'));
  const page = (body) => `<!doctype html><body><script src="${path.join(ROOT, 'dist/vidkit.js')}"></script><script>${body}</script>`;
  const files = {
    'strict.html': page(`vk.video({ strict: true }); vk.scene('a', 2, [vk.title('x', { fx: 'letterz' })]);`),
    'warn.html': page(`vk.video({}); vk.scene('a', 2, [vk.title('x', { fx: 'letterz' })]);`),
    'rand.html': page(`vk.video({ strict: true }); vk.scene('a', 2, sc => { const el = sc.html('<div class="vk-h2">r</div>', { flow: true }); sc.on(l => { if (l > 1) el.style.opacity = Math.random(); }); });`),
    'setup.html': page(`vk.video({ strict: true }); const xs = [Math.random(), Math.random()]; vk.scene('a', 2, [vk.title('ok ' + xs.length)]);`),
  };
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), s);
  const { server, port } = await startServer({ port: 0 });
  const browser = await launch();
  try {
    const go = async f => {
      const p = await browser.newPage(), errs = [], warns = [];
      p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') warns.push(m.text()); });
      await p.goto(pageUrl(port, path.join(dir, f), { render: '1' })); await p.waitForTimeout(300);
      return { p, errs, warns };
    };
    const s = await go('strict.html');
    assert.ok(s.errs.some(m => /unknown fx "letterz"/.test(m) && /did you mean "letters"/.test(m)), 'strict: ' + s.errs.join(' | '));
    const w = await go('warn.html');
    assert.equal(w.errs.length, 0, w.errs.join(' | ')); assert.ok(w.warns.some(m => /letterz/.test(m)), 'non-strict warns: ' + w.warns.join(' | '));
    const r = await go('rand.html');
    await r.p.evaluate(() => window.__ready);
    await r.p.evaluate(() => window.__seek(.5));   // l <= 1: no call
    const err = await r.p.evaluate(() => { try { return Promise.resolve(window.__seek(1.5)).then(() => null, e => String(e && e.message || e)); } catch (e) { return String(e && e.message || e); } });
    assert.ok((err && /Math\.random/.test(err)) || r.errs.some(m => /Math\.random/.test(m)), 'rand: ' + err + ' ' + r.errs.join(' | '));
    const st = await go('setup.html');
    assert.equal(st.errs.length, 0, 'Math.random at build time stays allowed: ' + st.errs.join(' | '));
  } finally { await browser.close(); server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('vk peek: one launch → stills, sheet, peek.json; errors for a broken page', { skip: !hasBrowser && 'no browser', timeout: 180000 }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vk-peek-'));
  try {
    const g = vk('peek', 'test/fixtures/agent/good.html', '-o', path.join(out, 'good'), '--json');
    const rep = JSON.parse(g.stdout);
    assert.equal(g.status, 0, JSON.stringify(rep.issues));
    assert.equal(rep.ok, true); assert.ok(rep.duration > 3.5 && rep.duration < 4.5); assert.equal(rep.scenes.length, 2);
    assert.ok(rep.stills.length >= 4); for (const s of rep.stills) assert.ok(fs.existsSync(path.resolve(out, 'good', path.basename(s.file || s))));
    assert.ok(fs.existsSync(path.join(out, 'good', 'peek.json')) && fs.existsSync(path.join(out, 'good', 'sheet.png')));
    assert.ok(rep.timings && rep.lint);
    const b = vk('peek', 'test/fixtures/agent/bad.html', '-o', path.join(out, 'bad'), '--json');
    assert.equal(b.status, 1);
    const br = JSON.parse(b.stdout), codes = new Set(br.issues.map(i => i.code));
    assert.equal(br.ok, false);
    assert.ok([...codes].some(c => c.startsWith('lint')), [...codes].join(','));
    assert.ok(codes.has('page-error') || codes.has('unknown-name'), [...codes].join(','));
    for (const i of br.issues) { assert.ok(['error', 'warn'].includes(i.severity)); assert.ok(i.code && i.message && 'hint' in i); }
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});
