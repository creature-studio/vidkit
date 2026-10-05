// Kinetic-type fx (opt-in pack, registered on first use — `fx: 'slam'` just works):
//   slam         big scale + rotation + side offset collapsing onto the final pose (outExpo); options: scale 2.8, rot 20 (deg),
//                x/y offset px, dir ±1, echo: n ghost copies, shadow: [dx, dy, colour], wobble: {at, amp, speed} idle sway
//   echo         ghost trail: the text zooms in (1.6 → 1) with n fading, larger copies behind it (= slam without rotation)
//   drop         letters drop in from above with squash & stretch and an outBack bounce; shadow, bob: {amp, speed}
//   letters-pop  letters pop (outBack scale 0 → 1), optional bob
//   mask-rise    letters rise from below a clip line (outExpo) — logo lockups
//   hard-shadow  combinable object preset: a hard offset shadow grows in ('pop hard-shadow'); shadowX/shadowY/shadowColor
// All are pure functions of the scene-local time (api.fn), seekable in any order.
import { registry } from '../../core/plugin.js';
import { clamp01 } from '../../core/time.js';
import { split } from '../text.js';
import { slam as slamAt, echoGhosts, letterDrop, maskRise } from './math.js';
import { EASE } from '../../core/ease.js';

const num = (v, d) => (v == null ? d : +v);
const shadowCss = (sh, k = 1) => { if (!sh) return ''; const [dx, dy, c] = Array.isArray(sh) ? sh : [10, 10, sh]; return `${(dx * k).toFixed(2)}px ${(dy * k).toFixed(2)}px 0 ${c || 'rgba(10,10,18,.4)'}`; };

function ghosts(el, n) {
  if (!n) return [];
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  const html = el.innerHTML, out = [];
  for (let g = 0; g < n; g++) {
    const s = document.createElement('span'); s.className = 'vk-ghost'; s.dataset.qa = 'ignore'; s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:-1;white-space:inherit;opacity:0;text-shadow:none';
    s.innerHTML = html; el.appendChild(s); out.push(s);
  }
  el.style.isolation = 'isolate';
  return out;
}
function slamFx(defaults) {
  return (el, o, api) => {
    o = { ...defaults, ...o };
    const d = num(o.d, .4), G = ghosts(el, o.echo === true ? 3 : o.echo || 0), sh = o.shadow;
    if (o.origin) el.style.transformOrigin = o.origin;
    api.fn(el, local => {
      let p = clamp01((local - o.t) / d); if (api.exit) p = 1 - p;
      const s = slamAt(p, { scale: num(o.scale, 2.8), rot: num(o.rot, 20), x: o.x || 0, y: o.y || 0, dir: o.dir || 1, ease: o.ease || 'outExpo' });
      let wy = 0, wr = 0;
      if (o.wobble) { const w = o.wobble, k = clamp01((local - w.at) / .2); if (k > 0) { wy = Math.sin(local * (w.speed || 9) + (w.phase || 0)) * (w.amp != null ? w.amp : 16) * k; wr = Math.sin(local * (w.speed || 9) + (w.phase || 0) * 1.1) * (w.rot != null ? w.rot : 3) * k; } }
      el.style.opacity = p > 0 ? s.a.toFixed(3) : '0';
      el.style.transform = `translate(${s.x.toFixed(2)}px,${(s.y + wy).toFixed(2)}px) rotate(${(s.rot + wr).toFixed(3)}deg) scale(${s.s.toFixed(4)})`;
      if (sh) el.style.textShadow = shadowCss(sh, 1);
      const E = echoGhosts(p, { n: G.length, step: o.echoStep, alpha: o.echoAlpha });
      G.forEach((g, i) => { const e = E[i]; if (!e || p <= 0) { g.style.opacity = '0'; return; } g.style.opacity = (e.a / Math.max(.05, s.a)).toFixed(3); g.style.transform = `scale(${(e.s).toFixed(4)})`; });
    });
  };
}
function perLetter(mode, fnStyle, defEach, defD) {
  return (el, o, api) => {
    const pieces = split(el, mode), each = num(o.each, defEach), d = num(o.d, defD);
    pieces.forEach((c, i) => {
      c.style.transformOrigin = o.origin || '50% 100%';
      api.fn(c, local => { let p = clamp01((local - o.t - i * each) / d); if (api.exit) p = 1 - p; fnStyle(c, p, local, i, o); });
    });
  };
}
const bob = (o, local, i) => (o.bob ? Math.sin(local * (o.bob.speed || 6) + i * (o.bob.phase || .8)) * (o.bob.amp != null ? o.bob.amp : 10) : 0);

export const MG_FX = {
  slam: slamFx({}),
  echo: slamFx({ scale: 1.6, rot: 0, echo: 3, d: .45 }),
  drop: perLetter('chars', (c, p, local, i, o) => {
    const s = letterDrop(p, { from: num(o.from, 800), sx: o.sx, sy: o.sy });
    c.style.opacity = p > 0 ? '1' : '0';
    c.style.transform = `translateY(${(s.y + (p >= 1 ? bob(o, local, i) : 0)).toFixed(2)}px) scale(${s.sx.toFixed(4)},${s.sy.toFixed(4)})`;
    if (o.shadow) c.style.textShadow = shadowCss(o.shadow);
  }, .055, .5),
  'letters-pop': perLetter('chars', (c, p, local, i, o) => {
    const e = EASE.outBack(p);
    c.style.opacity = p > 0 ? '1' : '0';
    c.style.transform = `translateY(${bob(o, local, i).toFixed(2)}px) scale(${e.toFixed(4)})`;
    if (o.shadow) c.style.textShadow = shadowCss(o.shadow);
  }, .07, .5),
  'mask-rise': perLetter('letters', (c, p) => { c.style.transform = `translateY(${maskRise(p, 1.2).toFixed(4)}em)`; }, .05, .5),
  'hard-shadow': { make: o => { const c = o.shadowColor || 'rgba(10,10,18,.9)', dx = num(o.shadowX, 10), dy = num(o.shadowY, 10); return { from: { textShadow: `0px 0px 0px ${c}` }, to: { textShadow: `${dx}px ${dy}px 0px ${c}` } }; } },
};
export function installText() { for (const [k, f] of Object.entries(MG_FX)) if (!registry.fx[k]) registry.fx[k] = f; return Object.keys(MG_FX); }
