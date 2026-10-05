// Format presets with safe areas. Units: px at the preset's native size.
// safe  = where text/important content must stay (title-safe).
// zones = platform UI overlays (vertical short-video apps: right action rail, bottom description/caption bar,
//         top status/search bar). QA flags text that lands in a zone.
import { registry } from '../core/plugin.js';
import { unknownName } from '../core/strict.js';

const F = registry.formats;
F['16:9'] = { w: 1280, h: 720, safe: { top: 56, right: 80, bottom: 64, left: 80 }, captionBottom: 28, zones: [] };
F['1080p'] = { w: 1920, h: 1080, safe: { top: 84, right: 120, bottom: 96, left: 120 }, captionBottom: 42, zones: [] };
// 抖音 / 小红书 / Reels / Shorts: keep text out of the top bar, right action rail and bottom info area
F['9:16'] = {
  w: 1080, h: 1920, safe: { top: 250, right: 160, bottom: 460, left: 72 }, captionBottom: 470,
  zones: [
    { name: 'top-bar', x: 0, y: 0, w: 1080, h: 200 },            // status bar + search/tabs
    { name: 'right-rail', x: 930, y: 760, w: 150, h: 820 },      // avatar / like / comment / share / music
    { name: 'bottom-info', x: 0, y: 1580, w: 1080, h: 340 },     // @author, description, music ticker, nav bar
  ],
};
F['1:1'] = { w: 1080, h: 1080, safe: { top: 80, right: 80, bottom: 96, left: 80 }, captionBottom: 44, zones: [] };
F['4:5'] = { w: 1080, h: 1350, safe: { top: 90, right: 80, bottom: 120, left: 80 }, captionBottom: 60, zones: [] };
// aliases
F.landscape = F['16:9']; F.vertical = F['9:16']; F.square = F['1:1']; F.portrait = F['4:5'];

export function resolveFormat(name, w, h) {
  if (name && !F[name]) unknownName('formats', name, Object.keys(F));
  const f = F[name] || null;
  if (f && !w && !h) return JSON.parse(JSON.stringify(f));
  w = w || (f ? f.w : 1280); h = h || (f ? f.h : 720);
  if (f) { // scale the preset's safe area to a custom size of the same aspect
    const k = w / f.w, s = f.safe;
    return { w, h, safe: { top: s.top * k, right: s.right * k, bottom: s.bottom * k, left: s.left * k }, captionBottom: f.captionBottom * k, zones: f.zones.map(z => ({ name: z.name, x: z.x * k, y: z.y * k, w: z.w * k, h: z.h * k })) };
  }
  const m = Math.round(Math.min(w, h) * .075);
  return { w, h, safe: { top: m, right: Math.round(w * .0625), bottom: m, left: Math.round(w * .0625) }, captionBottom: Math.round(h * .04), zones: [] };
}
