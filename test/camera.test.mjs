// Phase 3 camera: key hold vs legacy snap, shot framing, auto-frame (keep heads in frame), punch-ins, shot lists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normKeys, camAt, frameShot, keepInFrame, clampView, punchEnv, smoothFollow, shotCamera, headBox, SHOTS, lerpCam } from '../src/core/camera.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const W = 1280, H = 720;
const sub = { head: [600, 300], headR: 30, feet: [600, 590], facing: 1 };
const screen = (cam, p) => [W / 2 + (p[0] - cam.x) * cam.s, H / 2 + (p[1] - cam.y) * cam.s];

test('camera keys: opt-in {hold:true} — an omitted x/y/s holds the previous key (no snap to 640/360)', () => {
  const k = normKeys([{ t: 0, x: 300, y: 200, s: 1.5 }, { t: 2, s: 2 }, { t: 3, x: 500 }], W, H, { hold: true });
  assert.deepEqual([k[1].x, k[1].y, k[1].s], [300, 200, 2]);
  assert.deepEqual([k[2].x, k[2].y, k[2].s], [500, 200, 2]);
  const mid = camAt(k, 1); close(mid.x, 300); close(mid.y, 200);
});
test('camera keys: default = legacy snap-to-centre behaviour (backward compatible)', () => {
  const k = normKeys([{ t: 0, x: 300, y: 200, s: 1.5 }, { t: 2, s: 2 }], W, H);
  assert.deepEqual([k[1].x, k[1].y, k[1].s], [640, 360, 2]);
  assert.deepEqual(normKeys([{ t: 0, x: 300, y: 200, s: 1.5 }, { t: 2, s: 2 }], W, H, { hold: false }), k);
  // keys that specify every field are identical in both modes (existing examples unchanged)
  const full = [{ t: 0, x: 640, y: 360, s: 1 }, { t: 1, x: 700, y: 300, s: 1.2 }];
  assert.deepEqual(normKeys(full, W, H, { hold: true }).map(k => [k.x, k.y, k.s, k.r]), normKeys(full, W, H).map(k => [k.x, k.y, k.s, k.r]));
  // s-only keys (explainer pages): x/y default to the centre either way
  const sOnly = [{ t: 0, s: 1 }, { t: 2, s: 1.1 }];
  assert.deepEqual(normKeys(sOnly, W, H, { hold: true }).map(k => [k.x, k.y]), normKeys(sOnly, W, H).map(k => [k.x, k.y]));
});
test('frameShot: tighter shots zoom more and put the head at the preset eye line', () => {
  const sizes = ['extreme-wide', 'wide', 'full', 'medium-wide', 'medium', 'medium-close', 'close', 'extreme-close'].map(s => frameShot(s, sub, { W, H }).s);
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] > sizes[i - 1], `${i}: ${sizes[i]} > ${sizes[i - 1]}`);
  const c = frameShot('close', sub, { W, H, lookroom: 0 });
  close(screen(c, sub.head)[1], H * SHOTS.close.eye, 1e-6);
  assert.ok(2 * sub.headR * c.s >= H / SHOTS.close.heads - 1e-6);
  // look room: facing right → the subject sits left of centre
  assert.ok(screen(frameShot('medium', sub, { W, H }), sub.head)[0] < W / 2);
});
test('keepInFrame: moves (and if needed zooms out) so every head box is inside the margins', () => {
  const cam = { x: 640, y: 360, s: 3 }, far = { head: [1000, 120], headR: 30 };
  const k = keepInFrame(cam, [headBox(sub), headBox(far)], { W, H, margin: .05 });
  for (const b of [headBox(sub), headBox(far)]) { const a = screen(k, [b[0], b[1]]), z = screen(k, [b[2], b[3]]); assert.ok(a[0] >= W * .05 - 1e-6 && a[1] >= H * .05 - 1e-6 && z[0] <= W * .95 + 1e-6 && z[1] <= H * .95 + 1e-6, JSON.stringify([a, z])); }
  assert.ok(k.s < 3);
  const unchanged = keepInFrame({ x: 600, y: 300, s: 1 }, [headBox(sub)], { W, H }); assert.deepEqual([unchanged.x, unchanged.y, unchanged.s], [600, 300, 1]);
});
test('clampView: the view never shows outside the world bounds', () => {
  const c = clampView({ x: 50, y: 700, s: 2 }, { W, H });
  close(c.x, W / 4); close(c.y, H - H / 4);
  close(clampView({ x: 640, y: 360, s: .5 }, { W, H }).s, 1);
});
test('punchEnv: 0 before the hit, peaks quickly, decays to 0 by d', () => {
  assert.equal(punchEnv(.99, 1), 0); assert.equal(punchEnv(1.5, 1, { d: .45 }), 0);
  const peak = Math.max(...Array.from({ length: 40 }, (_, i) => punchEnv(1 + i / 400, 1)));
  assert.ok(peak > .9 && peak <= 1);
  assert.ok(punchEnv(1.3, 1) < punchEnv(1.05, 1));
});
test('smoothFollow: constant input unchanged, step input is lagged and causal', () => {
  close(smoothFollow(() => 5, 3), 5);
  const step = u => (u >= 1 ? 100 : 0);
  assert.ok(smoothFollow(step, 1.05, .2) < 60 && smoothFollow(step, 1.05, .2) > 0);
  close(smoothFollow(step, .9, .2), 0);
  close(smoothFollow(step, 3, .2), 100);
});
test('lerpCam: blends the view rectangle (a point fixed on screen in both framings stays fixed)', () => {
  const a = { x: 640, y: 360, s: 1 }, p = [900, 200];
  const b = { s: 3, x: p[0] - (screen(a, p)[0] - W / 2) / 3, y: p[1] - (screen(a, p)[1] - H / 2) / 3 };
  for (const u of [.25, .5, .75]) { const c = lerpCam(a, b, u), q = screen(c, p); close(q[0], screen(a, p)[0], 1e-6); close(q[1], screen(a, p)[1], 1e-6); }
});
test('shotCamera: cut, blend, follow, punch, keep — pure function of t (seek order irrelevant)', () => {
  const moving = t => ({ head: [300 + 100 * t, 300], headR: 30, feet: [300 + 100 * t, 590], facing: 1 });
  const cam = shotCamera([{ t: 0, shot: 'wide' }, { t: 1, shot: 'medium', d: .5 }, { t: 2, shot: 'close', follow: .2 }, { t: 2.5, punch: .1 }], { W, H, subject: moving, keep: [moving] });
  const ts = [0, .5, 1, 1.25, 1.5, 2, 2.4, 2.55, 3, 4];
  const fwd = ts.map(t => cam(t)), rev = ts.slice().reverse().map(t => cam(t)).reverse();
  assert.deepEqual(fwd, rev);
  // the cut at t=1 starts a blend: halfway is between the two framings' zooms
  assert.ok(fwd[3].s > fwd[1].s && fwd[3].s < cam(1.6).s);
  // the follow shot tracks the moving head (stays near the eye line)
  const y = screen(cam(3.8), moving(3.8).head)[1]; assert.ok(Math.abs(y - H * SHOTS.close.eye) < 40, String(y));
  // punch-in: zoom above the base close-up right after 2.5
  assert.ok(cam(2.55).s > cam(2.45).s);
  // heads stay in frame at every sampled time
  for (let t = 0; t <= 4; t += .1) { const c = cam(t), b = headBox(moving(t)), a0 = screen(c, [b[0], b[1]]), a1 = screen(c, [b[2], b[3]]); assert.ok(a0[1] > -1 && a1[1] < H + 1 && a0[0] > -1 && a1[0] < W + 1, `t=${t}`); }
});
