// SVG effects: stroke draw-on, draw-then-fill, and path morphing.
import { registry } from '../core/plugin.js';
import { compatible } from '../core/interp.js';

const FX = registry.fx;
export function shapesOf(el) {
  if (/^(path|line|polyline|polygon|circle|ellipse|rect)$/i.test(el.tagName)) return [el];
  return [...el.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect')];
}
// stroke draw-on (dasharray = getTotalLength). o: {t, d, each}
FX.draw = (el, o, api) => {
  const shapes = shapesOf(el);
  api.tween(el, { t: o.t, d: 1e-4, from: { opacity: 0 }, to: { opacity: 1 } });
  api.tween(shapes, { t: o.t, d: o.d || 1.2, ease: o.ease || 'inOutCubic', stagger: o.each || o.drawStagger, from: { draw: api.exit ? 1 : 0 }, to: { draw: api.exit ? 0 : 1 } });
};
// draw the outline, then flood the fill in. o: {t, d, fillAt, fillD}
FX['draw-fill'] = (el, o, api) => {
  const shapes = shapesOf(el), d = o.d || 1.2;
  FX.draw(el, o, api);
  shapes.forEach(s => { if (!s.getAttribute('fill-opacity')) s.setAttribute('fill-opacity', '0'); });
  api.tween(shapes, { t: o.fillAt != null ? o.fillAt : o.t + d * .75, d: o.fillD || .5, ease: 'outCubic', stagger: o.each, from: { 'attr:fill-opacity': 0 }, to: { 'attr:fill-opacity': 1 } });
};
FX.fill = FX['draw-fill'];

// Resample any path to n points (makes arbitrary paths morph-compatible). Uses an on-screen temp <svg>.
let tmpSvg = null;
export function resample(d, n = 120) {
  if (!tmpSvg) { tmpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); tmpSvg.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:10px;height:10px'); document.body.appendChild(tmpSvg); }
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); tmpSvg.appendChild(p);
  const L = p.getTotalLength(), pts = [];
  for (let i = 0; i < n; i++) { const q = p.getPointAtLength(L * i / n); pts.push(`${q.x.toFixed(2)} ${q.y.toFixed(2)}`); }
  p.remove(); return 'M' + pts.join(' L') + ' Z';
}
// morph: o.to = path d (or o.paths = [d0, d1, d2…] with o.each seconds per step). Compatible paths
// (same commands/number count) interpolate exactly; otherwise both are resampled to n points.
FX.morph = (el, o, api) => {
  const path = el.tagName.toLowerCase() === 'path' ? el : el.querySelector('path');
  const seq = o.paths ? o.paths.slice() : [path.getAttribute('d'), o.to];
  const allCompat = seq.every(d => compatible(d, seq[0]));
  const norm = allCompat ? seq : seq.map(d => resample(d, o.n || 120));
  path.setAttribute('d', norm[0]);
  const step = o.each || (o.d || .9) + .4;
  for (let i = 1; i < norm.length; i++) api.tween(path, { t: o.t + (i - 1) * step, d: o.d || .9, ease: o.ease || 'inOutCubic', from: { 'attr:d': norm[i - 1] }, to: { 'attr:d': norm[i] } });
};
