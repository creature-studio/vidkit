// vk.film(story, {style}) — turn a parsed story (styles/story.js) into a narrated, styled, ready-to-render film:
// one vk.scene per story scene (dur 'auto' from the TTS manifest), the style's world + cast puppets, foot-locked
// walks, gestures, lip-sync from the voice lines, shot list (establish / dialogue / punch-ins, heads kept in frame),
// the style's title, signature effect, transitions, step sfx and music bed. Everything is a pure function of t.
import { parseStory, sceneCast, slots, actorPlan } from './story.js';

const ALT_LOOKS = [
  { hairStyle: 'twinbuns', cloth: 'gold', cloth2: 'gold', trim: 'red', pants: 'brown', sash: 'red', scarf: 'red' },
  { hairStyle: 'cap', cloth: 'blue', cloth2: 'blue', trim: 'gold', pants: 'grey', sash: 'gold' },
  { hairStyle: 'long', cloth: 'green', cloth2: 'green', trim: 'pink', pants: 'cream', sash: 'pink' },
  { hairStyle: 'bald', cloth: 'brown', cloth2: 'brown', trim: 'cream', pants: 'grey', sash: 'cream' },
];
const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const walkEase = u => .45 * Math.max(0, Math.min(1, u)) + .55 * sm(u);
const mixPose = (a, b, w) => { if (w <= 0) return a; if (w >= 1) return b; const o = { ...a }; for (const k in b) o[k] = (typeof a[k] === 'number' && typeof b[k] === 'number') ? a[k] + (b[k] - a[k]) * w : (w < .5 ? a[k] : b[k]); return o; };

export function film(vk, src, o = {}) {
  const story = parseStory(src), styleSpec = o.style || story.style || 'papercut';
  const S0 = vk.style(styleSpec);
  const page = (typeof location !== 'undefined' ? location.pathname.split('/').pop() : 'film.html').replace(/\.html?$/i, '');
  const cast = {}; story.cast.forEach(c => { if (c.voice || c.rate || c.pitch) cast[c.id] = { ...(c.voice ? { voice: c.voice } : {}), ...(c.rate ? { rate: c.rate } : {}), ...(c.pitch ? { pitch: c.pitch } : {}) }; });
  const sv = S0.voice;
  const v = vk.video({
    style: styleSpec, fps: o.fps || 30, title: story.title || 'vidkit film',
    voice: { manifest: o.manifest || page + '.vo.json', voice: story.narrator || sv.voice, rate: story.rate || sv.rate || '+0%', lead: .6, tail: .9, gap: .3, maxChars: 18, cast },
    mix: { lufs: -14, duck: -9, fadeOut: 1.5 }, ...(o.video || {}),
  });
  const S = v.style, CAM = S.camera, demoLook = (S.parts.chars.demo && S.parts.chars.demo.look) || (S.base.demo && S.base.demo.look) || {};
  const looks = {}; story.cast.forEach((c, i) => { looks[c.id] = { ...(i === 0 ? demoLook : ALT_LOOKS[(i - 1) % ALT_LOOKS.length]), ...(c.look || {}) }; });
  const scale = o.scale || .7, Wd = v.W || 1280;

  story.scenes.forEach((st, si) => {
    const holds = st.actions.filter(a => a.do === 'hold').reduce((s, a) => s + a.dur, 0);
    const trA = st.actions.find(a => a.do === 'transition');
    const opts = { transition: si === 0 ? undefined : S.transition(st.transition || (trA && trA.kind) || (si === story.scenes.length - 1 ? 'soft' : 'default')), voTail: .9 + holds, hold: .6 + holds };
    if (st.lines.length) opts.vo = st.lines.map(l => (l.who ? { who: l.who, text: l.text } : { text: l.text }));
    vk.scene(st.name, st.dur || (st.lines.length ? 'auto' : 4), opts, sc => {
      const segs = sc.voSegs || [], anchor = i => (i >= 0 && segs[i] ? segs[i].at : (si === 0 ? .3 : (sc.transition ? sc.transition.d : 0) + .1));
      const W = S.world(sc, st.setting || 'field day', { seed: si + 1, bakeScale: o.bakeScale || 1.5 });
      // slots left → right: actors entering from the left take the left slots (nobody crosses on the way in)
      const side = id => { const e = st.actions.find(a => a.who === id && a.do === 'enter'); return !e ? 0 : /right|右/.test(e.arg || '') ? 1 : -1; };
      const ids = sceneCast(st), order = ids.map((id, i) => [side(id), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[1]);
      const sl0 = slots(ids.length), sl = ids.map((_, i) => sl0[order.indexOf(i)]);
      // ---- actors ----
      const actors = ids.map((id, k) => {
        const ch = S.character(W.actors, { look: looks[id] || {}, scale, seed: 3 + k * 7 });
        const plan = actorPlan(st.actions, id, anchor, { W: Wd, home: Wd * sl[k], speed: 150 * scale / .7, runSpeed: 330 * scale / .7 });
        // walks → gait distance (rig units), ending on a two-feet-planted rest distance (no foot sliding, clean stops)
        let D = 0, x = plan.x0, dir = x > Wd / 2 ? -1 : 1;
        const tl = plan.segs.map(sg => {
          if (sg.do === 'walk' || sg.do === 'run') {
            const sgn = Math.sign(sg.to - x) || dir, units = Math.abs(sg.to - x) / scale, De = ch.gait.rest(D + units);
            const r = { ...sg, dir: sgn, Ds: D, De, xp: x - sgn * D * scale, xs: x }; x = x + sgn * (De - D) * scale; D = De; dir = sgn; r.xe = x; return r;
          }
          if (sg.do === 'face') { if (sg.dir) dir = sg.dir; return { ...sg, fdir: dir }; }
          return sg;
        });
        return { id, k, ch, plan, tl, xEnd: x };
      });
      const byId = Object.fromEntries(actors.map(a => [a.id, a]));
      // where is actor a at scene time l (world hip x), walking state, facing
      function where(a, l) {
        let w = null, last = null, face = null;
        for (const sg of a.tl) { if (sg.do === 'walk' || sg.do === 'run') { if (l >= sg.t0 && l < sg.t1) w = sg; if (l >= sg.t1) last = sg; } if (sg.do === 'face' && l >= sg.t0) face = { t: sg.t0, dir: sg.fdir }; }
        if (w) { const u = (l - w.t0) / (w.t1 - w.t0), d = w.Ds + (w.De - w.Ds) * walkEase(u); return { walking: w, d, X: w.xp + w.dir * d * scale, dir: w.dir }; }
        const X = last ? last.xe : a.plan.x0, d = last ? last.De : 0;
        let dir = last ? last.dir : (a.plan.x0 > Wd / 2 ? -1 : 1);
        if (face && (!last || face.t >= last.t1)) dir = face.dir;
        else if (!face) { // face the nearest other actor on stage (dialogue), else keep the walking direction
          let best = null; for (const b of actors) { if (b === a) continue; const bx = b.__X ? b.__X(l) : b.plan.x0; if (bx > -60 && bx < Wd + 60 && (best == null || Math.abs(bx - X) < Math.abs(best - X))) best = bx; }
          if (best != null && Math.abs(best - X) > 40) dir = Math.sign(best - X);
        }
        return { walking: null, d, X, dir };
      }
      actors.forEach(a => { a.__X = l => { let X = a.plan.x0; for (const sg of a.tl) if ((sg.do === 'walk' || sg.do === 'run') && l >= sg.t0) X = l >= sg.t1 ? sg.xe : sg.xp + sg.dir * (sg.Ds + (sg.De - sg.Ds) * walkEase((l - sg.t0) / (sg.t1 - sg.t0))) * scale; return X; }; });
      const speakingSeg = (a, l) => segs.find(s => s.who === a.id && l >= s.at - .05 && l <= s.end + .1) || null;
      const gestureAt = (a, l) => a.tl.find(sg => !['walk', 'run', 'face'].includes(sg.do) && l >= sg.t0 && l < sg.t1) || null;
      const clips = a => a.ch.rig.clips;
      // blended clip: gestures ease in/out over .25 s; talk while speaking; walk/run during travel
      function clipFn(a, l, w) {
        const C = clips(a), seg = speakingSeg(a, l), g = gestureAt(a, l);
        const baseName = w.walking ? (w.walking.do === 'run' ? 'run' : 'walk') : seg ? 'talk' : 'idle';
        if (!g) return C[baseName];
        const gf = g.do === 'jump' ? () => C.jump(l - g.t0) : C[g.do] || C.idle, k = Math.min(sm((l - g.t0) / .25), sm((g.t1 - l) / .25));
        return u => mixPose(C[baseName](u), gf(u), g.do === 'jump' ? 1 : k);
      }
      function state(a, l) {
        const w = where(a, l), wn = where(a, l + .04), seg = speakingSeg(a, l);
        return { x: w.X - w.dir * w.d * scale, d: w.d, ground: W.ground, facing: w.dir, clip: clipFn(a, l, w), run: w.walking && w.walking.do === 'run' ? 1 : 0, speed: (wn.d - w.d) / .04, seg, opacity: w.X < -130 || w.X > Wd + 130 ? 0 : 1 };
      }
      actors.forEach(a => sc.on(l => a.ch.render(l, state(a, l))));
      // step sfx at every foot plant while walking
      actors.forEach(a => a.tl.filter(sg => sg.do === 'walk' || sg.do === 'run').forEach(sg => { const half = a.ch.gait.stride / 2; let n = Math.ceil(sg.Ds / half + .01); for (let l = sg.t0; l < sg.t1; l += 1 / 30) { const d = sg.Ds + (sg.De - sg.Ds) * walkEase((l - sg.t0) / (sg.t1 - sg.t0)); if (d >= n * half) { const X = sg.xp + sg.dir * d * scale; if (X > 0 && X < Wd) S.sfx(sc, 'step', l, .6); n++; } } }));
      // ---- camera: establish → dialogue singles → back to the group; punch-ins on effects; heads kept in frame ----
      const onStage = (a, l) => { const X = a.__X(l); return X > 40 && X < Wd - 40; };
      const subj = (a, l) => a.ch.subject(l, state(a, l));
      const group = l => { const in_ = actors.filter(a => onStage(a, l)); if (!in_.length) return null; const ss = in_.map(a => subj(a, l)); const top = ss.reduce((m, s) => (s.head[1] < m.head[1] ? s : m)); return { head: [ss.reduce((t, s) => t + s.head[0], 0) / ss.length, top.head[1]], headR: top.headR, feet: [ss.reduce((t, s) => t + s.feet[0], 0) / ss.length, Math.max(...ss.map(s => s.feet[1]))], facing: in_.length === 1 ? ss[0].facing : 0 }; };
      const STAGE = { x: Wd / 2, y: (v.H || 720) / 2, s: 1 };
      const shotEntry = (t, shot, on, x = {}) => {
        if (!on && /wide/.test(shot)) return { t, cam: STAGE, d: x.d != null ? x.d : .8 };
        const a = on && on !== 'all' ? byId[on] : null;
        return { t, shot, on: a ? (l => subj(a, l)) : (l => group(l) || { head: [Wd / 2, 330], headR: 30, feet: [Wd / 2, 600], facing: 0 }), follow: .35, d: x.d != null ? x.d : .6, lookroom: a ? .12 : 0, focus: a ? [a] : null };
      };
      const user = st.actions.filter(a => a.do === 'shot');
      const list = [shotEntry(0, si === 0 ? (CAM.establish || 'wide') : (CAM.action || 'full'), null, { d: 0 })];
      if (user.length) user.forEach(a => list.push(shotEntry(Math.max(0, anchor(a.line) - .15), a.shot, a.on, {})));
      else segs.forEach((sg, i) => {
        // a single on the speaker — unless someone else acts during the line (two-shot) or the speaker gestures (wider)
        const acts = st.actions.filter(a => a.line === i && a.do !== 'shot' && a.do !== 'sfx' && a.do !== 'hold');
        const others = acts.some(a => a.do === 'effect' || (a.who && a.who !== sg.who)), own = acts.some(a => a.who === sg.who);
        if (sg.who && byId[sg.who] && actors.length) list.push(others ? shotEntry(Math.max(.05, sg.at - .2), CAM.action || 'full', null, {}) : shotEntry(Math.max(.05, sg.at - .2), own ? (CAM.action || 'full') : (CAM.dialog || 'medium'), sg.who, {}));
        else if (i > 0 && segs[i - 1].who) list.push(shotEntry(Math.max(.05, sg.at - .2), CAM.action || 'full', null, {}));
      });
      const effects = st.actions.filter(a => a.do === 'effect');
      effects.forEach(a => { if (CAM.punch) list.push({ t: anchor(a.line) + .25, punch: CAM.punch }); });
      const framing = list.filter(e => !e.punch).sort((p, q) => p.t - q.t);
      const focusAt = l => { let f = null; for (const e of framing) if (l >= e.t) f = e.focus; return f; };
      const keep = actors.map(a => l => { const f = focusAt(l); const b = f ? f[0] : a; return (f ? true : onStage(a, l)) ? subj(b, l) : (group(l) || subj(b, l)); });
      sc.shots(list.filter(e => e.punch !== 0), { keep: actors.length ? keep : [], margin: .06 });
      // ---- title, effects, sfx ----
      if (si === 0 && story.title) S.title(sc, story.title, { sub: story.sub || '', side: actors.length && actors[0].plan.segs.length ? 'right' : 'left', at: .4, out: segs[0] ? Math.max(2.6, segs[0].end + .2) : 3 });
      st.actions.filter(a => a.do === 'title').forEach(a => S.title(sc, a.text, { at: anchor(a.line), out: anchor(a.line) + 2.4 }));
      effects.forEach(a => {
        const t = anchor(a.line) + .25, who = a.who ? byId[a.who] : actors[actors.length - 1];
        let x = Wd / 2, y = 300; if (who) { const p = who.ch.point('handN', 0, 22, t, state(who, t)); x = p[0] + 20 * where(who, t).dir; y = p[1]; }
        S.effect(sc, a.name || 'signature', { at: t, x, y });
      });
      st.actions.filter(a => a.do === 'sfx').forEach(a => S.sfx(sc, a.kind, anchor(a.line)));
      // the scene lasts until every action has finished (dur 'auto' takes max(voice end + tail, maxT + hold))
      sc.maxT = Math.max(sc.maxT || 0, ...actors.map(a => a.plan.end), ...effects.map(a => anchor(a.line) + 1.6));
    });
  });
  S.music(v, { gain: o.musicGain != null ? o.musicGain : .5 });
  return v;
}
