// Text effects (entrances, emphasis, kinetic type). Registered into registry.fx.
import { registry } from '../core/plugin.js';
import { getEase, EASE } from '../core/ease.js';
import { hash } from '../core/random.js';
import { clamp01 } from '../core/time.js';

const FX = registry.fx;

/* ---------- simple from/to presets (combinable: "up blur") ---------- */
Object.assign(FX, {
  fade: { from: { opacity: 0 }, to: { opacity: 1 } },
  up: { make: o => ({ from: { opacity: 0, y: o.dist || 28 }, to: { opacity: 1, y: 0 } }) },
  down: { make: o => ({ from: { opacity: 0, y: -(o.dist || 28) }, to: { opacity: 1, y: 0 } }) },
  left: { make: o => ({ from: { opacity: 0, x: -(o.dist || 44) }, to: { opacity: 1, x: 0 } }) },   // enters from the left
  right: { make: o => ({ from: { opacity: 0, x: o.dist || 44 }, to: { opacity: 1, x: 0 } }) },
  scale: { from: { opacity: 0, scale: .9 }, to: { opacity: 1, scale: 1 } },
  pop: { from: { opacity: 0, scale: .6 }, to: { opacity: 1, scale: 1 }, ease: 'outBack' },
  zoom: { from: { opacity: 0, scale: 1.15 }, to: { opacity: 1, scale: 1 } },
  blur: { from: { opacity: 0, blur: 14 }, to: { opacity: 1, blur: 0 } },
  rise: { make: o => ({ from: { opacity: 0, y: o.dist || 40, blur: 8 }, to: { opacity: 1, y: 0, blur: 0 }, ease: 'outExpo' }) },
  wipe: { from: { clipPath: 'inset(0% 100% 0% 0%)' }, to: { clipPath: 'inset(0% 0% 0% 0%)' }, instant: { opacity: 1 } },
  'wipe-left': { from: { clipPath: 'inset(0% 0% 0% 100%)' }, to: { clipPath: 'inset(0% 0% 0% 0%)' }, instant: { opacity: 1 } },
  'wipe-up': { from: { clipPath: 'inset(100% 0% 0% 0%)' }, to: { clipPath: 'inset(0% 0% 0% 0%)' }, instant: { opacity: 1 } },
  'wipe-down': { from: { clipPath: 'inset(0% 0% 100% 0%)' }, to: { clipPath: 'inset(0% 0% 0% 0%)' }, instant: { opacity: 1 } },
  reveal: { from: { y: '100%', clipPath: 'inset(0% 0% 100% 0%)' }, to: { y: '0%', clipPath: 'inset(0% 0% 0% 0%)' }, instant: { opacity: 1 }, ease: 'outExpo' },
  grow: { from: { scaleX: 0 }, to: { scaleX: 1 }, instant: { opacity: 1 }, origin: 'left center' },
  'grow-y': { from: { scaleY: 0 }, to: { scaleY: 1 }, instant: { opacity: 1 }, origin: 'center bottom' },
  flip: { from: { opacity: 0, rotateX: -80 }, to: { opacity: 1, rotateX: 0 }, origin: 'center bottom', ease: 'outBack' },
  stretch: { from: { fontStretch: '62%', letterSpacing: '0.12em', opacity: 0 }, to: { fontStretch: '100%', letterSpacing: '0em', opacity: 1 }, ease: 'outExpo' }, // needs a variable-width font (Archivo)
  none: { from: {}, to: {} },
});

/* ---------- splitting ---------- */
// chars: every glyph wrapped (letters keeps a clip box per glyph); words: whitespace tokens, or "|" separated tokens,
// or per-glyph for CJK strings without spaces. Nested markup (<b>, .vk-em spans) is preserved.
export function split(el, mode) {
  const key = '__vk_' + mode; if (el[key]) return el[key];
  const pieces = [], texts = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (tw.nextNode()) texts.push(tw.currentNode);
  texts.forEach(tn => {
    const frag = document.createDocumentFragment(), str = tn.textContent;
    let tokens;
    if (mode === 'words') tokens = str.includes('|') ? str.split('|') : /\S\s+\S/.test(str) ? str.split(/(\s+)/) : Array.from(str);
    else tokens = str.split(/(\s+)/);
    tokens.forEach(tok => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
      if (mode === 'words') { const w = document.createElement('span'); w.className = 'vk-word'; w.textContent = tok; frag.appendChild(w); pieces.push(w); return; }
      const word = document.createElement('span'); word.className = 'vk-wordwrap';
      Array.from(tok).forEach(ch => {
        const inner = document.createElement('span'); inner.className = mode === 'letters' ? 'vk-chi' : 'vk-c'; inner.textContent = ch;
        if (mode === 'letters') { const box = document.createElement('span'); box.className = 'vk-ch'; box.appendChild(inner); word.appendChild(box); }
        else word.appendChild(inner);
        pieces.push(inner);
      });
      frag.appendChild(word);
    });
    tn.parentNode.replaceChild(frag, tn);
  });
  el[key] = pieces; return pieces;
}

function perPiece(mode, A, B, defEase, defD, defEach, exitTo) {
  return (el, o, api) => {
    const pieces = split(el, mode === 'words' ? 'words' : mode === 'clip' ? 'letters' : 'chars');
    const each = o.each != null ? o.each : defEach;
    let a = typeof A === 'function' ? A(o, el) : A, b = typeof B === 'function' ? B(o, el) : B, ease = o.ease || defEase;
    if (api.exit) { [a, b] = [b, exitTo || a]; ease = o.ease || 'inCubic'; }
    api.tween(pieces, { t: o.t, d: o.d || defD, ease, stagger: o.stagger || each, from: a, to: b, origin: o.origin });
  };
}
// letters slide up from below their own baseline clip (swiss revealText)
FX.letters = perPiece('clip', { y: '110%' }, { y: '0%' }, 'swift', .6, .035, { y: '-110%' });
FX['letters-fade'] = perPiece('chars', { opacity: 0, y: '0.35em' }, { opacity: 1, y: '0em' }, 'outCubic', .5, .03);
FX['letters-blur'] = perPiece('chars', { opacity: 0, blur: 12, scale: 1.3 }, { opacity: 1, blur: 0, scale: 1 }, 'outExpo', .7, .04);
FX.domino = (el, o, api) => { el.style.perspective = '800px'; perPiece('chars', { rotateX: -95, opacity: 0 }, { rotateX: 0, opacity: 1 }, 'outBack', .55, .05)(el, { origin: '50% 85%', ...o }, api); };
// words pop 1.45 → 1 with overshoot
FX.words = perPiece('words', { opacity: 0, scale: 1.45 }, { opacity: 1, scale: 1 }, 'outBack', .5, .09);
FX['words-up'] = perPiece('words', { opacity: 0, y: '0.6em' }, { opacity: 1, y: '0em' }, 'outExpo', .6, .08);

// squash & stretch pop per glyph: scale(sc/sq, sc*sq)
FX.squash = (el, o, api) => {
  const pieces = split(el, 'chars'), each = o.each != null ? o.each : .05, d = o.d || .55;
  pieces.forEach((c, i) => api.fn(c, local => {
    const p = clamp01((local - o.t - i * each) / d);
    if (api.exit) { const q = 1 - p; c.style.opacity = q; c.style.transform = `scale(${q})`; return; }
    const sc = EASE.outBack(p), sq = 1 + .45 * Math.sin(Math.min(1, p * 1.6) * Math.PI) * (1 - p);
    c.style.opacity = p > 0 ? 1 : 0; c.style.transform = `scale(${sc / sq},${sc * sq})`; c.style.transformOrigin = '50% 90%';
  }));
};
// letters fly in from seeded scattered positions and assemble
FX.assemble = (el, o, api) => {
  const pieces = split(el, 'chars'), n = pieces.length, d = o.d || .9, spread = o.spread || 1, seed = o.seed || 7;
  pieces.forEach((c, i) => {
    const r1 = hash(i * 3.1 + seed), r2 = hash(i * 5.7 + seed), r3 = hash(i * 9.3 + seed), delay = hash(i * 1.9 + seed) * (o.each != null ? o.each * n : .35);
    const from = { opacity: 0, x: `${((r1 - .5) * 3 * spread).toFixed(2)}em`, y: `${((r2 - .5) * 2.2 * spread).toFixed(2)}em`, rotate: (r3 - .5) * 160, scale: .3 + r2 };
    const to = { opacity: 1, x: '0em', y: '0em', rotate: 0, scale: 1 };
    api.tween(c, { t: o.t + delay, d, ease: o.ease || 'outQuart', from: api.exit ? to : from, to: api.exit ? from : to });
  });
};
// persistent sine wave per glyph (starts at o.t)
FX.wave = (el, o, api) => {
  const pieces = split(el, 'chars'), amp = o.amp || .12, speed = o.speed || 6;
  pieces.forEach((c, i) => api.fn(c, local => { const k = clamp01((local - o.t) / .4); c.style.transform = `translateY(${(-Math.sin(local * speed - i * .55) * amp * k).toFixed(3)}em)`; }));
};

/* ---------- typewriter ---------- */
// o: {t, cps, text, caret:true, reserve:true}. reserve keeps the final width so centred lines don't drift.
FX.type = (el, o, api) => {
  const full = o.text != null ? o.text : (el.getAttribute('data-text') || el.textContent);
  const chars = Array.from(full), cps = o.cps || 30, t0 = o.t || 0, caret = o.caret !== false;
  el.textContent = '';
  const typed = document.createElement('span'), rest = document.createElement('span');
  typed.style.position = 'relative'; rest.style.visibility = 'hidden';
  el.appendChild(typed); if (o.reserve !== false) el.appendChild(rest);
  api.fn(el, local => {
    let n = Math.max(0, Math.floor((local - t0) * cps + 1e-6)); if (n > chars.length) n = chars.length;
    if (api.exit) n = chars.length - n;
    const s = chars.slice(0, n).join(''), r = chars.slice(n).join('');
    if (typed.textContent !== s) typed.textContent = s;
    if (rest.textContent !== r) rest.textContent = r;
    const typing = n < chars.length && local >= t0;
    typed.classList.toggle('vk-caret', caret && local >= t0 - .3 && (typing || Math.floor(local * 2) % 2 === 0) && (o.caretHold == null || local < t0 + chars.length / cps + o.caretHold));
  });
  if (api.scene && api.scene.video.cfg.autoSfx && !api.exit && o.sfx !== false) for (let i = 0; i < chars.length; i += 2) api.scene.sfx(t0 + i / cps, 'tick', .22);
};
// caret as absolutely positioned glyph → no layout shift
if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = '.vk-caret::after{position:absolute;left:100%;top:0}'; document.head.appendChild(st); }

/* ---------- scramble / decode ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\@$';
FX.scramble = (el, o, api) => {
  const full = o.text != null ? o.text : el.textContent, chars = Array.from(full), each = o.each != null ? o.each : .04, d = o.d || .5, set = o.glyphs || GLYPHS, rate = o.rate || 20;
  api.fn(el, local => {
    const f = Math.floor(local * rate); let s = '';
    chars.forEach((ch, i) => {
      const tDone = o.t + i * each + d, tShow = o.t + i * each * .35;
      if (/\s/.test(ch)) { s += ch; return; }
      if (api.exit ? local < o.t + i * each : local >= tDone) s += ch;
      else if (local >= tShow) s += set[Math.floor(hash(f * 13.1 + i * 7.3) * set.length)];
      else s += '\u00a0';
    });
    if (el.textContent !== s) el.textContent = s;
  });
};
FX.decode = FX.scramble;

/* ---------- counters ---------- */
// o: {t, d, from, to, decimals, sep, prefix, suffix, format(v)}
FX.count = (el, o, api) => {
  const a = +o.from || 0, b = o.to != null ? +o.to : parseFloat(el.textContent) || 0, dec = o.decimals | 0, sep = o.sep == null ? '' : o.sep;
  const d = o.d || 1.2, ease = getEase(o.ease || 'outExpo'), pre = o.prefix || '', suf = o.suffix || '';
  const fmt = o.format || (v => { let s = v.toFixed(dec); if (sep) { const p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep); s = p.join('.'); } return pre + s + suf; });
  api.fn(el, local => { const p = clamp01((local - o.t) / d); const s = fmt(a + (b - a) * ease(api.exit ? 1 - p : p)); if (el.textContent !== s) el.textContent = s; });
};

/* ---------- emphasis: marker sweep, underline draw, colour swap ---------- */
function sweep(cls) {
  return (el, o, api) => {
    let targets = [...el.querySelectorAll('.' + cls)];
    if (!targets.length) {
      if (getComputedStyle(el).display === 'inline') { el.classList.add(cls); targets = [el]; }
      else { const s = document.createElement('span'); s.className = cls; while (el.firstChild) s.appendChild(el.firstChild); el.appendChild(s); targets = [s]; }
    }
    api.tween(targets, { t: o.t, d: o.d || .6, ease: o.ease || 'inOutCubic', stagger: o.each != null ? o.each : .25, from: { '--p': api.exit ? '100%' : '0%' }, to: { '--p': api.exit ? '0%' : '100%' } });
  };
}
FX.highlight = sweep('vk-mark'); FX.marker = FX.highlight;
FX.underline = sweep('vk-ul');
FX.swap = (el, o, api) => {
  const c0 = getComputedStyle(el).color, c1 = o.color || api.theme.modes[api.scene.mode || api.theme.mode].accent;
  api.tween(el, { t: o.t, d: o.d || .3, ease: o.ease || 'outCubic', from: { color: api.exit ? c1 : c0 }, to: { color: api.exit ? c0 : c1 } });
};

/* ---------- kinetic stacking ---------- */
// Lines (split on "\n" or <br>) are each scaled to the full box width, then slam in one after another from
// alternating sides (CodeRabbit "hero" / justified stack). o: {each, width, max, align}
FX.stack = (el, o, api) => {
  const html = el.innerHTML.split(/<br\s*\/?>|\n/i).filter(s => s.trim());
  el.innerHTML = ''; el.style.display = 'block';
  const lines = html.map(h => { const l = document.createElement('div'); l.className = 'vk-stack-line'; l.style.cssText = 'white-space:nowrap;line-height:.98;overflow:hidden;padding:.02em 0'; const s = document.createElement('span'); s.style.display = 'inline-block'; s.innerHTML = h; l.appendChild(s); el.appendChild(l); return { l, s }; });
  api.after(() => withVisible(api.scene, () => {
    const W = o.width || el.getBoundingClientRect().width / scaleOf(el) || 600;
    lines.forEach(({ l, s }) => {
      const fs = parseFloat(getComputedStyle(l).fontSize), w = s.getBoundingClientRect().width / scaleOf(el);
      if (w > 0) l.style.fontSize = Math.min(o.max || fs * 3, fs * W / w * .995) + 'px';
    });
  }));
  const each = o.each != null ? o.each : .22;
  lines.forEach(({ s }, i) => {
    const dir = i % 2 ? 1 : -1, a = { x: (dir * 105) + '%', opacity: 1 }, b = { x: '0%', opacity: 1 };
    api.tween(s, { t: o.t + i * each, d: o.d || .55, ease: o.ease || 'outExpo', from: api.exit ? b : a, to: api.exit ? { x: (-dir * 105) + '%', opacity: 1 } : b });
  });
};

export function withVisible(scene, fn) {
  const el = scene && scene.el, was = el && el.classList.contains('on');
  if (el && !was) el.classList.add('on');
  const cam = scene && scene.cam, tf = cam && cam.style.transform; if (cam) cam.style.transform = '';
  try { fn(); } finally { if (el && !was) el.classList.remove('on'); if (cam) cam.style.transform = tf; }
}
function scaleOf(el) { const st = document.getElementById('stage'); if (!st) return 1; const r = st.getBoundingClientRect(); return r.width / st.offsetWidth || 1; }
