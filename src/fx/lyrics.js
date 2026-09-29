// Lyrics & music visuals (Phase 2): word-synced kinetic lyric lines, a band-energy spectrum, and the
// lyricVideo() preset that builds a whole beat-cut lyric video from `vk align` + `vk analyze` output.
import { node, h, size, len, md } from '../authoring/node.js';
import { registry } from '../core/plugin.js';
import { EASE } from '../core/ease.js';
import { mapWords } from '../audio/words.js';
import { hash } from '../core/random.js';

const B = registry.blocks;
const c01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* vk.lyrics(cue, o) — one lyric line whose words animate exactly on their sung/spoken times.
 * cue: [start, end, text, words] (v.lyrics[i], alignToCues) or {text, words}; word times are absolute video seconds.
 * o.style: 'pop' (words pop in on time, current word accented) | 'rise' (rise + unblur) | 'karaoke' (line shown, colour
 *          sweeps through each word) | 'slam' (one huge word at a time, scaled to fit) ; o.d entrance seconds per word;
 * o.color / o.accent / o.dim, o.beat (current word pulses on beats, e.g. .08), size / w / align like any node. */
B.lyrics = (cue, o = {}) => node({ fx: false, ...o }, function lyrics(ctx) {
  const v = ctx.video, style = o.style || 'pop', d = o.d || (style === 'slam' ? .16 : .22);
  const [, , text, words] = Array.isArray(cue) ? cue : [cue.start, cue.end, cue.text, cue.words];
  const el = h('div', 'vk-lyric vk-lyric-' + style);
  el.style.cssText = `font-family:${o.font === 'sans' ? 'var(--vk-sans)' : 'var(--vk-display),var(--vk-sans)'};font-weight:${o.weight || 900};line-height:1.12;` +
    `font-size:${size(ctx, o.size || (style === 'slam' ? 150 : 64))};text-align:${o.align || 'center'};max-width:${len(ctx, o.w || .86, 'x')};color:${o.color ? `var(--${o.color},${o.color})` : 'var(--fg)'}` +
    (style === 'slam' ? `;position:relative;width:${len(ctx, o.w || .86, 'x')};height:1.3em;white-space:nowrap` : '');
  const accent = o.accent || 'var(--accent)', dim = o.dim != null ? o.dim : .42;
  const P = mapWords(text, words), W = [];
  P.forEach(p => {
    if (p.wi < 0) { const s = h('span', 'vk-lp', esc(p.s), el); s.style.whiteSpace = 'pre'; if (W.length) W[W.length - 1].tail.push(s); else if (style === 'slam') s.style.display = 'none'; return; }
    const s = h('span', 'vk-lw', esc(p.s), el); s.style.display = 'inline-block'; s.style.whiteSpace = 'pre';
    if (style === 'slam') s.style.cssText += ';position:absolute;left:50%;top:50%;translate:-50% -50%;transform-origin:50% 50%';
    W.push({ s, w: words[p.wi], tail: [] });
  });
  if (style === 'slam') W.forEach(x => x.tail.forEach(t => t.style.display = 'none'));
  const lastEnd = W.length ? (W[W.length - 1].w.end || W[W.length - 1].w.t + .3) : 0;
  ctx.extend(lastEnd - ctx.scene.start + .3);
  let fit = null; // slam: per-word scale to fit width (measured once fonts are ready)
  if (style === 'slam') v.afterFonts.push(() => { const maxW = el.clientWidth || v.W * .8; fit = W.map(x => Math.min(1, maxW / Math.max(1, x.s.offsetWidth))); });
  ctx.scene.on((local, p, t) => {
    const tt = t + v.beats.leadT, bp = o.beat ? v.beats.pulse(t) : 0;
    let cur = -1; W.forEach((x, i) => { if (tt >= x.w.t) cur = i; });
    W.forEach((x, i) => {
      const a = (tt - x.w.t) / d, s = x.s, on = i === cur;
      if (style === 'karaoke') {
        const pr = c01((tt - x.w.t) / Math.max(.05, (x.w.end || x.w.t + .2) - x.w.t));
        s.style.color = 'transparent'; s.style.webkitBackgroundClip = 'text'; s.style.backgroundClip = 'text';
        s.style.backgroundImage = `linear-gradient(90deg, ${accent} ${pr * 100}%, color-mix(in srgb, currentColor ${dim * 100}%, transparent) ${pr * 100}%)`;
        s.style.transform = on && o.beat ? `scale(${1 + o.beat * bp})` : '';
        return;
      }
      if (style === 'slam') {
        const e = EASE.outCubic(c01(a)), show = on && a >= 0;
        s.style.opacity = show ? '1' : '0';
        s.style.transform = show ? `scale(${((fit && fit[i]) || 1) * (1.35 - .35 * e) * (1 + (o.beat || 0) * bp)}) rotate(${(hash(i + 7) - .5) * 6 * (1 - e)}deg)` : 'scale(.5)';
        s.style.color = hash(i * 3 + 1) > .7 ? accent : '';
        return;
      }
      const e = style === 'rise' ? EASE.outExpo(c01(a)) : EASE.outBack(c01(a)), vis = a >= 0;
      s.style.opacity = vis ? String(c01(a * 3)) : '0';
      s.style.transform = !vis ? 'translateY(.35em) scale(.5)' : style === 'rise' ? `translateY(${(1 - e) * .6}em)` : `translateY(${(1 - e) * .3}em) scale(${(.55 + .45 * e) * (on ? 1 + (o.beat || 0) * bp : 1)})`;
      if (style === 'rise') s.style.filter = vis && a < 1 ? `blur(${(1 - e) * 8}px)` : '';
      s.style.color = on ? accent : '';
      x.tail.forEach(tn => tn.style.opacity = s.style.opacity);
    });
  });
  return el;
});

/* vk.spectrum(o) — bars driven by the analysed mel-band envelope (deterministic; no realtime FFT).
 * o: {bars: 8|16|32 (interpolated), h: 120, w: .6, gap: 6, color, mirror, smooth: .03, band: 'bands' | 'lmh', floor: .04} */
B.spectrum = (o = {}) => node({ fx: 'fade', ...o }, function spectrum(ctx) {
  const v = ctx.video, n = o.bars || 16, px = ctx.px, H = px(o.h || 120);
  const el = h('div', 'vk-spectrum');
  el.style.cssText = `display:flex;align-items:${o.mirror ? 'center' : 'flex-end'};gap:${px(o.gap != null ? o.gap : 6)}px;height:${H}px;width:${len(ctx, o.w || .6, 'x')}`;
  const bars = Array.from({ length: n }, () => { const b = h('i', null, null, el); b.style.cssText = `flex:1;height:100%;border-radius:${px(4)}px;background:${o.color ? `var(--${o.color},${o.color})` : 'var(--accent)'};transform-origin:50% ${o.mirror ? '50%' : '100%'}`; return b; });
  ctx.scene.on((local, p, t) => {
    const M = v.music; const nb = M && M.env.bands ? M.env.bands.length : 0;
    bars.forEach((b, i) => {
      let e = 0;
      if (nb) { const x = i * (nb - 1) / Math.max(1, n - 1), j = Math.floor(x), f = x - j; e = M.energy(t, j, o.smooth != null ? o.smooth : .03) * (1 - f) + (j + 1 < nb ? M.energy(t, j + 1, o.smooth != null ? o.smooth : .03) * f : 0); }
      else e = v.beats.pulse(t, 5) * (.4 + .6 * hash(i));
      b.style.transform = `scaleY(${Math.max(o.floor != null ? o.floor : .04, e).toFixed(3)})`;
    });
  });
  return el;
});

/* vk.lyricVideo(o) — whole lyric video: one scene per lyric line (lines sharing a bar share a scene), every cut on the
 * bar line (or beat) before the first sung word, styles/backgrounds per detected music section, beat flash on
 * high-energy sections, spectrum, intro/outro cards. Needs vk.video({music, beats, lyrics}).
 * o: {lines, intro:{title, sub, label}, outro:{title, sub, small}, styles:['pop','rise','slam','karaoke'], sectionStyles:{A:'pop'},
 *     bgs:[…], transitions:['none','flash:0.25',…], cut:'bar'|'beat', flash:.35, spectrum:true, zoom:.035, size, end} */
export function lyricVideo(vk, o = {}) {
  const v = vk.current, G = v.beats, M = v.music, lines = (o.lines || v.lyrics).filter(l => l[3] && l[3].length);
  if (!lines.length) throw new Error('[vk] lyricVideo: no lyric lines (vk.video({lyrics:"song.align.json"}))');
  const lead = G.leadT, styles = o.styles || ['pop', 'rise', 'slam', 'karaoke'];
  const bgs = o.bgs || ['dark', 'accent', [{ type: 'dots', drift: 24 }], 'light', [{ type: 'grid', drift: 30 }]];
  const trs = o.transitions || ['none', 'flash:0.25', 'whip-left:0.3', 'zoom-in:0.3'];
  const secs = M ? M.sections : [];
  const secOf = t => { for (let i = secs.length - 1; i >= 0; i--) if (t >= secs[i].start - .05) return secs[i]; return secs[0] || { index: 0, label: 'A', energy: .5 }; };
  const medE = secs.length ? secs.map(s => s.energy).sort((a, b) => a - b)[Math.floor(secs.length / 2)] : .5;
  const tol = o.cutTolerance != null ? o.cutTolerance : .15;
  const cutBefore = t => { // latest grid point ≤ first word + tol (a word sung on the downbeat cuts on that downbeat)
    const x = t + tol + lead;
    if (o.cut !== 'beat') { const b = G.measure(Math.floor(G.barIndex(x))); if (b <= x) return b; }
    return G.at(Math.floor(G.index(x)));
  };
  // group lines into scenes by cut time
  const groups = [];
  lines.forEach(l => {
    let c = cutBefore(l[3][0].t); const g = groups[groups.length - 1];
    if (g && c <= g.cut + 1e-3) { const cb = G.at(Math.floor(G.index(l[3][0].t + tol + lead))); if (cb > g.cut + .3) c = cb; else { g.lines.push(l); return; } }
    groups.push({ cut: c, lines: [l] });
  });
  const lastEnd = Math.max(...lines.map(l => l[3][l[3].length - 1].end || l[3][l[3].length - 1].t + .3));
  const endLyrics = G.measure(Math.ceil(G.barIndex(lastEnd + .4 + lead)));
  const total = o.end || Math.min(M ? M.duration : Infinity, endLyrics + (o.outro ? G.meter * G.beat * 2 : 0));
  const sceneFor = (name, endAbs, opts, nodes) => vk.scene(name, { ...opts, end: endAbs - lead }, nodes);
  const flashNode = amt => vk.el(ctx => { const e = document.createElement('div'); e.style.cssText = 'position:absolute;inset:0;background:#fff;pointer-events:none;z-index:5;opacity:0'; ctx.scene.on((l, p, t) => { e.style.opacity = (amt * G.pulse(t, 9)).toFixed(3); }); return e; }, { fixed: true });
  // intro
  if (groups[0].cut > 1.2) {
    const I = o.intro || {};
    sceneFor('intro', groups[0].cut, { bg: I.bg || [{ type: 'mesh' }], mode: 'dark', beat: { scale: .025 } }, [
      I.label ? vk.label(I.label, { at: .2 }) : null,
      vk.title(I.title || document.title, { fx: 'letters', at: 'b:1', size: I.size || 110, beat: { scale: .05 }, style: 'text-shadow:0 2px 10px rgba(0,0,0,.3)' }),
      I.sub ? vk.sub(I.sub, { at: 'b:3', fx: 'up', style: 'text-shadow:0 2px 14px rgba(0,0,0,.55)' }) : null,
      o.spectrum !== false ? vk.spectrum({ at: .3, bars: 24, h: 90, w: .5, mt: 36, color: 'fg' }) : null,
    ]);
  }
  const perSec = {};
  groups.forEach((g, i) => {
    const sec = secOf(g.cut + .1), hot = secs.length < 2 || sec.energy > medE, si = sec.index || 0, k = perSec[si] = (perSec[si] == null ? 0 : perSec[si] + 1);
    const ss = o.sectionStyles && o.sectionStyles[sec.label], style = ss ? [].concat(ss)[k % [].concat(ss).length] : styles[(si + k) % styles.length];
    const st = g.lines.length > 1 && style === 'slam' ? 'pop' : style;
    const endAbs = i + 1 < groups.length ? groups[i + 1].cut : endLyrics;
    const bg = bgs[(si + k) % bgs.length];
    sceneFor(`${sec.label}${i + 1}`, endAbs, { bg, mode: bg === 'light' || bg === 'accent' ? bg : 'dark', transition: i === 0 && groups[0].cut <= 1.2 ? 'none' : trs[(i + si) % trs.length], beat: hot ? { scale: o.zoom != null ? o.zoom : .035 } : null,
      energy: o.energy !== false ? (o.energy || { brightness: [.8, 1.12], band: 'low', smooth: .05 }) : null }, [
      ...g.lines.map((l, j) => vk.lyrics(l, { style: st, size: o.size || (st === 'slam' ? 150 : g.lines.length > 1 ? 60 : 84), mt: j ? 18 : 0, beat: hot ? .06 : 0 })),
      o.spectrum !== false && hot ? vk.spectrum({ at: .1, bars: 32, h: 70, w: .7, pos: { x: .15, bottom: .06 }, mirror: false, color: 'muted' }) : null,
      hot && o.flash !== 0 ? flashNode(o.flash || .35) : null,
    ]);
  });
  if (o.outro && total > endLyrics + .5) {
    const O = o.outro;
    sceneFor('outro', total + lead, { bg: O.bg || 'dark', transition: 'fade:0.6' }, [
      vk.title(O.title || '', { fx: 'letters-blur', at: .3, size: O.size || 84, beat: { scale: .03 } }),
      O.sub ? vk.sub(O.sub, { at: 1, fx: 'up' }) : null,
      O.small ? vk.small(O.small, { at: 1.6, mt: 30 }) : null,
    ]);
  }
  return v;
}
