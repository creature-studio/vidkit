// Reusable character motion (phase 3), all pure functions of time / distance — no state between frames:
//   gait(o)            walk / run cycle with FOOT LOCKING: the cycle phase is driven by the distance travelled, so a
//                      planted foot never slides (root speed = stride / period); hip height follows the leg geometry
//   cycle(t, o)        constant-speed convenience: distance = stride · t / period
//   mouth(seg, lt)     lip-sync: open amount + one of 4 visemes (M · A · E · O) from the TTS audio envelope (rms +
//                      spectral centroid, written by `vk tts`) or, without it, from the word timings
//   boilPoints / boilPath   stepped line boil ("on twos", 12 fps) for polygons / path strings
//   follow(f, t, lag)  delayed + smoothed copy of a trajectory (secondary motion, camera follow)
//   spring(f, t, o)    damped spring that chases f, integrated from t − window with a fixed step (seek-order free)
//   drag(f, t, o)      angle that lags behind motion (cloth flaps, hair, tassels): − gain · velocity, spring-smoothed
//   ribbon(anchor, t, o)  ribbon / sash / streamer polyline trailing the anchor's past path + gravity + flutter
//   ribbonPath(pts, w0, w1)  tapered closed outline for a ribbon polyline
import { noise1, hash } from '../core/random.js';
import { boilFrame } from './gl/math.js';
import { smooth01, clamp } from '../core/time.js';

const TAU = Math.PI * 2;
const frac = x => x - Math.floor(x);

/* ================================================================ gait + foot locking */
// o: {stride: body travel per full cycle (both steps), px · duty: share of the cycle a foot is planted (walk .62,
//     run .36) · lift: swing-foot clearance · hip: standing hip height above the sole · leg: max hip→sole reach
//     (thigh + shin + ankle) · offsets: phase of each foot ([0, .5]) · flight: extra hip rise in run flight phases ·
//     toe: swing toe-down angle (deg) · ahead: where the foot lands relative to the hip (share of the stance travel, .5)}
// at(d) → {feet: [{x, y, contact, u, angle}], hipX, hipY, phase} in forward units: x along the path from the start
// (hip at x = d), y = height above the ground. A foot's world x during stance is constant → no sliding.
export function gait(o = {}) {
  const S = o.stride || 120, duty = o.duty != null ? o.duty : .62, lift = o.lift != null ? o.lift : S * .14;
  const hip = o.hip || 190, leg = o.leg || hip * 1.04, offs = o.offsets || [0, .5], ahead = o.ahead != null ? o.ahead : .5;
  const flight = o.flight != null ? o.flight : (duty < .5 ? S * .08 : 0), toe = o.toe != null ? o.toe : 18;
  function foot(d, phi) {
    const c = d / S + phi, k = Math.floor(c), u = c - k;
    // landing position of step k (forward units)
    const land = j => (j - phi) * S + S * duty * ahead;
    if (u < duty) return { x: land(k), y: 0, contact: true, u, angle: 0 };
    const v = (u - duty) / (1 - duty), e = (1 - Math.cos(Math.PI * v)) / 2;
    return { x: land(k) + S * e, y: lift * Math.pow(Math.sin(Math.PI * v), .9) * (1 + .25 * Math.sin(Math.PI * v) * (1 - v)), contact: false, u, angle: toe * Math.sin(Math.PI * v) * (v < .6 ? 1 : (1 - v) / .4) };
  }
  function at(d) {
    d = Math.max(0, d);
    const feet = offs.map(p => foot(d, p));
    // hip height: standing height, lowered where a planted leg could not reach (natural walk bob)
    let h = hip, planted = 0;
    for (const f of feet) if (f.contact) { planted++; const dx = f.x - d; const reach = Math.sqrt(Math.max(0, leg * leg - dx * dx)); h = Math.min(h, reach); }
    if (!planted && flight) {      // run: hip rises during the flight phase
      const ups = offs.map(p => { const u = frac(d / S + p); return u >= duty ? (u - duty) / (1 - duty) : null; }).filter(x => x != null);
      const v = Math.min(...ups.map(x => Math.min(x, 1 - x))) * 2;
      h = hip + flight * Math.sin(Math.PI * clamp(v, 0, 1) / 2);
    }
    return { feet, hipX: d, hipY: h, phase: frac(d / S) };
  }
  // nearest distance ≥ d where all feet are planted (a clean stop): searches the cycle on a fine grid
  function rest(d) {
    for (let i = 0; i < 400; i++) { const x = d + i * S / 400; if (offs.every(p => frac(x / S + p) < duty - .02 && frac(x / S + p) > .02)) return x; }
    return d;
  }
  return { at, foot, rest, stride: S, duty, o: { ...o, stride: S, duty, lift, hip, leg, offsets: offs } };
}
// constant-speed cycle: o.period (s, full cycle) · speed = stride / period
export function cycle(t, o = {}) { const g = o.gait || gait(o), per = o.period || 1.1; return g.at(Math.max(0, t) * g.stride / per); }
// distance travelled along keys [[t, x], …] with eased segments (monotonic positions → monotonic distance)
export function travel(t, keys, ease = smooth01) {
  if (t <= keys[0][0]) return 0;
  let d = 0;
  for (let i = 1; i < keys.length; i++) {
    const [t0, x0] = keys[i - 1], [t1, x1] = keys[i];
    if (t >= t1) { d += Math.abs(x1 - x0); continue; }
    return d + Math.abs(x1 - x0) * ease((t - t0) / (t1 - t0 || 1));
  }
  return d;
}

/* ================================================================ lip-sync */
export const VISEMES = ['M', 'A', 'E', 'O'];   // closed · open (a) · spread (e/i) · round (o/u)
// seg: a scene voice line {at, end, words: [{w, t, end}], env: {rate, rms: [0..1], cen: [0..1]}} (sc.voSegs[i]);
// lt: scene-local time. o: {fps (hold visemes on twos, 12), gain, threshold}. Returns {open 0..1, shape, i}
export function mouth(seg, lt, o = {}) {
  const closed = { open: 0, shape: 'M', i: 0 };
  if (!seg) return closed;
  const fps = o.fps != null ? o.fps : 12, tq = fps ? Math.floor(lt * fps + 1e-6) / fps : lt, u = tq - seg.at;
  if (u < -.05 || (seg.end != null && tq > seg.end + .1)) return closed;
  const env = seg.env || (seg.entry && seg.entry.env);
  if (env && env.rms && env.rms.length) {
    const fi = u * env.rate, i0 = Math.floor(fi), w = fi - i0, g = j => env.rms[Math.max(0, Math.min(env.rms.length - 1, j))] || 0;
    if (fi < 0 || i0 >= env.rms.length) return closed;
    const r = (g(i0) * (1 - w) + g(i0 + 1) * w) * (o.gain || 1);
    const open = smooth01((r - (o.threshold != null ? o.threshold : .08)) / .5);
    if (open < .12) return { open, shape: 'M', i: 0 };
    const c = env.cen ? (env.cen[Math.max(0, Math.min(env.cen.length - 1, i0))] || .5) : .5;
    const shape = c < .2 ? 'O' : c > .6 && open < .75 ? 'E' : 'A';
    return { open, shape, i: VISEMES.indexOf(shape) };
  }
  const W = seg.words || [];
  for (let j = 0; j < W.length; j++) {
    const a = W[j].t, b = W[j].end != null ? W[j].end : a + .2;
    if (u >= a && u < b) {
      const v = (u - a) / Math.max(.05, b - a), open = Math.pow(Math.sin(Math.PI * clamp(v, 0, 1)), .55);
      if (open < .15) return { open, shape: 'M', i: 0 };
      const ch = String(W[j].w || '').codePointAt(0) || j, pick = Math.floor(hash(ch * .713 + 3.1) * 3) + 1;   // no phonetics: a stable pick per syllable
      return { open, shape: VISEMES[pick], i: pick };
    }
  }
  if (!W.length && seg.dur) { const open = Math.abs(Math.sin(u * Math.PI * 4)); return open < .2 ? { open, shape: 'M', i: 0 } : { open, shape: 'A', i: 1 }; }
  return closed;
}

/* ================================================================ line boil */
// polygon points re-drawn `fps` times a second (amp px, seed); the same drawing within one step
export function boilPoints(pts, t, o = {}) {
  const amp = o.amp != null ? o.amp : 1.2; if (!amp) return pts;
  const fr = boilFrame(t, o.fps || 12, o.frames || 0), seed = (o.seed || 0) * 13.37 + fr * 71.3, sm = o.smooth || 3;
  return pts.map((p, i) => [p[0] + (noise1(i / sm + seed) - .5) * 2 * amp, p[1] + (noise1(i / sm + seed + 91.7) - .5) * 2 * amp]);
}

/* ================================================================ secondary motion */
// delayed + smoothed copy of f (number or [x, y]) — average of f over [t − lag − spread, t − lag]
export function follow(f, t, lag = .12, spread = null, n = 6) {
  const sp = spread == null ? lag : spread; if (!(sp > 0)) return f(t - lag);
  let acc = null;
  for (let i = 0; i < n; i++) { const v = f(t - lag - sp * i / (n - 1)); if (acc == null) acc = Array.isArray(v) ? v.map(() => 0) : 0; if (Array.isArray(v)) v.forEach((x, j) => { acc[j] += x / n; }); else acc += v / n; }
  return acc;
}
// damped spring chasing target f(t): x'' = ω²(f − x) − 2ζω x', starting at rest on f(t − window); semi-implicit Euler at
// a fixed step, so the value depends on t only. o: {freq Hz (2.2), damping ζ (.35), window s (1.6), dt (1/120)}
export function spring(f, t, o = {}) {
  const w = TAU * (o.freq || 2.2), z = o.damping != null ? o.damping : .35, win = o.window || 1.6, dt = o.dt || 1 / 120;
  const n = Math.ceil(win / dt), t0 = t - n * dt, first = f(t0), arr = Array.isArray(first);
  let x = arr ? first.slice() : [first], v = x.map(() => 0);
  for (let i = 1; i <= n; i++) {
    const tt = t0 + i * dt, g = f(tt), gv = arr ? g : [g];
    for (let j = 0; j < x.length; j++) { v[j] += (w * w * (gv[j] - x[j]) - 2 * z * w * v[j]) * dt; x[j] += v[j] * dt; }
  }
  return arr ? x : x[0];
}
// lagging angle (deg) for cloth / hair: −gain · (spring-smoothed velocity of f), clamped to ±max
export function drag(f, t, o = {}) {
  const h = o.h || 1 / 30, gain = o.gain != null ? o.gain : .06, max = o.max || 40;
  const vel = u => (f(u + h / 2) - f(u - h / 2)) / h;
  const v = o.spring === false ? follow(vel, t, o.lag || .06) : spring(vel, t, { freq: o.freq || 2.4, damping: o.damping || .45, window: o.window || 1.2, dt: o.dt || 1 / 90 });
  return clamp(-gain * v, -max, max);
}
// ribbon / sash: polyline of n+1 points from anchor(t). Point i follows the anchor's position i·lag seconds ago, offset
// by a rest shape (hang = gravity direction · i·len), with segment lengths re-normalised to len (inextensible) and a
// travelling flutter wave. o: {n 8, len 16, lag .045, hang: [dx, dy] unit dir (0, 1), sag (1: weight of the rest
// shape), flutter (px, 4), freq (Hz, 1.6), wave (rad per segment, .8), wind: [wx, wy] px per segment, seed}
export function ribbon(anchor, t, o = {}) {
  const n = o.n || 8, len = o.len || 16, lag = o.lag != null ? o.lag : .045, hang = o.hang || [0, 1], sag = o.sag != null ? o.sag : 1;
  const fl = o.flutter != null ? o.flutter : 4, fq = o.freq || 1.6, wave = o.wave != null ? o.wave : .8, wind = o.wind || [0, 0], seed = o.seed || 0;
  const raw = [];
  for (let i = 0; i <= n; i++) { const a = anchor(t - i * lag); raw.push([a[0] + (hang[0] * sag * len + wind[0]) * i, a[1] + (hang[1] * sag * len + wind[1]) * i]); }
  const pts = [raw[0].slice()];
  for (let i = 1; i <= n; i++) {
    const p = pts[i - 1], q = raw[i]; let dx = q[0] - p[0], dy = q[1] - p[1]; const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const k = fl * (i / n) * Math.sin(TAU * fq * t - wave * i + seed) + fl * .4 * (i / n) * (noise1(t * fq * .7 + i * .37 + seed * 3.1) - .5);
    pts.push([p[0] + dx * len - dy * k * .35, p[1] + dy * len + dx * k * .35]);
  }
  return pts;
}
// tapered closed outline around a polyline: width w0 at the start → w1 at the end
export function ribbonPath(pts, w0 = 10, w1 = 3, o = {}) {
  const n = pts.length; if (n < 2) return '';
  const L = [], R = [], f = x => Math.round(x * 10) / 10;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const u = i / (n - 1), w = (w0 + (w1 - w0) * u) / 2 * (o.twist ? (.55 + .45 * Math.abs(Math.cos(u * Math.PI * o.twist + (o.phase || 0)))) : 1);
    L.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]); R.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]);
  }
  return 'M' + L.concat(R.reverse()).map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + ' Z';
}
export const motion = { gait, cycle, travel, mouth, VISEMES, boilPoints, follow, spring, drag, ribbon, ribbonPath };
