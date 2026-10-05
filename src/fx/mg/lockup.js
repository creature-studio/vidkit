// vk.lockup(o): converge-to-lockup end card. Shapes spiral into the centre (inExpo), a paper circle irises open,
// a spinning star mark pops in, the title letters rise from under a clip line (mask-rise), a highlight bar sweeps
// under the subtitle, then tagline + palette dots, and an optional fade to ink at `fadeOut`.
// o: {title, sub, tagline, at, colors, bg, paper, accent (star), bar (highlight colour), titleSize, subSize,
//     fadeOut (scene-local time), fadeColor, star: false | {…}, iris: false | {…}}  — positions scale with the stage.
import { node, h } from '../../authoring/node.js';
import { EASE } from '../../core/ease.js';
import { P } from './math.js';
import { REEL, converge } from './paint.js';

export const lockup = (o = {}) => node({ fx: 'none', ...o }, function lockup(ctx) {
  const px = ctx.px, W = ctx.W, H = ctx.H, k = H / 1080, at = ctx.at(o), sc = ctx.scene, ink = o.ink || REEL.ink;
  const cols = o.colors || [REEL.yellow, REEL.pink, REEL.cyan, REEL.violet, REEL.paper];
  sc.canvas(converge({
    at, bg: o.bg || ink, colors: cols, seed: o.seed, x: W / 2, y: H / 2,
    iris: o.iris === false ? false : { color: o.paper || REEL.paper, ...(o.iris || {}) },
    star: o.star === false ? false : { y: H * .305, scale: k, color: o.accent || REEL.pink, dot: o.dot || REEL.yellow, width: 26 * k, ...(o.star || {}) },
  }), { z: 'back', motionBlur: o.motionBlur });
  const root = h('div', 'vk-lockup vk-abs'); root.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
  const abs = (cls, html, y, css) => { const e = h('div', cls, html, root); e.style.cssText = `position:absolute;left:50%;top:${y * 100}%;transform:translate(-50%,-50%);white-space:nowrap;line-height:1;${css}`; return e; };
  const title = abs('vk-lockup-title', o.title || 'VIDKIT', .565, `font:400 ${px(o.titleSize || 167)}px var(--vk-display);color:${ink};letter-spacing:.01em`);
  sc.fx(title, 'mask-rise', { t: at + .85, each: .05, d: .5 });
  const subW = abs('vk-lockup-sub', '', .74, `font:900 ${px(o.subSize || 43)}px var(--vk-sans);color:${ink};padding:0 ${px(9)}px`);
  const bar = h('div', null, null, subW); bar.style.cssText = `position:absolute;left:0;right:0;top:58%;height:${px(19)}px;background:${o.bar || REEL.yellow};transform-origin:0 50%;transform:scaleX(0);z-index:0`;
  const subT = h('span', null, o.sub || '', subW); subT.style.cssText = 'position:relative;z-index:1;display:inline-block';
  const tag = o.tagline ? abs('vk-lockup-tag', o.tagline, .825, `font:700 ${px(24)}px var(--vk-sans);color:${o.muted || '#6a6a78'}`) : null;
  const dots = h('div', null, null, root); dots.style.cssText = `position:absolute;left:50%;top:${H * .884}px;transform:translate(-50%,-50%);display:flex;gap:${px(10)}px`;
  const D = cols.slice(0, 4).concat(ink).map(c => { const d = h('i', null, null, dots); d.style.cssText = `display:block;width:${px(17.3)}px;height:${px(17.3)}px;border-radius:50%;background:${c}`; return d; });
  let fade = null;
  if (o.fadeOut != null) { fade = h('div', null, null, sc.el); fade.dataset.qa = 'ignore'; fade.style.cssText = `position:absolute;inset:0;background:${o.fadeColor || ink};opacity:0;z-index:25;pointer-events:none`; }
  const tf = o.fadeOut != null ? sc.time(o.fadeOut) : 0;
  sc.on(local => {
    const sa = P(local, at + 1.1, .3), sp = EASE.outExpo(P(local, at + 1.15, .45));
    subW.style.opacity = sa; subT.style.transform = `translateY(${((1 - sa) * px(16)).toFixed(1)}px)`; bar.style.transform = `scaleX(${sp.toFixed(4)})`;
    if (tag) tag.style.opacity = P(local, at + 1.3, .3);
    D.forEach((d, i) => { d.style.transform = `scale(${Math.max(0, EASE.outBack(P(local, at + 1.35 + i * .06, .3))).toFixed(4)})`; });
    if (fade) fade.style.opacity = P(local, tf, .1);
  });
  return root;
});
