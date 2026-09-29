// Lossless still comparison of two capture set-ups at the same times (isolates capture/raster differences from codec noise).
//   node scripts/compare-capture.mjs page.html [--times a,b,c | --n 12] [--a screenshot] [--b beginframe] [--a-cache 0|1] [--b-cache 0|1]
//        [--a-gpu swiftshader] [--b-gpu soft] [--out dir] [--json report.json]
// Writes <out>/<name>_t<T>_{a,b}.png and a PSNR/SSIM table (ffmpeg ssim/psnr on RGB→YUV444).
import { openWorker } from '../cli/capture.mjs';
import { parseArgs, startServer, pageUrl, launch, probeInfo, run, fs, path } from '../cli/lib.mjs';
export async function imgCompare(a, b) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-filter_complex', '[0:v]format=yuv444p,split[a1][a2];[1:v]format=yuv444p,split[b1][b2];[a1][b1]ssim;[a2][b2]psnr', '-f', 'null', '-']);
  const s = /SSIM Y:([\d.]+).*All:([\d.]+)/.exec(stderr), p = /PSNR.*average:([\d.]+|inf)/.exec(stderr);
  return { ssimY: +s[1], ssim: +s[2], psnr: p[1] === 'inf' ? 99 : +p[1] };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2)), abs = path.resolve(o._[0]), name = path.basename(abs, '.html');
  const { server, port } = await startServer();
  const url = c => pageUrl(port, abs, { render: '1', fps: '30', ...(c === '0' ? { cache: '0' } : {}), ...(o.format ? { format: o.format } : {}) });
  const pb = await launch(), info = await probeInfo(pb, url()); await pb.close();
  const times = o.times ? String(o.times).split(',').map(Number) : Array.from({ length: +(o.n || 12) }, (_, i) => +((info.dur * (i + .5)) / +(o.n || 12)).toFixed(3));
  const out = path.resolve(o.out || '/tmp/vk-compare'); fs.mkdirSync(out, { recursive: true });
  const shoot = async (mode, gpu, cache, tag) => {
    const w = await openWorker(mode, url(cache), info, { type: 'png', gpu, onError: e => console.log('  [page error]', e) });
    const files = [];
    for (const t of times) { await w.seek(t); const f = path.join(out, `${name}_t${t.toFixed(3)}_${tag}.png`); fs.writeFileSync(f, await w.frame('png')); files.push(f); }
    await w.close(); return files;
  };
  const A = await shoot(o.a || 'screenshot', o.aGpu, String(o.aCache ?? '1'), 'a'), B = await shoot(o.b || 'beginframe', o.bGpu, String(o.bCache ?? '1'), 'b');
  const rows = [];
  for (let i = 0; i < times.length; i++) { const r = await imgCompare(A[i], B[i]); rows.push({ t: times[i], ...r }); console.log(`  t=${times[i].toFixed(3)}  SSIM ${r.ssim.toFixed(5)} (Y ${r.ssimY.toFixed(5)})  PSNR ${r.psnr.toFixed(2)} dB`); }
  const avg = k => rows.reduce((x, r) => x + r[k], 0) / rows.length;
  const sum = { page: name, a: `${o.a || 'screenshot'}/${o.aGpu || 'default'}/cache=${o.aCache ?? 1}`, b: `${o.b || 'beginframe'}/${o.bGpu || 'default'}/cache=${o.bCache ?? 1}`, n: rows.length, ssim: +avg('ssim').toFixed(5), ssimMin: +Math.min(...rows.map(r => r.ssim)).toFixed(5), psnr: +avg('psnr').toFixed(2), psnrMin: +Math.min(...rows.map(r => r.psnr)).toFixed(2) };
  console.log(JSON.stringify(sum));
  if (o.json) fs.writeFileSync(path.resolve(o.json), JSON.stringify({ ...sum, rows }, null, 1));
  server.close();
}
