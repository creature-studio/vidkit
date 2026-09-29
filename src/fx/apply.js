// Element-effect dispatcher. fx names can be combined with spaces ("up blur") when they are object presets;
// a function preset (letters, type, count, …) takes over the element on its own.
import { registry } from '../core/plugin.js';
import { defaultEase } from '../core/ease.js';

export function fxApi(scene, isExit) {
  const v = scene.video;
  return {
    scene, video: v, exit: !!isExit, theme: v.theme,
    tween: (els, o) => v.tl.tween([].concat(els), o, scene),
    fn: (el, f) => v.tl.fn(el, f, scene),
    after: f => v.afterFonts.push(f),       // run after fonts are loaded (measurement-dependent fx)
    beats: v.beats, fps: v.fps,
  };
}

export function applyFx(el, fxStr, o, scene, isExit) {
  const names = String(fxStr || 'fade').trim().split(/\s+/);
  const api = fxApi(scene, isExit);
  const first = registry.fx[names[0]];
  if (typeof first === 'function') { first(el, o, api); return; }
  let from = {}, to = {}, instant = {}, ease = null, origin = null;
  names.forEach(nm => {
    const f = registry.fx[nm];
    if (!f) { console.warn('[vk] unknown fx', nm); return; }
    if (typeof f === 'function') { f(el, o, api); return; }
    const r = typeof f.make === 'function' ? f.make(o, el) : f;
    Object.assign(from, r.from); Object.assign(to, r.to); if (r.instant) Object.assign(instant, r.instant);
    if (r.ease && !ease) ease = r.ease; if (r.origin) origin = r.origin;
  });
  let e = o.ease || ease || defaultEase(); const d = o.d == null ? .6 : o.d;
  if (origin && !el.style.transformOrigin) el.style.transformOrigin = origin;
  if (isExit) { [from, to] = [to, from]; e = o.ease || 'inCubic'; }
  if (Object.keys(instant).length) {
    const i0 = {}, i1 = {}; Object.keys(instant).forEach(k => { i0[k] = isExit ? instant[k] : 0; i1[k] = isExit ? 0 : instant[k]; });
    api.tween(el, { t: isExit ? o.t + d : o.t, d: 1e-4, from: i0, to: i1 });
  }
  if (Object.keys(from).length || Object.keys(to).length) api.tween(el, { t: o.t, d, ease: e, from, to });
}
