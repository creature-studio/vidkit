// Name suggestions (pure, no DOM): Levenshtein distance + did-you-mean ranking over a registry's names.
export function lev(a, b) {
  a = String(a); b = String(b); const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) { cur[0] = i; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); [prev, cur] = [cur, prev]; }
  return prev[n];
}
// up to k valid names close to `name` (case-insensitive; prefix matches rank higher), [] when nothing is close
export function suggest(name, valid, k = 3) {
  const s = String(name).toLowerCase(), max = Math.max(2, Math.ceil(s.length / 3));
  return [...new Set(valid)].map(v => { const w = String(v).toLowerCase(); return { v, d: lev(s, w) - (w.startsWith(s) || s.startsWith(w) ? 1 : 0) }; })
    .filter(x => x.d <= max).sort((a, b) => a.d - b.d || String(a.v).length - String(b.v).length).slice(0, k).map(x => x.v);
}
