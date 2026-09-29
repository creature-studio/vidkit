// Unit tests for the DOM-free core: easing, randomness, beat grid, interpolation, stagger, camera, timeline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EASE, getEase, bezier, spring, steps } from '../src/core/ease.js';
import { hash, mulberry32, noise1, noise2, boil } from '../src/core/random.js';
import { BeatGrid, parseTime, parseDur, kf, seg, progress } from '../src/core/time.js';
import { stagger } from '../src/core/stagger.js';
import { lerpStr, compatible, normColor, composeTransform } from '../src/core/interp.js';
import { normKeys, camAt, shakeAt, cameraTransform } from '../src/core/camera.js';
import { Timeline } from '../src/core/timeline.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('every named ease maps 0→0 and 1→1', () => {
  for (const [name, f] of Object.entries(EASE)) {
    if (name === 'step') continue;
    close(f(0), 0, 1e-9); close(f(1), 1, 1e-9);
  }
});
test('house curve = cubic-bezier(.7,0,.2,1): monotonic, slow start, fast finish', () => {
  const f = EASE.house; let prev = -1;
  for (let i = 0; i <= 100; i++) { const v = f(i / 100); assert.ok(v >= prev - 1e-9); prev = v; }
  assert.ok(f(.25) < .1, 'slow start'); assert.ok(f(.75) > .9, 'settled late');
  close(getEase('cubic-bezier(.7,0,.2,1)')(.37), f(.37));
});
test('bezier solves x accurately (linear control points ≈ identity)', () => {
  const lin = bezier(1 / 3, 1 / 3, 2 / 3, 2 / 3);
  for (let i = 0; i <= 20; i++) close(lin(i / 20), i / 20, 1e-5);
});
test('spring/steps/getEase string forms', () => {
  close(spring(6, 12)(1), 1); assert.ok(spring(6, 12)(.3) > 1, 'overshoots');
  close(getEase('spring(6,12)')(.3), spring(6, 12)(.3));
  close(steps(4)(.5), .5); close(getEase('steps(4)')(.25), .25);
  assert.equal(typeof getEase('outBack'), 'function');
});
test('easing is deterministic (same input → bit-identical output)', () => {
  const xs = Array.from({ length: 50 }, (_, i) => i / 49);
  for (const n of ['house', 'outExpo', 'spring', 'outElastic', 'outBounce']) assert.deepEqual(xs.map(EASE[n]), xs.map(x => getEase(n)(x)));
});
test('seeded randomness is reproducible and in range', () => {
  const a = mulberry32(42), b = mulberry32(42), sa = Array.from({ length: 100 }, a), sb = Array.from({ length: 100 }, b);
  assert.deepEqual(sa, sb); assert.ok(sa.every(v => v >= 0 && v < 1));
  assert.notDeepEqual(Array.from({ length: 5 }, mulberry32(1)), Array.from({ length: 5 }, mulberry32(2)));
  for (let i = 0; i < 1000; i++) { const h = hash(i * .37); assert.ok(h >= 0 && h < 1); }
  assert.equal(hash(12.5), hash(12.5));
  assert.ok(Math.abs(noise1(3.001) - noise1(3)) < .01, 'value noise is continuous');
  assert.ok(noise2(1.5, 2.5) >= 0 && noise2(1.5, 2.5) <= 1);
  assert.equal(boil(1.0, 12), 12); assert.equal(boil(1.08, 12), 12); assert.equal(boil(1.09, 12), 13);
});
test('beat grid: BPM mode, one-frame lead, beat times, quantize', () => {
  const g = new BeatGrid({ bpm: 120, offset: .2, fps: 30 });
  close(g.beat, .5); close(g.at(4), 2.2); close(g.index(2.2), 4);
  close(g.pulse(2.2 - 1 / 30), 1, 1e-9);               // peaks one frame early
  assert.ok(g.pulse(2.45) < .1);
  close(g.hit(3, 3), Math.exp(-8 / 30));
  close(parseTime('b:4', g), 2.2 - 1 / 30); close(parseTime('b:4', g, 1), 1.2 - 1 / 30); close(parseDur('b:8', g), 4);
  close(g.quantize(1.33, 2), 1.45);
});
test('beat grid: explicit beat list (Phase 2 detected beats)', () => {
  const g = new BeatGrid({ times: [0.5, 1.0, 1.6, 2.1], fps: 30 });
  close(g.at(2), 1.6); close(g.at(1.5), 1.3); close(g.index(1.3), 1.5); close(g.index(1.6), 2);
  assert.ok(g.bpm > 100 && g.bpm < 115);
});
test('kf / seg / progress', () => {
  close(kf(1, [[0, 0], [2, 10]], 'linear'), 5); assert.deepEqual(kf(1, [[0, [0, 0]], [2, [10, 20]]], 'linear'), [5, 10]);
  close(kf(-1, [[0, 3], [1, 4]]), 3); close(kf(5, [[0, 3], [1, 4]]), 4);
  close(seg(1.5, 1, 2), .5); close(seg(0, 1, 2), 0); close(progress(1.5, 1, 1), .5);
});
test('stagger variants', () => {
  assert.deepEqual([0, 1, 2, 3].map(i => stagger(.1)(i, 4)), [0, .1, .2, .30000000000000004]);
  assert.deepEqual([0, 1, 2].map(i => stagger(1, { from: 'center' })(i, 3)), [1, 0, 1]);
  assert.deepEqual([0, 1, 2].map(i => stagger(1, { from: 'end' })(i, 3)), [2, 1, 0]);
  const r1 = [0, 1, 2, 3].map(i => stagger(1, { from: 'random', seed: 3 })(i, 4)), r2 = [0, 1, 2, 3].map(i => stagger(1, { from: 'random', seed: 3 })(i, 4));
  assert.deepEqual(r1, r2);
  close(stagger(1, { grid: [3, 3], from: 'center' })(0, 9), Math.SQRT2);
});
test('string interpolation, colours, path compatibility', () => {
  assert.equal(lerpStr('inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)', .5), 'inset(0% 50% 0% 0%)');
  assert.equal(normColor('#3355FF'), 'rgba(51,85,255,1)');
  assert.equal(lerpStr(normColor('#000000'), normColor('#FFFFFF'), .5), 'rgba(127.5,127.5,127.5,1)');
  assert.ok(compatible('M0 0 L10 10 Z', 'M5 5 L20 0 Z')); assert.ok(!compatible('M0 0 L10 10', 'M0 0 C1 1 2 2 3 3'));
  assert.equal(lerpStr('M0 0 L10 10', 'M10 0 L20 30', .5), 'M5 0 L15 20');
  assert.equal(composeTransform({ x: '10px', scale: '1.2' }), 'translate(10px,0px) scale(1.2)');
});
test('camera keys, push and quantised deterministic shake', () => {
  const keys = normKeys([{ t: 0, x: 100, y: 100, s: 1 }, { t: 2, x: 300, y: 100, s: 4, ease: 'linear' }], 1280, 720);
  close(camAt(keys, 1).x, 200); close(camAt(keys, 1).s, 2);   // zoom interpolates geometrically
  const sh = [{ t: 0, amp: 10, d: 1, k: 6 }];
  assert.deepEqual(shakeAt(sh, .5), shakeAt(sh, .5)); assert.deepEqual(shakeAt(sh, .5), shakeAt(sh, .5 + 1 / 60)); // 24fps quantisation
  assert.deepEqual(shakeAt(sh, 1.5), { dx: 0, dy: 0, dr: 0 });
  assert.match(cameraTransform({ push: .04 }, 1280, 720, 5, 5), /scale\(1\.04\)/);
});
test('timeline: last-started tween wins, immediateRender, order-independent seeking', () => {
  const mkEl = () => ({ style: { setProperty(k, v) { this[k] = v; } }, setAttribute() { }, getAttribute() { return null; } });
  const build = () => {
    const tl = new Timeline(), el = mkEl();
    tl.tween([el], { t: 1, d: 1, ease: 'linear', from: { opacity: 0, x: 0 }, to: { opacity: 1, x: 100 } });
    tl.tween([el], { t: 3, d: 1, ease: 'linear', from: { opacity: 1 }, to: { opacity: 0 } });
    return { tl, el, S: tl.els.get(el) };
  };
  const { tl, el, S } = build();
  tl.apply(el, S, 0); assert.equal(el.style.opacity, '0'); assert.equal(el.style.transform, 'translate(0px,0px)');   // before start: first `from` holds
  tl.apply(el, S, 1.5); assert.equal(el.style.opacity, '0.5'); assert.equal(el.style.transform, 'translate(50px,0px)');
  tl.apply(el, S, 2.5); assert.equal(el.style.opacity, '1');
  tl.apply(el, S, 3.25); assert.equal(el.style.opacity, '0.75');
  // seek backwards then forwards: identical to a fresh evaluation
  const snap = t => { const f = build(); f.tl.apply(f.el, f.S, t); return JSON.stringify(f.el.style); };
  for (const t of [3.7, 0.2, 1.9, 3.1, 1.2]) { tl.apply(el, S, t); assert.equal(JSON.stringify(el.style), snap(t)); }
});

test('code highlighter never re-matches inside its own markup', async () => {
  const { highlightLine } = await import('../src/fx/blocks.js');
  const KW = /\b(const|return)\b/g;
  const out = highlightLine(`const s = 'a' // note "x"`, KW);
  assert.equal((out.match(/<span/g) || []).length, 3);
  assert.ok(!out.includes('style="color:var(--accent2)">\'a\'</span>'.replace('\'a\'', '<span')));
  assert.equal(out.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'"), `const s = 'a' // note "x"`);
});
