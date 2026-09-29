// Static layer cache ("bake"): rasterise SVG content that never changes over time — far mountains, washes, paper
// grain, filter-heavy decorations — ONCE into a bitmap, so the browser stops re-running feTurbulence /
// feDisplacementMap / blur filters on every video frame. Opt-in per element:
//   vk.bake(el, {scale})           el = a root <svg> (its content becomes one <image>; the <svg> element, its CSS and any
//                                  transform you animate on it stay), or any SVG graphic element / <g> inside an svg
//                                  (baked in its own user space incl. its filter; its transform / opacity stay live).
//   <svg data-vk-bake> / <g data-vk-bake>   same thing, declaratively (picked up at finalize)
//   vk.video({ bake: false }) or ?cache=0 (vk render --no-cache) turns every bake into a no-op.
// Rules: the baked subtree must be static (attributes may not change after the bake; the element's own transform /
// opacity may). Styling must come from presentation attributes / inline styles or inherited properties — document
// CSS rules that target descendants are not carried into the bitmap. Content referencing a "boiling" filter
// (installInk({boil})) is skipped automatically. The bitmap is rasterised at devicePixelRatio × scale.
const SVGNS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink';
const INHERITED = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-dasharray', 'stroke-dashoffset', 'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'text-anchor', 'dominant-baseline',
  'paint-order', 'shape-rendering', 'color-interpolation-filters'];
const SELF_LIVE = ['transform', 'opacity', 'clip-path', 'mask', 'style', 'class', 'id'];   // stay on the live element, not baked

export const bakeStats = { baked: 0, skipped: 0, px: 0, ms: 0, tDecode: 0, tDraw: 0, tEncode: 0, tLoad: 0 };

// ids referenced by url(#id) / href="#id" anywhere in `root` (attributes and inline style), resolved recursively
export function collectRefs(root, doc = document) {
  const out = new Map(), queue = [root];
  const scan = el => {
    const ids = [];
    for (const a of el.attributes || []) {
      const v = a.value; let m; const re = /url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g;
      while ((m = re.exec(v))) ids.push(m[1]);
      if ((a.name === 'href' || a.name === 'xlink:href') && v[0] === '#') ids.push(v.slice(1));
    }
    return ids;
  };
  while (queue.length) {
    const n = queue.pop();
    const all = [n, ...(n.querySelectorAll ? n.querySelectorAll('*') : [])];
    for (const e of all) for (const id of scan(e)) {
      if (out.has(id)) continue;
      const def = doc.getElementById(id); if (!def || def === root || (root.contains && root.contains(def))) { out.set(id, null); continue; }
      out.set(id, def); queue.push(def);
    }
  }
  return [...out.values()].filter(Boolean);
}
// filter region of `filterEl` for an element with bounding box b (objectBoundingBox or userSpaceOnUse units)
export function filterRegion(filterEl, b) {
  const num = (v, d) => { if (v == null || v === '') return d; v = String(v).trim(); return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v); };
  const userUnits = filterEl && filterEl.getAttribute('filterUnits') === 'userSpaceOnUse';
  const g = k => filterEl ? filterEl.getAttribute(k) : null;
  if (userUnits) return { x: num(g('x'), b.x - .1 * b.width), y: num(g('y'), b.y - .1 * b.height), width: num(g('width'), 1.2 * b.width), height: num(g('height'), 1.2 * b.height) };
  const fx = num(g('x'), -.1), fy = num(g('y'), -.1), fw = num(g('width'), 1.2), fh = num(g('height'), 1.2);
  return { x: b.x + fx * b.width, y: b.y + fy * b.height, width: fw * b.width, height: fh * b.height };
}
const refId = v => { const m = /url\(\s*['"]?#([^'")\s]+)/.exec(v || ''); return m ? m[1] : null; };

// SVG markup → PNG object URL of exactly pw×ph device pixels (filters rendered by the browser's own SVG engine)
export async function rasterize(markup, pw, ph) {
  const src = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    let t = performance.now();
    const img = new Image(); img.decoding = 'sync'; img.src = src; await img.decode();
    bakeStats.tDecode += performance.now() - t; t = performance.now();
    const c = document.createElement('canvas'); c.width = pw; c.height = ph;
    c.getContext('2d').drawImage(img, 0, 0, pw, ph);
    bakeStats.tDraw += performance.now() - t; t = performance.now();
    // synchronous encode: canvas.toBlob() is scheduled on idle time, which never comes under begin-frame control
    const url = c.toDataURL('image/png');
    bakeStats.tEncode += performance.now() - t;
    bakeStats.px += pw * ph;
    return { url, canvas: c };
  } finally { URL.revokeObjectURL(src); }
}
function loadInto(imageEl, url) {
  const t = performance.now();
  return new Promise(res => {
    const done = () => { const d = imageEl.decode ? imageEl.decode().catch(() => { }) : null; Promise.resolve(d).then(() => { bakeStats.tLoad += performance.now() - t; res(); }); };
    imageEl.addEventListener('load', done, { once: true }); imageEl.addEventListener('error', () => res(), { once: true });
    imageEl.setAttribute('href', url);
  });
}
const px = v => { const n = parseFloat(v); return /^\s*[\d.]+(px)?\s*$/.test(String(v || '')) ? n : NaN; };
function inheritedStyle(el) {
  const p = el.parentElement; if (!p) return '';
  const cs = getComputedStyle(p);
  return INHERITED.map(k => { const v = cs.getPropertyValue(k); return v ? `${k}:${v}` : ''; }).filter(Boolean).join(';').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function isDynamic(refs) { return refs.some(r => r.hasAttribute && r.hasAttribute('data-vk-dynamic')); }
function defsMarkup(refs) { const s = new XMLSerializer(); return refs.length ? `<defs>${refs.map(r => s.serializeToString(r)).join('')}</defs>` : ''; }

// bake a root <svg>: content → one <image> covering the viewBox
async function bakeRoot(svg, o) {
  const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
  let w = px(svg.getAttribute('width')), h = px(svg.getAttribute('height'));
  if (!(w > 0 && h > 0)) { const r = svg.getBoundingClientRect(); w = r.width; h = r.height; }
  if (!(w > 0 && h > 0)) throw new Error('bake: <svg> needs numeric width/height attributes');
  const res = (window.devicePixelRatio || 1) * (o.scale || 1);
  const vbox = vb ? `${vb.x} ${vb.y} ${vb.width} ${vb.height}` : `0 0 ${w} ${h}`;
  const par = svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet';
  // the bitmap covers exactly the viewBox; the live <svg> keeps mapping viewBox → viewport with its own
  // preserveAspectRatio, so rasterise at the viewBox aspect (meet/slice scale), not at the viewport aspect
  let pw = w * res, ph = h * res;
  if (vb && !/^none/.test(par)) { const k = (/slice/.test(par) ? Math.max : Math.min)(w / vb.width, h / vb.height); pw = vb.width * k * res; ph = vb.height * k * res; }
  pw = Math.max(1, Math.round(pw)); ph = Math.max(1, Math.round(ph));
  const refs = collectRefs(svg); if (isDynamic(refs)) return false;
  const inner = new XMLSerializer().serializeToString(svg).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const markup = `<svg xmlns="${SVGNS}" xmlns:xlink="${XLINK}" width="${pw}" height="${ph}" viewBox="${vbox}" preserveAspectRatio="none" style="${inheritedStyle(svg)}">${defsMarkup(refs)}${inner}</svg>`;
  const { url } = await rasterize(markup, pw, ph);
  const im = document.createElementNS(SVGNS, 'image');
  const [x, y, bw, bh] = vbox.split(' ').map(Number);
  im.setAttribute('x', x); im.setAttribute('y', y); im.setAttribute('width', bw); im.setAttribute('height', bh);   // same viewBox → same mapping
  im.setAttribute('preserveAspectRatio', 'none');
  im.setAttribute('class', 'vk-baked');
  await loadInto(im, url);
  svg.replaceChildren(im);
  svg.setAttribute('data-vk-baked', `${pw}x${ph}`);
  return true;
}
// device pixels per user unit of an element inside an svg (from the owner svg's width attribute / viewBox)
function unitScale(el) {
  const s = el.ownerSVGElement; if (!s) return 1;
  const vb = s.viewBox && s.viewBox.baseVal; const w = px(s.getAttribute('width'));
  const k = vb && vb.width && w > 0 ? w / vb.width : 1;
  return k * (window.devicePixelRatio || 1);
}
// bake an element inside an svg (in its local user space, with its own filter; transform/opacity/clip/mask stay live)
async function bakeNode(el, o) {
  const refs = collectRefs(el); if (isDynamic(refs)) return false;
  const clone = el.cloneNode(true);
  for (const a of ['transform', 'opacity', 'clip-path', 'mask', 'id', 'data-vk-bake']) clone.removeAttribute(a);
  clone.style.opacity = ''; clone.style.transform = ''; clone.style.clipPath = ''; clone.style.mask = '';
  // measure the local bbox on a detached-but-rendered copy (the scene may be display:none while building)
  const meas = document.createElementNS(SVGNS, 'svg'); meas.setAttribute('width', '1'); meas.setAttribute('height', '1');
  meas.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;overflow:hidden';
  const probe = clone.cloneNode(true); probe.removeAttribute('filter'); meas.appendChild(probe); document.body.appendChild(meas);
  let b; try { b = probe.getBBox(); } finally { meas.remove(); }
  if (!b || !(b.width > 0 || b.height > 0)) return false;
  const fid = refId(el.getAttribute('filter') || el.style.filter), fEl = fid ? document.getElementById(fid) : null;
  const pad = o.pad != null ? o.pad : 4;
  let r = fEl ? filterRegion(fEl, b) : { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad };
  if (fEl && o.pad) r = { x: r.x - o.pad, y: r.y - o.pad, width: r.width + 2 * o.pad, height: r.height + 2 * o.pad };
  const res = unitScale(el) * (o.scale || 1);
  // snap the bitmap to the device-pixel grid of the untransformed user space
  const x0 = Math.floor(r.x * res) / res, y0 = Math.floor(r.y * res) / res;
  const pw = Math.max(1, Math.ceil((r.x + r.width) * res - x0 * res)), ph = Math.max(1, Math.ceil((r.y + r.height) * res - y0 * res));
  const bw = pw / res, bh = ph / res;
  const markup = `<svg xmlns="${SVGNS}" xmlns:xlink="${XLINK}" width="${pw}" height="${ph}" viewBox="${x0} ${y0} ${bw} ${bh}" preserveAspectRatio="none" style="${inheritedStyle(el)}">${defsMarkup(refs)}${new XMLSerializer().serializeToString(clone)}</svg>`;
  const { url } = await rasterize(markup, pw, ph);
  const im = document.createElementNS(SVGNS, 'image');
  im.setAttribute('x', x0); im.setAttribute('y', y0); im.setAttribute('width', bw); im.setAttribute('height', bh); im.setAttribute('preserveAspectRatio', 'none'); im.setAttribute('class', 'vk-baked');
  await loadInto(im, url);
  if (el.tagName.toLowerCase() === 'g' || el.tagName.toLowerCase() === 'a') {
    el.removeAttribute('filter'); el.style.filter = ''; el.replaceChildren(im);
    el.setAttribute('data-vk-baked', `${pw}x${ph}`);
  } else {                                                       // leaf shape: swap for a <g> that keeps the live attributes
    const g = document.createElementNS(SVGNS, 'g');
    for (const a of SELF_LIVE) if (el.hasAttribute(a) && a !== 'style' && a !== 'id') g.setAttribute(a, el.getAttribute(a));
    g.setAttribute('data-vk-baked', `${pw}x${ph}`); g.appendChild(im); el.replaceWith(g);
    el.__vkBaked = g;
  }
  return true;
}
export async function bake(el, o = {}) {
  const t = performance.now();
  try {
    const ok = el instanceof SVGSVGElement && !el.ownerSVGElement ? await bakeRoot(el, o) : await bakeNode(el, o);
    ok ? bakeStats.baked++ : bakeStats.skipped++;
    return ok;
  } catch (e) { bakeStats.skipped++; console.warn('[vk] bake skipped:', e && e.message || e); return false; }
  finally { bakeStats.ms += performance.now() - t; }
}
// a static CSS background SVG tile → bitmap (used by the rice paper texture); returns a PNG object URL or null
export async function bakeTile(svgMarkup, cssW, cssH, scale = 1) {
  const res = (window.devicePixelRatio || 1) * scale, pw = Math.max(1, Math.round(cssW * res)), ph = Math.max(1, Math.round(cssH * res));
  const m = svgMarkup.replace(/<svg\b([^>]*)>/, (s, a) => `<svg${a.replace(/\s(width|height)=(['"])[^'"]*\2/g, '')} width="${pw}" height="${ph}" viewBox="0 0 ${cssW} ${cssH}" preserveAspectRatio="none">`);
  const { url } = await rasterize(m, pw, ph);
  const im = new Image(); im.src = url; await im.decode().catch(() => { });
  bakeStats.baked++;
  return url;
}
