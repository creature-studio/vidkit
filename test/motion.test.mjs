// Phase 3 motion: gait foot locking (no sliding), clean stops, lip-sync visemes, line boil, springs, ribbons.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gait, cycle, travel, mouth, boilPoints, follow, spring, drag, ribbon, ribbonPath } from '../src/fx/motion.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('gait: a planted foot does not move while the body travels (no foot sliding)', () => {
  for (const o of [{ stride: 128, duty: .62 }, { stride: 230, duty: .36, hip: 174 }]) {
    const g = gait(o); let maxSlide = 0, planted = 0;
    for (let d = 0; d < 1000; d += .5) {
      const a = g.at(d), b = g.at(d + .5);
      a.feet.forEach((f, i) => { if (f.contact && b.feet[i].contact && Math.floor(d / g.stride + [0, .5][i]) === Math.floor((d + .5) / g.stride + [0, .5][i])) { planted++; maxSlide = Math.max(maxSlide, Math.abs(b.feet[i].x - f.x) + Math.abs(b.feet[i].y - f.y)); } });
    }
    assert.ok(planted > 100); close(maxSlide, 0, 1e-9);
  }
});
test('gait: the body speed equals the stride rate (root motion derived from the stride)', () => {
  const g = gait({ stride: 120 });
  // over one full cycle each foot advances exactly one stride and the hip advances one stride
  const a = g.at(40), b = g.at(160);
  a.feet.forEach((f, i) => close(b.feet[i].x - f.x, 120, 1e-9));
  close(b.hipX - a.hipX, 120);
  // standing still (constant d) → nothing moves; walking in place is impossible by construction
  assert.deepEqual(g.at(77), g.at(77));
});
test('gait: feet stay within leg reach; hip bobs but never exceeds the standing height', () => {
  const g = gait({ stride: 128, hip: 180, leg: 184 });
  for (let d = 0; d < 400; d += 3) { const a = g.at(d); assert.ok(a.hipY <= 180 + 1e-9); a.feet.forEach(f => { if (f.contact) assert.ok(Math.hypot(f.x - d, a.hipY) <= 184 + 1e-6); }); }
});
test('gait.rest: a stop distance where both feet are planted', () => {
  const g = gait({ stride: 128 }), r = g.rest(301); assert.ok(r >= 301 && r < 301 + 128);
  assert.ok(g.at(r).feet.every(f => f.contact));
});
test('cycle / travel: constant speed and eased keyed travel are pure functions of t', () => {
  close(cycle(2, { stride: 100, period: 1 }).hipX, 200);
  close(travel(0, [[0, 0], [2, 100]]), 0); close(travel(2, [[0, 0], [2, 100]]), 100); close(travel(1, [[0, 0], [2, 100]]), 50);
});
test('mouth: closed outside the line, opens on words, holds visemes on twos', () => {
  const seg = { at: 1, end: 2, words: [{ w: '你', t: 0, end: .25 }, { w: '好', t: .3, end: .6 }] };
  assert.equal(mouth(seg, .5).shape, 'M'); assert.equal(mouth(seg, 3).shape, 'M');
  const m = mouth(seg, 1.125); assert.ok(m.open > .5 && m.shape !== 'M');
  assert.deepEqual(mouth(seg, 1.1), mouth(seg, 1.14));       // same 1/12 s step → same drawing
  assert.equal(mouth(seg, 1.27).shape, 'M');                  // gap between words
  assert.equal(mouth(null, 1).shape, 'M');
});
test('mouth: audio envelope drives the opening; low energy stays closed, centroid picks the shape', () => {
  const rms = Array.from({ length: 100 }, (_, i) => (i > 20 && i < 60 ? .9 : .02)), cen = rms.map((_, i) => (i < 40 ? .1 : .8));
  const seg = { at: 0, end: 2, env: { rate: 50, rms, cen } };
  assert.equal(mouth(seg, .1).shape, 'M');
  assert.equal(mouth(seg, .6).shape, 'O');
  const late = mouth(seg, 1.0, { fps: 0 }); assert.ok(late.open > .8); assert.equal(late.shape, 'A');
  assert.equal(mouth({ at: 0, end: 2, entry: { env: { rate: 50, rms, cen } } }, .6).shape, 'O');   // env from the manifest entry
});
test('boilPoints: same drawing within a boil step, new drawing next step, amplitude bounded', () => {
  const pts = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.deepEqual(boilPoints(pts, .01, { fps: 12 }), boilPoints(pts, .08, { fps: 12 }));
  assert.notDeepEqual(boilPoints(pts, .01, { fps: 12 }), boilPoints(pts, .1, { fps: 12 }));
  boilPoints(pts, .5, { amp: 2 }).forEach((p, i) => { assert.ok(Math.abs(p[0] - pts[i][0]) <= 2 && Math.abs(p[1] - pts[i][1]) <= 2); });
});
test('follow / spring / drag: lag behind motion, settle at rest, deterministic', () => {
  const step = t => (t >= 1 ? 10 : 0);
  close(follow(step, .95, .1), 0); close(follow(step, 3, .1), 10);
  const s1 = spring(step, 1.2), s2 = spring(step, 1.2); assert.equal(s1, s2); assert.ok(s1 > 0 && s1 < 15);
  close(spring(step, 6), 10, 1e-3);
  const ramp = t => 100 * t; assert.ok(drag(ramp, 2, { gain: .1 }) < 0);        // moving forward → cloth trails backwards
  close(drag(() => 5, 2), 0);
});
test('ribbon: inextensible (segment lengths = len), trails behind a moving anchor, seek-order independent', () => {
  const anchor = t => [100 * t, 0], o = { n: 8, len: 12, lag: .05, hang: [0, 1], flutter: 0 };
  const pts = ribbon(anchor, 2, o);
  for (let i = 1; i < pts.length; i++) close(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), 12, 1e-9);
  assert.ok(pts[pts.length - 1][0] < pts[0][0], 'tail lags behind the direction of travel');
  assert.deepEqual(ribbon(anchor, 2, o), pts);
  const still = ribbon(() => [0, 0], 2, o); close(still[8][0], 0, 1e-9); close(still[8][1], 96, 1e-9);
  assert.match(ribbonPath(pts, 10, 3), /^M[-\d.]+ [-\d.]+ L/);
});
