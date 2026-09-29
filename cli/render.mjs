// vk render page.html -o out.mp4 [--fps 30] [--scale 1] [--format 9:16] [--audio a.m4a] [--audio-offset 0] [--grain 6]
//   [--workers 4] [--from 0 --to 10] [--crf 18] [--preset medium] [--png | --quality 95] [--srt] [--no-score] [--score-gain-max 2] [--keep]
//   [--lufs -14|off] [--duck -10] [--no-voice]   audio: page music (vk.video({music, musicStart})) + vo: clips + SFX score, ducked + loudnorm
import { mixAudio } from './mix.mjs';
import { parseArgs, startServer, pageUrl, launch, probeInfo, workerPage, seek, shot, run, ffprobeLine, tmpdir, fs, path, os, spawn } from './lib.mjs';

export default async function render(argv) {
  const opt = parseArgs(argv);
  const input = opt._[0]; if (!input) throw new Error('usage: vk render page.html -o out.mp4 [options]');
  const abs = path.resolve(input); if (!fs.existsSync(abs)) throw new Error('not found ' + abs);
  const fps = +(opt.fps || 30), scale = +(opt.scale || 1), crf = +(opt.crf || 18), preset = opt.preset || 'medium';
  const type = opt.png ? 'png' : 'jpeg', quality = +(opt.quality || 95);
  const out = path.resolve(opt.out || abs.replace(/\.html?$/i, '') + '.mp4');
  const { server, port } = await startServer();
  const params = { render: '1', fps: String(fps) }; if (opt.format) params.format = opt.format;
  const url = pageUrl(port, abs, params);
  const probeBrowser = await launch();
  const info = await probeInfo(probeBrowser, url);
  await probeBrowser.close();
  const W = info.size.width, H = info.size.height;
  const t0 = +(opt.from || 0), t1 = Math.min(info.dur, opt.to != null ? +opt.to : info.dur);
  const total = Math.round((t1 - t0) * fps);
  const workers = Math.max(1, Math.min(+(opt.workers || Math.max(1, Math.min(4, os.cpus().length - 1))), Math.ceil(total / 30)));
  console.log(`[vk render] ${path.basename(abs)}  ${W}x${H}  ${info.dur.toFixed(2)}s  ${info.scenes.length} scenes  fps=${fps} scale=${scale} workers=${workers} frames=${total}`);
  const tmp = tmpdir('vkr-'), outW = Math.round(W * scale / 2) * 2, outH = Math.round(H * scale / 2) * 2;
  const started = Date.now(); let done = 0; const per = Math.ceil(total / workers), segs = [];
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = w * per, b = Math.min(total, a + per); if (a >= b) return;
    const seg = path.join(tmp, `seg${String(w).padStart(3, '0')}.mp4`); segs[w] = seg;
    const browser = await launch();               // one browser per worker: shared browsers barely parallelise
    const page = await workerPage(browser, url, info, scale);
    const vf = `scale=${outW}:${outH}:flags=lanczos:out_color_matrix=bt709:out_range=tv${opt.grain ? `,noise=c0s=${+opt.grain}:allf=t` : ''},format=yuv420p`;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', type === 'png' ? 'png' : 'mjpeg', '-framerate', String(fps), '-i', '-',
      '-vf', vf, '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-r', String(fps),
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg exit ' + c)) : res())));
    for (let i = a; i < b; i++) {
      await seek(page, t0 + i / fps);
      const buf = await shot(page, info, type, quality);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      done++;
      if (done % Math.max(1, fps * 2) === 0) process.stdout.write(`\r  frames ${done}/${total}  ${(done / ((Date.now() - started) / 1000)).toFixed(1)} fps   `);
    }
    ff.stdin.end(); await closed; await browser.close();
  }));
  process.stdout.write(`\r  frames ${done}/${total} in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, segs.filter(Boolean).map(s => `file '${s}'`).join('\n'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // ---------------- audio: music (+offset, ducking) + voice-over + offline SFX score → loudnorm ----------------
  const dur = (t1 - t0).toFixed(3), local = u => decodeURIComponent(new URL(u).pathname);
  const M = info.music, mixCfg = info.mix || {};
  const music = opt.audio ? { file: path.resolve(opt.audio), start: +opt.audioOffset || 0, gain: 1 } : M ? { file: local(M.src), start: M.start || 0, gain: M.gain } : null;
  const voices = opt.noVoice ? [] : (info.voice || []).map(v => ({ ...v, file: local(v.src) }));
  if (info.voMissing && info.voMissing.length) console.log(`  [warn] ${info.voMissing.length} vo: line(s) have no TTS audio yet (timing estimated) — run: vk tts ${path.basename(abs)}`);
  const wantScore = info.hasScore && !opt.noScore, mixing = !!(music || voices.length);
  let score = null;
  if (wantScore) { score = await renderScore(url, t0, t1, mixing ? 1 : +(opt.scoreGainMax || 2), !mixing, tmp); console.log('  audio: window.SCORE rendered offline (OfflineAudioContext → WAV)'); }
  let audio = null;
  if (mixing) {
    const lufs = opt.lufs === 'off' ? null : +(opt.lufs || mixCfg.lufs || -14);
    const r = await mixAudio({ tmp, t0, dur: t1 - t0, music, voices, score, lufs, duckDb: opt.duck != null ? +opt.duck : (mixCfg.duck != null ? mixCfg.duck : -10), fadeOut: mixCfg.fadeOut != null ? mixCfg.fadeOut : (t1 >= info.dur - .01 ? 1.2 : 0) });
    audio = r && r.file;
    if (r && r.output) fs.writeFileSync(out.replace(/\.mp4$/i, '') + '.audio.json', JSON.stringify({ lufsTarget: lufs, measured: r.output, input: r.input, music: music && { file: path.basename(music.file), start: music.start, gain: music.gain }, voices: voices.map(v => ({ t: v.t, file: path.basename(v.file), dur: v.dur })), score: !!score }, null, 1));
  } else if (score) audio = score;
  if (audio) {
    const joined = path.join(tmp, 'video.mp4');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', joined, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-af', 'apad', '-t', dur, '-movflags', '+faststart', out]);
  } else await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  // word-timed captions (karaoke / lyrics) → JSON for sync checks and external editors
  if (info.caps.some(c => c[3])) {
    const wf = out.replace(/\.mp4$/i, '') + '.words.json';
    fs.writeFileSync(wf, JSON.stringify({ t0, captions: info.caps.filter(c => c[1] > t0 && c[0] < t1).map(c => ({ start: +(c[0] - t0).toFixed(3), end: +(c[1] - t0).toFixed(3), text: c[2], words: (c[3] || []).map(w => ({ w: w.w, t: +(w.t - t0).toFixed(3), end: +((w.end || w.t) - t0).toFixed(3) })) })) }));
    console.log('  words', wf);
  }
  if (!opt.keep) fs.rmSync(tmp, { recursive: true, force: true });
  if (opt.srt && info.caps.length) {
    const f = out.replace(/\.mp4$/i, '') + '.srt'; fs.writeFileSync(f, toSRT(info.caps, t0, t1)); console.log('  srt', f);
  }
  console.log(`[done] ${out}\n       ${ffprobeLine(out)}`);
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', out, '-vf', 'blackdetect=d=0.5:pix_th=0.05', '-an', '-f', 'null', '-']);
  const hits = stderr.split('\n').filter(l => l.includes('black_start'));
  console.log(hits.length ? '  [qa] black stretches ≥0.5s:\n   ' + hits.map(h => h.replace(/.*(black_start)/, '$1')).join('\n   ') : '  [qa] blackdetect: no black stretches ≥0.5s');
  server.close();
  return out;
}
export function toSRT(caps, t0 = 0, t1 = Infinity) {
  const ts = s => { const ms = Math.max(0, Math.round(s * 1000)), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, se = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(se).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  return caps.filter(c => c[1] > t0 && c[0] < t1).map((c, i) => `${i + 1}\n${ts(c[0] - t0)} --> ${ts(Math.min(c[1], t1) - t0)}\n${c[2]}\n`).join('\n');
}

// window.SCORE → WAV via OfflineAudioContext inside the page (deterministic, faster than realtime)
async function renderScore(url, t0, t1, maxGain, normalize, tmp) {
  const browser = await launch(); const page = await browser.newPage(); await page.goto(url); await page.waitForFunction(() => window.__ready);
  const b64 = await page.evaluate(async ([secs, off, maxGain, normalize]) => {
    const sr = 48000, ac = new OfflineAudioContext(2, Math.ceil(sr * (secs + .05)), sr); window.SCORE(ac);
    const buf = await ac.startRendering(), ch = [buf.getChannelData(0), buf.getChannelData(1)], start = Math.floor(off * sr), n = Math.max(0, Math.floor(secs * sr) - start);
    let peak = 1e-9; for (const c of ch) for (let i = start; i < start + n; i++) peak = Math.max(peak, Math.abs(c[i]));
    const g = normalize ? Math.min(maxGain, .89 / peak) : Math.min(1, .98 / peak),   // alone: peak-normalise (capped); in a mix: unity (clip-safe)
      dv = new DataView(new ArrayBuffer(44 + n * 4)), w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) dv.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, ch[c][start + i] * g)) * 32767, true);
    let bin = ''; const u8 = new Uint8Array(dv.buffer); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return btoa(bin);
  }, [t1, t0, maxGain, normalize]);
  await browser.close();
  const f = path.join(tmp, 'score.wav'); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f;
}
