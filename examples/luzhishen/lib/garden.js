// 大相国寺菜园 world kit for 《鲁智深倒拔垂杨柳》 — paper-cut props on top of the 景阳冈 ink world (WJ):
//   CY.willow(sc, parent, o)   the 垂杨柳 itself: paper-cut trunk + boughs, per-frame hanging fronds (柳条),
//                              a root ball that only shows once it is torn out, and a matrix so the monk's hands
//                              (and the crows) can stay glued to the tree while it lifts and tilts.
//   CY.wall / fence / beds / pit / jar / tray / ladder / stone   static paper-cut props (bake them once).
//   CY.crow(parent, o)         a paper-cut crow: set({x, y, flap, flip, rot}); CY.nest(x, y) sits in the crown.
// Every per-frame update is a pure function of scene time (no clocks, seeded noise only).
(function () {
  const CY = window.CY = window.CY || {};
  const { P, E, slit, arc } = WS;
  const H = WS.hash, N = vk.noise1;
  const R1 = x => Math.round(x * 10) / 10;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const add = (parent, markup) => { parent.insertAdjacentHTML('beforeend', markup.trim()); return parent.lastElementChild; };
  CY.add = add;

  const COL = {
    bark: '#6b4a2c', bark2: '#8a6238', bark3: '#4a3220', leaf: '#5d7a3a', leaf2: '#7b9a4a', leaf3: '#42602c',
    earth: '#8d7145', earth2: '#6d5533', earth3: '#4e3c24', soil: '#5c4526',
    wall: '#cdc2ab', wall2: '#b3a891', tile: '#5a5f63', tile2: '#43484c',
    cabbage: '#7e9a52', cabbage2: '#5f7c3c', bamboo: '#b39a63', bamboo2: '#8d7749',
    crow: '#241f22', crow2: '#3a3438', jar: '#7a4a2a', cloth: '#b5342a', wood: '#8a5a2c',
  };
  CY.COL = COL;

  /* ---------------- 垂杨柳 ----------------
   * o: {x, y (ground), scale, seed, fronds, height}
   * update(l, st) with st = {wind 0..1, lift px, tilt deg, shake 0..1, roots 0..1, scale}
   * pointAt([lx, ly], st) → world point of a tree-local point (hands / nest / crows follow the tree). */
  CY.willow = function (sc, parent, o = {}) {
    const x0 = o.x || 640, y0 = o.y || 600, S0 = o.scale || 1, seed = o.seed || 3;
    const NF = o.fronds || 15, TH = o.height || 300;
    // boughs: [base y on the trunk, dx, dy, bend]
    const boughs = [[-196, -132, -46, 24], [-214, 112, -54, -20], [-242, -62, -62, 16], [-248, 58, -70, -14], [-256, 4, -84, 6]];
    const barkSlits = [[-18, -30, -12, -120], [8, -50, 14, -150], [-6, -160, -2, -210], [16, -70, 20, -120]]
      .map(([ax, ay, bx, by]) => slit(arc([ax, ay], [bx, by], 3, 8), 3.4)).join(' ');
    let boughD = '', twigD = '';
    boughs.forEach((b, i) => {
      const pts = vk.sampleLine(u => [0 + b[1] * u, b[0] + b[2] * u - Math.sin(u * Math.PI) * b[3]], 9);
      boughD += vk.brushPath(pts, u => (1 - u * .86) * 12 + 1.6) + ' ';
      for (let k = 1; k <= 2; k++) { const q = pts[Math.round((.5 + .28 * k / 2) * 8)]; twigD += vk.brushPath([[q[0], q[1]], [q[0] + b[1] * .14, q[1] - 16 - 6 * k], [q[0] + b[1] * .22, q[1] - 28 - 7 * k]], 3) + ' '; }
    });
    // frond anchors spread along the boughs; each 柳条 leaves the bough sideways and is then pulled straight down
    const anchors = [];
    for (let i = 0; i < NF; i++) {
      const b = boughs[i % boughs.length], u = .28 + .7 * H(seed * 5.1 + i * 2.7);
      const ax = b[1] * u, ay = b[0] + b[2] * u - Math.sin(u * Math.PI) * b[3] + 4;
      anchors.push({ x: ax, y: ay, dir: Math.sign(b[1] || 1) * (.5 + .9 * H(i * 7.7 + seed)),
        len: 130 + 130 * H(seed + i * 1.7), ph: H(i * 3.3 + seed) * 6.3, sw: .7 + .6 * H(i * 5.9), seed: i * 1.37 + seed });
    }
    const leafMass = (cx, cy, r, s) => [0, 1, 2, 3, 4, 5].map(j => E(cx + (H(s * 3 + j) - .5) * r * 1.6, cy + (H(s + j * 1.9) - .5) * r * .7, r * (.4 + .3 * H(j + s)), r * .26, (H(j * 2 + s) - .5) * 26)).join(' ');

    const g = add(parent, `<g class="cy-willow">
      <g class="cy-willow-in">
        <g class="cy-roots" opacity="0">
          ${P('M-52 -6 C-74 26 -60 84 -14 100 C26 112 76 74 70 18 C66 -2 60 -8 56 -10 Z', COL.soil, { step: 7, amp: 1.1 })}
          ${P([[-46, 18, -96, 64], [-20, 52, -44, 118], [16, 60, 40, 124], [46, 30, 104, 70], [0, 40, 6, 130], [-34, 6, -110, 26], [40, 4, 108, 18]]
      .map(([ax, ay, bx, by]) => slit(arc([ax, ay], [bx, by], (H(ax + by) - .5) * 26, 8), 9)).join(' '), COL.bark3, { amp: .8 })}
          ${P([[-70, 40, 13], [30, 74, 11], [-24, 96, 9], [64, 44, 10], [-96, 18, 8]].map(([cx, cy, r]) => E(cx, cy, r, r * .8)).join(' '), COL.earth2, { amp: .7 })}
        </g>
        <g filter="url(#pc-shadow)">
          ${P(`M-30 8 C-26 -70 -24 -140 -19 -${TH - 90} L18 -${TH - 86} C23 -140 27 -70 33 8 Z`, COL.bark, { step: 8, amp: 1 })}
          ${P(barkSlits, COL.bark3, { amp: .6 })}
          ${P(`M-19 -${TH - 90} L18 -${TH - 86} L16 -${TH - 56} L-17 -${TH - 60} Z`, COL.bark2, { amp: .7 })}
          <path d="${boughD}" fill="${COL.bark}"/>
          <path d="${twigD}" fill="${COL.bark2}"/>
        </g>
        <g class="cy-crown" opacity=".95">
          <path d="${boughs.map((b, i) => leafMass(b[1] * 1.0, b[0] + b[2] * 1.0 - 6, 50 + 9 * (i % 3), seed + i)).join(' ') + ' ' + leafMass(0, -276, 56, seed + 9)}" fill="${COL.leaf3}" opacity=".88" filter="url(#jy-wash)"/>
          <path d="${boughs.map((b, i) => leafMass(b[1] * .68, b[0] + b[2] * .68 - 24, 40 + 7 * (i % 2), seed + i * 3.1)).join(' ') + ' ' + leafMass(0, -246, 44, seed + 4.4)}" fill="${COL.leaf2}" opacity=".72" filter="url(#jy-wash)"/>
        </g>
        <g class="cy-fronds">${anchors.map(() => `<g><path fill="${COL.leaf3}"/><path fill="${COL.leaf}"/><path fill="${COL.leaf2}"/></g>`).join('')}</g>
        <g class="cy-nest"></g>
      </g>
    </g>`);
    const inner = g.querySelector('.cy-willow-in'), rootsG = g.querySelector('.cy-roots'), frondEls = [...g.querySelector('.cy-fronds').children];
    const nestG = g.querySelector('.cy-nest');
    const st0 = { wind: .25, lift: 0, tilt: 0, shake: 0, roots: 0, scale: S0 };
    let cur = { ...st0 };
    const mat = st => { const s = st.scale == null ? S0 : st.scale, a = (st.tilt || 0) * Math.PI / 180;
      return { x: x0 + (st.dx || 0), y: y0 - (st.lift || 0), c: Math.cos(a) * s, s: Math.sin(a) * s }; };
    const pointAt = (p, st) => { const m = mat(st || cur); return [m.x + p[0] * m.c - p[1] * m.s, m.y + p[0] * m.s + p[1] * m.c]; };
    function update(l, st) {
      cur = { ...st0, ...(st || {}) };
      const m = mat(cur), s = cur.scale == null ? S0 : cur.scale;
      vk.attr(inner, { transform: `translate(${R1(m.x)} ${R1(m.y)}) rotate(${R1(cur.tilt || 0)}) scale(${R1(s * 1000) / 1000})` });
      WS.setOp(rootsG, cur.roots || 0);
      const w = cur.wind || 0, sh = cur.shake || 0;
      anchors.forEach((a, i) => {
        if (!a.el) { const g2 = frondEls[i]; a.el = { stem: g2.children[0], lv1: g2.children[1], lv2: g2.children[2] }; }
        const swing = (5 + 26 * w) * Math.sin(l * (1.05 + .25 * a.sw) + a.ph) + 22 * sh * Math.sin(l * 17 + a.ph) + 26 * w * a.sw;
        // out along the bough first (sin ramp), then straight down under its own weight; the tip lags behind the wind
        const pts = vk.sampleLine(u => [
          a.x + a.dir * 34 * Math.sin(u * 1.5) + swing * u * u * .8 + Math.sin(l * 2.4 + a.ph + u * 3.2) * (1.5 + 5 * w) * u,
          a.y + a.len * (.22 * u + .78 * u * u * (1 - .08 * (w + sh)))], 13);
        vk.attr(a.el.stem, { d: vk.brushPath(pts, u => 3.1 * (1 - u * .82) + .5) });
        vk.attr(a.el.lv1, { d: leafDabs(pts, a.seed, 0) });
        vk.attr(a.el.lv2, { d: leafDabs(pts, a.seed, 1) });
      });
    }
    // narrow willow leaves along the frond, alternating sides (cheap 6-point lens, not an ellipse)
    const leaf = (cx, cy, r, w2, ang) => {
      const c = Math.cos(ang), si = Math.sin(ang), P2 = (u, v) => `${R1(cx + u * c - v * si)},${R1(cy + u * si + v * c)}`;
      return `M${P2(-r, 0)} Q${P2(-r * .3, -w2)} ${P2(r * .55, -w2 * .55)} Q${P2(r, 0)} ${P2(r * .55, w2 * .55)} Q${P2(-r * .3, w2)} ${P2(-r, 0)} Z`;
    };
    const leafDabs = (pts, s, side) => {
      let d = '';
      for (let i = 1; i < pts.length; i++) {
        if ((i + side) % 2) continue;
        const p = pts[i], q = pts[i - 1];
        const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
        const sgn = side ? 1 : -1, off = 2.5 + 2 * H(s + i);
        const cx = p[0] + Math.cos(ang + Math.PI / 2) * off * sgn, cy = p[1] + Math.sin(ang + Math.PI / 2) * off * sgn;
        const r = 6.5 + 3.5 * H(s * 2 + i), a2 = ang + sgn * (.55 + .35 * H(s + i * 3));
        d += leaf(cx + Math.cos(a2) * r * .7, cy + Math.sin(a2) * r * .7, r, 1.9 + .7 * H(s + i * 5), a2) + ' ';
      }
      return d;
    };
    sc.on(l => { if (!sc.__cyManual) update(l, cur); });
    return { g, inner, rootsG, nestG, update, pointAt, get state() { return cur; }, x: x0, y: y0, scale: S0, height: TH, anchors };
  };

  // 老鸦巢 in the crown (tree-local markup)
  CY.nest = (x, y, s = 1) => `<g class="cy-nestg">${P(`M${x - 34 * s} ${y} C${x - 30 * s} ${y + 22 * s} ${x + 30 * s} ${y + 22 * s} ${x + 34 * s} ${y} C${x + 20 * s} ${y - 12 * s} ${x - 20 * s} ${y - 12 * s} ${x - 34 * s} ${y} Z`, '#6a5330', { step: 6, amp: 1.1 })}
    ${P([[-30, 2], [-14, -6], [4, -8], [22, -4], [30, 4], [-20, 10], [12, 10]].map(([dx, dy]) => slit([[x + (dx - 12) * s, y + dy * s], [x + (dx + 12) * s, y + (dy + 3) * s]], 2.6 * s, false)).join(' '), '#4e3c24', { amp: .6 })}</g>`;

  /* ---------------- 老鸦 (paper-cut crow) ---------------- */
  CY.crow = function (parent, o = {}) {
    const s = o.scale || 1, col = o.color || COL.crow;
    const g = add(parent, `<g class="cy-crow" filter="url(#pc-shadow)"><g class="cy-crow-in">
      <g class="cy-wingF">${P('M-4 -4 C-26 -16 -52 -14 -62 -2 C-46 8 -20 10 -2 6 Z', COL.crow2, { amp: .7 })}</g>
      ${P('M-30 0 C-28 -14 -10 -22 6 -20 C22 -18 32 -10 34 -2 C36 8 24 16 6 17 C-12 18 -28 12 -30 0 Z', col, { step: 6, amp: .8 })}
      ${P('M-28 2 C-44 6 -58 14 -66 22 L-30 14 Z', col, { amp: .8 })}
      ${P('M30 -12 C40 -20 52 -20 58 -14 C52 -8 42 -4 32 -4 Z', col, { amp: .6 })}
      ${P('M54 -16 L74 -12 L54 -8 Z', '#c8a44a', { amp: .4 })}
      ${P(E(44, -14, 3.2, 3.2), '#e9e3d6', { amp: .2 })}
      <g class="cy-wingN">${P('M0 -6 C-22 -22 -50 -24 -64 -12 C-48 2 -18 6 0 2 Z', col, { amp: .7 })}</g>
    </g></g>`);
    const inner = g.querySelector('.cy-crow-in'), wN = g.querySelector('.cy-wingN'), wF = g.querySelector('.cy-wingF');
    return { g, set(p) {
      vk.attr(inner, { transform: `translate(${R1(p.x)} ${R1(p.y)}) rotate(${R1(p.rot || 0)}) scale(${R1((p.scale || s) * (p.flip || 1) * 100) / 100} ${R1((p.scale || s) * 100) / 100})` });
      const f = p.flap || 0;
      vk.attr(wN, { transform: `rotate(${R1(-56 * f + 8)} -4 -4)` });
      vk.attr(wF, { transform: `rotate(${R1(-42 * f + 6)} -4 -4)` });
      WS.setOp(g, p.opacity == null ? 1 : p.opacity);
    } };
  };

  /* ---------------- static paper-cut props ---------------- */
  // 寺墙: plastered wall with a tiled coping (x0…x1, top y)
  CY.wall = (x0, x1, y, h = 120) => `<g class="cy-wall" filter="url(#pc)">
    ${P(`M${x0} ${y} L${x1} ${y} L${x1 - 4} ${y + h} L${x0 + 4} ${y + h} Z`, COL.wall, { step: 9, amp: .8 })}
    ${P(`M${x0 - 14} ${y - 16} L${x1 + 14} ${y - 16} L${x1 + 8} ${y} L${x0 - 8} ${y} Z`, COL.tile, { step: 8, amp: .7 })}
    ${P(Array.from({ length: Math.ceil((x1 - x0 + 28) / 26) }, (_, i) => { const px = x0 - 14 + i * 26; return `M${px} ${y - 16} L${px + 8} ${y - 16} L${px + 6} ${y} L${px - 2} ${y} Z`; }).join(' '), COL.tile2, { amp: .5 })}
    ${P(Array.from({ length: 6 }, (_, i) => slit([[x0 + 30 + i * ((x1 - x0) / 6), y + 26 + (i % 2) * 30], [x0 + 90 + i * ((x1 - x0) / 6), y + 30 + (i % 2) * 30]], 3.4, false)).join(' '), COL.wall2, { amp: .5 })}</g>`;

  // 篱笆: bamboo fence between x0 and x1 standing on ground y
  CY.fence = (x0, x1, y, o = {}) => {
    const h = o.h || 86, n = Math.max(2, Math.round((x1 - x0) / 26));
    let d = '', rail = '';
    for (let i = 0; i <= n; i++) { const px = x0 + (x1 - x0) * i / n, hh = h * (.86 + .22 * H(i * 2.7 + (o.seed || 1))), lean = (H(i * 5.1) - .5) * 5;
      d += `M${px - 5 + lean} ${y - hh} L${px + 5 + lean} ${y - hh} L${px + 6} ${y} L${px - 6} ${y} Z `; }
    [.34, .74].forEach(u => { rail += `M${x0 - 6} ${y - h * u} L${x1 + 6} ${y - h * u - 3} L${x1 + 6} ${y - h * u + 7} L${x0 - 6} ${y - h * u + 10} Z `; });
    return `<g class="cy-fence" filter="url(#pc)">${P(d, COL.bamboo, { step: 8, amp: .8 })}${P(rail, COL.bamboo2, { step: 10, amp: .7 })}</g>`;
  };

  // 菜畦: ridged beds of cabbages; rows = [{y, x0, x1, n, s}]
  CY.beds = (rows) => `<g class="cy-beds" filter="url(#pc)">${rows.map((r, ri) => {
    const n = r.n || 6;
    let out = P(`M${r.x0 - 16} ${r.y} C${r.x0 + 40} ${r.y - 13} ${r.x1 - 40} ${r.y - 13} ${r.x1 + 16} ${r.y} L${r.x1 + 10} ${r.y + 16} L${r.x0 - 10} ${r.y + 16} Z`, COL.earth, { step: 9, amp: .9 });
    for (let i = 0; i < n; i++) {
      const cx = r.x0 + (r.x1 - r.x0) * (i + .5) / n, s = (r.s || 1) * (.85 + .3 * H(ri * 3.3 + i));
      out += P(`M${cx - 22 * s} ${r.y - 2} C${cx - 26 * s} ${r.y - 30 * s} ${cx - 8 * s} ${r.y - 40 * s} ${cx} ${r.y - 40 * s} C${cx + 10 * s} ${r.y - 40 * s} ${cx + 26 * s} ${r.y - 28 * s} ${cx + 22 * s} ${r.y - 2} Z`, COL.cabbage, { step: 6, amp: .8 })
        + P(slit(arc([cx - 12 * s, r.y - 6], [cx - 4 * s, r.y - 34 * s], 4, 7), 4) + ' ' + slit(arc([cx + 12 * s, r.y - 6], [cx + 5 * s, r.y - 34 * s], -4, 7), 4), COL.cabbage2, { amp: .5 });
    }
    return out;
  }).join('')}</g>`;

  // 粪窖 / 泥窖: a dark sunken pit with an earth rim and two planks across the near side
  CY.pit = (x, y, w = 260, o = {}) => {
    const h = o.h || 54;
    return `<g class="cy-pit" filter="url(#pc)">
      ${P(WS.E(x, y, w / 2 + 22, h / 2 + 16), COL.earth, { step: 8, amp: 1 })}
      ${P(WS.E(x, y + 4, w / 2, h / 2), COL.earth3, { step: 7, amp: .9 })}
      ${P(WS.E(x, y + 8, w / 2 - 16, h / 2 - 8), '#3a2d1c', { step: 7, amp: .8 })}
      ${P([[-.55, .1], [-.2, -.5], [.25, -.45], [.6, .15]].map(([u, v]) => E(x + u * w / 2, y + v * h, 12 + 8 * H(u * 9), 6 + 3 * H(v * 7))).join(' '), COL.earth2, { amp: .7 })}
      ${o.planks === false ? '' : P(`M${x - w / 2 - 20} ${y + h / 2 - 2} L${x + 20} ${y + h / 2 + 8} L${x + 18} ${y + h / 2 + 20} L${x - w / 2 - 22} ${y + h / 2 + 10} Z`, COL.wood, { step: 8, amp: .7 })}</g>`;
  };

  // 酒坛 (wine jar) standing on the ground
  CY.jar = (x, y, s = 1) => `<g class="cy-jar" filter="url(#pc-shadow)">
    ${P(`M${x - 26 * s} ${y - 62 * s} C${x - 40 * s} ${y - 40 * s} ${x - 38 * s} ${y - 8 * s} ${x - 22 * s} ${y} L${x + 22 * s} ${y} C${x + 38 * s} ${y - 8 * s} ${x + 40 * s} ${y - 40 * s} ${x + 26 * s} ${y - 62 * s} Z`, COL.jar, { step: 7, amp: .9 })}
    ${P(`M${x - 22 * s} ${y - 76 * s} L${x + 22 * s} ${y - 76 * s} L${x + 26 * s} ${y - 60 * s} L${x - 26 * s} ${y - 60 * s} Z`, '#4a2c18', { amp: .6 })}
    ${P(slit(arc([x - 24 * s, y - 34 * s], [x + 24 * s, y - 34 * s], 5 * s, 8), 6 * s), '#e2d6b4', { amp: .4 })}
    ${P(`M${x - 14 * s} ${y - 30 * s} L${x + 14 * s} ${y - 30 * s} L${x + 14 * s} ${y - 6 * s} L${x - 14 * s} ${y - 6 * s} Z`, COL.cloth, { amp: .5 })}
    <text x="${x}" y="${y - 10 * s}" font-family="Ma Shan Zheng" font-size="${20 * s}" fill="#f3e6c8" text-anchor="middle">酒</text></g>`;

  // 盘中酒肉 on a low table / mat
  CY.tray = (x, y, s = 1) => `<g class="cy-tray" filter="url(#pc-shadow)">
    ${P(`M${x - 74 * s} ${y - 14 * s} L${x + 74 * s} ${y - 14 * s} L${x + 66 * s} ${y} L${x - 66 * s} ${y} Z`, '#6d4a2a', { step: 7, amp: .7 })}
    ${P(WS.E(x - 30 * s, y - 22 * s, 30 * s, 12 * s), '#e9dfc4', { step: 6, amp: .6 })}
    ${P(WS.E(x - 30 * s, y - 26 * s, 20 * s, 8 * s), '#b98a66', { amp: .5 })}
    ${P(WS.E(x + 34 * s, y - 22 * s, 26 * s, 11 * s), '#e9dfc4', { step: 6, amp: .6 })}
    ${P(WS.E(x + 34 * s, y - 27 * s, 17 * s, 7 * s), '#c0703f', { amp: .5 })}</g>`;

  // 梯子 (the rogues bring one to pull the nest down)
  CY.ladder = (x, y, o = {}) => {
    const h = o.h || 220, w = o.w || 46, rot = o.rot || 0;
    let rungs = '';
    for (let i = 1; i < 7; i++) rungs += `M${-w / 2} ${-h * i / 7 - 4} L${w / 2} ${-h * i / 7 - 4} L${w / 2} ${-h * i / 7 + 5} L${-w / 2} ${-h * i / 7 + 5} Z `;
    return `<g class="cy-ladder" filter="url(#pc-shadow)"><g transform="translate(${x} ${y}) rotate(${rot})">
      ${P(`M${-w / 2 - 7} ${-h} L${-w / 2 + 3} ${-h} L${-w / 2 + 5} 0 L${-w / 2 - 6} 0 Z M${w / 2 - 3} ${-h} L${w / 2 + 7} ${-h} L${w / 2 + 6} 0 L${w / 2 - 5} 0 Z`, COL.wood, { step: 8, amp: .7 })}
      ${P(rungs, COL.bamboo2, { step: 8, amp: .6 })}</g></g>`;
  };

  // 青石 (a stone to sit the wine on)
  CY.stone = (x, y, w = 120, h = 46) => `<g class="cy-stone" filter="url(#pc)">${P(`M${x - w / 2} ${y} C${x - w * .54} ${y - h * .7} ${x - w * .26} ${y - h} ${x} ${y - h} C${x + w * .3} ${y - h} ${x + w * .52} ${y - h * .6} ${x + w / 2} ${y} Z`, '#8d8b80', { step: 7, amp: .9 })}
    ${P(slit(arc([x - w * .26, y - h * .5], [x + w * .2, y - h * .62], -6, 7), 4), '#6f6d64', { amp: .5 })}</g>`;

  /* ---------------- 竖排对白卡 (paper card, for the rogues' line) ---------------- */
  CY.card = function (sc, title, body, o = {}) {
    const el = sc.html(`<div class="jy-card" style="left:${o.x || 980}px;top:${o.y || 96}px">
      <div class="t">${title}</div>${body ? `<div class="b">${body}</div>` : ''}${o.seal ? `<div class="s">${o.seal}</div>` : ''}</div>`, { fixed: false });
    const at = o.at || 0, out = o.out || at + 3;
    el.style.transformOrigin = 'top right';
    sc.on(l => {
      const a = sm((l - at) / .34), b = 1 - sm((l - out) / .4);
      el.style.opacity = String(Math.round(Math.min(a, b) * 1000) / 1000);
      el.style.transform = `translate(${R1((1 - a) * 26)}px, 0) scale(${(.94 + .06 * a).toFixed(3)})`;
    });
    return el;
  };

  /* ---------------- 泥土飞溅 / 尘土 (deterministic GL particles) ---------------- */
  CY.soilBurst = (o = {}) => vk.gl.particles({ seed: o.seed || 11, burst: [{ t: o.t || 0, n: o.n || 34 }], x: o.x || 640, y: o.y || 600,
    angle: -90, spread: o.spread || 170, speed: o.speed || [180, 620], gravity: 1750, drag: .45, life: [.5, 1.1], size: o.size || [3, 8],
    shape: 'dot', color: o.color || '#6d5533', color2: o.color2 || '#a6884f' });
  CY.dust = (o = {}) => vk.gl.particles({ seed: o.seed || 5, burst: [{ t: o.t || 0, n: o.n || 20 }], x: o.x || 640, y: o.y || 600,
    angle: -90, spread: 180, speed: [60, 220], gravity: -30, drag: 1.6, life: [.9, 1.8], size: [18, 46], shape: 'mist', color: '#cdbb92', color2: '#e6dcc2' });
})();
