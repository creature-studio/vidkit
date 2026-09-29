// Minimal Chrome DevTools Protocol client over --remote-debugging-pipe (no extra deps), used by the
// `beginframe` capture mode: chrome-headless-shell with --enable-begin-frame-control, where every video frame is
// produced on demand by HeadlessExperimental.beginFrame (no vsync / frame-rate waits, frame-exact screenshots).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

// chrome-headless-shell that Playwright installed (same build Playwright's headless chromium.launch() uses)
export function headlessShellPath() {
  if (process.env.VK_CHROME) return process.env.VK_CHROME;
  const full = chromium.executablePath();                      // …/ms-playwright/chromium-NNNN/chrome-linux64/chrome
  const root = path.resolve(path.dirname(full), '..', '..'), rev = path.basename(path.resolve(path.dirname(full), '..')).split('-').pop();
  const cands = [path.join(root, `chromium_headless_shell-${rev}`), ...fs.readdirSync(root).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse().map(d => path.join(root, d))];
  for (const c of cands) {
    if (!fs.existsSync(c)) continue;
    for (const sub of fs.readdirSync(c)) { const exe = path.join(c, sub, process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell'); if (fs.existsSync(exe)) return exe; }
  }
  return null;
}

// the subset of Playwright's default Chromium switches that matters for headless rendering. --disable-dev-shm-usage is
// essential: containers often mount a 64 MB /dev/shm and the renderer crashes on big frames without it.
export const BASE_ARGS = ['--no-first-run', '--no-default-browser-check', '--no-sandbox', '--disable-dev-shm-usage', '--disable-field-trial-config',
  '--disable-background-networking', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--disable-breakpad', '--disable-component-update', '--disable-default-apps', '--disable-extensions', '--disable-hang-monitor', '--disable-ipc-flooding-protection',
  '--disable-popup-blocking', '--disable-prompt-on-repost', '--metrics-recording-only', '--password-store=basic', '--use-mock-keychain', '--no-service-autorun',
  '--disable-features=PaintHolding,Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,ThirdPartyStoragePartitioning'];

export class CDPBrowser {
  static async launch(args = [], { exe = headlessShellPath() } = {}) {
    if (!exe) throw new Error('chrome-headless-shell not found (npx playwright install chromium-headless-shell, or set VK_CHROME)');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vk-chrome-'));
    const proc = spawn(exe, ['--remote-debugging-pipe', ...BASE_ARGS, `--user-data-dir=${dir}`, ...args, 'about:blank'],
      { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
    const b = new CDPBrowser(proc, dir);
    proc.stderr.on('data', d => { b.stderrTail = (b.stderrTail + d).slice(-20000); });
    await b.send('Browser.getVersion');
    return b;
  }
  constructor(proc, dir) {
    this.proc = proc; this.dir = dir; this.id = 0; this.cb = new Map(); this.listeners = []; this.stderrTail = ''; this.closed = false; this.timeout = 180000;
    const out = proc.stdio[3], inp = proc.stdio[4]; this.out = out;
    let buf = [];
    inp.on('data', d => {
      let s = 0;
      for (let i = 0; i < d.length; i++) if (d[i] === 0) { buf.push(d.subarray(s, i)); const msg = JSON.parse(Buffer.concat(buf).toString()); buf = []; s = i + 1; this.onMessage(msg); }
      if (s < d.length) buf.push(d.subarray(s));
    });
    proc.on('exit', (code, sig) => { this.closed = true; for (const [, c] of this.cb) c.rej(new Error(`chrome exited (${code ?? sig}) ${this.stderrTail.slice(-400)}`)); this.cb.clear(); });
  }
  onMessage(m) {
    if (m.id != null) { const c = this.cb.get(m.id); if (!c) return; this.cb.delete(m.id); m.error ? c.rej(new Error(`${c.method}: ${m.error.message}${m.error.data ? ' ' + m.error.data : ''}`)) : c.res(m.result); return; }
    for (const l of this.listeners) l(m);
  }
  send(method, params = {}, sessionId, timeout = this.timeout) {
    if (this.closed) return Promise.reject(new Error('chrome is closed'));
    const id = ++this.id, msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => {
      const to = timeout ? setTimeout(() => { if (this.cb.delete(id)) rej(new Error(`${method}: no answer after ${timeout / 1000}s (renderer hung?)`)); }, timeout) : null;
      this.cb.set(id, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); }, method });
      this.out.write(JSON.stringify(msg) + '\0');
    });
  }
  on(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(x => x !== fn); }; }
  waitFor(pred, ms = 30000, what = 'event') {
    return new Promise((res, rej) => { const to = setTimeout(() => { off(); rej(new Error('timeout waiting for ' + what)); }, ms); const off = this.on(m => { if (pred(m)) { clearTimeout(to); off(); res(m); } }); });
  }
  async newPage({ width, height, scale = 1, beginFrameControl = true } = {}) {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank', width, height, enableBeginFrameControl: beginFrameControl });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    return new CDPPage(this, sessionId, { width, height, scale, beginFrameControl });
  }
  // CPU seconds (user+sys) consumed so far by this browser's whole process tree (Linux /proc; for profiling)
  cpuSeconds() { return treeCpuSeconds(this.proc.pid); }
  async close() {
    if (!this.closed) { try { await Promise.race([this.send('Browser.close'), new Promise(r => setTimeout(r, 3000))]); } catch { } if (!this.closed) this.proc.kill('SIGKILL'); }
    try { fs.rmSync(this.dir, { recursive: true, force: true }); } catch { }
  }
}

export class CDPPage {
  constructor(browser, sessionId, o) { this.b = browser; this.sid = sessionId; this.o = o; this.errors = []; this.logs = []; this.frameTicks = 0; this.pumped = 0; this.dirty = false;
    browser.on(m => {
      if (m.method === 'Target.targetCrashed' || (m.sessionId === sessionId && m.method === 'Inspector.targetCrashed')) this.errors.push('renderer crashed');
      if (m.sessionId !== sessionId) return;
      if (m.method === 'Runtime.exceptionThrown') this.errors.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
      if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) this.logs.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    });
  }
  send(method, params) { return this.b.send(method, params, this.sid); }
  async goto(url, { timeout = 60000 } = {}) {
    await this.send('Page.enable'); await this.send('Runtime.enable');
    const { width, height, scale } = this.o;
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
    const loaded = this.b.waitFor(m => m.sessionId === this.sid && m.method === 'Page.loadEventFired', timeout, 'page load');
    await this.send('Page.navigate', { url });
    // with begin-frame control nothing is drawn unless we ask: pump frames while loading (rAF / lazy work may need them)
    let pumping = this.o.beginFrameControl, pump = null;
    if (pumping) pump = (async () => { while (pumping) { await this.beginFrame(false).catch(() => { }); await new Promise(r => setTimeout(r, 30)); } })();
    try { await loaded; } finally { pumping = false; await pump; }
  }
  // pumpAfter (ms): a renderer under begin-frame control only runs rAF callbacks / frame-aligned work when we issue a
  // BeginFrame, so a page that awaits a frame (e.g. rAF-based loaders) would wait forever. If the evaluation has not
  // come back after pumpAfter ms we keep issuing no-screenshot frames until it does (and mark the page dirty, so the
  // next capture is forced to redraw instead of trusting hasDamage).
  async evaluate(expression, { awaitPromise = true, pumpAfter = 20 } = {}) {
    const q = this.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (this.o.beginFrameControl && pumpAfter != null) {
      let done = false; q.then(() => { done = true; }, () => { done = true; });
      const tick = ms => new Promise(res => setTimeout(res, ms));
      await Promise.race([q, tick(pumpAfter)]);
      while (!done) { this.pumped++; this.dirty = true; await this.beginFrame(false).catch(() => { }); if (!done) await Promise.race([q, tick(20)]); }
    }
    const r = await q;
    if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text));
    return r.result.value;
  }
  // One compositor frame; with screenshot → { hasDamage, data: Buffer | null }. Frame time advances 1/60 s per call
  // (vidkit pages never read the clock during render, but rAF-based code still sees a monotonic, deterministic time).
  // Calls are serialised per page; "Another frame is pending" (the compositor has not finished the previous frame yet,
  // seen right after navigation on a loaded machine) is retried with a short back-off instead of failing the render.
  beginFrame(screenshot = { format: 'jpeg', quality: 95 }) {
    const run = async () => {
      for (let i = 0; ; i++) {
        this.frameTicks += 1000 / 60;
        try {
          const r = await this.send('HeadlessExperimental.beginFrame', { frameTimeTicks: 1e6 + this.frameTicks, interval: 1000 / 60, ...(screenshot ? { screenshot } : {}) });
          return { hasDamage: r.hasDamage, data: r.screenshotData ? Buffer.from(r.screenshotData, 'base64') : null };
        } catch (e) {
          if (!/Another frame is pending/.test(e.message) || i >= 200) throw e;
          this.pendingRetries = (this.pendingRetries || 0) + 1;
          await new Promise(r => setTimeout(r, Math.min(50, 5 + i * 2)));
        }
      }
    };
    const p = (this.frameQ || Promise.resolve()).then(run, run);
    this.frameQ = p.catch(() => { });
    return p;
  }
  async captureScreenshot(params) { const r = await this.send('Page.captureScreenshot', params); return Buffer.from(r.data, 'base64'); }
}

export function treeCpuSeconds(root) {
  if (process.platform !== 'linux') return NaN;
  const kids = new Map(), cpu = new Map(), hz = 100;
  for (const d of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try { const st = fs.readFileSync(`/proc/${d}/stat`, 'utf8'), f = st.slice(st.lastIndexOf(')') + 2).split(' '); const pp = +f[1]; (kids.get(pp) || kids.set(pp, []).get(pp)).push(+d); cpu.set(+d, (+f[11] + +f[12]) / hz); } catch { }
  }
  let sum = 0; const q = [root];
  while (q.length) { const p = q.pop(); sum += cpu.get(p) || 0; for (const c of kids.get(p) || []) q.push(c); }
  return sum;
}
