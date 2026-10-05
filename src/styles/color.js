// Colour helpers for style packs (pure): hex ↔ rgb, mix, shade, palette quantisation, k-means (used by `vk style extract`).
export function hex2rgb(c) {
  const s = String(c).trim(); let m = /^#([0-9a-f]{3})$/i.exec(s); if (m) return [...m[1]].map(ch => parseInt(ch + ch, 16));
  m = /^#([0-9a-f]{6})/i.exec(s); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  m = /rgba?\(([^)]+)\)/i.exec(s); if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map(Number);
  return [0, 0, 0];
}
export const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
export const shade = (c, k) => (k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k));   // k ∈ [−1, 1]
export const luma = c => { const [r, g, b] = hex2rgb(c); return (.2126 * r + .7152 * g + .0722 * b) / 255; };
export function rgba(c, a) { const [r, g, b] = hex2rgb(c); return `rgba(${r},${g},${b},${a})`; }
export function nearest(c, palette) { const A = hex2rgb(c); let best = palette[0], bd = Infinity; for (const p of palette) { const B = hex2rgb(p), d = (A[0] - B[0]) ** 2 * .3 + (A[1] - B[1]) ** 2 * .59 + (A[2] - B[2]) ** 2 * .11; if (d < bd) { bd = d; best = p; } } return best; }
// deterministic k-means (k-means++ seeding from a seeded LCG) over [[r,g,b], …] → centroids sorted by population
export function kmeans(px, k = 6, o = {}) {
  let s = (o.seed || 7) >>> 0; const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const C = [px[Math.floor(R() * px.length)].slice()];
  while (C.length < k) {
    const D = px.map(p => Math.min(...C.map(c => d2(p, c)))), tot = D.reduce((a, b) => a + b, 0) || 1;
    let r = R() * tot, i = 0; for (; i < D.length - 1 && r > D[i]; i++) r -= D[i]; C.push(px[i].slice());
  }
  let lab = new Array(px.length).fill(0);
  for (let it = 0; it < (o.iter || 16); it++) {
    lab = px.map(p => { let bi = 0, bd = Infinity; C.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; bi = j; } }); return bi; });
    const S = C.map(() => [0, 0, 0, 0]); px.forEach((p, i) => { const a = S[lab[i]]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; });
    S.forEach((a, j) => { if (a[3]) C[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  const n = C.map((_, j) => lab.filter(l => l === j).length);
  return C.map((c, j) => ({ rgb: c.map(Math.round), hex: rgb2hex(c), share: n[j] / px.length })).sort((a, b) => b.share - a.share);
}
