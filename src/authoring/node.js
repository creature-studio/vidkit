// Authoring node plumbing shared by text, layout, block and chart factories.
import { applyFx } from '../fx/apply.js';

// A Node is {o, build(ctx) → Element}. ctx: {video, scene, theme, W, H, px, at(o), advance(t), extend(t), build(nodes, parent)}
export function node(o, build, defFx) {
  o = o || {};
  return { o, kind: build.name, build: ctx => { const el = build(ctx, o); return el ? finish(el, o, ctx, defFx) : el; } };
}

// **accent**  ==marker==  __underline__  `code`  \n → <br>
export function md(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    .replace(/\*\*(.+?)\*\*/g, '<span class="vk-em">$1</span>')
    .replace(/==(.+?)==/g, '<span class="vk-mark">$1</span>')
    .replace(/__(.+?)__/g, '<span class="vk-ul">$1</span>')
    .replace(/`([^`]+)`/g, '<code class="vk-mono">$1</code>')
    .replace(/\n/g, '<br>');
}
export function h(tag, cls, html, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
export const SVGNS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

// sizes: theme scale names ('h1', 'body' …) or numbers in px at a 720p short side (auto-scaled)
export function size(ctx, v) { if (v == null) return null; if (typeof v === 'number') return ctx.px(v) + 'px'; if (ctx.theme.scale[v]) return `var(--vk-fs-${v})`; return v; }
// lengths: 0..1 → fraction of the stage axis; >1 → px at 720p scale; strings pass through
export function len(ctx, v, axis) { if (v == null) return null; if (typeof v === 'string') return v; if (Math.abs(v) <= 1 && v !== 0) return (v * (axis === 'y' ? ctx.H : ctx.W)).toFixed(1) + 'px'; return ctx.px(v) + 'px'; }
export function colorOf(v) { return ['accent', 'accent2', 'muted', 'fg', 'bg', 'surface', 'line', 'on-accent'].includes(v) ? `var(--${v})` : v; }

export function finish(el, o, ctx, defFx) {
  if (o.class) el.classList.add(...o.class.split(/\s+/));
  if (o.id) el.id = o.id;
  if (o.style) { if (typeof o.style === 'string') el.style.cssText += ';' + o.style; else Object.assign(el.style, o.style); }
  if (o.color) el.style.color = colorOf(o.color);
  if (o.bg) el.style.background = colorOf(o.bg);
  if (o.size) el.style.fontSize = size(ctx, o.size);
  if (o.weight) el.style.fontWeight = o.weight;
  if (o.font) el.style.fontFamily = { display: 'var(--vk-display)', mono: 'var(--vk-mono)', sans: 'var(--vk-sans)', serif: 'var(--vk-serif)', condensed: 'var(--vk-condensed)' }[o.font] || o.font;
  if (o.align) { el.style.textAlign = o.align; el.style.alignSelf = { left: 'flex-start', right: 'flex-end', center: 'center' }[o.align] || ''; }
  if (o.w != null) el.style.width = len(ctx, o.w, 'x');
  if (o.maxW != null) el.style.maxWidth = len(ctx, o.maxW, 'x');
  if (o.mt != null) el.style.marginTop = len(ctx, o.mt, 'y');
  if (o.pos) { // absolute placement: {x, y, w, h, anchor:'center'|'top-left'…} in stage px or fractions
    const p = o.pos; el.classList.add('vk-abs');
    if (p.x != null) el.style.left = len(ctx, p.x, 'x'); if (p.y != null) el.style.top = len(ctx, p.y, 'y');
    if (p.right != null) el.style.right = len(ctx, p.right, 'x'); if (p.bottom != null) el.style.bottom = len(ctx, p.bottom, 'y');
    if (p.w != null) el.style.width = len(ctx, p.w, 'x'); if (p.h != null) el.style.height = len(ctx, p.h, 'y');
    if (p.anchor === 'center') el.style.translate = '-50% -50%'; else if (p.anchor === 'top') el.style.translate = '-50% 0';
  }
  const fx = o.fx === undefined ? defFx : o.fx;
  if (fx) {
    const t = ctx.at(o);
    el.__vkAt = t;
    applyFx(el.__fxTarget || el, fx, { ...o, t }, ctx.scene, false);
    if (el.__afterFx) el.__afterFx(t);
    if (o.sfx) ctx.scene.sfx(t, o.sfx, o.sfxGain || .6);
    const marks = el.querySelectorAll('.vk-mark,.vk-ul');
    if (marks.length && o.mark !== false) {
      const mt = o.markAt != null ? ctx.scene.time(o.markAt) : t + (o.d || .6) + .35;
      const hl = [...marks].filter(m => m.classList.contains('vk-mark')), ul = [...marks].filter(m => m.classList.contains('vk-ul'));
      if (hl.length) ctx.scene.fx(hl, 'highlight', { t: mt, stagger: .3 });
      if (ul.length) ctx.scene.fx(ul, 'underline', { t: mt, stagger: .3 });
      ctx.extend(mt + .8);
    }
  }
  if (o.out != null) applyFx(el.__fxTarget || el, o.outFx || exitFx(fx), { ...o, t: ctx.scene.time(o.out), d: o.outD || .4 }, ctx.scene, true);
  if (o.on) ctx.scene.on((local, p, t) => o.on(el, local, p, t));
  return el;
}
function exitFx(fx) { if (!fx) return 'fade'; return /^(type|count|swap|highlight|marker|underline|wave|stack|scramble|decode)$/.test(fx) ? 'fade' : fx; }
