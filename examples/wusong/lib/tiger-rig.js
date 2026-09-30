// 吊睛白额大虫 — paper-cut (剪纸) tiger on vk.rig. Body in profile facing +x, head turned 3/4 towards the viewer
// (both 吊睛 slanted eyes, the white forehead with 王). Origin = middle of the chest; paws touch y ≈ +172.
//   const tg = TGR.tiger(svgGroup);
//   const act = tg.play([{ at: 0, clip: 'prowl' }, { at: 2, clip: 'crouch', blend: .4 }]);
//   sc.on(l => tg.render(l, act, { x, y, scale: .62, flip: -1 }, { eyes: 'open' | 'shut' | 'squint' }));
// Limbs hang along +y (positive angle = swing towards the tail). Tail segments run along −x (t1 = 90 → straight up).
// Channels: jaw 0..1 (mouth open), pawW (paw sole angle, 0 = flat), tailWave (amplitude), squint 0..1.
(function () {
  const TGR = window.TGR = window.TGR || {};
  const { P, E, slit, arc } = WS;
  const S = Math.sin, C = Math.cos, PI = Math.PI;
  const f2 = x => Math.round(x * 100) / 100;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const COL = { or: '#e08a2e', or2: '#b86a24', or3: '#f0a445', cr: '#f6ecd6', cr2: '#dac9a8', bk: '#1e1b1f', eye: '#f6c630', mouth: '#9e2228', tongue: '#d8676a', nose: '#3a2220' };
  TGR.COL = COL;

  TGR.BONES = [
    { id: 'chest' },
    { id: 'hips', parent: 'chest', x: -20, y: 4 },
    { id: 'neck', parent: 'chest', x: 92, y: -30 }, { id: 'head', parent: 'neck', x: 36, y: -10, s: 1.36 }, { id: 'jaw', parent: 'head', x: 44, y: 20 },
    { id: 'fUpN', parent: 'chest', x: 60, y: 26, rot: 4 }, { id: 'fLoN', parent: 'fUpN', y: 68, rot: -4 }, { id: 'fPawN', parent: 'fLoN', y: 62 },
    { id: 'fUpF', parent: 'chest', x: 76, y: 20, rot: 4 }, { id: 'fLoF', parent: 'fUpF', y: 68, rot: -4 }, { id: 'fPawF', parent: 'fLoF', y: 62 },
    { id: 'hUpN', parent: 'hips', x: -100, y: 18, rot: -14 }, { id: 'hLoN', parent: 'hUpN', x: 4, y: 70, rot: 30 }, { id: 'hPawN', parent: 'hLoN', y: 64 },
    { id: 'hUpF', parent: 'hips', x: -86, y: 12, rot: -14 }, { id: 'hLoF', parent: 'hUpF', x: 4, y: 70, rot: 30 }, { id: 'hPawF', parent: 'hLoF', y: 64 },
    { id: 't1', parent: 'hips', x: -144, y: -30, rot: 30 },
    ...[2, 3, 4, 5, 6, 7].map(i => ({ id: 't' + i, parent: 't' + (i - 1), x: -34 + (i - 2) * 1.5 })),
  ];
  TGR.IK = {
    legFN: { chain: ['fUpN', 'fLoN', 'fPawN'], bend: 1 }, legFF: { chain: ['fUpF', 'fLoF', 'fPawF'], bend: 1 },
    legHN: { chain: ['hUpN', 'hLoN', 'hPawN'], bend: -1 }, legHF: { chain: ['hUpF', 'hLoF', 'hPawF'], bend: -1 },
  };
  TGR.SOLE = 172;
  const TAIL = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'];

  /* ---------------- art ---------------- */
  const stripe = (pts, w) => slit(pts, w, true);
  const fore = (c, c2, dark) => ({
    up: P('M-27 -22 C-33 16 -25 48 -16 74 L17 74 C25 46 29 14 24 -22 C12 -32 -14 -32 -27 -22 Z', c)
      + P(stripe([[-20, 20], [-6, 26], [4, 22]], 6) + ' ' + stripe([[-17, 42], [-4, 46], [6, 42]], 5), dark, { amp: .4 }),
    lo: P('M-17 -6 L17 -6 C17 20 15 44 14 64 L-14 64 C-16 44 -17 20 -17 -6 Z', c)
      + P(stripe([[-13, 18], [-2, 22], [6, 20]], 4.5) + ' ' + stripe([[-12, 38], [0, 41], [8, 38]], 4), dark, { amp: .3 }),
    paw: P('M-19 -9 C-24 6 -19 17 -2 18 L34 18 C43 17 43 3 32 -3 C22 -9 6 -13 -19 -9 Z', c2)
      + P(slit([[14, 16], [16, 8]], 2.6, false) + ' ' + slit([[24, 16], [26, 8]], 2.6, false) + ' ' + slit([[4, 16], [6, 9]], 2.6, false), dark, { amp: .2 }),
  });
  const hind = (c, c2, dark) => ({
    up: P('M-42 -36 C-50 6 -38 52 -12 80 L20 78 C36 44 40 4 32 -36 C12 -50 -22 -50 -42 -36 Z', c)
      + P(stripe([[-34, -4], [-14, 4], [4, 0]], 7) + ' ' + stripe([[-30, 22], [-10, 30], [10, 26]], 6.5) + ' ' + stripe([[-20, 48], [-2, 54], [14, 50]], 5.5), dark, { amp: .4 }),
    lo: P('M-15 -8 L16 -8 C15 20 12 44 11 66 L-11 66 C-12 44 -15 20 -15 -8 Z', c)
      + P(stripe([[-11, 18], [0, 22], [8, 19]], 4) + ' ' + stripe([[-10, 40], [0, 43], [7, 40]], 3.6), dark, { amp: .3 }),
    paw: P('M-18 -9 C-23 6 -18 17 -2 18 L32 18 C41 17 41 3 30 -3 C20 -9 6 -13 -18 -9 Z', c2)
      + P(slit([[12, 16], [14, 8]], 2.6, false) + ' ' + slit([[22, 16], [24, 8]], 2.6, false), dark, { amp: .2 }),
  });
  const FN = fore(COL.or, COL.or3, COL.bk), FF = fore(COL.or2, COL.or2, '#3a2a22'), HN = hind(COL.or, COL.or3, COL.bk), HF = hind(COL.or2, COL.or2, '#3a2a22');
  const tailSeg = (i) => { const w0 = 21 - i * 1.7, w1 = 21 - (i + 1) * 1.7, L = 38; const last = i === 6;
    return P(`M4 ${-w0 / 2} L${-L} ${-w1 / 2} C${-L - 5} ${-w1 / 2} ${-L - 5} ${w1 / 2} ${-L} ${w1 / 2} L4 ${w0 / 2} Z`, last ? COL.bk : COL.or)
      + (last ? '' : P(`M${-L * .45} ${-w0 / 2 - 1} L${-L * .45 - 8} ${-w0 / 2 - 1} L${-L * .45 - 10} ${w0 / 2 + 1} L${-L * .45 - 2} ${w0 / 2 + 1} Z`, COL.bk, { amp: .3 })); };
  const ART = {
    hips: P('M34 -62 C-30 -74 -98 -74 -136 -54 C-168 -34 -170 22 -146 46 C-122 64 -70 62 34 58 Z', COL.or)
      + P('M34 40 C-30 46 -96 48 -142 38 C-132 56 -106 64 -70 62 L34 58 Z', COL.cr)
      + P([[-4, -70, 0, -34, 9], [-36, -73, -34, -28, 10], [-68, -72, -68, -24, 10], [-100, -66, -102, -20, 9], [-130, -54, -136, -16, 8]].map(([x0, y0, x1, y1, w]) => stripe([[x0, y0], [x0 + (x1 - x0) * .5 + 5, (y0 + y1) / 2], [x1, y1], [x1 - 6, y1 + 12]], w)).join(' '), COL.bk, { amp: .5 })
      + P(stripe([[-156, -4], [-144, 8], [-134, 22]], 7) + ' ' + stripe([[-160, 16], [-148, 26]], 6), COL.bk, { amp: .4 }),
    chest: P('M-60 -60 C-10 -76 48 -78 86 -60 C112 -44 118 -2 106 30 C98 52 72 66 40 66 L-60 64 Z', COL.or)
      + P('M-60 46 L40 48 C70 48 92 40 104 28 C98 52 72 66 40 66 L-60 64 Z', COL.cr)
      + P([[74, -64, 84, -28, 8], [44, -74, 50, -30, 9], [12, -76, 14, -28, 9], [-22, -72, -24, -26, 9], [-52, -64, -56, -24, 8]].map(([x0, y0, x1, y1, w]) => stripe([[x0, y0], [x0 + (x1 - x0) * .5 - 5, (y0 + y1) / 2], [x1, y1], [x1 + 6, y1 + 12]], w)).join(' '), COL.bk, { amp: .5 })
      + P(stripe([[96, -20], [86, 0], [80, 20]], 6), COL.bk, { amp: .4 }),
    neck: P('M-36 -40 C0 -58 44 -46 56 -16 C62 12 46 40 18 48 C-12 54 -34 42 -44 18 Z', COL.or)
      + P('M-24 30 C-4 44 26 46 46 30 C40 44 22 52 4 52 C-12 50 -22 42 -24 30 Z', COL.cr)
      + P(stripe([[4, -48], [0, -30], [-6, -16]], 7) + ' ' + stripe([[30, -46], [26, -30], [20, -20]], 6), COL.bk, { amp: .4 }),
    // head (3/4 towards the viewer): cheek ruff, face, ears, 白额 + 王, 吊睛, muzzle, nose, whiskers; mouth interior for the jaw
    mouth: P('M28 20 C44 16 70 18 84 24 C80 44 60 54 40 50 C30 44 26 32 28 20 Z', COL.mouth) + P('M38 40 C50 36 64 38 72 44 C62 52 46 52 38 40 Z', COL.tongue),
    head: P('M-40 -8 L-54 -20 L-42 -24 L-54 -40 L-36 -38 L-38 -56 L-20 -46 L-14 -64 L4 -52 L22 -66 L34 -54 L54 -64 L62 -50 L80 -52 L82 -36 L96 -30 L90 -16 L102 -6 L90 4 L96 18 L80 22 L84 38 L66 36 L60 52 L44 42 L30 56 L22 40 L4 52 L2 34 L-18 40 L-14 24 L-34 26 L-26 12 L-46 6 Z', COL.cr, { amp: .5 })
      + P('M-34 -12 C-34 -44 -4 -62 30 -62 C62 -62 86 -40 88 -12 C90 8 82 24 66 30 L10 32 C-14 30 -34 14 -34 -12 Z', COL.or)
      // ears: far (left), near (right)
      + P(E(-6, -52, 17, 15, -20), COL.bk) + P(E(-4, -50, 9, 8, -20), COL.cr)
      + P(E(62, -56, 17, 15, 20), COL.bk) + P(E(60, -54, 9, 8, 20), COL.cr)
      // 白额 forehead with 王
      + P('M8 -60 C20 -64 40 -64 52 -60 C54 -48 50 -38 30 -32 C12 -38 6 -48 8 -60 Z', COL.cr)
      + P('M18 -56 L42 -56 L41 -52 L19 -52 Z M20 -48 L40 -48 L39 -44 L21 -44 Z M16 -40 L44 -40 L43 -36 L17 -36 Z M28 -56 L32 -56 L32 -36 L28 -36 Z', COL.bk, { amp: .25 })
      // face stripes
      + P(stripe([[-32, -20], [-16, -18], [-4, -24]], 5) + ' ' + stripe([[-34, -4], [-18, -4], [-8, -10]], 5) + ' ' + stripe([[-28, 12], [-14, 8], [-6, 2]], 4.5)
        + ' ' + stripe([[86, -22], [76, -20], [70, -26]], 4.5) + ' ' + stripe([[88, -8], [78, -8], [72, -12]], 4), COL.bk, { amp: .35 })
      // 吊睛: near eye (outer corner up-left), far eye (outer corner up-right); black brows rising outwards
      + `<g class="tg-eyes">${P('M26 -10 C16 -2 -2 -6 -14 -28 C2 -34 20 -26 26 -10 Z', COL.bk, { amp: .2 })}${P('M21 -12 C13 -7 1 -9 -7 -25 C4 -29 16 -23 21 -12 Z', COL.eye, { amp: .2 })}${P(E(8, -17, 4.2, 5.6, -20), COL.bk, { amp: .1, cls: 'tg-p1' })}${P(E(6, -19, 1.4, 1.4), '#fff', { amp: 0 })}`
      + `${P('M50 -10 C60 -2 76 -6 86 -28 C72 -34 56 -26 50 -10 Z', COL.bk, { amp: .2 })}${P('M55 -12 C62 -7 73 -9 80 -24 C70 -28 60 -23 55 -12 Z', COL.eye, { amp: .2 })}${P(E(66, -17, 3.8, 5, 20), COL.bk, { amp: .1, cls: 'tg-p2' })}${P(E(64, -19, 1.3, 1.3), '#fff', { amp: 0 })}</g>`
      + `<g class="tg-shut" opacity="0">${P(slit(arc([-12, -24], [24, -12], -6, 8), 4.5), COL.bk, { amp: .2 })}${P(slit(arc([52, -12], [84, -24], -6, 8), 4.5), COL.bk, { amp: .2 })}</g>`
      + P(stripe([[24, -26], [8, -36], [-14, -42]], 8) + ' ' + stripe([[50, -26], [66, -36], [86, -38]], 7), COL.bk, { amp: .3 })
      // muzzle + nose + whisker spots + whiskers
      + P('M26 -2 C34 -12 60 -12 76 -6 C94 -2 98 16 88 24 C76 32 40 32 28 24 C22 18 22 6 26 -2 Z', COL.cr)
      + P('M68 -8 C76 -12 88 -10 92 -4 C90 4 82 8 76 8 C70 4 66 -2 68 -8 Z', COL.nose)
      + P(slit([[76, 8], [74, 16], [62, 20]], 3) + ' ' + slit([[76, 8], [82, 16], [90, 18]], 3), COL.bk, { amp: .2 })
      + P([[46, 8], [54, 12], [40, 14], [50, 18]].map(([x, y]) => E(x, y, 2.2, 2.2)).join(' '), COL.bk, { amp: .1 })
      + P(slit([[40, 10], [10, 4], [-22, 6]], 2.2) + ' ' + slit([[42, 16], [12, 18], [-18, 26]], 2.2) + ' ' + slit([[92, 12], [112, 6], [126, 8]], 2) + ' ' + slit([[92, 18], [110, 20], [122, 28]], 2), COL.bk, { amp: .2 })
      // fangs (hang over the jaw)
      + P('M44 26 L50 26 L47 38 Z M72 26 L78 26 L76 37 Z', '#fbf8ee', { amp: .15 }),
    jaw: P('M-14 -2 C0 -4 26 -4 40 0 C44 12 34 24 14 26 C-4 26 -14 16 -14 -2 Z', COL.cr) + P('M-10 -2 L40 0 L39 4 L-10 3 Z', COL.or, { amp: .2 })
      + P('M0 -2 L5 -2 L3 -10 Z M24 -2 L29 -2 L27 -10 Z', '#fbf8ee', { amp: .12 }),
  };
  const PIECES = [
    ...TAIL.map((t, i) => ({ bone: t, z: 0 + i * .01, svg: tailSeg(i) })),
    { bone: 'hUpF', z: 2, svg: HF.up }, { bone: 'hLoF', z: 2.1, svg: HF.lo }, { bone: 'hPawF', z: 2.2, svg: HF.paw },
    { bone: 'fUpF', z: 3, svg: FF.up }, { bone: 'fLoF', z: 3.1, svg: FF.lo }, { bone: 'fPawF', z: 3.2, svg: FF.paw },
    { bone: 'hips', z: 10, svg: ART.hips }, { bone: 'chest', z: 11, svg: ART.chest },
    { bone: 'hUpN', z: 20, svg: HN.up }, { bone: 'hLoN', z: 20.1, svg: HN.lo }, { bone: 'hPawN', z: 20.2, svg: HN.paw },
    { bone: 'neck', z: 25, svg: ART.neck },
    { bone: 'fUpN', z: 30, svg: FN.up }, { bone: 'fLoN', z: 30.1, svg: FN.lo }, { bone: 'fPawN', z: 30.2, svg: FN.paw },
    { bone: 'head', z: 40, svg: ART.mouth }, { bone: 'jaw', z: 41, svg: ART.jaw }, { bone: 'head', z: 42, svg: ART.head, cls: 'tg-head' },
  ];

  /* ---------------- clips ---------------- */
  const tail = (t, o = {}) => {
    const out = {}, A = o.amp == null ? 10 : o.amp, w = o.w || 2.2, base = o.base || [0, -14, -12, -8, 10, 18, 20];
    TAIL.forEach((k, i) => { out[k] = (base[i] || 0) + A * S(t * w - i * .7) * (.4 + i * .12); });
    return out;
  };
  const base = { jaw: .04, pawW: 0, squint: 0 };
  TGR.CLIPS = {
    stand: t => ({ ...base, 'root.y': S(t * 1.6) * 1.5, neck: -2 + S(t * .9) * 2, head: S(t * 1.3) * 2, ...tail(t, { amp: 8 }) }),
    // 4-beat prowl, head low
    prowl: t => {
      const ph = t * PI * 2 * .8, L = off => { const a = ph + off * PI * 2; return [S(a), Math.max(0, C(a))]; };
      const [hF, hFl] = L(0), [fF, fFl] = L(.25), [hN, hNl] = L(.5), [fN, fNl] = L(.75);
      return { ...base, 'root.y': 3 * S(ph * 2), chest: 1.5 * S(ph), hips: -1.5 * S(ph), neck: 10 + 2 * S(ph * 2), head: -8,
        fUpN: -18 * fN, fLoN: 34 * fNl, fUpF: -18 * fF, fLoF: 34 * fFl, hUpN: -16 * hN, hLoN: 26 * hNl - 4, hUpF: -16 * hF, hLoF: 26 * hFl - 4, ...tail(t, { amp: 9, w: 3 }) };
    },
    // crouch before the spring: chest low, rear raised, tail tip flicking
    crouch: t => ({ ...base, 'root.y': 50 + S(t * 7) * 1.2, chest: 8, hips: -12 + S(t * 5) * 1.5, neck: 16, head: -18, jaw: .15, squint: .4,
      fUpN: 58, fLoN: -100, fUpF: 52, fLoF: -94, hUpN: -58, hLoN: 96, hUpF: -52, hLoF: 90, ...tail(t, { amp: 6, w: 7, base: [-8, -6, 0, 6, 16, 30, 40] }) }),
    // pounce: fully stretched in the air, forelegs reaching, mouth open
    pounce: t => ({ ...base, 'root.rot': -8 + 6 * S(t * 3), chest: -2, hips: 6, neck: -12, head: -4, jaw: .95,
      fUpN: -104, fLoN: -12, fUpF: -92, fLoF: -20, hUpN: 72, hLoN: 12, hUpF: 60, hLoF: 18, pawW: 30, ...tail(t, { amp: 4, base: [-24, -4, -2, 0, 2, 4, 4] }) }),
    // landing absorb
    land: t => ({ ...base, 'root.y': 18, chest: 6, hips: -4, neck: 4, head: -4, jaw: .4, fUpN: -20, fLoN: 16, fUpF: -10, fLoF: 10, hUpN: -30, hLoN: 40, hUpF: -24, hLoF: 34, ...tail(t, { amp: 8 }) }),
    // 掀: forelegs braced, rear heaved up, hind legs kicking back; t∈[0,1] = the heave
    lift: t => { const k = sm(t / .5) * (1 - sm((t - .7) / .5));
      const r = 16 * k * Math.PI / 180, px = 70, py = 172;
      return { ...base, 'root.rot': 16 * k, 'root.x': px - (px * C(r) - py * S(r)), 'root.y': py - (px * S(r) + py * C(r)), chest: 3 * k, hips: 8 * k, neck: 14 * k - 4, head: -4 * k, jaw: .3 + .5 * k,
        fUpN: -26 * k, fLoN: 8 * k, fUpF: -20 * k, fLoF: 6 * k, hUpN: 100 * k, hLoN: 10 * k + 20 * (1 - k), hUpF: 86 * k, hLoF: 16 * k + 20 * (1 - k), pawW: 40 * k,
        ...tail(t, { amp: 6, base: [60 * k, -10, -8, -4, 6, 10, 12] }) }; },
    // 剪: tail raised stiff (倒竖), then swept down and back; t∈[0,1.2]
    sweep: t => { const up = sm(t / .4), down = sm((t - .55) / .22), rec = sm((t - .9) / .3), k = up * (1 - rec);
      const a1 = 88 * k - 118 * down * (1 - rec);
      return { ...base, 'root.y': 6 * down, chest: -2, hips: 4 * down, neck: -6, head: -4, jaw: .4 + .4 * down,
        fUpN: -12, fLoN: 10, fUpF: -6, fLoF: 6, hUpN: -24 - 10 * down, hLoN: 36, hUpF: -18, hLoF: 34,
        t1: a1, t2: -4 * k + 8 * down, t3: -2 * k + 8 * down, t4: 2 * k + 10 * down, t5: 4 * k + 10 * down, t6: 6 * k + 10 * down, t7: 6 * k + 8 * down + S(t * 30) * 3 * (1 - down) * up }; },
    // roar: head up, jaw wide
    roar: t => ({ ...base, 'root.y': -2, chest: -4, hips: 2, neck: -20 + S(t * 14) * 1.5, head: -8, jaw: 1, squint: .3, fUpN: -14, fLoN: 8, fUpF: -4, fLoF: 4, hUpN: -8, hLoN: 12, hUpF: -6, hLoF: 10, ...tail(t, { amp: 16, w: 5 }) }),
    // pressed down, head pinned: legs scrabbling, tail thrashing
    struggle: t => { const a = t * 11;
      return { ...base, 'root.y': 36 + S(a * .5) * 3, 'root.rot': 3 + 2 * S(a * .37), chest: 8, hips: -6 + 5 * S(a * .43), neck: 36, head: 14 + 3 * S(a), jaw: .55 + .2 * S(a * .8), squint: .8,
        fUpN: -50 + 26 * S(a), fLoN: -10 + 20 * C(a), fUpF: -40 + 26 * S(a + 2), fLoF: -10 + 20 * C(a + 2), hUpN: -30 + 30 * S(a * .8 + 1), hLoN: 50 + 20 * C(a * .8), hUpF: -24 + 30 * S(a * .8 + 3), hLoF: 50 + 20 * C(a * .8 + 2),
        ...tail(t, { amp: 22, w: 9 }) }; },
    pinned: t => ({ ...base, 'root.y': 42, chest: 8, hips: -4, neck: 38, head: 16, jaw: .45, squint: .9, fUpN: -58, fLoN: -12, fUpF: -48, fLoF: -10, hUpN: -40, hLoN: 64, hUpF: -34, hLoF: 60, ...tail(t, { amp: 6, w: 3 }) }),
    // lying still (defeated): flat, legs out, head down, tail limp
    defeated: t => ({ ...base, 'root.y': 92, 'root.rot': 2, chest: 4, hips: -2, neck: 30, head: 18, jaw: .18, fUpN: -78, fLoN: -8, fUpF: -70, fLoF: -8, hUpN: 64, hLoN: 6, hUpF: 56, hLoF: 8, pawW: 70,
      t1: -34, t2: -6, t3: -4, t4: 2, t5: 4, t6: 4, t7: 2 }),
  };

  TGR.tiger = function (parent, o = {}) {
    const ch = WS.char(parent, { cls: 'tiger ' + (o.cls || ''), filter: o.filter, bones: TGR.BONES, pieces: PIECES, clips: { ...TGR.CLIPS, ...(o.clips || {}) }, ik: TGR.IK, defaults: { ...base } });
    const { rig } = ch;
    const E_ = { eyes: ch.q('.tg-eyes'), shut: ch.q('.tg-shut'), p1: ch.q('.tg-p1'), p2: ch.q('.tg-p2') };
    const api = {
      ...ch, play: (track, opts) => rig.play(track, opts),
      pose(t, player, root, st = {}) {
        let p = { ...player.pose(t, root, st.edit ? (q => st.edit(q, t)) : undefined) };
        p.jaw = 34 * clamp(p.jaw == null ? 0 : p.jaw);
        const pw = p.pawW || 0;
        ['fPawN', 'fPawF', 'hPawN', 'hPawF'].forEach(k => { p[k] = (k[0] === 'f' ? pw * .6 : pw) - ch.worldRot(k, { ...p, [k]: 0 }); });
        if (st.post) st.post(p, t);
        return p;
      },
      point(bone, x, y, t, player, root, st) { return rig.point(bone, x, y, api.pose(t, player, root, st), root); },
      // st: {opacity, eyes: 'shut', edit, post}
      render(t, player, root, st = {}) {
        WS.setOp(ch.g, st.opacity == null ? 1 : st.opacity);
        if (st.opacity != null && st.opacity <= .001) return null;
        const p = api.pose(t, player, root, st);
        ch.apply(p, root);
        const shut = st.eyes === 'shut' ? 1 : vk.rig.blink(t, { period: 5.3, dur: .14, offset: st.blinkOffset || 1 });
        WS.setOp(E_.eyes, 1 - shut); WS.setOp(E_.shut, shut);
        const sq = clamp((p.squint || 0) * .5);
        [E_.p1, E_.p2].forEach(e => e.setAttribute('transform', `translate(0 ${f2(sq * 2)})`));
        return p;
      },
    };
    return api;
  };
})();
