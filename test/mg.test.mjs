// vk.mg motion-graphics maths: sub-frame motion blur sampling, cover-bar transitions, beat-locked morph outlines,
// dot wave, text motion curves, UI micro-interactions, montage slots, timecode, converge, recent beats.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/fx/mg/math.js';
import { BeatGrid } from '../src/core/time.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('parseShutter: fractions, angles, ms, seconds, off', () => {
  close(M.parseShutter('1/40'), .025); close(M.parseShutter('180deg', 30), 1 / 60); close(M.parseShutter('90°', 24), .25 / 24);
  close(M.parseShutter('25ms'), .025); close(M.parseShutter(.02), .02); close(M.parseShutter('0.03'), .03);
  for (const v of [0, '0', 'off', false, null, undefined, -1, '1/0']) assert.equal(M.parseShutter(v), 0);
});
test('motionBlurCfg: defaults (1/40 s, 4 samples), off when samples < 2 or no shutter', () => {
  assert.deepEqual(M.motionBlurCfg(true), { shutter: .025, samples: 4, phase: 0 });
  assert.deepEqual(M.motionBlurCfg('1/50'), { shutter: .02, samples: 4, phase: 0 });
  assert.equal(M.motionBlurCfg({ shutter: '1/40', samples: 1 }), null);
  assert.equal(M.motionBlurCfg({ shutter: 0 }), null); assert.equal(M.motionBlurCfg(null), null); assert.equal(M.motionBlurCfg(false), null);
});
test('subTimes: trailing window ends exactly at t, evenly spaced, clamped at 0; centred phase', () => {
  const s = M.subTimes(1, .025, 4); assert.equal(s.length, 4); close(s[3], 1); close(s[0], .975);
  for (let k = 1; k < 4; k++) close(s[k] - s[k - 1], .025 / 3);
  assert.deepEqual(M.subTimes(0, .025, 4), [0, 0, 0, 0]);
  const c = M.subTimes(2, .03, 3, .5); close(c[0], 1.985); close(c[1], 2); close(c[2], 2.015);
  assert.deepEqual(M.subTimes(5, 0, 4), [5]); assert.deepEqual(M.subTimes(5, .02, 1), [5]);
  // running average with alpha 1/(k+1) == equal weights
  let acc = 0; const vals = [10, 20, 60, 30]; vals.forEach((v, k) => { const a = M.accumAlpha(k); acc = acc * (1 - a) + v * a; }); close(acc, 30);
});
test('coverBars: nothing at the ends, frame fully covered at the cut, last bar arrives exactly on the cut', () => {
  for (const mode of ['slide', 'grow']) for (const d of [.44, .8]) {
    const o = { n: 6, mode };
    assert.equal(M.coverBars(0, d, o).bars.length, 0, 'start clear');
    assert.equal(M.coverBars(d, d, o).bars.length, 0, 'end clear');
    const { cut, bars } = M.coverBars(d / 2, d, o);
    close(cut, d / 2); assert.equal(bars.length, 6);
    bars.forEach(b => { close(b.a, 0, 1e-6); close(b.b, 1, 1e-6); });
  }
  // reference timing: d = .44 s → 0.13 s travel, 0.018 s stagger
  const half = M.coverBars(.05, .44, { n: 6 }).bars;   // bars 0–2 started (stagger .018 s), 3–5 not yet assert.ok(half.length >= 1 && half.length < 6);
  // monotone: covered area grows until the cut, then shrinks
  const area = l => M.coverBars(l, .6, { n: 6 }).bars.reduce((s, b) => s + b.b - b.a, 0);
  let prev = -1; for (let l = 0; l <= .3; l += .01) { const a = area(l); assert.ok(a >= prev - 1e-9); prev = a; }
  prev = 7; for (let l = .3; l <= .6; l += .01) { const a = area(l); assert.ok(a <= prev + 1e-9); prev = a; }
});
test('coverAxis / coverRects: alternate per transition index, rects tile the frame', () => {
  assert.equal(M.coverAxis('alt', 1), 'x'); assert.equal(M.coverAxis('alt', 2), 'y'); assert.equal(M.coverAxis('y', 1), 'y');
  const r = M.coverRects([{ i: 0, a: 0, b: 1 }, { i: 5, a: 0, b: 1 }], 6, 'x', 1920, 1080);
  close(r[0].y, -1); close(r[1].y + r[1].h, 1081); close(r[0].w, 1922);
});
test('shapeOutline: N points, start at the top, equal arc spacing, polygon points on the outline', () => {
  for (const k of ['circle', 'square', 'triangle', 'star', 'hexagon']) {
    const p = M.shapeOutline(k, 120); assert.equal(p.length, 120);
    close(p[0][0], 0, 1e-9); assert.ok(p[0][1] < 0, k + ' starts at the top');
    if (k !== 'circle') { const dd = []; for (let i = 0; i < 119; i++) dd.push(Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1])); assert.ok(Math.max(...dd) - Math.min(...dd) < .06, k + ' spacing'); }
  }
  // triangle points lie on one of its 3 edges
  const v = M.shapeVerts('triangle'), tri = M.shapeOutline('triangle', 60);
  tri.forEach(q => { const on = v.some((a, i) => { const b = v[(i + 1) % 3], cr = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]); return Math.abs(cr) < 1e-9; }); assert.ok(on); });
  const mid = M.lerpPts(M.shapeOutline('circle', 8), M.shapeOutline('square', 8), .5); assert.equal(mid.length, 8);
});
test('morphState: one shape per beat, morph eases into the new shape and holds the last', () => {
  assert.deepEqual([0, 1.2, 2.9, 3.5, 9].map(b => M.morphState(b, 4).k), [0, 1, 2, 3, 3]);
  close(M.morphState(1, 4).m, 0); close(M.morphState(1.9, 4).m, 1); assert.ok(M.morphState(1.5, 4).m > 1, 'outBack overshoots');
  assert.equal(M.morphState(2.2, 4).from, 1);
});
test('dotwaveAt: ring pulse peaks at ringSpeed·age, the text hole hides dots, hue in [0,360)', () => {
  const o = { cx: 0, cy: 0, ringSpeed: 1000, ringW: 50, amp: 0, base: 0 };
  const a = M.dotwaveAt(300, 0, 0, .3, o), b = M.dotwaveAt(450, 0, 0, .3, o);
  close(a.ring, 1); assert.ok(b.ring < .02); close(a.size, 24);
  const h = M.dotwaveAt(10, 10, 1, .1, { cx: 0, cy: 0, hole: { w: 400, h: 200, soft: 50 } }); close(h.size, 0);
  for (let t = 0; t < 5; t += .37) { const q = M.dotwaveAt(123, 456, t, .2); assert.ok(q.hue >= 0 && q.hue < 360); }
  assert.deepEqual(M.dotwaveAt(5, 6, 1.5, .2), M.dotwaveAt(5, 6, 1.5, .2));
});
test('text motion: drop lands at 0 with 1:1 scale, slam collapses to identity, echoes fade out', () => {
  const s0 = M.letterDrop(0, { from: 800 }), s1 = M.letterDrop(1);
  close(s0.y, -800); close(s0.sy, 1.5); close(s1.y, 0); close(s1.sx, 1); close(s1.sy, 1);
  const a = M.slam(0, { scale: 2.8, rot: 20, x: 240, dir: -1 }), b = M.slam(1, { x: 240 });
  close(a.s, 2.8); close(a.rot, -20); close(a.x, -240); close(b.s, 1); close(b.rot, 0); close(b.x, 0);
  assert.equal(M.echoGhosts(0, { n: 3 }).length, 3); assert.equal(M.echoGhosts(1).length, 0);
  const g = M.echoGhosts(.5, { n: 2, step: .2, alpha: .2 }); close(g[0].s, 1.2); close(g[1].a, .1);
  close(M.hardShadow(1, 12, 8).dx, 12); close(M.maskRise(0), 1.15); close(M.maskRise(1), 0);
});
test('UI: cursor path holds and eases between keys, presses on clicks, knob and like pop settle', () => {
  const K = [[.4, 100, 100], [1, 500, 300]];
  assert.deepEqual(M.cursorAt(K, 0), [100, 100]); assert.deepEqual(M.cursorAt(K, 2), [500, 300]);
  const m = M.cursorAt(K, .7); close(m[0], 300, 1e-9); close(m[1], 200, 1e-9);
  assert.equal(M.pressAt([1], 1.03), .88); assert.equal(M.pressAt([1], 1.2), 1);
  const k1 = M.toggleKnob(1); close(k1.x, 1); close(k1.sx, 1); close(M.toggleKnob(.5).sx * M.toggleKnob(.5).sy ** 2, 1);
  assert.deepEqual(M.likePop(-1), { s: 1, c: 0, burst: 0 }); close(M.likePop(0).s, 1.5); assert.ok(Math.abs(M.likePop(2).s - 1) < .001);
  for (let t = 0; t < 2; t += .1) { const e = M.eqLevel(t, 3); assert.ok(e >= .18 - 1e-9 && e <= 1 + 1e-9); }
});
test('montageSlot / timecode / convergeAt / recentBeats', () => {
  const h = 60 / 128 / 2; assert.deepEqual([0, h - 1e-6, h, 7.5 * h, 99].map(t => M.montageSlot(t, h, 8).idx), [0, 0, 1, 7, 7]);
  close(M.montageSlot(h * 2.5, h, 8).ft, h / 2);
  assert.equal(M.timecode(0), '00:00:00'); assert.equal(M.timecode(14.99), '00:14:29'); assert.equal(M.timecode(61 + 2 / 30), '01:01:02');
  const c0 = M.convergeAt(3, 0), c1 = M.convergeAt(3, 1); assert.ok(Math.hypot(c0.x, c0.y) >= 900); close(c1.x, 0); close(c1.y, 0); close(c1.size, 4);
  assert.deepEqual(M.convergeAt(7, .4, { seed: 2 }), M.convergeAt(7, .4, { seed: 2 }));
  const g = new BeatGrid({ bpm: 120, fps: 30 });   // beats every .5 s, visuals one frame early
  const r = M.recentBeats(g, 1.2, 3); assert.deepEqual(r.map(x => x.b), [0, 1, 2]); close(r[2].age, .2 + 1 / 30);
  assert.deepEqual(M.recentBeats(g, 1.2, 3, 1, .9).map(x => x.b), [2]);
  assert.equal(M.recentBeats(g, .5 - 1 / 30, 1)[0].b, 1, 'the beat lands one frame early');
});

test('vk render motion blur: CLI flags override the page, --no-motion-blur / --shutter 0 turn it off, tmix filter', async () => {
  const { resolveMotionBlur, blurFilter } = await import('../cli/render.mjs');
  const page = { shutter: 1 / 40, samples: 4, phase: 0 };
  assert.equal(resolveMotionBlur({}, null, 30), null);                                   // default off
  const p = resolveMotionBlur({}, page, 30); assert.equal(p.samples, 4); assert.ok(Math.abs(p.shutter - .025) < 1e-9);
  const f = resolveMotionBlur({ shutter: '1/60', samples: '6' }, page, 30); assert.equal(f.samples, 6); assert.ok(Math.abs(f.shutter - 1 / 60) < 1e-9);
  assert.equal(resolveMotionBlur({ noMotionBlur: true }, page, 30), null);
  assert.equal(resolveMotionBlur({ shutter: '0' }, page, 30), null);
  assert.equal(blurFilter(4, 30), "tmix=frames=4:weights=1 1 1 1,select='eq(mod(n\\,4)\\,3)',setpts=N/(30*TB)");
});
test('cover transitions: lazily registered, incoming scene hidden until the cut, bars only around it', async () => {
  const { registry, ensureLazy } = await import('../src/core/plugin.js');
  await import('../src/fx/mg/index.js');
  assert.equal(registry.transitions.stripes, undefined);                                  // nothing registered at load time
  assert.ok(ensureLazy('transitions', 'stripes') && registry.transitions.bars && registry.transitions.stripes.cover);
  const ctx = l => ({ local: l, W: 1920, H: 1080, o: { d: .44 }, inScene: { index: 1 }, video: { cfg: {} } });
  const a = registry.transitions.stripes(0, ctx(0)), m = registry.transitions.stripes(.5, ctx(.22)), z = registry.transitions.stripes(1, ctx(.44));
  assert.equal(a.in.opacity, 0); assert.equal(a.cover, null);
  assert.equal(m.in.opacity, 1); assert.equal(typeof m.cover, 'function');
  assert.equal(z.cover, null);
});
