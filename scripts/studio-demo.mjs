// node scripts/studio-demo.mjs [--keep]
// End-to-end demo of `vk studio`: starts the studio on examples/, drives it like a user (Playwright) AND like an agent
// (HTTP API), renders a short clip from the studio's Render button, and writes UI screenshots:
//   out/studio/ui-*.png (one per view) + out/studio-ui.png (labelled sheet).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { LAUNCH, ROOT } from '../cli/lib.mjs';

const OUT = path.join(ROOT, 'out', 'studio'); fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('[studio-demo]', ...a);
if (process.argv.includes('--sheet-only')) { await sheet(JSON.parse(fs.readFileSync(path.join(OUT, 'shots.json'), 'utf8'))); process.exit(0); }
const srv = spawn(process.execPath, [path.join(ROOT, 'bin/vk.mjs'), 'studio', 'examples', '--port', '0', '--no-open'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
const base = await new Promise((res, rej) => { let s = ''; srv.stdout.on('data', d => { s += d; const m = s.match(/http:\/\/[\d.]+:\d+/); if (m) res(m[0]); }); srv.on('exit', c => rej(new Error('studio exited ' + c))); });
srv.stdout.on('data', d => process.stdout.write('  [vk studio] ' + d));
const api = (p, body) => fetch(base + p, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}).then(r => r.json());
const shots = [];
let browser;
try {
  browser = await chromium.launch(LAUNCH);
  const page = await browser.newPage({ viewport: { width: 1680, height: 1020 } });
  page.on('pageerror', e => log('UI error:', e.message));
  await page.goto(base + '/__studio/');
  const loaded = (name, timeout = 180000) => page.waitForFunction(n => window.__studio && window.__studio.st.info && window.__studio.st.file.endsWith(n), name, { timeout });
  await page.waitForFunction(() => window.__studio && window.__studio.st.info, null, { timeout: 60000 });
  const shot = async (name, label) => { const f = path.join(OUT, `ui-${name}.png`); await page.waitForTimeout(400); await page.screenshot({ path: f }); shots.push({ f, label }); log('shot', path.relative(ROOT, f)); };

  // ---- 1 · agent drives the UI: open reel, seek to a scene's settled frame, wait until the preview rendered it ----
  log('open reel via API', (await api('/api/open', { file: 'reel/reel' })).ok);
  await loaded('reel.html');
  const sk = await api('/api/seek', { scene: 2, settle: true, wait: true });
  log('seek (agent) →', JSON.stringify({ t: sk.t, frame: sk.frame, scene: sk.scene, rendered: sk.rendered }));
  const uiT = await page.evaluate(() => window.__studio.st.t);
  if (Math.abs(uiT - sk.t) > 1e-6) throw new Error(`UI playhead ${uiT} != API ${sk.t}`);
  const fr = await api(`/api/frame?t=${sk.t}&save=1`);
  log('headless frame', path.relative(ROOT, fr.path), fr.bytes, 'bytes');
  // play 1.5 s and measure the preview throughput
  await api('/api/play', { playing: true }); await page.waitForTimeout(1500); await api('/api/play', { playing: false });
  log('after play, UI t =', (await page.evaluate(() => window.__studio.st.t)).toFixed(2), '·', await page.textContent('#vb-fps'));
  await page.evaluate(() => { const S = window.__studio; S.setT(5.35); S.selectScene(2, false); S.setTlZoom(18); });
  await shot('reel-props', 'reel · 128 BPM beat grid + bars · scene inspector · motion blur');

  // ---- 2 · Peek from the top bar → Checks tab with the contact sheet ----
  await page.click('#btn-peek');
  await page.waitForFunction(() => { const p = window.__studio.st.peek; return p && p.result; }, null, { timeout: 240000 });
  await page.evaluate(() => window.__studio.showTab('checks'));
  await page.waitForFunction(() => { const i = document.querySelector('#tab-checks img.sheet'); return !i || i.complete; }, null, { timeout: 20000 });
  await shot('reel-checks', 'Peek from the studio: contact sheet + layout/contrast/flicker/determinism issues (click → seek)');

  // ---- 3 · three-promo through the quick switcher; in/out with I/O; Render (draft) from the Render tab ----
  await page.keyboard.press('Control+k'); await page.keyboard.type('three-promo'); await page.keyboard.press('Enter');
  await loaded('three-promo.html', 300000);
  await page.evaluate(() => window.__studio.setT(5.6)); await page.waitForTimeout(300); await page.keyboard.press('i');
  await page.evaluate(() => window.__studio.setT(6.6)); await page.waitForTimeout(300); await page.keyboard.press('o');
  await page.evaluate(() => { window.__studio.setT(6.1); window.__studio.showTab('render'); });
  await page.selectOption('#ro-quality', 'draft');
  await page.click('#ro-go');
  log('render queued from the studio Render button (three-promo 5.6–6.6 s, draft)');
  await page.waitForFunction(() => window.__studio.st.jobs.some(j => j.kind === 'render' && ['done', 'error'].includes(j.status)), null, { timeout: 900000 });
  const job = await page.evaluate(() => window.__studio.st.jobs.find(j => j.kind === 'render'));
  log('render', job.status, job.out, job.bytes, 'bytes', (job.ms / 1000).toFixed(1) + ' s');
  if (job.status !== 'done') throw new Error('render failed:\n' + job.log.join('\n'));
  const dl = await fetch(base + job.download); log('download', dl.status, dl.headers.get('content-disposition'), (await dl.arrayBuffer()).byteLength, 'bytes');
  await shot('three-render', 'three-promo (vk.three) · In/Out range · draft render done → Download MP4 · voice + beats tracks');

  // ---- 4 · a vk make page: STORY scene JSON is editable in the inspector ----
  await page.evaluate(() => { const c = window.__studio.st.comps.find(c => c.rel === 'kite-ink/kite-ink.html'); return window.__studio.openComp(c.file); });
  await loaded('kite-ink.html');
  await page.evaluate(() => { window.__studio.showTab('props'); window.__studio.selectScene(1, true); });
  await page.waitForSelector('#sj', { timeout: 20000 }).catch(() => { });
  await page.evaluate(() => { document.querySelector('#tab-props').scrollTop = 520; });
  await shot('story-json', 'kite-ink (vk make page) · STORY.scenes[i] editable JSON (validated, backup, live reload)');

  // ---- 5 · shortcuts ----
  await page.keyboard.press('?');
  await shot('shortcuts', 'Keyboard shortcuts (Remotion-style: Space J K L, ←/→, I/O/X, +/−, R, Ctrl+K …)');
  await page.keyboard.press('Escape');

  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(shots, null, 1));
} finally {
  if (browser) await browser.close();
  if (!process.argv.includes('--keep')) srv.kill('SIGTERM');
}
await sheet(shots);

// labelled 2-column sheet → out/studio-ui.png (plain browser, file:// images: fast)
async function sheet(list) {
  const html = path.join(OUT, 'sheet.html');
  fs.writeFileSync(html, `<!doctype html><meta charset=utf-8><body style="margin:0;background:#08090c;font:15px Inter,'Noto Sans SC',sans-serif;color:#cfd3dc">
    <h1 style="margin:22px 24px 6px;font-size:22px;color:#fff">vk studio <span style="color:#7c5cff">·</span> vidkit Studio 工作室 <small style="color:#6f7686;font-size:14px;font-weight:400">— live render(t) preview, timeline, inspector, Lint / Peek / Render, agent API</small></h1>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:14px 24px 28px">${list.map(s => `<figure><img src="${path.basename(s.f)}"><figcaption>${s.label}</figcaption></figure>`).join('')}</div>
    <style>figure{margin:0}img{width:100%;border-radius:8px;border:1px solid #2a2f3b;display:block}figcaption{margin-top:7px;color:#a9afbd;font-size:13.5px}</style></body>`);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1760, height: 800 } });
  await p.goto('file://' + html); await p.waitForFunction(() => [...document.images].every(i => i.complete));
  await p.screenshot({ path: path.join(ROOT, 'out', 'studio-ui.png'), fullPage: true }); await b.close();
  log('sheet → out/studio-ui.png');
}
