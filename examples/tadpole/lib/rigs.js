// 小蝌蚪找妈妈 — character rigs (SVG, posed every frame by pure functions of time).
// Each rig: TP.X(parent, opts) → { g, set(state) }. Local coordinates: see each rig; x grows to the right, facing via `face` (±1).
(function () {
  const TP = window.TP = window.TP || {};
  const A = vk.attr, H = vk.hash, INK = '#1f2529', f1 = x => Math.round(x * 100) / 100;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (parent, markup, cls) => { const g = document.createElementNS(NS, 'g'); if (cls) g.setAttribute('class', cls); g.innerHTML = markup; parent.appendChild(g); return g; };
  const q = (g, s) => g.querySelector(s);
  // blink: 0 open … 1 closed, every ~3–4 s with a per-character offset
  TP.blink = (t, seed = 0) => { const per = 3.1 + H(seed) * 1.4, p = ((t + H(seed + 1) * per) % per) / per * per; return p < .14 ? Math.sin(p / .14 * Math.PI) : 0; };
  const eyeMarkup = (cls, x, y, r, pr) => `<g class="${cls}" transform="translate(${x} ${y})"><g class="ey"><circle r="${r}" fill="#fbfaf2" stroke="${INK}" stroke-width="${f1(r * .28)}"/><circle class="pu" r="${pr}" fill="${INK}"/><circle class="hl" r="${f1(pr * .38)}" cx="${f1(-pr * .35)}" cy="${f1(-pr * .4)}" fill="#fff"/></g><path class="hap" d="M${-r * .8},${r * .15} Q0,${-r * .9} ${r * .8},${r * .15}" fill="none" stroke="${INK}" stroke-width="${f1(r * .32)}" stroke-linecap="round" opacity="0"/></g>`;
  // pose an eye group: look [dx,dy] in −1..1, blink 0..1, happy 0..1 (^ arc), wide (scale)
  function poseEye(g, r, o) {
    const ey = g.__ey || (g.__ey = { e: q(g, '.ey'), p: q(g, '.pu'), h: q(g, '.hl'), a: q(g, '.hap') });
    const cl = Math.max(o.blink || 0, (o.happy || 0) > .5 ? 1 : 0), sy = Math.max(.08, 1 - cl) * (o.wide || 1);
    A(ey.e, { transform: `scale(${f1(o.wide || 1)} ${f1(sy)})`, opacity: (o.happy || 0) > .5 ? 0 : 1 });
    const lx = (o.look ? o.look[0] : 0) * r * .38, ly = (o.look ? o.look[1] : 0) * r * .38;
    A(ey.p, { cx: lx, cy: ly }); A(ey.h, { cx: lx - r * .15, cy: ly - r * .18 });
    A(ey.a, { opacity: (o.happy || 0) > .5 ? 1 : 0 });
  }
  TP.poseEye = poseEye;

  /* ================================================================ tadpole (head centre = origin, faces +x) */
  TP.tadpole = function (parent, o = {}) {
    const g = el(parent, `
      <ellipse class="halo" cx="-2" cy="0" rx="17" ry="13" fill="url(#tp-halo)"/>
      <path class="tail" fill="${INK}" opacity=".88"/>
      <g class="legs" opacity="0"><path class="lb" d="M-5,4 Q-13,12 -19,9 L-24,12 M-19,9 L-23,6" fill="none" stroke="#3f5f36" stroke-width="2.6" stroke-linecap="round"/><path class="lb2" d="M-3,5 Q-9,14 -14,12 L-18,15" fill="none" stroke="#3f5f36" stroke-width="2.2" stroke-linecap="round" opacity=".7"/></g>
      <path class="hd" d="M11,0 C11,-7 5,-9 -1,-8.6 C-7,-8.2 -10.5,-4 -10.5,0 C-10.5,5 -6,8.2 0,8.4 C6,8.6 11,6 11,0Z" fill="url(#tp-tad)"/>
      <path class="hg" d="M11,0 C11,-7 5,-9 -1,-8.6 C-7,-8.2 -10.5,-4 -10.5,0 C-10.5,5 -6,8.2 0,8.4 C6,8.6 11,6 11,0Z" fill="url(#tp-frog)" stroke="${INK}" stroke-width="1.1" opacity="0"/>
      <ellipse class="bel" cx="3" cy="4.6" rx="6.2" ry="2.8" fill="#f1efe2" opacity="0"/>
      <g class="arms" opacity="0"><path d="M4,6 Q3,11 6.5,12.5" fill="none" stroke="#3f5f36" stroke-width="2.2" stroke-linecap="round"/></g>
      <circle class="ck" cx="6" cy="3" r="1.9" fill="#d9826b" opacity=".45"/>
      ${eyeMarkup('e1', 3.2, -4.6, 3.1, 1.75)}${eyeMarkup('e2', 8.2, -3.4, 2.5, 1.4)}
      <path class="mo" d="M7.6,3.3 Q9.1,4.6 10.6,3.3" fill="none" stroke="#f1efe2" stroke-width="1.1" stroke-linecap="round"/>
      <ellipse class="mo2" cx="9" cy="3.8" rx="1.7" ry="0" fill="#5a2a22" stroke="#f1efe2" stroke-width=".6"/>`, 'tad');
    const E = { tail: q(g, '.tail'), legs: q(g, '.legs'), arms: q(g, '.arms'), hg: q(g, '.hg'), bel: q(g, '.bel'), e1: q(g, '.e1'), e2: q(g, '.e2'), mo: q(g, '.mo'), mo2: q(g, '.mo2'), halo: q(g, '.halo') };
    g.setAttribute('filter', 'url(#ink-wob)');
    return {
      g,
      set(s) {
        if (s.opacity != null && s.opacity <= .001) { A(g, { opacity: 0 }); return; }
        // face: +1 right … −1 left (continuous: passing 0 reads as a turn); tilt: degrees, + = nose down
        const sc = s.scale || 1, face = s.face != null ? s.face : 1;
        A(g, { opacity: s.opacity != null ? s.opacity : 1, transform: `translate(${f1(s.x)} ${f1(s.y)}) scale(${f1(sc * face)} ${f1(sc)}) rotate(${f1(s.tilt || 0)})` });
        const L = 30 * (s.tail != null ? s.tail : 1), amp = s.amp != null ? s.amp : 3, ph = s.phase || 0;
        if (L > .8) {
          const pts = vk.sampleLine(u => [-7 - u * L, amp * Math.sin(ph - u * 5.2) * Math.pow(u, 1.15) + (s.bend || 0) * u * u * 8], 11);
          A(E.tail, { d: vk.brushPath(pts, u => 9.5 * Math.pow(1 - u, .75) + .5), opacity: .88 });
        } else A(E.tail, { opacity: 0 });
        A(E.legs, { opacity: f1(Math.min(1, (s.legs || 0) * 1.5)), transform: `translate(-5 4) scale(${f1(s.legs || 0)}) translate(5 -4) rotate(${f1(Math.sin(ph * .5) * 6 * (s.legs || 0))} -5 4)` });
        A(E.arms, { opacity: f1(Math.min(1, (s.arms || 0) * 1.5)), transform: `translate(4 6) scale(${f1(s.arms || 0)}) translate(-4 -6)` });
        A(E.hg, { opacity: f1(s.green || 0) }); A(E.bel, { opacity: f1((s.green || 0) * .9) });
        const eo = { look: s.look, blink: s.blink, happy: s.happy, wide: s.wide };
        poseEye(E.e1, 3.1, eo); poseEye(E.e2, 2.5, eo);
        const tk = s.talk || 0;
        A(E.mo, { opacity: tk > .05 ? 0 : 1 }); A(E.mo2, { ry: f1(tk * 2.4) });
      },
    };
  };

  /* ================================================================ frog (sitting; origin = ground under the body, faces +x) */
  TP.frog = function (parent, o = {}) {
    const g = el(parent, `
      <g class="bl"><ellipse cx="-20" cy="-15" rx="23" ry="13" transform="rotate(-18 -20 -15)" fill="url(#tp-frog)" stroke="${INK}" stroke-width="2"/>
        <path class="shin" d="M-4,-4 C-18,-2 -34,-1 -44,-3" fill="none" stroke="#557d45" stroke-width="7" stroke-linecap="round"/><path d="M-44,-3 l-9,-4 M-44,-3 l-10,1 M-44,-3 l-8,5" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></g>
      <path class="bd" d="M-34,-8 C-41,-30 -22,-54 4,-55 C24,-56 38,-45 40,-31 C42,-16 31,-4 11,-2 C-8,0 -28,0 -34,-8Z" fill="url(#tp-frog)" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
      <g fill="#3f5f36" opacity=".55"><ellipse cx="-12" cy="-34" rx="5" ry="3.4"/><ellipse cx="-22" cy="-22" rx="3.6" ry="2.6"/><ellipse cx="0" cy="-44" rx="3.4" ry="2.4"/><ellipse cx="-4" cy="-24" rx="2.6" ry="2"/></g>
      <path class="belly" d="M10,-4 C26,-6 37,-16 38,-28 C30,-22 18,-18 6,-18 C0,-12 2,-6 10,-4Z" fill="#f1efe2" stroke="${INK}" stroke-opacity=".35" stroke-width="1"/>
      <ellipse class="sac" cx="30" cy="-19" rx="0" ry="0" fill="#f3f1e4" stroke="${INK}" stroke-width="1" opacity=".95"/>
      <g class="arm"><path d="M20,-14 C24,-9 25,-5 27,-1" fill="none" stroke="${INK}" stroke-width="7.5" stroke-linecap="round"/><path d="M20,-14 C24,-9 25,-5 27,-1" fill="none" stroke="#6f9a58" stroke-width="4.6" stroke-linecap="round"/><path d="M27,-1 l6,0 M27,-1 l4,3 M27,-1 l-1,3" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/></g>
      <circle cx="31" cy="-37" r="3.2" fill="#d9826b" opacity=".45"/>
      <path class="mo" fill="#5a2a22" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <g class="eb"><circle cx="12" cy="-50" r="9" fill="url(#tp-frog)" stroke="${INK}" stroke-width="1.8"/></g>
      ${eyeMarkup('e2', 12, -52, 6.2, 3.4)}
      <circle cx="26" cy="-50" r="10.5" fill="url(#tp-frog)" stroke="${INK}" stroke-width="2"/>
      ${eyeMarkup('e1', 27, -52, 7.4, 4)}
      <path class="brow" d="M21,-62 Q27,-65 33,-62" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" opacity="0"/>`, 'frog');
    g.setAttribute('filter', 'url(#ink-wob)');
    const E = { bl: q(g, '.bl'), mo: q(g, '.mo'), sac: q(g, '.sac'), e1: q(g, '.e1'), e2: q(g, '.e2'), arm: q(g, '.arm') };
    return {
      g,
      set(s) {
        if (s.opacity != null && s.opacity <= .001) { A(g, { opacity: 0 }); return; }
        const sc = s.scale || 1, j = s.jump || 0, face = s.face || 1;
        A(g, { opacity: s.opacity != null ? s.opacity : 1, transform: `translate(${f1(s.x)} ${f1(s.y)}) rotate(${f1((s.rot || 0) - j * 18 * face)}) scale(${f1(sc * face)} ${f1(sc * (1 + j * .08 - (s.squash || 0) * .12))})` });
        A(E.bl, { transform: `rotate(${f1(j * 38)} -8 -10) translate(${f1(-j * 10)} ${f1(j * 6)})` });
        A(E.arm, { transform: `rotate(${f1(-j * 30 + (s.wave || 0) * -70)} 20 -14)` });
        const tk = s.talk || 0, open = Math.max(tk, s.croak ? s.croak * .3 : 0), smile = s.smile != null ? s.smile : 1;
        A(E.mo, { d: `M39,-30 Q${f1(28)},${f1(-23 + 3 * smile + open * 10)} 13,${f1(-29 - 2 * smile)} Q28,${f1(-27 + smile * 2 + open * 1)} 39,-30Z` });
        const cs = s.croak || 0; A(E.sac, { rx: f1(cs * 12), ry: f1(cs * 10) });
        const eo = { look: s.look, blink: s.blink, happy: s.happy, wide: s.wide }; poseEye(E.e1, 7.4, eo); poseEye(E.e2, 6.2, eo);
      },
    };
  };

  /* ================================================================ duck (swimming, origin = waterline under the body, faces −x) */
  TP.duck = function (parent, o = {}) {
    const g = el(parent, `
      <g class="feet" opacity=".62"><path class="f1" d="M4,6 L4,22 M4,22 l-9,3 l4,-5 l-4,-3 z" stroke="#c9822f" stroke-width="2.4" fill="#d99a3c" stroke-linejoin="round"/><path class="f2" d="M16,6 L16,20 M16,20 l-8,3 l3,-5 l-3,-3 z" stroke="#c9822f" stroke-width="2.2" fill="#d99a3c" opacity=".7"/></g>
      <path d="M-30,-6 C-34,-24 -10,-31 14,-27 C30,-25 40,-23 47,-35 C50,-20 45,-4 31,4 C10,10 -22,8 -30,-6Z" fill="#b8925f" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M-4,-18 C10,-27 28,-24 38,-15 C26,-8 8,-6 -4,-18Z" fill="#80613e" stroke="${INK}" stroke-width="1.6"/>
      <path d="M6,-17 l18,-2 M10,-13 l20,-1 M28,-20 l10,4" stroke="#f0e6d0" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>
      <path d="M-26,-4 C-12,2 10,2 30,-2" stroke="#e9dfc6" stroke-width="2" fill="none" opacity=".6"/>
      <g class="hd">
        <path d="M-35,-11 C-41,-27 -41,-36 -35,-45 L-22,-41 C-24,-31 -22,-22 -17,-15Z" fill="#9b7549" stroke="${INK}" stroke-width="2"/>
        <circle cx="-33" cy="-47" r="15" fill="#9b7549" stroke="${INK}" stroke-width="2.2"/>
        <path d="M-47,-49 C-40,-51 -30,-49 -22,-45" stroke="#4a3522" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>
        <circle cx="-40" cy="-42" r="3" fill="#d9826b" opacity=".5"/>
        <g class="lo"><path d="M-46,-43 C-53,-42 -59,-42 -62,-40 C-57,-37 -51,-37 -46,-39Z" fill="#d9a441" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>
        <path d="M-46,-49 C-55,-49 -61,-46 -64,-42 C-58,-41 -51,-41 -46,-43Z" fill="#e3b04c" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        ${eyeMarkup('e1', -37, -51, 4.4, 2.5)}
        <path class="brow" d="M-42,-58 Q-37,-60 -32,-58" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
      </g>`, 'duck');
    g.setAttribute('filter', 'url(#ink-wob)');
    const E = { hd: q(g, '.hd'), lo: q(g, '.lo'), e1: q(g, '.e1'), f1: q(g, '.f1'), f2: q(g, '.f2'), brow: q(g, '.brow') };
    return {
      g,
      set(s) {
        const sc = s.scale || 1, face = s.face || 1;
        A(g, { opacity: s.opacity != null ? s.opacity : 1, transform: `translate(${f1(s.x)} ${f1(s.y + (s.bob || 0))}) scale(${f1(sc * face)} ${f1(sc)}) rotate(${f1(s.rot || 0)})` });
        A(E.hd, { transform: `rotate(${f1(s.nod || 0)} -24 -18)` });
        A(E.lo, { transform: `rotate(${f1(-(s.talk || 0) * 22)} -46 -41)` });
        poseEye(E.e1, 4.4, { look: s.look, blink: s.blink, happy: s.happy });
        A(E.brow, { d: s.brow === 'up' ? 'M-42,-60 Q-37,-63 -32,-60' : 'M-42,-58 Q-37,-60 -32,-58' });
        const p = s.paddle || 0; A(E.f1, { transform: `rotate(${f1(Math.sin(p) * 28)} 4 6)` }); A(E.f2, { transform: `rotate(${f1(-Math.sin(p) * 28)} 16 6)` });
      },
    };
  };
  TP.duckling = function (parent) {
    const g = el(parent, `
      <path class="ft" d="M2,4 L2,13 l-5,2 l2,-3 l-2,-2z" stroke="#c9822f" stroke-width="1.6" fill="#d99a3c" opacity=".6"/>
      <path d="M-11,-3 C-13,-14 -2,-17 6,-15 C12,-14 15,-12 17,-17 C18,-8 15,-1 8,2 C0,5 -9,4 -11,-3Z" fill="#e8c65a" stroke="${INK}" stroke-width="1.6"/>
      <path d="M0,-10 C5,-13 10,-11 12,-7" stroke="#b8963a" stroke-width="1.4" fill="none"/>
      <circle cx="-9" cy="-19" r="7.5" fill="#edce64" stroke="${INK}" stroke-width="1.6"/>
      <path class="bk" d="M-15,-20 L-21,-18 L-15,-16Z" fill="#e39a3c" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
      <circle cx="-11" cy="-21" r="1.5" fill="${INK}"/><circle cx="-12" cy="-16.5" r="1.5" fill="#d9826b" opacity=".6"/>`, 'duckling');
    g.setAttribute('filter', 'url(#ink-wob)');
    return { g, set(s) { A(g, { opacity: s.opacity != null ? s.opacity : 1, transform: `translate(${f1(s.x)} ${f1(s.y + (s.bob || 0))}) scale(${f1((s.scale || 1) * (s.face || 1))} ${f1(s.scale || 1)}) rotate(${f1(s.rot || 0)})` }); } };
  };

  /* ================================================================ goldfish (origin = body centre, faces −x) */
  TP.goldfish = function (parent) {
    const g = el(parent, `
      <path class="t1" fill="#e5824f" opacity=".6" stroke="#b44a2a" stroke-opacity=".5" stroke-width="1.2"/>
      <path class="t2" fill="#ec9a64" opacity=".5" stroke="#b44a2a" stroke-opacity=".4" stroke-width="1.1"/>
      <path class="df" fill="#e5824f" opacity=".75" stroke="${INK}" stroke-opacity=".6" stroke-width="1.3"/>
      <ellipse cx="0" cy="0" rx="36" ry="26" fill="url(#tp-fish)" stroke="${INK}" stroke-width="2.2"/>
      <g fill="none" stroke="#9c3f24" stroke-width="1.1" opacity=".55"><path d="M-6,-14 q6,5 0,10 M4,-16 q6,5 0,10 M14,-14 q6,5 0,10 M-2,0 q6,5 0,10 M8,-2 q6,5 0,10 M18,-2 q5,4 0,9"/></g>
      <path d="M-30,10 C-18,20 10,22 28,10" stroke="#f8d7b8" stroke-width="3" fill="none" opacity=".6"/>
      <path class="pf" d="M-6,10 C-2,20 6,24 12,22 C8,18 4,14 -6,10Z" fill="#ec9a64" stroke="${INK}" stroke-opacity=".6" stroke-width="1.1"/>
      <ellipse class="mo" cx="-36" cy="4" rx="2.8" ry="2" fill="#7a2a1a" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="-24" cy="6" r="3.5" fill="#f0a0a0" opacity=".5"/>
      <g><circle cx="-12" cy="-24" r="9" fill="#e27a45" stroke="${INK}" stroke-width="1.8"/></g>
      ${eyeMarkup('e2', -12, -27, 5.6, 3.3)}
      <circle cx="-24" cy="-20" r="11.5" fill="#e27a45" stroke="${INK}" stroke-width="2"/>
      ${eyeMarkup('e1', -25, -22, 7.2, 4.2)}
      <path class="brow" d="M-32,-33 Q-25,-36 -18,-33" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`, 'goldfish');
    g.setAttribute('filter', 'url(#ink-wob)');
    const E = { t1: q(g, '.t1'), t2: q(g, '.t2'), df: q(g, '.df'), pf: q(g, '.pf'), mo: q(g, '.mo'), e1: q(g, '.e1'), e2: q(g, '.e2'), brow: q(g, '.brow') };
    const fin = (t, off, len, spread) => { const pts = vk.sampleLine(u => [34 + u * len, spread * u + Math.sin(t * 3 + off - u * 3) * 9 * u], 9); return vk.brushPath(pts, u => 6 + 26 * Math.sin(Math.PI * Math.min(1, u * 1.05)) * (1 - u * .3)); };
    return {
      g,
      set(s) {
        const t = s.t || 0, sc = s.scale || 1, face = s.face || 1;
        A(g, { opacity: s.opacity != null ? s.opacity : 1, transform: `translate(${f1(s.x)} ${f1(s.y)}) scale(${f1(sc * face)} ${f1(sc)}) rotate(${f1(s.rot || 0)})` });
        A(E.t1, { d: fin(t, 0, 58, -14) }); A(E.t2, { d: fin(t, 1.3, 54, 16) });
        A(E.df, { d: `M-10,-24 C0,${f1(-44 + Math.sin(t * 2.4) * 3)} 22,${f1(-40 + Math.sin(t * 2.4 + 1) * 3)} 30,-14 C18,-20 6,-24 -10,-24Z` });
        A(E.pf, { transform: `rotate(${f1(Math.sin(t * 5) * 18)} -6 10)` });
        const breathe = .3 + .3 * Math.sin(t * 2.6), tk = s.talk || 0;
        A(E.mo, { rx: f1(2.4 + tk * 1.6), ry: f1(1.4 + Math.max(breathe * .6, tk * 4)) });
        const eo = { look: s.look, blink: s.blink, happy: s.happy, wide: s.wide }; poseEye(E.e1, 7.2, eo); poseEye(E.e2, 5.6, eo);
        A(E.brow, { d: s.brow === 'tilt' ? 'M-33,-31 Q-26,-37 -19,-35' : 'M-32,-33 Q-25,-36 -18,-33' });
      },
    };
  };

  /* ================================================================ white goose (swimming, origin = waterline, faces −x) */
  TP.goose = function (parent) {
    const g = el(parent, `
      <g class="feet" opacity=".62"><path class="f1" d="M4,6 L4,26 M4,26 l-11,3 l5,-6 l-5,-4 z" stroke="#c9622f" stroke-width="2.6" fill="#e0823f" stroke-linejoin="round"/><path class="f2" d="M20,6 L20,24 M20,24 l-10,3 l4,-6 l-4,-3 z" stroke="#c9622f" stroke-width="2.4" fill="#e0823f" opacity=".7"/></g>
      <path d="M-40,-4 C-46,-27 -16,-39 18,-35 C40,-33 54,-31 63,-46 C66,-27 61,-6 43,4 C14,12 -30,10 -40,-4Z" fill="#f6f4ec" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M-8,-22 C8,-33 34,-31 50,-20 C34,-12 10,-10 -8,-22Z" fill="#e3e1d6" stroke="${INK}" stroke-width="1.5"/>
      <path d="M8,-22 l24,-3 M12,-17 l26,-1 M36,-24 l12,4" stroke="#9aa09a" stroke-width="1.1" opacity=".7" stroke-linecap="round"/>
      <g class="hd">
        <path d="M-37,-14 C-52,-40 -31,-62 -46,-86 L-33,-90 C-19,-63 -38,-42 -22,-19Z" fill="#f6f4ec" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
        <ellipse cx="-43" cy="-93" rx="14" ry="11" fill="#f6f4ec" stroke="${INK}" stroke-width="2.2"/>
        <circle cx="-54" cy="-100" r="4.6" fill="#c9622f" stroke="${INK}" stroke-width="1.4"/>
        <g class="lo"><path d="M-55,-89 C-62,-88 -67,-87 -70,-85 C-65,-82 -59,-83 -55,-85Z" fill="#d9763a" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/></g>
        <path d="M-54,-97 C-62,-96 -68,-92 -72,-87 C-66,-86 -59,-87 -54,-89Z" fill="#e8893f" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="-47" cy="-87" r="3" fill="#e8a1a1" opacity=".55"/>
        ${eyeMarkup('e1', -45, -96, 4.2, 2.4)}
      </g>`, 'goose');
    g.setAttribute('filter', 'url(#ink-wob)');
    const E = { hd: q(g, '.hd'), lo: q(g, '.lo'), e1: q(g, '.e1'), f1: q(g, '.f1'), f2: q(g, '.f2') };
    return {
      g,
      set(s) {
        const sc = s.scale || 1, face = s.face || 1;
        A(g, { opacity: s.opacity != null ? s.opacity : 1, transform: `translate(${f1(s.x)} ${f1(s.y + (s.bob || 0))}) scale(${f1(sc * face)} ${f1(sc)}) rotate(${f1(s.rot || 0)})` });
        A(E.hd, { transform: `rotate(${f1(s.nod || 0)} -28 -16)` });
        A(E.lo, { transform: `rotate(${f1(-(s.talk || 0) * 24)} -55 -87)` });
        poseEye(E.e1, 4.2, { look: s.look, blink: s.blink, happy: s.happy });
        const p = s.paddle || 0; A(E.f1, { transform: `rotate(${f1(Math.sin(p) * 26)} 4 6)` }); A(E.f2, { transform: `rotate(${f1(-Math.sin(p) * 26)} 20 6)` });
      },
    };
  };

  /* ================================================================ turtle (swimming, origin = shell centre bottom, faces −x) */
  TP.turtle = function (parent) {
    const flip = (cls, x, y, len, col) => `<g class="${cls}" transform="translate(${x} ${y})"><path d="M0,0 C-6,6 -${len * .6},${len * .5} -${len},${len * .55} C-${len * .7},${len * .2} -8,-2 0,0Z" fill="${col}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
    const g = el(parent, `
      ${flip('l3', -22, 2, 24, '#6f7d54')}${flip('l4', 28, 2, 20, '#6f7d54')}
      <g class="nk"><path d="M-36,-6 C-46,-10 -54,-14 -62,-12 L-60,-2 C-52,-2 -44,0 -36,2Z" fill="#8f9d6a" stroke="${INK}" stroke-width="1.8"/>
        <g class="hd"><ellipse cx="-68" cy="-10" rx="15" ry="11" fill="#95a36e" stroke="${INK}" stroke-width="2"/>
          <circle cx="-72" cy="-4" r="3.2" fill="#d9826b" opacity=".45"/>
          <path class="mo" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>
          ${eyeMarkup('e1', -71, -14, 4.6, 2.5)}
          <path class="lid" d="M-76.5,-17 Q-71,-20.5 -65.5,-17" fill="#95a36e" stroke="${INK}" stroke-width="1.4"/>
          <path d="M-78,-22 Q-71,-26 -64,-22" fill="none" stroke="#eeeede" stroke-width="2.6" stroke-linecap="round"/>
        </g></g>
      <path d="M-42,4 C-30,13 30,13 50,4 C30,9 -30,9 -42,4Z" fill="#d9cf9a" stroke="${INK}" stroke-width="1.6"/>
      <path d="M-42,4 C-40,-27 -15,-42 10,-42 C35,-42 48,-26 50,4Z" fill="url(#tp-shell)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <g fill="none" stroke="#2f3a28" stroke-width="1.4" opacity=".6"><path d="M-8,-32 L8,-36 L20,-28 L16,-14 L0,-12 L-12,-20Z M-12,-20 L-28,-14 M16,-14 L32,-6 M0,-12 L-2,2 M20,-28 L36,-22 M-8,-32 L-20,-30"/></g>
      <path d="M-40,2 C-20,6 30,6 48,2" stroke="#c8c08a" stroke-width="2" fill="none"/>
      ${flip('l1', -26, 4, 26, '#8f9d6a')}${flip('l2', 30, 4, 22, '#8f9d6a')}`, 'turtle');
    g.setAttribute('filter', 'url(#ink-wob)');
    const E = { l1: q(g, '.l1'), l2: q(g, '.l2'), l3: q(g, '.l3'), l4: q(g, '.l4'), nk: q(g, '.nk'), mo: q(g, '.mo'), e1: q(g, '.e1'), lid: q(g, '.lid') };
    return {
      g,
      set(s) {
        const sc = s.scale || 1, face = s.face || 1, p = s.paddle || 0;
        A(g, { opacity: s.opacity != null ? s.opacity : 1, transform: `translate(${f1(s.x)} ${f1(s.y)}) scale(${f1(sc * face)} ${f1(sc)}) rotate(${f1(s.rot || 0)})` });
        A(E.l1, { transform: `translate(-26 4) rotate(${f1(Math.sin(p) * 30)})` }); A(E.l2, { transform: `translate(30 4) rotate(${f1(-Math.sin(p) * 26)})` });
        A(E.l3, { transform: `translate(-22 2) rotate(${f1(-Math.sin(p) * 26)})` }); A(E.l4, { transform: `translate(28 2) rotate(${f1(Math.sin(p) * 22)})` });
        A(E.nk, { transform: `translate(${f1(-(s.neck || 0) * 8)} ${f1(s.nod || 0)})` });
        const tk = s.talk || 0;
        A(E.mo, { d: `M-80,-6 Q-74,${f1(-2 + tk * 5)} -66,-5` });
        poseEye(E.e1, 4.6, { look: s.look, blink: s.blink, happy: s.happy });
        A(E.lid, { opacity: s.happy > .5 ? 0 : 1 });
      },
    };
  };

  /* ================================================================ frog eggs (cluster around origin) */
  TP.eggs = function (parent, n = 9) {
    const P = Array.from({ length: n }, (_, i) => { const a = i * 2.4, r = 5 + Math.sqrt(i) * 11; return [Math.cos(a) * r * 1.3, Math.sin(a) * r * .9]; });
    const g = el(parent, P.map((p, i) => `<g class="egg" transform="translate(${f1(p[0])} ${f1(p[1])})"><circle r="8.5" fill="url(#tp-egg)" stroke="${INK}" stroke-opacity=".35" stroke-width="1"/><path class="em" fill="${INK}"/></g>`).join(''), 'eggs');
    const eggs = [...g.querySelectorAll('.egg')].map((e, i) => ({ e, m: q(e, '.em'), p: P[i] }));
    return {
      g, pos: P,
      // s.appear 0..1 (laid one by one), s.grow[i] 0..1 embryo → comma, s.gone[i] 0..1 (hatched), s.t wiggle time
      set(s) {
        A(g, { transform: `translate(${f1(s.x)} ${f1(s.y)}) scale(${f1(s.scale || 1)})` });
        eggs.forEach((E, i) => {
          const ap = Math.min(1, Math.max(0, (s.appear || 0) * n - i)), gr = s.grow ? s.grow(i) : 0, gone = s.gone ? s.gone(i) : 0;
          A(E.e, { opacity: f1(ap * (1 - gone)), transform: `translate(${f1(E.p[0])} ${f1(E.p[1])}) scale(${f1(.4 + .6 * ap + gone * .5)})` });
          const w = Math.sin((s.t || 0) * 9 + i) * gr * 2.5, L = 2.5 + gr * 6;
          A(E.m, { d: gr < .05 ? 'M-2.4,0 a2.4,2.4 0 1 0 4.8,0 a2.4,2.4 0 1 0 -4.8,0Z' : vk.brushPath([[3, 0], [0, 0], [-L * .5, w * .5], [-L, w]], u => 5 * (1 - u) + .6) });
        });
      },
    };
  };

  /* ================================================================ hint bubble (ink ring with a picture of the clue) */
  const ICON = {
    eyes: `<path d="M-24,12 C-24,-6 -12,-12 0,-12 C12,-12 24,-6 24,12Z" fill="#8fb36f" stroke="${INK}" stroke-width="2"/><circle cx="-10" cy="-12" r="10" fill="#fbfaf2" stroke="${INK}" stroke-width="2.4"/><circle cx="10" cy="-12" r="10" fill="#fbfaf2" stroke="${INK}" stroke-width="2.4"/><circle cx="-8" cy="-11" r="5" fill="${INK}"/><circle cx="12" cy="-11" r="5" fill="${INK}"/><circle cx="-10" cy="-13" r="1.6" fill="#fff"/><circle cx="10" cy="-13" r="1.6" fill="#fff"/>`,
    belly: `<ellipse cx="0" cy="0" rx="22" ry="20" fill="#8fb36f" stroke="${INK}" stroke-width="2"/><ellipse cx="0" cy="5" rx="14" ry="12" fill="#fbfaf2" stroke="${INK}" stroke-width="1.4"/>`,
    legs: `<ellipse cx="0" cy="-4" rx="20" ry="12" fill="#8fb36f" stroke="${INK}" stroke-width="2"/><g stroke="${INK}" stroke-width="3.6" stroke-linecap="round"><path d="M-14,4 L-19,18"/><path d="M-5,6 L-7,19"/><path d="M5,6 L7,19"/><path d="M14,4 L19,18"/></g>`,
    green: `<ellipse cx="0" cy="16" rx="26" ry="6" fill="#6f9a5a" stroke="${INK}" stroke-width="1.4"/><path d="M-20,12 C-24,-8 -10,-18 0,-18 C10,-18 24,-8 20,12Z" fill="#6f9a58" stroke="${INK}" stroke-width="2"/><path d="M-15,2 Q0,12 15,2" fill="#5a2a22" stroke="${INK}" stroke-width="1.8"/><circle cx="-8" cy="-14" r="5" fill="#fbfaf2" stroke="${INK}" stroke-width="1.6"/><circle cx="8" cy="-14" r="5" fill="#fbfaf2" stroke="${INK}" stroke-width="1.6"/><circle cx="-7" cy="-14" r="2.2" fill="${INK}"/><circle cx="9" cy="-14" r="2.2" fill="${INK}"/>`,
  };
  TP.hint = function (parent, kind) {
    const ring = vk.brushPath(vk.sampleLine(u => { const a = -1.9 + u * 6.0; return [Math.cos(a) * 40, Math.sin(a) * 36]; }, 40), u => 1.5 + 4.5 * Math.sin(Math.PI * u));
    const g = el(parent, `<circle class="d1" r="4" fill="#f3f1e4" stroke="${INK}" stroke-width="1.4"/><circle class="d2" r="6.5" fill="#f3f1e4" stroke="${INK}" stroke-width="1.5"/>
      <g class="bb"><ellipse rx="40" ry="36" fill="#f3f1e4" opacity=".94"/><path d="${ring}" fill="${INK}" opacity=".85"/><g transform="scale(.95)">${ICON[kind]}</g></g>`, 'hint');
    g.setAttribute('filter', 'url(#ink-wob)');
    const d1 = q(g, '.d1'), d2 = q(g, '.d2'), bb = q(g, '.bb');
    return {
      g,
      // s: {x, y (bubble centre), fx, fy (speaker point), p (0..1 appear)}
      set(s) {
        const p = s.p || 0; if (p <= .001) { A(g, { opacity: 0 }); return; }
        A(g, { opacity: f1(Math.min(1, p * 1.4)) });
        const e = 1 - Math.pow(1 - p, 3), sc = .6 + .4 * e + Math.sin(p * Math.PI) * .06;
        A(bb, { transform: `translate(${f1(s.x)} ${f1(s.y)}) scale(${f1(sc * (s.scale || 1))})` });
        A(d1, { cx: f1(s.fx + (s.x - s.fx) * .25), cy: f1(s.fy + (s.y - s.fy) * .25) }); A(d2, { cx: f1(s.fx + (s.x - s.fx) * .52), cy: f1(s.fy + (s.y - s.fy) * .52) });
      },
    };
  };
})();
