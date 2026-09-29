// Frame-by-frame quality comparison of two renders (same frame count/size): SSIM (Y and all) + PSNR via ffmpeg.
//   node scripts/compare-video.mjs a.mp4 b.mp4 [--a-from s] [--b-from s] [--dur s] [--json=out.json] [--worst 5]
// --a-from / --b-from select the start time inside each file (e.g. compare a segment render against the full film).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from '../cli/lib.mjs';
export async function compareVideos(a, b, { aFrom = 0, bFrom = 0, dur = null, fps = 30 } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkcmp-')), sf = path.join(tmp, 'ssim.log'), pf = path.join(tmp, 'psnr.log');
  const inA = ['-ss', String(aFrom), ...(dur ? ['-t', String(dur)] : []), '-i', a], inB = ['-ss', String(bFrom), ...(dur ? ['-t', String(dur)] : []), '-i', b];
  const lav = `[0:v]settb=1/${fps},setpts=N,split[a1][a2];[1:v]settb=1/${fps},setpts=N,split[b1][b2];[a1][b1]ssim=stats_file=${sf}[s];[a2][b2]psnr=stats_file=${pf}[p];[s][p]hstack[out]`;
  await new Promise((res, rej) => { const p = spawn('ffmpeg', ['-v', 'error', ...inA, ...inB, '-filter_complex', lav, '-map', '[out]', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] }); let e = ''; p.stderr.on('data', d => e += d); p.on('close', c => c ? rej(new Error(e)) : res()); });
  const ss = fs.readFileSync(sf, 'utf8').trim().split('\n').map(l => ({ n: +/n:(\d+)/.exec(l)[1], Y: +/Y:([\d.]+)/.exec(l)[1], all: +/All:([\d.]+)/.exec(l)[1] }));
  const ps = fs.readFileSync(pf, 'utf8').trim().split('\n').map(l => { const m = /psnr_avg:([\d.]+|inf)/.exec(l); return m[1] === 'inf' ? 99 : +m[1]; });
  fs.rmSync(tmp, { recursive: true, force: true });
  const frames = ss.map((s, i) => ({ n: s.n, ssimY: s.Y, ssim: s.all, psnr: ps[i] }));
  const avg = k => frames.reduce((x, f) => x + f[k], 0) / frames.length, min = k => Math.min(...frames.map(f => f[k]));
  return { frames: frames.length, ssim: +avg('ssim').toFixed(5), ssimMin: +min('ssim').toFixed(5), ssimY: +avg('ssimY').toFixed(5), psnr: +avg('psnr').toFixed(2), psnrMin: +min('psnr').toFixed(2), worst: [...frames].sort((x, y) => x.ssim - y.ssim).slice(0, 5), all: frames };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2));
  const r = await compareVideos(o._[0], o._[1], { aFrom: +(o.aFrom || 0), bFrom: +(o.bFrom || 0), dur: o.dur ? +o.dur : null });
  const { all, ...sum } = r; console.log(JSON.stringify(sum));
  if (o.json) fs.writeFileSync(o.json, JSON.stringify(r, null, 1));
}
