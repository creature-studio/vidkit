// storybook.js — 现代绘本手绘套件（《狐狸与葡萄》专用，但与故事无关，可复用）
//
// 画面语言：米色纸底 + 蜡笔/彩铅质感 + 圆钝的手绘轮廓 + 柔和色块。和 wusong/luzhishen 那套"剪纸 + 水墨"
// 是两条路：那边是剪刀切边 + 宣纸洇墨，这边是蜡笔毛边 + 纸纹颗粒 + 轻微的铅笔描边。
//
//   SB.defs()                 一次性 <defs>（蜡笔毛边 / 纸纹 / 柔和阴影 / 天空渐变）
//   SB.wob(d, o)              把路径揉成手绘感（缓慢起伏的毛边，按 d+seed 缓存，纯函数）
//   SB.P(d, fill, o)          一块色（可带描边 stroke）
//   SB.E / SB.blob            椭圆 / 有机色块的路径数据
//   SB.world(sc, o)           天空 + 远山 + 田垄 + 地面 + 云 + 太阳 + 草丛 → {root, props, actors, fx, front, gy}
//   SB.arbor(o)               葡萄架（立柱 + 横梁 + 藤蔓 + 叶子）
//   SB.bunch(o) / SB.bunchG   一串葡萄（静态 markup / 可摇晃的组）
//   SB.butterfly(sc,parent,o) 蝴蝶（自己每帧飞）
//   SB.puff(sc,parent,o)      脚下扬起的尘土（纯函数、可回放）
//   SB.sweat / SB.stars       汗珠 / 眼冒金星（挫败感）
//   SB.card(sc, t, s, o)      角落里的绘本小卡片
//   SB.char(parent, def)      骨骼角色外壳：每块图形拿自己骨头的矩阵，z 序与骨骼层级解耦
//
// 所有东西都是 t 的纯函数：没有时钟、没有跨帧状态，seek 到任意时间结果一致。
(function () {
  const SB = window.SB = window.SB || {};
  const NS = 'http://www.w3.org/2000/svg';
  const f1 = x => Math.round(x * 10) / 10, f3 = x => Math.round(x * 1000) / 1000;
  const H = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const sm = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
  SB.hash = H; SB.clamp = clamp; SB.sm = sm;

  /* ---------------- 调色板 ---------------- */
  const COL = SB.COL = {
    paper: '#FBF4E6', sky1: '#CDE8EC', sky2: '#F3EAD8', sun: '#F7C65B', sunGlow: '#FBE3A6',
    cloud: '#FFFDF6', hillFar: '#BFD3A8', hillMid: '#9CC087', hillNear: '#86B173',
    field: '#E7CFA0', field2: '#DCC08D', earth: '#D2A971', path: '#E6D2AC',
    grass: '#7FA95F', grass2: '#6D9950', leaf: '#6FA24B', leaf2: '#87B95F', vine: '#8A6A46',
    wood: '#B08356', wood2: '#966B43', grape: '#7C5AA8', grape2: '#63428C', grapeHi: '#A98BD0',
    fur: '#E08640', fur2: '#C96C2C', belly: '#FBEBD2', tailTip: '#FDF3E2', ink: '#4A3A32',
    blush: '#EE9D82', tongue: '#E4707A', white: '#FFFDF6',
  };

  /* ---------------- 手绘毛边 ---------------- */
  // getTotalLength 采样 → 每个点沿法线推一点（低频起伏为主，偶尔一个小抖），再用二次曲线连成软线
  const cache = new Map(); let probe = null;
  SB.wob = function (d, o = {}) {
    const step = o.step || 9, amp = o.amp == null ? 1.6 : o.amp, seed = o.seed || 1;
    const key = d + '|' + step + '|' + amp + '|' + seed;
    if (cache.has(key)) return cache.get(key);
    if (!probe) {
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('aria-hidden', 'true'); s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(s); probe = document.createElementNS(NS, 'path'); s.appendChild(probe);
    }
    const subs = d.match(/M[^M]*/g) || [];
    let out = '';
    subs.forEach((sub, si) => {
      probe.setAttribute('d', sub);
      const L = probe.getTotalLength(); if (!(L > 0)) return;
      const closed = /Z\s*$/i.test(sub.trim());
      const n = Math.max(closed ? 8 : 3, Math.round(L / step));
      const pts = [];
      for (let i = 0; i < (closed ? n : n + 1); i++) { const p = probe.getPointAtLength(L * i / n); pts.push([p.x, p.y]); }
      const m = pts.length;
      const q = pts.map((p, i) => {
        const a = pts[(i - 1 + m) % m], b = pts[(i + 1) % m];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        // 低频起伏（手腕的晃）+ 一点高频（笔尖的毛）
        const u = i / m * 6.283;
        const k0 = Math.sin(u * 1.3 + seed * 2.1) * .6 + Math.sin(u * 2.7 + seed * 5.7) * .3;
        const k1 = (H(seed * 13.1 + si * 7.7 + i * .53) - .5) * .5;
        const k = (!closed && (i === 0 || i === m - 1)) ? 0 : amp * (k0 + k1);
        return [p[0] - dy / len * k, p[1] + dx / len * k];
      });
      // 中点 + 二次曲线 = 圆钝的蜡笔线（不是折线）
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (closed) {
        let s0 = mid(q[m - 1], q[0]);
        out += `M${f1(s0[0])},${f1(s0[1])}`;
        for (let i = 0; i < m; i++) { const nxt = mid(q[i], q[(i + 1) % m]); out += `Q${f1(q[i][0])},${f1(q[i][1])} ${f1(nxt[0])},${f1(nxt[1])}`; }
        out += 'Z';
      } else {
        out += `M${f1(q[0][0])},${f1(q[0][1])}`;
        for (let i = 1; i < m - 1; i++) { const nxt = mid(q[i], q[i + 1]); out += `Q${f1(q[i][0])},${f1(q[i][1])} ${f1(nxt[0])},${f1(nxt[1])}`; }
        out += `Q${f1(q[m - 1][0])},${f1(q[m - 1][1])} ${f1(q[m - 1][0])},${f1(q[m - 1][1])}`;
      }
    });
    cache.set(key, out);
    return out;
  };

  // 一块颜色；o: {stroke, sw (描边粗细), op, cls, amp, step, seed, raw (不揉), rule}
  SB.P = (d, fill, o = {}) => {
    const dd = o.raw ? d : SB.wob(d, o);
    const st = o.stroke === true ? COL.ink : o.stroke;
    return `<path d="${dd}" fill="${fill || 'none'}"${o.rule ? ` fill-rule="${o.rule}"` : ''}`
      + (st ? ` stroke="${st}" stroke-width="${o.sw == null ? 2.2 : o.sw}" stroke-linecap="round" stroke-linejoin="round"` : '')
      + (o.op != null ? ` opacity="${o.op}"` : '') + (o.cls ? ` class="${o.cls}"` : '') + '/>';
  };
  // 椭圆 → 路径（好让它也能被揉）
  SB.E = (cx, cy, rx, ry, rot = 0) => {
    const c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180);
    const P = (u, v) => `${f1(cx + u * c - v * s)},${f1(cy + u * s + v * c)}`;
    const k = .5523;
    return `M${P(-rx, 0)}C${P(-rx, -ry * k)} ${P(-rx * k, -ry)} ${P(0, -ry)}C${P(rx * k, -ry)} ${P(rx, -ry * k)} ${P(rx, 0)}`
      + `C${P(rx, ry * k)} ${P(rx * k, ry)} ${P(0, ry)}C${P(-rx * k, ry)} ${P(-rx, ry * k)} ${P(-rx, 0)}Z`;
  };
  // 有机色块（云、树冠、土堆…）
  SB.blob = (cx, cy, r, seed = 1, n = 9, squash = 1) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283, rr = r * (.78 + .34 * H(seed * 9.3 + i * 2.7));
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
    }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let s0 = mid(pts[n - 1], pts[0]), d = `M${f1(s0[0])},${f1(s0[1])}`;
    for (let i = 0; i < n; i++) { const nx = mid(pts[i], pts[(i + 1) % n]); d += `Q${f1(pts[i][0])},${f1(pts[i][1])} ${f1(nx[0])},${f1(nx[1])}`; }
    return d + 'Z';
  };

  /* ---------------- defs：蜡笔毛边 / 纸纹 / 柔光 ----------------
   * 装一份到页面上（不放在每个场景里）：场景切换会把非活动场景移出 DOM，
   * 那些 url(#…) 引用就会失效（渐变直接不画）。整片共用一份最稳。 */
  SB.defs = function (v) {
    if (!document.getElementById('sb-defs')) {
      const host = document.createElement('div');
      host.id = 'sb-defs'; host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      host.innerHTML = `<svg width="0" height="0">${DEFS}</svg>`;
      document.body.appendChild(host);
    }
    if (!document.getElementById('sb-style')) {
      const st = document.createElement('style'); st.id = 'sb-style';
      st.textContent = `
#stage .sb-root{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
#stage .sb-root svg{position:absolute;left:0;top:0;width:1280px;height:720px;overflow:visible}
#stage .vk-content{z-index:10}
#stage .sb-card{position:absolute;z-index:12;transform-origin:top left}`;
      document.head.appendChild(st);
    }
    return SB;
  };
  const DEFS = `
  <defs>
    <linearGradient id="sb-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COL.sky1}"/><stop offset=".62" stop-color="#E4EFE2"/><stop offset="1" stop-color="${COL.sky2}"/>
    </linearGradient>
    <radialGradient id="sb-sunglow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${COL.sunGlow}" stop-opacity=".95"/><stop offset="1" stop-color="${COL.sunGlow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sb-ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COL.field}"/><stop offset="1" stop-color="${COL.earth}"/>
    </linearGradient>
    <!-- 蜡笔毛边：低频位移 + 一点颗粒，色块边缘就不再是矢量的"硬" -->
    <filter id="sb-crayon" x="-12%" y="-12%" width="124%" height="124%">
      <feTurbulence type="fractalNoise" baseFrequency=".035 .045" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 .38 0 0 0 0 .3 0 0 0 0 .26 0 0 0 .13 0" result="gg"/>
      <feComposite in="gg" in2="d" operator="in" result="grain"/>
      <feMerge><feMergeNode in="d"/><feMergeNode in="grain"/></feMerge>
    </filter>
    <!-- 角色用：毛边小一点，免得糊 -->
    <filter id="sb-crayon-s" x="-12%" y="-12%" width="124%" height="124%">
      <feTurbulence type="fractalNoise" baseFrequency=".05 .06" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="sb-soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#8a6a4a" flood-opacity=".18"/>
    </filter>
    <filter id="sb-blur6"><feGaussianBlur stdDeviation="6"/></filter>
    <!-- 纸纹：整幅画面最上面压一层 -->
    <filter id="sb-paper" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="4" seed="5" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 .55 0 0 0 0 .47 0 0 0 0 .38 0 0 0 .5 0"/>
    </filter>
  </defs>`;

  /* ---------------- 世界 ---------------- */
  // o: {gy (地平线基准), hills, sun:[x,y], clouds:n, path:bool, tufts:n, seed}
  SB.world = function (sc, o = {}) {
    const W = 1280, Hh = 720, seed = o.seed || 1;
    const gyBase = o.gy == null ? 520 : o.gy;
    // 地面上沿：一条缓坡（纯函数，角色踩在上面）
    const gy = x => gyBase + Math.sin((x / W) * 2.1 + seed) * 14 + Math.sin((x / W) * 5.3 + seed * 2) * 5;
    const groundD = (() => {
      let d = `M-40 ${f1(gy(-40))}`;
      for (let x = 0; x <= W + 40; x += 40) d += `L${x} ${f1(gy(x))}`;
      return d + `L${W + 40} ${Hh + 40} L-40 ${Hh + 40} Z`;
    })();
    const hill = (cx, w, h, y0, col, sd, op) =>
      SB.P(`M${cx - w} ${y0} Q${cx - w * .55} ${y0 - h * 1.05} ${cx} ${y0 - h} Q${cx + w * .6} ${y0 - h * .92} ${cx + w} ${y0} Z`, col, { seed: sd, amp: 2.4, step: 16, op });

    const root = sc.html(`<div class="sb-root" style="position:absolute;inset:0"><svg viewBox="0 0 ${W} ${Hh}" width="100%" height="100%" style="display:block;width:100%;height:100%" aria-hidden="true">
      <g class="sb-sky">
        <rect x="0" y="0" width="${W}" height="${Hh}" fill="url(#sb-sky)"/>
        ${o.sun === false ? '' : `<g class="sb-sun">
          <circle cx="${(o.sun || [1060, 132])[0]}" cy="${(o.sun || [1060, 132])[1]}" r="130" fill="url(#sb-sunglow)"/>
          ${SB.P(SB.E((o.sun || [1060, 132])[0], (o.sun || [1060, 132])[1], 52, 52), COL.sun, { seed: 3, amp: 2.2 })}
        </g>`}
      </g>
      <g class="sb-clouds" filter="url(#sb-crayon)"></g>
      <g class="sb-far" filter="url(#sb-crayon)">
        ${hill(220, 400, 150, gyBase + 6, COL.hillFar, 2, .95)}
        ${hill(700, 460, 118, gyBase + 6, COL.hillFar, 5, .8)}
        ${hill(1120, 380, 165, gyBase + 6, COL.hillMid, 8, .9)}
      </g>
      <g class="sb-ground" filter="url(#sb-crayon)">
        ${SB.P(groundD, 'url(#sb-ground)', { raw: true })}
        ${(() => {
          let s2 = '';
          for (let i = 0; i < 4; i++) {
            const yy = gyBase + 26 + i * 34, w2 = 120 + 90 * H(seed + i);
            s2 += SB.P(`M${-30 + 260 * i * .7} ${yy} Q${140 + 260 * i * .7} ${yy - 8} ${-30 + 260 * i * .7 + w2} ${yy}`, 'none',
              { stroke: COL.field2, sw: 7, op: .55, seed: 20 + i, amp: 2, step: 22 });
          }
          return s2;
        })()}
      </g>
      <g class="sb-props"></g>
      <g class="sb-actors"></g>
      <g class="sb-fx"></g>
      <g class="sb-front" filter="url(#sb-crayon)"></g>
      <rect class="sb-grain" x="0" y="0" width="${W}" height="${Hh}" filter="url(#sb-paper)" opacity=".5" style="mix-blend-mode:multiply"/>
    </svg></div>`);
    const svg = root.querySelector('svg');
    const $ = s => svg.querySelector(s);
    const props = $('.sb-props'), actors = $('.sb-actors'), fx = $('.sb-fx'), front = $('.sb-front'), cloudsG = $('.sb-clouds');

    // 云：慢慢飘，出屏幕从另一头回来
    const nC = o.clouds == null ? 3 : o.clouds;
    const clouds = [];
    for (let i = 0; i < nC; i++) {
      const y = 70 + 90 * H(seed * 3.3 + i), s = .7 + .6 * H(seed * 7.1 + i), sp = 6 + 8 * H(seed + i * 2.2);
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = SB.P(SB.blob(0, 0, 54, seed * 5 + i, 10, .52) + SB.blob(-46, 8, 34, seed * 6 + i, 8, .55) + SB.blob(48, 10, 30, seed * 8 + i, 8, .55), COL.cloud, { raw: true, op: .92 });
      cloudsG.appendChild(g);
      clouds.push({ g, y, s, sp, x0: 120 + 420 * i + 200 * H(seed + i) });
    }
    // 草丛（前景，压在角色前面一点点）
    const nT = o.tufts == null ? 9 : o.tufts;
    let tufts = '';
    for (let i = 0; i < nT; i++) {
      const x = -20 + (W + 60) * ((i + .5) / nT) + 40 * (H(seed * 11 + i) - .5), yy = gy(x) + 18 + 26 * H(seed * 2 + i), s = .8 + .5 * H(seed * 4 + i);
      tufts += `<g transform="translate(${f1(x)} ${f1(yy)}) scale(${f3(s)})">`
        + SB.P('M0 0 Q-3 -16 -12 -26', 'none', { stroke: COL.grass2, sw: 3.4, seed: i + 1, amp: 1.1, step: 10 })
        + SB.P('M0 0 Q1 -20 -1 -32', 'none', { stroke: COL.grass, sw: 3.4, seed: i + 2, amp: 1.1, step: 10 })
        + SB.P('M0 0 Q5 -15 13 -24', 'none', { stroke: COL.grass2, sw: 3.4, seed: i + 3, amp: 1.1, step: 10 })
        + '</g>';
    }
    // 几片落叶 + 小石子：地面不至于太空
    let litter = '';
    for (let i = 0; i < (o.litter == null ? 5 : o.litter); i++) {
      const x = 90 + (W - 180) * H(seed * 17 + i * 3.1), yy = gy(x) + 44 + 70 * H(seed * 19 + i);
      if (H(seed * 23 + i) > .55) {
        litter += `<g transform="translate(${f1(x)} ${f1(yy)}) rotate(${f1(-40 + 80 * H(seed + i))})">`
          + SB.P(`M0 0 Q-11 -6 -3 -14 Q6 -18 12 -7 Q13 1 0 0 Z`, i % 2 ? COL.leaf2 : '#C9A15A', { seed: 70 + i, amp: 1, step: 8, op: .85 }) + '</g>';
      } else {
        litter += SB.P(SB.E(x, yy, 7 + 4 * H(seed * 5 + i), 4 + 2 * H(seed * 7 + i)), '#C9B08A', { seed: 80 + i, amp: .9, step: 7, op: .7 });
      }
    }
    front.innerHTML = tufts + litter;

    if (sc.on) sc.on(l => {
      for (const c of clouds) {
        const x = ((c.x0 + l * c.sp) % (W + 320)) - 160;
        c.g.setAttribute('transform', `translate(${f1(x)} ${f1(c.y)}) scale(${f3(c.s)})`);
      }
    });
    return { svg, root: svg, props, actors, fx, front, gy, clouds, $, W, H: Hh, gyBase };
  };

  /* ---------------- 葡萄架 ---------------- */
  // o: {x, y (地面), w, h, seed} —— 返回 markup；葡萄串单独用 SB.bunchG 建，好摇
  SB.arbor = function (o = {}) {
    const x = o.x || 900, y = o.y || 520, w = o.w || 360, h = o.h || 300, seed = o.seed || 1;
    const L = x - w / 2, R = x + w / 2, top = y - h;
    const post = px => SB.P(`M${px - 11} ${y + 6} L${px - 8} ${top + 6} L${px + 8} ${top + 6} L${px + 11} ${y + 6} Z`, COL.wood, { seed: px, amp: 1.6, step: 14, stroke: COL.wood2, sw: 1.6 });
    let s = post(L) + post(R);
    // 横梁 + 斜撑
    s += SB.P(`M${L - 26} ${top + 2} L${R + 26} ${top - 6} L${R + 26} ${top + 12} L${L - 26} ${top + 20} Z`, COL.wood2, { seed: seed + 3, amp: 1.8, step: 18 });
    s += SB.P(`M${L - 14} ${top + 26} L${R + 14} ${top + 18}`, 'none', { stroke: COL.wood, sw: 6, seed: seed + 4, amp: 1.6, step: 18 });
    // 藤：沿横梁绕几圈
    for (let i = 0; i < 5; i++) {
      const px = L + (R - L) * (i + .5) / 5;
      s += SB.P(`M${px - 26} ${top + 24} Q${px - 8} ${top + 4} ${px + 4} ${top + 26} Q${px + 16} ${top + 44} ${px + 30} ${top + 24}`, 'none',
        { stroke: COL.vine, sw: 3.4, seed: seed * 3 + i, amp: 1.4, step: 12 });
    }
    // 叶子
    const leafD = (lx, ly, r, rot, col, sd) => `<g transform="translate(${f1(lx)} ${f1(ly)}) rotate(${f1(rot)})">`
      + SB.P(`M0 0 Q${-r * .9} ${-r * .5} ${-r * .2} ${-r * 1.15} Q${r * .5} ${-r * 1.5} ${r * .95} ${-r * .6} Q${r * 1.1} ${r * .2} 0 0 Z`, col, { seed: sd, amp: 1.5, step: 11 })
      + SB.P(`M0 0 Q${r * .2} ${-r * .55} ${r * .15} ${-r * .95}`, 'none', { stroke: '#5b8c3c', sw: 1.4, op: .7, seed: sd + 1, amp: .8, step: 9 }) + '</g>';
    for (let i = 0; i < 9; i++) {
      const u = H(seed * 13 + i), lx = L + 8 + (R - L - 16) * ((i + .5) / 9) + 16 * (H(seed + i) - .5);
      const ly = top + 16 + 26 * H(seed * 5 + i);
      s += leafD(lx, ly, 20 + 12 * u, -40 + 90 * H(seed * 7 + i), u > .5 ? COL.leaf : COL.leaf2, seed * 2 + i);
    }
    return s;
  };

  // 一串葡萄的 markup（局部坐标：挂点在 0,0，往下长）
  SB.bunch = function (o = {}) {
    const s = o.s == null ? 1 : o.s, seed = o.seed || 1, rows = o.rows || 5;
    let d = SB.P(`M0 0 Q${2 * s} ${8 * s} ${-1 * s} ${16 * s}`, 'none', { stroke: COL.vine, sw: 3 * s, seed: seed, amp: 1, step: 8 });
    let i = 0;
    for (let r = 0; r < rows; r++) {
      const n = Math.max(1, rows - r), y = 16 * s + r * 17 * s;
      for (let c = 0; c < n; c++, i++) {
        const x = (c - (n - 1) / 2) * 17 * s + (H(seed * 3 + i) - .5) * 4 * s;
        const rr = (9.6 + 1.6 * H(seed * 5 + i)) * s;
        d += SB.P(SB.E(x, y + (H(seed * 7 + i) - .5) * 3 * s, rr, rr * .96), H(seed * 11 + i) > .78 ? COL.grapeHi : (r % 2 ? COL.grape2 : COL.grape),
          { seed: seed * 17 + i, amp: 1.1, step: 8 });
      }
    }
    // 高光：左上几颗点一下
    d += SB.P(SB.E(-6 * s, 22 * s, 3.4 * s, 2.4 * s, -25), '#D9C6EE', { seed: seed + 2, amp: .6, step: 6, op: .8 });
    d += SB.P(SB.E(7 * s, 40 * s, 3 * s, 2.1 * s, -25), '#D9C6EE', { seed: seed + 3, amp: .6, step: 6, op: .7 });
    // 一两片叶子挡在串子上头
    d += `<g transform="translate(${f1(-14 * s)} ${f1(10 * s)}) rotate(-28)">`
      + SB.P(`M0 0 Q${-16 * s} ${-9 * s} ${-4 * s} ${-21 * s} Q${9 * s} ${-27 * s} ${17 * s} ${-11 * s} Q${20 * s} ${3 * s} 0 0 Z`, COL.leaf, { seed: seed * 4, amp: 1.4, step: 10 }) + '</g>';
    return d;
  };
  // 可摇的一串：update(l, {swing, lift}) —— swing 是角度
  SB.bunchG = function (parent, o = {}) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'sb-bunch');
    g.innerHTML = SB.bunch(o);
    const holder = document.createElementNS(NS, 'g');
    holder.appendChild(g); parent.appendChild(holder);
    const x = o.x || 0, y = o.y || 0;
    return {
      g, holder,
      update(l, st = {}) {
        const sw = st.swing == null ? Math.sin(l * 1.6 + (o.seed || 1)) * 1.6 : st.swing;
        holder.setAttribute('transform', `translate(${f1(x + (st.dx || 0))} ${f1(y + (st.dy || 0))}) rotate(${f1(sw)})`);
        if (st.opacity != null) holder.setAttribute('opacity', f3(st.opacity));
      },
    };
  };

  /* ---------------- 小东西 ---------------- */
  SB.butterfly = function (sc, parent, o = {}) {
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'sb-bfly');
    const col = o.color || '#F6D06A';
    g.innerHTML = `<g class="w1">${SB.P('M0 0 Q-13 -13 -7 -21 Q0 -25 1 -12 Z', col, { seed: 2, amp: .9, step: 7 })}</g>`
      + `<g class="w2">${SB.P('M0 0 Q13 -12 8 -20 Q1 -24 -1 -11 Z', '#F2B84B', { seed: 3, amp: .9, step: 7 })}</g>`
      + SB.P('M0 0 L1 7', 'none', { stroke: COL.ink, sw: 2, raw: true });
    parent.appendChild(g);
    const w1 = g.querySelector('.w1'), w2 = g.querySelector('.w2');
    const path = o.path || (l => [200 + l * 60, 300 + Math.sin(l * 1.7) * 40]);
    if (sc.on) sc.on(l => {
      const p = path(l), f = Math.sin(l * 16 + (o.phase || 0));
      g.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])}) scale(${f3((o.scale || 1) * (p[2] == null ? 1 : p[2]))})`);
      w1.setAttribute('transform', `scale(${f3(.5 + .5 * Math.abs(f))} 1)`);
      w2.setAttribute('transform', `scale(${f3(.5 + .5 * Math.abs(-f))} 1)`);
      if (o.opacity) g.setAttribute('opacity', f3(o.opacity(l)));
    });
    return g;
  };

  // 落地／起跳扬起的尘土：一簇小圈，纯函数
  SB.puff = function (parent, o = {}) {
    const g = document.createElementNS(NS, 'g');
    const n = o.n || 7, seed = o.seed || 1;
    g.innerHTML = Array.from({ length: n }, (_, i) => SB.P(SB.E(0, 0, 8 + 6 * H(seed + i), 6 + 4 * H(seed * 2 + i)), o.color || '#E3CDA6', { seed: seed * 3 + i, amp: 1.1, step: 8 })).join('');
    parent.appendChild(g);
    const kids = [...g.children];
    return {
      g,
      // u: 0→1 生命周期
      update(u, x, y, scale = 1) {
        const a = clamp(u);
        g.setAttribute('opacity', f3(a < .001 ? 0 : (1 - a) * .85));
        kids.forEach((k, i) => {
          const dir = (H(seed * 5 + i) - .5) * 2, up = .3 + .7 * H(seed * 7 + i);
          const dx = dir * 70 * a * scale, dy = -up * 42 * a * scale + 26 * a * a * scale;
          k.setAttribute('transform', `translate(${f1(x + dx)} ${f1(y + dy)}) scale(${f3((.45 + 1.1 * a) * scale)})`);
        });
      },
    };
  };

  // 汗珠（用力/着急）：从头顶两侧甩出去
  SB.sweat = (x, y, u, side = 1) => {
    const a = clamp(u); if (a <= 0 || a >= 1) return '';
    return SB.P(SB.E(x + side * (14 + 26 * a), y - 10 - 18 * a + 30 * a * a, 4.2, 6), '#8FC7E8', { seed: 9, amp: .7, step: 6, op: (1 - a) });
  };
  // 眼冒金星（挫败）
  SB.stars = (x, y, l, n = 3) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = l * 3 + i * 6.283 / n, r = 24;
      const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * .45;
      s += SB.P(`M${sx} ${sy - 7} L${sx + 2} ${sy - 2} L${sx + 7} ${sy} L${sx + 2} ${sy + 2} L${sx} ${sy + 7} L${sx - 2} ${sy + 2} L${sx - 7} ${sy} L${sx - 2} ${sy - 2} Z`,
        '#F7C65B', { seed: 30 + i, amp: .5, step: 5 });
    }
    return s;
  };

  /* ---------------- 绘本卡片（角落里的小说明） ---------------- */
  SB.card = function (sc, title, sub, o = {}) {
    const x = o.x == null ? 92 : o.x, y = o.y == null ? 96 : o.y, w = o.w || 250, h = o.h || 104;
    const g = sc.html(`<div class="sb-card" style="left:${x}px;top:${y}px;width:${w}px;padding:15px 19px;box-sizing:border-box;`
      + `background:${COL.white};border-radius:16px;box-shadow:0 10px 24px rgba(120,95,70,.2);`
      + `font-family:'Noto Sans SC',sans-serif;color:${COL.ink};opacity:0">`
      + `<div style="font-size:27px;font-weight:800;letter-spacing:.04em">${title}</div>`
      + (sub ? `<div style="font-size:16px;opacity:.72;margin-top:5px;line-height:1.5">${sub}</div>` : '')
      + `</div>`);
    const at = o.at || 0, out = o.out == null ? at + 3.2 : o.out, rot = o.rot == null ? -2 : o.rot;
    sc.on(l => {
      const a = sm((l - at) / .45) * (1 - sm((l - out) / .4));
      g.style.opacity = f3(a);
      g.style.transform = `rotate(${rot}deg) translateY(${f1((1 - a) * 12)}px) scale(${f3(.96 + .04 * a)})`;
    });
    return g;
  };

  /* ---------------- 骨骼角色外壳 ---------------- */
  // 和 papercut 的 WS.char 同思路：每块图形是独立的 <g>，直接吃自己骨头的 root-local 矩阵，
  // 所以画的前后顺序（z）和骨骼父子关系完全解耦（远侧的腿在身体后面，近侧的在前面）。
  SB.char = function (parent, def) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'sb-char ' + (def.cls || ''));
    if (def.filter !== false) g.setAttribute('filter', `url(#${def.filter || 'sb-crayon-s'})`);
    const inner = document.createElementNS(NS, 'g'); g.appendChild(inner);
    const pieces = [...def.pieces].map((p, i) => ({ ...p, i })).sort((a, b) => (a.z - b.z) || (a.i - b.i));
    inner.innerHTML = pieces.map(p => `<g class="sb-piece ${p.cls || ''}" data-b="${p.bone}">${p.svg}</g>`).join('');
    parent.appendChild(g);
    const pieceEls = [...inner.children].map((el, i) => ({ el, bone: pieces[i].bone, last: '' }));
    const rig = vk.rig({ root: inner, el: () => null, bones: def.bones, clips: def.clips, ik: def.ik, defaults: def.defaults });
    const M = vk.rig.mat, order = rig.bones;
    function mats(pose) {
      const out = {};
      for (const b of order) out[b.id] = M.mul(b.parent ? out[b.parent] : M.id(), rig.local(b.id, pose));
      return out;
    }
    function apply(pose, root) {
      rig.apply(pose, root);
      const m = mats(pose);
      for (const p of pieceEls) {
        const k = m[p.bone]; if (!k) continue;
        const s = `matrix(${f3(k[0])} ${f3(k[1])} ${f3(k[2])} ${f3(k[3])} ${f1(k[4])} ${f1(k[5])})`;
        if (s !== p.last) { p.last = s; p.el.setAttribute('transform', s); }
      }
      return m;
    }
    return { g, inner, rig, apply, mats, point: (b, x, y, pose, root) => rig.point(b, x, y, pose, root), q: s => g.querySelector(s), qa: s => [...g.querySelectorAll(s)] };
  };
})();
