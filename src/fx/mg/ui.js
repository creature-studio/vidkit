// UI micro-interaction kit (vk.ui.*): DOM nodes that read like product UI and animate as pure functions of time.
// They work on their own or inside vk.device(vk.col([...]), {type:'phone'}). Sizes are px at 720p (auto-scaled);
// all times are scene-local seconds or 'b:N' beats. Every card slides in from the right with outBack by default
// (override with fx / dist / d / ease like any node).
//   vk.ui.ringCard({label, value: 78, suffix: '%', color, at, fillAt, fillD})    progress ring + counting number
//   vk.ui.toggle({label, sub, click, color, on})                                 switch; the knob squashes as it travels
//   vk.ui.equalizer({bars: 7, color, speed})                                     deterministic sine equalizer
//   vk.ui.like({click, color})                                                   heart button: boing scale + burst lines
//   vk.ui.chips(['EASE-OUT-EXPO', '0.4 S'], {colors, gap, bob})                  pill tags, staggered in, bobbing
//   vk.ui.cursor({keys: [[t, x, y] …], clicks: [t …], ripple})                   pointer path (inOutCubic), click shrink + ripple
import { node, h, s as svg } from '../../authoring/node.js';
import { clamp01, lerp } from '../../core/time.js';
import { EASE } from '../../core/ease.js';
import { cursorAt, pressAt, toggleKnob, likePop, eqLevel, P } from './math.js';
import { REEL } from './paint.js';

const cardDef = o => ({ fx: 'right', dist: 360, ease: 'outBack', d: .5, ...o });
const T = (ctx, v, d = 0) => (v == null ? d : ctx.scene.time(v));
function card(ctx, o, bg, fg) {
  const px = ctx.px, c = h('div', 'vk-ui-card');
  c.style.cssText = `position:relative;display:flex;align-items:center;gap:${px(18)}px;box-sizing:border-box;width:${o.w ? px(o.w) + 'px' : '100%'};` +
    `min-height:${px(o.h || 96)}px;padding:${px(16)}px ${px(22)}px;border-radius:${px(o.radius != null ? o.radius : 24)}px;background:${bg};color:${fg};text-align:left;flex:none`;
  return c;
}
const labelCss = (px, size, col, font = 'var(--vk-sans)', w = 800) => `font:${w} ${px(size)}px/1.1 ${font};color:${col};white-space:nowrap`;
const mix = (a, b, k) => { const pa = a.match(/\w\w/g).map(x => parseInt(x, 16)), pb = b.match(/\w\w/g).map(x => parseInt(x, 16)); return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], k)).toString(16).padStart(2, '0')).join(''); };

export const ui = {
  ringCard: (o = {}) => node(cardDef(o), function uiRingCard(ctx) {
    const px = ctx.px, bg = o.color || REEL.pink, fg = o.fg || REEL.ink, c = card(ctx, o, bg, fg), R = px(o.r || 30), sw = px(o.stroke || 9);
    const sv = svg('svg', { width: 2 * R + sw, height: 2 * R + sw, viewBox: `${-R - sw / 2} ${-R - sw / 2} ${2 * R + sw} ${2 * R + sw}` }, c);
    svg('circle', { r: R, fill: 'none', stroke: 'rgba(10,10,18,.25)', 'stroke-width': sw }, sv);
    const arc = svg('circle', { r: R, fill: 'none', stroke: fg, 'stroke-width': sw, 'stroke-linecap': 'round', transform: 'rotate(-90)', 'stroke-dasharray': `0 ${2 * Math.PI * R}` }, sv);
    const col = h('div', null, null, c); col.style.cssText = 'display:flex;flex-direction:column;gap:' + px(4) + 'px';
    h('div', null, o.label || '', col).style.cssText = labelCss(px, o.labelSize || 22, fg);
    const num = h('div', null, '0' + (o.suffix != null ? o.suffix : '%'), col); num.style.cssText = labelCss(px, o.valueSize || 38, fg, 'var(--vk-display)', 900);
    const t0 = T(ctx, o.fillAt, ctx.at(o) + .25), d = o.fillD || .9, L = 2 * Math.PI * R, max = o.value != null ? o.value : 78;
    ctx.scene.on(local => { const p = EASE.outExpo(P(local, t0, d)); arc.setAttribute('stroke-dasharray', `${(L * max / 100 * p).toFixed(2)} ${L.toFixed(2)}`); num.textContent = Math.round(max * p) + (o.suffix != null ? o.suffix : '%'); });
    return c;
  }),
  toggle: (o = {}) => node(cardDef(o), function uiToggle(ctx) {
    const px = ctx.px, c = card(ctx, o, o.bg || '#2A2A44', o.fg || REEL.paper), on = o.color || REEL.cyan;
    c.style.padding = `${px(14)}px ${px(16)}px`; c.style.gap = px(12) + 'px';
    const col = h('div', null, null, c); col.style.cssText = `display:flex;flex-direction:column;gap:${px(6)}px;flex:1;min-width:0`;
    if (o.label) h('div', null, o.label, col).style.cssText = labelCss(px, o.labelSize || 21, o.fg || REEL.paper);
    if (o.sub) h('div', null, o.sub, col).style.cssText = labelCss(px, o.subSize || 18, on, 'var(--vk-display)', 900);
    const tw = px(o.trackW || 74), th = px(o.trackH || 40), kr = th * .38, track = h('div', null, null, c); track.style.cssText = `position:relative;width:${tw}px;height:${th}px;border-radius:${th / 2}px;flex:none`;
    const knob = h('div', null, null, track); knob.style.cssText = `position:absolute;left:${th / 2 - kr}px;top:${th / 2 - kr}px;width:${2 * kr}px;height:${2 * kr}px;border-radius:50%;background:${o.knob || REEL.paper}`;
    const tc = T(ctx, o.click, ctx.at(o) + .6), travel = tw - th;
    ctx.scene.on(local => {
      const k = toggleKnob(P(local, tc, .3)), cc = EASE.outCubic(P(local, tc, .25));
      track.style.background = mix(o.off || '#4a4a66', on, cc);
      knob.style.transform = `translateX(${(k.x * travel).toFixed(2)}px) scale(${k.sx.toFixed(4)},${k.sy.toFixed(4)})`;
    });
    return c;
  }),
  equalizer: (o = {}) => node(cardDef(o), function uiEqualizer(ctx) {
    const px = ctx.px, c = card(ctx, o, o.color || REEL.yellow, REEL.ink), n = o.bars || 7, bw = px(o.barW || 17), H = px(o.barH || 64);
    c.style.justifyContent = 'center'; c.style.gap = px(o.gap || 13) + 'px';
    const bars = Array.from({ length: n }, () => { const b = h('div', null, null, c); b.style.cssText = `width:${bw}px;height:${H}px;border-radius:${bw / 2}px;background:${o.fg || REEL.ink};transform-origin:50% 50%;flex:none`; return b; });
    const t0 = ctx.at(o);
    ctx.scene.on(local => bars.forEach((b, i) => { const g = EASE.outCubic(P(local, t0 + i * .04, .4)); b.style.transform = `scaleY(${Math.max(.02, eqLevel(local, i, o) * g).toFixed(4)})`; }));
    return c;
  }),
  like: (o = {}) => node({ fx: 'pop', ...o }, function uiLike(ctx) {
    const px = ctx.px, r = px(o.r || 28), wrap = h('div', 'vk-ui-like'); wrap.style.cssText = `position:relative;width:${2 * r}px;height:${2 * r}px;flex:none;align-self:center`;
    const btn = h('div', null, null, wrap); btn.style.cssText = `position:absolute;inset:0;border-radius:50%;display:flex;align-items:center;justify-content:center`;
    const sv = svg('svg', { width: r * 1.1, height: r * 1.1, viewBox: '-12 -11 24 22' }, btn);
    const heart = svg('path', { d: 'M0 9 C-9 3 -11 -3 -8 -7 C-5 -10 -1 -8 0 -5 C1 -8 5 -10 8 -7 C11 -3 9 3 0 9Z' }, sv);
    const bs = svg('svg', { width: 6 * r, height: 6 * r, viewBox: `${-3 * r} ${-3 * r} ${6 * r} ${6 * r}` }, wrap); bs.style.cssText = `position:absolute;left:${-2 * r}px;top:${-2 * r}px;pointer-events:none;overflow:visible`;
    const col = o.color || REEL.pink, lines = Array.from({ length: 10 }, () => svg('line', { stroke: col, 'stroke-width': px(4), 'stroke-linecap': 'round' }, bs));
    const tc = T(ctx, o.click, ctx.at(o) + .5);
    ctx.scene.on(local => {
      const L = likePop(local - tc);
      btn.style.transform = `scale(${L.s.toFixed(4)})`; btn.style.background = mix(o.off || '#2A2A44', col, L.c); heart.setAttribute('fill', mix('#9a9ab5', REEL.paper, L.c));
      const bp = L.burst, e = EASE.outCubic(bp), vis = bp > 0 && bp < 1;
      lines.forEach((ln, i) => { const a = i / 10 * Math.PI * 2, r0 = r * lerp(1.38, 2.2, e), r1 = r0 + r * lerp(.1, .67, e); ln.setAttribute('opacity', vis ? (1 - bp).toFixed(3) : 0); ln.setAttribute('x1', (Math.cos(a) * r0).toFixed(1)); ln.setAttribute('y1', (Math.sin(a) * r0).toFixed(1)); ln.setAttribute('x2', (Math.cos(a) * r1).toFixed(1)); ln.setAttribute('y2', (Math.sin(a) * r1).toFixed(1)); });
    });
    return wrap;
  }),
  chips: (labels = [], o = {}) => node({ fx: 'none', ...o }, function uiChips(ctx) {
    const px = ctx.px, box = h('div', 'vk-ui-chips'), cols = o.colors || [REEL.yellow, REEL.cyan, REEL.pink, REEL.violet];
    box.style.cssText = `display:flex;flex-direction:${o.row ? 'row' : 'column'};align-items:flex-start;gap:${px(o.gap || 26)}px`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : .12;
    const chips = labels.map((s, i) => { const c = h('div', 'vk-ui-chip', s, box); c.style.cssText = `padding:${px(12)}px ${px(22)}px;border-radius:${px(40)}px;background:${cols[i % cols.length]};${labelCss(px, o.size || 23, o.fg || REEL.ink, 'var(--vk-mono)', 700)}`; return c; });
    ctx.scene.on(local => chips.forEach((c, i) => { const p = EASE.outBack(P(local, t0 + i * each, .5)), y = o.bob === false ? 0 : Math.sin(local * 4 + i) * px(4); c.style.opacity = local >= t0 + i * each ? 1 : 0; c.style.transform = `translate(${lerp(px(o.dist || 370), 0, p).toFixed(1)}px,${y.toFixed(1)}px)`; }));
    return box;
  }),
  // pointer: keys [[t, x, y]] (x/y ≤ 1 → stage fraction, else px at 720p) placed absolutely in its parent (use in sc.add at scene level)
  cursor: (o = {}) => node({ fx: 'none', ...o }, function uiCursor(ctx) {
    const px = ctx.px, W = ctx.W, H = ctx.H, xy = (x, y) => [Math.abs(x) <= 1 ? x * W : px(x), Math.abs(y) <= 1 ? y * H : px(y)];
    const keys = (o.keys || [[0, .5, .5]]).map(k => [T(ctx, k[0]), ...xy(k[1], k[2])]), clicks = (o.clicks || []).map(c => T(ctx, c));
    const root = h('div', 'vk-ui-cursor vk-abs'); root.dataset.qa = 'ignore'; root.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:30';
    const rc = o.rippleColor || REEL.pink, ripples = o.ripple === false ? [] : clicks.map(() => { const r = h('div', null, null, root); r.style.cssText = `position:absolute;left:0;top:0;width:${px(94)}px;height:${px(94)}px;margin:${-px(47)}px 0 0 ${-px(47)}px;border-radius:50%;border:${px(4)}px solid ${rc};box-sizing:border-box;opacity:0`; return r; });
    const cur = h('div', null, null, root), sz = px(o.size || 44);
    cur.style.cssText = `position:absolute;left:0;top:0;width:${sz}px;height:${sz}px;transform-origin:0 0`;
    const sv = svg('svg', { width: sz, height: sz, viewBox: '0 0 24 24' }, cur);
    svg('path', { d: 'M2 1 L2 19 L7 14.5 L10.5 22 L13.5 20.6 L10 13.3 L16.5 13 Z', fill: o.fill || REEL.paper, stroke: o.stroke || REEL.ink, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, sv);
    const tIn = keys[0][0] - .05;
    ctx.scene.on(local => {
      const [x, y] = cursorAt(keys, local), a = P(local, tIn, .12), s = pressAt(clicks, local);
      cur.style.opacity = a.toFixed(3); cur.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s})`;
      ripples.forEach((r, i) => { const p = P(local, clicks[i], .4), [rx, ry] = cursorAt(keys, clicks[i]); r.style.opacity = p > 0 && p < 1 ? (1 - p).toFixed(3) : 0; r.style.transform = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) scale(${Math.max(.01, EASE.outCubic(p)).toFixed(4)})`; });
    });
    return root;
  }),
};
