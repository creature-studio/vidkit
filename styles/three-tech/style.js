// 3D tech pack runtime (needs dist/vidkit-three.js — registered by that bundle, so core pages never see it):
// near-black studio, Archivo hero title with a scanning light line, cyan/violet accents, ring + spark signature,
// dark synth-pulse music bed, and `stage3d()` — the pack's vk.three look (post, environment, backdrop, sweeps)
// as layer/module presets:  const st = v.style.base.stage3d;  sc.three(vk.three.turntable(st.turntable({...})), st.layer({...}))
export default vk => {
  const K = vk.style.kit, T = vk.three, P3 = {
    post: { exposure: .95, grade: 'cyber', bloom: { strength: .6, threshold: 1 }, vignette: .22, grain: .025, ca: .0012 },
    env: { accent: 0x36d6ff, rimColor: 0x9b6bff },
    backdrop: { top: 0x03040a, horizon: 0x0d1424, glow: 0x1b2f55 },
    colors: ['#36d6ff', '#9b6bff'],
  };
  const merge = (a, b) => { const o = { ...a }; for (const k in b || {}) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? { ...a[k], ...b[k] } : b[k]; return o; };
  return {
    stage3d: {
      preset: P3,
      layer: (o = {}) => merge({ post: P3.post }, o),
      turntable: (o = {}) => merge({ env: 'studio', envOptions: P3.env, backdrop: P3.backdrop, sweep: { every: 3.2, d: 1.4, color: 0xcfefff, t: .4 } }, o),
      particles: (o = {}) => merge({ n: 120000, flare: 1 }, o),
      colors: P3.colors,
    },
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .24), acc = S.colour('accent'), acc2 = S.colour('accent2');
      const el = K.overlay(sc, `<div class="t3-t" style="position:absolute;left:0;right:0;top:${p.y - 70}px;text-align:center">
        <div class="t3-k" style="font:500 22px 'JetBrains Mono',monospace;letter-spacing:.32em;color:#8f9bbd;text-transform:uppercase"><span style="color:${acc}">▍</span>${K.esc(o.kicker || 'vk.three · 3D')}</div>
        <div class="t3-h" style="position:relative;display:inline-block;font:900 ${o.size || 112}px/1.05 Archivo,'Noto Sans SC',sans-serif;color:#fff;letter-spacing:-.01em;margin-top:8px;text-shadow:0 0 24px rgba(54,214,255,.25)">${K.esc(text)}
          <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none"><div class="t3-scan" style="position:absolute;top:0;bottom:0;width:18%;left:0;background:linear-gradient(90deg,transparent,rgba(190,240,255,.85),transparent);mix-blend-mode:overlay"></div></div></div>
        <div class="t3-b" style="height:3px;width:${Math.min(560, [...String(text)].length * 80)}px;margin:16px auto 0;background:linear-gradient(90deg,${acc},${acc2});transform-origin:50% 50%"></div>
        ${o.sub ? `<div class="t3-s" style="font:500 26px 'Noto Sans SC',sans-serif;color:#c8d4f0;margin-top:14px;letter-spacing:.04em">${K.esc(o.sub)}</div>` : ''}</div>`, { z: 20 });
      const [k, h, b, s2, scan] = ['.t3-k', '.t3-h', '.t3-b', '.t3-s', '.t3-scan'].map(q => el.querySelector(q));
      sc.on(l => {
        const a = K.win(l, p.at, .3, p.out, .3), u = K.ease.out(K.prog(l, p.at, .6));
        K.css(el, 'opacity', a.toFixed(3));
        K.css(h, 'transform', `translateY(${(24 * (1 - u)).toFixed(1)}px)`); K.css(h, 'filter', `blur(${(8 * (1 - u)).toFixed(2)}px)`); K.css(h, 'opacity', u.toFixed(3));
        K.css(k, 'opacity', K.prog(l, p.at + .15, .3).toFixed(3));
        K.css(b, 'transform', `scaleX(${K.ease.out(K.prog(l, p.at + .25, .5)).toFixed(3)})`);
        const sp = K.prog(l, p.at + .5, .9); K.css(scan, 'left', (-20 + 120 * sp).toFixed(1) + '%'); K.css(scan, 'opacity', (sp > 0 && sp < 1 ? 1 : 0).toFixed(0));
        if (s2) K.css(s2, 'opacity', K.prog(l, p.at + .45, .35).toFixed(3));
      });
      if (o.sfx !== false) S.sfx(sc, 'title', p.at + .05);
      return el;
    },
    // signature (2D overlay part): thin cyan/violet rings + additive spark burst; the 3D part is the particle assemble
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), acc = S.colour('accent'), acc2 = S.colour('accent2');
      const svg = K.svgLayer(sc, { fixed: true, z: 14 });
      const rings = [0, 1].map(i => K.svgEl(svg, 'circle', { cx: x, cy: y, r: 10, fill: 'none', stroke: i ? acc2 : acc, 'stroke-width': 3 - i, opacity: 0 }));
      sc.on(l => rings.forEach((r, i) => { const u = K.prog(l, at + i * .14, .9); K.attr(r, 'r', (16 + 300 * K.ease.out(u)).toFixed(1)); K.attr(r, 'opacity', (u > 0 && u < 1 ? (1 - u) * .8 : 0).toFixed(3)); }));
      K.burst(sc, { at, x: o.x, y: o.y, n: 50, shape: 'spark', colors: ['#ffffff', acc, acc2], speed: [300, 800], gravity: 0, drag: 2.6, life: [.4, 1], size: [5, 12], blend: 'add', seed: 7 });
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    music(v, o = {}) {
      return vk.style.bed(v, { bpm: o.bpm || 96, gain: o.gain != null ? o.gain : .7, seed: 4, fadeIn: o.fadeIn != null ? o.fadeIn : .6, from: o.from || 0, to: o.to, tracks: [
        { voice: 'thump', steps: 'x.......x.......', gain: .55, from: o.kickFrom != null ? o.kickFrom : 1 },
        { voice: 'shaker', steps: '..x...x...x...x.', gain: .5, from: 1 },
        { voice: 'hat', steps: '....x.......x...', gain: .25, from: 2 },
        { voice: 'saw', steps: 'x.x.x.x.x.x.x.x.', notes: [73.42, 87.31, 110, 146.83, 110, 87.31], gain: .32 },
        { voice: 'kalimba', steps: 'x.......x.......', notes: [587.33, 698.46, 880, 659.25], gain: .3, from: 2 },
        { voice: 'chime', steps: 'x...............................', notes: [1174.66, 1318.5], gain: .18, from: 1 },
      ] });
    },
  };
};
