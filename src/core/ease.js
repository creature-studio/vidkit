// Easing library. All functions map p∈[0,1] → eased value (may overshoot for back/elastic/spring).
// Pure, DOM-free (unit tested in Node).

export function bezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = a => 3 * a;
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return function (x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (calc(t, x1, x2) - x) / s; }
    if (Math.abs(calc(t, x1, x2) - x) > 1e-5) { // bisection fallback
      let lo = 0, hi = 1; t = x;
      for (let j = 0; j < 30; j++) { const v = calc(t, x1, x2); if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    }
    return calc(t, y1, y2);
  };
}

// damped spring normalised so that spring(1) === 1 exactly
export function spring(k = 6, w = 12) {
  const f = p => 1 - Math.exp(-k * p) * Math.cos(w * p), e1 = 1 - f(1);
  return p => (p <= 0 ? 0 : p >= 1 ? 1 : f(p) + p * e1);
}

// n-step staircase where each step is eased (swiss-motion "steps")
export function steps(n = 4, inner) {
  const e = inner || EASE.house;
  return p => { if (p >= 1) return 1; if (p <= 0) return 0; const q = p * n, i = Math.floor(q); return (i + e(q - i)) / n; };
}

const PI = Math.PI, c1 = 1.70158, c2 = c1 * 1.525, c3 = c1 + 1;
const bounceOut = x => { const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + .75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + .9375; return n1 * (x -= 2.625 / d1) * x + .984375; };

export const EASE = {
  linear: x => x,
  inQuad: x => x * x, outQuad: x => 1 - (1 - x) * (1 - x),
  inOutQuad: x => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  inCubic: x => x * x * x, outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inQuart: x => x * x * x * x, outQuart: x => 1 - Math.pow(1 - x, 4),
  inOutQuart: x => (x < .5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  inQuint: x => x ** 5, outQuint: x => 1 - Math.pow(1 - x, 5),
  inOutQuint: x => (x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  inSine: x => 1 - Math.cos(x * PI / 2), outSine: x => Math.sin(x * PI / 2), inOutSine: x => -(Math.cos(PI * x) - 1) / 2,
  inExpo: x => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outExpo: x => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: x => (x === 0 ? 0 : x === 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  inCirc: x => 1 - Math.sqrt(1 - x * x), outCirc: x => Math.sqrt(1 - Math.pow(x - 1, 2)),
  inBack: x => c3 * x * x * x - c1 * x * x,
  outBack: x => 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
  inOutBack: x => (x < .5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2),
  outElastic: x => (x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (2 * PI / 3)) + 1),
  outBounce: bounceOut, inBounce: x => 1 - bounceOut(1 - x),
  spring: spring(),
  house: bezier(.7, 0, .2, 1),   // signature in-out curve (swiss-motion): one curve for the whole film
  swift: bezier(.2, .8, .2, 1),  // fast-out settle
  smooth: bezier(.4, 0, .2, 1),  // Material standard
  snappy: bezier(.2, .9, .1, 1), // fast-out, long settle (titles)
  step: x => (x < 1 ? 0 : 1),
};

let DEFAULT = 'outCubic';
export function setDefaultEase(name) { DEFAULT = name || 'outCubic'; }
export function defaultEase() { return DEFAULT; }

// Accepts a function, a name, "cubic-bezier(a,b,c,d)" / "bezier(...)", "spring(k,w)", "steps(n)".
export function getEase(e) {
  if (typeof e === 'function') return e;
  if (!e) return getEase(DEFAULT);
  if (EASE[e]) return EASE[e];
  let m = /^(?:cubic-)?bezier\(([^)]+)\)$/.exec(e);
  if (m) { const a = m[1].split(',').map(Number); return (EASE[e] = bezier(a[0], a[1], a[2], a[3])); }
  m = /^spring\(([^)]*)\)$/.exec(e);
  if (m) { const b = m[1].split(',').map(Number); return (EASE[e] = spring(b[0], b[1])); }
  m = /^steps\((\d+)\)$/.exec(e);
  if (m) return (EASE[e] = steps(+m[1]));
  if (typeof console !== 'undefined') console.warn('[vk] unknown ease', e);
  return EASE.outCubic;
}
