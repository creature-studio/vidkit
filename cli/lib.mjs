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
  const opt = { _: [] }, F = new Set(['srt', 'png', 'jpeg', 'keep', 'no-score', 'no-video', 'json', 'open', 'dev', 'help', 'no-grain-check', 'settle', 'no-voice', 'no-cache', 'timing', 'no-motion-blur', 'strict', 'no-strict', 'draft', ...flags]);
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
// Defer page scripts that call vk.video/style/film until styles/<id>/ packs are registered via ES modules.

function pageNeedsStylePacks(html) {
  if (/vkStyleDemo\s*\(|vk\.film\s*\(|vk\.style\s*\(\s*['"\`]/.test(html)) return true;
  const re = /vk\.video\s*\(\s*\{/g; let m;
  while ((m = re.exec(html))) {
    let i = m.index + m[0].length - 1, depth = 0;
    for (; i < html.length; i++) {
      const c = html[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          const body = html.slice(m.index + m[0].length, i);
          if (/\bstyle\s*:\s*(['"\`][\w.-]+['"\`]|\[|\{)/.test(body)) return true;
          break;
        }
      }
    }
  }
  return false;
}
export function styleBootInject(html, { stylesUrl = path.join(ROOT, 'styles') + '/' } = {}) {
  if (!html || html.includes('data-vk-style-boot')) return html;
  // Only pages that actually consume a style pack need the runtime loader. Plain vk.video({…}) demos stay untouched
  // so existing examples stay bit-identical and we do not pay for loading every styles/<id>/.
  // Particle morph `style: 'converge'` is NOT a pack — only inspect the vk.video({…}) config object.
  if (!pageNeedsStylePacks(html)) return html;
  const bootHref = path.join(ROOT, 'styles', 'boot.mjs');
  let n = 0;
  let out = html.replace(/<script(\s(?![^>]*\bsrc\b)[^>]*)?>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
    if (/type\s*=\s*["']module["']/i.test(attrs || '')) return m;
    if (/type\s*=\s*["']application\/json["']/i.test(attrs || '')) return m;
    if (!/\bvk\.(video|style|film)\b|vkStyleDemo|style\s*:/.test(body)) return m;
    n++;
    return `<script type="application/json" id="vk-defer-${n}" data-vk-defer="1">${JSON.stringify(body)}</script>`;
  });
  if (!n && !/type\s*=\s*["']module["'][^>]*>[\s\S]*(vkStyleDemo|vk\.film|style\s*:)/.test(html)) return html;
  const boot = `<script type="module" data-vk-style-boot="1">
import { boot } from '${bootHref}';
if (!window.vk) throw new Error('[vk.style] vidkit.js must load before style boot');
await boot(window.vk, { stylesUrl: ${JSON.stringify(stylesUrl)} });
for (const el of [...document.querySelectorAll('[data-vk-defer]')]) {
  const s = document.createElement('script');
  s.textContent = JSON.parse(el.textContent);
  el.replaceWith(s);
}
</script>`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, boot + '</body>');
  else out += boot;
  return out;
}
export function startServer({ inject = null, extra = null, port = 0, host = '127.0.0.1', styles = true } = {}) {
  const stylesUrl = path.join(ROOT, 'styles') + '/';
  const userInject = inject;
  const injectHtml = html => {
    let h = styles ? styleBootInject(html, { stylesUrl }) : html;
    if (userInject) h = userInject(h);
    return h;
  };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
    if (p.startsWith('/__vk/cache/')) return cacheEndpoint(req, res, p.slice(12));

    if (extra && extra(req, res, p)) return;
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const ext = path.extname(p).toLowerCase();
      if (ext === '.html') buf = Buffer.from(injectHtml(buf.toString()));
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
      res.end(buf);
    });
  });
  return new Promise(r => server.listen(port, host, () => r({ server, port: server.address().port })));
}
// agent-facing commands load pages strict (unknown names / Math.random in render(t) throw) unless --no-strict or the
// page says vk.video({strict:false}); --draft asks the page for its cheap preview path (vk.three: res .35, aa 1, no DOF)
export function modeParams(opt, params = {}, { strict = true } = {}) {
  const off = opt.noStrict || opt.strict === 'false' || opt.strict === '0';
  if (off) params.strict = '0'; else if (strict || opt.strict) params.strict = '1';
  if (opt.draft) params.draft = '1';
  return params;
}
// vk.three start-up cache (src/three/cache.js): content-hash keyed blobs, shared by all workers and runs
export const CACHE_DIR = process.env.VK_CACHE_DIR || path.join(os.homedir(), '.cache', 'vidkit');
function cacheEndpoint(req, res, key) {
  const H = { 'x-vk-cache': '1', 'cache-control': 'no-store' };
  if (!/^[a-z0-9_-]{8,80}$/i.test(key)) { res.writeHead(400, H); res.end(); return; }
  const f = path.join(CACHE_DIR, key + '.bin');
  if (req.method === 'PUT') {
    const parts = []; req.on('data', d => parts.push(d)); req.on('end', () => {
      try { fs.mkdirSync(CACHE_DIR, { recursive: true }); const tmp = f + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, Buffer.concat(parts)); fs.renameSync(tmp, f); res.writeHead(204, H); } catch (e) { res.writeHead(500, H); }
      res.end();
    });
    return;
  }
  fs.readFile(f, (err, buf) => { if (err) { res.writeHead(404, H); res.end(); return; } res.writeHead(200, { ...H, 'content-type': 'application/octet-stream' }); res.end(buf); });
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
  const info = await p.evaluate(() => ({ size: window.__size, dur: window.__duration, fps: window.__fps, scenes: window.__scenes, caps: window.__captions, audio: window.__audio, meta: window.__vk || {}, hasScore: typeof window.SCORE === 'function', cues: window.__cues || [], music: window.__music || null, voice: window.__voice || [], voMissing: window.__voMissing || [], mix: window.__mix || null, bake: window.__bake || null, motionBlur: window.__motionBlur || null }));
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
