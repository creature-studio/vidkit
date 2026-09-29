#!/usr/bin/env node
// Builds the demo song for examples/mv.html — fully reproducible, every input legally redistributable:
//   1. music: 43.5 s excerpt of "Voxel Revolution" by Kevin MacLeod (incompetech.com), CC BY 4.0 (see LICENSE-music.md)
//   2. vocals: each lyrics.txt line synthesised with TTS (edge-tts, zh-CN-XiaoxiaoNeural), first word placed exactly on
//      a downbeat found by `vk analyze` → song.truth.json keeps the ground-truth word times (from TTS word boundaries)
//   3. mix → song.m4a, then the *real* pipeline runs on the finished song as if it were any imported track:
//      vk analyze song.m4a  →  song.beats.json
//      vk align song.m4a --lyrics lyrics.txt --separate (demucs vocals + forced alignment)  →  song.align.json
//   4. prints alignment error vs ground truth.
// usage: node examples/mv/make-song.mjs [--skip-align]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const VK = (...a) => execFileSync(process.execPath, [path.join(ROOT, 'bin/vk.mjs'), ...a], { stdio: 'inherit', cwd: ROOT });
const PY = fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3';
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();
const SRC_URL = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Voxel%20Revolution.mp3';
const cache = path.join(os.homedir(), '.cache/vidkit'); fs.mkdirSync(cache, { recursive: true });
const full = path.join(cache, 'Voxel_Revolution.mp3');
const inst = path.join(ROOT, 'examples/assets/music/voxel-revolution-43s.mp3');
const EXCERPT = 43.5, VOICE = 'zh-CN-XiaoxiaoNeural', RATE = '+8%';

// 1. instrumental excerpt (committed; re-created only if missing)
if (!fs.existsSync(inst)) {
  if (!fs.existsSync(full)) sh('curl', ['-sL', '-A', 'Mozilla/5.0', '-o', full, SRC_URL]);
  sh('ffmpeg', ['-y', '-v', 'error', '-i', full, '-t', String(EXCERPT), '-af', `afade=t=out:st=${EXCERPT - 2.2}:d=2.2`, '-c:a', 'libmp3lame', '-b:a', '160k', inst]);
}
VK('analyze', inst, '-o', path.join(cache, 'mv-inst.beats.json'));
const IB = JSON.parse(fs.readFileSync(path.join(cache, 'mv-inst.beats.json')));

// 2. vocals: one TTS clip per line, first word on downbeat 3, 5, 7, …
const lines = fs.readFileSync(path.join(HERE, 'lyrics.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const vdir = path.join(cache, 'mv-vocals'); fs.mkdirSync(vdir, { recursive: true });
const req = path.join(vdir, 'req.json');
fs.writeFileSync(req, JSON.stringify({ backend: 'edge', voice: VOICE, rate: RATE, outdir: vdir, items: lines.map((text, i) => ({ id: 'line' + i, text })) }));
const tts = JSON.parse(sh(PY, [path.join(ROOT, 'tools/vkaudio.py'), 'tts', req]).trim().split('\n').pop()).items;
const truth = { vidkit: 'align', version: 1, audio: 'song.m4a', mode: 'ground-truth (TTS word boundaries + placement)', lines: [] };
const inputs = [], filters = [];
tts.forEach((it, i) => {
  const down = IB.downbeats[3 + 2 * i], first = it.words[0].t, at = down - first;
  truth.lines.push({ start: +(at + first).toFixed(3), end: +(at + it.words[it.words.length - 1].end).toFixed(3), text: it.text, words: it.words.map(w => ({ w: w.w, t: +(w.t + at).toFixed(3), end: +(w.end + at).toFixed(3) })) });
  inputs.push('-i', path.join(vdir, it.file));
  const ms = Math.round(at * 1000);
  filters.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.6,adelay=${ms}|${ms}[v${i}]`);
});
fs.writeFileSync(path.join(HERE, 'song.truth.json'), JSON.stringify(truth, null, 1));
const vox = tts.map((_, i) => `[v${i}]`).join('');
const fc = `${filters.join(';')};${vox}amix=inputs=${tts.length}:normalize=0,aecho=0.8:0.5:120:0.18,highpass=f=120[vox];[0:a]aresample=48000,volume=0.8[m];[m][vox]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[out]`;
sh('ffmpeg', ['-y', '-v', 'error', '-i', inst, ...inputs, '-filter_complex', fc, '-map', '[out]', '-c:a', 'aac', '-b:a', '160k', path.join(HERE, 'song.m4a')]);
console.log('[mv] song.m4a written (%d vocal lines)', tts.length);

// 3. the real pipeline on the finished song
VK('analyze', path.join(HERE, 'song.m4a'), '-o', path.join(HERE, 'song.beats.json'));
if (!process.argv.includes('--skip-align')) {
  VK('align', path.join(HERE, 'song.m4a'), '--lyrics', path.join(HERE, 'lyrics.txt'), '--separate', '--lang', 'zh', '-o', path.join(HERE, 'song.align.json'));
  // 4. alignment error vs ground truth
  const A = JSON.parse(fs.readFileSync(path.join(HERE, 'song.align.json'))), d = [];
  truth.lines.forEach((L, i) => { const a = A.lines.find(x => x.text === L.text); if (!a) return; L.words.forEach((w, j) => { if (a.words[j]) d.push(a.words[j].t - w.t); }); });
  const abs = d.map(Math.abs).sort((x, y) => x - y), med = abs[Math.floor(abs.length / 2)], p90 = abs[Math.floor(abs.length * .9)];
  const rep = { units: d.length, medianAbsMs: Math.round(med * 1000), p90AbsMs: Math.round(p90 * 1000), meanSignedMs: Math.round(d.reduce((s, x) => s + x, 0) / d.length * 1000), within1Frame30: +(abs.filter(x => x <= 1 / 30).length / abs.length).toFixed(3), within100ms: +(abs.filter(x => x <= .1).length / abs.length).toFixed(3) };
  fs.writeFileSync(path.join(HERE, 'align-vs-truth.json'), JSON.stringify(rep, null, 1));
  console.log('[mv] alignment vs ground truth:', rep);
}
