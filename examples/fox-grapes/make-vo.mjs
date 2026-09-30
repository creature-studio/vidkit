// Build foxgrapes.vo.json from the clips in foxgrapes.vo/ — the manifest `vk.video({voice: …})` loads.
//
// Normally you would just run `vk tts examples/luzhishen/foxgrapes.html`, which synthesises every scene `vo:` line
// with edge-tts and writes the manifest for you (word timings included). This script exists for the offline case:
// the clips were recorded elsewhere and dropped into foxgrapes.vo/<id>.mp3, where <id> is exactly the id vk tts
// would use — sha1('edge|voice|rate|pitch|text')[0..12] — so `vk tts` keeps using these files instead of
// re-synthesising them. Durations are read straight out of the MPEG frame headers (no ffprobe needed) and word
// timings are estimated per character (CJK = 1 unit, punctuation = a pause), which is what the karaoke captions use.
//
//   node examples/fox-grapes/make-vo.mjs            # rebuild the manifest
//   node examples/fox-grapes/make-vo.mjs --check    # list clips + durations, write nothing
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'foxgrapes.vo');
const MANIFEST = path.join(HERE, 'foxgrapes.vo.json');
const NARRATOR = { voice: 'zh-CN-XiaoxiaoNeural', rate: '-2%', pitch: '+0Hz' };
const FOX = { voice: 'zh-CN-YunxiNeural', rate: '+4%', pitch: '+4Hz' };

// every VO line of foxgrapes.html, in order (who: 'n' = storyteller, 'lu' = 鲁智深)
export const LINES = [
  ['n', '伊索寓言里，有一只狐狸，和一串怎么也够不到的葡萄。'],
  ['n', '夏天的午后，一只狐狸走在路上，又热又渴。忽然他抬起头——葡萄架上，挂着一串串紫得发亮的葡萄。'],
  ['fox', '这串葡萄，看着就甜。'],
  ['n', '他后腿一蹬，跳了起来——差了一大截。'],
  ['fox', '再来一次！'],
  ['n', '他退后几步，助跑，起跳。爪子擦过叶子，还是够不着。'],
  ['n', '一次，两次，三次……葡萄还挂在那儿，一动也不动。'],
  ['n', '狐狸趴在地上，喘着粗气。最后，他站起来，抖了抖身上的土。'],
  ['fox', '哼，这葡萄根本没熟，酸得很，我才不吃呢。'],
  ['n', '说完，他昂着头走了。人们常常把得不到的东西，说成是不好的。'],
];

const cfgOf = who => (who === 'fox' ? FOX : NARRATOR);
export const idOf = (who, text) => { const c = cfgOf(who); return crypto.createHash('sha1').update(['edge', c.voice, c.rate, c.pitch, text].join('|')).digest('hex').slice(0, 12); };
// manifest key: plain text for default-voice lines, `voice|rate|pitch|text` for cast lines (see src/audio/words.js)
const keyOf = (who, text) => { const c = cfgOf(who); return who === 'fox' ? `${c.voice}|${c.rate}|${c.pitch}|${text}` : text; };

/* ---------------- MP3 duration straight from the frame headers ---------------- */
const BITRATE = { // [MPEG1 L3, MPEG2/2.5 L3] kbps by index
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};
const SRATE = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
export function mp3Duration(file) {
  const b = fs.readFileSync(file);
  let i = 0;
  if (b.slice(0, 3).toString('latin1') === 'ID3') i = 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
  let dur = 0, frames = 0;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const verBits = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3;
    const brIdx = (b[i + 2] >> 4) & 15, srIdx = (b[i + 2] >> 2) & 3, pad = (b[i + 2] >> 1) & 1;
    const sr = (SRATE[verBits] || [])[srIdx], br = (BITRATE[verBits === 3 ? 1 : 2] || [])[brIdx];
    if (!sr || !br || layer !== 1) { i++; continue; }                         // layer bits 01 = Layer III
    const spf = verBits === 3 ? 1152 : 576;
    const len = Math.floor((spf / 8) * br * 1000 / sr) + pad;
    if (len < 8) { i++; continue; }
    dur += spf / sr; frames++; i += len;
  }
  if (!frames) throw new Error('no MPEG frames in ' + file);
  return +dur.toFixed(3);
}

/* ---------------- estimated per-character word timings ----------------
 * TTS word boundaries are not available offline, so spread the clip over the line: every CJK character is one
 * reading unit, latin runs count as half, punctuation buys a pause. Good enough for caption chunking and the
 * karaoke sweep (drift stays well under a caption). */
const HARD = '。！？!?…—', SOFT = '，、：；,;:';
export function estimateWords(text, dur, o = {}) {
  const lead = o.lead != null ? o.lead : Math.min(.22, dur * .06), tail = o.tail != null ? o.tail : Math.min(.28, dur * .08);
  const chars = [...text];
  const units = chars.map(ch => {
    if (/\s/.test(ch)) return { w: null, u: .2 };
    if (HARD.includes(ch)) return { w: null, u: .95 };
    if (SOFT.includes(ch)) return { w: null, u: .62 };
    if (/[《》“”"'()（）]/.test(ch)) return { w: null, u: .1 };
    if (/[A-Za-z0-9]/.test(ch)) return { w: ch, u: .55 };
    return { w: ch, u: 1 };
  });
  const total = units.reduce((s, x) => s + x.u, 0) || 1;
  const span = Math.max(.2, dur - lead - tail);
  const out = []; let t = lead;
  for (const x of units) {
    const d = span * x.u / total;
    if (x.w) out.push({ w: x.w, t: +t.toFixed(3), end: +(t + d).toFixed(3) });
    t += d;
  }
  return out;
}

function build({ check } = {}) {
  const items = {}, report = [];
  for (const [who, text] of LINES) {
    const id = idOf(who, text), file = path.join(DIR, id + '.mp3'), c = cfgOf(who);
    if (!fs.existsSync(file)) { report.push(['·', id, '(missing)', text]); continue; }
    const duration = mp3Duration(file);
    report.push(['✓', id, duration.toFixed(2) + 's', text]);
    items[keyOf(who, text)] = { id, file: `foxgrapes.vo/${id}.mp3`, duration, voice: c.voice, rate: c.rate, pitch: c.pitch,
      words: estimateWords(text, duration), timing: 'estimated' };
  }
  const M = { vidkit: 'voice', version: 1, backend: 'edge', ...NARRATOR, generated: new Date().toISOString(), items };
  if (!check) fs.writeFileSync(MANIFEST, JSON.stringify(M, null, 1));
  const total = Object.values(items).reduce((s, x) => s + x.duration, 0);
  report.forEach(r => console.log(`${r[0]} ${r[1]}  ${String(r[2]).padStart(7)}  ${r[3].slice(0, 30)}`));
  console.log(`${Object.keys(items).length}/${LINES.length} clip(s), ${total.toFixed(1)}s of speech${check ? '' : ' → ' + path.relative(process.cwd(), MANIFEST)}`);
  return M;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) build({ check: process.argv.includes('--check') });
export default build;
