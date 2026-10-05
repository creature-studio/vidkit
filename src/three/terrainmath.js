// Pure terrain / geo maths for vk.three.terrain, vk.three.globe and the isometric diorama (no THREE, no DOM):
// integer-hash value noise, fbm / ridged / island height fields, image heightmaps, colour ramps, lat/lon → xyz,
// great-circle arcs. Deterministic from the options and seed (unit tested in Node).
import { unknownName } from '../core/strict.js';

const ih = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
export function vnoise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const a = ih(xi, yi, seed), b = ih(xi + 1, yi, seed), c = ih(xi, yi + 1, seed), d = ih(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm2(x, y, o = {}) {
  const oct = o.octaves || 5, lac = o.lacunarity || 2.03, gain = o.gain || .5, seed = o.seed || 0; let s = 0, a = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise2(x * f + i * 17.7, y * f - i * 9.3, seed + i * 31); n += a; a *= gain; f *= lac; }
  return s / n;
}
export function ridged2(x, y, o = {}) {
  const oct = o.octaves || 5, lac = o.lacunarity || 2.03, gain = o.gain || .5, seed = o.seed || 0; let s = 0, a = 1, f = 1, n = 0, w = 1;
  for (let i = 0; i < oct; i++) { let r = 1 - Math.abs(vnoise2(x * f + i * 17.7, y * f - i * 9.3, seed + i * 31) * 2 - 1); r *= r; r *= w; w = Math.min(1, r * 2); s += a * r; n += a; a *= gain; f *= lac; }
  return s / n;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// height field → fn(x, z) ∈ [0, 1] (multiply by height). types: fbm hills mountains ridged island mesa dunes flat | fn | {image data}
export const FIELD_TYPES = ['fbm', 'hills', 'mountains', 'ridged', 'island', 'mesa', 'dunes', 'flat'];
export function heightField(o = {}) {
  const type = o.type || 'mountains', sc = o.scale || 1, seed = o.seed || 1, size = o.size ? (Array.isArray(o.size) ? Math.max(...o.size) : o.size) : 20;
  if (typeof type === 'function') return type;
  const k = 1 / (size * .25 * sc);
  const shape = o.falloff ? ((x, z) => { const r = Math.hypot(x, z) / (size * .5); return 1 - smooth(o.falloff[0] != null ? o.falloff[0] : .55, o.falloff[1] != null ? o.falloff[1] : 1, r); }) : () => 1;
  let f;
  switch (type) {
    case 'fbm': f = (x, z) => fbm2(x * k, z * k, { seed, octaves: o.octaves || 5 }); break;
    case 'hills': f = (x, z) => Math.pow(fbm2(x * k * .7, z * k * .7, { seed, octaves: 3 }), 1.4) * 1.3; break;
    case 'mountains': f = (x, z) => { const r = ridged2(x * k, z * k, { seed, octaves: o.octaves || 6 }), b = fbm2(x * k * .4, z * k * .4, { seed: seed + 7, octaves: 3 }); return Math.pow(r * .75 + b * .45, o.sharp || 1.6) * 1.2; }; break;
    case 'ridged': f = (x, z) => ridged2(x * k, z * k, { seed, octaves: o.octaves || 6 }); break;
    case 'island': f = (x, z) => { const r = Math.hypot(x, z) / (size * .5), base = fbm2(x * k, z * k, { seed, octaves: 5 }); return Math.min(1, Math.max(0, base * 1.1 - smooth(.3, 1.05, r) * .85 + .15)); }; break;
    case 'mesa': f = (x, z) => { const v = fbm2(x * k * .8, z * k * .8, { seed, octaves: 4 }); return Math.round(v * 4) / 4 * .6 + v * .4; }; break;
    case 'dunes': f = (x, z) => { const w = fbm2(x * k * .5, z * k * .5, { seed, octaves: 2 }); return .5 + .5 * Math.sin(x * k * 6 + w * 6) * .5 + w * .5 - .25; }; break;
    case 'flat': f = () => 0; break;
    default: unknownName('terrains', type, FIELD_TYPES, { fatal: true });
  }
  const pk = o.peaks || [];
  return (x, z) => { let v = f(x, z) * shape(x, z); for (const p of pk) v += (p.h || .5) * Math.exp(-(((x - (p.x || 0)) ** 2) + ((z - (p.z || 0)) ** 2)) / (2 * (p.r || 2) ** 2)); return v; };
}
// grayscale heightmap (RGBA bytes, w × h) → fn(x, z) bilinear over a size [W, D] centred at 0
export function imageField(data, w, h, size = [20, 20]) {
  const [W, D] = Array.isArray(size) ? size : [size, size], g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = (data[i * 4] * .2126 + data[i * 4 + 1] * .7152 + data[i * 4 + 2] * .0722) / 255;
  return (x, z) => { const u = Math.min(w - 1.001, Math.max(0, (x / W + .5) * (w - 1))), v = Math.min(h - 1.001, Math.max(0, (z / D + .5) * (h - 1))), x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0, i = y0 * w + x0;
    return (g[i] * (1 - fx) + g[i + 1] * fx) * (1 - fy) + (g[i + w] * (1 - fx) + g[i + w + 1] * fx) * fy; };
}
// colour ramps: [[h 0..1, '#hex'], …] (+ slope rock colour, snow line) — names: alpine desert ink paper island lava mono
export const RAMPS = {
  alpine: [[0, '#3f6b3a'], [.35, '#5d8a45'], [.6, '#8a7d5a'], [.78, '#7a746c'], [.9, '#eeeeee']],
  island: [[0, '#d9c58e'], [.08, '#7fae4e'], [.45, '#4f8a3c'], [.75, '#6d6a5c'], [.92, '#f2f2f2']],
  desert: [[0, '#c98f55'], [.5, '#d9a86c'], [.8, '#b3784a'], [1, '#8f5a3a']],
  ink: [[0, '#d8d2c2'], [.35, '#9c9a92'], [.65, '#55575a'], [.85, '#2c2e31'], [1, '#1b1c1e']],
  paper: [[0, '#efe6d2'], [.5, '#e3d6b8'], [1, '#cdbb96']],
  lava: [[0, '#1a1414'], [.6, '#3a2a28'], [.85, '#7a2c18'], [1, '#ff6a1a']],
  mono: [[0, '#202020'], [1, '#f0f0f0']],
};
const hex = c => { if (Array.isArray(c)) return c; if (typeof c === 'number') return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255]; const n = parseInt(String(c).replace('#', '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
export function ramp(stops = 'alpine') {
  const S = (typeof stops === 'string' ? (RAMPS[stops] || unknownName('ramps', stops, Object.keys(RAMPS), { fatal: true })) : stops).map(([h, c]) => [h, hex(c)]);
  return h => { if (h <= S[0][0]) return S[0][1].slice(); for (let i = 1; i < S.length; i++) if (h < S[i][0]) { const p = (h - S[i - 1][0]) / (S[i][0] - S[i - 1][0]); return S[i - 1][1].map((v, j) => v + (S[i][1][j] - v) * p); } return S[S.length - 1][1].slice(); };
}
export { hex as rgbOf };
/* ---------------- geo ---------------- */
const D2R = Math.PI / 180;
// lat/lon (deg) → xyz on a sphere of radius r (y up, lon 0 at +z, east = +x)
export function latLon(lat, lon, r = 1) { const p = lat * D2R, l = lon * D2R; return [r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l)]; }
// great-circle arc from a to b ([lat, lon]) lifted by height × sin(πs): n + 1 points
export function arcPoints(a, b, o = {}) {
  const n = o.n || 64, r = o.radius || 1, hgt = o.height != null ? o.height : .25, A = latLon(a[0], a[1], 1), B = latLon(b[0], b[1], 1);
  const dot = Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])), om = Math.acos(dot), so = Math.sin(om) || 1e-6, out = [];
  for (let i = 0; i <= n; i++) { const s = i / n, ka = Math.sin((1 - s) * om) / so, kb = Math.sin(s * om) / so, lift = 1 + hgt * Math.sin(Math.PI * s) * Math.min(1, om / 1.2); out.push([(A[0] * ka + B[0] * kb) * r * lift, (A[1] * ka + B[1] * kb) * r * lift, (A[2] * ka + B[2] * kb) * r * lift]); }
  return out;
}
