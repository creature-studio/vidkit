// 景阳冈 world kit for 《武松打虎》: ink-wash backgrounds (dusk sky, layered mountains, the ridge, pines, grass, moon),
// paper-cut props (tavern, 酒旗 "三碗不过冈", table and bowls, the notice 榜文, dead tree, rocks, bushes), wind
// (bending grass, brush-stroke gusts), and the big action characters. Every per-frame update is a pure function of
// scene time; static layers are baked once (vk.bake).
(function () {
  const WJ = window.WJ = window.WJ || {};
  const { P, E, slit, arc } = WS;
  const NS = 'http://www.w3.org/2000/svg';
  const N = vk.noise1, H = WS.hash;
  const R1 = x => Math.round(x * 10) / 10;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  WJ.sm = sm; WJ.clamp = clamp;
  const INK = '#1f2529';
  let uid = 0;

  WJ.defs = function (v) {
    vk.installInk({ prefix: 'jy', seed: 5, scale: 1 });
    vk.gl.paperCut(v, { prefix: 'pc', seed: 4, rough: 1, grain: .45, shadow: [3, 5, 3.2, .34] });
    if (!document.getElementById('wj-style')) {
      const st = document.createElement('style'); st.id = 'wj-style';
      st.textContent = `
#stage .jy-root{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
#stage .jy-root svg{position:absolute;left:0;top:0;width:1280px;height:720px;overflow:visible}
#stage .vk-content{z-index:10}
#stage .jy-big{position:absolute;font-family:var(--vk-brush);color:#b5342a;line-height:1;white-space:nowrap;text-shadow:0 0 2px #efe6d0,0 3px 0 rgba(60,20,10,.18);z-index:12}
#stage .jy-card{position:absolute;padding:18px 20px 16px;background:#efe7d2;box-shadow:3px 6px 10px -4px rgba(40,25,10,.45);border:2px solid #6b5438;z-index:12;display:flex;flex-direction:row-reverse;gap:10px;align-items:flex-start}
#stage .jy-card .t{writing-mode:vertical-rl;font-family:var(--vk-brush);font-size:40px;color:#b5342a;line-height:1;letter-spacing:.06em}
#stage .jy-card .b{writing-mode:vertical-rl;font-family:var(--vk-serif);font-size:22px;color:#2a2622;line-height:1.5;letter-spacing:.12em;font-weight:600;white-space:nowrap}
#stage .jy-card .s{align-self:flex-end;background:#b5342a;color:#f6ece0;font-family:var(--vk-brush);font-size:17px;writing-mode:vertical-rl;padding:6px 4px;border-radius:3px;line-height:1.1}
#stage .jy-count{position:absolute;font-family:var(--vk-brush);color:#2a2320;white-space:nowrap;z-index:12;text-shadow:0 0 3px #efe6d0,0 0 8px #efe6d0}
#stage .jy-count b{color:#b5342a;font-weight:400}
#stage .ws-title .vk-vt-main{color:transparent !important}`;
      document.head.appendChild(st);
    }
  };

  /* ---------------- geometry helpers ---------------- */
  // ridge top line points (tapered into `base` at both ends)
  WJ.ridge = (x0, x1, top, amp, seed, freq = .006, base = 760, step = 8) => {
    const out = [];
    for (let x = x0; x <= x1 + .1; x += step) {
      const u = (x - x0) / (x1 - x0), taper = Math.pow(Math.sin(Math.PI * clamp(u)), .5);
      const y = top - amp * (.6 * N(x * freq + seed) + .3 * N(x * freq * 2.7 + seed * 3) + .1 * N(x * freq * 7 + seed * 5));
      out.push([x, base + (y - base) * taper]);
    }
    return out;
  };
  const toD = (pts, base) => `M${pts[0][0]},${base} ` + pts.map(p => `L${R1(p[0])},${R1(p[1])}`).join(' ') + ` L${pts[pts.length - 1][0]},${base} Z`;
  WJ.toD = toD;
  const lineD = pts => 'M' + pts.map(p => `${R1(p[0])},${R1(p[1])}`).join(' L');

  /* ---------------- ink pine (static, baked) ---------------- */
  // x, y = trunk foot; h = height; lean; seed
  function pine(x, y, h, o = {}) {
    const s = o.seed || 1, lean = o.lean || 0, col = o.color || INK, op = o.op == null ? 1 : o.op;
    const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([x + lean * h * u * u + Math.sin(u * 5 + s) * h * .025, y - h * u]); }
    let out = `<path d="${vk.brushPath(pts, u => (1 - u * .78) * h * .06 + 1)}" fill="${col}" opacity="${op}" filter="url(#jy-line)"/>`;
    const layers = o.layers || 5;
    for (let k = 0; k < layers; k++) {
      const u = .42 + .56 * k / (layers - 1), p = pts[Math.round(u * 10)], side = k % 2 ? 1 : -1, w = h * (.46 - .3 * u) * (1 + .3 * (H(s + k) - .5));
      const bx = p[0] + side * w * .15, by = p[1];
      // branch
      out += `<path d="${vk.brushPath([[p[0], p[1] + 4], [p[0] + side * w * .5, p[1] - 2], [p[0] + side * w, p[1] + 6]], h * .018 + 1.5)}" fill="${col}" opacity="${op}"/>`;
      // needle mass: flat fan of brush dabs
      let dabs = '';
      for (let j = 0; j < 9; j++) { const a = (j / 8 - .5), dx = bx + side * w * (.1 + .9 * (j / 8)) * .95 + (H(s * 3 + j + k * 7) - .5) * 10, dy = by - 6 - Math.abs(a) * 10 + (H(s + j * 2.3 + k) - .5) * 6;
        dabs += E(dx, dy, w * .22 + 6, h * .035 + 4, (H(j + k * 3.1 + s) - .5) * 20) + ' '; }
      out += `<path d="${dabs}" fill="${col}" opacity="${.82 * op}" filter="url(#jy-wash)"/>`;
    }
    return `<g class="jy-pine">${out}</g>`;
  }
  WJ.pine = pine;

  /* ---------------- world ---------------- */
  // o: {mood 'dusk'|'dusky'|'night', sun: {x,y,r}, moon: {x,y,r}, ground: y (flat) or fn(x) → y, far, mid (ridge options),
  //     pines: [{x, y, h, lean, seed, layer: 'mid'|'near'}], grass: [{x, y, n, h}], gust: l → 0..1 (wind), leaves: {rate}}
  WJ.world = function (sc, o = {}) {
    const u = 'jy' + (++uid), mood = o.mood || 'dusk';
    const sky = { dusk: ['#d9d4bd', '#ead3a8', '#e6bd8a'], dusky: ['#c9c6b3', '#ddc9a2', '#d9b287'], night: ['#9fa9a8', '#bfc0b2', '#cfc6ae'] }[mood];
    const gy = typeof o.ground === 'function' ? o.ground : (x => (o.ground == null ? 590 : o.ground));
    const G = []; for (let x = -60; x <= 1340; x += 20) G.push([x, gy(x)]);
    const far1 = WJ.ridge(-80, 1360, o.farTop || 300, 120, o.seed || 1.3, .0045);
    const far2 = WJ.ridge(-60, 1340, (o.farTop || 300) + 70, 130, (o.seed || 1.3) + 3.1, .006);
    const midR = o.mid !== false ? WJ.ridge(-60, 1340, (o.midTop || 430), o.midAmp || 110, (o.seed || 1.3) + 7.7, .007) : null;
    const pines = (o.pines || []).map(p => ({ layer: 'mid', ...p }));
    const root = sc.html(`<div class="jy-root jy-${mood}">
      <svg viewBox="0 0 1280 720" aria-hidden="true">
        <defs>
          <linearGradient id="${u}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".62" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
          <linearGradient id="${u}-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f6c6a" stop-opacity=".62"/><stop offset=".55" stop-color="#7f8b86" stop-opacity=".22"/><stop offset="1" stop-color="#9aa39b" stop-opacity="0"/></linearGradient>
          <linearGradient id="${u}-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#33403f" stop-opacity=".78"/><stop offset=".5" stop-color="#4f5b56" stop-opacity=".38"/><stop offset="1" stop-color="#7c8579" stop-opacity=".08"/></linearGradient>
          <linearGradient id="${u}-gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9a47a" stop-opacity=".75"/><stop offset=".35" stop-color="#c6b68f" stop-opacity=".55"/><stop offset="1" stop-color="#a99670" stop-opacity=".7"/></linearGradient>
          <radialGradient id="${u}-halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6dc" stop-opacity=".75"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
        </defs>
        <g class="jy-static">
          <rect x="-20" y="-20" width="1320" height="760" fill="url(#${u}-sky)"/>
          ${o.moon ? `<circle cx="${o.moon.x}" cy="${o.moon.y}" r="${o.moon.r * 2.4}" fill="url(#${u}-halo)"/>` : ''}
        </g>
        <g class="jy-sun">${o.sun ? `<g filter="url(#pc)">${P(E(o.sun.x, o.sun.y, o.sun.r), o.sun.color || '#c9442e', { step: 7, amp: .9 })}</g>` : ''}${o.moon ? `<g filter="url(#pc-cut)">${P(E(o.moon.x, o.moon.y, o.moon.r), '#f4eedb', { step: 7, amp: .8 })}${P(E(o.moon.x - o.moon.r * .25, o.moon.y - o.moon.r * .1, o.moon.r * .22), '#e5dcc2', { amp: .4 })}</g>` : ''}</g>
        <g class="jy-far">
          <path d="${toD(far1, 760)}" fill="url(#${u}-far)" filter="url(#jy-far)"/>
          <path d="${toD(far2, 760)}" fill="url(#${u}-far)" opacity=".9" filter="url(#jy-wash)"/>
        </g>
        <g class="jy-mistw"><g class="jy-mist">${(o.mist || []).map((m, i) => Array.from({ length: 7 }, (_, j) => `<ellipse cx="${-200 + j * 260 + H(i * 9 + j) * 90}" cy="${m.y + (H(j * 3 + i) - .5) * m.h * .5}" rx="${170 + H(j + i * 2) * 120}" ry="${m.h * (.35 + .25 * H(j * 5 + i))}" fill="${o.mistColor || '#efe8d4'}" opacity="${m.op || .7}"/>`).join('')).join('')}</g></g>
        <g class="jy-mid">
          ${midR ? `<path d="${toD(midR, 760)}" fill="url(#${u}-mid)" filter="url(#jy-wash)"/><path d="${vk.brushPath(midR.filter((p, i) => i % 2 === 0), u2 => 2 + 3 * Math.sin(Math.PI * u2))}" fill="${INK}" opacity=".35" filter="url(#jy-line)"/>` : ''}
          ${pines.filter(p => p.layer === 'mid').map(p => pine(p.x, p.y, p.h, { ...p, op: p.op == null ? .55 : p.op })).join('')}
        </g>
        <g class="jy-ground">
          <path d="${toD(G, 780)}" fill="url(#${u}-gr)" filter="url(#jy-wash)"/>
          <path d="${vk.brushPath(G, u2 => 2.5 + 2.5 * Math.sin(Math.PI * u2) * (.6 + .4 * N(u2 * 9)))}" fill="${INK}" opacity=".55" filter="url(#jy-line)"/>
          ${Array.from({ length: 14 }, (_, i) => { const x = 40 + i * 92 + H(i * 3.3) * 40, y = gy(x) + 26 + H(i * 7.1) * 60; return `<path d="${vk.brushPath([[x, y], [x + 30 + H(i) * 40, y + 2], [x + 70 + H(i + 9) * 50, y - 1]], 3)}" fill="${INK}" opacity=".22"/>`; }).join('')}
        </g>
        <g class="jy-near">${pines.filter(p => p.layer === 'near').map(p => pine(p.x, p.y, p.h, p)).join('')}</g>
        <g class="jy-props"></g>
        <g class="jy-actors"></g>
        <g class="jy-grass"></g>
        <g class="jy-fx"></g>
        <g class="jy-front"></g>
      </svg>
    </div>`);
    if (sc.cam) sc.cam.insertBefore(root, sc.content);
    sc.content.style.zIndex = 10;
    const $ = s => root.querySelector(s);
    ['.jy-static', '.jy-far', '.jy-mid', '.jy-ground', '.jy-near'].forEach(s => vk.bake($(s), { scale: 1 }));
    const mistG = $('.jy-mist');
    if (o.mist && o.mist.length) { mistG.setAttribute('filter', 'url(#jy-far)'); vk.bake(mistG, { scale: .5 }); }
    const W = { root, svg: $('svg'), u, gy, props: $('.jy-props'), actors: $('.jy-actors'), fx: $('.jy-fx'), front: $('.jy-front'), grassG: $('.jy-grass'), sunG: $('.jy-sun'), $ };
    // grass tufts bending with the wind (pure: blade tips follow sway(t) + gust)
    const gust = o.gust || (() => 0);
    W.gust = gust;
    const tufts = (o.grass || []).map((g, i) => ({ ...g, el: (() => { const e = document.createElementNS(NS, 'path'); e.setAttribute('fill', g.color || INK); e.setAttribute('opacity', g.op || .78); W.grassG.appendChild(e); return e; })(), seed: i * 3.7 + 1 }));
    sc.on(l => {
      const gv = gust(l);
      if (o.mist && o.mist.length) vk.attr($('.jy-mistw'), { transform: `translate(${R1(l * (o.mistSpeed || 8) - 60)} 0)` });
      tufts.forEach(g => {
        let d = '';
        const n = g.n || 5, h = g.h || 34, y0 = g.y != null ? g.y : gy(g.x) + 4;
        for (let j = 0; j < n; j++) {
          const bx = g.x + (j - (n - 1) / 2) * 5.5, hh = h * (.6 + .5 * H(g.seed + j)), sway = 5 * Math.sin(l * 2.3 + g.seed + j * .6) + gv * (26 + 10 * Math.sin(l * 13 + j + g.seed)) + (j - (n - 1) / 2) * 5;
          d += vk.brushPath([[bx, y0], [bx + sway * .25, y0 - hh * .5], [bx + sway * .8, y0 - hh * .92], [bx + sway, y0 - hh]], u2 => 4.2 * (1 - u2 * .92)) + ' ';
        }
        vk.attr(g.el, { d });
      });
    });
    // brush-stroke gust lines (wind made visible), active where gust(l) > 0
    if (o.windLines) {
      const lines = Array.from({ length: o.windLines }, (_, i) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('fill', '#f4efe0'); e.setAttribute('filter', 'url(#jy-wash)'); W.fx.appendChild(e); return { e, y: 150 + (i * 97) % 380, sp: 900 + (i % 3) * 260, ph: H(i * 5.3) * 3, len: 220 + (i % 4) * 70 }; });
      sc.on(l => {
        const gv = gust(l);
        lines.forEach((w, i) => {
          if (gv <= .02) { vk.attr(w.e, { opacity: 0 }); return; }
          const x = ((l * w.sp + w.ph * 700) % 1900) - 300, y = w.y + Math.sin(l * 2 + i) * 18;
          const pts = vk.sampleLine(k => [x - k * w.len, y + Math.sin(k * 5 + l * 3 + i) * 12 + k * 18 - (k > .75 ? (k - .75) * 70 * Math.sin(i + l) : 0)], 14);
          vk.attr(w.e, { d: vk.brushPath(pts, k => 7 * Math.sin(Math.PI * k) * (1 - k * .4)), opacity: (.55 * gv).toFixed(2) });
        });
      });
    }
    return W;
  };
  WJ.leaves = function (sc, o = {}) {
    return vk.gl.particles({ preset: 'petals', seed: o.seed || 3, rate: o.rate || 5, from: o.from || 0, to: o.to || 30, line: o.line || [1300, 80, 1300, 520],
      angle: 180, spread: 26, speed: [380, 720], gravity: 60, drag: .6, life: [2.2, 3.4], size: [7, 12], sway: 30, swayFreq: 1.4, spin: [-420, 420],
      color: o.color || '#8a5a2a', color2: o.color2 || '#c9993f', ...(o.extra || {}) });
  };

  /* ---------------- paper-cut props ---------------- */
  const add = (parent, markup) => { parent.insertAdjacentHTML('beforeend', markup.trim()); return parent.lastElementChild; };
  WJ.add = add;
  // 酒旗: pole + fluttering cloth with 三碗不过冈 (cloth path + text follow a travelling wave)
  WJ.flag = function (sc, parent, x, y, o = {}) {
    const g = add(parent, `<g class="jy-flag" filter="url(#pc)">
      <g>${P(`M${x - 5} ${y - 12} L${x + 5} ${y - 12} L${x + 7} ${y + (o.pole || 460)} L${x - 7} ${y + (o.pole || 460)} Z`, '#6d4a2a', { step: 8 })}${P(E(x, y - 16, 9, 9), '#3b2616')}
        ${P(`M${x} ${y + 6} L${x + 180} ${y + 6} L${x + 180} ${y + 14} L${x} ${y + 14} Z`, '#6d4a2a', { amp: .5 })}</g>
      <path class="cloth" fill="#efe6cf"/><path class="band" fill="#b5342a"/><path class="band2" fill="#b5342a"/>
      <g class="txt"><text x="0" y="0" font-family="Ma Shan Zheng" font-size="46" fill="#1f1b1a" writing-mode="tb" style="writing-mode:vertical-rl;letter-spacing:4px">三碗不过冈</text></g>
    </g>`);
    const cloth = g.querySelector('.cloth'), band = g.querySelector('.band'), band2 = g.querySelector('.band2'), txt = g.querySelector('.txt');
    const W0 = 100, H0 = 290, x0 = x + 34, y0 = y + 14;
    const wave = (u, v, l, k) => (Math.sin(l * 4.2 - u * 3.4 + v * 1.4) * (4 + 12 * u) + Math.sin(l * 7.1 - u * 6) * 2 * u) * (o.wind ? o.wind(l) + .4 : 1) * (k || 1);
    const pt = (u, v, l) => [x0 + u * W0 + wave(u, v, l) * .35, y0 + v * H0 + wave(u, v, l)];
    const quad = (u0, u1, v0, v1, l) => { const a = []; for (let i = 0; i <= 8; i++) a.push(pt(u0 + (u1 - u0) * i / 8, v0, l)); for (let i = 0; i <= 12; i++) a.push(pt(u1, v0 + (v1 - v0) * i / 12, l)); for (let i = 8; i >= 0; i--) a.push(pt(u0 + (u1 - u0) * i / 8, v1, l)); for (let i = 12; i >= 0; i--) a.push(pt(u0, v0 + (v1 - v0) * i / 12, l)); return 'M' + a.map(p => R1(p[0]) + ' ' + R1(p[1])).join(' L') + ' Z'; };
    // swallow-tail bottom
    const clothD = l => { const a = []; for (let i = 0; i <= 8; i++) a.push(pt(i / 8, 0, l)); for (let i = 0; i <= 12; i++) a.push(pt(1, i / 12 * .96, l)); a.push(pt(.72, 1.06, l)); a.push(pt(.5, .9, l)); a.push(pt(.28, 1.06, l)); for (let i = 12; i >= 0; i--) a.push(pt(0, i / 12 * .96, l)); return 'M' + a.map(p => R1(p[0]) + ' ' + R1(p[1])).join(' L') + ' Z'; };
    sc.on(l => {
      vk.attr(cloth, { d: clothD(l) }); vk.attr(band, { d: quad(0, 1, 0, .06, l) }); vk.attr(band2, { d: quad(0, .1, .06, .96, l) });
      const [tx, ty] = pt(.55, .14, l), [tx2, ty2] = pt(.55, .8, l), ang = Math.atan2(tx2 - tx, ty2 - ty) * -180 / Math.PI;
      vk.attr(txt, { transform: `translate(${R1(tx - 2)} ${R1(ty)}) rotate(${R1(ang)})` });
    });
    return { g, top: [x0, y0] };
  };
  // 酒家: thatched roof, posts, lintel, a doorway; x = left edge, y = ground
  WJ.tavern = function (parent, x, y) {
    const w = 440, h = 250;
    return add(parent, `<g class="jy-tavern" filter="url(#pc)">
      ${P(`M${x + 20} ${y - h + 40} L${x + w - 20} ${y - h + 40} L${x + w - 20} ${y} L${x + 20} ${y} Z`, '#a88657', { step: 8 })}
      ${P(`M${x + 150} ${y - 170} L${x + 290} ${y - 170} L${x + 290} ${y} L${x + 150} ${y} Z`, '#3a2a1e', { step: 7 })}
      ${P(`M${x + 44} ${y - 150} L${x + 120} ${y - 150} L${x + 120} ${y - 90} L${x + 44} ${y - 90} Z M${x + 54} ${y - 140} L${x + 110} ${y - 140} L${x + 110} ${y - 100} L${x + 54} ${y - 100} Z`, '#6b4a2c', { rule: 'evenodd', amp: .6 })}
      ${P([0, 1, 2, 3].map(i => `M${x + 58 + i * 14} ${y - 140} L${x + 62 + i * 14} ${y - 140} L${x + 62 + i * 14} ${y - 100} L${x + 58 + i * 14} ${y - 100} Z`).join(' '), '#6b4a2c', { amp: .3 })}
      ${[x + 20, x + 150, x + 290, x + w - 34].map(px => P(`M${px} ${y - h + 50} L${px + 14} ${y - h + 50} L${px + 14} ${y} L${px} ${y} Z`, '#5a3b22', { step: 8 })).join('')}
      ${P(`M${x - 30} ${y - h + 60} C${x + 60} ${y - h - 10} ${x + w - 60} ${y - h - 10} ${x + w + 30} ${y - h + 60} L${x + w + 16} ${y - h + 80} L${x - 16} ${y - h + 80} Z`, '#c9a55e', { step: 7 })}
      ${P(Array.from({ length: 22 }, (_, i) => { const px = x - 18 + i * 22; return slit([[px, y - h + 30 - Math.sin(i / 21 * Math.PI) * 50], [px + 3, y - h + 78]], 3.4, false); }).join(' '), '#8c6a33', { amp: .4 })}
      ${P(`M${x + 150} ${y - 214} L${x + 290} ${y - 214} L${x + 290} ${y - 178} L${x + 150} ${y - 178} Z`, '#1f1b1a', { amp: .5 })}
      <text x="${x + 220}" y="${y - 186}" font-family="Ma Shan Zheng" font-size="30" fill="#e9d9a8" text-anchor="middle" letter-spacing="10">酒家</text>
      ${P(E(x + 330, y - 150, 16, 20) + ' ' + E(x + 372, y - 152, 16, 20), '#b5342a', { amp: .6 })}
    </g>`);
  };
  // table with a wine jar; bowls are stacked on it later
  WJ.table = function (parent, x, y) {
    return add(parent, `<g class="jy-table" filter="url(#pc)">
      ${P(`M${x - 110} ${y - 92} L${x + 110} ${y - 92} L${x + 110} ${y - 78} L${x - 110} ${y - 78} Z`, '#6d4a2a', { step: 7 })}
      ${P(`M${x - 96} ${y - 80} L${x - 82} ${y - 80} L${x - 86} ${y} L${x - 98} ${y} Z M${x + 82} ${y - 80} L${x + 96} ${y - 80} L${x + 98} ${y} L${x + 86} ${y} Z`, '#4f341e', { step: 7 })}
      ${P(`M${x - 90} ${y - 40} L${x + 90} ${y - 40} L${x + 90} ${y - 32} L${x - 90} ${y - 32} Z`, '#4f341e')}
      ${P(`M${x + 50} ${y - 92} C${x + 34} ${y - 110} ${x + 36} ${y - 150} ${x + 56} ${y - 160} L${x + 90} ${y - 160} C${x + 110} ${y - 150} ${x + 112} ${y - 110} ${x + 96} ${y - 92} Z`, '#5b3a22', { step: 6 })}
      ${P(`M${x + 58} ${y - 170} L${x + 88} ${y - 170} L${x + 90} ${y - 158} L${x + 56} ${y - 158} Z`, '#2d1f14')}
      ${P(`M${x + 60} ${y - 142} L${x + 86} ${y - 142} L${x + 86} ${y - 116} L${x + 60} ${y - 116} Z`, '#b5342a', { amp: .4 })}
      <text x="${x + 73}" y="${y - 121}" font-family="Ma Shan Zheng" font-size="21" fill="#f3e6c8" text-anchor="middle">酒</text>
    </g>`);
  };
  // one bowl (paper-cut), cx, cy = rim centre
  WJ.bowl = (cx, cy, s = 1) => P(`M${cx - 20 * s} ${cy} L${cx + 20 * s} ${cy} C${cx + 18 * s} ${cy + 13 * s} ${cx + 10 * s} ${cy + 18 * s} ${cx} ${cy + 18 * s} C${cx - 10 * s} ${cy + 18 * s} ${cx - 18 * s} ${cy + 13 * s} ${cx - 20 * s} ${cy} Z`, '#7a4f2e', { amp: .4 })
    + P(`M${cx - 20 * s} ${cy} L${cx + 20 * s} ${cy} L${cx + 19 * s} ${cy + 4 * s} L${cx - 19 * s} ${cy + 4 * s} Z`, '#e9dfc4', { amp: .25 });
  // 店家: simple paper-cut innkeeper (body, head, pouring arm with a jug); returns set({x, y, pour 0..1, nod})
  WJ.keeper = function (parent, x, y) {
    const g = add(parent, `<g class="jy-keeper" filter="url(#pc-shadow)">
      <g class="kb">${P('M-34 0 C-38 -60 -34 -120 -22 -150 L22 -150 C32 -120 36 -60 34 0 Z', '#5b6f7a', { step: 6 })}${P('M-28 -110 L26 -112 L30 -2 L-30 -2 Z', '#efe3c6', { step: 6 })}${P('M-30 -118 L28 -120 L28 -110 L-30 -108 Z', '#3b3230')}</g>
      <g class="kh">${P('M-16 -150 L16 -150 L14 -168 L-14 -168 Z', '#dfb08a')}${P('M-24 -186 C-26 -212 -6 -226 8 -224 C28 -222 36 -204 32 -180 C30 -164 16 -156 2 -156 C-14 -156 -24 -168 -24 -186 Z', '#f1cda8')}
        ${P('M-26 -196 C-24 -224 4 -236 26 -224 C36 -216 36 -206 32 -200 C20 -208 -6 -210 -26 -196 Z', '#3b3230')}${P(slit([[8, -194], [22, -196]], 3), '#1e1b1f')}${P(E(16, -190, 2.4, 2.6), '#1e1b1f')}
        ${P('M4 -172 C12 -168 26 -170 32 -178 C30 -160 14 -150 2 -158 Z', '#e9e3d6')}${P(slit([[-16, -196], [-10, -170]], 5), '#e9e3d6')}</g>
      <g class="ka">${P('M-8 -6 L10 -6 L8 60 L-8 60 Z', '#5b6f7a')}${P(E(0, 66, 9, 9), '#f1cda8')}
        ${P('M-14 66 C-24 70 -26 96 -10 104 L14 104 C28 96 26 70 16 66 Z', '#5b3a22')}${P('M-8 60 L10 60 L10 68 L-8 68 Z', '#2d1f14')}</g>
      <path class="kpour" fill="#b98a4a" opacity="0"/>
    </g>`);
    const kh = g.querySelector('.kh'), ka = g.querySelector('.ka'), pour = g.querySelector('.kpour');
    return {
      g, set(s) {
        vk.attr(g, { transform: `translate(${R1(s.x)} ${R1(s.y)}) scale(${-(s.scale || 1)} ${s.scale || 1})` });
        vk.attr(kh, { transform: `rotate(${R1((s.nod || 0) * 8)} 0 -156)` });
        vk.attr(ka, { transform: `translate(20 -132) rotate(${R1(-30 - 70 * (s.pour || 0))})` });
        const pw = clamp(((s.pour || 0) - .6) / .4);
        if (pw > 0) { vk.attr(pour, { opacity: .9, d: vk.brushPath([[s.jx || 0, s.jy || 0], [(s.jx || 0) + 4, (s.jy || 0) + 40 * pw]], 4, { round: true }) }); } else vk.attr(pour, { opacity: 0 });
      },
    };
  };
  // notice 榜文 on a tree trunk (paper-cut sheet)
  WJ.notice = (x, y, s = 1) => `<g class="jy-notice" filter="url(#pc)">${P(`M${x - 34 * s} ${y - 44 * s} L${x + 34 * s} ${y - 46 * s} L${x + 36 * s} ${y + 46 * s} L${x - 33 * s} ${y + 44 * s} Z`, '#f3ecd8', { step: 6 })}
    ${P([0, 1, 2, 3, 4].map(i => `M${x + (20 - i * 11) * s} ${y - 36 * s} L${x + (24 - i * 11) * s} ${y - 36 * s} L${x + (24 - i * 11) * s} ${y + (i === 4 ? 10 : 32) * s} L${x + (20 - i * 11) * s} ${y + (i === 4 ? 10 : 32) * s} Z`).join(' '), '#2a2622', { amp: .35 })}
    ${P(`M${x - 30 * s} ${y + 16 * s} L${x - 12 * s} ${y + 16 * s} L${x - 12 * s} ${y + 34 * s} L${x - 30 * s} ${y + 34 * s} Z`, '#b5342a', { amp: .4 })}</g>`;
  // ink tree (big trunk + a few boughs); dead: bare, gnarled. Returns markup; the bough used for the staff hit ends at (x + bx, y + by)
  WJ.tree = (x, y, h, o = {}) => {
    const s = o.seed || 2, lean = o.lean || 0;
    const trunk = []; for (let i = 0; i <= 12; i++) { const u = i / 12; trunk.push([x + lean * h * u * u + Math.sin(u * 6 + s) * h * .03, y - h * u]); }
    let out = `<path d="${vk.brushPath(trunk, u => (1 - u * .8) * h * .09 + 2)}" fill="${o.color || '#2a2522'}" filter="url(#jy-line)"/>`;
    (o.boughs || []).forEach(b => { const p = trunk[Math.round(b.at * 12)], dx = b.to ? b.to[0] - p[0] : b.dx, dy = b.to ? b.to[1] - p[1] : b.dy; const pts = vk.sampleLine(u => [p[0] + dx * u, p[1] + dy * u - Math.sin(u * Math.PI) * (b.bend || 20)], 10); out += `<path d="${vk.brushPath(pts, u => (1 - u * .85) * (b.w || h * .04) + 1.2)}" fill="${o.color || '#2a2522'}" filter="url(#jy-line)"/>`;
      (b.twigs || []).forEach(tw => { const q = pts[Math.round(tw[0] * 9)]; out += `<path d="${vk.brushPath([[q[0], q[1]], [q[0] + tw[1] * .5, q[1] + tw[2] * .6 - 6], [q[0] + tw[1], q[1] + tw[2]]], 3.2)}" fill="${o.color || '#2a2522'}"/>`; }); });
    if (o.leaves) (o.leaves).forEach((c, i) => { out += `<path d="${[0, 1, 2, 3, 4, 5].map(j => E(c[0] + (H(i * 7 + j) - .5) * c[2] * 1.4, c[1] + (H(i * 3 + j * 1.7) - .5) * c[2] * .6, c[2] * (.35 + .25 * H(j + i)), c[2] * .22, (H(j * 2 + i) - .5) * 30)).join(' ')}" fill="${o.leafColor || '#2f3a33'}" opacity=".78" filter="url(#jy-wash)"/>`; });
    return `<g class="jy-tree">${out}</g>`;
  };
  // big blue-grey rock (青石), paper-cut
  WJ.rock = (x, y, w, h, o = {}) => `<g class="jy-rock" filter="url(#pc)">${P(`M${x - w / 2} ${y} C${x - w * .52} ${y - h * .6} ${x - w * .3} ${y - h} ${x - w * .05} ${y - h} C${x + w * .25} ${y - h * 1.02} ${x + w * .5} ${y - h * .7} ${x + w / 2} ${y} Z`, o.color || '#687a7c', { step: 7 })}
    ${P(slit(arc([x - w * .3, y - h * .55], [x + w * .1, y - h * .8], -8, 8), 5) + ' ' + slit(arc([x - w * .05, y - h * .35], [x + w * .32, y - h * .45], -6, 8), 4), o.line || '#4a5a5c', { amp: .4 })}</g>`;
  // dense bushes (ink wash dabs + a paper-cut dark mass) for the tiger to burst out of
  WJ.bush = (x, y, w, h, o = {}) => {
    let d = ''; for (let i = 0; i < 26; i++) { const px = x + (H(i * 1.9 + (o.seed || 0)) - .5) * w, py = y - H(i * 3.1 + (o.seed || 0)) * h * .85; d += E(px, py, 26 + H(i) * 30, 14 + H(i * 2) * 14, (H(i * 5) - .5) * 40) + ' '; }
    return `<g class="jy-bush"><path d="${d}" fill="${o.color || '#27322d'}" opacity="${o.op || .9}" filter="url(#jy-wash)"/></g>`;
  };

  /* ---------------- text effects ---------------- */
  // big red brush character stamped in (扑 / 掀 / 剪): DOM (QA-visible), scaled pop + slight rotation, fades out
  WJ.bigChar = function (sc, ch, at, o = {}) {
    const el = sc.html(`<div class="jy-big" style="left:${o.x || 560}px;top:${o.y || 90}px;font-size:${o.size || 132}px">${ch}</div>`, { fixed: false });
    const out = o.out || at + 1.3;
    sc.on(l => {
      const a = clamp((l - at) / .18), b = 1 - clamp((l - out) / .35);
      el.style.opacity = String(Math.round(Math.min(a, b) * 1000) / 1000);
      el.style.transform = `scale(${(1 + .6 * (1 - sm(a))).toFixed(3)}) rotate(${(-6 + 6 * sm(a)).toFixed(2)}deg)`;
    });
    return el;
  };
})();
