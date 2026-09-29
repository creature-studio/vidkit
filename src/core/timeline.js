// Property tween store + apply (ported from engine.js addTween/applyEl).
// Rule: per property, the *last started* tween wins; before any started, the first tween's `from` holds
// (GSAP immediateRender semantics). Everything is recomputed from scratch each frame → seekable.
import { getEase, defaultEase } from './ease.js';
import { lerpStr, toStr, camel, TF, TF_ID, composeTransform } from './interp.js';
import { staggerOf } from './stagger.js';

export class Timeline {
  constructor() { this.els = new Map(); } // el -> {props:{k:[tr]}, order:[], fns:[], origin, owner}
  state(el) { let s = this.els.get(el); if (!s) { s = { props: {}, order: [], fns: [], origin: null, owner: null }; this.els.set(el, s); } return s; }
  // o: {t, d, ease, from, to, stagger, origin}; owner: scene (local time) or null (absolute)
  tween(els, o, owner) {
    const n = els.length, sf = staggerOf(o.stagger);
    els.forEach((el, i) => {
      const t0 = (o.t || 0) + (sf ? sf(i, n, el) : 0);
      const d = o.d == null ? .6 : o.d, ease = getEase(o.ease || defaultEase());
      const from = o.from || {}, to = o.to || {}, keys = new Set([...Object.keys(from), ...Object.keys(to)]);
      const S = this.state(el); S.owner = owner || null;
      if (o.origin) S.origin = o.origin;
      keys.forEach(k0 => {
        const k = camel(k0); let fv = from[k0], tv = to[k0];
        if (fv === undefined) fv = defaultVal(el, k);
        if (tv === undefined) tv = defaultVal(el, k);
        const tr = { t0, d: Math.max(d, 1e-4), ease, a: toStr(k, fv), b: toStr(k, tv) };
        if (!S.props[k]) { S.props[k] = []; S.order.push(k); }
        S.props[k].push(tr); S.props[k].sort((x, y) => x.t0 - y.t0);
      });
    });
  }
  fn(el, f, owner) { const S = this.state(el); S.owner = owner || null; S.fns.push(f); }
  apply(el, S, local) {
    let tf = null; const vals = {};
    for (const k of S.order) {
      const list = S.props[k]; let tr = null;
      for (let j = list.length - 1; j >= 0; j--) if (local >= list[j].t0) { tr = list[j]; break; }
      vals[k] = tr ? lerpStr(tr.a, tr.b, tr.ease(Math.min(1, (local - tr.t0) / tr.d))) : list[0].a;
    }
    let filt = null;
    for (const k in vals) {
      const v = vals[k];
      if (k in TF) { (tf || (tf = {}))[k] = v; continue; }
      if (k === 'blur') { const b = parseFloat(v); if (b > .01) (filt || (filt = [])).push(`blur(${v})`); continue; }
      if (k === 'brightness') { if (Math.abs(parseFloat(v) - 1) > .001) (filt || (filt = [])).push(`brightness(${v})`); continue; }
      if (k === 'draw') { setDraw(el, parseFloat(v)); continue; }
      if (k.startsWith('attr:')) { el.setAttribute(k.slice(5), v); continue; }
      if (k.startsWith('--')) { el.style.setProperty(k, v); continue; }
      el.style[k] = v;
    }
    if ('blur' in vals || 'brightness' in vals) el.style.filter = filt ? filt.join(' ') : '';
    if (tf) { el.style.transform = composeTransform(tf); if (S.origin) el.style.transformOrigin = S.origin; }
    for (const f of S.fns) f(local);
  }
}

// SVG stroke draw-on via dasharray/dashoffset (length from getTotalLength, fallback pathLength=1)
export function setDraw(el, p) {
  let L = el.__vkLen;
  if (!L) { try { L = el.getTotalLength(); } catch (e) { L = 0; } if (!L) { el.setAttribute('pathLength', '1'); L = 1; } el.__vkLen = L; el.style.strokeDasharray = L + ' ' + L; }
  el.style.strokeDashoffset = String(L * (1 - p));
}

function defaultVal(el, k) {
  if (k in TF_ID) return TF_ID[k];
  if (typeof getComputedStyle === 'undefined') return '0';
  if (k.startsWith('attr:')) return el.getAttribute(k.slice(5)) || '0';
  if (k.startsWith('--')) return getComputedStyle(el).getPropertyValue(k).trim() || '0';
  const v = getComputedStyle(el)[k]; return v == null || v === '' ? '0' : v;
}
