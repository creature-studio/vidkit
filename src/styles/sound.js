// Style-pack sound kit: extra offline voices (registered into registry.sounds, names prefixed to never clash with
// example-defined voices) + a deterministic music-bed sequencer used by the packs' music().
//   op-daluo · op-xiaoluo · op-nao · op-naoMute · op-bangu · op-tanggu   京剧锣鼓 (ported from examples/wusong)
//   bangzi (梆子 woodblock) · chip · chipJump · chipHit · chipNoise · saw · zap · marimba · kalimba · rustle · thump · shaker
import { registry } from '../core/plugin.js';
import { mulberry32, hash } from '../core/random.js';
import { biquad, woodfish, normPeak } from '../audio/synth.js';

const V = registry.sounds, TAU = Math.PI * 2;
const set = (n, f) => { if (!V[n]) V[n] = f; };

// ---- 锣鼓 ----
function daluo(sr) {
  const dur = 2.6, n = Math.floor(sr * dur), out = new Float32Array(n), f = 190, R = mulberry32(11);
  const parts = [[1, 1, 1.6], [1.51, .55, 1.1], [2.13, .42, .8], [2.76, .3, .6], [3.41, .22, .45], [4.37, .14, .35], [5.2, .1, .25]];
  const ph = parts.map(() => 0), bp = biquad('bandpass', 2400, 1.2, sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr, bend = 1 - .16 * (1 - Math.exp(-t / .12)); let s = 0;
    parts.forEach((p, j) => { ph[j] += TAU * f * p[0] * bend / sr; s += p[1] * Math.sin(ph[j] + j) * Math.exp(-t / p[2]) * (1 + .2 * Math.sin(TAU * (3.1 + j) * t)); });
    out[i] = (s + bp(R() * 2 - 1) * 2.4 * Math.exp(-t / .05) + (R() * 2 - 1) * .12 * Math.exp(-t / .5)) * Math.min(1, t / .002);
  }
  return normPeak(out, .85);
}
function xiaoluo(sr) {
  const dur = 1.3, n = Math.floor(sr * dur), out = new Float32Array(n), f = 780, R = mulberry32(5);
  const parts = [[1, 1, .7], [1.62, .35, .45], [2.4, .22, .3], [3.3, .12, .2]], ph = parts.map(() => 0), bp = biquad('bandpass', 5200, 1.5, sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr, bend = 1 + .1 * (1 - Math.exp(-t / .09)); let s = 0;
    parts.forEach((p, j) => { ph[j] += TAU * f * p[0] * bend / sr; s += p[1] * Math.sin(ph[j]) * Math.exp(-t / p[2]); });
    out[i] = (s + bp(R() * 2 - 1) * 1.6 * Math.exp(-t / .02)) * Math.min(1, t / .001);
  }
  return normPeak(out, .7);
}
function nao(sr, mute) {
  const dur = mute ? .16 : 1.1, n = Math.floor(sr * dur), out = new Float32Array(n), R = mulberry32(mute ? 23 : 17);
  const fr = [296, 437, 523, 609, 781, 1003], ph = fr.map(() => 0), hp = biquad('highpass', 3200, .7, sr), bp = biquad('bandpass', 7000, .8, sr), dec = mute ? .045 : .38;
  for (let i = 0; i < n; i++) {
    const t = i / sr; let m = 0; fr.forEach((f, j) => { ph[j] += f * 1.37 / sr; m += (ph[j] % 1 < .5 ? 1 : -1); });
    out[i] = (hp(m * .25 + (R() * 2 - 1)) * .8 + bp(R() * 2 - 1) * .7) * Math.exp(-t / dec) * Math.min(1, t / .0015);
  }
  return normPeak(out, .6);
}
function bangu(sr) {
  const n = Math.floor(sr * .12), out = new Float32Array(n), R = mulberry32(31), bp = biquad('bandpass', 2900, 3, sr); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (1250 - 500 * Math.min(1, t / .03)) / sr; out[i] = Math.sin(ph) * Math.exp(-t / .018) * .8 + bp(R() * 2 - 1) * 2.5 * Math.exp(-t / .01); }
  return normPeak(out, .75);
}
function tanggu(sr) {
  const n = Math.floor(sr * .7), out = new Float32Array(n), R = mulberry32(41), lp = biquad('lowpass', 900, .8, sr); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * 88 * (1 + .6 * Math.exp(-t / .03)) / sr; out[i] = Math.sin(ph) * Math.exp(-t / .22) + lp(R() * 2 - 1) * Math.exp(-t / .03) * .9; }
  return normPeak(out, .85);
}
// marimba / kalimba bars (struck modes), rustle (paper / leaves), shaker
function bar(sr, f, o = {}) {
  const dur = o.dur || .9, n = Math.floor(sr * dur), out = new Float32Array(n), modes = o.modes || [[1, 1, .38], [3.93, .28, .06], [9.2, .08, .02]];
  for (let i = 0; i < n; i++) { const t = i / sr; let s = 0; for (const [m, a, d] of modes) s += a * Math.sin(TAU * f * m * t) * Math.exp(-t / d); out[i] = s * Math.min(1, t / .0015); }
  return normPeak(out, .8);
}
function rustle(sr, o = {}) {
  const dur = o.dur || .3, n = Math.floor(sr * dur), out = new Float32Array(n), R = mulberry32(o.seed || 9), bp = biquad('bandpass', o.f || 2600, .8, sr);
  for (let i = 0; i < n; i++) { const t = i / sr, gr = R() < .25 ? 1 : .25; out[i] = bp(R() * 2 - 1) * gr * Math.sin(Math.PI * t / dur); }
  return normPeak(out, .7);
}

set('op-daluo', (k, t, v) => k.buf(t, 'op-daluo', () => daluo(k.sr), .5 * v));
set('op-xiaoluo', (k, t, v) => k.buf(t, 'op-xiaoluo', () => xiaoluo(k.sr), .34 * v));
set('op-nao', (k, t, v) => k.buf(t, 'op-nao', () => nao(k.sr, false), .3 * v));
set('op-naoMute', (k, t, v) => k.buf(t, 'op-naoMute', () => nao(k.sr, true), .28 * v));
set('op-bangu', (k, t, v) => k.buf(t, 'op-bangu', () => bangu(k.sr), .38 * v));
set('op-tanggu', (k, t, v) => k.buf(t, 'op-tanggu', () => tanggu(k.sr), .55 * v));
set('bangzi', (k, t, v, f) => k.buf(t, 'bangzi' + (f || 1150), () => woodfish(k.sr, { f: f || 1150, dur: .12 }), .4 * v));
set('chip', (k, t, v, f) => k.tone(t, 'square', f || 660, f || 660, .11, .07 * v));
set('chipJump', (k, t, v, f) => { f = f || 330; k.tone(t, 'square', f, f * 2.6, .2, .07 * v); });
set('chipHit', (k, t, v) => { k.noise(t, .12, 'lowpass', 1600, .8, .35 * v); k.tone(t, 'square', 220, 70, .16, .08 * v); });
set('chipNoise', (k, t, v) => k.noise(t, .05, 'highpass', 5000, .7, .14 * v));
set('saw', (k, t, v, f) => { f = f || 220; k.tone(t, 'sawtooth', f, f, .32, .045 * v); k.tone(t, 'sawtooth', f * 1.006, f * 1.006, .32, .03 * v); });
set('zap', (k, t, v) => { k.tone(t, 'sawtooth', 1900, 180, .22, .08 * v); k.noise(t, .1, 'bandpass', 3000, 2, .12 * v); });
set('thump', (k, t, v) => { k.tone(t, 'sine', 120, 38, .3, .8 * v); k.noise(t, .06, 'lowpass', 600, .8, .3 * v); });
set('marimba', (k, t, v, f) => k.buf(t, 'marimba' + (f || 523), () => bar(k.sr, f || 523.25), .32 * v));
set('kalimba', (k, t, v, f) => k.buf(t, 'kalimba' + (f || 784), () => bar(k.sr, f || 784, { dur: 1.4, modes: [[1, 1, .6], [5.4, .18, .05], [2.01, .12, .3]] }), .26 * v));
set('rustle', (k, t, v) => k.buf(t, 'rustle', () => rustle(k.sr), .3 * v));
set('shaker', (k, t, v) => k.noise(t, .07, 'highpass', 6500, .8, .1 * v, .02));

// ---------------- deterministic music bed ----------------
// bed(v, spec): schedules v.sfx events over [from, to] (s). spec:
//   bpm, from 0, to (default = end of the last scene), gain 1, seed, swing 0, fadeIn/fadeOut (s, gain ramps on events)
//   tracks: [{voice, steps: 'x..x..x.' (16th notes per bar; x = hit, o = soft, - = rest) | every (beats),
//             notes: [Hz…] (cycled, or chosen by a seeded walk when walk:true), gain, from/to (bars), dt}]
// The bed is a pure function of the spec: same spec → same events.
export function bed(v, spec = {}) {
  const S = v.scenes, end = spec.to != null ? spec.to : (S.length ? S[S.length - 1].start + S[S.length - 1].dur : 10);
  const bpm = spec.bpm || 90, beat = 60 / bpm, step = beat / 4, from = spec.from || 0, G = spec.gain != null ? spec.gain : 1;
  const fi = spec.fadeIn != null ? spec.fadeIn : 1, fo = spec.fadeOut != null ? spec.fadeOut : 1.5;
  const env = t => Math.min(1, (t - from) / Math.max(.01, fi), (end - t) / Math.max(.01, fo));
  let count = 0;
  for (const tr of spec.tracks || []) {
    const pat = tr.steps || 'x...', notes = tr.notes || [null], rnd = mulberry32((spec.seed || 1) * 97 + (tr.seed || count + 1));
    let ni = 0, walk = Math.floor(notes.length / 2);
    const barLen = pat.length * step;
    for (let t0 = from + (tr.from || 0) * barLen; t0 < end - .05 && (tr.to == null || t0 < from + tr.to * barLen); t0 += barLen) {
      for (let i = 0; i < pat.length; i++) {
        const c = pat[i]; if (c === '.' || c === '-') continue;
        let t = t0 + i * step + (i % 2 ? (spec.swing || 0) * step : 0) + (tr.dt || 0);
        if (t >= end - .05) break;
        const e = env(t); if (e <= 0) continue;
        let f = notes[ni % notes.length];
        if (tr.walk) { walk = Math.max(0, Math.min(notes.length - 1, walk + Math.round((rnd() - .5) * 3.2))); f = notes[walk]; if (tr.rest && rnd() < tr.rest) continue; }
        ni++;
        v.sfx(+t.toFixed(3), tr.voice, (tr.gain != null ? tr.gain : .6) * G * e * (c === 'o' ? .55 : 1), f || undefined);
        count++;
      }
    }
  }
  return count;
}
// scale helper: notes(root Hz, intervals (semitones), octaves) → Hz list ascending
export function scaleNotes(root, iv = [0, 2, 4, 7, 9], oct = 2) { const out = []; for (let o = 0; o < oct; o++) iv.forEach(s => out.push(+(root * Math.pow(2, o + s / 12)).toFixed(2))); return out; }
export const SCALES = { penta: [0, 2, 4, 7, 9], minorPenta: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], insen: [0, 1, 5, 7, 10] };
export { hash };
