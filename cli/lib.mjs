// Shared CLI plumbing: arg parsing, static server, browser/page helpers, ffmpeg helpers.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json')));

export function parseArgs(argv, flags = []) {
  const opt = { _: [] }, F = new Set(['srt', 'png', 'jpeg', 'keep', 'no-score', 'no-video', 'json', 'open', 'dev', 'help', 'no-grain-check', 'settle', 'no-voice', ...flags]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o') { opt.out = argv[++i]; continue; }
    if (a === '-h') { opt.help = true; continue; }
    if (a.startsWith('--')) {
      const [k0, inline] = a.slice(2).split('=');
      const k = k0.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (inline != null) opt[k] = inline; else if (F.has(k0)) opt[k] = true; else opt[k] = argv[++i];
      continue;
    }
    opt._.push(a);
  }
  return opt;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.srt': 'text/plain; charset=utf-8' };
// Serves the local filesystem by absolute path (file:// is unreliable for fonts/fetch/modules).
export function startServer({ inject = null, extra = null, port = 0, host = '127.0.0.1' } = {}) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
    if (extra && extra(req, res, p)) return;
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const ext = path.extname(p).toLowerCase();
      if (inject && ext === '.html') buf = Buffer.from(inject(buf.toString()));
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
      res.end(buf);
    });
  });
  return new Promise(r => server.listen(port, host, () => r({ server, port: server.address().port })));
}
export function pageUrl(port, abs, params = {}) {
  const q = new URLSearchParams(params);
  return `http://127.0.0.1:${port}${abs.split(path.sep).map(encodeURIComponent).join('/')}${[...q].length ? '?' + q : ''}`;
}
export const LAUNCH = { args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-gpu-vsync', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
export async function launch() { return chromium.launch(LAUNCH); }

export async function probeInfo(browser, url) {
  const p = await browser.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.__size && window.__ready, null, { timeout: 30000 }).catch(() => { throw new Error('page did not initialise (vk.video() never finalized?) ' + errs.join('; ')); });
  await p.evaluate(() => window.__ready);
  const info = await p.evaluate(() => ({ size: window.__size, dur: window.__duration, fps: window.__fps, scenes: window.__scenes, caps: window.__captions, audio: window.__audio, meta: window.__vk || {}, hasScore: typeof window.SCORE === 'function', cues: window.__cues || [], music: window.__music || null, voice: window.__voice || [], voMissing: window.__voMissing || [], mix: window.__mix || null }));
  await p.close();
  if (errs.length) throw new Error('page error: ' + errs.join('; '));
  return info;
}
export async function workerPage(browser, url, info, scale = 1, { failFast = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: info.size.width, height: info.size.height }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('  [page]', m.text()); });
  page.on('pageerror', e => { console.error('  [page error]', e.message); if (failFast) process.exit(1); });  // never ship a broken film
  await page.goto(url);
  await page.waitForFunction(() => window.__ready);
  await page.evaluate(() => window.__ready);
  return page;
}
export const seek = (page, t) => page.evaluate(t => window.__seek(t), t);
export const shot = (page, info, type = 'png', quality = 95) => page.screenshot({ type, quality: type === 'jpeg' ? quality : undefined, clip: { x: 0, y: 0, width: info.size.width, height: info.size.height } });
export function run(cmd, args, input) {
  return new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] }); const out = [], err = []; p.stdout.on('data', d => out.push(d)); p.stderr.on('data', d => err.push(d)); if (input) { p.stdin.end(input); } p.on('close', c => c ? rej(new Error(cmd + ' exit ' + c + ': ' + Buffer.concat(err).toString().slice(-600))) : res({ stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString() })); });
}
export const fmtT = t => (Math.round(t * 1000) / 1000).toFixed(2);
// settled times: 0.8 s before each scene ends (or mid-scene for short scenes); entrance: ~30% in
// settled frame of each scene: after its own entry transition, before the next scene starts overlapping it
export function settleTimes(info) {
  return info.scenes.map(s => {
    const next = info.scenes[s.index + 1], a = s.start + (s.transition && s.transition.d || 0), b = next ? next.start : s.start + s.dur;
    let t = b - Math.min(.8, (b - a) * .3);
    if (s.settle != null) t = Math.min(b - .05, Math.max(t, s.start + s.settle + .1)); // wait for entrance animations
    return { scene: s, t: +(Math.max(a, t)).toFixed(3) };
  });
}
export function contactTimes(info) {
  return info.scenes.flatMap(s => { const next = info.scenes[s.index + 1], end = next ? next.start : s.start + s.dur; const a = s.start + (s.transition.d || 0) + Math.min(1.0, (end - s.start) * .25), b = Math.min(end - .35, s.start + s.dur - .8); return b - a > .6 ? [a, b] : [b]; });
}
export function ffprobe(file) {
  const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,nb_frames,sample_rate,channels:format=duration,size,bit_rate', '-of', 'json', file]).toString());
  return p;
}
export function ffprobeLine(file) {
  const p = ffprobe(file), v = p.streams.find(s => s.codec_type === 'video'), a = p.streams.find(s => s.codec_type === 'audio');
  return `${v.codec_name} ${v.width}x${v.height} ${v.pix_fmt} ${v.r_frame_rate}fps ${v.nb_frames} frames, ${(+p.format.duration).toFixed(3)}s, ${(p.format.size / 1e6).toFixed(2)} MB${a ? `, audio ${a.codec_name} ${a.sample_rate}Hz ${a.channels}ch` : ', no audio'}`;
}
// grayscale 64×36 luma statistics of an image buffer (blank-frame detection)
export async function lumaStats(buf) {
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-vf', 'scale=64:36,format=gray', '-f', 'rawvideo', 'pipe:1'], buf);
  let m = 0; for (const v of stdout) m += v; m /= stdout.length; let sd = 0; for (const v of stdout) sd += (v - m) ** 2; sd = Math.sqrt(sd / stdout.length);
  return { mean: m, sd };
}
export function tmpdir(prefix = 'vk-') { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
export { fs, path, os, spawn };
