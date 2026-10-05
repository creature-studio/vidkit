// Frame capture back-ends for `vk render` / `vk stills` / `vk qa`.
//   beginframe (default) — chrome-headless-shell under begin-frame control: after render(t) we ask the compositor for
//                          exactly one frame and get its pixels back in the same call (HeadlessExperimental.beginFrame).
//                          No vsync / frame-rate waits, no Playwright round-trips, software raster + compositing.
//   screenshot           — the original path: Playwright page.screenshot() per frame (GL compositing on SwiftShader).
// Both return encoded images (JPEG q95 by default, or PNG) that are piped straight into ffmpeg (image2pipe, no files).
import { chromium } from 'playwright';
import { CDPBrowser, headlessShellPath } from './cdp.mjs';

export const COMMON_ARGS = ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-gpu-vsync', '--mute-audio',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];
// gpu: 'swiftshader' = GL compositing + raster on SwiftShader (old default) · 'soft' = software raster + compositing, WebGL
// still available through SwiftShader · 'off' = --disable-gpu (no WebGL)
export const GPU_ARGS = {
  swiftshader: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  soft: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-compositing', '--disable-gpu-rasterization'],
  off: ['--disable-gpu'],
};
// what --deterministic-mode switches on, spelled out (checker-imaging off = images are always decoded into the frame they appear in)
export const BEGIN_FRAME_ARGS = ['--enable-begin-frame-control', '--run-all-compositor-stages-before-draw', '--disable-new-content-rendering-timeout',
  '--disable-threaded-animation', '--disable-threaded-scrolling', '--disable-checker-imaging', '--disable-image-animation-resync'];
export const CAPTURE_MODES = ['beginframe', 'screenshot'];
export function captureFlags(mode = 'beginframe', gpu) {
  gpu = gpu || (mode === 'screenshot' ? 'swiftshader' : 'soft');
  if (!GPU_ARGS[gpu]) throw new Error(`unknown --gpu ${gpu} (${Object.keys(GPU_ARGS).join('|')})`);
  return [...COMMON_ARGS, ...GPU_ARGS[gpu], ...(mode === 'beginframe' ? BEGIN_FRAME_ARGS : [])];
}
export function resolveMode(mode) {
  mode = mode || process.env.VK_CAPTURE || 'beginframe';
  if (!CAPTURE_MODES.includes(mode)) throw new Error(`unknown --capture ${mode} (${CAPTURE_MODES.join('|')})`);
  if (mode === 'beginframe' && !headlessShellPath()) { console.log('  [warn] chrome-headless-shell not found → --capture screenshot'); return 'screenshot'; }
  return mode;
}

// A capture worker: open(url) → seek(t) → frame() → Buffer. Same interface for both back-ends.
export async function openWorker(mode, url, info, { scale = 1, type = 'jpeg', quality = 95, gpu, onError, onLog } = {}) {
  const W = info.size.width, H = info.size.height;
  if (mode === 'screenshot') {
    const browser = await chromium.launch({ args: captureFlags('screenshot', gpu) });
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') (onLog || console.log)('  [page] ' + m.text()); });
    page.on('pageerror', e => onError && onError(e.message));
    await page.goto(url); await page.waitForFunction(() => window.__ready); await page.evaluate(() => window.__ready);
    return {
      mode, page,
      seek: (t, frameT) => page.evaluate(([t, f]) => window.__seek(t, f), [t, frameT == null ? null : frameT]),
      evaluate: (fn, arg) => page.evaluate(fn, arg),
      frame: (fmt = type) => page.screenshot({ type: fmt, quality: fmt === 'jpeg' ? quality : undefined, clip: { x: 0, y: 0, width: W, height: H } }),
      close: () => browser.close(),
    };
  }
  // the headless surface is sized in physical pixels only when the browser itself runs at that scale factor
  const browser = await CDPBrowser.launch([...captureFlags('beginframe', gpu), ...(scale !== 1 ? [`--force-device-scale-factor=${scale}`] : [])]);
  const page = await browser.newPage({ width: W, height: H, scale });
  let seenErr = 0, seenLog = 0;
  const flush = () => {
    while (seenLog < page.logs.length) (onLog || console.log)('  [page] ' + page.logs[seenLog++]);
    while (seenErr < page.errors.length) onError && onError(page.errors[seenErr++]);
  };
  await page.goto(url); await page.evaluate('window.__ready.then(() => true)'); flush();
  let last = null;
  const shot = fmt => ({ format: fmt, ...(fmt === 'jpeg' ? { quality } : {}) });
  return {
    mode, page, browser,
    seek: async (t, frameT) => { const r = await page.evaluate(`window.__seek(${JSON.stringify(t)}${frameT != null ? ',' + JSON.stringify(frameT) : ''})`, { pumpAfter: 1000 }); flush(); return r; },
    evaluate: (fn, arg) => page.evaluate(`(${fn})(${arg === undefined ? '' : JSON.stringify(arg)})`),
    frame: async (fmt = type) => {
      const dirty = page.dirty; page.dirty = false;
      let r = await page.beginFrame(shot(fmt));
      // no damage → the compositor produced no new pixels, i.e. the frame is identical to the previous capture
      // (unless helper frames were pumped in between: then force a redraw)
      if (!r.data && last && last.fmt === fmt && !dirty) return last.buf;
      if (!r.data) r = await forceFrame(page, shot(fmt));
      last = { fmt, buf: r.data }; flush(); return r.data;
    },
    close: () => browser.close(),
  };
}
// first frame / format switch without damage: invalidate the root and draw again
async function forceFrame(page, shot) {
  // invalidate the root (a transparent 1px outline paints nothing but always produces damage) and draw again;
  // a few attempts, since the compositor may still be settling after load / pumped frames
  // a heavy first frame (GL work under CPU contention) can miss several begin-frame deadlines: keep trying for ~30 s
  const until = Date.now() + 30000;
  for (let i = 0; i < 12 || Date.now() < until; i++) {
    // repaint a 1px fixed probe whose colour alternates at alpha 0.001 (rounds to 0 → no visible pixel change,
    // but it is real paint invalidation, so the compositor reports damage); also toggle the root outline as before
    // after a few misses, alternate plain begin-frames (let in-flight raster of a heavy page finish) with invalidations
    if (i < 3 || i % 2 === 0) await page.evaluate(`(() => {
      let p = document.getElementById('__vk_dmg');
      if (!p) { p = document.createElement('div'); p.id = '__vk_dmg';
        p.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;pointer-events:none;z-index:2147483647';
        document.documentElement.appendChild(p); }
      p.style.background = p.style.background.startsWith('rgba(0, 0, 0') ? 'rgba(255,255,255,0.001)' : 'rgba(0,0,0,0.001)';
      const s = document.documentElement.style; s.outline = s.outline ? '' : '0 solid transparent'; return 1; })()`, { pumpAfter: null });
    const r = await page.beginFrame(shot);
    if (r.data) return r;
    await new Promise(res => setTimeout(res, Math.min(250, 15 * (i + 1))));
  }
  throw new Error('beginFrame returned no screenshot');
}
