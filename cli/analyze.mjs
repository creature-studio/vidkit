// vk analyze music.mp3 [-o music.beats.json] [--backend auto|beat_this|librosa] [--rate 50] [--bands 8] [--smooth 4] [--refine 40] [--snap 0]
import { parseArgs, path, fs } from './lib.mjs';
import { vkaudio } from './py.mjs';
export default async function analyze(argv) {
  const opt = parseArgs(argv), f = opt._[0];
  if (!f || !fs.existsSync(f)) throw new Error('usage: vk analyze music.mp3 [-o music.beats.json] [--backend auto|beat_this|librosa]');
  const args = ['analyze', path.resolve(f)];
  if (opt.out) args.push('-o', path.resolve(opt.out));
  for (const k of ['backend', 'rate', 'bands', 'smooth', 'refine', 'snap', 'range']) if (opt[k] != null) args.push('--' + k, String(opt[k]));
  process.stdout.write(await vkaudio(args));
}
