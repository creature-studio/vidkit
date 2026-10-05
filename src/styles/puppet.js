// Generic profile-view character ("puppet") on vk.rig, painted by a style material. Facing +x (flip −1 faces left).
// Units: origin = waist; soles at y ≈ +188 standing; head top ≈ −224 (≈ 4.9 heads, storybook proportions).
// Limbs are drawn hanging along +y: a positive angle swings a limb backwards, a negative one forwards.
//
//   const hero = vk.puppet(parentG, { style, look: { hair: 'bun', cloth: 'red', scarf: 'gold' }, scale: .6 });
//   sc.on(l => hero.render(l, { x: 300, y: 600, d: walkDistance(l), clip: 'idle' | track, facing: 1, mouth, look }));
//
// Motion: legs are always IK-driven from the gait (feet planted unless the distance d changes → no foot sliding),
// arms swing with the gait or follow the clip; hair tail / tunic flaps / scarf use lagging secondary motion.
import { createRig, mat, blink as rigBlink } from '../fx/rig.js';
import { gait, drag, ribbon, ribbonPath, mouth as mouthAt } from '../fx/motion.js';
import { ellipse, capsule, strokeOutline, arc, rect, translate, rotate } from './geom.js';
import { material } from './materials.js';
import { smooth01, clamp } from '../core/time.js';

const NS = 'http://www.w3.org/2000/svg';
const f1 = x => Math.round(x * 10) / 10, f3 = x => Math.round(x * 1000) / 1000;
const S = Math.sin, C = Math.cos, PI = Math.PI;
const sm = smooth01;

export const BONES = [
  { id: 'hips' },
  { id: 'chest', parent: 'hips', x: 0, y: -4 },
  { id: 'head', parent: 'chest', x: 4, y: -126 },
  { id: 'tail', parent: 'head', x: -30, y: -66 },
  { id: 'upperArmN', parent: 'chest', x: 2, y: -114 }, { id: 'foreArmN', parent: 'upperArmN', y: 58 }, { id: 'handN', parent: 'foreArmN', y: 50 },
  { id: 'upperArmF', parent: 'chest', x: -6, y: -112 }, { id: 'foreArmF', parent: 'upperArmF', y: 58 }, { id: 'handF', parent: 'foreArmF', y: 50 },
  { id: 'thighN', parent: 'hips', x: -2, y: 4 }, { id: 'shinN', parent: 'thighN', y: 86 }, { id: 'footN', parent: 'shinN', y: 84 },
  { id: 'thighF', parent: 'hips', x: 6, y: 2 }, { id: 'shinF', parent: 'thighF', y: 86 }, { id: 'footF', parent: 'shinF', y: 84 },
  { id: 'flapN', parent: 'hips', x: 10, y: 6 }, { id: 'flapB', parent: 'hips', x: -14, y: 6 },
];
export const IK = {
  armN: { chain: ['upperArmN', 'foreArmN', 'handN'], bend: -1 }, armF: { chain: ['upperArmF', 'foreArmF', 'handF'], bend: -1 },
  legN: { chain: ['thighN', 'shinN', 'footN'], bend: 1 }, legF: { chain: ['thighF', 'shinF', 'footF'], bend: 1 },
};
export const SOLE = 188, ANKLE = 14, HIP = 180, HEAD_R = 44;
// head centre / top in head-bone space
const HC = [8, -50];

/* ---------------- shapes (bone-local polygons) ---------------- */
function skull() {
  const out = [];
  for (let i = 0; i < 44; i++) {
    const a = i / 44 * PI * 2 - PI;     // −π (back) … π
    let rx = 42, ry = 45;
    const nose = 8 * Math.exp(-Math.pow((a - .2) / .11, 2)), chin = 3 * Math.exp(-Math.pow((a - .95) / .25, 2)), jaw = a > .5 && a < 2.2 ? -4 * S((a - .5) / 1.7 * PI) : 0;
    const r = 1 + (nose + chin + jaw) / 44;
    out.push([HC[0] + C(a) * rx * r, HC[1] + S(a) * ry * r]);
  }
  return out;
}
function hairCap(kind) {
  // outer: skull top/back ×1.07 from the forehead (a = −1.2) over the top to the nape (a = 2.5, going backwards)
  const out = [];
  for (let i = 0; i <= 26; i++) { const a = -1.15 - i / 26 * (PI * 2 - 1.15 - 2.45 + .0); const k = 1.08; out.push([HC[0] + C(a) * 42 * k, HC[1] + S(a) * 45 * k]); }
  // inner hairline back to the forehead (behind the ear, over the temple)
  const fringe = kind === 'short' || kind === 'long' || kind === 'pony' ? [[18, -78], [30, -76], [34, -84]] : [[22, -84], [33, -82]];
  return out.concat([[-14, -18], [-10, -36], [-4, -52], [2, -66], ...fringe]);
}
const sleeve = (len, w0, w1) => capsule(0, -6, w0, 0, len, w1, 8);
const shoe = () => [[-11, -10], [11, -10], [13, 0], [26, 3], [34, 9], [35, 14], [-12, 14], [-14, 4]];
function torso(o) {
  const hem = o.robe === 'long' ? 64 : 22;
  return [[10, -128], [26, -116], [34, -96], [33, -64], [30, -34], [33, hem - 6], [36, hem], [-34, hem], [-31, hem - 8], [-30, -40], [-31, -80], [-28, -112], [-16, -124], [-6, -130]];
}
// mouth visemes (head-bone space), full-open versions; open amount scales y about the mouth line
const MOUTH = [42, -27];
const VIS = {
  M: () => strokeOutline([[35, -27], [40, -26.4], [45, -27.6]], 2.6, true),
  A: () => ellipse(40.5, -24.5, 5.2, 6.5, -8, 18),
  E: () => ellipse(40, -25.5, 6.8, 3.4, -6, 18),
  O: () => ellipse(40.5, -24.5, 3.8, 4.8, 0, 16),
};

/* ---------------- clips (pure functions of clip time) ---------------- */
// channels besides bone angles: crouch (hip drop, units), air (0..1 feet tucked under the hip), armSwing (gait arm
// swing weight), look (eyes −1 up … 1 down), talk (0..1 head/hand gesture energy), lean (deg, whole body)
const base = { crouch: 0, air: 0, armSwing: 1, look: 0, lean: 0 };
export const CLIPS = {
  idle: t => ({ ...base, chest: -1 + S(t * 2) * .8, head: S(t * 1.1) * 1.6, upperArmN: -8 + S(t * 2) * 1.5, foreArmN: -18, upperArmF: 8, foreArmF: -16, armSwing: 1 }),
  walk: t => ({ ...base, chest: 4, head: -3, foreArmN: -22, foreArmF: -18, armSwing: 1 }),
  run: t => ({ ...base, chest: 14, head: -10, upperArmN: 0, foreArmN: -80, upperArmF: 0, foreArmF: -80, armSwing: 1.7, lean: 6 }),
  talk: t => { const g = .5 + .5 * S(t * 5.3) * S(t * 2.1 + 1); return { ...base, chest: -2 + 2 * S(t * 2.4), head: -4 + 5 * S(t * 3.3) * g, upperArmN: -34 - 18 * g, foreArmN: -62 - 22 * S(t * 4.1), upperArmF: 8, foreArmF: -20, armSwing: 0, talk: g }; },
  wave: t => ({ ...base, chest: -3, head: -6, upperArmN: -118, foreArmN: -50 + 28 * S(t * 9), upperArmF: 10, foreArmF: -20, armSwing: 0 }),
  point: t => ({ ...base, chest: 2, head: -4, upperArmN: -84 + 2 * S(t * 3), foreArmN: -6, upperArmF: 12, foreArmF: -24, armSwing: 0 }),
  cheer: t => { const b = Math.abs(S(t * 6)); return { ...base, chest: -8, head: -12, upperArmN: -214 - 8 * b, foreArmN: 12, upperArmF: -142 - 10 * b, foreArmF: -24, crouch: 10 * b, armSwing: 0 }; },
  bow: t => ({ ...base, chest: 30, head: 18, upperArmN: -30, foreArmN: -50, upperArmF: -20, foreArmF: -50, crouch: 6, armSwing: 0 }),
  surprise: t => ({ ...base, chest: -14, head: -16, upperArmN: -110, foreArmN: -60, upperArmF: -96, foreArmF: -50, crouch: -2, armSwing: 0, look: -.4, lean: -6 }),
  think: t => ({ ...base, chest: 4, head: 8 + 2 * S(t * 1.3), upperArmN: -36, foreArmN: -128, upperArmF: 22, foreArmF: -70, armSwing: 0, look: -.6 }),
  look: t => ({ ...base, chest: -6, head: -22 + 2 * S(t * 1.2), upperArmN: -10, foreArmN: -16, upperArmF: 8, foreArmF: -14, armSwing: 0, look: -1 }),
  sad: t => ({ ...base, chest: 12, head: 22, upperArmN: 4, foreArmN: -6, upperArmF: 8, foreArmF: -6, armSwing: 0, look: 1, crouch: 4 }),
  // jump: 0–.25 crouch, .25–.85 airborne, .85–1.1 land (clip-local time; play with local:true)
  jump: t => {
    const c = sm(t / .25) * (1 - sm((t - .25) / .08)) + sm((t - .85) / .06) * (1 - sm((t - 1.0) / .2)), air = sm((t - .25) / .08) * (1 - sm((t - .8) / .08));
    return { ...base, chest: 10 * c - 6 * air, head: -6 * air, upperArmN: -40 * c - 172 * air, foreArmN: -20 + 30 * air, upperArmF: -30 * c - 196 * air, foreArmF: -24, crouch: 34 * c, air, armSwing: 0, hop: 120 * Math.max(0, S(PI * clamp((t - .25) / .6))) };
  },
};

/* ---------------- builder ---------------- */
// o: {style (resolved pack) | material + P, look, scale, cls, seed, ornament (0/1), scarf, rods (shadow puppet rods)}
export function puppet(parent, o = {}) {
  const st = o.style || {}, P = { ...(st.P || {}), ...(o.P || {}) }, M = material(o.material || st.material || 'flat');
  const look = { skin: 'skin', hair: 'black', cloth: 'red', cloth2: 'cream', trim: 'gold', pants: 'cream', shoe: 'black', sash: 'gold', hairStyle: 'bun', ...(o.look || {}) };
  const col = role => (st.colour ? st.colour(look[role] || role, role) : (look[role] || '#888'));
  const C_ = { skin: col('skin'), skin2: st.colour ? st.colour(look.skin, 'skin2') : '#d9a882', hair: col('hair'), cloth: col('cloth'), cloth2: col('cloth2'), trim: col('trim'), pants: col('pants'), shoe: col('shoe'), sash: col('sash'),
    eyeW: st.colour ? st.colour('white', 'eyeW') : '#fbf6ea', pupil: st.colour ? st.colour('ink', 'pupil') : '#1e1b1f', mouth: st.colour ? st.colour('mouth', 'mouth') : '#a0302a', cheek: st.colour ? st.colour('cheek', 'cheek') : '#e7897a', line: P.line || '#1e1b1f' };
  const orn = o.ornament != null ? o.ornament : (P.ornament != null ? P.ornament : 1), seedBase = o.seed || 1;
  const hs = look.hairStyle;
  // piece list: [bone, z, role, shape, extra]
  const L = [];
  const add = (bone, z, role, shape, x = {}) => L.push({ bone, z, role, col: x.col || C_[role] || col(role), ...x, ...(shape && Array.isArray(shape[0]) && !x.line ? { pts: shape } : {}), seed: seedBase * 31 + L.length });
  // far side (drawn first, darker)
  add('flapB', 0, 'cloth', [[-8, -6], [10, -6], [12, 50], [-14, 54]], { far: true });
  add('upperArmF', 10, 'cloth2', sleeve(58, 14, 11.5), { far: true }); add('foreArmF', 11, 'cloth2', sleeve(50, 11.5, 10), { far: true });
  add('foreArmF', 12, 'trim', rect(-11.5, 38, 23, 9), { far: true }); add('handF', 13, 'skin', ellipse(0, 10, 10.5, 11.5, 0, 16), { far: true });
  add('thighF', 20, 'pants', capsule(0, -6, 16, 0, 86, 12, 8), { far: true }); add('shinF', 21, 'pants', capsule(0, 0, 12, 0, 80, 9.5, 8), { far: true });
  add('footF', 22, 'shoe', shoe(), { far: true });
  if (hs === 'long') add('tail', 1, 'hair', [[-6, -6], [10, -4], [12, 40], [4, 92], [-20, 96], [-22, 40]], { far: false });
  if (hs === 'pony') add('tail', 1, 'hair', strokeOutline([[0, 0], [-8, 20], [-12, 46], [-10, 72]], 16), {});
  // body
  add('thighN', 32, 'pants', capsule(0, -6, 16, 0, 86, 12, 8)); add('shinN', 33, 'pants', capsule(0, 0, 12, 0, 80, 9.5, 8));
  add('shinN', 33.5, 'trim', rect(-11, 58, 22, 8)); add('footN', 34, 'shoe', shoe());
  add('head', 38, 'skin2', capsule(4, 6, 12, 6, -36, 11, 6));      // neck
  const T = torso(look), tornOrn = orn ? [ellipse(4, -78, 9, 9, 0, 14), ellipse(-14, -62, 4, 4, 0, 10), ellipse(22, -60, 4, 4, 0, 10), ellipse(4, -50, 3.6, 5, 0, 10)] : [];
  add('chest', 40, 'cloth', T, { orn: tornOrn });
  add('chest', 41, 'trim', strokeOutline([[-6, -130], [6, -112], [18, -92], [28, -70]], 9, false));           // cross collar
  add('chest', 41.5, 'sash', [[-31, -20], [31, -22], [32, -8], [-30, -6]]);
  add('flapN', 42, 'cloth', [[-10, -6], [14, -6], [22, 56], [-6, 60]], { orn: orn ? [ellipse(6, 30, 4, 6, 0, 10)] : [] });
  // head
  add('head', 49, 'skin2', ellipse(-2, -46, 7.5, 10.5, -6, 14));     // ear (under the hair cap edge)
  add('head', 50, 'skin', skull());
  add('head', 51, 'cheek', ellipse(24, -34, 8.5, 5, -8, 14), { op: .45 });
  if (hs !== 'bald') add('head', 52, 'hair', hairCap(hs));
  if (hs === 'bun') { add('head', 53, 'hair', ellipse(-16, -100, 17, 15, -20, 18)); add('head', 53.5, 'trim', rect(-30, -90, 28, 6).map(p => [p[0], p[1] + (p[0] + 16) * .3])); }
  if (hs === 'twinbuns') { add('head', 53, 'hair', ellipse(-14, -96, 15, 14, 0, 16)); add('head', 53, 'hair', ellipse(18, -100, 14, 13, 0, 16)); add('head', 53.4, 'trim', ellipse(18, -100, 5, 5, 0, 10)); add('head', 53.4, 'trim', ellipse(-14, -96, 5, 5, 0, 10)); }
  if (hs === 'cap') { add('head', 53, 'hair', [[44, -66], [40, -92], [16, -108], [-14, -106], [-36, -90], [-40, -64], [-30, -56], [-26, -70], [0, -74], [26, -74]]); add('head', 53.5, 'trim', strokeOutline([[44, -66], [20, -72], [-4, -73], [-30, -68]], 7, false)); }
  add('head', 55, 'brow', null, { line: [[38, -66], [30, -69], [22, -69]], w: 3.4, col: C_.hair });
  // eyes: open / shut variants (toggled per frame)
  add('head', 56, 'eyeW', ellipse(31, -54, 6.2, 6.8, -6, 16), { cls: 'pp-eye-open' });
  add('head', 57, 'pupil', ellipse(33.2, -53.5, 3.3, 4.4, 0, 12), { cls: 'pp-eye-open pp-pupil' });
  add('head', 57, 'pupil', null, { line: arc([37, -54], [25, -55], -3.5, 6), w: 2.8, cls: 'pp-eye-shut' });
  for (const k of Object.keys(VIS)) add('head', 58, k === 'M' ? 'pupil' : 'mouth', VIS[k](), { cls: 'pp-mouth pp-m-' + k });
  // near arm last (in front of the body)
  add('upperArmN', 60, 'cloth2', sleeve(58, 14, 11.5)); add('foreArmN', 61, 'cloth2', sleeve(50, 11.5, 10));
  add('foreArmN', 62, 'trim', rect(-11.5, 38, 23, 9)); add('handN', 63, 'skin', ellipse(0, 10, 10.5, 11.5, 0, 16));
  if (M === material('leather')) [['upperArmN', 0, -4], ['foreArmN', 0, 0], ['thighN', 0, -2], ['shinN', 0, 0], ['head', 4, 4]].forEach(([b, x, y]) => add(b, 64, 'trim', ellipse(x, y, 3.2, 3.2, 0, 10)));   // rivets at the joints

  // ---- DOM ----
  if (M.defs && o.video) M.defs(o.video, P);
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'vk-puppet ' + (o.cls || ''));
  const attrs = M.group(P, 'char'); if (attrs) attrs.replace(/(\w[\w-]*)="([^"]*)"/g, (_, k, v) => g.setAttribute(k, v));
  const scarfG = document.createElementNS(NS, 'g'); scarfG.setAttribute('class', 'pp-scarf');
  const inner = document.createElementNS(NS, 'g'); g.append(scarfG, inner);
  const pieces = L.map((p, i) => ({ ...p, i })).sort((a, b) => (a.z - b.z) || (a.i - b.i));
  inner.innerHTML = pieces.map(p => `<g class="pp-piece ${p.cls || ''}" data-b="${p.bone}">${/pp-mouth/.test(p.cls || '') ? `<g class="pp-v">${M.paint(p, P)}</g>` : M.paint(p, P)}</g>`).join('');
  parent.appendChild(g);
  const pieceEls = [...inner.children].map((el, i) => ({ el, bone: pieces[i].bone, last: '', pupil: /pp-pupil/.test(pieces[i].cls || '') }));
  let scarfPath = null;
  if (look.scarf) { scarfG.innerHTML = `<path ${M.dyn(P, col('scarf') === 'scarf' ? C_.trim : (st.colour ? st.colour(look.scarf, 'scarf') : look.scarf))}/>`; scarfPath = scarfG.firstElementChild; }
  const Q = s => [...inner.querySelectorAll(s)];
  const E = { open: Q('.pp-eye-open'), shut: Q('.pp-eye-shut'), pupil: Q('.pp-pupil'), mouths: Object.fromEntries(Object.keys(VIS).map(k => [k, Q('.pp-m-' + k)])) };
  const setOp = (el, v) => { const s = String(Math.round(clamp(v) * 1000) / 1000); if (el.__op !== s) { el.__op = s; el.setAttribute('opacity', s); } };

  const rig = createRig({ root: inner, el: () => null, bones: BONES, clips: { ...CLIPS, ...(o.clips || {}) }, ik: IK, defaults: { ...base } });
  const G = gait({ stride: 128, hip: HIP, leg: 184, lift: 18, duty: .62, ...(o.gait || {}) });
  const RUN = gait({ stride: 230, hip: HIP - 6, leg: 184, lift: 34, duty: .36, ...(o.runGait || {}) });
  function mats(pose) { const out = {}; for (const b of rig.bones) out[b.id] = mat.mul(b.parent ? out[b.parent] : mat.id(), rig.local(b.id, pose)); return out; }
  function worldRot(id, pose) { let a = 0; for (let b = rig.byId[id]; b; b = b.parent ? rig.byId[b.parent] : null) a += b.rot + (pose[b.id] || 0); return a; }
  const clipPose = (clip, t) => (typeof clip === 'function' ? clip(t) : typeof clip === 'string' ? (rig.clips[clip] || CLIPS.idle)(t) : clip && clip.clipPose ? clip.clipPose(t) : CLIPS.idle(t));

  // ---- pose for a frame ----
  // s: {x (world x of the hip at d = 0), y (ground y under the feet), d (distance walked, rig units), run (0..1 gait mix),
  //     facing ±1, scale, clip (name | fn | rig.play track), lift (world px airborne), ground: x → y}
  function pose(t, s = {}) {
    const sc = s.scale != null ? s.scale : (o.scale || .6), dir = s.facing || 1, d = s.d || 0;
    let p = { ...clipPose(s.clip || 'idle', t) };
    const gw = s.run || 0, g0 = G.at(d), g1 = gw > 0 ? RUN.at(d * RUN.stride / G.stride) : null;
    const hipH = g1 ? g0.hipY + (g1.hipY - g0.hipY) * gw : g0.hipY;
    const feet = g0.feet.map((f, i) => g1 ? { x: f.x + (g1.feet[i].x - f.x) * gw, y: f.y + (g1.feet[i].y - f.y) * gw, angle: f.angle + (g1.feet[i].angle - f.angle) * gw } : f);
    const gy = x => (s.ground ? s.ground(x) : (s.y != null ? s.y : 600));
    const air = clamp(p.air || 0), hop = (p.hop || 0) + (s.lift || 0) / sc;
    const hx = (s.x || 0) + dir * d * sc, hy = gy(hx) - (hipH - (p.crouch || 0) + hop) * sc;
    const root = { x: hx, y: hy, scale: sc, flip: dir, rot: dir * (p.lean || 0) };
    // arm swing from the feet (opposite arm to leg)
    const sw = p.armSwing != null ? p.armSwing : 1;
    if (sw) { const a = (feet[0].x - d) / (G.stride * .5), b = (feet[1].x - d) / (G.stride * .5); p.upperArmN = (p.upperArmN || 0) + sw * 22 * b; p.upperArmF = (p.upperArmF || 0) + sw * 22 * a; }
    // legs: IK to the planted / swinging ankles (world), tucked under the hip when airborne
    const ank = (f, side) => {
      const wx = (s.x || 0) + dir * f.x * sc, wy = gy(wx) - (f.y + ANKLE) * sc;
      if (!air) return [wx, wy];
      const tx = hx + dir * (side ? -8 : 14) * sc, ty = hy + (HIP - 40) * sc;
      return [wx + (tx - wx) * air, wy + (ty - wy) * air];
    };
    p = rig.solveIK('legN', ank(feet[0], 0), p, root);
    p = rig.solveIK('legF', ank(feet[1], 1), p, root);
    // soles level with the ground (+ swing toe angle), flaps and hair lag behind the motion
    p.footN = (p.footN || 0) - worldRot('footN', { ...p, footN: 0 }) + feet[0].angle * (1 - air) + 20 * air;
    p.footF = (p.footF || 0) - worldRot('footF', { ...p, footF: 0 }) + feet[1].angle * (1 - air) + 20 * air;
    const vx = s.vx != null ? s.vx : 0;
    p.flapN = .5 * Math.min(0, p.thighN || 0) + .15 * Math.max(0, p.thighN || 0) + (s.flap || 0);
    p.flapB = .45 * Math.max(0, p.thighF || 0) + .2 * Math.min(0, p.thighF || 0) + (s.flap || 0);
    p.tail = (p.tail || 0) + 6 * S(t * 2.3) + (s.tail || 0) - (p.head || 0) * .6 - (p.chest || 0) * .5;
    return { p, root, sc, dir, hx, hy };
  }
  const point = (bone, x, y, R) => rig.point(bone, x, y, R.p, R.root);
  const api = {
    g, inner, rig, gait: G, runGait: RUN, pieces: pieceEls, colours: C_,
    pose, point: (bone, x, y, t, s) => point(bone, x, y, pose(t, s)),
    // point of a bone for an already computed pose R (the value render() returns)
    pointAt: (R, bone, x = 0, y = 0) => point(bone, x, y, R), HC,
    // subject for the camera (vk shots): head centre + radius, feet, facing
    subject(t, s) { const R = pose(t, s), h = point('head', HC[0], HC[1], R); return { head: h, headR: HEAD_R * 1.1 * R.sc, feet: [R.hx, (s.ground ? s.ground(R.hx) : s.y)], facing: R.dir }; },
    // s (see pose) + {mouth: {open, shape} | seg (voice line) , blink, eyes: 'shut', opacity, scarfWind}
    render(t, s = {}) {
      setOp(g, s.opacity == null ? 1 : s.opacity);
      if (s.opacity != null && s.opacity <= .001) return null;
      const R = pose(t, s), m = mats(R.p);
      rig.apply(R.p, R.root);
      const lk = R.p.look || 0, pupT = ` translate(${f1(lk > 0 ? -.5 * lk : 1.2 * -lk)} ${f1(lk * 2.2)})`;
      for (const pe of pieceEls) { const k = m[pe.bone]; if (!k) continue; const str = `matrix(${f3(k[0])} ${f3(k[1])} ${f3(k[2])} ${f3(k[3])} ${f1(k[4])} ${f1(k[5])})` + (pe.pupil ? pupT : ''); if (str !== pe.last) { pe.last = str; pe.el.setAttribute('transform', str); } }
      const bl = s.eyes === 'shut' ? 1 : rigBlink(t + (o.blinkOffset || 0), { period: 3.9, dur: .16 });
      E.open.forEach(e => setOp(e, 1 - bl)); E.shut.forEach(e => setOp(e, bl));
      const mo = s.mouth || (s.seg ? mouthAt(s.seg, t) : { open: 0, shape: 'M' });
      for (const k of Object.keys(E.mouths)) E.mouths[k].forEach(e => {
        const on = mo.shape === k || (k === 'M' && !(mo.shape in E.mouths)); setOp(e, on ? 1 : 0);
        if (on && k !== 'M') { const sy = .35 + .65 * clamp(mo.open); const tr = `translate(0 ${f1(MOUTH[1] * (1 - sy))}) scale(1 ${f3(sy)})`; if (e.__tr !== tr) { e.__tr = tr; const v = e.querySelector('.pp-v'); if (v) v.setAttribute('transform', tr); } }
      });
      if (scarfPath) {
        // scarf: anchored behind the neck, trails the root's past positions (secondary motion)
        const hist = s.track || (s.speed ? u => ({ ...s, d: (s.d || 0) - (t - u) * s.speed }) : () => s);   // state history: s.track(u) or constant speed (rig units/s)
        const anchor = u => { const Ru = u === t ? R : pose(u, hist(u)); return point('chest', -14, -118, Ru); };
        const L0 = (o.scarfLen || 1) * 8 * R.sc / .6, pts = ribbon(anchor, t, { n: 8, len: L0, lag: .04, hang: [-.6 * R.dir, .8], sag: .8, flutter: 18 * R.sc, freq: 1.3, wave: 1.1, wind: [-(s.scarfWind != null ? s.scarfWind : 4) * R.dir * R.sc, -2.2 * R.sc], seed: seedBase });
        scarfPath.setAttribute('d', ribbonPath(pts, 22 * R.sc, 9 * R.sc, { twist: 1.2, phase: t * 2.2 }));
      }
      return R;
    },
  };
  return api;
}
export const puppetBones = { BONES, IK, CLIPS, SOLE, HIP, HEAD_R };
