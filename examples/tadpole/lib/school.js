// A small school of tadpoles: follow-the-leader along a smooth key path + deterministic noise wander.
// Everything is evaluated from scene-local time only (positions at t±dt give velocity → facing, tilt, tail beat).
(function () {
  const TP = window.TP = window.TP || {};
  const N = vk.noise1, H = vk.hash, clamp = vk.clamp;
  const sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  // o: {n, path: [[t, x, y], …] leader keys, spread, lag, scale, face(local) → ±1 idle facing, target(local) → [x, y] look/attention point,
  //     talk(local) 0..1, happy(local) 0..1, excite(local) 0..1 (bouncy), meta(local, i) → {legs, arms, tail, green, opacity, scale}, visible(local, i) 0..1,
  //     offsets: [[dx, dy] …] custom formation, pos(local, i) → [x, y] full override}
  TP.school = function (sc, P, o) {
    const n = o.n || 7, keys = o.path.map(k => [k[0], [k[1], k[2]]]);
    const offs = o.offsets || Array.from({ length: n }, (_, i) => { const a = i * 2.39996 + .6, r = i ? 12 + Math.sqrt(i) * (o.spread || 17) : 0; return [Math.cos(a) * r * 1.35, Math.sin(a) * r * .8]; });
    const tads = Array.from({ length: n }, () => TP.tadpole(P.chars));
    const lead = t => vk.kfSpline(t, keys);
    const pos = (t, i) => {
      if (o.pos) { const p = o.pos(t, i); if (p) return p; }
      const L = lead(t - (o.lag != null ? o.lag : .14) * i), w = o.wander != null ? o.wander : 1;
      return [L[0] + offs[i][0] + (N(t * .55 + i * 13.1) - .5) * 26 * w, L[1] + offs[i][1] + (N(t * .6 + i * 29.7) - .5) * 16 * w];
    };
    TP.lastSchool = { pos, lead, n };
    sc.on(local => {
      const tg = o.target ? o.target(local) : null, talk = o.talk ? o.talk(local) : 0, happy = o.happy ? o.happy(local) : 0, ex = o.excite ? o.excite(local) : 0;
      const fIdle = o.face ? o.face(local) : 1;
      tads.forEach((T, i) => {
        const m = o.meta ? o.meta(local, i) || {} : {};
        const vis = o.visible ? o.visible(local, i) : 1;
        if (vis <= .001) { T.set({ opacity: 0 }); return; }
        const p = pos(local, i), a = pos(local - .06, i), b = pos(local + .06, i);
        const vx = (b[0] - a[0]) / .12, vy = (b[1] - a[1]) / .12, sp = Math.hypot(vx, vy), w = sm(sp / 26);
        let ft = fIdle; if (tg) ft = clamp((tg[0] - p[0]) / 12 + fIdle * .5, -1, 1);
        // mostly-vertical motion should not steer the facing (it would squash the rig edge-on)
        const wv = w * clamp((Math.abs(vx) - 3) / 10, 0, 1), f0 = clamp(clamp(vx / 10, -1, 1) * wv + ft * (1 - wv), -1, 1);
        const face = Math.sign(f0) * Math.pow(Math.abs(f0), .3);   // continuous, but spends little time edge-on
        const tilt = clamp(Math.atan2(vy, Math.abs(vx) + 4) * 57.3, -55, 55) * w + Math.sin(local * 1.7 + i) * 4 * (1 - w);
        const bounce = ex ? -Math.abs(Math.sin(local * 9 + i * .9)) * 7 * ex : 0;
        let look = [0, 0];
        if (tg) { const dx = tg[0] - p[0], dy = tg[1] - p[1], d = Math.hypot(dx, dy) || 1; look = [dx / d * Math.sign(face || 1), dy / d]; }
        T.set({
          x: p[0], y: p[1] + bounce, face, tilt: tilt + (ex ? Math.sin(local * 9 + i) * 8 * ex : 0),
          scale: (m.scale || o.scale || 1.35) * (.92 + H(i * 7) * .16),
          phase: local * (7 + 5 * w + 4 * ex) + i * 1.3, amp: 2 + 2.6 * w + 2 * ex,
          talk: talk * (.55 + .45 * Math.abs(Math.sin(local * 13 + i * 1.7))), happy: Math.max(happy, m.happy || 0), look, blink: TP.blink(local, i * 3 + 1),
          legs: m.legs, arms: m.arms, tail: m.tail, green: m.green, opacity: (m.opacity != null ? m.opacity : 1) * vis, wide: m.wide,
        });
      });
    });
    return { tads, pos, lead };
  };
})();
