// 剪纸 paper-cut pack runtime. Characters and the world are flat coloured paper pieces with scissor-wobbled edges,
// cut-out ornaments and a lifted shadow (vk.gl.paperCut filters); titles sit on a red cut-paper banner.
export default vk => {
  const K = vk.style.kit, G = vk.geom;
  return {
    install(v, S, role) { },
    // clouds as cut paper scrolls (祥云-like curls) in the sky
    hooks: {
      sky(el, ctx) {
        const { W, H, S: st, style } = ctx, c = r => style.colour(r, r), M = vk.style.material('cut'), P = style.P;
        const [a, b] = st.time === 'night' ? [c('night0'), c('night1')] : st.time === 'dusk' ? [c('dusk0'), c('dusk1')] : [c('sky0'), c('sky1')];
        let s = `<rect x="-60" y="-60" width="${W + 120}" height="${H + 120}" fill="${b}"/><rect x="-60" y="-60" width="${W + 120}" height="${H * .45}" fill="${a}" opacity=".85"/>`;
        // big red paper sun / pale moon with a cut ring
        const night = st.time === 'night', sx = W * .76, sy = st.time === 'day' ? 140 : 210, r = night ? 52 : 74;
        s += `<g filter="url(#pc)">` + M.paint({ pts: G.ellipse(sx, sy, r, r, 0, 56), holes: [G.ellipse(sx, sy, r - 12, r - 12, 0, 50)], col: night ? c('moon') : c('sun'), seed: 3 }, P)
          + M.paint({ pts: G.ellipse(sx, sy, r - 20, r - 20, 0, 48), col: night ? c('moon') : c('sun'), seed: 5 }, P);
        [[210, 120, 1], [560, 80, .8], [1010, 300, .7]].forEach(([x, y, k], i) => { s += M.paint({ pts: G.blob(x, y, 96 * k, 24 * k, 7 + i, .18), holes: [G.ellipse(x - 30 * k, y, 14 * k, 6 * k, 0, 14), G.ellipse(x + 26 * k, y + 2, 10 * k, 5 * k, 0, 12)], col: c('cloud'), seed: 11 + i }, P); });
        el.innerHTML = s + '</g>';
      },
    },
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .2), px = sc.video.px, red = S.colour('red'), gold = S.colour('gold');
      const w = Math.max(320, String(text).length * 118 + 120), h = 150;
      const svg = K.svgLayer(sc, { fixed: true, z: 20 }), M = vk.style.material('cut'), P = S.charView.P;
      const g = K.svgEl(svg, 'g', { filter: 'url(#pc-shadow)' });
      const ban = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2 - 26, 0], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2 + 26, 0]];
      g.innerHTML = M.paint({ pts: G.scale(ban, 1.04, 1.1), col: gold, seed: 2 }, P) + M.paint({ pts: ban, col: red, seed: 3, holes: [G.rect(-w / 2 + 40, -h / 2 + 12, w - 80, 4), G.rect(-w / 2 + 40, h / 2 - 16, w - 80, 4)] }, P)
        + `<text x="0" y="${o.sub ? 6 : 30}" text-anchor="middle" font-family="Ma Shan Zheng, Noto Serif SC, serif" font-size="${o.size || 96}" fill="#fbf3e2" letter-spacing="8">${K.esc(text)}</text>`
        + (o.sub ? `<text x="0" y="56" text-anchor="middle" font-family="Noto Serif SC, serif" font-weight="700" font-size="24" fill="#f2d79a" letter-spacing="6">${K.esc(o.sub)}</text>` : '');
      sc.on(l => { const u = K.ease.back(K.prog(l, p.at, .55)), a = K.win(l, p.at, .2, p.out, .4); K.attr(g, 'transform', `translate(${p.x} ${p.y}) rotate(${(-4 * (1 - u)).toFixed(2)}) scale(${(.4 + .6 * u).toFixed(3)})`); K.attr(g, 'opacity', a.toFixed(3)); });
      if (o.sfx !== false) S.sfx(sc, 'title', p.at + .1);
      return g;
    },
    // signature: cut-paper confetti burst (red / gold / cream flakes), with 大锣
    effect(sc, name, o = {}, S) {
      const at = o.at || 0;
      K.burst(sc, { at, x: o.x || 640, y: o.y || 300, n: 54, shape: 'petal', colors: [S.colour('red'), S.colour('gold'), S.colour('cream'), S.colour('deepred')], color2: S.colour('red'), speed: [260, 680], gravity: 520, drag: 1.4, life: [1.4, 2.2], size: [12, 22], sway: 18 });
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    // 锣鼓经: 板鼓 roll-in, 小锣 on the off-beats, 铙钹 accents, sparse
    music(v, o = {}) {
      return vk.style.bed(v, { bpm: 96, gain: o.gain != null ? o.gain : .7, seed: 3, fadeIn: .2, tracks: [
        { voice: 'op-bangu', steps: 'x.x.x...x...x.o.', gain: .45 },
        { voice: 'op-xiaoluo', steps: '....x.......x...', gain: .5 },
        { voice: 'op-naoMute', steps: '..........x.....', gain: .5 },
        { voice: 'op-tanggu', steps: 'x...............', gain: .5 },
      ] });
    },
  };
};
