// Clip-blending timeline for vk.three.mixer (pure, unit tested): timeline [{t, clip, fade, speed, loop, offset, weight}]
// → at time t: {clipName: {weight, time}}. Entry i fades in over its fade (default .3 s) starting at its t and fades out
// while entry i + 1 fades in; weights are normalised to sum 1. A clip used by consecutive entries keeps one action
// (weights add, the time of the heaviest entry wins). explicit = {clip: weight} overrides the timeline (times = t·speed).
const smooth = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
export function mixerTimeline(tl, t, durations = {}, explicit = null) {
  const out = {};
  const clipTime = (e, local) => { const d = durations[e.clip] || 1, x = (e.offset || 0) + Math.max(0, local) * (e.speed != null ? e.speed : 1); return e.loop === false ? Math.min(x, d - 1e-4) : ((x % d) + d) % d; };
  if (explicit) { for (const [k, w] of Object.entries(explicit)) { const d = durations[k] || 1; out[k] = { weight: w, time: ((t % d) + d) % d }; } return out; }
  if (!tl.length) return out;
  const E = tl.slice().sort((a, b) => a.t - b.t); let sum = 0;
  for (let i = 0; i < E.length; i++) {
    const e = E[i], nx = E[i + 1]; if (t < e.t && i > 0) continue;
    const fin = i === 0 ? 1 : smooth((t - e.t) / Math.max(1e-6, e.fade != null ? e.fade : .3)), fout = nx ? 1 - smooth((t - nx.t) / Math.max(1e-6, nx.fade != null ? nx.fade : .3)) : 1;
    const w = fin * fout * (e.weight != null ? e.weight : 1); if (w <= 1e-6) continue;
    const c = out[e.clip], time = clipTime(e, t - e.t);
    if (!c) out[e.clip] = { weight: w, time, best: w }; else { c.weight += w; if (w > c.best) { c.best = w; c.time = time; } }
    sum += w;
  }
  for (const k in out) { out[k].weight /= sum || 1; delete out[k].best; }
  return out;
}
