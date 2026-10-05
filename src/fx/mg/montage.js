// vk.montage(words, o): fast keyword cuts — one word per slot (default every half beat), each slot with its own
// palette, a slam-in (scale 1.5 → 1, small rotation, side offset, alternating direction), outlined text on odd
// slots / hard offset shadow on even ones, radial lines, a "0n / 08" counter, progress dots and a white flash per cut.
// words: [['缓动', 'EASING'], …] or ['EASING', …]. o: {every: 'b:0.5' | seconds, at, palettes: [{bg, fg, acc}],
// size, subSize, counter, dots, flash (alpha), lines (count), font, subFont}. A full-frame DOM node (put it in sc.add()).
import { node, h, s as svg } from '../../authoring/node.js';
import { lerp } from '../../core/time.js';
import { EASE } from '../../core/ease.js';
import { montageSlot, P } from './math.js';
import { REEL } from './paint.js';

const R = REEL;
export const MONTAGE_PALETTES = [
  { bg: R.pink, fg: R.paper, acc: R.ink }, { bg: R.ink, fg: R.yellow, acc: R.paper }, { bg: R.cyan, fg: R.ink, acc: R.violet }, { bg: R.paper, fg: R.violet, acc: R.ink },
  { bg: R.violet, fg: R.paper, acc: R.yellow }, { bg: R.yellow, fg: R.ink, acc: R.violet }, { bg: R.ink, fg: R.cyan, acc: R.pink }, { bg: R.pink, fg: R.ink, acc: R.paper },
];
function slotLen(ctx, v) {
  const B = ctx.video.beats, spb = B && B.active ? B.beat : .5;
  if (v == null) return spb / 2;
  if (typeof v === 'string' && v.startsWith('b:')) return parseFloat(v.slice(2)) * spb;
  return +v;
}
export const montage = (words = [], o = {}) => node({ fx: 'none', ...o }, function montage(ctx) {
  const px = ctx.px, W = ctx.W, H = ctx.H, n = words.length, every = slotLen(ctx, o.every), pals = o.palettes || MONTAGE_PALETTES;
  const root = h('div', 'vk-montage vk-abs'); root.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:0`;
  const nl = o.lines != null ? o.lines : 16, sv = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root); sv.style.cssText = 'position:absolute;left:0;top:0';
  const lines = Array.from({ length: nl }, () => svg('line', { 'stroke-width': px(3.4), 'stroke-linecap': 'round', opacity: .3 }, sv));
  const mk = (cls, css) => { const e = h('div', cls, null, root); e.style.cssText = 'position:absolute;white-space:nowrap;line-height:1;' + css; return e; };
  const big = mk('vk-montage-word', `left:50%;top:${(o.y != null ? o.y : .4) * 100}%;font:900 ${px(o.size || 373)}px var(--vk-display-cn, var(--vk-sans));letter-spacing:-.02em`);
  const sub = mk('vk-montage-sub', `left:50%;top:${(o.subY != null ? o.subY : .75) * 100}%;font:400 ${px(o.subSize || 113)}px var(--vk-display)`);
  const ctr = o.counter === false ? null : mk('vk-montage-ctr', `left:${px(93)}px;top:${px(127)}px;font:700 ${px(23)}px var(--vk-mono);transform:translateY(-50%)`);
  const dotBox = o.dots === false ? null : mk('', `left:50%;top:${px(631)}px;display:flex;gap:${px(12)}px;transform:translateX(-50%)`);
  const dots = dotBox ? words.map(() => { const d = h('i', null, null, dotBox); d.style.cssText = `display:block;width:${px(19)}px;height:${px(19)}px`; return d; }) : [];
  const fl = h('div', null, null, root); fl.dataset.qa = 'ignore'; fl.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none';
  const t0 = ctx.at(o), lead = ctx.video.beats ? ctx.video.beats.leadT || 0 : 0;
  let last = -1;
  ctx.scene.on(local => {
    const lt = Math.max(0, local - t0 + lead), { idx, ft } = montageSlot(lt, every, n), th = pals[idx % pals.length], dir = idx % 2 ? 1 : -1, w = [].concat(words[idx] || '');
    root.style.background = th.bg;
    if (idx !== last) {
      last = idx; big.textContent = w[0]; sub.textContent = w[1] || '';
      big.style.color = idx % 2 ? 'transparent' : th.fg; big.style.webkitTextStroke = idx % 2 ? `${px(6.7)}px ${th.fg}` : '';
      big.style.textShadow = idx % 2 ? 'none' : `${px(10.7)}px ${px(10.7)}px 0 ${th.acc}80`;
      sub.style.color = idx % 2 ? th.fg : th.acc;
      if (ctr) { ctr.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`; ctr.style.color = th.acc; }
      dots.forEach((d, i) => { d.style.background = th.acc; d.style.opacity = i <= idx ? 1 : .25; });
      lines.forEach(l => l.setAttribute('stroke', th.acc));
    }
    const e = EASE.outExpo(P(ft, 0, .14)), scl = lerp(1.5, 1, e), rot = dir * lerp(3.4, 0, e), ox = dir * lerp(px(160), 0, e);
    big.style.transform = `translate(-50%,-50%) translateX(${ox.toFixed(1)}px) rotate(${rot.toFixed(3)}deg) scale(${scl.toFixed(4)})`;
    const ss = lerp(1.2, 1, e); sub.style.transform = `translate(-50%,-50%) translateX(${(-ox * .6).toFixed(1)}px) scale(${ss.toFixed(4)})`;
    const bp = EASE.outExpo(P(ft, 0, .3));
    lines.forEach((l, i) => { const a = i / nl * Math.PI * 2 + idx * .5, r0 = px(173) + px(467) * bp, r1 = r0 + px(87) * (1 - bp); l.setAttribute('x1', (W / 2 + Math.cos(a) * r0).toFixed(1)); l.setAttribute('y1', (H / 2 + Math.sin(a) * r0).toFixed(1)); l.setAttribute('x2', (W / 2 + Math.cos(a) * r1).toFixed(1)); l.setAttribute('y2', (H / 2 + Math.sin(a) * r1).toFixed(1)); });
    fl.style.opacity = o.flash === false ? 0 : ((o.flash || .55) * (1 - P(ft, 0, .07))).toFixed(3);
  });
  return root;
});
