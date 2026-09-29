// Camera math (pure). Keys: [{t, x, y, s, r, ease}] — (x,y) is the stage point to centre on, s zoom, r rotation (deg).
import { getEase } from './ease.js';
import { hash } from './random.js';

export function normKeys(keys, W, H) {
  return keys.map(k => ({ t: +k.t || 0, x: k.x == null ? W / 2 : +k.x, y: k.y == null ? H / 2 : +k.y, s: k.s == null ? (k.zoom == null ? 1 : +k.zoom) : +k.s, r: +(k.r || k.rotate || 0), ease: getEase(k.ease || 'inOutCubic') }))
    .sort((a, b) => a.t - b.t);
}
export function camAt(keys, lt) {
  if (lt <= keys[0].t) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    if (lt < keys[i].t) {
      const a = keys[i - 1], b = keys[i], p = b.ease((lt - a.t) / (b.t - a.t));
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s * Math.pow(b.s / a.s, p), r: a.r + (b.r - a.r) * p };
    }
  }
  return keys[keys.length - 1];
}
// deterministic shake offset, quantised to `rate` fps (24 = film)
export function shakeAt(shakes, lt, rate = 24) {
  let dx = 0, dy = 0, dr = 0;
  shakes.forEach((sh, si) => {
    if (lt < sh.t || lt > sh.t + sh.d) return;
    const f = Math.floor(lt * rate + 1e-6), q = Math.max(0, f / rate - sh.t);   // whole shake is quantised ("on twos")
    const a = sh.amp * Math.exp(-sh.k * q) * Math.max(0, 1 - q / sh.d);
    dx += (hash(f * 1.7 + si * 13) - .5) * 2 * a; dy += (hash(f * 2.3 + 9 + si * 13) - .5) * 2 * a; dr += (hash(f * 3.1 + 4 + si * 7) - .5) * a * .08 * (sh.rot || 0);
  });
  return { dx, dy, dr };
}
// full camera transform for a scene at local time
export function cameraTransform(c, W, H, lt, dur) {
  const k = c.keys ? camAt(c.keys, lt) : { x: W / 2, y: H / 2, s: 1, r: 0 };
  const push = c.push ? 1 + c.push * Math.min(1, lt / dur) : 1;
  const zs = k.s * push * (1 + (c.extraZoom ? c.extraZoom(lt) : 0));
  const sh = shakeAt(c.shakes || [], lt);
  return `translate(${W / 2 + sh.dx}px,${H / 2 + sh.dy}px) rotate(${k.r + sh.dr}deg) scale(${zs}) translate(${-k.x}px,${-k.y}px)`;
}
