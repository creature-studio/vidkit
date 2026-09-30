/*! vidkit 0.2.0 — deterministic HTML/JS → video. MIT. Bundled fonts: SIL OFL 1.1 (see fonts/LICENSES.md) */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/ease.js
  function bezier(x1, y1, x2, y2) {
    const A = (a, b) => 1 - 3 * b + 3 * a, B4 = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
    const calc = (t, a, b) => ((A(a, b) * t + B4(a, b)) * t + C(a)) * t;
    const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B4(a, b) * t + C(a);
    return function(x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const s2 = slope(t, x1, x2);
        if (Math.abs(s2) < 1e-6) break;
        t -= (calc(t, x1, x2) - x) / s2;
      }
      if (Math.abs(calc(t, x1, x2) - x) > 1e-5) {
        let lo = 0, hi = 1;
        t = x;
        for (let j = 0; j < 30; j++) {
          const v = calc(t, x1, x2);
          if (v < x) lo = t;
          else hi = t;
          t = (lo + hi) / 2;
        }
      }
      return calc(t, y1, y2);
    };
  }
  function spring(k = 6, w = 12) {
    const f = (p) => 1 - Math.exp(-k * p) * Math.cos(w * p), e1 = 1 - f(1);
    return (p) => p <= 0 ? 0 : p >= 1 ? 1 : f(p) + p * e1;
  }
  function steps(n = 4, inner) {
    const e = inner || EASE.house;
    return (p) => {
      if (p >= 1) return 1;
      if (p <= 0) return 0;
      const q = p * n, i = Math.floor(q);
      return (i + e(q - i)) / n;
    };
  }
  var PI = Math.PI;
  var c1 = 1.70158;
  var c2 = c1 * 1.525;
  var c3 = c1 + 1;
  var bounceOut = (x) => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  };
  var EASE = {
    linear: (x) => x,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inOutQuad: (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    inQuart: (x) => x * x * x * x,
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inOutQuart: (x) => x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2,
    inQuint: (x) => x ** 5,
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    inOutQuint: (x) => x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,
    inSine: (x) => 1 - Math.cos(x * PI / 2),
    outSine: (x) => Math.sin(x * PI / 2),
    inOutSine: (x) => -(Math.cos(PI * x) - 1) / 2,
    inExpo: (x) => x === 0 ? 0 : Math.pow(2, 10 * x - 10),
    outExpo: (x) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x),
    inOutExpo: (x) => x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    inCirc: (x) => 1 - Math.sqrt(1 - x * x),
    outCirc: (x) => Math.sqrt(1 - Math.pow(x - 1, 2)),
    inBack: (x) => c3 * x * x * x - c1 * x * x,
    outBack: (x) => 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
    inOutBack: (x) => x < 0.5 ? Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2,
    outElastic: (x) => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * PI / 3)) + 1,
    outBounce: bounceOut,
    inBounce: (x) => 1 - bounceOut(1 - x),
    spring: spring(),
    house: bezier(0.7, 0, 0.2, 1),
    // signature in-out curve (swiss-motion): one curve for the whole film
    swift: bezier(0.2, 0.8, 0.2, 1),
    // fast-out settle
    smooth: bezier(0.4, 0, 0.2, 1),
    // Material standard
    snappy: bezier(0.2, 0.9, 0.1, 1),
    // fast-out, long settle (titles)
    step: (x) => x < 1 ? 0 : 1
  };
  var DEFAULT = "outCubic";
  function setDefaultEase(name) {
    DEFAULT = name || "outCubic";
  }
  function defaultEase() {
    return DEFAULT;
  }
  function getEase(e) {
    if (typeof e === "function") return e;
    if (!e) return getEase(DEFAULT);
    if (EASE[e]) return EASE[e];
    let m = /^(?:cubic-)?bezier\(([^)]+)\)$/.exec(e);
    if (m) {
      const a = m[1].split(",").map(Number);
      return EASE[e] = bezier(a[0], a[1], a[2], a[3]);
    }
    m = /^spring\(([^)]*)\)$/.exec(e);
    if (m) {
      const b = m[1].split(",").map(Number);
      return EASE[e] = spring(b[0], b[1]);
    }
    m = /^steps\((\d+)\)$/.exec(e);
    if (m) return EASE[e] = steps(+m[1]);
    if (typeof console !== "undefined") console.warn("[vk] unknown ease", e);
    return EASE.outCubic;
  }

  // src/core/random.js
  function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }
  function hash2(x, y) {
    return hash(x * 157.31 + y * 113.97);
  }
  function mulberry32(a) {
    return function() {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hrange(i, a, b) {
    return a + (b - a) * hash(i);
  }
  function hpick(i, arr) {
    return arr[Math.floor(hash(i) * arr.length) % arr.length];
  }
  var sm = (t) => t * t * (3 - 2 * t);
  function noise1(x) {
    const i = Math.floor(x), f = x - i;
    return hash(i) + (hash(i + 1) - hash(i)) * sm(f);
  }
  function noise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
    const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function boil(t, rate = 12) {
    return Math.floor(t * rate + 1e-6);
  }

  // src/core/time.js
  var clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  var clamp01 = (x) => clamp(x, 0, 1);
  var lerp = (a, b, p) => a + (b - a) * p;
  var frac = (x) => x - Math.floor(x);
  var frac9 = (x) => Math.max(0, x - Math.floor(x + 1e-9));
  var seg = (t, a, b) => clamp01((t - a) / (b - a));
  var progress = (t, t0, d, ease) => getEase(ease || "linear")(clamp01((t - t0) / d));
  var window01 = (t, a, b, din = 0.3, dout = 0.3) => Math.min(seg(t, a, a + din), 1 - seg(t, b - dout, b));
  function kf(t, keys, ease) {
    if (!keys.length) return 0;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t < keys[i][0]) {
        const a = keys[i - 1], b = keys[i], e = getEase(b[2] || ease || "inOutCubic"), p = e((t - a[0]) / (b[0] - a[0]));
        if (Array.isArray(a[1])) return a[1].map((v, j) => lerp(v, b[1][j], p));
        return lerp(a[1], b[1], p);
      }
    }
    return keys[keys.length - 1][1];
  }
  var smooth01 = (x) => {
    x = clamp01(x);
    return x * x * (3 - 2 * x);
  };
  var bump = (t, a, b) => t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a));
  function plat(t, a, b, c, d) {
    if (t <= a || t >= d) return 0;
    if (t < b) return smooth01((t - a) / (b - a));
    if (t <= c) return 1;
    return smooth01((d - t) / (d - c));
  }
  function hold(t, keys) {
    let v = keys.length ? keys[0][1] : void 0;
    for (const k of keys) {
      if (t >= k[0]) v = k[1];
      else break;
    }
    return v;
  }
  var inRanges = (t, ranges) => ranges.some((r) => t >= r[0] && t < r[1]);
  function kfSpline(t, keys) {
    const n = keys.length;
    if (!n) return 0;
    if (n === 1 || t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 1;
    while (i < n - 1 && t >= keys[i][0]) i++;
    const k1 = keys[i - 1], k2 = keys[i], k0 = keys[i - 2] || k1, k3 = keys[i + 1] || k2;
    const dt = k2[0] - k1[0], u = (t - k1[0]) / dt, u2 = u * u, u3 = u2 * u;
    const tan = (a, b, c, ta, tc) => tc - ta > 0 ? (c - a) / (tc - ta) * dt : 0;
    const one = (a, b, c, d) => {
      const m1 = tan(a, b, c, k0[0], k2[0]), m2 = tan(b, c, d, k1[0], k3[0]);
      return (2 * u3 - 3 * u2 + 1) * b + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * c + (u3 - u2) * m2;
    };
    if (Array.isArray(k1[1])) return k1[1].map((_, j) => one(k0[1][j], k1[1][j], k2[1][j], k3[1][j]));
    return one(k0[1], k1[1], k2[1], k3[1]);
  }
  var BeatGrid = class {
    constructor(o = {}) {
      this.fps = o.fps || 30;
      this.lead = 1;
      this.set(o);
    }
    set(o = {}) {
      if (o.fps) this.fps = o.fps;
      if (o.lead != null) this.lead = +o.lead;
      this.bpm = +o.bpm || 0;
      this.offset = +o.offset || 0;
      this.meter = +o.meter || 4;
      this.times = Array.isArray(o.times) && o.times.length ? o.times.slice().sort((a, b) => a - b) : null;
      if (this.times && !this.bpm && this.times.length > 1) this.bpm = 60 / ((this.times[this.times.length - 1] - this.times[0]) / (this.times.length - 1));
      this.beat = this.bpm ? 60 / this.bpm : 0.5;
      this.downIdx = null;
      if (Array.isArray(o.downbeats) && o.downbeats.length) {
        const idx = o.downbeats.map((d) => Math.round(this.index(d)));
        this.downIdx = [...new Set(idx)].sort((a, b) => a - b);
      } else if (o.downbeat != null) this.firstDown = +o.downbeat;
      return this;
    }
    get active() {
      return !!(this.bpm || this.times);
    }
    get leadT() {
      return this.lead / this.fps;
    }
    // time of beat n (fractional allowed)
    at(n) {
      if (!this.times) return this.offset + n * this.beat;
      const T4 = this.times, i = Math.floor(n), f = n - i;
      if (i < 0) return T4[0] + n * this.beat;
      if (i >= T4.length - 1) return T4[T4.length - 1] + (n - (T4.length - 1)) * this.beat;
      return T4[i] + (T4[i + 1] - T4[i]) * f;
    }
    // fractional beat index at time t (binary search for explicit beats)
    index(t) {
      if (!this.times) return (t - this.offset) / this.beat;
      const T4 = this.times;
      if (t < T4[0]) return (t - T4[0]) / this.beat;
      if (t >= T4[T4.length - 1]) return T4.length - 1 + (t - T4[T4.length - 1]) / this.beat;
      let lo = 0, hi = T4.length - 1;
      while (hi - lo > 1) {
        const m = lo + hi >> 1;
        if (T4[m] <= t) lo = m;
        else hi = m;
      }
      return lo + (t - T4[lo]) / (T4[lo + 1] - T4[lo]);
    }
    // ---- bars (measures). Named measure()/barIndex() so they never clash with the vk.bar() chart ----
    // beat index where bar n starts (fractional n interpolates inside the bar)
    barBeat(n) {
      const D = this.downIdx;
      if (!D) return (this.firstDown || 0) + n * this.meter;
      const i = Math.floor(n), f = n - i;
      if (i < 0) return D[0] + n * this.meter;
      if (i >= D.length - 1) return D[D.length - 1] + (n - (D.length - 1)) * this.meter;
      return D[i] + (D[i + 1] - D[i]) * f;
    }
    measure(n) {
      return this.at(this.barBeat(n));
    }
    // fractional bar index at time t
    barIndex(t) {
      const b = this.index(t), D = this.downIdx;
      if (!D) return (b - (this.firstDown || 0)) / this.meter;
      if (b < D[0]) return (b - D[0]) / this.meter;
      if (b >= D[D.length - 1]) return D.length - 1 + (b - D[D.length - 1]) / this.meter;
      let lo = 0, hi = D.length - 1;
      while (hi - lo > 1) {
        const m = lo + hi >> 1;
        if (D[m] <= b) lo = m;
        else hi = m;
      }
      return lo + (b - D[lo]) / (D[lo + 1] - D[lo]);
    }
    // position of the beat inside its bar: 1..meter
    beatInBar(t) {
      const b = Math.floor(this.index(t + this.leadT) + 1e-6), bb = Math.floor(this.barIndex(this.at(b) + 1e-6)), s2 = Math.round(this.barBeat(bb));
      return b - s2 + 1;
    }
    // 1 on every beat (`lead` frames early), decays exponentially. every=2 → every other beat
    pulse(t, k = 6, every = 1) {
      return this.active ? Math.exp(-frac9(this.index(t + this.leadT) / every) * k) : 0;
    }
    // 1 on every bar start (every=2 → every other bar)
    barPulse(t, k = 4, every = 1) {
      return this.active ? Math.exp(-frac9(this.barIndex(t + this.leadT) / every) * k) : 0;
    }
    // one-shot accent at t0
    hit(t, t0, k = 8) {
      return t < t0 - this.leadT ? 0 : Math.exp(-k * Math.max(0, t - t0 + this.leadT));
    }
    // eased arrival exactly at t1, starting d earlier (default: half a beat)
    snap(t, t1, d) {
      d = d || this.beat / 2;
      return EASE.house(seg(t, t1 - d, t1));
    }
    // quantise a time to the nearest subdivision (e.g. 2 = eighth notes)
    quantize(t, sub2 = 1) {
      return this.at(Math.round(this.index(t) * sub2) / sub2);
    }
    // next grid point (beat or bar) at/after t: returns its time (without lead)
    ceil(t, unit = "beat", n = 1) {
      if (unit === "bar") {
        const i2 = Math.ceil(this.barIndex(t) / n - 1e-6) * n;
        return this.measure(i2);
      }
      const i = Math.ceil(this.index(t) / n - 1e-6) * n;
      return this.at(i);
    }
  };
  function parseTime(v, grid2, base2 = 0) {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v;
    v = String(v).trim();
    if (v.startsWith("b:")) return grid2.at(+v.slice(2)) - grid2.leadT - base2;
    if (v.startsWith("m:")) return grid2.measure(+v.slice(2)) - grid2.leadT - base2;
    return +v;
  }
  function parseDur(v, grid2) {
    if (typeof v === "number") return v;
    v = String(v || "");
    if (v.startsWith("b:")) return +v.slice(2) * grid2.beat;
    if (v.startsWith("m:")) return +v.slice(2) * grid2.meter * grid2.beat;
    return +v;
  }
  function gridEnd(v, grid2, cut) {
    if (typeof v !== "string" || !grid2.active) return null;
    const m = /^([bm]):(-?[\d.]+)$/.exec(v.trim());
    if (!m) return null;
    const n = +m[2], c = cut + grid2.leadT;
    if (m[1] === "b") return grid2.at(Math.round(grid2.index(c)) + n) - grid2.leadT;
    return grid2.measure(Math.round(grid2.barIndex(c)) + n) - grid2.leadT;
  }

  // src/core/stagger.js
  function stagger(each, o = {}) {
    return function(i, n) {
      const from = o.from || "start";
      let d;
      if (o.grid) {
        const cols = o.grid[0], rows2 = o.grid[1] || Math.ceil(n / cols);
        let cx, cy;
        if (from === "center") {
          cx = (cols - 1) / 2;
          cy = (rows2 - 1) / 2;
        } else if (from === "end") {
          cx = cols - 1;
          cy = rows2 - 1;
        } else if (typeof from === "number") {
          cx = from % cols;
          cy = Math.floor(from / cols);
        } else {
          cx = 0;
          cy = 0;
        }
        const x = i % cols, y = Math.floor(i / cols);
        d = Math.hypot(x - cx, y - cy);
      } else if (from === "center") d = Math.abs(i - (n - 1) / 2);
      else if (from === "end") d = n - 1 - i;
      else if (from === "random") {
        const s2 = Math.sin((i + 1) * 12.9898 + (o.seed || 0) * 78.233) * 43758.5453;
        d = (s2 - Math.floor(s2)) * (n - 1);
      } else if (typeof from === "number") d = Math.abs(i - from);
      else d = i;
      return d * each;
    };
  }
  function staggerOf(st) {
    return typeof st === "function" ? st : st ? stagger(st) : null;
  }

  // src/core/interp.js
  var NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
  function hexToRgba(h3) {
    h3 = h3.slice(1);
    if (h3.length === 3 || h3.length === 4) h3 = h3.split("").map((c) => c + c).join("");
    const r = parseInt(h3.slice(0, 2), 16), g = parseInt(h3.slice(2, 4), 16), b = parseInt(h3.slice(4, 6), 16), a = h3.length === 8 ? parseInt(h3.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r},${g},${b},${+a.toFixed(3)})`;
  }
  function normColor(s2) {
    return String(s2).replace(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi, hexToRgba).replace(/rgb\(\s*([^,)]+),\s*([^,)]+),\s*([^,)]+)\)/g, "rgba($1,$2,$3,1)");
  }
  function lerpStr(a, b, p) {
    if (a === b) return b;
    const na = a.match(NUM) || [], nb = b.match(NUM) || [];
    if (na.length !== nb.length || !na.length) return p < 1 ? a : b;
    let i = 0;
    return b.replace(NUM, () => {
      const x = parseFloat(na[i]), y = parseFloat(nb[i]);
      i++;
      return String(Math.round((x + (y - x) * p) * 1e3) / 1e3);
    });
  }
  function compatible(a, b) {
    return String(a).replace(NUM, "#") === String(b).replace(NUM, "#");
  }
  var TF = { x: "px", y: "px", z: "px", scale: "", scaleX: "", scaleY: "", rotate: "deg", rotateX: "deg", rotateY: "deg", skewX: "deg", skewY: "deg" };
  var UNITLESS = { opacity: 1, zIndex: 1, fontWeight: 1, lineHeight: 1, flexGrow: 1, flexShrink: 1, order: 1, draw: 1, scale: 1, scaleX: 1, scaleY: 1, fontStretch: 0 };
  var TF_ID = { x: "0px", y: "0px", z: "0px", scale: "1", scaleX: "1", scaleY: "1", rotate: "0deg", rotateX: "0deg", rotateY: "0deg", skewX: "0deg", skewY: "0deg", opacity: "1", blur: "0px", draw: "1", brightness: "1" };
  function toStr(prop, v) {
    if (typeof v === "number") {
      if (prop in TF) return v + TF[prop];
      if (prop === "blur") return v + "px";
      if (prop === "fontStretch") return v + "%";
      if (UNITLESS[prop] || prop === "brightness" || prop.startsWith("attr:") || prop.startsWith("--")) return String(v);
      return v + "px";
    }
    return normColor(v);
  }
  function camel(p) {
    return p.startsWith("--") || p.startsWith("attr:") ? p : p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }
  function composeTransform(tf) {
    let s2 = "";
    if (tf.z) s2 += `translate3d(${tf.x || "0px"},${tf.y || "0px"},${tf.z}) `;
    else if (tf.x || tf.y) s2 += `translate(${tf.x || "0px"},${tf.y || "0px"}) `;
    if (tf.rotate) s2 += `rotate(${tf.rotate}) `;
    if (tf.rotateX) s2 += `rotateX(${tf.rotateX}) `;
    if (tf.rotateY) s2 += `rotateY(${tf.rotateY}) `;
    if (tf.scale) s2 += `scale(${tf.scale}) `;
    if (tf.scaleX || tf.scaleY) s2 += `scale(${tf.scaleX || 1},${tf.scaleY || 1}) `;
    if (tf.skewX) s2 += `skewX(${tf.skewX}) `;
    if (tf.skewY) s2 += `skewY(${tf.skewY}) `;
    return s2.trim();
  }

  // src/core/plugin.js
  var registry = {
    fx: {},
    transitions: {},
    textures: {},
    backgrounds: {},
    blocks: {},
    themes: {},
    formats: {},
    sounds: {},
    layers: {},
    hooks: { init: [], frame: [], qa: [] },
    plugins: []
  };
  var KINDS = ["fx", "transitions", "textures", "backgrounds", "blocks", "themes", "formats", "sounds", "layers"];
  function register(kind, name, impl) {
    if (!registry[kind]) throw new Error("[vk] unknown registry kind " + kind);
    registry[kind][name] = impl;
    return impl;
  }
  function use(vk2, plugin, opts) {
    if (!plugin) return vk2;
    const name = plugin.name || typeof plugin === "function" && plugin.name || "anonymous";
    if (registry.plugins.some((p) => p.plugin === plugin)) return vk2;
    registry.plugins.push({ name, plugin });
    if (typeof plugin === "function") {
      plugin(vk2, opts || {});
      return vk2;
    }
    KINDS.forEach((k) => {
      if (plugin[k]) Object.entries(plugin[k]).forEach(([n, impl]) => register(k, n, impl));
    });
    if (plugin.hooks) Object.entries(plugin.hooks).forEach(([h3, fn]) => registry.hooks[h3] && registry.hooks[h3].push(fn));
    if (plugin.install) plugin.install(vk2, opts || {});
    if (plugin.blocks) Object.entries(plugin.blocks).forEach(([n, f]) => {
      if (!(n in vk2)) vk2[n] = f;
    });
    return vk2;
  }
  function list(kind) {
    return Object.keys(registry[kind] || {});
  }

  // src/core/timeline.js
  var Timeline = class {
    constructor() {
      this.els = /* @__PURE__ */ new Map();
    }
    // el -> {props:{k:[tr]}, order:[], fns:[], origin, owner}
    state(el2) {
      let s2 = this.els.get(el2);
      if (!s2) {
        s2 = { props: {}, order: [], fns: [], origin: null, owner: null };
        this.els.set(el2, s2);
      }
      return s2;
    }
    // o: {t, d, ease, from, to, stagger, origin}; owner: scene (local time) or null (absolute)
    tween(els, o, owner) {
      const n = els.length, sf = staggerOf(o.stagger);
      els.forEach((el2, i) => {
        const t0 = (o.t || 0) + (sf ? sf(i, n, el2) : 0);
        const d = o.d == null ? 0.6 : o.d, ease = getEase(o.ease || defaultEase());
        const from = o.from || {}, to = o.to || {}, keys = /* @__PURE__ */ new Set([...Object.keys(from), ...Object.keys(to)]);
        const S = this.state(el2);
        S.owner = owner || null;
        if (o.origin) S.origin = o.origin;
        keys.forEach((k0) => {
          const k = camel(k0);
          let fv = from[k0], tv = to[k0];
          if (fv === void 0) fv = defaultVal(el2, k);
          if (tv === void 0) tv = defaultVal(el2, k);
          const tr = { t0, d: Math.max(d, 1e-4), ease, a: toStr(k, fv), b: toStr(k, tv) };
          if (!S.props[k]) {
            S.props[k] = [];
            S.order.push(k);
          }
          S.props[k].push(tr);
          S.props[k].sort((x, y) => x.t0 - y.t0);
        });
      });
    }
    fn(el2, f, owner) {
      const S = this.state(el2);
      S.owner = owner || null;
      S.fns.push(f);
    }
    apply(el2, S, local) {
      let tf = null;
      const vals = {};
      for (const k of S.order) {
        const list2 = S.props[k];
        let tr = null;
        for (let j = list2.length - 1; j >= 0; j--) if (local >= list2[j].t0) {
          tr = list2[j];
          break;
        }
        vals[k] = tr ? lerpStr(tr.a, tr.b, tr.ease(Math.min(1, (local - tr.t0) / tr.d))) : list2[0].a;
      }
      let filt = null;
      for (const k in vals) {
        const v = vals[k];
        if (k in TF) {
          (tf || (tf = {}))[k] = v;
          continue;
        }
        if (k === "blur") {
          const b = parseFloat(v);
          if (b > 0.01) (filt || (filt = [])).push(`blur(${v})`);
          continue;
        }
        if (k === "brightness") {
          if (Math.abs(parseFloat(v) - 1) > 1e-3) (filt || (filt = [])).push(`brightness(${v})`);
          continue;
        }
        if (k === "draw") {
          setDraw(el2, parseFloat(v));
          continue;
        }
        if (k.startsWith("attr:")) {
          el2.setAttribute(k.slice(5), v);
          continue;
        }
        if (k.startsWith("--")) {
          el2.style.setProperty(k, v);
          continue;
        }
        el2.style[k] = v;
      }
      if ("blur" in vals || "brightness" in vals) el2.style.filter = filt ? filt.join(" ") : "";
      if (tf) {
        el2.style.transform = composeTransform(tf);
        if (S.origin) el2.style.transformOrigin = S.origin;
      }
      for (const f of S.fns) f(local);
    }
  };
  function setDraw(el2, p) {
    let L = el2.__vkLen;
    if (!L) {
      try {
        L = el2.getTotalLength();
      } catch (e) {
        L = 0;
      }
      if (!L) {
        el2.setAttribute("pathLength", "1");
        L = 1;
      }
      el2.__vkLen = L;
      el2.style.strokeDasharray = L + " " + L;
    }
    el2.style.strokeDashoffset = String(L * (1 - p));
  }
  function defaultVal(el2, k) {
    if (k in TF_ID) return TF_ID[k];
    if (typeof getComputedStyle === "undefined") return "0";
    if (k.startsWith("attr:")) return el2.getAttribute(k.slice(5)) || "0";
    if (k.startsWith("--")) return getComputedStyle(el2).getPropertyValue(k).trim() || "0";
    const v = getComputedStyle(el2)[k];
    return v == null || v === "" ? "0" : v;
  }

  // src/core/camera.js
  function normKeys(keys, W, H) {
    return keys.map((k) => ({ t: +k.t || 0, x: k.x == null ? W / 2 : +k.x, y: k.y == null ? H / 2 : +k.y, s: k.s == null ? k.zoom == null ? 1 : +k.zoom : +k.s, r: +(k.r || k.rotate || 0), ease: getEase(k.ease || "inOutCubic") })).sort((a, b) => a.t - b.t);
  }
  function camAt(keys, lt) {
    if (lt <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      if (lt < keys[i].t) {
        const a = keys[i - 1], b = keys[i], p = b.ease((lt - a.t) / (b.t - a.t));
        return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s * Math.pow(b.s / a.s, p), r: a.r + (b.r - a.r) * p };
      }
    }
    return keys[keys.length - 1];
  }
  function shakeAt(shakes, lt, rate = 24) {
    let dx = 0, dy = 0, dr = 0;
    shakes.forEach((sh, si) => {
      if (lt < sh.t || lt > sh.t + sh.d) return;
      const f = Math.floor(lt * rate + 1e-6), q = Math.max(0, f / rate - sh.t);
      const a = sh.amp * Math.exp(-sh.k * q) * Math.max(0, 1 - q / sh.d);
      dx += (hash(f * 1.7 + si * 13) - 0.5) * 2 * a;
      dy += (hash(f * 2.3 + 9 + si * 13) - 0.5) * 2 * a;
      dr += (hash(f * 3.1 + 4 + si * 7) - 0.5) * a * 0.08 * (sh.rot || 0);
    });
    return { dx, dy, dr };
  }
  function cameraTransform(c, W, H, lt, dur) {
    const k = c.keys ? camAt(c.keys, lt) : { x: W / 2, y: H / 2, s: 1, r: 0 };
    const push = c.push ? 1 + c.push * Math.min(1, lt / dur) : 1;
    const zs = k.s * push * (1 + (c.extraZoom ? c.extraZoom(lt) : 0));
    const sh = shakeAt(c.shakes || [], lt);
    return `translate(${W / 2 + sh.dx}px,${H / 2 + sh.dy}px) rotate(${k.r + sh.dr}deg) scale(${zs}) translate(${-k.x}px,${-k.y}px)`;
  }

  // src/fx/apply.js
  function fxApi(scene, isExit) {
    const v = scene.video;
    return {
      scene,
      video: v,
      exit: !!isExit,
      theme: v.theme,
      tween: (els, o) => v.tl.tween([].concat(els), o, scene),
      fn: (el2, f) => v.tl.fn(el2, f, scene),
      after: (f) => v.afterFonts.push(f),
      // run after fonts are loaded (measurement-dependent fx)
      beats: v.beats,
      fps: v.fps
    };
  }
  function applyFx(el2, fxStr, o, scene, isExit) {
    const names = String(fxStr || "fade").trim().split(/\s+/);
    const api = fxApi(scene, isExit);
    const first = registry.fx[names[0]];
    if (typeof first === "function") {
      first(el2, o, api);
      return;
    }
    let from = {}, to = {}, instant = {}, ease = null, origin = null;
    names.forEach((nm) => {
      const f = registry.fx[nm];
      if (!f) {
        console.warn("[vk] unknown fx", nm);
        return;
      }
      if (typeof f === "function") {
        f(el2, o, api);
        return;
      }
      const r = typeof f.make === "function" ? f.make(o, el2) : f;
      Object.assign(from, r.from);
      Object.assign(to, r.to);
      if (r.instant) Object.assign(instant, r.instant);
      if (r.ease && !ease) ease = r.ease;
      if (r.origin) origin = r.origin;
    });
    let e = o.ease || ease || defaultEase();
    const d = o.d == null ? 0.6 : o.d;
    if (origin && !el2.style.transformOrigin) el2.style.transformOrigin = origin;
    if (isExit) {
      [from, to] = [to, from];
      e = o.ease || "inCubic";
    }
    if (Object.keys(instant).length) {
      const i0 = {}, i1 = {};
      Object.keys(instant).forEach((k) => {
        i0[k] = isExit ? instant[k] : 0;
        i1[k] = isExit ? 0 : instant[k];
      });
      api.tween(el2, { t: isExit ? o.t + d : o.t, d: 1e-4, from: i0, to: i1 });
    }
    if (Object.keys(from).length || Object.keys(to).length) api.tween(el2, { t: o.t, d, ease: e, from, to });
  }

  // src/fx/rhythm.js
  function beatValue(v, spec, t) {
    const unit = spec.unit || "beat", k = spec.k, every = spec.every || 1;
    if (unit === "bar") return v.beats.barPulse(t, k || 4, every);
    if (unit === "onset") return v.music ? v.music.onsetHit(t, k || 10, spec.min != null ? spec.min : 0.3) : 0;
    if (spec.beats) {
      const pos = v.beats.beatInBar(t);
      if (!spec.beats.includes(pos)) return 0;
    }
    return v.beats.pulse(t, k || 6, every);
  }
  function energyValue(v, spec, t) {
    return v.music ? v.music.energy(t, spec.band || "loud", spec.smooth != null ? spec.smooth : 0.08) : 0;
  }
  var lerp2 = (r, x) => Array.isArray(r) ? r[0] + (r[1] - r[0]) * x : 1 + (r - 1) * x;
  function modulator(v, el2, beat, energy) {
    const B4 = beat === true ? { scale: 0.06 } : beat, E = energy === true ? { scale: [1, 1.08] } : energy;
    const S = v.tl.state(el2);
    return (t) => {
      let sc = 1, rot = 0, br = 1, bv = 0, ev = 0;
      if (B4) {
        bv = beatValue(v, B4, t);
        if (B4.scale) sc *= 1 + B4.scale * bv;
        if (B4.rotate) rot += B4.rotate * bv;
        if (B4.brightness) br *= 1 + B4.brightness * bv;
      }
      if (E) {
        ev = energyValue(v, E, t);
        if (E.scale) sc *= lerp2(E.scale, ev);
        if (E.rotate) rot += lerp2(E.rotate, ev) - (Array.isArray(E.rotate) ? 0 : 1);
        if (E.brightness) br *= lerp2(E.brightness, ev);
      }
      el2.style.scale = Math.abs(sc - 1) > 1e-4 ? sc.toFixed(4) : "";
      el2.style.rotate = Math.abs(rot) > 1e-3 ? rot.toFixed(3) + "deg" : "";
      if (B4 && B4.brightness || E && E.brightness) {
        const own = S.props.blur || S.props.brightness;
        const base2 = own ? String(el2.style.filter || "").replace(/\s*brightness\([^)]*\)\s*$/, "") : "";
        el2.style.filter = (base2 ? base2 + " " : "") + (Math.abs(br - 1) > 1e-3 ? `brightness(${br.toFixed(3)})` : "");
      }
      el2.style.setProperty("--beat", bv.toFixed(3));
      el2.style.setProperty("--e", ev.toFixed(3));
    };
  }

  // src/audio/words.js
  var PUNCT = /[\s.,!?;:…、，。！？；：“”‘’"'()（）《》【】\-—~·]/;
  var norm = (s2) => String(s2).replace(new RegExp(PUNCT.source, "g"), "").toLowerCase();
  function mapWords(text3, words) {
    const pieces = [], T4 = String(text3);
    let pos = 0;
    words.forEach((w, wi) => {
      const key = norm(w.w);
      if (!key) return;
      for (let a = pos; a < T4.length; a++) {
        if (PUNCT.test(T4[a])) continue;
        let b = a, acc = "";
        while (b < T4.length && acc.length < key.length) {
          if (!PUNCT.test(T4[b])) acc += T4[b].toLowerCase();
          b++;
        }
        if (acc === key) {
          if (a > pos) pieces.push({ s: T4.slice(pos, a), wi: -1 });
          pieces.push({ s: T4.slice(a, b), wi });
          pos = b;
          return;
        }
        if (a - pos > 40) break;
      }
    });
    if (pos < T4.length) pieces.push({ s: T4.slice(pos), wi: -1 });
    return pieces;
  }
  function alignToCues(data, o = {}) {
    const off = +o.offset || 0, hold2 = o.hold != null ? o.hold : 0.5, pre = o.pre != null ? o.pre : 0.15;
    const lines = (data.lines || []).filter((l) => l.words && l.words.length);
    return lines.map((l, i) => {
      const words = l.words.map((w) => ({ w: w.w, t: +(w.t - off).toFixed(3), end: +((w.end != null ? w.end : w.t + 0.2) - off).toFixed(3) }));
      const next = lines[i + 1], nextStart = next ? next.words[0].t - off - 0.05 : Infinity;
      const start = Math.max(0, words[0].t - pre), end = Math.min(nextStart, words[words.length - 1].end + hold2);
      return [+start.toFixed(3), +Math.max(start + 0.3, end).toFixed(3), l.text, words];
    });
  }
  function chunkCues(text3, words, o = {}) {
    const at = +o.at || 0, maxChars = o.maxChars || 18, hold2 = o.hold != null ? o.hold : 0.35;
    const W = words.map((w) => ({ ...w, t: w.t + at, end: (w.end != null ? w.end : w.t + 0.2) + at }));
    const pieces = mapWords(text3, W);
    const clauses = [];
    let cur = [];
    pieces.forEach((p) => {
      cur.push(p);
      if (p.wi < 0 && /[，。！？；：,.!?;:]/.test(p.s)) {
        clauses.push(cur);
        cur = [];
      }
    });
    if (cur.length) clauses.push(cur);
    const units = (ps) => ps.reduce((n, p) => n + readUnits(p.s), 0);
    const chunks = [];
    let acc = [];
    clauses.forEach((c) => {
      const tiny = acc.length && units(acc) < 5, lim = tiny ? maxChars + 6 : maxChars;
      if (acc.length && units(acc) + units(c) > lim) {
        chunks.push(acc);
        acc = [];
      }
      if (units(c) > maxChars) {
        let part = [];
        c.forEach((p) => {
          if (part.length && units(part) + units([p]) > maxChars) {
            chunks.push(part);
            part = [];
          }
          part.push(p);
        });
        acc = part;
      } else acc = acc.concat(c);
    });
    if (acc.length) chunks.push(acc);
    const cues = [];
    chunks.forEach((ch) => {
      const ws = ch.filter((p) => p.wi >= 0).map((p) => W[p.wi]);
      if (!ws.length) return;
      const txt2 = ch.map((p) => p.s).join("").trim().replace(/[，,、；;：:]$/, "");
      cues.push([ws[0].t - 0.1, ws[ws.length - 1].end + hold2, txt2, ws.map((w) => ({ w: w.w, t: +w.t.toFixed(3), end: +w.end.toFixed(3) }))]);
    });
    for (let i = 0; i < cues.length - 1; i++) cues[i][1] = Math.min(cues[i][1], cues[i + 1][0] - 0.04);
    return cues.map((c) => [+c[0].toFixed(3), +c[1].toFixed(3), c[2], c[3]]);
  }
  function readUnits(s2) {
    let n = 0;
    for (const ch of String(s2)) {
      if (/\s/.test(ch) || PUNCT.test(ch)) continue;
      n += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.5;
    }
    return n;
  }
  function estimateSpeech(text3) {
    const cjk = (String(text3).match(/[\u3400-\u9fff]/g) || []).length, latin = (String(text3).match(/[A-Za-z0-9]+/g) || []).length;
    return +(cjk / 4.3 + latin / 2.7 + (String(text3).match(/[，。！？,.!?；;]/g) || []).length * 0.15).toFixed(2);
  }
  function voSegments(vo) {
    if (vo == null || vo === false) return [];
    if (typeof vo === "string") return [{ text: vo }];
    if (Array.isArray(vo)) {
      if (vo.every((x) => typeof x === "string")) return [{ text: vo.join("") }];
      return vo.map((x) => typeof x === "string" ? { text: x } : Array.isArray(x) ? { who: x[0], text: x[1], ...x[2] || {} } : { ...x }).filter((x) => x.text);
    }
    return vo.text ? [{ ...vo }] : [];
  }
  function voKey(seg2) {
    return seg2.voice || seg2.rate || seg2.pitch ? `${seg2.voice || ""}|${seg2.rate || ""}|${seg2.pitch || ""}|${seg2.text}` : seg2.text;
  }
  function planVoice(segs, durs, o = {}) {
    let cur = o.lead != null ? o.lead : 0.5;
    const gap = o.gap != null ? o.gap : 0.35;
    return segs.map((s2, i) => {
      const at = s2.at != null ? +s2.at : i ? cur + (s2.gap != null ? +s2.gap : gap) : cur + (s2.gap != null ? +s2.gap : 0);
      const dur = +durs[i] || 0;
      cur = at + dur;
      return { ...s2, at: +at.toFixed(3), dur, end: +(at + dur).toFixed(3) };
    });
  }
  function speakingAt(words, t, ramp = 0.05) {
    let v = 0;
    for (const w of words) {
      const e = w.end != null ? w.end : w.t + 0.2;
      if (t < w.t - ramp) break;
      if (t <= e + ramp) v = Math.max(v, Math.min(1, (t - w.t + ramp) / ramp, (e + ramp - t) / ramp));
    }
    return Math.max(0, Math.min(1, v));
  }

  // src/core/scene.js
  var Scene = class {
    constructor(video, o) {
      this.video = video;
      this.o = o;
      this.name = o.name || `scene${video.scenes.length + 1}`;
      this.index = video.scenes.length;
      this.fns = [];
      this.layers = [];
      this.bgs = [];
      this.camCfg = { keys: null, push: o.push != null ? o.push : video.cfg.push || 0, shakes: [], extra: [] };
      this.cursor = null;
      this.maxT = 0;
      this.cap = o.cap || null;
      const el2 = this.el = o.el || document.createElement("section");
      el2.classList.add("vk-scene");
      el2.dataset.name = this.name;
      if (!o.el) {
        this.cam = mk("div", "vk-cam", el2);
        this.content = mk("div", "vk-content " + (o.layout || video.cfg.layout || "center").split(/\s+/).join(" "), this.cam);
      } else {
        this.cam = null;
        this.content = el2;
      }
      this.fixed = el2;
    }
    // ---- timing ----
    time(v) {
      if (typeof v === "string" && /^[+-]\d/.test(v)) return (this.cursor == null ? 0 : this.cursor) + parseFloat(v);
      return parseTime(v, this.video.beats, this.start);
    }
    get end() {
      return this.start + this.dur;
    }
    // ---- queries ----
    q(sel) {
      return toEls(sel, this.el);
    }
    // ---- tweens (engine.js compatible) ----
    tween(target, o) {
      this.video.tl.tween(toEls(target, this.el), { ...o, t: this.time(o.t || 0) }, this);
      return this;
    }
    from(target, from, o = {}) {
      return this.tween(target, { ...o, from });
    }
    to(target, to, o = {}) {
      return this.tween(target, { ...o, to });
    }
    fx(target, fx, o = {}) {
      toEls(target, this.el).forEach((el2, i, arr) => applyFx(el2, fx, { ...o, t: this.time(o.t || o.at || 0) + stOff(o, i, arr.length) }, this, false));
      return this;
    }
    exit(target, fx, o = {}) {
      toEls(target, this.el).forEach((el2, i, arr) => applyFx(el2, fx, { ...o, t: this.time(o.t || o.at || 0) + stOff(o, i, arr.length) }, this, true));
      return this;
    }
    type(target, o = {}) {
      return this.fx(target, "type", o);
    }
    count(target, o = {}) {
      return this.fx(target, "count", o);
    }
    draw(target, o = {}) {
      return this.fx(target, "draw", o);
    }
    // per-frame hook: fn(local, p, t) while the scene is on screen. Must be a pure function of time.
    on(fn) {
      this.fns.push(fn);
      return this;
    }
    // ---- camera ----
    ensureCam() {
      if (!this.cam) {
        const c = document.createElement("div");
        c.className = "vk-cam";
        [...this.el.childNodes].forEach((n) => {
          if (!(n.classList && (n.classList.contains("hv-fixed") || n.classList.contains("vk-fixed")))) c.appendChild(n);
        });
        this.el.insertBefore(c, this.el.firstChild);
        this.cam = c;
      }
      return this;
    }
    camera(keys) {
      this.ensureCam();
      this.el.dataset.camKeys = "1";
      this.camCfg.keys = normKeys(keys.map((k) => ({ ...k, t: this.time(k.t) })), this.video.W, this.video.H);
      return this;
    }
    push(amount) {
      this.ensureCam();
      this.camCfg.push = amount;
      return this;
    }
    shake(t, amp = 10, d = 0.6, k = 6, rot = 0) {
      this.ensureCam();
      this.camCfg.shakes.push({ t: this.time(t), amp, d, k, rot });
      return this;
    }
    // zoom pulse on every beat (music): amount e.g. .02
    beatZoom(amount = 0.02, k = 6, every = 1, unit = "beat") {
      this.ensureCam();
      const B4 = this.video.beats;
      this.camCfg.extra.push((lt) => amount * (unit === "bar" ? B4.barPulse(this.start + lt, k, every) : B4.pulse(this.start + lt, k, every)));
      return this;
    }
    // camera zoom follows the music loudness (0..amount), e.g. .06 — needs vk.video({beats:'song.beats.json'})
    energyZoom(amount = 0.05, band = "loud", smooth = 0.15) {
      this.ensureCam();
      const v = this.video;
      this.camCfg.extra.push((lt) => v.music ? amount * v.music.energy(this.start + lt, band, smooth) : 0);
      return this;
    }
    // rhythm modulation of elements: onBeat('.logo', {scale:.08, brightness:.4, unit:'beat'|'bar'|'onset', every, k, beats:[2,4]})
    onBeat(target, o = { scale: 0.06 }) {
      toEls(target, this.el).forEach((el2) => {
        const f = modulator(this.video, el2, o, null);
        this.on((l, p, t) => f(t));
      });
      return this;
    }
    // energize('.bg', {scale:[1,1.1], brightness:[.7,1.3], band:'low', smooth:.1})
    energize(target, o = { scale: [1, 1.08] }) {
      toEls(target, this.el).forEach((el2) => {
        const f = modulator(this.video, el2, null, o);
        this.on((l, p, t) => f(t));
      });
      return this;
    }
    // ---- layers ----
    canvas(draw2, o = {}) {
      return this.video.addLayer("canvas", draw2, { ...o, scene: this });
    }
    webgl(o = {}) {
      return this.video.addLayer("webgl", null, { ...o, scene: this });
    }
    // vk.gl effects layer (fx/gl): sc.gl([effects], {z, rect, scale, blend}) or sc.gl({…opts}, [effects])
    gl(effects, o = {}) {
      if (effects && !Array.isArray(effects) && !effects.render) {
        const t = effects;
        effects = o;
        o = t;
      }
      return this.video.addLayer("gl", null, { ...o, scene: this, effects: [].concat(effects || []) });
    }
    // ---- authoring ----
    add(...nodes) {
      this.video.buildNodes(this, nodes.flat(), this.content);
      return this;
    }
    // raw HTML string into the scene (fixed layer) or the content flow; returns the created root element
    html(str, o = {}) {
      const w = document.createElement("div");
      w.innerHTML = str.trim();
      const els = [...w.children];
      const parent = o.flow ? this.content : o.fixed ? this.fixed : this.cam || this.el;
      els.forEach((e) => parent.appendChild(e));
      return els.length === 1 ? els[0] : els;
    }
    // per-scene texture overlay (same presets as video-level textures)
    texture(name, o = {}) {
      const f = this.video.constructor.registry.textures[name];
      if (!f) {
        console.warn("[vk] unknown texture", name);
        return this;
      }
      const r = f(this.video, o === true ? {} : typeof o === "number" ? { amount: o } : o, this);
      if (r && r.el) {
        r.el.style.zIndex = 20;
        this.el.appendChild(r.el);
      }
      if (r && r.update) this.bgs.push((local, p, t) => r.update(t, { local, scene: this }));
      return this;
    }
    // ---- voice lines (scene vo:) ----
    voAt(i = 0) {
      const s2 = this.voSegs && this.voSegs[i];
      return s2 ? s2.at : 0;
    }
    // scene-local start of line i
    voEndAt(i) {
      const S = this.voSegs || [];
      if (i == null) return this.voEnd || 0;
      const s2 = S[i];
      return s2 ? s2.end : 0;
    }
    // 0..1 "is talking" envelope at scene-local time for line i (or any line when i is null / a `who` string).
    // Uses TTS word timings; without TTS audio yet, a 4 Hz syllable estimate over the planned span.
    speaking(local, i) {
      const S = (this.voSegs || []).filter((s2, j) => i == null || j === i || s2.who === i);
      let v = 0;
      for (const s2 of S) {
        if (local < s2.at - 0.1 || local > s2.end + 0.1) continue;
        v = Math.max(v, s2.words ? speakingAt(s2.words, local - s2.at) : Math.abs(Math.sin((local - s2.at) * Math.PI * 4)));
      }
      return v;
    }
    sfx(t, name, gain = 1, freq) {
      this.video.sfx(this.start + this.time(t), name, gain, freq);
      return this;
    }
  };
  function stOff(o, i, n) {
    if (!o || !o.stagger) return 0;
    const f = typeof o.stagger === "function" ? o.stagger : ((j) => j * o.stagger);
    return f(i, n);
  }
  function toEls(target, root) {
    if (!target) return [];
    if (typeof target === "string") return [...(root || document).querySelectorAll(target)];
    if (target.length !== void 0 && !target.nodeType) return [...target];
    return [target];
  }
  function mk(tag, cls, parent, html2) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html2 != null) e.innerHTML = html2;
    if (parent) parent.appendChild(e);
    return e;
  }

  // src/authoring/formats.js
  var F = registry.formats;
  F["16:9"] = { w: 1280, h: 720, safe: { top: 56, right: 80, bottom: 64, left: 80 }, captionBottom: 28, zones: [] };
  F["1080p"] = { w: 1920, h: 1080, safe: { top: 84, right: 120, bottom: 96, left: 120 }, captionBottom: 42, zones: [] };
  F["9:16"] = {
    w: 1080,
    h: 1920,
    safe: { top: 250, right: 160, bottom: 460, left: 72 },
    captionBottom: 470,
    zones: [
      { name: "top-bar", x: 0, y: 0, w: 1080, h: 200 },
      // status bar + search/tabs
      { name: "right-rail", x: 930, y: 760, w: 150, h: 820 },
      // avatar / like / comment / share / music
      { name: "bottom-info", x: 0, y: 1580, w: 1080, h: 340 }
      // @author, description, music ticker, nav bar
    ]
  };
  F["1:1"] = { w: 1080, h: 1080, safe: { top: 80, right: 80, bottom: 96, left: 80 }, captionBottom: 44, zones: [] };
  F["4:5"] = { w: 1080, h: 1350, safe: { top: 90, right: 80, bottom: 120, left: 80 }, captionBottom: 60, zones: [] };
  F.landscape = F["16:9"];
  F.vertical = F["9:16"];
  F.square = F["1:1"];
  F.portrait = F["4:5"];
  function resolveFormat(name, w, h3) {
    const f = F[name] || null;
    if (f && !w && !h3) return JSON.parse(JSON.stringify(f));
    w = w || (f ? f.w : 1280);
    h3 = h3 || (f ? f.h : 720);
    if (f) {
      const k = w / f.w, s2 = f.safe;
      return { w, h: h3, safe: { top: s2.top * k, right: s2.right * k, bottom: s2.bottom * k, left: s2.left * k }, captionBottom: f.captionBottom * k, zones: f.zones.map((z) => ({ name: z.name, x: z.x * k, y: z.y * k, w: z.w * k, h: z.h * k })) };
    }
    const m = Math.round(Math.min(w, h3) * 0.075);
    return { w, h: h3, safe: { top: m, right: Math.round(w * 0.0625), bottom: m, left: Math.round(w * 0.0625) }, captionBottom: Math.round(h3 * 0.04), zones: [] };
  }

  // src/authoring/themes.js
  var SANS = '"Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  var MONO = '"JetBrains Mono","Noto Sans Mono CJK SC",ui-monospace,Menlo,Consolas,"Noto Sans SC",monospace';
  var T = registry.themes;
  T["tech-blue"] = {
    label: "\u79D1\u6280\u84DD\uFF08Spark / One \u5BA3\u4F20\u7247\u98CE\u683C\uFF09",
    modes: {
      dark: { bg: "#0B1020", fg: "#FFFFFF", muted: "#9AA6CC", surface: "#151B33", line: "#2A3358", accent: "#3355FF", accent2: "#7C93FF", onAccent: "#FFFFFF" },
      light: { bg: "#E8ECF4", fg: "#0B1020", muted: "#3A4468", surface: "#FFFFFF", line: "#B7BFD6", accent: "#3355FF", accent2: "#7C93FF", onAccent: "#FFFFFF" },
      accent: { bg: "#3355FF", fg: "#FFFFFF", muted: "#DDE3FF", surface: "#0B1020", line: "#6F88FF", accent: "#0B1020", accent2: "#FFFFFF", onAccent: "#FFFFFF" }
    },
    mode: "dark",
    warn: "#FF5A36",
    ok: "#2ED47A",
    yellow: "#FFC83D",
    chart: ["#3355FF", "#7C93FF", "#2ED47A", "#FFC83D", "#FF5A36", "#B6C0E2"],
    fonts: { sans: SANS, display: SANS, mono: MONO, serif: SANS },
    weight: { display: 900, title: 900, sub: 700 },
    tracking: { display: "-.05em", title: "-.02em" },
    scale: { hero: 260, h1: 84, h2: 60, h3: 36, body: 27, small: 22, label: 22, caption: 30 },
    radius: 18,
    ease: "house",
    cascade: 0.35,
    marker: "rgba(51,85,255,.35)",
    caret: "#7C93FF",
    caption: { bg: "rgba(8,11,20,.82)", fg: "#FFFFFF", karaoke: "#7C93FF" }
  };
  T.editorial = {
    label: "\u6696\u8272\u6742\u5FD7\u98CE\uFF08\u7EB8\u5F20\u3001\u886C\u7EBF\u3001\u8D6D\u7EA2\uFF09",
    modes: {
      light: { bg: "#F3ECE0", fg: "#1F1A17", muted: "#6B5E53", surface: "#FFFaf2", line: "#D8CBB8", accent: "#C8492B", accent2: "#2F5D50", onAccent: "#FFF8EE" },
      dark: { bg: "#1F1A17", fg: "#F3ECE0", muted: "#B8A999", surface: "#2B2420", line: "#4A3F37", accent: "#E0673F", accent2: "#8FB8A8", onAccent: "#1F1A17" },
      accent: { bg: "#C8492B", fg: "#FFF8EE", muted: "#F6D2C2", surface: "#1F1A17", line: "#E08A70", accent: "#1F1A17", accent2: "#FFF8EE", onAccent: "#FFF8EE" }
    },
    mode: "light",
    warn: "#C8492B",
    ok: "#2F5D50",
    yellow: "#D9A441",
    chart: ["#C8492B", "#2F5D50", "#D9A441", "#6B5E53", "#8FB8A8", "#E0673F"],
    fonts: { sans: SANS, display: '"Instrument Serif",' + SANS, mono: MONO, serif: '"Instrument Serif",' + SANS },
    weight: { display: 400, title: 800, sub: 600 },
    tracking: { display: "-.02em", title: "-.01em" },
    scale: { hero: 230, h1: 78, h2: 56, h3: 34, body: 27, small: 22, label: 20, caption: 29 },
    radius: 6,
    ease: "smooth",
    cascade: 0.4,
    marker: "rgba(217,164,65,.5)",
    caret: "#C8492B",
    caption: { bg: "rgba(31,26,23,.86)", fg: "#F3ECE0", karaoke: "#E0673F" }
  };
  T.bold = {
    label: "\u5F3A\u5BF9\u6BD4\u77ED\u89C6\u9891\u98CE\uFF08\u9ED1\u9EC4\u7C89\u3001\u8D85\u7C97\u538B\u7F29\u5B57\uFF09",
    modes: {
      dark: { bg: "#0A0A0A", fg: "#FFFFFF", muted: "#BDBDBD", surface: "#1C1C1C", line: "#333333", accent: "#FFE600", accent2: "#FF2E63", onAccent: "#0A0A0A" },
      light: { bg: "#FFE600", fg: "#0A0A0A", muted: "#3D3700", surface: "#FFFFFF", line: "#0A0A0A", accent: "#FF2E63", accent2: "#0A0A0A", onAccent: "#FFFFFF" },
      accent: { bg: "#FF2E63", fg: "#FFFFFF", muted: "#FFD3DE", surface: "#0A0A0A", line: "#FF7A9A", accent: "#FFE600", accent2: "#0A0A0A", onAccent: "#0A0A0A" }
    },
    mode: "dark",
    warn: "#FF2E63",
    ok: "#00E08A",
    yellow: "#FFE600",
    chart: ["#FFE600", "#FF2E63", "#00E08A", "#3FA9FF", "#FFFFFF", "#FF8A00"],
    fonts: { sans: SANS, display: '"Archivo",' + SANS, mono: MONO, serif: SANS, condensed: '"Anton",' + SANS },
    weight: { display: 900, title: 900, sub: 800 },
    tracking: { display: "-.03em", title: "-.02em" },
    scale: { hero: 250, h1: 96, h2: 68, h3: 40, body: 30, small: 24, label: 24, caption: 32 },
    radius: 14,
    ease: "snappy",
    cascade: 0.3,
    marker: "#FFE600",
    caret: "#FFE600",
    caption: { bg: "#0A0A0A", fg: "#FFFFFF", karaoke: "#FFE600" }
  };
  T.noir = {
    label: "\u9ED1\u767D\u6781\u7B80\uFF08\u5355\u8272 + \u4E00\u70B9\u7EA2\uFF09",
    modes: {
      dark: { bg: "#000000", fg: "#F5F5F5", muted: "#8A8A8A", surface: "#141414", line: "#2A2A2A", accent: "#FF3B30", accent2: "#F5F5F5", onAccent: "#FFFFFF" },
      light: { bg: "#F5F5F5", fg: "#000000", muted: "#666666", surface: "#FFFFFF", line: "#CCCCCC", accent: "#FF3B30", accent2: "#000000", onAccent: "#FFFFFF" },
      accent: { bg: "#FF3B30", fg: "#FFFFFF", muted: "#FFD0CC", surface: "#000000", line: "#FF8A80", accent: "#000000", accent2: "#FFFFFF", onAccent: "#FFFFFF" }
    },
    mode: "dark",
    warn: "#FF3B30",
    ok: "#34C759",
    yellow: "#FFCC00",
    chart: ["#F5F5F5", "#FF3B30", "#8A8A8A", "#FFCC00", "#34C759", "#555555"],
    fonts: { sans: SANS, display: '"Archivo",' + SANS, mono: MONO, serif: '"Instrument Serif",' + SANS },
    weight: { display: 800, title: 800, sub: 600 },
    tracking: { display: "-.04em", title: "-.02em" },
    scale: { hero: 240, h1: 80, h2: 58, h3: 34, body: 26, small: 21, label: 20, caption: 29 },
    radius: 2,
    ease: "house",
    cascade: 0.35,
    marker: "rgba(255,59,48,.45)",
    caret: "#FF3B30",
    caption: { bg: "rgba(0,0,0,.85)", fg: "#FFFFFF", karaoke: "#FF3B30" }
  };
  function resolveTheme(t) {
    if (!t) return T["tech-blue"];
    if (typeof t === "string") {
      if (!T[t]) console.warn("[vk] unknown theme", t);
      return T[t] || T["tech-blue"];
    }
    const base2 = T[t.extends || "tech-blue"];
    return deepMerge(JSON.parse(JSON.stringify(base2)), t);
  }
  function deepMerge(a, b) {
    for (const k in b) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object") deepMerge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }
  function modeVars(theme, mode) {
    const m = theme.modes[mode] || theme.modes[theme.mode];
    return {
      "--bg": m.bg,
      "--fg": m.fg,
      "--muted": m.muted,
      "--surface": m.surface,
      "--line": m.line,
      "--accent": m.accent,
      "--accent2": m.accent2,
      "--on-accent": m.onAccent,
      // colour for terminal prompts etc. drawn on --surface: accent2 unless it would vanish into the surface
      "--prompt": m.prompt || (m.accent2.toLowerCase() === m.surface.toLowerCase() ? m.muted : m.accent2)
    };
  }

  // src/runtime/css.js
  function fontFaces(base2) {
    const f = (fam, file, extra = "") => `@font-face{font-family:"${fam}";src:url("${base2}${file}") format("truetype");font-display:block;${extra}}`;
    return f("Noto Sans SC", "NotoSansSC-VF.ttf", "font-weight:100 900;") + f("JetBrains Mono", "JetBrainsMono-VF.ttf", "font-weight:100 800;") + f("Archivo", "Archivo-VF.ttf", "font-weight:100 900;font-stretch:62% 125%;") + f("Anton", "Anton-Regular.ttf", "font-weight:400;") + f("Instrument Serif", "InstrumentSerif-Regular.ttf", "font-weight:400;font-style:normal;") + f("Instrument Serif", "InstrumentSerif-Italic.ttf", "font-weight:400;font-style:italic;") + f("Ma Shan Zheng", "MaShanZheng-Regular.ttf", "font-weight:400;") + // brush calligraphy (ink theme)
    f("Noto Serif SC", "NotoSerifSC-VF.ttf", "font-weight:200 900;");
  }
  function stageCSS(v) {
    const { W, H, theme: th } = v, s2 = v.safe;
    return `
#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;transform-origin:0 0;background:#000;color:#fff;
  font-family:var(--vk-sans);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-kerning:normal}
#stage *,#stage *::before,#stage *::after{box-sizing:border-box;transition:none!important}
#stage .vk-scenes{position:absolute;inset:0;z-index:0;isolation:isolate} /* own stacking context: scene z-indexes never cover overlays/captions */
#stage .vk-scene{position:absolute;inset:0;display:none;overflow:hidden;background:var(--bg);color:var(--fg)}
#stage .vk-scene.on{display:block}
#stage .vk-cam{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#stage .vk-bg{position:absolute;inset:0;pointer-events:none}
#stage .vk-content{position:absolute;left:${s2.left}px;top:${s2.top}px;right:${s2.right}px;bottom:${s2.bottom}px;display:flex;flex-direction:column;
  justify-content:center;align-items:center;text-align:center;gap:var(--vk-gap)}
#stage .vk-content.left{align-items:flex-start;text-align:left}
#stage .vk-content.top{justify-content:flex-start}#stage .vk-content.bottom{justify-content:flex-end}
#stage .vk-content.free{display:block}
#stage .vk-abs,#stage .abs{position:absolute}
#stage .vk-canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
#stage .vk-row{display:flex;gap:var(--vk-gap);align-items:center;justify-content:center}
#stage .vk-col{display:flex;flex-direction:column;gap:calc(var(--vk-gap)*.6)}
#stage .vk-mono,#stage .mono{font-family:var(--vk-mono)}
#stage .vk-display{font-family:var(--vk-display)}
#stage .vk-hero{font-family:var(--vk-display);font-size:var(--vk-fs-hero);font-weight:${th.weight.display};line-height:1.02;letter-spacing:${th.tracking.display};margin:0}
#stage .vk-h1{font-family:var(--vk-display);font-size:var(--vk-fs-h1);font-weight:${th.weight.title};line-height:1.1;letter-spacing:${th.tracking.title};margin:0}
#stage .vk-h2{font-size:var(--vk-fs-h2);font-weight:${th.weight.title};line-height:1.14;letter-spacing:${th.tracking.title};margin:0}
#stage .vk-h3{font-size:var(--vk-fs-h3);font-weight:${th.weight.sub};line-height:1.25;margin:0}
#stage .vk-body{font-size:var(--vk-fs-body);line-height:1.55;color:var(--muted);margin:0}
#stage .vk-small{font-size:var(--vk-fs-small);line-height:1.5;color:var(--muted)}
#stage .vk-label{font-family:var(--vk-mono);font-size:var(--vk-fs-label);font-weight:600;letter-spacing:.06em;color:var(--accent2)}
#stage .vk-accent{color:var(--accent)}
#stage .vk-muted{color:var(--muted)}
#stage .vk-surface{background:var(--surface);border:1px solid var(--line);border-radius:var(--vk-radius)}
#stage .vk-mark{background-image:linear-gradient(var(--vk-marker),var(--vk-marker));background-repeat:no-repeat;background-position:0 88%;background-size:var(--p,0%) 40%;padding:0 .08em;margin:0 -.08em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
#stage .vk-ul{background-image:linear-gradient(var(--accent),var(--accent));background-repeat:no-repeat;background-position:0 100%;background-size:var(--p,0%) .09em;padding-bottom:.06em}
#stage .vk-em{color:var(--accent)}
.vk-wordwrap{display:inline-block;white-space:nowrap}.vk-ch{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .02em .14em;margin:0 -.02em -.14em}
.vk-chi,.vk-word,.vk-c{display:inline-block;white-space:pre}
.vk-flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:40;pointer-events:none}
.vk-ov{position:absolute;left:0;top:0;width:100%;height:100%;z-index:41;pointer-events:none}
.vk-caret::after{content:"\\258D";color:var(--vk-caret);margin-left:2px}
.vk-cap{position:absolute;left:50%;transform:translateX(-50%);text-align:center;opacity:0;z-index:50;pointer-events:none;
  bottom:var(--cap-bottom);font-size:var(--cap-size);max-width:${W - s2.left - s2.right}px;background:${th.caption.bg};color:${th.caption.fg};font-family:${th.caption.font || "var(--vk-sans)"};
  font-weight:${th.caption.weight || 700};padding:${th.caption.padding || ".3em .8em"};border-radius:${th.caption.radius != null ? th.caption.radius : 12}px;line-height:1.35;white-space:${W < H ? "normal;width:max-content" : "nowrap"}${th.caption.border ? `;border-left:${th.caption.border}` : ""}${th.caption.tracking ? `;letter-spacing:${th.caption.tracking}` : ""}${th.caption.shadow ? `;box-shadow:${th.caption.shadow}` : ""}}
${W < H ? `.vk-cap{left:${s2.left}px;right:${s2.right}px;transform:none;margin:0 auto;max-width:${W - s2.left - s2.right}px}` : ""}
.vk-cap .kw{transition:none}.vk-cap .kw.on{color:${th.caption.karaoke}}
.vk-cap[data-style=sweep] .kw{color:transparent;-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(90deg,${th.caption.karaoke} calc(var(--p,0)*100%),${th.caption.fg} calc(var(--p,0)*100% + .5px))}
.vk-cap[data-style=pop] .kw{display:inline-block;transform:scale(calc(1 + .12*var(--p,0)*(1 - var(--p,0))*4))}.vk-cap[data-style=pop] .kw.on{color:${th.caption.karaoke}}
html.vk-render,html.vk-render body{margin:0;padding:0;background:#000;overflow:hidden;width:${W}px;height:${H}px}
.vk-wrap{max-width:${W < H ? 480 : 1120}px;margin:0 auto;padding:20px 16px 32px;font-family:var(--vk-sans)}
.vk-wrap h1{font-size:18px;margin:0 0 12px}.vk-wrap h1 small{font-weight:400;opacity:.6;margin-left:8px}
.vk-frame{position:relative;width:100%;aspect-ratio:${W}/${H};background:#000;border-radius:14px;overflow:hidden;cursor:pointer}
.vk-frame:fullscreen{border-radius:0;aspect-ratio:auto}
.vk-controls{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:14px}
.vk-controls button{font:inherit;background:#fff;color:#0B1020;border:1px solid #D3D8E6;border-radius:10px;padding:7px 14px;cursor:pointer}
.vk-controls button.vk-play{background:#3355FF;border-color:#3355FF;color:#fff;font-weight:700;min-width:70px}
.vk-seek{position:relative;flex:1;min-width:0}.vk-seek input{width:100%;accent-color:#3355FF}
.vk-ticks{position:absolute;left:0;right:0;top:-6px;height:6px;pointer-events:none}.vk-ticks i{position:absolute;top:0;width:2px;height:6px;background:#8A94B8}
.vk-time{font-family:var(--vk-mono);min-width:110px;text-align:right;opacity:.7}
.vk-scenelist{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;font-size:12px}.vk-scenelist button{font:inherit;padding:3px 8px;border-radius:8px;border:1px solid #D3D8E6;background:transparent;color:inherit;cursor:pointer}
.vk-scenelist button.cur{background:#3355FF;color:#fff;border-color:#3355FF}
.vk-safe{position:absolute;inset:0;pointer-events:none;z-index:60;display:none}.vk-safe.show{display:block}
@media (prefers-color-scheme:dark){body{background:#080B14;color:#E7EBFA}.vk-controls button{background:#111729;color:#E7EBFA;border-color:#222A45}}`;
  }

  // src/audio/synth.js
  var synth_exports = {};
  __export(synth_exports, {
    biquad: () => biquad,
    bubbles: () => bubbles,
    croak: () => croak,
    dbAmp: () => dbAmp,
    drop: () => drop,
    envAD: () => envAD,
    flute: () => flute,
    gong: () => gong,
    mixInto: () => mixInto,
    mixStereo: () => mixStereo,
    normPeak: () => normPeak,
    penta: () => penta,
    pluck: () => pluck,
    quack: () => quack,
    reverb: () => reverb,
    splash: () => splash,
    wavBytes: () => wavBytes,
    woodfish: () => woodfish
  });
  var TAU = Math.PI * 2;
  var dbAmp = (db) => Math.pow(10, db / 20);
  function biquad(type, f, q = 0.707, sr = 48e3, gainDb = 0) {
    const w = TAU * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), s2 = Math.sin(w), al = s2 / (2 * q), A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === "lowpass") {
      b0 = (1 - c) / 2;
      b1 = 1 - c;
      b2 = b0;
      a0 = 1 + al;
      a1 = -2 * c;
      a2 = 1 - al;
    } else if (type === "highpass") {
      b0 = (1 + c) / 2;
      b1 = -(1 + c);
      b2 = b0;
      a0 = 1 + al;
      a1 = -2 * c;
      a2 = 1 - al;
    } else if (type === "bandpass") {
      b0 = al;
      b1 = 0;
      b2 = -al;
      a0 = 1 + al;
      a1 = -2 * c;
      a2 = 1 - al;
    } else if (type === "notch") {
      b0 = 1;
      b1 = -2 * c;
      b2 = 1;
      a0 = 1 + al;
      a1 = -2 * c;
      a2 = 1 - al;
    } else {
      b0 = 1 + al * A;
      b1 = -2 * c;
      b2 = 1 - al * A;
      a0 = 1 + al / A;
      a1 = -2 * c;
      a2 = 1 - al / A;
    }
    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    a1 /= a0;
    a2 /= a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return (x) => {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    };
  }
  var envAD = (t, a, d) => t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d);
  function pluck(sr, f, dur, o = {}) {
    const n = Math.max(1, Math.floor(sr * dur)), out = new Float32Array(n), rnd = mulberry32(o.seed || 7);
    const decay = o.decay || 2.5, bright = o.bright != null ? o.bright : 0.45, pos = o.pos || 0.18;
    const maxD = Math.ceil(sr / Math.max(20, f * Math.pow(2, Math.min(0, o.slide && o.slide.to || 0) / 12) * 0.9)) + 4;
    const buf = new Float32Array(maxD + 2);
    let w = 0;
    const D0 = sr / f, exc = Math.floor(D0);
    const burst = new Float32Array(exc), lp = biquad("lowpass", 800 + 7e3 * bright, 0.7, sr), P = Math.max(1, Math.round(exc * pos));
    for (let i = 0; i < exc; i++) burst[i] = lp(rnd() * 2 - 1);
    for (let i = exc - 1; i >= P; i--) burst[i] -= burst[i - P];
    const g = Math.pow(10, -3 / (f * decay));
    let prev = 0, dcx = 0, dcy = 0;
    const body = o.body ? [biquad("peak", 220, 1.2, sr, 5), biquad("peak", 560, 2, sr, 3)] : null;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let semi = 0;
      if (o.slide) {
        const s3 = o.slide, p = Math.min(1, Math.max(0, (t - s3.at) / (s3.d || 0.25)));
        semi += s3.to * p * p * (3 - 2 * p);
      }
      if (o.vib) {
        const v = o.vib, amt2 = Math.min(1, Math.max(0, (t - (v.delay || 0.2)) / 0.3));
        semi += v.depth * amt2 * Math.sin(TAU * v.rate * t);
      }
      const D = Math.min(maxD - 1, Math.max(2, sr / (f * Math.pow(2, semi / 12)) - 0.5));
      let r = w - D;
      while (r < 0) r += maxD;
      const i0 = Math.floor(r), fr = r - i0, a = buf[i0 % maxD], b = buf[(i0 + 1) % maxD];
      const d = a + (b - a) * fr;
      const s2 = g * ((1 - bright * 0.5) * 0.5 * (d + prev) + bright * 0.5 * d);
      prev = d;
      const x = (i < exc ? burst[i] : 0) + s2;
      buf[w] = x;
      w = (w + 1) % maxD;
      const y = x - dcx + 0.995 * dcy;
      dcx = x;
      dcy = y;
      out[i] = body ? body[1](body[0](y)) * 0.8 : y;
    }
    const fade = Math.min(n, Math.floor(sr * 0.02));
    for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
    return normPeak(out, o.peak != null ? o.peak : 0.9);
  }
  function flute(sr, f, dur, o = {}) {
    const n = Math.max(1, Math.floor(sr * dur)), out = new Float32Array(n), rnd = mulberry32(o.seed || 11);
    const at = o.attack || 0.12, rel = o.release || 0.25, H = o.harm || [1, 0.32, 0.12, 0.05], br = o.breath != null ? o.breath : 0.25;
    const vib = o.vib || { rate: 5.2, depth: 0.22 }, bp = biquad("bandpass", f * 2, 1.4, sr), bp2 = biquad("bandpass", f * 4, 2, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, e = Math.min(1, t / at) * Math.min(1, (dur - t) / rel);
      const va = Math.min(1, Math.max(0, (t - 0.25) / 0.4)), semi = vib.depth * va * Math.sin(TAU * vib.rate * t) + (o.bend ? o.bend * Math.max(0, 1 - t / 0.12) : 0);
      ph += TAU * f * Math.pow(2, semi / 12) / sr;
      let s2 = 0;
      for (let k = 0; k < H.length; k++) s2 += H[k] * Math.sin(ph * (k + 1));
      const nz = rnd() * 2 - 1, breath = (bp(nz) * 1.5 + bp2(nz) * 0.5) * (br * (0.4 + 0.6 * Math.exp(-t / at * 1.5)));
      out[i] = (s2 * 0.6 + breath) * Math.max(0, e);
    }
    return normPeak(out, o.peak != null ? o.peak : 0.8);
  }
  function drop(sr, o = {}) {
    const f0 = o.f || 700, dur = o.dur || 0.18, n = Math.floor(sr * dur), out = new Float32Array(n), rnd = mulberry32(o.seed || 3);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, f = f0 * (1 + 1.8 * (1 - Math.exp(-t / 0.018)));
      ph += TAU * f / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.045) + (i < 40 ? (rnd() - 0.5) * 0.6 * (1 - i / 40) : 0);
    }
    return normPeak(out, o.peak || 0.8);
  }
  function bubbles(sr, o = {}) {
    const k = o.count || 5, dur = o.dur || 0.6, out = new Float32Array(Math.floor(sr * dur)), rnd = mulberry32(o.seed || 9);
    for (let j = 0; j < k; j++) {
      const d = drop(sr, { f: 900 + rnd() * 900, dur: 0.09, seed: j + 1, peak: 0.5 + rnd() * 0.4 });
      mixInto(out, d, Math.floor(j / k * dur * 0.8 * sr + rnd() * 1500), 1);
    }
    return normPeak(out, o.peak || 0.7);
  }
  function splash(sr, o = {}) {
    const dur = o.dur || 0.45, n = Math.floor(sr * dur), out = new Float32Array(n), rnd = mulberry32(o.seed || 5);
    const bp = biquad("bandpass", o.f || 1600, 0.7, sr), lp = biquad("lowpass", 5e3, 0.7, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      out[i] = lp(bp(rnd() * 2 - 1)) * envAD(t, 0.012, dur / 4) * (1 + 0.5 * Math.sin(TAU * 13 * t));
    }
    return normPeak(out, o.peak || 0.7);
  }
  function croak(sr, o = {}) {
    const dur = o.dur || 0.32, n = Math.floor(sr * dur), out = new Float32Array(n), rate = o.rate || 38, fc = o.f || 520;
    const P = Math.floor(dur * rate);
    for (let k = 0; k < P; k++) {
      const t0 = k / rate, amp = Math.sin(Math.PI * (k + 0.5) / P);
      for (let i = Math.floor(t0 * sr); i < Math.min(n, Math.floor((t0 + 0.02) * sr)); i++) {
        const tau = i / sr - t0;
        out[i] += amp * (Math.sin(TAU * fc * tau) * 0.8 + Math.sin(TAU * fc * 2.1 * tau) * 0.3 + Math.sin(TAU * 140 * tau) * 0.5) * Math.exp(-tau / 45e-4);
      }
    }
    const lp = biquad("lowpass", 2200, 0.8, sr);
    for (let i = 0; i < n; i++) out[i] = lp(out[i]);
    return normPeak(out, o.peak || 0.85);
  }
  function quack(sr, o = {}) {
    const dur = o.dur || 0.24, n = Math.floor(sr * dur), out = new Float32Array(n), f0 = o.f0 || 260, f1 = o.f1 || 190;
    const F2 = (o.formants || [1050, 2400]).map((f, j) => biquad("bandpass", f, j ? 5 : 4, sr)), hp = biquad("highpass", 300, 0.7, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, p = t / dur, f = f0 + (f1 - f0) * p + 8 * Math.sin(TAU * 30 * t);
      ph = (ph + f / sr) % 1;
      const saw = 2 * ph - 1;
      const e = Math.min(1, t / 0.015) * Math.pow(Math.max(0, 1 - p), 0.6);
      out[i] = hp(F2.reduce((m, fl, j) => m + fl(saw) * (j ? 0.6 : 1), 0)) * e;
    }
    return normPeak(out, o.peak || 0.8);
  }
  function woodfish(sr, o = {}) {
    const dur = o.dur || 0.22, n = Math.floor(sr * dur), out = new Float32Array(n), f = o.f || 420;
    let ph = 0;
    const bp = biquad("bandpass", f * 2.7, 6, sr), rnd = mulberry32(o.seed || 2);
    for (let i = 0; i < n; i++) {
      const t = i / sr, ff = f * (1 - 0.45 * Math.min(1, t / 0.08));
      ph += TAU * ff / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.045) + bp(rnd() * 2 - 1) * Math.exp(-t / 6e-3) * 2;
    }
    return normPeak(out, o.peak || 0.8);
  }
  function gong(sr, o = {}) {
    const dur = o.dur || 4, n = Math.floor(sr * dur), out = new Float32Array(n), f = o.f || 110;
    const parts = [[1, 1, 3.2], [2.01, 0.5, 2.4], [2.98, 0.25, 1.6], [4.16, 0.12, 1.1], [5.43, 0.06, 0.8]];
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let s2 = 0;
      for (const [m, a, d] of parts) s2 += a * Math.sin(TAU * f * m * t + m) * Math.exp(-t / d) * (1 + 0.15 * Math.sin(TAU * 0.7 * m * t));
      out[i] = s2 * Math.min(1, t / 0.01);
    }
    return normPeak(out, o.peak || 0.8);
  }
  function normPeak(x, peak = 0.9) {
    let m = 1e-9;
    for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
    const g = peak / m;
    for (let i = 0; i < x.length; i++) x[i] *= g;
    return x;
  }
  function mixInto(dst, src2, at, gain = 1) {
    const a = Math.max(0, at | 0);
    for (let i = 0; i < src2.length && a + i < dst.length; i++) dst[a + i] += src2[i] * gain;
    return dst;
  }
  function mixStereo(L, R, src2, at, gain = 1, pan = 0) {
    const a = (pan + 1) * Math.PI / 4, gl2 = Math.cos(a) * gain, gr = Math.sin(a) * gain, s2 = Math.max(0, at | 0);
    for (let i = 0; i < src2.length && s2 + i < L.length; i++) {
      L[s2 + i] += src2[i] * gl2;
      R[s2 + i] += src2[i] * gr;
    }
  }
  function reverb([L, R], sr, o = {}) {
    const room = o.room != null ? o.room : 0.82, damp = o.damp != null ? o.damp : 0.35, wet = o.wet != null ? o.wet : 0.28, k = sr / 44100;
    const chan = (x, spread) => {
      const combs = [1116, 1188, 1277, 1356].map((d) => ({ b: new Float32Array(Math.round((d + spread) * k)), i: 0, lp: 0 }));
      const aps = [556, 441].map((d) => ({ b: new Float32Array(Math.round((d + spread) * k)), i: 0 }));
      const y = new Float32Array(x.length);
      for (let n = 0; n < x.length; n++) {
        const inp = x[n] * 0.25;
        let s2 = 0;
        for (const c of combs) {
          const o2 = c.b[c.i];
          c.lp = o2 * (1 - damp) + c.lp * damp;
          c.b[c.i] = inp + c.lp * room;
          c.i = (c.i + 1) % c.b.length;
          s2 += o2;
        }
        for (const a of aps) {
          const o2 = a.b[a.i], v = -s2 + o2;
          a.b[a.i] = s2 + o2 * 0.5;
          a.i = (a.i + 1) % a.b.length;
          s2 = v;
        }
        y[n] = x[n] * (1 - wet * 0.5) + s2 * wet;
      }
      return y;
    };
    return [chan(L, 0), chan(R, 23)];
  }
  function wavBytes(chs, sr) {
    const n = chs[0].length, c = chs.length, dv = new DataView(new ArrayBuffer(44 + n * c * 2)), w = (o, s2) => {
      for (let i = 0; i < s2.length; i++) dv.setUint8(o + i, s2.charCodeAt(i));
    };
    w(0, "RIFF");
    dv.setUint32(4, 36 + n * c * 2, true);
    w(8, "WAVE");
    w(12, "fmt ");
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, c, true);
    dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * c * 2, true);
    dv.setUint16(32, c * 2, true);
    dv.setUint16(34, 16, true);
    w(36, "data");
    dv.setUint32(40, n * c * 2, true);
    for (let i = 0; i < n; i++) for (let j = 0; j < c; j++) dv.setInt16(44 + (i * c + j) * 2, Math.round(Math.max(-1, Math.min(1, chs[j][i])) * 32767), true);
    return new Uint8Array(dv.buffer);
  }
  function penta(root, degree) {
    const S = [0, 2, 4, 7, 9], o = Math.floor(degree / 5), d = (degree % 5 + 5) % 5;
    return root * Math.pow(2, o + S[d] / 12);
  }

  // src/audio/score.js
  var V = registry.sounds;
  V.kick = (k, t, v) => k.tone(t, "sine", 150, 42, 0.4, 0.9 * v);
  V.bass = (k, t, v, f) => k.tone(t, "triangle", f || 55, 0, 0.5, 0.5 * v);
  V.tick = (k, t, v) => k.noise(t, 0.03, "bandpass", 3200, 2, 0.35 * v);
  V.hat = (k, t, v) => k.noise(t, 0.05, "highpass", 7e3, 1, 0.18 * v);
  V.pop = (k, t, v) => k.tone(t, "sine", 700, 260, 0.12, 0.35 * v);
  V.chime = (k, t, v, f) => {
    f = f || 880;
    k.tone(t, "sine", f, 0, 1.4, 0.18 * v);
    k.tone(t, "sine", f * 1.5, 0, 1, 0.08 * v);
  };
  V.whoosh = (k, t, v) => {
    const st = Math.max(0, t - 0.35);
    const fl = k.noise(st, 0.5, "bandpass", 500, 0.8, 0.25 * v, 0.3);
    fl.frequency.setValueAtTime(400, st);
    fl.frequency.exponentialRampToValueAtTime(3500, st + 0.45);
  };
  V.riser = (k, t, v) => {
    const st = Math.max(0, t - 1.2);
    const fl = k.noise(st, 1.2, "bandpass", 300, 1.2, 0.2 * v, 1);
    fl.frequency.setValueAtTime(300, st);
    fl.frequency.exponentialRampToValueAtTime(6e3, st + 1.2);
  };
  V.snap = (k, t, v) => {
    k.noise(t, 0.06, "bandpass", 1800, 3, 0.5 * v);
    k.tone(t, "square", 1200, 600, 0.03, 0.08 * v);
  };
  V.pluck = (k, t, v, f) => k.buf(t, "pluck" + (f || 293.66), () => pluck(k.sr, f || 293.66, 3, { body: true, decay: 2.6, bright: 0.4 }), 0.5 * v);
  V.flute = (k, t, v, f) => k.buf(t, "flute" + (f || 587.33), () => flute(k.sr, f || 587.33, 1.6), 0.32 * v);
  V.drop = (k, t, v, f) => k.buf(t, "drop" + (f || 700), () => drop(k.sr, { f: f || 700 }), 0.45 * v);
  V.bubbles = (k, t, v) => k.buf(t, "bubbles", () => bubbles(k.sr), 0.35 * v);
  V.splash = (k, t, v, f) => k.buf(t, "splash" + (f || 1600), () => splash(k.sr, { f: f || 1600 }), 0.45 * v);
  V.ripple = (k, t, v) => k.buf(t, "ripple", () => splash(k.sr, { f: 900, dur: 0.7, peak: 0.5 }), 0.3 * v);
  V.croak = (k, t, v, f) => k.buf(t, "croak" + (f || 520), () => croak(k.sr, { f: f || 520 }), 0.55 * v);
  V.quack = (k, t, v, f) => k.buf(t, "quack" + (f || 260), () => quack(k.sr, { f0: f || 260, f1: (f || 260) * 0.72 }), 0.45 * v);
  V.honk = (k, t, v, f) => k.buf(t, "honk" + (f || 380), () => quack(k.sr, { f0: f || 380, f1: (f || 380) * 0.8, dur: 0.34, formants: [800, 1900] }), 0.45 * v);
  V.woodfish = (k, t, v, f) => k.buf(t, "woodfish" + (f || 420), () => woodfish(k.sr, { f: f || 420 }), 0.5 * v);
  V.gong = (k, t, v, f) => k.buf(t, "gong" + (f || 110), () => gong(k.sr, { f: f || 110 }), 0.4 * v);
  function makeScore(events, opts = {}, video) {
    return function(ac) {
      const dur = ac.length / ac.sampleRate, out = ac.createDynamicsCompressor();
      out.threshold.value = -12;
      out.ratio.value = 4;
      out.connect(ac.destination);
      const rnd = mulberry32(77), nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
      const env2 = (g, t, a, peak, dcy) => {
        g.gain.setValueAtTime(1e-4, t);
        g.gain.exponentialRampToValueAtTime(Math.max(peak, 1e-4), t + a);
        g.gain.exponentialRampToValueAtTime(1e-4, t + a + dcy);
      };
      const kit = {
        ac,
        out,
        dur,
        noise(t, len2, type, freq, q, peak, a) {
          const s2 = ac.createBufferSource();
          s2.buffer = nb;
          const f = ac.createBiquadFilter();
          f.type = type;
          f.frequency.value = freq;
          f.Q.value = q || 1;
          const g = ac.createGain();
          env2(g, t, a || 2e-3, peak, len2);
          s2.connect(f);
          f.connect(g);
          g.connect(out);
          s2.start(t, rnd() * 0.5, len2 + (a || 0) + 0.05);
          return f;
        },
        sr: ac.sampleRate,
        cache: /* @__PURE__ */ new Map(),
        // play a synthesised mono buffer (key caches identical sounds); pan −1..1
        buf(t, key, make, gain = 1, pan = 0) {
          let b = this.cache.get(key);
          if (!b) {
            const x = make();
            b = ac.createBuffer(1, x.length, ac.sampleRate);
            b.copyToChannel(x, 0);
            this.cache.set(key, b);
          }
          const s2 = ac.createBufferSource();
          s2.buffer = b;
          const g = ac.createGain();
          g.gain.value = gain;
          s2.connect(g);
          if (pan && ac.createStereoPanner) {
            const p = ac.createStereoPanner();
            p.pan.value = pan;
            g.connect(p);
            p.connect(out);
          } else g.connect(out);
          s2.start(t);
          return s2;
        },
        tone(t, type, f0, f1, len2, peak) {
          const o = ac.createOscillator();
          o.type = type;
          o.frequency.setValueAtTime(f0, t);
          if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + len2 * 0.5);
          const g = ac.createGain();
          env2(g, t, 3e-3, peak, len2);
          o.connect(g);
          g.connect(out);
          o.start(t);
          o.stop(t + len2 + 0.05);
        }
      };
      if (opts.pad) opts.pad.forEach((f) => {
        const o = ac.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const g = ac.createGain();
        const pg = opts.padGain || 0.04;
        g.gain.setValueAtTime(1e-4, 0);
        g.gain.exponentialRampToValueAtTime(pg, 1.5);
        g.gain.setValueAtTime(pg, Math.max(1.6, dur - 1.5));
        g.gain.exponentialRampToValueAtTime(1e-4, dur);
        o.connect(g);
        g.connect(out);
        o.start(0);
        o.stop(dur);
      });
      if (opts.metronome && video && video.beats.active) for (let b = 0; video.beats.at(b) < dur; b++) V.hat(kit, video.beats.at(b), b % 4 ? 0.5 : 1);
      if (opts.beatKick && video && video.beats.active) {
        for (let b = 0; video.beats.at(b) < dur; b++) if (b % (opts.beatKick === true ? 1 : opts.beatKick) === 0) V.kick(kit, video.beats.at(b), 0.7);
      }
      events.forEach((e) => {
        const fn = V[e[1]];
        if (fn && e[0] < dur) fn(kit, Math.max(0, e[0]), e[2] == null ? 1 : e[2], e[3]);
      });
    };
  }

  // src/runtime/preview.js
  function buildPreviewUI(v, Q2) {
    const { stage, W, H } = v, DUR = v.duration, FPS = v.fps;
    const fmt = (s3) => {
      s3 = Math.max(0, s3);
      const m = Math.floor(s3 / 60), r = s3 - m * 60;
      return m + ":" + (r < 10 ? "0" : "") + r.toFixed(1);
    };
    const wrap = document.createElement("div");
    wrap.className = "vk-wrap";
    const h1 = document.createElement("h1");
    h1.innerHTML = (v.cfg.title || document.title || "vidkit") + `<small>${DUR.toFixed(1)}s \xB7 ${W}\xD7${H} \xB7 ${FPS}fps \xB7 ${v.cfg.theme || "tech-blue"}</small>`;
    const frame = document.createElement("div");
    frame.className = "vk-frame";
    frame.title = "\u70B9\u51FB\u64AD\u653E/\u6682\u505C (Space)";
    stage.parentNode.insertBefore(wrap, stage);
    wrap.appendChild(h1);
    wrap.appendChild(frame);
    frame.appendChild(stage);
    const safe = document.createElement("div");
    safe.className = "vk-safe";
    const s2 = v.safe;
    safe.innerHTML = `<div style="position:absolute;left:${s2.left}px;top:${s2.top}px;right:${s2.right}px;bottom:${s2.bottom}px;outline:2px dashed rgba(0,255,160,.9)"></div>` + v.zones.map((z) => `<div style="position:absolute;left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px;background:rgba(255,40,80,.28);outline:1px solid rgba(255,40,80,.9);font:600 20px monospace;color:#fff;padding:6px">${z.name}</div>`).join("");
    stage.appendChild(safe);
    const ctr = document.createElement("div");
    ctr.className = "vk-controls";
    ctr.innerHTML = '<button class="vk-play" type="button">\u64AD\u653E</button><div class="vk-seek"><div class="vk-ticks"></div><input type="range" min="0" step="1" aria-label="\u8FDB\u5EA6"></div><span class="vk-time"></span><button class="vk-cc" type="button">\u5B57\u5E55</button><button class="vk-sa" type="button">\u5B89\u5168\u533A</button><button class="vk-fs" type="button">\u5168\u5C4F</button>';
    wrap.appendChild(ctr);
    const list2 = document.createElement("div");
    list2.className = "vk-scenelist";
    list2.innerHTML = v.scenes.map((sc, i) => `<button type="button" data-i="${i}">${i + 1}. ${sc.name}</button>`).join("");
    wrap.appendChild(list2);
    ctr.querySelector(".vk-ticks").innerHTML = v.scenes.map((sc) => `<i style="left:${(sc.start / DUR * 100).toFixed(2)}%"></i>`).join("");
    const play = ctr.querySelector(".vk-play"), seek = ctr.querySelector("input"), time = ctr.querySelector(".vk-time");
    seek.max = Math.round(DUR * 100);
    const key = "vk-t:" + location.pathname;
    let t = Q2.get("t") != null ? +Q2.get("t") : +sessionStorage.getItem(key) || 0, last = 0;
    let scoreBuf = null, actx = null, src2 = null;
    const stopScore = () => {
      if (src2) {
        try {
          src2.stop();
        } catch (e) {
        }
        src2 = null;
      }
    };
    function playScore() {
      if (!window.SCORE || v.audioEl) return;
      try {
        actx = actx || new AudioContext();
      } catch (e) {
        return;
      }
      stopScore();
      const start = () => {
        if (!v.playing) return;
        src2 = actx.createBufferSource();
        src2.buffer = scoreBuf;
        src2.connect(actx.destination);
        src2.start(0, Math.min(t, DUR - 0.01));
      };
      if (scoreBuf) start();
      else {
        const oac = new OfflineAudioContext(2, Math.ceil(48e3 * DUR), 48e3);
        window.SCORE(oac);
        oac.startRendering().then((b) => {
          scoreBuf = b;
          start();
        });
      }
    }
    function setPlaying(p) {
      v.playing = p;
      play.textContent = p ? "\u6682\u505C" : t >= DUR - 0.05 ? "\u91CD\u64AD" : "\u64AD\u653E";
      if (v.audioEl) {
        if (p) {
          v.audioEl.currentTime = t + (v.musicStart || 0);
          v.audioEl.play().catch(() => {
          });
        } else v.audioEl.pause();
      }
      if (!p && v.voiceEls) v.voiceEls.forEach((x) => x.a.pause());
      if (p) playScore();
      else stopScore();
    }
    const toggle = () => {
      if (!v.playing && t >= DUR - 0.05) t = 0;
      setPlaying(!v.playing);
    };
    const go = (nt) => {
      t = Math.max(0, Math.min(DUR - 1e-3, nt));
      if (v.audioEl) v.audioEl.currentTime = t + (v.musicStart || 0);
      if (v.voiceEls) v.voiceEls.forEach((x) => x.a.pause());
      if (v.playing) playScore();
      v.render(t);
    };
    const syncVoices = () => {
      if (!v.voiceEls) return;
      v.voiceEls.forEach((x) => {
        const lt = t - x.t, on = v.playing && lt >= 0 && lt < x.dur;
        if (on && x.a.paused) {
          x.a.currentTime = lt;
          x.a.volume = Math.min(1, x.gain);
          x.a.play().catch(() => {
          });
        } else if (!on && !x.a.paused) x.a.pause();
      });
      if (v.audioEl) v.audioEl.volume = Math.min(1, (v.musicGain || 1) * (v.voiceEls.some((x) => !x.a.paused) ? 0.35 : 1));
    };
    function tick(now) {
      const dt = last ? (now - last) / 1e3 : 0;
      last = now;
      if (v.playing) {
        t += Math.min(dt, 0.1);
        if (t >= DUR) {
          t = DUR - 1e-3;
          setPlaying(false);
        }
        v.render(t);
      }
      syncVoices();
      requestAnimationFrame(tick);
    }
    play.onclick = (e) => {
      e.stopPropagation();
      toggle();
    };
    frame.onclick = toggle;
    seek.oninput = () => go(+seek.value / 100);
    list2.onclick = (e) => {
      const b = e.target.closest("button");
      if (b) go(v.scenes[+b.dataset.i].start + 1e-3);
    };
    ctr.querySelector(".vk-cc").onclick = () => {
      v.ccOn = !v.ccOn;
      v.render(t);
    };
    ctr.querySelector(".vk-sa").onclick = () => safe.classList.toggle("show");
    ctr.querySelector(".vk-fs").onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else frame.requestFullscreen && frame.requestFullscreen();
    };
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" && e.key !== " ") return;
      const k = e.key;
      if (k === " ") {
        e.preventDefault();
        toggle();
      } else if (k === "ArrowRight") go(t + (e.shiftKey ? 5 : 1));
      else if (k === "ArrowLeft") go(t - (e.shiftKey ? 5 : 1));
      else if (k === ".") go(t + 1 / FPS);
      else if (k === ",") go(t - 1 / FPS);
      else if (k === "Home") go(0);
      else if (k === "f") ctr.querySelector(".vk-fs").click();
      else if (k === "c") ctr.querySelector(".vk-cc").click();
      else if (k === "s") safe.classList.toggle("show");
    });
    const fit = () => {
      const w = frame.clientWidth, hh = frame.clientHeight, sc = Math.min(w / W, hh / H);
      stage.style.transform = `translate(${(w - W * sc) / 2}px,${(hh - H * sc) / 2}px) scale(${sc})`;
    };
    window.addEventListener("resize", fit);
    document.addEventListener("fullscreenchange", fit);
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(frame);
    fit();
    let lastSave = 0;
    const ui = { update(tt) {
      seek.value = Math.round(tt * 100);
      time.textContent = fmt(tt) + " / " + fmt(DUR);
      const cur = v.scenes.findLastIndex((sc) => tt >= sc.start);
      [...list2.children].forEach((b, i) => b.classList.toggle("cur", i === cur));
      if (Math.abs(tt - lastSave) > 0.2) {
        lastSave = tt;
        sessionStorage.setItem(key, tt.toFixed(2));
      }
    } };
    v.render(t);
    const auto = Q2.get("autoplay") === "1";
    window.__ready.then(() => {
      v.render(t);
      if (auto) setPlaying(true);
    });
    requestAnimationFrame(tick);
    return ui;
  }

  // src/runtime/qa.js
  function visibleText(stage) {
    const out = [], tw = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) {
      const n = tw.currentNode, s2 = n.textContent.trim();
      if (!s2) continue;
      let ok = true;
      for (let e = n.parentElement; e && e !== stage; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) {
          ok = false;
          break;
        }
      }
      if (ok) out.push((/vk-(chi|c|word)\b/.test(n.parentElement.className) ? "\0" : " ") + s2);
    }
    return out.join("").replace(/ ?\u0000/g, "").replace(/\s+/g, " ").trim();
  }
  function runQA(v) {
    const { stage, W, H } = v, issues = [], sr = stage.getBoundingClientRect(), sx = sr.width / W;
    const R = (el2) => {
      const r = el2.getBoundingClientRect();
      return { l: (r.left - sr.left) / sx, t: (r.top - sr.top) / sx, r: (r.right - sr.left) / sx, b: (r.bottom - sr.top) / sx, w: r.width / sx, h: r.height / sx };
    };
    const vis = (el2) => {
      for (let e = el2; e && e !== stage; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false;
      }
      return true;
    };
    const label2 = (el2) => {
      const tx = (el2.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
      const cls = typeof el2.className === "string" && el2.className.trim() ? "." + el2.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      return el2.tagName.toLowerCase() + cls + (tx ? ` "${tx}"` : "");
    };
    const textRects = (el2) => {
      const out = [], fs = parseFloat(getComputedStyle(el2).fontSize) || 16;
      el2.childNodes.forEach((n) => {
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        const rg = document.createRange();
        rg.selectNodeContents(n);
        [...rg.getClientRects()].forEach((r) => {
          if (r.width <= 1 || r.height <= 1) return;
          const cy = (r.top + r.bottom) / 2 / sx - sr.top / sx + fs * 0.06, hh = Math.min(r.height / sx, fs * 0.9) / 2;
          out.push({ l: (r.left - sr.left) / sx, t: cy - hh, r: (r.right - sr.left) / sx, b: cy + hh });
        });
      });
      return out;
    };
    const texts = [], s2 = v.safe, capEl = v.capEl;
    const nodes = [...stage.querySelectorAll(".vk-scene.on *")].concat(capEl ? [capEl] : []);
    nodes.forEach((el2) => {
      if (el2.closest('[data-qa="ignore"],.vk-bleed,.vk-safe') || el2.closest("svg") && el2.tagName.toLowerCase() !== "svg") return;
      if (!vis(el2)) return;
      const r = R(el2);
      if (r.w < 1 || r.h < 1) return;
      const inCam = !!el2.closest(".vk-cam") && hasCamMotion(el2);
      if (!inCam && (r.l < -1 || r.t < -1 || r.r > W + 1 || r.b > H + 1) && !el2.closest(".vk-bg")) issues.push({ type: "out-of-frame", el: label2(el2), level: "warn" });
      const tr = textRects(el2);
      if (!tr.length) return;
      const cs = getComputedStyle(el2);
      if (el2.scrollWidth > el2.clientWidth + 4 && el2.clientWidth > 0 && cs.display !== "inline" && !/vk-(ch|wordwrap|stack-line)/.test(el2.className)) issues.push({ type: "text-overflow-x", el: label2(el2), scrollW: el2.scrollWidth, clientW: el2.clientWidth });
      if (el2.scrollHeight > el2.clientHeight + 4 && el2.clientHeight > 0 && cs.display !== "inline" && cs.overflow !== "visible" && !/vk-(ch|stack-line)/.test(el2.className)) issues.push({ type: "text-overflow-y", el: label2(el2) });
      if (!inCam && el2 !== capEl && tr.some((q) => q.l < s2.left - 1 || q.r > W - s2.right + 1 || q.t < s2.top - 1 || q.b > H - s2.bottom + 1)) issues.push({ type: "outside-safe-area", el: label2(el2), level: "warn" });
      if (tr.some((q) => q.l < -1 || q.r > W + 1 || q.t < -1 || q.b > H + 1)) issues.push({ type: "text-cut-by-frame", el: label2(el2) });
      if (el2 !== capEl) {
        for (const z of v.zones) if (tr.some((q) => q.r > z.x && q.l < z.x + z.w && q.b > z.y && q.t < z.y + z.h)) {
          issues.push({ type: "in-platform-ui-zone", el: label2(el2), zone: z.name });
          break;
        }
      }
      texts.push({ el: el2, rs: tr });
    });
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const A = texts[i], B4 = texts[j];
      let hit = false;
      if (A.el.contains(B4.el) || B4.el.contains(A.el)) continue;
      A.rs.forEach((a) => B4.rs.forEach((b) => {
        const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (ix > Math.max(3, 0.12 * Math.min(a.r - a.l, b.r - b.l)) && iy > 0.35 * Math.min(a.b - a.t, b.b - b.t)) hit = true;
      }));
      if (hit) issues.push({ type: "text-overlap", el: label2(A.el), other: label2(B4.el) });
    }
    if (capEl && +capEl.style.opacity > 0) {
      const cr = R(capEl);
      if (cr.w > W - s2.left - s2.right + 2) issues.push({ type: "caption-too-wide", el: label2(capEl), w: Math.round(cr.w) });
      if (W >= H && capEl.getClientRects().length && cr.h > parseFloat(getComputedStyle(capEl).fontSize) * 2) issues.push({ type: "caption-wraps", el: label2(capEl) });
      for (const z of v.zones) if (cr.r > z.x && cr.l < z.x + z.w && cr.b > z.y && cr.t < z.y + z.h) issues.push({ type: "caption-in-ui-zone", el: label2(capEl), zone: z.name, level: "warn" });
      const sr2 = stage.getBoundingClientRect(), sx2 = sr2.width / W || 1, pe = capEl.style.pointerEvents;
      capEl.style.pointerEvents = "auto";
      const hit = document.elementFromPoint(sr2.left + (cr.l + cr.w / 2) * sx2, sr2.top + (cr.t + cr.h / 2) * sx2);
      capEl.style.pointerEvents = pe;
      if (hit && !hit.closest(".vk-cap")) issues.push({ type: "caption-covered", el: label2(capEl), other: label2(hit) });
    }
    if (!visibleText(stage) && !stage.querySelector(".vk-scene.on svg, .vk-scene.on img, .vk-scene.on video, .vk-scene.on canvas")) issues.push({ type: "blank-frame", el: "no visible text or media", level: "warn" });
    const missing = v.fontsCheck.filter((f) => !document.fonts.check(f, "\u4E2D\u6587Aa"));
    if (missing.length) issues.push({ type: "fonts-not-loaded", el: missing.join(", ") });
    const rep = { t: v.curT, issues };
    registry.hooks.qa.forEach((f) => f(rep, v));
    return rep;
  }
  function hasCamMotion(el2) {
    const cam = el2.closest(".vk-cam");
    if (!cam) return false;
    if (el2.closest("[data-cam-keys]")) return true;
    if (cam.style.scale || cam.style.rotate) return true;
    const tf = getComputedStyle(cam).transform;
    return !!tf && tf !== "none" && tf !== "matrix(1, 0, 0, 1, 0, 0)";
  }

  // src/audio/music.js
  var MusicInfo = class {
    // data: parsed *.beats.json; o: {start, fps, lead, smooth}
    constructor(data, o = {}) {
      this.data = data;
      this.start = +o.start || 0;
      this.fps = o.fps || 30;
      this.lead = o.lead != null ? o.lead : 1;
      const sh = (a) => (a || []).map((t) => +(t - this.start).toFixed(4));
      this.bpm = data.bpm;
      this.meter = data.meter || 4;
      this.beats = sh(data.beats);
      this.downbeats = sh(data.downbeats);
      this.onsets = sh(data.onsets);
      this.onsetStrength = data.onsetStrength || this.onsets.map(() => 1);
      this.env = data.envelope || { rate: 50 };
      this.sections = (data.sections || []).map((s2, i) => ({ ...s2, index: i, start: s2.start - this.start, end: s2.end - this.start })).filter((s2) => s2.end > 0).map((s2) => ({ ...s2, start: Math.max(0, s2.start) }));
      this.duration = (data.duration || 0) - this.start;
      this.loudness = data.loudness || null;
    }
    get leadT() {
      return this.lead / this.fps;
    }
    // envelope value 0..1 at video time t (linear interpolation, `lead` frames early like every visual hit).
    // band: 'loud' (default, dB-scaled RMS) | 'rms' | 'low' | 'mid' | 'high' | 0..7 (mel band index)
    // smooth: average over ±smooth seconds (box filter over envelope samples) for calmer motion
    energy(t, band = "loud", smooth = 0) {
      const E = this.env, arr = typeof band === "number" ? (E.bands || [])[band] : E[band];
      if (!arr || !arr.length) return 0;
      const x = (t + this.leadT + this.start) * E.rate;
      if (!smooth) return sample(arr, x);
      const r = Math.max(1, Math.round(smooth * E.rate));
      let s2 = 0, n = 0;
      for (let i = -r; i <= r; i += Math.max(1, Math.floor(r / 6))) {
        s2 += sample(arr, x + i);
        n++;
      }
      return s2 / n;
    }
    // exponential decay since the most recent onset (strength-weighted); min: ignore onsets weaker than this (0..1)
    onsetHit(t, k = 10, min = 0.3) {
      const T4 = this.onsets, tt = t + this.leadT;
      let lo = 0, hi = T4.length - 1, j = -1;
      while (lo <= hi) {
        const m = lo + hi >> 1;
        if (T4[m] <= tt) {
          j = m;
          lo = m + 1;
        } else hi = m - 1;
      }
      for (let i = j; i >= 0 && tt - T4[i] < 1.5; i--) if (this.onsetStrength[i] >= min) return this.onsetStrength[i] * Math.exp(-k * (tt - T4[i]));
      return 0;
    }
    // strong onsets in [a, b) (video time) — e.g. to place sfx or kinetic hits
    onsetsIn(a, b, min = 0.3) {
      return this.onsets.filter((t, i) => t >= a && t < b && this.onsetStrength[i] >= min);
    }
    section(t) {
      const S = this.sections;
      for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].start) return { ...S[i], p: clamp01((t - S[i].start) / (S[i].end - S[i].start)) };
      return S[0] ? { ...S[0], p: 0 } : null;
    }
  };
  function sample(arr, x) {
    if (x <= 0) return arr[0];
    const i = Math.floor(x);
    if (i >= arr.length - 1) return arr[arr.length - 1];
    const f = x - i;
    return arr[i] * (1 - f) + arr[i + 1] * f;
  }

  // src/layers/canvas.js
  var CanvasLayer = class {
    constructor(video, draw2, o = {}) {
      this.video = video;
      this.draw = draw2;
      this.o = o;
      const c = this.el = document.createElement("canvas");
      c.className = "vk-canvas";
      this.dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
      c.width = Math.round(video.W * this.dpr);
      c.height = Math.round(video.H * this.dpr);
      if (o.blend) c.style.mixBlendMode = o.blend;
      this.ctx = c.getContext("2d");
    }
    render(local, info) {
      const g = this.ctx;
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (!this.o.keep) g.clearRect(0, 0, this.el.width, this.el.height);
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.save();
      this.draw(g, local, info);
      g.restore();
    }
  };

  // src/layers/webgl.js
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var WebGLLayer = class {
    constructor(video, _draw, o = {}) {
      this.video = video;
      this.o = o;
      const c = this.el = document.createElement("canvas");
      c.className = "vk-canvas";
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)) * (o.resolution || 1);
      c.width = Math.round(video.W * dpr);
      c.height = Math.round(video.H * dpr);
      if (o.blend) c.style.mixBlendMode = o.blend;
      const gl2 = this.gl = c.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true, antialias: false });
      if (!gl2) {
        console.warn("[vk] WebGL unavailable; webgl layer disabled");
        return;
      }
      if (o.init) {
        o.init(gl2, this);
        return;
      }
      if (o.frag) this.program = this.compile(o.frag);
    }
    compile(frag) {
      const gl2 = this.gl, sh = (type, src2) => {
        const s2 = gl2.createShader(type);
        gl2.shaderSource(s2, src2);
        gl2.compileShader(s2);
        if (!gl2.getShaderParameter(s2, gl2.COMPILE_STATUS)) throw new Error("[vk] shader: " + gl2.getShaderInfoLog(s2));
        return s2;
      };
      const pr = gl2.createProgram();
      gl2.attachShader(pr, sh(gl2.VERTEX_SHADER, VERT));
      gl2.attachShader(pr, sh(gl2.FRAGMENT_SHADER, (frag.includes("precision") ? "" : "precision highp float;\n") + "uniform float uTime,uBeat,uProgress;uniform vec2 uRes;\n" + frag));
      gl2.linkProgram(pr);
      const buf = gl2.createBuffer();
      gl2.bindBuffer(gl2.ARRAY_BUFFER, buf);
      gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl2.STATIC_DRAW);
      const loc = gl2.getAttribLocation(pr, "p");
      gl2.enableVertexAttribArray(loc);
      gl2.vertexAttribPointer(loc, 2, gl2.FLOAT, false, 0, 0);
      return pr;
    }
    render(local, info) {
      const gl2 = this.gl;
      if (!gl2) return;
      gl2.viewport(0, 0, this.el.width, this.el.height);
      if (this.o.render) {
        this.o.render(gl2, local, info, this);
        return;
      }
      if (!this.program) return;
      gl2.useProgram(this.program);
      const u = (n) => gl2.getUniformLocation(this.program, n);
      gl2.uniform1f(u("uTime"), local);
      gl2.uniform2f(u("uRes"), this.el.width, this.el.height);
      gl2.uniform1f(u("uBeat"), info.beats ? info.beats.pulse(info.t) : 0);
      gl2.uniform1f(u("uProgress"), info.p || 0);
      const extra = this.o.uniforms ? this.o.uniforms(local, info) : {};
      for (const k in extra) {
        const v = extra[k], l = u(k);
        if (Array.isArray(v)) gl2["uniform" + v.length + "f"](l, ...v);
        else gl2.uniform1f(l, v);
      }
      gl2.clearColor(0, 0, 0, 0);
      gl2.clear(gl2.COLOR_BUFFER_BIT);
      gl2.drawArrays(gl2.TRIANGLES, 0, 6);
    }
  };

  // src/authoring/declarative.js
  function parseDeclarative(v, sections) {
    let cursor = 0;
    sections.forEach((el2, i) => {
      const d = el2.dataset, sc = new Scene(v, { el: el2, name: el2.id || d.name || `scene${i + 1}` });
      const tin = (d.in || (i === 0 ? "none" : v.cfg.transition || "fade:0.25")).split(":");
      sc.transition = tin[0] === "none" ? { type: "none", d: 0 } : { type: tin[0] === "wipe" ? "wipe-right" : tin[0], d: +(tin[1] || 0.5) };
      sc.dur = parseDur(d.dur || 5, v.beats);
      const overlap = d.overlap ? parseDur(d.overlap, v.beats) : 0;
      sc.start = d.start != null ? parseTime(d.start, v.beats) : cursor - overlap;
      if (overlap) sc.transition.d = overlap;
      cursor = sc.start + sc.dur;
      sc.mode = [...el2.classList].find((c) => v.theme.modes[c]) || v.theme.mode;
      v.applyThemeVars(el2, sc.mode);
      el2.style.zIndex = String(i + 1);
      sc.cap = d.cap || null;
      v.scenes.push(sc);
      parseScene(v, sc);
    });
  }
  function parseScene(v, sc) {
    const el2 = sc.el, T4 = (x) => parseTime(x, v.beats, sc.start);
    el2.querySelectorAll("[data-stagger]").forEach((box) => {
      const kids = [...box.children], each = +box.dataset.stagger || 0.15, t = T4(box.dataset.t);
      kids.forEach((k, i) => {
        if (k.dataset.t == null) k.dataset.t = String(+(t + i * each).toFixed(3));
        ["fx", "d", "ease", "exit"].forEach((a) => {
          if (k.dataset[a] == null && box.dataset[a] != null) k.dataset[a] = box.dataset[a];
        });
      });
      delete box.dataset.t;
      box.removeAttribute("data-fx");
    });
    el2.querySelectorAll("[data-t]").forEach((it) => {
      const ds = it.dataset, fx = ds.fx || "fade";
      const o = { t: T4(ds.t), each: ds.each ? +ds.each : void 0, color: ds.color, d: ds.d != null ? +ds.d : void 0, ease: ds.ease, dist: ds.dist ? +ds.dist : void 0 };
      if (fx === "type") {
        o.cps = +ds.cps || 30;
        o.text = ds.text;
        o.caret = ds.caret !== "0";
      }
      if (fx === "count") {
        o.from = ds.from;
        o.to = ds.to;
        o.decimals = ds.decimals;
        o.sep = ds.sep;
      }
      if (!/^(type|count|swap|letters|words)$/.test(fx)) it.style.opacity = "0";
      applyFx(it, fx, o, sc, false);
      if (ds.exit != null) applyFx(it, ds.exitFx || (/^(type|count|swap|letters|words)$/.test(fx) ? "fade" : fx), { t: T4(ds.exit), d: ds.exitD ? +ds.exitD : 0.4 }, sc, true);
    });
    if (el2.dataset.push) sc.push(parseFloat(el2.dataset.push) / (/%$/.test(el2.dataset.push) ? 100 : 1));
    if (el2.dataset.shake) el2.dataset.shake.split(";").filter((x) => x.trim()).forEach((x) => {
      const p = x.split(",");
      sc.shake(T4(p[0]), +p[1], p[2] ? +p[2] : void 0);
    });
    if (el2.dataset.cam) sc.camera(el2.dataset.cam.split(";").filter((s2) => s2.trim()).map((s2) => {
      const p = s2.split(":"), q = p[1].split(",").map(Number);
      return { t: +p[0], x: q[0], y: q[1], s: q[2], r: q[3], ease: p[2] && p[2].trim() };
    }));
  }

  // src/runtime/bake.js
  var SVGNS = "http://www.w3.org/2000/svg";
  var XLINK = "http://www.w3.org/1999/xlink";
  var INHERITED = [
    "fill",
    "fill-opacity",
    "fill-rule",
    "stroke",
    "stroke-width",
    "stroke-opacity",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-dasharray",
    "stroke-dashoffset",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "letter-spacing",
    "text-anchor",
    "dominant-baseline",
    "paint-order",
    "shape-rendering",
    "color-interpolation-filters"
  ];
  var SELF_LIVE = ["transform", "opacity", "clip-path", "mask", "style", "class", "id"];
  var bakeStats = { baked: 0, skipped: 0, px: 0, ms: 0, tDecode: 0, tDraw: 0, tEncode: 0, tLoad: 0 };
  function collectRefs(root, doc = document) {
    const out = /* @__PURE__ */ new Map(), queue = [root];
    const scan = (el2) => {
      const ids = [];
      for (const a of el2.attributes || []) {
        const v = a.value;
        let m;
        const re = /url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g;
        while (m = re.exec(v)) ids.push(m[1]);
        if ((a.name === "href" || a.name === "xlink:href") && v[0] === "#") ids.push(v.slice(1));
      }
      return ids;
    };
    while (queue.length) {
      const n = queue.pop();
      const all = [n, ...n.querySelectorAll ? n.querySelectorAll("*") : []];
      for (const e of all) for (const id of scan(e)) {
        if (out.has(id)) continue;
        const def = doc.getElementById(id);
        if (!def || def === root || root.contains && root.contains(def)) {
          out.set(id, null);
          continue;
        }
        out.set(id, def);
        queue.push(def);
      }
    }
    return [...out.values()].filter(Boolean);
  }
  function filterRegion(filterEl, b) {
    const num2 = (v, d) => {
      if (v == null || v === "") return d;
      v = String(v).trim();
      return v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);
    };
    const userUnits = filterEl && filterEl.getAttribute("filterUnits") === "userSpaceOnUse";
    const g = (k) => filterEl ? filterEl.getAttribute(k) : null;
    if (userUnits) return { x: num2(g("x"), b.x - 0.1 * b.width), y: num2(g("y"), b.y - 0.1 * b.height), width: num2(g("width"), 1.2 * b.width), height: num2(g("height"), 1.2 * b.height) };
    const fx = num2(g("x"), -0.1), fy = num2(g("y"), -0.1), fw = num2(g("width"), 1.2), fh = num2(g("height"), 1.2);
    return { x: b.x + fx * b.width, y: b.y + fy * b.height, width: fw * b.width, height: fh * b.height };
  }
  var refId = (v) => {
    const m = /url\(\s*['"]?#([^'")\s]+)/.exec(v || "");
    return m ? m[1] : null;
  };
  async function rasterize(markup, pw, ph) {
    const src2 = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
    try {
      let t = performance.now();
      const img = new Image();
      img.decoding = "sync";
      img.src = src2;
      await img.decode();
      bakeStats.tDecode += performance.now() - t;
      t = performance.now();
      const c = document.createElement("canvas");
      c.width = pw;
      c.height = ph;
      c.getContext("2d").drawImage(img, 0, 0, pw, ph);
      bakeStats.tDraw += performance.now() - t;
      t = performance.now();
      const url = c.toDataURL("image/png");
      bakeStats.tEncode += performance.now() - t;
      bakeStats.px += pw * ph;
      return { url, canvas: c };
    } finally {
      URL.revokeObjectURL(src2);
    }
  }
  function loadInto(imageEl, url) {
    const t = performance.now();
    return new Promise((res) => {
      const done = () => {
        const d = imageEl.decode ? imageEl.decode().catch(() => {
        }) : null;
        Promise.resolve(d).then(() => {
          bakeStats.tLoad += performance.now() - t;
          res();
        });
      };
      imageEl.addEventListener("load", done, { once: true });
      imageEl.addEventListener("error", () => res(), { once: true });
      imageEl.setAttribute("href", url);
    });
  }
  var px = (v) => {
    const n = parseFloat(v);
    return /^\s*[\d.]+(px)?\s*$/.test(String(v || "")) ? n : NaN;
  };
  function inheritedStyle(el2) {
    const p = el2.parentElement;
    if (!p) return "";
    const cs = getComputedStyle(p);
    return INHERITED.map((k) => {
      const v = cs.getPropertyValue(k);
      return v ? `${k}:${v}` : "";
    }).filter(Boolean).join(";").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }
  function isDynamic(refs) {
    return refs.some((r) => r.hasAttribute && r.hasAttribute("data-vk-dynamic"));
  }
  function defsMarkup(refs) {
    const s2 = new XMLSerializer();
    return refs.length ? `<defs>${refs.map((r) => s2.serializeToString(r)).join("")}</defs>` : "";
  }
  async function bakeRoot(svg3, o) {
    const vb = svg3.viewBox && svg3.viewBox.baseVal && svg3.viewBox.baseVal.width ? svg3.viewBox.baseVal : null;
    let w = px(svg3.getAttribute("width")), h3 = px(svg3.getAttribute("height"));
    if (!(w > 0 && h3 > 0)) {
      const r = svg3.getBoundingClientRect();
      w = r.width;
      h3 = r.height;
    }
    if (!(w > 0 && h3 > 0)) throw new Error("bake: <svg> needs numeric width/height attributes");
    const res = (window.devicePixelRatio || 1) * (o.scale || 1);
    const vbox = vb ? `${vb.x} ${vb.y} ${vb.width} ${vb.height}` : `0 0 ${w} ${h3}`;
    const par = svg3.getAttribute("preserveAspectRatio") || "xMidYMid meet";
    let pw = w * res, ph = h3 * res;
    if (vb && !/^none/.test(par)) {
      const k = (/slice/.test(par) ? Math.max : Math.min)(w / vb.width, h3 / vb.height);
      pw = vb.width * k * res;
      ph = vb.height * k * res;
    }
    pw = Math.max(1, Math.round(pw));
    ph = Math.max(1, Math.round(ph));
    const refs = collectRefs(svg3);
    if (isDynamic(refs)) return false;
    const inner = new XMLSerializer().serializeToString(svg3).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const markup = `<svg xmlns="${SVGNS}" xmlns:xlink="${XLINK}" width="${pw}" height="${ph}" viewBox="${vbox}" preserveAspectRatio="none" style="${inheritedStyle(svg3)}">${defsMarkup(refs)}${inner}</svg>`;
    const { url } = await rasterize(markup, pw, ph);
    const im = document.createElementNS(SVGNS, "image");
    const [x, y, bw, bh] = vbox.split(" ").map(Number);
    im.setAttribute("x", x);
    im.setAttribute("y", y);
    im.setAttribute("width", bw);
    im.setAttribute("height", bh);
    im.setAttribute("preserveAspectRatio", "none");
    im.setAttribute("class", "vk-baked");
    await loadInto(im, url);
    svg3.replaceChildren(im);
    svg3.setAttribute("data-vk-baked", `${pw}x${ph}`);
    return true;
  }
  function unitScale(el2) {
    const s2 = el2.ownerSVGElement;
    if (!s2) return 1;
    const vb = s2.viewBox && s2.viewBox.baseVal;
    const w = px(s2.getAttribute("width"));
    const k = vb && vb.width && w > 0 ? w / vb.width : 1;
    return k * (window.devicePixelRatio || 1);
  }
  async function bakeNode(el2, o) {
    const refs = collectRefs(el2);
    if (isDynamic(refs)) return false;
    const clone = el2.cloneNode(true);
    for (const a of ["transform", "opacity", "clip-path", "mask", "id", "data-vk-bake"]) clone.removeAttribute(a);
    clone.style.opacity = "";
    clone.style.transform = "";
    clone.style.clipPath = "";
    clone.style.mask = "";
    const meas = document.createElementNS(SVGNS, "svg");
    meas.setAttribute("width", "1");
    meas.setAttribute("height", "1");
    meas.style.cssText = "position:absolute;left:-100000px;top:0;visibility:hidden;overflow:hidden";
    const probe = clone.cloneNode(true);
    probe.removeAttribute("filter");
    meas.appendChild(probe);
    document.body.appendChild(meas);
    let b;
    try {
      b = probe.getBBox();
    } finally {
      meas.remove();
    }
    if (!b || !(b.width > 0 || b.height > 0)) return false;
    const fid = refId(el2.getAttribute("filter") || el2.style.filter), fEl = fid ? document.getElementById(fid) : null;
    const pad = o.pad != null ? o.pad : 4;
    let r = fEl ? filterRegion(fEl, b) : { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad };
    if (fEl && o.pad) r = { x: r.x - o.pad, y: r.y - o.pad, width: r.width + 2 * o.pad, height: r.height + 2 * o.pad };
    const res = unitScale(el2) * (o.scale || 1);
    const x0 = Math.floor(r.x * res) / res, y0 = Math.floor(r.y * res) / res;
    const pw = Math.max(1, Math.ceil((r.x + r.width) * res - x0 * res)), ph = Math.max(1, Math.ceil((r.y + r.height) * res - y0 * res));
    const bw = pw / res, bh = ph / res;
    const markup = `<svg xmlns="${SVGNS}" xmlns:xlink="${XLINK}" width="${pw}" height="${ph}" viewBox="${x0} ${y0} ${bw} ${bh}" preserveAspectRatio="none" style="${inheritedStyle(el2)}">${defsMarkup(refs)}${new XMLSerializer().serializeToString(clone)}</svg>`;
    const { url } = await rasterize(markup, pw, ph);
    const im = document.createElementNS(SVGNS, "image");
    im.setAttribute("x", x0);
    im.setAttribute("y", y0);
    im.setAttribute("width", bw);
    im.setAttribute("height", bh);
    im.setAttribute("preserveAspectRatio", "none");
    im.setAttribute("class", "vk-baked");
    await loadInto(im, url);
    if (el2.tagName.toLowerCase() === "g" || el2.tagName.toLowerCase() === "a") {
      el2.removeAttribute("filter");
      el2.style.filter = "";
      el2.replaceChildren(im);
      el2.setAttribute("data-vk-baked", `${pw}x${ph}`);
    } else {
      const g = document.createElementNS(SVGNS, "g");
      for (const a of SELF_LIVE) if (el2.hasAttribute(a) && a !== "style" && a !== "id") g.setAttribute(a, el2.getAttribute(a));
      g.setAttribute("data-vk-baked", `${pw}x${ph}`);
      g.appendChild(im);
      el2.replaceWith(g);
      el2.__vkBaked = g;
    }
    return true;
  }
  async function bake(el2, o = {}) {
    const t = performance.now();
    try {
      const ok = el2 instanceof SVGSVGElement && !el2.ownerSVGElement ? await bakeRoot(el2, o) : await bakeNode(el2, o);
      ok ? bakeStats.baked++ : bakeStats.skipped++;
      return ok;
    } catch (e) {
      bakeStats.skipped++;
      console.warn("[vk] bake skipped:", e && e.message || e);
      return false;
    } finally {
      bakeStats.ms += performance.now() - t;
    }
  }
  async function bakeTile(svgMarkup, cssW, cssH, scale = 1) {
    const res = (window.devicePixelRatio || 1) * scale, pw = Math.max(1, Math.round(cssW * res)), ph = Math.max(1, Math.round(cssH * res));
    const m = svgMarkup.replace(/<svg\b([^>]*)>/, (s2, a) => `<svg${a.replace(/\s(width|height)=(['"])[^'"]*\2/g, "")} width="${pw}" height="${ph}" viewBox="0 0 ${cssW} ${cssH}" preserveAspectRatio="none">`);
    const { url } = await rasterize(m, pw, ph);
    const im = new Image();
    im.src = url;
    await im.decode().catch(() => {
    });
    bakeStats.baked++;
    return url;
  }

  // src/core/video.js
  var Q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
  var RENDER = Q.get("render") === "1";
  var Video = class {
    static registry = registry;
    constructor(cfg = {}, env2 = {}) {
      this.cfg = cfg = Object.assign({ fps: 30, transition: "fade:0.4", localFonts: true, holdLast: true }, cfg);
      this.base = env2.base || "";
      const fmtName = Q.get("format") || cfg.format || (cfg.w && cfg.h ? null : "16:9");
      const fmt = resolveFormat(fmtName, Q.get("format") ? 0 : cfg.w || cfg.width, Q.get("format") ? 0 : cfg.h || cfg.height);
      this.format = fmtName;
      this.W = fmt.w;
      this.H = fmt.h;
      this.safe = Object.assign({}, fmt.safe, cfg.safe || {});
      this.zones = cfg.zones || fmt.zones;
      this.captionBottom = cfg.captionBottom != null ? cfg.captionBottom : fmt.captionBottom;
      this.fps = +(Q.get("fps") || cfg.fps);
      this.theme = resolveTheme(cfg.theme);
      this.k = Math.min(this.W, this.H) / 720;
      setDefaultEase(cfg.ease || this.theme.ease || "outCubic");
      this.lead = cfg.lead != null ? +cfg.lead : 1;
      if (cfg.music && !cfg.audio) cfg.audio = cfg.music;
      this.musicStart = +(cfg.musicStart || 0);
      this.musicGain = cfg.musicGain != null ? +cfg.musicGain : 1;
      let bdata = typeof cfg.beats === "string" ? loadJSON(cfg.beats) : cfg.beats && !Array.isArray(cfg.beats) && cfg.beats.beats ? cfg.beats : null;
      if (bdata) this.music = new MusicInfo(bdata, { start: this.musicStart, fps: this.fps, lead: this.lead });
      this.beats = new BeatGrid(this.music ? { fps: this.fps, lead: this.lead, bpm: bdata.bpm, times: this.music.beats, downbeats: this.music.downbeats, meter: this.music.meter } : { fps: this.fps, lead: this.lead, bpm: cfg.bpm, offset: cfg.beatOffset, times: Array.isArray(cfg.beats) ? cfg.beats : null, downbeats: cfg.downbeats, meter: cfg.meter, downbeat: cfg.downbeat });
      this.tl = new Timeline();
      this.scenes = [];
      this.layers = [];
      this.globalFns = [];
      this.overlays = [];
      this.caps = typeof cfg.captions === "string" ? alignToCues(loadJSON(cfg.captions), { offset: this.musicStart }) : (cfg.captions || []).slice();
      this.lyrics = [];
      if (cfg.lyrics) {
        const L = typeof cfg.lyrics === "string" ? { src: cfg.lyrics } : cfg.lyrics, data = L.src ? loadJSON(L.src) : L.data || L;
        this.lyrics = alignToCues(data, { offset: L.offset != null ? L.offset : this.musicStart, hold: L.hold });
        if (L.captions) this.caps.push(...this.lyrics);
      }
      const VC = cfg.voice ? typeof cfg.voice === "string" ? { manifest: cfg.voice } : { ...cfg.voice } : null;
      this.voiceCfg = VC;
      this.voices = [];
      this.voRequests = [];
      this.voMissing = [];
      if (VC) {
        VC.manifest = VC.manifest || location.pathname.split("/").pop().replace(/\.html?$/i, "") + ".vo.json";
        this.voManifest = loadJSON(VC.manifest, true);
        this.voBase = new URL(VC.manifest, location.href).href.replace(/[^/]*$/, "");
      }
      this.events = Array.isArray(cfg.score) ? cfg.score.slice() : [];
      this.pendingMedia = [];
      this.afterFonts = [];
      this.duration = 0;
      this.curT = 0;
      this.finalized = false;
      this.ui = null;
      this.playing = false;
      this.ccOn = true;
      this.bakeOn = cfg.bake !== false && Q.get("cache") !== "0";
      this.bakeJobs = [];
      if (RENDER) document.documentElement.classList.add("vk-render");
      const r = mulberry32(+(Q.get("seed") || cfg.seed || 1));
      Math.random = () => r();
      this.stage = document.getElementById("stage") || mk("div", null, document.body);
      this.stage.id = "stage";
      this.stage.classList.add("vk-stage");
      this.injectCSS();
      this.applyThemeVars(this.stage, this.theme.mode);
      const existing = [...this.stage.querySelectorAll(":scope > section.scene, :scope > section.vk-scene")];
      this.scenesEl = mk("div", "vk-scenes", null);
      this.stage.insertBefore(this.scenesEl, this.stage.firstChild);
      existing.forEach((sec) => this.scenesEl.appendChild(sec));
      if (existing.length) parseDeclarative(this, existing);
      if (!cfg.manual) setTimeout(() => this.finalize(), 0);
    }
    /* ---------------- style ---------------- */
    injectCSS() {
      const s2 = document.createElement("style");
      s2.id = "vk-style";
      s2.textContent = (this.cfg.localFonts ? fontFaces(this.base + "fonts/") : "") + stageCSS(this);
      document.head.appendChild(s2);
      const th = this.theme, k = this.k, st = this.stage.style;
      st.setProperty("--vk-sans", th.fonts.sans);
      st.setProperty("--vk-display", th.fonts.display);
      st.setProperty("--vk-mono", th.fonts.mono);
      st.setProperty("--vk-serif", th.fonts.serif);
      if (th.fonts.brush) st.setProperty("--vk-brush", th.fonts.brush);
      st.setProperty("--vk-condensed", th.fonts.condensed || th.fonts.display);
      Object.entries(th.scale).forEach(([n, px3]) => st.setProperty("--vk-fs-" + n, Math.round(px3 * k) + "px"));
      st.setProperty("--vk-gap", Math.round(28 * k) + "px");
      st.setProperty("--vk-radius", Math.round(th.radius * k) + "px");
      st.setProperty("--vk-marker", th.marker);
      st.setProperty("--vk-caret", th.caret);
      const vert = this.W < this.H;
      st.setProperty("--cap-size", Math.round(this.cfg.captionSize || th.scale.caption * k) + "px");
      st.setProperty("--cap-bottom", Math.round(this.captionBottom) + "px");
      st.setProperty("--safe-top", this.safe.top + "px");
      st.setProperty("--safe-right", this.safe.right + "px");
      st.setProperty("--safe-bottom", this.safe.bottom + "px");
      st.setProperty("--safe-left", this.safe.left + "px");
      if (vert) this.stage.classList.add("vk-vertical");
    }
    // vk.bake(el, o): rasterise static SVG content once (see runtime/bake.js). Returns a promise → true when baked.
    bake(el2, o = {}) {
      if (!this.bakeOn || !el2) return Promise.resolve(false);
      let res;
      const p = new Promise((r) => {
        res = r;
      });
      this.bakeJobs.push(() => bake(el2, o).then((ok) => {
        res(ok);
        return ok;
      }));
      if (this.bakesStarted) this.bakesStarted = this.bakesStarted.then(() => this.bakeJobs.splice(0).reduce((q, j) => q.then(j), Promise.resolve()));
      return p;
    }
    // arbitrary async static-cache work (textures): fn() → promise, awaited before __ready
    bakeLater(fn) {
      if (this.bakeOn) this.bakeJobs.push(() => Promise.resolve().then(fn).catch((e) => console.warn("[vk] bake skipped:", e && e.message || e)));
      return this.bakeOn;
    }
    runBakes() {
      this.stage.querySelectorAll("[data-vk-bake],[data-vk-static]").forEach((el2) => this.bake(el2));
      const jobs = this.bakeJobs.splice(0);
      this.bakesStarted = jobs.reduce((q, j) => q.then(j), Promise.resolve());
      return this.bakesStarted.then(() => {
        window.__bake = { ...bakeStats, on: this.bakeOn };
      });
    }
    applyThemeVars(el2, mode) {
      Object.entries(modeVars(this.theme, mode)).forEach(([k, v]) => el2.style.setProperty(k, v));
    }
    px(n) {
      return Math.round(n * this.k);
    }
    color(name, mode) {
      const m = this.theme.modes[mode || this.theme.mode];
      return m[name] || this.theme[name] || name;
    }
    /* ---------------- scenes ---------------- */
    // scene(name, dur, [nodes]) | scene(name, dur, opts, [nodes]) | scene({name, dur, ...}, [nodes])
    scene(name, dur, opts, nodes) {
      let o;
      if (typeof name === "object" && !Array.isArray(name)) {
        o = { ...name };
        nodes = dur;
      } else if (dur && typeof dur === "object" && !Array.isArray(dur)) {
        o = { ...dur, name };
        nodes = opts;
      } else {
        if (Array.isArray(opts) || typeof opts === "function") {
          nodes = opts;
          opts = {};
        }
        o = { ...opts || {}, name, dur };
      }
      if (this.finalized) console.warn("[vk] scene added after finalize(); call vk.video({manual:true}) and v.start()");
      const sc = new Scene(this, o);
      const prev = this.scenes[this.scenes.length - 1];
      sc.transition = prev ? parseTransition(o.transition != null ? o.transition : this.cfg.transition) : { type: "none", d: 0 };
      if (o.start != null) sc.start = parseTime(o.start, this.beats);
      else sc.start = prev ? prev.start + prev.dur - sc.transition.d : 0;
      const auto = (o.dur === "auto" || o.dur == null) && o.end == null;
      sc.dur = auto ? 0 : parseDur(o.dur, this.beats);
      const cutIn = sc.start + sc.transition.d;
      const gEnd = gridEnd(o.dur, this.beats, cutIn);
      if (gEnd != null) sc.dur = gEnd - sc.start;
      if (o.end != null) sc.dur = parseTime(o.end, this.beats) - sc.start;
      let mode = o.mode, bg = o.bg;
      if (typeof bg === "string" && this.theme.modes[bg]) {
        mode = bg;
        bg = null;
      }
      mode = mode || this.theme.mode;
      sc.mode = mode;
      this.applyThemeVars(sc.el, mode);
      if (typeof bg === "string" && /^(#|rgb|hsl|linear|radial)/.test(bg)) {
        sc.el.style.background = bg;
        bg = null;
      }
      this.scenes.push(sc);
      this.scenesEl.appendChild(sc.el);
      sc.el.style.zIndex = String(sc.index + 1);
      if (bg) [].concat(bg).forEach((b) => this.addBackground(sc, b));
      if (o.texture) Object.entries(o.texture).forEach(([n, x]) => x && sc.texture(n, x));
      if (o.camera) sc.camera(o.camera);
      if (o.shake) [].concat(o.shake).forEach((s2) => typeof s2 === "object" ? sc.shake(s2.t, s2.amp, s2.d) : sc.shake(s2));
      if (o.beat || o.energy) {
        sc.ensureCam();
        const f = modulator(this, sc.cam, o.beat, o.energy);
        sc.on((l, p, t) => f(t));
      }
      if (o.vo) this.planSceneVoice(sc, o);
      if (typeof nodes === "function") nodes(sc, this);
      else if (nodes) this.buildNodes(sc, [].concat(nodes).flat(), sc.content);
      if (auto) sc.dur = Math.max(1.5, sc.maxT + (o.hold != null ? o.hold : 2.2));
      if (o.vo) this.addVoice(sc, o, auto);
      const snap = o.snap !== void 0 ? o.snap : this.cfg.snap;
      if (snap && gEnd == null && o.end == null && this.beats.active) {
        const m = /^(beat|bar|b|m)(?::(\d+))?$/.exec(String(snap)), unit = m && (m[1] === "bar" || m[1] === "m") ? "bar" : "beat", n = m && m[2] ? +m[2] : 1;
        sc.dur = this.beats.ceil(sc.start + sc.dur + this.beats.leadT, unit, n) - this.beats.leadT - sc.start;
      }
      if (sc.dur <= sc.transition.d) console.warn(`[vk] scene "${sc.name}" is shorter than its transition`);
      if (o.sfx !== false && this.cfg.autoSfx && prev && sc.transition.d > 0) this.sfx(sc.start + Math.min(0.05, sc.transition.d / 2), "whoosh", 0.5);
      return sc;
    }
    addBackground(sc, spec) {
      const name = typeof spec === "string" ? spec : spec.type, f = registry.backgrounds[name];
      if (!f) {
        console.warn("[vk] unknown background", name);
        return;
      }
      const r = f(sc, typeof spec === "string" ? {} : spec, this);
      if (r && r.el) {
        r.el.classList.add("vk-bg");
        (sc.cam || sc.el).insertBefore(r.el, (sc.cam || sc.el).firstChild);
      }
      if (r && r.update) sc.bgs.push(r.update);
    }
    // Build authoring nodes (see authoring/api.js). A node is {build(ctx) → Element|Element[]|null}.
    buildNodes(sc, nodes, parent) {
      const ctx = makeCtx(this, sc);
      nodes.forEach((n) => {
        if (!n) return;
        const el2 = typeof n === "function" ? n(ctx) : n.build ? n.build(ctx) : n;
        if (el2 && el2.nodeType) placeNode(el2, n, sc, parent);
        else if (Array.isArray(el2)) el2.forEach((e) => e && e.nodeType && placeNode(e, n, sc, parent));
      });
    }
    addLayer(kind, draw2, o) {
      const Cls = kind === "webgl" ? WebGLLayer : kind === "canvas" ? CanvasLayer : registry.layers[kind];
      const layer2 = new Cls(this, draw2, o);
      const host = o.scene ? o.fixed || !o.scene.cam ? o.scene.el : o.scene.cam : this.stage;
      if (layer2.el) {
        if (o.z === "back" || o.z === "below") {
          const bgs = [...host.children].filter((c) => c.classList.contains("vk-bg"));
          host.insertBefore(layer2.el, bgs.length ? bgs[bgs.length - 1].nextSibling : host.firstChild);
        } else host.appendChild(layer2.el);
        if (o.zIndex != null) layer2.el.style.zIndex = o.zIndex;
      }
      (o.scene ? o.scene.layers : this.layers).push(layer2);
      return layer2;
    }
    // absolute-time helpers
    tween(target, o) {
      this.tl.tween(typeof target === "string" ? [...this.stage.querySelectorAll(target)] : [].concat(target), o, null);
      return this;
    }
    onRender(fn) {
      this.globalFns.push(fn);
      return this;
    }
    canvas(draw2, o = {}) {
      return this.addLayer("canvas", draw2, { z: "front", zIndex: 30, ...o });
    }
    gl(effects, o = {}) {
      if (effects && !Array.isArray(effects) && !effects.render) {
        const t = effects;
        effects = o;
        o = t;
      }
      return this.addLayer("gl", null, { z: "front", zIndex: 30, ...o, effects: [].concat(effects || []) });
    }
    sfx(t, name, gain = 1, freq) {
      t = typeof t === "string" ? parseTime(t, this.beats) + this.beats.leadT : t;
      this.events.push([+t.toFixed(3), name, gain, freq]);
      return this;
    }
    // ---- voice-over ----
    voiceEntry(text3) {
      const M = this.voManifest;
      return M && M.items ? M.items[text3] || null : null;
    }
    // plan the scene's voice lines (scene-local times). Multi-line / multi-voice: vo: [{text, voice, rate, pitch, gap, at, who}, …]
    planSceneVoice(sc, o) {
      const VC = this.voiceCfg || {}, cast = VC.cast || {}, segs = voSegments(o.vo).map((sg) => sg.who && cast[sg.who] ? { ...cast[sg.who], ...sg } : sg);
      const lead = o.voLead != null ? o.voLead : Math.max(VC.lead != null ? VC.lead : 0.45, sc.transition.d + 0.1);
      const entries = segs.map((sg) => this.voiceEntry(voKey(sg)));
      const plan = planVoice(segs, segs.map((sg, i) => entries[i] ? entries[i].duration : estimateSpeech(sg.text)), { lead, gap: o.voGap != null ? o.voGap : VC.gap != null ? VC.gap : 0.35 });
      plan.forEach((p, i) => {
        p.entry = entries[i];
        p.key = voKey(segs[i]);
        p.words = entries[i] && entries[i].words ? entries[i].words : null;
      });
      sc.voSegs = plan;
      sc.voLead = lead;
      sc.voEnd = plan.length ? plan[plan.length - 1].end : lead;
    }
    addVoice(sc, o, auto) {
      const VC = this.voiceCfg || {}, plan = sc.voSegs || [];
      const tail = o.voTail != null ? o.voTail : VC.tail != null ? VC.tail : 0.7;
      const file = location.pathname.split("/").pop();
      plan.forEach((p) => {
        this.voRequests.push({ text: p.text, key: p.key, voice: p.voice || null, rate: p.rate || null, pitch: p.pitch || null, scene: sc.name });
        if (!p.entry) {
          this.voMissing.push(p.text);
          console.warn(`[vk] no TTS audio for scene "${sc.name}" line "${p.text.slice(0, 16)}" \u2014 run: vk tts ${file}`);
        }
      });
      const first = plan[0] || { at: sc.voLead }, end = sc.voEnd;
      if (auto) sc.dur = Math.max(sc.dur, end + tail);
      else if (end > sc.dur) console.warn(`[vk] voice-over of "${sc.name}" (${end.toFixed(2)}s) is longer than the scene (${sc.dur.toFixed(2)}s); use dur:'auto'`);
      const allOk = plan.every((p) => p.entry);
      sc.vo = { text: plan.map((p) => p.text).join(""), at: sc.start + first.at, dur: end - first.at, lead: first.at, entry: allOk ? plan[0] && plan[0].entry : null, segs: plan };
      plan.forEach((p) => {
        if (p.entry) this.voices.push({ t: +(sc.start + p.at).toFixed(3), src: this.voBase + p.entry.file, file: p.entry.file, dur: p.entry.duration, gain: p.gain != null ? p.gain : o.voGain != null ? o.voGain : VC.gain != null ? VC.gain : 1, scene: sc.name, text: p.text, voice: p.voice || null, who: p.who || null });
      });
      if (o.cap === void 0 && VC.captions !== false) {
        const caps = [];
        plan.forEach((p) => {
          if (p.words && p.words.length) caps.push(...chunkCues(p.text, p.words, { at: sc.start + p.at, maxChars: VC.maxChars || (this.W < this.H ? 14 : 20) }));
          else p.text.split(/(?<=[。！？!?；;])/).filter((x) => x.trim()).forEach((x, j, arr) => {
            const d = p.dur / arr.length;
            caps.push([sc.start + p.at + j * d, sc.start + p.at + (j + 1) * d - 0.05, x]);
          });
        });
        for (let i = 0; i < caps.length - 1; i++) caps[i][1] = Math.min(caps[i][1], caps[i + 1][0] - 0.04);
        this.caps.push(...caps);
        sc.cap = null;
      }
    }
    caption(start, end, text3, words) {
      this.caps.push(words ? [start, end, text3, words] : [start, end, text3]);
      return this;
    }
    texture(name, opts) {
      const f = registry.textures[name];
      if (!f) {
        console.warn("[vk] unknown texture", name);
        return this;
      }
      const r = f(this, opts === true ? {} : typeof opts === "number" ? { amount: opts } : opts || {});
      if (r) this.overlays.push(r);
      return this;
    }
    // local time when the scene's entrance animations are done (latest tween end before the scene hands over);
    // used by QA / stills / contact sheets to pick a representative frame
    settleOf(sc) {
      const nx = this.scenes[sc.index + 1], visEnd = (nx ? nx.start : sc.end) - sc.start - 0.25;
      let m = Math.max(sc.transition.d || 0, Math.min(sc.maxT, visEnd));
      this.tl.els.forEach((S) => {
        if (S.owner !== sc) return;
        Object.values(S.props).forEach((arr) => arr.forEach((tr) => {
          const e = tr.t0 + tr.d;
          if (e <= visEnd && e > m) m = e;
        }));
      });
      return +m.toFixed(3);
    }
    /* ---------------- finalize ---------------- */
    start() {
      return this.finalize();
    }
    finalize() {
      if (this.finalized) return this;
      this.finalized = true;
      const S = this.scenes;
      this.duration = this.cfg.duration || S.reduce((m, s2) => Math.max(m, s2.start + s2.dur), 0);
      S.forEach((sc, i) => {
        if (!sc.cap) return;
        const nx = S[i + 1];
        const end = Math.min(sc.end, nx ? nx.start + Math.min(0.15, nx.transition.d) : sc.end) - 0.3;
        [].concat(sc.cap).forEach((c, j, arr) => {
          const a = sc.start + (i ? Math.max(0.35, sc.transition.d) : 0.4), span = (end - a) / arr.length;
          if (typeof c === "string") this.caps.push([a + j * span, a + (j + 1) * span - (j < arr.length - 1 ? 0.05 : 0), c]);
          else this.caps.push([sc.start + c[0], sc.start + c[1], c[2], c[3]]);
        });
      });
      this.caps.sort((a, b) => a[0] - b[0]);
      this.flashEl = mk("div", "vk-flash", this.stage);
      const tex = this.cfg.texture || {};
      Object.entries(tex).forEach(([n, o]) => o && this.texture(n, o));
      this.overlays.forEach((o) => {
        if (o.el) this.stage.appendChild(o.el);
      });
      if (this.caps.length) this.capEl = mk("div", "vk-cap", this.stage);
      registry.hooks.init.forEach((f) => f(this));
      const fontsCheck = this.cfg.fontsCheck || [
        '400 20px "Noto Sans SC"',
        '700 20px "Noto Sans SC"',
        '900 20px "Noto Sans SC"',
        '400 20px "JetBrains Mono"',
        '700 20px "JetBrains Mono"',
        '900 20px "Archivo"',
        '400 20px "Anton"',
        '400 20px "Instrument Serif"'
      ].concat(this.theme.fontsCheck || []);
      this.fontsCheck = fontsCheck;
      window.__ready = Promise.all([
        Promise.all(fontsCheck.map((f) => document.fonts.load(f, "\u4E2D\u6587Aa0"))).catch(() => {
        }),
        Promise.all([...this.stage.querySelectorAll("img")].map((im) => im.decode ? im.decode().catch(() => {
        }) : null))
      ]).then(() => document.fonts.ready).then(() => {
        this.afterFonts.forEach((f) => f());
        return this.runBakes();
      }).then(() => {
        this.render(this.curT);
        return true;
      });
      Object.assign(window, {
        __duration: this.duration,
        __fps: this.fps,
        __size: { width: this.W, height: this.H },
        __captions: this.caps,
        __audio: this.cfg.audio ? new URL(this.cfg.audio, location.href).href : null,
        __music: this.cfg.audio ? { src: new URL(this.cfg.audio, location.href).href, start: this.musicStart, gain: this.musicGain, duck: this.cfg.duck } : null,
        __voice: this.voices,
        __voRequests: this.voRequests,
        __voMissing: this.voMissing,
        __voiceCfg: this.voiceCfg ? { ...this.voiceCfg, manifestUrl: new URL(this.voiceCfg.manifest, location.href).href } : null,
        __mix: this.cfg.mix || null,
        __scenes: S.map((s2) => ({ index: s2.index, name: s2.name, start: s2.start, dur: s2.dur, transition: s2.transition, settle: this.settleOf(s2), vo: s2.vo ? { at: s2.vo.at, dur: s2.vo.dur, missing: !s2.vo.entry } : null })),
        __cues: this.events.map((e) => e[0]),
        __vk: { theme: this.cfg.theme || "tech-blue", format: this.format, safe: this.safe, zones: this.zones, title: this.cfg.title || document.title },
        __text: (t) => {
          if (t != null) this.render(t);
          return visibleText(this.stage);
        },
        __seek: (t) => {
          this.render(t);
          return Promise.all(this.pendingMedia).then(() => t);
        },
        __qa: (t) => {
          if (t != null) this.render(t);
          return runQA(this);
        }
      });
      if (this.events.length || this.cfg.scoreFn) window.SCORE = this.cfg.scoreFn || makeScore(this.events, this.cfg.scoreOptions || {}, this);
      if (this.cfg.audio && !RENDER) {
        this.audioEl = new Audio(this.cfg.audio);
        this.audioEl.preload = "auto";
      }
      if (this.voices.length && !RENDER) this.voiceEls = this.voices.map((x) => {
        const a = new Audio(x.src);
        a.preload = "auto";
        return { ...x, a };
      });
      if (RENDER) this.render(+Q.get("t") || 0);
      else setTimeout(() => {
        this.ui = buildPreviewUI(this, Q);
      }, 0);
      return this;
    }
    /* ---------------- render(t): pure ---------------- */
    render(t) {
      t = Math.max(0, Math.min(t, this.duration - 1e-6));
      this.curT = t;
      const S = this.scenes, active = [], W = this.W, H = this.H;
      let flash = 0, flashColor = "#fff";
      for (const sc of S) {
        const local = t - sc.start, on = local >= 0 && local < sc.dur;
        if (sc.el.classList.contains("on") !== on) sc.el.classList.toggle("on", on);
        if (!on) continue;
        active.push(sc);
        sc.__st = { opacity: "", transform: "", filter: "", clipPath: "", maskImage: "", webkitMaskImage: "", transformOrigin: "", zIndex: String(sc.index + 1) };
      }
      for (const sc of active) {
        const tr = sc.transition, local = t - sc.start;
        if (!tr.d || local >= tr.d) continue;
        const T4 = registry.transitions[tr.type] || registry.transitions.fade;
        const raw = local / tr.d, prev = S[sc.index - 1];
        const r = T4(getEase(tr.ease || "inOutCubic")(raw), { raw, local, W, H, fps: this.fps, frame: Math.floor(t * this.fps), o: tr, video: this, inScene: sc, outScene: prev }) || {};
        if (r.in) Object.assign(sc.__st, r.in);
        if (r.out && prev && prev.__st) Object.assign(prev.__st, r.out);
        if (r.under && prev && prev.__st) {
          sc.__st.zIndex = String(prev.index);
          prev.__st.zIndex = String(prev.index + 2);
        }
        if (r.flash != null && r.flash > flash) {
          flash = r.flash;
          flashColor = r.flashColor || "#fff";
        }
      }
      const fo = this.cfg.fadeOut;
      if (fo && t > this.duration - fo) {
        const last = active[active.length - 1];
        if (last) last.__st.opacity = String(Math.max(0, (this.duration - t) / fo));
      }
      for (const sc of active) {
        const st = sc.__st, es = sc.el.style;
        for (const k in st) if (es[k] !== String(st[k])) es[k] = st[k];
        const c = sc.camCfg;
        if (sc.cam && (c.keys || c.push || c.shakes.length || c.extra.length)) {
          c.extraZoom = c.extra.length ? (lt) => c.extra.reduce((m, f) => m + f(lt), 0) : null;
          sc.cam.style.transform = cameraTransform(c, W, H, t - sc.start, sc.dur);
        }
      }
      this.tl.els.forEach((St, el2) => {
        if (!St.owner) {
          this.tl.apply(el2, St, t);
          return;
        }
        if (active.includes(St.owner)) this.tl.apply(el2, St, t - St.owner.start);
      });
      const info = { t, W, H, fps: this.fps, frame: Math.floor(t * this.fps), beats: this.beats, video: this };
      for (const sc of active) {
        const local = t - sc.start, p = local / sc.dur;
        for (const b of sc.bgs) b(local, p, t);
        for (const f of sc.fns) f(local, p, t);
        for (const L of sc.layers) L.render(local, { ...info, local, p, scene: sc });
        if (sc.el.getAnimations) sc.el.getAnimations({ subtree: true }).forEach((a) => {
          if (a.playState !== "paused") a.pause();
          a.currentTime = local * 1e3;
        });
      }
      for (const L of this.layers) L.render(t, { ...info, local: t, p: t / this.duration });
      if (this.beats.active || this.music) this.setRhythmVars(t);
      for (const f of this.globalFns) f(t);
      if (this.flashEl) {
        this.flashEl.style.opacity = flash;
        if (flash) this.flashEl.style.background = flashColor;
      }
      for (const o of this.overlays) o.update && o.update(t, info);
      this.renderCaption(t);
      this.syncMedia(t, active);
      registry.hooks.frame.forEach((f) => f(t, this));
      if (this.ui) this.ui.update(t);
    }
    // CSS custom properties for rhythm-reactive styling: var(--beat) var(--bar) var(--energy) var(--low) var(--mid) var(--high)
    setRhythmVars(t) {
      const st = this.stage.style, B4 = this.beats, M = this.music;
      st.setProperty("--beat", B4.pulse(t).toFixed(3));
      st.setProperty("--bar", B4.barPulse(t).toFixed(3));
      if (M) {
        st.setProperty("--energy", M.energy(t).toFixed(3));
        st.setProperty("--low", M.energy(t, "low").toFixed(3));
        st.setProperty("--mid", M.energy(t, "mid").toFixed(3));
        st.setProperty("--high", M.energy(t, "high").toFixed(3));
      }
    }
    // captions; cues with word timing render as karaoke: each word gets --p (0→1 while it is spoken, `lead` frames early)
    renderCaption(t) {
      if (!this.capEl) return;
      let c = null;
      for (const x of this.caps) if (t >= x[0] && t < x[1]) {
        c = x;
        break;
      }
      const el2 = this.capEl;
      if (c && this.ccOn) {
        if (el2.__c !== c) {
          el2.__c = c;
          if (c[3]) {
            const P = mapWords(c[2], c[3]);
            el2.innerHTML = P.map((p) => p.wi < 0 ? esc(p.s) : `<span class="kw" data-i="${p.wi}">${esc(p.s)}</span>`).join("");
            el2.__kw = [...el2.querySelectorAll(".kw")].map((s2) => ({ s: s2, w: c[3][+s2.dataset.i] }));
          } else {
            el2.textContent = c[2];
            el2.__kw = null;
          }
          el2.classList.toggle("vk-karaoke", !!c[3]);
          el2.dataset.style = this.cfg.karaoke || "sweep";
        }
        if (el2.__kw) {
          const tt = t + this.beats.leadT;
          for (const { s: s2, w } of el2.__kw) {
            const p = Math.max(0, Math.min(1, (tt - w.t) / Math.max(0.05, (w.end || w.t + 0.2) - w.t)));
            s2.style.setProperty("--p", p.toFixed(3));
            s2.classList.toggle("on", tt >= w.t);
          }
        }
        el2.style.opacity = Math.max(0, Math.min(1, (t - c[0]) / 0.2, (c[1] - t) / 0.2));
      } else el2.style.opacity = 0;
    }
    syncMedia(t, active) {
      this.pendingMedia = [];
      for (const sc of active) sc.el.querySelectorAll("video[data-t]").forEach((v) => {
        const lt = Math.max(0, t - sc.start - (+v.dataset.t || 0));
        if (RENDER || !this.playing) {
          if (Math.abs(v.currentTime - lt) > 1e-3) {
            v.pause();
            v.currentTime = lt;
            this.pendingMedia.push(new Promise((r) => {
              v.addEventListener("seeked", r, { once: true });
              setTimeout(r, 2e3);
            }));
          }
        } else if (Math.abs(v.currentTime - lt) > 0.25) v.currentTime = lt;
      });
    }
    seek(t) {
      this.render(t);
    }
  };
  function parseTransition(v) {
    if (!v || v === "none" || v === "cut") return { type: "none", d: 0 };
    if (typeof v === "object") return { d: 0.5, ...v, type: v.type || "fade" };
    const [type, d] = String(v).split(":");
    return { type, d: d != null ? +d : DEFAULT_TR_D[type] || 0.5 };
  }
  var DEFAULT_TR_D = { fade: 0.4, flash: 0.4, blur: 0.45, glitch: 0.4, slice: 0.4, dip: 0.6, "zoom-through": 0.7 };
  function makeCtx(v, sc) {
    return {
      video: v,
      scene: sc,
      theme: v.theme,
      W: v.W,
      H: v.H,
      px: (n) => v.px(n),
      // resolve an element's start time and advance the scene's authoring cursor
      at(o = {}) {
        let t;
        if (o.at != null) t = sc.time(o.at);
        else t = sc.cursor == null ? 0.3 : sc.cursor + (o.gap != null ? o.gap : v.theme.cascade);
        sc.cursor = t;
        sc.maxT = Math.max(sc.maxT, t + 0.6);
        return t;
      },
      advance(t) {
        sc.cursor = Math.max(sc.cursor || 0, t);
        sc.maxT = Math.max(sc.maxT, t);
      },
      extend(t) {
        sc.maxT = Math.max(sc.maxT, t);
      },
      build(nodes, parent) {
        v.buildNodes(sc, [].concat(nodes).flat(), parent);
      }
    };
  }
  function placeNode(el2, n, sc, parent) {
    if (el2.parentNode) return;
    const o = n && n.o || {};
    if (o.fixed) sc.fixed.appendChild(el2);
    else if (o.pos || el2.classList.contains("vk-abs")) (sc.cam || sc.el).appendChild(el2);
    else parent.appendChild(el2);
  }
  function loadJSON(src2, optional) {
    const x = new XMLHttpRequest();
    x.open("GET", src2, false);
    try {
      x.send();
    } catch (e) {
      if (optional) return null;
      throw e;
    }
    if (x.status >= 400 || x.status === 0 && !x.responseText) {
      if (optional) return null;
      throw new Error("[vk] cannot load " + src2 + " (" + x.status + ")");
    }
    return JSON.parse(x.responseText);
  }
  function esc(s2) {
    return String(s2).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  }

  // src/authoring/node.js
  function node(o, build, defFx) {
    o = o || {};
    return { o, kind: build.name, build: (ctx) => {
      const el2 = build(ctx, o);
      return el2 ? finish(el2, o, ctx, defFx) : el2;
    } };
  }
  function md(s2) {
    return String(s2).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]).replace(/\*\*(.+?)\*\*/g, '<span class="vk-em">$1</span>').replace(/==(.+?)==/g, '<span class="vk-mark">$1</span>').replace(/__(.+?)__/g, '<span class="vk-ul">$1</span>').replace(/`([^`]+)`/g, '<code class="vk-mono">$1</code>').replace(/\n/g, "<br>");
  }
  function h(tag, cls, html2, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html2 != null) e.innerHTML = html2;
    if (parent) parent.appendChild(e);
    return e;
  }
  var SVGNS2 = "http://www.w3.org/2000/svg";
  function s(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS2, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function size(ctx, v) {
    if (v == null) return null;
    if (typeof v === "number") return ctx.px(v) + "px";
    if (ctx.theme.scale[v]) return `var(--vk-fs-${v})`;
    return v;
  }
  function len(ctx, v, axis) {
    if (v == null) return null;
    if (typeof v === "string") return v;
    if (Math.abs(v) <= 1 && v !== 0) return (v * (axis === "y" ? ctx.H : ctx.W)).toFixed(1) + "px";
    return ctx.px(v) + "px";
  }
  function colorOf(v) {
    return ["accent", "accent2", "muted", "fg", "bg", "surface", "line", "on-accent"].includes(v) ? `var(--${v})` : v;
  }
  function finish(el2, o, ctx, defFx) {
    if (o.class) el2.classList.add(...o.class.split(/\s+/));
    if (o.id) el2.id = o.id;
    if (o.style) {
      if (typeof o.style === "string") el2.style.cssText += ";" + o.style;
      else Object.assign(el2.style, o.style);
    }
    if (o.color) el2.style.color = colorOf(o.color);
    if (o.bg) el2.style.background = colorOf(o.bg);
    if (o.size) el2.style.fontSize = size(ctx, o.size);
    if (o.weight) el2.style.fontWeight = o.weight;
    if (o.font) el2.style.fontFamily = { display: "var(--vk-display)", mono: "var(--vk-mono)", sans: "var(--vk-sans)", serif: "var(--vk-serif)", condensed: "var(--vk-condensed)" }[o.font] || o.font;
    if (o.align) {
      el2.style.textAlign = o.align;
      el2.style.alignSelf = { left: "flex-start", right: "flex-end", center: "center" }[o.align] || "";
    }
    if (o.w != null) el2.style.width = len(ctx, o.w, "x");
    if (o.maxW != null) el2.style.maxWidth = len(ctx, o.maxW, "x");
    if (o.mt != null) el2.style.marginTop = len(ctx, o.mt, "y");
    if (o.pos) {
      const p = o.pos;
      el2.classList.add("vk-abs");
      if (p.x != null) el2.style.left = len(ctx, p.x, "x");
      if (p.y != null) el2.style.top = len(ctx, p.y, "y");
      if (p.right != null) el2.style.right = len(ctx, p.right, "x");
      if (p.bottom != null) el2.style.bottom = len(ctx, p.bottom, "y");
      if (p.w != null) el2.style.width = len(ctx, p.w, "x");
      if (p.h != null) el2.style.height = len(ctx, p.h, "y");
      if (p.anchor === "center") el2.style.translate = "-50% -50%";
      else if (p.anchor === "top") el2.style.translate = "-50% 0";
    }
    const fx = o.fx === void 0 ? defFx : o.fx;
    if (fx) {
      const t = ctx.at(o);
      el2.__vkAt = t;
      applyFx(el2.__fxTarget || el2, fx, { ...o, t }, ctx.scene, false);
      if (el2.__afterFx) el2.__afterFx(t);
      if (o.sfx) ctx.scene.sfx(t, o.sfx, o.sfxGain || 0.6);
      const marks = el2.querySelectorAll(".vk-mark,.vk-ul");
      if (marks.length && o.mark !== false) {
        const mt = o.markAt != null ? ctx.scene.time(o.markAt) : t + (o.d || 0.6) + 0.35;
        const hl = [...marks].filter((m) => m.classList.contains("vk-mark")), ul = [...marks].filter((m) => m.classList.contains("vk-ul"));
        if (hl.length) ctx.scene.fx(hl, "highlight", { t: mt, stagger: 0.3 });
        if (ul.length) ctx.scene.fx(ul, "underline", { t: mt, stagger: 0.3 });
        ctx.extend(mt + 0.8);
      }
    }
    if (o.out != null) applyFx(el2.__fxTarget || el2, o.outFx || exitFx(fx), { ...o, t: ctx.scene.time(o.out), d: o.outD || 0.4 }, ctx.scene, true);
    if (o.on) ctx.scene.on((local, p, t) => o.on(el2, local, p, t));
    if (o.beat || o.energy) {
      const f = modulator(ctx.video, el2, o.beat, o.energy);
      ctx.scene.on((local, p, t) => f(t));
    }
    return el2;
  }
  function exitFx(fx) {
    if (!fx) return "fade";
    return /^(type|count|swap|highlight|marker|underline|wave|stack|scramble|decode)$/.test(fx) ? "fade" : fx;
  }

  // src/authoring/api.js
  var api_exports = {};
  __export(api_exports, {
    col: () => col,
    el: () => el,
    grid: () => grid,
    h2: () => h2,
    hero: () => hero,
    html: () => html,
    label: () => label,
    md: () => md,
    row: () => row,
    small: () => small,
    spacer: () => spacer,
    split: () => split,
    stack: () => stack,
    sub: () => sub,
    svg: () => svg,
    text: () => text,
    title: () => title
  });
  var txt = (tag, cls, defFx) => (text3, o = {}) => node(o, function text_(ctx) {
    return h(tag, cls, o.html ? text3 : md(text3));
  }, defFx);
  var title = txt("h1", "vk-h1", "letters");
  var h2 = txt("h2", "vk-h2", "reveal");
  var sub = txt("div", "vk-h3", "up");
  var text = txt("p", "vk-body", "up");
  var small = txt("div", "vk-small", "fade");
  var label = txt("div", "vk-label", "fade");
  function hero(textStr, o = {}) {
    return node(o, function hero_(ctx) {
      const wrap = h("div", "vk-hero-wrap");
      wrap.style.cssText = "display:flex;align-items:baseline;justify-content:center;max-width:100%";
      const w = h("div", "vk-hero", o.html ? textStr : md(textStr), wrap);
      if (o.size) {
        w.style.fontSize = size(ctx, o.size);
      }
      if (o.outline) {
        w.style.color = "transparent";
        w.style.webkitTextStroke = `${ctx.px(2)}px var(--line)`;
      }
      if (o.cursor) {
        const c = h("span", "vk-hero-cursor", null, wrap);
        c.style.cssText = `display:inline-block;width:.3em;height:.7em;background:var(--accent);margin-left:.06em;font-size:${w.style.fontSize || "var(--vk-fs-hero)"}`;
        wrap.__afterFx = (t) => ctx.scene.fx(c, "pop", { t: t + (o.cursorDelay != null ? o.cursorDelay : 0.55), d: 0.4 });
      }
      wrap.__fxTarget = w;
      return wrap;
    }, "letters");
  }
  function stack(lines, o = {}) {
    return node({ fx: "stack", ...o }, function stack_(ctx) {
      const e = h("div", "vk-hero vk-stack", [].concat(lines).map((l) => md(l)).join("<br>"));
      e.style.width = o.w ? len(ctx, o.w, "x") : "100%";
      return e;
    });
  }
  function row(children, o = {}) {
    return node(o, function row_(ctx) {
      const e = h("div", "vk-row");
      if (o.gap != null) e.style.gap = len(ctx, o.gap, "x");
      if (o.justify) e.style.justifyContent = o.justify;
      if (o.alignItems) e.style.alignItems = o.alignItems;
      ctx.build(children, e);
      return e;
    }, null);
  }
  function col(children, o = {}) {
    return node(o, function col_(ctx) {
      const e = h("div", "vk-col");
      if (o.gap != null) e.style.gap = len(ctx, o.gap, "y");
      e.style.alignItems = o.alignItems || (o.align === "center" ? "center" : "flex-start");
      ctx.build(children, e);
      return e;
    }, null);
  }
  function grid(children, o = {}) {
    return node(o, function grid_(ctx) {
      const e = h("div", "vk-grid");
      e.style.cssText = `display:grid;grid-template-columns:repeat(${o.cols || 3},1fr);gap:${len(ctx, o.gap != null ? o.gap : 24, "x")};width:100%`;
      ctx.build(children, e);
      return e;
    }, null);
  }
  function split(left, right, o = {}) {
    return node(o, function split_(ctx) {
      const e = h("div", "vk-split");
      let r = o.ratio || "1/1";
      if (typeof r === "string") {
        const [a, b] = r.split("/").map(Number);
        r = a / (a + b);
      }
      e.style.cssText = `display:grid;grid-template-columns:${r}fr ${1 - r}fr;gap:${len(ctx, o.gap != null ? o.gap : 56, "x")};width:100%;align-items:${o.alignItems || "center"};text-align:left`;
      const L = h("div", "vk-col", null, e), R = h("div", "vk-col", null, e);
      ctx.build([].concat(left), L);
      ctx.build([].concat(right), R);
      return e;
    }, null);
  }
  function spacer(hh = 20) {
    return node({}, function spacer_(ctx) {
      const e = h("div");
      e.style.height = ctx.px(hh) + "px";
      e.style.flex = "none";
      return e;
    }, null);
  }
  function html(str, o = {}) {
    return node(o, function html_() {
      const w = h("div", "vk-html", str);
      if (w.children.length === 1 && !o.wrap) {
        const c = w.firstElementChild;
        c.remove();
        return c;
      }
      return w;
    }, null);
  }
  function el(fn, o = {}) {
    return node(o, function el_(ctx) {
      return fn(ctx);
    }, null);
  }
  function svg(markup, o = {}) {
    return node(o, function svg_(ctx) {
      const w = h("div", "vk-svg", markup.trim().startsWith("<svg") ? markup : `<svg viewBox="${o.viewBox || "0 0 400 300"}" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="${o.strokeWidth || 4}" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`);
      const svgEl = w.firstElementChild;
      svgEl.remove();
      svgEl.classList.add("vk-svg");
      if (o.w) svgEl.setAttribute("width", ctx.px(o.w));
      if (o.h) svgEl.setAttribute("height", ctx.px(o.h));
      return svgEl;
    }, "draw");
  }

  // src/fx/shapes.js
  var SHAPE_N = 72;
  function shapePoints(kind, n = SHAPE_N, o = {}) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 - Math.PI / 2;
      let r = 1;
      switch (kind) {
        case "circle":
          r = 1;
          break;
        case "star": {
          const k = o.points || 5, inner = o.inner || 0.45, seg2 = i / n * k * 2, f = seg2 - Math.floor(seg2), odd = Math.floor(seg2) % 2;
          const ra = odd ? inner : 1, rb = odd ? 1 : inner;
          const A = Math.PI / k;
          const ang = f * A;
          r = ra * rb * Math.sin(A) / (rb * Math.sin(A - ang) + ra * Math.sin(ang) + 1e-9);
          break;
        }
        case "diamond":
        case "square":
        case "triangle":
        case "hexagon":
        case "polygon": {
          const k = { diamond: 4, square: 4, triangle: 3, hexagon: 6 }[kind] || o.sides || 5, A = Math.PI * 2 / k;
          let aa = a + Math.PI / 2 + (kind === "square" ? Math.PI / 4 : 0);
          aa = (aa % A + A) % A - A / 2;
          r = Math.cos(Math.PI / k) / Math.cos(aa);
          break;
        }
        case "heart": {
          const t = i / n * Math.PI * 2;
          const x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          pts.push([x / 17, y / 17 - 0.1]);
          continue;
        }
        case "blob": {
          r = 1 + 0.18 * Math.sin(a * 3 + (o.seed || 0)) + 0.1 * Math.sin(a * 5 + 1.7 * (o.seed || 0));
          break;
        }
      }
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  function shapePath(kind, cx = 0, cy = 0, R = 100, o = {}) {
    const p = shapePoints(kind, o.n || SHAPE_N, o);
    return "M" + p.map(([x, y]) => `${(cx + x * R).toFixed(2)} ${(cy + y * R).toFixed(2)}`).join(" L") + " Z";
  }
  function shapePolygon(kind, cx, cy, R, o = {}) {
    const p = shapePoints(kind, o.n || 48, o);
    return "polygon(" + p.map(([x, y]) => `${(cx + x * R).toFixed(1)}px ${(cy + y * R).toFixed(1)}px`).join(",") + ")";
  }

  // src/fx/svg.js
  var FX = registry.fx;
  function shapesOf(el2) {
    if (/^(path|line|polyline|polygon|circle|ellipse|rect)$/i.test(el2.tagName)) return [el2];
    return [...el2.querySelectorAll("path,line,polyline,polygon,circle,ellipse,rect")];
  }
  FX.draw = (el2, o, api) => {
    const shapes = shapesOf(el2);
    api.tween(el2, { t: o.t, d: 1e-4, from: { opacity: 0 }, to: { opacity: 1 } });
    api.tween(shapes, { t: o.t, d: o.d || 1.2, ease: o.ease || "inOutCubic", stagger: o.each || o.drawStagger, from: { draw: api.exit ? 1 : 0 }, to: { draw: api.exit ? 0 : 1 } });
  };
  FX["draw-fill"] = (el2, o, api) => {
    const shapes = shapesOf(el2), d = o.d || 1.2;
    FX.draw(el2, o, api);
    shapes.forEach((s2) => {
      if (!s2.getAttribute("fill-opacity")) s2.setAttribute("fill-opacity", "0");
    });
    api.tween(shapes, { t: o.fillAt != null ? o.fillAt : o.t + d * 0.75, d: o.fillD || 0.5, ease: "outCubic", stagger: o.each, from: { "attr:fill-opacity": 0 }, to: { "attr:fill-opacity": 1 } });
  };
  FX.fill = FX["draw-fill"];
  var tmpSvg = null;
  function resample(d, n = 120) {
    if (!tmpSvg) {
      tmpSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      tmpSvg.setAttribute("style", "position:absolute;left:-9999px;top:0;width:10px;height:10px");
      document.body.appendChild(tmpSvg);
    }
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    tmpSvg.appendChild(p);
    const L = p.getTotalLength(), pts = [];
    for (let i = 0; i < n; i++) {
      const q = p.getPointAtLength(L * i / n);
      pts.push(`${q.x.toFixed(2)} ${q.y.toFixed(2)}`);
    }
    p.remove();
    return "M" + pts.join(" L") + " Z";
  }
  FX.morph = (el2, o, api) => {
    const path2 = el2.tagName.toLowerCase() === "path" ? el2 : el2.querySelector("path");
    const seq = o.paths ? o.paths.slice() : [path2.getAttribute("d"), o.to];
    const allCompat = seq.every((d) => compatible(d, seq[0]));
    const norm2 = allCompat ? seq : seq.map((d) => resample(d, o.n || 120));
    path2.setAttribute("d", norm2[0]);
    const step = o.each || (o.d || 0.9) + 0.4;
    for (let i = 1; i < norm2.length; i++) api.tween(path2, { t: o.t + (i - 1) * step, d: o.d || 0.9, ease: o.ease || "inOutCubic", from: { "attr:d": norm2[i - 1] }, to: { "attr:d": norm2[i] } });
  };

  // src/fx/text.js
  var FX2 = registry.fx;
  Object.assign(FX2, {
    fade: { from: { opacity: 0 }, to: { opacity: 1 } },
    up: { make: (o) => ({ from: { opacity: 0, y: o.dist || 28 }, to: { opacity: 1, y: 0 } }) },
    down: { make: (o) => ({ from: { opacity: 0, y: -(o.dist || 28) }, to: { opacity: 1, y: 0 } }) },
    left: { make: (o) => ({ from: { opacity: 0, x: -(o.dist || 44) }, to: { opacity: 1, x: 0 } }) },
    // enters from the left
    right: { make: (o) => ({ from: { opacity: 0, x: o.dist || 44 }, to: { opacity: 1, x: 0 } }) },
    scale: { from: { opacity: 0, scale: 0.9 }, to: { opacity: 1, scale: 1 } },
    pop: { from: { opacity: 0, scale: 0.6 }, to: { opacity: 1, scale: 1 }, ease: "outBack" },
    zoom: { from: { opacity: 0, scale: 1.15 }, to: { opacity: 1, scale: 1 } },
    blur: { from: { opacity: 0, blur: 14 }, to: { opacity: 1, blur: 0 } },
    rise: { make: (o) => ({ from: { opacity: 0, y: o.dist || 40, blur: 8 }, to: { opacity: 1, y: 0, blur: 0 }, ease: "outExpo" }) },
    wipe: { from: { clipPath: "inset(0% 100% 0% 0%)" }, to: { clipPath: "inset(0% 0% 0% 0%)" }, instant: { opacity: 1 } },
    "wipe-left": { from: { clipPath: "inset(0% 0% 0% 100%)" }, to: { clipPath: "inset(0% 0% 0% 0%)" }, instant: { opacity: 1 } },
    "wipe-up": { from: { clipPath: "inset(100% 0% 0% 0%)" }, to: { clipPath: "inset(0% 0% 0% 0%)" }, instant: { opacity: 1 } },
    "wipe-down": { from: { clipPath: "inset(0% 0% 100% 0%)" }, to: { clipPath: "inset(0% 0% 0% 0%)" }, instant: { opacity: 1 } },
    reveal: { from: { y: "100%", clipPath: "inset(0% 0% 100% 0%)" }, to: { y: "0%", clipPath: "inset(0% 0% 0% 0%)" }, instant: { opacity: 1 }, ease: "outExpo" },
    grow: { from: { scaleX: 0 }, to: { scaleX: 1 }, instant: { opacity: 1 }, origin: "left center" },
    "grow-y": { from: { scaleY: 0 }, to: { scaleY: 1 }, instant: { opacity: 1 }, origin: "center bottom" },
    flip: { from: { opacity: 0, rotateX: -80 }, to: { opacity: 1, rotateX: 0 }, origin: "center bottom", ease: "outBack" },
    stretch: { from: { fontStretch: "62%", letterSpacing: "0.12em", opacity: 0 }, to: { fontStretch: "100%", letterSpacing: "0em", opacity: 1 }, ease: "outExpo" },
    // needs a variable-width font (Archivo)
    none: { from: {}, to: {} }
  });
  function split2(el2, mode) {
    const key = "__vk_" + mode;
    if (el2[key]) return el2[key];
    const pieces = [], texts = [], tw = document.createTreeWalker(el2, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) texts.push(tw.currentNode);
    texts.forEach((tn) => {
      const frag = document.createDocumentFragment(), str = tn.textContent;
      let tokens;
      if (mode === "words") tokens = str.includes("|") ? str.split("|") : /\S\s+\S/.test(str) ? str.split(/(\s+)/) : Array.from(str);
      else tokens = str.split(/(\s+)/);
      tokens.forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) {
          frag.appendChild(document.createTextNode(tok));
          return;
        }
        if (mode === "words") {
          const w = document.createElement("span");
          w.className = "vk-word";
          w.textContent = tok;
          frag.appendChild(w);
          pieces.push(w);
          return;
        }
        const word = document.createElement("span");
        word.className = "vk-wordwrap";
        Array.from(tok).forEach((ch) => {
          const inner = document.createElement("span");
          inner.className = mode === "letters" ? "vk-chi" : "vk-c";
          inner.textContent = ch;
          if (mode === "letters") {
            const box = document.createElement("span");
            box.className = "vk-ch";
            box.appendChild(inner);
            word.appendChild(box);
          } else word.appendChild(inner);
          pieces.push(inner);
        });
        frag.appendChild(word);
      });
      tn.parentNode.replaceChild(frag, tn);
    });
    el2[key] = pieces;
    return pieces;
  }
  function perPiece(mode, A, B4, defEase, defD, defEach, exitTo) {
    return (el2, o, api) => {
      const pieces = split2(el2, mode === "words" ? "words" : mode === "clip" ? "letters" : "chars");
      const each = o.each != null ? o.each : defEach;
      let a = typeof A === "function" ? A(o, el2) : A, b = typeof B4 === "function" ? B4(o, el2) : B4, ease = o.ease || defEase;
      if (api.exit) {
        [a, b] = [b, exitTo || a];
        ease = o.ease || "inCubic";
      }
      api.tween(pieces, { t: o.t, d: o.d || defD, ease, stagger: o.stagger || each, from: a, to: b, origin: o.origin });
    };
  }
  FX2.letters = perPiece("clip", { y: "110%" }, { y: "0%" }, "swift", 0.6, 0.035, { y: "-110%" });
  FX2["letters-fade"] = perPiece("chars", { opacity: 0, y: "0.35em" }, { opacity: 1, y: "0em" }, "outCubic", 0.5, 0.03);
  FX2["letters-blur"] = perPiece("chars", { opacity: 0, blur: 12, scale: 1.3 }, { opacity: 1, blur: 0, scale: 1 }, "outExpo", 0.7, 0.04);
  FX2.domino = (el2, o, api) => {
    el2.style.perspective = "800px";
    perPiece("chars", { rotateX: -95, opacity: 0 }, { rotateX: 0, opacity: 1 }, "outBack", 0.55, 0.05)(el2, { origin: "50% 85%", ...o }, api);
  };
  FX2.words = perPiece("words", { opacity: 0, scale: 1.45 }, { opacity: 1, scale: 1 }, "outBack", 0.5, 0.09);
  FX2["words-up"] = perPiece("words", { opacity: 0, y: "0.6em" }, { opacity: 1, y: "0em" }, "outExpo", 0.6, 0.08);
  FX2.squash = (el2, o, api) => {
    const pieces = split2(el2, "chars"), each = o.each != null ? o.each : 0.05, d = o.d || 0.55;
    pieces.forEach((c, i) => api.fn(c, (local) => {
      const p = clamp01((local - o.t - i * each) / d);
      if (api.exit) {
        const q = 1 - p;
        c.style.opacity = q;
        c.style.transform = `scale(${q})`;
        return;
      }
      const sc = EASE.outBack(p), sq = 1 + 0.45 * Math.sin(Math.min(1, p * 1.6) * Math.PI) * (1 - p);
      c.style.opacity = p > 0 ? 1 : 0;
      c.style.transform = `scale(${sc / sq},${sc * sq})`;
      c.style.transformOrigin = "50% 90%";
    }));
  };
  FX2.assemble = (el2, o, api) => {
    const pieces = split2(el2, "chars"), n = pieces.length, d = o.d || 0.9, spread = o.spread || 1, seed = o.seed || 7;
    pieces.forEach((c, i) => {
      const r1 = hash(i * 3.1 + seed), r2 = hash(i * 5.7 + seed), r3 = hash(i * 9.3 + seed), delay = hash(i * 1.9 + seed) * (o.each != null ? o.each * n : 0.35);
      const from = { opacity: 0, x: `${((r1 - 0.5) * 3 * spread).toFixed(2)}em`, y: `${((r2 - 0.5) * 2.2 * spread).toFixed(2)}em`, rotate: (r3 - 0.5) * 160, scale: 0.3 + r2 };
      const to = { opacity: 1, x: "0em", y: "0em", rotate: 0, scale: 1 };
      api.tween(c, { t: o.t + delay, d, ease: o.ease || "outQuart", from: api.exit ? to : from, to: api.exit ? from : to });
    });
  };
  FX2.wave = (el2, o, api) => {
    const pieces = split2(el2, "chars"), amp = o.amp || 0.12, speed = o.speed || 6;
    pieces.forEach((c, i) => api.fn(c, (local) => {
      const k = clamp01((local - o.t) / 0.4);
      c.style.transform = `translateY(${(-Math.sin(local * speed - i * 0.55) * amp * k).toFixed(3)}em)`;
    }));
  };
  FX2.type = (el2, o, api) => {
    const full = o.text != null ? o.text : el2.getAttribute("data-text") || el2.textContent;
    const chars = Array.from(full), cps = o.cps || 30, t0 = o.t || 0, caret = o.caret !== false;
    el2.textContent = "";
    const typed = document.createElement("span"), rest = document.createElement("span");
    typed.style.position = "relative";
    rest.style.visibility = "hidden";
    el2.appendChild(typed);
    if (o.reserve !== false) el2.appendChild(rest);
    api.fn(el2, (local) => {
      let n = Math.max(0, Math.floor((local - t0) * cps + 1e-6));
      if (n > chars.length) n = chars.length;
      if (api.exit) n = chars.length - n;
      const s2 = chars.slice(0, n).join(""), r = chars.slice(n).join("");
      if (typed.textContent !== s2) typed.textContent = s2;
      if (rest.textContent !== r) rest.textContent = r;
      const typing = n < chars.length && local >= t0;
      typed.classList.toggle("vk-caret", caret && local >= t0 - 0.3 && (typing || Math.floor(local * 2) % 2 === 0) && (o.caretHold == null || local < t0 + chars.length / cps + o.caretHold));
    });
    if (api.scene && api.scene.video.cfg.autoSfx && !api.exit && o.sfx !== false) for (let i = 0; i < chars.length; i += 2) api.scene.sfx(t0 + i / cps, "tick", 0.22);
  };
  if (typeof document !== "undefined") {
    const st = document.createElement("style");
    st.textContent = ".vk-caret::after{position:absolute;left:100%;top:0}";
    document.head.appendChild(st);
  }
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\@$";
  FX2.scramble = (el2, o, api) => {
    const full = o.text != null ? o.text : el2.textContent, chars = Array.from(full), each = o.each != null ? o.each : 0.04, d = o.d || 0.5, set = o.glyphs || GLYPHS, rate = o.rate || 20;
    api.fn(el2, (local) => {
      const f = Math.floor(local * rate);
      let s2 = "";
      chars.forEach((ch, i) => {
        const tDone = o.t + i * each + d, tShow = o.t + i * each * 0.35;
        if (/\s/.test(ch)) {
          s2 += ch;
          return;
        }
        if (api.exit ? local < o.t + i * each : local >= tDone) s2 += ch;
        else if (local >= tShow) s2 += set[Math.floor(hash(f * 13.1 + i * 7.3) * set.length)];
        else s2 += "\xA0";
      });
      if (el2.textContent !== s2) el2.textContent = s2;
    });
  };
  FX2.decode = FX2.scramble;
  FX2.count = (el2, o, api) => {
    const a = +o.from || 0, b = o.to != null ? +o.to : parseFloat(el2.textContent) || 0, dec = o.decimals | 0, sep = o.sep == null ? "" : o.sep;
    const d = o.d || 1.2, ease = getEase(o.ease || "outExpo"), pre = o.prefix || "", suf = o.suffix || "";
    const fmt = o.format || ((v) => {
      let s2 = v.toFixed(dec);
      if (sep) {
        const p = s2.split(".");
        p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
        s2 = p.join(".");
      }
      return pre + s2 + suf;
    });
    api.fn(el2, (local) => {
      const p = clamp01((local - o.t) / d);
      const s2 = fmt(a + (b - a) * ease(api.exit ? 1 - p : p));
      if (el2.textContent !== s2) el2.textContent = s2;
    });
  };
  function sweep(cls) {
    return (el2, o, api) => {
      let targets = [...el2.querySelectorAll("." + cls)];
      if (!targets.length) {
        if (getComputedStyle(el2).display === "inline") {
          el2.classList.add(cls);
          targets = [el2];
        } else {
          const s2 = document.createElement("span");
          s2.className = cls;
          while (el2.firstChild) s2.appendChild(el2.firstChild);
          el2.appendChild(s2);
          targets = [s2];
        }
      }
      api.tween(targets, { t: o.t, d: o.d || 0.6, ease: o.ease || "inOutCubic", stagger: o.each != null ? o.each : 0.25, from: { "--p": api.exit ? "100%" : "0%" }, to: { "--p": api.exit ? "0%" : "100%" } });
    };
  }
  FX2.highlight = sweep("vk-mark");
  FX2.marker = FX2.highlight;
  FX2.underline = sweep("vk-ul");
  FX2.swap = (el2, o, api) => {
    const c0 = getComputedStyle(el2).color, c12 = o.color || api.theme.modes[api.scene.mode || api.theme.mode].accent;
    api.tween(el2, { t: o.t, d: o.d || 0.3, ease: o.ease || "outCubic", from: { color: api.exit ? c12 : c0 }, to: { color: api.exit ? c0 : c12 } });
  };
  FX2.stack = (el2, o, api) => {
    const html2 = el2.innerHTML.split(/<br\s*\/?>|\n/i).filter((s2) => s2.trim());
    el2.innerHTML = "";
    el2.style.display = "block";
    const lines = html2.map((h3) => {
      const l = document.createElement("div");
      l.className = "vk-stack-line";
      l.style.cssText = "white-space:nowrap;line-height:.98;overflow:hidden;padding:.02em 0";
      const s2 = document.createElement("span");
      s2.style.display = "inline-block";
      s2.innerHTML = h3;
      l.appendChild(s2);
      el2.appendChild(l);
      return { l, s: s2 };
    });
    api.after(() => withVisible(api.scene, () => {
      const W = o.width || el2.getBoundingClientRect().width / scaleOf(el2) || 600;
      lines.forEach(({ l, s: s2 }) => {
        const fs = parseFloat(getComputedStyle(l).fontSize), w = s2.getBoundingClientRect().width / scaleOf(el2);
        if (w > 0) l.style.fontSize = Math.min(o.max || fs * 3, fs * W / w * 0.995) + "px";
      });
    }));
    const each = o.each != null ? o.each : 0.22;
    lines.forEach(({ s: s2 }, i) => {
      const dir = i % 2 ? 1 : -1, a = { x: dir * 105 + "%", opacity: 1 }, b = { x: "0%", opacity: 1 };
      api.tween(s2, { t: o.t + i * each, d: o.d || 0.55, ease: o.ease || "outExpo", from: api.exit ? b : a, to: api.exit ? { x: -dir * 105 + "%", opacity: 1 } : b });
    });
  };
  function withVisible(scene, fn) {
    const el2 = scene && scene.el, was = el2 && el2.classList.contains("on");
    if (el2 && !was) el2.classList.add("on");
    const cam = scene && scene.cam, tf = cam && cam.style.transform;
    if (cam) cam.style.transform = "";
    try {
      fn();
    } finally {
      if (el2 && !was) el2.classList.remove("on");
      if (cam) cam.style.transform = tf;
    }
  }
  function scaleOf(el2) {
    const st = document.getElementById("stage");
    if (!st) return 1;
    const r = st.getBoundingClientRect();
    return r.width / st.offsetWidth || 1;
  }

  // src/fx/transitions.js
  var T2 = registry.transitions;
  var pct = (v) => (v * 100).toFixed(3) + "%";
  var focal = (c) => ({ x: c.o.x == null ? c.W / 2 : c.o.x <= 1 ? c.o.x * c.W : c.o.x, y: c.o.y == null ? c.H / 2 : c.o.y <= 1 ? c.o.y * c.H : c.o.y });
  T2.none = () => ({});
  T2.fade = (e) => ({ in: { opacity: e } });
  T2.crossfade = (e) => ({ in: { opacity: e }, out: { opacity: 1 - e } });
  var DIRS = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] };
  Object.entries(DIRS).forEach(([d, [dx, dy]]) => {
    const tf = (v) => `translate(${pct(dx * v)},${pct(dy * v)})`;
    T2["slide-" + d] = (e) => ({ in: { transform: tf(1 - e) } });
    T2["push-" + d] = (e) => ({ in: { transform: tf(1 - e) }, out: { transform: tf(-e) } });
    T2["whip-" + d] = (e, c) => {
      const b = Math.sin(Math.PI * c.raw) * 18;
      return { in: { transform: tf(1 - e), filter: `blur(${b.toFixed(2)}px)` }, out: { transform: tf(-e), filter: `blur(${b.toFixed(2)}px)` } };
    };
    const clip = { left: (v) => `inset(0% 0% 0% ${pct(1 - v)})`, right: (v) => `inset(0% ${pct(1 - v)} 0% 0%)`, up: (v) => `inset(${pct(1 - v)} 0% 0% 0%)`, down: (v) => `inset(0% 0% ${pct(1 - v)} 0%)` }[d];
    T2["wipe-" + d] = (e) => ({ in: { clipPath: clip(e) } });
  });
  T2.wipe = T2["wipe-right"] = (e) => ({ in: { clipPath: `inset(0% ${pct(1 - e)} 0% 0%)` } });
  T2["wipe-right"] = T2.wipe;
  T2["zoom-in"] = (e) => ({ in: { opacity: e, transform: `scale(${1.25 - 0.25 * e})` }, out: { transform: `scale(${1 + 0.18 * e})` } });
  T2.zoom = T2["zoom-in"];
  T2["zoom-out"] = (e) => ({ in: { opacity: e, transform: `scale(${0.82 + 0.18 * e})` }, out: { transform: `scale(${1 - 0.1 * e})` } });
  T2.blur = (e) => ({ in: { opacity: e, filter: `blur(${((1 - e) * 22).toFixed(2)}px)` }, out: { filter: `blur(${(e * 22).toFixed(2)}px)` } });
  T2.iris = (e, c) => {
    const f = focal(c), R = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y));
    return { in: { clipPath: `circle(${(e * R).toFixed(1)}px at ${f.x}px ${f.y}px)` } };
  };
  T2.circle = T2.iris;
  T2["iris-out"] = (e, c) => {
    const f = focal(c), R = Math.hypot(c.W, c.H) / 2 * 1.05;
    return { under: true, out: { clipPath: `circle(${((1 - e) * R).toFixed(1)}px at ${f.x}px ${f.y}px)` } };
  };
  var COVER = { circle: 1, diamond: 1.45, square: 1.05, triangle: 2.1, hexagon: 1.2, star: 2.35, heart: 1.5, blob: 1.2 };
  ["diamond", "star", "hexagon", "triangle", "heart", "square", "blob"].forEach((k) => {
    T2["shape-" + k] = (e, c) => {
      const f = focal(c), R = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y)) * COVER[k] * e;
      return { in: { clipPath: shapePolygon(k, f.x, f.y, Math.max(R, 0.01), { points: c.o.points }) } };
    };
  });
  T2.split = (e) => ({ in: { clipPath: `inset(0% ${pct((1 - e) / 2)} 0% ${pct((1 - e) / 2)})` } });
  T2["split-h"] = (e) => ({ in: { clipPath: `inset(${pct((1 - e) / 2)} 0% ${pct((1 - e) / 2)} 0%)` } });
  T2["split-open"] = (e) => ({ under: true, out: { clipPath: `polygon(0% 0%, ${pct(0.5 - e / 2)} 0%, ${pct(0.5 - e / 2)} 100%, 0% 100%, 0% 0%, 100% 0%, 100% 100%, ${pct(0.5 + e / 2)} 100%, ${pct(0.5 + e / 2)} 0%, 100% 0%)` } });
  T2.diagonal = (e) => {
    const a = -40 + e * 180;
    return { in: { clipPath: `polygon(0% 0%,${a}% 0%,${a - 40}% 100%,0% 100%)` } };
  };
  T2.blinds = (e, c) => {
    const n = c.o.n || 8, pts = [];
    for (let i = 0; i < n; i++) {
      const y0 = i / n * 100, y1 = y0 + e * 100 / n;
      pts.push(`0% ${y0}%`, `100% ${y0}%`, `100% ${y1}%`, `0% ${y1}%`, `0% ${y0}%`);
    }
    return { in: { clipPath: `polygon(${pts.join(",")})` } };
  };
  T2.flash = (e, c) => ({ in: { opacity: c.raw >= 0.5 ? 1 : 0 }, flash: Math.pow(1 - Math.abs(2 * c.raw - 1), 1.5), flashColor: c.o.color || "#fff" });
  T2.dip = (e, c) => ({ in: { opacity: c.raw >= 0.5 ? 1 : 0 }, flash: 1 - Math.abs(2 * c.raw - 1), flashColor: c.o.color || "#000" });
  T2.glitch = (e, c) => {
    const raw = c.raw;
    if (raw >= 1) return {};
    const f = c.frame, j = hash(f * 1.3) - 0.5;
    if (raw > 0.7) return { in: { transform: `translateX(${(j * 24 * (1 - raw)).toFixed(1)}px)` } };
    const top = hash(f * 3.1) * 70, h3 = 12 + hash(f * 7.7) * 40 * raw / 0.7;
    return { in: { clipPath: `inset(${top.toFixed(1)}% 0% ${Math.max(0, 100 - top - h3).toFixed(1)}% 0%)`, transform: `translateX(${(j * 90).toFixed(1)}px)`, filter: `hue-rotate(${Math.round(hash(f + 2) * 180)}deg) saturate(1.6)` }, out: { transform: `translateX(${(-j * 30).toFixed(1)}px)` } };
  };
  T2.slice = T2.glitch;
  T2["zoom-through"] = (e, c) => {
    const f = focal(c), s2 = 1 + Math.pow(c.raw, 3) * (c.o.scale || 40);
    return { under: true, out: { transformOrigin: `${f.x}px ${f.y}px`, transform: `scale(${s2.toFixed(3)})`, opacity: 1 - seg(c.raw, 0.55, 1) }, in: { transform: `scale(${(1.15 - 0.15 * e).toFixed(4)})` } };
  };

  // src/fx/blocks.js
  var B = registry.blocks;
  function highlightLine(ln, KW) {
    const re = new RegExp(`(\\/\\/.*$|(?<=^|\\s)#.*$)|("[^"]*"|'[^']*'|\`[^\`]*\`)|${KW.source}`, "g");
    let out = "", last = 0, m;
    while (m = re.exec(ln)) {
      out += esc2(ln.slice(last, m.index));
      const c = m[1] ? "var(--muted)" : m[2] ? "var(--accent2)" : "var(--accent)";
      out += `<span style="color:${c}">${esc2(m[0])}</span>`;
      last = re.lastIndex;
      if (m[0] === "") re.lastIndex++;
    }
    return out + esc2(ln.slice(last));
  }
  var esc2 = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  B.terminal = (lines, o = {}) => node(o, function terminal(ctx) {
    const px3 = ctx.px, win = h("div", "vk-term vk-mono");
    win.style.cssText = `width:${len(ctx, o.w || 620, "x")};background:var(--surface);border:1px solid var(--line);border-radius:${px3(16)}px;padding:${px3(22)}px ${px3(28)}px;font-size:${size(ctx, o.size || 21)};line-height:1.65;text-align:left;color:var(--fg);box-shadow:0 ${px3(30)}px ${px3(60)}px -${px3(30)}px rgba(0,0,0,.45)`;
    const bar = h("div", null, `<i></i><i></i><i></i>${o.title ? `<span>${esc2(o.title)}</span>` : ""}`, win);
    bar.style.cssText = `display:flex;gap:${px3(8)}px;align-items:center;margin-bottom:${px3(14)}px;font-size:.8em;color:var(--muted)`;
    [...bar.querySelectorAll("i")].forEach((i, k) => i.style.cssText = `width:${px3(12)}px;height:${px3(12)}px;border-radius:50%;background:${["#FF5F57", "#FEBC2E", "#28C840"][k]};opacity:.9`);
    if (bar.querySelector("span")) bar.querySelector("span").style.marginLeft = px3(10) + "px";
    const t0 = ctx.at(o);
    let t = t0 + 0.35;
    const cps = o.cps || 32, sc = ctx.scene;
    sc.fx(win, o.winFx || "fade", { t: t0, d: 0.4 });
    lines.forEach((line) => {
      const row2 = h("div", null, null, win);
      row2.style.whiteSpace = "pre-wrap";
      const m = /^\$\s?(.*)$/.exec(line);
      if (m) {
        row2.innerHTML = `<span style="color:var(--prompt,var(--accent2))">${esc2(o.prompt || "$")} </span><span class="cmd"></span>`;
        sc.fx(row2.querySelector(".cmd"), "type", { t, cps, text: m[1], caretHold: 0.6 });
        t += Array.from(m[1]).length / cps + 0.45;
      } else {
        const ok = /^✓/.test(line), warn = /^[✗!]/.test(line);
        row2.innerHTML = ok ? `<span style="color:var(--ok,#2ED47A)">\u2713</span>${md(line.slice(1))}` : warn ? `<span style="color:#FF5A36">${line[0]}</span>${md(line.slice(1))}` : md(line.replace(/^>\s?/, ""));
        if (!ok && !warn) row2.style.color = "var(--muted)";
        sc.fx(row2, "fade", { t, d: 0.3 });
        t += o.gap || 0.3;
      }
    });
    ctx.advance(t);
    return win;
  }, null);
  B.code = (src2, o = {}) => node(o, function code(ctx) {
    const px3 = ctx.px, pre = h("div", "vk-code vk-mono");
    pre.style.cssText = `width:${len(ctx, o.w || 620, "x")};background:var(--surface);border:1px solid var(--line);border-radius:${px3(14)}px;padding:${px3(22)}px ${px3(26)}px;font-size:${size(ctx, o.size || 20)};line-height:1.6;text-align:left;white-space:pre;color:var(--fg);overflow:hidden`;
    const KW = /\b(const|let|var|function|return|import|from|export|await|async|new|if|else|for|of|in|class|true|false|null|def|fn|pub|use|package|func)\b/g;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.12;
    src2.replace(/\n$/, "").split("\n").forEach((ln, i) => {
      const hs = highlightLine(ln, KW);
      const row2 = h("div", null, hs || " ", pre);
      if (o.highlight && o.highlight.includes(i + 1)) row2.style.cssText = `background:color-mix(in srgb,var(--accent) 22%,transparent);margin:0 -${px3(26)}px;padding:0 ${px3(26)}px`;
      ctx.scene.fx(row2, "left", { t: t0 + i * each, d: 0.35, dist: px3(14) });
    });
    ctx.advance(t0 + src2.split("\n").length * each);
    return pre;
  }, null);
  B.cards = (items, o = {}) => node(o, function cards(ctx) {
    const px3 = ctx.px, g = h("div", "vk-cards");
    g.style.cssText = `display:grid;grid-template-columns:repeat(${o.cols || Math.min(4, items.length)},1fr);gap:${px3(o.gap || 24)}px;width:100%;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.15;
    items.forEach((it, i) => {
      const c = h("div", "vk-card vk-surface", null, g);
      c.style.cssText += `;padding:${px3(22)}px ${px3(24)}px;display:flex;flex-direction:column;gap:${px3(8)}px;border-radius:var(--vk-radius)`;
      if (it.icon) h("div", null, it.icon, c).style.cssText = `font-size:${px3(34)}px;line-height:1;color:var(--accent)`;
      if (it.tag) h("div", "vk-label", esc2(it.tag), c).style.fontSize = px3(16) + "px";
      h("div", null, md(it.title), c).style.cssText = `font-size:${px3(o.titleSize || 28)}px;font-weight:800;line-height:1.2;color:var(--fg)`;
      if (it.text) h("div", null, md(it.text), c).style.cssText = `font-size:${px3(o.textSize || 19)}px;line-height:1.45;color:var(--muted)`;
      if (it.hl) {
        c.style.background = "var(--accent)";
        c.style.borderColor = "var(--accent)";
        [...c.children].forEach((k) => k.style.color = "var(--on-accent)");
      }
      ctx.scene.fx(c, o.itemFx || "pop", { t: t0 + i * each, d: 0.45 });
    });
    ctx.advance(t0 + items.length * each);
    return g;
  }, null);
  B.columns = (items, o = {}) => node(o, function columns(ctx) {
    const px3 = ctx.px, g = h("div", "vk-columns");
    g.style.cssText = `display:grid;grid-template-columns:repeat(${items.length},1fr);gap:${px3(28)}px;width:100%;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.3;
    items.forEach((it, i) => {
      const c = h("div", null, null, g);
      c.style.cssText = `border-left:${px3(3)}px solid var(--line);padding:${px3(4)}px 0 ${px3(4)}px ${px3(18)}px`;
      h("div", null, md(it.title), c).style.cssText = `font-size:${px3(30)}px;font-weight:900;line-height:1.2`;
      if (it.code) h("div", "vk-mono", esc2(it.code), c).style.cssText = `font-size:${px3(18)}px;color:var(--accent2);margin-top:${px3(8)}px`;
      if (it.text) h("div", null, md(it.text), c).style.cssText = `font-size:${px3(19)}px;line-height:1.45;color:var(--muted);margin-top:${px3(8)}px`;
      ctx.scene.fx(c, "up", { t: t0 + i * each, d: 0.5 });
      ctx.scene.tween(c, { t: t0 + i * each + 0.2, d: 0.4, from: { borderLeftColor: ctx.video.color("line", ctx.scene.mode) }, to: { borderLeftColor: ctx.video.color("accent", ctx.scene.mode) } });
    });
    ctx.advance(t0 + items.length * each);
    return g;
  }, null);
  B.kv = (rows2, o = {}) => node(o, function kv(ctx) {
    const px3 = ctx.px, box = h("div", "vk-kv");
    box.style.cssText = `width:${o.w ? len(ctx, o.w, "x") : "100%"};border-top:${px3(2)}px solid var(--fg);text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.4;
    rows2.forEach(([k, v], i) => {
      const r = h("div", null, null, box);
      r.style.cssText = `display:flex;align-items:center;min-height:${px3(o.rowH || 70)}px;border-bottom:1px solid var(--line);gap:${px3(20)}px`;
      h("div", null, md(k), r).style.cssText = `width:${px3(o.keyW || 200)}px;flex:none;font-weight:900;font-size:${px3(23)}px;color:var(--accent)`;
      h("div", null, md(v), r).style.cssText = `font-size:${px3(22)}px;line-height:1.35`;
      ctx.scene.fx(r, "left", { t: t0 + i * each, d: 0.4 });
    });
    ctx.advance(t0 + rows2.length * each);
    return box;
  }, null);
  B.gantt = (spec, o = {}) => node(o, function gantt(ctx) {
    const px3 = ctx.px, [a, b] = spec.range || [0, Math.max(...spec.rows.map((r) => r.end))];
    const box = h("div", "vk-gantt");
    box.style.cssText = `width:100%;text-align:left;position:relative`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.25;
    spec.rows.forEach((r, i) => {
      const row2 = h("div", null, null, box);
      row2.style.cssText = `display:flex;align-items:center;height:${px3(46)}px;gap:${px3(16)}px`;
      h("div", "vk-mono", md(r.label), row2).style.cssText = `width:${px3(o.labelW || 170)}px;flex:none;font-size:${px3(18)}px;color:var(--muted);text-align:right`;
      const track = h("div", null, null, row2);
      track.style.cssText = `position:relative;flex:1;height:${px3(26)}px;border-left:1px solid var(--line)`;
      const bar = h("div", null, r.text ? `<span>${md(r.text)}</span>` : "", track);
      bar.style.cssText = `position:absolute;top:0;height:100%;left:${(r.start - a) / (b - a) * 100}%;width:${(r.end - r.start) / (b - a) * 100}%;background:${r.hl ? "var(--accent)" : "var(--accent2)"};border-radius:${px3(5)}px;transform-origin:left center;font-size:${px3(15)}px;color:var(--on-accent);display:flex;align-items:center;padding-left:${px3(8)}px;white-space:nowrap;overflow:hidden`;
      ctx.scene.fx(bar, "grow", { t: t0 + i * each, d: 0.5, ease: "outCubic" });
    });
    if (spec.unit) {
      const ax = h("div", "vk-mono", `${a}${spec.unit} \u2192 ${b}${spec.unit}`, box);
      ax.style.cssText = `margin-left:${px3((o.labelW || 170) + 16)}px;font-size:${px3(15)}px;color:var(--muted);margin-top:${px3(6)}px`;
      ctx.scene.fx(ax, "fade", { t: t0, d: 0.4 });
    }
    ctx.advance(t0 + spec.rows.length * each);
    return box;
  }, null);
  B.diagram = (spec, o = {}) => node(o, function diagram(ctx) {
    const px3 = ctx.px, W = spec.w || 1e3, H = spec.h || 400;
    const box = h("div", "vk-diagram");
    box.style.cssText = `position:relative;width:${px3(W)}px;height:${px3(H)}px;flex:none`;
    const svgEl = s("svg", { width: px3(W), height: px3(H), viewBox: `0 0 ${W} ${H}`, fill: "none", stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, box);
    svgEl.style.cssText = "position:absolute;left:0;top:0;overflow:visible;color:var(--accent)";
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.35, nt = {}, N = {};
    spec.nodes.forEach((n, i) => {
      N[n.id] = n;
      const e = h("div", "vk-node", `<b>${md(n.label)}</b>${n.sub ? `<span>${md(n.sub)}</span>` : ""}`, box);
      e.style.cssText = `position:absolute;left:${px3(n.x)}px;top:${px3(n.y)}px;width:${px3(n.w || 200)}px;height:${px3(n.h || 90)}px;border-radius:${px3(14)}px;border:${px3(2)}px solid ${n.hl ? "var(--accent)" : "var(--fg)"};background:${n.hl ? "var(--accent)" : "var(--surface)"};color:${n.hl ? "var(--on-accent)" : "var(--fg)"};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:${px3(4)}px;${n.dashed ? "border-style:dashed;background:transparent;" : ""}`;
      e.querySelector("b").style.cssText = `font-size:${px3(n.size || 24)}px;font-weight:900;line-height:1.15`;
      const sp = e.querySelector("span");
      if (sp) sp.style.cssText = `font:600 ${px3(15)}px var(--vk-mono);opacity:.8`;
      nt[n.id] = n.at != null ? ctx.scene.time(n.at) : t0 + i * each;
      ctx.scene.fx(e, n.fx || "pop", { t: nt[n.id], d: 0.45 });
    });
    let last = t0 + spec.nodes.length * each;
    (spec.edges || []).forEach(([a, b, lab], k) => {
      const A = N[a], Bn = N[b], aw = A.w || 200, ah = A.h || 90, bw = Bn.w || 200, bh = Bn.h || 90;
      let x1, y1, x2, y2, ang;
      if (Bn.x >= A.x + aw) {
        x1 = A.x + aw;
        y1 = A.y + ah / 2;
        x2 = Bn.x - 4;
        y2 = Bn.y + bh / 2;
        ang = 0;
      } else if (Bn.x + bw <= A.x) {
        x1 = A.x;
        y1 = A.y + ah / 2;
        x2 = Bn.x + bw + 4;
        y2 = Bn.y + bh / 2;
        ang = Math.PI;
      } else if (Bn.y >= A.y + ah) {
        x1 = A.x + aw / 2;
        y1 = A.y + ah;
        x2 = Bn.x + bw / 2;
        y2 = Bn.y - 4;
        ang = Math.PI / 2;
      } else {
        x1 = A.x + aw / 2;
        y1 = A.y;
        x2 = Bn.x + bw / 2;
        y2 = Bn.y + bh + 4;
        ang = -Math.PI / 2;
      }
      const horiz = ang === 0 || ang === Math.PI, m = horiz ? (x1 + x2) / 2 : (y1 + y2) / 2;
      const d = horiz ? `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}` : `M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}`;
      const g = s("g", {}, svgEl);
      s("path", { d }, g);
      const L = 12, a1 = ang + 2.6, a2 = ang - 2.6;
      s("path", { d: `M${(x2 + L * Math.cos(a1)).toFixed(1)} ${(y2 + L * Math.sin(a1)).toFixed(1)} L${x2} ${y2} L${(x2 + L * Math.cos(a2)).toFixed(1)} ${(y2 + L * Math.sin(a2)).toFixed(1)}` }, g);
      const te = (o.edgeAt ? ctx.scene.time(o.edgeAt) : Math.max(nt[a], nt[b]) + 0.35) + k * 0.08;
      ctx.scene.fx(g, "draw", { t: te, d: 0.5 });
      last = Math.max(last, te + 0.5);
      if (lab) {
        const l = h("div", "vk-mono", md(lab), box);
        l.style.cssText = `position:absolute;left:${px3((x1 + x2) / 2)}px;top:${px3((y1 + y2) / 2) - px3(30)}px;transform:translateX(-50%);font-size:${px3(15)}px;color:var(--muted);white-space:nowrap`;
        ctx.scene.fx(l, "fade", { t: te + 0.3, d: 0.3 });
      }
    });
    ctx.advance(last);
    return box;
  }, null);
  B.quote = (text3, o = {}) => node(o, function quote(ctx) {
    const px3 = ctx.px, q = h("figure", "vk-quote");
    q.style.cssText = `margin:0;max-width:${len(ctx, o.w || 900, "x")};text-align:${o.align || "left"};position:relative`;
    const mark = h("div", null, "\u201C", q);
    mark.dataset.qa = "ignore";
    mark.style.cssText = `font-family:var(--vk-serif);font-size:${px3(180)}px;line-height:.6;color:var(--accent);height:${px3(70)}px`;
    const body = h("blockquote", null, md(text3), q);
    body.style.cssText = `margin:0;font-family:${o.serif === false ? "var(--vk-sans)" : "var(--vk-serif)"};font-size:${size(ctx, o.size || 50)};line-height:1.3;font-weight:${o.weight || 500}`;
    const t0 = ctx.at(o);
    ctx.scene.fx(mark, "pop", { t: t0, d: 0.5 });
    ctx.scene.fx(body, o.textFx || "words-up", { t: t0 + 0.25, each: o.each || 0.06 });
    if (o.by) {
      const by = h("figcaption", null, "\u2014 " + md(o.by), q);
      by.style.cssText = `margin-top:${px3(20)}px;font-size:${px3(22)}px;color:var(--muted)`;
      ctx.scene.fx(by, "fade", { t: t0 + 1.2, d: 0.5 });
    }
    ctx.advance(t0 + 1.2);
    return q;
  }, null);
  B.image = (src2, o = {}) => node(o, function image2(ctx) {
    const px3 = ctx.px, box = h("div", "vk-image");
    box.style.cssText = `position:relative;width:${len(ctx, o.w || 640, "x")};height:${len(ctx, o.h || 360, "y")};overflow:hidden;border-radius:${px3(o.radius != null ? o.radius : 14)}px;flex:none;background:var(--surface)`;
    const img = h("img", null, null, box);
    img.src = src2;
    img.alt = o.alt || "";
    img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${o.fit || "cover"};transform-origin:50% 50%`;
    const kb = o.kenburns === false ? null : { from: { s: 1, x: 0, y: 0, ...o.from || {} }, to: { s: 1.12, x: -2, y: -1.5, ...o.to || {} } };
    if (kb) ctx.scene.on((local) => {
      const p = getEase(o.ease || "inOutSine")(clamp01(local / (o.d || ctx.scene.dur))), f = kb.from, t = kb.to;
      img.style.transform = `translate(${f.x + (t.x - f.x) * p}%,${f.y + (t.y - f.y) * p}%) scale(${f.s + (t.s - f.s) * p})`;
    });
    if (o.caption) {
      const c = h("div", null, md(o.caption), box);
      c.style.cssText = `position:absolute;left:0;right:0;bottom:0;padding:${px3(10)}px ${px3(16)}px;font-size:${px3(16)}px;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;text-align:left`;
    }
    return box;
  }, "fade");
  B.device = (content, o = {}) => node(o, function device(ctx) {
    const px3 = ctx.px, type = o.type || "browser", fr = h("div", "vk-device vk-device-" + type);
    let screen;
    if (type === "phone") {
      const w = o.w || 260;
      fr.style.cssText = `width:${px3(w)}px;height:${px3(w * 2.05)}px;border-radius:${px3(42)}px;background:#0A0A0A;padding:${px3(12)}px;box-shadow:0 0 0 ${px3(2)}px #333,0 ${px3(30)}px ${px3(60)}px -${px3(20)}px rgba(0,0,0,.5);position:relative;flex:none`;
      screen = h("div", "vk-screen", null, fr);
      screen.style.cssText = `width:100%;height:100%;border-radius:${px3(32)}px;overflow:hidden;position:relative;background:var(--bg)`;
      const notch = h("div", null, null, fr);
      notch.style.cssText = `position:absolute;top:${px3(20)}px;left:50%;transform:translateX(-50%);width:${px3(80)}px;height:${px3(22)}px;border-radius:${px3(12)}px;background:#0A0A0A;z-index:2`;
    } else if (type === "laptop") {
      const w = o.w || 720;
      fr.style.cssText = `width:${px3(w)}px;flex:none;position:relative`;
      const lid = h("div", null, null, fr);
      lid.style.cssText = `width:${px3(w * 0.86)}px;height:${px3(w * 0.86 * 0.62)}px;margin:0 auto;background:#111;border-radius:${px3(16)}px ${px3(16)}px 0 0;padding:${px3(14)}px;box-shadow:0 0 0 ${px3(2)}px #2a2a2a`;
      screen = h("div", "vk-screen", null, lid);
      screen.style.cssText = `width:100%;height:100%;overflow:hidden;position:relative;background:var(--bg);border-radius:${px3(4)}px`;
      const base2 = h("div", null, null, fr);
      base2.style.cssText = `width:100%;height:${px3(18)}px;background:linear-gradient(#C9CDD6,#8E939E);border-radius:0 0 ${px3(14)}px ${px3(14)}px`;
    } else {
      const w = o.w || 720;
      fr.style.cssText = `width:${px3(w)}px;flex:none;border-radius:${px3(14)}px;overflow:hidden;background:var(--surface);border:1px solid var(--line);box-shadow:0 ${px3(30)}px ${px3(60)}px -${px3(30)}px rgba(0,0,0,.45)`;
      const bar = h("div", null, `<i></i><i></i><i></i><span>${esc2(o.url || "")}</span>`, fr);
      bar.style.cssText = `display:flex;gap:${px3(8)}px;align-items:center;height:${px3(40)}px;padding:0 ${px3(14)}px;border-bottom:1px solid var(--line);font:500 ${px3(15)}px var(--vk-mono);color:var(--muted)`;
      [...bar.querySelectorAll("i")].forEach((i, k) => i.style.cssText = `width:${px3(12)}px;height:${px3(12)}px;border-radius:50%;background:${["#FF5F57", "#FEBC2E", "#28C840"][k]}`);
      const sp = bar.querySelector("span");
      sp.style.cssText = `margin-left:${px3(12)}px;flex:1;background:var(--bg);border-radius:${px3(8)}px;padding:${px3(4)}px ${px3(12)}px;text-align:left`;
      screen = h("div", "vk-screen", null, fr);
      screen.style.cssText = `position:relative;height:${px3(o.h || w * 0.52)}px;overflow:hidden;background:var(--bg)`;
    }
    if (typeof content === "string") {
      if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(content)) {
        const im = h("img", null, null, screen);
        im.src = content;
        im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
      } else screen.innerHTML = content;
    } else if (content) ctx.build([].concat(content), screen);
    return fr;
  }, "up");
  B.cta = (spec, o = {}) => node(o, function cta(ctx) {
    const px3 = ctx.px, box = h("div", "vk-cta");
    box.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:${px3(20)}px;width:100%`;
    const t0 = ctx.at(o);
    if (spec.title) {
      const w = h("div", "vk-hero", md(spec.title), box);
      w.style.fontSize = size(ctx, spec.titleSize || 190);
      ctx.scene.fx(w, "letters", { t: t0, each: 0.05 });
    }
    if (spec.sub) {
      const e = h("div", "vk-h3", md(spec.sub), box);
      ctx.scene.fx(e, "up", { t: t0 + 0.7 });
    }
    let t = t0 + 1;
    if (spec.cmd) {
      const term = h("div", "vk-mono", `<span style="color:var(--prompt,var(--accent2))">$ </span><span class="c"></span>`, box);
      term.style.cssText = `background:var(--surface);color:var(--fg);border-radius:${px3(16)}px;padding:${px3(18)}px ${px3(30)}px;font-size:${px3(spec.cmdSize || 26)}px;white-space:nowrap;text-align:left;border:1px solid var(--line)`;
      ctx.scene.fx(term, "fade", { t, d: 0.4 });
      ctx.scene.fx(term.querySelector(".c"), "type", { t: t + 0.3, cps: 32, text: spec.cmd, caretHold: 1 });
      t += 0.3 + spec.cmd.length / 32 + 0.3;
    }
    if (spec.url) {
      const e = h("div", "vk-mono", esc2(spec.url), box);
      e.style.cssText = `font-size:${px3(spec.urlSize || 34)}px;font-weight:700`;
      ctx.scene.fx(e, "up", { t });
      t += 0.5;
    }
    if (spec.note) {
      const e = h("div", null, md(spec.note), box);
      e.style.cssText = `font-size:${px3(24)}px;opacity:.9`;
      ctx.scene.fx(e, "fade", { t });
      t += 0.4;
    }
    ctx.advance(t);
    return box;
  }, null);
  B.badge = (text3, o = {}) => node(o, function badge(ctx) {
    const e = h("span", "vk-badge vk-mono", md(text3));
    const px3 = ctx.px;
    e.style.cssText = `display:inline-block;padding:${px3(6)}px ${px3(16)}px;border-radius:${px3(999)}px;font-size:${px3(o.size || 20)}px;font-weight:700;border:${px3(2)}px solid ${o.hl ? "var(--accent)" : "var(--line)"};background:${o.hl ? "var(--accent)" : "transparent"};color:${o.hl ? "var(--on-accent)" : "var(--fg)"}`;
    return e;
  }, "pop");

  // src/fx/charts.js
  var B2 = registry.blocks;
  var gradId = 0;
  var rows = (data) => data.map((d) => Array.isArray(d) ? { label: d[0], value: +d[1] } : { ...d, value: +d.value });
  var fmtNum = (v, o) => {
    const dec = o.decimals | 0;
    let s2 = (+v).toFixed(dec);
    if (o.sep !== false) {
      const p = s2.split(".");
      p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, o.sep || ",");
      s2 = p.join(".");
    }
    return (o.prefix || "") + s2 + (o.unit || o.suffix || "");
  };
  var pal = (ctx, i, d) => d && d.color || ctx.theme.chart[i % ctx.theme.chart.length];
  var barCol = (ctx, o, i, d) => d.color || (o.colors ? pal(ctx, i, d) : o.highlight != null ? "color-mix(in srgb, var(--muted) 55%, transparent)" : "var(--accent)");
  function niceMax(v) {
    const e = Math.pow(10, Math.floor(Math.log10(v || 1))), m = v / e;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
  }
  B2.bar = (data, o = {}) => node(o, function bar(ctx) {
    const px3 = ctx.px, D = rows(data), max = o.max || niceMax(Math.max(...D.map((d) => d.value)));
    const W = o.w || 900, H = o.h || 380, box = h("div", "vk-chart vk-bar");
    box.style.cssText = `width:${px3(W)}px;flex:none;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.12, sc = ctx.scene;
    const isHl = (d, i) => o.highlight === i || o.highlight === d.label;
    if (o.horizontal) {
      D.forEach((d, i) => {
        const r = h("div", null, null, box);
        r.style.cssText = `display:flex;align-items:center;gap:${px3(14)}px;height:${px3(H / D.length)}px`;
        h("div", null, md(d.label), r).style.cssText = `width:${px3(o.labelW || 160)}px;flex:none;font-size:${px3(20)}px;text-align:right;color:var(--muted)`;
        const tr = h("div", null, null, r);
        tr.style.cssText = `flex:1;position:relative;height:${px3(Math.min(40, H / D.length * 0.62))}px`;
        const b = h("div", null, null, tr);
        b.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:${d.value / max * 100}%;background:${isHl(d, i) ? "var(--accent)" : barCol(ctx, o, i, d)};border-radius:${px3(6)}px;transform-origin:left center`;
        const v = h("div", "vk-mono", "", tr);
        v.style.cssText = `position:absolute;left:calc(${d.value / max * 100}% + ${px3(10)}px);top:50%;transform:translateY(-50%);font-size:${px3(20)}px;font-weight:700;white-space:nowrap`;
        sc.fx(b, "grow", { t: t0 + i * each, d: 0.8, ease: "outExpo" });
        sc.fx(v, "count", { t: t0 + i * each, d: 0.8, to: d.value, format: (x) => fmtNum(x, o) });
        sc.fx(v, "fade", { t: t0 + i * each + 0.1, d: 0.3 });
      });
    } else {
      const plot = h("div", null, null, box);
      plot.style.cssText = `position:relative;height:${px3(H)}px;display:flex;align-items:flex-end;gap:${px3(o.gap || 18)}px;border-bottom:${px3(2)}px solid var(--fg);padding:0 ${px3(8)}px`;
      [0.25, 0.5, 0.75, 1].forEach((g) => {
        const l = h("div", null, null, plot);
        l.style.cssText = `position:absolute;left:0;right:0;bottom:${g * 100}%;border-top:1px dashed var(--line);opacity:.8`;
        const lb = h("div", "vk-mono", fmtNum(max * g, { ...o, decimals: o.axisDecimals != null ? o.axisDecimals : Number.isInteger(max * 0.25) ? 0 : 1 }), l);
        lb.style.cssText = `position:absolute;right:100%;margin-right:${px3(8)}px;top:-${px3(10)}px;font-size:${px3(14)}px;color:var(--muted);white-space:nowrap`;
      });
      D.forEach((d, i) => {
        const c = h("div", null, null, plot);
        c.style.cssText = `flex:1;position:relative;height:${d.value / max * 100}%;display:flex;flex-direction:column;justify-content:flex-start`;
        const b = h("div", null, null, c);
        b.style.cssText = `position:absolute;inset:0;background:${isHl(d, i) ? "var(--accent)" : barCol(ctx, o, i, d)};border-radius:${px3(6)}px ${px3(6)}px 0 0;transform-origin:center bottom`;
        const v = h("div", "vk-mono", "", c);
        v.style.cssText = `position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:${px3(6)}px;font-size:${px3(o.valueSize || 18)}px;font-weight:700;white-space:nowrap`;
        const l = h("div", null, md(d.label), c);
        l.style.cssText = `position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:${px3(8)}px;font-size:${px3(o.labelSize || 17)}px;color:var(--muted);white-space:nowrap`;
        sc.fx(b, "grow-y", { t: t0 + i * each, d: 0.8, ease: "outExpo" });
        sc.fx(v, "count", { t: t0 + i * each, d: 0.8, to: d.value, format: (x) => fmtNum(x, o) });
        sc.fx(l, "fade", { t: t0 + i * each, d: 0.3 });
      });
      plot.style.marginBottom = px3(38) + "px";
      box.style.paddingLeft = px3(40) + "px";
    }
    if (o.source) {
      const sEl = h("div", null, md(o.source), box);
      sEl.style.cssText = `margin-top:${px3(10)}px;font-size:${px3(14)}px;color:var(--muted);text-align:right`;
      sc.fx(sEl, "fade", { t: t0, d: 0.5 });
    }
    ctx.advance(t0 + D.length * each + 0.6);
    return box;
  }, null);
  B2.line = (data, o = {}) => node(o, function line(ctx) {
    const px3 = ctx.px, W = o.w || 900, H = o.h || 380;
    const series = o.series || [{ name: o.name || "", values: rows(data).map((d2) => d2.value) }];
    const labels = o.labels || (data ? rows(data).map((d2) => d2.label) : series[0].values.map((_, i) => String(i + 1)));
    const all = series.flatMap((s2) => s2.values), min = o.min != null ? o.min : Math.min(0, ...all), max = o.max || niceMax(Math.max(...all));
    const axisDec = o.axisDecimals != null ? o.axisDecimals : Number.isInteger((max - min) / 4) ? 0 : 1;
    const axisTxt = (g) => fmtNum(min + (max - min) * g / 4, { ...o, decimals: axisDec, unit: "" });
    const multi = series.length > 1, endW = multi && o.endLabel !== false ? o.labelRight || 190 : 24;
    const P = { l: 18 + Math.max(...[0, 1, 2, 3, 4].map((g) => axisTxt(g).length)) * 8.8, r: endW, t: 20, b: 40 };
    const n = labels.length, X2 = (i) => P.l + (W - P.l - P.r) * (n === 1 ? 0.5 : i / (n - 1)), Y = (v) => P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min));
    const box = h("div", "vk-chart vk-line");
    box.style.cssText = `width:${px3(W)}px;height:${px3(H)}px;position:relative;flex:none`;
    const svgEl = s("svg", { width: px3(W), height: px3(H), viewBox: `0 0 ${W} ${H}`, fill: "none" }, box);
    const t0 = ctx.at(o), d = o.d || 1.6, sc = ctx.scene;
    const axis = s("g", {}, svgEl);
    for (let g = 0; g <= 4; g++) {
      const v = min + (max - min) * g / 4, y = Y(v);
      s("line", { x1: P.l, x2: W - P.r, y1: y, y2: y, stroke: "var(--line)", "stroke-width": g ? 1 : 2, "stroke-dasharray": g ? "4 6" : "" }, axis);
      const tx = s("text", { x: P.l - 10, y: y + 5, "text-anchor": "end", fill: "var(--muted)", "font-size": 14, "font-family": "JetBrains Mono, monospace" }, axis);
      tx.textContent = axisTxt(g);
    }
    const step = Math.ceil(n / (o.maxLabels || 8));
    labels.forEach((lb, i) => {
      if (i % step && i !== n - 1) return;
      const tx = s("text", { x: X2(i), y: H - 12, "text-anchor": "middle", fill: "var(--muted)", "font-size": 15 }, axis);
      tx.textContent = lb;
    });
    sc.fx(axis, "fade", { t: t0, d: 0.4 });
    const ends = [];
    series.forEach((se, k) => {
      const col3 = se.color || (k === 0 ? "var(--accent)" : pal(ctx, k + 1));
      const pts = se.values.map((v, i) => [X2(i), Y(v)]);
      const dPath = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
      if (k === 0 && (o.area === true || o.area !== false && !multi)) {
        const gid = "vkg" + ++gradId;
        const defs = s("defs", {}, svgEl), lg = s("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        s("stop", { offset: 0, "stop-color": col3, "stop-opacity": 0.35 }, lg);
        s("stop", { offset: 1, "stop-color": col3, "stop-opacity": 0 }, lg);
        const area = s("path", { d: dPath + ` L${pts[pts.length - 1][0]} ${Y(min)} L${pts[0][0]} ${Y(min)} Z`, fill: `url(#${gid})` }, svgEl);
        sc.tween(area, { t: t0 + 0.2, d, ease: "inOutCubic", from: { clipPath: "inset(0% 100% 0% 0%)" }, to: { clipPath: "inset(0% 0% 0% 0%)" } });
      }
      const path2 = s("path", { d: dPath, stroke: col3, "stroke-width": o.strokeWidth || 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svgEl);
      sc.fx(path2, "draw", { t: t0 + 0.2 + k * 0.3, d, ease: "inOutCubic" });
      if (o.dots !== false) pts.forEach((p, i) => {
        const c = s("circle", { cx: p[0], cy: p[1], r: 5, fill: col3, stroke: "var(--bg)", "stroke-width": 2 }, svgEl);
        c.style.transformBox = "fill-box";
        c.style.transformOrigin = "center";
        sc.fx(c, "pop", { t: t0 + 0.2 + k * 0.3 + d * (i / Math.max(1, n - 1)), d: 0.3 });
      });
      const lastV = se.values[se.values.length - 1], lp = pts[pts.length - 1];
      if (o.endLabel === false) return;
      const lab = h("div", "vk-mono", "", box);
      lab.style.cssText = `position:absolute;font-size:${px3(o.valueSize || 22)}px;font-weight:800;color:${col3};white-space:nowrap;line-height:1`;
      if (multi) {
        lab.style.left = px3(lp[0] + 14) + "px";
        ends.push({ lab, y: lp[1] });
      } else {
        lab.style.left = px3(lp[0]) + "px";
        lab.style.top = px3(lp[1]) - px3(44) + "px";
        lab.style.transform = "translateX(-80%)";
      }
      sc.fx(lab, "count", { t: t0 + 0.2 + k * 0.3, d, to: lastV, from: se.values[0], format: (x) => (se.name ? se.name + " " : "") + fmtNum(x, o) });
      sc.fx(lab, "fade", { t: t0 + 0.2, d: 0.3 });
    });
    if (ends.length) {
      const gap = (o.valueSize || 22) * 1.25;
      ends.sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + gap);
      const over = ends[ends.length - 1].y - (H - P.b);
      if (over > 0) ends.forEach((e) => e.y -= over);
      for (let i = ends.length - 2; i >= 0; i--) ends[i].y = Math.min(ends[i].y, ends[i + 1].y - gap);
      ends.forEach((e) => {
        e.lab.style.top = px3(e.y) - px3((o.valueSize || 22) / 2) + "px";
      });
    }
    if (o.source) {
      const sEl = h("div", null, md(o.source), box);
      sEl.style.cssText = `position:absolute;right:0;top:100%;margin-top:${px3(4)}px;font-size:${px3(14)}px;color:var(--muted)`;
      sc.fx(sEl, "fade", { t: t0, d: 0.5 });
    }
    ctx.advance(t0 + d + 0.5);
    return box;
  }, null);
  function pieImpl(donut) {
    return (data, o = {}) => node(o, function pie(ctx) {
      const px3 = ctx.px, D = rows(data), total = D.reduce((m, d2) => m + d2.value, 0), R = o.r || 150, th = donut ? o.thickness || 56 : R;
      const box = h("div", "vk-chart vk-pie");
      box.style.cssText = `display:flex;align-items:center;gap:${px3(48)}px;flex:none`;
      const wrap = h("div", null, null, box);
      wrap.style.cssText = `position:relative;width:${px3(R * 2)}px;height:${px3(R * 2)}px;flex:none`;
      const svgEl = s("svg", { width: px3(R * 2), height: px3(R * 2), viewBox: `0 0 ${R * 2} ${R * 2}` }, wrap);
      const rr = R - th / 2, C = 2 * Math.PI * rr, t0 = ctx.at(o), d = o.d || 1.4, sc = ctx.scene, ease = getEase("inOutCubic");
      let acc = 0;
      const segs = [];
      D.forEach((dd, i) => {
        const c = s("circle", { cx: R, cy: R, r: rr, fill: "none", stroke: pal(ctx, i, dd), "stroke-width": th, transform: `rotate(-90 ${R} ${R})` }, svgEl);
        segs.push({ c, a: acc / total, b: (acc + dd.value) / total });
        acc += dd.value;
      });
      sc.on((local) => {
        const p = ease(clamp01((local - t0) / d));
        segs.forEach(({ c, a, b }) => {
          const aa = Math.min(a, p), bb = Math.min(b, p), L = Math.max(0, bb - aa) * C;
          c.setAttribute("stroke-dasharray", `${L.toFixed(2)} ${C.toFixed(2)}`);
          c.setAttribute("stroke-dashoffset", (-aa * C).toFixed(2));
        });
      });
      if (donut) {
        const cen = h("div", null, null, wrap);
        cen.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center`;
        const big = h("div", "vk-mono", "", cen);
        big.style.cssText = `font-size:${px3(o.centerSize || 44)}px;font-weight:800`;
        if (o.center) big.innerHTML = md(o.center);
        else sc.fx(big, "count", { t: t0, d, to: total, format: (x) => fmtNum(x, o) });
        if (o.centerLabel) h("div", null, md(o.centerLabel), cen).style.cssText = `font-size:${px3(17)}px;color:var(--muted)`;
        sc.fx(cen, "fade", { t: t0 + 0.2, d: 0.4 });
      }
      if (o.legend !== false) {
        const lg = h("div", null, null, box);
        lg.style.cssText = `display:flex;flex-direction:column;gap:${px3(12)}px;text-align:left`;
        D.forEach((dd, i) => {
          const r = h("div", null, `<i></i><span>${md(dd.label)}</span><b class="vk-mono">${(dd.value / total * 100).toFixed(o.pctDecimals | 0)}%</b>`, lg);
          r.style.cssText = `display:flex;align-items:center;gap:${px3(12)}px;font-size:${px3(o.legendSize || 21)}px`;
          r.querySelector("i").style.cssText = `width:${px3(16)}px;height:${px3(16)}px;border-radius:${px3(4)}px;background:${pal(ctx, i, dd)};flex:none`;
          r.querySelector("b").style.cssText = `margin-left:auto;padding-left:${px3(16)}px;color:var(--muted)`;
          sc.fx(r, "left", { t: t0 + d * ((segs[i].a + segs[i].b) / 2), d: 0.4, dist: px3(20) });
        });
      }
      ctx.advance(t0 + d + 0.3);
      return box;
    }, null);
  }
  B2.pie = pieImpl(false);
  B2.donut = pieImpl(true);
  B2.ticker = (value, o = {}) => node(o, function ticker(ctx) {
    const px3 = ctx.px, box = h("div", "vk-ticker");
    box.style.cssText = "display:flex;flex-direction:column;align-items:center";
    const n = h("div", "vk-mono", "", box);
    n.style.cssText = `font-size:${size(ctx, o.size || 120)};font-weight:800;line-height:1;letter-spacing:-.03em;color:${o.color ? `var(--${o.color})` : "var(--fg)"}`;
    const t0 = ctx.at(o);
    ctx.scene.fx(n, "count", { t: t0, d: o.d || 1.4, from: o.from || 0, to: value, format: (x) => fmtNum(x, { sep: o.sep, decimals: o.decimals, prefix: o.prefix, unit: o.unit || o.suffix }) });
    if (o.label) {
      const l = h("div", null, md(o.label), box);
      l.style.cssText = `font-size:${px3(o.labelSize || 24)}px;color:var(--muted);margin-top:${px3(10)}px`;
      ctx.scene.fx(l, "up", { t: t0 + 0.3 });
    }
    ctx.advance(t0 + (o.d || 1.4));
    return box;
  }, "fade");
  B2.ring = (pct2, o = {}) => node(o, function ring(ctx) {
    const px3 = ctx.px, R = o.r || 110, th = o.thickness || 18, rr = R - th / 2, C = 2 * Math.PI * rr;
    const box = h("div", "vk-ring");
    box.style.cssText = `position:relative;width:${px3(R * 2)}px;height:${px3(R * 2)}px;flex:none`;
    const svgEl = s("svg", { width: px3(R * 2), height: px3(R * 2), viewBox: `0 0 ${R * 2} ${R * 2}` }, box);
    s("circle", { cx: R, cy: R, r: rr, fill: "none", stroke: "var(--line)", "stroke-width": th }, svgEl);
    const arc = s("circle", { cx: R, cy: R, r: rr, fill: "none", stroke: o.color || "var(--accent)", "stroke-width": th, "stroke-linecap": "round", transform: `rotate(-90 ${R} ${R})`, "stroke-dasharray": `0 ${C}` }, svgEl);
    const cen = h("div", null, null, box);
    cen.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center";
    const num2 = h("div", "vk-mono", "", cen);
    num2.style.cssText = `font-size:${px3(R * 0.38)}px;font-weight:800`;
    if (o.label) h("div", null, md(o.label), cen).style.cssText = `font-size:${px3(Math.max(14, R * 0.14))}px;color:var(--muted);margin-top:${px3(4)}px;max-width:${px3(R * 1.4)}px;text-align:center;line-height:1.25`;
    const t0 = ctx.at(o), d = o.d || 1.3, e = getEase(o.ease || "outCubic");
    ctx.scene.on((local) => {
      const p = e(clamp01((local - t0) / d)) * pct2 / 100;
      arc.setAttribute("stroke-dasharray", `${(p * C).toFixed(2)} ${C.toFixed(2)}`);
    });
    ctx.scene.fx(num2, "count", { t: t0, d, to: pct2, decimals: o.decimals, format: (x) => x.toFixed(o.decimals | 0) + "%" });
    ctx.advance(t0 + d);
    return box;
  }, "fade");
  B2.table = (spec, o = {}) => node(o, function table(ctx) {
    const px3 = ctx.px, tb = h("table", "vk-table"), t0 = ctx.at(o), each = o.each != null ? o.each : 0.18;
    tb.style.cssText = `border-collapse:collapse;width:${o.w ? len(ctx, o.w, "x") : "100%"};font-size:${px3(o.size || 21)}px;text-align:left`;
    const al = (i) => spec.align && spec.align[i] || (i ? "right" : "left");
    if (spec.header) {
      const tr = h("tr", null, spec.header.map((c, i) => `<th style="text-align:${al(i)}">${md(c)}</th>`).join(""), tb);
      [...tr.children].forEach((th) => th.style.cssText += `;padding:${px3(10)}px ${px3(16)}px;border-bottom:${px3(2)}px solid var(--fg);color:var(--muted);font-weight:700;font-size:.85em`);
      ctx.scene.fx(tr, "fade", { t: t0, d: 0.3 });
    }
    spec.rows.forEach((r, i) => {
      const tr = h("tr", null, r.map((c, j) => `<td style="text-align:${al(j)}">${md(String(c))}</td>`).join(""), tb);
      [...tr.children].forEach((td, j) => td.style.cssText += `;padding:${px3(10)}px ${px3(16)}px;border-bottom:1px solid var(--line);${j ? "font-family:var(--vk-mono)" : "font-weight:700"}`);
      if (spec.highlight === i) [...tr.children].forEach((td) => {
        td.style.background = "var(--accent)";
        td.style.color = "var(--on-accent)";
      });
      ctx.scene.fx(tr, "left", { t: t0 + 0.2 + i * each, d: 0.4, dist: px3(24) });
    });
    if (o.source) {
      const cap = h("caption", null, md(o.source), tb);
      cap.style.cssText = `caption-side:bottom;text-align:right;font-size:${px3(14)}px;color:var(--muted);padding-top:${px3(8)}px`;
    }
    ctx.advance(t0 + 0.2 + spec.rows.length * each);
    return tb;
  }, null);

  // src/fx/textures.js
  var X = registry.textures;
  var ov = (cls = "") => {
    const e = document.createElement("div");
    e.className = "vk-ov " + cls;
    return e;
  };
  var amt = (o, d) => o.amount != null ? o.amount : d;
  X.grain = (v, o) => {
    const c = document.createElement("canvas");
    c.className = "vk-ov";
    c.width = v.W;
    c.height = v.H;
    c.style.mixBlendMode = o.blend || "overlay";
    c.style.opacity = amt(o, 0.06);
    const tiles = [];
    for (let i = 0; i < 4; i++) {
      const t = document.createElement("canvas");
      t.width = t.height = 256;
      const g2 = t.getContext("2d"), im = g2.createImageData(256, 256), r = mulberry32(1e3 + i);
      for (let p = 0; p < im.data.length; p += 4) {
        const val = r() * 255;
        im.data[p] = im.data[p + 1] = im.data[p + 2] = val;
        im.data[p + 3] = 255;
      }
      g2.putImageData(im, 0, 0);
      tiles.push(t);
    }
    const g = c.getContext("2d");
    let lastF = -1;
    return { el: c, update(t) {
      const f = Math.floor(t * (o.fps || 24));
      if (f === lastF) return;
      lastF = f;
      g.save();
      g.translate(Math.floor(hash(f) * 256) - 256, Math.floor(hash(f + 7) * 256) - 256);
      g.fillStyle = g.createPattern(tiles[f % 4], "repeat");
      g.fillRect(0, 0, v.W + 512, v.H + 512);
      g.restore();
    } };
  };
  X.vignette = (v, o) => {
    const e = ov();
    e.style.background = `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) ${o.inner || 45}%, rgba(0,0,0,${amt(o, 0.35)}) 100%)`;
    return { el: e };
  };
  X.flicker = (v, o) => {
    const e = ov();
    e.style.background = "#000";
    return { el: e, update(t) {
      e.style.opacity = (amt(o, 0.03) * hash(Math.floor(t * (o.fps || 24)) * 1.9)).toFixed(4);
    } };
  };
  X.paper = (v, o) => {
    const c = document.createElement("canvas");
    c.className = "vk-ov";
    c.width = 512;
    c.height = 512;
    c.style.cssText += `;mix-blend-mode:multiply;opacity:${amt(o, 0.5)};background-size:512px 512px`;
    const g = c.getContext("2d"), r = mulberry32(o.seed || 42);
    g.fillStyle = o.color || "#F4EEE2";
    g.fillRect(0, 0, 512, 512);
    const im = g.getImageData(0, 0, 512, 512);
    for (let p = 0; p < im.data.length; p += 4) {
      const n = (r() - 0.5) * 26;
      im.data[p] += n;
      im.data[p + 1] += n;
      im.data[p + 2] += n;
    }
    g.putImageData(im, 0, 0);
    g.globalAlpha = 0.08;
    g.strokeStyle = "#7A6A55";
    for (let i = 0; i < 260; i++) {
      g.lineWidth = 0.5 + r();
      g.beginPath();
      const x = r() * 512, y = r() * 512, a = r() * 6.28, l = 6 + r() * 26;
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    const e = ov();
    e.style.backgroundImage = `url(${c.toDataURL()})`;
    e.style.mixBlendMode = "multiply";
    e.style.opacity = amt(o, 0.5);
    return { el: e };
  };
  X.halftone = (v, o) => {
    const e = ov(), s2 = v.px(o.size || 7);
    e.style.cssText += `;background-image:radial-gradient(circle at center, ${o.color || "rgba(0,0,0,.9)"} ${o.dot || 28}%, transparent ${(o.dot || 28) + 6}%);background-size:${s2}px ${s2}px;mix-blend-mode:${o.blend || "soft-light"};opacity:${amt(o, 0.35)}`;
    if (o.angle) {
      e.style.inset = "-50%";
      e.style.width = "200%";
      e.style.height = "200%";
      e.style.transform = `rotate(${o.angle}deg)`;
    }
    return { el: e };
  };
  X.scanlines = (v, o) => {
    const e = ov(), s2 = v.px(o.size || 4);
    e.style.cssText += `;background:repeating-linear-gradient(0deg, rgba(0,0,0,${amt(o, 0.22)}) 0 ${s2 / 2}px, transparent ${s2 / 2}px ${s2}px)`;
    return { el: e, update(t) {
      if (o.roll) e.style.backgroundPosition = `0 ${t * (o.roll === true ? 30 : o.roll) % s2}px`;
    } };
  };
  X.rgb = (v, o, host) => {
    const id = "vk-rgb";
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    wrap.innerHTML = `<svg width="0" height="0"><filter id="${id}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
    <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/><feOffset in="r" dx="0" dy="0" result="ro"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/><feOffset in="b" dx="0" dy="0" result="bo"/>
    <feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen"/></filter></svg>`;
    const offs = () => wrap.querySelectorAll("feOffset");
    const target = host ? host.el : v.scenesEl, fid = host ? id + "-" + host.index : id;
    wrap.querySelector("filter").id = fid;
    target.style.filter = `url(#${fid})`;
    const ang = (o.angle || 0) * Math.PI / 180;
    return { el: wrap, update(t) {
      const a = v.px(amt(o, 2)) * (o.pulse ? 0.25 + v.beats.pulse(t, o.pulse) : 1) * (o.fn ? o.fn(t) : 1);
      const [r, b] = offs();
      const dx = (a * Math.cos(ang)).toFixed(2), dy = (a * Math.sin(ang)).toFixed(2);
      r.setAttribute("dx", -dx);
      r.setAttribute("dy", -dy);
      b.setAttribute("dx", dx);
      b.setAttribute("dy", dy);
    } };
  };

  // src/fx/backgrounds.js
  var G = registry.backgrounds;
  var div = () => document.createElement("div");
  var col2 = (sc, v, name) => v || `var(--${name})`;
  G.gradient = (sc, o, v) => {
    const e = div(), cs = o.colors || [v.color("bg", sc.mode), v.color("accent", sc.mode)];
    return { el: e, update(local) {
      const a = (o.angle || 135) + (o.spin || 0) * local;
      e.style.background = `linear-gradient(${a.toFixed(2)}deg, ${cs.join(",")})`;
    } };
  };
  G.mesh = (sc, o, v) => {
    const e = div(), cs = o.colors || [v.color("accent", sc.mode), v.color("accent2", sc.mode), v.color("accent", sc.mode)], sp = o.speed || 0.12, base2 = o.base || v.color("bg", sc.mode);
    return { el: e, update(local) {
      const t = sc.start + local;
      e.style.background = cs.map((c, i) => {
        const x = 15 + 70 * noise1(t * sp + i * 7.1), y = 15 + 70 * noise1(t * sp + i * 3.7 + 50), r = (o.size || 55) + 10 * noise1(t * sp * 0.7 + i);
        return `radial-gradient(circle at ${x.toFixed(2)}% ${y.toFixed(2)}%, ${c} 0%, transparent ${r.toFixed(1)}%)`;
      }).join(",") + "," + base2;
      e.style.opacity = o.opacity != null ? o.opacity : 1;
      if (o.blur) e.style.filter = `blur(${v.px(o.blur)}px)`;
    } };
  };
  G.grid = (sc, o, v) => {
    const e = div(), s2 = v.px(o.size || 64), c = col2(sc, o.color, "line"), lw = o.width || 1;
    e.style.backgroundImage = `linear-gradient(${c} ${lw}px, transparent ${lw}px), linear-gradient(90deg, ${c} ${lw}px, transparent ${lw}px)`;
    e.style.backgroundSize = `${s2}px ${s2}px`;
    if (o.fade !== false) {
      e.style.webkitMaskImage = e.style.maskImage = "radial-gradient(ellipse at 50% 50%, #000 30%, transparent 80%)";
    }
    if (o.opacity != null) e.style.opacity = o.opacity;
    return { el: e, update(local) {
      const d = (o.drift != null ? o.drift : 10) * local;
      e.style.backgroundPosition = `${(o.dx || 0) * d}px ${(o.dy == null ? 1 : o.dy) * d}px`;
    } };
  };
  G.dots = (sc, o, v) => {
    const e = div(), s2 = v.px(o.size || 28), c = col2(sc, o.color, "line");
    e.style.backgroundImage = `radial-gradient(circle, ${c} ${v.px(o.r || 2)}px, transparent ${v.px(o.r || 2) + 0.5}px)`;
    e.style.backgroundSize = `${s2}px ${s2}px`;
    if (o.fade !== false) e.style.webkitMaskImage = e.style.maskImage = "radial-gradient(ellipse at 50% 50%, #000 25%, transparent 75%)";
    if (o.opacity != null) e.style.opacity = o.opacity;
    return { el: e, update(local) {
      const d = (o.drift != null ? o.drift : 8) * local;
      e.style.backgroundPosition = `${d}px ${d * 0.5}px`;
    } };
  };
  G.noise = (sc, o, v) => {
    const c = document.createElement("canvas"), w = o.res || 64, h3 = Math.round(w * v.H / v.W);
    c.width = w;
    c.height = h3;
    c.style.cssText = "width:100%;height:100%;display:block";
    const e = div();
    e.appendChild(c);
    if (o.opacity != null) e.style.opacity = o.opacity;
    const g = c.getContext("2d"), im = g.createImageData(w, h3);
    const hex = (s2) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(s2.trim());
      const n = m ? parseInt(m[1], 16) : 0;
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    };
    const A = hex(o.from || v.color("bg", sc.mode)), B4 = hex(o.to || v.color("accent", sc.mode)), sc2 = o.scale || 3.2, sp = o.speed || 0.15;
    return { el: e, update(local) {
      const t = local * sp;
      for (let y = 0; y < h3; y++) for (let x = 0; x < w; x++) {
        let n = noise2(x / w * sc2 + t, y / h3 * sc2 - t * 0.7) * 0.65 + noise2(x / w * sc2 * 2.1 - t, y / h3 * sc2 * 2.1 + t) * 0.35;
        n = Math.pow(n, o.contrast || 1.6);
        const p = (y * w + x) * 4;
        im.data[p] = A[0] + (B4[0] - A[0]) * n;
        im.data[p + 1] = A[1] + (B4[1] - A[1]) * n;
        im.data[p + 2] = A[2] + (B4[2] - A[2]) * n;
        im.data[p + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    } };
  };

  // src/fx/lyrics.js
  var B3 = registry.blocks;
  var c01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
  var esc3 = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  B3.lyrics = (cue, o = {}) => node({ fx: false, ...o }, function lyrics(ctx) {
    const v = ctx.video, style = o.style || "pop", d = o.d || (style === "slam" ? 0.16 : 0.22);
    const [, , text3, words] = Array.isArray(cue) ? cue : [cue.start, cue.end, cue.text, cue.words];
    const el2 = h("div", "vk-lyric vk-lyric-" + style);
    el2.style.cssText = `font-family:${o.font === "sans" ? "var(--vk-sans)" : "var(--vk-display),var(--vk-sans)"};font-weight:${o.weight || 900};line-height:1.12;font-size:${size(ctx, o.size || (style === "slam" ? 150 : 64))};text-align:${o.align || "center"};max-width:${len(ctx, o.w || 0.86, "x")};color:${o.color ? `var(--${o.color},${o.color})` : "var(--fg)"}` + (style === "slam" ? `;position:relative;width:${len(ctx, o.w || 0.86, "x")};height:1.3em;white-space:nowrap` : "");
    const accent = o.accent || "var(--accent)", dim = o.dim != null ? o.dim : 0.42;
    const P = mapWords(text3, words), W = [];
    P.forEach((p) => {
      if (p.wi < 0) {
        const s3 = h("span", "vk-lp", esc3(p.s), el2);
        s3.style.whiteSpace = "pre";
        if (W.length) W[W.length - 1].tail.push(s3);
        else if (style === "slam") s3.style.display = "none";
        return;
      }
      const s2 = h("span", "vk-lw", esc3(p.s), el2);
      s2.style.display = "inline-block";
      s2.style.whiteSpace = "pre";
      if (style === "slam") s2.style.cssText += ";position:absolute;left:50%;top:50%;translate:-50% -50%;transform-origin:50% 50%";
      W.push({ s: s2, w: words[p.wi], tail: [] });
    });
    if (style === "slam") W.forEach((x) => x.tail.forEach((t) => t.style.display = "none"));
    const lastEnd = W.length ? W[W.length - 1].w.end || W[W.length - 1].w.t + 0.3 : 0;
    ctx.extend(lastEnd - ctx.scene.start + 0.3);
    let fit = null;
    if (style === "slam") v.afterFonts.push(() => {
      const maxW = el2.clientWidth || v.W * 0.8;
      fit = W.map((x) => Math.min(1, maxW / Math.max(1, x.s.offsetWidth)));
    });
    ctx.scene.on((local, p, t) => {
      const tt = t + v.beats.leadT, bp = o.beat ? v.beats.pulse(t) : 0;
      let cur = -1;
      W.forEach((x, i) => {
        if (tt >= x.w.t) cur = i;
      });
      W.forEach((x, i) => {
        const a = (tt - x.w.t) / d, s2 = x.s, on = i === cur;
        if (style === "karaoke") {
          const pr = c01((tt - x.w.t) / Math.max(0.05, (x.w.end || x.w.t + 0.2) - x.w.t));
          s2.style.color = "transparent";
          s2.style.webkitBackgroundClip = "text";
          s2.style.backgroundClip = "text";
          s2.style.backgroundImage = `linear-gradient(90deg, ${accent} ${pr * 100}%, color-mix(in srgb, currentColor ${dim * 100}%, transparent) ${pr * 100}%)`;
          s2.style.transform = on && o.beat ? `scale(${1 + o.beat * bp})` : "";
          return;
        }
        if (style === "slam") {
          const e2 = EASE.outCubic(c01(a)), show = on && a >= 0;
          s2.style.opacity = show ? "1" : "0";
          s2.style.transform = show ? `scale(${(fit && fit[i] || 1) * (1.35 - 0.35 * e2) * (1 + (o.beat || 0) * bp)}) rotate(${(hash(i + 7) - 0.5) * 6 * (1 - e2)}deg)` : "scale(.5)";
          s2.style.color = hash(i * 3 + 1) > 0.7 ? accent : "";
          return;
        }
        const e = style === "rise" ? EASE.outExpo(c01(a)) : EASE.outBack(c01(a)), vis = a >= 0;
        s2.style.opacity = vis ? String(c01(a * 3)) : "0";
        s2.style.transform = !vis ? "translateY(.35em) scale(.5)" : style === "rise" ? `translateY(${(1 - e) * 0.6}em)` : `translateY(${(1 - e) * 0.3}em) scale(${(0.55 + 0.45 * e) * (on ? 1 + (o.beat || 0) * bp : 1)})`;
        if (style === "rise") s2.style.filter = vis && a < 1 ? `blur(${(1 - e) * 8}px)` : "";
        s2.style.color = on ? accent : "";
        x.tail.forEach((tn) => tn.style.opacity = s2.style.opacity);
      });
    });
    return el2;
  });
  B3.spectrum = (o = {}) => node({ fx: "fade", ...o }, function spectrum(ctx) {
    const v = ctx.video, n = o.bars || 16, px3 = ctx.px, H = px3(o.h || 120);
    const el2 = h("div", "vk-spectrum");
    el2.style.cssText = `display:flex;align-items:${o.mirror ? "center" : "flex-end"};gap:${px3(o.gap != null ? o.gap : 6)}px;height:${H}px;width:${len(ctx, o.w || 0.6, "x")}`;
    const bars = Array.from({ length: n }, () => {
      const b = h("i", null, null, el2);
      b.style.cssText = `flex:1;height:100%;border-radius:${px3(4)}px;background:${o.color ? `var(--${o.color},${o.color})` : "var(--accent)"};transform-origin:50% ${o.mirror ? "50%" : "100%"}`;
      return b;
    });
    ctx.scene.on((local, p, t) => {
      const M = v.music;
      const nb = M && M.env.bands ? M.env.bands.length : 0;
      bars.forEach((b, i) => {
        let e = 0;
        if (nb) {
          const x = i * (nb - 1) / Math.max(1, n - 1), j = Math.floor(x), f = x - j;
          e = M.energy(t, j, o.smooth != null ? o.smooth : 0.03) * (1 - f) + (j + 1 < nb ? M.energy(t, j + 1, o.smooth != null ? o.smooth : 0.03) * f : 0);
        } else e = v.beats.pulse(t, 5) * (0.4 + 0.6 * hash(i));
        b.style.transform = `scaleY(${Math.max(o.floor != null ? o.floor : 0.04, e).toFixed(3)})`;
      });
    });
    return el2;
  });
  function lyricVideo(vk2, o = {}) {
    const v = vk2.current, G2 = v.beats, M = v.music, lines = (o.lines || v.lyrics).filter((l) => l[3] && l[3].length);
    if (!lines.length) throw new Error('[vk] lyricVideo: no lyric lines (vk.video({lyrics:"song.align.json"}))');
    const lead = G2.leadT, styles = o.styles || ["pop", "rise", "slam", "karaoke"];
    const bgs = o.bgs || ["dark", "accent", [{ type: "dots", drift: 24 }], "light", [{ type: "grid", drift: 30 }]];
    const trs = o.transitions || ["none", "flash:0.25", "whip-left:0.3", "zoom-in:0.3"];
    const secs = M ? M.sections : [];
    const secOf = (t) => {
      for (let i = secs.length - 1; i >= 0; i--) if (t >= secs[i].start - 0.05) return secs[i];
      return secs[0] || { index: 0, label: "A", energy: 0.5 };
    };
    const medE = secs.length ? secs.map((s2) => s2.energy).sort((a, b) => a - b)[Math.floor(secs.length / 2)] : 0.5;
    const tol = o.cutTolerance != null ? o.cutTolerance : 0.15;
    const cutBefore = (t) => {
      const x = t + tol + lead;
      if (o.cut !== "beat") {
        const b = G2.measure(Math.floor(G2.barIndex(x)));
        if (b <= x) return b;
      }
      return G2.at(Math.floor(G2.index(x)));
    };
    const groups = [];
    lines.forEach((l) => {
      let c = cutBefore(l[3][0].t);
      const g = groups[groups.length - 1];
      if (g && c <= g.cut + 1e-3) {
        const cb = G2.at(Math.floor(G2.index(l[3][0].t + tol + lead)));
        if (cb > g.cut + 0.3) c = cb;
        else {
          g.lines.push(l);
          return;
        }
      }
      groups.push({ cut: c, lines: [l] });
    });
    const lastEnd = Math.max(...lines.map((l) => l[3][l[3].length - 1].end || l[3][l[3].length - 1].t + 0.3));
    const endLyrics = G2.measure(Math.ceil(G2.barIndex(lastEnd + 0.4 + lead)));
    const total = o.end || Math.min(M ? M.duration : Infinity, endLyrics + (o.outro ? G2.meter * G2.beat * 2 : 0));
    const sceneFor = (name, endAbs, opts, nodes) => vk2.scene(name, { ...opts, end: endAbs - lead }, nodes);
    const flashNode = (amt2) => vk2.el((ctx) => {
      const e = document.createElement("div");
      e.style.cssText = "position:absolute;inset:0;background:#fff;pointer-events:none;z-index:5;opacity:0";
      ctx.scene.on((l, p, t) => {
        e.style.opacity = (amt2 * G2.pulse(t, 9)).toFixed(3);
      });
      return e;
    }, { fixed: true });
    if (groups[0].cut > 1.2) {
      const I = o.intro || {};
      sceneFor("intro", groups[0].cut, { bg: I.bg || [{ type: "mesh" }], mode: "dark", beat: { scale: 0.025 } }, [
        I.label ? vk2.label(I.label, { at: 0.2 }) : null,
        vk2.title(I.title || document.title, { fx: "letters", at: "b:1", size: I.size || 110, beat: { scale: 0.05 }, style: "text-shadow:0 2px 10px rgba(0,0,0,.3)" }),
        I.sub ? vk2.sub(I.sub, { at: "b:3", fx: "up", style: "text-shadow:0 2px 14px rgba(0,0,0,.55)" }) : null,
        o.spectrum !== false ? vk2.spectrum({ at: 0.3, bars: 24, h: 90, w: 0.5, mt: 36, color: "fg" }) : null
      ]);
    }
    const perSec = {};
    groups.forEach((g, i) => {
      const sec = secOf(g.cut + 0.1), hot = secs.length < 2 || sec.energy > medE, si = sec.index || 0, k = perSec[si] = perSec[si] == null ? 0 : perSec[si] + 1;
      const ss = o.sectionStyles && o.sectionStyles[sec.label], style = ss ? [].concat(ss)[k % [].concat(ss).length] : styles[(si + k) % styles.length];
      const st = g.lines.length > 1 && style === "slam" ? "pop" : style;
      const endAbs = i + 1 < groups.length ? groups[i + 1].cut : endLyrics;
      const bg = bgs[(si + k) % bgs.length];
      sceneFor(`${sec.label}${i + 1}`, endAbs, {
        bg,
        mode: bg === "light" || bg === "accent" ? bg : "dark",
        transition: i === 0 && groups[0].cut <= 1.2 ? "none" : trs[(i + si) % trs.length],
        beat: hot ? { scale: o.zoom != null ? o.zoom : 0.035 } : null,
        energy: o.energy !== false ? o.energy || { brightness: [0.8, 1.12], band: "low", smooth: 0.05 } : null
      }, [
        ...g.lines.map((l, j) => vk2.lyrics(l, { style: st, size: o.size || (st === "slam" ? 150 : g.lines.length > 1 ? 60 : 84), mt: j ? 18 : 0, beat: hot ? 0.06 : 0 })),
        o.spectrum !== false && hot ? vk2.spectrum({ at: 0.1, bars: 32, h: 70, w: 0.7, pos: { x: 0.15, bottom: 0.06 }, mirror: false, color: "muted" }) : null,
        hot && o.flash !== 0 ? flashNode(o.flash || 0.35) : null
      ]);
    });
    if (o.outro && total > endLyrics + 0.5) {
      const O = o.outro;
      sceneFor("outro", total + lead, { bg: O.bg || "dark", transition: "fade:0.6" }, [
        vk2.title(O.title || "", { fx: "letters-blur", at: 0.3, size: O.size || 84, beat: { scale: 0.03 } }),
        O.sub ? vk2.sub(O.sub, { at: 1, fx: "up" }) : null,
        O.small ? vk2.small(O.small, { at: 1.6, mt: 30 }) : null
      ]);
    }
    return v;
  }

  // src/fx/ink.js
  var INK = { paper: "#e4e5d8", paper2: "#d7dbcc", ink: "#1f2529", inkSoft: "#4c565b", seal: "#b5342a", sealInk: "#f6ece0", mist: "#f4f4ea" };
  var BRUSH = '"Ma Shan Zheng","STKaiti","KaiTi","Kaiti SC","Noto Serif SC",serif';
  var SERIF = '"Noto Serif SC","Songti SC","STSong","Noto Sans SC",serif';
  registry.themes.ink = {
    label: "\u6C34\u58A8\uFF08\u5BA3\u7EB8\u3001\u58A8\u8272\u3001\u6731\u7802\u5370\uFF1B\u9A6C\u5584\u653F\u6BDB\u7B14\u5B57 + \u601D\u6E90\u5B8B\u4F53\uFF09",
    modes: {
      light: { bg: INK.paper, fg: INK.ink, muted: "#39434a", surface: "#eeeee4", line: "#aeb0a0", accent: INK.seal, accent2: "#4d6659", onAccent: INK.sealInk },
      dark: { bg: "#1b2023", fg: "#dfe1d6", muted: "#a3aaa4", surface: "#232a2e", line: "#39423f", accent: "#cf4a3d", accent2: "#8fb8a8", onAccent: INK.sealInk },
      accent: { bg: INK.seal, fg: INK.sealInk, muted: "#f0cfc6", surface: INK.ink, line: "#d77b70", accent: INK.ink, accent2: INK.paper, onAccent: INK.sealInk }
    },
    mode: "light",
    warn: INK.seal,
    ok: "#4d6659",
    yellow: "#c9a24c",
    chart: [INK.ink, INK.seal, "#4d6659", "#8fb8b6", "#c9a24c", "#879b92"],
    fonts: { sans: SERIF, display: BRUSH, mono: '"JetBrains Mono",monospace', serif: SERIF, brush: BRUSH },
    weight: { display: 400, title: 400, sub: 400 },
    tracking: { display: ".04em", title: ".04em" },
    scale: { hero: 200, h1: 96, h2: 64, h3: 34, body: 26, small: 20, label: 20, caption: 27, vtitle: 118, chapter: 42, seal: 22 },
    radius: 2,
    ease: "smooth",
    cascade: 0.4,
    marker: "rgba(181,52,42,.25)",
    caret: INK.seal,
    // caption bar of the reference: translucent paper, ink text, red left border
    caption: { bg: "rgba(228,229,216,.9)", fg: INK.ink, karaoke: INK.seal, font: SERIF, weight: 500, radius: 2, padding: ".26em .9em .3em", border: ".14em solid " + INK.seal, tracking: ".08em", shadow: "0 2px 10px -6px rgba(31,37,41,.35)" },
    fontsCheck: ['400 20px "Ma Shan Zheng"', '500 20px "Noto Serif SC"', '400 20px "Noto Serif SC"']
  };
  registry.textures.rice = (v, o) => {
    const e = document.createElement("div");
    e.className = "vk-ov vk-rice";
    const tone = o.tone || [0.38, 0.35, 0.28], sz = o.size || 300, f = o.freq || 0.85, seed = o.seed || 4;
    const svg3 = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${tone[0]} 0 0 0 0 ${tone[1]} 0 0 0 0 ${tone[2]} 0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
    const vig = o.vignette != null ? o.vignette : 0.22, k = v.k || 1, tile = sz * (o.scale || 1), shadow = `inset 0 0 ${Math.round(120 * k)}px rgba(70,62,40,${vig})`;
    e.style.cssText += `;mix-blend-mode:multiply;opacity:${o.amount != null ? o.amount : 0.55};background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(svg3)}");background-size:${tile}px;box-shadow:${shadow}`;
    if (o.cache !== false && v.bakeLater) v.bakeLater(async () => {
      const url = await bakeTile(svg3, tile, tile);
      const img = new Image();
      img.src = url;
      await img.decode();
      const dpr = window.devicePixelRatio || 1, c = document.createElement("canvas");
      c.width = Math.round(v.W * dpr);
      c.height = Math.round(v.H * dpr);
      c.className = "vk-rice-bmp";
      c.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
      const g = c.getContext("2d");
      g.fillStyle = g.createPattern(img, "repeat");
      g.fillRect(0, 0, c.width, c.height);
      const sh = document.createElement("div");
      sh.style.cssText = `position:absolute;inset:0;box-shadow:${shadow}`;
      e.style.backgroundImage = "none";
      e.style.boxShadow = "none";
      e.append(c, sh);
    });
    return { el: e };
  };
  function inkDefs(o = {}) {
    const p = o.prefix || "ink", s2 = o.seed || 7, sc = o.scale || 1;
    return `
<filter id="${p}-line" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence class="vk-boil" type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${s2}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${4 * sc}" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="${p}-wob" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence class="vk-boil" type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${s2 + 4}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${3 * sc}" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="${p}-wash" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur stdDeviation="${1.8 * sc}"/></filter>
<filter id="${p}-far" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${4 * sc}"/></filter>
<filter id="${p}-bleed" x="-12%" y="-12%" width="124%" height="124%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="${s2 + 9}" result="n"/><feGaussianBlur in="SourceGraphic" stdDeviation="${1.2 * sc}" result="b"/><feDisplacementMap in="b" in2="n" scale="${5 * sc}" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="${p}-dry" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.08" numOctaves="2" seed="${s2 + 2}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.7" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;
  }
  function installInk(video, o = {}) {
    const id = "vk-ink-defs-" + (o.prefix || "ink");
    if (document.getElementById(id)) return;
    const w = h("div");
    w.innerHTML = `<svg id="${id}" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${inkDefs(o)}</defs></svg>`;
    video.stage.appendChild(w.firstElementChild);
    if (o.boil) {
      const tur = [...document.getElementById(id).querySelectorAll(".vk-boil")], base2 = tur.map((t) => +t.getAttribute("seed"));
      tur.forEach((t) => t.closest("filter").setAttribute("data-vk-dynamic", ""));
      let last = -1;
      video.onRender((t) => {
        const f = boil(t, o.boil) % (o.boilFrames || 3);
        if (f === last) return;
        last = f;
        tur.forEach((el2, i) => el2.setAttribute("seed", base2[i] + f * 17));
      });
    }
  }
  function brushPath(pts, width = 6, o = {}) {
    const n = pts.length;
    if (n < 2) return "";
    const W = typeof width === "function" ? width : ((u) => width * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.08)), 0.7));
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len2 = Math.hypot(dx, dy) || 1;
      const nx = -dy / len2, ny = dx / len2, w = Math.max(0, W(i / (n - 1))) / 2;
      L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    const f = (x) => Math.round(x * 100) / 100;
    const side = (arr) => arr.map((q, i) => (i ? "L" : "") + f(q[0]) + "," + f(q[1])).join(" ");
    const capEnd = o.round !== false ? ` Q${f(pts[n - 1][0] + (pts[n - 1][0] - pts[n - 2][0]) * 0.6)},${f(pts[n - 1][1] + (pts[n - 1][1] - pts[n - 2][1]) * 0.6)} ` : " L";
    return `M${side(L)}${capEnd}${side(R.reverse()).replace(/^/, "")}Z`;
  }
  var sampleLine = (fn, n = 16) => Array.from({ length: n }, (_, i) => fn(i / (n - 1)));
  function attr(el2, o) {
    const c = el2.__vka || (el2.__vka = {});
    for (const k in o) {
      let v = o[k];
      if (typeof v === "number") v = Math.round(v * 100) / 100;
      v = String(v);
      if (c[k] !== v) {
        c[k] = v;
        el2.setAttribute(k, v);
      }
    }
    return el2;
  }
  Object.assign(registry.fx, {
    ink: { from: { opacity: 0, blur: 10, scale: 1.04 }, to: { opacity: 1, blur: 0, scale: 1 }, ease: "outCubic" },
    // ink blooming into paper
    brush: { from: { clipPath: "inset(0% 0% 100% 0%)", blur: 4 }, to: { clipPath: "inset(0% 0% 0% 0%)", blur: 0 }, instant: { opacity: 1 }, ease: "inOutSine" },
    // top-to-bottom brush reveal (vertical text)
    "brush-x": { from: { clipPath: "inset(0% 100% 0% 0%)", blur: 4 }, to: { clipPath: "inset(0% 0% 0% 0%)", blur: 0 }, instant: { opacity: 1 }, ease: "inOutSine" },
    stamp: { from: { opacity: 0, scale: 1.5, rotate: -8 }, to: { opacity: 1, scale: 1, rotate: 0 }, ease: "outBack" }
    // seal press
  });
  var css = `
.vk-vt{display:flex;flex-direction:row-reverse;align-items:flex-start;gap:.14em;color:var(--fg);pointer-events:none}
.vk-vt-main{writing-mode:vertical-rl;font-family:var(--vk-brush,${BRUSH});line-height:1;letter-spacing:.04em;white-space:nowrap}
.vk-vt-sub{writing-mode:vertical-rl;font-family:var(--vk-serif);letter-spacing:.32em;color:var(--muted);white-space:nowrap}
.vk-seal{writing-mode:vertical-rl;background:var(--seal-bg,${INK.seal});color:var(--seal-fg,${INK.sealInk});font-family:var(--vk-brush,${BRUSH});line-height:1.15;border-radius:.12em;letter-spacing:.1em;white-space:nowrap;box-shadow:inset 0 0 0 .12em rgba(246,236,224,.18)}
.vk-chap{writing-mode:vertical-rl;font-family:var(--vk-brush,${BRUSH});letter-spacing:.08em;line-height:1.1;color:var(--fg);white-space:nowrap}
.vk-chap-no{display:block;font-size:.5em;margin-bottom:.4em;color:var(--accent);letter-spacing:.2em}
.vk-credits{font-family:var(--vk-serif);color:var(--muted);line-height:1.75;letter-spacing:.06em;text-align:left;white-space:nowrap}`;
  function ensureCSS() {
    if (document.getElementById("vk-ink-css")) return;
    const s2 = document.createElement("style");
    s2.id = "vk-ink-css";
    s2.textContent = css;
    document.head.appendChild(s2);
  }
  var px2 = (ctx, v, d) => ctx.px(v != null ? v : d) + "px";
  function vtitle(text3, o = {}) {
    return node({ fx: "ink", d: 1.4, pos: { x: 96, y: 58 }, ...o }, function vtitle_(ctx) {
      ensureCSS();
      const e = h("div", "vk-vt");
      e.style.fontSize = px2(ctx, o.size, 118);
      h("div", "vk-vt-main", esc4(text3), e);
      if (o.sub) {
        const s2 = h("div", "vk-vt-sub", esc4(o.sub), e);
        s2.style.fontSize = px2(ctx, o.subSize, 21);
        s2.style.marginTop = px2(ctx, o.subTop, 18);
      }
      if (o.seal) {
        const s2 = h("div", "vk-seal", esc4(o.seal), e);
        s2.style.fontSize = px2(ctx, o.sealSize, 20);
        s2.style.padding = `${ctx.px(8)}px ${ctx.px(6)}px`;
        s2.style.marginTop = px2(ctx, o.sealTop, Math.round((o.size || 118) * [...text3].length * 0.62));
        const t = ctx.scene.time(o.sealAt != null ? o.sealAt : o.at || 0.3) + (o.sealAt != null ? 0 : 1.1);
        ctx.scene.fx(s2, "stamp", { t, d: 0.5 });
        ctx.extend(t + 0.5);
        if (o.sealSfx !== false) ctx.scene.sfx(t, "woodfish", 0.5);
      }
      return e;
    }, "ink");
  }
  function chapter(text3, o = {}) {
    return node({ fx: "brush", d: 1.1, pos: { x: 84, y: 58 }, ...o }, function chapter_(ctx) {
      ensureCSS();
      const e = h("div", "vk-chap");
      e.style.fontSize = px2(ctx, o.size, 42);
      e.innerHTML = (o.no ? `<span class="vk-chap-no">${esc4(o.no)}</span>` : "") + esc4(text3);
      return e;
    }, "brush");
  }
  function seal(text3, o = {}) {
    return node({ fx: "stamp", d: 0.5, ...o }, function seal_(ctx) {
      ensureCSS();
      const s2 = h("div", "vk-seal", esc4(text3));
      s2.style.fontSize = px2(ctx, o.size, 22);
      s2.style.padding = `${ctx.px(8)}px ${ctx.px(6)}px`;
      return s2;
    }, "stamp");
  }
  function endcard(o = {}) {
    return node({ fx: "ink", d: 1.4, pos: { x: 96, y: 58 }, ...o }, function endcard_(ctx) {
      ensureCSS();
      const wrap = h("div");
      wrap.style.cssText = "position:absolute;inset:0;pointer-events:none";
      const e = h("div", "vk-vt", null, wrap);
      e.style.fontSize = px2(ctx, o.size, 60);
      e.style.cssText += `;position:absolute;left:${px2(ctx, o.x, 0)};top:0`;
      h("div", "vk-vt-main", esc4(o.big || "\u7EC8"), e);
      if (o.small) {
        const s2 = h("div", "vk-vt-sub", esc4(o.small), e);
        s2.style.fontSize = px2(ctx, o.smallSize, 19);
        s2.style.marginTop = px2(ctx, 12);
      }
      if (o.seal) {
        const s2 = h("div", "vk-seal", esc4(o.seal), e);
        s2.style.fontSize = px2(ctx, 18);
        s2.style.padding = `${ctx.px(7)}px ${ctx.px(5)}px`;
        s2.style.marginTop = px2(ctx, o.sealTop, 180);
      }
      return wrap;
    }, "ink");
  }
  function credits(lines, o = {}) {
    return node({ fx: "fade", d: 1, ...o }, function credits_(ctx) {
      ensureCSS();
      const e = h("div", "vk-credits", [].concat(lines).map(esc4).join("<br>"));
      e.style.fontSize = px2(ctx, o.size, 15);
      return e;
    }, "fade");
  }
  function esc4(s2) {
    return String(s2).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  }
  Object.assign(registry.blocks, { vtitle, chapter, seal, endcard, credits });
  var T3 = registry.transitions;
  T3.ink = (e, c) => {
    const fx = c.o.x == null ? c.W * 0.5 : c.o.x <= 1 ? c.o.x * c.W : c.o.x, fy = c.o.y == null ? c.H * 0.5 : c.o.y <= 1 ? c.o.y * c.H : c.o.y;
    const R = Math.hypot(Math.max(fx, c.W - fx), Math.max(fy, c.H - fy)) * 1.35, r = e * R, soft = R * 0.38;
    const m = `radial-gradient(ellipse ${(r * 1.12).toFixed(1)}px ${(r * 0.92).toFixed(1)}px at ${fx.toFixed(0)}px ${fy.toFixed(0)}px, #000 ${Math.max(0, r - soft).toFixed(1)}px, rgba(0,0,0,.55) ${Math.max(0, r - soft * 0.45).toFixed(1)}px, transparent ${r.toFixed(1)}px)`;
    return { in: { maskImage: m, webkitMaskImage: m, filter: `blur(${((1 - e) * 3).toFixed(2)}px)` }, out: { filter: `blur(${(e * 5).toFixed(2)}px)` } };
  };
  T3.wash = (e) => {
    const b = (1 + e * 0.08).toFixed(3);
    return { in: { opacity: e, filter: `blur(${((1 - e) * 6).toFixed(2)}px)` }, out: { filter: `blur(${(e * 8).toFixed(2)}px)${b !== "1.000" ? ` brightness(${b})` : ""}` } };
  };

  // src/fx/rig.js
  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;
  var f2 = (x) => Math.round(x * 100) / 100;
  var mat = {
    id: () => [1, 0, 0, 1, 0, 0],
    mul: (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]],
    // = SVG `translate(x y) rotate(rot) scale(sx sy)`
    trs: (x = 0, y = 0, rot = 0, sx = 1, sy = sx) => {
      const c = Math.cos(rot * D2R), s2 = Math.sin(rot * D2R);
      return [c * sx, s2 * sx, -s2 * sy, c * sy, x, y];
    },
    inv: (m) => {
      const det = m[0] * m[3] - m[1] * m[2], a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
      return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
    },
    apply: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
  };
  var rootMatrix = (r = {}) => {
    const s2 = r.scale == null ? 1 : r.scale;
    return mat.trs(r.x || 0, r.y || 0, r.rot || 0, s2 * (r.flip || 1), s2);
  };
  function solve2BoneIK(tx, ty, l1, l2, bend = 1) {
    const d = Math.max(1e-6, Math.hypot(tx, ty));
    const cd = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    const base2 = Math.atan2(ty, tx);
    const a = Math.acos(clamp((l1 * l1 + cd * cd - l2 * l2) / (2 * l1 * cd), -1, 1));
    const sh = base2 - bend * a;
    const ex = Math.cos(sh) * l1, ey = Math.sin(sh) * l1;
    const fore = Math.atan2(Math.sin(base2) * cd - ey, Math.cos(base2) * cd - ex);
    let el2 = (fore - sh) * R2D;
    el2 = (el2 + 540) % 360 - 180;
    return { a1: sh * R2D, a2: fore * R2D, elbow: el2, shoulder: sh * R2D, reach: d / (l1 + l2) };
  }
  function blink(t, o = {}) {
    const per = o.period || 4.4, dur = o.dur || 0.24, ph = ((t + (o.offset || 0)) % per + per) % per;
    if (ph < per - dur) return 0;
    return o.smooth ? Math.sin((ph - (per - dur)) / dur * Math.PI) : 1;
  }
  function blendPose(a, b, w, defaults = {}) {
    if (w <= 0) return { ...a };
    if (w >= 1) return { ...b };
    const out = {}, keys = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const va = k in a ? a[k] : k in defaults ? defaults[k] : b[k];
      const vb = k in b ? b[k] : k in defaults ? defaults[k] : va;
      out[k] = typeof va === "number" && typeof vb === "number" ? va + (vb - va) * w : w < 0.5 ? va : vb;
    }
    return out;
  }
  function valueAt(v, t) {
    if (v == null) return v;
    if (typeof v === "function") return v(t);
    if (Array.isArray(v) && Array.isArray(v[0])) return kf(t, v);
    return v;
  }
  function createRig(def) {
    const bones = [], byId = {};
    for (const b of def.bones) {
      const bb = { parent: null, x: 0, y: 0, rot: 0, s: 1, ...b };
      bones.push(bb);
      byId[bb.id] = bb;
    }
    const order = [], seen = /* @__PURE__ */ new Set();
    const visit = (b) => {
      if (seen.has(b.id)) return;
      if (b.parent && !byId[b.parent]) throw new Error("[vk.rig] unknown parent " + b.parent + " of " + b.id);
      if (b.parent) visit(byId[b.parent]);
      seen.add(b.id);
      order.push(b);
    };
    bones.forEach(visit);
    const clips = def.clips || {}, chains = def.ik || {};
    const defaults = {};
    for (const b of order) defaults[b.id] = 0;
    for (const n of Object.keys(chains)) defaults[n + ".w"] = 0;
    Object.assign(defaults, def.defaults || {});
    const rootEl = def.root || null;
    const find = def.el || ((id) => rootEl && rootEl.querySelector(`[data-bone="${id}"]`));
    const els = {};
    if (rootEl || def.el) for (const b of order) els[b.id] = b.el || find(b.id) || null;
    const local = (id, pose = {}) => {
      const b = byId[id];
      return mat.trs(b.x + (pose[id + ".x"] || 0), b.y + (pose[id + ".y"] || 0), b.rot + (pose[id] || 0), b.s * (pose[id + ".s"] == null ? 1 : pose[id + ".s"]));
    };
    const base2 = (pose = {}, root = {}) => mat.mul(rootMatrix(root), mat.trs(pose["root.x"] || 0, pose["root.y"] || 0, pose["root.rot"] || 0));
    function matrix(id, pose = {}, root = {}) {
      const chain = [];
      for (let b = byId[id]; b; b = b.parent ? byId[b.parent] : null) chain.unshift(b.id);
      let m = base2(pose, root);
      for (const c of chain) m = mat.mul(m, local(c, pose));
      return m;
    }
    const point = (id, x = 0, y = 0, pose, root) => mat.apply(matrix(id, pose, root), x, y);
    const toLocal = (p, root = {}) => mat.apply(mat.inv(rootMatrix(root)), p[0], p[1]);
    function solveIK(name, target, pose = {}, root = {}, o = {}) {
      const ch = chains[name] || name, [ia, ib, ic] = ch.chain, A = byId[ia], B4 = byId[ib], C = byId[ic];
      const F2 = mat.mul(A.parent ? matrix(A.parent, pose, root) : base2(pose, root), mat.trs(A.x + (pose[ia + ".x"] || 0), A.y + (pose[ia + ".y"] || 0)));
      const [tx, ty] = mat.apply(mat.inv(F2), target[0], target[1]);
      const bx = B4.x + (pose[ib + ".x"] || 0), by = B4.y + (pose[ib + ".y"] || 0), cx = C.x + (pose[ic + ".x"] || 0), cy = C.y + (pose[ic + ".y"] || 0);
      const l1 = Math.hypot(bx, by), l2 = Math.hypot(cx, cy), o1 = Math.atan2(by, bx) * R2D, o2 = Math.atan2(cy, cx) * R2D;
      const s2 = solve2BoneIK(tx, ty, l1, l2, o.bend != null ? o.bend : ch.bend != null ? ch.bend : 1);
      const ra = s2.a1 - o1, rb = s2.a2 - o2 - ra;
      const w = o.weight == null ? 1 : o.weight, out = { ...pose };
      const wrap = (x) => (x % 360 + 540) % 360 - 180;
      const angA = ra - A.rot, angB = rb - B4.rot, fkA = pose[ia] || 0, fkB = pose[ib] || 0;
      out[ia] = fkA + wrap(angA - fkA) * w;
      out[ib] = fkB + wrap(angB - fkB) * w;
      return out;
    }
    const clipPose = (item, t) => {
      const c = typeof item.clip === "string" ? clips[item.clip] : item.clip;
      if (!c) throw new Error("[vk.rig] unknown clip " + item.clip);
      const ct = (item.local ? t - item.at : t) * (item.speed || 1) + (item.offset || 0);
      const p = typeof c === "function" ? c(ct, item) : { ...c };
      for (const n of Object.keys(chains)) if (n + ".tx" in p && !(n + ".w" in p)) p[n + ".w"] = 1;
      return item.pose ? { ...p, ...item.pose } : p;
    };
    function sample2(track, t, n = null) {
      const k = n == null ? track.length : n;
      let i = -1;
      for (let j = 0; j < k; j++) if (t >= track[j].at) i = j;
      if (i < 0) i = 0;
      const cur = clipPose(track[i], t), bl = track[i].blend == null ? 0.3 : track[i].blend;
      if (i === 0 || bl <= 0 || t >= track[i].at + bl) return cur;
      const w = smooth01((t - track[i].at) / bl);
      return blendPose(sample2(track, t, i), cur, w, defaults);
    }
    function resolve(pose, t, root, opts = {}) {
      let p = pose;
      for (const name of Object.keys(chains)) {
        const wt = opts.ik ? valueAt(opts.ik[name], t) : null;
        const mix = opts.ikMix && opts.ikMix[name] != null ? clamp(valueAt(opts.ikMix[name], t), 0, 1) : 1;
        let target = null;
        const own = name + ".tx" in p ? mat.apply(base2(p, root), p[name + ".tx"], p[name + ".ty"]) : null;
        if (wt && own) target = [own[0] + (wt[0] - own[0]) * mix, own[1] + (wt[1] - own[1]) * mix];
        else if (wt) target = wt;
        else target = own;
        const weight = opts.ikWeight && opts.ikWeight[name] != null ? clamp(valueAt(opts.ikWeight[name], t), 0, 1) : wt && !own ? 1 : name + ".w" in p ? clamp(p[name + ".w"], 0, 1) : own ? 1 : 0;
        if (target && weight > 0) p = solveIK(name, target, p, root, { weight, bend: opts.bend && opts.bend[name] });
      }
      return p;
    }
    function apply(pose = {}, root = {}) {
      if (rootEl) {
        const s2 = root.scale == null ? 1 : root.scale;
        rootEl.setAttribute("transform", `translate(${f2(root.x || 0)} ${f2(root.y || 0)}) rotate(${f2(root.rot || 0)}) scale(${f2(s2 * (root.flip || 1))} ${f2(s2)}) translate(${f2(pose["root.x"] || 0)} ${f2(pose["root.y"] || 0)}) rotate(${f2(pose["root.rot"] || 0)})`);
      }
      for (const b of order) {
        const e = els[b.id];
        if (!e) continue;
        const sc = b.s * (pose[b.id + ".s"] == null ? 1 : pose[b.id + ".s"]);
        e.setAttribute("transform", `translate(${f2(b.x + (pose[b.id + ".x"] || 0))} ${f2(b.y + (pose[b.id + ".y"] || 0))}) rotate(${f2(b.rot + (pose[b.id] || 0))})${sc !== 1 ? ` scale(${f2(sc)})` : ""}`);
      }
      if (debugEl) drawDebug(pose);
    }
    let debugEl = null;
    function debug(on = true) {
      if (!rootEl) return;
      if (on && !debugEl) {
        debugEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
        debugEl.setAttribute("class", "vk-rig-debug");
        debugEl.setAttribute("pointer-events", "none");
        rootEl.appendChild(debugEl);
      }
      if (!on && debugEl) {
        debugEl.remove();
        debugEl = null;
      }
    }
    function drawDebug(pose) {
      const P = (id) => point(id, 0, 0, { ...pose, "root.x": 0, "root.y": 0, "root.rot": 0 }, {});
      let s2 = "";
      for (const b of order) {
        const q = P(b.id);
        if (b.parent) {
          const p = P(b.parent);
          s2 += `<line x1="${f2(p[0])}" y1="${f2(p[1])}" x2="${f2(q[0])}" y2="${f2(q[1])}" stroke="#6b58d1" stroke-width="3.5" stroke-linecap="round" opacity=".92"/>`;
        }
        s2 += `<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="5" fill="#fff" stroke="#6b58d1" stroke-width="3"/>`;
      }
      debugEl.innerHTML = s2;
    }
    const rig = {
      def,
      bones: order,
      byId,
      clips,
      chains,
      els,
      local,
      matrix,
      point,
      toLocal,
      solveIK,
      sample: sample2,
      resolve,
      apply,
      debug,
      clip: (name, t) => clipPose({ clip: name, at: 0 }, t),
      blend: (a, b, w) => blendPose(a, b, w, defaults),
      // timeline player: pose(t, root) → final pose; render(t, root, extra) → apply (extra(pose, t) may post-edit)
      play(track, opts = {}) {
        const tr = [...track].sort((a, b) => a.at - b.at);
        const player = {
          track: tr,
          opts,
          clipPose: (t) => sample2(tr, t),
          pose(t, root = {}, edit) {
            let p = sample2(tr, t);
            if (edit) p = edit(p, t) || p;
            return resolve(p, t, root, opts);
          },
          render(t, root = {}, edit) {
            const p = player.pose(t, root, edit);
            apply(p, root);
            return p;
          }
        };
        return player;
      }
    };
    return rig;
  }

  // src/fx/gl/glsl.js
  var PRELUDE = `precision highp float;
varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1., 0.)), u.x), mix(h12(i + vec2(0., 1.)), h12(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.1; a *= .5; } return s / .96875; }
float fbm3(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.1; a *= .5; } return s / .875; }
`;
  var VERT2 = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  var BLUR = `uniform sampler2D uTex; uniform vec2 uDir;
void main(){ vec4 s = texture2D(uTex, vUv) * .375 + (texture2D(uTex, vUv + uDir) + texture2D(uTex, vUv - uDir)) * .25
  + (texture2D(uTex, vUv + 2. * uDir) + texture2D(uTex, vUv - 2. * uDir)) * .0625; gl_FragColor = s; }`;
  var DOWN = `uniform sampler2D uTex; uniform vec2 uTexel;
void main(){ gl_FragColor = .25 * (texture2D(uTex, vUv + uTexel * vec2(-.5, -.5)) + texture2D(uTex, vUv + uTexel * vec2(.5, -.5)) + texture2D(uTex, vUv + uTexel * vec2(-.5, .5)) + texture2D(uTex, vUv + uTexel * vec2(.5, .5))); }`;
  var COPY = `uniform sampler2D uTex; void main(){ gl_FragColor = texture2D(uTex, vUv); }`;
  var NOISE = `uniform vec2 uSize; uniform float uSeed;
void main(){
  vec2 p = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y) + uSeed * vec2(173.1, 91.7);
  float R = fbm(p / 230.);
  float G = fbm(p / 42. + 5.3);
  float fib = 0.;
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    float a = fk * 1.9 + (fbm3(p / 520. + fk * 3.7) - .5) * 3.5;
    vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    float n = vnoise(q * vec2(.010, .42) + fk * 19.3 + uSeed);
    float ridge = pow(1. - abs(n * 2. - 1.), 12.);
    float gate = smoothstep(.52, .78, vnoise(q * vec2(.018, .06) + fk * 7.1 + uSeed * 2.));
    fib = max(fib, ridge * gate * (.55 + .45 * vnoise(q * vec2(.05, .2) + 3.)));
  }
  float A = .55 * h12(floor(p)) + .45 * vnoise(p / 1.7);
  gl_FragColor = vec4(R, G, fib, A);
}`;
  var NOISE_LOOKUP = `uniform sampler2D uN; uniform vec4 uNX; uniform vec2 uNS; uniform vec2 uRes;
vec2 scenePx(vec2 uv){ return vec2(uNX.x + uv.x * uRes.x * uNX.z, uNX.y + (1. - uv.y) * uRes.y * uNX.w); }
vec4 paperN(vec2 sp){ return texture2D(uN, vec2(sp.x / uNS.x, 1. - sp.y / uNS.y)); }
`;

  // src/fx/gl/core.js
  var cores = /* @__PURE__ */ new WeakMap();
  function getCore(video) {
    let c = cores.get(video);
    if (!c) {
      c = new GLCore(video);
      cores.set(video, c);
    }
    return c;
  }
  var warned = false;
  var GLCore = class {
    constructor(video) {
      this.video = video;
      this.W = video.W;
      this.H = video.H;
      this.dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
      const c = this.canvas = document.createElement("canvas");
      c.width = Math.round(this.W * this.dpr);
      c.height = Math.round(this.H * this.dpr);
      const attrs = { preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" };
      const gl2 = this.gl = c.getContext("webgl", attrs) || c.getContext("experimental-webgl", attrs);
      this.ok = !!gl2;
      if (!gl2) {
        if (!warned) console.warn("[vk] WebGL unavailable: vk.gl layers render nothing (vk render --gpu soft|swiftshader keeps WebGL on)");
        warned = true;
        return;
      }
      this.progs = /* @__PURE__ */ new Map();
      this.ready = false;
      video.afterFonts.push(() => {
        this.ready = true;
      });
      const b = this.quad = gl2.createBuffer();
      gl2.bindBuffer(gl2.ARRAY_BUFFER, b);
      gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl2.STATIC_DRAW);
      gl2.pixelStorei(gl2.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl2.pixelStorei(gl2.UNPACK_FLIP_Y_WEBGL, true);
      gl2.pixelStorei(gl2.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl2.NONE);
      gl2.disable(gl2.DEPTH_TEST);
      this.maxPoint = (gl2.getParameter(gl2.ALIASED_POINT_SIZE_RANGE) || [1, 64])[1];
      this.stats = { frames: 0, passes: 0, uploads: 0, ms: 0 };
    }
    // make sure the drawing buffer can hold a pw×ph layer
    fit(pw, ph) {
      const c = this.canvas;
      if (c.width < pw || c.height < ph) {
        c.width = Math.max(c.width, pw);
        c.height = Math.max(c.height, ph);
      }
    }
    // compile (cached): frag gets the prelude (precision, vUv, hash/noise) unless it declares its own precision
    program(frag, vert = VERT2) {
      const key = vert + "\n@@\n" + frag;
      let p = this.progs.get(key);
      if (p) return p;
      const gl2 = this.gl;
      const sh = (type, src2) => {
        const s2 = gl2.createShader(type);
        gl2.shaderSource(s2, src2);
        gl2.compileShader(s2);
        if (!gl2.getShaderParameter(s2, gl2.COMPILE_STATUS)) throw new Error("[vk.gl] shader: " + gl2.getShaderInfoLog(s2) + "\n" + src2.split("\n").map((l, i) => i + 1 + ": " + l).join("\n"));
        return s2;
      };
      const pr = gl2.createProgram();
      gl2.attachShader(pr, sh(gl2.VERTEX_SHADER, vert));
      gl2.attachShader(pr, sh(gl2.FRAGMENT_SHADER, (/precision\s/.test(frag) ? "" : PRELUDE) + frag));
      gl2.linkProgram(pr);
      if (!gl2.getProgramParameter(pr, gl2.LINK_STATUS)) throw new Error("[vk.gl] link: " + gl2.getProgramInfoLog(pr));
      p = { pr, loc: {}, attr: {} };
      this.progs.set(key, p);
      return p;
    }
    uloc(p, n) {
      return n in p.loc ? p.loc[n] : p.loc[n] = this.gl.getUniformLocation(p.pr, n);
    }
    // set uniforms: number → 1f · [a,b(,c,d)] → nf · {tex} → sampler (auto texture units)
    uniforms(p, u) {
      const gl2 = this.gl;
      let unit = 0;
      for (const k in u) {
        const v = u[k], l = this.uloc(p, k);
        if (l == null) continue;
        if (v && v.tex !== void 0) {
          gl2.activeTexture(gl2.TEXTURE0 + unit);
          gl2.bindTexture(gl2.TEXTURE_2D, v.tex);
          gl2.uniform1i(l, unit++);
        } else if (Array.isArray(v)) gl2["uniform" + v.length + "fv"](l, v);
        else if (typeof v === "boolean") gl2.uniform1f(l, v ? 1 : 0);
        else gl2.uniform1f(l, +v || 0);
      }
    }
    texture(w, h3, filter) {
      const gl2 = this.gl, tex = gl2.createTexture();
      gl2.bindTexture(gl2.TEXTURE_2D, tex);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MIN_FILTER, filter || gl2.LINEAR);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MAG_FILTER, filter || gl2.LINEAR);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_S, gl2.CLAMP_TO_EDGE);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_T, gl2.CLAMP_TO_EDGE);
      if (w) gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA, w, h3, 0, gl2.RGBA, gl2.UNSIGNED_BYTE, null);
      return { tex, w, h: h3 };
    }
    // render target (texture + framebuffer)
    target(w, h3) {
      const gl2 = this.gl, t = this.texture(w, h3);
      t.fb = gl2.createFramebuffer();
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, t.fb);
      gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.COLOR_ATTACHMENT0, gl2.TEXTURE_2D, t.tex, 0);
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
      return t;
    }
    upload(t, source) {
      const gl2 = this.gl;
      gl2.bindTexture(gl2.TEXTURE_2D, t.tex);
      gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA, gl2.RGBA, gl2.UNSIGNED_BYTE, source);
      t.w = source.width;
      t.h = source.height;
      this.stats.uploads++;
    }
    // draw a full-screen quad with `frag` into target (null = the layer region of the drawing buffer)
    pass(frag, u, target, o = {}) {
      const gl2 = this.gl, p = typeof frag === "string" ? this.program(frag) : frag;
      gl2.useProgram(p.pr);
      if (target) {
        gl2.bindFramebuffer(gl2.FRAMEBUFFER, target.fb);
        gl2.viewport(0, 0, target.w, target.h);
      } else {
        gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
        gl2.viewport(0, 0, this.vw, this.vh);
      }
      if (o.clear || target) {
        gl2.clearColor(0, 0, 0, 0);
        gl2.clear(gl2.COLOR_BUFFER_BIT);
      }
      this.blend(target ? "none" : o.blend || "normal");
      gl2.bindBuffer(gl2.ARRAY_BUFFER, this.quad);
      const loc = p.attr.p != null ? p.attr.p : p.attr.p = gl2.getAttribLocation(p.pr, "p");
      for (let i = 1; i < 4; i++) gl2.disableVertexAttribArray(i);
      gl2.enableVertexAttribArray(loc);
      gl2.vertexAttribPointer(loc, 2, gl2.FLOAT, false, 0, 0);
      this.uniforms(p, u);
      gl2.drawArrays(gl2.TRIANGLES, 0, 6);
      this.stats.passes++;
    }
    blend(mode) {
      const gl2 = this.gl;
      if (mode === "none") {
        gl2.disable(gl2.BLEND);
        return;
      }
      gl2.enable(gl2.BLEND);
      if (mode === "add") gl2.blendFunc(gl2.ONE, gl2.ONE);
      else if (mode === "multiply") gl2.blendFunc(gl2.DST_COLOR, gl2.ONE_MINUS_SRC_ALPHA);
      else gl2.blendFunc(gl2.ONE, gl2.ONE_MINUS_SRC_ALPHA);
    }
    // Gaussian pyramid of `src` (a texture of w×h): levels[i] (i ≥ 1) = downsampled 2^i and blurred (σ = 1 texel).
    // `levels` holds the targets between calls (allocated once per effect).
    pyramid(src2, n, levels = []) {
      let prev = src2, w = src2.w, h3 = src2.h;
      for (let i = 1; i <= n; i++) {
        w = Math.max(1, Math.ceil(w / 2));
        h3 = Math.max(1, Math.ceil(h3 / 2));
        if (!levels[i]) levels[i] = { a: this.target(w, h3), b: this.target(w, h3) };
        const L = levels[i];
        this.pass(DOWN, { uTex: prev, uTexel: [1 / prev.w, 1 / prev.h] }, L.a);
        this.pass(BLUR, { uTex: L.a, uDir: [1 / w, 0] }, L.b);
        this.pass(BLUR, { uTex: L.b, uDir: [0, 1 / h3] }, L.a);
        prev = L.a;
      }
      return levels;
    }
    // the scene-space paper noise texture (see glsl.js NOISE), generated once
    noise(seed = 0) {
      const k = "n" + seed;
      if (this[k]) return this[k];
      const t = this[k] = this.target(Math.round(this.W), Math.round(this.H));
      this.pass(NOISE, { uSize: [t.w, t.h], uSeed: seed }, t);
      return t;
    }
    // begin a layer: bind the drawing buffer region pw×ph and clear it
    begin(pw, ph) {
      const gl2 = this.gl;
      this.fit(pw, ph);
      this.vw = pw;
      this.vh = ph;
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
      gl2.viewport(0, 0, pw, ph);
      gl2.disable(gl2.SCISSOR_TEST);
      gl2.clearColor(0, 0, 0, 0);
      gl2.clear(gl2.COLOR_BUFFER_BIT);
    }
    bindOutput() {
      const gl2 = this.gl;
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
      gl2.viewport(0, 0, this.vw, this.vh);
    }
    // copy the layer region (bottom-left pw×ph of the GL buffer) into a 2D context
    blit(ctx, pw, ph) {
      ctx.drawImage(this.canvas, 0, this.canvas.height - ph, pw, ph, 0, 0, pw, ph);
    }
  };

  // src/fx/gl/shaders.js
  var CUBIC = `vec4 cubicTex(sampler2D t, vec2 uv, vec2 sz){
  vec2 st = uv * sz - .5, i = floor(st), f = fract(st);
  vec2 w0 = (1. - f) * (1. - f) * (1. - f) / 6., w1 = (4. - 6. * f * f + 3. * f * f * f) / 6., w2 = (1. + 3. * f + 3. * f * f - 3. * f * f * f) / 6., w3 = f * f * f / 6.;
  vec2 g0 = w0 + w1, g1 = w2 + w3, h0 = (w1 / g0) - 1. + i + .5, h1 = (w3 / g1) + 1. + i + .5;
  return g0.y * (g0.x * texture2D(t, vec2(h0.x, h0.y) / sz) + g1.x * texture2D(t, vec2(h1.x, h0.y) / sz))
       + g1.y * (g0.x * texture2D(t, vec2(h0.x, h1.y) / sz) + g1.x * texture2D(t, vec2(h1.x, h1.y) / sz)); }
`;
  var PAPER = NOISE_LOOKUP + `uniform vec3 uBase; uniform float uAmt, uFib, uVig, uMode, uSpeck;
void main(){
  vec2 sp = scenePx(vUv); vec4 n = paperN(sp);
  vec3 col = uBase * (1. - uAmt * (.075 * (n.r - .5) + .035 * (n.g - .5)));
  float fib = n.b;
  col = mix(col, min(vec3(1.), col * vec3(1.045, 1.045, 1.05)), uFib * fib * .8);   // fibre strands: lighter pulp
  col = mix(col, col * vec3(.965, .962, .95), uFib * smoothstep(.35, 1., fib) * .45); // \u2026with a faint darker core
  float cl = smoothstep(.55, .85, fbm3(sp / 14. + 3.1)) * smoothstep(.5, .7, n.r);
  col = mix(col, min(vec3(1.), col * 1.03), uFib * cl * .6);                      // pulp clouds
  col *= 1. - .05 * uAmt * (n.a - .5);
  vec2 sc = floor(sp / 5.); float sh = h12(sc + 7.3);
  float sk = step(.9993, sh) * smoothstep(1.6, .4, length(fract(sp / 5.) * 5. - 2.5 - (vec2(h12(sc + 1.), h12(sc + 2.)) - .5) * 2.));
  col *= 1. - sk * .28 * uSpeck;
  vec2 v = (sp / uNS - .5) * vec2(1., .82);
  col *= 1. - uVig * smoothstep(.3, .9, length(v) * 1.25) * vec3(1., 1.02, 1.08);
  gl_FragColor = uMode > .5 ? vec4(min(vec3(1.), col / uBase), 1.) : vec4(col, 1.);
}`;
  var BLEED = NOISE_LOOKUP + CUBIC + `uniform sampler2D uM0, uM1, uM3, uHa, uHb; uniform vec2 uHaSize, uHbSize, uM3Size; uniform float uHmix;
uniform float uX, uDraw, uDur, uHaloEnd, uFade, uSoft; uniform vec3 uWipe;
uniform vec3 uColor; uniform float uDensity, uHaloDensity, uRim, uFibre, uFeather, uMottle, uGrain, uSeedF, uPool, uHWarp;
void main(){
  vec2 sp = scenePx(vUv); vec4 n = paperN(sp);
  float dl = 0.;
  if (uWipe.z > 0.) { float pos = dot(vec2(vUv.x, 1. - vUv.y) - .5, uWipe.xy) + .5; dl = uWipe.z * clamp(pos + (n.g - .5) * .06, 0., 1.); }
  float x = uX - dl;
  if (x < 0.) { gl_FragColor = vec4(0.); return; }
  // far from any ink (coarsest halo level and the lightly blurred mask both empty): nothing to draw
  if (texture2D(uHb, vUv).a < .003 && texture2D(uM3, vUv).a < .003) { gl_FragColor = vec4(0.); return; }
  float d = clamp(x / max(uDraw, 1e-4), 0., 1.), sd = d * d * (3. - 2. * d);
  float w = clamp((x - uDraw * .35) / max(uDur, 1e-4), 0., 1.), wet = sqrt(w);
  float thC = .98 - .48 * sd, thH = 1. - (1. - uHaloEnd) * wet;
  // domain warp (organic outlines): a few px for the stroke, a fraction of the spread for the halo
  vec2 wq = sp / 23. + uSeedF, wv = (vec2(fbm3(wq), fbm3(wq + 9.7)) - .5) * 3.;
  vec2 pxUv = 1. / uRes;
  float Fc = mix(texture2D(uM0, vUv + wv * 1.6 * uFeather * pxUv).a, texture2D(uM1, vUv + wv * 1.6 * uFeather * pxUv).a, .6);
  vec2 wq2 = sp / 61. + uSeedF * 1.7, wv2 = (vec2(fbm3(wq2), fbm3(wq2 + 4.1)) - .5) * 3.;
  vec2 huv = vUv + (wv2 * uHWarp + wv * uHWarp * .35) * pxUv;
  float Fh = mix(cubicTex(uHa, huv, uHaSize).a, cubicTex(uHb, huv, uHbSize).a, uHmix);
  // paper-driven irregularity: cloudy (R) + mid (G) noise, fine ragged edge, a little wicking along fibres (B)
  float lo = (n.r - .5) * 2.2, mid = (n.g - .5) * 2.2, fine = vnoise(sp * .6 + uSeedF) - .5;
  float cth = thC + (mid * .07 + fine * .12 * (1. - .8 * uSoft)) * uFeather - n.b * .08 * uFibre * (1. - .6 * uSoft);
  float cov = smoothstep(cth - .02 - .5 * uSoft, cth + .02, Fc);
  float hth = thH * (1. + (lo * .45 + mid * .3 + fine * .25) * uFeather) - n.b * .16 * uFibre;
  float hcov = wet > 0. ? smoothstep(hth - .006, hth + .02, Fh) : 0.;
  // halo density: fades from the stroke outwards; darker tide line at the front, softer while still wet
  float Fn = cubicTex(uM3, huv, uM3Size).a;
  float hg = clamp((Fh - hth) / max(.05, 1. - hth) * .8, 0., 1.) * .5 + smoothstep(.02, .45, Fn) * .5;
  float rim = hcov * (1. - smoothstep(hth + .005, hth + .03 + .05 * (1. - wet), Fh)) * (.35 + .65 * wet);
  float mott = 1. - uMottle * (.35 * lo + .2 * mid);
  // pigment pools at the edges of the core (the stroke dries darker at its border)
  float pool = cov * (1. - smoothstep(cth, cth + .3, Fc)) * uPool;
  float a = cov * uDensity * mott * mix(.86, 1., Fc) + pool * (1. - uDensity * .8);
  float ha = (hcov * uHaloDensity * mix(.25, 1.25, hg) + rim * uRim) * mott;
  a = a + ha * (1. - a);
  a *= 1. - uGrain * ((n.a - .5) * .8 * (1. - .6 * uSoft) + .25 * n.b);
  a = clamp(a * clamp(sd * 2.5, 0., 1.) * uFade, 0., 1.);
  gl_FragColor = vec4(uColor * a, a);
}`;
  var WASH = NOISE_LOOKUP + CUBIC + `uniform sampler2D uS, uL2, uL3, uL4; uniform vec2 uL4Size;
uniform float uBoil, uWob, uWobF, uDark, uEdge, uBleed, uGrain, uMottle, uAlpha, uSeedF, uInk, uTide; uniform vec3 uInkC;
void main(){
  vec2 sp = scenePx(vUv); vec4 n = paperN(sp);
  vec2 q = sp / uWobF + uBoil * 17.13 + uSeedF;
  vec2 off = (vec2(vnoise(q), vnoise(q + 31.7)) - .5) * 2. * uWob / (uRes * uNX.zw);
  vec2 uv = vUv + off;
  vec4 c = texture2D(uS, uv), b = mix(texture2D(uL2, uv), texture2D(uL3, uv), .5), bb = cubicTex(uL4, uv, uL4Size);
  float a0 = c.a;
  vec3 base = c.rgb / max(a0, 1e-4);
  // pigment pools at the borders of every wash (irregular band)
  float edge = clamp((a0 - b.a) * uEdge + (n.g - .5) * .5 * a0, 0., 1.);
  vec3 pooled = mix(base * base * .62, uInkC, .2 * uInk);
  base = mix(base, pooled, edge * uDark);
  // wet-wash mottling and tide lines (water marks) inside large shapes
  float lo = (n.r - .5) * 2.2, mid = (n.g - .5) * 2.2;
  base *= 1. + lo * uMottle * .22 - mid * uMottle * .08;
  float wm = fbm3(sp / 70. + uSeedF + 3.);
  float tide = smoothstep(.028, .0, abs(wm - .52)) * clamp(b.a * 1.4 - .3, 0., 1.);
  base = mix(base, base * base * .75, tide * uTide);
  float a = a0 * clamp(1. - uGrain * ((n.a - .5) * .9 + .4 * n.b), 0., 1.);
  // soft bleed of diluted colour into the paper around shapes
  float hth = .14 + (n.g - .5) * .3 - n.b * .12;
  float halo = smoothstep(hth, hth + .2, bb.a) * uBleed * (1. - a0);
  vec3 hc = bb.rgb / max(bb.a, 1e-4);
  float ha = halo * .45 * (1. - .4 * smoothstep(hth + .2, hth + .6, bb.a));
  gl_FragColor = vec4(base * a + hc * ha * (1. - a), a + ha * (1. - a)) * uAlpha;
}`;
  var MIST = NOISE_LOOKUP + `uniform float uTime, uY, uH, uSpeed, uDensity, uScale, uSeedF; uniform vec3 uColor;
void main(){
  vec2 sp = scenePx(vUv);
  float band = exp(-pow((sp.y - uY) / uH, 2.));
  if (band < .004) { gl_FragColor = vec4(0.); return; }
  vec2 q = vec2(sp.x / (uScale * 3.2) + uTime * uSpeed / uScale, sp.y / uScale) + uSeedF;
  float f = fbm(q) * .75 + fbm(q * 2.3 + 7.) * .25;
  float a = smoothstep(.36, .72, f) * band * uDensity;
  gl_FragColor = vec4(uColor * a, a);
}`;
  var PVERT = `attribute vec4 a0; attribute vec4 a1; attribute vec4 a2;
uniform vec2 uRes; uniform vec4 uNX; uniform float uMaxPt;
varying vec4 v1; varying vec3 vC; varying float vA, vM;
void main(){
  vec2 lp = (a0.xy - uNX.xy) / uNX.zw;
  gl_Position = vec4(lp.x / uRes.x * 2. - 1., 1. - lp.y / uRes.y * 2., 0., 1.);
  float m = a1.y == 1. ? 1.8 : a1.y == 2. || a1.y == 4. ? 1.6 : 1.15;
  float want = a0.z * 2. * m / uNX.z;
  gl_PointSize = min(want, uMaxPt);
  vM = m;
  v1 = a1; vC = a2.rgb; vA = a0.w;
}`;
  var PFRAG = `precision highp float;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1., 0.)), u.x), mix(h12(i + vec2(0., 1.)), h12(i + vec2(1., 1.)), u.x), u.y); }
uniform vec3 uC2; uniform float uSoak;
varying vec4 v1; varying vec3 vC; varying float vA, vM;
void main(){
  vec2 pc = gl_PointCoord * 2. - 1.;
  float shape = v1.y, u = v1.z, r = length(pc) * vM, a = 0.; vec3 col = vC;
  if (shape < .5) {                                     // drop in flight: round, slightly ragged, dense
    float e = 1. + .12 * (vnoise(vec2(atan(pc.y, pc.x) * 1.3 + u * 40., u * 9.)) - .5);
    a = smoothstep(e, e - .18, r);
  } else if (shape < 1.5) {                             // landed splat soaking into the paper
    float ang = atan(pc.y, pc.x);
    float e = 1. + .36 * (vnoise(vec2(ang * 1.1 + u * 40., u * 9.)) - .5) + .16 * (vnoise(vec2(ang * 4.3 + u * 70., 3.)) - .5);
    e += .5 * pow(max(0., vnoise(vec2(ang * 3.2 + u * 13., 7.)) - .6) / .4, 2.);
    float blot = smoothstep(e, e - .07, r);
    float rim = smoothstep(e - .3, e - .03, r) * blot;
    float soak = clamp(v1.w * 2., 0., 1.);
    float halo = smoothstep(e * 1.55, e * 1.02, r) * (1. - blot) * .3 * soak * uSoak;
    a = blot * (.78 + .22 * rim) + halo;
  } else if (shape < 2.5) {                             // mist / spray: soft gaussian
    a = exp(-r * r * 3.2);
  } else if (shape < 3.5) {                             // petal: rotated, pointed ellipse, pale base \u2192 coloured tip
    float t = radians(v1.x); vec2 q = mat2(cos(t), -sin(t), sin(t), cos(t)) * pc * vM;
    float y = q.y, w = .52 * (1. - .35 * y) * sqrt(max(0., 1. - y * y));
    float notch = .12 * smoothstep(.2, 0., abs(q.x)) * smoothstep(.75, 1., -y);
    a = smoothstep(.03, -.03, abs(q.x) - w) * smoothstep(1., .92, abs(y) + notch);
    col = mix(uC2, vC, smoothstep(.9, -.6, y));
    col *= .92 + .08 * smoothstep(.05, 0., abs(q.x));
  } else if (shape < 4.5) {                             // spark: hot core + glow (use blend: 'add')
    a = exp(-r * r * 5.) * .7 + smoothstep(.3, .05, r) * .6;
    col = mix(vC, vec3(1., .97, .85), smoothstep(.35, 0., r));
  } else {                                              // plain dot
    a = smoothstep(1., .85, r);
  }
  a = clamp(a * vA, 0., 1.);
  gl_FragColor = vec4(col * a, a);
}`;
  var CUSTOM_HEAD = NOISE_LOOKUP + "uniform float uTime, uStep, uProgress;\n";

  // src/fx/gl/math.js
  var clamp012 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
  var sm2 = (x) => {
    x = clamp012(x);
    return x * x * (3 - 2 * x);
  };
  function stepT(t, fps = 12) {
    return fps > 0 ? Math.floor(t * fps + 1e-6) / fps : t;
  }
  function boilFrame(t, fps = 12, frames = 0) {
    const f = Math.floor(t * fps + 1e-6);
    return frames > 0 ? (f % frames + frames) % frames : f;
  }
  function rgb(c) {
    if (Array.isArray(c)) return c.some((v) => v > 1) ? c.slice(0, 3).map((v) => v / 255) : c.slice(0, 3);
    const s2 = String(c || "#000").trim();
    let m = /^#([0-9a-f]{3})$/i.exec(s2);
    if (m) return [...m[1]].map((ch) => parseInt(ch + ch, 16) / 255);
    m = /^#([0-9a-f]{6})/i.exec(s2);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
    m = /rgba?\(([^)]+)\)/i.exec(s2);
    if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map((v) => +v / 255);
    return [0, 0, 0];
  }
  function bleedCurve(local, o = {}) {
    const at = o.at || 0, draw2 = o.draw != null ? o.draw : 0.8, dur = o.dur != null ? o.dur : 2.5;
    const x = local - at;
    const d = draw2 > 0 ? clamp012(x / draw2) : x >= 0 ? 1 : 0;
    const w = dur > 0 ? clamp012((x - draw2 * 0.35) / dur) : x >= draw2 * 0.35 ? 1 : 0;
    const wet = Math.sqrt(w);
    const fade = o.fade ? 1 - sm2((local - o.fade[0]) / Math.max(1e-6, o.fade[1] - o.fade[0])) : 1;
    return {
      on: x >= 0 && fade > 0,
      draw: d,
      wet,
      alpha: (x >= 0 ? sm2(d * 2.2) : 0) * fade,
      core: 0.98 - 0.48 * sm2(d),
      // core threshold .98 → .5 (skeleton → exact shape)
      halo: 1 - (1 - (o.haloEnd != null ? o.haloEnd : 0.12)) * wet,
      // halo threshold 1 → .12 (front moves out)
      done: x >= Math.max(draw2, draw2 * 0.35 + dur) && (!o.fade || local < o.fade[0])
    };
  }
  function levelSigma(i) {
    let s2 = 0;
    for (let k = 1; k <= i; k++) s2 += 4 ** k;
    return Math.sqrt(s2 + (i ? 0 : 0.25));
  }
  function levelFor(sigma, maxLevel = 6) {
    if (sigma <= levelSigma(1)) return clamp012((sigma - 0.5) / (levelSigma(1) - 0.5));
    for (let i = 1; i < maxLevel; i++) {
      const a = levelSigma(i), b = levelSigma(i + 1);
      if (sigma <= b) return i + (sigma - a) / (b - a);
    }
    return maxLevel;
  }
  function haloSigma(spread, th = 0.12) {
    return spread / Math.max(0.2, probit(1 - th));
  }
  function probit(p) {
    p = Math.min(1 - 1e-12, Math.max(1e-12, p));
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const q0 = Math.min(p, 1 - p);
    if (q0 < 0.02425) {
      const q2 = Math.sqrt(-2 * Math.log(q0)), x = (((((c[0] * q2 + c[1]) * q2 + c[2]) * q2 + c[3]) * q2 + c[4]) * q2 + c[5]) / ((((d[0] * q2 + d[1]) * q2 + d[2]) * q2 + d[3]) * q2 + 1);
      return p < 0.5 ? x : -x;
    }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  function jitterPath(d, t, o = {}) {
    const amp = o.amp != null ? o.amp : 1.5, fr = boilFrame(t, o.fps || 12, o.frames || 0), seed = (o.seed || 0) * 13.37 + fr * 71.3, sm22 = o.smooth || 3;
    if (!amp) return d;
    let k = 0;
    const f = (x) => Math.round(x * 100) / 100;
    return String(d).replace(/([MLCQSTmlcqst])([^MLCQSTAHVZmlcqstahvz]*)/g, (all, cmd, args) => {
      const nums = args.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
      if (!nums || nums.length < 2) return all;
      const rel = cmd === cmd.toLowerCase();
      const out = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const u = k++ / sm22;
        const dx = rel ? 0 : (noise1(u + seed) - 0.5) * 2 * amp, dy = rel ? 0 : (noise1(u + seed + 91.7) - 0.5) * 2 * amp;
        out.push(f(+nums[i] + dx) + "," + f(+nums[i + 1] + dy));
      }
      return cmd + out.join(" ") + " ";
    }).trim();
  }
  function jitterPoints(pts, t, o = {}) {
    const amp = o.amp != null ? o.amp : 1.5, fr = boilFrame(t, o.fps || 12, o.frames || 0), seed = (o.seed || 0) * 13.37 + fr * 71.3, sm22 = o.smooth || 3;
    return pts.map((p, i) => [p[0] + (noise1(i / sm22 + seed) - 0.5) * 2 * amp, p[1] + (noise1(i / sm22 + seed + 91.7) - 0.5) * 2 * amp]);
  }

  // src/fx/gl/particles.js
  var D2R2 = Math.PI / 180;
  var isR = (v) => Array.isArray(v) && v.length === 2 && typeof v[0] === "number";
  function particles(opts = {}) {
    const o = { ...opts.preset ? PRESETS[opts.preset] : {}, ...opts };
    const seed = o.seed != null ? o.seed : 1;
    const r = (i, k) => hash(seed * 131.7 + i * 17.13 + k * 3.917 + 0.31);
    const pick = (v, i, k, d) => {
      if (v == null) return d;
      if (typeof v === "function") return v(i, (kk) => r(i, 100 + kk));
      if (isR(v)) return v[0] + (v[1] - v[0]) * r(i, k);
      return v;
    };
    const bursts = [].concat(o.burst || []).map((b) => typeof b === "number" ? { t: b } : b);
    const counts = bursts.map((b) => b.n != null ? b.n : o.n != null ? o.n : 30);
    const rate = o.rate || 0, from = o.from || 0, to = o.to != null ? o.to : Infinity;
    const maxLife = isR(o.life) ? o.life[1] : typeof o.life === "number" ? o.life : 2;
    const nBurst = counts.reduce((a, b) => a + b, 0);
    function spawn(i) {
      let t0, b = null;
      if (i < nBurst) {
        let j = 0, c = i;
        while (c >= counts[j]) {
          c -= counts[j];
          j++;
        }
        b = bursts[j];
        t0 = b.t + (b.dur ? r(i, 0) * b.dur : 0);
      } else t0 = from + (i - nBurst) / rate;
      const src2 = b || {};
      const ex = src2.x != null ? src2.x : o.x || 0, ey = src2.y != null ? src2.y : o.y || 0;
      let x = ex, y = ey;
      const line = src2.line || o.line, box = src2.box || o.box, rad = src2.radius != null ? src2.radius : o.radius;
      if (line) {
        const u = r(i, 1);
        x = line[0] + (line[2] - line[0]) * u;
        y = line[1] + (line[3] - line[1]) * u;
      } else if (box) {
        x = ex + (r(i, 1) - 0.5) * box[0];
        y = ey + (r(i, 2) - 0.5) * box[1];
      } else if (rad) {
        const a = r(i, 1) * Math.PI * 2, rr = rad * Math.sqrt(r(i, 2));
        x = ex + Math.cos(a) * rr;
        y = ey + Math.sin(a) * rr;
      }
      const ang = ((src2.angle != null ? src2.angle : o.angle != null ? o.angle : -90) + (r(i, 3) - 0.5) * (src2.spread != null ? src2.spread : o.spread != null ? o.spread : 360)) * D2R2;
      const sp = pick(src2.speed || o.speed, i, 4, 100);
      return { t0, x, y, vx: Math.cos(ang) * sp + (o.wind || 0), vy: Math.sin(ang) * sp };
    }
    const G2 = o.gravity || 0, GX = o.gravityX || 0, K = o.drag || 0;
    function pos(s2, a) {
      if (K < 1e-6) return [s2.x + s2.vx * a + 0.5 * GX * a * a, s2.y + s2.vy * a + 0.5 * G2 * a * a];
      const e = (1 - Math.exp(-K * a)) / K;
      return [s2.x + (s2.vx - GX / K) * e + GX / K * a, s2.y + (s2.vy - G2 / K) * e + G2 / K * a];
    }
    function landing(s2, life, i) {
      if (o.landAt != null) return Math.min(life, pick(o.landAt, i, 12, life));
      const fl = o.floor;
      if (fl == null) return null;
      const floorY = typeof fl === "function" ? fl : () => fl;
      let prev = 0, py = pos(s2, 0)[1];
      if (py >= floorY(s2.x)) return null;
      const steps2 = 48;
      for (let k = 1; k <= steps2; k++) {
        const a = life * k / steps2, p = pos(s2, a);
        if (p[1] >= floorY(p[0])) {
          let lo = prev, hi = a;
          for (let it = 0; it < 24; it++) {
            const m = (lo + hi) / 2, q = pos(s2, m);
            if (q[1] >= floorY(q[0])) hi = m;
            else lo = m;
          }
          return hi;
        }
        prev = a;
        py = p[1];
      }
      return null;
    }
    const total = (n) => rate ? nBurst + n : nBurst;
    function state(i, t) {
      const s2 = spawn(i), age = t - s2.t0;
      if (age < 0) return null;
      const life = pick(o.life, i, 5, 2), lands = o.floor != null || o.landAt != null;
      if (age > life + (lands ? o.splatLife != null ? o.splatLife : life : 0)) return null;
      const la = landing(s2, life, i);
      let x, y, landed = false, land = null, a = age;
      if (la != null && age >= la) {
        [x, y] = pos(s2, la);
        landed = true;
        land = { x, y, t: s2.t0 + la, age: age - la };
        a = la;
      } else {
        if (age > life) return null;
        [x, y] = pos(s2, age);
      }
      const sway = o.sway || 0;
      if (sway && !landed) {
        const f = o.swayFreq || 1.3;
        x += (noise1(i * 7.7 + a * f) - 0.5) * 2 * sway;
        y += (noise1(i * 3.1 + 40 + a * f) - 0.5) * sway * 0.5;
      }
      const size0 = pick(o.size, i, 6, 6), grow = o.grow != null ? o.grow : 1;
      const lifeP = Math.min(1, age / life), fin = o.fadeIn != null ? o.fadeIn : 0.05, fout = o.fadeOut != null ? o.fadeOut : 0.3;
      let alpha = pick(o.alpha, i, 7, 1) * Math.min(1, age / Math.max(1e-6, fin)) * (landed ? 1 : Math.min(1, (life - age) / Math.max(1e-6, fout * life)));
      if (landed) {
        const sl = o.splatLife != null ? o.splatLife : life, sf = o.splatFade != null ? o.splatFade : 0.4;
        alpha *= Math.min(1, (sl - land.age) / Math.max(1e-6, sf * sl));
      }
      if (alpha <= 0) return null;
      const rot = pick(o.rot, i, 8, 0) + pick(o.spin, i, 9, 0) * a;
      const soakK = (o.soak || 5) * (landed ? land.age : 0), settledSize = landed && soakK > 6.9;
      const size2 = landed ? size0 * (1 + ((o.splat != null ? o.splat : 2.2) - 1) * (settledSize ? 1 : 1 - Math.exp(-soakK))) : size0 * (1 + (grow - 1) * lifeP);
      const A = Math.min(1, alpha);
      return { id: i, x, y, size: size2, alpha: A, rot, age, life, landed, land, u: r(i, 11), t0: s2.t0, settled: settledSize && age >= fin && land.age <= (o.splatLife != null ? o.splatLife : life) * (1 - (o.splatFade != null ? o.splatFade : 0.4)) };
    }
    return {
      o,
      seed,
      // number of particles that may exist at time t (upper bound of the index range)
      count(t) {
        return rate ? total(Math.max(0, Math.min(Math.floor((Math.min(t, to) - from) * rate) + 1, Math.ceil((to - from) * rate)))) : nBurst;
      },
      at(t) {
        const out = [];
        for (let i = 0; i < nBurst; i++) {
          const p = state(i, t);
          if (p) out.push(p);
        }
        if (rate) {
          const extra = o.floor != null || o.landAt != null ? o.splatLife != null ? o.splatLife : maxLife : 0;
          const lo = Math.max(0, Math.floor((t - maxLife - extra - from) * rate)), hi = Math.floor((Math.min(t, to) - from) * rate + 1e-9);
          const cap = to === Infinity ? Infinity : Math.ceil((to - from) * rate);
          for (let j = lo; j <= hi && j < cap; j++) {
            const p = state(nBurst + j, t);
            if (p) out.push(p);
          }
        }
        return out;
      },
      spawn,
      pos
    };
  }
  var SHAPES = { drop: 0, splat: 1, mist: 2, petal: 3, spark: 4, dot: 5 };
  var PRESETS = {
    // ink flicked off a brush: dense drops, fall, splat on the floor and soak in
    inkDrops: { angle: -80, spread: 80, speed: [260, 620], gravity: 1100, drag: 0.7, life: [1.4, 2.2], size: [3, 11], alpha: [0.75, 1], splat: 2.4, soak: 6, splatLife: 30, splatFade: 0.02, shape: "drop", color: "#1f2529", n: 26 },
    // top-down splatter around an impact (paper seen from above): drops fly out, slow down and soak in where they stop
    splatter: { angle: 0, spread: 360, speed: [120, 900], drag: 5, life: [0.12, 0.3], landAt: [0.08, 0.26], size: [1.5, 7], alpha: [0.8, 1], splat: 1.8, soak: 8, splatLife: 60, splatFade: 0.01, shape: "drop", color: "#1f2529", n: 60, fadeIn: 1e-3 },
    // water spray: many fine pale droplets, strong drag, fade out
    spray: { angle: -90, spread: 120, speed: [120, 520], gravity: 700, drag: 2.2, life: [0.6, 1.3], size: [1.5, 5], alpha: [0.45, 0.9], fadeOut: 0.6, shape: "mist", color: "#f4f6ee", n: 90 },
    // falling petals: slow, swaying, spinning
    petals: { angle: 90, spread: 30, speed: [20, 60], gravity: 30, drag: 1.2, life: [5, 8], size: [9, 16], sway: 38, swayFreq: 0.6, spin: [-120, 120], rot: [0, 360], fadeIn: 0.4, fadeOut: 0.2, shape: "petal", color: "#d0675f", color2: "#f3e3da" },
    // sparks: fast, short, additive glow
    sparks: { angle: -90, spread: 360, speed: [150, 520], gravity: 260, drag: 3, life: [0.35, 0.9], size: [2, 5], grow: 0.4, shape: "spark", color: "#f2c45a", blend: "add", n: 60 },
    // slow drifting mist motes
    mist: { angle: -90, spread: 60, speed: [8, 25], gravity: -4, drag: 0.2, life: [4, 7], size: [30, 70], alpha: [0.12, 0.25], sway: 30, swayFreq: 0.25, fadeIn: 0.3, fadeOut: 0.4, shape: "mist", color: "#f4f4ea" }
  };

  // src/fx/gl/index.js
  var f4 = (x) => (Math.round(x * 1e4) / 1e4).toString();
  var GLLayer = class {
    constructor(video, _draw, o = {}) {
      this.video = video;
      this.o = o;
      this.core = getCore(video);
      const r = this.rect = o.rect ? o.rect.slice() : [0, 0, video.W, video.H];
      this.res = this.core.dpr * (o.scale || 1);
      this.pw = Math.max(1, Math.round(r[2] * this.res));
      this.ph = Math.max(1, Math.round(r[3] * this.res));
      const c = this.el = document.createElement("canvas");
      c.className = "vk-canvas vk-gl" + (o.class ? " " + o.class : "");
      c.width = this.pw;
      c.height = this.ph;
      c.style.cssText = `left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px` + (o.blend ? `;mix-blend-mode:${o.blend}` : "") + (o.opacity != null ? `;opacity:${o.opacity}` : "");
      this.ctx = c.getContext("2d", { willReadFrequently: true });
      this.effects = [];
      this.inited = false;
      this.lastKey = null;
      if (this.core.ok) this.core.fit(this.pw, this.ph);
      [].concat(o.effects || []).forEach((e) => e && this.add(e));
    }
    add(...effects) {
      effects.flat().forEach((e) => {
        if (e) {
          this.effects.push(e);
          if (this.inited && e.init) e.init(this.core, this);
        }
      });
      return this;
    }
    // uniforms every effect shader gets: layer size, scene-space mapping, paper noise
    common(seed = 0) {
      const r = this.rect;
      return { uRes: [this.pw, this.ph], uNX: [r[0], r[1], 1 / this.res, 1 / this.res], uNS: [this.video.W, this.video.H], uN: this.core.noise(seed) };
    }
    // 2D context whose user space = scene px (for drawing masks into layer-sized canvases)
    sceneCtx(canvas) {
      const g = canvas.getContext("2d", { willReadFrequently: true });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.setTransform(this.res, 0, 0, this.res, -this.rect[0] * this.res, -this.rect[1] * this.res);
      return g;
    }
    canvas() {
      const c = document.createElement("canvas");
      c.width = this.pw;
      c.height = this.ph;
      return c;
    }
    render(local, info) {
      const core = this.core;
      if (!core.ok) return;
      const t0 = performance.now();
      if (!this.inited) {
        this.inited = true;
        this.effects.forEach((e) => e.init && e.init(core, this));
      }
      let key = core.ready ? "R" : "N";
      for (const e of this.effects) {
        const k = e.key ? e.key(local, info, this) : null;
        if (k == null) {
          key = null;
          break;
        }
        key += "|" + k;
      }
      if (key != null && key === this.lastKey) return;
      core.begin(this.pw, this.ph);
      for (const e of this.effects) {
        e.render(core, this, local, info);
        core.bindOutput();
      }
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.pw, this.ph);
      core.blit(this.ctx, this.pw, this.ph);
      this.lastKey = key;
      core.stats.frames++;
      core.stats.ms += performance.now() - t0;
    }
  };
  registry.layers.gl = GLLayer;
  function layer(target, o = {}) {
    const isScene = target && target.video && target.el;
    const v = isScene ? target.video : target;
    return v.addLayer("gl", null, isScene ? { ...o, scene: target } : { z: "front", zIndex: 30, ...o });
  }
  function draw(fn, o = {}) {
    return { draw: fn, static: !!o.static, key: o.key };
  }
  function text2(str, o = {}) {
    return {
      static: o.static !== false,
      draw(g) {
        const size2 = o.size || 120, font = o.font || '"Ma Shan Zheng","Noto Serif SC",serif';
        g.font = `${o.weight || 400} ${size2}px ${font}`;
        g.fillStyle = o.color || "#000";
        g.textBaseline = o.vertical ? "top" : o.baseline || "alphabetic";
        const chars = [...String(str)];
        if (o.vertical) {
          g.textAlign = "center";
          const step = size2 * (o.lead || 1.04);
          chars.forEach((ch, i) => {
            const jx = o.jitter ? Math.sin(i * 12.9898) * o.jitter : 0;
            g.fillText(ch, (o.x || 0) + jx, (o.y || 0) + i * step);
          });
        } else {
          g.textAlign = o.align || "left";
          if (o.tracking) {
            let x = o.x || 0;
            chars.forEach((ch) => {
              g.fillText(ch, x, o.y || 0);
              x += g.measureText(ch).width + o.tracking * size2;
            });
          } else g.fillText(String(str), o.x || 0, o.y || 0);
        }
      }
    };
  }
  function path(d, o = {}) {
    const ds = [].concat(d), P = ds.map((x) => new Path2D(x));
    return {
      static: o.static !== false,
      draw(g, local, info) {
        g.save();
        const T4 = o.transform;
        if (Array.isArray(T4)) g.transform(...T4);
        else if (T4) {
          g.translate(T4.x || 0, T4.y || 0);
          if (T4.rot) g.rotate(T4.rot * Math.PI / 180);
          if (T4.scale) g.scale(T4.scale, T4.scale);
        }
        const fs = o.gradient ? o.gradient(g) : o.fill || "#000";
        P.forEach((p, i) => {
          if (fs !== "none") {
            g.fillStyle = Array.isArray(fs) ? fs[i % fs.length] : fs;
            g.fill(p, o.rule || "nonzero");
          }
          if (o.stroke) {
            g.strokeStyle = o.stroke;
            g.lineWidth = o.width || 2;
            g.lineCap = "round";
            g.lineJoin = "round";
            g.stroke(p);
          }
        });
        g.restore();
      }
    };
  }
  function image(img, o = {}) {
    return { static: o.static !== false, draw(g) {
      g.drawImage(img, o.x || 0, o.y || 0, o.w || img.width, o.h || img.height);
    } };
  }
  function svg2(el2, o = {}) {
    return { static: !!o.static, el: el2, draw(g) {
      drawSVG(g, typeof el2 === "string" ? document.querySelector(el2) : el2, o);
    } };
  }
  var SKIP = /* @__PURE__ */ new Set(["defs", "clipPath", "mask", "filter", "linearGradient", "radialGradient", "pattern", "symbol", "marker", "style", "script", "title", "desc", "metadata", "foreignObject"]);
  function drawSVG(g, root, o = {}) {
    if (!root) return;
    const off = o.offset || [0, 0], base2 = g.getTransform(), ex = o.exclude ? typeof o.exclude === "string" ? o.exclude : [].concat(o.exclude) : null;
    const walk = (el2, op) => {
      const tag = el2.tagName;
      if (SKIP.has(tag)) return;
      if (ex && (typeof ex === "string" ? el2.matches(ex) : ex.includes(el2))) return;
      const cs = getComputedStyle(el2);
      if (cs.display === "none") return;
      const a = op * (el2 === root && o.ignoreRootOpacity ? 1 : +cs.opacity);
      if (a <= 2e-3) return;
      if (tag === "g" || tag === "svg" || tag === "a") {
        for (const c of el2.children) walk(c, a);
        return;
      }
      if (tag === "use") {
        const ref = document.getElementById((el2.getAttribute("href") || el2.getAttribute("xlink:href") || "").slice(1));
        if (ref) {
          const m2 = el2.getCTM();
          if (m2) {
            g.setTransform(base2);
            g.transform(1, 0, 0, 1, off[0], off[1]);
            g.transform(m2.a, m2.b, m2.c, m2.d, m2.e, m2.f);
            paint(g, ref, getComputedStyle(ref), a, true);
          }
        }
        return;
      }
      const m = el2.getCTM();
      if (!m) return;
      g.setTransform(base2);
      g.transform(1, 0, 0, 1, off[0], off[1]);
      g.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      paint(g, el2, cs, a, false);
    };
    walk(root, 1);
    g.setTransform(base2);
  }
  var num = (el2, k, d = 0) => {
    const v = el2.getAttribute(k);
    return v == null || v === "" ? d : parseFloat(v);
  };
  function shapePath2(el2) {
    const tag = el2.tagName, P = new Path2D();
    if (tag === "path") return new Path2D(el2.getAttribute("d") || "");
    if (tag === "rect") {
      const x = num(el2, "x"), y = num(el2, "y"), w = num(el2, "width"), h3 = num(el2, "height"), rx = num(el2, "rx", num(el2, "ry"));
      if (rx && P.roundRect) P.roundRect(x, y, w, h3, rx);
      else P.rect(x, y, w, h3);
      return P;
    }
    if (tag === "circle") {
      P.arc(num(el2, "cx"), num(el2, "cy"), Math.max(0, num(el2, "r")), 0, Math.PI * 2);
      return P;
    }
    if (tag === "ellipse") {
      P.ellipse(num(el2, "cx"), num(el2, "cy"), Math.max(0, num(el2, "rx")), Math.max(0, num(el2, "ry")), 0, 0, Math.PI * 2);
      return P;
    }
    if (tag === "line") {
      P.moveTo(num(el2, "x1"), num(el2, "y1"));
      P.lineTo(num(el2, "x2"), num(el2, "y2"));
      return P;
    }
    if (tag === "polyline" || tag === "polygon") {
      const v = (el2.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < v.length; i += 2) i ? P.lineTo(v[i], v[i + 1]) : P.moveTo(v[i], v[i + 1]);
      if (tag === "polygon") P.closePath();
      return P;
    }
    return null;
  }
  function paintOf(g, el2, v, alpha) {
    if (!v || v === "none") return null;
    const m = /url\(\s*["']?#([^"')]+)/.exec(v);
    if (!m) return v;
    const gr = document.getElementById(m[1]);
    if (!gr) return null;
    let stops = [...gr.querySelectorAll("stop")];
    const href = gr.getAttribute("href") || gr.getAttribute("xlink:href");
    if (!stops.length && href) {
      const r = document.getElementById(href.slice(1));
      if (r) stops = [...r.querySelectorAll("stop")];
    }
    if (!stops.length) return null;
    let bb;
    try {
      bb = el2.getBBox();
    } catch (e) {
      bb = { x: 0, y: 0, width: 1, height: 1 };
    }
    const user = gr.getAttribute("gradientUnits") === "userSpaceOnUse";
    const P = (k, d) => {
      const s2 = gr.getAttribute(k);
      if (s2 == null) return d;
      return s2.endsWith("%") ? parseFloat(s2) / 100 : parseFloat(s2);
    };
    const X2 = (u) => user ? u : bb.x + u * bb.width, Y = (u) => user ? u : bb.y + u * bb.height;
    let G2;
    if (gr.tagName === "radialGradient") {
      const cx = P("cx", 0.5), cy = P("cy", 0.5), r = P("r", 0.5);
      if (user) G2 = g.createRadialGradient(P("fx", cx), P("fy", cy), 0, cx, cy, r);
      else {
        G2 = g.createRadialGradient(P("fx", cx), P("fy", cy), 0, cx, cy, r);
        G2.bb = [bb.x, bb.y, Math.max(1e-6, bb.width), Math.max(1e-6, bb.height)];
      }
    } else G2 = g.createLinearGradient(X2(P("x1", 0)), Y(P("y1", 0)), X2(P("x2", 1)), Y(P("y2", 0)));
    for (const s2 of stops) {
      const cs = getComputedStyle(s2), off = s2.getAttribute("offset") || "0", o = Math.min(1, Math.max(0, off.endsWith("%") ? parseFloat(off) / 100 : parseFloat(off)));
      const c = rgb(cs.stopColor || s2.getAttribute("stop-color") || "#000"), so = +(cs.stopOpacity || 1);
      G2.addColorStop(o, `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${so})`);
    }
    return G2;
  }
  function paint(g, el2, cs, a, isUse) {
    const tag = el2.tagName;
    if (tag === "image") {
      try {
        g.globalAlpha = a;
        g.drawImage(el2, num(el2, "x"), num(el2, "y"), num(el2, "width"), num(el2, "height"));
      } catch (e) {
      }
      g.globalAlpha = 1;
      return;
    }
    if (tag === "text") {
      const fs = paintOf(g, el2, cs.fill, a);
      if (!fs) return;
      g.globalAlpha = a * +cs.fillOpacity;
      g.fillStyle = fs;
      g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      g.textAlign = { middle: "center", end: "right" }[cs.textAnchor] || "left";
      g.fillText(el2.textContent, num(el2, "x"), num(el2, "y"));
      g.globalAlpha = 1;
      return;
    }
    if (tag === "g" && isUse) {
      for (const c of el2.children) {
        const m = c.transform && c.transform.baseVal.consolidate();
        g.save();
        if (m) {
          const k = m.matrix;
          g.transform(k.a, k.b, k.c, k.d, k.e, k.f);
        }
        paint(g, c, getComputedStyle(c), a * +getComputedStyle(c).opacity, true);
        g.restore();
      }
      return;
    }
    const P = shapePath2(el2);
    if (!P) return;
    const fill = paintOf(g, el2, cs.fill, a), stroke = paintOf(g, el2, cs.stroke, a);
    const rule = cs.fillRule === "evenodd" ? "evenodd" : "nonzero";
    if (fill) {
      g.globalAlpha = a * +cs.fillOpacity;
      g.fillStyle = fill;
      if (fill.bb) {
        const [x, y, w, h3] = fill.bb, Q2 = new Path2D();
        Q2.addPath(P, new DOMMatrix([1 / w, 0, 0, 1 / h3, -x / w, -y / h3]));
        g.save();
        g.transform(w, 0, 0, h3, x, y);
        g.fill(Q2, rule);
        g.restore();
      } else g.fill(P, rule);
    }
    const sw = parseFloat(cs.strokeWidth);
    if (stroke && sw > 0) {
      g.globalAlpha = a * +cs.strokeOpacity;
      g.strokeStyle = stroke.bb ? "rgba(0,0,0,0)" : stroke;
      g.lineWidth = sw;
      g.lineCap = cs.strokeLinecap || "butt";
      g.lineJoin = cs.strokeLinejoin || "miter";
      const da = cs.strokeDasharray && cs.strokeDasharray !== "none" ? cs.strokeDasharray.split(/[\s,]+/).map(parseFloat).filter((x) => x >= 0) : null;
      if (da && da.length && da.some((x) => x > 0)) {
        g.setLineDash(da.length % 2 ? da.concat(da) : da);
        g.lineDashOffset = parseFloat(cs.strokeDashoffset) || 0;
      }
      g.stroke(P);
      g.setLineDash([]);
    }
    g.globalAlpha = 1;
  }
  function maskState(src2, levels) {
    const st = { src: src2, canvas: null, tex: null, pyr: [], drawnReady: null, levels };
    st.update = (core, L, local, info) => {
      if (src2.static && st.drawnReady === true) return;
      if (src2.static && st.drawnReady === false && !core.ready) return;
      if (!st.canvas) {
        st.canvas = L.canvas();
        st.tex = core.texture(L.pw, L.ph);
      }
      const g = L.sceneCtx(st.canvas);
      src2.draw(g, local, info, L);
      core.upload(st.tex, st.canvas);
      st.tex.w = L.pw;
      st.tex.h = L.ph;
      core.pyramid(st.tex, st.levels, st.pyr);
      st.drawnReady = core.ready;
    };
    st.level = (i) => i <= 0 ? st.tex : st.pyr[Math.min(i, st.levels)].a;
    st.size = (i) => {
      const t = st.level(i);
      return [t.w, t.h];
    };
    return st;
  }
  var srcKey = (src2, local) => src2.static ? "S" : src2.key ? src2.key(local) : null;
  function paper(o = {}) {
    return {
      name: "paper",
      key: () => "paper",
      render(core, L) {
        core.pass(PAPER, { ...L.common(o.seed || 0), uBase: rgb(o.color || "#e4e5d8"), uAmt: o.amount != null ? o.amount : 1, uFib: o.fibres != null ? o.fibres : 1, uVig: o.vignette != null ? o.vignette : 0.22, uSpeck: o.specks != null ? o.specks : 1, uMode: o.mode === "overlay" ? 1 : 0 }, null, { blend: "none" });
      }
    };
  }
  function inkBleed(o = {}) {
    let st, lv;
    const dirs = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] };
    const wipe = o.wipe ? { dir: Array.isArray(o.wipe.dir) ? o.wipe.dir : dirs[o.wipe.dir || "down"], dur: o.wipe.dur != null ? o.wipe.dur : 1 } : null;
    const curve = (local) => bleedCurve(local - (wipe ? wipe.dur : 0), o);
    return {
      name: "inkBleed",
      o,
      init(core, L) {
        const sig = haloSigma(o.spread != null ? o.spread : 14, o.haloEnd != null ? o.haloEnd : 0.12) * L.res;
        const l = levelFor(sig, 7);
        lv = { a: Math.floor(l), b: Math.min(7, Math.floor(l) + 1), mix: l - Math.floor(l) };
        st = maskState(o.src, Math.max(3, lv.b));
      },
      key(local, info, L) {
        const sk = srcKey(o.src, local);
        if (sk == null) return null;
        const x = local - (o.at || 0);
        if (x < 0) return "off";
        if (o.fade && local >= o.fade[1]) return "gone";
        const c = curve(local), fading = o.fade && local >= o.fade[0];
        if (c.done && !fading) return "done" + sk;
        return f4(local) + sk;
      },
      render(core, L, local, info) {
        const x = local - (o.at || 0);
        if (x < 0 || o.fade && local >= o.fade[1]) return;
        st.update(core, L, local, info);
        const fade = o.fade ? 1 - Math.min(1, Math.max(0, (local - o.fade[0]) / (o.fade[1] - o.fade[0]))) : 1;
        const A = st.level(lv.a), B4 = st.level(lv.b);
        core.pass(BLEED, {
          ...L.common(o.paperSeed || 0),
          uM0: st.level(0),
          uM1: st.level(1),
          uM3: st.level(3),
          uM3Size: st.size(3),
          uHa: A,
          uHb: B4,
          uHaSize: [A.w, A.h],
          uHbSize: [B4.w, B4.h],
          uHmix: lv.mix,
          uX: x,
          uDraw: o.draw != null ? o.draw : 0.8,
          uDur: o.dur != null ? o.dur : 2.5,
          uHaloEnd: o.haloEnd != null ? o.haloEnd : 0.12,
          uFade: fade * fade * (3 - 2 * fade),
          uSoft: o.soft || 0,
          uWipe: wipe ? [wipe.dir[0], wipe.dir[1], wipe.dur] : [0, 0, 0],
          uColor: rgb(o.color || "#1f2529"),
          uDensity: o.density != null ? o.density : 0.95,
          uHaloDensity: o.halo != null ? o.halo : 0.3,
          uRim: o.rim != null ? o.rim : 0.22,
          uHWarp: (o.warp != null ? o.warp : 0.5) * (o.spread != null ? o.spread : 14) * L.res,
          uFibre: o.fibre != null ? o.fibre : 0.8,
          uPool: o.pool != null ? o.pool : 0.5,
          uFeather: o.feather != null ? o.feather : 1,
          uMottle: o.mottle != null ? o.mottle : 0.35,
          uGrain: o.grain != null ? o.grain : 0.35,
          uSeedF: (o.seed || 0) * 7.13
        });
      }
    };
  }
  function inkWash(o = {}) {
    let st;
    return {
      name: "inkWash",
      o,
      init(core, L) {
        st = maskState(o.src, 4);
        const h3 = o.hide !== void 0 ? o.hide : o.src && o.src.el;
        if (h3) [].concat(typeof h3 === "string" ? [...document.querySelectorAll(h3)] : h3).forEach((e) => {
          if (e && e.style) e.style.visibility = "hidden";
        });
      },
      key(local) {
        const sk = srcKey(o.src, local);
        if (sk == null) return null;
        return (o.boil === 0 ? "still" : boilFrame(local, o.boil || 12, o.frames || 0)) + sk;
      },
      render(core, L, local, info) {
        st.update(core, L, local, info);
        const L4 = st.level(4);
        core.pass(WASH, {
          ...L.common(o.paperSeed || 0),
          uS: st.level(0),
          uL2: st.level(2),
          uL3: st.level(3),
          uL4: L4,
          uL4Size: [L4.w, L4.h],
          uTide: o.tide != null ? o.tide : 0.5,
          uBoil: o.boil === 0 ? 0 : boilFrame(local, o.boil || 12, o.frames || 0),
          uWob: o.wobble != null ? o.wobble : 1.6,
          uWobF: o.wobbleScale || 26,
          uDark: o.dark != null ? o.dark : 0.6,
          uEdge: o.edge || 2.5,
          uBleed: o.bleed != null ? o.bleed : 0.6,
          uGrain: o.grain != null ? o.grain : 0.45,
          uMottle: o.mottle != null ? o.mottle : 0.5,
          uAlpha: o.alpha != null ? o.alpha : 1,
          uSeedF: (o.seed || 0) * 5.1,
          uInk: 1,
          uInkC: rgb(o.ink || "#1f2529")
        });
      }
    };
  }
  function particles2(o = {}) {
    const sys = o.system || particles(o), so = sys.o;
    const shape = SHAPES[o.shape || so.shape || "dot"] ?? 5;
    const cols = (o.colors || so.colors || [o.color || so.color || "#1f2529"]).map(rgb), c22 = rgb(o.color2 || so.color2 || "#ffffff");
    let buf = null, data = new Float32Array(0);
    return {
      name: "particles",
      system: sys,
      // nothing alive → 'empty'; only fully soaked splats left → their id set (pixels identical until one changes)
      key(local) {
        const P = sys.at(local);
        if (!P.length) return "empty";
        if (P.every((p) => p.settled)) return "S" + P.map((p) => p.id).join(",");
        return null;
      },
      render(core, L, local) {
        const P = sys.at(local);
        if (!P.length) return;
        const gl2 = core.gl, prog = core.program(PFRAG, PVERT);
        if (data.length < P.length * 12) data = new Float32Array(P.length * 12);
        P.forEach((p, i) => {
          const c = cols[Math.floor(p.u * cols.length) % cols.length], k = i * 12;
          data[k] = p.x;
          data[k + 1] = p.y;
          data[k + 2] = p.size;
          data[k + 3] = p.alpha;
          data[k + 4] = p.rot;
          data[k + 5] = p.landed && shape === 0 ? 1 : shape;
          data[k + 6] = p.u;
          data[k + 7] = p.landed ? p.land.age : 0;
          data[k + 8] = c[0];
          data[k + 9] = c[1];
          data[k + 10] = c[2];
          data[k + 11] = 1;
        });
        if (!buf) buf = gl2.createBuffer();
        gl2.useProgram(prog.pr);
        core.bindOutput();
        core.blend(o.blend || so.blend || "normal");
        gl2.bindBuffer(gl2.ARRAY_BUFFER, buf);
        gl2.bufferData(gl2.ARRAY_BUFFER, data.subarray(0, P.length * 12), gl2.DYNAMIC_DRAW);
        ["a0", "a1", "a2"].forEach((n, j) => {
          const l = prog.attr[n] != null ? prog.attr[n] : prog.attr[n] = gl2.getAttribLocation(prog.pr, n);
          if (l < 0) return;
          gl2.enableVertexAttribArray(l);
          gl2.vertexAttribPointer(l, 4, gl2.FLOAT, false, 48, j * 16);
        });
        const r = L.rect;
        core.uniforms(prog, { uRes: [L.pw, L.ph], uNX: [r[0], r[1], 1 / L.res, 1 / L.res], uMaxPt: core.maxPoint, uC2: c22, uSoak: o.soak != null ? o.soak : 1 });
        gl2.drawArrays(gl2.POINTS, 0, P.length);
        core.stats.passes++;
        ["a0", "a1", "a2"].forEach((n) => {
          const l = prog.attr[n];
          if (l >= 0) gl2.disableVertexAttribArray(l);
        });
      }
    };
  }
  function mist(o = {}) {
    return {
      name: "mist",
      key: o.speed === 0 ? () => "mist" : null,
      render(core, L, local) {
        core.pass(MIST, { ...L.common(0), uTime: local, uY: o.y != null ? o.y : 400, uH: o.height || 60, uSpeed: o.speed != null ? o.speed : 12, uDensity: o.density != null ? o.density : 0.85, uScale: o.scale || 90, uSeedF: (o.seed || 0) * 3.7, uColor: rgb(o.color || "#e8e9dd") });
      }
    };
  }
  function shader(o = {}) {
    const frag = CUSTOM_HEAD + o.frag;
    return {
      name: "shader",
      key: o.key || null,
      render(core, L, local, info) {
        core.pass(frag, { ...L.common(o.seed || 0), uTime: local, uStep: stepT(local, o.step || 12), uProgress: info && info.p || 0, ...o.uniforms ? o.uniforms(local, info) : {} }, null, { blend: o.blend });
      }
    };
  }
  var boilN = 0;
  function boil2(sc, targets, o = {}) {
    const id = o.id || "vk-boil-" + ++boilN, v = sc.video || sc;
    const w = document.createElement("div");
    w.innerHTML = `<svg width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><filter id="${id}" data-vk-dynamic x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${o.freq || 0.035}" numOctaves="${o.octaves || 2}" seed="${o.seed || 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${(o.amp != null ? o.amp : 2.2) * 2}" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`;
    const s2 = w.firstElementChild;
    (sc.el || v.stage).appendChild(s2);
    const tur = s2.querySelector("feTurbulence"), base2 = o.seed || 3;
    const els = typeof targets === "string" ? [...(sc.el || v.stage).querySelectorAll(targets)] : [].concat(targets || []);
    els.forEach((e) => {
      if (e instanceof SVGElement) e.setAttribute("filter", `url(#${id})`);
      else e.style.filter = `url(#${id})`;
    });
    let last = null;
    const upd = (t) => {
      const f = boilFrame(t, o.fps || 12, o.frames || 0), sd = String(base2 + f * 7);
      if (sd !== last) {
        last = sd;
        tur.setAttribute("seed", sd);
      }
    };
    if (sc.on) sc.on((l) => upd(l));
    else v.onRender(upd);
    return { id, filter: s2.querySelector("filter") };
  }
  function paperCut(v, o = {}) {
    const p = o.prefix || "pc", s2 = o.seed || 5, r = o.rough != null ? o.rough : 1.2, gr = o.grain != null ? o.grain : 0.5, sh = o.shadow || [3, 5, 3, 0.35];
    const id = "vk-pc-defs-" + p;
    if (document.getElementById(id)) return p;
    const cut = `<feTurbulence type="turbulence" baseFrequency=".9" numOctaves="1" seed="${s2}" result="cn"/><feDisplacementMap in="SourceGraphic" in2="cn" scale="${r * 2}" xChannelSelector="R" yChannelSelector="G" result="cut"/>`;
    const grain = (inp) => `<feTurbulence type="fractalNoise" baseFrequency=".05 .7" numOctaves="3" seed="${s2 + 3}" result="fn"/><feColorMatrix in="fn" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${-gr * 1.4} ${gr * 0.75}" result="fm"/><feComposite in="fm" in2="${inp}" operator="in" result="fk"/><feComposite in="${inp}" in2="fk" operator="arithmetic" k1="0" k2="1" k3="-.35" k4="0" result="gr"/>`;
    const shadow = (inp) => `<feGaussianBlur in="${inp}" stdDeviation="${sh[2]}" result="sb"/><feOffset in="sb" dx="${sh[0]}" dy="${sh[1]}" result="so"/><feColorMatrix in="so" type="matrix" values="0 0 0 0 .12  0 0 0 0 .08  0 0 0 0 .06  0 0 0 ${sh[3]} 0" result="sc"/>`;
    const w = document.createElement("div");
    w.innerHTML = `<svg id="${id}" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>
<filter id="${p}-cut" x="-3%" y="-3%" width="106%" height="106%">${cut}</filter>
<filter id="${p}-grain">${grain("SourceGraphic")}</filter>
<filter id="${p}-shadow" x="-10%" y="-10%" width="125%" height="130%">${shadow("SourceAlpha")}<feMerge><feMergeNode in="sc"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="${p}" x="-10%" y="-10%" width="125%" height="130%">${cut}${grain("cut")}${shadow("cut")}<feMerge><feMergeNode in="sc"/><feMergeNode in="gr"/></feMerge></filter>
</defs></svg>`;
    (v.stage || document.body).appendChild(w.firstElementChild);
    return p;
  }
  var gl = {
    layer,
    paper,
    inkBleed,
    inkWash,
    particles: particles2,
    mist,
    shader,
    text: text2,
    path,
    svg: svg2,
    image,
    draw,
    boil: boil2,
    paperCut,
    jitter: jitterPath,
    jitterPoints,
    stepT,
    boilFrame,
    bleedCurve,
    presets: PRESETS,
    system: particles,
    core: getCore,
    COPY
  };

  // src/index.js
  var import_meta = {};
  var version = "0.2.0";
  var current = null;
  var env = { base: (() => {
    try {
      return new URL("../", import_meta.url).href;
    } catch (e) {
      return "";
    }
  })() };
  var vk = {
    version,
    // ---- authoring ----
    video(cfg) {
      current = new Video(cfg, env);
      return current;
    },
    get current() {
      return current;
    },
    scene(...a) {
      if (!current) throw new Error("[vk] call vk.video({...}) first");
      return current.scene(...a);
    },
    ...api_exports,
    node,
    md,
    // JSON data: '#script-id' (inline <script type="application/json">) or same-origin URL (sync load at build time)
    json(src2) {
      if (src2.startsWith("#")) return JSON.parse(document.querySelector(src2).textContent);
      const x = new XMLHttpRequest();
      x.open("GET", src2, false);
      x.send();
      if (x.status >= 400) throw new Error("[vk] json " + src2 + " " + x.status);
      return JSON.parse(x.responseText);
    },
    // ---- plugins ----
    use(plugin, opts) {
      use(vk, plugin, opts);
      return vk;
    },
    register,
    registry,
    list,
    get fx() {
      return registry.fx;
    },
    get transitions() {
      return registry.transitions;
    },
    get textures() {
      return registry.textures;
    },
    get backgrounds() {
      return registry.backgrounds;
    },
    get themes() {
      return registry.themes;
    },
    get formats() {
      return registry.formats;
    },
    get sounds() {
      return registry.sounds;
    },
    resolveFormat,
    resolveTheme,
    // ---- core utilities (pure) ----
    ease: EASE,
    getEase,
    bezier,
    spring,
    steps,
    setDefaultEase,
    hash,
    hash2,
    rand: mulberry32,
    mulberry32,
    noise1,
    noise2,
    boil,
    hrange,
    hpick,
    clamp,
    clamp01,
    lerp,
    frac,
    seg,
    progress,
    kf,
    window01,
    stagger,
    lerpStr,
    compatible,
    smooth01,
    bump,
    plat,
    hold,
    inRanges,
    kfSpline,
    BeatGrid,
    parseTime,
    shapePath,
    shapePoints,
    shapePolygon,
    resample,
    splitText: split2,
    // beat helpers bound to the current video's grid
    beat: (n) => current.beats.at(n),
    pulse: (t, k, every) => current.beats.pulse(t, k, every),
    hit: (t, t0, k) => current.beats.hit(t, t0, k),
    snap: (t, t1, d) => current.beats.snap(t, t1, d),
    // Phase 2 rhythm helpers (absolute video time). Bars are "measures" so they never clash with the vk.bar() chart.
    measure: (n) => current.beats.measure(n),
    beatIndex: (t) => current.beats.index(t),
    measureIndex: (t) => current.beats.barIndex(t),
    beatInBar: (t) => current.beats.beatInBar(t),
    barPulse: (t, k, every) => current.beats.barPulse(t, k, every),
    onBeat: (t, o = {}) => o.unit === "bar" ? current.beats.barPulse(t, o.k || 4, o.every || 1) : o.unit === "onset" ? vk.onsetHit(t, o.k, o.min) : current.beats.pulse(t, o.k || 6, o.every || 1),
    onsetHit: (t, k, min) => current.music ? current.music.onsetHit(t, k, min) : 0,
    energy: (t, band, smooth) => current.music ? current.music.energy(t, band, smooth) : 0,
    section: (t) => current.music ? current.music.section(t) : null,
    get sections() {
      return current && current.music ? current.music.sections : [];
    },
    get music() {
      return current && current.music;
    },
    get lyricLines() {
      return current ? current.lyrics : [];
    },
    quantize: (t, sub2) => current.beats.quantize(t, sub2),
    lyricVideo: (o) => lyricVideo(vk, o),
    // static layer cache: vk.bake(svgOrGroup, {scale}) → rasterised once (see runtime/bake.js)
    bake: (el2, o) => current.bake(el2, o),
    bakeStats,
    collectRefs,
    filterRegion,
    inkDefs,
    brushPath,
    sampleLine,
    attr,
    INK,
    installInk: (o) => installInk(current, o),
    // skeletal rigs (fx/rig.js): vk.rig(def) → rig; helpers on vk.rig.*
    rig: Object.assign((def) => createRig(def), { create: createRig, solve2BoneIK, blink, blend: blendPose, valueAt, mat, rootMatrix }),
    // WebGL effects (fx/gl): vk.gl.layer / paper / inkBleed / inkWash / particles / shader / boil / paperCut …; vk.particles = pure particle system
    gl: Object.assign({}, gl, { stats: () => current && gl.core(current).stats }),
    particles: Object.assign((o) => particles(o), { presets: gl.presets }),
    MusicInfo,
    alignToCues,
    chunkCues,
    mapWords,
    estimateSpeech,
    voSegments,
    voKey,
    planVoice,
    speakingAt,
    synth: synth_exports,
    Video,
    Scene,
    _setEnv(e) {
      Object.assign(env, e);
    }
  };
  Object.entries(registry.blocks).forEach(([n, f]) => {
    if (!(n in vk)) vk[n] = f;
  });
  var index_default = vk;

  // src/browser.js
  var src = document.currentScript && document.currentScript.src || "";
  var base = src ? new URL("../", src).href : "";
  index_default._setEnv({ base });
  window.vk = index_default;
})();
