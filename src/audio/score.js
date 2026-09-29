// Offline sound design (ported from engine.js): events [[t, voice, gain?, freq?], …] rendered with an
// OfflineAudioContext at export time (deterministic, faster than realtime). Voices live in registry.sounds,
// so plugins can add instruments. Phase 2 adds imported music, beat detection, VO/TTS (see README roadmap).
import { registry } from '../core/plugin.js';
import { mulberry32 } from '../core/random.js';

const V = registry.sounds;
V.kick = (k, t, v) => k.tone(t, 'sine', 150, 42, .4, .9 * v);
V.bass = (k, t, v, f) => k.tone(t, 'triangle', f || 55, 0, .5, .5 * v);
V.tick = (k, t, v) => k.noise(t, .03, 'bandpass', 3200, 2, .35 * v);
V.hat = (k, t, v) => k.noise(t, .05, 'highpass', 7000, 1, .18 * v);
V.pop = (k, t, v) => k.tone(t, 'sine', 700, 260, .12, .35 * v);
V.chime = (k, t, v, f) => { f = f || 880; k.tone(t, 'sine', f, 0, 1.4, .18 * v); k.tone(t, 'sine', f * 1.5, 0, 1.0, .08 * v); };
V.whoosh = (k, t, v) => { const st = Math.max(0, t - .35); const fl = k.noise(st, .5, 'bandpass', 500, .8, .25 * v, .3); fl.frequency.setValueAtTime(400, st); fl.frequency.exponentialRampToValueAtTime(3500, st + .45); };
V.riser = (k, t, v) => { const st = Math.max(0, t - 1.2); const fl = k.noise(st, 1.2, 'bandpass', 300, 1.2, .2 * v, 1.0); fl.frequency.setValueAtTime(300, st); fl.frequency.exponentialRampToValueAtTime(6000, st + 1.2); };
V.snap = (k, t, v) => { k.noise(t, .06, 'bandpass', 1800, 3, .5 * v); k.tone(t, 'square', 1200, 600, .03, .08 * v); };

export function makeScore(events, opts = {}, video) {
  return function (ac) {
    const dur = ac.length / ac.sampleRate, out = ac.createDynamicsCompressor(); out.threshold.value = -12; out.ratio.value = 4; out.connect(ac.destination);
    const rnd = mulberry32(77), nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
    const env = (g, t, a, peak, dcy) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 1e-4), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); };
    const kit = {
      ac, out, dur,
      noise(t, len, type, freq, q, peak, a) { const s = ac.createBufferSource(); s.buffer = nb; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1; const g = ac.createGain(); env(g, t, a || .002, peak, len); s.connect(f); f.connect(g); g.connect(out); s.start(t, rnd() * .5, len + (a || 0) + .05); return f; },
      tone(t, type, f0, f1, len, peak) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + len * .5); const g = ac.createGain(); env(g, t, .003, peak, len); o.connect(g); g.connect(out); o.start(t); o.stop(t + len + .05); },
    };
    if (opts.pad) opts.pad.forEach(f => { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ac.createGain(); const pg = opts.padGain || .04; g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(pg, 1.5); g.gain.setValueAtTime(pg, Math.max(1.6, dur - 1.5)); g.gain.exponentialRampToValueAtTime(0.0001, dur); o.connect(g); g.connect(out); o.start(0); o.stop(dur); });
    if (opts.metronome && video && video.beats.active) for (let b = 0; video.beats.at(b) < dur; b++) V.hat(kit, video.beats.at(b), b % 4 ? .5 : 1);
    if (opts.beatKick && video && video.beats.active) for (let b = 0; video.beats.at(b) < dur; b++) if (b % (opts.beatKick === true ? 1 : opts.beatKick) === 0) V.kick(kit, video.beats.at(b), .7);
    events.forEach(e => { const fn = V[e[1]]; if (fn && e[0] < dur) fn(kit, Math.max(0, e[0]), e[2] == null ? 1 : e[2], e[3]); });
  };
}
