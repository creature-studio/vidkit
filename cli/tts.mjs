// vk tts page.html [--voice zh-CN-YunxiNeural] [--backend edge|piper] [--rate +0%] [--pitch +0Hz] [--force]
//   Synthesises every scene `vo:` text of the page → <page>.vo/<id>.mp3 + word timings, writes <page>.vo.json
//   (the manifest vk.video({voice}) loads). Cached by (backend, voice, rate, pitch, text): only changed lines re-render.
// vk tts --text "你好" -o hello.mp3 [--voice …]      single clip (+ hello.json word timings)
// vk tts --voices [zh|en|…]                          list edge-tts voices (online)
import crypto from 'node:crypto';
import { parseArgs, startServer, pageUrl, launch, path, fs, tmpdir } from './lib.mjs';
import { vkaudio, python } from './py.mjs';
import { spawnSync } from 'node:child_process';

const DEF = { backend: 'edge', voice: { edge: 'zh-CN-YunxiNeural', piper: 'zh_CN-huayan-medium' }, rate: '+0%', pitch: '+0Hz' };
export default async function tts(argv) {
  const opt = parseArgs(argv, ['force', 'voices']);
  if (opt.voices) {
    const edge = path.join(path.dirname(python()), 'edge-tts');
    const r = spawnSync(fs.existsSync(edge) ? edge : 'edge-tts', ['--list-voices'], { encoding: 'utf8' });
    const lang = typeof opt.voices === 'string' ? opt.voices : (opt._[0] || 'zh');
    console.log(r.stdout.split('\n').filter((l, i) => i < 2 || l.toLowerCase().startsWith(lang.toLowerCase())).join('\n'));
    return;
  }
  if (opt.text) return single(opt);
  const page = opt._[0]; if (!page || !fs.existsSync(page)) throw new Error('usage: vk tts page.html [--voice …] [--backend edge|piper] | vk tts --text "…" -o a.mp3');
  const abs = path.resolve(page);
  const { server, port } = await startServer(); const browser = await launch();
  const p = await browser.newPage(); await p.goto(pageUrl(port, abs, { render: '1' }));
  await p.waitForFunction(() => window.__size && window.__ready, null, { timeout: 30000 });
  const info = await p.evaluate(() => ({ reqs: window.__voRequests || [], cfg: window.__voiceCfg }));
  await browser.close(); server.close();
  if (!info.cfg) throw new Error('page has no vk.video({voice: …}) config');
  if (!info.reqs.length) { console.log('[vk tts] no scene has vo: text'); return; }
  const cfg = info.cfg, backend = opt.backend || cfg.backend || DEF.backend;
  const voice = opt.voice || cfg.voice || DEF.voice[backend], rate = opt.rate || cfg.rate || DEF.rate, pitch = opt.pitch || cfg.pitch || DEF.pitch;
  const manifest = decodeURIComponent(new URL(cfg.manifestUrl).pathname), dir = path.dirname(manifest);
  const sub = path.basename(manifest).replace(/\.json$/i, ''), outdir = path.join(dir, sub);
  const idOf = text => crypto.createHash('sha1').update([backend, voice, rate, pitch, text].join('|')).digest('hex').slice(0, 12);
  const uniq = [...new Map(info.reqs.map(r => [r.text, r])).values()];
  const items = uniq.map(r => ({ id: idOf(r.text), text: r.text }));
  const reqFile = path.join(tmpdir('vktts-'), 'req.json');
  fs.writeFileSync(reqFile, JSON.stringify({ backend, voice, rate, pitch, outdir, force: !!opt.force, items }));
  console.log(`[vk tts] ${items.length} line(s) · ${backend} · ${voice} · rate ${rate} → ${path.relative(process.cwd(), outdir)}/`);
  const res = JSON.parse((await vkaudio(['tts', reqFile])).trim().split('\n').pop());
  const M = { vidkit: 'voice', version: 1, backend, voice, rate, pitch, generated: new Date().toISOString(), items: {} };
  res.items.forEach(it => { M.items[it.text] = { id: it.id, file: `${sub}/${it.file}`, duration: it.duration, voice: it.voice, words: it.words, timing: it.timing }; });
  fs.writeFileSync(manifest, JSON.stringify(M, null, 1));
  // drop clips no longer referenced
  const keep = new Set(items.flatMap(i => [i.id + '.mp3', i.id + '.wav', i.id + '.json']));
  for (const f of fs.readdirSync(outdir)) if (!keep.has(f)) fs.rmSync(path.join(outdir, f));
  const total = res.items.reduce((s, i) => s + i.duration, 0);
  console.log(`[vk tts] ${res.items.length} clip(s), ${total.toFixed(1)}s of speech → ${path.relative(process.cwd(), manifest)}`);
}
async function single(opt) {
  const backend = opt.backend || DEF.backend, voice = opt.voice || DEF.voice[backend];
  const out = path.resolve(opt.out || 'tts.mp3'), outdir = path.dirname(out), id = path.basename(out).replace(/\.[^.]+$/, '');
  const reqFile = path.join(tmpdir('vktts-'), 'req.json');
  fs.writeFileSync(reqFile, JSON.stringify({ backend, voice, rate: opt.rate || DEF.rate, pitch: opt.pitch || DEF.pitch, outdir, force: true, items: [{ id, text: opt.text }] }));
  const res = JSON.parse((await vkaudio(['tts', reqFile])).trim().split('\n').pop());
  console.log(`[vk tts] ${res.items[0].file} ${res.items[0].duration}s, ${res.items[0].words.length} timed units → ${outdir}`);
}
