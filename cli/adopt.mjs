// vk adopt page.html|URL -o out.mp4 --duration 12 [--fps 30] [--size 1280x720] [--warmup 3] [--from 0] [--seed 1]
//          [--timers] [--canvas [selector]] [--crf 18] [--frames dir] [--wait-for "expr"]
// Capture an EXISTING realtime page (a three.js / canvas / CSS demo that animates off requestAnimationFrame and
// performance.now) frame-perfect, without rewriting it for vk.video's render(t) contract. A time shim is injected
// before any page script: performance.now / Date.now / new Date() are frozen to a virtual clock, requestAnimationFrame
// is hijacked (callbacks only run when the harness advances the clock), Math.random is seeded, and optionally
// setTimeout/setInterval run on the virtual clock (--timers). WAAPI/CSS animations and <video>/<audio> are paused and
// scrubbed to the virtual time. The harness then advances 1000/fps ms per frame and captures each frame.
// SEQUENTIAL ONLY: a realtime demo's state is the integral of every previous frame (physics, particles, accumulated
// camera moves), so it cannot be seeked and cannot be split across parallel workers; frames are captured in order
// in ONE browser. Expect it to be slower than vk render. For seekable/parallel output port the page to vk.video
// (or wrap stateful parts in vk.three.sim, which snapshots state for seeking).
import { parseArgs, fs, path, spawn, startServer, pageUrl, LAUNCH } from './lib.mjs';

// The injected shim (also exported for tests: evaluate it with any object as `window`).
export function timeshimSource({ seed = 1, timers = false, epoch = Date.UTC(2026, 0, 1) } = {}) {
  return `(() => {
  const W = window, RD = W.Date, D0 = ${+epoch}; let now = 0;
  const cbs = new Map(); let nid = 0;
  W.__vkRealNow = W.performance && W.performance.now ? W.performance.now.bind(W.performance) : () => RD.now();
  if (W.performance) { try { W.performance.now = () => now; } catch (e) { Object.defineProperty(W.performance, 'now', { value: () => now }); } }
  class VDate extends RD { constructor(...a) { if (a.length) super(...a); else super(D0 + now); } static now() { return D0 + now; } }
  W.Date = VDate;
  W.requestAnimationFrame = cb => { cbs.set(++nid, cb); return nid; };
  W.cancelAnimationFrame = id => { cbs.delete(id); };
  let s = ${(seed >>> 0) || 1} ^ 0x9E3779B9;
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tq = []; let tid = 1e6;
  if (${!!timers}) {
    W.setTimeout = (cb, ms, ...a) => { const id = ++tid; tq.push({ id, due: now + Math.max(0, +ms || 0), cb, a, every: 0 }); return id; };
    W.setInterval = (cb, ms, ...a) => { const id = ++tid, every = Math.max(1, +ms || 0); tq.push({ id, due: now + every, cb, a, every }); return id; };
    W.clearTimeout = W.clearInterval = id => { const i = tq.findIndex(x => x.id === id); if (i >= 0) tq.splice(i, 1); };
  }
  const media = () => { const d = W.document; if (!d) return; if (d.getAnimations) for (const an of d.getAnimations()) { try { an.pause(); an.currentTime = now; } catch (e) {} }
    if (d.querySelectorAll) for (const m of d.querySelectorAll('video,audio')) { try { m.pause(); m.currentTime = now / 1000; } catch (e) {} } };
  W.__vclock = () => now;
  W.__advance = ms => {
    const target = now + ms;
    for (;;) { let k = -1; for (let i = 0; i < tq.length; i++) if (tq[i].due <= target && (k < 0 || tq[i].due < tq[k].due || (tq[i].due === tq[k].due && tq[i].id < tq[k].id))) k = i;
      if (k < 0) break; const x = tq[k]; now = Math.max(now, x.due); if (x.every) x.due += x.every; else tq.splice(k, 1);
      try { typeof x.cb === 'function' ? x.cb(...x.a) : null; } catch (e) { console.error(e); } }
    now = target; media();
    const list = [...cbs]; cbs.clear(); for (const [, cb] of list) { try { cb(now); } catch (e) { console.error(e); } }
    return list.length;
  };
})();`;
}

const HELP = `usage: vk adopt page.html|URL -o out.mp4 --duration s [--fps 30] [--size 1280x720] [--warmup 3] [--from 0]
                [--seed 1] [--timers] [--canvas [selector]] [--crf 18] [--frames dir] [--wait-for "js expr"]
  captures an existing realtime (requestAnimationFrame) page on a virtual clock — SEQUENTIAL ONLY (no seeking,
  no parallel workers). --canvas grabs the canvas pixels directly (faster, no page chrome); default = viewport screenshot.`;

export default async function adopt(argv) {
  const opt = parseArgs(argv, ['timers']);
  const src = opt._[0];
  if (!src || opt.help) { console.log(HELP); if (!src) process.exitCode = 1; return; }
  const fps = +(opt.fps || 30), dur = +(opt.duration || opt.dur || 10), from = +(opt.from || 0), warm = +(opt.warmup != null ? opt.warmup : 3);
  const [w, h] = String(opt.size || '1280x720').split('x').map(Number), crf = String(opt.crf || 18);
  const out = path.resolve(opt.out || 'out/adopt.mp4'); fs.mkdirSync(path.dirname(out), { recursive: true });
  const { chromium } = await import('playwright');
  let server = null, url = src;
  if (!/^https?:\/\//.test(src)) { const s = await startServer(); server = s.server; url = pageUrl(s.port, path.resolve(src)); }
  const browser = await chromium.launch(LAUNCH);
  const t0 = Date.now();
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.addInitScript(timeshimSource({ seed: +(opt.seed || 1), timers: !!opt.timers }));
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    // async loading (fetch / decode / shader compile) settles in REAL time while the virtual clock stays at 0
    for (let i = 0; i < warm * 4; i++) { await page.waitForTimeout(250); await page.evaluate(() => window.__advance(0)); }
    if (opt.waitFor) await page.waitForFunction(opt.waitFor, null, { timeout: 120000 });
    const dt = 1000 / fps, N = Math.round(dur * fps);
    for (let i = 0, k = Math.round(from * fps); i < k; i++) await page.evaluate(d => window.__advance(d), dt);
    const sel = opt.canvas === true ? 'canvas' : opt.canvas;
    if (sel && !(await page.$(sel))) throw new Error(`--canvas: no element matches "${sel}"`);
    if (opt.frames) fs.mkdirSync(opt.frames, { recursive: true });
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', '-',
      '-vf', `scale=${w}:${h}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg exit ' + c)) : res())));
    for (let i = 0; i < N; i++) {
      // frame i shows the state at t = from + i/fps: the first frame is the warmed-up page at the start time
      if (i) await page.evaluate(d => window.__advance(d), dt);
      let buf;
      if (sel) { const b64 = await page.evaluate(s => document.querySelector(s).toDataURL('image/png').split(',')[1], sel); buf = Buffer.from(b64, 'base64'); }
      else buf = await page.screenshot({ type: 'png' });
      if (opt.frames) fs.writeFileSync(path.join(opt.frames, `f${String(i).padStart(5, '0')}.png`), buf);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % fps === 0) process.stdout.write(`\r[vk adopt] ${i}/${N} frames`);
    }
    ff.stdin.end(); await closed;
    console.log(`\r[vk adopt] ${N} frames → ${path.relative(process.cwd(), out)}  ${((Date.now() - t0) / 1000).toFixed(1)}s (sequential)`);
    if (errs.length) console.log(`  page errors (${errs.length}): ${errs.slice(0, 3).join(' | ')}`);
  } finally { await browser.close(); if (server) server.close(); }
}
