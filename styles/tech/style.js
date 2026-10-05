// Tech promo pack runtime: dark navy stage with a glowing perspective grid floor and skyline, flat-vector characters,
// Archivo hero titles with an accent bar, electric ring pulse + spark burst as the signature effect.
export default vk => {
  const K = vk.style.kit, G = vk.geom;
  return {
    hooks: {
      sky(el, ctx) {
        const { W, H, style } = ctx, c = r => style.colour(r, r), id = 'tk-sky-' + ctx.seed + '-' + (ctx.sc.index);
        let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c('sky0')}"/><stop offset=".72" stop-color="${c('sky1')}"/><stop offset="1" stop-color="${c('dusk1')}"/></linearGradient>
          <radialGradient id="${id}g" cx=".5" cy=".78" r=".55"><stop offset="0" stop-color="${c('accent')}" stop-opacity=".45"/><stop offset="1" stop-color="${c('accent')}" stop-opacity="0"/></radialGradient></defs>
          <rect x="-60" y="-60" width="${W + 120}" height="${H + 120}" fill="url(#${id})"/><rect x="-60" y="-60" width="${W + 120}" height="${H + 120}" fill="url(#${id}g)"/>`;
        for (let i = 0; i < 40; i++) s += `<circle cx="${(G.rnd(ctx.seed + 3, i) * W).toFixed(1)}" cy="${(G.rnd(ctx.seed + 5, i) * H * .5).toFixed(1)}" r="${(.6 + G.rnd(ctx.seed + 7, i) * 1.3).toFixed(2)}" fill="${c('star')}" opacity="${(.25 + .5 * G.rnd(ctx.seed + 9, i)).toFixed(2)}"/>`;
        el.innerHTML = s;
      },
      far(el, ctx) {
        const { W, gy0, seed, style } = ctx, c = r => style.colour(r, r); let s = '';
        for (let i = 0; i < 22; i++) { const w = 34 + G.rnd(seed, i) * 60, h = 60 + G.rnd(seed + 2, i) * 190, x = i * 62 - 20; s += `<rect x="${x}" y="${gy0 - h}" width="${w.toFixed(1)}" height="${h + 4}" fill="${c('far')}"/>`; for (let r = 0; r < h / 22 - 1; r++) for (let q = 0; q < w / 14 - 1; q++) if (G.rnd(seed + i, r * 9 + q) > .78) s += `<rect x="${(x + 6 + q * 14).toFixed(1)}" y="${(gy0 - h + 10 + r * 22).toFixed(1)}" width="5" height="8" fill="${c('accent2')}" opacity=".55"/>`; }
        el.innerHTML = s + `<rect x="-60" y="${gy0 - 3}" width="${W + 120}" height="3" fill="${c('accent2')}" opacity=".9"/>`;
      },
      mid: false,
      props(el) { el.innerHTML = ''; },
      ground(el, ctx) {
        const { W, H, gy0, style } = ctx, c = r => style.colour(r, r), vx = W / 2; let s = `<rect x="-60" y="${gy0}" width="${W + 120}" height="${H - gy0 + 60}" fill="${c('ground')}"/>`;
        for (let i = -14; i <= 14; i++) s += `<line x1="${vx + i * 18}" y1="${gy0}" x2="${vx + i * 150}" y2="${H + 60}" stroke="${c('grid')}" stroke-width="1.4" opacity=".55"/>`;
        for (let j = 1; j < 9; j++) { const y = gy0 + Math.pow(j / 8, 2.1) * (H - gy0 + 60); s += `<line x1="-60" y1="${y.toFixed(1)}" x2="${W + 60}" y2="${y.toFixed(1)}" stroke="${c('grid')}" stroke-width="1.2" opacity="${(.25 + .4 * j / 8).toFixed(2)}"/>`; }
        el.innerHTML = s;
      },
    },
    // ground is flat for the grid (feet on gy0)
    worldOptions: { flat: true },
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .24), acc = S.colour('accent');
      const el = K.overlay(sc, `<div class="tk-t" style="position:absolute;left:0;right:0;top:${p.y - 70}px;text-align:center">
        <div class="tk-k" style="font:500 22px 'JetBrains Mono',monospace;letter-spacing:.3em;color:#9aa6cc;text-transform:uppercase">${K.esc(o.kicker || 'vidkit · style')}</div>
        <div class="tk-h" style="font:900 ${o.size || 112}px/1 Archivo,'Noto Sans SC',sans-serif;color:#fff;letter-spacing:-.02em;margin-top:6px">${K.esc(text)}</div>
        <div class="tk-b" style="height:8px;width:${Math.min(520, String(text).length * 70)}px;margin:14px auto 0;background:${acc};border-radius:4px;transform-origin:0 50%"></div>
        ${o.sub ? `<div class="tk-s" style="font:500 26px 'Noto Sans SC',sans-serif;color:#c9d2ff;margin-top:14px">${K.esc(o.sub)}</div>` : ''}</div>`, { z: 20 });
      const [k, h, b, s2] = ['.tk-k', '.tk-h', '.tk-b', '.tk-s'].map(q => el.querySelector(q));
      sc.on(l => {
        const a = K.win(l, p.at, .3, p.out, .3), u = K.ease.out(K.prog(l, p.at, .5));
        K.css(el, 'opacity', a.toFixed(3));
        K.css(h, 'transform', `translateY(${(30 * (1 - u)).toFixed(1)}px)`); K.css(h, 'clipPath', `inset(${(100 * (1 - u)).toFixed(1)}% 0 0 0)`);
        K.css(k, 'opacity', K.prog(l, p.at + .15, .3).toFixed(3));
        K.css(b, 'transform', `scaleX(${K.ease.out(K.prog(l, p.at + .25, .45)).toFixed(3)})`);
        if (s2) K.css(s2, 'opacity', K.prog(l, p.at + .45, .35).toFixed(3));
      });
      if (o.sfx !== false) S.sfx(sc, 'title', p.at + .05);
      return el;
    },
    // signature: electric ring pulse + additive spark burst at the subject
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), acc = S.colour('accent'), acc2 = S.colour('accent2');
      const svg = K.svgLayer(sc, { fixed: true, z: 14 });
      const rings = [0, 1, 2].map(i => K.svgEl(svg, 'circle', { cx: x, cy: y, r: 10, fill: 'none', stroke: i ? acc2 : acc, 'stroke-width': 6 - i * 1.5, opacity: 0 }));
      sc.on(l => rings.forEach((r, i) => { const u = K.prog(l, at + i * .12, .8); K.attr(r, 'r', (20 + 260 * K.ease.out(u)).toFixed(1)); K.attr(r, 'opacity', (u > 0 && u < 1 ? (1 - u) * .9 : 0).toFixed(3)); }));
      K.burst(sc, { at, x: o.x, y: o.y, n: 60, shape: 'spark', colors: ['#ffffff', acc2, acc], speed: [300, 900], gravity: 200, drag: 2.2, life: [.5, 1.1], size: [6, 14], blend: 'add', seed: 5 });
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    music(v, o = {}) {
      return vk.style.bed(v, { bpm: 112, gain: o.gain != null ? o.gain : .75, seed: 2, fadeIn: .05, tracks: [
        { voice: 'kick', steps: 'x...x...x...x...', gain: .6 },
        { voice: 'hat', steps: '..x...x...x...x.', gain: .5 },
        { voice: 'saw', steps: 'x..x..x...x..x..', notes: [55, 55, 65.41, 49], gain: .7 },
        { voice: 'chime', steps: 'x...............', notes: [880, 1046.5, 783.99, 659.25], gain: .25, from: 1 },
      ] });
    },
  };
};
