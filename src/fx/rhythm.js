// Rhythm-reactive modulation: beat pulses, bar pulses, onset hits and loudness-driven parameters.
// Used by the node options `beat:{…}` / `energy:{…}`, scene options of the same names (whole frame) and
// scene.onBeat(target, o) / scene.energize(target, o). Writes the CSS individual-transform properties `scale` /
// `rotate` (so it composes with timeline tweens, which own `transform`) plus a brightness filter and CSS vars.

// value of a beat spec at absolute time t: unit 'beat' | 'bar' | 'onset'
export function beatValue(v, spec, t) {
  const unit = spec.unit || 'beat', k = spec.k, every = spec.every || 1;
  if (unit === 'bar') return v.beats.barPulse(t, k || 4, every);
  if (unit === 'onset') return v.music ? v.music.onsetHit(t, k || 10, spec.min != null ? spec.min : .3) : 0;
  if (spec.beats) { // only on some beat positions of the bar, e.g. [2, 4] = backbeat
    const pos = v.beats.beatInBar(t); if (!spec.beats.includes(pos)) return 0;
  }
  return v.beats.pulse(t, k || 6, every);
}
export function energyValue(v, spec, t) { return v.music ? v.music.energy(t, spec.band || 'loud', spec.smooth != null ? spec.smooth : .08) : 0; }
const lerp = (r, x) => Array.isArray(r) ? r[0] + (r[1] - r[0]) * x : 1 + (r - 1) * x;

// → per-frame function (t) applying the modulation to el
export function modulator(v, el, beat, energy) {
  const B = beat === true ? { scale: .06 } : beat, E = energy === true ? { scale: [1, 1.08] } : energy;
  const S = v.tl.state(el);
  return t => {
    let sc = 1, rot = 0, br = 1, bv = 0, ev = 0;
    if (B) { bv = beatValue(v, B, t); if (B.scale) sc *= 1 + B.scale * bv; if (B.rotate) rot += B.rotate * bv; if (B.brightness) br *= 1 + B.brightness * bv; }
    if (E) { ev = energyValue(v, E, t); if (E.scale) sc *= lerp(E.scale, ev); if (E.rotate) rot += lerp(E.rotate, ev) - (Array.isArray(E.rotate) ? 0 : 1); if (E.brightness) br *= lerp(E.brightness, ev); }
    el.style.scale = Math.abs(sc - 1) > 1e-4 ? sc.toFixed(4) : '';
    el.style.rotate = Math.abs(rot) > 1e-3 ? rot.toFixed(3) + 'deg' : '';
    if ((B && B.brightness) || (E && E.brightness)) {
      const own = S.props.blur || S.props.brightness;           // timeline also writes filter this frame → append
      const base = own ? String(el.style.filter || '').replace(/\s*brightness\([^)]*\)\s*$/, '') : '';
      el.style.filter = (base ? base + ' ' : '') + (Math.abs(br - 1) > 1e-3 ? `brightness(${br.toFixed(3)})` : '');
    }
    el.style.setProperty('--beat', bv.toFixed(3)); el.style.setProperty('--e', ev.toFixed(3));
  };
}
