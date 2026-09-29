// Data charts (DOM + SVG, deterministic). Data: arrays or JSON loaded with vk.json(). Colours from theme.chart.
import { node, md, h, s, len, size } from '../authoring/node.js';
import { registry } from '../core/plugin.js';
import { getEase } from '../core/ease.js';
import { clamp01 } from '../core/time.js';

const B = registry.blocks;
let gradId = 0; // deterministic ids (no Math.random in render paths)
const rows = data => data.map(d => Array.isArray(d) ? { label: d[0], value: +d[1] } : { ...d, value: +d.value });
const fmtNum = (v, o) => { const dec = o.decimals | 0; let s = (+v).toFixed(dec); if (o.sep !== false) { const p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, o.sep || ','); s = p.join('.'); } return (o.prefix || '') + s + (o.unit || o.suffix || ''); };
const pal = (ctx, i, d) => (d && d.color) || ctx.theme.chart[i % ctx.theme.chart.length];
// bars: one colour (accent2, or muted when a highlight is set) unless o.colors:true / per-datum color
const barCol = (ctx, o, i, d) => d.color || (o.colors ? pal(ctx, i, d) : o.highlight != null ? 'color-mix(in srgb, var(--muted) 55%, transparent)' : 'var(--accent)');
function niceMax(v) { const e = Math.pow(10, Math.floor(Math.log10(v || 1))), m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; }

/* bar chart. o: {w, h, max, unit, prefix, decimals, highlight:index|label, each, horizontal, title, source} */
B.bar = (data, o = {}) => node(o, function bar(ctx) {
  const px = ctx.px, D = rows(data), max = o.max || niceMax(Math.max(...D.map(d => d.value)));
  const W = o.w || 900, H = o.h || 380, box = h('div', 'vk-chart vk-bar');
  box.style.cssText = `width:${px(W)}px;flex:none;text-align:left`;
  const t0 = ctx.at(o), each = o.each != null ? o.each : .12, sc = ctx.scene;
  const isHl = (d, i) => o.highlight === i || o.highlight === d.label;
  if (o.horizontal) {
    D.forEach((d, i) => {
      const r = h('div', null, null, box); r.style.cssText = `display:flex;align-items:center;gap:${px(14)}px;height:${px(H / D.length)}px`;
      h('div', null, md(d.label), r).style.cssText = `width:${px(o.labelW || 160)}px;flex:none;font-size:${px(20)}px;text-align:right;color:var(--muted)`;
      const tr = h('div', null, null, r); tr.style.cssText = `flex:1;position:relative;height:${px(Math.min(40, H / D.length * .62))}px`;
      const b = h('div', null, null, tr); b.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:${d.value / max * 100}%;background:${isHl(d, i) ? 'var(--accent)' : barCol(ctx, o, i, d)};border-radius:${px(6)}px;transform-origin:left center`;
      const v = h('div', 'vk-mono', '', tr); v.style.cssText = `position:absolute;left:calc(${d.value / max * 100}% + ${px(10)}px);top:50%;transform:translateY(-50%);font-size:${px(20)}px;font-weight:700;white-space:nowrap`;
      sc.fx(b, 'grow', { t: t0 + i * each, d: .8, ease: 'outExpo' });
      sc.fx(v, 'count', { t: t0 + i * each, d: .8, to: d.value, format: x => fmtNum(x, o) });
      sc.fx(v, 'fade', { t: t0 + i * each + .1, d: .3 });
    });
  } else {
    const plot = h('div', null, null, box); plot.style.cssText = `position:relative;height:${px(H)}px;display:flex;align-items:flex-end;gap:${px(o.gap || 18)}px;border-bottom:${px(2)}px solid var(--fg);padding:0 ${px(8)}px`;
    [0.25, .5, .75, 1].forEach(g => { const l = h('div', null, null, plot); l.style.cssText = `position:absolute;left:0;right:0;bottom:${g * 100}%;border-top:1px dashed var(--line);opacity:.8`; const lb = h('div', 'vk-mono', fmtNum(max * g, { ...o, decimals: o.axisDecimals != null ? o.axisDecimals : (Number.isInteger(max * .25) ? 0 : 1) }), l); lb.style.cssText = `position:absolute;right:100%;margin-right:${px(8)}px;top:-${px(10)}px;font-size:${px(14)}px;color:var(--muted);white-space:nowrap`; });
    D.forEach((d, i) => {
      const c = h('div', null, null, plot); c.style.cssText = `flex:1;position:relative;height:${d.value / max * 100}%;display:flex;flex-direction:column;justify-content:flex-start`;
      const b = h('div', null, null, c); b.style.cssText = `position:absolute;inset:0;background:${isHl(d, i) ? 'var(--accent)' : barCol(ctx, o, i, d)};border-radius:${px(6)}px ${px(6)}px 0 0;transform-origin:center bottom`;
      const v = h('div', 'vk-mono', '', c); v.style.cssText = `position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:${px(6)}px;font-size:${px(o.valueSize || 18)}px;font-weight:700;white-space:nowrap`;
      const l = h('div', null, md(d.label), c); l.style.cssText = `position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:${px(8)}px;font-size:${px(o.labelSize || 17)}px;color:var(--muted);white-space:nowrap`;
      sc.fx(b, 'grow-y', { t: t0 + i * each, d: .8, ease: 'outExpo' });
      sc.fx(v, 'count', { t: t0 + i * each, d: .8, to: d.value, format: x => fmtNum(x, o) });
      sc.fx(l, 'fade', { t: t0 + i * each, d: .3 });
    });
    plot.style.marginBottom = px(38) + 'px'; box.style.paddingLeft = px(40) + 'px';
  }
  if (o.source) { const sEl = h('div', null, md(o.source), box); sEl.style.cssText = `margin-top:${px(10)}px;font-size:${px(14)}px;color:var(--muted);text-align:right`; sc.fx(sEl, 'fade', { t: t0, d: .5 }); }
  ctx.advance(t0 + D.length * each + .6); return box;
}, null);

/* line chart with draw-on. data: [{label, value}] or o.series = [{name, values, color}] with o.labels */
B.line = (data, o = {}) => node(o, function line(ctx) {
  const px = ctx.px, W = o.w || 900, H = o.h || 380;
  const series = o.series || [{ name: o.name || '', values: rows(data).map(d => d.value) }];
  const labels = o.labels || (data ? rows(data).map(d => d.label) : series[0].values.map((_, i) => String(i + 1)));
  const all = series.flatMap(s => s.values), min = o.min != null ? o.min : Math.min(0, ...all), max = o.max || niceMax(Math.max(...all));
  const axisDec = o.axisDecimals != null ? o.axisDecimals : (Number.isInteger((max - min) / 4) ? 0 : 1);
  const axisTxt = g => fmtNum(min + (max - min) * g / 4, { ...o, decimals: axisDec, unit: '' });
  const multi = series.length > 1, endW = multi && o.endLabel !== false ? (o.labelRight || 190) : 24;
  // left padding fits the widest axis label; multi-series end labels sit in a right gutter
  const P = { l: 18 + Math.max(...[0, 1, 2, 3, 4].map(g => axisTxt(g).length)) * 8.8, r: endW, t: 20, b: 40 };
  const n = labels.length, X = i => P.l + (W - P.l - P.r) * (n === 1 ? .5 : i / (n - 1)), Y = v => P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min));
  const box = h('div', 'vk-chart vk-line'); box.style.cssText = `width:${px(W)}px;height:${px(H)}px;position:relative;flex:none`;
  const svgEl = s('svg', { width: px(W), height: px(H), viewBox: `0 0 ${W} ${H}`, fill: 'none' }, box);
  const t0 = ctx.at(o), d = o.d || 1.6, sc = ctx.scene;
  const axis = s('g', {}, svgEl);
  for (let g = 0; g <= 4; g++) { const v = min + (max - min) * g / 4, y = Y(v); s('line', { x1: P.l, x2: W - P.r, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': g ? 1 : 2, 'stroke-dasharray': g ? '4 6' : '' }, axis); const tx = s('text', { x: P.l - 10, y: y + 5, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 14, 'font-family': 'JetBrains Mono, monospace' }, axis); tx.textContent = axisTxt(g); }
  const step = Math.ceil(n / (o.maxLabels || 8));
  labels.forEach((lb, i) => { if (i % step && i !== n - 1) return; const tx = s('text', { x: X(i), y: H - 12, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 15 }, axis); tx.textContent = lb; });
  sc.fx(axis, 'fade', { t: t0, d: .4 });
  const ends = [];
  series.forEach((se, k) => {
    const col = se.color || (k === 0 ? 'var(--accent)' : pal(ctx, k + 1));
    const pts = se.values.map((v, i) => [X(i), Y(v)]);
    const dPath = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    if (k === 0 && (o.area === true || (o.area !== false && !multi))) {
      const gid = 'vkg' + (++gradId);
      const defs = s('defs', {}, svgEl), lg = s('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      s('stop', { offset: 0, 'stop-color': col, 'stop-opacity': .35 }, lg); s('stop', { offset: 1, 'stop-color': col, 'stop-opacity': 0 }, lg);
      const area = s('path', { d: dPath + ` L${pts[pts.length - 1][0]} ${Y(min)} L${pts[0][0]} ${Y(min)} Z`, fill: `url(#${gid})` }, svgEl);
      sc.tween(area, { t: t0 + .2, d: d, ease: 'inOutCubic', from: { clipPath: 'inset(0% 100% 0% 0%)' }, to: { clipPath: 'inset(0% 0% 0% 0%)' } });
    }
    const path = s('path', { d: dPath, stroke: col, 'stroke-width': o.strokeWidth || 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svgEl);
    sc.fx(path, 'draw', { t: t0 + .2 + k * .3, d, ease: 'inOutCubic' });
    if (o.dots !== false) pts.forEach((p, i) => { const c = s('circle', { cx: p[0], cy: p[1], r: 5, fill: col, stroke: 'var(--bg)', 'stroke-width': 2 }, svgEl); c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center'; sc.fx(c, 'pop', { t: t0 + .2 + k * .3 + d * (i / Math.max(1, n - 1)), d: .3 }); });
    const lastV = se.values[se.values.length - 1], lp = pts[pts.length - 1];
    if (o.endLabel === false) return;
    const lab = h('div', 'vk-mono', '', box);
    lab.style.cssText = `position:absolute;font-size:${px(o.valueSize || 22)}px;font-weight:800;color:${col};white-space:nowrap;line-height:1`;
    if (multi) { lab.style.left = px(lp[0] + 14) + 'px'; ends.push({ lab, y: lp[1] }); }
    else { lab.style.left = px(lp[0]) + 'px'; lab.style.top = (px(lp[1]) - px(44)) + 'px'; lab.style.transform = 'translateX(-80%)'; }
    sc.fx(lab, 'count', { t: t0 + .2 + k * .3, d, to: lastV, from: se.values[0], format: x => (se.name ? se.name + ' ' : '') + fmtNum(x, o) });
    sc.fx(lab, 'fade', { t: t0 + .2, d: .3 });
  });
  // de-collide right-gutter labels: keep order by value, push apart to a minimum gap
  if (ends.length) {
    const gap = (o.valueSize || 22) * 1.25; ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + gap);
    const over = ends[ends.length - 1].y - (H - P.b); if (over > 0) ends.forEach(e => e.y -= over);
    for (let i = ends.length - 2; i >= 0; i--) ends[i].y = Math.min(ends[i].y, ends[i + 1].y - gap);
    ends.forEach(e => { e.lab.style.top = (px(e.y) - px((o.valueSize || 22) / 2)) + 'px'; });
  }
  if (o.source) { const sEl = h('div', null, md(o.source), box); sEl.style.cssText = `position:absolute;right:0;top:100%;margin-top:${px(4)}px;font-size:${px(14)}px;color:var(--muted)`; sc.fx(sEl, 'fade', { t: t0, d: .5 }); }
  ctx.advance(t0 + d + .5); return box;
}, null);

/* pie / donut: [{label, value, color}] o: {r, thickness, center, legend:true, each} */
function pieImpl(donut) {
  return (data, o = {}) => node(o, function pie(ctx) {
    const px = ctx.px, D = rows(data), total = D.reduce((m, d) => m + d.value, 0), R = o.r || 150, th = donut ? (o.thickness || 56) : R;
    const box = h('div', 'vk-chart vk-pie'); box.style.cssText = `display:flex;align-items:center;gap:${px(48)}px;flex:none`;
    const wrap = h('div', null, null, box); wrap.style.cssText = `position:relative;width:${px(R * 2)}px;height:${px(R * 2)}px;flex:none`;
    const svgEl = s('svg', { width: px(R * 2), height: px(R * 2), viewBox: `0 0 ${R * 2} ${R * 2}` }, wrap);
    const rr = R - th / 2, C = 2 * Math.PI * rr, t0 = ctx.at(o), d = o.d || 1.4, sc = ctx.scene, ease = getEase('inOutCubic');
    let acc = 0; const segs = [];
    D.forEach((dd, i) => { const c = s('circle', { cx: R, cy: R, r: rr, fill: 'none', stroke: pal(ctx, i, dd), 'stroke-width': th, transform: `rotate(-90 ${R} ${R})` }, svgEl); segs.push({ c, a: acc / total, b: (acc + dd.value) / total }); acc += dd.value; });
    sc.on(local => { const p = ease(clamp01((local - t0) / d)); segs.forEach(({ c, a, b }) => { const aa = Math.min(a, p), bb = Math.min(b, p), L = Math.max(0, bb - aa) * C; c.setAttribute('stroke-dasharray', `${L.toFixed(2)} ${C.toFixed(2)}`); c.setAttribute('stroke-dashoffset', (-aa * C).toFixed(2)); }); });
    if (donut) {
      const cen = h('div', null, null, wrap); cen.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center`;
      const big = h('div', 'vk-mono', '', cen); big.style.cssText = `font-size:${px(o.centerSize || 44)}px;font-weight:800`;
      if (o.center) big.innerHTML = md(o.center); else sc.fx(big, 'count', { t: t0, d, to: total, format: x => fmtNum(x, o) });
      if (o.centerLabel) h('div', null, md(o.centerLabel), cen).style.cssText = `font-size:${px(17)}px;color:var(--muted)`;
      sc.fx(cen, 'fade', { t: t0 + .2, d: .4 });
    }
    if (o.legend !== false) {
      const lg = h('div', null, null, box); lg.style.cssText = `display:flex;flex-direction:column;gap:${px(12)}px;text-align:left`;
      D.forEach((dd, i) => {
        const r = h('div', null, `<i></i><span>${md(dd.label)}</span><b class="vk-mono">${(dd.value / total * 100).toFixed(o.pctDecimals | 0)}%</b>`, lg);
        r.style.cssText = `display:flex;align-items:center;gap:${px(12)}px;font-size:${px(o.legendSize || 21)}px`;
        r.querySelector('i').style.cssText = `width:${px(16)}px;height:${px(16)}px;border-radius:${px(4)}px;background:${pal(ctx, i, dd)};flex:none`;
        r.querySelector('b').style.cssText = `margin-left:auto;padding-left:${px(16)}px;color:var(--muted)`;
        sc.fx(r, 'left', { t: t0 + d * ((segs[i].a + segs[i].b) / 2), d: .4, dist: px(20) });
      });
    }
    ctx.advance(t0 + d + .3); return box;
  }, null);
}
B.pie = pieImpl(false); B.donut = pieImpl(true);

/* number ticker: big counting number + label. o: {from, decimals, prefix, suffix/unit, label, size} */
B.ticker = (value, o = {}) => node(o, function ticker(ctx) {
  const px = ctx.px, box = h('div', 'vk-ticker'); box.style.cssText = 'display:flex;flex-direction:column;align-items:center';
  const n = h('div', 'vk-mono', '', box); n.style.cssText = `font-size:${size(ctx, o.size || 120)};font-weight:800;line-height:1;letter-spacing:-.03em;color:${o.color ? `var(--${o.color})` : 'var(--fg)'}`;
  const t0 = ctx.at(o);
  ctx.scene.fx(n, 'count', { t: t0, d: o.d || 1.4, from: o.from || 0, to: value, format: x => fmtNum(x, { sep: o.sep, decimals: o.decimals, prefix: o.prefix, unit: o.unit || o.suffix }) });
  if (o.label) { const l = h('div', null, md(o.label), box); l.style.cssText = `font-size:${px(o.labelSize || 24)}px;color:var(--muted);margin-top:${px(10)}px`; ctx.scene.fx(l, 'up', { t: t0 + .3 }); }
  ctx.advance(t0 + (o.d || 1.4)); return box;
}, 'fade');

/* progress ring: pct 0..100. o: {r, thickness, label} */
B.ring = (pct, o = {}) => node(o, function ring(ctx) {
  const px = ctx.px, R = o.r || 110, th = o.thickness || 18, rr = R - th / 2, C = 2 * Math.PI * rr;
  const box = h('div', 'vk-ring'); box.style.cssText = `position:relative;width:${px(R * 2)}px;height:${px(R * 2)}px;flex:none`;
  const svgEl = s('svg', { width: px(R * 2), height: px(R * 2), viewBox: `0 0 ${R * 2} ${R * 2}` }, box);
  s('circle', { cx: R, cy: R, r: rr, fill: 'none', stroke: 'var(--line)', 'stroke-width': th }, svgEl);
  const arc = s('circle', { cx: R, cy: R, r: rr, fill: 'none', stroke: o.color || 'var(--accent)', 'stroke-width': th, 'stroke-linecap': 'round', transform: `rotate(-90 ${R} ${R})`, 'stroke-dasharray': `0 ${C}` }, svgEl);
  const cen = h('div', null, null, box); cen.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center';
  const num = h('div', 'vk-mono', '', cen); num.style.cssText = `font-size:${px(R * .38)}px;font-weight:800`;
  if (o.label) h('div', null, md(o.label), cen).style.cssText = `font-size:${px(Math.max(14, R * .14))}px;color:var(--muted);margin-top:${px(4)}px;max-width:${px(R * 1.4)}px;text-align:center;line-height:1.25`;
  const t0 = ctx.at(o), d = o.d || 1.3, e = getEase(o.ease || 'outCubic');
  ctx.scene.on(local => { const p = e(clamp01((local - t0) / d)) * pct / 100; arc.setAttribute('stroke-dasharray', `${(p * C).toFixed(2)} ${C.toFixed(2)}`); });
  ctx.scene.fx(num, 'count', { t: t0, d, to: pct, decimals: o.decimals, format: x => x.toFixed(o.decimals | 0) + '%' });
  ctx.advance(t0 + d); return box;
}, 'fade');

/* table: {header:[…], rows:[[…]], highlight:rowIndex, align:['left','right',…]} */
B.table = (spec, o = {}) => node(o, function table(ctx) {
  const px = ctx.px, tb = h('table', 'vk-table'), t0 = ctx.at(o), each = o.each != null ? o.each : .18;
  tb.style.cssText = `border-collapse:collapse;width:${o.w ? len(ctx, o.w, 'x') : '100%'};font-size:${px(o.size || 21)}px;text-align:left`;
  const al = i => (spec.align && spec.align[i]) || (i ? 'right' : 'left');
  if (spec.header) { const tr = h('tr', null, spec.header.map((c, i) => `<th style="text-align:${al(i)}">${md(c)}</th>`).join(''), tb); [...tr.children].forEach(th => th.style.cssText += `;padding:${px(10)}px ${px(16)}px;border-bottom:${px(2)}px solid var(--fg);color:var(--muted);font-weight:700;font-size:.85em`); ctx.scene.fx(tr, 'fade', { t: t0, d: .3 }); }
  spec.rows.forEach((r, i) => {
    const tr = h('tr', null, r.map((c, j) => `<td style="text-align:${al(j)}">${md(String(c))}</td>`).join(''), tb);
    [...tr.children].forEach((td, j) => td.style.cssText += `;padding:${px(10)}px ${px(16)}px;border-bottom:1px solid var(--line);${j ? 'font-family:var(--vk-mono)' : 'font-weight:700'}`);
    if (spec.highlight === i) [...tr.children].forEach(td => { td.style.background = 'var(--accent)'; td.style.color = 'var(--on-accent)'; });
    ctx.scene.fx(tr, 'left', { t: t0 + .2 + i * each, d: .4, dist: px(24) });
  });
  if (o.source) { const cap = h('caption', null, md(o.source), tb); cap.style.cssText = `caption-side:bottom;text-align:right;font-size:${px(14)}px;color:var(--muted);padding-top:${px(8)}px`; }
  ctx.advance(t0 + .2 + spec.rows.length * each); return tb;
}, null);
