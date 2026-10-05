// Cover transitions: opaque colour bars drawn on one canvas ABOVE both scenes (video.coverEl). The outgoing scene stays
// untouched until the bars have covered the frame; at the cut the incoming scene is swapped in underneath and the bars
// sweep away. Registered lazily (first use of the name), so pages that never use them keep the original registry.
//   transition: 'stripes:0.44'  → 6 staggered bars, slide in (outExpo) / out (inExpo), axis alternates per cut
//   transition: { type: 'bars', d: .6, n: 8, colors: [...], axis: 'x'|'y'|'alt', stagger: .02, at: .5, reverse }
//   'bars' = each bar grows from the leading edge, then retracts to the far edge (a "wipe-through" in colour)
// Defaults can be set once per video: vk.video({ cover: { colors, n, axis } }) (the reel style pack does this).
import { registry } from '../../core/plugin.js';
import { coverBars, coverAxis, coverRects } from './math.js';

export const COVER_COLORS = ['#FFD23F', '#FF3B8B', '#25E1E8', '#5B3BFF', '#F4EFE6', '#0A0A12'];
function make(mode) {
  const T = (e, c) => {
    const o = { ...(c.video && c.video.cfg.cover || {}), ...c.o }, d = o.d || .5, n = o.n || 6;
    const k = c.inScene ? c.inScene.index : 0, cols = o.colors || COVER_COLORS, axis = coverAxis(o.axis || 'alt', k);
    const { cut, bars } = coverBars(c.local, d, { n, mode, at: o.at, stagger: o.stagger, travel: o.travel, reverse: o.reverse, easeIn: o.easeIn, easeOut: o.easeOut });
    const rects = coverRects(bars, n, axis, c.W, c.H);
    return {
      in: { opacity: c.local >= cut ? 1 : 0 },
      cover: rects.length ? g => { for (const r of rects) { g.fillStyle = cols[(k + r.i) % cols.length]; g.fillRect(r.x, r.y, r.w, r.h); } } : null,
    };
  };
  T.cover = true;                                    // video.finalize() creates the cover canvas only for pages that use one
  return T;
}
export const COVER_TRANSITIONS = { stripes: make('slide'), bars: make('grow') };
export function installCover() { for (const [k, f] of Object.entries(COVER_TRANSITIONS)) if (!registry.transitions[k]) registry.transitions[k] = f; return Object.keys(COVER_TRANSITIONS); }
