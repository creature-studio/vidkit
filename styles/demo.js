// Shared ~5 s style sample (title + character + one effect + one transition), used by styles/<id>/preview.html,
// the gallery and `vk style sample`. vkStyleDemo('ink') or vkStyleDemo(['ink', 'papercut.chars']).
// Scene 1: establishing wide shot, the title lands, a character walks in (foot-locked gait) and waves.
// Scene 2 (pack transition): a closer shot on the character, cheer + the pack's signature effect + punch-in.
function vkStyleDemo(spec, o = {}) {
  const v = vk.video({ style: spec, fps: o.fps || 30, title: 'vidkit style · ' + [].concat(spec).join(' + ') });
  const S = v.style, D = Object.assign({}, S.base.demo || {}, S.parts.chars.demo ? { look: S.parts.chars.demo.look } : {}, o.demo || {});
  const look = D.look || {}, clamp = vk.clamp01, sm = vk.smooth01;
  // scene 1 — walk in from the left; the distance d drives the feet (no sliding), speed is only used for follow-through
  const walk = l => 300 * sm(clamp(l / 1.9)) / .7;                    // rig units walked
  vk.scene('establish', 2.9, {}, sc => {
    const W = S.world(sc, D.setting || 'mountain dusk');
    const ch = S.character(W.actors, { look, scale: .7, seed: 3 });
    const st = l => ({ x: 280, ground: W.ground, d: walk(l), speed: (walk(l + .02) - walk(l)) / .02, clip: l < 1.9 ? 'walk' : 'wave', facing: 1 });
    S.title(sc, D.title || S.name, { sub: D.sub || S.base.en, at: .35, out: 2.5 });
    sc.on(l => ch.render(l, st(l)));
    for (let i = 0; i < 4; i++) S.sfx(sc, 'step', .25 + i * .45, .8);
  });
  // scene 2 — medium → closer shot on the head, cheer, signature effect at 1.0 s, punch-in on the beat
  vk.scene('moment', 2.9, { transition: S.transition('default') }, sc => {
    const W = S.world(sc, D.setting2 || D.setting || 'field day', { seed: 2, bakeScale: 2 });
    const ch = S.character(W.actors, { look, scale: .75, seed: 3 });
    const st = l => ({ x: 520, ground: W.ground, d: 0, clip: l < .75 ? 'talk' : 'point', facing: 1, mouth: l < .75 ? { open: .5 + .5 * Math.sin(l * 22), shape: 'A' } : null });
    const sub = l => ch.subject(l, st(l));
    // full → medium-wide dolly-in (view-rect blend), punch-in on the effect; keep: the head never leaves the frame
    sc.shots([{ t: 0, shot: 'full', on: sub(0) }, { t: .3, shot: 'medium-wide', on: sub(.8), d: 1.3, lookroom: .2 }, { t: 1.0, punch: .06 }], { keep: [sub], margin: .05 });
    sc.on(l => ch.render(l, st(l)));
    const hand = ch.point('handN', 0, 22, 1, st(1));
    S.effect(sc, 'signature', { at: 1.0, x: hand[0] + 20, y: hand[1] });
  });
  S.music(v, o.music || {});
  return v;
}
if (typeof module !== 'undefined') module.exports = { vkStyleDemo };
