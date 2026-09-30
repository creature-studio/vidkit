// vk.gl (Phase 3 WebGL effects): the pure maths behind the shaders (bleed timeline, pyramid σ, boil stepping, path
// jitter, particles) must be pure functions of their inputs; and in a real browser every GL layer must give the
// same pixels for the same t regardless of the order frames are rendered in (skipped without Playwright Chromium).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stepT, boilFrame, rgb, bleedCurve, levelSigma, levelFor, haloSigma, probit, jitterPath, jitterPoints } from '../src/fx/gl/math.js';
import { particles, PRESETS } from '../src/fx/gl/particles.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const shuffle = (arr, seed = 7) => { const a = arr.slice(); let s = seed; for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

test('stepT / boilFrame: stepped "on twos", exact at step boundaries, cycling', () => {
  close(stepT(0, 12), 0); close(stepT(1 / 12, 12), 1 / 12); close(stepT(1 / 12 - 1e-4, 12), 0); close(stepT(.99, 12), 11 / 12);
  assert.equal(boilFrame(0, 12), 0); assert.equal(boilFrame(1 / 12, 12), 1); assert.equal(boilFrame(.5, 12), 6);
  // at 24 fps playback, 12 fps boil holds each drawing for exactly two frames
  const seq = Array.from({ length: 8 }, (_, i) => boilFrame(i / 24, 12)); assert.deepEqual(seq, [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.equal(boilFrame(1, 12, 3), 12 % 3); assert.equal(boilFrame(-1 / 12, 12, 3), 2);
  close(stepT(.37, 0), .37);
});

test('rgb: hex (3/6), rgb(), arrays', () => {
  assert.deepEqual(rgb('#fff'), [1, 1, 1]); assert.deepEqual(rgb('#000000'), [0, 0, 0]);
  const c = rgb('#1f2529'); close(c[0], 31 / 255); close(c[2], 41 / 255);
  assert.deepEqual(rgb('rgb(255, 0, 51)').map(x => +x.toFixed(3)), [1, 0, .2]);
  assert.deepEqual(rgb([255, 0, 0]), [1, 0, 0]); assert.deepEqual(rgb([.5, .5, .5]), [.5, .5, .5]);
});

test('bleedCurve: off before at, core condenses .98→.5, halo front only moves outwards (√t), done/fade', () => {
  const o = { at: 1, draw: .8, dur: 2 };
  assert.equal(bleedCurve(.5, o).on, false); assert.equal(bleedCurve(.5, o).alpha, 0);
  const s0 = bleedCurve(1, o); close(s0.core, .98); close(s0.halo, 1);
  let prevC = 2, prevH = 2;
  for (let t = 1; t <= 4.5; t += .05) { const c = bleedCurve(t, o); assert.ok(c.core <= prevC + 1e-12 && c.halo <= prevH + 1e-12, `monotonic at ${t}`); prevC = c.core; prevH = c.halo; }
  close(bleedCurve(10, o).core, .5); close(bleedCurve(10, o).halo, .12); assert.ok(bleedCurve(10, o).done); assert.ok(!bleedCurve(1.5, o).done);
  // diffusion: halo progress ∝ √t → half the final wet progress after a quarter of the time
  const w = t => (1 - bleedCurve(t, o).halo) / (1 - .12);
  close(w(1 + .28 + .5), .5, 1e-9);
  const f = { ...o, fade: [5, 6] }; close(bleedCurve(4.9, f).alpha, 1); close(bleedCurve(5.5, f).alpha, .5); assert.equal(bleedCurve(6, f).on, false);
  assert.deepEqual(bleedCurve(2.345, o), bleedCurve(2.345, o));   // pure
});

test('pyramid σ table and its inverse; halo σ from the wanted spread', () => {
  close(levelSigma(1), 2); close(levelSigma(2), Math.sqrt(20)); assert.ok(levelSigma(6) > 70);
  for (const s of [1, 2, 3.3, 7, 20, 60, 110]) { const l = levelFor(s, 7), i = Math.floor(l), fr = l - i; const back = i >= 7 ? levelSigma(7) : levelSigma(i) + (levelSigma(i + 1) - levelSigma(i)) * fr; if (s >= levelSigma(1)) close(back, s, 1e-9); }
  close(probit(.5), 0, 1e-9); close(probit(.975), 1.959963985, 1e-6); close(probit(.02), -2.053748911, 1e-6);
  close(haloSigma(10, .16), 10 / probit(.84), 1e-9);
});

test('jitterPath: deterministic, constant within a drawing, redrawn at the next, structure kept', () => {
  const d = 'M10,10 L50,12 Q60,40 90,20 C100,0 120,0 130,20 A5,5 0 0 1 140,20 H160 V40 Z';
  const a = jitterPath(d, .30, { fps: 12, amp: 2, seed: 1 }), b = jitterPath(d, .32, { fps: 12, amp: 2, seed: 1 }), c = jitterPath(d, .42, { fps: 12, amp: 2, seed: 1 });
  assert.equal(a, b, 'same 1/12 s step → identical'); assert.notEqual(a, c, 'next step → new drawing');
  assert.equal(a, jitterPath(d, .30, { fps: 12, amp: 2, seed: 1 }));
  assert.notEqual(a, jitterPath(d, .30, { fps: 12, amp: 2, seed: 2 }));
  const nums = s => (s.match(/-?\d*\.?\d+/g) || []).length; assert.equal(nums(a), nums(d));
  assert.deepEqual(a.match(/[A-Za-z]/g), d.match(/[A-Za-z]/g));
  assert.ok(a.includes('A5,5 0 0 1 140,20') && a.includes('H160') && a.includes('V40'), 'arc/H/V untouched');
  // offsets bounded by amp
  const P0 = d.match(/-?\d*\.?\d+/g).slice(0, 6).map(Number), P1 = a.match(/-?\d*\.?\d+/g).slice(0, 6).map(Number);
  P0.forEach((v, i) => assert.ok(Math.abs(v - P1[i]) <= 2 + 1e-9));
  assert.equal(jitterPath(d, .3, { amp: 0 }), d);
  const pts = [[0, 0], [10, 0], [20, 0]]; assert.deepEqual(jitterPoints(pts, .1, { seed: 3 }), jitterPoints(pts, .12, { seed: 3 }));
});

test('particles: state is a pure function of t — any evaluation order gives identical particles', () => {
  for (const preset of Object.keys(PRESETS)) {
    const mk = () => particles({ preset, seed: 9, burst: [{ t: .5, n: 25 }], rate: preset === 'petals' || preset === 'mist' ? 3 : 0, from: 0, to: 4, x: 400, y: 300, floor: preset === 'inkDrops' ? 500 : undefined });
    const times = Array.from({ length: 60 }, (_, i) => i * .1);
    const A = mk(), B = mk();
    const fwd = new Map(times.map(t => [t, A.at(t)]));
    for (const t of shuffle(times)) assert.deepEqual(B.at(t), fwd.get(t), `${preset} t=${t}`);
  }
});

test('particles: emission slots, ballistic motion, landing on the floor, settling splats', () => {
  const P = particles({ seed: 1, burst: [{ t: 1, n: 10 }], x: 0, y: 0, angle: -90, spread: 0, speed: 100, gravity: 200, life: 5, floor: 50, splat: 2, soak: 5 });
  assert.equal(P.at(.99).length, 0); assert.equal(P.at(1.01).length, 10);
  const p = P.at(1.5)[0]; close(p.x, 0, 1e-9); close(p.y, -100 * .5 + .5 * 200 * .25, 1e-9);        // no drag: x0 + v t + ½ g t²
  // lands when -100a + 100a² = 50 → a = (1 + √3) / 2
  const la = (1 + Math.sqrt(3)) / 2, q = P.at(1 + la + .01)[0]; assert.ok(q.landed); close(q.land.t, 1 + la, 1e-5); close(q.y, 50, 1e-3);
  const late = P.at(1 + la + 3)[0]; assert.ok(late.settled); close(late.size / P.at(1.2)[0].size, 2, 1e-9);
  // with drag the closed form still matches a fine numerical integration
  const D = particles({ seed: 2, burst: [{ t: 0, n: 1 }], x: 0, y: 0, angle: 0, spread: 0, speed: 300, gravity: 400, drag: 1.5, life: 3 });
  let x = 0, y = 0, vx = 300, vy = 0; const dt = 1e-4; for (let t = 0; t < 1; t += dt) { vx += -1.5 * vx * dt; vy += (400 - 1.5 * vy) * dt; x += vx * dt; y += vy * dt; }
  const s = D.at(1)[0]; close(s.x, x, .2); close(s.y, y, .2);
  // steady rate: ~rate × window alive, never more than emitted
  const R = particles({ seed: 3, rate: 10, from: 0, to: 100, life: 1, speed: 10 });
  const n = R.at(50).length; assert.ok(n >= 9 && n <= 11, `alive ${n}`); assert.equal(R.at(-1).length, 0);
  // top-down splatter: lands after its flight time and then stays put
  const S = particles({ preset: 'splatter', seed: 4, burst: [{ t: 0, n: 30 }], x: 100, y: 100 });
  const s1 = S.at(2), s2 = S.at(9); assert.equal(s1.length, 30); assert.ok(s1.every(p => p.landed)); assert.deepEqual(s1.map(p => [p.x, p.y]), s2.map(p => [p.x, p.y]));
  assert.ok(s2.every(p => p.settled));
});

// ---------------- browser: GL layers are seek-order pure ----------------
let chromiumOk = true, playwright;
try { playwright = await import('playwright'); } catch { chromiumOk = false; }
async function glHashes(page, times) {
  const out = {};
  for (const t of times) {
    out[t] = await page.evaluate(t => {
      window.__seek(t);
      return [...document.querySelectorAll('canvas.vk-gl')].filter(c => c.closest('.vk-scene.on') || !c.closest('.vk-scene')).map(c => {
        const d = new Uint32Array(c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data.buffer); let h = 2166136261;
        for (let k = 0; k < d.length; k++) h = Math.imul(h ^ d[k], 16777619) >>> 0; return h;
      }).join(',');
    }, t);
  }
  return out;
}
test('browser: every vk.gl layer gives identical pixels for any seek order (and the check catches an impure layer)', { skip: !chromiumOk, timeout: 120000 }, async t => {
  const { startServer, pageUrl, LAUNCH } = await import('../cli/lib.mjs');
  let browser; try { browser = await playwright.chromium.launch(LAUNCH); } catch (e) { t.skip('chromium not installed: ' + e.message); return; }
  const { server, port } = await startServer();
  try {
    const abs = path.join(ROOT, 'test/fixtures/gl.html');
    const open = async q => { const p = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(pageUrl(port, abs, { render: '1', ...q })); await p.waitForFunction(() => window.__ready); await p.evaluate(() => window.__ready); return { p, errs }; };
    const times = [0, .2, .35, .5, .8, 1.1, 1.5, 1.8, 1.85, 1.9, 1.93, 2.1, 2.4, 2.45, 2.6, 3.0, 3.5, 3.9];
    const { p: A, errs } = await open({});
    const gl = await A.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl'); });
    if (!gl) { t.skip('WebGL unavailable in this Chromium'); return; }
    const seq = await glHashes(A, times);
    const { p: B } = await open({});
    const shuf = await glHashes(B, shuffle(times, 3));
    for (const tt of times) assert.equal(shuf[tt], seq[tt], `pixels at t=${tt} depend on seek order`);
    // repeated seeks back and forth on the same page
    const again = await glHashes(A, [...times].reverse());
    for (const tt of times) assert.equal(again[tt], seq[tt], `pixels at t=${tt} changed on re-render`);
    assert.ok(new Set(times.filter(x => x < 2).map(x => seq[x])).size > 5, 'frames actually differ over time');
    assert.deepEqual(errs, []);
    // negative control: a layer whose cache key ignores t keeps stale pixels → the same comparison must fail
    const { p: C } = await open({ bad: '1' }), { p: D } = await open({ bad: '1' });
    const c1 = await glHashes(C, [1.2, 1.9]), c2 = await glHashes(D, [1.5, 1.9]);
    assert.notEqual(c1[1.9], c2[1.9], 'the purity check must detect a seek-order dependent layer');
  } finally { await browser.close(); server.close(); }
});
