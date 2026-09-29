// vk stills page.html [--at 1.5,4,9.2] [-o dir] [--scale 1] [--format 9:16] [--capture beginframe|screenshot] [--no-cache]
//   (default: each scene's settled frame; same capture back-end as vk render, so stills match the film)
import { parseArgs, startServer, pageUrl, launch, probeInfo, settleTimes, fmtT, fs, path } from './lib.mjs';
import { openWorker, resolveMode } from './capture.mjs';
export default async function stills(argv) {
  const opt = parseArgs(argv), abs = path.resolve(opt._[0] || ''); if (!fs.existsSync(abs)) throw new Error('usage: vk stills page.html [--at t1,t2] [-o dir]');
  const { server, port } = await startServer(); const params = { render: '1' }; if (opt.format) params.format = opt.format; if (opt.noCache) params.cache = '0';
  const url = pageUrl(port, abs, params), browser = await launch(), info = await probeInfo(browser, url); await browser.close();
  const at = opt.at || opt.times; const times = at ? String(at).split(',').map(Number) : settleTimes(info).map(x => x.t);
  const name = path.basename(abs, path.extname(abs)), dir = path.resolve(opt.out || path.join(path.dirname(abs), '..', 'out', name + '-stills'));
  fs.mkdirSync(dir, { recursive: true });
  const wk = await openWorker(resolveMode(opt.capture), url, info, { scale: +(opt.scale || 1), type: 'png', gpu: opt.gpu, onError: e => console.error('  [page error]', e) });
  const files = [];
  for (const t of times) { await wk.seek(t); const f = path.join(dir, `${name}_t${fmtT(t)}.png`); fs.writeFileSync(f, await wk.frame('png')); files.push(f); console.log('  still', f); }
  await wk.close(); server.close(); return files;
}
