// Shape generators with a fixed vertex count so any two shapes are morph-compatible
// (same number of points → lerpStr can interpolate the path string or polygon()).
export const SHAPE_N = 72;
export function shapePoints(kind, n = SHAPE_N, o = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2; let r = 1;
    switch (kind) {
      case 'circle': r = 1; break;
      case 'star': { const k = o.points || 5, inner = o.inner || .45, seg = (i / n) * k * 2, f = seg - Math.floor(seg), odd = Math.floor(seg) % 2; // lerp between tips/valleys along straight edges
        const ra = odd ? inner : 1, rb = odd ? 1 : inner; const A = Math.PI / k; const ang = f * A;
        r = (ra * rb * Math.sin(A)) / (rb * Math.sin(A - ang) + ra * Math.sin(ang) + 1e-9); break; }
      case 'diamond': case 'square': case 'triangle': case 'hexagon': case 'polygon': {
        const k = { diamond: 4, square: 4, triangle: 3, hexagon: 6 }[kind] || o.sides || 5, A = Math.PI * 2 / k;
        let aa = a + Math.PI / 2 + (kind === 'square' ? Math.PI / 4 : 0); aa = ((aa % A) + A) % A - A / 2; r = Math.cos(Math.PI / k) / Math.cos(aa); break; }
      case 'heart': { const t = (i / n) * Math.PI * 2; const x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); pts.push([x / 17, y / 17 - .1]); continue; }
      case 'blob': { r = 1 + .18 * Math.sin(a * 3 + (o.seed || 0)) + .1 * Math.sin(a * 5 + 1.7 * (o.seed || 0)); break; }
    }
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}
// → SVG path "d" centred at (cx,cy) with radius R
export function shapePath(kind, cx = 0, cy = 0, R = 100, o = {}) {
  const p = shapePoints(kind, o.n || SHAPE_N, o);
  return 'M' + p.map(([x, y]) => `${(cx + x * R).toFixed(2)} ${(cy + y * R).toFixed(2)}`).join(' L') + ' Z';
}
// → CSS clip-path polygon() in px
export function shapePolygon(kind, cx, cy, R, o = {}) {
  const p = shapePoints(kind, o.n || 48, o);
  return 'polygon(' + p.map(([x, y]) => `${(cx + x * R).toFixed(1)}px ${(cy + y * R).toFixed(1)}px`).join(',') + ')';
}
