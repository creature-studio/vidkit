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
  // lines may override voice / rate / pitch (multi-voice dialogue): synthesise per (voice, rate, pitch) group
  const idOf = (r, v, ra, pi) => crypto.createHash('sha1').update([backend, v, ra, pi, r.text].join('|')).digest('hex').slice(0, 12);
  const uniq = [...new Map(info.reqs.map(r => [r.key || r.text, r])).values()];
  const groups = new Map();
  uniq.forEach(r => { const v = r.voice || voice, ra = r.rate || rate, pi = r.pitch || pitch, g = `${v}|${ra}|${pi}`; if (!groups.has(g)) groups.set(g, { v, ra, pi, items: [] }); groups.get(g).items.push({ id: idOf(r, v, ra, pi), text: r.text, key: r.key || r.text }); });
  const M = { vidkit: 'voice', version: 1, backend, voice, rate, pitch, generated: new Date().toISOString(), items: {} };
  const keep = new Set(), res = { items: [] };
  for (const g of groups.values()) {
    const reqFile = path.join(tmpdir('vktts-'), 'req.json');
    fs.writeFileSync(reqFile, JSON.stringify({ backend, voice: g.v, rate: g.ra, pitch: g.pi, outdir, force: !!opt.force, items: g.items.map(({ id, text }) => ({ id, text })) }));
    console.log(`[vk tts] ${g.items.length} line(s) · ${backend} · ${g.v} · rate ${g.ra} · pitch ${g.pi} → ${path.relative(process.cwd(), outdir)}/`);
    const r = JSON.parse((await vkaudio(['tts', reqFile])).trim().split('\n').pop());
    r.items.forEach((it, i) => { const key = g.items[i].key; res.items.push(it); M.items[key] = { id: it.id, file: `${sub}/${it.file}`, duration: it.duration, voice: it.voice, rate: g.ra, pitch: g.pi, words: it.words, timing: it.timing, ...(it.env ? { env: it.env } : {}) }; });
    g.items.forEach(i => ['.mp3', '.wav', '.json'].forEach(e => keep.add(i.id + e)));
  }
  fs.writeFileSync(manifest, JSON.stringify(M, null, 1));
  // drop clips no longer referenced
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
