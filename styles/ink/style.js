// 水墨 ink-wash pack runtime: peaks as layered washes (ink-far / ink-wash filters), a drifting mist band (vk.gl.mist),
// brush-outlined characters, vertical calligraphy titles with a seal, ink-bloom brush stroke as the signature effect.
export default vk => {
  const K = vk.style.kit, G = vk.geom;
  return {
    install(v) { vk.installInk({ seed: 7 }); },
    layerAttrs(name) { return name === 'far' ? 'filter="url(#ink-far)" opacity=".75"' : name === 'mid' ? 'filter="url(#ink-wash)" opacity=".92"' : name === 'props' || name === 'ground' ? 'filter="url(#ink-line)"' : ''; },
    hooks: {
      sky(el, ctx) {
        const { W, H, S: st, style } = ctx, c = r => style.colour(r, r);
        let s = `<rect x="-60" y="-60" width="${W + 120}" height="${H + 120}" fill="${c('sky0')}"/>`;
        if (st.time === 'dusk' || st.time === 'dawn' || st.props.includes('sun')) s += `<circle cx="${W * .74}" cy="${st.time === 'dawn' ? 170 : 210}" r="44" fill="${c('sun')}" opacity=".85" filter="url(#ink-bleed)"/>`;
        if (st.time === 'night' || st.props.includes('moon')) s += `<circle cx="${W * .76}" cy="130" r="40" fill="none" stroke="${c('ink')}" stroke-width="2" opacity=".55" filter="url(#ink-line)"/>`;
        el.innerHTML = s;
      },
      far(el, ctx, paint) {
        const { W, gy0, seed, S: st } = ctx, tall = st.place === 'mountain' ? 1 : .55;
        el.innerHTML = paint([
          ...G.peaks(-80, W * .62, gy0 + 30, 220 * tall, 380 * tall, 3, seed + 1).map(p => ({ pts: p.pts, role: 'far', op: .7 })),
          ...G.peaks(W * .45, W + 80, gy0 + 30, 160 * tall, 300 * tall, 3, seed + 4).map(p => ({ pts: p.pts, role: 'far', op: .55 })),
        ]);
      },
      mid(el, ctx, paint) {
        const { W, gy0, seed, S: st } = ctx, tall = st.place === 'mountain' ? 1 : .5;
        el.innerHTML = paint([...G.peaks(-60, W * .42, gy0 + 20, 90 * tall, 210 * tall, 2, seed + 7).map(p => ({ pts: p.pts, role: 'mid' })), { pts: G.hills(W * .55, W + 60, gy0 - 70 * tall, 30, seed + 2, { base: gy0 + 30, freq: .008 }), role: 'mid', op: .8 }]);
      },
    },
    decorate(sc, w, S) { sc.gl([vk.gl.mist({ y: w.ctx.gy0 - 150, height: 80, speed: 14, density: .9, scale: 110, color: S.colour('paper') })], { rect: [0, w.ctx.gy0 - 260, sc.video.W, 220] }); },
    title(sc, text, o = {}, S) {
      sc.add(vk.vtitle(text, { sub: o.sub, seal: o.seal || '墨', at: o.at != null ? o.at : .3, out: o.out, size: o.size || ([...text].length > 3 ? 96 : 120), pos: { x: o.x || (o.side === 'right' ? sc.video.W - 96 - (o.size || ([...text].length > 3 ? 96 : 120)) * 1.9 : 96), y: o.y || 58 }, sealSfx: o.sfx !== false }));
      if (o.sfx !== false) S.sfx(sc, 'title', (o.at || .3) + .05);
      return null;
    },
    // signature: an ink character is written top→bottom and bleeds into the paper beside the subject (vk.gl.inkBleed)
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), W = sc.video.W, txt = o.text || '墨', size = o.size || 190;
      const X = Math.min(W - size * .7, x + 230), Y = 70, n = [...txt].length;
      sc.gl([vk.gl.inkBleed({ src: vk.gl.text(txt, { x: X, y: Y, size, vertical: true }), at, draw: .7, dur: 2.4, spread: 14, haloEnd: .2, density: .93, wipe: { dir: 'down', dur: .6 }, seed: 5 })], { fixed: true, zIndex: 15, rect: [X - size * .75, Y - 30, size * 1.5, size * n * 1.08 + 60] });
      if (o.sfx !== false) { S.sfx(sc, 'swish', at); S.sfx(sc, 'big', at + .3); }
      return null;
    },
    music(v, o = {}) {
      const N = vk.style.scaleNotes(146.83, vk.style.SCALES.penta, 3);
      return vk.style.bed(v, { bpm: 66, gain: o.gain != null ? o.gain : .8, seed: 5, fadeIn: .1, tracks: [
        { voice: 'pluck', steps: 'x.....x...x.....', notes: N.slice(2, 12), walk: true, rest: .25, gain: .55 },
        { voice: 'flute', steps: '........x.......', notes: N.slice(7, 14), walk: true, rest: .5, gain: .35, from: 1 },
        { voice: 'woodfish', steps: 'x...............', gain: .18 },
      ] });
    },
  };
};
