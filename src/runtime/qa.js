// In-page QA: text overlap / overflow / out-of-frame / safe area / platform UI zones / caption width /
// fonts / blank frame, plus the visible-text snapshot. Runs at a given t via window.__qa(t).
import { registry } from '../core/plugin.js';

export function visibleText(stage) {
  const out = [], tw = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  while (tw.nextNode()) {
    const n = tw.currentNode, s = n.textContent.trim(); if (!s) continue;
    let ok = true;
    for (let e = n.parentElement; e && e !== stage; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) { ok = false; break; } }
    if (ok) out.push((/vk-(chi|c|word)\b/.test(n.parentElement.className) ? '\u0000' : ' ') + s);
  }
  return out.join('').replace(/ ?\u0000/g, '').replace(/\s+/g, ' ').trim();
}

export function runQA(v) {
  const { stage, W, H } = v, issues = [], sr = stage.getBoundingClientRect(), sx = sr.width / W;
  const R = el => { const r = el.getBoundingClientRect(); return { l: (r.left - sr.left) / sx, t: (r.top - sr.top) / sx, r: (r.right - sr.left) / sx, b: (r.bottom - sr.top) / sx, w: r.width / sx, h: r.height / sx }; };
  const vis = el => { for (let e = el; e && e !== stage; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return false; } return true; };
  const label = el => { const tx = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40); const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + cls + (tx ? ` "${tx}"` : ''); };
  const textRects = el => {
    const out = [], fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    el.childNodes.forEach(n => {
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      const rg = document.createRange(); rg.selectNodeContents(n);
      [...rg.getClientRects()].forEach(r => {
        if (r.width <= 1 || r.height <= 1) return;
        const cy = (r.top + r.bottom) / 2 / sx - sr.top / sx + fs * .06, hh = Math.min(r.height / sx, fs * .9) / 2;
        out.push({ l: (r.left - sr.left) / sx, t: cy - hh, r: (r.right - sr.left) / sx, b: cy + hh });
      });
    });
    return out;
  };
  const texts = [], s = v.safe, capEl = v.capEl;
  const nodes = [...stage.querySelectorAll('.vk-scene.on *')].concat(capEl ? [capEl] : []);
  nodes.forEach(el => {
    if (el.closest('[data-qa="ignore"],.vk-bleed,.vk-safe') || (el.closest('svg') && el.tagName.toLowerCase() !== 'svg')) return;
    if (!vis(el)) return;
    const r = R(el); if (r.w < 1 || r.h < 1) return;
    const inCam = !!el.closest('.vk-cam') && hasCamMotion(el);
    if (!inCam && (r.l < -1 || r.t < -1 || r.r > W + 1 || r.b > H + 1) && !el.closest('.vk-bg')) issues.push({ type: 'out-of-frame', el: label(el), level: 'warn' });
    const tr = textRects(el);
    if (!tr.length) return;
    const cs = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0 && cs.display !== 'inline' && !/vk-(ch|wordwrap|stack-line)/.test(el.className)) issues.push({ type: 'text-overflow-x', el: label(el), scrollW: el.scrollWidth, clientW: el.clientWidth });
    if (el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0 && cs.display !== 'inline' && cs.overflow !== 'visible' && !/vk-(ch|stack-line)/.test(el.className)) issues.push({ type: 'text-overflow-y', el: label(el) });
    if (!inCam && el !== capEl && tr.some(q => q.l < s.left - 1 || q.r > W - s.right + 1 || q.t < s.top - 1 || q.b > H - s.bottom + 1)) issues.push({ type: 'outside-safe-area', el: label(el), level: 'warn' });
    if (tr.some(q => q.l < -1 || q.r > W + 1 || q.t < -1 || q.b > H + 1)) issues.push({ type: 'text-cut-by-frame', el: label(el) });
    if (el !== capEl) for (const z of v.zones) if (tr.some(q => q.r > z.x && q.l < z.x + z.w && q.b > z.y && q.t < z.y + z.h)) { issues.push({ type: 'in-platform-ui-zone', el: label(el), zone: z.name }); break; }
    texts.push({ el, rs: tr });
  });
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const A = texts[i], B = texts[j]; let hit = false;
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    A.rs.forEach(a => B.rs.forEach(b => { const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ix > Math.max(3, .12 * Math.min(a.r - a.l, b.r - b.l)) && iy > .35 * Math.min(a.b - a.t, b.b - b.t)) hit = true; }));
    if (hit) issues.push({ type: 'text-overlap', el: label(A.el), other: label(B.el) });
  }
  if (capEl && +capEl.style.opacity > 0) {
    const cr = R(capEl); if (cr.w > W - s.left - s.right + 2) issues.push({ type: 'caption-too-wide', el: label(capEl), w: Math.round(cr.w) });
    if (W >= H && capEl.getClientRects().length && cr.h > parseFloat(getComputedStyle(capEl).fontSize) * 2) issues.push({ type: 'caption-wraps', el: label(capEl) });
    for (const z of v.zones) if (cr.r > z.x && cr.l < z.x + z.w && cr.b > z.y && cr.t < z.y + z.h) issues.push({ type: 'caption-in-ui-zone', el: label(capEl), zone: z.name, level: 'warn' });
    // occlusion: the caption's centre must hit the caption itself (not a scene or layer stacked above it)
    const sr = stage.getBoundingClientRect(), sx = sr.width / W || 1, pe = capEl.style.pointerEvents;
    capEl.style.pointerEvents = 'auto'; // hit-testing skips pointer-events:none
    const hit = document.elementFromPoint(sr.left + (cr.l + cr.w / 2) * sx, sr.top + (cr.t + cr.h / 2) * sx); capEl.style.pointerEvents = pe;
    if (hit && !hit.closest('.vk-cap')) issues.push({ type: 'caption-covered', el: label(capEl), other: label(hit) });
  }
  if (!visibleText(stage) && !stage.querySelector('.vk-scene.on svg, .vk-scene.on img, .vk-scene.on video, .vk-scene.on canvas')) issues.push({ type: 'blank-frame', el: 'no visible text or media', level: 'warn' });
  const missing = v.fontsCheck.filter(f => !document.fonts.check(f, '中文Aa'));
  if (missing.length) issues.push({ type: 'fonts-not-loaded', el: missing.join(', ') });
  const rep = { t: v.curT, issues };
  registry.hooks.qa.forEach(f => f(rep, v));
  return rep;
}
function hasCamMotion(el) { const cam = el.closest('.vk-cam'); if (!cam) return false; if (el.closest('[data-cam-keys]')) return true; if (cam.style.scale || cam.style.rotate) return true; /* rhythm zoom (beat/energy) */ const tf = getComputedStyle(cam).transform; return !!tf && tf !== 'none' && tf !== 'matrix(1, 0, 0, 1, 0, 0)'; }
