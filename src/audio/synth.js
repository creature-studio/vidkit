// Pure, deterministic DSP (DOM-free): little physical/additive instrument models that return Float32Array mono
// buffers. Used both by the in-page OfflineAudioContext sound kit (registry.sounds: pluck, flute, drop, croak …)
// and by Node scripts that render a whole music bed to WAV (see examples/tadpole/make-music.mjs).
// Every generator takes (sr, …, opts) and is seeded — the same arguments always give the same samples.
import { mulberry32 } from '../core/random.js';

const TAU = Math.PI * 2;
const dbAmp = db => Math.pow(10, db / 20);

// RBJ biquad (lowpass | highpass | bandpass | peak | notch) as a stateful per-sample function
export function biquad(type, f, q = .707, sr = 48000, gainDb = 0) {
  const w = TAU * Math.min(f, sr * .45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'bandpass') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'notch') { b0 = 1; b1 = -2 * c; b2 = 1; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; } // peak
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
// attack / exponential-decay envelope value at time t (s)
export const envAD = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));

// Plucked string (Karplus–Strong with fractional delay, pluck-position comb and a loop low-pass).
// o: {decay: s to −60 dB, bright: 0..1, pos: pluck position 0..1, vib: {rate, depth (semitones), delay},
//     slide: {to: semitones, at: s, d: s} (guqin 上/下滑音), body: true adds a wooden-body resonance, seed}
export function pluck(sr, f, dur, o = {}) {
  const n = Math.max(1, Math.floor(sr * dur)), out = new Float32Array(n), rnd = mulberry32(o.seed || 7);
  const decay = o.decay || 2.5, bright = o.bright != null ? o.bright : .45, pos = o.pos || .18;
  const maxD = Math.ceil(sr / Math.max(20, f * Math.pow(2, Math.min(0, (o.slide && o.slide.to) || 0) / 12) * .9)) + 4;
  const buf = new Float32Array(maxD + 2); let w = 0;
  const D0 = sr / f, exc = Math.floor(D0);
  // excitation: filtered noise with a pluck-position comb (removes harmonics at multiples of 1/pos)
  const burst = new Float32Array(exc), lp = biquad('lowpass', 800 + 7000 * bright, .7, sr), P = Math.max(1, Math.round(exc * pos));
  for (let i = 0; i < exc; i++) burst[i] = lp(rnd() * 2 - 1);
  for (let i = exc - 1; i >= P; i--) burst[i] -= burst[i - P];
  const g = Math.pow(10, -3 / (f * decay));  // loss per period → −60 dB after `decay` s
  let prev = 0, dcx = 0, dcy = 0;
  const body = o.body ? [biquad('peak', 220, 1.2, sr, 5), biquad('peak', 560, 2, sr, 3)] : null;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let semi = 0;
    if (o.slide) { const s = o.slide, p = Math.min(1, Math.max(0, (t - s.at) / (s.d || .25))); semi += s.to * p * p * (3 - 2 * p); }
    if (o.vib) { const v = o.vib, amt = Math.min(1, Math.max(0, (t - (v.delay || .2)) / .3)); semi += v.depth * amt * Math.sin(TAU * v.rate * t); }
    const D = Math.min(maxD - 1, Math.max(2, sr / (f * Math.pow(2, semi / 12)) - .5));
    let r = w - D; while (r < 0) r += maxD; const i0 = Math.floor(r), fr = r - i0, a = buf[i0 % maxD], b = buf[(i0 + 1) % maxD];
    const d = a + (b - a) * fr;
    const s = g * ((1 - bright * .5) * .5 * (d + prev) + bright * .5 * d); prev = d;
    const x = (i < exc ? burst[i] : 0) + s;
    buf[w] = x; w = (w + 1) % maxD;
    // DC blocker
    const y = x - dcx + .995 * dcy; dcx = x; dcy = y;
    out[i] = body ? body[1](body[0](y)) * .8 : y;
  }
  // fade the tail so buffers can be cut anywhere
  const fade = Math.min(n, Math.floor(sr * .02)); for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
  return normPeak(out, o.peak != null ? o.peak : .9);
}

// Breathy bamboo flute (dizi/xiao-like): additive tone + vibrato + band-passed breath noise.
// o: {attack, release, vib: {rate, depth}, breath: 0..1, seed, harm: [amps…]}
export function flute(sr, f, dur, o = {}) {
  const n = Math.max(1, Math.floor(sr * dur)), out = new Float32Array(n), rnd = mulberry32(o.seed || 11);
  const at = o.attack || .12, rel = o.release || .25, H = o.harm || [1, .32, .12, .05], br = o.breath != null ? o.breath : .25;
  const vib = o.vib || { rate: 5.2, depth: .22 }, bp = biquad('bandpass', f * 2, 1.4, sr), bp2 = biquad('bandpass', f * 4, 2, sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, e = Math.min(1, t / at) * Math.min(1, (dur - t) / rel);
    const va = Math.min(1, Math.max(0, (t - .25) / .4)), semi = vib.depth * va * Math.sin(TAU * vib.rate * t) + (o.bend ? o.bend * Math.max(0, 1 - t / .12) : 0);
    ph += TAU * f * Math.pow(2, semi / 12) / sr;
    let s = 0; for (let k = 0; k < H.length; k++) s += H[k] * Math.sin(ph * (k + 1));
    const nz = rnd() * 2 - 1, breath = (bp(nz) * 1.5 + bp2(nz) * .5) * (br * (.4 + .6 * Math.exp(-t / at * 1.5)));
    out[i] = (s * .6 + breath) * Math.max(0, e);
  }
  return normPeak(out, o.peak != null ? o.peak : .8);
}

// Water drop "plink": fast upward pitch sweep of a decaying sine (bubble resonance) + tiny click
export function drop(sr, o = {}) {
  const f0 = o.f || 700, dur = o.dur || .18, n = Math.floor(sr * dur), out = new Float32Array(n), rnd = mulberry32(o.seed || 3);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f0 * (1 + 1.8 * (1 - Math.exp(-t / .018)));
    ph += TAU * f / sr; out[i] = Math.sin(ph) * Math.exp(-t / .045) + (i < 40 ? (rnd() - .5) * .6 * (1 - i / 40) : 0);
  }
  return normPeak(out, o.peak || .8);
}
// bubbles: a few small drops in quick succession
export function bubbles(sr, o = {}) {
  const k = o.count || 5, dur = o.dur || .6, out = new Float32Array(Math.floor(sr * dur)), rnd = mulberry32(o.seed || 9);
  for (let j = 0; j < k; j++) { const d = drop(sr, { f: 900 + rnd() * 900, dur: .09, seed: j + 1, peak: .5 + rnd() * .4 }); mixInto(out, d, Math.floor((j / k) * dur * .8 * sr + rnd() * 1500), 1); }
  return normPeak(out, o.peak || .7);
}
// filtered-noise splash / ripple swish
export function splash(sr, o = {}) {
  const dur = o.dur || .45, n = Math.floor(sr * dur), out = new Float32Array(n), rnd = mulberry32(o.seed || 5);
  const bp = biquad('bandpass', o.f || 1600, .7, sr), lp = biquad('lowpass', 5000, .7, sr);
  for (let i = 0; i < n; i++) { const t = i / sr; out[i] = lp(bp(rnd() * 2 - 1)) * envAD(t, .012, dur / 4) * (1 + .5 * Math.sin(TAU * 13 * t)); }
  return normPeak(out, o.peak || .7);
}
// frog croak ("呱"): pulse train of resonant bursts (vocal-sac buzz). o: {pulses, rate (Hz), f (formant), dur}
export function croak(sr, o = {}) {
  const dur = o.dur || .32, n = Math.floor(sr * dur), out = new Float32Array(n), rate = o.rate || 38, fc = o.f || 520;
  const P = Math.floor(dur * rate);
  for (let k = 0; k < P; k++) {
    const t0 = k / rate, amp = Math.sin(Math.PI * (k + .5) / P);
    for (let i = Math.floor(t0 * sr); i < Math.min(n, Math.floor((t0 + .02) * sr)); i++) {
      const tau = i / sr - t0; out[i] += amp * (Math.sin(TAU * fc * tau) * .8 + Math.sin(TAU * fc * 2.1 * tau) * .3 + Math.sin(TAU * 140 * tau) * .5) * Math.exp(-tau / .0045);
    }
  }
  const lp = biquad('lowpass', 2200, .8, sr); for (let i = 0; i < n; i++) out[i] = lp(out[i]);
  return normPeak(out, o.peak || .85);
}
// duck quack / goose honk: nasal sawtooth through two formants with a pitch fall. o: {f0, f1, formants:[…], dur}
export function quack(sr, o = {}) {
  const dur = o.dur || .24, n = Math.floor(sr * dur), out = new Float32Array(n), f0 = o.f0 || 260, f1 = o.f1 || 190;
  const F = (o.formants || [1050, 2400]).map((f, j) => biquad('bandpass', f, j ? 5 : 4, sr)), hp = biquad('highpass', 300, .7, sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, p = t / dur, f = f0 + (f1 - f0) * p + 8 * Math.sin(TAU * 30 * t);
    ph = (ph + f / sr) % 1; const saw = 2 * ph - 1;
    const e = Math.min(1, t / .015) * Math.pow(Math.max(0, 1 - p), .6);
    out[i] = hp(F.reduce((m, fl, j) => m + fl(saw) * (j ? .6 : 1), 0)) * e;
  }
  return normPeak(out, o.peak || .8);
}
// wooden fish (木鱼) tock
export function woodfish(sr, o = {}) {
  const dur = o.dur || .22, n = Math.floor(sr * dur), out = new Float32Array(n), f = o.f || 420; let ph = 0;
  const bp = biquad('bandpass', f * 2.7, 6, sr), rnd = mulberry32(o.seed || 2);
  for (let i = 0; i < n; i++) { const t = i / sr, ff = f * (1 - .45 * Math.min(1, t / .08)); ph += TAU * ff / sr; out[i] = Math.sin(ph) * Math.exp(-t / .045) + bp(rnd() * 2 - 1) * Math.exp(-t / .006) * 2; }
  return normPeak(out, o.peak || .8);
}
// temple gong / bowl: inharmonic partials with slow beating
export function gong(sr, o = {}) {
  const dur = o.dur || 4, n = Math.floor(sr * dur), out = new Float32Array(n), f = o.f || 110;
  const parts = [[1, 1, 3.2], [2.01, .5, 2.4], [2.98, .25, 1.6], [4.16, .12, 1.1], [5.43, .06, .8]];
  for (let i = 0; i < n; i++) { const t = i / sr; let s = 0; for (const [m, a, d] of parts) s += a * Math.sin(TAU * f * m * t + m) * Math.exp(-t / d) * (1 + .15 * Math.sin(TAU * .7 * m * t)); out[i] = s * Math.min(1, t / .01); }
  return normPeak(out, o.peak || .8);
}

// ---------------- mixing utilities (Node renders) ----------------
export function normPeak(x, peak = .9) { let m = 1e-9; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); const g = peak / m; for (let i = 0; i < x.length; i++) x[i] *= g; return x; }
export function mixInto(dst, src, at, gain = 1) { const a = Math.max(0, at | 0); for (let i = 0; i < src.length && a + i < dst.length; i++) dst[a + i] += src[i] * gain; return dst; }
// equal-power stereo placement of a mono buffer into [L, R]
export function mixStereo(L, R, src, at, gain = 1, pan = 0) {
  const a = (pan + 1) * Math.PI / 4, gl = Math.cos(a) * gain, gr = Math.sin(a) * gain, s = Math.max(0, at | 0);
  for (let i = 0; i < src.length && s + i < L.length; i++) { L[s + i] += src[i] * gl; R[s + i] += src[i] * gr; }
}
// Schroeder/Freeverb-style stereo reverb (4 combs + 2 allpasses per channel); returns new [L, R] wet+dry
export function reverb([L, R], sr, o = {}) {
  const room = o.room != null ? o.room : .82, damp = o.damp != null ? o.damp : .35, wet = o.wet != null ? o.wet : .28, k = sr / 44100;
  const chan = (x, spread) => {
    const combs = [1116, 1188, 1277, 1356].map(d => ({ b: new Float32Array(Math.round((d + spread) * k)), i: 0, lp: 0 }));
    const aps = [556, 441].map(d => ({ b: new Float32Array(Math.round((d + spread) * k)), i: 0 }));
    const y = new Float32Array(x.length);
    for (let n = 0; n < x.length; n++) {
      const inp = x[n] * .25; let s = 0;
      for (const c of combs) { const o2 = c.b[c.i]; c.lp = o2 * (1 - damp) + c.lp * damp; c.b[c.i] = inp + c.lp * room; c.i = (c.i + 1) % c.b.length; s += o2; }
      for (const a of aps) { const o2 = a.b[a.i], v = -s + o2; a.b[a.i] = s + o2 * .5; a.i = (a.i + 1) % a.b.length; s = v; }
      y[n] = x[n] * (1 - wet * .5) + s * wet;
    }
    return y;
  };
  return [chan(L, 0), chan(R, 23)];
}
// 16-bit PCM WAV bytes from channel arrays (clipped to ±1)
export function wavBytes(chs, sr) {
  const n = chs[0].length, c = chs.length, dv = new DataView(new ArrayBuffer(44 + n * c * 2)), w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n * c * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, c, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * c * 2, true); dv.setUint16(32, c * 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * c * 2, true);
  for (let i = 0; i < n; i++) for (let j = 0; j < c; j++) dv.setInt16(44 + (i * c + j) * 2, Math.round(Math.max(-1, Math.min(1, chs[j][i])) * 32767), true);
  return new Uint8Array(dv.buffer);
}
// Chinese pentatonic helper: degree (0..4 = 宫商角徵羽, may exceed 4 / be negative for other octaves) → Hz
export function penta(root, degree) { const S = [0, 2, 4, 7, 9], o = Math.floor(degree / 5), d = ((degree % 5) + 5) % 5; return root * Math.pow(2, o + S[d] / 12); }
export { dbAmp };
