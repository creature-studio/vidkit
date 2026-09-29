// CPU cost per frame of the browser process tree, beginFrame capture, one worker (no contention):
//   node scripts/profile-cpu.mjs page.html [--n 60] [--from s --to s] [--strip rice,filters,cssfilter,farmid,live,cap] [--gpu swiftshader|off|comp]
//   [--format jpeg|png|webp] [--quality 95]
import { CDPBrowser, treeCpuSeconds } from '../cli/cdp.mjs';
import { parseArgs, startServer, pageUrl, fs, path } from '../cli/lib.mjs';
import { captureFlags } from '../cli/capture.mjs';
const opt = parseArgs(process.argv.slice(2)); const abs = path.resolve(opt._[0]);
const { server, port } = await startServer();
const url = pageUrl(port, abs, { render: '1', fps: '30', ...(opt.nocache ? { cache: '0' } : {}) });
const b = await CDPBrowser.launch(captureFlags('beginframe', opt.gpu || 'soft'));
const info0 = await (async () => { const p = await b.newPage({ width: 1280, height: 720 }); await p.goto(url); await p.evaluate('window.__ready.then(()=>1)'); const r = await p.evaluate('({size: window.__size, dur: window.__duration})'); await p.send('Page.close').catch(() => { }); return r; })();
const p = await b.newPage({ width: info0.size.width, height: info0.size.height });
await p.goto(url); await p.evaluate('window.__ready.then(()=>1)');
const strip = String(opt.strip || '').split(',').filter(Boolean), CSS = { rice: '.vk-rice{display:none!important}', filters: '[filter]{filter:none!important}', cssfilter: '.vk-scene,.vk-cam{filter:none!important}', farmid: '.tp-far,.tp-mid{display:none!important}', live: '.tp-live{display:none!important}', cap: '.vk-cap{display:none!important}', willchange: '*{will-change:auto!important}', all: '#stage{visibility:hidden!important}' };
if (strip.length) await p.evaluate(`(()=>{const st=document.createElement('style'); st.textContent=${JSON.stringify(strip.map(s => CSS[s]).join(''))}; document.head.appendChild(st); ${strip.includes('filters') ? "document.querySelectorAll('[filter]').forEach(e=>e.removeAttribute('filter'));" : ''} return 1})()`);
if (opt.css) await p.evaluate(`(()=>{const st=document.createElement('style'); st.textContent=${JSON.stringify(opt.css)}; document.head.appendChild(st); return 1})()`);
if (opt.js) await p.evaluate(`(()=>{${opt.js}; return 1})()`);
const n = +(opt.n || 60), t0 = +(opt.from || 0), t1 = +(opt.to || info0.dur);
const fmt = opt.format || 'jpeg', shot = fmt === 'none' ? false : { format: fmt, ...(fmt === 'jpeg' || fmt === 'webp' ? { quality: +(opt.quality || 95) } : {}), ...(opt.fast ? { optimizeForSpeed: true } : {}) };

if (opt.trace) await b.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,cc,viz,blink,skia', transferMode: 'ReturnAsStream' });
const c0 = b.cpuSeconds(), w0 = Date.now(); let bytes = 0;
// contiguous runs of frames (what a worker really does), spread over the film: --runs 4
const runs = +(opt.runs || 4), per = Math.ceil(n / runs), T = [];
for (let r = 0; r < runs; r++) { const a = t0 + (t1 - t0) * (r + .3) / runs; for (let j = 0; j < per; j++) T.push(a + j / 30); }
for (let i = 0; i < n; i++) { const t = T[i]; await p.evaluate(`window.__seek(${t})`); const r = await p.beginFrame(shot); bytes += r.data ? r.data.length : 0; }
const cpu = (b.cpuSeconds() - c0) / n * 1000, wall = (Date.now() - w0) / n;
console.log(JSON.stringify({ page: path.basename(abs), strip, gpu: opt.gpu || 'soft', format: fmt, n, cpuMsPerFrame: +cpu.toFixed(1), wallMsPerFrame: +wall.toFixed(1), kB: +(bytes / n / 1024).toFixed(0), pumped: p.pumped || 0 }));
if (opt.trace) {
  const done = b.waitFor(m => m.method === 'Tracing.tracingComplete', 60000, 'trace');
  await b.send('Tracing.end'); const { params: { stream } } = await done;
  let data = ''; for (;;) { const c = await b.send('IO.read', { handle: stream }); data += c.base64Encoded ? Buffer.from(c.data, 'base64').toString() : c.data; if (c.eof) break; }
  fs.writeFileSync(opt.trace, data);
  const ev = JSON.parse(data), events = ev.traceEvents || ev, threads = {};
  events.filter(e => e.ph === 'M' && e.name === 'thread_name').forEach(e => { threads[e.pid + ':' + e.tid] = e.args.name; });
  const agg = {};
  for (const e of events) if (e.ph === 'X' && e.dur) { const th = (threads[e.pid + ':' + e.tid] || '?').replace(/\d+$/, ''), k = th + ' | ' + e.name; agg[k] = (agg[k] || 0) + (e.tdur || e.dur) / 1000; }
  console.log(Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, +(opt.top || 40)).map(([k, v]) => `${(v / n).toFixed(2).padStart(8)} ms/frame  ${k}`).join('\n'));
}
await b.close(); server.close();
