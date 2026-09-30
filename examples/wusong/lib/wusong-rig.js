// 武松 — paper-cut (剪纸) 武生 on vk.rig. Profile facing +x (use root.flip −1 to face left).
// Units: origin = waist; feet soles at y ≈ +202, pompom top at ≈ −262 (≈ 465 tall). Limbs are drawn hanging along +y,
// so a positive angle swings a limb backward (towards −x) and a negative one forward.
//   const ws = WSR.wusong(svgGroup);
//   const act = ws.play([{ at: 0, clip: 'walk' }, { at: 3, clip: 'guard', blend: .4 }]);
//   sc.on(l => ws.render(l, act, { x, y, scale: .55, flip: 1 }, { staff: 1, bowl: 0, face: 'shout' }));
// Channels (besides bone angles): staffW = world angle of the staff (0 = long end pointing down, 90 = pointing back,
// −90 = pointing forward, 180 = up); grip = where the hand holds the staff (0 = one third, +90 = near the short end);
// twoHand = far hand grips the staff too (IK, 0..1); footW = sole angle (0 = flat); look = eye direction.
(function () {
  const WSR = window.WSR = window.WSR || {};
  const { P, E, slit, arc } = WS;
  const S = Math.sin, C = Math.cos, PI = Math.PI;
  const f2 = x => Math.round(x * 100) / 100;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };

  const COL = {
    black: '#1e1b1f', black2: '#322e36', trim: '#efe2c0', trim2: '#d9c9a2', skin: '#f1cda8', skin2: '#dfb08a', rouge: '#e7897a',
    red: '#bf2f28', red2: '#8f231f', gold: '#d9a93e', pants: '#efe3c6', pants2: '#cdbf9c', wood: '#8a5a2c', wood2: '#c48f4e', woodEnd: '#3b2616',
    bowl: '#e9e1cc', bowlIn: '#7a4a2a',
  };
  WSR.COL = COL;

  /* ---------------- bones ---------------- */
  WSR.BONES = [
    { id: 'hips' },
    { id: 'chest', parent: 'hips', x: 0, y: -4 },
    { id: 'head', parent: 'chest', x: 6, y: -146, s: 1.2 },
    { id: 'ribbon', parent: 'head', x: -30, y: -72 },
    { id: 'upperArmN', parent: 'chest', x: 2, y: -132 }, { id: 'foreArmN', parent: 'upperArmN', y: 66 }, { id: 'handN', parent: 'foreArmN', y: 58 },
    { id: 'upperArmF', parent: 'chest', x: -6, y: -130 }, { id: 'foreArmF', parent: 'upperArmF', y: 66 }, { id: 'handF', parent: 'foreArmF', y: 58 },
    { id: 'staff', parent: 'handN', y: 12 }, { id: 'staffBody', parent: 'staff' },
    { id: 'bowl', parent: 'handN', x: 0, y: 14 },
    { id: 'thighN', parent: 'hips', x: -2, y: 8 }, { id: 'shinN', parent: 'thighN', y: 92 }, { id: 'footN', parent: 'shinN', y: 86 },
    { id: 'thighF', parent: 'hips', x: 6, y: 6 }, { id: 'shinF', parent: 'thighF', y: 92 }, { id: 'footF', parent: 'shinF', y: 86 },
    { id: 'skirtN', parent: 'hips', x: 8, y: -8 }, { id: 'skirtB', parent: 'hips', x: -12, y: -8 },
  ];
  WSR.IK = {
    armN: { chain: ['upperArmN', 'foreArmN', 'handN'], bend: -1 },
    armF: { chain: ['upperArmF', 'foreArmF', 'handF'], bend: -1 },
    legN: { chain: ['thighN', 'shinN', 'footN'], bend: 1 },
    legF: { chain: ['thighF', 'shinF', 'footF'], bend: 1 },
  };
  WSR.SOLE = 202;                                  // waist → sole (standing straight)

  /* ---------------- art (bone-local, drawn hanging along +y) ---------------- */
  const sleeve = (len, w0, w1, col, trim) => P(`M${-w0} -8 C${-w0 - 2} ${len * .35} ${-w1 - 1} ${len * .7} ${-w1} ${len + 4} L${w1} ${len + 4} C${w1 + 1} ${len * .7} ${w0 + 2} ${len * .35} ${w0} -8 C${w0 * .5} -15 ${-w0 * .5} -15 ${-w0} -8 Z`, col)
    + (trim ? P(slit(arc([w0 - 3, -2], [w1 - 2, len - 2], -3, 10), 3.2, true), trim) : '');
  const ART = {
    skirtB: P('M-14 -2 L12 -2 L10 46 C2 50 -10 50 -18 44 Z', COL.black2) + P('M-18 38 L10 40 L10 46 C2 50 -10 50 -18 44 Z', COL.trim2),
    upperArmF: sleeve(66, 16, 12, COL.black2),
    foreArmF: sleeve(58, 11, 10, COL.black2) + P('M-12 40 L12 40 L13 60 L-13 60 Z', COL.trim2),
    handF: P(E(0, 12, 12, 12.5), COL.skin2) + P(slit([[-6, 6], [2, 4], [7, 9]], 3), '#b98a66'),
    thighF: P('M-18 -8 C-21 30 -17 62 -14 94 L14 94 C17 62 21 30 18 -8 Z', COL.pants2),
    shinF: P('M-14 -4 C-15 30 -12 58 -11 88 L11 88 C12 58 15 30 14 -4 Z', COL.pants2) + P('M-12 50 L12 50 L11 88 L-11 88 Z', COL.black2),
    footF: P('M-12 -26 L12 -26 L13 -4 C24 -4 36 0 40 8 L40 12 L-14 12 Z', COL.black2) + P('M-15 8 L41 8 L42 17 L-15 17 Z', COL.trim2),
    hips: P('M-22 -12 L22 -12 L20 18 L-20 18 Z', COL.pants),
    thighN: P('M-18 -8 C-21 30 -17 62 -14 94 L14 94 C17 62 21 30 18 -8 Z', COL.pants)
      + P(slit(arc([-8, 10], [-6, 80], 4, 8), 3), COL.pants2),
    shinN: P('M-14 -4 C-15 30 -12 58 -11 88 L11 88 C12 58 15 30 14 -4 Z', COL.pants)
      + P('M-12 50 L12 50 L11 88 L-11 88 Z', COL.black)
      + P(slit([[-13, 12], [13, 30]], 5, false) + ' ' + slit([[-13, 30], [13, 12]], 5, false), COL.black, { amp: .5 })
      + P(slit([[-12, 56], [12, 68]], 2.5, false) + ' ' + slit([[-12, 70], [12, 82]], 2.5, false), COL.trim, { amp: .4 }),
    footN: P('M-12 -26 L12 -26 L13 -4 C24 -4 36 0 40 8 L40 12 L-14 12 Z', COL.black) + P('M-15 8 L41 8 L42 17 L-15 17 Z', COL.trim)
      + P(slit(arc([16, -2], [34, 6], -2, 6), 2.4), COL.trim, { amp: .3 }),
    neck: P('M-10 6 L-11 -22 L12 -24 L13 6 Z', COL.skin2),
    chest: P('M-30 -142 C-10 -153 14 -153 28 -143 C40 -125 43 -96 38 -66 C34 -44 30 -24 27 -2 L-26 -2 C-31 -30 -37 -60 -37 -92 C-37 -116 -35 -134 -30 -142 Z', COL.black)
      // 交领 lapel + 团花 medallion (cream cut paper with an evenodd flower cut-out)
      + P(slit([[-8, -150], [8, -134], [22, -112], [33, -88], [36, -64]], 10, false), COL.trim, { amp: .5 })
      + P(slit([[18, -150], [22, -136], [26, -124]], 8, false), COL.trim, { amp: .5 })
      + P(E(2, -92, 17, 17) + ' ' + [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2 - Math.PI / 2; return E(2 + Math.cos(a) * 9, -92 + Math.sin(a) * 9, 4.2, 4.2); }).join(' ') + ' ' + E(2, -92, 3, 3), COL.trim, { rule: 'evenodd', amp: .35 })
      + P(slit(arc([-30, -130], [-32, -60], 6, 10), 3), COL.black2, { amp: .3 })
      // 大带 red sash with a gold knot
      + P('M-28 -26 L28 -28 L29 -10 L-27 -8 Z', COL.red) + P(E(28, -18, 8, 9), COL.gold) + P(slit([[-24, -18], [22, -19]], 2.4, false), COL.red2, { amp: .3 }),
    skirtN: P('M-16 -2 L16 -2 C18 18 17 36 14 52 C4 56 -8 56 -16 52 C-18 34 -18 16 -16 -2 Z', COL.black)
      + P('M-16 44 C-8 48 6 48 15 44 L14 52 C4 56 -8 56 -16 52 Z', COL.trim)
      + P(slit([[10, 0], [14, 26], [12, 50]], 7), COL.red) + P(E(12, 52, 4, 6), COL.red2),
    ribbon: P(slit([[0, 0], [-10, 20], [-18, 42], [-30, 62], [-36, 84]], 9), COL.black) + P(slit([[4, 2], [-2, 26], [-4, 48], [-12, 70]], 7), COL.red, { seed: 3 }),
    head: // hair bun at the back, ear, face (profile), 揉红, brows, eye, mouth; 罗帽 with trim band, 英雄结 and red 绒球
      P('M-30 -60 C-40 -52 -40 -34 -26 -26 C-18 -30 -16 -50 -22 -62 Z', COL.black)
      + P('M-16 -20 C-22 -40 -22 -70 -4 -82 C14 -92 34 -86 38 -68 L40 -58 C42 -54 46 -50 48 -45 C46 -42 44 -41 42 -40 C43 -36 42 -33 40 -30 C40 -24 36 -16 26 -12 C14 -8 0 -10 -10 -16 Z', COL.skin)
      + P(E(-8, -48, 7, 10, -8), COL.skin2) + P(slit(arc([-9, -54], [-8, -42], 3, 5), 2), '#c48f6b', { amp: .2 })
      + P(E(20, -54, 18, 11, -10), COL.rouge, { op: .78, amp: .5 })
      + P(slit([[36, -64], [24, -66], [12, -70], [2, -75]], 7.5), COL.black, { amp: .4 })
      + `<g class="ws-eye-open">${P('M31 -53 C26 -58 16 -59 8 -57 C14 -52 24 -50 31 -53 Z', '#fbf6ea', { amp: .2 })}${P(E(21, -55, 3.6, 3.8), COL.black, { amp: .15, cls: 'ws-pupil' })}${P(slit([[32, -54], [22, -59], [12, -60], [3, -64]], 3.2), COL.black, { amp: .2 })}</g>`
      + `<g class="ws-eye-shut" opacity="0">${P(slit(arc([31, -54], [5, -58], 3, 8), 3), COL.black, { amp: .2 })}</g>`
      + P(slit([[42, -44], [38, -43]], 2.2), '#9a5a44', { amp: .15 })
      + `<g class="ws-mouth">${P(slit([[40, -32], [34, -31], [30, -32]], 3.4), COL.red, { amp: .2 })}</g>`
      + `<g class="ws-shout" opacity="0">${P('M41 -34 C38 -30 36 -22 31 -21 C29 -26 30 -32 33 -35 Z', COL.red2, { amp: .3 })}</g>`
      // 罗帽 (soft black cap) + cream brim band + back flap
      + P('M42 -66 C44 -90 28 -110 2 -110 C-22 -110 -38 -94 -36 -70 C-35 -60 -32 -52 -28 -46 L-34 -44 C-42 -54 -46 -66 -44 -76 C-42 -86 -40 -90 -36 -96 C-40 -80 -38 -70 -34 -64 Z', COL.black)
      + P(slit([[42, -66], [20, -71], [-4, -72], [-30, -68]], 7, false), COL.trim, { amp: .4 })
      + P(E(26, -70, 2.4, 2.4) + ' ' + E(10, -72, 2.4, 2.4) + ' ' + E(-6, -72, 2.4, 2.4) + ' ' + E(-20, -71, 2.4, 2.4), COL.red, { amp: .15 })
      + P(slit(arc([-12, -106], [16, -92], 6, 8), 3.2) + ' ' + slit(arc([-26, -96], [-8, -84], 5, 8), 3), COL.trim, { amp: .3 })
      // 英雄结 at the temple + 绒球 on top
      + P('M-30 -84 C-44 -96 -52 -84 -40 -76 C-50 -70 -44 -58 -32 -70 Z', COL.black) + P(E(-32, -76, 5, 5), COL.red)
      + P(E(24, -110, 12, 11), COL.red) + P(E(24, -110, 5, 4.5), COL.red2) + P(slit([[16, -118], [30, -103]], 2.2) + ' ' + slit([[16, -103], [31, -117]], 2.2), '#e05b44', { amp: .2 }),
    staffBody: `<g class="ws-staff-whole">${P('M-5.5 -116 L5.5 -116 L6 214 L-6 214 Z', COL.wood, { step: 8, amp: .5 })}${[-100, -40, 30, 100, 170].map(y => P(`M-6 ${y} L6 ${y} L6 ${y + 14} L-6 ${y + 14} Z`, COL.wood2, { amp: .35 })).join('')}${P('M-6 -116 L6 -116 L6 -104 L-6 -104 Z', COL.woodEnd, { amp: .3 })}${P('M-6.5 200 L6.5 200 L6.5 214 L-6.5 214 Z', COL.woodEnd, { amp: .3 })}</g>`
      + `<g class="ws-staff-stub" opacity="0">${P('M-5.5 -116 L5.5 -116 L5.8 46 L1 40 L-2 52 L-6 44 Z', COL.wood, { step: 8, amp: .5 })}${[-100, -40, 30].map(y => P(`M-6 ${y} L6 ${y} L6 ${y + 14} L-6 ${y + 14} Z`, COL.wood2, { amp: .35 })).join('')}${P('M-6 -116 L6 -116 L6 -104 L-6 -104 Z', COL.woodEnd, { amp: .3 })}</g>`,
    bowl: `<g class="ws-bowl">${P('M-25 -8 L25 -8 C23 9 13 17 0 17 C-13 17 -23 9 -25 -8 Z', '#6e4326')}${P('M-25 -8 L25 -8 L24 -3 L-24 -3 Z', '#efe4c8', { amp: .3 })}${P(slit(arc([-14, 5], [14, 5], 3, 6), 2.6), '#b5342a', { amp: .2 })}</g>`,
    upperArmN: sleeve(66, 16, 12, COL.black, COL.trim) + P(slit(arc([-10, 4], [10, 4], -5, 6), 3.4), COL.trim, { amp: .3 }),
    foreArmN: sleeve(58, 11, 10, COL.black) + P('M-12 40 L12 40 L14 60 L-14 60 Z', COL.trim) + P(slit([[-12, 46], [13, 46]], 2, false), COL.black, { amp: .2 }),
    handN: P(E(0, 12, 12.5, 13), COL.skin) + P(slit([[-7, 6], [2, 4], [8, 10]], 3.2), COL.skin2, { amp: .2 }) + P(slit([[-9, 14], [8, 16]], 1.8, false), COL.skin2, { amp: .2 }),
  };
  // paint order: back flap · far arm · far leg · pelvis · near leg · neck · tunic · front flap · ribbons · head · staff · bowl · near arm
  const PIECES = [
    ['skirtB', 'skirtB', 0], ['upperArmF', 'upperArmF', 10], ['foreArmF', 'foreArmF', 11], ['handF', 'handF', 12],
    ['thighF', 'thighF', 20], ['shinF', 'shinF', 21], ['footF', 'footF', 22], ['hips', 'hips', 30],
    ['thighN', 'thighN', 32], ['shinN', 'shinN', 33], ['footN', 'footN', 34], ['head', 'neck', 38], ['chest', 'chest', 40], ['skirtN', 'skirtN', 41],
    ['ribbon', 'ribbon', 44], ['head', 'head', 50], ['staffBody', 'staffBody', 55], ['bowl', 'bowl', 56],
    ['upperArmN', 'upperArmN', 60], ['foreArmN', 'foreArmN', 61], ['handN', 'handN', 62],
  ].map(([bone, art, z]) => ({ bone, z, svg: ART[art], cls: 'ws-' + art }));

  /* ---------------- clips (pure functions of clip time) ---------------- */
  const base = { staffW: 0, grip: 0, twoHand: 0, footW: 0, look: 0 };
  WSR.CLIPS = {
    // standing, staff planted beside the front foot
    idle: t => ({ ...base, 'root.y': S(t * 2) * 1.2, chest: -1 + S(t * 2) * .8, head: S(t * 1.1) * 1.5,
      upperArmN: -12, foreArmN: -28, upperArmF: 10, foreArmF: -22, thighN: -7, shinN: 7, thighF: 6, shinF: 3, staffW: -4, grip: 30 }),
    // walk cycle, staff over the shoulder (hand in front, long end back over the shoulder)
    walk: t => {
      const ph = t * PI * 2 * .95, s = S(ph), c = C(ph);
      return { ...base, 'root.y': 5 * Math.abs(s) - 3, chest: 4 + S(ph * 2) * 1, head: -3 - S(ph * 2) * 1.2,
        thighN: -26 * s, thighF: 26 * s, shinN: 6 + 40 * Math.max(0, c), shinF: 6 + 40 * Math.max(0, -c),
        upperArmN: -38 + 2 * s, foreArmN: -122, upperArmF: -20 * s + 4, foreArmF: -26 + 8 * s,
        staffW: 104 + 2 * s, grip: 95, footW: 0 };
    },
    // raise a bowl to the lips (period 1.6 s); the far hand rests on the hip
    drink: t => {
      const u = ((t % 1.6) + 1.6) % 1.6 / 1.6, up = sm(u / .3) * (1 - sm((u - .78) / .22)), gulp = sm((u - .28) / .2) * (1 - sm((u - .72) / .2));
      return { ...base, 'root.y': S(t * 2) * 1, chest: -2 - 5 * gulp, head: -4 - 16 * gulp, upperArmF: 34, foreArmF: -104,
        thighN: -8, shinN: 8, thighF: 6, shinF: 3, 'armN.tx': 58 - 12 * up + 6 * gulp, 'armN.ty': -40 - 132 * up - 6 * gulp, 'armN.w': 1, bowlTilt: 45 * gulp, energy: up };
    },
    // on guard: wide stance, staff levelled at the enemy in both hands
    guard: t => ({ ...base, 'root.y': 14 + S(t * 3) * 1.5, chest: 6 + S(t * 2.1) * 1.5, head: -6,
      thighN: -30, shinN: 36, thighF: 30, shinF: 6, upperArmN: -52, foreArmN: -40, staffW: -62 + S(t * 2.3) * 3, grip: 10, twoHand: 1 }),
    // startled: leap back, lean away, staff raised crosswise
    startle: t => ({ ...base, 'root.y': -2, chest: -16, head: -12 + S(t * 9) * 2,
      thighN: -24, shinN: 26, thighF: 20, shinF: 18, upperArmN: -120, foreArmN: -50, staffW: -110, grip: 20, twoHand: 1, look: 1 }),
    // dodge (lean back and aside)
    dodge: t => ({ ...base, 'root.y': 10, chest: -24, head: -10,
      thighN: -34, shinN: 30, thighF: 28, shinF: 24, upperArmN: -96, foreArmN: -52, upperArmF: -60, foreArmF: -40, staffW: -100, grip: 10, look: 1 }),
    // duck: crouch low, head up, staff held flat over the back (for the pounce passing overhead)
    duck: t => ({ ...base, 'root.y': 62, 'root.rot': 18, chest: 22, head: -34,
      thighN: -88, shinN: 112, thighF: -58, shinF: 100, upperArmN: -70, foreArmN: -30, upperArmF: -40, foreArmF: -30, staffW: -94, grip: 20, footW: 0, look: 1 }),
    // jump tuck (legs pulled up, for the tail sweep passing under)
    jump: t => ({ ...base, 'root.y': 0, chest: 10, head: -14,
      thighN: -78, shinN: 104, thighF: -46, shinF: 96, upperArmN: -150, foreArmN: -30, upperArmF: -130, foreArmF: -30, staffW: 160, grip: 20, footW: 12 }),
    // overhead staff swing; clip time 0 = wind-up, .45 = impact, then follow through
    swing: t => {
      const a = sm(t / .45), b = sm((t - .45) / .3);
      return { ...base, 'root.y': 8 + 10 * a, chest: -14 + 34 * a, head: -10 + 18 * a,
        thighN: -34 - 8 * a, shinN: 30 + 10 * a, thighF: 26 + 8 * a, shinF: 8,
        upperArmN: 170 - 212 * a - 18 * b, foreArmN: -20 + 4 * a, staffW: 150 + 132 * a + 18 * b, grip: 70, twoHand: 1 };
    },
    // punch cycle for the ride: body rocks with the fist (the fist itself is IK-driven by the scene)
    punch: t => {
      const ph = ((t % .42) + .42) % .42 / .42, hit = Math.exp(-Math.pow((ph - .55) / .12, 2));
      return { ...base, 'root.y': 4 * hit, chest: 26 + 10 * hit, head: 10 + 6 * hit,
        thighN: -62, shinN: 84, thighF: -40, shinF: 70, upperArmN: 150, foreArmN: -40, upperArmF: -60, foreArmF: -20, footW: 20, energy: hit };
    },
    // seated astride the tiger's shoulders (both legs hang down its flanks)
    ride: t => ({ ...base, 'root.y': S(t * 5) * 1.5, chest: 24, head: 10, thighN: -74, shinN: 70, thighF: -60, shinF: 64,
      upperArmN: -40, foreArmN: -60, upperArmF: -70, foreArmF: -30, footW: 25 }),
    // throw (the broken stub flies back over the shoulder)
    throw: t => ({ ...base, chest: -8, head: -6, thighN: -24, shinN: 20, thighF: 20, shinF: 10, upperArmN: 150, foreArmN: -20, upperArmF: -30, foreArmF: -40 }),
    // looking up at the notice
    read: t => ({ ...base, 'root.y': S(t * 1.6) * 1, chest: -4, head: -16 + S(t * .9) * 2, upperArmN: -20, foreArmN: -40, upperArmF: 20, foreArmF: -70,
      thighN: -4, shinN: 4, thighF: 4, shinF: 2, staffW: -8, grip: 30, look: -1 }),
    // 亮相: victory pose — fist raised, far hand on the hip, chin up
    victory: t => ({ ...base, 'root.y': 3 + S(t * 1.6) * 1, chest: -6, head: -12 + S(t * 1.2) * 1,
      thighN: -30, shinN: 16, thighF: 24, shinF: 6, upperArmN: -100, foreArmN: -70, upperArmF: 36, foreArmF: -104, footW: 0 }),
    // panting after the fight
    pant: t => ({ ...base, 'root.y': 6 + S(t * 6) * 2.5, chest: 12 + S(t * 6) * 3, head: 8 + S(t * 6) * 2,
      thighN: -24, shinN: 26, thighF: 18, shinF: 14, upperArmN: -10, foreArmN: -20, upperArmF: 10, foreArmF: -20 }),
  };

  WSR.wusong = function (parent, o = {}) {
    const ch = WS.char(parent, { cls: 'wusong ' + (o.cls || ''), filter: o.filter, bones: WSR.BONES, pieces: PIECES, clips: { ...WSR.CLIPS, ...(o.clips || {}) }, ik: WSR.IK, defaults: { ...base } });
    const { rig } = ch;
    const E_ = { eyeO: ch.q('.ws-eye-open'), eyeS: ch.q('.ws-eye-shut'), pupil: ch.q('.ws-pupil'), mouth: ch.q('.ws-mouth'), shout: ch.q('.ws-shout'),
      whole: ch.q('.ws-staff-whole'), stub: ch.q('.ws-staff-stub'), staffG: ch.q('.ws-staffBody'), bowlG: ch.q('.ws-bowl'), farArm: ch.qa('.ws-upperArmF,.ws-foreArmF,.ws-handF'), farLeg: ch.qa('.ws-thighF,.ws-shinF,.ws-footF') };
    const api = {
      ...ch, play: (track, opts) => rig.play(track, opts),
      // final pose incl. procedural bones: staff world angle, grip slide, level feet, skirt flaps, ribbons, far-hand staff grip
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
        p.ribbon = -26 + 8 * S(t * 3.1 + 1) + (st.wind || 0) * (26 + 10 * S(t * 9));
        if (p.twoHand > .001 && st.staff !== 0) {
          const tgt = rig.point('staffBody', 0, -(p.grip || 0) + (p.twoGrip != null ? p.twoGrip : 46), p, root);
          p = rig.solveIK('armF', tgt, p, root, { weight: Math.min(1, p.twoHand) });
        }
        if (st.post) st.post(p, t);
        return p;
      },
      point(bone, x, y, t, player, root, st) { return rig.point(bone, x, y, api.pose(t, player, root, st), root); },
      // st: {opacity, staff 0/1, stub (broken staff), bowl, blink offset, face: 'shout' | 'shut', wind, farArm, farLeg, edit, post}
      render(t, player, root, st = {}) {
        WS.setOp(ch.g, st.opacity == null ? 1 : st.opacity);
        if (st.opacity != null && st.opacity <= .001) return null;
        const p = api.pose(t, player, root, st);
        ch.apply(p, root);
        const bl = st.face === 'shut' ? 1 : vk.rig.blink(t, { period: 3.7, dur: .16, offset: st.blinkOffset || 0 });
        WS.setOp(E_.eyeO, 1 - bl); WS.setOp(E_.eyeS, bl);
        const look = p.look || 0;
        E_.pupil.setAttribute('transform', `translate(${f2(look > 0 ? 3 * look : 2 * look)} ${f2(look < 0 ? 1.5 * look : -.5 * look)})`);
        const sh = st.face === 'shout' ? 1 : 0; WS.setOp(E_.shout, sh); WS.setOp(E_.mouth, 1 - sh);
        WS.setOp(E_.staffG, st.staff == null ? 1 : st.staff);
        WS.setOp(E_.whole, st.stub ? 0 : 1); WS.setOp(E_.stub, st.stub ? 1 : 0);
        WS.setOp(E_.bowlG, st.bowl || 0);
        E_.farArm.forEach(e => WS.setOp(e, st.farArm == null ? 1 : st.farArm));
        E_.farLeg.forEach(e => WS.setOp(e, st.farLeg == null ? 1 : st.farLeg));
        return p;
      },
    };
    return api;
  };
})();
