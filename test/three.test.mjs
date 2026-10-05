// vk.three pure maths: frame index, sub-frame plan, tone map / grade mirrors, Catmull-Rom arc length, camera rigs,
// particle targets and the morph timeline (no browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/three/math.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);
const closeV = (a, b, eps = 1e-6) => a.forEach((x, i) => close(x, b[i], eps));

test('frameIdx is stable at exact frame times; halton jitter is centred and deterministic', () => {
  for (let i = 0; i < 300; i++) assert.equal(M.frameIdx(i / 30, 30), i);
  assert.equal(M.frameIdx(1 / 30 - 1e-4, 30), 0);
  close(M.halton(1, 2), .5); close(M.halton(2, 2), .25); close(M.halton(3, 3), 1 / 9 + 0);
  const J = Array.from({ length: 16 }, (_, k) => M.jitter(k, 16));
  close(J.reduce((s, j) => s + j[0], 0) / 16, 0, .07); close(J.reduce((s, j) => s + j[1], 0) / 16, 0, .07);
  assert.deepEqual(M.jitter(0, 1), [0, 0]); assert.deepEqual(M.jitter(3, 8), M.jitter(3, 8));
});
test('samplePlan: N = max(mb samples, aa); window ends at the frame time; weights sum to 1', () => {
  const mb = { shutter: 1 / 40, samples: 4, phase: 0 };
  const P = M.samplePlan(2, mb, 1); assert.equal(P.length, 4); close(P[3].t, 2); close(P[0].t, 2 - 1 / 40);
  close(P.reduce((s, x) => s + x.w, 0), 1);
  assert.ok(P.every((x, i) => i === 0 || x.t > P[i - 1].t));
  const A = M.samplePlan(2, null, 3); assert.equal(A.length, 3); assert.ok(A.every(x => x.t === 2)); assert.ok(A.some(x => x.jx !== 0));
  assert.equal(M.samplePlan(1, null, 1).length, 1); assert.deepEqual([M.samplePlan(1, null, 1)[0].jx, M.samplePlan(1, null, 1)[0].jy], [0, 0]);
  assert.equal(M.samplePlan(0, mb, 1)[0].t, 0);                                   // clamped at 0
  assert.deepEqual(M.samplePlan(1.5, mb, 6), M.samplePlan(1.5, mb, 6));
});
test('ACES mirror: black stays black, monotonic, saturates below 1; sRGB encode endpoints', () => {
  assert.deepEqual(M.aces([0, 0, 0]).map(v => +v.toFixed(4)), [0, 0, 0]);
  let prev = -1; for (let x = 0; x <= 64; x *= 1.5, x += .01) { const y = M.luma(M.aces([x, x, x])); assert.ok(y >= prev - 1e-9); prev = y; if (x > 60) break; }
  assert.ok(M.luma(M.aces([1e3, 1e3, 1e3])) <= 1 && M.luma(M.aces([1e3, 1e3, 1e3])) > .97);
  close(M.linearToSrgb(0), 0); close(M.linearToSrgb(1), 1, 1e-9); assert.ok(M.linearToSrgb(.18) > .45 && M.linearToSrgb(.18) < .47);
});
test('grade: neutral is the identity; presets differ; white balance keeps luminance', () => {
  const p = M.gradeParams('neutral');
  for (const c of [[.1, .2, .3], [.5, .5, .5], [.9, .1, .4]]) closeV(M.grade(c, p), c, 1e-9);
  const w = M.whiteBalance(.5, .2); close(M.luma(w), 1, 1e-9); assert.ok(w[0] > w[2]);
  const mono = M.grade([.8, .2, .1], M.gradeParams('mono')); close(mono[0], mono[1], 1e-9); close(mono[1], mono[2], 1e-9);
  assert.notDeepEqual(M.grade([.4, .5, .6], M.gradeParams('teal-orange')), [.4, .5, .6]);
  assert.equal(M.gradeParams({ preset: 'cool', contrast: 2 }).contrast, 2);
});
test('Catmull-Rom path passes through its control points and moves at constant speed', () => {
  const pts = [[0, 0, 0], [4, 1, 0], [6, 0, 3], [10, 2, 4]], P = M.crPath(pts);
  closeV(P.at(0), pts[0], 1e-9); closeV(P.at(1), pts[3], 1e-6);
  for (let i = 1; i < 3; i++) { const u = i / 3; closeV(P.raw(u), pts[i], 1e-6); }
  const step = [], N = 40; for (let i = 0; i < N; i++) step.push(Math.hypot(...M.v3.sub(P.at((i + 1) / N), P.at(i / N))));
  const mean = step.reduce((a, b) => a + b) / N; assert.ok(step.every(s => Math.abs(s - mean) / mean < .02), 'uniform arc length');
  close(step.reduce((a, b) => a + b), P.length, P.length * .002);
  const C = M.crPath([[0, 0, 0], [2, 0, 0], [2, 0, 2], [0, 0, 2]], { closed: true }); closeV(C.at(0), C.at(1), 1e-6);
});
test('rigs: orbit keeps its radius, zoomScale is log-linear, keys hit their keys, seq blends continuously', () => {
  const O = M.rig.orbit({ target: [1, 0, 2], radius: 5, height: 0, from: 0, to: 360, dur: 4, ease: 'linear' });
  for (const t of [0, 1, 2.5, 4]) close(Math.hypot(O(t).pos[0] - 1, O(t).pos[2] - 2), 5, 1e-9);
  closeV(O(1).pos, [6, 0, 2], 1e-9);
  const Z = M.rig.zoomScale({ target: [0, 0, 0], from: 1000, to: 1, dur: 3, ease: 'linear' });
  close(Z(0).scale, 1000, 1e-6); close(Z(1.5).scale, Math.sqrt(1000), 1e-6); close(Z(3).scale, 1, 1e-9);
  const K = M.rig.keys([{ t: 0, pos: [0, 0, 5], fov: 30 }, { t: 2, pos: [2, 0, 5], fov: 50, ease: 'linear' }]);
  closeV(K(0).pos, [0, 0, 5]); closeV(K(1).pos, [1, 0, 5]); close(K(2).fov, 50); close(K(9).fov, 50);
  const A = M.rig.dolly({ from: [0, 0, 5], to: [0, 0, 5] }), B = M.rig.dolly({ from: [4, 0, 5], to: [4, 0, 5] });
  const S = M.rig.seq([{ t: 0, rig: A }, { t: 2, rig: B, blend: 1 }]);
  closeV(S(1.99).pos, [0, 0, 5]); closeV(S(2).pos, [0, 0, 5], 1e-9); closeV(S(2.5).pos, [2, 0, 5], 1e-9); closeV(S(3).pos, [4, 0, 5]);
  const F = M.rig.fly({ points: [[0, 1, 10], [3, 1, 4], [0, 1, 0], [-3, 2, -4]], dur: 5 }); closeV(F(0).pos, [0, 1, 10], 1e-9); closeV(F(5).pos, [-3, 2, -4], 1e-6);
  assert.ok(M.v3.dist(F(2).target, F(2).pos) > 0);
  const C = M.rig.crane({ target: [0, 1, 0], y0: .5, y1: 4, dur: 2 }); close(C(0).pos[1], .5); close(C(2).pos[1], 4);
});
test('shake is deterministic, zero outside its window; punch dips the fov and recovers', () => {
  const sh = M.rig.shake({ amp: .1, at: [1, 2], seed: 3 });
  assert.deepEqual(sh(0).dpos, [0, 0, 0]); assert.deepEqual(sh(3).dpos, [0, 0, 0]);
  assert.deepEqual(sh(1.5), sh(1.5)); assert.ok(Math.hypot(...sh(1.5).dpos) > 0 && Math.hypot(...sh(1.5).dpos) < .3);
  const pu = M.rig.punch({ t: 1, amount: .1 }); close(pu(0).fovMul, 1); assert.ok(pu(1.05).fovMul < .95); close(pu(2).fovMul, 1);
  const R = M.rig.add(M.rig.orbit({ radius: 4 }), sh, pu); assert.ok(R(1.05).fov < 35);
});
test('particle targets: deterministic, right sizes, mask samples land inside the mask', () => {
  const g1 = M.galaxy(2000, { seed: 4 }), g2 = M.galaxy(2000, { seed: 4 }); assert.deepEqual(g1.pos, g2.pos); assert.equal(g1.pos.length, 6000);
  assert.ok(Math.max(...Array.from({ length: 2000 }, (_, i) => Math.hypot(g1.pos[i * 3], g1.pos[i * 3 + 2]))) <= 4 + 1e-6);
  const s = M.sphere(1000, { radius: 2, jitter: 0 }); for (let i = 0; i < 1000; i++) close(Math.hypot(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]), 2, 1e-5);
  // 40×20 mask: left half opaque only
  const w = 40, h = 20, d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255; }
  const m = M.sampleMask(d, w, h, 500, { width: 4, depth: 0 }); assert.equal(m.pos.length, 1500);
  for (let i = 0; i < 500; i++) assert.ok(m.pos[i * 3] <= 1e-6 && m.pos[i * 3] >= -2 - 1e-6, 'x in the left half');
  assert.deepEqual(M.sampleMask(d, w, h, 500, { width: 4 }).pos, M.sampleMask(d, w, h, 500, { width: 4 }).pos);
  assert.ok(M.sampleMask(new Uint8ClampedArray(w * h * 4), w, h, 10).empty);
});
test('morphAt: holds the first shape, eases each transition, holds after', () => {
  const K = [{ t: 0, to: 'galaxy' }, { t: 2, to: 'logo', d: 2, style: 'converge', ease: 'linear' }, { t: 6, to: 'sphere', d: 1, style: 'burst' }];
  assert.deepEqual([M.morphAt(K, 1).a, M.morphAt(K, 1).b, M.morphAt(K, 1).p], ['galaxy', 'galaxy', 1]);
  const m = M.morphAt(K, 3); assert.equal(m.a, 'galaxy'); assert.equal(m.b, 'logo'); close(m.p, .5); assert.equal(m.style, 'converge');
  assert.equal(M.morphAt(K, 5).p, 1); assert.equal(M.morphAt(K, 5).b, 'logo');
  assert.equal(M.morphAt(K, 6.5).style, 'burst'); assert.equal(M.morphAt(K, 9).b, 'sphere');
});
