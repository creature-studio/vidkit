// fox-rig.js — 绘本狐狸（侧面视角）的骨骼角色
//
//   const fox = FOX.fox(parent, { scale: 1 });
//   const act = fox.play([{ at: 0, clip: 'walk' }, { at: 2.4, clip: 'lookUp', blend: .35 }]);
//   sc.on(l => fox.render(l, act, { x: 400, y: gy(400), scale: 1.1, flip: 1 }, { mouth: 'open', eye: 'wide' }));
//
// 单位：root 在两只后脚之间的地面上，肩高约 96、体长约 170（scale=1）。FOX.SHOULDER / FOX.NOSE 给出常用锚点。
// 通道（clip 里可以给的非骨骼键）：mouth（0 闭 1 张）、tongue（0..1 舌头伸出）、ear（耳朵前后）、
// brow（0 平 1 皱）、energy（动作幅度，影响尾巴抖动）。
// 姿态之外的表情/道具由 render(t, act, root, st) 的 st 控制：{opacity, mouth, eye, tongue, blink, sweat, breath, edit}
(function () {
  const FOX = window.FOX = window.FOX || {};
  const S = Math.sin, C = Math.cos;
  const P = (...a) => SB.P(...a), E = (...a) => SB.E(...a);
  const CO = SB.COL;
  const f1 = x => Math.round(x * 10) / 10;
  const sm = SB.sm, clamp = SB.clamp;

  const FUR = CO.fur, FUR_F = '#CE7433', FUR_D = CO.fur2, CREAM = CO.belly, SOCK = '#6B4A34', INK = CO.ink;

  FOX.SHOULDER = [34, -92];    // 肩（骨骼 root 局部坐标，近似）
  FOX.NOSE = [96, -104];       // 站立时鼻尖大致位置
  FOX.BONES = [
    { id: 'body', x: 0, y: -78 },
    { id: 'hip', parent: 'body', x: -40, y: 2 },
    { id: 'chest', parent: 'body', x: 34, y: -6 },
    { id: 'neck', parent: 'chest', x: 22, y: -12 },
    { id: 'head', parent: 'neck', x: 20, y: -16, s: 1.16 },
    { id: 'snout', parent: 'head', x: 22, y: 6 },
    { id: 'jaw', parent: 'head', x: 20, y: 10 },
    { id: 'earN', parent: 'head', x: 2, y: -16 },
    { id: 'earF', parent: 'head', x: -10, y: -16 },
    { id: 'tail1', parent: 'hip', x: -10, y: -6 },
    { id: 'tail2', parent: 'tail1', x: -26, y: -8 },
    { id: 'tail3', parent: 'tail2', x: -26, y: -4 },
    // 后腿（N = 近侧，F = 远侧）
    { id: 'hipN', parent: 'hip', x: 0, y: 8 }, { id: 'kneeN', parent: 'hipN', x: -4, y: 34 }, { id: 'footN', parent: 'kneeN', x: 10, y: 34 },
    { id: 'hipF', parent: 'hip', x: -4, y: 8 }, { id: 'kneeF', parent: 'hipF', x: -4, y: 34 }, { id: 'footF', parent: 'kneeF', x: 10, y: 34 },
    // 前腿
    { id: 'shoN', parent: 'chest', x: 8, y: 10 }, { id: 'elbN', parent: 'shoN', x: 2, y: 32 }, { id: 'pawN', parent: 'elbN', x: 2, y: 34 },
    { id: 'shoF', parent: 'chest', x: 2, y: 10 }, { id: 'elbF', parent: 'shoF', x: 2, y: 32 }, { id: 'pawF', parent: 'elbF', x: 2, y: 34 },
  ];
  FOX.IK = {
    legHindN: { chain: ['hipN', 'kneeN', 'footN'], bend: -1 },
    legHindF: { chain: ['hipF', 'kneeF', 'footF'], bend: -1 },
    legForeN: { chain: ['shoN', 'elbN', 'pawN'], bend: 1 },
    legForeF: { chain: ['shoF', 'elbF', 'pawF'], bend: 1 },
  };

  /* ---------------- 图形 ---------------- */
  const leg = (col, upperW, lowerW) => ({
    upper: P(`M${-upperW} 0 Q${-upperW - 2} 18 ${-upperW + 2} 34 L${upperW - 2} 34 Q${upperW + 3} 16 ${upperW} 0 Z`, col, { seed: 21, amp: 1.2, step: 11 }),
    lower: P(`M${-lowerW} 0 L${-lowerW + 1} 30 L${lowerW - 1} 30 L${lowerW} 0 Z`, col, { seed: 22, amp: 1.1, step: 10 }),
    paw: P(`M-7 -2 Q-9 10 -2 12 L10 12 Q13 8 11 -2 Z`, SOCK, { seed: 23, amp: 1, step: 8 }),
  });
  const legN = leg(FUR, 13, 8), legF = leg(FUR_F, 12, 7);

  const PIECES = () => [
    // 尾巴（最靠后）
    { bone: 'tail3', z: 4, svg: P(`M0 -2 Q-20 -16 -38 -6 Q-50 2 -38 14 Q-18 22 2 10 Z`, CREAM, { seed: 31, amp: 1.7, step: 12 }) },
    { bone: 'tail2', z: 5, svg: P(`M4 -2 Q-18 -22 -36 -8 Q-46 4 -34 18 Q-12 26 6 12 Z`, FUR, { seed: 32, amp: 1.9, step: 13 }) },
    { bone: 'tail1', z: 6, svg: P(`M6 -4 Q-16 -24 -34 -8 Q-44 6 -30 20 Q-8 28 8 14 Z`, FUR, { seed: 33, amp: 2, step: 13 }) },
    // 远侧腿
    { bone: 'hipF', z: 8, svg: legF.upper }, { bone: 'kneeF', z: 8, svg: legF.lower }, { bone: 'footF', z: 8, svg: P('M-6 -2 Q-8 9 -2 11 L9 11 Q12 7 10 -2 Z', '#5C3F2C', { seed: 24, amp: 1, step: 8 }) },
    { bone: 'shoF', z: 9, svg: legF.upper }, { bone: 'elbF', z: 9, svg: legF.lower }, { bone: 'pawF', z: 9, svg: P('M-6 -2 Q-8 9 -2 11 L9 11 Q12 7 10 -2 Z', '#5C3F2C', { seed: 25, amp: 1, step: 8 }) },
    // 远侧耳（在头后面）
    { bone: 'earF', z: 10, svg: P('M0 0 Q-8 -22 4 -34 Q14 -22 10 2 Z', FUR_F, { seed: 26, amp: 1.2, step: 10 }) },
    // 躯干
    { bone: 'hip', z: 14, svg: P(`M${-34} ${-26} Q${-46} ${-2} ${-30} ${22} Q${-6} ${34} ${18} ${20} L${16} ${-24} Q${-8} ${-38} ${-34} ${-26} Z`, FUR, { seed: 27, amp: 1.8, step: 14 }) },
    {
      bone: 'body', z: 15, svg: P(`M-44 -30 Q-8 -44 30 -34 Q56 -26 58 -2 Q56 22 26 30 Q-10 36 -40 24 Q-54 2 -44 -30 Z`, FUR, { seed: 28, amp: 2, step: 15 })
        + P(`M-30 12 Q0 28 34 20 Q30 32 -4 34 Q-26 32 -30 12 Z`, CREAM, { seed: 29, amp: 1.5, step: 12, op: .95 })
    },
    { bone: 'chest', z: 16, svg: P(`M-16 -26 Q14 -32 26 -12 Q30 10 8 24 Q-14 28 -22 12 Q-26 -12 -16 -26 Z`, FUR, { seed: 30, amp: 1.7, step: 13 }) + P(`M-4 6 Q16 8 22 0 Q20 20 2 22 Q-8 18 -4 6 Z`, CREAM, { seed: 34, amp: 1.3, step: 11 }) },
    { bone: 'neck', z: 17, svg: P('M-14 -14 Q6 -22 18 -8 Q20 10 4 16 Q-14 14 -18 2 Z', FUR, { seed: 35, amp: 1.5, step: 12 }) },
    // 头
    {
      bone: 'head', z: 20, cls: 'fx-head', svg: P('M-20 -16 Q-4 -30 16 -22 Q30 -14 30 4 Q28 22 6 26 Q-16 26 -24 10 Q-28 -6 -20 -16 Z', FUR, { seed: 36, amp: 1.6, step: 12 })
        + P('M2 8 Q22 6 30 0 Q30 18 10 24 Q0 20 2 8 Z', CREAM, { seed: 37, amp: 1.2, step: 10, op: .9 })
        // 脸颊腮红
        + `<g class="fx-blush">${P(E(-6, 12, 7, 4.4), CO.blush, { seed: 38, amp: .7, step: 7, op: .55 })}</g>`
        // 眼睛（几种表情叠在一起，render 里切 display）
        + `<g class="fx-eye-open">${P(E(10, -2, 4.6, 5.2), INK, { seed: 39, amp: .5, step: 6 })}${P(E(11.6, -3.6, 1.7, 1.9), '#fff', { seed: 40, amp: .4, step: 5 })}</g>`
        + `<g class="fx-eye-squint" style="display:none">${P('M4 -2 Q10 -7 16 -2', 'none', { stroke: INK, sw: 2.6, seed: 41, amp: .6, step: 7 })}</g>`
        + `<g class="fx-eye-shut" style="display:none">${P('M4 -1 Q10 3 16 -1', 'none', { stroke: INK, sw: 2.6, seed: 42, amp: .6, step: 7 })}</g>`
        + `<g class="fx-eye-wide" style="display:none">${P(E(11, -3, 6.2, 6.8), '#fff', { seed: 43, amp: .5, step: 6 })}${P(E(12, -2, 3.6, 4), INK, { seed: 44, amp: .4, step: 5 })}</g>`
        + `<g class="fx-brow" style="display:none">${P('M3 -12 Q10 -16 17 -13', 'none', { stroke: INK, sw: 2.4, seed: 45, amp: .6, step: 7 })}</g>`
    },
    // 近侧耳
    { bone: 'earN', z: 24, svg: P('M0 0 Q-6 -24 8 -36 Q20 -22 14 2 Z', FUR, { seed: 46, amp: 1.3, step: 10 }) + P('M2 -4 Q0 -18 8 -26 Q14 -16 11 -2 Z', '#F6C9A2', { seed: 47, amp: 1, step: 9, op: .85 }) },
    // 吻部 + 鼻子 + 嘴
    {
      bone: 'snout', z: 26, cls: 'fx-snout', svg: P('M-10 -8 Q12 -12 24 -2 Q26 6 14 10 Q-6 12 -12 4 Z', CREAM, { seed: 48, amp: 1.2, step: 10 })
        + P(E(23, -1, 5.4, 4.4), INK, { seed: 49, amp: .6, step: 6 })
        + `<g class="fx-smile">${P('M6 6 Q13 11 20 6', 'none', { stroke: INK, sw: 2, seed: 50, amp: .5, step: 6 })}</g>`
    },
    // 下巴（说话/喘气时张开）
    {
      bone: 'jaw', z: 25, cls: 'fx-jaw', svg: P('M-6 -2 Q10 -4 20 2 Q18 12 4 12 Q-8 10 -6 -2 Z', '#C2644F', { seed: 51, amp: 1.1, step: 9 })
        + `<g class="fx-tongue">${P('M4 4 Q14 2 18 8 Q12 16 4 12 Z', CO.tongue, { seed: 52, amp: 1, step: 8 })}</g>`
    },
    // 近侧腿
    { bone: 'hipN', z: 30, svg: legN.upper }, { bone: 'kneeN', z: 30, svg: legN.lower }, { bone: 'footN', z: 30, svg: legN.paw },
    { bone: 'shoN', z: 32, svg: legN.upper }, { bone: 'elbN', z: 32, svg: legN.lower }, { bone: 'pawN', z: 32, svg: legN.paw },
  ];

  /* ---------------- 动作片段 ---------------- */
  // 四足步态：相位差 legN 后 / legF 后 / legN 前 / legF 前
  const stride = (p, amp, lift) => {
    const sw = S(p * 6.283), li = Math.max(0, S(p * 6.283 + 1.2));
    return { th: sw * amp, sh: -li * lift, ft: -sw * amp * .3 };
  };
  const base = { mouth: 0, tongue: 0, brow: 0, energy: .5 };

  const CLIPS = {
    idle: t => {
      const b = S(t * 1.9), tw = S(t * 1.2);
      return {
        ...base, 'root.y': b * 1.6, body: b * .8, chest: -b * .6, neck: -3 + b * 1.2, head: 2 - b * .8,
        tail1: -14 + tw * 7, tail2: -10 + S(t * 1.2 + .7) * 9, tail3: -6 + S(t * 1.2 + 1.4) * 10,
        earN: tw * 3, earF: -tw * 2,
        hipN: -6, kneeN: 10, footN: -4, hipF: 4, kneeF: 6, footF: -6,
        shoN: 4, elbN: -6, pawN: 2, shoF: -4, elbF: -2, pawF: 4, energy: .35,
      };
    },
    // 走：慢悠悠
    walk: t => {
      const p = t * .9, a = stride(p, 26, 12), b = stride(p + .5, 26, 12), c = stride(p + .62, 20, 9), d = stride(p + .12, 20, 9);
      const bob = Math.abs(S(p * 6.283 * 2)) * 2.4;
      return {
        ...base, 'root.y': -bob, body: S(p * 6.283 * 2) * 1.6, chest: 1, neck: -4, head: 3 + S(p * 6.283) * 1.6,
        tail1: -18 + S(p * 6.283) * 10, tail2: -12 + S(p * 6.283 + .6) * 12, tail3: -8 + S(p * 6.283 + 1.2) * 12,
        hipN: a.th, kneeN: 14 + a.sh, footN: a.ft, hipF: b.th, kneeF: 14 + b.sh, footF: b.ft,
        shoN: c.th, elbN: -10 + c.sh, pawN: c.ft, shoF: d.th, elbF: -10 + d.sh, pawF: d.ft, energy: .5,
      };
    },
    // 又热又渴：头低、舌头伸出、走得拖沓
    thirsty: t => {
      const p = t * .62, a = stride(p, 18, 8), b = stride(p + .5, 18, 8), c = stride(p + .62, 14, 6), d = stride(p + .12, 14, 6);
      const pantF = S(t * 7.5);
      return {
        ...base, 'root.y': -Math.abs(S(p * 6.283 * 2)) * 1.6, body: 3, chest: 6, neck: 16, head: 10 + pantF * 1.5,
        tail1: -4, tail2: 4, tail3: 8, earN: 14, earF: 10,
        hipN: a.th, kneeN: 16 + a.sh, footN: a.ft, hipF: b.th, kneeF: 16 + b.sh, footF: b.ft,
        shoN: c.th, elbN: -8 + c.sh, pawN: c.ft, shoF: d.th, elbF: -8 + d.sh, pawF: d.ft,
        mouth: .45 + .35 * (pantF * .5 + .5), tongue: .85, energy: .3,
      };
    },
    // 抬头看葡萄
    lookUp: t => {
      const b = S(t * 1.7);
      return {
        ...base, 'root.y': b * 1.2, body: -6, chest: -12, neck: -34, head: -22 + b * 1.2,
        earN: -12, earF: -8, tail1: -24 + S(t * 2.2) * 8, tail2: -16 + S(t * 2.2 + .6) * 10, tail3: -10 + S(t * 2.2 + 1.2) * 11,
        hipN: -10, kneeN: 16, footN: -6, hipF: 0, kneeF: 12, footF: -8,
        shoN: 6, elbN: -8, pawN: 2, shoF: -2, elbF: -4, pawF: 4, mouth: .12, energy: .5,
      };
    },
    // 蓄力：屁股压低、前身贴地
    crouch: t => {
      const q = S(t * 9) * .6;
      return {
        ...base, 'root.y': 22 + q, body: 6, chest: 10, neck: -18, head: -14, earN: -16, earF: -12,
        tail1: 10, tail2: 16, tail3: 18,
        hipN: -42, kneeN: 66, footN: -24, hipF: -38, kneeF: 62, footF: -22,
        shoN: 24, elbN: -40, pawN: 16, shoF: 20, elbF: -36, pawF: 14, brow: .6, energy: .8,
      };
    },
    // 腾空：整个身体拉长，四条腿甩开
    leap: t => {
      const a = sm(t / .34);
      return {
        ...base, 'root.y': -6, 'root.rot': -16 * a, body: -10 * a, chest: -8 * a, neck: -30 * a - 6, head: -18 * a,
        earN: -22 * a, earF: -18 * a, tail1: -30 * a, tail2: -22 * a, tail3: -16 * a,
        hipN: 34 * a, kneeN: -20 * a, footN: 14 * a, hipF: 30 * a, kneeF: -18 * a, footF: 12 * a,
        shoN: -52 * a, elbN: 16 * a, pawN: -10 * a, shoF: -46 * a, elbF: 14 * a, pawF: -8 * a,
        mouth: .5 * a, brow: .4, energy: 1,
      };
    },
    // 顶点后往下掉：腿收回来
    fall: t => ({
      ...base, 'root.rot': 10, body: 8, chest: 6, neck: 8, head: 10, earN: 16, earF: 12,
      tail1: 14, tail2: 20, tail3: 24,
      hipN: -20, kneeN: 40, footN: -14, hipF: -18, kneeF: 36, footF: -12,
      shoN: 26, elbN: -30, pawN: 10, shoF: 22, elbF: -26, pawF: 8, mouth: .7, brow: .8, energy: .9,
    }),
    // 落地缓冲
    land: t => {
      const a = 1 - sm(t / .28);
      return {
        ...base, 'root.y': 20 * a, body: 6 * a, chest: 8 * a, neck: 10 * a, head: 8 * a,
        tail1: 8 * a, tail2: 12 * a, tail3: 14 * a,
        hipN: -34 * a, kneeN: 54 * a, footN: -18 * a, hipF: -30 * a, kneeF: 50 * a, footF: -16 * a,
        shoN: 20 * a, elbN: -34 * a, pawN: 12 * a, shoF: 18 * a, elbF: -30 * a, pawF: 10 * a,
        mouth: .3 * a, brow: .5, energy: .6,
      };
    },
    // 趴在地上喘气
    pant: t => {
      const br = S(t * 5.2), jw = S(t * 6.4) * .5 + .5;
      return {
        ...base, 'root.y': 70 + br * 1.4, body: 3, chest: 5, neck: 13, head: 9, earN: 24, earF: 20,
        tail1: 30, tail2: 36, tail3: 40,
        hipN: -96, kneeN: 128, footN: -42, hipF: -92, kneeF: 124, footF: -40,
        shoN: 84, elbN: -104, pawN: 26, shoF: 80, elbF: -100, pawF: 24,
        mouth: .35 + .5 * jw, tongue: 1, brow: .5, energy: .15,
      };
    },
    // 爬起来抖一抖
    shake: t => {
      const q = S(t * 26), q2 = S(t * 26 + 1.1);
      return {
        ...base, 'root.y': 2, 'root.rot': q * 2.5, body: q * 5, chest: q2 * 6, neck: -6 + q * 7, head: q2 * 9,
        earN: q * 22, earF: q2 * 20, tail1: -10 + q * 16, tail2: -6 + q2 * 18, tail3: q * 20,
        hipN: -8, kneeN: 14, footN: -6, hipF: 2, kneeF: 10, footF: -6,
        shoN: 4, elbN: -8, pawN: 2, shoF: -2, elbF: -4, pawF: 4, energy: .9,
      };
    },
    // 昂着头走开（"我才不稀罕"）
    strut: t => {
      const p = t * .8, a = stride(p, 24, 14), b = stride(p + .5, 24, 14), c = stride(p + .62, 20, 12), d = stride(p + .12, 20, 12);
      return {
        ...base, 'root.y': -Math.abs(S(p * 6.283 * 2)) * 3, body: -4, chest: -10, neck: -22, head: -16,
        earN: -6, earF: -4, tail1: -34 + S(p * 6.283) * 6, tail2: -30 + S(p * 6.283 + .6) * 7, tail3: -26 + S(p * 6.283 + 1.2) * 8,
        hipN: a.th, kneeN: 12 + a.sh, footN: a.ft, hipF: b.th, kneeF: 12 + b.sh, footF: b.ft,
        shoN: c.th, elbN: -12 + c.sh, pawN: c.ft, shoF: d.th, elbF: -12 + d.sh, pawF: d.ft,
        'fx-eye': 1, energy: .6,
      };
    },
    // 说话时的小幅点头（配合 st.mouth='talk'）
    talk: t => {
      const n = S(t * 5.6);
      return {
        ...base, 'root.y': n * 1.2, body: -2, chest: -6, neck: -14 + n * 3, head: -8 + n * 4,
        earN: -6, earF: -4, tail1: -20 + S(t * 2.6) * 10, tail2: -14 + S(t * 2.6 + .7) * 11, tail3: -8 + S(t * 2.6 + 1.3) * 12,
        hipN: -6, kneeN: 12, footN: -4, hipF: 4, kneeF: 8, footF: -6,
        shoN: 4, elbN: -8, pawN: 2, shoF: -2, elbF: -4, pawF: 4, mouth: .35 + .3 * (S(t * 9) * .5 + .5), energy: .5,
      };
    },
  };

  /* ---------------- 工厂 ---------------- */
  FOX.fox = function (parent, o = {}) {
    const ch = SB.char(parent, { cls: 'fx-fox ' + (o.cls || ''), bones: FOX.BONES, ik: FOX.IK, pieces: PIECES(), clips: CLIPS, defaults: { mouth: 0, tongue: 0, brow: 0, energy: .5 } });
    const q = s => ch.g.querySelector(s);
    const els = {
      eyeOpen: q('.fx-eye-open'), eyeSquint: q('.fx-eye-squint'), eyeShut: q('.fx-eye-shut'), eyeWide: q('.fx-eye-wide'),
      brow: q('.fx-brow'), jaw: q('.fx-jaw'), tongue: q('.fx-tongue'), smile: q('.fx-smile'), blush: q('.fx-blush'),
    };
    const show = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };

    const api = {
      g: ch.g, rig: ch.rig, char: ch,
      play: (track, opts) => ch.rig.play(track, opts),
      pose: (t, act) => act.pose(t),
      point: (bone, x, y, pose, root) => ch.point(bone, x, y, pose, root),
      // st: {opacity, eye:'open'|'squint'|'shut'|'wide', mouth (0..1 覆盖 clip), tongue, blink (bool), brow, edit}
      render(t, act, root, st = {}) {
        const pose = Object.assign({}, st.pose || act.pose(t));
        if (st.edit) Object.assign(pose, st.edit);
        // 嘴：张嘴角度并进 jaw 骨头的姿态（纯 t 的函数，绝不去碰上一帧留下的 transform）
        const mo = clamp(st.mouth != null ? st.mouth : (pose.mouth || 0));
        pose.jaw = (pose.jaw || 0) + mo * 26;
        const m = ch.apply(pose, root);
        const tg = clamp(st.tongue != null ? st.tongue : (pose.tongue || 0));
        if (els.tongue) { els.tongue.style.display = tg > .05 ? '' : 'none'; els.tongue.setAttribute('opacity', f1(tg)); }
        show(els.smile, mo < .2);
        // 眼
        const blinking = st.blink === true || (st.blink !== false && vk.rig.blink(t, { offset: o.blinkOffset || 0 }) > .5);
        const eye = blinking ? 'shut' : (st.eye || 'open');
        show(els.eyeOpen, eye === 'open'); show(els.eyeSquint, eye === 'squint');
        show(els.eyeShut, eye === 'shut'); show(els.eyeWide, eye === 'wide');
        show(els.brow, (st.brow != null ? st.brow : (pose.brow || 0)) > .35);
        show(els.blush, st.blush !== false);
        if (st.opacity != null) ch.g.setAttribute('opacity', st.opacity);
        return { pose, m };
      },
    };
    return api;
  };
  FOX.CLIPS = Object.keys(CLIPS);
})();
