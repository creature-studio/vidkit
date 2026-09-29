// Time helpers + beat grid. Pure, DOM-free.
import { getEase, EASE } from './ease.js';

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const clamp01 = x => clamp(x, 0, 1);
export const lerp = (a, b, p) => a + (b - a) * p;
export const frac = x => x - Math.floor(x);
export const seg = (t, a, b) => clamp01((t - a) / (b - a));           // 0 before a, 1 after b
export const progress = (t, t0, d, ease) => getEase(ease || 'linear')(clamp01((t - t0) / d));
// rise then fall: 0→1 over [a, a+din], hold, 1→0 over [b-dout, b]
export const window01 = (t, a, b, din = .3, dout = .3) => Math.min(seg(t, a, a + din), 1 - seg(t, b - dout, b));

// keyframes: kf(t, [[t0, v0], [t1, v1], ...], ease) — values may be numbers or arrays of numbers
export function kf(t, keys, ease) {
  if (!keys.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const a = keys[i - 1], b = keys[i], e = getEase(b[2] || ease || 'inOutCubic'), p = e((t - a[0]) / (b[0] - a[0]));
      if (Array.isArray(a[1])) return a[1].map((v, j) => lerp(v, b[1][j], p));
      return lerp(a[1], b[1], p);
    }
  }
  return keys[keys.length - 1][1];
}

/* ---------- beat grid ----------
 * Either constant BPM (+offset) or an explicit list of beat times (Phase 2: beats detected from imported music).
 * Visual hits land on the audio frame or one frame early ("VLEAD"), never late. */
export class BeatGrid {
  constructor(o = {}) { this.fps = o.fps || 30; this.set(o); }
  set(o = {}) {
    if (o.fps) this.fps = o.fps;
    this.bpm = +o.bpm || 0; this.offset = +o.offset || 0;
    this.times = Array.isArray(o.times) && o.times.length ? o.times.slice().sort((a, b) => a - b) : null;
    if (this.times && !this.bpm && this.times.length > 1) this.bpm = 60 / ((this.times[this.times.length - 1] - this.times[0]) / (this.times.length - 1));
    this.beat = this.bpm ? 60 / this.bpm : .5;
    return this;
  }
  get active() { return !!(this.bpm || this.times); }
  // time of beat n (fractional allowed)
  at(n) {
    if (!this.times) return this.offset + n * this.beat;
    const T = this.times, i = Math.floor(n), f = n - i;
    if (i < 0) return T[0] + n * this.beat;
    if (i >= T.length - 1) return T[T.length - 1] + (n - (T.length - 1)) * this.beat;
    return T[i] + (T[i + 1] - T[i]) * f;
  }
  // fractional beat index at time t (binary search for explicit beats)
  index(t) {
    if (!this.times) return (t - this.offset) / this.beat;
    const T = this.times;
    if (t < T[0]) return (t - T[0]) / this.beat;
    if (t >= T[T.length - 1]) return T.length - 1 + (t - T[T.length - 1]) / this.beat;
    let lo = 0, hi = T.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
    return lo + (t - T[lo]) / (T[lo + 1] - T[lo]);
  }
  // 1 on every beat (one frame early), decays exponentially. every=2 → every other beat
  pulse(t, k = 6, every = 1) { return this.active ? Math.exp(-frac(this.index(t + 1 / this.fps) / every) * k) : 0; }
  // one-shot accent at t0
  hit(t, t0, k = 8) { return t < t0 - 1 / this.fps ? 0 : Math.exp(-k * Math.max(0, t - t0 + 1 / this.fps)); }
  // eased arrival exactly at t1, starting d earlier (default: half a beat)
  snap(t, t1, d) { d = d || this.beat / 2; return EASE.house(seg(t, t1 - d, t1)); }
  // quantise a time to the nearest subdivision (e.g. 2 = eighth notes)
  quantize(t, sub = 1) { return this.at(Math.round(this.index(t) * sub) / sub); }
}

// "1.2" → 1.2s ; "b:16" → beat 16 on the grid (one frame early), relative to `base` (scene start)
export function parseTime(v, grid, base = 0) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  v = String(v).trim();
  if (v.startsWith('b:')) return grid.at(+v.slice(2)) - 1 / grid.fps - base;
  return +v;
}
export function parseDur(v, grid) {
  if (typeof v === 'number') return v;
  v = String(v || '');
  return v.startsWith('b:') ? +v.slice(2) * grid.beat : +v;
}
