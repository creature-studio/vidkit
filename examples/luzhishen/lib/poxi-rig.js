// 泼皮 (the garden rogues) — a lighter paper-cut rig on vk.rig, same conventions as luzhishen-rig.js:
// profile facing +x, origin = waist, soles at y ≈ +172, limbs drawn hanging along +y (positive angle = backwards).
//   const px = PXR.poxi(g, { coat: '#6a7f5a', scarf: '#9c4a34' });
//   const act = px.play([{ at: 0, clip: 'sneak' }, { at: 2, clip: 'kneel', blend: .3 }]);
//   sc.on(l => px.render(l, act, { x, y, scale: .46, flip: -1 }, { jar: 1, face: 'shout' }));
// Channels: look, footW, energy, jarTilt.
(function () {
  const PXR = window.PXR = window.PXR || {};
  const { P, E, slit, arc } = WS;
  const S = Math.sin, C = Math.cos;
  const f2 = x => Math.round(x * 100) / 100;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };

  const DEF = { coat: '#6d7d58', coat2: '#586848', trim: '#e2d6b4', pants: '#cfc2a0', pants2: '#b3a686',
    scarf: '#9c4633', skin: '#eec8a0', skin2: '#d8a57e', skin3: '#bd8560', hair: '#241f22', red: '#b5342a', jar: '#7a4a2a' };
  PXR.PALETTES = [
    { coat: '#6d7d58', scarf: '#9c4633' },
    { coat: '#7a6a52', scarf: '#4a6070', pants: '#ded2b2' },
    { coat: '#5d6b74', scarf: '#8a6a2c' },
    { coat: '#7d5c52', scarf: '#5b6b46' },
  ];

  PXR.BONES = [
    { id: 'hips' },
    { id: 'chest', parent: 'hips', x: 0, y: -4 },
    { id: 'head', parent: 'chest', x: 5, y: -120, s: 1.05 },
    { id: 'upperArmN', parent: 'chest', x: 2, y: -108 }, { id: 'foreArmN', parent: 'upperArmN', y: 54 }, { id: 'handN', parent: 'foreArmN', y: 48 },
    { id: 'upperArmF', parent: 'chest', x: -5, y: -106 }, { id: 'foreArmF', parent: 'upperArmF', y: 54 }, { id: 'handF', parent: 'foreArmF', y: 48 },
    { id: 'prop', parent: 'handN', x: 0, y: 12 },
    { id: 'thighN', parent: 'hips', x: -2, y: 6 }, { id: 'shinN', parent: 'thighN', y: 78 }, { id: 'footN', parent: 'shinN', y: 74 },
    { id: 'thighF', parent: 'hips', x: 5, y: 5 }, { id: 'shinF', parent: 'thighF', y: 78 }, { id: 'footF', parent: 'shinF', y: 74 },
    { id: 'skirtN', parent: 'hips', x: 7, y: -8 }, { id: 'skirtB', parent: 'hips', x: -10, y: -8 },
  ];
  PXR.IK = {
    armN: { chain: ['upperArmN', 'foreArmN', 'handN'], bend: -1 },
    armF: { chain: ['upperArmF', 'foreArmF', 'handF'], bend: -1 },
    legN: { chain: ['thighN', 'shinN', 'footN'], bend: 1 },
    legF: { chain: ['thighF', 'shinF', 'footF'], bend: 1 },
  };
  PXR.SOLE = 172;

  const artFor = (c) => {
    const sleeve = (len, w0, w1, col) => P(`M${-w0} -8 C${-w0 - 2} ${len * .35} ${-w1 - 1} ${len * .7} ${-w1} ${len + 4} L${w1} ${len + 4} C${w1 + 1} ${len * .7} ${w0 + 2} ${len * .35} ${w0} -8 C${w0 * .5} -14 ${-w0 * .5} -14 ${-w0} -8 Z`, col);
    return {
      skirtB: P('M-12 -2 L10 -2 L9 34 C1 38 -9 38 -15 33 Z', c.coat2),
      upperArmF: sleeve(54, 13, 10, c.coat2),
      foreArmF: sleeve(48, 9, 8, c.coat2),
      handF: P(E(0, 10, 9.5, 10), c.skin2) + P(slit([[-5, 5], [1, 3], [6, 8]], 2.4), c.skin3, { amp: .2 }),
      thighF: P('M-14 -6 C-16 26 -13 52 -11 80 L11 80 C13 52 16 26 14 -6 Z', c.pants2),
      shinF: P('M-11 -4 C-12 24 -10 48 -9 76 L9 76 C10 48 12 24 11 -4 Z', c.skin2),
      footF: P('M-9 -20 L9 -20 L10 -4 C19 -4 27 0 30 7 L30 11 L-11 11 Z', '#6b5a48', { amp: .5 }),
      hips: P('M-18 -10 L18 -10 L16 16 L-16 16 Z', c.pants),
      thighN: P('M-14 -6 C-16 26 -13 52 -11 80 L11 80 C13 52 16 26 14 -6 Z', c.pants),
      shinN: P('M-11 -4 C-12 24 -10 48 -9 76 L9 76 C10 48 12 24 11 -4 Z', c.skin),
      footN: P('M-9 -20 L9 -20 L10 -4 C19 -4 27 0 30 7 L30 11 L-11 11 Z', '#7a6752', { amp: .5 })
        + P(slit(arc([10, -2], [26, 4], -2, 5), 2), c.trim, { amp: .3 }),
      neck: P('M-8 6 L-9 -16 L9 -18 L10 6 Z', c.skin2),
      // 短褐 (short jacket) with an open collar, a cloth belt and a bare, skinny frame
      chest: P('M-24 -118 C-8 -128 12 -128 24 -118 C33 -100 36 -70 32 -44 C30 -26 26 -14 24 -2 L-22 -2 C-27 -26 -31 -52 -31 -78 C-31 -98 -28 -112 -24 -118 Z', c.coat)
        + P(slit([[-6, -124], [6, -110], [16, -92], [24, -72]], 8, false), c.trim, { amp: .5 })
        + P(slit([[14, -124], [18, -112]], 6, false), c.trim, { amp: .5 })
        + P('M-24 -22 L28 -24 L29 -8 L-23 -6 Z', c.scarf, { amp: .45 })
        + P(slit(arc([-24, -104], [-27, -48], 5, 8), 2.6), c.coat2, { amp: .3 }),
      skirtN: P('M-13 -2 L14 -2 C16 14 15 28 13 40 C4 44 -7 44 -13 40 C-15 26 -15 12 -13 -2 Z', c.coat)
        + P(slit([[9, 0], [12, 20], [10, 38]], 5), c.coat2, { amp: .35 }),
      head: // ear · face (profile) · hair · 包巾 headscarf knotted at the back · brows / eye / mouth
        P('M-24 -46 C-32 -40 -32 -26 -21 -20 C-15 -23 -13 -38 -18 -48 Z', c.skin2)
        + P('M-14 -18 C-25 -35 -24 -66 -6 -78 C13 -89 35 -79 38 -58 L40 -47 C42 -44 45 -39 47 -35 C45 -32 43 -31 41 -30 C42 -27 41 -24 39 -23 C39 -16 33 -9 22 -6 C10 -3 -5 -7 -12 -13 Z', c.skin)
        + P('M-22 -56 C-22 -80 -2 -92 16 -88 C30 -85 38 -74 38 -62 C30 -72 12 -78 -4 -72 C-14 -68 -20 -62 -22 -56 Z', c.hair, { amp: .5 })
        + P(E(-14, -38, 6, 8.5, -8), c.skin2)
        + P(slit([[36, -52], [24, -55], [12, -58]], 5.5), c.hair, { amp: .4 })
        + `<g class="px-eye-open">${P('M31 -42 C26 -47 17 -48 10 -46 C16 -41 25 -39 31 -42 Z', '#fbf6ea', { amp: .2 })}${P(E(22, -44, 3.1, 3.3), c.hair, { amp: .15, cls: 'px-pupil' })}</g>`
        + `<g class="px-eye-shut" opacity="0">${P(slit(arc([31, -43], [9, -46], 2.6, 8), 2.6), c.hair, { amp: .2 })}</g>`
        + `<g class="px-mouth">${P(slit([[40, -18], [33, -17], [28, -18]], 3), c.red, { amp: .2 })}</g>`
        + `<g class="px-shout" opacity="0">${P('M41 -21 C38 -16 36 -8 31 -7 C29 -12 30 -18 33 -21 Z', '#8f231f', { amp: .3 })}</g>`
        // 包巾: a cloth wound round the head with the knot and two tails at the back
        + P('M-24 -60 C-22 -84 2 -96 22 -90 C36 -86 42 -74 40 -62 C34 -66 26 -70 14 -70 C-2 -70 -16 -66 -24 -60 Z', c.scarf, { amp: .5 })
        + P(slit([[-24, -62], [0, -70], [22, -70], [40, -63]], 6, false), c.trim, { op: .55, amp: .4 })
        + P('M-22 -72 C-34 -82 -42 -70 -32 -64 C-40 -58 -34 -48 -24 -60 Z', c.scarf, { amp: .5 })
        + P(slit([[-30, -66], [-42, -50], [-46, -34]], 6) + ' ' + slit([[-28, -70], [-40, -60], [-50, -52]], 5), c.scarf, { amp: .45 }),
      // 酒坛 / wine jar carried in the near hand
      prop: `<g class="px-jar">${P('M-16 -2 C-22 6 -24 30 -16 40 C-6 48 8 48 18 40 C26 30 24 6 18 -2 Z', c.jar, { step: 6 })}${P('M-12 -10 L14 -10 L16 0 L-14 0 Z', '#4a2c18', { amp: .4 })}${P(slit(arc([-14, 16], [16, 16], 4, 7), 4), '#e2d6b4', { amp: .3 })}</g>`,
      upperArmN: sleeve(54, 13, 10, c.coat),
      foreArmN: sleeve(48, 9, 8, c.coat),
      handN: P(E(0, 10, 10, 10.5), c.skin) + P(slit([[-5, 5], [1, 3], [6, 8]], 2.6), c.skin2, { amp: .2 }),
    };
  };

  const base = { look: 0, footW: 0 };
  PXR.CLIPS = {
    idle: t => ({ ...base, 'root.y': S(t * 2.1) * 1.2, chest: -1 + S(t * 2.1) * .8, head: S(t * 1.3) * 1.6,
      upperArmN: -10, foreArmN: -22, upperArmF: 10, foreArmF: -20, thighN: -6, shinN: 6, thighF: 5, shinF: 3 }),
    walk: t => { const ph = t * Math.PI * 2 * 1.05, s = S(ph), c = C(ph);
      return { ...base, 'root.y': 5 * Math.abs(s) - 3, chest: 4, head: -3 - S(ph * 2) * 1.2,
        thighN: -28 * s, thighF: 28 * s, shinN: 6 + 42 * Math.max(0, c), shinF: 6 + 42 * Math.max(0, -c),
        upperArmN: 22 * s, foreArmN: -24, upperArmF: -22 * s, foreArmF: -24 }; },
    // creeping up on tiptoe, hands out in front
    sneak: t => { const ph = t * Math.PI * 2 * .75, s = S(ph), c = C(ph);
      return { ...base, 'root.y': 30 + 4 * Math.abs(s), 'root.rot': 9, chest: 20, head: -22, look: 1,
        thighN: -46 - 24 * s, thighF: -10 + 26 * s, shinN: 52 + 24 * Math.max(0, c), shinF: 36 + 24 * Math.max(0, -c), footW: -14,
        upperArmN: -74 + 6 * s, foreArmN: -34, upperArmF: -58 - 6 * s, foreArmF: -40 }; },
    // lunging low for the monk's ankle
    grab: t => { const a = sm(t / .3);
      return { ...base, 'root.y': 44 + 18 * a, 'root.rot': 16 + 10 * a, chest: 26, head: -28, look: 1,
        thighN: -70 - 20 * a, shinN: 86, thighF: -30 + 40 * a, shinF: 70 - 30 * a, footW: -10,
        upperArmN: -104 - 24 * a, foreArmN: -20, upperArmF: -92 - 20 * a, foreArmF: -24 }; },
    // kicked off his feet: tucked, arms flailing (the scene spins the root)
    tumble: t => ({ ...base, 'root.y': 10, chest: -18, head: -14 + S(t * 16) * 4,
      thighN: -96 + S(t * 13) * 12, shinN: 96, thighF: -70 + S(t * 13 + 2) * 12, shinF: 84,
      upperArmN: -150 + S(t * 15) * 22, foreArmN: -26, upperArmF: -140 + S(t * 15 + 1.7) * 22, foreArmF: -30, footW: 20 }),
    // sitting in the muck, dazed
    sit: t => ({ ...base, 'root.y': 92, 'root.rot': -6, chest: -10 + S(t * 2.6) * 2, head: 6 + S(t * 2.6) * 3,
      thighN: -96, shinN: 74, thighF: -84, shinF: 66, upperArmN: 54, foreArmN: -30, upperArmF: 62, foreArmF: -34, footW: 30 }),
    // 拜倒: on both knees, forehead to the ground (period 1.6 s)
    kneel: t => { const u = ((t % 1.6) + 1.6) % 1.6 / 1.6, bow = sm(u / .28) * (1 - sm((u - .62) / .3));
      return { ...base, 'root.y': 86 + 10 * bow, 'root.rot': 8 + 26 * bow, chest: 18 + 26 * bow, head: -14 - 12 * bow,
        thighN: -108, shinN: 104, thighF: -104, shinF: 100, footW: 40,
        upperArmN: -34 - 62 * bow, foreArmN: -40 + 20 * bow, upperArmF: -30 - 58 * bow, foreArmF: -42 + 20 * bow, energy: bow }; },
    // both arms thrown up, cheering
    cheer: t => ({ ...base, 'root.y': -4 + Math.abs(S(t * 4.4)) * 8, chest: -10, head: -14,
      thighN: -14, shinN: 12, thighF: 12, shinF: 8, upperArmN: -156 + S(t * 8) * 6, foreArmN: -14, upperArmF: -150 - S(t * 8) * 6, foreArmF: -16 }),
    // pointing up at the crows
    point: t => ({ ...base, 'root.y': S(t * 2) * 1, chest: -8, head: -26, look: -1,
      thighN: -12, shinN: 10, thighF: 10, shinF: 5, upperArmN: -128 + S(t * 3) * 3, foreArmN: -10, upperArmF: 16, foreArmF: -28 }),
    // staggering back in awe
    awe: t => ({ ...base, 'root.y': 10 + S(t * 2.6) * 1.6, 'root.rot': -13, chest: -24, head: -16 + S(t * 3) * 2, look: 1,
      thighN: -40, shinN: 46, thighF: 34, shinF: 30, footW: -6,
      upperArmN: -78 + S(t * 3.4) * 3, foreArmN: -96, upperArmF: -66, foreArmF: -92 }),
    // carrying the wine jar in both hands
    carry: t => { const ph = t * Math.PI * 2 * .95, s = S(ph), c = C(ph);
      return { ...base, 'root.y': 4 * Math.abs(s) - 2, chest: 8, head: -6,
        thighN: -26 * s, thighF: 26 * s, shinN: 6 + 38 * Math.max(0, c), shinF: 6 + 38 * Math.max(0, -c),
        upperArmN: -58, foreArmN: -62, upperArmF: -52, foreArmF: -64 }; },
    // pouring / offering with one hand
    offer: t => ({ ...base, 'root.y': S(t * 2) * 1, chest: 10, head: -4,
      thighN: -12, shinN: 12, thighF: 10, shinF: 6, upperArmN: -92 + S(t * 2.4) * 3, foreArmN: -46, upperArmF: 18, foreArmF: -34 }),
  };

  PXR.poxi = function (parent, o = {}) {
    const c = { ...DEF, ...(o.palette || o) };
    const ART = artFor(c);
    const PIECES = [
      ['skirtB', 'skirtB', 0], ['upperArmF', 'upperArmF', 10], ['foreArmF', 'foreArmF', 11], ['handF', 'handF', 12],
      ['thighF', 'thighF', 20], ['shinF', 'shinF', 21], ['footF', 'footF', 22], ['hips', 'hips', 30],
      ['thighN', 'thighN', 32], ['shinN', 'shinN', 33], ['footN', 'footN', 34], ['head', 'neck', 38], ['chest', 'chest', 40], ['skirtN', 'skirtN', 41],
      ['head', 'head', 50], ['prop', 'prop', 55],
      ['upperArmN', 'upperArmN', 60], ['foreArmN', 'foreArmN', 61], ['handN', 'handN', 62],
    ].map(([bone, art, z]) => ({ bone, z, svg: ART[art], cls: 'px-' + art }));
    const ch = WS.char(parent, { cls: 'poxi ' + (o.cls || ''), filter: o.filter, bones: PXR.BONES, pieces: PIECES, clips: { ...PXR.CLIPS, ...(o.clips || {}) }, ik: PXR.IK, defaults: { ...base } });
    const { rig } = ch;
    const E_ = { eyeO: ch.q('.px-eye-open'), eyeS: ch.q('.px-eye-shut'), pupil: ch.q('.px-pupil'), mouth: ch.q('.px-mouth'), shout: ch.q('.px-shout'), jar: ch.q('.px-jar') };
    const api = {
      ...ch, play: (track, opts) => rig.play(track, opts),
      pose(t, player, root, st = {}) {
        let p = player.pose(t, root, st.edit ? (q => st.edit(q, t)) : undefined);
        p = { ...p };
        const fw = p.footW || 0;
        p.footN = (p.footN || 0) + fw - ch.worldRot('footN', { ...p, footN: 0 });
        p.footF = (p.footF || 0) + fw - ch.worldRot('footF', { ...p, footF: 0 });
        p.prop = -ch.worldRot('handN', p) + (p.jarTilt || 0);
        p.skirtN = .5 * Math.min(0, p.thighN || 0) + .2 * Math.max(0, p.thighN || 0);
        p.skirtB = .45 * Math.max(0, p.thighF || 0) + .22 * Math.min(0, p.thighF || 0);
        if (st.post) st.post(p, t);
        return p;
      },
      point(bone, x, y, t, player, root, st) { return rig.point(bone, x, y, api.pose(t, player, root, st), root); },
      // st: {opacity, jar 0/1, face: 'shout'|'shut', blinkOffset, edit, post}
      render(t, player, root, st = {}) {
        WS.setOp(ch.g, st.opacity == null ? 1 : st.opacity);
        if (st.opacity != null && st.opacity <= .001) return null;
        const p = api.pose(t, player, root, st);
        ch.apply(p, root);
        const bl = st.face === 'shut' ? 1 : vk.rig.blink(t, { period: 3.3, dur: .15, offset: st.blinkOffset || 0 });
        WS.setOp(E_.eyeO, 1 - bl); WS.setOp(E_.eyeS, bl);
        const look = p.look || 0;
        E_.pupil.setAttribute('transform', `translate(${f2(look > 0 ? 2.6 * look : 2 * look)} ${f2(look < 0 ? 2 * look : -.5 * look)})`);
        const sh = st.face === 'shout' ? 1 : 0; WS.setOp(E_.shout, sh); WS.setOp(E_.mouth, 1 - sh);
        WS.setOp(E_.jar, st.jar || 0);
        return p;
      },
    };
    return api;
  };
})();
