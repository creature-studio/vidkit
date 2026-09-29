// Procedural music bed for 小蝌蚪找妈妈 — guqin-like plucks (Karplus–Strong with 滑音/吟猱), a bamboo flute, a soft
// drone, and a 花指 glissando at each scene change. Fully deterministic, original, CC0.
//   node examples/tadpole/make-music.mjs            → examples/tadpole/tadpole.music.m4a (+ .wav)
// Scene boundaries are read from the page (window.__scenes) so the music follows the speech-driven timing.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, pageUrl, LAUNCH } from '../../cli/lib.mjs';
import { pluck, flute, gong, mixStereo, reverb, normPeak, wavBytes, penta, biquad } from '../../src/audio/synth.js';
import { mulberry32 } from '../../src/core/random.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PAGE = path.join(HERE, 'tadpole.html');
const { server, port } = await startServer();
const br = await chromium.launch(LAUNCH); const pg = await br.newPage();
await pg.goto(pageUrl(port, PAGE, { render: '1' })); await pg.waitForFunction(() => window.__ready);
const { scenes, duration } = await pg.evaluate(() => ({ scenes: window.__scenes, duration: window.__duration }));
await br.close(); server.close();

const SR = 48000, LEN = duration + 1.5, N = Math.ceil(LEN * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const ROOT = 146.83;                                   // D3 = 宫 (D gong pentatonic)
const rnd = mulberry32(1960);
const BEAT = 60 / 72;                                  // 72 bpm, unhurried
// per-scene mood: density (notes per beat), register offset (degrees), flute?, brightness, gain
const MOOD = {
  片头: { dens: .6, reg: 3, flute: true, bright: .35, gain: .8, low: true },
  春水: { dens: 1.1, reg: 5, flute: false, bright: .5, gain: .75 },
  鸭妈妈: { dens: 1.4, reg: 6, flute: false, bright: .55, gain: .7, play: true },
  大金鱼: { dens: 1.1, reg: 5, flute: false, bright: .45, gain: .7, play: true },
  大白鹅: { dens: 1.3, reg: 6, flute: false, bright: .55, gain: .7, play: true },
  老乌龟: { dens: .8, reg: 2, flute: false, bright: .35, gain: .75, low: true },
  找到妈妈: { dens: .9, reg: 5, flute: true, bright: .45, gain: .8 },
  小青蛙: { dens: 1.6, reg: 6, flute: true, bright: .55, gain: .75, play: true },
  终: { dens: .5, reg: 4, flute: true, bright: .35, gain: .85, low: true },
};
const sceneAt = t => { let s = scenes[0]; for (const x of scenes) if (x.start <= t + .01) s = x; return s; };
const moodAt = t => MOOD[sceneAt(t).name] || MOOD.春水;
const note = (t, f, dur, gain, pan, o = {}) => { if (t >= LEN) return; mixStereo(L, R, pluck(SR, f, dur, { decay: dur * .8, body: true, seed: (rnd() * 1e6) | 0, ...o }), t * SR, gain, pan); };
const blow = (t, f, dur, gain, pan, o = {}) => { if (t >= LEN) return; mixStereo(L, R, flute(SR, f, dur, { seed: (rnd() * 1e6) | 0, ...o }), t * SR, gain, pan); };

// 1) guqin melody: phrase-wise random walk on the pentatonic scale, phrases end on 宫 or 徵
let deg = 0, t = .9;
const rhythms = [[1, 1, 2], [.5, .5, 1, 2], [1, .5, .5, 2], [1.5, .5, 2], [2, 1, 1], [.5, .5, .5, .5, 2]];
while (t < duration - 1.5) {
  const m = moodAt(t), rh = rhythms[Math.floor(rnd() * rhythms.length)];
  const scale = m.dens >= 1.3 ? .75 : m.dens < .7 ? 1.5 : 1;       // playful scenes move faster, calm ones slower
  for (let k = 0; k < rh.length; k++) {
    const last = k === rh.length - 1, d = rh[k] * BEAT * scale;
    deg += last ? 0 : [-2, -1, -1, 1, 1, 2, 0][Math.floor(rnd() * 7)];
    deg = Math.max(-2, Math.min(6, deg));
    if (last) deg = rnd() < .6 ? 0 : 3;
    const f = penta(ROOT, deg + m.reg - 3);
    const o = { bright: m.bright, pos: .12 + rnd() * .1 };
    if (last && rnd() < .55) o.vib = { rate: 4.5, depth: .18, delay: .25 };            // 吟 (vibrato on long notes)
    if (!last && rnd() < .15) o.slide = { to: rnd() < .5 ? 2 : -2, at: d * .5, d: .18 }; // 上/下滑音
    note(t, f, Math.max(1.6, d * 2.2), .5 * m.gain * (last ? 1 : .8), -.25 + rnd() * .2, o);
    if (m.play && !last && rnd() < .25) note(t + d / 2, penta(ROOT, deg + m.reg - 1), .9, .22 * m.gain, .35); // grace
    t += d;
  }
  t += BEAT * (m.dens < .8 ? 1.5 : .5) * scale;                    // breath between phrases
}

// 2) low open-string bass (散音) on every other bar, 宫/徵 with a slow slide, drone pad under all
for (let b = 0; b * BEAT * 4 < duration; b += 2) {
  const tb = .6 + b * BEAT * 4, m = moodAt(tb), f = (b / 2) % 3 === 2 ? ROOT * .75 : ROOT / 2;
  note(tb, f, 5, .42 * m.gain, .15, { bright: .25, decay: 4, pos: .3, vib: m.low ? { rate: 3, depth: .12, delay: 1 } : undefined });
}
{ const lp = biquad('lowpass', 420, .7, SR); let p1 = 0, p2 = 0;
  for (let i = 0; i < N; i++) { const tt = i / SR, sw = .5 + .5 * Math.sin(tt * .21), fade = Math.min(1, tt / 4, (LEN - tt) / 3);
    p1 += 2 * Math.PI * (ROOT / 2) / SR; p2 += 2 * Math.PI * (ROOT * .75) / SR;
    const s = lp((Math.sin(p1) + .55 * Math.sin(p2) + .2 * Math.sin(p1 * 2.003)) * .05 * (.6 + .4 * sw) * fade); L[i] += s; R[i] += s; } }

// 3) scene changes: 花指 glissando (quick upward sweep) on each transition
for (const s of scenes.slice(1)) {
  for (let k = 0; k < 7; k++) note(s.start - .15 + k * .055, penta(ROOT, k + 2), 1.8, .16 + k * .012, -.5 + k * .15, { bright: .5, decay: 1.4 });
}

// 4) flute lines in the flute scenes: long notes, slow contour
for (const s of scenes) {
  const m = MOOD[s.name]; if (!m || !m.flute) continue;
  const tunes = { 片头: [[3, 2.4], [4, 1.2], [5, 3.2]], 找到妈妈: [[5, 1.6], [7, 1.6], [8, 2.4], [7, 1.2], [5, 3.6], [4, 1.6], [3, 1.6], [5, 4]],
    小青蛙: [[7, .8], [8, .8], [7, .8], [5, 1.6], [7, .8], [8, .8], [10, 2.4]], 终: [[8, 2], [7, 1.2], [5, 1.6], [4, 1.2], [5, 4.5]] }[s.name] || [];
  let ft = s.start + (s.name === '片头' ? 1.2 : s.name === '终' ? 1 : 2.5);
  for (const [dg, d] of tunes) { if (ft + d > s.start + s.dur + 1) break; blow(ft, penta(ROOT * 2, dg - 5), d * 1.05, .2 * m.gain, .3, { vib: { rate: 5, depth: .2 }, breath: .3 }); ft += d; }
}
// final low gong + resolving pluck
const last = scenes[scenes.length - 1];
mixStereo(L, R, gong(SR, { f: 73.4, dur: 5 }), (last.start + last.dur - 4.2) * SR, .25, 0);
note(last.start + last.dur - 4.2, ROOT / 2, 4, .5, 0, { bright: .3, vib: { rate: 3, depth: .1, delay: 1 } });

const [wl, wr] = reverb([L, R], SR, { room: .86, damp: .4, wet: .34 });

{ let m = 1e-9; for (let i = 0; i < N; i++) m = Math.max(m, Math.abs(wl[i]), Math.abs(wr[i])); const k = .85 / m; for (let i = 0; i < N; i++) { wl[i] *= k; wr[i] *= k; } }
{ const fo = 2.5 * SR; for (let i = 0; i < fo; i++) { const k = i / fo; wl[N - 1 - i] *= k; wr[N - 1 - i] *= k; } }
const wav = path.join(HERE, 'tadpole.music.wav'), m4a = path.join(HERE, 'tadpole.music.m4a');
fs.writeFileSync(wav, wavBytes([wl, wr], SR));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '192k', m4a]);
fs.unlinkSync(wav);
console.log(`music: ${LEN.toFixed(1)}s, ${scenes.length} scenes → ${path.relative(process.cwd(), m4a)}`);
