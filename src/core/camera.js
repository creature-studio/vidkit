// Camera math (pure). Keys: [{t, x, y, s, r, ease}] — (x,y) is the stage point to centre on, s zoom, r rotation (deg).
// Default (unchanged legacy behaviour): an omitted x/y falls back to the frame centre W/2,H/2, s to 1, r to 0.
// Opt-in hold mode — an omitted x / y / s / r HOLDS the previous key's value: normKeys(keys, W, H, { hold: true }),
// sc.camera(keys, { hold: true }) or vk.video({ cameraHold: true }).
//
// Shots (phase 3): sc.shots([...]) builds a camera *function* of scene time from shot-size presets that frame a
// subject (a rig's head / feet points), follow cams with deterministic smoothing, punch-ins on hits, pans and dollies,
// and an auto-frame pass that keeps the given heads inside the frame. Everything is a pure function of t.
import { getEase } from './ease.js';
import { hash } from './random.js';

export function normKeys(keys, W, H, o = {}) {
  const hold = o.hold === true;
  const raw = keys.map((k, i) => ({ k, i, t: +k.t || 0 })).sort((a, b) => (a.t - b.t) || (a.i - b.i));
  let prev = { x: W / 2, y: H / 2, s: 1, r: 0 };
  return raw.map(({ k, t }) => {
    const d = hold ? prev : { x: W / 2, y: H / 2, s: 1, r: 0 };
    const s = k.s != null ? +k.s : k.zoom != null ? +k.zoom : d.s;
    const r = k.r != null ? +k.r : k.rotate != null ? +k.rotate : (hold ? d.r : 0);
    const out = { t, x: k.x == null ? d.x : +k.x, y: k.y == null ? d.y : +k.y, s, r, ease: getEase(k.ease || 'inOutCubic') };
    prev = out; return out;
  });
}
export function camAt(keys, lt) {
  if (lt <= keys[0].t) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    if (lt < keys[i].t) {
      const a = keys[i - 1], b = keys[i], p = b.ease((lt - a.t) / (b.t - a.t));
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s * Math.pow(b.s / a.s, p), r: a.r + (b.r - a.r) * p };
    }
  }
  return keys[keys.length - 1];
}
// deterministic shake offset, quantised to `rate` fps (24 = film)
export function shakeAt(shakes, lt, rate = 24) {
  let dx = 0, dy = 0, dr = 0;
  shakes.forEach((sh, si) => {
    if (lt < sh.t || lt > sh.t + sh.d) return;
    const f = Math.floor(lt * rate + 1e-6), q = Math.max(0, f / rate - sh.t);   // whole shake is quantised ("on twos")
    const a = sh.amp * Math.exp(-sh.k * q) * Math.max(0, 1 - q / sh.d);
    dx += (hash(f * 1.7 + si * 13) - .5) * 2 * a; dy += (hash(f * 2.3 + 9 + si * 13) - .5) * 2 * a; dr += (hash(f * 3.1 + 4 + si * 7) - .5) * a * .08 * (sh.rot || 0);
  });
  return { dx, dy, dr };
}
// full camera transform for a scene at local time. c.fn(lt) → {x, y, s, r} (shots) takes precedence over c.keys.
export function cameraTransform(c, W, H, lt, dur) {
  const k = c.fn ? c.fn(lt) : c.keys ? camAt(c.keys, lt) : { x: W / 2, y: H / 2, s: 1, r: 0 };
  const push = c.push ? 1 + c.push * Math.min(1, lt / dur) : 1;
  const zs = k.s * push * (1 + (c.extraZoom ? c.extraZoom(lt) : 0));
  const sh = shakeAt(c.shakes || [], lt);
  return `translate(${W / 2 + sh.dx}px,${H / 2 + sh.dy}px) rotate(${(k.r || 0) + sh.dr}deg) scale(${zs}) translate(${-k.x}px,${-k.y}px)`;
}

/* ================================================================ shots ================================================ */
// Shot sizes: which part of the subject fills `fill` of the frame height and where the head sits.
//   region: [from, to] along the subject, 0 = top of the head, 1 = soles ('head' = head-top → chin ≈ 2·headR)
//   eye: screen y (0..1) of the head centre for tight shots (rule of thirds); null = centre the region
export const SHOTS = {
  'extreme-wide': { region: [0, 1], fill: .28, eye: null },
  wide: { region: [0, 1], fill: .5, eye: null },
  full: { region: [0, 1], fill: .82, eye: null },
  'medium-wide': { region: [0, .78], fill: .9, eye: .3 },        // knees up (cowboy)
  medium: { region: [0, .55], fill: .9, eye: .3 },               // waist up
  'medium-close': { region: [0, .38], fill: .92, eye: .34 },     // chest up
  close: { region: 'head', heads: 2.9, eye: .4 },                // head + shoulders: head (2r) ≈ 1/2.9 of the frame
  'extreme-close': { region: 'head', heads: 1.35, eye: .46, min: 2.2 },    // face fills the frame
};
SHOTS.ws = SHOTS.wide; SHOTS.ms = SHOTS.medium; SHOTS.cu = SHOTS.close; SHOTS.ecu = SHOTS['extreme-close']; SHOTS.xcu = SHOTS['extreme-close']; SHOTS.mcu = SHOTS['medium-close'];

// subject = {head: [x, y] (head centre, world px), headR (px), feet: [x, y] (ground contact), facing: ±1}
export function subjectHeight(sub) { return Math.max(1, (sub.feet ? sub.feet[1] : sub.head[1] + 7 * sub.headR) - (sub.head[1] - sub.headR)); }
// camera {x, y, s} framing `sub` with a shot preset (name or {region, fill, eye, heads}); o: {W, H, lookroom (.1 of the
// frame width towards the facing side), offset [dx, dy] screen px, s (override zoom)}
export function frameShot(shot, sub, o = {}) {
  const W = o.W || 1280, H = o.H || 720, P = typeof shot === 'string' ? SHOTS[shot] : shot;
  if (!P) throw new Error('[vk] unknown shot ' + shot);
  const top = sub.head[1] - sub.headR, h = subjectHeight(sub), r = sub.headR;
  let s, cy, cx;
  if (P.region === 'head') {
    // at least 1.25× tighter than a chest-up shot, so close > medium-close for any head/body proportion
    const mc = SHOTS['medium-close'], sMC = (mc.fill * H) / Math.max(1, mc.region[1] * h);
    s = o.s || Math.max(H / (P.heads * 2 * r), sMC * (P.min || 1.25));
    cy = sub.head[1] + (.5 - P.eye) * H / s;
  } else {
    const y0 = top + P.region[0] * h, y1 = top + P.region[1] * h;
    s = o.s || (P.fill * H) / Math.max(1, y1 - y0);
    cy = P.eye == null ? (y0 + y1) / 2 : sub.head[1] + (.5 - P.eye) * H / s;
  }
  const midX = sub.feet && P.region !== 'head' && (P.region[1] || 0) > .9 ? (sub.head[0] + sub.feet[0]) / 2 : sub.head[0];
  cx = midX + (sub.facing || 0) * (o.lookroom != null ? o.lookroom : .1) * W / s;
  if (o.offset) { cx -= o.offset[0] / s; cy -= o.offset[1] / s; }
  return { x: cx, y: cy, s, r: 0 };
}
// keep a camera's view inside world bounds [x0, y0, x1, y1] (default: the stage) and zoom ≥ minS
export function clampView(cam, o = {}) {
  const W = o.W || 1280, H = o.H || 720, b = o.bounds === false ? null : (o.bounds || [0, 0, W, H]);
  let { x, y, s } = cam;
  if (b) {
    s = Math.max(s, W / (b[2] - b[0]), H / (b[3] - b[1]), o.minS || 0);
    const hw = W / 2 / s, hh = H / 2 / s;
    x = Math.min(Math.max(x, b[0] + hw), b[2] - hw); y = Math.min(Math.max(y, b[1] + hh), b[3] - hh);
  } else if (o.minS) s = Math.max(s, o.minS);
  if (o.maxS) s = Math.min(s, o.maxS);
  return { ...cam, x, y, s };
}
// minimal move (and, if needed, zoom-out) so every box [x0, y0, x1, y1] (world px) lies inside the frame with `margin`
// (fraction of the frame on each side). Used to keep heads in frame during fast action.
export function keepInFrame(cam, boxes, o = {}) {
  const W = o.W || 1280, H = o.H || 720, m = o.margin != null ? o.margin : .06;
  if (!boxes || !boxes.length) return cam;
  let { x, y, s } = cam;
  const bx0 = Math.min(...boxes.map(b => b[0])), by0 = Math.min(...boxes.map(b => b[1])), bx1 = Math.max(...boxes.map(b => b[2])), by1 = Math.max(...boxes.map(b => b[3]));
  // zoom out if the union cannot fit
  const sMax = Math.min(W * (1 - 2 * m) / Math.max(1, bx1 - bx0), H * (1 - 2 * m) / Math.max(1, by1 - by0));
  if (s > sMax) s = Math.max(o.minS || 0, sMax);
  const hw = W / 2 / s, hh = H / 2 / s, mx = W * m / s, my = H * m / s;
  if (bx0 < x - hw + mx) x = bx0 + hw - mx; if (bx1 > x + hw - mx) x = bx1 - hw + mx;
  if (by0 < y - hh + my) y = by0 + hh - my; if (by1 > y + hh - my) y = by1 - hh + my;
  return { ...cam, x, y, s };
}
// punch-in envelope: 0 before t0, rises in `attack` s, decays exponentially (k) and is gone after d
export function punchEnv(t, t0, o = {}) {
  const a = o.attack != null ? o.attack : .035, d = o.d != null ? o.d : .45, k = o.k != null ? o.k : 7;
  const u = t - t0; if (u <= 0 || u >= d) return 0;
  const rise = u < a ? Math.sin(Math.PI / 2 * u / a) : 1;
  return rise * Math.exp(-k * Math.max(0, u - a)) * (1 - Math.pow(u / d, 4));
}
// deterministic follow smoothing: exponentially weighted average of f over the last 4·lag seconds (N fixed samples),
// i.e. a causal low-pass of the subject motion that only depends on t (seek-order independent)
export function smoothFollow(f, t, lag = .25, n = 12) {
  if (!(lag > 0)) return f(t);
  const span = 4 * lag; let sw = 0, acc = null;
  for (let i = 0; i < n; i++) {
    const tau = span * i / (n - 1), w = Math.exp(-tau / lag), v = f(t - tau);
    if (acc == null) acc = Array.isArray(v) ? v.map(() => 0) : 0;
    if (Array.isArray(v)) v.forEach((x, j) => { acc[j] += x * w; }); else acc += v * w;
    sw += w;
  }
  return Array.isArray(acc) ? acc.map(x => x / sw) : acc / sw;
}
// blend two framings by interpolating the view rectangle (centre and 1/zoom linearly): a point that sits at the same
// screen position in both framings stays put, and screen positions move linearly (no drift/overshoot mid-blend)
export const lerpCam = (a, b, p) => { const ia = 1 / a.s, ib = 1 / b.s, i = ia + (ib - ia) * p; return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: 1 / i, r: (a.r || 0) + ((b.r || 0) - (a.r || 0)) * p }; };
// head box of a subject (world px)
export const headBox = (sub, pad = 1.25) => [sub.head[0] - sub.headR * pad, sub.head[1] - sub.headR * pad, sub.head[0] + sub.headR * pad, sub.head[1] + sub.headR * pad];

// shot list → camera function lt → {x, y, s, r}
//   list entries (scene-local t, sorted):
//     {t, shot: 'wide'|'medium'|'close'|'extreme-close'|…, on: subject | fn(lt) → subject, follow: true | lag s,
//      d: blend s from the previous shot (0 = cut, default), ease, lookroom, offset: [dx, dy], s}
//     {t, cam: {x, y, s, r}}                          explicit framing
//     {t, pan: [x, y] | fn, d, ease}                  move the centre, keep the zoom
//     {t, dolly: s, d, ease}                          change the zoom, keep the centre (towards `at` if given)
//     {t, punch: amp (.12), d (.45), at: [x, y] | fn, pull (.35: share of the way towards `at`)}   hit punch-in
//   o: {W, H, subject (default for entries without on), keep: [subject fns] (heads kept in frame), margin, bounds, minS, maxS, lag}
export function shotCamera(list, o = {}) {
  const W = o.W || 1280, H = o.H || 720;
  const L = list.map((e, i) => ({ ...e, i, t: +e.t || 0 })).sort((a, b) => (a.t - b.t) || (a.i - b.i));
  const framing = L.filter(e => !e.punch), punches = L.filter(e => e.punch);
  const subAt = (e, lt) => { const s = e.on || o.subject; return typeof s === 'function' ? s(lt) : s; };
  // camera that entry e asks for at time lt (before blending)
  function want(idx, lt) {
    const e = framing[idx];
    if (!e) return { x: W / 2, y: H / 2, s: 1, r: 0 };
    if (e.cam) return { r: 0, ...e.cam };
    const prev = () => (idx > 0 ? hold(idx - 1, e.t) : { x: W / 2, y: H / 2, s: 1, r: 0 });
    if (e.pan) { const p = prev(), to = typeof e.pan === 'function' ? e.pan(lt) : e.pan; return { ...p, x: to[0], y: to[1] }; }
    if (e.dolly) { const p = prev(); if (!e.at) return { ...p, s: e.dolly }; const a = typeof e.at === 'function' ? e.at(lt) : e.at, k = 1 - p.s / e.dolly; return { ...p, s: e.dolly, x: p.x + (a[0] - p.x) * k, y: p.y + (a[1] - p.y) * k }; }
    const lag = e.follow === true ? (o.lag != null ? o.lag : .22) : typeof e.follow === 'number' ? e.follow : 0;
    const at = e.follow ? lt : e.t;              // a locked-off shot frames the subject where it is when the shot starts
    const f = u => { const s = subAt(e, u); return s ? frameShot(e.shot || 'medium', s, { W, H, lookroom: e.lookroom, offset: e.offset, s: e.s }) : { x: W / 2, y: H / 2, s: e.s || 1, r: 0 }; };
    if (!lag) return f(at);
    const c = f(at), sm = smoothFollow(u => { const q = f(u); return [q.x, q.y]; }, at, lag);
    return { ...c, x: sm[0], y: sm[1] };
  }
  // camera at lt with blends between consecutive framings (recursive over at most a couple of overlapping blends)
  function hold(idx, lt, depth = 0) {
    const e = framing[idx], c = want(idx, lt);
    const d = e.d != null ? e.d : (e.pan || e.dolly ? 1 : 0);
    if (idx === 0 || d <= 0 || lt >= e.t + d || depth > 3) return c;
    const p = getEase(e.ease || (e.pan || e.dolly ? 'inOutSine' : 'inOutCubic'))(Math.max(0, (lt - e.t) / d));
    return lerpCam(hold(idx - 1, lt, depth + 1), c, p);
  }
  return function camera(lt) {
    let i = -1; for (let j = 0; j < framing.length; j++) if (lt >= framing[j].t) i = j;
    let c = hold(Math.max(0, i), lt);
    // punch-ins: multiplicative zoom towards the hit point
    for (const e of punches) {
      const env = punchEnv(lt, e.t, { d: e.d, k: e.k, attack: e.attack }); if (!env) continue;
      const amp = typeof e.punch === 'number' ? e.punch : .12, s1 = c.s * (1 + amp * env);
      let x = c.x, y = c.y;
      if (e.at) { const a = typeof e.at === 'function' ? e.at(lt) : e.at, k = (e.pull != null ? e.pull : .35) * env; x += (a[0] - x) * k; y += (a[1] - y) * k; }
      c = { ...c, x, y, s: s1 };
    }
    if (o.keep && o.keep.length) c = keepInFrame(c, o.keep.map(f => headBox(typeof f === 'function' ? f(lt) : f, o.headPad)), { W, H, margin: o.margin, minS: o.minS });
    return clampView(c, { W, H, bounds: o.bounds, minS: o.minS, maxS: o.maxS });
  };
}
