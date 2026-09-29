// Time helpers + beat grid. Pure, DOM-free.
import { getEase, EASE } from './ease.js';

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const clamp01 = x => clamp(x, 0, 1);
export const lerp = (a, b, p) => a + (b - a) * p;
export const frac = x => x - Math.floor(x);
const frac9 = x => Math.max(0, x - Math.floor(x + 1e-9));   // frac robust to float error just below an integer
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
 * Either constant BPM (+offset) or an explicit list of beat times (Phase 2: `vk analyze` output), optionally with
 * downbeats (bar starts). Visual hits land on the audio frame or `lead` frames early (default 1), never late. */
export class BeatGrid {
  constructor(o = {}) { this.fps = o.fps || 30; this.lead = 1; this.set(o); }
  set(o = {}) {
    if (o.fps) this.fps = o.fps;
    if (o.lead != null) this.lead = +o.lead;
    this.bpm = +o.bpm || 0; this.offset = +o.offset || 0; this.meter = +o.meter || 4;
    this.times = Array.isArray(o.times) && o.times.length ? o.times.slice().sort((a, b) => a - b) : null;
    if (this.times && !this.bpm && this.times.length > 1) this.bpm = 60 / ((this.times[this.times.length - 1] - this.times[0]) / (this.times.length - 1));
    this.beat = this.bpm ? 60 / this.bpm : .5;
    // bar starts as beat indices on this grid (explicit downbeats are matched to the nearest beat)
    this.downIdx = null;
    if (Array.isArray(o.downbeats) && o.downbeats.length) {
      const idx = o.downbeats.map(d => Math.round(this.index(d))); this.downIdx = [...new Set(idx)].sort((a, b) => a - b);
    } else if (o.downbeat != null) this.firstDown = +o.downbeat;   // beat index of the first bar start (constant grids)
    return this;
  }
  get active() { return !!(this.bpm || this.times); }
  get leadT() { return this.lead / this.fps; }
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
  // ---- bars (measures). Named measure()/barIndex() so they never clash with the vk.bar() chart ----
  // beat index where bar n starts (fractional n interpolates inside the bar)
  barBeat(n) {
    const D = this.downIdx;
    if (!D) return (this.firstDown || 0) + n * this.meter;
    const i = Math.floor(n), f = n - i;
    if (i < 0) return D[0] + n * this.meter;
    if (i >= D.length - 1) return D[D.length - 1] + (n - (D.length - 1)) * this.meter;
    return D[i] + (D[i + 1] - D[i]) * f;
  }
  measure(n) { return this.at(this.barBeat(n)); }
  // fractional bar index at time t
  barIndex(t) {
    const b = this.index(t), D = this.downIdx;
    if (!D) return (b - (this.firstDown || 0)) / this.meter;
    if (b < D[0]) return (b - D[0]) / this.meter;
    if (b >= D[D.length - 1]) return D.length - 1 + (b - D[D.length - 1]) / this.meter;
    let lo = 0, hi = D.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (D[m] <= b) lo = m; else hi = m; }
    return lo + (b - D[lo]) / (D[lo + 1] - D[lo]);
  }
  // position of the beat inside its bar: 1..meter
  beatInBar(t) { const b = Math.floor(this.index(t + this.leadT) + 1e-6), bb = Math.floor(this.barIndex(this.at(b) + 1e-6)), s = Math.round(this.barBeat(bb)); return b - s + 1; }
  // 1 on every beat (`lead` frames early), decays exponentially. every=2 → every other beat
  pulse(t, k = 6, every = 1) { return this.active ? Math.exp(-frac9(this.index(t + this.leadT) / every) * k) : 0; }
  // 1 on every bar start (every=2 → every other bar)
  barPulse(t, k = 4, every = 1) { return this.active ? Math.exp(-frac9(this.barIndex(t + this.leadT) / every) * k) : 0; }
  // one-shot accent at t0
  hit(t, t0, k = 8) { return t < t0 - this.leadT ? 0 : Math.exp(-k * Math.max(0, t - t0 + this.leadT)); }
  // eased arrival exactly at t1, starting d earlier (default: half a beat)
  snap(t, t1, d) { d = d || this.beat / 2; return EASE.house(seg(t, t1 - d, t1)); }
  // quantise a time to the nearest subdivision (e.g. 2 = eighth notes)
  quantize(t, sub = 1) { return this.at(Math.round(this.index(t) * sub) / sub); }
  // next grid point (beat or bar) at/after t: returns its time (without lead)
  ceil(t, unit = 'beat', n = 1) {
    if (unit === 'bar') { const i = Math.ceil(this.barIndex(t) / n - 1e-6) * n; return this.measure(i); }
    const i = Math.ceil(this.index(t) / n - 1e-6) * n; return this.at(i);
  }
}

// "1.2" → 1.2s ; "b:16" → beat 16 on the grid (one frame early), relative to `base` (scene start)
export function parseTime(v, grid, base = 0) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  v = String(v).trim();
  if (v.startsWith('b:')) return grid.at(+v.slice(2)) - grid.leadT - base;
  if (v.startsWith('m:')) return grid.measure(+v.slice(2)) - grid.leadT - base;   // bar (measure) N
  return +v;
}
// durations: seconds, 'b:N' beats, 'm:N' bars. Without a start this is the nominal length; Video.scene() resolves
// grid durations against the real (possibly uneven) beat list so cuts land on beats — see cutDur().
export function parseDur(v, grid) {
  if (typeof v === 'number') return v;
  v = String(v || '');
  if (v.startsWith('b:')) return +v.slice(2) * grid.beat;
  if (v.startsWith('m:')) return +v.slice(2) * grid.meter * grid.beat;
  return +v;
}
// grid-aware duration: a scene whose cut-in happens at `cut` and lasts 'b:N' / 'm:N' ends exactly on the grid point
// N beats/bars later (minus the lead). Returns the absolute end time, or null for plain seconds.
export function gridEnd(v, grid, cut) {
  if (typeof v !== 'string' || !grid.active) return null;
  const m = /^([bm]):(-?[\d.]+)$/.exec(v.trim()); if (!m) return null;
  const n = +m[2], c = cut + grid.leadT;
  if (m[1] === 'b') return grid.at(Math.round(grid.index(c)) + n) - grid.leadT;
  return grid.measure(Math.round(grid.barIndex(c)) + n) - grid.leadT;
}
