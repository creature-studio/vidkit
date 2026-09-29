// Authoring API: text, layout and raw-code factories. Blocks and charts live in fx/blocks.js, fx/charts.js.
import { node, md, h, s, size, len } from './node.js';

const txt = (tag, cls, defFx) => (text, o = {}) => node(o, function text_(ctx) { return h(tag, cls, o.html ? text : md(text)); }, defFx);

export const title = txt('h1', 'vk-h1', 'letters');
export const h2 = txt('h2', 'vk-h2', 'reveal');
export const sub = txt('div', 'vk-h3', 'up');
export const text = txt('p', 'vk-body', 'up');
export const small = txt('div', 'vk-small', 'fade');
export const label = txt('div', 'vk-label', 'fade');
// big wordmark; o.cursor adds the accent block after it (Spark / One style); o.outline = stroked ghost
export function hero(textStr, o = {}) {
  return node(o, function hero_(ctx) {
    const wrap = h('div', 'vk-hero-wrap'); wrap.style.cssText = 'display:flex;align-items:baseline;justify-content:center;max-width:100%';
    const w = h('div', 'vk-hero', o.html ? textStr : md(textStr), wrap);
    if (o.size) { w.style.fontSize = size(ctx, o.size); }
    if (o.outline) { w.style.color = 'transparent'; w.style.webkitTextStroke = `${ctx.px(2)}px var(--line)`; }
    if (o.cursor) {
      const c = h('span', 'vk-hero-cursor', null, wrap);
      c.style.cssText = `display:inline-block;width:.3em;height:.7em;background:var(--accent);margin-left:.06em;font-size:${w.style.fontSize || 'var(--vk-fs-hero)'}`;
      wrap.__afterFx = t => ctx.scene.fx(c, 'pop', { t: t + (o.cursorDelay != null ? o.cursorDelay : .55), d: .4 });
    }
    wrap.__fxTarget = w;
    return wrap;
  }, 'letters');
}
export function stack(lines, o = {}) {
  return node({ fx: 'stack', ...o }, function stack_(ctx) { const e = h('div', 'vk-hero vk-stack', [].concat(lines).map(l => md(l)).join('<br>')); e.style.width = o.w ? len(ctx, o.w, 'x') : '100%'; return e; });
}
// layout
export function row(children, o = {}) { return node(o, function row_(ctx) { const e = h('div', 'vk-row'); if (o.gap != null) e.style.gap = len(ctx, o.gap, 'x'); if (o.justify) e.style.justifyContent = o.justify; if (o.alignItems) e.style.alignItems = o.alignItems; ctx.build(children, e); return e; }, null); }
export function col(children, o = {}) { return node(o, function col_(ctx) { const e = h('div', 'vk-col'); if (o.gap != null) e.style.gap = len(ctx, o.gap, 'y'); e.style.alignItems = o.alignItems || (o.align === 'center' ? 'center' : 'flex-start'); ctx.build(children, e); return e; }, null); }
export function grid(children, o = {}) { return node(o, function grid_(ctx) { const e = h('div', 'vk-grid'); e.style.cssText = `display:grid;grid-template-columns:repeat(${o.cols || 3},1fr);gap:${len(ctx, o.gap != null ? o.gap : 24, 'x')};width:100%`; ctx.build(children, e); return e; }, null); }
// split: left/right columns (ratio "5/7" in 12 columns, or a number 0..1)
export function split(left, right, o = {}) {
  return node(o, function split_(ctx) {
    const e = h('div', 'vk-split'); let r = o.ratio || '1/1';
    if (typeof r === 'string') { const [a, b] = r.split('/').map(Number); r = a / (a + b); }
    e.style.cssText = `display:grid;grid-template-columns:${r}fr ${1 - r}fr;gap:${len(ctx, o.gap != null ? o.gap : 56, 'x')};width:100%;align-items:${o.alignItems || 'center'};text-align:left`;
    const L = h('div', 'vk-col', null, e), R = h('div', 'vk-col', null, e);
    ctx.build([].concat(left), L); ctx.build([].concat(right), R); return e;
  }, null);
}
export function spacer(hh = 20) { return node({}, function spacer_(ctx) { const e = h('div'); e.style.height = ctx.px(hh) + 'px'; e.style.flex = 'none'; return e; }, null); }
// raw code escape hatches
export function html(str, o = {}) { return node(o, function html_() { const w = h('div', 'vk-html', str); if (w.children.length === 1 && !o.wrap) { const c = w.firstElementChild; c.remove(); return c; } return w; }, null); }
// custom element: fn(ctx) → Element (full access to ctx.scene for tweens / on())
export function el(fn, o = {}) { return node(o, function el_(ctx) { return fn(ctx); }, null); }
export function svg(markup, o = {}) {
  return node(o, function svg_(ctx) {
    const w = h('div', 'vk-svg', markup.trim().startsWith('<svg') ? markup : `<svg viewBox="${o.viewBox || '0 0 400 300'}" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="${o.strokeWidth || 4}" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`);
    const svgEl = w.firstElementChild; svgEl.remove(); svgEl.classList.add('vk-svg');
    if (o.w) svgEl.setAttribute('width', ctx.px(o.w)); if (o.h) svgEl.setAttribute('height', ctx.px(o.h));
    return svgEl;
  }, 'draw');
}
export { md };
