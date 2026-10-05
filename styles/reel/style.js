// Motion-reel ("动态海报") pack runtime: a locked poster frame in paper / ink + four flat colours, Archivo Black
// display type slammed in with echo ghosts and hard shadows, stripe cover transitions on the bar line, beat accents
// (vk.accents: shockwave rings + radial burst + white flash) as the signature effect, and a synthesized 128 BPM drum
// bed. Its voices (reel-*) and the cover defaults are installed only when a video uses the pack.
export default vk => {
  const K = vk.style.kit, G = vk.geom, A = vk.accents;
  const C = { ink: '#0A0A12', paper: '#F4EFE6', pink: '#FF3B8B', yellow: '#FFD23F', cyan: '#25E1E8', violet: '#5B3BFF' };
  // ---- 128 BPM drum kit (OfflineAudioContext voices; f = extra parameter) ----
  const voices = {
    'reel-kick': (k, t, v) => k.tone(t, 'sine', 170, 45, .3, .95 * v),
    'reel-hat': (k, t, v) => k.noise(t, .05, 'highpass', 8000, 1, .22 * v),
    'reel-clap': (k, t, v) => [0, .012, .024].forEach(o => k.noise(t + o, .09, 'bandpass', 1800, 1.2, .35 * v)),
    // whoosh peaking at t (starts 0.25 s earlier), band sweeping 300 → 5000 Hz
    'reel-whoosh': (k, t, v) => { const st = Math.max(0, t - .25), f = k.noise(st, .5, 'bandpass', 300, .8, .5 * v, .25); f.frequency.setValueAtTime(300, st); f.frequency.exponentialRampToValueAtTime(5000, st + .5); },
    // riser ending at t; f = length in seconds (default 2)
    'reel-riser': (k, t, v, f) => { const d = f || 2, st = Math.max(0, t - d), fl = k.noise(st, .08, 'highpass', 400, .7, .4 * v, d * .95); fl.frequency.setValueAtTime(400, st); fl.frequency.exponentialRampToValueAtTime(7000, st + d); k.tone(st, 'sawtooth', 110, 880, d * 1.9, .05 * v); },
    'reel-blip': (k, t, v, f) => k.tone(t, 'square', f || 420, (f || 420) * .4, .12, .12 * v),
    'reel-ping': (k, t, v, f) => k.tone(t, 'triangle', f || 880, 0, .12, .2 * v),
    'reel-click': (k, t, v) => k.tone(t, 'sine', 2200, 1500, .05, .25 * v),
    'reel-pop': (k, t, v) => k.tone(t, 'triangle', 660, 1320, .2, .25 * v),
    'reel-chord': (k, t, v) => [220, 261.63, 329.63, 493.88, 659.25].forEach((f, i) => k.tone(t + i * .03, 'triangle', f, 0, 1.6, .16 * v)),
  };
  const hook = (fn) => (el, ctx) => { const { W, H, seed, style } = ctx, c = r => style.colour(r, r); el.innerHTML = fn({ ...ctx, W, H, seed, c }); };
  return {
    install(v, S) {
      for (const [n, f] of Object.entries(voices)) if (!vk.sounds[n]) vk.sounds[n] = f;
      v.cfg.cover = { ...(S.base.cover || {}), ...(v.cfg.cover || {}) };
    },
    hooks: {
      // flat paper field with two big drifting colour discs (poster composition)
      sky: hook(({ W, H, c, seed }) => {
        const r = G.rnd(seed, 1) > .5;
        return `<rect x="-60" y="-60" width="${W + 120}" height="${H + 120}" fill="${c('sky0')}"/>` +
          `<circle cx="${(r ? .82 : .18) * W}" cy="${.2 * H}" r="${.25 * H}" fill="${c('far')}"/>` +
          `<circle cx="${(r ? .1 : .9) * W}" cy="${.62 * H}" r="${.11 * H}" fill="${c('leaf')}"/>`;
      }),
      // hard-edged geometric skyline: blocks, half-discs and triangles in the four colours with ink offset shadows
      far: hook(({ W, gy0, c, seed }) => {
        let s = ''; const cols = ['mid', 'trunk', 'leaf', 'far'];
        for (let i = 0; i < 12; i++) {
          const w = 70 + G.rnd(seed, i) * 90, h = 50 + G.rnd(seed + 2, i) * 150, x = i * (W / 11) - 30, k = cols[i % 4], kind = i % 3;
          const shape = kind === 0 ? `<rect x="${x}" y="${gy0 - h}" width="${w.toFixed(1)}" height="${h + 2}" rx="6"` : kind === 1 ? `<path d="M${x} ${gy0} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${gy0} Z"` : `<path d="M${x} ${gy0} L${x + w / 2} ${gy0 - h} L${x + w} ${gy0} Z"`;
          s += shape.replace('<rect', `<rect transform="translate(8 8)" opacity=".9"`).replace('<path', `<path transform="translate(8 8)" opacity=".9"`) + ` fill="${c('ink')}"/>` + shape + ` fill="${c(k)}"/>`;
        }
        return s;
      }),
      mid: false,
      props(el) { el.innerHTML = ''; },
      ground: hook(({ W, H, gy0, c }) => `<rect x="-60" y="${gy0}" width="${W + 120}" height="${H - gy0 + 60}" fill="${c('ground')}"/><rect x="-60" y="${gy0}" width="${W + 120}" height="10" fill="${c('leaf')}"/>`),
    },
    worldOptions: { flat: true },
    // title: mono kicker, Archivo Black hero slammed in (echo ghosts + hard shadow), paper sub on an ink bar
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .26), size = o.size || 132;
      const el = K.overlay(sc, `<div class="rl-t" style="position:absolute;left:0;right:0;top:${p.y - size * .62}px;text-align:center">
        <div class="rl-k" style="font:700 22px 'JetBrains Mono',monospace;letter-spacing:.3em;color:${C.ink}">${K.esc(o.kicker || '● vidkit / style')}</div>
        <div class="rl-h" style="display:inline-block;font:900 ${size}px/1.05 'Archivo Black','Noto Sans SC',sans-serif;color:${o.color || C.ink};margin-top:8px">${K.esc(text)}</div>
        ${o.sub ? `<div><span class="rl-s" style="display:inline-block;font:800 26px 'Noto Sans SC',sans-serif;color:${C.paper};background:${C.ink};padding:6px 16px;margin-top:14px">${K.esc(o.sub)}</span></div>` : ''}</div>`, { z: 20 });
      const [k, h, s2] = ['.rl-k', '.rl-h', '.rl-s'].map(q => el.querySelector(q));
      sc.fx(h, 'slam', { t: p.at, echo: 3, shadow: [10, 10, C.pink], d: .42 });
      sc.on(l => {
        K.css(el, 'opacity', K.win(l, p.at - .05, .05, p.out, .25).toFixed(3));
        K.css(k, 'opacity', K.prog(l, p.at + .2, .25).toFixed(3));
        if (s2) K.css(s2, 'transform', `scaleX(${K.ease.out(K.prog(l, p.at + .35, .35)).toFixed(3)})`);
      });
      if (o.sfx !== false) S.sfx(sc, 'title', p.at + .02);
      return el;
    },
    // signature: shockwave rings + radial burst + a white flash at the subject, on one canvas layer
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), W = sc.video.W, k = W / 1920;
      sc.paint([
        A.flash({ at, amount: .45 }),
        A.rings({ times: [at, at + .12, at + .24], x, y, speed: 1150 * k, max: 900 * k, width: 9 * k, delay: 0, colors: [C.pink, C.yellow, C.cyan] }),
        A.burst({ at, x, y, n: 14, r0: 60 * k, spread: 420 * k, len: 120 * k, width: 7 * k, alpha: .9, color: C.ink, d: .45 }),
      ], { fixed: true, zIndex: 14 });
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    // 128 BPM bed: kick on the beat, off-beat hats, claps on 2 & 4; o.whoosh: whoosh into every cut; o.end: kick + chord
    music(v, o = {}) {
      const g = o.gain != null ? o.gain : .8;
      const n = vk.style.bed(v, { bpm: o.bpm || 128, gain: g, seed: 9, fadeIn: .02, fadeOut: o.fadeOut != null ? o.fadeOut : .6, from: o.from || 0, to: o.to, tracks: [
        { voice: 'reel-kick', steps: 'x...............', gain: .8 },
        { voice: 'reel-kick', steps: '....x...x...x...', gain: .68 },
        { voice: 'reel-hat', steps: '..x...x...x...x.', gain: .55 },
        { voice: 'reel-clap', steps: '....x.......x...', gain: .6 },
      ].concat(o.tracks || []) });
      if (o.whoosh !== false) v.scenes.slice(1).forEach(sc => v.sfx(sc.start + (sc.transition ? sc.transition.d / 2 : 0), 'reel-whoosh', .7 * g));
      if (o.end) { const t = typeof o.end === 'number' ? o.end : v.scenes.reduce((m, sc) => Math.max(m, sc.start + sc.dur), 0) - 1.4; v.sfx(t, 'reel-kick', 1.3 * g); v.sfx(t, 'reel-chord', g); }
      return n;
    },
  };
};
