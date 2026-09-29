// (explainer-vo needs `vk tts examples/explainer-vo.html` first; its clips are committed.)
// Render every example to out/: MP4 (+SRT), contact sheet, stills, QA report.   npm run examples [-- promo vertical]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vk = (...a) => execFileSync(process.execPath, [path.join(ROOT, 'bin/vk.mjs'), ...a], { stdio: 'inherit', cwd: ROOT });
const all = { promo: 3, explainer: 3, vertical: 5, gallery: 6, mv: 5, 'explainer-vo': 3 };
// Phase 2 examples also get an A/V sync report (needs the Python toolchain: tools/setup-audio.sh)
const sync = { mv: ['--beats', 'examples/mv/song.beats.json'], 'explainer-vo': ['--words', 'out/explainer-vo.words.json'] };
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(all);
for (const n of names) {
  const src = `examples/${n}.html`;
  vk('qa', src, `--json=out/${n}-qa.json`);
  vk('render', src, '-o', `out/${n}.mp4`, '--srt', '--workers', '4');
  vk('contact', src, '--settle', '--cols', String(all[n] || 4), '-o', `out/${n}-contact.png`);
  vk('stills', src, '-o', `out/${n}-stills`);
  if (sync[n]) vk('sync', `out/${n}.mp4`, ...sync[n], '-o', `out/${n}-sync.json`);
}
