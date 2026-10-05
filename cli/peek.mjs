// vk peek page.html [--at 0,2.5,5 | --every 1] [--draft] [--json] [-o dir] [--scale .5] [--format 9:16]
//                   [--no-strict] [--no-determinism] [--no-flicker] [--cols 4]
// The agent loop's eyes, in ONE browser launch: low-res stills + a labelled contact sheet + peek.json with
//   {ok, issues[] (severity, code, message, t, hint), stills[], sheet, timings, duration, scenes, warnings, lint}.
// Checks: static lint (vk lint), page errors / strict-mode errors, unknown-name warnings, in-page layout QA (text overlap,
// overflow, cut by the frame, safe area, platform UI zones, captions, fonts), blank / near-black frames, low-contrast
// text (measured on the rendered pixels), frame-to-frame flicker (t−1/fps · t · t+1/fps), and determinism (the same t
// rendered on a second, fresh page must give identical pixels). Default times: two per scene (entrance + settled).
// Exit code 1 when there is an error-severity issue.
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { captureFlags } from './capture.mjs';
import { parseArgs, modeParams, startServer, pageUrl, contactTimes, settleTimes, fmtT, fs, path } from './lib.mjs';
import { lintFile, registryNames } from './lint.mjs';

export const HINTS = {
  'page-error': 'the page threw: fix the error (strict mode reports unknown names with did-you-mean and the file:line)',
  'unknown-name': 'use a registered name (did-you-mean above; vk list <kind>); strict mode turns this into an error',
  'text-overlap': 'two text boxes overlap: give them different at/out times, move one (pos / layout), or shorten the copy',
  'text-overflow-x': 'text is wider than its box: shorten it, lower size, or let it wrap (maxW)',
  'text-overflow-y': 'text is taller than its box: shorten it or lower size',
  'text-cut-by-frame': 'text leaves the frame: move it inside or reduce size',
  'outside-safe-area': 'text crosses the title-safe margin: keep it inside (or add class vk-bleed if it is meant to bleed)',
  'out-of-frame': 'an element extends beyond the frame (fine for backgrounds; mark decorative bleed with class vk-bleed)',
  'in-platform-ui-zone': 'vertical formats: keep text out of the platform UI zones (right rail / bottom caption area)',
  'caption-too-wide': 'caption wider than the safe area: split it into shorter lines (cap: [..])',
  'caption-wraps': 'landscape captions should be one line: split the sentence',
  'caption-covered': 'something is drawn above the caption: lower its z / zIndex',
  'fonts-not-loaded': 'a font did not load: check the font name / add it to the theme fonts',
  'blank-frame': 'the frame is (almost) uniform: nothing visible yet? check at / transitions / layer z',
  'blank-first-frame': 'frame 0 is the thumbnail many players and feeds show: have the title or a visual already on screen at t=0 (at: 0, fx: false or a short fx)',
  'dark-frame': 'the frame is almost black: intended? (fade / dip) otherwise check exposure, bg and layer order',
  'low-contrast': 'text barely differs from what is behind it: change color / bg, add a scrim or text-shadow',
  'flicker': 'this frame differs from both neighbours while they match each other: a value that is not a smooth function of t (random per frame, toggled state, frame-parity)',
  'nondeterministic': 'a fresh page renders different pixels at the same t: render(t) depends on render history (Math.random in frame code, accumulated state, rAF/timers, clocks) — run vk lint',
  'lint': 'see the lint hint',
};
const QA_SEV = { 'outside-safe-area': 'warn', 'out-of-frame': 'warn', 'blank-frame': 'warn', 'caption-in-ui-zone': 'warn' };

export default async function peek(argv) {
  const T0 = Date.now(), opt = parseArgs(argv, ['no-determinism', 'no-flicker']);
  const abs = path.resolve(opt._[0] || ''); if (!opt._[0] || !fs.existsSync(abs)) throw new Error('usage: vk peek page.html [--at 0,2.5 | --every 1] [--draft] [--json]');
  const name = path.basename(abs, path.extname(abs)), dir = path.resolve(opt.out || path.join('out', 'peek', name));
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^(still-.*\.jpg|fresh-.*\.png|sheet\.png|peek\.json)$/.test(f)) fs.unlinkSync(path.join(dir, f));
  const scale = +(opt.scale || .5), issues = [], warnings = [], timings = { lint: 0, launch: 0, load: 0, frames: [], determinism: 0, sheet: 0, total: 0 };
  const add = (severity, code, message, extra = {}) => issues.push({ severity, code, message, ...extra, hint: extra.hint || HINTS[code] || HINTS[code.split('/')[0]] || '' });
  // ---- static lint ----
  let t = Date.now(); const lint = lintFile(abs, registryNames());
  for (const i of lint.issues) add(i.severity, 'lint/' + i.rule, `${i.file}:${i.line}:${i.col} ${i.message}`, { hint: i.hint, file: i.file, line: i.line });
  timings.lint = Date.now() - t;
  // ---- one browser: page A (stills, QA), page B (determinism), helper H (pixel analysis + sheet) ----
  t = Date.now();
  const params = modeParams(opt, { render: '1' }); if (opt.format) params.format = opt.format;
  // software raster + compositing (as vk render's default capture): bit-stable between pages; WebGL stays on (SwiftShader)
  const { server, port } = await startServer(), url = pageUrl(port, abs, params), browser = await chromium.launch({ args: captureFlags('screenshot', opt.gpu || 'soft') });
  timings.launch = Date.now() - t; t = Date.now();
  const report = { ok: false, file: abs, strict: params.strict === '1', draft: !!opt.draft, issues, warnings, lint: { errors: lint.errors, warnings: lint.warnings, issues: lint.issues }, stills: [], sheet: null, timings };
  const finish = async code => {
    timings.total = Date.now() - T0;
    report.ok = !issues.some(i => i.severity === 'error');
    report.summary = { errors: issues.filter(i => i.severity === 'error').length, warnings: issues.filter(i => i.severity === 'warn').length, frames: report.stills.length, ms: timings.total };
    fs.writeFileSync(path.join(dir, 'peek.json'), JSON.stringify(report, null, 1));
    await browser.close().catch(() => { }); server.close();
    if (opt.json) console.log(JSON.stringify(report, null, 1)); else printReport(report, dir);
    if (!report.ok) process.exitCode = 1;
    return report;
  };
  const open = async (vw, vh) => {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: scale });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errs.push({ console: m.type(), text: m.text() }); });
    // a page that throws while building never sets window.__ready: fail fast instead of waiting for the timeout
    const failed = new Promise((_, rej) => page.on('pageerror', () => setTimeout(() => page.evaluate(() => !!window.__ready).then(ok => ok || rej(new Error('page error before __ready')), () => rej(new Error('page closed'))), 400)));
    const ready = Promise.race([page.goto(url)
      // a vidkit page publishes window.__size when vk.video() finalises; a page without it within 30 s is not one
      .then(() => page.waitForFunction(() => window.__size || (document.readyState === 'complete' && !window.vk), null, { timeout: 30000 }).catch(() => null))
      .then(() => page.evaluate(() => !!window.__size)).then(ok => { if (!ok) throw new Error('no vidkit video on this page (vk.video() was never called / finalised)'); })
      .then(() => page.waitForFunction(() => window.__ready, null, { timeout: 180000 })).then(() => page.evaluate(() => window.__ready)), failed]);
    ready.catch(() => { });
    return { ctx, page, errs, ready };
  };
  const det = !opt.noDeterminism;
  let A = await open(1920, 1920), B = det ? await open(1920, 1920) : null;
  const loadErr = await A.ready.then(() => null, e => e);
  const pageErrors = () => A.errs.filter(e => typeof e === 'string');
  if (loadErr || pageErrors().length) {
    for (const m of pageErrors()) add('error', 'page-error', m.split('\n').slice(0, 3).join(' · '));
    if (!pageErrors().length) add('error', 'page-error', 'page did not initialise: ' + String(loadErr && loadErr.message || loadErr).split('\n')[0]);
    collectConsole(A.errs, warnings, add);
    return finish();
  }
  const info = await A.page.evaluate(() => ({ size: window.__size, dur: window.__duration, fps: window.__fps, scenes: window.__scenes, meta: window.__vk || {} }));
  const { width: W, height: H } = info.size;
  if (W > 1920 || H > 1920) { await A.ctx.close(); if (B) await B.ctx.close(); A = await open(W, H); B = det ? await open(W, H) : null; await A.ready; }
  timings.load = Date.now() - t;
  Object.assign(report, { size: info.size, duration: info.dur, fps: info.fps, scenes: info.scenes.map(s => ({ index: s.index, name: s.name, start: s.start, dur: s.dur, transition: s.transition })) });
  // ---- times ----
  let times;
  if (opt.at) times = String(opt.at).split(',').map(Number).filter(x => isFinite(x));
  else if (opt.every) { const st = +opt.every; times = []; for (let x = 0; x < info.dur - 1e-6; x += st) times.push(+x.toFixed(3)); }
  else times = [0].concat(contactTimes(info), settleTimes(info).map(x => x.t));   // t=0 = the thumbnail most players show
  times = [...new Set(times.map(x => +Math.min(Math.max(0, x), info.dur - 1 / info.fps).toFixed(3)))].sort((a, b) => a - b).filter((x, i, a) => i === 0 || x - a[i - 1] > .04);
  const settleList = settleTimes(info).map(x => x.t), settled = { has: x => settleList.some(v => Math.abs(v - x) < .06) };
  const dt = 1 / (info.fps || 30), sceneAt = x => info.scenes.findLast(s => x >= s.start) || info.scenes[0];
  const nearCut = x => info.scenes.some(s => (s.start > 0 && Math.abs(x - s.start) < dt * 2) || (s.transition && s.transition.d && x >= s.start - dt && x <= s.start + s.transition.d + dt));
  const inTransition = x => info.scenes.some(s => s.transition && s.transition.d && x >= s.start && x <= s.start + s.transition.d);
  const H2 = await browser.newPage(); await H2.setContent('<canvas id=c></canvas>'); await H2.evaluate(ANALYZE);
  const clip = { x: 0, y: 0, width: W, height: H }, jpg = () => A.page.screenshot({ type: 'jpeg', quality: 80, clip });
  const seek = (P, x) => P.evaluate(x => window.__seek(x), x);
  const shots = [];
  for (const x of times) {
    const f0 = Date.now(), sc = sceneAt(x), at = { t: x, scene: sc ? sc.index + 1 : null };
    const nErr = pageErrors().length;
    try {
      let nb = null;
      // flicker needs t±1 frame (two extra captures): at the settled frames by default, everywhere with --flicker all
      if (!opt.noFlicker && (opt.flicker === 'all' || settled.has(x) || opt.at || opt.every) && !nearCut(x) && x - dt >= 0 && x + dt < info.dur) { await seek(A.page, x - dt); const a = await jpg(); await seek(A.page, x + dt); const c = await jpg(); nb = [a, c]; }
      const s0 = Date.now(); await seek(A.page, x); const img = await jpg(); const ms = Date.now() - s0;
      const q0 = Date.now(), qa = await A.page.evaluate(() => window.__qa()), q1 = Date.now(), boxes = await A.page.evaluate(() => window.__textBoxes ? window.__textBoxes() : []), q2 = Date.now();
      const file = path.join(dir, `still-${String(shots.length + 1).padStart(2, '0')}-t${fmtT(x)}.jpg`); fs.writeFileSync(file, img);
      const an = await H2.evaluate(a => window.__analyze(a), { img: img.toString('base64'), nb: nb && nb.map(b => b.toString('base64')), boxes, W, scale });
      shots.push({ t: x, file, img, hash: md5(img), scene: sc, issues: [] });
      report.stills.push({ t: x, file, scene: sc ? sc.index + 1 : null, sceneName: sc ? sc.name : null, ms, luma: +an.mean.toFixed(1), sd: +an.sd.toFixed(2) });
      timings.frames.push({ t: x, seekShot: ms, qa: q1 - q0, boxes: q2 - q1, analyze: Date.now() - q2, total: Date.now() - f0 });
      const mine = [];
      const push = (sev, code, msg, ex = {}) => { mine.push(code); add(sev, code, msg, { ...at, ...ex }); };
      // layout problems are errors on a scene's settled frame; mid-animation (letters flying in) they are warnings,
      // and letters of one word crossing each other while they animate are not reported at all
      const st = settled.has(x) && !inTransition(x);
      for (const q of qa.issues) { if (q.type === 'blank-frame') continue; if (!st && q.type === 'text-overlap' && /^span\.vk-(c|ch|chi|w|word|lw)\b/.test(q.el || '') && /^span\.vk-(c|ch|chi|w|word|lw)\b/.test(q.other || '')) continue; push(q.level === 'warn' || QA_SEV[q.type] || !st ? 'warn' : 'error', q.type, `${q.el || ''}${q.other ? '  <->  ' + q.other : ''}${q.zone ? ' [' + q.zone + ']' : ''}${q.scrollW ? ` (${q.scrollW}>${q.clientW}px)` : ''}${q.w ? ` w=${q.w}` : ''}`.trim(), { el: q.el }); }
      if (an.sd < 2.5 && x === 0) push('warn', 'blank-first-frame', `the first frame is uniform (luma ${an.mean.toFixed(0)} ± ${an.sd.toFixed(1)})`);
      else if (an.sd < 2.5) push(settled.has(x) && !inTransition(x) ? 'error' : 'warn', 'blank-frame', `uniform frame (luma ${an.mean.toFixed(0)} ± ${an.sd.toFixed(1)})`);
      else if (an.mean < 10 && an.peak < 48) push('warn', 'dark-frame', `near-black frame (luma mean ${an.mean.toFixed(1)}, brightest ${an.peak})`);
      for (const c of an.contrast) if (c.ratio < 1.6 && c.css < 2) push(c.ratio < 1.25 && st ? 'error' : 'warn', 'low-contrast', `"${c.text}" contrast ${c.ratio.toFixed(2)}:1 against its background (${c.label})`, { el: `${c.label} "${c.text}"` });
      if (an.flicker) push('warn', 'flicker', `frame differs from both neighbours by ${an.flicker.ab.toFixed(1)}/${an.flicker.bc.toFixed(1)} (neighbours differ by ${an.flicker.ac.toFixed(1)})`);
      shots[shots.length - 1].issues = mine;
    } catch (e) { add('error', 'page-error', String(e.message || e).split('\n').slice(0, 2).join(' '), at); }
    for (const m of pageErrors().slice(nErr)) add('error', 'page-error', m.split('\n').slice(0, 3).join(' · '), at);
  }
  // ---- determinism: a fresh page renders a few of the same times ----
  if (B && shots.length) {
    t = Date.now();
    const bOk = await B.ready.then(() => true, () => false), pick = [...new Set([...shots.filter(s => settled.has(s.t)).slice(0, 12), shots[0], shots[shots.length - 1]])];   // every scene's settled frame
    const mism = [];
    // lossless on both sides (JPEG re-quantisation turns 1-level raster noise into 40-level blocks): page A (which has
    // rendered every other time before) re-renders t, page B renders it fresh; tolerance = raster noise (a few levels)
    if (bOk) for (const s of pick) { await seek(A.page, s.t); const a = await A.page.screenshot({ type: 'png', clip }); await seek(B.page, s.t); const b = await B.page.screenshot({ type: 'png', clip }); const d = md5(a) !== md5(b) ? await H2.evaluate(x => window.__diff(x), [a.toString('base64'), b.toString('base64')]) : null; if (d && d.n > 16) { mism.push(s.t); const fresh = path.join(dir, `fresh-t${fmtT(s.t)}.png`); fs.writeFileSync(fresh, b); add('error', 'nondeterministic', `t=${fmtT(s.t)} renders differently on a fresh page (${d.n} px differ, max ${d.max}; compare ${path.basename(fresh)})`, { t: s.t, scene: s.scene ? s.scene.index + 1 : null }); s.issues.push('nondeterministic'); } }
    report.determinism = { times: pick.map(s => s.t), mismatches: mism };
    timings.determinism = Date.now() - t;
  }
  collectConsole(A.errs, warnings, add);
  // ---- contact sheet ----
  t = Date.now();
  const cols = +opt.cols || (W >= H ? 4 : 6);
  const sev = s => s.issues.length ? (issues.some(i => i.t === s.t && i.severity === 'error') ? 'error' : 'warn') : 'ok';
  const png = await H2.evaluate(a => window.__sheet(a), { cols, title: `${path.basename(abs)} · ${W}×${H} · ${info.dur.toFixed(2)}s · ${info.scenes.length} scenes${opt.draft ? ' · draft' : ''}`, items: shots.map(s => ({ img: s.img.toString('base64'), label: `t=${fmtT(s.t)} · ${s.scene ? s.scene.index + 1 + ' ' + s.scene.name : ''}`, sev: sev(s), codes: [...new Set(s.issues)].join(' ') })) });
  report.sheet = path.join(dir, 'sheet.png'); fs.writeFileSync(report.sheet, Buffer.from(png, 'base64'));
  timings.sheet = Date.now() - t;
  dedupe(issues);
  return finish();
}

function md5(b) { return crypto.createHash('md5').update(b).digest('hex'); }
function collectConsole(list, warnings, add) {
  for (const e of list) if (typeof e === 'object') {
    warnings.push(e.text.split('\n')[0]);
    if (/\[vk\] unknown /.test(e.text)) add('warn', 'unknown-name', e.text.split('\n')[0]);
  }
}
// the same layout problem at several times → one issue with times[]
function dedupe(issues) {
  const seen = new Map(), out = [];
  for (const i of issues) {
    const k = i.code + '|' + (i.el || i.message);
    if (i.t != null && seen.has(k)) { const j = seen.get(k); if (!(j.times || (j.times = [j.t])).includes(i.t)) j.times.push(i.t); if (i.severity === 'error') j.severity = 'error'; continue; }
    seen.set(k, i); out.push(i);
  }
  issues.splice(0, issues.length, ...out);
}
function printReport(r, dir) {
  const rel = f => path.relative(process.cwd(), f) || f;
  console.log(`[vk peek] ${path.basename(r.file)}  ${r.size ? `${r.size.width}x${r.size.height}  ${r.duration.toFixed(2)}s  ${r.scenes.length} scenes` : ''}  ${r.stills.length} frames  ${(r.timings.total / 1000).toFixed(1)}s${r.strict ? '  strict' : ''}${r.draft ? '  draft' : ''}`);
  for (const i of r.issues) console.log(`  ${i.severity === 'error' ? 'ERROR' : 'WARN '} ${i.code}${i.t != null ? ` t=${fmtT(i.t)}` : ''}${i.times ? ` (+${i.times.length - 1} more)` : ''}: ${i.message}${i.hint ? `\n        → ${i.hint}` : ''}`);
  if (r.determinism) console.log(`  determinism: ${r.determinism.times.length - r.determinism.mismatches.length}/${r.determinism.times.length} times identical on a fresh page`);
  console.log(`  ${r.ok ? 'OK' : 'NOT OK'}: ${r.summary.errors} error(s), ${r.summary.warnings} warning(s)`);
  console.log(`  sheet  ${r.sheet ? rel(r.sheet) : '-'}\n  stills ${rel(dir)}/still-*.jpg\n  report ${rel(path.join(dir, 'peek.json'))}`);
}

// ---- helper page: decode screenshots, measure luma / flicker / text contrast, compose the sheet ----
const ANALYZE = () => {
  const dec = async b64 => { const r = await fetch('data:image/jpeg;base64,' + b64); return createImageBitmap(await r.blob()); };
  const lum = (r, g, b) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const small = bm => { const c = new OffscreenCanvas(64, 36), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data, y = new Float32Array(64 * 36); for (let i = 0; i < y.length; i++) y[i] = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]; return y; };
  const rgba = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return [0, 0, 0, 1]; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; };
  const mad = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
  window.__analyze = async ({ img, nb, boxes, W, scale }) => {
    const bm = await dec(img), y = small(bm);
    let m = 0; for (const v of y) m += v; m /= y.length; let sd = 0; for (const v of y) sd += (v - m) ** 2; sd = Math.sqrt(sd / y.length);
    // brightest spot at 160×90 (small white text on black is not a dark frame)
    const c9 = new OffscreenCanvas(160, 90), g9 = c9.getContext('2d', { willReadFrequently: true }); g9.drawImage(bm, 0, 0, 160, 90);
    const d9 = g9.getImageData(0, 0, 160, 90).data; let peak = 0; for (let i = 0; i < d9.length; i += 4) peak = Math.max(peak, .299 * d9[i] + .587 * d9[i + 1] + .114 * d9[i + 2]); peak = Math.round(peak);
    let flicker = null;
    if (nb) { const a = small(await dec(nb[0])), c = small(await dec(nb[1])), ab = mad(a, y), bc = mad(y, c), ac = mad(a, c); if (ab > 6 && bc > 6 && ac < Math.min(ab, bc) * .35) flicker = { ab, bc, ac }; }
    // contrast: background = median luminance inside the text box, ink = the 98th-percentile most different pixel
    const k = bm.width / W, cv = new OffscreenCanvas(bm.width, bm.height), g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0);
    const contrast = [];
    for (const b of boxes || []) {
      const col = rgba(b.fill && !/^rgba?\(0, 0, 0, 0\)$/.test(b.fill) && b.fill !== b.color ? b.fill : b.color);
      if (b.opacity * col[3] < .95 || b.size < 9) continue;   // fading / transparent fill (background-clip:text): skip
      const x0 = Math.max(0, Math.floor(b.l * k)), y0 = Math.max(0, Math.floor(b.t * k)), x1 = Math.min(bm.width, Math.ceil(b.r * k)), y1 = Math.min(bm.height, Math.ceil(b.b * k));
      if (x1 - x0 < 4 || y1 - y0 < 4) continue;
      const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data, L = new Float32Array(d.length / 4);
      for (let i = 0; i < L.length; i++) L[i] = lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      const s = [...L].sort((a, b) => a - b), bg = s[s.length >> 1];
      const diff = [...L].map(v => Math.abs(v - bg)).sort((a, b) => a - b), dd = diff[Math.floor(diff.length * .98)];
      const ink = [...L].find(v => Math.abs(v - bg) >= dd) ?? bg;
      const ratio = (Math.max(ink, bg) + .05) / (Math.min(ink, bg) + .05);
      // css: the declared colour against the measured background — low only when the colour itself is the problem
      // (text hidden by a clip / mask / a layer above reads as low measured contrast but has a normal css ratio)
      const cl = lum(col[0], col[1], col[2]), css = (Math.max(cl, bg) + .05) / (Math.min(cl, bg) + .05);
      contrast.push({ text: b.text.slice(0, 40), label: b.label, ratio, css });
    }
    return { mean: m, sd, peak, flicker, contrast };
  };
  // pixel difference of two captures: GPU raster may differ by a level or two between pages (not a determinism bug)
  window.__diff = async ([a, b]) => {
    const A = await dec(a), B = await dec(b), w = A.width, h = A.height, get = bm => { const c = new OffscreenCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, w, h).data; };
    const x = get(A), y = get(B); let max = 0, n = 0; for (let i = 0; i < x.length; i += 4) { const d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])); if (d > max) max = d; if (d > 8) n++; }
    return { max, n };
  };
  window.__sheet = async ({ cols, title, items }) => {
    const bms = await Promise.all(items.map(i => dec(i.img))), w0 = bms[0] ? bms[0].width : 320, h0 = bms[0] ? bms[0].height : 180;
    const tw = Math.min(400, w0), th = Math.round(tw * h0 / w0), pad = 10, lab = 34, rows = Math.ceil(items.length / cols);
    const c = new OffscreenCanvas(pad + cols * (tw + pad), 40 + rows * (th + lab + pad)), g = c.getContext('2d');
    g.fillStyle = '#1b1f2a'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#cfd6ea'; g.font = '600 16px monospace'; g.fillText(title, pad, 26);
    items.forEach((it, i) => {
      const x = pad + (i % cols) * (tw + pad), y = 40 + Math.floor(i / cols) * (th + lab + pad);
      g.drawImage(bms[i], x, y, tw, th);
      g.strokeStyle = it.sev === 'error' ? '#ff4d4f' : it.sev === 'warn' ? '#f5a623' : '#394060'; g.lineWidth = it.sev === 'ok' ? 1 : 3; g.strokeRect(x - .5, y - .5, tw + 1, th + 1);
      g.fillStyle = '#cfd6ea'; g.font = '600 13px monospace'; g.fillText(it.label.slice(0, 48), x, y + th + 15);
      if (it.codes) { g.fillStyle = it.sev === 'error' ? '#ff7875' : '#f5c060'; g.font = '12px monospace'; g.fillText(it.codes.slice(0, 52), x, y + th + 29); }
    });
    const blob = await c.convertToBlob({ type: 'image/png' }), buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s);
  };
};
