// vk contact page.html -o sheet.png [--times a,b,c] [--cols 4] [--format 9:16]
import { parseArgs, startServer, pageUrl, launch, probeInfo, workerPage, seek, contactTimes, fmtT, fs, path } from './lib.mjs';
export default async function contact(argv) {
  const opt = parseArgs(argv), abs = path.resolve(opt._[0] || ''); if (!fs.existsSync(abs)) throw new Error('usage: vk contact page.html -o sheet.png');
  const { server, port } = await startServer(); const params = { render: '1' }; if (opt.format) params.format = opt.format;
  const url = pageUrl(port, abs, params), browser = await launch(), info = await probeInfo(browser, url);
  const { width: W, height: H } = info.size;
  const times = opt.times ? String(opt.times).split(',').map(Number) : contactTimes(info);
  const page = await workerPage(browser, url, info, 1), imgs = [];
  for (const t of times) { await seek(page, t); imgs.push({ t, b64: (await page.screenshot({ type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: W, height: H } })).toString('base64') }); }
  const cols = +opt.cols || (W >= H ? 4 : 6), tw = W >= H ? 400 : 240, th = Math.round(tw * H / W);
  const html = `<html><body style="margin:0;background:#1b1f2a;font:600 14px/1.2 monospace;color:#cfd6ea">
  <div style="padding:12px 14px;font-size:16px">${path.basename(abs)} · ${W}×${H} · ${info.dur.toFixed(2)}s · ${info.scenes.length} scenes · ${info.meta.theme || ''}</div>
  <div style="display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:10px;padding:0 14px 14px">
  ${imgs.map(i => { const s = info.scenes.findLast(s => i.t >= s.start); return `<div><img src="data:image/jpeg;base64,${i.b64}" style="width:${tw}px;height:${th}px;display:block;outline:1px solid #394060"><div style="padding:4px 0">t=${fmtT(i.t)}s · ${s ? (s.index + 1) + ' ' + s.name : '?'}</div></div>`; }).join('')}
  </div></body></html>`;
  const cp = await browser.newPage({ viewport: { width: cols * (tw + 10) + 18, height: 200 } });
  await cp.setContent(html); await cp.waitForLoadState('load');
  const f = path.resolve(opt.out || abs.replace(/\.html?$/i, '') + '-contact.png'); fs.mkdirSync(path.dirname(f), { recursive: true });
  await cp.screenshot({ path: f, fullPage: true });
  await browser.close(); server.close(); console.log('  contact sheet', f); return f;
}
