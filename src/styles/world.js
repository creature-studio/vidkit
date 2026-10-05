// World composer: a setting ("mountain dusk", "village night", {place, time, props}) → layered SVG world painted by the
// style's palette + material. Layers (back → front): sky · celestial · far · mid · props · ground · actors · front.
// Static layers are baked once (vk.bake); actors / front stay live. A pack can override any layer painter.
import { hills, peaks, tree, house, waves, grass, blob, ellipse, rect, star, cloudScroll, strokeOutline, polyD, rnd, translate } from './geom.js';
import { material } from './materials.js';
import { shade } from './color.js';

const NS = 'http://www.w3.org/2000/svg';
const PLACES = ['mountain', 'forest', 'village', 'river', 'sea', 'field', 'city', 'palace', 'garden', 'sky'];
const TIMES = ['day', 'dawn', 'dusk', 'night'];
const PROPS = ['moon', 'sun', 'stars', 'pine', 'tree', 'willow', 'house', 'temple', 'bridge', 'boat', 'flowers', 'grass', 'rock', 'clouds', 'tower', 'lantern'];
const ALIAS = { 山: 'mountain', 山林: 'forest', 林: 'forest', 森林: 'forest', 树林: 'forest', 村: 'village', 村庄: 'village', 河: 'river', 江: 'river', 湖: 'river', 池塘: 'river', 海: 'sea', 田野: 'field', 草地: 'field', 城: 'city', 城市: 'city', 宫: 'palace', 宫殿: 'palace', 天宫: 'palace', 园: 'garden', 花园: 'garden', 天空: 'sky',
  白天: 'day', 清晨: 'dawn', 黎明: 'dawn', 黄昏: 'dusk', 傍晚: 'dusk', 夜: 'night', 夜晚: 'night', 月: 'moon', 月亮: 'moon', 太阳: 'sun', 星: 'stars', 星星: 'stars', 松: 'pine', 树: 'tree', 柳: 'willow', 房子: 'house', 庙: 'temple', 桥: 'bridge', 船: 'boat', 花: 'flowers', 草: 'grass', 石: 'rock', 云: 'clouds', 塔: 'tower', 灯笼: 'lantern' };
// "mountain dusk moon pine" | "山 黄昏 月亮" | {place, time, props} → normalised setting
export function parseSetting(s) {
  if (s && typeof s === 'object') return { place: s.place || 'field', time: s.time || 'day', props: s.props || [], seed: s.seed || 1, ...s };
  const words = String(s || '').split(/[\s,，、/|]+/).filter(Boolean).map(w => ALIAS[w] || w.toLowerCase());
  const out = { place: 'field', time: 'day', props: [], seed: 1 };
  for (const w of words) { if (PLACES.includes(w)) out.place = w; else if (TIMES.includes(w)) out.time = w; else if (PROPS.includes(w)) out.props.push(w); else if (/^seed=?\d+/.test(w)) out.seed = +w.replace(/\D/g, ''); }
  return out;
}

const g = (parent, cls, attrs = '') => { const e = document.createElementNS(NS, 'g'); e.setAttribute('class', cls); if (attrs) attrs.replace(/(\w[\w-]*)="([^"]*)"/g, (_, k, v) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
// paint a list of {pts, role, orn, holes, op, line, w} with the style material → markup
export function paintAll(style, list) {
  const M = material(style.worldMaterial || style.material), P = style.P || {};
  return list.map((p, i) => M.paint({ seed: i + 1, ...p, col: p.col || style.colour(p.role, p.role) }, P)).join('');
}

// build the world in scene `sc`. o: {setting, ground (y or fn), seed, W, H, layers: {far: false, …}, bake}
export function buildWorld(sc, style, setting, o = {}) {
  const v = sc.video, W = v.W, H = v.H, S = parseSetting(setting), seed = o.seed || S.seed || 1;
  const gy0 = o.ground != null && typeof o.ground === 'number' ? o.ground : Math.round(H * .82);
  const ground = typeof o.ground === 'function' ? o.ground : (S.place === 'river' || S.place === 'sea' ? () => gy0 : x => gy0 + (o.flat ? 0 : 6 * Math.sin(x / 210 + seed)));
  const wrap = sc.html(`<svg class="vk-world" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"></svg>`);
  const host = sc.cam || sc.el, bgs = [...host.children].filter(c => c.classList.contains('vk-bg'));
  host.insertBefore(wrap, bgs.length ? bgs[bgs.length - 1].nextSibling : host.firstChild);    // behind the content flow (titles), above backgrounds
  const L = {}, ctx = { sc, v, W, H, S, seed, ground, gy0, style, wrap, layers: L };
  const M = material(style.worldMaterial || style.material), P = style.P || {};
  for (const n of ['sky', 'far', 'mid', 'props', 'ground', 'actors', 'front']) L[n] = g(wrap, 'vw-' + n, n === 'actors' ? '' : (style.layerAttrs ? style.layerAttrs(n, ctx) : M.group(P, n === 'sky' ? '' : 'layer')));
  const paint = list => paintAll(style, list);
  const H2 = style.hooks || {};
  // ---- sky ----
  (H2.sky || defaultSky)(L.sky, ctx);
  // ---- far / mid relief ----
  if (H2.far !== false) (H2.far || defaultFar)(L.far, ctx, paint);
  if (H2.mid !== false) (H2.mid || defaultMid)(L.mid, ctx, paint);
  // ---- props ----
  (H2.props || defaultProps)(L.props, ctx, paint);
  // ---- ground ----
  (H2.ground || defaultGround)(L.ground, ctx, paint);
  if (H2.front) H2.front(L.front, ctx, paint);
  if (H2.after) H2.after(ctx, paint);
  if (o.bake !== false && v.bake) ['sky', 'far', 'mid', 'props', 'ground'].forEach(n => { if (L[n].childNodes.length && !L[n].hasAttribute('data-live')) v.bake(L[n], { scale: o.bakeScale || 1 }); });
  return { svg: wrap, ...L, ground, setting: S, ctx };
}

export function skyColours(style, time) {
  const c = r => style.colour(r, r);
  return time === 'night' ? [c('night0'), c('night1')] : time === 'dusk' ? [c('dusk0'), c('dusk1')] : time === 'dawn' ? [c('dawn0'), c('dawn1')] : [c('sky0'), c('sky1')];
}
let gid = 0;
export function defaultSky(el, ctx) {
  const { W, H, S, style } = ctx, [a, b] = skyColours(style, S.time), id = 'vk-sky-' + (++gid);
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="url(#${id})"/>`;
  s += celestial(ctx);
  el.innerHTML = s;
}
export function celestial(ctx, o = {}) {
  const { W, S, style } = ctx, c = r => style.colour(r, r), M = material(style.worldMaterial || style.material), P = style.P || {};
  let s = '';
  const night = S.time === 'night' || S.props.includes('moon');
  if (S.props.includes('stars') || S.time === 'night') for (let i = 0; i < 26; i++) { const x = rnd(ctx.seed + 3, i) * W, y = 30 + rnd(ctx.seed + 5, i) * 260, r = 1.4 + rnd(ctx.seed + 7, i) * 2.2; s += M.paint({ pts: star(x, y, r * 1.8, r * .7, 4), col: c('star'), role: 'star', seed: i }, P); }
  if (night) { const x = o.moonX || W * .78, y = o.moonY || 128; s += M.paint({ pts: ellipse(x, y, 46, 46, 0, 40), col: c('moon'), role: 'moon', seed: 9 }, P); }
  else if (S.time === 'dusk' || S.time === 'dawn' || S.props.includes('sun')) { const x = o.sunX || W * (S.time === 'dawn' ? .2 : .72), y = S.time === 'day' ? 120 : 250; s += M.paint({ pts: ellipse(x, y, S.time === 'day' ? 50 : 66, S.time === 'day' ? 50 : 66, 0, 44), col: c('sun'), role: 'sun', seed: 8 }, P); }
  if (S.props.includes('clouds') || S.time === 'day') for (let i = 0; i < 3; i++) { const x = 160 + i * 420 + rnd(ctx.seed, i) * 120, y = 90 + rnd(ctx.seed + 1, i) * 90; s += M.paint({ pts: blob(x, y, 90, 26, ctx.seed + i, .2), col: c('cloud'), role: 'cloud', op: .9, seed: 20 + i }, P); }
  return s;
}
export function defaultFar(el, ctx, paint) {
  const { W, S, seed, gy0 } = ctx, tall = S.place === 'mountain' ? 1.6 : S.place === 'city' ? 0 : 1;
  if (S.place === 'city') return;
  el.innerHTML = paint([{ pts: hills(-40, W + 40, gy0 - 250 * tall, 70 * tall, seed + .3, { base: gy0 + 40, freq: .004, peaks: S.place === 'mountain' ? 1.4 : 0 }), role: 'far' }]);
}
export function defaultMid(el, ctx, paint) {
  const { W, S, seed, gy0 } = ctx, list = [];
  if (S.place === 'city') {
    for (let i = 0; i < 14; i++) { const w = 60 + rnd(seed, i) * 70, h = 120 + rnd(seed + 2, i) * 240, x = i * 96 - 30; list.push({ pts: rect(x, gy0 - h, w, h + 20), role: i % 2 ? 'far' : 'mid', orn: windowsOf(x, gy0 - h, w, h, seed + i) }); }
    el.innerHTML = paint(list); return;
  }
  const amp = S.place === 'mountain' ? 70 : S.place === 'river' || S.place === 'sea' ? 20 : 40;
  list.push({ pts: hills(-40, W + 40, gy0 - (S.place === 'mountain' ? 130 : 80), amp, seed + 1.7, { base: gy0 + 40, freq: .006 }), role: 'mid' });
  el.innerHTML = paint(list);
}
function windowsOf(x, y, w, h, seed) { const out = []; for (let r = 0; r < Math.floor(h / 34); r++) for (let c = 0; c < Math.floor(w / 22); c++) if (rnd(seed, r * 7 + c) > .45) out.push(rect(x + 8 + c * 22, y + 12 + r * 34, 9, 14)); return out; }
export function defaultProps(el, ctx, paint) {
  const { W, S, seed, ground, gy0 } = ctx, list = [], want = new Set(S.props);
  const P = S.place;
  if (P === 'forest' || want.has('tree') || want.has('pine') || P === 'mountain' || P === 'village' || P === 'garden') {
    const kind = want.has('pine') || P === 'mountain' ? 'pine' : want.has('willow') ? 'willow' : 'round';
    const xs = P === 'forest' ? [90, 250, 980, 1130, 1230] : [110, 1150];
    xs.forEach((x, i) => { const h = (P === 'forest' ? 260 : 220) * (.75 + .4 * rnd(seed + 4, i)); const T = tree(x, ground(x) + 4, h, { kind, seed: seed + i, lean: (rnd(seed + 6, i) - .5) * .12 }); list.push({ pts: T.trunk, role: 'trunk' }); T.crown.forEach((c, j) => list.push({ pts: c, role: j % 2 ? 'leaf2' : 'leaf' })); });
  }
  if (P === 'village' || want.has('house')) [[930, 170, 140], [1110, 130, 110]].forEach(([x, w, h], i) => { const Hs = house(x, ground(x) + 2, w, h, { kind: 'cottage' }); list.push({ pts: Hs.walls, role: 'wall' }, { pts: Hs.roof, role: 'roof' }, { pts: Hs.door, role: 'door' }, ...Hs.windows.map(p => ({ pts: p, role: 'door', op: .85 }))); });
  if (P === 'palace' || want.has('temple')) { const Hs = house(980, ground(980) + 2, 300, 170, { kind: 'temple' }); list.push({ pts: rect(820, ground(980) - 10, 320, 14), role: 'roof' }, { pts: Hs.walls, role: 'wall' }, { pts: Hs.roof, role: 'roof' }, { pts: Hs.door, role: 'door' }); }
  if (want.has('rock')) list.push({ pts: blob(1020, gy0 - 20, 70, 40, seed + 9, .2), role: 'mid' });
  el.innerHTML = paint(list);
}
export function defaultGround(el, ctx, paint) {
  const { W, H, S, seed, ground, gy0 } = ctx, list = [];
  if (S.place === 'river' || S.place === 'sea') {
    list.push({ pts: waves(-40, W + 40, gy0 - 40, 6, 120, seed, H + 60), role: 'water' });
    list.push({ pts: waves(-40, W + 40, gy0 - 8, 4, 80, seed + 2, H + 60), role: 'water2', op: .9 });
    list.push({ pts: [[-40, gy0 + 4], [520, gy0 - 6], [660, gy0 + 20], [660, H + 60], [-40, H + 60]], role: 'ground' });
  } else {
    const pts = [[-40, H + 60]]; for (let x = -40; x <= W + 40; x += 20) pts.push([x, ground(x)]); pts.push([W + 40, H + 60]);
    list.push({ pts, role: 'ground' });
    const p2 = [[-40, H + 60]]; for (let x = -40; x <= W + 40; x += 20) p2.push([x, ground(x) + 44 + 8 * Math.sin(x / 90 + seed)]); p2.push([W + 40, H + 60]);
    list.push({ pts: p2, role: 'ground2' });
  }
  if (S.place === 'field' || S.place === 'garden' || S.props.includes('grass') || S.place === 'forest' || S.place === 'mountain') [70, 300, 520, 760, 870, 1060, 1210].forEach((x, i) => grass(x, ground(x) + 6, 22 + 10 * rnd(seed, i), 5, seed + i).forEach(b => list.push({ pts: b, role: 'leaf' })));
  if (S.place === 'garden' || S.props.includes('flowers')) [160, 420, 680, 940, 1180].forEach((x, i) => { list.push({ pts: ellipse(x, ground(x) - 14, 8, 8, 0, 12), role: 'flower', orn: [ellipse(x, ground(x) - 14, 3, 3, 0, 8)] }); });
  el.innerHTML = paint(list);
}
export { PLACES, TIMES, PROPS };
