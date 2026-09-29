// Layout blocks (Phase 1): terminal, code, cards, columns, kv rows, gantt, diagram, quote, image (Ken Burns),
// device frame, CTA, badge. Each factory returns an authoring Node; sizes are px at 720p (auto-scaled).
import { node, md, h, s, len, size } from '../authoring/node.js';
import { registry } from '../core/plugin.js';
import { getEase } from '../core/ease.js';
import { clamp01 } from '../core/time.js';

const B = registry.blocks;
// single-pass tokenizer so highlighting never re-matches inside inserted markup
export function highlightLine(ln, KW) {
  const re = new RegExp(`(\\/\\/.*$|(?<=^|\\s)#.*$)|("[^"]*"|'[^']*'|\`[^\`]*\`)|${KW.source}`, 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(ln))) {
    out += esc(ln.slice(last, m.index));
    const c = m[1] ? 'var(--muted)' : m[2] ? 'var(--accent2)' : 'var(--accent)';
    out += `<span style="color:${c}">${esc(m[0])}</span>`; last = re.lastIndex;
    if (m[0] === '') re.lastIndex++;
  }
  return out + esc(ln.slice(last));
}
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* terminal: lines "$ cmd" are typed, "✓ …"/"> …"/plain lines fade in. o: {title, cps, w, gap, prompt} */
B.terminal = (lines, o = {}) => node(o, function terminal(ctx) {
  const px = ctx.px, win = h('div', 'vk-term vk-mono');
  win.style.cssText = `width:${len(ctx, o.w || 620, 'x')};background:var(--surface);border:1px solid var(--line);border-radius:${px(16)}px;padding:${px(22)}px ${px(28)}px;font-size:${size(ctx, o.size || 21)};line-height:1.65;text-align:left;color:var(--fg);box-shadow:0 ${px(30)}px ${px(60)}px -${px(30)}px rgba(0,0,0,.45)`;
  const bar = h('div', null, `<i></i><i></i><i></i>${o.title ? `<span>${esc(o.title)}</span>` : ''}`, win);
  bar.style.cssText = `display:flex;gap:${px(8)}px;align-items:center;margin-bottom:${px(14)}px;font-size:.8em;color:var(--muted)`;
  [...bar.querySelectorAll('i')].forEach((i, k) => i.style.cssText = `width:${px(12)}px;height:${px(12)}px;border-radius:50%;background:${['#FF5F57', '#FEBC2E', '#28C840'][k]};opacity:.9`);
  if (bar.querySelector('span')) bar.querySelector('span').style.marginLeft = px(10) + 'px';
  const t0 = ctx.at(o); let t = t0 + .35; const cps = o.cps || 32, sc = ctx.scene;
  sc.fx(win, o.winFx || 'fade', { t: t0, d: .4 });
  lines.forEach(line => {
    const row = h('div', null, null, win); row.style.whiteSpace = 'pre-wrap';
    const m = /^\$\s?(.*)$/.exec(line);
    if (m) {
      row.innerHTML = `<span style="color:var(--prompt,var(--accent2))">${esc(o.prompt || '$')} </span><span class="cmd"></span>`;
      sc.fx(row.querySelector('.cmd'), 'type', { t, cps, text: m[1], caretHold: .6 });
      t += Array.from(m[1]).length / cps + .45;
    } else {
      const ok = /^✓/.test(line), warn = /^[✗!]/.test(line);
      row.innerHTML = ok ? `<span style="color:var(--ok,#2ED47A)">✓</span>${md(line.slice(1))}` : warn ? `<span style="color:#FF5A36">${line[0]}</span>${md(line.slice(1))}` : md(line.replace(/^>\s?/, ''));
      if (!ok && !warn) row.style.color = 'var(--muted)';
      sc.fx(row, 'fade', { t, d: .3 }); t += o.gap || .3;
    }
  });
  ctx.advance(t); return win;
}, null);

/* code block with light syntax colouring; lines appear one by one. o: {lang, each, w, size, highlight:[lineNo]} */
B.code = (src, o = {}) => node(o, function code(ctx) {
  const px = ctx.px, pre = h('div', 'vk-code vk-mono');
  pre.style.cssText = `width:${len(ctx, o.w || 620, 'x')};background:var(--surface);border:1px solid var(--line);border-radius:${px(14)}px;padding:${px(22)}px ${px(26)}px;font-size:${size(ctx, o.size || 20)};line-height:1.6;text-align:left;white-space:pre;color:var(--fg);overflow:hidden`;
  const KW = /\b(const|let|var|function|return|import|from|export|await|async|new|if|else|for|of|in|class|true|false|null|def|fn|pub|use|package|func)\b/g;
  const t0 = ctx.at(o), each = o.each != null ? o.each : .12;
  src.replace(/\n$/, '').split('\n').forEach((ln, i) => {
    const hs = highlightLine(ln, KW);
    const row = h('div', null, hs || ' ', pre);
    if (o.highlight && o.highlight.includes(i + 1)) row.style.cssText = `background:color-mix(in srgb,var(--accent) 22%,transparent);margin:0 -${px(26)}px;padding:0 ${px(26)}px`;
    ctx.scene.fx(row, 'left', { t: t0 + i * each, d: .35, dist: px(14) });
  });
  ctx.advance(t0 + src.split('\n').length * each); return pre;
}, null);

/* cards grid. items: [{title, text, icon, tag}] o: {cols, each, fx} */
B.cards = (items, o = {}) => node(o, function cards(ctx) {
  const px = ctx.px, g = h('div', 'vk-cards');
  g.style.cssText = `display:grid;grid-template-columns:repeat(${o.cols || Math.min(4, items.length)},1fr);gap:${px(o.gap || 24)}px;width:100%;text-align:left`;
  const t0 = ctx.at(o), each = o.each != null ? o.each : .15;
  items.forEach((it, i) => {
    const c = h('div', 'vk-card vk-surface', null, g);
    c.style.cssText += `;padding:${px(22)}px ${px(24)}px;display:flex;flex-direction:column;gap:${px(8)}px;border-radius:var(--vk-radius)`;
    if (it.icon) h('div', null, it.icon, c).style.cssText = `font-size:${px(34)}px;line-height:1;color:var(--accent)`;
    if (it.tag) h('div', 'vk-label', esc(it.tag), c).style.fontSize = px(16) + 'px';
    h('div', null, md(it.title), c).style.cssText = `font-size:${px(o.titleSize || 28)}px;font-weight:800;line-height:1.2;color:var(--fg)`;
    if (it.text) h('div', null, md(it.text), c).style.cssText = `font-size:${px(o.textSize || 19)}px;line-height:1.45;color:var(--muted)`;
    if (it.hl) { c.style.background = 'var(--accent)'; c.style.borderColor = 'var(--accent)'; [...c.children].forEach(k => k.style.color = 'var(--on-accent)'); }
    ctx.scene.fx(c, o.itemFx || 'pop', { t: t0 + i * each, d: .45 });
  });
  ctx.advance(t0 + items.length * each); return g;
}, null);

/* columns: [{title, code, text}] with a rule on the left */
B.columns = (items, o = {}) => node(o, function columns(ctx) {
  const px = ctx.px, g = h('div', 'vk-columns');
  g.style.cssText = `display:grid;grid-template-columns:repeat(${items.length},1fr);gap:${px(28)}px;width:100%;text-align:left`;
  const t0 = ctx.at(o), each = o.each != null ? o.each : .3;
  items.forEach((it, i) => {
    const c = h('div', null, null, g); c.style.cssText = `border-left:${px(3)}px solid var(--line);padding:${px(4)}px 0 ${px(4)}px ${px(18)}px`;
    h('div', null, md(it.title), c).style.cssText = `font-size:${px(30)}px;font-weight:900;line-height:1.2`;
    if (it.code) h('div', 'vk-mono', esc(it.code), c).style.cssText = `font-size:${px(18)}px;color:var(--accent2);margin-top:${px(8)}px`;
    if (it.text) h('div', null, md(it.text), c).style.cssText = `font-size:${px(19)}px;line-height:1.45;color:var(--muted);margin-top:${px(8)}px`;
    ctx.scene.fx(c, 'up', { t: t0 + i * each, d: .5 });
    ctx.scene.tween(c, { t: t0 + i * each + .2, d: .4, from: { borderLeftColor: ctx.video.color('line', ctx.scene.mode) }, to: { borderLeftColor: ctx.video.color('accent', ctx.scene.mode) } });
  });
  ctx.advance(t0 + items.length * each); return g;
}, null);

/* key-value rows: [[key, value], …] */
B.kv = (rows, o = {}) => node(o, function kv(ctx) {
  const px = ctx.px, box = h('div', 'vk-kv');
  box.style.cssText = `width:${o.w ? len(ctx, o.w, 'x') : '100%'};border-top:${px(2)}px solid var(--fg);text-align:left`;
  const t0 = ctx.at(o), each = o.each != null ? o.each : .4;
  rows.forEach(([k, v], i) => {
    const r = h('div', null, null, box); r.style.cssText = `display:flex;align-items:center;min-height:${px(o.rowH || 70)}px;border-bottom:1px solid var(--line);gap:${px(20)}px`;
    h('div', null, md(k), r).style.cssText = `width:${px(o.keyW || 200)}px;flex:none;font-weight:900;font-size:${px(23)}px;color:var(--accent)`;
    h('div', null, md(v), r).style.cssText = `font-size:${px(22)}px;line-height:1.35`;
    ctx.scene.fx(r, 'left', { t: t0 + i * each, d: .4 });
  });
  ctx.advance(t0 + rows.length * each); return box;
}, null);

/* gantt: {rows:[{label, start, end, hl}], range:[0,100], unit, ticks} */
B.gantt = (spec, o = {}) => node(o, function gantt(ctx) {
  const px = ctx.px, [a, b] = spec.range || [0, Math.max(...spec.rows.map(r => r.end))];
  const box = h('div', 'vk-gantt'); box.style.cssText = `width:100%;text-align:left;position:relative`;
  const t0 = ctx.at(o), each = o.each != null ? o.each : .25;
  spec.rows.forEach((r, i) => {
    const row = h('div', null, null, box); row.style.cssText = `display:flex;align-items:center;height:${px(46)}px;gap:${px(16)}px`;
    h('div', 'vk-mono', md(r.label), row).style.cssText = `width:${px(o.labelW || 170)}px;flex:none;font-size:${px(18)}px;color:var(--muted);text-align:right`;
    const track = h('div', null, null, row); track.style.cssText = `position:relative;flex:1;height:${px(26)}px;border-left:1px solid var(--line)`;
    const bar = h('div', null, r.text ? `<span>${md(r.text)}</span>` : '', track);
    bar.style.cssText = `position:absolute;top:0;height:100%;left:${(r.start - a) / (b - a) * 100}%;width:${(r.end - r.start) / (b - a) * 100}%;background:${r.hl ? 'var(--accent)' : 'var(--accent2)'};border-radius:${px(5)}px;transform-origin:left center;font-size:${px(15)}px;color:var(--on-accent);display:flex;align-items:center;padding-left:${px(8)}px;white-space:nowrap;overflow:hidden`;
    ctx.scene.fx(bar, 'grow', { t: t0 + i * each, d: .5, ease: 'outCubic' });
  });
  if (spec.unit) { const ax = h('div', 'vk-mono', `${a}${spec.unit} → ${b}${spec.unit}`, box); ax.style.cssText = `margin-left:${px((o.labelW || 170) + 16)}px;font-size:${px(15)}px;color:var(--muted);margin-top:${px(6)}px`; ctx.scene.fx(ax, 'fade', { t: t0, d: .4 }); }
  ctx.advance(t0 + spec.rows.length * each); return box;
}, null);

/* diagram: {w, h, nodes:[{id,x,y,w,h,label,sub,hl}], edges:[[from,to,label?]]} in 720p px inside a w×h box */
B.diagram = (spec, o = {}) => node(o, function diagram(ctx) {
  const px = ctx.px, W = spec.w || 1000, H = spec.h || 400;
  const box = h('div', 'vk-diagram'); box.style.cssText = `position:relative;width:${px(W)}px;height:${px(H)}px;flex:none`;
  const svgEl = s('svg', { width: px(W), height: px(H), viewBox: `0 0 ${W} ${H}`, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, box);
  svgEl.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;color:var(--accent)';
  const t0 = ctx.at(o), each = o.each != null ? o.each : .35, nt = {}, N = {};
  spec.nodes.forEach((n, i) => {
    N[n.id] = n; const e = h('div', 'vk-node', `<b>${md(n.label)}</b>${n.sub ? `<span>${md(n.sub)}</span>` : ''}`, box);
    e.style.cssText = `position:absolute;left:${px(n.x)}px;top:${px(n.y)}px;width:${px(n.w || 200)}px;height:${px(n.h || 90)}px;border-radius:${px(14)}px;border:${px(2)}px solid ${n.hl ? 'var(--accent)' : 'var(--fg)'};background:${n.hl ? 'var(--accent)' : 'var(--surface)'};color:${n.hl ? 'var(--on-accent)' : 'var(--fg)'};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:${px(4)}px;${n.dashed ? 'border-style:dashed;background:transparent;' : ''}`;
    e.querySelector('b').style.cssText = `font-size:${px(n.size || 24)}px;font-weight:900;line-height:1.15`;
    const sp = e.querySelector('span'); if (sp) sp.style.cssText = `font:600 ${px(15)}px var(--vk-mono);opacity:.8`;
    nt[n.id] = n.at != null ? ctx.scene.time(n.at) : t0 + i * each;
    ctx.scene.fx(e, n.fx || 'pop', { t: nt[n.id], d: .45 });
  });
  let last = t0 + spec.nodes.length * each;
  (spec.edges || []).forEach(([a, b, lab], k) => {
    const A = N[a], Bn = N[b], aw = A.w || 200, ah = A.h || 90, bw = Bn.w || 200, bh = Bn.h || 90;
    let x1, y1, x2, y2, ang;
    if (Bn.x >= A.x + aw) { x1 = A.x + aw; y1 = A.y + ah / 2; x2 = Bn.x - 4; y2 = Bn.y + bh / 2; ang = 0; }
    else if (Bn.x + bw <= A.x) { x1 = A.x; y1 = A.y + ah / 2; x2 = Bn.x + bw + 4; y2 = Bn.y + bh / 2; ang = Math.PI; }
    else if (Bn.y >= A.y + ah) { x1 = A.x + aw / 2; y1 = A.y + ah; x2 = Bn.x + bw / 2; y2 = Bn.y - 4; ang = Math.PI / 2; }
    else { x1 = A.x + aw / 2; y1 = A.y; x2 = Bn.x + bw / 2; y2 = Bn.y + bh + 4; ang = -Math.PI / 2; }
    const horiz = ang === 0 || ang === Math.PI, m = horiz ? (x1 + x2) / 2 : (y1 + y2) / 2;
    const d = horiz ? `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}` : `M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}`;
    const g = s('g', {}, svgEl); s('path', { d }, g);
    const L = 12, a1 = ang + 2.6, a2 = ang - 2.6;
    s('path', { d: `M${(x2 + L * Math.cos(a1)).toFixed(1)} ${(y2 + L * Math.sin(a1)).toFixed(1)} L${x2} ${y2} L${(x2 + L * Math.cos(a2)).toFixed(1)} ${(y2 + L * Math.sin(a2)).toFixed(1)}` }, g);
    const te = (o.edgeAt ? ctx.scene.time(o.edgeAt) : Math.max(nt[a], nt[b]) + .35) + k * .08;
    ctx.scene.fx(g, 'draw', { t: te, d: .5 }); last = Math.max(last, te + .5);
    if (lab) { const l = h('div', 'vk-mono', md(lab), box); l.style.cssText = `position:absolute;left:${px((x1 + x2) / 2)}px;top:${px((y1 + y2) / 2) - px(30)}px;transform:translateX(-50%);font-size:${px(15)}px;color:var(--muted);white-space:nowrap`; ctx.scene.fx(l, 'fade', { t: te + .3, d: .3 }); }
  });
  ctx.advance(last); return box;
}, null);

/* quote: big quote mark, text, attribution */
B.quote = (text, o = {}) => node(o, function quote(ctx) {
  const px = ctx.px, q = h('figure', 'vk-quote'); q.style.cssText = `margin:0;max-width:${len(ctx, o.w || 900, 'x')};text-align:${o.align || 'left'};position:relative`;
  const mark = h('div', null, '“', q); mark.dataset.qa = 'ignore'; mark.style.cssText = `font-family:var(--vk-serif);font-size:${px(180)}px;line-height:.6;color:var(--accent);height:${px(70)}px`;
  const body = h('blockquote', null, md(text), q); body.style.cssText = `margin:0;font-family:${o.serif === false ? 'var(--vk-sans)' : 'var(--vk-serif)'};font-size:${size(ctx, o.size || 50)};line-height:1.3;font-weight:${o.weight || 500}`;
  const t0 = ctx.at(o);
  ctx.scene.fx(mark, 'pop', { t: t0, d: .5 });
  ctx.scene.fx(body, o.textFx || 'words-up', { t: t0 + .25, each: o.each || .06 });
  if (o.by) { const by = h('figcaption', null, '— ' + md(o.by), q); by.style.cssText = `margin-top:${px(20)}px;font-size:${px(22)}px;color:var(--muted)`; ctx.scene.fx(by, 'fade', { t: t0 + 1.2, d: .5 }); }
  ctx.advance(t0 + 1.2); return q;
}, null);

/* image / screenshot with Ken Burns. o: {w, h, fit, radius, from:{s,x,y}, to:{s,x,y}, d} (x,y = % offsets) */
B.image = (src, o = {}) => node(o, function image(ctx) {
  const px = ctx.px, box = h('div', 'vk-image');
  box.style.cssText = `position:relative;width:${len(ctx, o.w || 640, 'x')};height:${len(ctx, o.h || 360, 'y')};overflow:hidden;border-radius:${px(o.radius != null ? o.radius : 14)}px;flex:none;background:var(--surface)`;
  const img = h('img', null, null, box); img.src = src; img.alt = o.alt || '';
  img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${o.fit || 'cover'};transform-origin:50% 50%`;
  const kb = o.kenburns === false ? null : { from: { s: 1.0, x: 0, y: 0, ...(o.from || {}) }, to: { s: 1.12, x: -2, y: -1.5, ...(o.to || {}) } };
  if (kb) ctx.scene.on(local => {
    const p = getEase(o.ease || 'inOutSine')(clamp01(local / (o.d || ctx.scene.dur))), f = kb.from, t = kb.to;
    img.style.transform = `translate(${f.x + (t.x - f.x) * p}%,${f.y + (t.y - f.y) * p}%) scale(${f.s + (t.s - f.s) * p})`;
  });
  if (o.caption) { const c = h('div', null, md(o.caption), box); c.style.cssText = `position:absolute;left:0;right:0;bottom:0;padding:${px(10)}px ${px(16)}px;font-size:${px(16)}px;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;text-align:left`; }
  return box;
}, 'fade');

/* device frame: content = Node | image src | html string. o: {type:'phone'|'laptop'|'browser', w, url} */
B.device = (content, o = {}) => node(o, function device(ctx) {
  const px = ctx.px, type = o.type || 'browser', fr = h('div', 'vk-device vk-device-' + type);
  let screen;
  if (type === 'phone') {
    const w = o.w || 260; fr.style.cssText = `width:${px(w)}px;height:${px(w * 2.05)}px;border-radius:${px(42)}px;background:#0A0A0A;padding:${px(12)}px;box-shadow:0 0 0 ${px(2)}px #333,0 ${px(30)}px ${px(60)}px -${px(20)}px rgba(0,0,0,.5);position:relative;flex:none`;
    screen = h('div', 'vk-screen', null, fr); screen.style.cssText = `width:100%;height:100%;border-radius:${px(32)}px;overflow:hidden;position:relative;background:var(--bg)`;
    const notch = h('div', null, null, fr); notch.style.cssText = `position:absolute;top:${px(20)}px;left:50%;transform:translateX(-50%);width:${px(80)}px;height:${px(22)}px;border-radius:${px(12)}px;background:#0A0A0A;z-index:2`;
  } else if (type === 'laptop') {
    const w = o.w || 720; fr.style.cssText = `width:${px(w)}px;flex:none;position:relative`;
    const lid = h('div', null, null, fr); lid.style.cssText = `width:${px(w * .86)}px;height:${px(w * .86 * .62)}px;margin:0 auto;background:#111;border-radius:${px(16)}px ${px(16)}px 0 0;padding:${px(14)}px;box-shadow:0 0 0 ${px(2)}px #2a2a2a`;
    screen = h('div', 'vk-screen', null, lid); screen.style.cssText = `width:100%;height:100%;overflow:hidden;position:relative;background:var(--bg);border-radius:${px(4)}px`;
    const base = h('div', null, null, fr); base.style.cssText = `width:100%;height:${px(18)}px;background:linear-gradient(#C9CDD6,#8E939E);border-radius:0 0 ${px(14)}px ${px(14)}px`;
  } else {
    const w = o.w || 720; fr.style.cssText = `width:${px(w)}px;flex:none;border-radius:${px(14)}px;overflow:hidden;background:var(--surface);border:1px solid var(--line);box-shadow:0 ${px(30)}px ${px(60)}px -${px(30)}px rgba(0,0,0,.45)`;
    const bar = h('div', null, `<i></i><i></i><i></i><span>${esc(o.url || '')}</span>`, fr);
    bar.style.cssText = `display:flex;gap:${px(8)}px;align-items:center;height:${px(40)}px;padding:0 ${px(14)}px;border-bottom:1px solid var(--line);font:500 ${px(15)}px var(--vk-mono);color:var(--muted)`;
    [...bar.querySelectorAll('i')].forEach((i, k) => i.style.cssText = `width:${px(12)}px;height:${px(12)}px;border-radius:50%;background:${['#FF5F57', '#FEBC2E', '#28C840'][k]}`);
    const sp = bar.querySelector('span'); sp.style.cssText = `margin-left:${px(12)}px;flex:1;background:var(--bg);border-radius:${px(8)}px;padding:${px(4)}px ${px(12)}px;text-align:left`;
    screen = h('div', 'vk-screen', null, fr); screen.style.cssText = `position:relative;height:${px(o.h || w * .52)}px;overflow:hidden;background:var(--bg)`;
  }
  if (typeof content === 'string') {
    if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(content)) { const im = h('img', null, null, screen); im.src = content; im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block'; }
    else screen.innerHTML = content;
  } else if (content) ctx.build([].concat(content), screen);
  return fr;
}, 'up');

/* CTA: {title, sub, cmd, url, note} composed from other nodes */
B.cta = (spec, o = {}) => node(o, function cta(ctx) {
  const px = ctx.px, box = h('div', 'vk-cta'); box.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:${px(20)}px;width:100%`;
  const t0 = ctx.at(o);
  if (spec.title) { const w = h('div', 'vk-hero', md(spec.title), box); w.style.fontSize = size(ctx, spec.titleSize || 190); ctx.scene.fx(w, 'letters', { t: t0, each: .05 }); }
  if (spec.sub) { const e = h('div', 'vk-h3', md(spec.sub), box); ctx.scene.fx(e, 'up', { t: t0 + .7 }); }
  let t = t0 + 1.0;
  if (spec.cmd) {
    const term = h('div', 'vk-mono', `<span style="color:var(--prompt,var(--accent2))">$ </span><span class="c"></span>`, box);
    term.style.cssText = `background:var(--surface);color:var(--fg);border-radius:${px(16)}px;padding:${px(18)}px ${px(30)}px;font-size:${px(spec.cmdSize || 26)}px;white-space:nowrap;text-align:left;border:1px solid var(--line)`;
    ctx.scene.fx(term, 'fade', { t, d: .4 }); ctx.scene.fx(term.querySelector('.c'), 'type', { t: t + .3, cps: 32, text: spec.cmd, caretHold: 1 });
    t += .3 + spec.cmd.length / 32 + .3;
  }
  if (spec.url) { const e = h('div', 'vk-mono', esc(spec.url), box); e.style.cssText = `font-size:${px(spec.urlSize || 34)}px;font-weight:700`; ctx.scene.fx(e, 'up', { t }); t += .5; }
  if (spec.note) { const e = h('div', null, md(spec.note), box); e.style.cssText = `font-size:${px(24)}px;opacity:.9`; ctx.scene.fx(e, 'fade', { t }); t += .4; }
  ctx.advance(t); return box;
}, null);

/* badge / pill */
B.badge = (text, o = {}) => node(o, function badge(ctx) {
  const e = h('span', 'vk-badge vk-mono', md(text)); const px = ctx.px;
  e.style.cssText = `display:inline-block;padding:${px(6)}px ${px(16)}px;border-radius:${px(999)}px;font-size:${px(o.size || 20)}px;font-weight:700;border:${px(2)}px solid ${o.hl ? 'var(--accent)' : 'var(--line)'};background:${o.hl ? 'var(--accent)' : 'transparent'};color:${o.hl ? 'var(--on-accent)' : 'var(--fg)'}`;
  return e;
}, 'pop');
