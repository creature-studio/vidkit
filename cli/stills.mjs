// vk stills page.html [--at 1.5,4,9.2] [-o dir] [--scale 1] [--format 9:16]   (default: each scene's settled frame)
import { parseArgs, startServer, pageUrl, launch, probeInfo, workerPage, seek, shot, settleTimes, fmtT, fs, path } from './lib.mjs';
export default async function stills(argv) {
  const opt = parseArgs(argv), abs = path.resolve(opt._[0] || ''); if (!fs.existsSync(abs)) throw new Error('usage: vk stills page.html [--at t1,t2] [-o dir]');
  const { server, port } = await startServer(); const params = { render: '1' }; if (opt.format) params.format = opt.format;
  const url = pageUrl(port, abs, params), browser = await launch(), info = await probeInfo(browser, url);
  const at = opt.at || opt.times; const times = at ? String(at).split(',').map(Number) : settleTimes(info).map(x => x.t);
  const name = path.basename(abs, path.extname(abs)), dir = path.resolve(opt.out || path.join(path.dirname(abs), '..', 'out', name + '-stills'));
  fs.mkdirSync(dir, { recursive: true });
  const page = await workerPage(browser, url, info, +(opt.scale || 1));
  const files = [];
  for (const t of times) { await seek(page, t); const f = path.join(dir, `${name}_t${fmtT(t)}.png`); fs.writeFileSync(f, await shot(page, info, 'png')); files.push(f); console.log('  still', f); }
  await browser.close(); server.close(); return files;
}
