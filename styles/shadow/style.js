// 皮影 shadow-puppet pack runtime: a lamp-lit cloth screen (radial glow, flicker), scenery and figures in translucent
// dyed leather (multiply onto the screen) with carved holes, control rods, a carved plaque title, lamp flare effect.
export default vk => {
  const K = vk.style.kit, G = vk.geom;
  const flick = t => 1 + .035 * Math.sin(t * 7.3) + .025 * Math.sin(t * 13.1 + 1) + .02 * (vk.noise1(t * 6) - .5);
  return {
    hooks: {
      sky(el, ctx) {
        const { W, H, style, S: st } = ctx, c = r => style.colour(r, r), id = 'sp-scr-' + ctx.sc.index;
        const a = st.time === 'night' ? c('night0') : c('screen'), b = st.time === 'night' ? c('night1') : c('screen2');
        el.innerHTML = `<defs><radialGradient id="${id}" cx=".5" cy=".46" r=".72"><stop offset="0" stop-color="#fff2cc"/><stop offset=".35" stop-color="${a}"/><stop offset=".8" stop-color="${b}"/><stop offset="1" stop-color="${c('edge')}"/></radialGradient></defs>
          <rect x="-80" y="-80" width="${W + 160}" height="${H + 160}" fill="url(#${id})"/>`;
        if (st.time === 'night' || st.props.includes('moon')) { const M = vk.style.material('leather'); el.innerHTML += `<g style="mix-blend-mode:multiply">${M.paint({ pts: G.ellipse(W * .78, 130, 44, 44, 0, 40), holes: [G.ellipse(W * .78 + 16, 122, 36, 38, 0, 36)], col: c('moon'), seed: 2 }, ctx.style.P)}</g>`; }
      },
      far(el, ctx, paint) {
        // carved scenery panel: hills band with cut-out ripple holes
        const { W, gy0, seed } = ctx, holes = []; for (let i = 0; i < 18; i++) holes.push(G.ellipse(40 + i * 72, gy0 - 50 - 14 * Math.sin(i), 16, 6, 10, 12));
        el.innerHTML = paint([{ pts: G.hills(-60, W + 60, gy0 - 120, 34, seed + 2, { base: gy0 + 10, freq: .006 }), role: 'far', holes, op: .5 }]);
      },
      mid: false,
      ground(el, ctx, paint) {
        const { W, H, gy0, style } = ctx, c = r => style.colour(r, r), holes = [];
        for (let i = 0; i < 26; i++) holes.push(G.rect(18 + i * 50, gy0 + 22, 28, 8));
        el.innerHTML = paint([{ pts: [[-60, gy0 + 4], [W + 60, gy0 + 4], [W + 60, H + 60], [-60, H + 60]], role: 'ground', holes, op: .95 }]);
      },
    },
    worldOptions: { flat: true },
    // lamp flicker on the whole screen + soft focus breathing
    decorate(sc, w) { const el = w.sky; sc.on(l => K.css(el, 'filter', `brightness(${flick(sc.start + l).toFixed(3)})`)); },
    // control rods: neck rod + near-hand rod, dark thin sticks to below the frame
    charAfter(p, S) {
      const NS = 'http://www.w3.org/2000/svg', g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'sp-rods'); p.g.appendChild(g);
      g.innerHTML = '<path stroke="#2a1206" stroke-width="3" stroke-linecap="round" fill="none" opacity=".85"/><path stroke="#2a1206" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".8"/>';
      const [a, b] = g.children, render = p.render;
      p.render = (t, s = {}) => {
        const R = render(t, s); if (!R) return R;
        const n = p.pointAt(R, 'chest', -6, -60), h = p.pointAt(R, 'handN', 0, 16), y = 900;
        K.attr(a, 'd', `M${n[0].toFixed(1)} ${n[1].toFixed(1)} L${(n[0] - 40 * R.dir).toFixed(1)} ${y}`);
        K.attr(b, 'd', `M${h[0].toFixed(1)} ${h[1].toFixed(1)} L${(h[0] + 60 * R.dir).toFixed(1)} ${y}`);
        return R;
      };
    },
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .2), M = vk.style.material('leather'), P = S.charView.P;
      const w = Math.max(300, String(text).length * 120 + 110), h = 150, svg = K.svgLayer(sc, { fixed: true, z: 20 });
      const g = K.svgEl(svg, 'g', { style: 'mix-blend-mode:multiply', filter: 'url(#sp-leather)' });
      const orn = []; for (let i = 0; i < 9; i++) orn.push(G.star(-w / 2 + 34 + i * (w - 68) / 8, -h / 2 + 18, 7, 3, 4), G.star(-w / 2 + 34 + i * (w - 68) / 8, h / 2 - 18, 7, 3, 4));
      g.innerHTML = M.paint({ pts: G.blob(0, 0, w / 2, h / 2, 5, .04, 60), col: S.colour('red'), holes: orn, seed: 2 }, P)
        + `<text x="0" y="${o.sub ? 10 : 34}" text-anchor="middle" font-family="Ma Shan Zheng, serif" font-size="${o.size || 100}" fill="#fff6dd" stroke="#3a1a08" stroke-width="2.5" paint-order="stroke" letter-spacing="10">${K.esc(text)}</text>`
        + (o.sub ? `<text x="0" y="52" text-anchor="middle" font-family="Noto Serif SC, serif" font-weight="700" font-size="22" fill="#fff0c8" letter-spacing="6">${K.esc(o.sub)}</text>` : '');
      // a puppet plaque is pushed against the screen: blurred → sharp, slight swing on its rod
      sc.on(l => { const u = K.ease.out(K.prog(l, p.at, .6)), a = K.win(l, p.at, .3, p.out, .4); K.attr(g, 'transform', `translate(${p.x} ${p.y}) rotate(${(3 * Math.sin(l * 2.1) * (1 - u * .7)).toFixed(2)})`); K.attr(g, 'opacity', a.toFixed(3)); K.css(svg, 'filter', u < 1 ? `blur(${(6 * (1 - u)).toFixed(2)}px)` : 'none'); });
      if (o.sfx !== false) S.sfx(sc, 'title', p.at + .1);
      return g;
    },
    // signature: lamp flare (screen flashes warm) + carved rosette spinning onto the screen
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), M = vk.style.material('leather'), P = S.charView.P;
      const svg = K.svgLayer(sc, { fixed: true, z: 14 });
      const fl = K.svgEl(svg, 'rect', { x: 0, y: 0, width: sc.video.W, height: sc.video.H, fill: '#fff1c4', opacity: 0, style: 'mix-blend-mode:screen' });
      const g = K.svgEl(svg, 'g', { style: 'mix-blend-mode:multiply' });
      const holes = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; holes.push(G.ellipse(Math.cos(a) * 52, Math.sin(a) * 52, 14, 7, i * 45, 14)); }
      holes.push(G.star(0, 0, 22, 9, 6));
      g.innerHTML = M.paint({ pts: G.star(0, 0, 96, 70, 12), col: S.colour('gold'), holes, seed: 4 }, P) + M.paint({ pts: G.ellipse(0, 0, 14, 14, 0, 16), col: S.colour('red'), seed: 5 }, P);
      sc.on(l => { const u = K.prog(l, at, .7), e = K.ease.back(u); K.attr(fl, "opacity", (.3 * Math.max(0, 1 - Math.abs(l - at - .05) / .35)).toFixed(3)); K.attr(g, 'opacity', (K.win(l, at, .15, at + 1.4, .4)).toFixed(3)); K.attr(g, 'transform', `translate(${Math.min(sc.video.W - 120, x + 190).toFixed(1)} ${Math.max(130, y).toFixed(1)}) rotate(${(-200 * (1 - e) + 20 * l).toFixed(1)}) scale(${(.2 + .8 * e).toFixed(3)})`); });
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    music(v, o = {}) {
      return vk.style.bed(v, { bpm: 104, gain: o.gain != null ? o.gain : .7, seed: 7, fadeIn: .1, tracks: [
        { voice: 'bangzi', steps: 'x..x..x.x..x..x.', gain: .5, notes: [1150, 1150, 1300] },
        { voice: 'op-tanggu', steps: 'x.......x.......', gain: .45 },
        { voice: 'op-xiaoluo', steps: '....x.......x...', gain: .35 },
        { voice: 'flute', steps: 'x.......x.......', notes: vk.style.scaleNotes(392, vk.style.SCALES.penta, 2), walk: true, rest: .4, gain: .25, from: 1 },
      ] });
    },
  };
};
