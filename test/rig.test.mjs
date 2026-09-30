// vk.rig: FK maths, 2-bone IK (incl. root transform + mirroring), clip blending, timeline player, determinism.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRig, solve2BoneIK, blendPose, blink, mat, rootMatrix } from '../src/fx/rig.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const BONES = [
  { id: 'torso' },
  { id: 'shoulder', parent: 'torso', x: 48, y: -77 },
  { id: 'upper', parent: 'shoulder', rot: 10 },
  { id: 'lower', parent: 'upper', x: 74, y: 4 },
  { id: 'hand', parent: 'lower', x: 68, y: 5 },
  { id: 'head', parent: 'torso', y: -145 },
];
const CLIPS = {
  idle: t => ({ 'root.y': Math.sin(t * 2) * 4, head: Math.sin(t * 1.3) * 3, upper: 20, energy: .25, 'arm.tx': 200, 'arm.ty': -150 }),
  attack: t => ({ 'root.y': Math.sin(t * 4) * 4, 'root.rot': -5, head: -6, upper: 60, energy: 1, 'arm.tx': 300, 'arm.ty': -250 + Math.sin(t) * 40 }),
};
const mk = () => createRig({ bones: BONES, clips: CLIPS, ik: { arm: { chain: ['upper', 'lower', 'hand'], bend: 1 } } });

test('rig: FK world matrix matches hand-composed SVG transforms', () => {
  const r = mk(), root = { x: 700, y: 400, rot: 12, scale: .5, flip: -1 }, pose = { upper: 30, lower: -20, 'root.y': 3 };
  let m = mat.mul(rootMatrix(root), mat.trs(0, 3, 0));
  for (const [x, y, a] of [[0, 0, 0], [48, -77, 0], [0, 0, 40], [74, 4, -20]]) m = mat.mul(m, mat.trs(x, y, a));
  const want = mat.apply(m, 68, 5), got = r.point('hand', 0, 0, pose, root);
  close(got[0], want[0]); close(got[1], want[1]);
  const inv = mat.apply(mat.inv(m), ...want); close(inv[0], 68); close(inv[1], 5);
});

test('rig: solve2BoneIK reaches reachable targets and clamps unreachable ones', () => {
  for (const [tx, ty] of [[100, 20], [-40, 90], [20, -60], [120, -30]]) {
    const s = solve2BoneIK(tx, ty, 74, 68, 1), a1 = s.a1 * Math.PI / 180, a2 = s.a2 * Math.PI / 180;
    close(Math.cos(a1) * 74 + Math.cos(a2) * 68, tx, 1e-6); close(Math.sin(a1) * 74 + Math.sin(a2) * 68, ty, 1e-6);
    const b = solve2BoneIK(tx, ty, 74, 68, -1); assert.ok(Math.abs(b.elbow + s.elbow) < 1e-6, 'bend flips the elbow');
  }
  const far = solve2BoneIK(1000, 0, 74, 68); close(far.a1, 0, .5); close(far.a2, 0, .5);
});

test('rig: IK end effector hits a world target through a rotated, scaled, mirrored root (bone offsets included)', () => {
  const r = mk();
  for (const root of [{ x: 640, y: 360, scale: .55 }, { x: 300, y: 500, rot: -20, scale: .8, flip: -1 }, { x: 900, y: 200, rot: 45, scale: 1.2 }]) {
    const sh = r.point('shoulder', 0, 0, { 'root.y': 6, 'root.rot': 7 }, root), k = root.scale;
    for (const target of [[sh[0] + 60 * k, sh[1] - 70 * k], [sh[0] - 90 * k, sh[1] + 40 * k], [sh[0] + 20 * k, sh[1] + 100 * k]]) {
      const pose = r.solveIK('arm', target, { upper: 5, 'root.y': 6, 'root.rot': 7 }, root);
      const p = r.point('hand', 0, 0, pose, root);
      close(p[0], target[0], 1e-6); close(p[1], target[1], 1e-6);
    }
  }
});

test('rig: blendPose lerps shared keys, defaults missing bones to rest, keeps one-sided channels', () => {
  const b = blendPose({ a: 0, 'x.tx': 10 }, { a: 10, b: 4 }, .25, { b: 0 });
  close(b.a, 2.5); close(b.b, 1); close(b['x.tx'], 10);
  assert.deepEqual(blendPose({ a: 1 }, { a: 3 }, 0), { a: 1 }); assert.deepEqual(blendPose({ a: 1 }, { a: 3 }, 1), { a: 3 });
});

test('rig: timeline crossfade is continuous and ends on the new clip', () => {
  const r = mk(), track = [{ at: 0, clip: 'idle' }, { at: 3.8, clip: 'attack', blend: .4 }];
  close(r.sample(track, 3.79).upper, 20); close(r.sample(track, 4.3).upper, 60);
  const mid = r.sample(track, 4.0).upper; assert.ok(mid > 20 && mid < 60);
  let prev = r.sample(track, 3.7).upper;
  for (let t = 3.7; t < 4.3; t += 1 / 120) { const v = r.sample(track, t).upper; assert.ok(Math.abs(v - prev) < 2, 'no pops'); prev = v; }
});

test('rig: player is a pure function of t (seek order does not matter)', () => {
  const r = mk(), p = r.play([{ at: 0, clip: 'idle' }, { at: 2, clip: 'attack', blend: .5 }], { ik: { arm: [[0, [600, 330]], [4, [620, 320]]] }, ikMix: { arm: [[0, 0], [3, 1]] } });
  const root = t => ({ x: 640 + t * 10, y: 400, scale: .55, flip: -1 });
  const times = [0, .5, 1.9, 2.2, 2.6, 3.3, 5];
  const fwd = times.map(t => JSON.stringify(p.pose(t, root(t))));
  const rev = [...times].reverse().map(t => JSON.stringify(p.pose(t, root(t)))).reverse();
  const rnd = [3, 0, 6, 2, 5, 1, 4].map(i => [i, JSON.stringify(p.pose(times[i], root(times[i])))]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  assert.deepEqual(fwd, rev); assert.deepEqual(fwd, rnd);
  // after the mix completes the hand sits on the world target
  const t = 4.5, q = p.pose(t, root(t)), h = r.point('hand', 0, 0, q, root(t));
  close(h[0], 620, 1e-6); close(h[1], 320, 1e-6);
});

test('rig: apply writes transforms deterministically; blink is periodic', () => {
  const els = {}, fake = id => (els[id] = { a: {}, setAttribute(k, v) { this.a[k] = v; } });
  const root = { a: {}, setAttribute(k, v) { this.a[k] = v; }, querySelector: () => null };
  const r = createRig({ root, bones: BONES, el: fake, clips: CLIPS });
  const snap = t => { r.apply(r.sample([{ at: 0, clip: 'idle' }], t), { x: 10, y: 20, scale: .5 }); return JSON.stringify([root.a, ...Object.values(els).map(e => e.a)]); };
  const a = snap(1.234); snap(7); assert.equal(snap(1.234), a);
  assert.match(els.lower.a.transform, /^translate\(74 4\) rotate\(0\)$/);
  assert.equal(blink(4.3), 1); assert.equal(blink(1), 0); assert.equal(blink(4.3 + 4.4 * 3), 1);
});
