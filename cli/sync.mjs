// vk sync out.mp4 [--beats song.beats.json --music-start 12.3] [--words out.words.json] [-o report.json]
//   beat mode : visual hit frames (sharp luma rises) vs audio onsets re-detected in the MP4 (+ vs analysed beats)
//   words mode: re-aligns the MP4 soundtrack to the caption text and compares with the caption word times
import { parseArgs, path, fs } from './lib.mjs';
import { vkaudio } from './py.mjs';
export default async function sync(argv) {
  const opt = parseArgs(argv), f = opt._[0];
  if (!f || !fs.existsSync(f)) throw new Error('usage: vk sync out.mp4 [--beats song.beats.json --music-start s] [--words out.words.json]');
  const args = ['sync', path.resolve(f)];
  if (opt.beats) args.push('--beats', path.resolve(opt.beats));
  if (opt.musicStart) args.push('--music-start', String(opt.musicStart));
  if (opt.words) args.push('--words', path.resolve(opt.words));
  if (opt.model) args.push('--model', opt.model);
  if (opt.minJump) args.push('--min-jump', String(opt.minJump));
  if (opt.out) args.push('-o', path.resolve(opt.out));
  process.stdout.write(await vkaudio(args));
}
