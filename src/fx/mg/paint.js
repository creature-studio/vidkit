// Canvas painters (vk.mg / vk.accents): factories returning draw(g, local, info) for sc.canvas() / sc.paint().
// All are pure functions of time: scene-local seconds for one-shots (`at`), the video's BeatGrid for beat-synced
// accents (`every` in beats; visual hits land `lead` frames early like every other vidkit beat helper).
// Coordinates are stage px (1920×1080 for '1080p'); colours are any canvas colour.
import { EASE } from '../../core/ease.js';
import { clamp01, lerp } from '../../core/time.js';
import { P, recentBeats, dotwaveAt, shapeOutline, lerpPts, morphState, convergeAt, timecode } from './math.js';

const TAU = Math.PI * 2;
export const REEL = { ink: '#0A0A12', paper: '#F4EFE6', pink: '#FF3B8B', yellow: '#FFD23F', cyan: '#25E1E8', violet: '#5B3BFF' };
const DEF_COLS = [REEL.pink, REEL.yellow, REEL.cyan, REEL.violet];
const center = (o, info) => [o.x != null ? o.x : info.W / 2, o.y != null ? o.y : info.H / 2];
const sceneStart = info => (info.scene ? info.scene.start : 0);
const inWin = (o, local) => (o.from == null || local >= o.from) && (o.to == null || local < o.to);

// trigger ages for an accent: explicit scene-local times (o.times / o.at) or every `o.every` beats on the video grid
// (only beats after the scene start + o.from). → [{ k, age }] oldest first, at most n
export function triggers(o, local, info, n = 4) {
  if (o.times || o.at != null) {
    const T = [].concat(o.times || o.at);
    return T.map((t0, k) => ({ k, age: local - t0 })).filter(x => x.age >= 0).slice(-n);
  }
  const B = info.beats; if (!B || !B.active) return [];
  const start = sceneStart(info) + (o.from || 0);
  return recentBeats(B, info.t, n, o.every || 1, start - (B.leadT || 0)).map(x => ({ k: x.b, age: x.age }));
}
export function circle(g, x, y, r, fill, stroke, lw = 1, a = 1) {
  if (!(r > 0)) return;
  g.save(); g.globalAlpha *= clamp01(a); g.beginPath(); g.arc(x, y, r, 0, TAU);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
  g.restore();
}
export function plusMark(g, x, y, s, rot, col, lw = 10) {
  if (!(s > 0)) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.moveTo(0, -s); g.lineTo(0, s); g.stroke(); g.restore();
}
export function ptsPath(g, pts, x, y, R, rot) {
  const ca = Math.cos(rot), sa = Math.sin(rot); g.beginPath();
  pts.forEach((p, i) => { const px = p[0] * R, py = p[1] * R, X = x + px * ca - py * sa, Y = y + px * sa + py * ca; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
  g.closePath();
}

/* ---------------- beat-accent pack ---------------- */
// shockwave rings: one expanding ring per trigger, colour cycling, fading by radius
export const rings = (o = {}) => (g, local, info) => {
  if (!inWin(o, local)) return;
  const [x, y] = center(o, info), cols = o.colors || DEF_COLS, sp = o.speed || 1150, max = o.max || 1300, w = o.width || 8;
  for (const { k, age } of triggers(o, local, info, o.n || 4)) {
    const a0 = age - (o.delay != null ? o.delay : .12); if (a0 < 0) continue;
    const r = a0 * sp, a = clamp01(1 - r / max); if (a <= 0) continue;
    circle(g, x, y, r, null, cols[((k % cols.length) + cols.length) % cols.length], w * a + 1, a * (o.alpha != null ? o.alpha : .9));
  }
};
// speed-line streaks: n horizontal (or vertical) lines whose head (outCubic) and tail (inOutCubic, later) race across
export const streaks = (o = {}) => (g, local, info) => {
  if (!inWin(o, local)) return;
  const n = o.n || 9, W = info.W, H = info.H, vert = o.dir === 'y', L = vert ? H : W, pad = o.pad != null ? o.pad : 300;
  const tr = triggers({ ...o, at: o.every ? undefined : (o.at != null ? o.at : .04) }, local, info, 1)[0]; if (!tr) return;
  g.save(); g.strokeStyle = o.color || REEL.paper; g.globalAlpha = o.alpha != null ? o.alpha : .45; g.lineWidth = o.width || 4; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const s = i * (o.stagger != null ? o.stagger : .025), pos = (o.y0 != null ? o.y0 : 110) + i * (o.gap || 112) + (i * 37) % 46, d = o.d || .6;
    let head = lerp(-pad, L + pad, EASE.outCubic(P(tr.age, s, d))), tail = lerp(-pad, L + pad, EASE.inOutCubic(P(tr.age, s + (o.lag != null ? o.lag : .12), d)));
    if (o.reverse) { head = L - head; tail = L - tail; }
    if (Math.abs(head - tail) < .5 || (o.reverse ? head > tail : head < tail)) continue;
    g.beginPath(); if (vert) { g.moveTo(pos, tail); g.lineTo(pos, head); } else { g.moveTo(tail, pos); g.lineTo(head, pos); } g.stroke();
  }
  g.restore();
};
// radial burst lines: n spokes shooting outwards (outExpo) and shrinking, re-triggered every beat / half beat
export const burst = (o = {}) => (g, local, info) => {
  if (!inWin(o, local)) return;
  const [x, y] = center(o, info), n = o.n || 16, tr = triggers({ every: .5, ...o }, local, info, 1)[0]; if (!tr) return;
  const bp = EASE.outExpo(P(tr.age, 0, o.d || .3)); if (bp >= 1 && !o.hold) return;
  g.save(); g.strokeStyle = o.color || REEL.ink; g.lineWidth = o.width || 5; g.globalAlpha = o.alpha != null ? o.alpha : .3; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + tr.k * (o.twist != null ? o.twist : .5), r0 = (o.r0 || 260) + (o.spread || 700) * bp, r1 = r0 + (o.len || 130) * (1 - bp);
    g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke();
  }
  g.restore();
};
// per-beat flash: full-frame colour at `amount`, decaying exp(−age·k)
export const flash = (o = {}) => (g, local, info) => {
  if (!inWin(o, local)) return;
  const tr = triggers(o, local, info, 1)[0]; if (!tr) return;
  const a = (o.amount != null ? o.amount : .55) * (o.linear ? 1 - P(tr.age, 0, o.d || .07) : Math.exp(-tr.age * (o.k || 14)));
  if (a < .003) return;
  g.save(); g.globalAlpha = a; g.fillStyle = o.color || '#fff'; g.fillRect(0, 0, info.W, info.H); g.restore();
};
// orbit dots: n dots circling the centre on an ellipse, radius wobbling, optional beat kick
export const orbit = (o = {}) => (g, local, info) => {
  if (!inWin(o, local)) return;
  const [x, y] = center(o, info), n = o.n || 14, B = info.beats, kick = o.kick && B && B.active ? o.kick * B.pulse(info.t, 8) : 0;
  const col = typeof o.color === 'function' ? o.color(local, info) : (o.color || REEL.paper);
  for (let i = 0; i < n; i++) {
    const a = local * (o.speed || 2.2) + i * TAU / n, rad = (o.r || 500) + (o.wobble != null ? o.wobble : 40) * Math.sin(local * 4 + i) + kick;
    circle(g, x + Math.cos(a) * rad, y + Math.sin(a) * rad * (o.ry || .7), o.size || 9, col);
  }
};
// spinning plus marks popping in (outBack) at points [[x, y], …], optional per-beat scale kick
export const plus = (o = {}) => (g, local, info) => {
  if (!inWin(o, local)) return;
  const pts = o.points || [[150, 190], [1770, 900], [1760, 210], [170, 880]], B = info.beats;
  const kick = o.kick && B && B.active ? 1 + o.kick * B.pulse(info.t, 10) : 1;
  pts.forEach(([x, y], i) => { const p = EASE.outBack(P(local, (o.at != null ? o.at : .25) + i * (o.stagger != null ? o.stagger : .08), o.d || .4)); plusMark(g, x, y, (o.size || 34) * p * kick, local * (o.spin != null ? o.spin : 2) + i, o.color || REEL.ink, o.width || 10); });
};
// generic popping disc (the big circle behind a title): outBack radius, optional beat pulse
export const disc = (o = {}) => (g, local, info) => {
  if (!inWin(o, local)) return;
  const [x, y] = center(o, info), B = info.beats, k = o.pulse && B && B.active ? 1 + o.pulse * B.pulse(info.t, 9) : 1;
  const e = (EASE[o.ease || 'outBack'] || EASE.outBack)(P(local, o.at || 0, o.d || .55));
  circle(g, x + (o.dx ? Math.sin(local * 2) * o.dx : 0), y + (o.dy ? Math.cos(local * 2.3) * o.dy : 0), (o.r || 410) * e * k, o.color || REEL.pink, o.stroke, o.width, o.alpha != null ? o.alpha : 1);
};
export const accents = { rings, streaks, burst, flash, orbit, plus, disc };

/* ---------------- dot-grid wave background ---------------- */
// radial sine + a ring pulse on every beat, HSL colour cycling, soft rectangular hole for text, intro envelope
export const dotwave = (o = {}) => (g, local, info) => {
  const cols = o.cols || 32, rows = o.rows || 18, step = o.step || 60, x0 = o.x0 != null ? o.x0 : step / 2, y0 = o.y0 != null ? o.y0 : step / 2;
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, info.W, info.H); }
  const env = EASE.outCubic(P(local, o.at != null ? o.at : .05, o.d || .5)), B = info.beats;
  const tb = triggers({ every: o.every || 1, from: o.from }, local, info, 1)[0];
  const ba = tb ? tb.age : (local % (B && B.beat || .46875));
  const [cx, cy] = center(o, info), hole = o.hole ? { x: (o.hole.x != null ? o.hole.x - cx : 0), y: (o.hole.y != null ? o.hole.y - cy : 0), w: o.hole.w, h: o.hole.h, soft: o.hole.soft } : null;
  const sat = o.sat != null ? o.sat : 95, light = o.light != null ? o.light : 62, min = o.min != null ? o.min : .8;
  const q = { ...o, cx, cy, env, hole };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + i * step, y = y0 + j * step, d = dotwaveAt(x, y, local, ba, q);
    if (d.size < min) continue;
    g.fillStyle = `hsl(${d.hue.toFixed(1)},${sat}%,${light}%)`; g.beginPath(); g.arc(x, y, d.size, 0, TAU); g.fill();
  }
};

/* ---------------- beat-locked shape morph ---------------- */
// circle → square → triangle → star, one shape per beat (outBack morph), outline echoes, counter-rotating inner cut-out,
// background colour per beat, a white flash on each beat. palettes[k] = {bg, fill, fg}
const OUTLINES = new Map();
const outline = (k, N, o) => { const key = k + ':' + N + ':' + JSON.stringify(o || {}); if (!OUTLINES.has(key)) OUTLINES.set(key, shapeOutline(k, N, o)); return OUTLINES.get(key); };
export const morphSeq = (o = {}) => {
  const shapes = o.shapes || ['circle', 'square', 'triangle', 'star'], N = o.N || 120;
  const pals = o.palettes || [{ bg: REEL.violet, fill: REEL.yellow, fg: REEL.paper }, { bg: REEL.ink, fill: REEL.pink, fg: REEL.paper }, { bg: REEL.cyan, fill: REEL.ink, fg: REEL.ink }, { bg: REEL.paper, fill: REEL.violet, fg: REEL.ink }];
  return (g, local, info) => {
    const B = info.beats, beatSec = B && B.active ? B.beat : .46875, lead = B ? B.leadT || 0 : 0;
    const t0 = sceneStart(info) + (o.at || 0), bp = B && B.active ? B.index(info.t + lead) - B.index(t0) : (local - (o.at || 0)) / beatSec;
    const st = morphState(Math.max(0, bp), shapes.length, { d: o.d }), th = pals[st.k % pals.length], lb = st.lb * beatSec;
    const A = outline(shapes[st.from], N, o.shape), Bp = outline(shapes[st.k], N, o.shape);
    let pts = st.k === 0 ? A.map(p => { const s = EASE.outBack(P(lb, .1, .4)); return [p[0] * s, p[1] * s]; }) : lerpPts(A, Bp, st.m);
    const [x, y] = center(o, info), R = (o.r || 300) * (1 + (o.pulse != null ? o.pulse : .12) * Math.exp(-lb * 7)), rot = (local - (o.at || 0)) * (o.spin != null ? o.spin : 1.15) + st.k * .5;
    if (o.background !== false) { g.fillStyle = th.bg; g.fillRect(0, 0, info.W, info.H); }
    for (let e = o.echoes != null ? o.echoes : 4; e >= 1; e--) { ptsPath(g, pts, x, y, R * (1 + e * .15), rot - e * .16); g.lineWidth = o.echoWidth || 5; g.strokeStyle = th.fill; g.globalAlpha = .55 / e; g.stroke(); }
    g.globalAlpha = 1; ptsPath(g, pts, x, y, R, rot); g.fillStyle = th.fill; g.fill();
    if (o.cut !== false) { ptsPath(g, pts, x, y, R * (o.cut || .42), -rot * 1.6); g.fillStyle = th.bg; g.fill(); }
    if (o.orbit !== false) orbit({ x, y, r: o.orbitR || 500, color: th.fg, ...(o.orbit || {}) })(g, local, info);
    if (o.counter !== false) {
      const c = o.counter || {}, fs = c.size || 250;
      g.save(); g.globalAlpha = .5 + .5 * Math.exp(-lb * 6); g.font = `${c.weight || 400} ${fs}px ${c.font || '"Archivo Black","Archivo","Noto Sans SC",sans-serif'}`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = c.stroke || 5; g.strokeStyle = th.fg; g.lineJoin = 'round';
      g.strokeText(String(st.k + 1).padStart(2, '0'), c.x || 1620, c.y || 290); g.restore();
    }
    if (o.flash !== false) { const a = (o.flash != null ? o.flash : .55) * Math.exp(-lb * 14); if (a > .003) { g.save(); g.globalAlpha = a; g.fillStyle = '#fff'; g.fillRect(0, 0, info.W, info.H); g.restore(); } }
  };
};
// current palette of a morphSeq-like beat sequence (for DOM labels that should switch colour with the shapes)
export function beatStep(info, at = 0, n = 4) {
  const B = info.beats, lead = B ? B.leadT || 0 : 0, t0 = sceneStart(info) + at;
  const bp = B && B.active ? B.index(info.t + lead) - B.index(t0) : 0;
  return Math.max(0, Math.min(n - 1, Math.floor(bp + 1e-9)));
}

/* ---------------- converge → iris (lockup background) ---------------- */
// shapes spiral into the centre (inExpo), a paper circle irises open, a spinning star mark pops in above the title
export const converge = (o = {}) => (g, local, info) => {
  const [x, y] = center(o, info), cols = o.colors || [REEL.yellow, REEL.pink, REEL.cyan, REEL.violet, REEL.paper], at = o.at || 0;
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, info.W, info.H); }
  const conv = EASE.inExpo(P(local, at + .02, o.d || .5));
  if (local < at + (o.d || .5) + .05) for (let i = 0; i < (o.n || 30); i++) {
    const c = convergeAt(i, conv, { seed: o.seed || 0 });
    g.save(); g.translate(x + c.x, y + c.y); g.rotate(c.rot); g.fillStyle = cols[i % cols.length]; g.beginPath();
    if (c.kind === 0) g.arc(0, 0, c.size / 2, 0, TAU); else if (c.kind === 1) g.rect(-c.size / 2, -c.size / 2, c.size, c.size);
    else { g.moveTo(0, -c.size * .6); g.lineTo(c.size * .55, c.size * .4); g.lineTo(-c.size * .55, c.size * .4); g.closePath(); }
    g.fill(); g.restore();
  }
  const ir = o.iris !== false ? (o.iris || {}) : null;
  if (ir) circle(g, x, y, EASE.outExpo(P(local, ir.at != null ? ir.at : at + .5, ir.d || .5)) * (ir.r || Math.hypot(info.W, info.H) / 2 * 1.13), ir.color || REEL.paper);
  const st = o.star !== false ? (o.star || {}) : null;
  if (st) {
    const sx = st.x != null ? st.x : x, sy = st.y != null ? st.y : 330, sa = st.at != null ? st.at : at + .72, mp = P(local, sa, .5);
    if (mp > 0) {
      g.save(); g.translate(sx, sy); g.rotate(lerp(-1.4, 0, EASE.outExpo(P(local, sa, .9))) + local * .25);
      const s = EASE.outBack(mp) * (st.scale || 1); g.scale(s, s); g.lineCap = 'round'; g.strokeStyle = st.color || REEL.pink; g.lineWidth = st.width || 26;
      for (let i = 0; i < (st.rays || 8); i++) { g.rotate(TAU / (st.rays || 8)); g.beginPath(); g.moveTo(0, -40); g.lineTo(0, -(i % 2 ? 92 : 118)); g.stroke(); }
      g.restore();
      circle(g, sx, sy, 20 * EASE.outBack(mp) * (st.scale || 1), st.dot || REEL.yellow);
    }
  }
};

/* ---------------- HUD overlay ---------------- */
// crop marks, blinking REC dot, title, timecode, meta line, bar counter, progress bar with bar ticks; meant for a
// video-level canvas with mix-blend-mode: difference (vk.hud()). Uses info.frameT (the nominal frame time) so it
// stays sharp when `vk render` samples sub-frames for motion blur.
export const hud = (o = {}) => (g, local, info) => {
  const t = info.frameT != null ? info.frameT : info.t, W = info.W, H = info.H, v = info.video, dur = o.duration || (v ? v.duration : 15), B = info.beats;
  const m = o.margin != null ? o.margin : 40, L = o.corner || 46, ins = o.inset != null ? o.inset : 84, fs = o.size || 22, col = o.color || '#fff';
  g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = o.width || 4; g.lineCap = 'butt';
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, dx, dy]) => { g.beginPath(); g.moveTo(x, y + dy * L); g.lineTo(x, y); g.lineTo(x + dx * L, y); g.stroke(); });
  g.font = `500 ${fs}px ${o.font || '"JetBrains Mono",monospace'}`; g.textBaseline = 'middle';
  if (o.rec !== false && Math.floor(t * 2) % 2 === 0) { g.beginPath(); g.arc(ins, ins, 7, 0, TAU); g.fill(); }
  g.textAlign = 'left'; if (o.title) g.fillText(o.title, ins + 20, ins);
  g.textAlign = 'right'; if (o.timecode !== false) g.fillText(timecode(t, o.fps || (v ? v.fps : 30)), W - ins, ins);
  g.textAlign = 'left'; if (o.meta) g.fillText(o.meta, ins, H - ins);
  const bars = o.bars || 0;
  if (bars) { const bi = B && B.active ? Math.floor(B.barIndex(t + (B.leadT || 0)) + 1e-6) : Math.floor(t / dur * bars); g.textAlign = 'right'; g.fillText(`${o.barLabel || 'BAR'} ${Math.max(1, Math.min(bars, bi + 1))}/${bars}`, W - ins, H - ins); }
  if (o.progress !== false) {
    const x0 = ins, x1 = W - ins, y = H - ins + 26;
    g.globalAlpha = .3; g.fillRect(x0, y, x1 - x0, 4); g.globalAlpha = 1; g.fillRect(x0, y, (x1 - x0) * clamp01(t / dur), 4);
    for (let k = 0; k <= bars; k++) if (bars) g.fillRect(x0 + (x1 - x0) * k / bars - 1, y - 6, 2, 16);
  }
  g.restore();
};
