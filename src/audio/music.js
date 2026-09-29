// Imported-music analysis (output of `vk analyze`) on the video timeline. DOM-free, pure lookups → seekable.
// Video time = song time − start (the `musicStart` offset into the file). All lookups take video time.
import { clamp01, frac } from '../core/time.js';

export class MusicInfo {
  // data: parsed *.beats.json; o: {start, fps, lead, smooth}
  constructor(data, o = {}) {
    this.data = data; this.start = +o.start || 0; this.fps = o.fps || 30; this.lead = o.lead != null ? o.lead : 1;
    const sh = a => (a || []).map(t => +(t - this.start).toFixed(4));
    this.bpm = data.bpm; this.meter = data.meter || 4;
    this.beats = sh(data.beats); this.downbeats = sh(data.downbeats); this.onsets = sh(data.onsets);
    this.onsetStrength = data.onsetStrength || this.onsets.map(() => 1);
    this.env = data.envelope || { rate: 50 };
    this.sections = (data.sections || []).map((s, i) => ({ ...s, index: i, start: s.start - this.start, end: s.end - this.start }))
      .filter(s => s.end > 0).map(s => ({ ...s, start: Math.max(0, s.start) }));
    this.duration = (data.duration || 0) - this.start;
    this.loudness = data.loudness || null;
  }
  get leadT() { return this.lead / this.fps; }
  // envelope value 0..1 at video time t (linear interpolation, `lead` frames early like every visual hit).
  // band: 'loud' (default, dB-scaled RMS) | 'rms' | 'low' | 'mid' | 'high' | 0..7 (mel band index)
  // smooth: average over ±smooth seconds (box filter over envelope samples) for calmer motion
  energy(t, band = 'loud', smooth = 0) {
    const E = this.env, arr = typeof band === 'number' ? (E.bands || [])[band] : E[band];
    if (!arr || !arr.length) return 0;
    const x = (t + this.leadT + this.start) * E.rate;
    if (!smooth) return sample(arr, x);
    const r = Math.max(1, Math.round(smooth * E.rate)); let s = 0, n = 0;
    for (let i = -r; i <= r; i += Math.max(1, Math.floor(r / 6))) { s += sample(arr, x + i); n++; }
    return s / n;
  }
  // exponential decay since the most recent onset (strength-weighted); min: ignore onsets weaker than this (0..1)
  onsetHit(t, k = 10, min = .3) {
    const T = this.onsets, tt = t + this.leadT; let lo = 0, hi = T.length - 1, j = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (T[m] <= tt) { j = m; lo = m + 1; } else hi = m - 1; }
    for (let i = j; i >= 0 && tt - T[i] < 1.5; i--) if (this.onsetStrength[i] >= min) return this.onsetStrength[i] * Math.exp(-k * (tt - T[i]));
    return 0;
  }
  // strong onsets in [a, b) (video time) — e.g. to place sfx or kinetic hits
  onsetsIn(a, b, min = .3) { return this.onsets.filter((t, i) => t >= a && t < b && this.onsetStrength[i] >= min); }
  section(t) {
    const S = this.sections; for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].start) return { ...S[i], p: clamp01((t - S[i].start) / (S[i].end - S[i].start)) };
    return S[0] ? { ...S[0], p: 0 } : null;
  }
}
function sample(arr, x) {
  if (x <= 0) return arr[0]; const i = Math.floor(x); if (i >= arr.length - 1) return arr[arr.length - 1];
  const f = x - i; return arr[i] * (1 - f) + arr[i + 1] * f;
}
export { frac };
