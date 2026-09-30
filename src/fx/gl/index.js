// vk.gl — WebGL effects layer (Phase 3): ink bleed on rice paper, ink-wash post filter for SVG shapes, shader paper,
// deterministic particles, line boil and paper-cut (剪纸) helpers. Every effect is a pure function of scene time:
// no requestAnimationFrame, no clocks, seeded noise only; each layer re-renders synchronously inside render(t) (or
// keeps its pixels when its cache key did not change), so any seek order gives the identical frame.
//
//   sc.gl([ vk.gl.paper(), vk.gl.inkBleed({ src: vk.gl.text('山水', {x: 900, y: 120, size: 150, vertical: true}), at: .5 }) ],
//         { z: 'front', rect: [820, 80, 260, 520] })
//   v.gl([...])                                  video-level layer (over every scene)
//   vk.gl.layer(sc, { z: 'back' }).add(effect)   same thing, imperative
import { registry } from '../../core/plugin.js';
import { getCore } from './core.js';
import { PAPER, BLEED, WASH, MIST, PVERT, PFRAG, CUSTOM_HEAD } from './shaders.js';
import { rgb, bleedCurve, levelFor, haloSigma, stepT, boilFrame, jitterPath, jitterPoints } from './math.js';
import { particles as particleSystem, SHAPES, PRESETS } from './particles.js';
import { COPY } from './glsl.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const f4 = x => (Math.round(x * 1e4) / 1e4).toString();

/* ================================================================ layer */
export class GLLayer {
  constructor(video, _draw, o = {}) {
    this.video = video; this.o = o; this.core = getCore(video);
    const r = this.rect = o.rect ? o.rect.slice() : [0, 0, video.W, video.H];
    this.res = this.core.dpr * (o.scale || 1);
    this.pw = Math.max(1, Math.round(r[2] * this.res)); this.ph = Math.max(1, Math.round(r[3] * this.res));
    const c = this.el = document.createElement('canvas'); c.className = 'vk-canvas vk-gl' + (o.class ? ' ' + o.class : '');
    c.width = this.pw; c.height = this.ph;
    c.style.cssText = `left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px` + (o.blend ? `;mix-blend-mode:${o.blend}` : '') + (o.opacity != null ? `;opacity:${o.opacity}` : '');
    // CPU-backed 2D canvas: drawImage(glCanvas) is then a synchronous readback and the compositor never waits on a GPU
    // canvas resource (with accelerated 2D canvases, beginFrame capture under load intermittently got no frame)
    this.ctx = c.getContext('2d', { willReadFrequently: true });
    this.effects = []; this.inited = false; this.lastKey = null;
    if (this.core.ok) this.core.fit(this.pw, this.ph);
    [].concat(o.effects || []).forEach(e => e && this.add(e));
  }
  add(...effects) { effects.flat().forEach(e => { if (e) { this.effects.push(e); if (this.inited && e.init) e.init(this.core, this); } }); return this; }
  // uniforms every effect shader gets: layer size, scene-space mapping, paper noise
  common(seed = 0) { const r = this.rect; return { uRes: [this.pw, this.ph], uNX: [r[0], r[1], 1 / this.res, 1 / this.res], uNS: [this.video.W, this.video.H], uN: this.core.noise(seed) }; }
  // 2D context whose user space = scene px (for drawing masks into layer-sized canvases)
  sceneCtx(canvas) { const g = canvas.getContext('2d', { willReadFrequently: true }); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.setTransform(this.res, 0, 0, this.res, -this.rect[0] * this.res, -this.rect[1] * this.res); return g; }
  canvas() { const c = document.createElement('canvas'); c.width = this.pw; c.height = this.ph; return c; }
  render(local, info) {
    const core = this.core; if (!core.ok) return;
    const t0 = performance.now();
    if (!this.inited) { this.inited = true; this.effects.forEach(e => e.init && e.init(core, this)); }
    // cache: every effect reports a key describing its pixels at `local` (null = always redraw)
    let key = core.ready ? 'R' : 'N';
    for (const e of this.effects) { const k = e.key ? e.key(local, info, this) : null; if (k == null) { key = null; break; } key += '|' + k; }
    if (key != null && key === this.lastKey) return;
    core.begin(this.pw, this.ph);
    for (const e of this.effects) { e.render(core, this, local, info); core.bindOutput(); }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.pw, this.ph);
    core.blit(this.ctx, this.pw, this.ph);
    this.lastKey = key; core.stats.frames++; core.stats.ms += performance.now() - t0;
  }
}
registry.layers.gl = GLLayer;
export function layer(target, o = {}) {
  const isScene = target && target.video && target.el;
  const v = isScene ? target.video : target;
  return v.addLayer('gl', null, isScene ? { ...o, scene: target } : { z: 'front', zIndex: 30, ...o });
}

/* ================================================================ mask / colour sources */
// A source draws (in scene px) into a 2D context: {draw(g, local, info, layer), static}. Static sources are drawn
// once (after web fonts have loaded) and their GPU pyramid is kept.
export function draw(fn, o = {}) { return { draw: fn, static: !!o.static, key: o.key }; }
// text mask: horizontal or vertical (top → bottom, one glyph per cell) calligraphy
export function text(str, o = {}) {
  return {
    static: o.static !== false,
    draw(g) {
      const size = o.size || 120, font = o.font || '"Ma Shan Zheng","Noto Serif SC",serif';
      g.font = `${o.weight || 400} ${size}px ${font}`; g.fillStyle = o.color || '#000'; g.textBaseline = o.vertical ? 'top' : (o.baseline || 'alphabetic');
      const chars = [...String(str)];
      if (o.vertical) { g.textAlign = 'center'; const step = size * (o.lead || 1.04); chars.forEach((ch, i) => { const jx = o.jitter ? (Math.sin(i * 12.9898) * o.jitter) : 0; g.fillText(ch, (o.x || 0) + jx, (o.y || 0) + i * step); }); }
      else { g.textAlign = o.align || 'left'; if (o.tracking) { let x = o.x || 0; chars.forEach(ch => { g.fillText(ch, x, o.y || 0); x += g.measureText(ch).width + o.tracking * size; }); } else g.fillText(String(str), o.x || 0, o.y || 0); }
    },
  };
}
// SVG path mask(s): d string or array; o: {fill, stroke, width, transform: [a,b,c,d,e,f] | {x, y, scale, rot}, gradient(g) → fillStyle}
export function path(d, o = {}) {
  const ds = [].concat(d), P = ds.map(x => new Path2D(x));
  return {
    static: o.static !== false,
    draw(g, local, info) {
      g.save();
      const T = o.transform;
      if (Array.isArray(T)) g.transform(...T); else if (T) { g.translate(T.x || 0, T.y || 0); if (T.rot) g.rotate(T.rot * Math.PI / 180); if (T.scale) g.scale(T.scale, T.scale); }
      const fs = o.gradient ? o.gradient(g) : o.fill || '#000';
      P.forEach((p, i) => { if (fs !== 'none') { g.fillStyle = Array.isArray(fs) ? fs[i % fs.length] : fs; g.fill(p, o.rule || 'nonzero'); } if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.width || 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(p); } });
      g.restore();
    },
  };
}
// image / canvas mask at a scene rect
export function image(img, o = {}) { return { static: o.static !== false, draw(g) { g.drawImage(img, o.x || 0, o.y || 0, o.w || img.width, o.h || img.height); } }; }
// live SVG subtree → canvas (paths, rects, circles, ellipses, lines, polys, images, text; fills incl. gradients, strokes,
// opacity). SVG filters are ignored — the GL effect replaces them. o: {offset: [x, y] (svg origin in scene px), exclude: selector | elements (not drawn), static}
export function svg(el, o = {}) { return { static: !!o.static, el, draw(g) { drawSVG(g, typeof el === 'string' ? document.querySelector(el) : el, o); } }; }

const SKIP = new Set(['defs', 'clipPath', 'mask', 'filter', 'linearGradient', 'radialGradient', 'pattern', 'symbol', 'marker', 'style', 'script', 'title', 'desc', 'metadata', 'foreignObject']);
function drawSVG(g, root, o = {}) {
  if (!root) return;
  const off = o.offset || [0, 0], base = g.getTransform(), ex = o.exclude ? (typeof o.exclude === 'string' ? o.exclude : [].concat(o.exclude)) : null;
  const walk = (el, op) => {
    const tag = el.tagName; if (SKIP.has(tag)) return;
    if (ex && (typeof ex === 'string' ? el.matches(ex) : ex.includes(el))) return;
    const cs = getComputedStyle(el); if (cs.display === 'none') return;
    const a = op * (el === root && o.ignoreRootOpacity ? 1 : +cs.opacity); if (a <= .002) return;
    if (tag === 'g' || tag === 'svg' || tag === 'a') { for (const c of el.children) walk(c, a); return; }
    if (tag === 'use') { const ref = document.getElementById((el.getAttribute('href') || el.getAttribute('xlink:href') || '').slice(1)); if (ref) { /* drawn in the use's space */ const m = el.getCTM(); if (m) { g.setTransform(base); g.transform(1, 0, 0, 1, off[0], off[1]); g.transform(m.a, m.b, m.c, m.d, m.e, m.f); paint(g, ref, getComputedStyle(ref), a, true); } } return; }
    const m = el.getCTM(); if (!m) return;
    g.setTransform(base); g.transform(1, 0, 0, 1, off[0], off[1]); g.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    paint(g, el, cs, a, false);
  };
  walk(root, 1);
  g.setTransform(base);
}
const num = (el, k, d = 0) => { const v = el.getAttribute(k); return v == null || v === '' ? d : parseFloat(v); };
function shapePath(el) {
  const tag = el.tagName, P = new Path2D();
  if (tag === 'path') return new Path2D(el.getAttribute('d') || '');
  if (tag === 'rect') { const x = num(el, 'x'), y = num(el, 'y'), w = num(el, 'width'), h = num(el, 'height'), rx = num(el, 'rx', num(el, 'ry')); if (rx && P.roundRect) P.roundRect(x, y, w, h, rx); else P.rect(x, y, w, h); return P; }
  if (tag === 'circle') { P.arc(num(el, 'cx'), num(el, 'cy'), Math.max(0, num(el, 'r')), 0, Math.PI * 2); return P; }
  if (tag === 'ellipse') { P.ellipse(num(el, 'cx'), num(el, 'cy'), Math.max(0, num(el, 'rx')), Math.max(0, num(el, 'ry')), 0, 0, Math.PI * 2); return P; }
  if (tag === 'line') { P.moveTo(num(el, 'x1'), num(el, 'y1')); P.lineTo(num(el, 'x2'), num(el, 'y2')); return P; }
  if (tag === 'polyline' || tag === 'polygon') { const v = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); for (let i = 0; i + 1 < v.length; i += 2) i ? P.lineTo(v[i], v[i + 1]) : P.moveTo(v[i], v[i + 1]); if (tag === 'polygon') P.closePath(); return P; }
  return null;
}
function paintOf(g, el, v, alpha) {
  if (!v || v === 'none') return null;
  const m = /url\(\s*["']?#([^"')]+)/.exec(v);
  if (!m) return v;
  const gr = document.getElementById(m[1]); if (!gr) return null;
  let stops = [...gr.querySelectorAll('stop')];
  const href = gr.getAttribute('href') || gr.getAttribute('xlink:href'); if (!stops.length && href) { const r = document.getElementById(href.slice(1)); if (r) stops = [...r.querySelectorAll('stop')]; }
  if (!stops.length) return null;
  let bb; try { bb = el.getBBox(); } catch (e) { bb = { x: 0, y: 0, width: 1, height: 1 }; }
  const user = gr.getAttribute('gradientUnits') === 'userSpaceOnUse';
  const P = (k, d) => { const s = gr.getAttribute(k); if (s == null) return d; return s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s); };
  const X = u => (user ? u : bb.x + u * bb.width), Y = u => (user ? u : bb.y + u * bb.height);
  let G;
  // objectBoundingBox radial gradients are built in unit space and filled through the bbox matrix (G.bb), so an
  // ellipse gets an elliptical gradient like in SVG; linear ones can be mapped exactly in user space
  if (gr.tagName === 'radialGradient') {
    const cx = P('cx', .5), cy = P('cy', .5), r = P('r', .5);
    if (user) G = g.createRadialGradient(P('fx', cx), P('fy', cy), 0, cx, cy, r);
    else { G = g.createRadialGradient(P('fx', cx), P('fy', cy), 0, cx, cy, r); G.bb = [bb.x, bb.y, Math.max(1e-6, bb.width), Math.max(1e-6, bb.height)]; }
  }
  else G = g.createLinearGradient(X(P('x1', 0)), Y(P('y1', 0)), X(P('x2', 1)), Y(P('y2', 0)));
  for (const s of stops) {
    const cs = getComputedStyle(s), off = s.getAttribute('offset') || '0', o = Math.min(1, Math.max(0, off.endsWith('%') ? parseFloat(off) / 100 : parseFloat(off)));
    const c = rgb(cs.stopColor || s.getAttribute('stop-color') || '#000'), so = +(cs.stopOpacity || 1);
    G.addColorStop(o, `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${so})`);
  }
  return G;
}
function paint(g, el, cs, a, isUse) {
  const tag = el.tagName;
  if (tag === 'image') { try { g.globalAlpha = a; g.drawImage(el, num(el, 'x'), num(el, 'y'), num(el, 'width'), num(el, 'height')); } catch (e) { } g.globalAlpha = 1; return; }
  if (tag === 'text') { const fs = paintOf(g, el, cs.fill, a); if (!fs) return; g.globalAlpha = a * +cs.fillOpacity; g.fillStyle = fs; g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; g.textAlign = { middle: 'center', end: 'right' }[cs.textAnchor] || 'left'; g.fillText(el.textContent, num(el, 'x'), num(el, 'y')); g.globalAlpha = 1; return; }
  if (tag === 'g' && isUse) { for (const c of el.children) { const m = c.transform && c.transform.baseVal.consolidate(); g.save(); if (m) { const k = m.matrix; g.transform(k.a, k.b, k.c, k.d, k.e, k.f); } paint(g, c, getComputedStyle(c), a * +getComputedStyle(c).opacity, true); g.restore(); } return; }
  const P = shapePath(el); if (!P) return;
  const fill = paintOf(g, el, cs.fill, a), stroke = paintOf(g, el, cs.stroke, a);
  const rule = cs.fillRule === 'evenodd' ? 'evenodd' : 'nonzero';
  if (fill) {
    g.globalAlpha = a * +cs.fillOpacity; g.fillStyle = fill;
    if (fill.bb) { const [x, y, w, h] = fill.bb, Q = new Path2D(); Q.addPath(P, new DOMMatrix([1 / w, 0, 0, 1 / h, -x / w, -y / h])); g.save(); g.transform(w, 0, 0, h, x, y); g.fill(Q, rule); g.restore(); }
    else g.fill(P, rule);
  }
  const sw = parseFloat(cs.strokeWidth);
  if (stroke && sw > 0) {
    g.globalAlpha = a * +cs.strokeOpacity; g.strokeStyle = stroke.bb ? 'rgba(0,0,0,0)' : stroke; g.lineWidth = sw; g.lineCap = cs.strokeLinecap || 'butt'; g.lineJoin = cs.strokeLinejoin || 'miter';
    const da = cs.strokeDasharray && cs.strokeDasharray !== 'none' ? cs.strokeDasharray.split(/[\s,]+/).map(parseFloat).filter(x => x >= 0) : null;
    if (da && da.length && da.some(x => x > 0)) { g.setLineDash(da.length % 2 ? da.concat(da) : da); g.lineDashOffset = parseFloat(cs.strokeDashoffset) || 0; }
    g.stroke(P); g.setLineDash([]);
  }
  g.globalAlpha = 1;
}

// shared mask plumbing: draw source → texture → pyramid (static sources once)
function maskState(src, levels) {
  const st = { src, canvas: null, tex: null, pyr: [], drawnReady: null, levels };
  st.update = (core, L, local, info) => {
    if (src.static && st.drawnReady === true) return;
    if (src.static && st.drawnReady === false && !core.ready) return;
    if (!st.canvas) { st.canvas = L.canvas(); st.tex = core.texture(L.pw, L.ph); }
    const g = L.sceneCtx(st.canvas); src.draw(g, local, info, L);
    core.upload(st.tex, st.canvas); st.tex.w = L.pw; st.tex.h = L.ph;
    core.pyramid(st.tex, st.levels, st.pyr);
    st.drawnReady = core.ready;
  };
  st.level = i => (i <= 0 ? st.tex : st.pyr[Math.min(i, st.levels)].a);
  st.size = i => { const t = st.level(i); return [t.w, t.h]; };
  return st;
}
const srcKey = (src, local) => (src.static ? 'S' : src.key ? src.key(local) : null);

/* ================================================================ effects */
// rice paper (宣纸) in a shader: o {color '#e4e5d8', amount 1, fibres 1, vignette .22, specks 1, mode 'paper' | 'overlay', seed}
// 'overlay' outputs a multiply map (1 where the paper is plain) → use with {blend: 'multiply'} on top of a scene.
export function paper(o = {}) {
  return {
    name: 'paper', key: () => 'paper',
    render(core, L) {
      core.pass(PAPER, { ...L.common(o.seed || 0), uBase: rgb(o.color || '#e4e5d8'), uAmt: o.amount != null ? o.amount : 1, uFib: o.fibres != null ? o.fibres : 1, uVig: o.vignette != null ? o.vignette : .22, uSpeck: o.specks != null ? o.specks : 1, uMode: o.mode === 'overlay' ? 1 : 0 }, null, { blend: 'none' });
    },
  };
}
// ink bleed (墨晕): src mask (vk.gl.text / path / svg / draw) is written then bleeds into the paper.
//   o {src, at 0, draw .8 (s), dur 2.5 (s), spread 14 (px, halo past the edge), color '#1f2529', density .95,
//      halo .38 (halo ink), rim .35 (tide line), fibre .8, feather 1, mottle .35, grain .35, soft 0 (1 = keep mask
//      gradients, for washes), wipe: {dir: 'down'|'up'|'left'|'right'|[x,y], dur s} (per-pixel start delay), fade [t0, t1], seed}
export function inkBleed(o = {}) {
  let st, lv;
  const dirs = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] };
  const wipe = o.wipe ? { dir: Array.isArray(o.wipe.dir) ? o.wipe.dir : dirs[o.wipe.dir || 'down'], dur: o.wipe.dur != null ? o.wipe.dur : 1 } : null;
  const curve = local => bleedCurve(local - (wipe ? wipe.dur : 0), o);
  return {
    name: 'inkBleed', o,
    init(core, L) {
      const sig = haloSigma(o.spread != null ? o.spread : 14, o.haloEnd != null ? o.haloEnd : .12) * L.res;
      const l = levelFor(sig, 7); lv = { a: Math.floor(l), b: Math.min(7, Math.floor(l) + 1), mix: l - Math.floor(l) };
      st = maskState(o.src, Math.max(3, lv.b));
    },
    key(local, info, L) {
      const sk = srcKey(o.src, local); if (sk == null) return null;
      const x = local - (o.at || 0); if (x < 0) return 'off';
      if (o.fade && local >= o.fade[1]) return 'gone';
      // the fade window is in scene time (not wipe-shifted like the curve), so test it on `local` directly
      const c = curve(local), fading = o.fade && local >= o.fade[0];
      if (c.done && !fading) return 'done' + sk;
      return f4(local) + sk;
    },
    render(core, L, local, info) {
      const x = local - (o.at || 0); if (x < 0 || (o.fade && local >= o.fade[1])) return;
      st.update(core, L, local, info);
      const fade = o.fade ? 1 - Math.min(1, Math.max(0, (local - o.fade[0]) / (o.fade[1] - o.fade[0]))) : 1;
      const A = st.level(lv.a), B = st.level(lv.b);
      core.pass(BLEED, {
        ...L.common(o.paperSeed || 0), uM0: st.level(0), uM1: st.level(1), uM3: st.level(3), uM3Size: st.size(3), uHa: A, uHb: B, uHaSize: [A.w, A.h], uHbSize: [B.w, B.h], uHmix: lv.mix,
        uX: x, uDraw: o.draw != null ? o.draw : .8, uDur: o.dur != null ? o.dur : 2.5, uHaloEnd: o.haloEnd != null ? o.haloEnd : .12, uFade: fade * fade * (3 - 2 * fade), uSoft: o.soft || 0,
        uWipe: wipe ? [wipe.dir[0], wipe.dir[1], wipe.dur] : [0, 0, 0],
        uColor: rgb(o.color || '#1f2529'), uDensity: o.density != null ? o.density : .95, uHaloDensity: o.halo != null ? o.halo : .3, uRim: o.rim != null ? o.rim : .22,
        uHWarp: (o.warp != null ? o.warp : .5) * (o.spread != null ? o.spread : 14) * L.res, uFibre: o.fibre != null ? o.fibre : .8, uPool: o.pool != null ? o.pool : .5, uFeather: o.feather != null ? o.feather : 1, uMottle: o.mottle != null ? o.mottle : .35, uGrain: o.grain != null ? o.grain : .35, uSeedF: (o.seed || 0) * 7.13,
      });
    },
  };
}
// ink-wash post filter (水墨化) for coloured SVG/canvas content: o {src (vk.gl.svg(el) …), hide: el|selector (hidden in
// the DOM, drawn by GL instead; default = src element), boil 12 (fps, 0 = still), wobble 1.6 (px), wobbleScale 26 (px),
// dark .55 (pooled edges), edge 3, bleed .6 (soft halo), grain .45, mottle .5, alpha 1, ink '#1f2529' (edge pool tint)}
export function inkWash(o = {}) {
  let st;
  return {
    name: 'inkWash', o,
    init(core, L) {
      st = maskState(o.src, 4);
      const h = o.hide !== undefined ? o.hide : o.src && o.src.el;
      if (h) [].concat(typeof h === 'string' ? [...document.querySelectorAll(h)] : h).forEach(e => { if (e && e.style) e.style.visibility = 'hidden'; });
    },
    key(local) { const sk = srcKey(o.src, local); if (sk == null) return null; return (o.boil === 0 ? 'still' : boilFrame(local, o.boil || 12, o.frames || 0)) + sk; },
    render(core, L, local, info) {
      st.update(core, L, local, info);
      const L4 = st.level(4);
      core.pass(WASH, {
        ...L.common(o.paperSeed || 0), uS: st.level(0), uL2: st.level(2), uL3: st.level(3), uL4: L4, uL4Size: [L4.w, L4.h], uTide: o.tide != null ? o.tide : .5,
        uBoil: o.boil === 0 ? 0 : boilFrame(local, o.boil || 12, o.frames || 0), uWob: o.wobble != null ? o.wobble : 1.6, uWobF: o.wobbleScale || 26,
        uDark: o.dark != null ? o.dark : .6, uEdge: o.edge || 2.5, uBleed: o.bleed != null ? o.bleed : .6, uGrain: o.grain != null ? o.grain : .45, uMottle: o.mottle != null ? o.mottle : .5,
        uAlpha: o.alpha != null ? o.alpha : 1, uSeedF: (o.seed || 0) * 5.1, uInk: 1, uInkC: rgb(o.ink || '#1f2529'),
      });
    },
  };
}
// particles drawn as GL point sprites. o = particle options (vk.particles) or {system}, plus shape ('drop' | 'splat' |
// 'mist' | 'petal' | 'spark' | 'dot'; drops that land become splats), color, color2 (petal base / 2nd colour),
// colors: [..] (per-particle pick), blend ('normal' | 'add'), soak (splat halo, 1)
export function particles(o = {}) {
  const sys = o.system || particleSystem(o), so = sys.o;
  const shape = SHAPES[o.shape || so.shape || 'dot'] ?? 5;
  const cols = (o.colors || so.colors || [o.color || so.color || '#1f2529']).map(rgb), c2 = rgb(o.color2 || so.color2 || '#ffffff');
  let buf = null, data = new Float32Array(0);
  return {
    name: 'particles', system: sys,
    // nothing alive → 'empty'; only fully soaked splats left → their id set (pixels identical until one changes)
    key(local) { const P = sys.at(local); if (!P.length) return 'empty'; if (P.every(p => p.settled)) return 'S' + P.map(p => p.id).join(','); return null; },
    render(core, L, local) {
      const P = sys.at(local); if (!P.length) return;
      const gl = core.gl, prog = core.program(PFRAG, PVERT);
      if (data.length < P.length * 12) data = new Float32Array(P.length * 12);
      P.forEach((p, i) => {
        const c = cols[Math.floor(p.u * cols.length) % cols.length], k = i * 12;
        data[k] = p.x; data[k + 1] = p.y; data[k + 2] = p.size; data[k + 3] = p.alpha;
        data[k + 4] = p.rot; data[k + 5] = p.landed && shape === 0 ? 1 : shape; data[k + 6] = p.u; data[k + 7] = p.landed ? p.land.age : 0;
        data[k + 8] = c[0]; data[k + 9] = c[1]; data[k + 10] = c[2]; data[k + 11] = 1;
      });
      if (!buf) buf = gl.createBuffer();
      gl.useProgram(prog.pr); core.bindOutput(); core.blend(o.blend || so.blend || 'normal');
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, P.length * 12), gl.DYNAMIC_DRAW);
      ['a0', 'a1', 'a2'].forEach((n, j) => { const l = prog.attr[n] != null ? prog.attr[n] : (prog.attr[n] = gl.getAttribLocation(prog.pr, n)); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 48, j * 16); });
      const r = L.rect;
      core.uniforms(prog, { uRes: [L.pw, L.ph], uNX: [r[0], r[1], 1 / L.res, 1 / L.res], uMaxPt: core.maxPoint, uC2: c2, uSoak: o.soak != null ? o.soak : 1 });
      gl.drawArrays(gl.POINTS, 0, P.length); core.stats.passes++;
      ['a0', 'a1', 'a2'].forEach(n => { const l = prog.attr[n]; if (l >= 0) gl.disableVertexAttribArray(l); });
    },
  };
}
// drifting mist band (留白 between mountain layers): o {y (scene px centre), height 60, speed 12 (px/s), density .85,
// scale 90 (cloud size px), color (paper), seed}. Pure function of scene time.
export function mist(o = {}) {
  return {
    name: 'mist', key: o.speed === 0 ? () => 'mist' : null,
    render(core, L, local) {
      core.pass(MIST, { ...L.common(0), uTime: local, uY: o.y != null ? o.y : 400, uH: o.height || 60, uSpeed: o.speed != null ? o.speed : 12, uDensity: o.density != null ? o.density : .85, uScale: o.scale || 90, uSeedF: (o.seed || 0) * 3.7, uColor: rgb(o.color || '#e8e9dd') });
    },
  };
}
// custom full-layer shader: o {frag (GLSL body with main(); gets uTime, uStep, uProgress, uRes, vUv, scenePx(), paperN(),
// h12/vnoise/fbm), uniforms: (local, info) → {name: number | [..]}, step 12 (fps for uStep), blend, key(local) → string}
export function shader(o = {}) {
  const frag = CUSTOM_HEAD + o.frag;
  return {
    name: 'shader', key: o.key || null,
    render(core, L, local, info) {
      core.pass(frag, { ...L.common(o.seed || 0), uTime: local, uStep: stepT(local, o.step || 12), uProgress: info && info.p || 0, ...(o.uniforms ? o.uniforms(local, info) : {}) }, null, { blend: o.blend });
    },
  };
}

/* ================================================================ line boil (SVG filter, stepped) */
// vk.gl.boil(sc, targets, {fps 12, amp 2.2 (px), freq .035, octaves 2, frames 0 (0 = new drawing every step; n = cycle n)})
// → {id, filter}. A turbulence displacement whose seed changes `fps` times a second of scene time: hand-drawn line boil
// "on twos" (12 drawings/s at 24 fps). Pure: the seed is computed from the scene-local time.
let boilN = 0;
export function boil(sc, targets, o = {}) {
  const id = o.id || 'vk-boil-' + (++boilN), v = sc.video || sc;
  const w = document.createElement('div');
  w.innerHTML = `<svg width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><filter id="${id}" data-vk-dynamic x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${o.freq || .035}" numOctaves="${o.octaves || 2}" seed="${o.seed || 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${(o.amp != null ? o.amp : 2.2) * 2}" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`;
  // inside the scene: the seed only matters (and is only updated) while the scene is on screen
  const s = w.firstElementChild; (sc.el || v.stage).appendChild(s);
  const tur = s.querySelector('feTurbulence'), base = o.seed || 3;
  const els = typeof targets === 'string' ? [...(sc.el || v.stage).querySelectorAll(targets)] : [].concat(targets || []);
  els.forEach(e => { if (e instanceof SVGElement) e.setAttribute('filter', `url(#${id})`); else e.style.filter = `url(#${id})`; });
  let last = null;
  const upd = t => { const f = boilFrame(t, o.fps || 12, o.frames || 0), sd = String(base + f * 7); if (sd !== last) { last = sd; tur.setAttribute('seed', sd); } };
  if (sc.on) sc.on(l => upd(l)); else v.onRender(upd);
  return { id, filter: s.querySelector('filter') };
}

/* ================================================================ paper-cut (剪纸) helpers (SVG filters) */
// vk.gl.paperCut(video, {prefix 'pc', seed, rough 1.2 (px, scissor edge), grain .5, shadow: [dx 3, dy 5, blur 3, opacity .35], color})
// installs filters: #pc-cut (rough cut edge) · #pc-grain (paper fibre shading inside the shape) · #pc-shadow (lifted
// paper drop shadow) · #pc (all three). Use on <g filter="url(#pc)"> of flat-coloured shapes.
export function paperCut(v, o = {}) {
  const p = o.prefix || 'pc', s = o.seed || 5, r = o.rough != null ? o.rough : 1.2, gr = o.grain != null ? o.grain : .5, sh = o.shadow || [3, 5, 3, .35];
  const id = 'vk-pc-defs-' + p; if (document.getElementById(id)) return p;
  const cut = `<feTurbulence type="turbulence" baseFrequency=".9" numOctaves="1" seed="${s}" result="cn"/><feDisplacementMap in="SourceGraphic" in2="cn" scale="${r * 2}" xChannelSelector="R" yChannelSelector="G" result="cut"/>`;
  const grain = (inp) => `<feTurbulence type="fractalNoise" baseFrequency=".05 .7" numOctaves="3" seed="${s + 3}" result="fn"/><feColorMatrix in="fn" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${-gr * 1.4} ${gr * .75}" result="fm"/><feComposite in="fm" in2="${inp}" operator="in" result="fk"/><feComposite in="${inp}" in2="fk" operator="arithmetic" k1="0" k2="1" k3="-.35" k4="0" result="gr"/>`;
  const shadow = inp => `<feGaussianBlur in="${inp}" stdDeviation="${sh[2]}" result="sb"/><feOffset in="sb" dx="${sh[0]}" dy="${sh[1]}" result="so"/><feColorMatrix in="so" type="matrix" values="0 0 0 0 .12  0 0 0 0 .08  0 0 0 0 .06  0 0 0 ${sh[3]} 0" result="sc"/>`;
  const w = document.createElement('div');
  w.innerHTML = `<svg id="${id}" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>
<filter id="${p}-cut" x="-3%" y="-3%" width="106%" height="106%">${cut}</filter>
<filter id="${p}-grain">${grain('SourceGraphic')}</filter>
<filter id="${p}-shadow" x="-10%" y="-10%" width="125%" height="130%">${shadow('SourceAlpha')}<feMerge><feMergeNode in="sc"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="${p}" x="-10%" y="-10%" width="125%" height="130%">${cut}${grain('cut')}${shadow('cut')}<feMerge><feMergeNode in="sc"/><feMergeNode in="gr"/></feMerge></filter>
</defs></svg>`;
  (v.stage || document.body).appendChild(w.firstElementChild);
  return p;
}

export const gl = {
  layer, paper, inkBleed, inkWash, particles, mist, shader,
  text, path, svg, image, draw,
  boil, paperCut, jitter: jitterPath, jitterPoints, stepT, boilFrame, bleedCurve,
  presets: PRESETS, system: particleSystem, core: getCore, COPY,
};
export { particleSystem };
