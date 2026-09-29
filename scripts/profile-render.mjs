// Per-frame render profiling: node scripts/profile-render.mjs page.html [--n 40] [--from s --to s] [--flags gpu|swiftshader|nogpu]
//   [--strip filters,rice,cssfilter] [--trace out.json]
// Prints median ms for: seek (render(t) JS + IPC), screenshot (style/layout/paint/raster/filters + capture + encode),
// re-shot (same frame again: capture+encode floor), plus a Chrome trace breakdown when --trace is given.
import { chromium } from 'playwright';
import { parseArgs, startServer, pageUrl, probeInfo, LAUNCH, fs, path } from '../cli/lib.mjs';
const opt = parseArgs(process.argv.slice(2));
const abs = path.resolve(opt._[0]);
const FLAGS = {
  swiftshader: LAUNCH.args,
  nogpu: LAUNCH.args.filter(a => !/use-gl|use-angle|swiftshader/.test(a)).concat(['--disable-gpu']),
  nogpucomp: LAUNCH.args.concat(['--disable-gpu-compositing']),
};
const args = FLAGS[opt.flags || 'swiftshader'].concat(opt.extra ? String(opt.extra).split(' ') : []);
const { server, port } = await startServer();
const url = pageUrl(port, abs, { render: '1', fps: '30' });
const browser = await chromium.launch({ args });
const info = await probeInfo(browser, url);
const ctx = await browser.newContext({ viewport: { width: info.size.width, height: info.size.height } });
const page = await ctx.newPage();
await page.goto(url); await page.waitForFunction(() => window.__ready); await page.evaluate(() => window.__ready);
const strip = new Set(String(opt.strip || '').split(',').filter(Boolean));
if (strip.size) await page.evaluate(s => {
  const st = document.createElement('style'); let css = '';
  if (s.includes('all')) css += '#stage{visibility:hidden!important}';
  if (s.includes('rice')) css += '.vk-rice{display:none!important}';
  if (s.includes('cssfilter')) css += '.vk-scene{filter:none!important}';
  if (s.includes('filters')) css += '[filter]{filter:none!important}';
  st.textContent = css; document.head.appendChild(st);
  if (s.includes('filters')) document.querySelectorAll('[filter]').forEach(e => e.removeAttribute('filter'));
}, [...strip]);
const cdp = await ctx.newCDPSession(page);
const n = +(opt.n || 40), t0 = +(opt.from || 0), t1 = +(opt.to || info.dur);
const times = Array.from({ length: n }, (_, i) => +(t0 + (t1 - t0) * (i + .5) / n).toFixed(3));
const now = () => Number(process.hrtime.bigint()) / 1e6;
const R = { seek: [], shotJpeg: [], reshotJpeg: [], shotPng: [], raf: [], bytesJ: [], pwShot: [] };
if (opt.trace) await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,cc,viz,blink,gpu,skia', transferMode: 'ReturnAsStream' });
for (const t of times) {
  let a = now(); await page.evaluate(t => window.__seek(t), t); R.seek.push(now() - a);
  a = now(); const j = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95 }); R.shotJpeg.push(now() - a); R.bytesJ.push(j.data.length * .75);
  a = now(); await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95 }); R.reshotJpeg.push(now() - a);
  if (!opt.trace) {
    await page.evaluate(t => window.__seek(t + 1 / 60), t);
    a = now(); await cdp.send('Page.captureScreenshot', { format: 'png' }); R.shotPng.push(now() - a);
    await page.evaluate(t => window.__seek(t + 1 / 45), t);
    a = now(); await page.screenshot({ type: 'jpeg', quality: 95, clip: { x: 0, y: 0, width: info.size.width, height: info.size.height } }); R.pwShot.push(now() - a);
    await page.evaluate(t => window.__seek(t + 1 / 90), t);
    a = now(); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); R.raf.push(now() - a);
  }
}
const med = x => { if (!x.length) return null; const s = [...x].sort((a, b) => a - b); return +s[Math.floor(s.length / 2)].toFixed(1); };
const mean = x => x.length ? +(x.reduce((a, b) => a + b, 0) / x.length).toFixed(1) : null;
const out = {}; for (const k in R) out[k] = { med: med(R[k]), mean: mean(R[k]) };
console.log(JSON.stringify({ page: path.basename(abs), flags: opt.flags || 'swiftshader', strip: [...strip], n, ...out }));
if (opt.trace) {
  const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end'); const { stream } = await done;
  let data = ''; for (;;) { const c = await cdp.send('IO.read', { handle: stream }); data += c.base64Encoded ? Buffer.from(c.data, 'base64').toString() : c.data; if (c.eof) break; }
  fs.writeFileSync(opt.trace, data);
  const ev = JSON.parse(data); const events = ev.traceEvents || ev;
  const threads = {}; events.filter(e => e.ph === 'M' && e.name === 'thread_name').forEach(e => { threads[e.pid + ':' + e.tid] = e.args.name; });
  const agg = {};
  for (const e of events) if (e.ph === 'X' && e.dur) { const th = (threads[e.pid + ':' + e.tid] || '?').replace(/\d+$/, ''), k = th + ' | ' + e.name; agg[k] = (agg[k] || 0) + e.dur / 1000; }
  const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 45).map(([k, v]) => `${(v / n).toFixed(2).padStart(8)} ms/frame  ${k}`);
  console.log(top.join('\n'));
}
await browser.close(); server.close();
