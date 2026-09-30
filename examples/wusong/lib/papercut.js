// 剪纸 (paper-cut) character kit for 《武松打虎》 — shared by the Wu Song and tiger rigs and the film.
//   WS.cut(d, {step, amp, seed})  scissor-cut outline: samples an SVG path (absolute M…Z sub-paths) into a polygon
//                                 whose vertices wobble along the normal (seeded, computed once at setup → static)
//   WS.P(d, fill, o)              one flat paper piece: '<path d="cut(d)" fill=…/>' (o.rule 'evenodd' for cut-outs)
//   WS.char(parent, def)          a rig whose pieces are NOT nested in the DOM: every piece is a <g> that receives
//                                 the full root-local matrix of its bone, so the paint order (z) is free of the bone
//                                 hierarchy (far limbs behind the body, near limbs in front, props in between).
//   luogu sounds                  京剧锣鼓 voices synthesised in code (大锣 · 小锣 · 铙钹 · 板鼓 · 堂鼓) + roar, wind,
//                                 crack, thud — registered as vk sfx voices; WS.luogu(sc, t, pattern) schedules 锣鼓经.
// Everything is a pure function of t (no clocks, seeded noise only).
(function () {
  const WS = window.WS = window.WS || {};
  const NS = 'http://www.w3.org/2000/svg';
  const f1 = x => Math.round(x * 10) / 10, f3 = x => Math.round(x * 1000) / 1000;
  const H = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  WS.hash = H;

  /* ---------------- scissor-cut outlines ---------------- */
  const cache = new Map(); let probe = null;
  WS.cut = function (d, o = {}) {
    const step = o.step || 5, amp = o.amp == null ? .9 : o.amp, seed = o.seed || 1;
    const key = d + '|' + step + '|' + amp + '|' + seed;
    if (cache.has(key)) return cache.get(key);
    if (!probe) {
      const s = document.createElementNS(NS, 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0');
      s.setAttribute('aria-hidden', 'true'); s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(s); probe = document.createElementNS(NS, 'path'); s.appendChild(probe);
    }
    const subs = d.match(/M[^M]*/g) || [];
    let out = '';
    subs.forEach((sub, si) => {
      probe.setAttribute('d', sub);
      const L = probe.getTotalLength(); if (!(L > 0)) return;
      const closed = /Z\s*$/i.test(sub.trim());
      const n = Math.max(closed ? 6 : 2, Math.round(L / step));
      const pts = [];
      for (let i = 0; i < (closed ? n : n + 1); i++) { const p = probe.getPointAtLength(L * i / n); pts.push([p.x, p.y]); }
      const m = pts.length;
      const q = pts.map((p, i) => {
        const a = pts[(i - 1 + m) % m], b = pts[(i + 1) % m];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        // scissor bite: mostly small wobble, now and then a sharper nick
        const r = H(seed * 13.7 + si * 71.3 + i * .731), nick = H(seed * 3.1 + i * 1.93 + si) > .93 ? 1.8 : 1;
        const k = (!closed && (i === 0 || i === m - 1)) ? 0 : amp * (r - .5) * 2 * nick;
        return [p[0] - dy / len * k, p[1] + dx / len * k];
      });
      out += 'M' + q.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + (closed ? 'Z' : '');
    });
    cache.set(key, out);
    return out;
  };
  // one paper piece; o: {rule, op (opacity), cls, amp, step, seed, raw (no cut)}
  WS.P = (d, fill, o = {}) => `<path d="${o.raw ? d : WS.cut(d, o)}" fill="${fill}"${o.rule ? ` fill-rule="${o.rule}"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}${o.cls ? ` class="${o.cls}"` : ''}/>`;
  // ellipse / circle as a path (so it can be cut)
  WS.E = (cx, cy, rx, ry = rx, rot = 0) => {
    const c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180), p = (a) => { const x = Math.cos(a) * rx, y = Math.sin(a) * ry; return f1(cx + x * c - y * s) + ' ' + f1(cy + x * s + y * c); };
    let d = 'M' + p(0); for (let i = 1; i <= 24; i++) d += ' L' + p(i / 24 * Math.PI * 2); return d + ' Z';
  };
  // tapered stroke (brush / paper slit) along points → closed path
  WS.slit = (pts, w = 4, taper = true) => {
    const n = pts.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const u = n > 1 ? i / (n - 1) : .5, ww = (taper ? Math.pow(Math.sin(Math.PI * Math.min(1, .06 + u * .9)), .8) : 1) * w / 2;
      Lp.push([pts[i][0] - dy / len * ww, pts[i][1] + dx / len * ww]); Rp.push([pts[i][0] + dy / len * ww, pts[i][1] - dx / len * ww]);
    }
    return 'M' + Lp.concat(Rp.reverse()).map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L') + ' Z';
  };
  // quadratic-ish curve sampled into points (for slits): from a to b bulging by `bend` (perpendicular, units)
  WS.arc = (a, b, bend = 0, n = 8) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const cx = mx - dy / len * bend, cy = my + dx / len * bend, out = [];
    for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; out.push([v * v * a[0] + 2 * u * v * cx + u * u * b[0], v * v * a[1] + 2 * u * v * cy + u * u * b[1]]); }
    return out;
  };

  /* ---------------- character builder (flat z-ordered pieces, each with its bone's full matrix) ---------------- */
  const M = () => vk.rig.mat;
  WS.char = function (parent, def) {
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'pc-char ' + (def.cls || ''));
    if (def.filter !== false) g.setAttribute('filter', `url(#${def.filter || 'pc-shadow'})`);
    const inner = document.createElementNS(NS, 'g'); g.appendChild(inner);
    const pieces = [...def.pieces].map((p, i) => ({ ...p, i })).sort((a, b) => (a.z - b.z) || (a.i - b.i));
    inner.innerHTML = pieces.map(p => `<g class="pc-piece ${p.cls || ''}" data-b="${p.bone}">${p.svg}</g>`).join('');
    parent.appendChild(g);
    const pieceEls = [...inner.children].map((el, i) => ({ el, bone: pieces[i].bone, last: '' }));
    const rig = vk.rig({ root: inner, el: () => null, bones: def.bones, clips: def.clips, ik: def.ik, defaults: def.defaults });
    const order = rig.bones;
    // root-local bone matrices (in-root motion excluded: it lives on the root <g>)
    function mats(pose) {
      const out = {}, mt = M();
      for (const b of order) out[b.id] = mt.mul(b.parent ? out[b.parent] : mt.id(), rig.local(b.id, pose));
      return out;
    }
    // accumulated rotation (deg) of a bone in root-local space
    function worldRot(id, pose) { let a = 0; for (let b = rig.byId[id]; b; b = b.parent ? rig.byId[b.parent] : null) a += b.rot + (pose[b.id] || 0); return a; }
    function apply(pose, root) {
      rig.apply(pose, root);                       // root transform (+ in-root motion) on the inner <g>; the outer <g> keeps the filter in world space
      const m = mats(pose);
      for (const p of pieceEls) {
        const k = m[p.bone]; if (!k) continue;
        const s = `matrix(${f3(k[0])} ${f3(k[1])} ${f3(k[2])} ${f3(k[3])} ${f1(k[4])} ${f1(k[5])})`;
        if (s !== p.last) { p.last = s; p.el.setAttribute('transform', s); }
      }
      return m;
    }
    // world point of a bone-local point (same maths as the render)
    const point = (bone, x, y, pose, root) => rig.point(bone, x, y, pose, root);
    return { g, inner, rig, apply, mats, worldRot, point, q: s => g.querySelector(s), qa: s => [...g.querySelectorAll(s)] };
  };
  WS.setOp = (el, v) => { const s = String(Math.round(Math.max(0, Math.min(1, v)) * 1000) / 1000); if (el.__op !== s) { el.__op = s; el.setAttribute('opacity', s); } };

  /* ---------------- 京剧锣鼓 + creature/foley voices (deterministic DSP, mono Float32 buffers) ---------------- */
  const TAU = Math.PI * 2;
  const rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  function bq(type, f, q, sr) {   // RBJ biquad
    const w = TAU * Math.min(f, sr * .45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q); let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0; return x => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  }
  const norm = (x, pk = .85) => { let m = 1e-9; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); for (let i = 0; i < x.length; i++) x[i] *= pk / m; return x; };
  // 大锣 "仓/匡": low gong, pitch falls after the strike (the Peking-opera big gong's bend), long shimmering tail
  function daluo(sr, o = {}) {
    const dur = o.dur || 2.6, n = Math.floor(sr * dur), out = new Float32Array(n), f = o.f || 190, R = rng(11);
    const parts = [[1, 1, 1.6], [1.51, .55, 1.1], [2.13, .42, .8], [2.76, .3, .6], [3.41, .22, .45], [4.37, .14, .35], [5.2, .1, .25]];
    const ph = parts.map(() => 0), bp = bq('bp', 2400, 1.2, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr, bend = 1 - .16 * (1 - Math.exp(-t / .12)); let s = 0;
      parts.forEach((p, j) => { ph[j] += TAU * f * p[0] * bend / sr; s += p[1] * Math.sin(ph[j] + j) * Math.exp(-t / p[2]) * (1 + .2 * Math.sin(TAU * (3.1 + j) * t)); });
      out[i] = (s + bp(R() * 2 - 1) * 2.4 * Math.exp(-t / .05) + (R() * 2 - 1) * .12 * Math.exp(-t / .5)) * Math.min(1, t / .002);
    }
    return norm(out);
  }
  // 小锣 "台": bright small gong, pitch rises
  function xiaoluo(sr, o = {}) {
    const dur = o.dur || 1.3, n = Math.floor(sr * dur), out = new Float32Array(n), f = o.f || 780, R = rng(5);
    const parts = [[1, 1, .7], [1.62, .35, .45], [2.4, .22, .3], [3.3, .12, .2]], ph = parts.map(() => 0), bp = bq('bp', 5200, 1.5, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr, bend = 1 + .1 * (1 - Math.exp(-t / .09)); let s = 0;
      parts.forEach((p, j) => { ph[j] += TAU * f * p[0] * bend / sr; s += p[1] * Math.sin(ph[j]) * Math.exp(-t / p[2]); });
      out[i] = (s + bp(R() * 2 - 1) * 1.6 * Math.exp(-t / .02)) * Math.min(1, t / .001);
    }
    return norm(out, .7);
  }
  // 铙钹 "七/才": crash of noise + metallic square partials; o.mute → short choked hit
  function nao(sr, o = {}) {
    const dur = o.mute ? .16 : (o.dur || 1.1), n = Math.floor(sr * dur), out = new Float32Array(n), R = rng(o.mute ? 23 : 17);
    const fr = [296, 437, 523, 609, 781, 1003], ph = fr.map(() => 0), hp = bq('hp', 3200, .7, sr), bp = bq('bp', 7000, .8, sr), dec = o.mute ? .045 : .38;
    for (let i = 0; i < n; i++) {
      const t = i / sr; let m = 0; fr.forEach((f, j) => { ph[j] += f * 1.37 / sr; m += (ph[j] % 1 < .5 ? 1 : -1); });
      out[i] = (hp(m * .25 + (R() * 2 - 1)) * .8 + bp(R() * 2 - 1) * .7) * Math.exp(-t / dec) * Math.min(1, t / .0015);
    }
    return norm(out, .6);
  }
  // 板鼓 "大/八": dry, very high, cracking drum stroke
  function bangu(sr, o = {}) {
    const dur = .12, n = Math.floor(sr * dur), out = new Float32Array(n), R = rng(31 + (o.v || 0)), bp = bq('bp', 2900, 3, sr); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (1250 - 500 * Math.min(1, t / .03)) / sr; out[i] = (Math.sin(ph) * Math.exp(-t / .018) * .8 + bp(R() * 2 - 1) * 2.5 * Math.exp(-t / .01)); }
    return norm(out, .75);
  }
  // 堂鼓 "咚": big low drum
  function tanggu(sr, o = {}) {
    const dur = .7, n = Math.floor(sr * dur), out = new Float32Array(n), f = o.f || 88, R = rng(41), lp = bq('lp', 900, .8, sr); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * f * (1 + .6 * Math.exp(-t / .03)) / sr; out[i] = Math.sin(ph) * Math.exp(-t / .22) + lp(R() * 2 - 1) * Math.exp(-t / .03) * .9; }
    return norm(out, .85);
  }
  // tiger roar: pulsed glottal source with a pitch arc, vocal-tract formants, breath noise, growl AM
  function roar(sr, o = {}) {
    const dur = o.dur || 1.7, n = Math.floor(sr * dur), out = new Float32Array(n), R = rng(o.seed || 7), f0 = o.f || 118;
    const F = [bq('bp', 420, 3, sr), bq('bp', 980, 4, sr), bq('bp', 2300, 5, sr)], lp = bq('lp', 3200, .7, sr), nb = bq('bp', 1600, .7, sr); let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, u = t / dur, env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), .6) * (u < .87 ? 1 : Math.max(0, (1 - u) / .13));
      const f = f0 * (.8 + .45 * Math.sin(Math.PI * Math.min(1, u * 1.3))) * (1 + .04 * Math.sin(TAU * 7 * t)) + (R() - .5) * 18;
      ph += f / sr; const src = (ph % 1) * 2 - 1, am = .7 + .3 * Math.sin(TAU * 27 * t + Math.sin(TAU * 3 * t) * 2);
      const x = src * am + (R() * 2 - 1) * .35;
      out[i] = lp(F[0](x) * 1.4 + F[1](x) * 1.1 + F[2](x) * .6 + nb(R() * 2 - 1) * .25) * env;
    }
    return norm(out, .85);
  }
  // wind gust: band-passed noise whose centre and level swell and fall
  function wind(sr, o = {}) {
    const dur = o.dur || 3, n = Math.floor(sr * dur), out = new Float32Array(n), R = rng(o.seed || 3), lp = bq('lp', 1800, .6, sr);
    let f1s = bq('bp', 500, 2.5, sr), f2s = bq('bp', 1100, 4, sr), last = -1;
    for (let i = 0; i < n; i++) {
      const t = i / sr, u = t / dur, env = Math.pow(Math.sin(Math.PI * u), 1.5) * (.75 + .25 * Math.sin(TAU * 1.3 * t + Math.sin(TAU * .5 * t) * 2));
      const blk = Math.floor(i / 256); if (blk !== last) { last = blk; const c = 300 + 900 * Math.sin(Math.PI * u) + 200 * Math.sin(TAU * .9 * t); f1s = retune(f1s, 'bp', c, 2.5, sr); f2s = retune(f2s, 'bp', c * 2.1, 5, sr); }
      const x = R() * 2 - 1; out[i] = (f1s(x) * 1.2 + f2s(x) * .5 + lp(x) * .15) * env;
    }
    return norm(out, .7);
  }
  // (a biquad keeps its state when re-tuned: rebuild coefficients, copy the delay line)
  function retune(fn, type, f, q, sr) {
    const w = TAU * Math.min(f, sr * .45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    const b0 = al / (1 + al), b2 = -al / (1 + al), a1 = -2 * c / (1 + al), a2 = (1 - al) / (1 + al);
    const st = fn.st || { x1: 0, x2: 0, y1: 0, y2: 0 };
    const g = x => { const y = b0 * x + b2 * st.x2 - a1 * st.y1 - a2 * st.y2; st.x2 = st.x1; st.x1 = x; st.y2 = st.y1; st.y1 = y; return y; };
    g.st = st; return g;
  }
  // staff snapping: a cluster of sharp wood cracks + a woody body resonance
  function crack(sr) {
    const dur = .6, n = Math.floor(sr * dur), out = new Float32Array(n), R = rng(9), bp = bq('bp', 1300, 4, sr), hp = bq('hp', 1800, .7, sr);
    const hits = [0, .012, .03, .055, .09, .15];
    for (let i = 0; i < n; i++) { const t = i / sr; let e = 0; hits.forEach((h, j) => { if (t >= h) e += Math.exp(-(t - h) / (.006 + j * .002)) * (1 - j * .12); }); const x = R() * 2 - 1; out[i] = hp(x) * e * 1.6 + bp(x) * e * 2 + Math.sin(TAU * 520 * t) * Math.exp(-t / .05) * .4; }
    return norm(out, .9);
  }
  // punch / body thud
  function thud(sr, o = {}) {
    const dur = .3, n = Math.floor(sr * dur), out = new Float32Array(n), R = rng(13), lp = bq('lp', 700, .8, sr); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (o.f || 72) * (1 + 1.2 * Math.exp(-t / .02)) / sr; out[i] = Math.sin(ph) * Math.exp(-t / .07) + lp(R() * 2 - 1) * Math.exp(-t / .025) * 1.2; }
    return norm(out, .9);
  }
  // quick whoosh (dodge / swing): noise swept up then down
  function swish(sr, o = {}) {
    const dur = o.dur || .38, n = Math.floor(sr * dur), out = new Float32Array(n), R = rng(19); let f = bq('bp', 600, 1.4, sr), last = -1;
    for (let i = 0; i < n; i++) { const t = i / sr, u = t / dur, blk = i >> 7; if (blk !== last) { last = blk; f = retune(f, 'bp', 500 + 2600 * Math.sin(Math.PI * u), 1.6, sr); } out[i] = f(R() * 2 - 1) * Math.pow(Math.sin(Math.PI * u), 2); }
    return norm(out, .7);
  }
  WS.dsp = { daluo, xiaoluo, nao, bangu, tanggu, roar, wind, crack, thud, swish };
  const reg = (name, make, g) => vk.register('sounds', name, (k, t, v, f) => k.buf(t, name + (f || ''), () => make(k.sr, f ? { f } : {}), g * v));
  reg('daluo', daluo, .55); reg('xiaoluo', xiaoluo, .38); reg('bangu', bangu, .42); reg('tanggu', tanggu, .6);
  reg('roar', roar, .6); reg('crack', crack, .6); reg('thud', thud, .6); reg('swish', swish, .35);
  vk.register('sounds', 'nao', (k, t, v) => k.buf(t, 'nao', () => nao(k.sr), .32 * v));
  vk.register('sounds', 'naoMute', (k, t, v) => k.buf(t, 'naoMute', () => nao(k.sr, { mute: true }), .3 * v));
  vk.register('sounds', 'wind', (k, t, v, f) => k.buf(t, 'wind' + (f || 3), () => wind(k.sr, { dur: f || 3 }), .5 * v));
  vk.register('sounds', 'roarLong', (k, t, v) => k.buf(t, 'roarLong', () => roar(k.sr, { dur: 2.3, f: 104, seed: 12 }), .62 * v));
  vk.register('sounds', 'growl', (k, t, v) => k.buf(t, 'growl', () => roar(k.sr, { dur: .9, f: 82, seed: 4 }), .45 * v));

  // 锣鼓经 (percussion phrases). "仓" = 大锣 + 铙钹, "才" = 铙钹, "七" = 闷钹, "台" = 小锣, "大/八" = 板鼓, "咚" = 堂鼓
  const STROKE = {
    cang: (sc, t, g) => { sc.sfx(t, 'daluo', g); sc.sfx(t, 'nao', g * .8); },
    cai: (sc, t, g) => sc.sfx(t, 'nao', g * .7), qi: (sc, t, g) => sc.sfx(t, 'naoMute', g * .8),
    tai: (sc, t, g) => sc.sfx(t, 'xiaoluo', g), da: (sc, t, g) => sc.sfx(t, 'bangu', g), dong: (sc, t, g) => sc.sfx(t, 'tanggu', g),
  };
  const PAT = {
    // 四击头: 八大 · 仓 · 才 · 七 · 才 · 仓  (the 亮相 cadence)
    sijitou: [[0, 'da', .7], [.1, 'da', .8], [.34, 'cang', 1], [.62, 'cai', .7], [.82, 'qi', .7], [1.0, 'cai', .7], [1.28, 'cang', 1]],
    // 冲头: urgent, repeated 仓
    chongtou: [[0, 'da', .8], [.12, 'cang', .9], [.36, 'cai', .6], [.5, 'cang', .9], [.74, 'cai', .6], [.88, 'cang', 1]],
    // 一击: 大 · 仓
    hit: [[0, 'da', .8], [.1, 'cang', 1]],
    // 台 … small-gong steps (walking)
    tai: [[0, 'tai', .6]],
  };
  WS.stroke = (sc, t, name, g = 1) => STROKE[name](sc, t, g);
  WS.luogu = function (sc, t, name, o = {}) {
    const sp = o.speed || 1, g = o.gain == null ? 1 : o.gain;
    (PAT[name] || []).forEach(([dt, s, gg]) => STROKE[s](sc, t + dt / sp, gg * g));
  };
  // 急急风: fast drum roll with 仓 on the beat, n beats at `bpm`
  WS.jijifeng = function (sc, t, n = 8, o = {}) {
    const bt = 60 / (o.bpm || 200), g = o.gain == null ? 1 : o.gain;
    for (let i = 0; i < n; i++) { STROKE.da(sc, t + i * bt, .45 * g); STROKE.da(sc, t + (i + .5) * bt, .3 * g); if (i % 2 === 0) STROKE.cang(sc, t + i * bt, .55 * g); else STROKE.cai(sc, t + i * bt, .4 * g); }
  };
})();
