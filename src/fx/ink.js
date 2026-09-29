// Chinese ink-wash (水墨) kit: `ink` theme (rice paper, ink, seal red, brush calligraphy), `rice` paper texture,
// SVG ink filters (line wobble, wash, wet bleed, dry brush, optional hand-drawn boil), vertical calligraphy titles,
// chapter titles, seals and end cards, `ink` / `wash` transitions, brush-stroke geometry and a cached SVG
// attribute setter for keyframed rigs. Style reference: 三个和尚 ink-wash short (960×540 SVG, Ma Shan Zheng).
import { registry } from '../core/plugin.js';
import { node, h } from '../authoring/node.js';
import { boil as boilFrame } from '../core/random.js';
import { bakeTile } from '../runtime/bake.js';

export const INK = { paper: '#e4e5d8', paper2: '#d7dbcc', ink: '#1f2529', inkSoft: '#4c565b', seal: '#b5342a', sealInk: '#f6ece0', mist: '#f4f4ea' };
const BRUSH = '"Ma Shan Zheng","STKaiti","KaiTi","Kaiti SC","Noto Serif SC",serif';
const SERIF = '"Noto Serif SC","Songti SC","STSong","Noto Sans SC",serif';

registry.themes.ink = {
  label: '水墨（宣纸、墨色、朱砂印；马善政毛笔字 + 思源宋体）',
  modes: {
    light: { bg: INK.paper, fg: INK.ink, muted: '#39434a', surface: '#eeeee4', line: '#aeb0a0', accent: INK.seal, accent2: '#4d6659', onAccent: INK.sealInk },
    dark: { bg: '#1b2023', fg: '#dfe1d6', muted: '#a3aaa4', surface: '#232a2e', line: '#39423f', accent: '#cf4a3d', accent2: '#8fb8a8', onAccent: INK.sealInk },
    accent: { bg: INK.seal, fg: INK.sealInk, muted: '#f0cfc6', surface: INK.ink, line: '#d77b70', accent: INK.ink, accent2: INK.paper, onAccent: INK.sealInk },
  },
  mode: 'light', warn: INK.seal, ok: '#4d6659', yellow: '#c9a24c',
  chart: [INK.ink, INK.seal, '#4d6659', '#8fb8b6', '#c9a24c', '#879b92'],
  fonts: { sans: SERIF, display: BRUSH, mono: '"JetBrains Mono",monospace', serif: SERIF, brush: BRUSH },
  weight: { display: 400, title: 400, sub: 400 },
  tracking: { display: '.04em', title: '.04em' },
  scale: { hero: 200, h1: 96, h2: 64, h3: 34, body: 26, small: 20, label: 20, caption: 27, vtitle: 118, chapter: 42, seal: 22 },
  radius: 2, ease: 'smooth', cascade: .4,
  marker: 'rgba(181,52,42,.25)', caret: INK.seal,
  // caption bar of the reference: translucent paper, ink text, red left border
  caption: { bg: 'rgba(228,229,216,.9)', fg: INK.ink, karaoke: INK.seal, font: SERIF, weight: 500, radius: 2, padding: '.26em .9em .3em', border: '.14em solid ' + INK.seal, tracking: '.08em', shadow: '0 2px 10px -6px rgba(31,37,41,.35)' },
  fontsCheck: ['400 20px "Ma Shan Zheng"', '500 20px "Noto Serif SC"', '400 20px "Noto Serif SC"'],
};

/* ---------------- texture: rice paper (fractal noise, multiply) + warm inner vignette ---------------- */
// o: {amount (opacity, .55), freq (.85), seed, tone: [r,g,b] 0..1 fibre colour, vignette (0..1), size (tile px)}
// Static: with the layer cache on (default) the turbulence tile is rasterised once into a bitmap and tiled on a canvas,
// instead of the browser replaying the SVG filter for every repaint; `vk render --no-cache` keeps the live SVG.
registry.textures.rice = (v, o) => {
  const e = document.createElement('div'); e.className = 'vk-ov vk-rice';
  const tone = o.tone || [.38, .35, .28], sz = o.size || 300, f = o.freq || .85, seed = o.seed || 4;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${tone[0]} 0 0 0 0 ${tone[1]} 0 0 0 0 ${tone[2]} 0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  const vig = o.vignette != null ? o.vignette : .22, k = v.k || 1, tile = sz * (o.scale || 1), shadow = `inset 0 0 ${Math.round(120 * k)}px rgba(70,62,40,${vig})`;
  e.style.cssText += `;mix-blend-mode:multiply;opacity:${o.amount != null ? o.amount : .55};background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}");background-size:${tile}px;box-shadow:${shadow}`;
  if (o.cache !== false && v.bakeLater) v.bakeLater(async () => {
    const url = await bakeTile(svg, tile, tile);
    const img = new Image(); img.src = url; await img.decode();
    const dpr = window.devicePixelRatio || 1, c = document.createElement('canvas');
    c.width = Math.round(v.W * dpr); c.height = Math.round(v.H * dpr); c.className = 'vk-rice-bmp';
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    const g = c.getContext('2d'); g.fillStyle = g.createPattern(img, 'repeat'); g.fillRect(0, 0, c.width, c.height);
    const sh = document.createElement('div'); sh.style.cssText = `position:absolute;inset:0;box-shadow:${shadow}`;   // inset shadow paints above the grain, as before
    e.style.backgroundImage = 'none'; e.style.boxShadow = 'none'; e.append(c, sh);
  });
  return { el: e };
};

/* ---------------- SVG ink filters ---------------- */
// inkDefs({prefix:'ink', seed:7}) → '<filter …>' markup for a <defs>. Filter ids (prefix-…):
//   line  – brush-line wobble (turbulence displacement)           wash – soft wet wash (blur)
//   far   – distant wash (stronger blur)                          wob  – character outline wobble
//   bleed – wet edge: blur + displacement (ink soaking into paper) dry  – dry-brush broken texture
export function inkDefs(o = {}) {
  const p = o.prefix || 'ink', s = o.seed || 7, sc = o.scale || 1;
  return `
<filter id="${p}-line" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence class="vk-boil" type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${s}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${4 * sc}" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="${p}-wob" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence class="vk-boil" type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${s + 4}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${3 * sc}" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="${p}-wash" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur stdDeviation="${1.8 * sc}"/></filter>
<filter id="${p}-far" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${4 * sc}"/></filter>
<filter id="${p}-bleed" x="-12%" y="-12%" width="124%" height="124%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="${s + 9}" result="n"/><feGaussianBlur in="SourceGraphic" stdDeviation="${1.2 * sc}" result="b"/><feDisplacementMap in="b" in2="n" scale="${5 * sc}" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="${p}-dry" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.08" numOctaves="2" seed="${s + 2}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.7" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;
}
// Install the filters once into an invisible <svg> on the stage (filters referenced by url(#ink-…) from any scene).
// o.boil = fps (e.g. 8): turbulence seeds step at that rate → hand-drawn "boil" of all ink lines (pure function of t).
export function installInk(video, o = {}) {
  const id = 'vk-ink-defs-' + (o.prefix || 'ink');
  if (document.getElementById(id)) return;
  const w = h('div'); w.innerHTML = `<svg id="${id}" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${inkDefs(o)}</defs></svg>`;
  video.stage.appendChild(w.firstElementChild);
  if (o.boil) {
    const tur = [...document.getElementById(id).querySelectorAll('.vk-boil')], base = tur.map(t => +t.getAttribute('seed'));
    tur.forEach(t => t.closest('filter').setAttribute('data-vk-dynamic', ''));   // boiling filters change every few frames → never baked
    let last = -1;
    video.onRender(t => { const f = boilFrame(t, o.boil) % (o.boilFrames || 3); if (f === last) return; last = f; tur.forEach((el, i) => el.setAttribute('seed', base[i] + f * 17)); });
  }
}

/* ---------------- brush geometry ---------------- */
// Tapered brush stroke along a centre line → closed SVG path "d". pts: [[x,y],…] (≥2); width: number | (u 0..1) → width.
// Default profile: thin entry, belly, long thin exit (a 撇/tail stroke).
export function brushPath(pts, width = 6, o = {}) {
  const n = pts.length; if (n < 2) return '';
  const W = typeof width === 'function' ? width : (u => width * Math.pow(Math.sin(Math.PI * Math.min(1, u * .85 + .08)), .7));
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, w = Math.max(0, W(i / (n - 1))) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const f = x => (Math.round(x * 100) / 100);
  const side = arr => arr.map((q, i) => (i ? 'L' : '') + f(q[0]) + ',' + f(q[1])).join(' ');
  const capEnd = o.round !== false ? ` Q${f(pts[n - 1][0] + (pts[n - 1][0] - pts[n - 2][0]) * .6)},${f(pts[n - 1][1] + (pts[n - 1][1] - pts[n - 2][1]) * .6)} ` : ' L';
  return `M${side(L)}${capEnd}${side(R.reverse()).replace(/^/, '')}Z`;
}
// sample a centre line from a function (u 0..1 → [x, y]) with `n` points
export const sampleLine = (fn, n = 16) => Array.from({ length: n }, (_, i) => fn(i / (n - 1)));

// Cached attribute setter for per-frame rigs: only touches the DOM when a value changes (big win for SVG filters).
export function attr(el, o) {
  const c = el.__vka || (el.__vka = {});
  for (const k in o) { let v = o[k]; if (typeof v === 'number') v = Math.round(v * 100) / 100; v = String(v); if (c[k] !== v) { c[k] = v; el.setAttribute(k, v); } }
  return el;
}

/* ---------------- entrances ---------------- */
Object.assign(registry.fx, {
  ink: { from: { opacity: 0, blur: 10, scale: 1.04 }, to: { opacity: 1, blur: 0, scale: 1 }, ease: 'outCubic' },       // ink blooming into paper
  brush: { from: { clipPath: 'inset(0% 0% 100% 0%)', blur: 4 }, to: { clipPath: 'inset(0% 0% 0% 0%)', blur: 0 }, instant: { opacity: 1 }, ease: 'inOutSine' },  // top-to-bottom brush reveal (vertical text)
  'brush-x': { from: { clipPath: 'inset(0% 100% 0% 0%)', blur: 4 }, to: { clipPath: 'inset(0% 0% 0% 0%)', blur: 0 }, instant: { opacity: 1 }, ease: 'inOutSine' },
  stamp: { from: { opacity: 0, scale: 1.5, rotate: -8 }, to: { opacity: 1, scale: 1, rotate: 0 }, ease: 'outBack' },    // seal press
});

/* ---------------- vertical calligraphy blocks ---------------- */
const css = `
.vk-vt{display:flex;flex-direction:row-reverse;align-items:flex-start;gap:.14em;color:var(--fg);pointer-events:none}
.vk-vt-main{writing-mode:vertical-rl;font-family:var(--vk-brush,${BRUSH});line-height:1;letter-spacing:.04em;white-space:nowrap}
.vk-vt-sub{writing-mode:vertical-rl;font-family:var(--vk-serif);letter-spacing:.32em;color:var(--muted);white-space:nowrap}
.vk-seal{writing-mode:vertical-rl;background:var(--seal-bg,${INK.seal});color:var(--seal-fg,${INK.sealInk});font-family:var(--vk-brush,${BRUSH});line-height:1.15;border-radius:.12em;letter-spacing:.1em;white-space:nowrap;box-shadow:inset 0 0 0 .12em rgba(246,236,224,.18)}
.vk-chap{writing-mode:vertical-rl;font-family:var(--vk-brush,${BRUSH});letter-spacing:.08em;line-height:1.1;color:var(--fg);white-space:nowrap}
.vk-chap-no{display:block;font-size:.5em;margin-bottom:.4em;color:var(--accent);letter-spacing:.2em}
.vk-credits{font-family:var(--vk-serif);color:var(--muted);line-height:1.75;letter-spacing:.06em;text-align:left;white-space:nowrap}`;
function ensureCSS() { if (document.getElementById('vk-ink-css')) return; const s = document.createElement('style'); s.id = 'vk-ink-css'; s.textContent = css; document.head.appendChild(s); }
const px = (ctx, v, d) => ctx.px(v != null ? v : d) + 'px';

// vk.vtitle('小蝌蚪找妈妈', {sub:'一则童话　水墨动画短片', seal:'水墨', size:118, pos:{x:90,y:60}, at, out, sealAt})
export function vtitle(text, o = {}) {
  return node({ fx: 'ink', d: 1.4, pos: { x: 96, y: 58 }, ...o }, function vtitle_(ctx) {
    ensureCSS();
    const e = h('div', 'vk-vt'); e.style.fontSize = px(ctx, o.size, 118);
    h('div', 'vk-vt-main', esc(text), e);
    if (o.sub) { const s = h('div', 'vk-vt-sub', esc(o.sub), e); s.style.fontSize = px(ctx, o.subSize, 21); s.style.marginTop = px(ctx, o.subTop, 18); }
    if (o.seal) {
      const s = h('div', 'vk-seal', esc(o.seal), e); s.style.fontSize = px(ctx, o.sealSize, 20); s.style.padding = `${ctx.px(8)}px ${ctx.px(6)}px`;
      s.style.marginTop = px(ctx, o.sealTop, Math.round((o.size || 118) * [...text].length * .62));
      const t = ctx.scene.time(o.sealAt != null ? o.sealAt : (o.at || .3)) + (o.sealAt != null ? 0 : 1.1);
      ctx.scene.fx(s, 'stamp', { t, d: .5 }); ctx.extend(t + .5);
      if (o.sealSfx !== false) ctx.scene.sfx(t, 'woodfish', .5);
    }
    return e;
  }, 'ink');
}
// vk.chapter('一问鸭妈妈', {no:'一', at, out}) — vertical chapter title in the top-left corner (inside the safe area)
export function chapter(text, o = {}) {
  return node({ fx: 'brush', d: 1.1, pos: { x: 84, y: 58 }, ...o }, function chapter_(ctx) {
    ensureCSS();
    const e = h('div', 'vk-chap'); e.style.fontSize = px(ctx, o.size, 42);
    e.innerHTML = (o.no ? `<span class="vk-chap-no">${esc(o.no)}</span>` : '') + esc(text);
    return e;
  }, 'brush');
}
// vk.seal('水墨', {size}) — standalone red seal
export function seal(text, o = {}) {
  return node({ fx: 'stamp', d: .5, ...o }, function seal_(ctx) { ensureCSS(); const s = h('div', 'vk-seal', esc(text)); s.style.fontSize = px(ctx, o.size, 22); s.style.padding = `${ctx.px(8)}px ${ctx.px(6)}px`; return s; }, 'stamp');
}
// vk.endcard({big:'找到妈妈啦', small:'小蝌蚪找妈妈　终', seal:'终', credits:['配音 …', '音乐 …']})
export function endcard(o = {}) {
  return node({ fx: 'ink', d: 1.4, pos: { x: 96, y: 58 }, ...o }, function endcard_(ctx) {
    ensureCSS();
    const wrap = h('div'); wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    const e = h('div', 'vk-vt', null, wrap); e.style.fontSize = px(ctx, o.size, 60);
    e.style.cssText += `;position:absolute;left:${px(ctx, o.x, 0)};top:0`;
    h('div', 'vk-vt-main', esc(o.big || '终'), e);
    if (o.small) { const s = h('div', 'vk-vt-sub', esc(o.small), e); s.style.fontSize = px(ctx, o.smallSize, 19); s.style.marginTop = px(ctx, 12); }
    if (o.seal) { const s = h('div', 'vk-seal', esc(o.seal), e); s.style.fontSize = px(ctx, 18); s.style.padding = `${ctx.px(7)}px ${ctx.px(5)}px`; s.style.marginTop = px(ctx, o.sealTop, 180); }
    return wrap;
  }, 'ink');
}
// vk.credits(['配音：…', '音乐：…'], {pos, size}) — small serif credit lines
export function credits(lines, o = {}) {
  return node({ fx: 'fade', d: 1, ...o }, function credits_(ctx) { ensureCSS(); const e = h('div', 'vk-credits', [].concat(lines).map(esc).join('<br>')); e.style.fontSize = px(ctx, o.size, 15); return e; }, 'fade');
}
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
Object.assign(registry.blocks, { vtitle, chapter, seal, endcard, credits });

/* ---------------- transitions ---------------- */
const T = registry.transitions;
// ink bloom: the new scene spreads from a focal point through a soft, uneven ink edge; the old one softens
T.ink = (e, c) => {
  const fx = c.o.x == null ? c.W * .5 : c.o.x <= 1 ? c.o.x * c.W : c.o.x, fy = c.o.y == null ? c.H * .5 : c.o.y <= 1 ? c.o.y * c.H : c.o.y;
  const R = Math.hypot(Math.max(fx, c.W - fx), Math.max(fy, c.H - fy)) * 1.35, r = e * R, soft = R * .38;
  const m = `radial-gradient(ellipse ${(r * 1.12).toFixed(1)}px ${(r * .92).toFixed(1)}px at ${fx.toFixed(0)}px ${fy.toFixed(0)}px, #000 ${Math.max(0, r - soft).toFixed(1)}px, rgba(0,0,0,.55) ${Math.max(0, r - soft * .45).toFixed(1)}px, transparent ${r.toFixed(1)}px)`;
  return { in: { maskImage: m, webkitMaskImage: m, filter: `blur(${((1 - e) * 3).toFixed(2)}px)` }, out: { filter: `blur(${(e * 5).toFixed(2)}px)` } };
};
// wash: slow wet crossfade (old scene dissolves like ink in water: blur + lift; new one condenses)
// (brightness(1.000) is an identity filter step: dropped so the compositor does not run a colour matrix for nothing)
T.wash = e => { const b = (1 + e * .08).toFixed(3); return { in: { opacity: e, filter: `blur(${((1 - e) * 6).toFixed(2)}px)` }, out: { filter: `blur(${(e * 8).toFixed(2)}px)${b !== '1.000' ? ` brightness(${b})` : ''}` } }; };
