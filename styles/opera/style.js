// 重彩装饰 (大闹天宫) pack runtime: banded gradient sky, stacked 祥云 cloud scrolls with gold curls, palace roofs on a
// cloud sea, saturated decor-material characters, a palace plaque title, golden radiance as the signature effect.
export default vk => {
  const K = vk.style.kit, G = vk.geom;
  const cloud = (M, P, c, x, y, w, seed, fill) => {
    const C = G.cloudScroll(x, y, w, { seed });
    return M.paint({ pts: C.body, col: fill || c('cloud'), seed, lw: 3 }, P) + C.curls.map(s => `<path d="${G.polyD(s, false)}" fill="none" stroke="${c('cloudLine')}" stroke-width="3" stroke-linecap="round"/>`).join('')
      + C.curls.slice(0, 2).map(s => `<path d="${G.polyD(s.slice(0, Math.ceil(s.length * .55)), false)}" fill="none" stroke="${c('gold')}" stroke-width="2" stroke-linecap="round" transform="translate(0 4)"/>`).join('');
  };
  return {
    hooks: {
      sky(el, ctx) {
        const { W, H, S: st, style } = ctx, c = r => style.colour(r, r), M = vk.style.material('decor'), P = style.P;
        const [a, b] = st.time === 'dusk' ? [c('dusk0'), c('dusk1')] : st.time === 'night' ? [c('night0'), c('night1')] : [c('sky0'), c('sky1')];
        // flat colour bands (decorative, no smooth gradient)
        let s = ''; for (let i = 0; i < 6; i++) s += `<rect x="-60" y="${-60 + i * (H * .62 / 6)}" width="${W + 120}" height="${H * .62 / 6 + 2}" fill="${vk.color.mix(a, b, i / 5)}"/>`;
        s += `<rect x="-60" y="${H * .62 - 62}" width="${W + 120}" height="${H}" fill="${b}"/>`;
        const sx = W * .8, sy = st.time === 'dusk' ? 200 : 120;
        s += M.paint({ pts: G.ellipse(sx, sy, 58, 58, 0, 48), col: st.time === 'night' ? c('moon') : c('sun'), orn: [G.ellipse(sx, sy, 40, 40, 0, 40)].map(p => p), seed: 2 }, P).replace(/fill="#e9b949"/, `fill="none"`);
        for (let i = 0; i < 12; i++) { const a2 = i / 12 * Math.PI * 2; s += `<path d="M${(sx + Math.cos(a2) * 70).toFixed(1)} ${(sy + Math.sin(a2) * 70).toFixed(1)} L${(sx + Math.cos(a2 + .12) * 96).toFixed(1)} ${(sy + Math.sin(a2 + .12) * 96).toFixed(1)}" stroke="${c('gold')}" stroke-width="5" stroke-linecap="round"/>`; }
        [[180, 110, 220, 3], [520, 70, 160, 5], [1040, 300, 190, 7]].forEach(([x, y, w, sd]) => { s += cloud(M, P, c, x, y, w, sd); });
        el.innerHTML = s;
      },
      far(el, ctx, paint) {
        const { W, gy0, seed } = ctx;
        // stylised peaks: steep rounded pillars like the film's heavenly mountains
        const list = []; [[90, 260], [250, 330], [1120, 300], [1230, 230]].forEach(([x, h], i) => list.push({ pts: G.capsule(x, gy0 - h, 46 + 8 * (i % 2), x + 10, gy0 + 40, 70, 14), role: i % 2 ? 'far' : 'mid', orn: [G.ellipse(x - 10, gy0 - h + 60, 6, 6, 0, 10), G.ellipse(x + 14, gy0 - h + 120, 5, 5, 0, 10)] }));
        el.innerHTML = paint(list);
      },
      mid: false,
      props(el, ctx, paint) {
        const { S: st, gy0 } = ctx, list = [];
        if (st.place === 'palace' || st.props.includes('temple')) {
          [[860, 280, 150], [1060, 200, 110]].forEach(([x, w, h], i) => { const Hs = G.house(x, gy0 - 30, w, h, { kind: 'temple' });
            list.push({ pts: G.rect(x - w / 2 - 20, gy0 - 40, w + 40, 16), role: 'door' }, { pts: Hs.walls, role: 'wall', orn: [G.rect(x - w * .38, gy0 - 30 - h * .9, w * .76, 6)] }, { pts: Hs.roof, role: 'roof', orn: [G.ellipse(x, gy0 - 30 - h - h * .3, 8, 8, 0, 12)] }, { pts: Hs.door, role: 'door' });
            for (let k = 0; k < 4; k++) list.push({ pts: G.rect(x - w * .42 + k * w * .28, gy0 - 30 - h, 10, h), role: 'deepred' }); });
        }
        el.innerHTML = paint(list);
      },
      ground(el, ctx) {
        // a sea of cloud scrolls instead of earth
        const { W, H, gy0, style } = ctx, c = r => style.colour(r, r), M = vk.style.material('decor'), P = style.P;
        let s = `<rect x="-60" y="${gy0 + 18}" width="${W + 120}" height="${H - gy0 + 60}" fill="${c('ground2')}"/>`;
        for (let i = 0; i < 9; i++) s += cloud(M, P, c, -60 + i * 170, gy0 + 34 + (i % 2) * 18, 210, 11 + i, i % 2 ? c('cloud') : c('cloud2'));
        for (let i = 0; i < 8; i++) s += cloud(M, P, c, 20 + i * 180, gy0 + 104 + (i % 2) * 14, 230, 31 + i, c('cloud'));
        el.innerHTML = s;
      },
    },
    worldOptions: { flat: true },
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .2), M = vk.style.material('decor'), P = S.charView.P, c = n => S.colour(n);
      const w = Math.max(300, String(text).length * 120 + 120), h = 156, svg = K.svgLayer(sc, { fixed: true, z: 20 }), g = K.svgEl(svg, 'g', {});
      const tas = x => M.paint({ pts: [[x - 8, h / 2], [x + 8, h / 2], [x + 12, h / 2 + 60], [x, h / 2 + 76], [x - 12, h / 2 + 60]], col: c('red'), seed: 3 }, P);
      g.innerHTML = tas(-w / 2 + 30) + tas(w / 2 - 30) + M.paint({ pts: G.rect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28), col: c('gold'), orn: [], seed: 1 }, P)
        + M.paint({ pts: G.rect(-w / 2, -h / 2, w, h), col: '#1f3f7a', orn: [G.ellipse(-w / 2 + 16, -h / 2 + 16, 5, 5, 0, 10), G.ellipse(w / 2 - 16, -h / 2 + 16, 5, 5, 0, 10), G.ellipse(-w / 2 + 16, h / 2 - 16, 5, 5, 0, 10), G.ellipse(w / 2 - 16, h / 2 - 16, 5, 5, 0, 10)], seed: 2 }, P)
        + `<text x="0" y="${o.sub ? 10 : 34}" text-anchor="middle" font-family="Ma Shan Zheng, serif" font-size="${o.size || 104}" fill="${c('gold')}" stroke="#2a160e" stroke-width="3" paint-order="stroke" letter-spacing="12">${K.esc(text)}</text>`
        + (o.sub ? `<text x="0" y="56" text-anchor="middle" font-family="Noto Serif SC, serif" font-weight="900" font-size="22" fill="#fff4d6" letter-spacing="5">${K.esc(o.sub)}</text>` : '');
      // 亮相: drops in from above, overshoots, holds
      sc.on(l => { const u = K.ease.back(K.prog(l, p.at, .5)), a = K.win(l, p.at, .12, p.out, .35); K.attr(g, 'transform', `translate(${p.x} ${(p.y - 260 * (1 - u)).toFixed(1)})`); K.attr(g, 'opacity', a.toFixed(3)); });
      if (o.sfx !== false) S.sfx(sc, 'title', p.at + .45);
      return g;
    },
    // signature: golden radiance — rotating gilded rays behind the subject + gold sparks, on 仓
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), svg = K.svgLayer(sc, { fixed: true, z: 4 }), c = n => S.colour(n);
      let rays = ''; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, b = a + Math.PI / 30; rays += `<path d="M0 0 L${(Math.cos(a) * 900).toFixed(0)} ${(Math.sin(a) * 900).toFixed(0)} L${(Math.cos(b) * 900).toFixed(0)} ${(Math.sin(b) * 900).toFixed(0)} Z" fill="${i % 2 ? c('gold') : '#fff1b0'}"/>`; }
      const g = K.svgEl(svg, 'g', { opacity: 0, style: 'mix-blend-mode:screen' }, rays);
      sc.on(l => { const a = K.win(l, at, .2, at + 1.3, .5); K.attr(g, 'opacity', (a * .55).toFixed(3)); K.attr(g, 'transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(18 * (l - at)).toFixed(2)}) scale(${(.6 + .4 * K.ease.out(K.prog(l, at, .5))).toFixed(3)})`); });
      K.burst(sc, { at, x: o.x, y: o.y, n: 50, shape: 'spark', colors: [c('gold'), '#fff1b0', c('red')], speed: [250, 700], gravity: 300, drag: 1.6, life: [.7, 1.3], size: [8, 16], blend: 'add', seed: 9 });
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    music(v, o = {}) {
      return vk.style.bed(v, { bpm: 132, gain: o.gain != null ? o.gain : .6, seed: 4, fadeIn: .05, tracks: [
        { voice: 'op-bangu', steps: 'x.x.x.x.x.x.xxxx', gain: .4 },
        { voice: 'op-naoMute', steps: '..x...x...x...x.', gain: .45 },
        { voice: 'op-xiaoluo', steps: '....x.......x...', gain: .4 },
        { voice: 'op-daluo', steps: 'x...............', gain: .45, from: 1 },
      ] });
    },
  };
};
