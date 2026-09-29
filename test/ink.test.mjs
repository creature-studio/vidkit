// Ink kit / tadpole additions: keyframe helpers, multi-voice VO planning, pure DSP synth, brush geometry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bump, plat, hold, inRanges, kfSpline, smooth01 } from '../src/core/time.js';
import { voSegments, voKey, planVoice, speakingAt } from '../src/audio/words.js';
import * as S from '../src/audio/synth.js';
import { brushPath, sampleLine, INK } from '../src/fx/ink.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('keyframe helpers: bump / plat / hold / inRanges / smooth01', () => {
  assert.equal(bump(0, 0, 1), 0); close(bump(.5, 0, 1), 1); assert.equal(bump(2, 0, 1), 0);
  assert.equal(plat(0, 1, 2, 3, 4), 0); close(plat(1.5, 1, 2, 3, 4), .5); assert.equal(plat(2.5, 1, 2, 3, 4), 1); close(plat(3.5, 1, 2, 3, 4), .5); assert.equal(plat(5, 1, 2, 3, 4), 0);
  assert.equal(hold(-1, [[0, 'a'], [1, 'b']]), 'a'); assert.equal(hold(1.2, [[0, 'a'], [1, 'b']]), 'b');
  assert.ok(inRanges(1.5, [[0, 1], [1.2, 2]])); assert.ok(!inRanges(1.1, [[0, 1], [1.2, 2]]));
  assert.equal(smooth01(-1), 0); assert.equal(smooth01(2), 1); close(smooth01(.5), .5);
});

test('kfSpline passes through keys, clamps outside, interpolates arrays', () => {
  const k = [[0, 0], [1, 10], [3, 4]];
  close(kfSpline(0, k), 0); close(kfSpline(1, k), 10); close(kfSpline(3, k), 4);
  close(kfSpline(-5, k), 0); close(kfSpline(9, k), 4);
  const v = kfSpline(.5, [[0, [0, 0]], [1, [10, 20]]]); assert.equal(v.length, 2); close(v[0], 5, 1e-6); close(v[1], 10, 1e-6);
  // continuity: no jump across a key
  close(kfSpline(1 - 1e-6, k), kfSpline(1 + 1e-6, k), 1e-3);
});

test('voSegments: string, legacy array, tuples, objects; voKey backwards compatible', () => {
  assert.deepEqual(voSegments('你好'), [{ text: '你好' }]);
  assert.deepEqual(voSegments(['a', 'b']), [{ text: 'ab' }]);
  const s = voSegments(['旁白', ['tad', '妈妈！', { gap: .6 }], { who: 'duck', text: '嘎' }]);
  assert.equal(s.length, 3); assert.equal(s[1].who, 'tad'); assert.equal(s[1].gap, .6); assert.equal(s[2].who, 'duck');
  assert.deepEqual(voSegments(null), []);
  assert.equal(voKey({ text: '你好' }), '你好');
  assert.equal(voKey({ text: '你好', voice: 'zh-CN-YunxiNeural', rate: '-4%' }), 'zh-CN-YunxiNeural|-4%||你好');
});

test('planVoice: sequential lines with lead/gap, per-line gap and explicit at', () => {
  const p = planVoice([{ text: 'a' }, { text: 'b' }, { text: 'c', gap: 1 }, { text: 'd', at: 20 }], [2, 1, 1, 1], { lead: .5, gap: .3 });
  close(p[0].at, .5); close(p[0].end, 2.5); close(p[1].at, 2.8); close(p[2].at, 4.8); close(p[3].at, 20); close(p[3].end, 21);
});

test('speakingAt: 1 inside words, 0 in pauses, ramps are bounded', () => {
  const w = [{ t: 0, end: .3 }, { t: 1, end: 1.2 }];
  assert.equal(speakingAt(w, .15), 1); assert.equal(speakingAt(w, .7), 0); assert.equal(speakingAt(w, 1.1), 1);
  for (let t = -.5; t < 2; t += .01) { const v = speakingAt(w, t); assert.ok(v >= 0 && v <= 1); }
});

test('synth: deterministic, bounded, pluck pitch, penta scale, wav header', () => {
  const sr = 16000;
  const a = S.pluck(sr, 220, .5, { seed: 3 }), b = S.pluck(sr, 220, .5, { seed: 3 });
  assert.deepEqual(a, b);
  for (const buf of [a, S.flute(sr, 440, .4), S.drop(sr), S.bubbles(sr), S.splash(sr), S.croak(sr), S.quack(sr), S.woodfish(sr), S.gong(sr, { dur: .5 })]) {
    let m = 0; for (const v of buf) { assert.ok(Number.isFinite(v)); m = Math.max(m, Math.abs(v)); } assert.ok(m > .1 && m <= 1, `peak ${m}`);
  }
  // pitch by zero-crossing rate over the steady part
  // pitch by autocorrelation over the steady part (search 100..600 Hz)
  const x = S.pluck(sr, 220, 1, { bright: .3 }), i0 = sr * .1, n = sr * .4; let best = 0, lag = 0;
  for (let L = Math.floor(sr / 600); L <= sr / 100; L++) { let c = 0; for (let i = i0; i < i0 + n; i++) c += x[i] * x[i + L]; if (c > best) { best = c; lag = L; } }
  assert.ok(Math.abs(sr / lag - 220) < 6, `pitch ${sr / lag}`);
  close(S.penta(100, 0), 100); close(S.penta(100, 3), 100 * Math.pow(2, 7 / 12)); close(S.penta(100, 5), 200); close(S.penta(100, -5), 50);
  const w = S.wavBytes([new Float32Array(10), new Float32Array(10)], 48000);
  assert.equal(String.fromCharCode(...w.slice(0, 4)), 'RIFF'); assert.equal(w.length, 44 + 10 * 2 * 2);
  const [l, r] = S.reverb([Float32Array.from([1, 0, 0, 0]), new Float32Array(4)], sr); assert.equal(l.length, 4); assert.equal(r.length, 4);
});

test('brushPath: closed, finite outline; palette constants', () => {
  const d = brushPath(sampleLine(u => [u * 100, Math.sin(u * 3) * 10], 20), u => 1 + 3 * Math.sin(Math.PI * u));
  assert.match(d, /^M/); assert.match(d, /Z\s*$/); assert.ok(!/NaN|Infinity/.test(d));
  assert.equal(INK.paper, '#e4e5d8'); assert.equal(INK.seal, '#b5342a');
});
