// Audio mix for vk render: music (offset into the file, gain, ducked under voice) + voice-over clips + offline SFX score,
// → loudness-normalised (two-pass ffmpeg loudnorm, default −14 LUFS integrated, −1.5 dBTP) 48 kHz stereo WAV.
import { run, path, fs } from './lib.mjs';

// voice intervals → ffmpeg volume expression: 1 outside speech, `floor` inside, ramps of att/rel seconds
export function duckExpr(spans, floor, att = .25, rel = .45) {
  if (!spans.length) return '1';
  const merged = []; spans.slice().sort((a, b) => a[0] - b[0]).forEach(([a, b]) => { const m = merged[merged.length - 1]; if (m && a - rel - att <= m[1]) m[1] = Math.max(m[1], b); else merged.push([a, b]); });
  const w = merged.map(([a, b]) => `clip(min((t-${(a - att).toFixed(3)})/${att},(${(b + rel).toFixed(3)}-t)/${rel}),0,1)`);
  const mx = w.reduce((acc, x) => acc ? `max(${acc},${x})` : x, '');
  return `1-${(1 - floor).toFixed(4)}*${mx}`;
}

export async function mixAudio({ tmp, t0 = 0, dur, music, voices = [], score, lufs = -14, tp = -1.5, duckDb = -10, fadeOut = 1.2, log = console.log }) {
  const inputs = [], chains = [], labels = [];
  const fmt = 'aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo';
  if (music) {
    inputs.push('-ss', String(Math.max(0, music.start + t0)), '-t', String(dur + 1), '-i', music.file);
    const spans = voices.map(v => [v.t - t0, v.t - t0 + v.dur]).filter(s => s[1] > 0 && s[0] < dur);
    const duck = spans.length && duckDb ? `,volume='${duckExpr(spans, Math.pow(10, duckDb / 20))}':eval=frame` : '';
    const fo = fadeOut && music.fade !== false ? `,afade=t=out:st=${Math.max(0, dur - fadeOut).toFixed(3)}:d=${fadeOut}` : '';
    chains.push(`[${inputs.filter(x => x === '-i').length - 1}:a]${fmt},volume=${music.gain != null ? music.gain : 1}${duck}${fo}[mus]`); labels.push('[mus]');
  }
  const vl = [];
  voices.forEach(v => {
    const rel = v.t - t0; if (rel + v.dur <= 0 || rel >= dur) return;
    inputs.push('-i', v.file); const i = inputs.filter(x => x === '-i').length - 1, ms = Math.round(Math.max(0, rel) * 1000);
    chains.push(`[${i}:a]${fmt},volume=${v.gain != null ? v.gain : 1}${rel < 0 ? `,atrim=start=${(-rel).toFixed(3)},asetpts=PTS-STARTPTS` : ''},adelay=${ms}|${ms}[v${vl.length}]`); vl.push(`[v${vl.length}]`);
  });
  if (vl.length) { chains.push(vl.length > 1 ? `${vl.join('')}amix=inputs=${vl.length}:normalize=0:duration=longest[vo]` : `${vl[0]}anull[vo]`); labels.push('[vo]'); }
  if (score) { inputs.push('-i', score); chains.push(`[${inputs.filter(x => x === '-i').length - 1}:a]${fmt}[sfx]`); labels.push('[sfx]'); }
  if (!labels.length) return null;
  const pre = `${chains.join(';')};${labels.join('')}${labels.length > 1 ? `amix=inputs=${labels.length}:normalize=0:duration=longest,` : ''}apad=whole_dur=${dur.toFixed(3)},atrim=end=${dur.toFixed(3)}`;
  const out = path.join(tmp, 'mix.wav');
  if (lufs == null) {
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', pre + '[out]', '-map', '[out]', '-c:a', 'pcm_s16le', '-ar', '48000', out]);
    return { file: out };
  }
  // pass 1: measure
  const ln = `loudnorm=I=${lufs}:TP=${tp}:LRA=11`;
  const p1 = await run('ffmpeg', ['-hide_banner', '-nostats', ...inputs, '-filter_complex', `${pre},${ln}:print_format=json[out]`, '-map', '[out]', '-f', 'null', '-']);
  const m = JSON.parse(p1.stderr.slice(p1.stderr.lastIndexOf('{'), p1.stderr.lastIndexOf('}') + 1));
  // pass 2: apply (linear gain when possible → no pumping)
  const ln2 = `${ln}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${pre},${ln2},aresample=48000[out]`, '-map', '[out]', '-c:a', 'pcm_s16le', '-ar', '48000', out]);
  const st = await loudness(out);
  log(`  audio mix: ${[music && 'music', vl.length && `${vl.length} voice clip(s)`, score && 'sfx score'].filter(Boolean).join(' + ')}${vl.length && music ? ` · music ducked ${duckDb} dB under voice` : ''} · loudnorm ${lufs} LUFS → measured ${st.I} LUFS, true peak ${st.TP} dBTP (input was ${(+m.input_i).toFixed(1)} LUFS)`);
  return { file: out, input: m, output: st };
}
export async function loudness(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-']);
  const s = stderr.slice(stderr.lastIndexOf('Summary:'));
  const g = re => { const x = re.exec(s); return x ? +x[1] : null; };
  return { I: g(/I:\s+(-?[\d.]+) LUFS/), LRA: g(/LRA:\s+(-?[\d.]+) LU/), TP: g(/Peak:\s+(-?[\d.]+) dBFS/) };
}
