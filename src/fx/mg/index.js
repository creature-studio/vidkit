// Motion-graphics pack (vk.mg): poster-style motion design distilled from a 128 BPM "motion reel".
// Everything here is opt-in: cover transitions ('stripes', 'bars'), kinetic-type fx ('slam', 'echo', 'drop',
// 'letters-pop', 'mask-rise', 'hard-shadow') and the 'dotwave' background register themselves the first time a page
// names them, so existing pages (and the registry counts in examples/gallery.html) are untouched.
//   vk.mg.*            pure maths (math.js) + canvas painters (paint.js)
//   vk.accents.*       beat accents for sc.canvas / sc.paint: rings, streaks, burst, flash, orbit, plus, disc
//   vk.ui.*            UI micro-interaction nodes (ui.js)       vk.montage(words, o)   vk.lockup(o)
//   vk.hud(o)          video-level HUD canvas (difference blend)
import { registry, lazyRegister } from '../../core/plugin.js';
import * as math from './math.js';
import * as paint from './paint.js';
import { COVER_TRANSITIONS, COVER_COLORS, installCover } from './cover.js';
import { MG_FX, installText } from './text.js';
import { ui } from './ui.js';
import { montage, MONTAGE_PALETTES } from './montage.js';
import { lockup } from './lockup.js';

// bg: {type:'dotwave', cols, rows, step, hole:{x, y, w, h}, every, bg} — canvas background (dpr-aware)
export function installDotwave() {
  registry.backgrounds.dotwave = (sc, o, v) => {
    const c = document.createElement('canvas'), dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1)), g = c.getContext('2d');
    c.width = Math.round(v.W * dpr); c.height = Math.round(v.H * dpr); c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    const step = o.step || Math.round(v.H / 18), draw = paint.dotwave({ cols: Math.ceil(v.W / step), rows: Math.ceil(v.H / step), step, bg: o.color || o.bg, ...o });
    return { el: c, update(local) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = sc.start + local; draw(g, local, { t, local, W: v.W, H: v.H, fps: v.fps, frameT: v.frameT, beats: v.beats, scene: sc, video: v });
    } };
  };
}
lazyRegister('transitions', Object.keys(COVER_TRANSITIONS), installCover);
lazyRegister('fx', Object.keys(MG_FX), installText);
lazyRegister('backgrounds', ['dotwave'], installDotwave);

export const accents = paint.accents;
export const mg = {
  ...math, ...paint, COVER_COLORS, MONTAGE_PALETTES, cover: COVER_TRANSITIONS, textFx: MG_FX,
  install() { installCover(); installText(); installDotwave(); },     // eager registration (e.g. for a gallery of everything)
};
export { ui, montage, lockup };
// HUD on the current video: a front canvas with mix-blend-mode difference (o.blend to override)
export const hudLayer = (video, o = {}) => video.canvas(paint.hud(o), { blend: o.blend || 'difference', zIndex: o.zIndex || 35 });
