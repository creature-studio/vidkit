// 像素 pixel-art pack runtime: stepped terrain, block clouds and trees in a 16-colour palette, thick outlines, the whole
// scene pixelated by a deterministic SVG filter (block sampling + dilate), chunky titles, coin burst + shake, chiptune.
export default vk => {
  const K = vk.style.kit, G = vk.geom;
  const stair = (x0, x1, y0, step, amp, seed, base) => { const pts = [[x0, base]]; for (let x = x0; x <= x1; x += step) { const y = y0 + Math.round((Math.sin(x / 170 + seed) * amp + Math.sin(x / 61 + seed * 2) * amp * .3) / 16) * 16; pts.push([x, y], [x + step, y]); } pts.push([x1 + step, base]); return pts; };
  return {
    install(v, S) {
      const n = (S.base.P && S.base.P.pixel) || 4, h = n / 2;
      // block-sample (flood a 1px dot in each n×n cell, tile, keep the source colour there) then dilate to fill the cell
      const w = document.createElement('div');
      w.innerHTML = `<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs><filter id="vk-pixelate" filterUnits="userSpaceOnUse" x="-200" y="-200" width="${v.W + 400}" height="${v.H + 400}" color-interpolation-filters="sRGB" primitiveUnits="userSpaceOnUse">
        <feFlood x="${h}" y="${h}" width="1" height="1" flood-color="#000"/><feComposite x="0" y="0" width="${n}" height="${n}"/><feTile x="-200" y="-200" width="${v.W + 400}" height="${v.H + 400}" result="dots"/>
        <feComposite in="SourceGraphic" in2="dots" operator="in"/><feMorphology operator="dilate" radius="${h}"/></filter></defs></svg>`;
      v.stage.appendChild(w.firstElementChild);
    },
    // whole-scene pixelation (titles, characters, GL particles alike)
    post(sc, S, o, w) {
      if (!w) return;
      const NS = 'http://www.w3.org/2000/svg', g = document.createElementNS(NS, 'g'); g.setAttribute('filter', 'url(#vk-pixelate)'); g.setAttribute('class', 'px-all');
      [...w.svg.childNodes].forEach(n => g.appendChild(n)); w.svg.appendChild(g);
    },
    hooks: {
      sky(el, ctx) {
        const { W, H, S: st, style, seed } = ctx, c = r => style.colour(r, r);
        const [a, b] = st.time === 'night' ? [c('night0'), c('night1')] : st.time === 'dusk' ? [c('dusk0'), c('dusk1')] : [c('sky0'), c('sky1')];
        let s = ''; for (let i = 0; i < 5; i++) s += `<rect x="-60" y="${-60 + i * 112}" width="${W + 120}" height="${H}" fill="${vk.color.nearest(vk.color.mix(a, b, i / 4), [a, b, vk.color.mix(a, b, .5)])}"/>`;
        s += `<rect x="${W * .78 - 40}" y="80" width="80" height="80" fill="${c('sun')}" stroke="${c('ink')}" stroke-width="6"/><rect x="${W * .78 - 56}" y="96" width="112" height="48" fill="${c('sun')}"/><rect x="${W * .78 - 24}" y="64" width="48" height="112" fill="${c('sun')}"/>`;
        // block clouds
        [[200, 120], [560, 70], [980, 210]].forEach(([x, y], i) => { s += `<g fill="${c('cloud')}" stroke="${c('ink')}" stroke-width="5" paint-order="stroke"><rect x="${x}" y="${y}" width="160" height="32"/><rect x="${x + 32}" y="${y - 24}" width="64" height="32"/><rect x="${x + 80}" y="${y - 40}" width="48" height="48"/></g>`; });
        el.innerHTML = s;
      },
      far(el, ctx, paint) { const { W, gy0, seed } = ctx; el.innerHTML = paint([{ pts: stair(-64, W + 64, gy0 - 190, 48, 70, seed + 1, gy0 + 40), role: 'far' }]); },
      mid(el, ctx, paint) { const { W, gy0, seed } = ctx; el.innerHTML = paint([{ pts: stair(-64, W + 64, gy0 - 90, 32, 40, seed + 3, gy0 + 40), role: 'mid' }]); },
      props(el, ctx, paint) {
        const { S: st, gy0 } = ctx, list = [], xs = st.place === 'forest' ? [80, 240, 1000, 1160] : [120, 1120];
        xs.forEach((x, i) => { list.push({ pts: G.rect(x - 12, gy0 - 96, 24, 100), role: 'trunk' }, { pts: [[x - 64, gy0 - 96], [x + 64, gy0 - 96], [x + 64, gy0 - 160], [x + 40, gy0 - 160], [x + 40, gy0 - 200], [x - 40, gy0 - 200], [x - 40, gy0 - 160], [x - 64, gy0 - 160]], role: i % 2 ? 'leaf2' : 'leaf' }); });
        // ? blocks
        [[520, gy0 - 210], [568, gy0 - 210]].forEach(([x, y]) => list.push({ pts: G.rect(x, y, 48, 48), role: 'sun', orn: [] }));
        el.innerHTML = paint(list) + `<text x="544" y="${gy0 - 172}" text-anchor="middle" font-family="Archivo" font-weight="900" font-size="34" fill="#1a1c2c">?</text><text x="592" y="${gy0 - 172}" text-anchor="middle" font-family="Archivo" font-weight="900" font-size="34" fill="#1a1c2c">?</text>`;
      },
      ground(el, ctx, paint) {
        const { W, H, gy0, style } = ctx, c = r => style.colour(r, r);
        let s = paint([{ pts: G.rect(-64, gy0, W + 128, 24), role: 'ground' }, { pts: G.rect(-64, gy0 + 24, W + 128, H), role: 'ground2' }]);
        for (let i = 0; i < 30; i++) s += `<rect x="${i * 48 - 32}" y="${gy0 + 40 + (i % 2) * 24}" width="16" height="8" fill="${c('trunk')}" opacity=".6"/>`;
        el.innerHTML = s;
      },
    },
    worldOptions: { flat: true },
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .22), ink = S.colour('ink'), y = S.colour('yellow'), chars = [...String(text)];
      const svg = K.svgLayer(sc, { fixed: true, z: 20 }), g = K.svgEl(svg, 'g', { filter: 'url(#vk-pixelate)' });
      const T = K.svgEl(g, 'text', { x: p.x, y: p.y + 36, 'text-anchor': 'middle', 'font-family': 'Archivo, Noto Sans SC, sans-serif', 'font-weight': 900, 'font-size': o.size || 120, 'letter-spacing': 8, fill: y, stroke: ink, 'stroke-width': 10, 'paint-order': 'stroke', style: `filter:drop-shadow(8px 8px 0 ${ink})` });
      let box = null, cur = null;
      if (o.sub) {
        const sw = String(o.sub).length * 15 + 80;
        box = K.svgEl(g, 'g', {}, `<rect x="${p.x - sw / 2}" y="${p.y + 66}" width="${sw}" height="50" fill="#29366f" stroke="#f4f4f4" stroke-width="5"/><text x="${p.x - 14}" y="${p.y + 99}" text-anchor="middle" font-family="JetBrains Mono, Noto Sans SC, monospace" font-weight="700" font-size="24" fill="#f4f4f4">${K.esc(o.sub)}</text>`);
        cur = K.svgEl(box, 'path', { d: `M${p.x + sw / 2 - 34} ${p.y + 84} h16 l-8 10 z`, fill: '#f4f4f4' });
      }
      // letters appear one per 1/12 s (typewriter), prompt ▼ blinks 2 Hz
      sc.on(l => { const n = Math.max(0, Math.min(chars.length, Math.floor((l - p.at) * 12))), str = chars.slice(0, n).join(''); if (T.textContent !== str) T.textContent = str; K.attr(g, 'opacity', K.win(l, p.at, .01, p.out, .15) > 0 ? 1 : 0); if (box) K.attr(box, 'opacity', l > p.at + chars.length / 12 + .1 ? 1 : 0); if (cur) K.attr(cur, 'opacity', Math.floor(l * 4) % 2 ? 1 : 0); });
      chars.forEach((ch, i) => sc.sfx(p.at + i / 12, 'chip', .4, 660 + i * 110));
      return g;
    },
    // signature: 8-bit coin burst (square coins on a pixelated layer, ballistic, from vk.particles) + screen shake
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), svg = K.svgLayer(sc, { fixed: true, z: 14 }), g = K.svgEl(svg, 'g', { filter: 'url(#vk-pixelate)' });
      const P = vk.particles({ seed: 13, burst: [{ t: at, n: 16 }], x, y, angle: -90, spread: 150, speed: [380, 700], gravity: 1500, drag: .2, life: [.9, 1.3], size: [16, 22], fadeOut: .2 });
      const cols = [S.colour('yellow'), S.colour('white'), S.colour('orange')], rs = Array.from({ length: 16 }, (_, i) => K.svgEl(g, 'rect', { fill: cols[i % 3], stroke: S.colour('ink'), 'stroke-width': 4, opacity: 0 }));
      sc.on(l => { const A = P.at(l); rs.forEach(r => K.attr(r, 'opacity', 0)); A.forEach(q => { const r = rs[q.id % rs.length], w = q.size * (Math.floor(q.age * 8) % 2 ? .45 : 1); K.attr(r, 'x', (q.x - w / 2).toFixed(0)); K.attr(r, 'y', (q.y - q.size / 2).toFixed(0)); K.attr(r, 'width', w.toFixed(0)); K.attr(r, 'height', q.size.toFixed(0)); K.attr(r, 'opacity', q.alpha.toFixed(2)); }); });
      sc.shake(at, 10, .35, 9);
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    music(v, o = {}) {
      const N = vk.style.scaleNotes(523.25, vk.style.SCALES.penta, 2);
      return vk.style.bed(v, { bpm: 140, gain: o.gain != null ? o.gain : .8, seed: 8, fadeIn: .05, tracks: [
        { voice: 'chip', steps: 'x.x.x.x.x.x.x.x.', notes: [N[0], N[2], N[4], N[2], N[5], N[2], N[4], N[2]], gain: .5 },
        { voice: 'bass', steps: 'x...x...x...x...', notes: [130.81, 130.81, 110, 98], gain: .55 },
        { voice: 'chipNoise', steps: '..x...x...x...x.', gain: .5 },
      ] });
    },
  };
};
