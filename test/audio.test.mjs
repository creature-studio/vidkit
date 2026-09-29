// Phase 2 unit tests: beat grid bars/downbeats/lead, grid-aware durations, music analysis lookups,
// word mapping / caption chunking, mix ducking expression. DOM-free; the Python analyzer test is skipped
// when the audio toolchain (.venv) is not installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { BeatGrid, parseTime, parseDur, gridEnd } from '../src/core/time.js';
import { MusicInfo } from '../src/audio/music.js';
import { mapWords, alignToCues, chunkCues, readUnits, estimateSpeech } from '../src/audio/words.js';
import { duckExpr } from '../cli/mix.mjs';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

test('beat grid: measures from explicit downbeats (uneven tempo), bar index, beat-in-bar', () => {
  const times = Array.from({ length: 17 }, (_, i) => .3 + i * .5 + (i > 8 ? (i - 8) * .02 : 0));
  const g = new BeatGrid({ fps: 30, times, downbeats: [times[1], times[5], times[9], times[13]] });
  close(g.measure(0), times[1]); close(g.measure(2), times[9]); close(g.measure(1.5), times[7]);
  close(g.barIndex(times[5]), 1); close(g.barIndex(times[11]), 2.5);
  assert.equal(g.beatInBar(times[9] + .1), 1); assert.equal(g.beatInBar(times[12] + .01), 4);
  close(g.measure(-1), g.at(-3), 1e-9);
});
test('beat grid: constant BPM bars, lead frames, barPulse', () => {
  const g = new BeatGrid({ fps: 25, bpm: 120, lead: 2 });
  close(g.measure(3), 6); close(g.leadT, .08);
  close(g.pulse(2 - .08), 1); assert.ok(g.pulse(2 - .09) < .05, 'before the lead window: previous beat decayed');
  close(g.barPulse(4 - .08), 1); assert.ok(g.barPulse(5 - .08) < .2 && g.barPulse(5 - .08) > .1, "half a bar later: exp(-2)");
  close(parseTime('m:2', g), 4 - .08); close(parseDur('m:2', g), 4);
});
test('gridEnd: b:/m: durations end exactly on the grid (minus lead) from the cut-in point', () => {
  const times = [0, .5, 1.02, 1.5, 2.03, 2.5, 3.01, 3.5, 4.02];
  const g = new BeatGrid({ fps: 30, times, downbeats: [0, 2.03, 4.02] });
  close(gridEnd('b:4', g, 0), 2.03 - 1 / 30);
  close(gridEnd('m:1', g, 2.03 - 1 / 30), 4.02 - 1 / 30);
  close(gridEnd('b:2', g, 1.02 - 1 / 30), 2.03 - 1 / 30);
  assert.equal(gridEnd('4', g, 0), null); assert.equal(gridEnd(4, g, 0), null);
  close(g.ceil(1.1), 1.5); close(g.ceil(2.1, 'bar'), 4.02); close(g.ceil(1.02), 1.02);
});
test('MusicInfo: musicStart offset, envelope interpolation with lead, onset hit, sections', () => {
  const data = { bpm: 120, meter: 4, beats: [10, 10.5, 11, 11.5, 12], downbeats: [10, 12], onsets: [10, 10.75, 11], onsetStrength: [1, .2, .8],
    envelope: { rate: 10, loud: Array.from({ length: 200 }, (_, i) => i / 200), bands: [Array(200).fill(.5)] },
    sections: [{ start: 0, end: 11, label: 'A', energy: .4 }, { start: 11, end: 20, label: 'B', energy: .9 }], duration: 20 };
  const m = new MusicInfo(data, { start: 10, fps: 10, lead: 1 });
  assert.deepEqual(m.beats.slice(0, 3), [0, .5, 1]);
  close(m.energy(0), (10 + .1) * 10 / 200, 1e-9);       // one frame (0.1 s) early
  close(m.energy(.05), (10.15) * 10 / 200, 1e-9);
  close(m.energy(3, 0), .5);
  close(m.onsetHit(-.1, 10), 1); assert.ok(m.onsetHit(.4, 10) < .01);
  close(m.onsetHit(.9, 10, .3), .8);                       // weak onset at .75 ignored → strong one at 1.0 (lead)
  assert.equal(m.section(.5).label, 'A'); assert.equal(m.section(2).label, 'B'); close(m.section(.5).start, 0);
  assert.deepEqual(m.onsetsIn(0, 2), [0, 1]);
});
test('mapWords: Chinese chars with punctuation, English words, unknown words skipped', () => {
  const zh = mapWords('一行代码，一帧画面', [...'一行代码一帧画面'].map((w, i) => ({ w, t: i })));
  assert.equal(zh.map(p => p.s).join(''), '一行代码，一帧画面');
  assert.equal(zh.filter(p => p.wi >= 0).length, 8); assert.ok(zh.some(p => p.wi < 0 && p.s === '，'));
  const en = mapWords('Hit it on the beat!', ['Hit', 'it', 'on', 'the', 'beat'].map((w, i) => ({ w, t: i })));
  assert.equal(en.map(p => p.s).join(''), 'Hit it on the beat!'); assert.equal(en.filter(p => p.wi >= 0).length, 5);
  const miss = mapWords('从 1950 年到 2024 年', [{ w: '从', t: 0 }, { w: 'XYZ', t: 1 }, { w: '1950', t: 2 }, { w: '年', t: 3 }]);
  assert.equal(miss.filter(p => p.wi >= 0).length, 3); assert.equal(miss.map(p => p.s).join(''), '从 1950 年到 2024 年');
});
test('alignToCues: offset, hold, no overlap with the next line', () => {
  const cues = alignToCues({ lines: [{ text: 'ab', words: [{ w: 'a', t: 11, end: 11.3 }, { w: 'b', t: 11.4, end: 11.8 }] }, { text: 'c', words: [{ w: 'c', t: 12, end: 12.5 }] }] }, { offset: 10 });
  close(cues[0][0], .85); assert.ok(cues[0][1] <= 1.95 + 1e-9); close(cues[0][3][1].t, 1.4); close(cues[1][3][0].end, 2.5);
});
test('chunkCues: splits a TTS utterance at punctuation within maxChars, keeps every word', () => {
  const text = '可如果换成人均，排序就完全不同：美国和俄罗斯最高，印度仍然低于世界平均水平。';
  const chars = [...text].filter(c => !/[，：。]/.test(c));
  const words = chars.map((w, i) => ({ w, t: i * .2, end: i * .2 + .18 }));
  const cues = chunkCues(text, words, { at: 5, maxChars: 16 });
  assert.ok(cues.length >= 2); cues.forEach(c => assert.ok(readUnits(c[2]) <= 16 + 6, c[2]));
  assert.equal(cues.reduce((n, c) => n + c[3].length, 0), chars.length);
  close(cues[0][3][0].t, 5); for (let i = 1; i < cues.length; i++) assert.ok(cues[i][0] >= cues[i - 1][1]);
  assert.ok(estimateSpeech(text) > 6 && estimateSpeech(text) < 12);
});
test('duckExpr: merges close voice spans, ramps in before / out after speech', () => {
  const e = duckExpr([[1, 2], [2.3, 3], [8, 9]], .3);
  assert.equal((e.match(/clip\(/g) || []).length, 2, 'first two spans merged');
  const f = t => Function('t', 'clip', 'min', 'max', 'return ' + e)(t, (x, a, b) => Math.min(b, Math.max(a, x)), Math.min, Math.max);   // ffmpeg expr ≈ JS
  close(f(0), 1); close(f(1.5), .3); close(f(5), 1); close(f(8.5), .3); assert.ok(f(.85) > .3 && f(.85) < 1);
});
const PY = fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : null;
test('vk analyze (librosa backend) on a synthetic 120 BPM click track: tempo, beats within 15 ms, downbeat accents', { skip: !PY && 'audio toolchain not installed (tools/setup-audio.sh)' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vkat-')), wav = path.join(dir, 'click.wav'), out = path.join(dir, 'click.beats.json');
  // 20 s: kick-like click every 0.5 s starting at 0.25 s, louder low-frequency thump on every 4th beat
  const expr = "0.9*exp(-mod(t-0.25,0.5)*40)*sin(2*PI*110*mod(t-0.25,0.5))*(1+1.5*lt(mod(t-0.25,2),0.5))*gte(t,0.25)+0.3*exp(-mod(t-0.25,0.5)*120)*sin(2*PI*2000*t)*gte(t,0.25)";
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=22050:d=20`, wav]);
  execFileSync(PY, [path.join(ROOT, 'tools/vkaudio.py'), 'analyze', wav, '-o', out, '--backend', 'librosa'], { stdio: 'pipe' });
  const r = JSON.parse(fs.readFileSync(out));
  assert.ok(Math.abs(r.bpm - 120) < 1, 'bpm ' + r.bpm);
  const truth = Array.from({ length: 39 }, (_, i) => .25 + i * .5), err = r.beats.slice(2, -2).map(b => Math.min(...truth.map(x => Math.abs(x - b))));
  assert.ok(Math.max(...err) < .015, 'max beat error ' + Math.max(...err));
  assert.ok(r.envelope.loud.length > 900 && r.onsets.length > 30 && r.sections.length >= 1);
  const d0 = r.downbeats.find(d => d > 1), ph = ((d0 - .25) / .5) % 4; assert.ok(Math.abs(ph - Math.round(ph)) < .1 && Math.round(ph) % 4 === 0, 'downbeat phase ' + ph);
});
