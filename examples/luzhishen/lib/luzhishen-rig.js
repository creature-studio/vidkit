// 鲁智深 — paper-cut (剪纸) 花和尚 on vk.rig. Profile facing +x (root.flip −1 to face left).
// Units: origin = waist; soles at y ≈ +202, crown at ≈ −262. Limbs are drawn hanging along +y, so a positive angle
// swings a limb backward (towards −x) and a negative one forward — same convention as examples/wusong/lib/wusong-rig.js.
//   const lz = LZR.luzhishen(svgGroup);
//   const act = lz.play([{ at: 0, clip: 'walk' }, { at: 3, clip: 'laugh', blend: .4 }]);
//   sc.on(l => lz.render(l, act, { x, y, scale: .55, flip: 1 }, { staff: 1, bowl: 0, face: 'shout' }));
// Channels besides bone angles: staffW = world angle of the 禅杖 (0 = spade end down, ±90 = level), grip = where the
// hand holds it, twoHand = far hand grips it too (IK 0..1), footW = sole angle, look = eye direction, energy.
(function () {
  const LZR = window.LZR = window.LZR || {};
  const { P, E, slit, arc } = WS;
  const S = Math.sin, C = Math.cos;
  const f2 = x => Math.round(x * 100) / 100;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };

  const COL = {
    robe: '#2d2a33', robe2: '#3d3944', robe3: '#4a4551', trim: '#e7dbba', trim2: '#cfc09b',
    skin: '#f0cba4', skin2: '#dcaa82', skin3: '#c48f6b', rouge: '#e08c78', beard: '#241f22',
    red: '#b5342a', red2: '#8f231f', gold: '#cfa13c', bead: '#7d3b26',
    pants: '#e9dfc2', pants2: '#d2c4a0', shoe: '#5a5058',
    wood: '#8a5a2c', wood2: '#c48f4e', steel: '#aab4ba', steel2: '#7e8b93',
    bowl: '#e9e1cc',
  };
  LZR.COL = COL;

  /* ---------------- bones ---------------- */
  LZR.BONES = [
    { id: 'hips' },
    { id: 'chest', parent: 'hips', x: 0, y: -4 },
    { id: 'head', parent: 'chest', x: 8, y: -148, s: 1.22 },
    { id: 'upperArmN', parent: 'chest', x: 2, y: -132 }, { id: 'foreArmN', parent: 'upperArmN', y: 66 }, { id: 'handN', parent: 'foreArmN', y: 58 },
    { id: 'upperArmF', parent: 'chest', x: -8, y: -130 }, { id: 'foreArmF', parent: 'upperArmF', y: 66 }, { id: 'handF', parent: 'foreArmF', y: 58 },
    { id: 'staff', parent: 'handN', y: 12 }, { id: 'staffBody', parent: 'staff' },
    { id: 'bowl', parent: 'handN', x: 0, y: 14 },
    { id: 'thighN', parent: 'hips', x: -2, y: 8 }, { id: 'shinN', parent: 'thighN', y: 92 }, { id: 'footN', parent: 'shinN', y: 86 },
    { id: 'thighF', parent: 'hips', x: 6, y: 6 }, { id: 'shinF', parent: 'thighF', y: 92 }, { id: 'footF', parent: 'shinF', y: 86 },
    { id: 'skirtN', parent: 'hips', x: 10, y: -8 }, { id: 'skirtB', parent: 'hips', x: -14, y: -8 },
  ];
  LZR.IK = {
    armN: { chain: ['upperArmN', 'foreArmN', 'handN'], bend: -1 },
    armF: { chain: ['upperArmF', 'foreArmF', 'handF'], bend: -1 },
    legN: { chain: ['thighN', 'shinN', 'footN'], bend: 1 },
    legF: { chain: ['thighF', 'shinF', 'footF'], bend: 1 },
  };
  LZR.SOLE = 202;

  /* ---------------- art (bone-local, drawn hanging along +y) ---------------- */
  // wide monk sleeve (花和尚 wears a roomy 皂布直裰)
  const sleeve = (len, w0, w1, col, trim) => P(`M${-w0} -10 C${-w0 - 4} ${len * .35} ${-w1 - 3} ${len * .72} ${-w1} ${len + 6} L${w1} ${len + 6} C${w1 + 3} ${len * .72} ${w0 + 4} ${len * .35} ${w0} -10 C${w0 * .5} -18 ${-w0 * .5} -18 ${-w0} -10 Z`, col)
    + (trim ? P(slit(arc([w0 - 4, -4], [w1 - 3, len], -4, 10), 3.4, true), trim) : '');
  // 九个戒疤 on the shaved scalp
  const jieba = [[-2, -92], [11, -96], [24, -92], [-4, -80], [9, -84], [22, -80], [-4, -68], [8, -71], [20, -68]]
    .map(([x, y]) => E(x, y, 3.1, 2.7)).join(' ');

  const ART = {
    skirtB: P('M-16 -2 L14 -2 L12 52 C2 57 -12 57 -21 50 Z', COL.robe2) + P('M-21 42 L12 44 L12 52 C2 57 -12 57 -21 50 Z', COL.trim2, { amp: .5 }),
    upperArmF: sleeve(66, 21, 15, COL.robe2),
    foreArmF: sleeve(58, 14, 12, COL.robe2) + P('M-14 40 L14 40 L15 60 L-15 60 Z', COL.trim2, { amp: .4 }),
    handF: P(E(0, 12, 13, 13.5), COL.skin2) + P(slit([[-7, 6], [2, 4], [8, 10]], 3.2), COL.skin3, { amp: .2 }),
    thighF: P('M-20 -8 C-24 30 -19 62 -16 94 L16 94 C19 62 24 30 20 -8 Z', COL.pants2),
    shinF: P('M-15 -4 C-16 30 -13 58 -12 88 L12 88 C13 58 16 30 15 -4 Z', COL.pants2)
      + P('M-13 34 L13 34 L12 62 L-12 62 Z', COL.trim2, { amp: .4 }),
    footF: P('M-13 -26 L13 -26 L14 -6 C25 -6 36 -1 40 8 L40 13 L-15 13 Z', COL.shoe, { amp: .5 }) + P('M-16 9 L41 9 L42 18 L-16 18 Z', COL.trim2, { amp: .4 }),
    hips: P('M-26 -14 L26 -14 L23 20 L-23 20 Z', COL.pants),
    thighN: P('M-20 -8 C-24 30 -19 62 -16 94 L16 94 C19 62 24 30 20 -8 Z', COL.pants)
      + P(slit(arc([-9, 10], [-7, 80], 4, 8), 3), COL.pants2, { amp: .3 }),
    shinN: P('M-15 -4 C-16 30 -13 58 -12 88 L12 88 C13 58 16 30 15 -4 Z', COL.pants)
      // 行缠 (cloth leg wraps) criss-crossing the shin
      + P(slit([[-14, 14], [14, 30]], 4.5, false) + ' ' + slit([[-14, 30], [14, 14]], 4.5, false), COL.trim2, { amp: .45 })
      + P(slit([[-13, 52], [13, 62]], 3.4, false) + ' ' + slit([[-13, 68], [13, 78]], 3.4, false), COL.trim2, { amp: .4 }),
    footN: P('M-13 -26 L13 -26 L14 -6 C25 -6 36 -1 40 8 L40 13 L-15 13 Z', COL.shoe, { amp: .5 }) + P('M-16 9 L41 9 L42 18 L-16 18 Z', COL.trim, { amp: .4 })
      + P(slit(arc([14, -2], [34, 6], -2, 6), 2.4), COL.trim, { amp: .3 }),
    neck: P('M-12 8 L-13 -20 L14 -22 L15 8 Z', COL.skin2),
    // 皂布直裰 over a heavy frame: barrel chest, big belly, 交领 lapel, 数珠 (prayer beads), 腰绦
    chest: P('M-34 -146 C-14 -160 18 -160 32 -146 C46 -122 52 -88 47 -54 C44 -30 38 -14 34 -2 L-30 -2 C-36 -32 -43 -64 -43 -98 C-43 -124 -40 -140 -34 -146 Z', COL.robe)
      + P('M14 -80 C40 -74 52 -48 47 -22 C45 -10 41 -4 34 -2 L14 -2 Z', COL.robe2, { amp: .5 })                      // belly highlight
      + P(slit([[-10, -154], [8, -136], [24, -112], [36, -84], [40, -56]], 11, false), COL.trim, { amp: .5 })          // lapel
      + P(slit([[20, -154], [25, -138], [29, -124]], 8, false), COL.trim, { amp: .5 })
      + P(slit(arc([-34, -132], [-38, -56], 7, 10), 3.4), COL.robe3, { amp: .3 })
      + P([[18, -142], [27, -130], [32, -114], [31, -96], [24, -84], [12, -78]].map(([x, y]) => E(x, y, 5.2, 5.2)).join(' '), COL.bead, { amp: .25 })   // 数珠
      + P(E(12, -78, 3, 5), COL.red, { amp: .2 })
      + P('M-32 -28 L36 -30 L37 -10 L-31 -8 Z', COL.gold, { amp: .45 })                                                // 腰绦
      + P(slit([[-26, -20], [30, -21]], 2.6, false), '#a8802c', { amp: .3 }) + P(E(36, -20, 7, 9), COL.gold, { amp: .35 }),
    skirtN: P('M-18 -2 L18 -2 C21 18 20 38 17 56 C6 61 -9 61 -18 56 C-20 36 -20 16 -18 -2 Z', COL.robe)
      + P('M-18 48 C-8 53 8 53 17 48 L17 56 C6 61 -9 61 -18 56 Z', COL.trim, { amp: .4 })
      + P(slit([[11, 0], [15, 28], [13, 54]], 7), COL.robe3, { amp: .35 }),
    head: // ear · shaved head + face (profile) · 戒疤 · 络腮胡 · brows / eye / mouth
      P('M-32 -58 C-42 -50 -42 -32 -28 -24 C-20 -28 -18 -48 -24 -60 Z', COL.skin2)
      + P('M-18 -22 C-32 -44 -30 -84 -8 -99 C16 -114 44 -101 48 -74 L50 -60 C52 -56 57 -50 59 -44 C57 -41 54 -40 52 -39 C53 -35 52 -31 49 -29 C49 -20 42 -12 29 -8 C14 -4 -4 -8 -14 -16 Z', COL.skin)
      + P(jieba, COL.skin3, { amp: .25 })
      + P(E(-10, -46, 7.5, 10.5, -8), COL.skin2) + P(slit(arc([-11, -52], [-10, -40], 3, 5), 2), COL.skin3, { amp: .2 })
      + P(E(24, -50, 18, 10, -10), COL.rouge, { op: .62, amp: .5 })
      // 络腮胡: jaw beard + moustache + a tuft under the lip
      + P('M-16 -30 C-18 -8 -2 6 18 6 C36 6 50 -4 52 -18 C52 -26 50 -30 48 -32 C42 -16 28 -8 12 -8 C-2 -8 -10 -16 -16 -30 Z', COL.beard, { amp: .6 })
      + P(slit([[50, -26], [34, -22], [24, -24]], 5) + ' ' + slit([[50, -24], [36, -14], [26, -14]], 4), COL.beard, { amp: .4 })
      + P(slit([[-24, -30], [-14, -8]], 7), COL.beard, { amp: .5 })
      + P(slit([[46, -62], [30, -66], [14, -70], [2, -74]], 9), COL.beard, { amp: .45 })                                 // thick brow
      + `<g class="lz-eye-open">${P('M40 -50 C34 -56 22 -57 13 -54 C20 -48 32 -46 40 -50 Z', '#fbf6ea', { amp: .2 })}${P(E(28, -52, 4, 4.2), COL.beard, { amp: .15, cls: 'lz-pupil' })}${P(slit([[41, -51], [30, -56], [18, -57], [9, -60]], 3.4), COL.beard, { amp: .2 })}</g>`
      + `<g class="lz-eye-shut" opacity="0">${P(slit(arc([41, -51], [11, -55], 3, 8), 3), COL.beard, { amp: .2 })}</g>`
      + P(slit([[52, -40], [48, -38]], 2.4), COL.skin3, { amp: .15 })
      + `<g class="lz-mouth">${P(slit([[48, -22], [40, -20], [34, -21]], 3.6), COL.red2, { amp: .2 })}</g>`
      + `<g class="lz-shout" opacity="0">${P('M49 -25 C46 -19 43 -9 37 -8 C34 -14 35 -22 39 -26 Z', COL.red2, { amp: .3 })}</g>`,
    // 水磨禅杖: pole, crescent-moon blade on top, rings, spade foot
    staffBody: `<g class="lz-staff-whole">${P('M-6 -126 L6 -126 L7 212 L-7 212 Z', COL.wood, { step: 8, amp: .5 })}`
      + `${[-84, -20, 44, 110, 172].map(y => P(`M-7 ${y} L7 ${y} L7 ${y + 13} L-7 ${y + 13} Z`, COL.wood2, { amp: .35 })).join('')}`
      + `${P('M-30 -128 C-35 -164 -13 -182 0 -170 C13 -182 35 -164 30 -128 C23 -148 11 -156 0 -147 C-11 -156 -23 -148 -30 -128 Z', COL.steel, { step: 6, amp: .7 })}`
      + `${P(slit(arc([-22, -140], [0, -152], -5, 6), 3) + ' ' + slit(arc([0, -152], [22, -140], -5, 6), 3), COL.steel2, { amp: .3 })}`
      + `${P(E(-16, -122, 6.5, 6.5) + ' ' + E(16, -122, 6.5, 6.5), COL.gold, { amp: .3 })}`
      + `${P('M-9 190 L9 190 L11 216 L-11 216 Z', COL.steel, { amp: .4 })}</g>`,
    bowl: `<g class="lz-bowl">${P('M-27 -9 L27 -9 C25 10 14 19 0 19 C-14 19 -25 10 -27 -9 Z', '#6e4326')}${P('M-27 -9 L27 -9 L26 -3 L-26 -3 Z', COL.bowl, { amp: .3 })}${P(slit(arc([-15, 5], [15, 5], 3, 6), 2.8), COL.red, { amp: .2 })}</g>`,
    upperArmN: sleeve(66, 21, 15, COL.robe, COL.trim) + P(slit(arc([-12, 4], [12, 4], -6, 6), 3.6), COL.trim, { amp: .3 }),
    foreArmN: sleeve(58, 14, 12, COL.robe) + P('M-14 40 L14 40 L16 60 L-16 60 Z', COL.trim, { amp: .4 }),
    handN: P(E(0, 12, 13.5, 14), COL.skin) + P(slit([[-8, 6], [2, 4], [9, 10]], 3.4), COL.skin2, { amp: .2 }) + P(slit([[-10, 15], [9, 17]], 1.9, false), COL.skin2, { amp: .2 }),
  };
  // paint order: back flap · far arm · far leg · pelvis · near leg · neck · robe · front flap · head · staff · bowl · near arm
  const PIECES = [
    ['skirtB', 'skirtB', 0], ['upperArmF', 'upperArmF', 10], ['foreArmF', 'foreArmF', 11], ['handF', 'handF', 12],
    ['thighF', 'thighF', 20], ['shinF', 'shinF', 21], ['footF', 'footF', 22], ['hips', 'hips', 30],
    ['thighN', 'thighN', 32], ['shinN', 'shinN', 33], ['footN', 'footN', 34], ['head', 'neck', 38], ['chest', 'chest', 40], ['skirtN', 'skirtN', 41],
    ['head', 'head', 50], ['staffBody', 'staffBody', 55], ['bowl', 'bowl', 56],
    ['upperArmN', 'upperArmN', 60], ['foreArmN', 'foreArmN', 61], ['handN', 'handN', 62],
  ].map(([bone, art, z]) => ({ bone, z, svg: ART[art], cls: 'lz-' + art }));

  /* ---------------- clips (pure functions of clip time) ---------------- */
  const base = { staffW: 0, grip: 0, twoHand: 0, footW: 0, look: 0 };
  LZR.CLIPS = {
    // planted, belly forward, 禅杖 standing beside him
    idle: t => ({ ...base, 'root.y': S(t * 1.8) * 1.4, chest: -2 + S(t * 1.8) * .9, head: 1 + S(t * 1.05) * 1.6,
      upperArmN: -14, foreArmN: -26, upperArmF: 14, foreArmF: -26, thighN: -9, shinN: 9, thighF: 8, shinF: 4, staffW: -4, grip: 26 }),
    // heavy swagger, staff over the shoulder
    walk: t => {
      const ph = t * Math.PI * 2 * .82, s = S(ph), c = C(ph);
      return { ...base, 'root.y': 6 * Math.abs(s) - 3, 'root.rot': 1.6 * s, chest: 5 + S(ph * 2) * 1.4, head: -3 - S(ph * 2) * 1.4,
        thighN: -24 * s, thighF: 24 * s, shinN: 7 + 38 * Math.max(0, c), shinF: 7 + 38 * Math.max(0, -c),
        upperArmN: -36 + 3 * s, foreArmN: -118, upperArmF: -22 * s + 6, foreArmF: -28 + 9 * s,
        staffW: 102 + 3 * s, grip: 92, footW: 0 };
    },
    // belly laugh: head back, shoulders shaking, one hand on the belly
    laugh: t => { const q = S(t * 9), q2 = S(t * 4.5);
      return { ...base, 'root.y': 5 + 3 * q, 'root.rot': -4, chest: -14 - 2 * q2, head: -18 - 3 * q,
        thighN: -16, shinN: 14, thighF: 16, shinF: 7,
        upperArmN: -108 - 6 * q, foreArmN: -54 - 8 * q,           // one fist thrown up
        upperArmF: 40, foreArmF: -112, energy: .6 + .4 * Math.abs(q) }; },
    // raise a bowl to the lips (period 1.7 s), far hand on the hip
    drink: t => {
      const u = ((t % 1.7) + 1.7) % 1.7 / 1.7, up = sm(u / .3) * (1 - sm((u - .78) / .22)), gulp = sm((u - .28) / .2) * (1 - sm((u - .72) / .2));
      return { ...base, 'root.y': S(t * 2) * 1.2, chest: -3 - 6 * gulp, head: -5 - 18 * gulp, upperArmF: 36, foreArmF: -106,
        thighN: -10, shinN: 10, thighF: 8, shinF: 4, 'armN.tx': 62 - 14 * up + 6 * gulp, 'armN.ty': -44 - 134 * up - 6 * gulp, 'armN.w': 1, bowlTilt: 48 * gulp, energy: up };
    },
    // looking up (at the crows in the willow)
    look: t => ({ ...base, 'root.y': S(t * 1.5) * 1.1, chest: -6, head: -26 + S(t * .9) * 2, look: -1,
      upperArmN: -18, foreArmN: -34, upperArmF: 22, foreArmF: -66, thighN: -6, shinN: 6, thighF: 6, shinF: 3, staffW: -8, grip: 26 }),
    // pointing forward with the free hand
    point: t => ({ ...base, 'root.y': S(t * 2) * 1, chest: 4, head: -6, upperArmN: -96 + S(t * 3) * 2, foreArmN: -12,
      upperArmF: 16, foreArmF: -30, thighN: -18, shinN: 16, thighF: 14, shinF: 6, staffW: -100, grip: 20 }),
    // on guard, staff levelled in both hands
    guard: t => ({ ...base, 'root.y': 14 + S(t * 3) * 1.6, chest: 7 + S(t * 2.1) * 1.5, head: -6,
      thighN: -32, shinN: 38, thighF: 32, shinF: 7, upperArmN: -52, foreArmN: -40, staffW: -62 + S(t * 2.3) * 3, grip: 10, twoHand: 1 }),
    // 飞脚: wind-up (t<.18), kick out (peak ≈ .34), recover. Near leg snaps forward, body counter-leans.
    kick: t => {
      const a = sm(t / .2), b = sm((t - .2) / .16), c = sm((t - .52) / .4);
      const ex = b * (1 - c);
      return { ...base, 'root.y': 6 + 16 * a - 8 * c, 'root.rot': -4 * a - 10 * ex,
        chest: -8 - 16 * ex, head: -6 - 8 * ex + 4 * c,
        thighN: -20 * a - 96 * ex, shinN: 44 * a - 42 * ex, footW: -20 * ex,
        thighF: 16 + 16 * a, shinF: 6 + 10 * a,
        upperArmN: -30 - 74 * ex, foreArmN: -30 - 20 * ex, upperArmF: 40 + 50 * ex, foreArmF: -40 - 20 * ex,
        energy: ex };
    },
    // 相树: sizing the tree up, hands on the hips
    size: t => ({ ...base, 'root.y': S(t * 1.4) * 1.2, chest: -4, head: -14 + S(t * .8) * 2, look: -1,
      upperArmN: 40, foreArmN: -108, upperArmF: 38, foreArmF: -108, thighN: -14, shinN: 12, thighF: 12, shinF: 6 }),
    // 把身倒缴着: deep squat, back rounded over the trunk (arms are IK-driven by the scene)
    grip: t => ({ ...base, 'root.y': 74 + S(t * 3.4) * 2, 'root.rot': 16, chest: 34, head: -34,
      thighN: -96, shinN: 116, thighF: -54, shinF: 104, footW: 14,
      upperArmN: -64, foreArmN: -46, upperArmF: -26, foreArmF: -38, look: -1 }),
    // 只一趁: the heave — legs drive, body unrolls and leans back (arms stay IK-driven)
    heave: t => { const a = sm(t / .62), sh = S(t * 26) * (1 - a) * 2;
      return { ...base, 'root.y': 74 - 88 * a + sh, 'root.rot': 16 - 36 * a,
        chest: 34 - 54 * a, head: -34 + 40 * a,
        thighN: -96 + 68 * a, shinN: 116 - 80 * a, thighF: -54 + 82 * a, shinF: 104 - 92 * a, footW: 14 - 28 * a,
        upperArmN: -60 + 20 * a, foreArmN: -50 + 16 * a, upperArmF: -20 - 30 * a, foreArmF: -40 + 10 * a, energy: a }; },
    // holding the uprooted tree up on one shoulder
    hold: t => ({ ...base, 'root.y': -4 + S(t * 2.4) * 2, 'root.rot': -8, chest: -14, head: -10,
      thighN: -34, shinN: 24, thighF: 30, shinF: 10, upperArmN: -132, foreArmN: -26, upperArmF: -96, foreArmF: -34, footW: 0 }),
    // 亮相 after the deed: fist up, chin high
    victory: t => ({ ...base, 'root.y': 3 + S(t * 1.5) * 1.1, chest: -8, head: -14 + S(t * 1.1) * 1.2,
      thighN: -32, shinN: 18, thighF: 26, shinF: 7, upperArmN: -104, foreArmN: -72, upperArmF: 38, foreArmF: -106, footW: 0 }),
    // panting / catching breath
    pant: t => ({ ...base, 'root.y': 6 + S(t * 5.4) * 2.6, chest: 12 + S(t * 5.4) * 3.2, head: 8 + S(t * 5.4) * 2,
      thighN: -22, shinN: 24, thighF: 18, shinF: 12, upperArmN: -12, foreArmN: -22, upperArmF: 12, foreArmF: -22 }),
  };

  LZR.luzhishen = function (parent, o = {}) {
    const ch = WS.char(parent, { cls: 'luzhishen ' + (o.cls || ''), filter: o.filter, bones: LZR.BONES, pieces: PIECES, clips: { ...LZR.CLIPS, ...(o.clips || {}) }, ik: LZR.IK, defaults: { ...base } });
    const { rig } = ch;
    const E_ = { eyeO: ch.q('.lz-eye-open'), eyeS: ch.q('.lz-eye-shut'), pupil: ch.q('.lz-pupil'), mouth: ch.q('.lz-mouth'), shout: ch.q('.lz-shout'),
      staffG: ch.q('.lz-staffBody'), bowlG: ch.q('.lz-bowl'), farArm: ch.qa('.lz-upperArmF,.lz-foreArmF,.lz-handF'), farLeg: ch.qa('.lz-thighF,.lz-shinF,.lz-footF') };
    const api = {
      ...ch, play: (track, opts) => rig.play(track, opts),
      pose(t, player, root, st = {}) {
        let p = player.pose(t, root, st.edit ? (q => st.edit(q, t)) : undefined);
        p = { ...p };
        p.staff = (p.staffW || 0) - ch.worldRot('handN', p);
        p['staffBody.y'] = p.grip || 0;
        p.bowl = -ch.worldRot('handN', p) + (p.bowlTilt || 0);
        const fw = p.footW || 0;
        p.footN = (p.footN || 0) + fw - ch.worldRot('footN', { ...p, footN: 0 });
        p.footF = (p.footF || 0) + fw - ch.worldRot('footF', { ...p, footF: 0 });
        p.skirtN = .55 * Math.min(0, p.thighN || 0) + .2 * Math.max(0, p.thighN || 0);
        p.skirtB = .5 * Math.max(0, p.thighF || 0) + .25 * Math.min(0, p.thighF || 0);
        if (p.twoHand > .001 && st.staff !== 0) {
          const tgt = rig.point('staffBody', 0, -(p.grip || 0) + (p.twoGrip != null ? p.twoGrip : 46), p, root);
          p = rig.solveIK('armF', tgt, p, root, { weight: Math.min(1, p.twoHand) });
        }
        if (st.post) st.post(p, t);
        return p;
      },
      point(bone, x, y, t, player, root, st) { return rig.point(bone, x, y, api.pose(t, player, root, st), root); },
      // st: {opacity, staff 0/1, bowl, face: 'shout'|'shut', farArm, farLeg, blinkOffset, edit, post}
      render(t, player, root, st = {}) {
        WS.setOp(ch.g, st.opacity == null ? 1 : st.opacity);
        if (st.opacity != null && st.opacity <= .001) return null;
        const p = api.pose(t, player, root, st);
        ch.apply(p, root);
        const bl = st.face === 'shut' ? 1 : vk.rig.blink(t, { period: 4.1, dur: .16, offset: st.blinkOffset || 0 });
        WS.setOp(E_.eyeO, 1 - bl); WS.setOp(E_.eyeS, bl);
        const look = p.look || 0;
        E_.pupil.setAttribute('transform', `translate(${f2(look > 0 ? 3 * look : 2 * look)} ${f2(look < 0 ? 2 * look : -.5 * look)})`);
        const sh = st.face === 'shout' ? 1 : 0; WS.setOp(E_.shout, sh); WS.setOp(E_.mouth, 1 - sh);
        WS.setOp(E_.staffG, st.staff == null ? 1 : st.staff);
        WS.setOp(E_.bowlG, st.bowl || 0);
        E_.farArm.forEach(e => WS.setOp(e, st.farArm == null ? 1 : st.farArm));
        E_.farLeg.forEach(e => WS.setOp(e, st.farLeg == null ? 1 : st.farLeg));
        return p;
      },
    };
    return api;
  };
})();
