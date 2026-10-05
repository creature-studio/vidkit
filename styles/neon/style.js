// 赛博霓虹 cyber-neon pack runtime: rainy night skyline with neon window strips, magenta perspective grid, glowing
// line-drawn characters (neon material), a neon-sign title with flicker + vk.gl.bloom halo, CRT scanlines, zap burst.
export default vk => {
  const K = vk.style.kit, G = vk.geom;
  const SCAN = `void main(){ vec2 sp = scenePx(vUv); float l = .5 + .5 * sin(sp.y * 3.14159 * .5); float v = length((sp / uNS - .5) * vec2(1., .8));
    float a = .1 * l + .45 * smoothstep(.45, .95, v) + .03 * (fbm3(vec2(sp.x * .02, uStep * 3.1)) - .5);
    gl_FragColor = vec4(0., 0., 0., clamp(a, 0., 1.)); }`;
  return {
    install(v) {
      // video-wide CRT scanlines + vignette (GL shader layer over every scene)
      v.gl([vk.gl.shader({ frag: SCAN, step: 12 })], { zIndex: 25 });
    },
    hooks: {
      sky(el, ctx) {
        const { W, H, style, seed } = ctx, c = r => style.colour(r, r), id = 'nn-sky-' + ctx.sc.index;
        let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c('night0')}"/><stop offset=".75" stop-color="${c('dusk1')}"/><stop offset="1" stop-color="#5a1a6a"/></linearGradient></defs><rect x="-60" y="-60" width="${W + 120}" height="${H + 120}" fill="url(#${id})"/>`;
        // striped synth sun behind the city
        const sx = W * .5, sy = ctx.gy0 - 150, r = 150; s += `<defs><clipPath id="${id}c"><rect x="${sx - r}" y="${sy - r}" width="${2 * r}" height="${2 * r}"/></clipPath><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff2bd6"/></linearGradient></defs>`;
        let bands = ''; for (let i = 0; i < 6; i++) bands += `<rect x="${sx - r}" y="${(sy + 10 + i * 24).toFixed(1)}" width="${2 * r}" height="${4 + i * 2.4}" fill="${c('night0')}"/>`;
        s += `<g opacity=".9"><circle cx="${sx}" cy="${sy}" r="${r}" fill="url(#${id}s)"/>${bands}</g>`;
        for (let i = 0; i < 50; i++) s += `<circle cx="${(G.rnd(seed + 3, i) * W).toFixed(1)}" cy="${(G.rnd(seed + 5, i) * H * .45).toFixed(1)}" r="${(.5 + G.rnd(seed + 7, i)).toFixed(2)}" fill="${c('star')}" opacity=".7"/>`;
        el.innerHTML = s;
      },
      far(el, ctx) {
        const { gy0, seed, style } = ctx, c = r => style.colour(r, r); let s = '';
        for (let i = 0; i < 24; i++) { const w = 40 + G.rnd(seed, i) * 54, h = 80 + G.rnd(seed + 2, i) * 230, x = i * 56 - 30, col = i % 3 ? c('accent2') : c('accent');
          s += `<rect x="${x}" y="${(gy0 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h + 4}" fill="${c('far')}" stroke="${col}" stroke-width="1.2" stroke-opacity=".55"/>`;
          for (let r = 0; r < h / 18 - 1; r++) if (G.rnd(seed + i, r) > .55) s += `<rect x="${x + 6}" y="${(gy0 - h + 10 + r * 18).toFixed(1)}" width="${(w - 12).toFixed(1)}" height="2" fill="${col}" opacity="${(.35 + .5 * G.rnd(seed + 9, i * 31 + r)).toFixed(2)}"/>`; }
        el.innerHTML = s;
      },
      mid: false,
      props(el) { el.innerHTML = ''; },
      ground(el, ctx) {
        const { W, H, gy0, style } = ctx, c = r => style.colour(r, r), vx = W / 2; let s = `<rect x="-60" y="${gy0}" width="${W + 120}" height="${H - gy0 + 60}" fill="${c('ground')}"/>`;
        for (let i = -16; i <= 16; i++) s += `<line x1="${vx + i * 16}" y1="${gy0}" x2="${vx + i * 170}" y2="${H + 60}" stroke="${c('grid')}" stroke-width="1.6" opacity=".7"/>`;
        for (let j = 1; j < 10; j++) { const y = gy0 + Math.pow(j / 9, 2.2) * (H - gy0 + 60); s += `<line x1="-60" y1="${y.toFixed(1)}" x2="${W + 60}" y2="${y.toFixed(1)}" stroke="${c('grid')}" stroke-width="1.4" opacity="${(.3 + .5 * j / 9).toFixed(2)}"/>`; }
        s += `<rect x="-60" y="${gy0 - 2}" width="${W + 120}" height="3" fill="${c('accent2')}"/>`;
        el.innerHTML = `<g filter="url(#neon-glow)">${s}</g>`;
      },
    },
    worldOptions: { flat: true },
    // diagonal rain streaks (pure function of t)
    decorate(sc, w) {
      const svg = K.svgLayer(sc, { z: 3 }), N = 70, lines = [];
      for (let i = 0; i < N; i++) lines.push(K.svgEl(svg, 'line', { stroke: '#9fdcff', 'stroke-width': 1.2, opacity: (.18 + .25 * G.rnd(3, i)).toFixed(2) }));
      sc.on(l => lines.forEach((e, i) => { const sp = 900 + 400 * G.rnd(5, i), y = ((G.rnd(7, i) * 900 + l * sp) % 900) - 100, x = G.rnd(9, i) * 1400 - 60 - y * .25; K.attr(e, 'x1', x.toFixed(1)); K.attr(e, 'y1', y.toFixed(1)); K.attr(e, 'x2', (x - 9).toFixed(1)); K.attr(e, 'y2', (y + 34).toFixed(1)); }));
    },
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .22), svg = K.svgLayer(sc, { fixed: true, z: 20 }), mg = S.colour('magenta'), cy = S.colour('cyan');
      const g = K.svgEl(svg, 'g', { filter: 'url(#neon-glow)' });
      g.innerHTML = `<text x="${p.x}" y="${p.y + 30}" text-anchor="middle" font-family="Archivo, 'Noto Sans SC', sans-serif" font-weight="900" font-size="${o.size || 128}" fill="none" stroke="${mg}" stroke-width="4.5" letter-spacing="10">${K.esc(text)}</text>`
        + (o.sub ? `<text x="${p.x}" y="${p.y + 84}" text-anchor="middle" font-family="'JetBrains Mono', 'Noto Sans SC', monospace" font-weight="700" font-size="26" fill="${cy}" letter-spacing="4">${K.esc(o.sub)}</text>` : '');
      // ignition flicker: a few deterministic dropouts, then steady with a slow hum
      const on = l => { const u = l - p.at; if (u < 0) return 0; if (u < .5) return [1, 0, 1, 1, 0, .3, 1, 0, 1, 1][Math.floor(u * 20) % 10]; return .92 + .08 * Math.sin(l * 31); };
      sc.on(l => K.attr(g, 'opacity', (on(l) * K.win(l, p.at, .01, p.out, .3)).toFixed(3)));
      // GL bloom halo of the sign (vk.gl.bloom on the live SVG), additive over the scene
      sc.gl([vk.gl.bloom({ src: vk.gl.svg(svg), strength: 1.5, knee: .4, flicker: l => on(l) * K.win(l, p.at, .01, p.out, .3) })], { fixed: true, blend: 'screen', zIndex: 19 });
      if (o.sfx !== false) [0, .15, .3].forEach(d => S.sfx(sc, 'title', p.at + d, .5));
      return g;
    },
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), svg = K.svgLayer(sc, { fixed: true, z: 14 });
      const ring = K.svgEl(svg, 'circle', { cx: x, cy: y, r: 10, fill: 'none', stroke: S.colour('cyan'), 'stroke-width': 5, filter: 'url(#neon-glow)', opacity: 0 });
      let bolt = ''; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + .3; let px = x, py = y, d = `M${px.toFixed(0)} ${py.toFixed(0)}`; for (let k = 1; k < 6; k++) { px = x + Math.cos(a) * k * 40 + (G.rnd(i, k) - .5) * 30; py = y + Math.sin(a) * k * 40 + (G.rnd(i + 9, k) - .5) * 30; d += ` L${px.toFixed(0)} ${py.toFixed(0)}`; } bolt += `<path d="${d}" fill="none" stroke="${i % 2 ? S.colour('magenta') : S.colour('cyan')}" stroke-width="3" stroke-linejoin="round"/>`; }
      const bolts = K.svgEl(svg, 'g', { filter: 'url(#neon-glow)', opacity: 0 }, bolt);
      sc.on(l => { const u = K.prog(l, at, .6); K.attr(ring, 'r', (20 + 240 * K.ease.out(u)).toFixed(1)); K.attr(ring, 'opacity', (u > 0 && u < 1 ? 1 - u : 0).toFixed(3)); const f = l - at; K.attr(bolts, 'opacity', (f > 0 && f < .45 ? ([1, .2, 1, .6, 1, .1, .8][Math.floor(f * 30) % 7]) * (1 - f / .45) : 0).toFixed(3)); });
      K.burst(sc, { at, x: o.x, y: o.y, n: 70, shape: 'spark', colors: [S.colour('cyan'), S.colour('magenta'), '#ffffff'], speed: [300, 950], gravity: 400, drag: 2, life: [.5, 1.2], size: [6, 13], blend: 'add', seed: 11 });
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    music(v, o = {}) {
      const A = [110, 130.81, 164.81, 220, 261.63, 329.63, 220, 164.81];
      return vk.style.bed(v, { bpm: 118, gain: o.gain != null ? o.gain : .7, seed: 6, fadeIn: .05, tracks: [
        { voice: 'kick', steps: 'x...x...x...x...', gain: .6 },
        { voice: 'snap', steps: '....x.......x...', gain: .35 },
        { voice: 'hat', steps: '..x...x...x...x.', gain: .4 },
        { voice: 'saw', steps: 'xxxxxxxxxxxxxxxx', notes: A, gain: .45 },
        { voice: 'bass', steps: 'x.......x.......', notes: [55, 43.65, 49, 41.2], gain: .7 },
      ] });
    },
  };
};
