// vk studio [page.html|dir] [--port 3210] [--host 127.0.0.1] [--no-open] [--draft] [--out-dir out/studio]
// A local, Remotion-Studio-like workbench for vidkit pages: composition list, live preview driven by the page's own
// deterministic render(t) (window.__seek — the exact call `vk render` makes per frame), timeline with scenes / beats /
// captions / voice, inspector, and Lint / Peek / Render buttons that run the existing CLI. Everything the UI can do is
// also an HTTP API for agents (GET /api lists it): /api/state, /api/seek, /api/frame, /api/render, /api/jobs …
// The UI lives in studio/ (plain ES modules + CSS, no build step). Live-reloads when the page or dist/ changes.
import { parseArgs, startServer, pageUrl, launch, ROOT, PKG, fs, path, spawn } from './lib.mjs';
import { lintFile, registryNames } from './lint.mjs';
import { collectInfo } from '../studio/collect.js';

const UI_DIR = path.join(ROOT, 'studio');
const SKIP = /^(node_modules|out|dist|vendor|\.git|fonts|assets|plugins|lib|data)$/;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

// ---------------- compositions: every *.html under the root that builds a vidkit film ----------------
export function isComposition(html) { return /\bvk\.(video|film)\s*\(|vkStyleDemo\s*\(/.test(html); }
export function scanCompositions(root, maxDepth = 3) {
  const out = [];
  const walk = (dir, depth) => {
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { if (depth < maxDepth && !SKIP.test(e.name) && !e.name.startsWith('.')) walk(f, depth + 1); continue; }
      if (!/\.html?$/i.test(e.name)) continue;
      let html; try { html = fs.readFileSync(f, 'utf8'); } catch (e2) { continue; }
      if (isComposition(html)) out.push(compMeta(f, root, html));
    }
  };
  walk(root, 0);
  return out;
}
// the style pack named in the vk.video({…}) / vk.film(story, {…}) call itself (not e.g. a particle `style: 'converge'`)
export function pageStyle(html) {
  const re = /\bvk\.(video|film)\s*\(/g; let m;
  while ((m = re.exec(html))) {
    let i = m.index + m[0].length, depth = 1, q = null;
    for (; i < html.length && depth; i++) { const c = html[i]; if (q) { if (c === '\\') i++; else if (c === q) q = null; } else if (c === '"' || c === "'" || c === '`') q = c; else if (c === '(') depth++; else if (c === ')') depth--; }
    const call = html.slice(m.index, i), s = call.match(/\bstyle\s*:\s*['"`]([\w.,+-]+)['"`]/) || call.match(/\bstyle\s*:\s*\[([^\]]+)\]/);
    if (s) return s[1].replace(/['"\s]/g, '');
  }
  return null;
}
export function compMeta(file, root, html = fs.readFileSync(file, 'utf8')) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const title = ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '').trim();
  const style = pageStyle(html);
  const st = fs.statSync(file);
  return { id: rel.replace(/\.html?$/i, ''), rel, file, dir: path.dirname(rel) === '.' ? '' : path.dirname(rel), name: path.basename(file).replace(/\.html?$/i, ''),
    title, style, three: /vidkit-three\.js/.test(html), story: /\bconst\s+STORY\s*=\s*\{/.test(html), kb: Math.round(st.size / 1024), mtime: st.mtimeMs };
}

// ---------------- safe scene editing: only vk make pages (const STORY = {json}; inlined, JSON.stringify output) ----------------
export function storyBlock(html) {
  const m = /\bconst\s+STORY\s*=\s*/.exec(html); if (!m) return null;
  let i = m.index + m[0].length; if (html[i] !== '{') return null;
  const a = i; let depth = 0, inStr = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}' && --depth === 0) break;
  }
  const text = html.slice(a, i + 1);
  try { return { a, b: i + 1, story: JSON.parse(text.replace(/<\\\/script/gi, '</script')) }; } catch (e) { return null; }
}

export default async function studio(argv) {
  const opt = parseArgs(argv, ['no-open']);
  const target = path.resolve(opt._[0] || (fs.existsSync(path.resolve('examples')) ? 'examples' : path.join(ROOT, 'examples')));
  if (!fs.existsSync(target)) throw new Error('usage: vk studio [page.html | dir] [--port 3210]   (not found: ' + target + ')');
  const isFile = fs.statSync(target).isFile();
  let root = isFile ? path.dirname(target) : target;
  const outDir = path.resolve(opt.outDir || path.join(process.cwd(), 'out', 'studio'));
  let comps = scanCompositions(root);
  // a page alone in its folder (examples/reel/reel.html): list its siblings one level up too
  if (isFile && comps.length <= 1) { const up = scanCompositions(path.dirname(root)); if (up.length > 1 && up.some(c => c.file === target)) { root = path.dirname(root); comps = up; } }
  if (isFile && !comps.some(c => c.file === target)) comps.unshift(compMeta(target, root));
  if (!comps.length) throw new Error('no vidkit compositions (pages calling vk.video / vk.film) under ' + root);

  // ---------------- state (the single source of truth; UIs and agents both mutate it through the API) ----------------
  const S = {
    file: isFile ? target : comps[0].file, t: 0, playing: false, rate: 1, loop: true, inPoint: null, outPoint: null,
    draft: !!opt.draft, strict: opt.noStrict ? false : true, fps: null, format: null, selectedScene: null,
  };
  const infos = new Map();          // file → { info, source: 'client' | 'probe', at }
  const jobs = []; let jobSeq = 0;
  const sse = new Set(); const acks = new Map(); let seekSeq = 0;
  const comp = f => comps.find(c => c.file === f || c.id === f || c.rel === f || c.name === f);
  const info = () => (infos.get(S.file) || {}).info || null;
  const params = (extra = {}) => { const p = { render: '1' }; if (S.strict) p.strict = '1'; if (S.draft) p.draft = '1'; if (S.fps) p.fps = String(S.fps); if (S.format) p.format = S.format; return Object.assign(p, extra); };
  const broadcast = (type, data = {}) => { const msg = `data: ${JSON.stringify({ type, ...data })}\n\n`; for (const c of sse) c.write(msg); };
  const publicJob = j => { const { proc, ...rest } = j; return { ...rest, log: j.log.slice(-60) }; };
  const state = () => {
    const i = info();
    return {
      vidkit: PKG.version, root, outDir, file: S.file, composition: comp(S.file) || null,
      url: pageUrl(port, S.file, params()),
      playhead: { t: +S.t.toFixed(4), frame: i ? Math.round(S.t * i.fps) : null, playing: S.playing, rate: S.rate, loop: S.loop },
      range: { in: S.inPoint, out: S.outPoint }, settings: { draft: S.draft, strict: S.strict, fps: S.fps, format: S.format },
      selectedScene: S.selectedScene, clients: sse.size,
      info: i, infoSource: (infos.get(S.file) || {}).source || null,
      compositions: comps.map(({ file, ...c }) => ({ ...c, file })), jobs: jobs.map(publicJob),
    };
  };

  // ---------------- headless twin: a Playwright page on the current composition (frames + info for agents w/o a UI) ----------------
  let twin = null, twinQ = Promise.resolve();
  const serial = fn => (twinQ = twinQ.then(fn, fn));
  async function twinPage(scale = .5) {
    const url = pageUrl(port, S.file, params()), mtime = fs.statSync(S.file).mtimeMs;
    if (twin && twin.url === url && twin.mtime === mtime && twin.scale === scale && !twin.page.isClosed()) return twin;
    if (twin) { await twin.ctx.close().catch(() => { }); }
    twin = twin && twin.browser.isConnected() ? { browser: twin.browser } : { browser: await launch() };
    const errs = [];
    const probe = await twin.browser.newPage();
    probe.on('pageerror', e => errs.push(e.message));
    await probe.goto(url);
    await probe.waitForFunction(() => window.__size && window.__ready, null, { timeout: 60000 }).catch(() => { throw new Error('page did not initialise: ' + (errs.join('; ') || 'vk.video() never finalized')); });
    const size = await probe.evaluate(() => window.__size); await probe.close();
    const ctx = await twin.browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: scale });
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
    await page.goto(url); await page.waitForFunction(() => window.__ready, null, { timeout: 180000 }); await page.evaluate(() => window.__ready);
    const inf = await page.evaluate(collectInfo); inf.errors = errs.slice(-20);
    if (!infos.has(S.file) || infos.get(S.file).source !== 'client') infos.set(S.file, { info: inf, source: 'probe', at: Date.now() });
    Object.assign(twin, { ctx, page, url, mtime, scale, size, errs });
    return twin;
  }
  const ensureInfo = () => info() ? Promise.resolve(info()) : serial(() => twinPage().then(() => info()));
  async function frame(t, { scale = .5, type = 'jpeg', quality = 85 } = {}) {
    return serial(async () => {
      const tw = await twinPage(scale);
      await tw.page.evaluate(t => window.__seek(t), t);
      return tw.page.screenshot({ type, quality: type === 'jpeg' ? quality : undefined, clip: { x: 0, y: 0, width: tw.size.width, height: tw.size.height } });
    });
  }

  // ---------------- jobs: lint (in-process) · peek / render (spawn the existing CLI) ----------------
  const stamp = () => new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  function spawnJob(kind, file, args, extra = {}) {
    const j = { id: ++jobSeq, kind, file, name: path.basename(file).replace(/\.html?$/i, ''), args, status: 'queued', progress: 0, frames: 0, total: 0, log: [], createdAt: Date.now(), ...extra };
    jobs.unshift(j); if (jobs.length > 40) jobs.pop();
    const start = () => {
      j.status = 'running'; j.startedAt = Date.now(); broadcast('job', { job: publicJob(j) });
      const p = j.proc = spawn(process.execPath, [path.join(ROOT, 'bin', 'vk.mjs'), kind, file, ...args], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
      let stdout = '', lastB = 0;
      const onData = (d, err) => {
        const s = d.toString(); if (!err) stdout += s;
        for (const line of s.split(/[\r\n]+/)) {
          if (!line.trim()) continue;
          const m = line.match(/frames (\d+)\/(\d+)/); if (m) { j.frames = +m[1]; j.total = +m[2]; j.progress = j.total ? j.frames / j.total : 0; }
          const h = line.match(/frames=(\d+)/); if (h && !j.total) j.total = +h[1];
          if (j.log.length && /^\s*frames \d+\/\d+/.test(line) && /^\s*frames \d+\/\d+/.test(j.log[j.log.length - 1])) j.log[j.log.length - 1] = line.trim(); else j.log.push(line.replace(/\s+$/, ''));
          if (j.log.length > 400) j.log.splice(0, j.log.length - 400);
        }
        if (Date.now() - lastB > 250) { lastB = Date.now(); broadcast('job', { job: publicJob(j) }); }
      };
      p.stdout.on('data', d => onData(d)); p.stderr.on('data', d => onData(d, true));
      p.on('close', code => {
        j.endedAt = Date.now(); j.ms = j.endedAt - j.startedAt; j.code = code;
        if (j.status !== 'cancelled') j.status = code ? 'error' : 'done';
        if (kind === 'render' && j.status === 'done') { j.progress = 1; j.download = `/api/download/${j.id}`; j.url = j.out; try { j.bytes = fs.statSync(j.out).size; } catch (e) { j.status = 'error'; } }
        if (kind === 'peek') { try { const r = JSON.parse(fs.readFileSync(path.join(j.dir, 'peek.json'), 'utf8')); j.result = { ok: r.ok, summary: r.summary, sheet: r.sheet, stills: r.stills, issues: r.issues.slice(0, 80) }; j.progress = 1; if (j.status === 'error' && r) j.status = 'done'; } catch (e) { } }
        broadcast('job', { job: publicJob(j) }); runQueue();
      });
    };
    j.start = start; runQueue(); return j;
  }
  function runQueue() {   // renders run one at a time (they already use every core); peeks run alongside
    for (const j of jobs.slice().reverse()) {
      if (j.status !== 'queued') continue;
      if (j.kind === 'render' && jobs.some(x => x.kind === 'render' && x.status === 'running')) continue;
      j.start();
    }
  }
  function renderJob(b = {}) {
    const file = b.file ? (comp(b.file) || {}).file || path.resolve(b.file) : S.file;
    if (!fs.existsSync(file)) throw new Error('not found ' + file);
    const draft = b.draft != null ? !!b.draft : S.draft, name = path.basename(file).replace(/\.html?$/i, '');
    const useRange = b.range !== false && (b.from != null || b.to != null || S.inPoint != null || S.outPoint != null);
    const from = b.from != null ? +b.from : useRange ? S.inPoint : null, to = b.to != null ? +b.to : useRange ? S.outPoint : null;
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.resolve(b.out ? (path.isAbsolute(b.out) ? b.out : path.join(outDir, b.out)) : path.join(outDir, `${name}${draft ? '-draft' : ''}${from != null || to != null ? `-${(from || 0).toFixed(1)}-${to != null ? (+to).toFixed(1) : 'end'}` : ''}-${stamp()}.mp4`));
    const a = ['-o', out];
    if (draft) a.push('--draft');
    if (from != null) a.push('--from', String(from)); if (to != null) a.push('--to', String(to));
    const fps = b.fps || S.fps; if (fps) a.push('--fps', String(fps));
    const format = b.format || S.format; if (format) a.push('--format', format);
    if (b.scale) a.push('--scale', String(b.scale));
    if (b.motionBlur === false) a.push('--no-motion-blur');
    if (b.workers) a.push('--workers', String(b.workers));
    if (b.strict === false || (!S.strict && b.strict !== true)) a.push('--no-strict');
    if (b.noVoice) a.push('--no-voice');
    if (Array.isArray(b.args)) a.push(...b.args.map(String));
    return spawnJob('render', file, a, { out, draft, from, to });
  }
  function peekJob(b = {}) {
    const file = b.file ? (comp(b.file) || {}).file || path.resolve(b.file) : S.file;
    const dir = path.join(outDir, 'peek', path.basename(file).replace(/\.html?$/i, ''));
    const a = ['-o', dir];
    if (b.at != null) a.push('--at', Array.isArray(b.at) ? b.at.join(',') : String(b.at)); else if (b.every) a.push('--every', String(b.every));
    if (b.draft != null ? b.draft : S.draft) a.push('--draft');
    if (S.format) a.push('--format', S.format);
    if (!S.strict) a.push('--no-strict');
    if (b.determinism === false) a.push('--no-determinism');
    return spawnJob('peek', file, a, { dir });
  }

  // ---------------- HTTP ----------------
  const readBody = req => new Promise((res, rej) => { const parts = []; req.on('data', d => parts.push(d)); req.on('end', () => { const s = Buffer.concat(parts).toString(); if (!s.trim()) return res({}); try { res(JSON.parse(s)); } catch (e) { rej(new Error('body is not JSON')); } }); });
  const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(obj, null, 1)); };
  const clampT = t => { const i = info(); return Math.max(0, i ? Math.min(t, i.duration - 1e-3) : t); };
  function resolveSeek(b) {
    const i = info(), fps = (i && i.fps) || 30;
    let t = b.t != null ? +b.t : b.frame != null ? +b.frame / fps : S.t;
    if (b.scene != null && i) {
      const sc = typeof b.scene === 'number' || /^\d+$/.test(b.scene) ? i.scenes[+b.scene] : i.scenes.find(s => s.name === b.scene);
      if (!sc) throw new Error('unknown scene ' + b.scene + ' (have: ' + i.scenes.map(s => s.name).join(', ') + ')');
      t = b.settle ? sc.start + (sc.settle != null ? sc.settle + .1 : sc.dur * .6) : sc.start + (b.t != null ? +b.t : .001);
      S.selectedScene = sc.index;
    }
    if (b.delta != null) t = S.t + +b.delta;
    if (!Number.isFinite(t)) throw new Error('seek needs t (seconds), frame, scene or delta');
    return clampT(t);
  }
  const API = {
    'GET /api': 'this index',
    'GET /api/state': 'everything: composition, info (duration/fps/size/scenes/beats/captions/voice), playhead, range, settings, jobs',
    'GET /api/compositions': 'rescan + list compositions',
    'POST /api/open {file|id}': 'switch composition (UI follows)',
    'POST /api/seek {t | frame | scene [, settle] | delta, wait?}': 'move the playhead; UIs render it via window.__seek(t) (same call as vk render). wait:true → resolves after a UI rendered it',
    'POST /api/play {playing?, rate?, loop?}': 'play / pause the UI preview',
    'POST /api/range {in, out}': 'in/out points (null clears); render uses them by default',
    'POST /api/settings {draft?, strict?, fps?, format?}': 'preview + render settings (URL params: ?draft=1 ?strict=1 ?fps= ?format=)',
    'GET /api/frame?t=2.5[&scale=.5][&type=png][&save=1]': 'headless still of the current composition at t (JPEG/PNG bytes, or JSON {path} with save=1)',
    'GET /api/info[?file=]': 'composition metadata (probes headlessly if no UI reported it yet)',
    'POST /api/lint {file?}': 'vk lint (JSON report)',
    'POST /api/peek {at?, every?, draft?}': 'vk peek job → GET /api/jobs/:id (result: sheet, issues)',
    'POST /api/render {from?, to?, range?, draft?, fps?, scale?, format?, motionBlur?, out?, wait?}': 'vk render job (progress via /api/jobs/:id or SSE); wait:true blocks until done',
    'GET /api/jobs · GET /api/jobs/:id · POST /api/jobs/:id/cancel': 'job status / log / cancel',
    'GET /api/download/:id': 'the finished MP4 (attachment)',
    'GET /api/scene-source?index=i · POST /api/scene-source {index, scene}': 'read / write STORY.scenes[i] JSON (vk make pages only; backup written to out/studio/backup)',
    'GET /api/events': 'Server-Sent Events: seek, play, open, settings, range, job, reload, info',
  };
  async function api(req, res, p, u) {
    const m = req.method, key = m + ' ' + p;
    if (m === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }); return res.end(); }
    if (key === 'GET /api') return json(res, 200, { name: 'vk studio API', version: PKG.version, endpoints: API });
    if (key === 'GET /api/state') { if (u.searchParams.get('wait') === '1') await ensureInfo().catch(() => { }); return json(res, 200, state()); }
    if (key === 'GET /api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' }); res.write(': vk studio\n\n');
      sse.add(res); const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => { sse.delete(res); clearInterval(ping); }); return;
    }
    if (key === 'GET /api/compositions') { const cur = S.file; comps = scanCompositions(root); if (!comps.some(c => c.file === cur) && fs.existsSync(cur)) comps.unshift(compMeta(cur, root)); return json(res, 200, comps); }
    if (key === 'GET /api/info') {
      const f = u.searchParams.get('file'); if (f && comp(f) && comp(f).file !== S.file) { S.file = comp(f).file; broadcast('open', { file: S.file }); }
      return json(res, 200, await ensureInfo());
    }
    if (key === 'GET /api/frame') {
      const t = clampT(+(u.searchParams.get('t') ?? S.t)), scale = +(u.searchParams.get('scale') || .5), type = u.searchParams.get('type') === 'png' ? 'png' : 'jpeg';
      const buf = await frame(t, { scale, type });
      if (u.searchParams.get('save') === '1') {
        const dir = path.join(outDir, 'frames'); fs.mkdirSync(dir, { recursive: true });
        const f = path.join(dir, `${path.basename(S.file).replace(/\.html?$/i, '')}-t${t.toFixed(3)}.${type === 'png' ? 'png' : 'jpg'}`); fs.writeFileSync(f, buf);
        return json(res, 200, { t, path: f, url: f, bytes: buf.length });
      }
      res.writeHead(200, { 'content-type': type === 'png' ? 'image/png' : 'image/jpeg', 'cache-control': 'no-store', 'x-vk-t': String(t) }); return res.end(buf);
    }
    if (key === 'GET /api/jobs') return json(res, 200, jobs.map(publicJob));
    let mm;
    if (m === 'GET' && (mm = p.match(/^\/api\/jobs\/(\d+)$/))) { const j = jobs.find(x => x.id === +mm[1]); return j ? json(res, 200, { ...publicJob(j), log: j.log }) : json(res, 404, { error: 'no such job' }); }
    if (m === 'POST' && (mm = p.match(/^\/api\/jobs\/(\d+)\/cancel$/))) {
      const j = jobs.find(x => x.id === +mm[1]); if (!j) return json(res, 404, { error: 'no such job' });
      if (j.status === 'running' && j.proc) { j.status = 'cancelled'; j.proc.kill('SIGTERM'); } else if (j.status === 'queued') { j.status = 'cancelled'; broadcast('job', { job: publicJob(j) }); }
      return json(res, 200, publicJob(j));
    }
    if (m === 'GET' && (mm = p.match(/^\/api\/download\/(\d+)$/))) {
      const j = jobs.find(x => x.id === +mm[1]); if (!j || !j.out || !fs.existsSync(j.out)) return json(res, 404, { error: 'not rendered (yet)' });
      res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': fs.statSync(j.out).size, 'content-disposition': `attachment; filename="${path.basename(j.out)}"` });
      return fs.createReadStream(j.out).pipe(res);
    }
    if (key === 'GET /api/scene-source') {
      const c = comp(u.searchParams.get('file') || S.file), blk = c && storyBlock(fs.readFileSync(c.file, 'utf8'));
      if (!blk) return json(res, 200, { editable: false, reason: 'scenes are JavaScript in this page — edit the .html (only vk make pages with an inlined STORY JSON are editable here)' });
      const i = +(u.searchParams.get('index') || 0), sc = blk.story.scenes && blk.story.scenes[i];
      return json(res, 200, { editable: !!sc, index: i, count: (blk.story.scenes || []).length, scene: sc || null, title: blk.story.title || null });
    }
    if (m !== 'POST') return json(res, 404, { error: 'unknown endpoint', endpoints: API });
    const b = await readBody(req);
    switch (p) {
      case '/api/open': {
        const c = comp(b.file || b.id || '') || (b.file && fs.existsSync(path.resolve(b.file)) && /\.html?$/i.test(b.file) ? (comps.unshift(compMeta(path.resolve(b.file), root)), comps[0]) : null);
        if (!c) return json(res, 404, { error: 'unknown composition ' + (b.file || b.id), have: comps.map(x => x.id) });
        watchOutside(c.file); S.file = c.file; S.t = 0; S.playing = false; S.inPoint = S.outPoint = null; S.selectedScene = null; broadcast('open', { file: S.file });
        return json(res, 200, { ok: true, file: S.file, composition: c });
      }
      case '/api/seek': {
        if (b.t != null || b.frame != null || b.scene != null) await ensureInfo().catch(() => { });
        S.t = resolveSeek(b); S.playing = false; const id = ++seekSeq, i = info();
        broadcast('seek', { t: S.t, id, origin: b.origin || 'api', scene: S.selectedScene });
        let rendered = null;
        if (b.wait && [...sse].length) rendered = await new Promise(r => { acks.set(id, r); setTimeout(() => { acks.delete(id); r(false); }, 15000); });
        const sc = i ? i.scenes.filter(s => S.t >= s.start).pop() : null;
        return json(res, 200, { ok: true, t: +S.t.toFixed(4), frame: i ? Math.round(S.t * i.fps) : null, scene: sc ? { index: sc.index, name: sc.name, local: +(S.t - sc.start).toFixed(4) } : null, clients: sse.size, rendered, frameUrl: `/api/frame?t=${S.t.toFixed(4)}` });
      }
      case '/api/ack': { if (b.t != null && b.origin === 'ui') { S.t = clampT(+b.t); if (b.playing != null) S.playing = !!b.playing; } const r = acks.get(b.id); if (r) { acks.delete(b.id); r(true); } return json(res, 200, { ok: true }); }
      case '/api/client-info': {   // a UI finished loading the preview and reports what the page published
        if (b.file && b.info) { infos.set(b.file, { info: b.info, source: 'client', at: Date.now() }); broadcast('info', { file: b.file, origin: b.origin }); }
        return json(res, 200, { ok: true });
      }
      case '/api/play': {
        if (b.playing != null) S.playing = !!b.playing; else S.playing = !S.playing;
        if (b.rate != null) S.rate = +b.rate; if (b.loop != null) S.loop = !!b.loop;
        broadcast('play', { playing: S.playing, rate: S.rate, loop: S.loop, t: S.t, origin: b.origin || 'api' }); return json(res, 200, { ok: true, playing: S.playing, rate: S.rate, loop: S.loop, clients: sse.size });
      }
      case '/api/range': {
        S.inPoint = b.in == null ? null : clampT(+b.in); S.outPoint = b.out == null ? null : clampT(+b.out);
        if (S.inPoint != null && S.outPoint != null && S.outPoint <= S.inPoint) [S.inPoint, S.outPoint] = [S.outPoint, S.inPoint];
        broadcast('range', { in: S.inPoint, out: S.outPoint, origin: b.origin || 'api' }); return json(res, 200, { ok: true, in: S.inPoint, out: S.outPoint });
      }
      case '/api/settings': {
        for (const k of ['draft', 'strict']) if (b[k] != null) S[k] = !!b[k];
        if (b.fps !== undefined) S.fps = b.fps ? +b.fps : null;
        if (b.format !== undefined) S.format = b.format || null;
        if (b.selectedScene !== undefined) S.selectedScene = b.selectedScene;
        if (['draft', 'strict', 'fps', 'format'].some(k => b[k] !== undefined)) infos.delete(S.file);
        broadcast('settings', { settings: { draft: S.draft, strict: S.strict, fps: S.fps, format: S.format }, selectedScene: S.selectedScene, origin: b.origin || 'api' });
        return json(res, 200, { ok: true, settings: { draft: S.draft, strict: S.strict, fps: S.fps, format: S.format } });
      }
      case '/api/lint': {
        const c = comp(b.file || S.file), f = c ? c.file : path.resolve(b.file);
        return json(res, 200, lintFile(f, registryNames()));
      }
      case '/api/peek': { const j = peekJob(b); return json(res, 202, publicJob(j)); }
      case '/api/render': {
        const j = renderJob(b);
        if (b.wait) await new Promise(r => { const iv = setInterval(() => { if (!['queued', 'running'].includes(j.status)) { clearInterval(iv); r(); } }, 250); });
        return json(res, b.wait ? 200 : 202, publicJob(j));
      }
      case '/api/scene-source': {
        const c = comp(b.file || S.file); if (!c) return json(res, 404, { error: 'unknown composition' });
        const html = fs.readFileSync(c.file, 'utf8'), blk = storyBlock(html);
        if (!blk) return json(res, 400, { error: 'not editable: no inlined STORY JSON in this page' });
        const i = +b.index, list = blk.story.scenes || [];
        if (!(i >= 0 && i < list.length)) return json(res, 400, { error: 'index out of range 0..' + (list.length - 1) });
        let sc = b.scene; if (typeof sc === 'string') { try { sc = JSON.parse(sc); } catch (e) { return json(res, 400, { error: 'scene is not valid JSON: ' + e.message }); } }
        if (!sc || typeof sc !== 'object' || Array.isArray(sc)) return json(res, 400, { error: 'scene must be a JSON object' });
        if (sc.lines && !Array.isArray(sc.lines)) return json(res, 400, { error: 'scene.lines must be an array' });
        if (sc.actions && !Array.isArray(sc.actions)) return json(res, 400, { error: 'scene.actions must be an array' });
        list[i] = sc;
        const bak = path.join(outDir, 'backup'); fs.mkdirSync(bak, { recursive: true });
        const bakFile = path.join(bak, `${path.basename(c.file)}.${Date.now()}.bak`); fs.writeFileSync(bakFile, html);
        const text = JSON.stringify(blk.story, null, 1).replace(/<\/script/gi, '<\\/script');
        fs.writeFileSync(c.file, html.slice(0, blk.a) + text + html.slice(blk.b));
        return json(res, 200, { ok: true, index: i, backup: bakFile });
      }
    }
    return json(res, 404, { error: 'unknown endpoint', endpoints: API });
  }
  function serveUI(res, p) {
    const rel = p.replace(/^\/__studio\/?/, '') || 'index.html', f = path.join(UI_DIR, path.normalize(rel));
    if (!f.startsWith(UI_DIR)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(buf);
    });
  }
  const extra = (req, res, p) => {
    const u = new URL(req.url, 'http://x');
    if (p === '/' || p === '/studio') { res.writeHead(302, { location: '/__studio/' }); res.end(); return true; }
    if (p.startsWith('/__studio')) { serveUI(res, p); return true; }
    if (p === '/api' || p.startsWith('/api/')) { api(req, res, p, u).catch(e => json(res, 500, { error: e.message })); return true; }
    return false;
  };
  // every page the studio serves records its own errors (the preview shows them as an overlay)
  const inject = html => html.replace(/<script/i, `<script data-vk-studio="1">window.__vkErrors=[];addEventListener('error',e=>__vkErrors.push(String(e.message||e)));addEventListener('unhandledrejection',e=>__vkErrors.push('unhandled: '+String(e.reason&&e.reason.message||e.reason)));</script><script`);
  const { server, port } = await startServer({ inject, extra, port: +(opt.port || 3210), host: opt.host || '127.0.0.1' });

  // ---------------- live reload ----------------
  let timer = null;
  const changed = f => { clearTimeout(timer); timer = setTimeout(() => {
    const cur = comps.find(c => c.file === S.file); if (cur) Object.assign(cur, compMeta(cur.file, root));
    if (/\.html?$/i.test(f) && !comps.some(c => c.file === f)) { comps = scanCompositions(root); if (!comps.some(c => c.file === S.file) && fs.existsSync(S.file)) comps.unshift(compMeta(S.file, root)); }
    infos.delete(S.file); console.log('  ↻', path.relative(process.cwd(), f)); broadcast('reload', { file: f });
  }, 150); };
  const watch = (dir, filter) => { try { fs.watch(dir, { recursive: true }, (e, f) => { if (f && filter(f)) changed(path.join(dir, f)); }); } catch (e) { console.warn('  watch failed', dir, e.message); } };
  watch(root, f => !/(^|\/)(out|node_modules|\.git)\//.test(f) && /\.(html?|js|mjs|css|json|vo)$/.test(f) && !/\.bak$/.test(f));
  watch(path.join(ROOT, 'dist'), () => true);
  const watched = new Set();
  function watchOutside(f) {   // a page opened from outside the root still live-reloads
    const d = path.dirname(f); if (d.startsWith(root + path.sep) || d === root || watched.has(d)) return; watched.add(d);
    try { fs.watch(d, (e, n) => { if (n && /\.(html?|js|mjs|css|json)$/.test(n)) changed(path.join(d, n)); }); } catch (e) { }
  }
  if (isFile) watchOutside(target);
  if (!root.startsWith(path.join(ROOT, 'styles'))) watch(path.join(ROOT, 'styles'), f => /\.(js|json|mjs)$/.test(f));

  const host = opt.host && opt.host !== '0.0.0.0' ? opt.host : '127.0.0.1';
  const url = `http://${host}:${port}/__studio/`;
  console.log(`[vk studio] ${url}\n  ${comps.length} composition(s) under ${path.relative(process.cwd(), root) || '.'} · API: http://${host}:${port}/api · renders → ${path.relative(process.cwd(), outDir) || outDir}\n  Space play · ←/→ frame · Shift+←/→ 1 s · I/O in-out · R render · P peek · ? shortcuts · Ctrl+C to stop`);
  if (!opt.noOpen && opt.open !== 'false' && (process.platform !== 'linux' || process.env.DISPLAY)) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    try { const c = spawn(opener, [url], { stdio: 'ignore', detached: true }); c.on('error', () => { }); c.unref(); } catch (e) { }
  }
  const stop = async () => { for (const j of jobs) if (j.proc && j.status === 'running') j.proc.kill('SIGTERM'); if (twin && twin.browser) await twin.browser.close().catch(() => { }); server.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  return new Promise(() => { });
}
