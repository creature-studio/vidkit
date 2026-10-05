// vk.three.sim — stateful simulations made seekable: a fixed-dt integrator with exact snapshots every N steps, so any
// worker can jump to any frame (restore the nearest snapshot ≤ t, step forward) and gets bit-identical state to a
// straight run from 0. Snapshots are built once in setup (and shared through the vk.three disk cache across workers
// and runs when the CLI serves the page).
//   const S = vk.three.sim({ dt: 1 / 120, duration: 12, every: 1,
//     init: rand => ({ p: new Float32Array(3 * N), v: new Float32Array(3 * N) }),   // state: typed arrays + numbers
//     step: (s, dt, t, i) => { … mutate s … } })                                    // pure in (s, i): no Math.random, no clock
//   module use: sc.three([S.module({ setup(ctx, S) { … meshes … }, render(state, t, info) { … write meshes … } })])
//   direct use: await S.ready(ctx) in a setup, then S.at(t) in update (read-only state; copy if you keep it)
// Rules: step may only read its state, dt, t and i (and constants); a seeded rand is given to init only. The cache key
// covers dt, duration, every, seed, the init/step source and o.key — bump o.key when captured outer constants change.
const isTA = v => ArrayBuffer.isView(v) && !(v instanceof DataView);
export function cloneState(s) { const o = {}; for (const k in s) { const v = s[k]; o[k] = isTA(v) ? v.slice() : v; } return o; }
export function copyInto(dst, src) { for (const k in src) { const v = src[k]; if (isTA(v)) { if (dst[k] && dst[k].length === v.length) dst[k].set(v); else dst[k] = v.slice(); } else dst[k] = v; } return dst; }
export function stepOf(t, dt) { return Math.max(0, Math.floor(t / dt + 1e-6)); }
// pure core (no DOM): build(o) → {snapshots, every, at(t), stepTo(n)}
export function makeSimCore(o, rand) {
  const dt = o.dt || 1 / 120, every = Math.max(1, Math.round((o.every != null ? o.every : 1) / dt)), maxStep = stepOf(o.duration != null ? o.duration : 10, dt) + 1;
  if (typeof o.init !== 'function' || typeof o.step !== 'function') throw new Error('[vk.three.sim] needs init(rand) → state and step(state, dt, t, i)');
  const core = { dt, every, maxStep, snapshots: [], cur: null, curStep: -1, stats: { steps: 0, restores: 0 } };
  core.build = () => {
    const s = o.init(rand); core.snapshots = [cloneState(s)];
    for (let i = 0; i < maxStep; i++) { o.step(s, dt, i * dt, i); core.stats.steps++; if ((i + 1) % every === 0) core.snapshots.push(cloneState(s)); }
    core.cur = null; core.curStep = -1; return core;
  };
  // state at step n (n ≥ 0): restore the nearest snapshot ≤ n unless the cursor is already between it and n
  core.stepTo = n => {
    n = Math.min(Math.max(0, n), maxStep); const k = Math.min(core.snapshots.length - 1, Math.floor(n / every)), base = k * every;
    if (!core.cur || core.curStep > n || core.curStep < base) { core.cur = copyInto(core.cur || {}, core.snapshots[k]); core.curStep = base; core.stats.restores++; }
    while (core.curStep < n) { o.step(core.cur, dt, core.curStep * dt, core.curStep); core.curStep++; core.stats.steps++; }
    return core.cur;
  };
  core.at = t => core.stepTo(stepOf(t, dt));
  return core;
}
export function makeSim({ cacheKey, cacheGet, cachePut, mulberry32 }) {
  return function sim(o = {}) {
    let core = null, readyP = null;
    const S = { o };
    S.ready = (ctx = {}) => readyP || (readyP = (async () => {
      const P = window.__vkThreeProf, t0 = performance.now();
      core = makeSimCore(o, mulberry32(o.seed || 1));
      const key = o.cache === false ? null : await cacheKey({ kind: 'sim', v: 1, dt: core.dt, every: core.every, max: core.maxStep, seed: o.seed || 1, init: String(o.init), step: String(o.step), key: o.key || null });
      const hit = key ? await cacheGet(key) : null;
      if (hit && hit.meta && hit.meta.n) {
        const snaps = []; for (let i = 0; i < hit.meta.n; i++) { const s = {}; for (const k of hit.meta.keys) s[k] = hit.meta.nums[k] ? hit.meta.vals[i][k] : hit.arrays[i + ':' + k]; snaps.push(s); }
        core.snapshots = snaps; if (P) P.simCached = (P.simCached || 0) + 1;
      } else {
        core.build();
        if (key) { const first = core.snapshots[0], keys = Object.keys(first), nums = {}, arrays = {}, vals = []; keys.forEach(k => { nums[k] = !isTA(first[k]); });
          core.snapshots.forEach((s, i) => { const v = {}; keys.forEach(k => { if (nums[k]) v[k] = s[k]; else arrays[i + ':' + k] = s[k]; }); vals.push(v); });
          cachePut(key, { n: core.snapshots.length, keys, nums, vals }, arrays); }
      }
      if (P) P.sim = (P.sim || 0) + performance.now() - t0;
      return S;
    })());
    S.at = t => { if (!core) throw new Error('[vk.three.sim] call await S.ready(ctx) in setup before S.at(t)'); return core.at(t); };
    S.stepTo = n => core.stepTo(n);
    Object.defineProperty(S, 'core', { get: () => core });
    S.module = (m = {}) => ({ async setup(ctx) { await S.ready(ctx); if (m.setup) return m.setup(ctx, S); }, update(t, info) { const st = S.at(t); if (m.render) m.render(st, t, info); } });
    return S;
  };
}
