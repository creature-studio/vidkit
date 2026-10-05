// 蜡笔绘本 crayon picture-book pack runtime: warm paper, pastel crayon hills with wax tooth, scribbled sun, flowers,
// boiling crayon outlines (8 drawings/s, pure function of t), ZCOOL KuaiLe hand-lettered titles, doodle sparkles.
export default vk => {
  const K = vk.style.kit, G = vk.geom;
  const heart = (x, y, r) => { const out = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, X = 16 * Math.pow(Math.sin(a), 3), Y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); out.push([x + X * r / 16, y + Y * r / 16]); } return out; };
  return {
    install(v, S) {
      const fps = (S.charView.P && S.charView.P.boil) || 8;
      // boil: the crayon line filter's turbulence seed steps `fps` times per second of video time
      v.onRender(t => { const el = document.querySelector('#cr-line .cr-boil'); if (el) { const s = String(2 + Math.floor(t * fps + 1e-6) % 6); if (el.getAttribute('seed') !== s) el.setAttribute('seed', s); } });
    },
    layerAttrs(name) { return name === 'sky' ? '' : 'filter="url(#cr-line)"'; },
    hooks: {
      sky(el, ctx) {
        const { W, H, S: st, style } = ctx, c = r => style.colour(r, r), M = vk.style.material('crayon'), P = style.P;
        const [a, b] = st.time === 'night' ? [c('night0'), c('night1')] : st.time === 'dusk' ? [c('dusk0'), c('dusk1')] : [c('sky0'), c('sky1')];
        let s = `<rect x="-60" y="-60" width="${W + 120}" height="${H + 120}" fill="${b}"/>`;
        // sky coloured in with crayon: wax fill (paper tooth gaps) + a few loose horizontal strokes
        s += `<rect x="-60" y="-60" width="${W + 120}" height="${H * .62}" fill="${a}" filter="url(#cr-wax)" opacity=".9"/>`;
        let st2 = ''; for (let i = 0; i < 9; i++) st2 += `M${-40 + G.rnd(3, i) * 200} ${60 + i * 36} C${400} ${50 + i * 36 + 14 * Math.sin(i)}, ${800} ${66 + i * 36}, ${W + 40} ${58 + i * 36}`;
        s += `<path d="${st2}" fill="none" stroke="${vk.color.shade(a, -.08)}" stroke-width="7" stroke-linecap="round" opacity=".35" filter="url(#cr-wax)"/>`;
        const sx = W * .8, sy = 130; s += `<g filter="url(#cr-line)">` + M.paint({ pts: G.blob(sx, sy, 62, 62, 4, .06), col: st.time === 'night' ? c('moon') : c('sun'), seed: 2 }, P);
        if (st.time !== 'night') for (let i = 0; i < 12; i++) { const ang = i / 12 * Math.PI * 2; s += `<path d="M${(sx + Math.cos(ang) * 78).toFixed(0)} ${(sy + Math.sin(ang) * 78).toFixed(0)} L${(sx + Math.cos(ang) * 110).toFixed(0)} ${(sy + Math.sin(ang) * 110).toFixed(0)}" stroke="${c('sun')}" stroke-width="9" stroke-linecap="round"/>`; }
        [[220, 110], [600, 80], [1000, 250]].forEach(([x, y], i) => { s += M.paint({ pts: G.blob(x, y, 86, 30, 9 + i, .25), col: c('cloud'), seed: 30 + i }, P); });
        el.innerHTML = s + '</g>';
      },
      far(el, ctx, paint) { const { W, gy0, seed } = ctx; el.innerHTML = paint([{ pts: G.hills(-60, W + 60, gy0 - 170, 60, seed + .5, { base: gy0 + 40, freq: .005 }), role: 'far' }]); },
      mid(el, ctx, paint) { const { W, gy0, seed } = ctx; el.innerHTML = paint([{ pts: G.hills(-60, W + 60, gy0 - 80, 40, seed + 2.2, { base: gy0 + 40, freq: .008 }), role: 'mid' }]); },
    },
    title(sc, text, o = {}, S) {
      const p = K.placeOpts(sc, o, .5, .2), cols = ['red', 'blue', 'green', 'orange', 'purple', 'pink'].map(n => S.colour(n)), chars = [...String(text)];
      const el = K.overlay(sc, `<div style="position:absolute;left:0;right:0;top:${p.y - 66}px;text-align:center;font:400 ${o.size || 112}px/1.1 'ZCOOL KuaiLe','Noto Sans SC',sans-serif;filter:url(#cr-line)">${chars.map((ch, i) => `<span class="cr-ch" style="display:inline-block;color:${cols[i % cols.length]};-webkit-text-stroke:3px #3b2a20;paint-order:stroke fill">${K.esc(ch)}</span>`).join('')}</div>
        ${o.sub ? `<div class="cr-s" style="position:absolute;left:50%;transform:translateX(-50%);top:${p.y + 70}px;padding:8px 22px;border-radius:16px;background:#fff9ee;border:3px dashed ${S.colour('red')};font:400 28px 'ZCOOL KuaiLe','Noto Sans SC',sans-serif;color:#3b2a20;white-space:nowrap">${K.esc(o.sub)}</div>` : ''}`, { z: 20 });
      const cs = [...el.querySelectorAll('.cr-ch')], s2 = el.querySelector('.cr-s');
      sc.on(l => { const a = K.win(l, p.at, .2, p.out, .35); K.css(el, 'opacity', a.toFixed(3)); cs.forEach((c, i) => { const u = K.ease.back(K.prog(l, p.at + i * .1, .45)); K.css(c, 'transform', `translateY(${(-40 * (1 - u)).toFixed(1)}px) rotate(${((i % 2 ? 4 : -4) * (1 - u) + (i % 2 ? 2 : -2)).toFixed(1)}deg) scale(${(.3 + .7 * u).toFixed(3)})`); }); if (s2) K.css(s2, 'opacity', K.prog(l, p.at + .5, .3).toFixed(3)); });
      if (o.sfx !== false) S.sfx(sc, 'title', p.at + .1);
      return el;
    },
    // signature: crayon doodles (stars + hearts) pop and float around the subject
    effect(sc, name, o = {}, S) {
      const at = o.at || 0, [x, y] = sc.toScreen([o.x || 640, o.y || 300], at), M = vk.style.material('crayon'), P = S.charView.P;
      const svg = K.svgLayer(sc, { fixed: true, z: 14 }), cols = ['yellow', 'red', 'blue', 'pink', 'orange', 'green'].map(n => S.colour(n));
      const items = []; for (let i = 0; i < 9; i++) { const a = -Math.PI * (.08 + .84 * i / 8), R = 150 + 40 * G.rnd(4, i); const g = K.svgEl(svg, 'g', { filter: 'url(#cr-line)', opacity: 0 }); g.innerHTML = M.paint({ pts: i % 3 === 1 ? heart(0, 0, 26) : G.star(0, 0, 30, 13, 5), col: cols[i % cols.length], seed: 40 + i }, P); items.push({ g, a, R, d: i * .05 }); }
      sc.on(l => items.forEach(it => { const u = K.ease.back(K.prog(l, at + it.d, .5)), f = l - at - it.d; K.attr(it.g, 'opacity', K.win(l, at + it.d, .05, at + 1.5, .4).toFixed(3)); K.attr(it.g, 'transform', `translate(${(x + Math.cos(it.a) * it.R * u).toFixed(1)} ${(y + Math.sin(it.a) * it.R * u - 12 * Math.max(0, f)).toFixed(1)}) rotate(${(20 * Math.sin(f * 3 + it.a)).toFixed(1)}) scale(${(.2 + .8 * u).toFixed(3)})`); }));
      if (o.sfx !== false) S.sfx(sc, 'big', at);
      return null;
    },
    music(v, o = {}) {
      const N = vk.style.scaleNotes(261.63, vk.style.SCALES.penta, 3);
      return vk.style.bed(v, { bpm: 100, gain: o.gain != null ? o.gain : .8, seed: 10, fadeIn: .1, tracks: [
        { voice: 'kalimba', steps: 'x..x..x.x..x.x..', notes: N.slice(3, 12), walk: true, rest: .15, gain: .55 },
        { voice: 'marimba', steps: 'x.......x.......', notes: [130.81, 196, 164.81, 196], gain: .5 },
        { voice: 'shaker', steps: '..x...x...x...x.', gain: .6 },
      ] });
    },
  };
};
