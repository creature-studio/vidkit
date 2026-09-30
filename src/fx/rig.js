// Skeletal rigs for SVG characters: a data-defined bone hierarchy, poses as plain objects of bone angles (+ numeric
// channels), FK written as SVG transforms, 2-bone IK solved in each chain's own parent frame (pure 2D matrix maths,
// no getCTM — deterministic and independent of DOM/update order), clip crossfades and a timeline player.
// Everything is a pure function of t: no clocks, no state carried between frames — seeking to any t is exact.
//
//   const rig = vk.rig({ root: g, bones: [{ id: 'torso' }, { id: 'arm', parent: 'torso', x: 40, y: -60, rot: 10 }, …],
//                        clips: { idle: t => ({ arm: 5 * Math.sin(t), 'root.y': 3 * Math.sin(2 * t) }) },
//                        ik: { armR: { chain: ['upperArmR', 'lowerArmR', 'handR'], bend: 1 } } });
//   const act = rig.play([{ at: 0, clip: 'idle' }, { at: 3.8, clip: 'attack', blend: .4 }], { ik: { armR: [[3.8, [900, 300]], [5, [1000, 260]]] } });
//   sc.on(l => act.render(l, { x: 640, y: 400, scale: .55, flip: -1 }));
//
// Pose keys: '<bone>' = angle (deg, added to the rest rotation); '<bone>.x' / '<bone>.y' = offset added to the rest
// translate; '<bone>.s' = scale; 'root.x' / 'root.y' / 'root.rot' = motion inside the root frame (bob, lean);
// '<ik>.tx' / '<ik>.ty' = a clip's own IK target in root-local units; anything else is a free channel (energy, …).
import { kf, clamp, smooth01 } from '../core/time.js';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const f2 = x => Math.round(x * 100) / 100;

/* ---------------- 2D affine matrices [a b c d e f] (same layout as SVG matrix()) ---------------- */
export const mat = {
  id: () => [1, 0, 0, 1, 0, 0],
  mul: (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]],
  // = SVG `translate(x y) rotate(rot) scale(sx sy)`
  trs: (x = 0, y = 0, rot = 0, sx = 1, sy = sx) => { const c = Math.cos(rot * D2R), s = Math.sin(rot * D2R); return [c * sx, s * sx, -s * sy, c * sy, x, y]; },
  inv: m => { const det = m[0] * m[3] - m[1] * m[2], a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det; return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])]; },
  apply: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]],
};
// root transform {x, y, rot, scale, flip} → matrix (= `translate(x y) rotate(rot) scale(scale·flip scale)`)
export const rootMatrix = (r = {}) => { const s = r.scale == null ? 1 : r.scale; return mat.trs(r.x || 0, r.y || 0, r.rot || 0, s * (r.flip || 1), s); };

/* ---------------- 2-bone IK (analytic, law of cosines) ----------------
 * target (tx, ty) relative to the chain root, bone lengths l1, l2; bend ±1 picks the elbow side.
 * Returns absolute directions a1 (upper bone) and a2 (lower bone) plus the relative elbow angle, in degrees.
 * Unreachable targets clamp: the chain straightens towards the target (or folds, when too close). */
export function solve2BoneIK(tx, ty, l1, l2, bend = 1) {
  const d = Math.max(1e-6, Math.hypot(tx, ty));
  const cd = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const base = Math.atan2(ty, tx);
  const a = Math.acos(clamp((l1 * l1 + cd * cd - l2 * l2) / (2 * l1 * cd), -1, 1));
  const sh = base - bend * a;
  const ex = Math.cos(sh) * l1, ey = Math.sin(sh) * l1;
  const fore = Math.atan2(Math.sin(base) * cd - ey, Math.cos(base) * cd - ex);
  let el = (fore - sh) * R2D; el = ((el + 540) % 360) - 180;
  return { a1: sh * R2D, a2: fore * R2D, elbow: el, shoulder: sh * R2D, reach: d / (l1 + l2) };
}

/* ---------------- blink: 0 open / 1 closed; one blink of `dur` s every `period` s (+ offset) ---------------- */
export function blink(t, o = {}) {
  const per = o.period || 4.4, dur = o.dur || .24, ph = (((t + (o.offset || 0)) % per) + per) % per;
  if (ph < per - dur) return 0;
  return o.smooth ? Math.sin((ph - (per - dur)) / dur * Math.PI) : 1;
}

/* ---------------- pose maths ---------------- */
// lerp every numeric key; a key missing on one side takes `defaults[key]` (bones default to 0 = rest)
export function blendPose(a, b, w, defaults = {}) {
  if (w <= 0) return { ...a }; if (w >= 1) return { ...b };
  const out = {}, keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    // missing on one side: the declared default (bones → 0 = rest), else the other side's value (targets, channels)
    const va = k in a ? a[k] : (k in defaults ? defaults[k] : b[k]);
    const vb = k in b ? b[k] : (k in defaults ? defaults[k] : va);
    out[k] = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * w : (w < .5 ? va : vb);
  }
  return out;
}
// keyframed value: number / [x,y] / keys [[t, v], …] (kf) / function(t)
export function valueAt(v, t) {
  if (v == null) return v;
  if (typeof v === 'function') return v(t);
  if (Array.isArray(v) && Array.isArray(v[0])) return kf(t, v);
  return v;
}

/* ---------------- the rig ---------------- */
export function createRig(def) {
  const bones = [], byId = {};
  for (const b of def.bones) { const bb = { parent: null, x: 0, y: 0, rot: 0, s: 1, ...b }; bones.push(bb); byId[bb.id] = bb; }
  // parents before children (stable), so FK is a single pass
  const order = [], seen = new Set();
  const visit = b => { if (seen.has(b.id)) return; if (b.parent && !byId[b.parent]) throw new Error('[vk.rig] unknown parent ' + b.parent + ' of ' + b.id); if (b.parent) visit(byId[b.parent]); seen.add(b.id); order.push(b); };
  bones.forEach(visit);
  const clips = def.clips || {}, chains = def.ik || {};
  // blend defaults: every bone angle rests at 0, every IK weight channel at 0; then the rig's own
  const defaults = {}; for (const b of order) defaults[b.id] = 0; for (const n of Object.keys(chains)) defaults[n + '.w'] = 0;
  Object.assign(defaults, def.defaults || {});
  const rootEl = def.root || null;
  const find = def.el || (id => rootEl && rootEl.querySelector(`[data-bone="${id}"]`));
  const els = {}; if (rootEl || def.el) for (const b of order) els[b.id] = b.el || find(b.id) || null;

  const local = (id, pose = {}) => {
    const b = byId[id];
    return mat.trs(b.x + (pose[id + '.x'] || 0), b.y + (pose[id + '.y'] || 0), b.rot + (pose[id] || 0), b.s * (pose[id + '.s'] == null ? 1 : pose[id + '.s']));
  };
  // root frame incl. in-root motion channels
  const base = (pose = {}, root = {}) => mat.mul(rootMatrix(root), mat.trs(pose['root.x'] || 0, pose['root.y'] || 0, pose['root.rot'] || 0));
  function matrix(id, pose = {}, root = {}) {
    const chain = []; for (let b = byId[id]; b; b = b.parent ? byId[b.parent] : null) chain.unshift(b.id);
    let m = base(pose, root); for (const c of chain) m = mat.mul(m, local(c, pose)); return m;
  }
  const point = (id, x = 0, y = 0, pose, root) => mat.apply(matrix(id, pose, root), x, y);
  // world point → the rig's root-local units (before in-root motion)
  const toLocal = (p, root = {}) => mat.apply(mat.inv(rootMatrix(root)), p[0], p[1]);

  // IK: pose the chain [a, b, c] so c's origin reaches `target` (world coordinates, i.e. the rig root's parent space)
  function solveIK(name, target, pose = {}, root = {}, o = {}) {
    const ch = chains[name] || name, [ia, ib, ic] = ch.chain, A = byId[ia], B = byId[ib], C = byId[ic];
    // frame in which A's rotation acts: parent world × translate(A)
    const F = mat.mul(A.parent ? matrix(A.parent, pose, root) : base(pose, root), mat.trs(A.x + (pose[ia + '.x'] || 0), A.y + (pose[ia + '.y'] || 0)));
    const [tx, ty] = mat.apply(mat.inv(F), target[0], target[1]);
    const bx = B.x + (pose[ib + '.x'] || 0), by = B.y + (pose[ib + '.y'] || 0), cx = C.x + (pose[ic + '.x'] || 0), cy = C.y + (pose[ic + '.y'] || 0);
    const l1 = Math.hypot(bx, by), l2 = Math.hypot(cx, cy), o1 = Math.atan2(by, bx) * R2D, o2 = Math.atan2(cy, cx) * R2D;
    const s = solve2BoneIK(tx, ty, l1, l2, o.bend != null ? o.bend : (ch.bend != null ? ch.bend : 1));
    const ra = s.a1 - o1, rb = s.a2 - o2 - ra;           // total local rotations
    const w = o.weight == null ? 1 : o.weight, out = { ...pose };
    const wrap = x => ((x % 360) + 540) % 360 - 180;
    const angA = ra - A.rot, angB = rb - B.rot, fkA = pose[ia] || 0, fkB = pose[ib] || 0;
    out[ia] = fkA + wrap(angA - fkA) * w; out[ib] = fkB + wrap(angB - fkB) * w;
    return out;
  }

  const clipPose = (item, t) => {
    const c = typeof item.clip === 'string' ? clips[item.clip] : item.clip;
    if (!c) throw new Error('[vk.rig] unknown clip ' + item.clip);
    const ct = (item.local ? t - item.at : t) * (item.speed || 1) + (item.offset || 0);
    const p = typeof c === 'function' ? c(ct, item) : { ...c };
    // a clip that sets its own IK target is fully IK-driven unless it says otherwise ('<ik>.w')
    for (const n of Object.keys(chains)) if ((n + '.tx') in p && !((n + '.w') in p)) p[n + '.w'] = 1;
    return item.pose ? { ...p, ...item.pose } : p;
  };
  // track [{at, clip, blend (crossfade s, default .3), speed, offset, local, pose}] → blended pose at t (pure, recursive)
  function sample(track, t, n = null) {
    const k = n == null ? track.length : n;
    let i = -1; for (let j = 0; j < k; j++) if (t >= track[j].at) i = j;
    if (i < 0) i = 0;
    const cur = clipPose(track[i], t), bl = track[i].blend == null ? .3 : track[i].blend;
    if (i === 0 || bl <= 0 || t >= track[i].at + bl) return cur;
    const w = smooth01((t - track[i].at) / bl);
    return blendPose(sample(track, t, i), cur, w, defaults);
  }

  // final pose: clip track → IK chains (world targets from opts.ik keys/fn, else the clip's '<ik>.tx/.ty' channels)
  function resolve(pose, t, root, opts = {}) {
    let p = pose;
    for (const name of Object.keys(chains)) {
      const wt = opts.ik ? valueAt(opts.ik[name], t) : null;
      const mix = opts.ikMix && opts.ikMix[name] != null ? clamp(valueAt(opts.ikMix[name], t), 0, 1) : 1;
      let target = null;
      const own = (name + '.tx') in p ? mat.apply(base(p, root), p[name + '.tx'], p[name + '.ty']) : null;
      if (wt && own) target = [own[0] + (wt[0] - own[0]) * mix, own[1] + (wt[1] - own[1]) * mix];
      else if (wt) target = wt; else target = own;
      // weight: opts.ikWeight[name] (keys/fn) → else the pose's '<ik>.w' channel (blends with the clips) → else 1 if targeted
      const weight = opts.ikWeight && opts.ikWeight[name] != null ? clamp(valueAt(opts.ikWeight[name], t), 0, 1)
        : (wt && !own ? 1 : ((name + '.w') in p ? clamp(p[name + '.w'], 0, 1) : (own ? 1 : 0)));
      if (target && weight > 0) p = solveIK(name, target, p, root, { weight, bend: opts.bend && opts.bend[name] });
    }
    return p;
  }

  // write transforms (root + every bone with an element)
  function apply(pose = {}, root = {}) {
    if (rootEl) {
      const s = root.scale == null ? 1 : root.scale;
      rootEl.setAttribute('transform', `translate(${f2(root.x || 0)} ${f2(root.y || 0)}) rotate(${f2(root.rot || 0)}) scale(${f2(s * (root.flip || 1))} ${f2(s)}) translate(${f2(pose['root.x'] || 0)} ${f2(pose['root.y'] || 0)}) rotate(${f2(pose['root.rot'] || 0)})`);
    }
    for (const b of order) {
      const e = els[b.id]; if (!e) continue;
      const sc = b.s * (pose[b.id + '.s'] == null ? 1 : pose[b.id + '.s']);
      e.setAttribute('transform', `translate(${f2(b.x + (pose[b.id + '.x'] || 0))} ${f2(b.y + (pose[b.id + '.y'] || 0))}) rotate(${f2(b.rot + (pose[b.id] || 0))})${sc !== 1 ? ` scale(${f2(sc)})` : ''}`);
    }
    if (debugEl) drawDebug(pose);
  }

  // optional skeleton overlay (root-local lines between bone origins); off unless rig.debug(true)
  let debugEl = null;
  function debug(on = true) {
    if (!rootEl) return;
    if (on && !debugEl) { debugEl = document.createElementNS('http://www.w3.org/2000/svg', 'g'); debugEl.setAttribute('class', 'vk-rig-debug'); debugEl.setAttribute('pointer-events', 'none'); rootEl.appendChild(debugEl); }
    if (!on && debugEl) { debugEl.remove(); debugEl = null; }
  }
  function drawDebug(pose) {
    const P = id => point(id, 0, 0, { ...pose, 'root.x': 0, 'root.y': 0, 'root.rot': 0 }, {});
    let s = '';
    for (const b of order) { const q = P(b.id); if (b.parent) { const p = P(b.parent); s += `<line x1="${f2(p[0])}" y1="${f2(p[1])}" x2="${f2(q[0])}" y2="${f2(q[1])}" stroke="#6b58d1" stroke-width="3.5" stroke-linecap="round" opacity=".92"/>`; } s += `<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="5" fill="#fff" stroke="#6b58d1" stroke-width="3"/>`; }
    debugEl.innerHTML = s;
  }

  const rig = {
    def, bones: order, byId, clips, chains, els,
    local, matrix, point, toLocal, solveIK, sample, resolve, apply, debug,
    clip: (name, t) => clipPose({ clip: name, at: 0 }, t),
    blend: (a, b, w) => blendPose(a, b, w, defaults),
    // timeline player: pose(t, root) → final pose; render(t, root, extra) → apply (extra(pose, t) may post-edit)
    play(track, opts = {}) {
      const tr = [...track].sort((a, b) => a.at - b.at);
      const player = {
        track: tr, opts,
        clipPose: t => sample(tr, t),
        pose(t, root = {}, edit) { let p = sample(tr, t); if (edit) p = edit(p, t) || p; return resolve(p, t, root, opts); },
        render(t, root = {}, edit) { const p = player.pose(t, root, edit); apply(p, root); return p; },
      };
      return player;
    },
  };
  return rig;
}
