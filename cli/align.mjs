// vk align audio.wav [--text script.txt | --lyrics lyrics.txt] [--lang zh|en] [--model small] [--separate] [-o audio.align.json]
//   --text / --lyrics: one caption/lyric line per line (forced alignment). Without text: transcription with word times.
//   --separate: isolate vocals with demucs first (songs).
import { parseArgs, path, fs } from './lib.mjs';
import { vkaudio } from './py.mjs';
export default async function align(argv) {
  const opt = parseArgs(argv, ['separate', 'words-only']), f = opt._[0];
  if (!f || !fs.existsSync(f)) throw new Error('usage: vk align audio.wav [--text script.txt | --lyrics lyrics.txt] [--lang zh] [--separate]');
  const args = ['align', path.resolve(f)], text = opt.text || opt.lyrics;
  if (text) args.push('--text', path.resolve(text));
  if (opt.out) args.push('-o', path.resolve(opt.out));
  if (opt.lang) args.push('--lang', opt.lang);
  if (opt.model) args.push('--model', opt.model);
  if (opt.separate) args.push('--separate');
  if (opt.wordsOnly) args.push('--words-only');
  process.stdout.write(await vkaudio(args));
}
