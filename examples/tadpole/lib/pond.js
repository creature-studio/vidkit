// 小蝌蚪找妈妈 — pond worlds (ink-wash, 960×540 design units; every visual is a pure function of scene time).
// Layers per scene: far svg (sky, sun, washed mountains — parallax .35), mid svg (static water body, bottom, far
// weeds — panned by CSS transform so it is never re-rastered), live svg (rays, weeds, lotus, reeds, ripples,
// characters) with the camera applied as a group transform.
(function () {
  const TP = window.TP = window.TP || {};
  const A = vk.attr, N = vk.noise1, H = vk.hash;
  const INK = '#1f2529';
  TP.INK = INK; TP.WATER = '#b7c6bd';
  const f1 = x => Math.round(x * 10) / 10;
  TP.f1 = f1;

  // ------------------------------------------------------------------ global defs (gradients, filters) once
  TP.defs = function (v) {
    vk.installInk({ prefix: 'ink', seed: 7, boil: 0 });
    if (document.getElementById('tp-defs')) return;
    const d = document.createElement('div');
    d.innerHTML = `<svg id="tp-defs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
      <linearGradient id="tp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d3d9c9"/><stop offset=".65" stop-color="#e6e8da"/><stop offset="1" stop-color="#e9e9dc"/></linearGradient>
      <linearGradient id="tp-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d3c3"/><stop offset=".6" stop-color="#ead9c0"/><stop offset="1" stop-color="#eee2cc"/></linearGradient>
      <linearGradient id="tp-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2dccf"/><stop offset=".45" stop-color="#bfcdc3"/><stop offset="1" stop-color="#a9bbb1"/></linearGradient>
      <linearGradient id="tp-surf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d4c8"/><stop offset="1" stop-color="#dfe4d6"/></linearGradient>
      <linearGradient id="tp-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f6ea" stop-opacity=".55"/><stop offset="1" stop-color="#f6f6ea" stop-opacity="0"/></linearGradient>
      <radialGradient id="tp-mist"><stop offset="0" stop-color="#f4f4ea" stop-opacity=".9"/><stop offset="1" stop-color="#f4f4ea" stop-opacity="0"/></radialGradient>
      <radialGradient id="tp-tad" cx=".62" cy=".38" r=".7"><stop offset="0" stop-color="#3d474c"/><stop offset=".55" stop-color="#1f2529"/><stop offset="1" stop-color="#161b1e"/></radialGradient>
      <radialGradient id="tp-halo"><stop offset="0" stop-color="#1f2529" stop-opacity=".35"/><stop offset="1" stop-color="#1f2529" stop-opacity="0"/></radialGradient>
      <radialGradient id="tp-glow"><stop offset="0" stop-color="#fff7d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff7d8" stop-opacity="0"/></radialGradient>
      <radialGradient id="tp-egg" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f3f5ec" stop-opacity=".95"/><stop offset="1" stop-color="#c9d5cb" stop-opacity=".55"/></radialGradient>
      <radialGradient id="tp-frog" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#8fb36f"/><stop offset=".7" stop-color="#5f8a4c"/><stop offset="1" stop-color="#4b7040"/></radialGradient>
      <radialGradient id="tp-fish" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#f0a870"/><stop offset=".6" stop-color="#dd6b3f"/><stop offset="1" stop-color="#c2502f"/></radialGradient>
      <radialGradient id="tp-shell" cx=".45" cy=".3" r=".8"><stop offset="0" stop-color="#7d8a5d"/><stop offset=".7" stop-color="#5b6a45"/><stop offset="1" stop-color="#46553a"/></radialGradient>
      <linearGradient id="tp-leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fa36c"/><stop offset="1" stop-color="#557d4f"/></linearGradient>
      <linearGradient id="tp-petal" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f3e3da"/><stop offset=".6" stop-color="#e8a9a0"/><stop offset="1" stop-color="#d0675f"/></linearGradient>
    </defs></svg>`;
    v.stage.appendChild(d.firstElementChild);
  };

  // ------------------------------------------------------------------ drawing helpers (markup strings)
  function ridge(seed, x0, x1, base, amp, freq, step = 14) {
    let d = `M${x0},${base + 200}`;
    for (let x = x0; x <= x1 + step; x += step) { const y = base - amp * (.55 * N(x * freq + seed) + .3 * N(x * freq * 2.3 + seed * 3) + .15 * N(x * freq * 6 + seed * 7)); d += ` L${x},${f1(y)}`; }
    return d + ` L${x1 + step},${base + 200} Z`;
  }
  function ridgeLine(seed, x0, x1, base, amp, freq, step = 14) {
    const out = []; let cur = '';
    for (let x = x0; x <= x1; x += step) {
      const y = base - amp * (.55 * N(x * freq + seed) + .3 * N(x * freq * 2.3 + seed * 3) + .15 * N(x * freq * 6 + seed * 7));
      const on = N(x * .011 + seed * 5) > .45;
      if (on) cur += (cur ? ' L' : 'M') + x + ',' + f1(y); else if (cur) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out.map(d => `<path d="${d}"/>`).join('');
  }
  TP.ridge = ridge;
  function pebbles(seed, x0, x1, y0) {
    let s = '';
    for (let i = 0; x0 + i * 38 < x1; i++) {
      const x = x0 + i * 38 + H(seed + i) * 30, y = y0 + 6 + H(seed + i * 3) * 34, rx = 6 + H(seed + i * 7) * 12, ry = rx * (.45 + H(i + seed) * .2);
      s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${['#9aa69c', '#b3b8a8', '#8d9990', '#c2c3b2'][i % 4]}" stroke="${INK}" stroke-opacity=".45" stroke-width="1.2"/>`;
    }
    return s;
  }
  // lotus flower (bud … open) at (x, y) = top of stem, size s
  TP.lotusFlower = function (x, y, s = 1, open = 1) {
    const P = (a, len, w) => { const rad = a * Math.PI / 180, c = Math.cos(rad), si = Math.sin(rad); const tip = [x + si * len * s, y - c * len * s]; const l = [x + (si * len * .5 - c * w) * s, y - (c * len * .5 + si * w) * s], r = [x + (si * len * .5 + c * w) * s, y - (c * len * .5 - si * w) * s]; return `<path d="M${f1(x)},${f1(y)} Q${f1(l[0])},${f1(l[1])} ${f1(tip[0])},${f1(tip[1])} Q${f1(r[0])},${f1(r[1])} ${f1(x)},${f1(y)}Z" fill="url(#tp-petal)" stroke="${INK}" stroke-opacity=".55" stroke-width="1.1"/>`; };
    const sp = 18 + 30 * open;
    return `<g filter="url(#ink-wob)">${P(-sp * 1.6, 26, 10)}${P(sp * 1.6, 26, 10)}${P(-sp * .8, 30, 11)}${P(sp * .8, 30, 11)}${P(0, 32, 11)}</g>`;
  };

  // ------------------------------------------------------------------ pond scene
  // o: {view:'section'|'surface', worldW, wl, seed, sky:'day'|'dusk', sun:{x,y,r}, lotus:[{x, r, flower, fy}], weeds:[x…],
  //     reeds:[{x, h}], cam:[[t, x], …] (camera keys, world x of the left frame edge), rays, fishShadows}
  TP.pond = function (sc, o = {}) {
    const v = sc.video, k = v.W / 960, WW = o.worldW || 960, WL = o.wl != null ? o.wl : 175, seed = o.seed || 1, view = o.view || 'section';
    const farW = 960 + (WW - 960) * .35;
    const root = sc.html(`<div class="tp-pond" style="position:absolute;left:0;top:0;width:${v.W}px;height:${v.H}px;overflow:hidden;background:#e4e5d8"></div>`);
    const mk = (w, cls) => { const d = document.createElement('div'); d.innerHTML = `<svg class="${cls} vk-bleed" viewBox="0 0 ${w} 540" width="${f1(w * k)}" height="${v.H}" style="position:absolute;left:0;top:0;will-change:transform" preserveAspectRatio="none"></svg>`; const s = d.firstElementChild; root.appendChild(s); return s; };
    const far = mk(farW, 'tp-far'), mid = mk(WW, 'tp-mid');
    const live = (() => { const d = document.createElement('div'); d.innerHTML = `<svg class="tp-live" viewBox="0 0 960 540" width="${v.W}" height="${v.H}" style="position:absolute;left:0;top:0" preserveAspectRatio="none"><g class="w"></g><g class="ui"></g></svg>`; const s = d.firstElementChild; root.appendChild(s); return s; })();
    const world = live.querySelector('.w'), ui = live.querySelector('.ui');
    const P = { root, far, mid, live, world, ui, WL, WW, view, k, fns: [], camX: 0 };
    const dusk = o.sky === 'dusk';

    // ---- far: sky, sun, mountains (washed), mist
    const horizon = view === 'section' ? WL : (o.horizon || 250);
    let fs = `<rect width="${farW}" height="540" fill="url(#${dusk ? 'tp-dusk' : 'tp-sky'})"/>`;
    if (o.sun !== false) { const s = o.sun || {}; fs += `<circle cx="${s.x || 780}" cy="${s.y || (horizon - 95)}" r="${s.r || 30}" fill="${dusk ? '#d0603f' : '#c4402d'}" opacity="${s.o || .8}"/>`; }
    fs += `<g filter="url(#ink-far)"><path d="${ridge(seed * 3.1, -20, farW + 20, horizon - 8, 120, .0045, 12)}" fill="#bcc5bc" opacity=".62"/></g>`;
    fs += `<g filter="url(#ink-wash)"><path d="${ridge(seed * 5.7, -20, farW + 20, horizon + 2, 70, .007, 10)}" fill="#8fa198" opacity=".7"/></g>`;
    fs += `<g filter="url(#ink-line)" fill="none" stroke="${INK}" stroke-linecap="round" stroke-width="1.5" opacity=".35">${ridgeLine(seed * 5.7, 0, farW, horizon + 2, 70, .007, 10)}</g>`;
    far.innerHTML = fs;
    // mist lives in the live layer (moves)

    // ---- mid: water body / surface, bottom, far weeds
    let ms = '';
    if (view === 'section') {
      ms += `<rect x="0" y="${WL}" width="${WW}" height="${540 - WL}" fill="url(#tp-water)"/>`;
      // far weeds (blurred, pale) + far bottom
      let fw = '';
      for (let i = 0; i * 46 < WW; i++) { const x = i * 46 + H(seed + i * 11) * 30, hgt = 60 + H(seed + i * 5) * 120, b = 520; fw += `<path d="${vk.brushPath(vk.sampleLine(u => [x + Math.sin(u * 3 + i) * 10 * u, b - u * hgt], 8), u => 7 * (1 - u) + 1)}" fill="#8ea397" opacity=".45"/>`; }
      ms += `<g filter="url(#ink-far)">${fw}</g>`;
      ms += `<g filter="url(#ink-wash)"><path d="${ridge(seed * 9.3, -20, WW + 20, 505, 22, .01, 16)}" fill="#8f9b8a" opacity=".75"/></g>`;
      ms += `<g filter="url(#ink-line)">${pebbles(seed * 13, 10, WW, 490)}</g>`;
      ms += `<path d="${ridge(seed * 9.3, -20, WW + 20, 505, 22, .01, 16).replace(/ L[^L]*$/, '')}" fill="none" stroke="${INK}" stroke-opacity=".25" stroke-width="1.4" filter="url(#ink-line)"/>`;
    } else {
      // surface view: far shore + pond surface with mountain reflection
      ms += `<rect x="0" y="${horizon}" width="${WW}" height="${540 - horizon}" fill="url(#tp-surf)"/>`;
      ms += `<g filter="url(#ink-far)" opacity=".22" transform="translate(0 ${2 * horizon + 4}) scale(1 -1)"><path d="${ridge(seed * 5.7, -20, WW + 20, horizon + 2, 70, .007, 10)}" fill="#6f8479"/></g>`;
      ms += `<g filter="url(#ink-wash)"><path d="M-20,${horizon + 10} C200,${horizon + 2} 420,${horizon + 16} 620,${horizon + 8} S900,${horizon + 2} ${WW + 20},${horizon + 12} L${WW + 20},${horizon - 6} L-20,${horizon - 6}Z" fill="#7d9186" opacity=".8"/></g>`;
    }
    mid.innerHTML = ms;
    // far + mid never change (only their CSS transform pans): rasterise them once, filters included (vk.bake)
    vk.bake(far); vk.bake(mid);

    // ---- live, back to front
    const G = cls => { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', cls); world.appendChild(g); return g; };
    const gMist = G('mist'), gBack = G('back'), gRays = G('rays'), gWeeds = G('weeds'), gStems = G('stems'), gShadows = G('shadows'), gTint = G('tint');
    P.back = gBack; P.chars = G('chars'); P.surface = G('surface'); P.fx = G('fx'); P.fore = G('fore');
    // mist
    gMist.innerHTML = `<ellipse class="m1" cx="200" cy="${horizon - 40}" rx="230" ry="22" fill="url(#tp-mist)"/><ellipse class="m2" cx="640" cy="${horizon - 70}" rx="260" ry="20" fill="url(#tp-mist)"/>`;
    const m1 = gMist.querySelector('.m1'), m2 = gMist.querySelector('.m2');
    P.fns.push((t, cam) => { A(m1, { cx: cam + ((t * 6 + 80) % 1300) - 170 }); A(m2, { cx: cam + ((t * 3.5 + 700) % 1400) - 220 }); });

    if (view === 'section') {
      // light rays (slowly breathing)
      const rays = [];
      for (let i = 0; i < Math.ceil(WW / 190); i++) { const x = 60 + i * 190 + H(seed + i) * 80, w = 30 + H(i * 3 + seed) * 40; const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('d', `M${f1(x)},${WL} L${f1(x + w)},${WL} L${f1(x + w - 90)},470 L${f1(x - 120)},470Z`); e.setAttribute('fill', 'url(#tp-ray)'); gRays.appendChild(e); rays.push(e); }
      P.rayBoost = 0;
      P.fns.push(t => rays.forEach((e, i) => A(e, { opacity: (.35 + .35 * N(t * .25 + i * 3.7)) * (1 + (P.rayBoostAt ? P.rayBoostAt(t) : P.rayBoost)) })));   // rayBoostAt(local): pure fn of time (a value set by a later sc.on would lag a frame and depend on seek order)
      // swaying weeds
      const weeds = (o.weeds || Array.from({ length: Math.ceil(WW / 120) }, (_, i) => 40 + i * 120 + H(seed * 7 + i) * 60)).map((x, i) => {
        const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); const tall = 90 + H(seed + i * 17) * 130;
        e.setAttribute('fill', ['#4d6659', '#5d7a62', '#3f5a4e'][i % 3]); e.setAttribute('opacity', '.78'); gWeeds.appendChild(e);
        return { e, x, tall, ph: H(i * 9 + seed) * 6 };
      });
      P.fns.push(t => weeds.forEach(w => { const pts = vk.sampleLine(u => [w.x + Math.sin(t * .9 + w.ph + u * 2.4) * 16 * u * u + (N(t * .3 + w.ph) - .5) * 10 * u, 512 - u * w.tall], 10); A(w.e, { d: vk.brushPath(pts, u => 7.5 * (1 - u) + .8) }); }));
      // underwater drifting specks
      const specks = [];
      for (let i = 0; i < 26; i++) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', f1(.8 + H(i + 40) * 1.4)); c.setAttribute('fill', '#f2f2e6'); c.setAttribute('opacity', '.55'); gTint.appendChild(c); specks.push(c); }
      P.fns.push((t, cam) => specks.forEach((c, i) => { const x = cam + ((H(i) * 1100 + t * (4 + H(i + 9) * 6)) % 1060) - 50, y = WL + 30 + ((H(i + 3) * 320 - t * (3 + H(i + 5) * 4)) % 320 + 320) % 320; A(c, { cx: x, cy: y }); }));
      // fish shadows far back
      if (o.fishShadows !== false) {
        gShadows.setAttribute('filter', 'url(#ink-far)');
        const fsh = [0, 1].map(i => { const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('d', 'M0,0 C14,-9 40,-8 52,0 C40,8 14,9 0,0Z M50,0 L66,-9 L63,0 L66,9Z'); e.setAttribute('fill', INK); e.setAttribute('opacity', '.09'); gShadows.appendChild(e); return e; });
        P.fns.push((t, cam) => fsh.forEach((e, i) => { const x = cam + 1100 - ((t * (16 + i * 7) + i * 500) % 1300), y = WL + 90 + i * 110 + Math.sin(t * .5 + i) * 12; A(e, { transform: `translate(${f1(x)} ${f1(y)}) scale(${1.1 - i * .3})` }); }));
      }
      // water surface: line + dashed ripples
      const surf = document.createElementNS('http://www.w3.org/2000/svg', 'g'); P.surface.appendChild(surf);
      surf.innerHTML = `<path d="M-50,${WL} L${WW + 50},${WL}" stroke="#eef3ec" stroke-width="3" opacity=".9"/><path d="M-50,${WL + 1.5} L${WW + 50},${WL + 1.5}" stroke="${INK}" stroke-opacity=".28" stroke-width="1.2" filter="url(#ink-line)"/>` +
        `<g class="rip" stroke="#f4faf6" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="14 26" opacity=".9"><path d="M-50,${WL + 7} L${WW + 50},${WL + 7}"/><path d="M-50,${WL + 15} L${WW + 50},${WL + 15}" stroke-dasharray="10 34"/></g>`;
      const rips = [...surf.querySelectorAll('.rip path')];
      vk.bake(surf.querySelector('[filter]'));                    // static ink-line water line (world group pans it)
      P.fns.push(t => rips.forEach((p, i) => A(p, { 'stroke-dashoffset': -t * (10 + i * 5) })));
    } else {
      // surface view ripples (horizontal dashes in perspective)
      const surf = document.createElementNS('http://www.w3.org/2000/svg', 'g'); P.surface.appendChild(surf);
      let s = '<g stroke="#f4f7ef" stroke-linecap="round" fill="none" opacity=".85">';
      for (let i = 0; i < 9; i++) { const y = horizon + 20 + i * i * 4 + i * 14; s += `<path d="M-50,${y} L${WW + 50},${y}" stroke-width="${1 + i * .18}" stroke-dasharray="${10 + i * 4} ${30 + i * 8}"/>`; }
      surf.innerHTML = s + '</g>';
      const rips = [...surf.querySelectorAll('path')];
      P.fns.push(t => rips.forEach((p, i) => A(p, { 'stroke-dashoffset': -t * (6 + i * 2.5) * (i % 2 ? 1 : -1) })));
    }
    // lotus leaves (+ stems below the surface in section view)
    P.leaves = (o.lotus || []).map((L, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'), y = L.y != null ? L.y : WL, r = L.r || 70;
      let s = '';
      if (view === 'section') s += `<path d="M${L.x},${y + 4} C${L.x - 12},${y + 120} ${L.x + 18},${y + 220} ${L.x + 4},520" stroke="#5d7a55" stroke-width="3.2" fill="none" opacity=".75"/>`;
      if (L.flower) s += `<path d="M${L.x + r * .55},${y} C${L.x + r * .6},${y - 40} ${L.x + r * .5},${y - 70} ${L.x + r * .58},${y - (L.fh || 95)}" stroke="#5d7a55" stroke-width="2.6" fill="none"/>` + TP.lotusFlower(L.x + r * .58, y - (L.fh || 95), L.fs || 1, L.open != null ? L.open : 1);
      const ry = r * (L.tilt || .2);
      s += `<g filter="url(#ink-wob)"><ellipse cx="${L.x}" cy="${y}" rx="${r}" ry="${f1(ry)}" fill="url(#tp-leaf)" stroke="${INK}" stroke-width="1.8" stroke-opacity=".7"/>` +
        `<path d="M${L.x - r * .9},${y} Q${L.x},${y + ry * .3} ${L.x + r * .9},${y} M${L.x},${y - ry * .9} L${L.x},${y + ry * .9} M${L.x - r * .6},${y - ry * .7} L${L.x + r * .6},${y + ry * .7} M${L.x + r * .6},${y - ry * .7} L${L.x - r * .6},${y + ry * .7}" stroke="#3e5b3d" stroke-width="1" opacity=".5" fill="none"/>` +
        `<path d="M${L.x + r * .2},${y - ry} L${L.x},${y} L${L.x + r * .45},${y - ry * .85}Z" fill="${view === 'section' ? '#d2dccf' : '#dfe4d6'}"/></g>`;
      g.innerHTML = s; (L.front ? P.fore : gStems).appendChild(g);
      g.querySelectorAll('[filter]').forEach(e => vk.bake(e));    // static ink-wob leaf / flower; the bob transform stays live
      const bob = { g, x: L.x, y, ph: i * 1.7 };
      P.fns.push(t => A(g, { transform: `translate(0 ${f1(Math.sin(t * 1.3 + bob.ph) * 1.2)})` }));
      return { x: L.x, y, r, g };
    });
    // reeds at the bank (foreground, dark)
    const reeds = (o.reeds || []).map((R, i) => {
      const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('fill', R.color || '#33423b'); e.setAttribute('opacity', R.o || '.88'); P.fore.appendChild(e);
      return { e, ...R, ph: i * 2.1 };
    });
    P.fns.push(t => reeds.forEach(r => { const pts = vk.sampleLine(u => [r.x + (r.lean || 0) * u * u * 40 + Math.sin(t * .8 + r.ph) * 6 * u * u, (r.base || 545) - u * r.h], 12); A(r.e, { d: vk.brushPath(pts, u => (r.w || 6) * (1 - u * .85)) }); }));
    // camera
    const camKeys = o.cam || [[0, 0]];
    P.camAt = t => vk.kfSpline(t, camKeys);
    sc.on(local => {
      const cam = P.camAt(local); P.camX = cam;
      far.style.transform = `translate3d(${f1(-cam * .35 * k)}px,0,0)`;
      mid.style.transform = `translate3d(${f1(-cam * k)}px,0,0)`;
      A(world, { transform: `translate(${f1(-cam)} 0)` });
      P.fns.forEach(f => f(local, cam));
    });
    return P;
  };

  // weeping willow branches hanging from the top edge (foreground), swaying
  TP.willow = function (sc, P, o = {}) {
    const n = o.n || 6, x0 = o.x || 960, br = [];
    for (let i = 0; i < n; i++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); P.fore.appendChild(g);
      g.innerHTML = `<path class="s" fill="#2f3b35" opacity=".85"/><path class="l" fill="#5d7a55" opacity=".8"/>`;
      br.push({ s: g.firstChild, l: g.lastChild, x: x0 - i * 34 - H(i + 3) * 20, len: 150 + H(i * 5 + 1) * 150, ph: i * 1.3 });
    }
    sc.on(t => br.forEach(b => {
      const pts = vk.sampleLine(u => [b.x - u * 30 + Math.sin(t * .9 + b.ph + u * 1.5) * 10 * u * u, -10 + u * b.len], 12);
      A(b.s, { d: vk.brushPath(pts, u => 3.2 * (1 - u) + .6) });
      let d = '';
      for (let j = 2; j < 12; j++) { const [x, y] = pts[j], sd = j % 2 ? 1 : -1, a = .6 * sd + Math.sin(t * 1.3 + j + b.ph) * .15; const lx = x + Math.sin(a) * 13, ly = y + Math.cos(a) * 13; d += `M${f1(x)},${f1(y)} Q${f1(x + sd * 6)},${f1(y + 4)} ${f1(lx)},${f1(ly)} Q${f1(x + sd * 1)},${f1(y + 8)} ${f1(x)},${f1(y)}Z `; }
      A(b.l, { d });
    }));
  };

  // ------------------------------------------------------------------ small effects
  // expanding ripple rings at the surface: list of {t, x} (scene-local)
  TP.rings = function (sc, P, list, o = {}) {
    const els = list.map(() => { const e = document.createElementNS('http://www.w3.org/2000/svg', 'g'); e.innerHTML = '<ellipse fill="none" stroke="#f4faf8" stroke-width="1.8"/><ellipse fill="none" stroke="#1f2529" stroke-opacity=".25" stroke-width="1"/>'; P.fx.appendChild(e); return e; });
    sc.on(local => list.forEach((r, i) => {
      const p = (local - r.t) / (r.d || 1.4), e = els[i];
      if (p <= 0 || p >= 1) { A(e, { opacity: 0 }); return; }
      const [a, b] = e.children, y = r.y != null ? r.y : P.WL;
      A(e, { opacity: f1(1 - p) });
      A(a, { cx: r.x, cy: y, rx: p * (r.r || 34), ry: p * (r.r || 34) * .22 }); A(b, { cx: r.x, cy: y + 2, rx: p * (r.r || 34) * .7, ry: p * (r.r || 34) * .16 });
    }));
  };
  // rising bubbles from a moving source: src(local) → [x, y] | null; deterministic emission every `gap` seconds
  TP.bubbles = function (sc, P, src, o = {}) {
    const n = o.n || 14, gap = o.gap || .35, life = o.life || 2.2, els = [];
    for (let i = 0; i < n; i++) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#f6f8f0'); c.setAttribute('stroke-width', '1.2'); P.fx.appendChild(c); els.push(c); }
    sc.on(local => {
      const k0 = Math.floor((local - life) / gap);
      els.forEach((c, i) => {
        const j = k0 + 1 + ((i - (k0 + 1)) % n + n) % n, t0 = j * gap, p = (local - t0) / life;   // slot i handles emissions j ≡ i (mod n)
        const s = p > 0 && p < 1 ? src(t0) : null;
        if (!s || !o.active || !o.active(t0)) { A(c, { opacity: 0 }); return; }
        const x = s[0] + Math.sin(p * 9 + j) * 4 + (H(j) - .5) * 10, y = s[1] - p * (o.rise || 120);
        A(c, { cx: x, cy: Math.max(y, P.WL + 3), r: 1.5 + H(j + 3) * 2.2 + p * 1.2, opacity: y < P.WL + 4 ? 0 : f1(.9 * (1 - p)) });
      });
    });
  };
})();
