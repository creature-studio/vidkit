// 哪吒 skeletal character — the user's hand-drawn SVG art (examples/nezha-ref/nezha-rig-demo.html) on vk.rig.
// Paths, gradients and colours are the original; only ids became data-bone / class hooks (so several instances can
// coexist) and the HUD / mouse / requestAnimationFrame driver was replaced by pure functions of t.
//
//   const nz = NZR.nezha(parentSvgGroup);                       // origin = torso (waist); rig units ≈ 455 tall
//   const act = nz.play([{ at: 0, clip: 'idle' }, { at: 3.8, clip: 'attack', blend: .4 }], { ik: { armR: t => [x, y] } });
//   sc.on(l => nz.render(l, act, { x, y, scale: .55, flip: -1 }, { ring: 1, spear: 1 }));
(function () {
  const NZR = window.NZR = window.NZR || {};
  const NS = 'http://www.w3.org/2000/svg';
  const f2 = x => Math.round(x * 100) / 100;
  let uid = 0;

  // ---- style (original CSS variables inlined; scoped to .nzr) ----
  if (!document.getElementById('nzr-style')) {
    const st = document.createElement('style'); st.id = 'nzr-style';
    st.textContent = `
      .nzr .red2{fill:#d05a3d;stroke:#202528;stroke-width:3}
      .nzr .gold{fill:#c7a34c;stroke:#202528;stroke-width:3}
      .nzr .ink{fill:#202528}
      .nzr .ribbon{fill:none;stroke:#b63b30;stroke-linecap:round;stroke-linejoin:round}
      .nzr .weapon{stroke:#202528;stroke-linecap:round}`;
    document.head.appendChild(st);
  }

  const legMarkup = (side, u, dx) => `
    <g data-bone="hip${side}">
      <g data-bone="upperLeg${side}">
        <path d="M${-15 + dx} -5 C${-19 + dx} 22 ${-18} 50 -10 78 C-3 87 11 87 17 77 C20 48 18 21 14 -5Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
        <path d="M${-18 + dx} 0 C${-18 + dx} 20 ${17 + dx} 20 ${17 + dx} 0" class="red2"/>
        <g data-bone="lowerLeg${side}">
          <path d="M-11 -3 C-15 24 -14 49 -7 69 C-1 77 11 76 15 67 C17 43 15 18 11 -3Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
          <path d="M-13 55 C-8 70 10 75 20 64 L25 75 C7 91 -19 83 -22 63Z" class="gold"/>
          <g data-bone="wheel${side}">
            <circle r="26" fill="#d85f3a" stroke="#202528" stroke-width="3"/>
            <circle r="18" fill="none" stroke="#c7a34c" stroke-width="5"/>
            <circle r="5" class="gold"/>
          </g>
        </g>
      </g>
    </g>`;

  const ART = u => `
  <defs>
    <filter id="paperEdge-${u}">
      <feTurbulence type="fractalNoise" baseFrequency=".008" numOctaves="2" seed="14" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.2"/>
    </filter>
    <filter id="softInk-${u}"><feGaussianBlur stdDeviation=".32"/></filter>
    <linearGradient id="skinShade-${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5d2b1"/><stop offset="1" stop-color="#e7af87"/></linearGradient>
    <linearGradient id="redShade-${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cf5140"/><stop offset="1" stop-color="#9e2c27"/></linearGradient>
  </defs>
  <g class="nzr-actor" filter="url(#paperEdge-${u})">
  <!-- 后层混天绫 -->
  <g class="back-ribbon" filter="url(#softInk-${u})">
    <path class="ribbon rb1" stroke-width="18"/>
    <path class="ribbon rb2" stroke-width="13" opacity=".8"/>
  </g>
  <g data-bone="torso">
    <!-- 后裙摆 / 衣片 -->
    <path d="M-49 -18 C-61 18 -72 57 -62 98 C-35 111 34 110 63 94 C69 48 61 13 48 -18Z" fill="url(#redShade-${u})" stroke="#202528" stroke-width="3"/>
    <path d="M-59 39 C-34 49 33 50 61 37" fill="none" stroke="#c7a34c" stroke-width="6" stroke-linecap="round"/>
    <path d="M-35 92 C-24 61 -17 37 -10 12 M35 91 C24 62 18 38 11 13" fill="none" stroke="#842922" stroke-width="3" opacity=".55"/>
    ${legMarkup('L', u, 0)}
    ${legMarkup('R', u, 1)}
    <!-- 身体 -->
    <path d="M-48 -85 C-38 -111 38 -111 49 -84 L56 -16 C36 4 19 12 0 13 C-23 12 -41 4 -57 -18Z" fill="url(#redShade-${u})" stroke="#202528" stroke-width="3"/>
    <path d="M-42 -79 C-20 -62 19 -61 43 -79 L33 -104 C10 -112 -13 -112 -34 -102Z" fill="#f0d8ad" stroke="#202528" stroke-width="3"/>
    <path d="M-42 -40 C-12 -28 15 -28 46 -42" fill="none" stroke="#c7a34c" stroke-width="8" stroke-linecap="round"/>
    <circle cx="0" cy="-39" r="7" class="gold"/>
    <path d="M-4 -103 L-16 -72 L0 -61 L16 -72 L5 -103Z" fill="#f3eee0" stroke="#202528" stroke-width="2.6"/>
    <!-- 左臂 FK（持乾坤圈） -->
    <g data-bone="shoulderL">
      <g data-bone="upperArmL">
        <path d="M-4 -13 C18 -18 51 -15 73 -7 C81 -1 80 12 70 17 C46 21 18 18 -5 13Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
        <path d="M-3 -14 C9 -15 16 15 0 16 C-10 10 -12 -7 -3 -14Z" class="red2"/>
        <g data-bone="lowerArmL">
          <path d="M-3 -11 C17 -15 43 -12 65 -4 C73 3 70 14 61 18 C39 20 15 16 -5 11Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
          <path d="M43 -12 C55 -13 66 -8 70 1 L66 14 C57 20 45 17 40 9Z" class="gold"/>
          <g data-bone="handL">
            <path d="M-2 -10 C11 -13 22 -8 26 1 C25 12 14 18 3 15 C-6 10 -9 -3 -2 -10Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
            <g class="ring-hand">
              <circle class="ring-slot" cx="26" cy="2" r="20" fill="none" stroke="#c7a34c" stroke-width="7"/>
              <circle cx="26" cy="2" r="11" fill="none" stroke="#202528" stroke-width="2.5" opacity=".55"/>
            </g>
          </g>
        </g>
      </g>
    </g>
    <!-- 右臂 2-bone IK（持火尖枪） -->
    <g data-bone="shoulderR">
      <g data-bone="upperArmR">
        <path d="M-4 -13 C18 -18 51 -15 75 -7 C82 -1 82 12 71 17 C46 21 18 18 -5 13Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
        <path d="M-3 -14 C10 -15 16 15 0 16 C-10 10 -12 -7 -3 -14Z" class="red2"/>
        <g data-bone="lowerArmR">
          <path d="M-3 -11 C18 -15 46 -12 68 -4 C76 3 73 14 64 18 C41 20 16 16 -5 11Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
          <path d="M46 -12 C59 -13 69 -8 73 1 L69 14 C59 20 47 17 43 9Z" class="gold"/>
          <g data-bone="handR">
            <path d="M-2 -10 C11 -13 23 -8 27 2 C25 13 13 18 3 15 C-7 10 -9 -3 -2 -10Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
            <g data-bone="spear">
              <line class="weapon" x1="-16" y1="0" x2="186" y2="0" stroke-width="7"/>
              <path d="M186 0 L217 -12 L208 0 L217 12Z" class="gold"/>
              <path d="M118 -1 C138 -20 153 -18 168 -8 C150 -4 138 4 124 14Z" fill="#b63b30" stroke="#202528" stroke-width="2"/>
            </g>
          </g>
        </g>
      </g>
    </g>
    <!-- 头 -->
    <g data-bone="head">
      <circle cx="-34" cy="-34" r="19" class="ink"/>
      <circle cx="35" cy="-34" r="19" class="ink"/>
      <path d="M-50 -32 Q-35 -61 -12 -39 M14 -39 Q37 -61 52 -31" fill="none" stroke="#b63b30" stroke-width="8" stroke-linecap="round"/>
      <path d="M-38 -11 C-37 -42 -18 -58 1 -58 C24 -58 40 -40 40 -9 C40 24 21 42 1 43 C-21 42 -40 24 -38 -11Z" fill="url(#skinShade-${u})" stroke="#202528" stroke-width="3"/>
      <path d="M-34 -25 C-26 -51 -9 -58 2 -55 C-7 -44 -7 -32 -1 -23 C7 -43 23 -50 34 -35 C26 -59 6 -69 -13 -61 C-29 -55 -38 -42 -34 -25Z" fill="#202528"/>
      <path d="M-24 -10 Q-14 -16 -5 -11 M8 -11 Q18 -16 27 -9" fill="none" stroke="#202528" stroke-width="3" stroke-linecap="round"/>
      <g class="eyes">
        <ellipse cx="-14" cy="-2" rx="5" ry="6" fill="#202528"/>
        <ellipse cx="17" cy="-2" rx="5" ry="6" fill="#202528"/>
      </g>
      <g class="blink" opacity="0">
        <path d="M-20 -1 Q-14 3 -8 -1 M11 -1 Q17 3 23 -1" fill="none" stroke="#202528" stroke-width="3.2" stroke-linecap="round"/>
      </g>
      <path d="M-5 19 Q3 25 13 18" fill="none" stroke="#9c3a31" stroke-width="3" stroke-linecap="round"/>
      <circle cx="-28" cy="9" r="5" fill="#d98e79" opacity=".34"/>
      <circle cx="30" cy="9" r="5" fill="#d98e79" opacity=".34"/>
      <circle cx="-39" cy="4" r="6" fill="none" stroke="#c7a34c" stroke-width="3"/>
      <circle cx="41" cy="4" r="6" fill="none" stroke="#c7a34c" stroke-width="3"/>
    </g>
  </g>
  <!-- 前层飘带 -->
  <g class="front-ribbon" filter="url(#softInk-${u})">
    <path class="ribbon rf" stroke-width="11" opacity=".9"/>
  </g>
  </g>`;

  // bone hierarchy = the nesting of the original groups (rest translates from their transform attributes)
  NZR.BONES = [
    { id: 'torso' },
    { id: 'hipL', parent: 'torso', x: -25, y: 79 }, { id: 'upperLegL', parent: 'hipL' }, { id: 'lowerLegL', parent: 'upperLegL', x: 1, y: 79 }, { id: 'wheelL', parent: 'lowerLegL', x: 3, y: 73 },
    { id: 'hipR', parent: 'torso', x: 25, y: 79 }, { id: 'upperLegR', parent: 'hipR' }, { id: 'lowerLegR', parent: 'upperLegR', x: 1, y: 79 }, { id: 'wheelR', parent: 'lowerLegR', x: 3, y: 73 },
    { id: 'shoulderL', parent: 'torso', x: -48, y: -77 }, { id: 'upperArmL', parent: 'shoulderL' }, { id: 'lowerArmL', parent: 'upperArmL', x: 72, y: 4 }, { id: 'handL', parent: 'lowerArmL', x: 65, y: 5 },
    { id: 'shoulderR', parent: 'torso', x: 48, y: -77 }, { id: 'upperArmR', parent: 'shoulderR' }, { id: 'lowerArmR', parent: 'upperArmR', x: 74, y: 4 }, { id: 'handR', parent: 'lowerArmR', x: 68, y: 5 },
    { id: 'spear', parent: 'handR', x: 18, y: 2, rot: -7 },
    { id: 'head', parent: 'torso', x: 0, y: -145 },
  ];

  // clips: the demo's animate() formulas. The right-hand IK target (demo: world point, root at 705,470) becomes the
  // clip channel armR.tx/ty in root-local units; energy / dir drive the ribbons.
  const S = Math.sin, C = Math.cos;
  NZR.CLIPS = {
    idle: t => ({
      'root.y': S(t * 2) * 4, 'root.rot': 0, head: S(t * 1.3) * 3,
      upperArmL: 145 + S(t * 1.7) * 5, lowerArmL: -20 + S(t * 1.9 + 1) * 5,
      upperLegL: 5 + S(t * 1.4) * 2.5, upperLegR: -5 - S(t * 1.4) * 2.5, lowerLegL: -6, lowerLegR: 6,
      energy: .25, dir: -1, 'armR.tx': 205 + C(t * .9) * 28, 'armR.ty': -145 + S(t * 1.2) * 32,
    }),
    float: t => ({
      'root.y': S(t * 2.7) * 10, 'root.rot': S(t * 1.1) * 3.5, head: -2 + S(t * 1.8) * 4,
      upperArmL: 160 + S(t * 2.1) * 10, lowerArmL: -28 + S(t * 2.2 + 1) * 8,
      upperLegL: 17 + S(t * 2.5) * 8, upperLegR: -15 - S(t * 2.5) * 7, lowerLegL: -22 + S(t * 2.5 + 1) * 8, lowerLegR: 20 + S(t * 2.5 + 1.2) * 8,
      energy: .65, dir: -1, 'armR.tx': 245 + C(t * 1.1) * 60, 'armR.ty': -184 + S(t * 1.6) * 54,
    }),
    attack: t => {
      const p = (S(t * 2.1) + 1) / 2;
      return {
        'root.y': S(t * 4) * 4, 'root.rot': -5, head: -6 + S(t * 2) * 2,
        upperArmL: 205 + S(t * 3) * 7, lowerArmL: -32,
        upperLegL: 19, upperLegR: -22, lowerLegL: -16, lowerLegR: 18,
        energy: 1, dir: 1, 'armR.tx': 230 + p * 140, 'armR.ty': -225 + S(t * 4.2) * 75,
      };
    },
    // extra poses for the film (same bone set, hand-keyed)
    brace: t => ({   // 挡风雨：low wide stance, ring arm raised as a shield, spear planted forward
      'root.y': 6 + S(t * 2.4) * 2, 'root.rot': -3 + S(t * 1.3) * 1, head: -4 + S(t * 1.1) * 1.5,
      upperArmL: 200 + S(t * 1.6) * 3, lowerArmL: -60,
      upperLegL: 24, upperLegR: -26, lowerLegL: -14, lowerLegR: 16,
      energy: .85, dir: -1, 'armR.tx': 210, 'armR.ty': -60,
    }),
    bow: t => ({     // 拱手：both hands meet before the chest (IK on both arms), head dipped
      'root.y': S(t * 1.2) * 2, 'root.rot': 0, head: 0, 'head.y': 7,
      upperLegL: 4, upperLegR: -4, lowerLegL: -4, lowerLegR: 4,
      energy: .2, dir: -1, 'armR.tx': 12, 'armR.ty': -52, 'armL.tx': -12, 'armL.ty': -52,
    }),
    dive: t => ({    // 入海：streamlined, legs trailing, ribbons stretched
      'root.y': S(t * 3) * 3, 'root.rot': 0, head: 6,
      upperArmL: 170 + S(t * 2.6) * 6, lowerArmL: -10,
      upperLegL: 10 + S(t * 3) * 6, upperLegR: -6 - S(t * 3) * 6, lowerLegL: -10, lowerLegR: 12,
      energy: .9, dir: -1, 'armR.tx': 250, 'armR.ty': -80,
    }),
    throw: t => ({   // 抛圈：left arm swings over the head and forward
      'root.y': 0, 'root.rot': -4, head: -4,
      upperArmL: 250, lowerArmL: -10,
      upperLegL: 14, upperLegR: -14, lowerLegL: -10, lowerLegR: 12,
      energy: .9, dir: 1, 'armR.tx': 200, 'armR.ty': -170,
    }),
  };
  NZR.IK = {
    armR: { chain: ['upperArmR', 'lowerArmR', 'handR'], bend: 1 },
    armL: { chain: ['upperArmL', 'lowerArmL', 'handL'], bend: -1 },
  };

  // the demo's procedural 混天绫 (root-local), driven by t, energy (0..1) and direction (−1 … 1, blended)
  function ribbons(t, energy, dir) {
    const w = S(t * 1.35) * 10, fast = S(t * 3.1) * 9 * energy;
    return [
      `M -38 -70 C ${f2(-135 - dir * fast)} ${f2(-154 + w)}, ${f2(-245 - dir * fast)} ${f2(-118 - w)}, ${f2(-282 - dir * 22)} ${f2(-26 + fast)} C ${f2(-310 - dir * 18)} ${f2(45 + w)}, ${f2(-220 + fast)} ${f2(92 - w)}, -145 ${f2(36 + fast)}`,
      `M 34 -78 C ${f2(130 + fast)} ${f2(-150 - w)}, ${f2(222 + dir * fast)} ${f2(-89 + w)}, ${f2(207 + dir * 30)} ${f2(3 - fast)} C 194 ${f2(69 + w)}, ${f2(130 - fast)} 92, 87 ${f2(40 - w)}`,
      `M -5 -45 C ${f2(65 + fast)} ${f2(-12 - w)}, ${f2(120 + dir * fast)} ${f2(35 + w)}, ${f2(183 + dir * 45)} ${f2(10 - fast)}`,
    ];
  }
  NZR.ribbons = ribbons;

  NZR.nezha = function (parent, o = {}) {
    const u = 'nzr' + (++uid);
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'nzr ' + (o.cls || '')); g.innerHTML = ART(u); parent.appendChild(g);
    const q = s => g.querySelector(s);
    const rig = vk.rig({ root: g, bones: NZR.BONES, clips: { ...NZR.CLIPS, ...(o.clips || {}) }, ik: NZR.IK, defaults: { energy: .25, dir: -1 } });
    const E = { rb: [q('.rb1'), q('.rb2'), q('.rf')], eyes: q('.eyes'), blink: q('.blink'), ring: q('.ring-hand'), spear: q('[data-bone="spear"]'), ringSlot: q('.ring-slot') };
    if (o.debug) rig.debug(true);
    const api = {
      g, rig, uid: u,
      play: (track, opts) => rig.play(track, opts),
      // pose(t, player, root, st) → final pose incl. per-character procedural bones (wheels, spear wobble)
      pose(t, player, root, st = {}) {
        return player.pose(t, root, p => {
          p.wheelL = t * 120; p.wheelR = -t * 120; p.spear = S(t * 5) * 1.5;
          if (st.edit) st.edit(p, t);
        });
      },
      // world point of a bone-local point for a given frame (pure: same maths as the render)
      point(bone, x, y, t, player, root, st) { return rig.point(bone, x, y, api.pose(t, player, root, st), root); },
      ringWorld(t, player, root, st) { return api.point('handL', 26, 2, t, player, root, st); },
      // st: { opacity, ring (0..1 in hand), spear (0..1), energy / dir overrides, blinkOffset, edit(pose,t) }
      render(t, player, root, st = {}) {
        if (st.opacity != null && st.opacity <= .001) { g.setAttribute('opacity', 0); return null; }
        g.setAttribute('opacity', st.opacity == null ? 1 : f2(st.opacity));
        const p = api.pose(t, player, root, st);
        rig.apply(p, root);
        const en = st.energy != null ? st.energy : p.energy, dir = st.dir != null ? st.dir : p.dir;
        ribbons(t, en, dir).forEach((d, i) => E.rb[i].setAttribute('d', d));
        const b = vk.rig.blink(t, { period: 4.4, dur: .24, offset: st.blinkOffset || 0 });
        E.blink.setAttribute('opacity', b); E.eyes.setAttribute('opacity', 1 - b);
        E.ringSlot.setAttribute('transform', `rotate(${f2((t * 90) % 360)} 26 2)`);
        E.ring.setAttribute('opacity', f2(st.ring == null ? 1 : st.ring));
        E.spear.setAttribute('opacity', f2(st.spear == null ? 1 : st.spear));
        return p;
      },
    };
    return api;
  };
})();
