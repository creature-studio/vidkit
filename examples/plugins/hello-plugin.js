// A minimal vidkit plugin: one element fx, one transition, one texture, one hook.
// Usage: <script src="plugins/hello-plugin.js"></script> then vk.use(helloPlugin)
window.helloPlugin = {
  name: 'hello',
  fx: {
    // object preset: from/to styles, composable with others ("tilt blur")
    tilt: { from: { opacity: 0, transform: 'rotate(-8deg) translateY(30px)' }, to: { opacity: 1, transform: 'rotate(0deg) translateY(0px)' }, ease: 'spring' },
    // function preset: full control, schedules its own tweens / per-frame fns via api
    neon: (el, o, api) => {
      api.tween(el, { t: o.t, d: o.d || .5, from: { opacity: 0 }, to: { opacity: 1 } });
      api.fn(el, local => { const k = local < o.t ? 0 : .6 + .4 * Math.abs(Math.sin((local - o.t) * 9)); el.style.textShadow = `0 0 ${(18 * k).toFixed(1)}px var(--accent)`; });
    },
  },
  transitions: {
    // p = eased progress 0..1 of the incoming scene's transition
    'spin-in': p => ({ in: { opacity: p, transform: `rotate(${(1 - p) * -90}deg) scale(${.6 + .4 * p})` }, out: { opacity: 1 - p } }),
  },
  textures: {
    // full-frame overlay: return an element and an update(t) that must depend on t only
    tint: (video, o) => {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:40;mix-blend-mode:multiply;background:${o.color || '#ffcc88'};opacity:${o.amount ?? .15}`;
      video.stage.appendChild(el);
      return { el, update: () => {} };
    },
  },
  hooks: { init: video => console.log('[hello] plugin active, scenes =', video.scenes.length) },
};
