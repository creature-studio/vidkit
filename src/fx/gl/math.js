// Pure maths behind vk.gl (no DOM, no GL) — everything here is a function of its arguments only, so the shaders
// that mirror it and the JS that drives them give the same frame for any seek order. Unit-tested in test/gl.test.mjs.
import { hash, noise1 } from '../../core/random.js';

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

// time quantised to `fps` drawings per second ("on twos" at 24 fps = 12). Small epsilon so t = k/fps lands on k.
export function stepT(t, fps = 12) { return fps > 0 ? Math.floor(t * fps + 1e-6) / fps : t; }
// integer boil frame: changes `fps` times a second and cycles through `frames` drawings (0 = never cycle)
export function boilFrame(t, fps = 12, frames = 0) { const f = Math.floor(t * fps + 1e-6); return frames > 0 ? ((f % frames) + frames) % frames : f; }

// '#1f2529' | '#abc' | 'rgb(…)' | [r,g,b] (0..1 or 0..255) → [r,g,b] 0..1
export function rgb(c) {
  if (Array.isArray(c)) return c.some(v => v > 1) ? c.slice(0, 3).map(v => v / 255) : c.slice(0, 3);
  const s = String(c || '#000').trim();
  let m = /^#([0-9a-f]{3})$/i.exec(s); if (m) return [...m[1]].map(ch => parseInt(ch + ch, 16) / 255);
  m = /^#([0-9a-f]{6})/i.exec(s); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
  m = /rgba?\(([^)]+)\)/i.exec(s); if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map(v => +v / 255);
  return [0, 0, 0];
}

/* ---------------- ink bleed timeline ----------------
 * One blot / title / mountain = a mask that is "written" (strokes condense from their thickest parts to the exact shape)
 * and then bleeds: a lighter wet halo creeps outwards through the paper like diffusion (front ∝ √t), carrying pigment
 * to its edge (darker tide line). Everything is closed-form in the time since `at`; the fragment shader evaluates the
 * same curves per pixel (with a per-pixel delay for wipes), this JS twin drives the uniforms, caching and tests.
 *   o: {at, draw (s, stroke condense time), dur (s, bleed time), spread (px), fade: [t0, t1] (optional disappear)}
 * → {on, draw 0..1, wet 0..1, core θ, halo θ, alpha, done} */
export function bleedCurve(local, o = {}) {
  const at = o.at || 0, draw = o.draw != null ? o.draw : .8, dur = o.dur != null ? o.dur : 2.5;
  const x = local - at;
  const d = draw > 0 ? clamp01(x / draw) : (x >= 0 ? 1 : 0);
  const w = dur > 0 ? clamp01((x - draw * .35) / dur) : (x >= draw * .35 ? 1 : 0);
  const wet = Math.sqrt(w);                                         // diffusion: front distance ∝ √t
  const fade = o.fade ? 1 - sm((local - o.fade[0]) / Math.max(1e-6, o.fade[1] - o.fade[0])) : 1;
  return {
    on: x >= 0 && fade > 0, draw: d, wet, alpha: (x >= 0 ? sm(d * 2.2) : 0) * fade,
    core: .98 - .48 * sm(d),                                        // core threshold .98 → .5 (skeleton → exact shape)
    halo: 1 - (1 - (o.haloEnd != null ? o.haloEnd : .12)) * wet,    // halo threshold 1 → .12 (front moves out)
    done: x >= Math.max(draw, draw * .35 + dur) && (!o.fade || local < o.fade[0]),
  };
}
// Gaussian pyramid: level i is the mask downsampled 2^i times and blurred with a 5-tap binomial kernel (σ = 1 texel)
// at each level, so its effective σ in full-res px is √(Σ 4^k) for k ≤ i, i.e. ≈ 1.15·2^i. level(σ) inverts it.
export function levelSigma(i) { let s2 = 0; for (let k = 1; k <= i; k++) s2 += 4 ** k; return Math.sqrt(s2 + (i ? 0 : .25)); }
export function levelFor(sigma, maxLevel = 6) {
  if (sigma <= levelSigma(1)) return clamp01((sigma - .5) / (levelSigma(1) - .5));
  for (let i = 1; i < maxLevel; i++) { const a = levelSigma(i), b = levelSigma(i + 1); if (sigma <= b) return i + (sigma - a) / (b - a); }
  return maxLevel;
}
// halo σ for a wanted spread (distance of the front past the shape edge at threshold `th`) — σ·Φ⁻¹(1-th) = spread
export function haloSigma(spread, th = .12) { return spread / Math.max(.2, probit(1 - th)); }
export function probit(p) {  // inverse standard normal CDF (Acklam, |ε| < 1.2e-9)
  p = Math.min(1 - 1e-12, Math.max(1e-12, p));
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-.007784894002430293, -.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [.007784695709041462, .3224671290700398, 2.445134137142996, 3.754408661907416];
  const q0 = Math.min(p, 1 - p);
  if (q0 < .02425) { const q = Math.sqrt(-2 * Math.log(q0)), x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); return p < .5 ? x : -x; }
  const q = p - .5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ---------------- hand-drawn jitter ("line boil") ----------------
 * jitterPath(d, t, {fps 12, amp 1.5 px, seed, frames 0, smooth 3}) — every coordinate pair of an SVG path string moves by
 * a small offset that is constant within a drawing (fps) and re-drawn at the next one; neighbouring points move
 * coherently (1D value noise along the point index, `smooth` points per noise cell) so lines wobble, not fizz.
 * Commands with non-point arguments (A / H / V) are passed through untouched. Pure: same (d, t) → same string. */
export function jitterPath(d, t, o = {}) {
  const amp = o.amp != null ? o.amp : 1.5, fr = boilFrame(t, o.fps || 12, o.frames || 0), seed = (o.seed || 0) * 13.37 + fr * 71.3, sm2 = o.smooth || 3;
  if (!amp) return d;
  let k = 0;
  const f = x => Math.round(x * 100) / 100;
  return String(d).replace(/([MLCQSTmlcqst])([^MLCQSTAHVZmlcqstahvz]*)/g, (all, cmd, args) => {
    const nums = args.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi); if (!nums || nums.length < 2) return all;
    const rel = cmd === cmd.toLowerCase();
    const out = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const u = k++ / sm2;
      const dx = rel ? 0 : (noise1(u + seed) - .5) * 2 * amp, dy = rel ? 0 : (noise1(u + seed + 91.7) - .5) * 2 * amp;
      out.push(f(+nums[i] + dx) + ',' + f(+nums[i + 1] + dy));
    }
    return cmd + out.join(' ') + ' ';
  }).trim();
}
// jitter an array of [x, y] points the same way (for canvas / brushPath centre lines)
export function jitterPoints(pts, t, o = {}) {
  const amp = o.amp != null ? o.amp : 1.5, fr = boilFrame(t, o.fps || 12, o.frames || 0), seed = (o.seed || 0) * 13.37 + fr * 71.3, sm2 = o.smooth || 3;
  return pts.map((p, i) => [p[0] + (noise1(i / sm2 + seed) - .5) * 2 * amp, p[1] + (noise1(i / sm2 + seed + 91.7) - .5) * 2 * amp]);
}
// deterministic per-(seed, i) random in [0,1) — exported for effects that need a stable pick
export const rnd = (seed, i) => hash(seed * 7.31 + i * 1.618 + .5);
