// Full-frame textures ("print finish"): grain, vignette, flicker, paper, halftone, scanlines, rgb misregistration.
// Enable with vk.video({texture:{grain:.06, vignette:.35}}) or v.texture('scanlines', {...}).
import { registry } from '../core/plugin.js';
import { mulberry32, hash } from '../core/random.js';

const X = registry.textures;
const ov = (cls = '') => { const e = document.createElement('div'); e.className = 'vk-ov ' + cls; return e; };
const amt = (o, d) => (o.amount != null ? o.amount : d);

// film grain: 4 pre-generated seeded noise tiles, offset per frame at `fps` (24 = film). Cheaper alternative: vk render --grain
X.grain = (v, o) => {
  const c = document.createElement('canvas'); c.className = 'vk-ov'; c.width = v.W; c.height = v.H; c.style.mixBlendMode = o.blend || 'overlay'; c.style.opacity = amt(o, .06);
  const tiles = [];
  for (let i = 0; i < 4; i++) { const t = document.createElement('canvas'); t.width = t.height = 256; const g = t.getContext('2d'), im = g.createImageData(256, 256), r = mulberry32(1000 + i); for (let p = 0; p < im.data.length; p += 4) { const val = r() * 255; im.data[p] = im.data[p + 1] = im.data[p + 2] = val; im.data[p + 3] = 255; } g.putImageData(im, 0, 0); tiles.push(t); }
  const g = c.getContext('2d'); let lastF = -1;
  return { el: c, update(t) { const f = Math.floor(t * (o.fps || 24)); if (f === lastF) return; lastF = f; g.save(); g.translate(Math.floor(hash(f) * 256) - 256, Math.floor(hash(f + 7) * 256) - 256); g.fillStyle = g.createPattern(tiles[f % 4], 'repeat'); g.fillRect(0, 0, v.W + 512, v.H + 512); g.restore(); } };
};
X.vignette = (v, o) => { const e = ov(); e.style.background = `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) ${o.inner || 45}%, rgba(0,0,0,${amt(o, .35)}) 100%)`; return { el: e }; };
// projector exposure flicker (±amount), quantised to 24 fps
X.flicker = (v, o) => { const e = ov(); e.style.background = '#000'; return { el: e, update(t) { e.style.opacity = (amt(o, .03) * hash(Math.floor(t * (o.fps || 24)) * 1.9)).toFixed(4); } }; };
// paper: static fibrous noise multiplied over everything (editorial look)
X.paper = (v, o) => {
  const c = document.createElement('canvas'); c.className = 'vk-ov'; c.width = 512; c.height = 512; c.style.cssText += `;mix-blend-mode:multiply;opacity:${amt(o, .5)};background-size:512px 512px`;
  const g = c.getContext('2d'), r = mulberry32(o.seed || 42); g.fillStyle = o.color || '#F4EEE2'; g.fillRect(0, 0, 512, 512);
  const im = g.getImageData(0, 0, 512, 512); for (let p = 0; p < im.data.length; p += 4) { const n = (r() - .5) * 26; im.data[p] += n; im.data[p + 1] += n; im.data[p + 2] += n; } g.putImageData(im, 0, 0);
  g.globalAlpha = .08; g.strokeStyle = '#7A6A55'; for (let i = 0; i < 260; i++) { g.lineWidth = .5 + r(); g.beginPath(); const x = r() * 512, y = r() * 512, a = r() * 6.28, l = 6 + r() * 26; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  const e = ov(); e.style.backgroundImage = `url(${c.toDataURL()})`; e.style.mixBlendMode = 'multiply'; e.style.opacity = amt(o, .5);
  return { el: e };
};
// halftone dot screen
X.halftone = (v, o) => { const e = ov(), s = v.px(o.size || 7); e.style.cssText += `;background-image:radial-gradient(circle at center, ${o.color || 'rgba(0,0,0,.9)'} ${o.dot || 28}%, transparent ${(o.dot || 28) + 6}%);background-size:${s}px ${s}px;mix-blend-mode:${o.blend || 'soft-light'};opacity:${amt(o, .35)}`; if (o.angle) { e.style.inset = '-50%'; e.style.width = '200%'; e.style.height = '200%'; e.style.transform = `rotate(${o.angle}deg)`; } return { el: e }; };
// CRT scanlines, optional slow roll
X.scanlines = (v, o) => { const e = ov(), s = v.px(o.size || 4); e.style.cssText += `;background:repeating-linear-gradient(0deg, rgba(0,0,0,${amt(o, .22)}) 0 ${s / 2}px, transparent ${s / 2}px ${s}px)`; return { el: e, update(t) { if (o.roll) e.style.backgroundPosition = `0 ${(t * (o.roll === true ? 30 : o.roll)) % s}px`; } }; };
// RGB misregistration (riso / chromatic offset) via an SVG filter on the scene stack. o: {amount px, pulse (beats k), angle}
X.rgb = (v, o, host) => {
  const id = 'vk-rgb';  // host = scene for a per-scene texture
  const wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  wrap.innerHTML = `<svg width="0" height="0"><filter id="${id}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
    <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/><feOffset in="r" dx="0" dy="0" result="ro"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/><feOffset in="b" dx="0" dy="0" result="bo"/>
    <feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen"/></filter></svg>`;
  const offs = () => wrap.querySelectorAll('feOffset');
  const target = host ? host.el : v.scenesEl, fid = host ? id + '-' + host.index : id;
  wrap.querySelector('filter').id = fid; target.style.filter = `url(#${fid})`;
  const ang = (o.angle || 0) * Math.PI / 180;
  return { el: wrap, update(t) { const a = v.px(amt(o, 2)) * (o.pulse ? (.25 + v.beats.pulse(t, o.pulse)) : 1) * (o.fn ? o.fn(t) : 1); const [r, b] = offs(); const dx = (a * Math.cos(ang)).toFixed(2), dy = (a * Math.sin(ang)).toFixed(2); r.setAttribute('dx', -dx); r.setAttribute('dy', -dy); b.setAttribute('dx', dx); b.setAttribute('dy', dy); } };
};
