/*! vidkit 0.2.0 — deterministic HTML/JS → video. MIT. Bundled fonts: SIL OFL 1.1 (see fonts/LICENSES.md) */
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/core/names.js
  function lev(a, b) {
    a = String(a);
    b = String(b);
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      [prev, cur] = [cur, prev];
    }
    return prev[n];
  }
  function suggest(name, valid, k = 3) {
    const s2 = String(name).toLowerCase(), max = Math.max(2, Math.ceil(s2.length / 3));
    return [...new Set(valid)].map((v) => {
      const w = String(v).toLowerCase();
      return { v, d: lev(s2, w) - (w.startsWith(s2) || s2.startsWith(w) ? 1 : 0) };
    }).filter((x) => x.d <= max).sort((a, b) => a.d - b.d || String(a.v).length - String(b.v).length).slice(0, k).map((x) => x.v);
  }

  // src/core/strict.js
  var G = typeof globalThis !== "undefined" ? globalThis : {};
  var STRICT = G.__vkStrictState || (G.__vkStrictState = { on: false, frame: 0, t: null, warnedRandom: false });
  var SRC = G.__vkSrcState || (G.__vkSrcState = { err: null });
  function setStrict(on) {
    STRICT.on = !!on;
    return STRICT.on;
  }
  function userFrame(stack2) {
    if (stack2 == null && SRC.err) {
      const f = userFrame(SRC.err.stack || "");
      if (f) return f;
    }
    if (stack2 == null) {
      const L = Error.stackTraceLimit;
      Error.stackTraceLimit = 60;
      stack2 = new Error().stack;
      Error.stackTraceLimit = L;
    }
    for (const line of String(stack2 || "").split("\n").slice(1)) {
      const m = /\(?((?:https?|file):\/\/[^\s()]+?):(\d+):(\d+)\)?\s*$/.exec(line);
      if (!m) continue;
      const url = m[1];
      if (/\/dist\/vidkit[^/]*\.js$|\/src\/(core|fx|authoring|styles|runtime|audio|three|layers|meta)\/|\/vendor\//.test(url)) continue;
      let f = url;
      try {
        f = decodeURIComponent(new URL(url).pathname).split("/").pop();
      } catch (e) {
      }
      return `${f}:${m[2]}:${m[3]}`;
    }
    return null;
  }
  var LABEL = { fx: "fx", transitions: "transition", textures: "texture", backgrounds: "background", eases: "ease", themes: "theme", materials: "material", styles: "style", formats: "format", sounds: "sound", blocks: "block", threeMaterials: "vk.three material", products: "vk.three product", grades: "vk.three grade", envs: "vk.three env", targets: "particle target" };
  function unknownMessage(kind, name, valid, where) {
    const s2 = suggest(name, valid), at = where || userFrame();
    return `[vk] unknown ${LABEL[kind] || kind} "${name}"${s2.length ? ` \u2014 did you mean ${s2.map((x) => `"${x}"`).join(" or ")}?` : ""}${at ? ` (at ${at})` : ""}
  valid ${LABEL[kind] || kind} names: ${[...new Set(valid)].join(", ")}`;
  }
  var warned = G.__vkWarned || (G.__vkWarned = /* @__PURE__ */ new Set());
  function unknownName(kind, name, valid, { fatal = false, where } = {}) {
    const msg = unknownMessage(kind, name, valid, where);
    if (STRICT.on || fatal) {
      const e = new Error(msg);
      e.vkStrict = true;
      e.kind = kind;
      e.vkName = name;
      throw e;
    }
    const key = kind + ":" + name;
    if (!warned.has(key)) {
      warned.add(key);
      if (typeof console !== "undefined") console.warn(msg.split("\n")[0] + " \u2014 falling back (use vk.video({strict:true}) to make this an error)");
    }
    return null;
  }
  function guardedRandom(r) {
    return function random() {
      if (STRICT.frame > 0 && (STRICT.on || !STRICT.warnedRandom)) {
        const L = Error.stackTraceLimit;
        Error.stackTraceLimit = 60;
        const st = new Error().stack || "";
        Error.stackTraceLimit = L;
        if (!/vidkit-three\.js|three\.module\.js|three\.core\.js|\/src\/three\//.test(st.split("\n").slice(2, 4).join("\n"))) {
          const at = userFrame(st), msg = `[vk] Math.random() called while rendering t=${STRICT.t != null ? STRICT.t.toFixed(3) : "?"}${at ? ` (at ${at})` : ""}: its value depends on which frames were rendered before (parallel workers render out of order). Use vk.hash(i + frame) / vk.noise1(t), or a vk.rand(seed) created and consumed in setup`;
          if (STRICT.on) {
            const e = new Error(msg);
            e.vkStrict = true;
            throw e;
          }
          if (!STRICT.warnedRandom) {
            STRICT.warnedRandom = true;
            console.warn(msg);
          }
        }
      }
      return r();
    };
  }

  // src/core/ease.js
  function bezier(x1, y1, x2, y2) {
    const A = (a, b) => 1 - 3 * b + 3 * a, B4 = (a, b) => 3 * b - 6 * a, C2 = (a) => 3 * a;
    const calc = (t, a, b) => ((A(a, b) * t + B4(a, b)) * t + C2(a)) * t;
    const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B4(a, b) * t + C2(a);
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
    unknownName("eases", e, Object.keys(EASE).filter((n) => !/[(]/.test(n)).concat(["cubic-bezier(x1,y1,x2,y2)", "spring(k,w)", "steps(n)"]));
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
  var progress = (t, t0, d, ease2) => getEase(ease2 || "linear")(clamp01((t - t0) / d));
  var window01 = (t, a, b, din = 0.3, dout = 0.3) => Math.min(seg(t, a, a + din), 1 - seg(t, b - dout, b));
  function kf(t, keys, ease2) {
    if (!keys.length) return 0;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t < keys[i][0]) {
        const a = keys[i - 1], b = keys[i], e = getEase(b[2] || ease2 || "inOutCubic"), p = e((t - a[0]) / (b[0] - a[0]));
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
      const T6 = this.times, i = Math.floor(n), f = n - i;
      if (i < 0) return T6[0] + n * this.beat;
      if (i >= T6.length - 1) return T6[T6.length - 1] + (n - (T6.length - 1)) * this.beat;
      return T6[i] + (T6[i + 1] - T6[i]) * f;
    }
    // fractional beat index at time t (binary search for explicit beats)
    index(t) {
      if (!this.times) return (t - this.offset) / this.beat;
      const T6 = this.times;
      if (t < T6[0]) return (t - T6[0]) / this.beat;
      if (t >= T6[T6.length - 1]) return T6.length - 1 + (t - T6[T6.length - 1]) / this.beat;
      let lo = 0, hi = T6.length - 1;
      while (hi - lo > 1) {
        const m = lo + hi >> 1;
        if (T6[m] <= t) lo = m;
        else hi = m;
      }
      return lo + (t - T6[lo]) / (T6[lo + 1] - T6[lo]);
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
  function parseTime(v, grid2, base3 = 0) {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v;
    v = String(v).trim();
    if (v.startsWith("b:")) return grid2.at(+v.slice(2)) - grid2.leadT - base3;
    if (v.startsWith("m:")) return grid2.measure(+v.slice(2)) - grid2.leadT - base3;
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
    const r = parseInt(h3.slice(0, 2), 16), g2 = parseInt(h3.slice(2, 4), 16), b = parseInt(h3.slice(4, 6), 16), a = h3.length === 8 ? parseInt(h3.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r},${g2},${b},${+a.toFixed(3)})`;
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
    plugins: [],
    meta: {}
    // kind → name → schema {description, params, example} (src/meta); vk.list(kind, {detail:true})
  };
  var KINDS = ["fx", "transitions", "textures", "backgrounds", "blocks", "themes", "formats", "sounds", "layers"];
  function register(kind, name, impl, meta) {
    if (!registry[kind] || kind === "meta" || kind === "hooks" || kind === "plugins") throw new Error("[vk] unknown registry kind " + kind + " (have: " + KINDS.join(", ") + ")");
    registry[kind][name] = impl;
    if (meta) (registry.meta[kind] || (registry.meta[kind] = {}))[name] = meta;
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
    if (plugin.meta) Object.entries(plugin.meta).forEach(([k, m]) => Object.entries(m || {}).forEach(([n, x]) => {
      (registry.meta[k] || (registry.meta[k] = {}))[n] = x;
    }));
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
  var lazy = { fx: {}, transitions: {}, backgrounds: {}, textures: {}, sounds: {} };
  function lazyRegister(kind, names2, install) {
    [].concat(names2).forEach((n) => {
      lazy[kind][n] = install;
    });
  }
  function ensureLazy(kind, name) {
    if (!name || registry[kind][name] || !lazy[kind] || !lazy[kind][name]) return !!(name && registry[kind] && registry[kind][name]);
    lazy[kind][name]();
    return !!registry[kind][name];
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
        const d = o.d == null ? 0.6 : o.d, ease2 = getEase(o.ease || defaultEase());
        const from = o.from || {}, to = o.to || {}, keys = /* @__PURE__ */ new Set([...Object.keys(from), ...Object.keys(to)]);
        const S2 = this.state(el2);
        S2.owner = owner || null;
        if (o.origin) S2.origin = o.origin;
        keys.forEach((k0) => {
          const k = camel(k0);
          let fv = from[k0], tv = to[k0];
          if (fv === void 0) fv = defaultVal(el2, k);
          if (tv === void 0) tv = defaultVal(el2, k);
          const tr = { t0, d: Math.max(d, 1e-4), ease: ease2, a: toStr(k, fv), b: toStr(k, tv) };
          if (!S2.props[k]) {
            S2.props[k] = [];
            S2.order.push(k);
          }
          S2.props[k].push(tr);
          S2.props[k].sort((x, y) => x.t0 - y.t0);
        });
      });
    }
    fn(el2, f, owner) {
      const S2 = this.state(el2);
      S2.owner = owner || null;
      S2.fns.push(f);
    }
    apply(el2, S2, local) {
      let tf = null;
      const vals = {};
      for (const k of S2.order) {
        const list2 = S2.props[k];
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
        if (S2.origin) el2.style.transformOrigin = S2.origin;
      }
      for (const f of S2.fns) f(local);
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
  function normKeys(keys, W, H, o = {}) {
    const hold2 = o.hold === true;
    const raw = keys.map((k, i) => ({ k, i, t: +k.t || 0 })).sort((a, b) => a.t - b.t || a.i - b.i);
    let prev = { x: W / 2, y: H / 2, s: 1, r: 0 };
    return raw.map(({ k, t }) => {
      const d = hold2 ? prev : { x: W / 2, y: H / 2, s: 1, r: 0 };
      const s2 = k.s != null ? +k.s : k.zoom != null ? +k.zoom : d.s;
      const r = k.r != null ? +k.r : k.rotate != null ? +k.rotate : hold2 ? d.r : 0;
      const out = { t, x: k.x == null ? d.x : +k.x, y: k.y == null ? d.y : +k.y, s: s2, r, ease: getEase(k.ease || "inOutCubic") };
      prev = out;
      return out;
    });
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
    const k = c.fn ? c.fn(lt) : c.keys ? camAt(c.keys, lt) : { x: W / 2, y: H / 2, s: 1, r: 0 };
    const push = c.push ? 1 + c.push * Math.min(1, lt / dur) : 1;
    const zs = k.s * push * (1 + (c.extraZoom ? c.extraZoom(lt) : 0));
    const sh = shakeAt(c.shakes || [], lt);
    return `translate(${W / 2 + sh.dx}px,${H / 2 + sh.dy}px) rotate(${(k.r || 0) + sh.dr}deg) scale(${zs}) translate(${-k.x}px,${-k.y}px)`;
  }
  var SHOTS = {
    "extreme-wide": { region: [0, 1], fill: 0.28, eye: null },
    wide: { region: [0, 1], fill: 0.5, eye: null },
    full: { region: [0, 1], fill: 0.82, eye: null },
    "medium-wide": { region: [0, 0.78], fill: 0.9, eye: 0.3 },
    // knees up (cowboy)
    medium: { region: [0, 0.55], fill: 0.9, eye: 0.3 },
    // waist up
    "medium-close": { region: [0, 0.38], fill: 0.92, eye: 0.34 },
    // chest up
    close: { region: "head", heads: 2.9, eye: 0.4 },
    // head + shoulders: head (2r) ≈ 1/2.9 of the frame
    "extreme-close": { region: "head", heads: 1.35, eye: 0.46, min: 2.2 }
    // face fills the frame
  };
  SHOTS.ws = SHOTS.wide;
  SHOTS.ms = SHOTS.medium;
  SHOTS.cu = SHOTS.close;
  SHOTS.ecu = SHOTS["extreme-close"];
  SHOTS.xcu = SHOTS["extreme-close"];
  SHOTS.mcu = SHOTS["medium-close"];
  function subjectHeight(sub2) {
    return Math.max(1, (sub2.feet ? sub2.feet[1] : sub2.head[1] + 7 * sub2.headR) - (sub2.head[1] - sub2.headR));
  }
  function frameShot(shot, sub2, o = {}) {
    const W = o.W || 1280, H = o.H || 720, P2 = typeof shot === "string" ? SHOTS[shot] : shot;
    if (!P2) throw new Error("[vk] unknown shot " + shot);
    const top = sub2.head[1] - sub2.headR, h3 = subjectHeight(sub2), r = sub2.headR;
    let s2, cy, cx;
    if (P2.region === "head") {
      const mc = SHOTS["medium-close"], sMC = mc.fill * H / Math.max(1, mc.region[1] * h3);
      s2 = o.s || Math.max(H / (P2.heads * 2 * r), sMC * (P2.min || 1.25));
      cy = sub2.head[1] + (0.5 - P2.eye) * H / s2;
    } else {
      const y0 = top + P2.region[0] * h3, y1 = top + P2.region[1] * h3;
      s2 = o.s || P2.fill * H / Math.max(1, y1 - y0);
      cy = P2.eye == null ? (y0 + y1) / 2 : sub2.head[1] + (0.5 - P2.eye) * H / s2;
    }
    const midX = sub2.feet && P2.region !== "head" && (P2.region[1] || 0) > 0.9 ? (sub2.head[0] + sub2.feet[0]) / 2 : sub2.head[0];
    cx = midX + (sub2.facing || 0) * (o.lookroom != null ? o.lookroom : 0.1) * W / s2;
    if (o.offset) {
      cx -= o.offset[0] / s2;
      cy -= o.offset[1] / s2;
    }
    return { x: cx, y: cy, s: s2, r: 0 };
  }
  function clampView(cam, o = {}) {
    const W = o.W || 1280, H = o.H || 720, b = o.bounds === false ? null : o.bounds || [0, 0, W, H];
    let { x, y, s: s2 } = cam;
    if (b) {
      s2 = Math.max(s2, W / (b[2] - b[0]), H / (b[3] - b[1]), o.minS || 0);
      const hw = W / 2 / s2, hh = H / 2 / s2;
      x = Math.min(Math.max(x, b[0] + hw), b[2] - hw);
      y = Math.min(Math.max(y, b[1] + hh), b[3] - hh);
    } else if (o.minS) s2 = Math.max(s2, o.minS);
    if (o.maxS) s2 = Math.min(s2, o.maxS);
    return { ...cam, x, y, s: s2 };
  }
  function keepInFrame(cam, boxes, o = {}) {
    const W = o.W || 1280, H = o.H || 720, m = o.margin != null ? o.margin : 0.06;
    if (!boxes || !boxes.length) return cam;
    let { x, y, s: s2 } = cam;
    const bx0 = Math.min(...boxes.map((b) => b[0])), by0 = Math.min(...boxes.map((b) => b[1])), bx1 = Math.max(...boxes.map((b) => b[2])), by1 = Math.max(...boxes.map((b) => b[3]));
    const sMax = Math.min(W * (1 - 2 * m) / Math.max(1, bx1 - bx0), H * (1 - 2 * m) / Math.max(1, by1 - by0));
    if (s2 > sMax) s2 = Math.max(o.minS || 0, sMax);
    const hw = W / 2 / s2, hh = H / 2 / s2, mx = W * m / s2, my = H * m / s2;
    if (bx0 < x - hw + mx) x = bx0 + hw - mx;
    if (bx1 > x + hw - mx) x = bx1 - hw + mx;
    if (by0 < y - hh + my) y = by0 + hh - my;
    if (by1 > y + hh - my) y = by1 - hh + my;
    return { ...cam, x, y, s: s2 };
  }
  function punchEnv(t, t0, o = {}) {
    const a = o.attack != null ? o.attack : 0.035, d = o.d != null ? o.d : 0.45, k = o.k != null ? o.k : 7;
    const u = t - t0;
    if (u <= 0 || u >= d) return 0;
    const rise = u < a ? Math.sin(Math.PI / 2 * u / a) : 1;
    return rise * Math.exp(-k * Math.max(0, u - a)) * (1 - Math.pow(u / d, 4));
  }
  function smoothFollow(f, t, lag = 0.25, n = 12) {
    if (!(lag > 0)) return f(t);
    const span = 4 * lag;
    let sw = 0, acc = null;
    for (let i = 0; i < n; i++) {
      const tau = span * i / (n - 1), w = Math.exp(-tau / lag), v = f(t - tau);
      if (acc == null) acc = Array.isArray(v) ? v.map(() => 0) : 0;
      if (Array.isArray(v)) v.forEach((x, j) => {
        acc[j] += x * w;
      });
      else acc += v * w;
      sw += w;
    }
    return Array.isArray(acc) ? acc.map((x) => x / sw) : acc / sw;
  }
  var lerpCam = (a, b, p) => {
    const ia = 1 / a.s, ib = 1 / b.s, i = ia + (ib - ia) * p;
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: 1 / i, r: (a.r || 0) + ((b.r || 0) - (a.r || 0)) * p };
  };
  var headBox = (sub2, pad = 1.25) => [sub2.head[0] - sub2.headR * pad, sub2.head[1] - sub2.headR * pad, sub2.head[0] + sub2.headR * pad, sub2.head[1] + sub2.headR * pad];
  function shotCamera(list2, o = {}) {
    const W = o.W || 1280, H = o.H || 720;
    const L = list2.map((e, i) => ({ ...e, i, t: +e.t || 0 })).sort((a, b) => a.t - b.t || a.i - b.i);
    const framing = L.filter((e) => !e.punch), punches = L.filter((e) => e.punch);
    const subAt = (e, lt) => {
      const s2 = e.on || o.subject;
      return typeof s2 === "function" ? s2(lt) : s2;
    };
    function want(idx, lt) {
      const e = framing[idx];
      if (!e) return { x: W / 2, y: H / 2, s: 1, r: 0 };
      if (e.cam) return { r: 0, ...e.cam };
      const prev = () => idx > 0 ? hold2(idx - 1, e.t) : { x: W / 2, y: H / 2, s: 1, r: 0 };
      if (e.pan) {
        const p = prev(), to = typeof e.pan === "function" ? e.pan(lt) : e.pan;
        return { ...p, x: to[0], y: to[1] };
      }
      if (e.dolly) {
        const p = prev();
        if (!e.at) return { ...p, s: e.dolly };
        const a = typeof e.at === "function" ? e.at(lt) : e.at, k = 1 - p.s / e.dolly;
        return { ...p, s: e.dolly, x: p.x + (a[0] - p.x) * k, y: p.y + (a[1] - p.y) * k };
      }
      const lag = e.follow === true ? o.lag != null ? o.lag : 0.22 : typeof e.follow === "number" ? e.follow : 0;
      const at = e.follow ? lt : e.t;
      const f = (u) => {
        const s2 = subAt(e, u);
        return s2 ? frameShot(e.shot || "medium", s2, { W, H, lookroom: e.lookroom, offset: e.offset, s: e.s }) : { x: W / 2, y: H / 2, s: e.s || 1, r: 0 };
      };
      if (!lag) return f(at);
      const c = f(at), sm5 = smoothFollow((u) => {
        const q = f(u);
        return [q.x, q.y];
      }, at, lag);
      return { ...c, x: sm5[0], y: sm5[1] };
    }
    function hold2(idx, lt, depth = 0) {
      const e = framing[idx], c = want(idx, lt);
      const d = e.d != null ? e.d : e.pan || e.dolly ? 1 : 0;
      if (idx === 0 || d <= 0 || lt >= e.t + d || depth > 3) return c;
      const p = getEase(e.ease || (e.pan || e.dolly ? "inOutSine" : "inOutCubic"))(Math.max(0, (lt - e.t) / d));
      return lerpCam(hold2(idx - 1, lt, depth + 1), c, p);
    }
    return function camera(lt) {
      let i = -1;
      for (let j = 0; j < framing.length; j++) if (lt >= framing[j].t) i = j;
      let c = hold2(Math.max(0, i), lt);
      for (const e of punches) {
        const env2 = punchEnv(lt, e.t, { d: e.d, k: e.k, attack: e.attack });
        if (!env2) continue;
        const amp = typeof e.punch === "number" ? e.punch : 0.12, s1 = c.s * (1 + amp * env2);
        let x = c.x, y = c.y;
        if (e.at) {
          const a = typeof e.at === "function" ? e.at(lt) : e.at, k = (e.pull != null ? e.pull : 0.35) * env2;
          x += (a[0] - x) * k;
          y += (a[1] - y) * k;
        }
        c = { ...c, x, y, s: s1 };
      }
      if (o.keep && o.keep.length) c = keepInFrame(c, o.keep.map((f) => headBox(typeof f === "function" ? f(lt) : f, o.headPad)), { W, H, margin: o.margin, minS: o.minS });
      return clampView(c, { W, H, bounds: o.bounds, minS: o.minS, maxS: o.maxS });
    };
  }

  // src/styles/geom.js
  var geom_exports = {};
  __export(geom_exports, {
    arc: () => arc,
    area: () => area,
    bbox: () => bbox,
    blob: () => blob,
    capsule: () => capsule,
    cloudScroll: () => cloudScroll,
    ellipse: () => ellipse,
    grass: () => grass,
    hills: () => hills,
    house: () => house,
    peaks: () => peaks,
    perimeter: () => perimeter,
    polyD: () => polyD,
    r1: () => r1,
    rect: () => rect,
    resample: () => resample,
    rnd: () => rnd,
    rotate: () => rotate,
    scale: () => scale,
    smoothD: () => smoothD,
    spiral: () => spiral,
    star: () => star,
    strokeOutline: () => strokeOutline,
    translate: () => translate,
    tree: () => tree,
    waves: () => waves,
    wobble: () => wobble
  });
  var TAU = Math.PI * 2;
  var r1 = (x) => Math.round(x * 10) / 10;
  var rnd = (seed, i) => hash(seed * 7.31 + i * 1.618 + 0.5);
  function ellipse(cx, cy, rx, ry = rx, rot = 0, n = 28) {
    const c = Math.cos(rot * Math.PI / 180), s2 = Math.sin(rot * Math.PI / 180), out = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push([cx + x * c - y * s2, cy + x * s2 + y * c]);
    }
    return out;
  }
  function capsule(x0, y0, r0, x1, y1, r1_, n = 10) {
    const a = Math.atan2(y1 - y0, x1 - x0), out = [];
    for (let i = 0; i <= n; i++) {
      const t = a + Math.PI / 2 + i / n * Math.PI;
      out.push([x0 + Math.cos(t) * r0, y0 + Math.sin(t) * r0]);
    }
    for (let i = 0; i <= n; i++) {
      const t = a - Math.PI / 2 + i / n * Math.PI;
      out.push([x1 + Math.cos(t) * r1_, y1 + Math.sin(t) * r1_]);
    }
    return out;
  }
  function blob(cx, cy, rx, ry = rx, seed = 1, k = 0.18, n = 30) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, r = 1 + k * (noise1(seed * 9.1 + Math.cos(a) * 1.3 + 4) - 0.5) * 2 + k * 0.5 * (noise1(seed * 3.3 + Math.sin(a) * 2.1) - 0.5);
      out.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return out;
  }
  var rect = (x, y, w, h3) => [[x, y], [x + w, y], [x + w, y + h3], [x, y + h3]];
  function star(cx, cy, r0, r1_, n = 5, rot = -90) {
    const out = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (rot + i * 180 / n) * Math.PI / 180, r = i % 2 ? r1_ : r0;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }
  var translate = (pts, dx, dy) => pts.map((p) => [p[0] + dx, p[1] + dy]);
  var scale = (pts, sx, sy = sx, cx = 0, cy = 0) => pts.map((p) => [cx + (p[0] - cx) * sx, cy + (p[1] - cy) * sy]);
  function rotate(pts, deg, cx = 0, cy = 0) {
    const c = Math.cos(deg * Math.PI / 180), s2 = Math.sin(deg * Math.PI / 180);
    return pts.map((p) => [cx + (p[0] - cx) * c - (p[1] - cy) * s2, cy + (p[0] - cx) * s2 + (p[1] - cy) * c]);
  }
  function bbox(pts) {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const p of pts) {
      a = Math.min(a, p[0]);
      b = Math.min(b, p[1]);
      c = Math.max(c, p[0]);
      d = Math.max(d, p[1]);
    }
    return [a, b, c, d];
  }
  function area(pts) {
    let s2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      s2 += p[0] * q[1] - q[0] * p[1];
    }
    return s2 / 2;
  }
  function perimeter(pts, closed = true) {
    let L = 0;
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      L += Math.hypot(q[0] - p[0], q[1] - p[1]);
    }
    return L;
  }
  function resample(pts, step = 6, closed = true) {
    const L = perimeter(pts, closed), n = Math.max(closed ? 6 : 2, Math.round(L / step)), out = [];
    const segs = [];
    let acc = 0;
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      segs.push([p, q, acc, l]);
      acc += l;
    }
    for (let k = 0; k < (closed ? n : n + 1); k++) {
      const d = L * k / n;
      let s2 = segs[segs.length - 1];
      for (const g2 of segs) if (d <= g2[2] + g2[3]) {
        s2 = g2;
        break;
      }
      const u = s2[3] ? (d - s2[2]) / s2[3] : 0;
      out.push([s2[0][0] + (s2[1][0] - s2[0][0]) * u, s2[0][1] + (s2[1][1] - s2[0][1]) * u]);
    }
    return out;
  }
  function wobble(pts, o = {}) {
    const amp = o.amp != null ? o.amp : 0.9, step = o.step || 5, seed = o.seed || 1, closed = o.closed !== false;
    const q = resample(pts, step, closed), m = q.length;
    return q.map((p, i) => {
      if (!closed && (i === 0 || i === m - 1)) return p;
      const a = q[(i - 1 + m) % m], b = q[(i + 1) % m], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nick = rnd(seed * 3.1, i * 1.93) > 0.94 ? 1.9 : 1, k = amp * (rnd(seed * 13.7, i * 0.731) - 0.5) * 2 * nick;
      return [p[0] - dy / l * k, p[1] + dx / l * k];
    });
  }
  var polyD = (pts, closed = true) => pts.length ? "M" + pts.map((p) => r1(p[0]) + " " + r1(p[1])).join(" L") + (closed ? " Z" : "") : "";
  function smoothD(pts, closed = true, k = 1) {
    const n = pts.length;
    if (n < 3) return polyD(pts, closed);
    const P2 = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = P2(i - 1), p1 = P2(i), p2 = P2(i + 1), p3 = P2(i + 2);
      d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6 * k)} ${r1(p1[1] + (p2[1] - p0[1]) / 6 * k)} ${r1(p2[0] - (p3[0] - p1[0]) / 6 * k)} ${r1(p2[1] - (p3[1] - p1[1]) / 6 * k)} ${r1(p2[0])} ${r1(p2[1])}`;
    }
    return d + (closed ? " Z" : "");
  }
  function strokeOutline(pts, w = 4, taper = true) {
    const n = pts.length, L = [], R2 = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const u = n > 1 ? i / (n - 1) : 0.5, ww = (typeof w === "function" ? w(u) : w) / 2 * (taper ? Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + u * 0.9)), 0.7) : 1);
      L.push([pts[i][0] - dy / l * ww, pts[i][1] + dx / l * ww]);
      R2.push([pts[i][0] + dy / l * ww, pts[i][1] - dx / l * ww]);
    }
    return L.concat(R2.reverse());
  }
  function arc(a, b, bend = 0, n = 8) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, cx = mx - dy / l * bend, cy = my + dx / l * bend, out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      out.push([v * v * a[0] + 2 * u * v * cx + u * u * b[0], v * v * a[1] + 2 * u * v * cy + u * u * b[1]]);
    }
    return out;
  }
  function spiral(cx, cy, r0, turns = 1.5, grow = 0.5, rot = 0, dir = 1, n = 40) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = rot + dir * u * turns * TAU, r = r0 * (1 - grow * u);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }
  function hills(x0, x1, top, amp, seed = 1, o = {}) {
    const step = o.step || 16, freq = o.freq || 6e-3, base3 = o.base != null ? o.base : 760, out = [[x0, base3]];
    for (let x = x0; x <= x1 + 0.1; x += step) {
      const n = noise1(x * freq + seed * 17.3) * 0.7 + noise1(x * freq * 2.7 + seed * 5.1) * 0.3;
      const peak = o.peaks ? Math.pow(Math.max(0, n), o.peaks) : n;
      out.push([x, top + amp * (1 - 2 * peak)]);
    }
    out.push([x1, base3]);
    return out;
  }
  function peaks(x0, x1, base3, hMin, hMax, n = 5, seed = 1) {
    const out = [];
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 + w * (i + 0.5) + (rnd(seed, i) - 0.5) * w * 0.4, h3 = hMin + (hMax - hMin) * rnd(seed + 3, i), ww = w * (0.55 + 0.4 * rnd(seed + 7, i));
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const u = k / 16, a = Math.PI * u;
        pts.push([cx - ww * Math.cos(a), base3 - h3 * Math.pow(Math.sin(a), 0.65) * (1 + 0.06 * Math.sin(a * 5 + i))]);
      }
      out.push({ cx, h: h3, pts: [[cx - ww, base3 + 40], ...pts, [cx + ww, base3 + 40]] });
    }
    return out;
  }
  function tree(x, y, h3, o = {}) {
    const kind = o.kind || "round", seed = o.seed || 1, lean = o.lean || 0, tw = o.trunk || h3 * 0.07;
    const top = [x + lean * h3, y - h3 * (kind === "pine" ? 0.95 : 0.62)];
    const trunk = [[x - tw, y], [x - tw * 0.5 + lean * h3 * 0.6, y - h3 * 0.5], [top[0] - tw * 0.35, top[1]], [top[0] + tw * 0.35, top[1]], [x + tw * 0.5 + lean * h3 * 0.6, y - h3 * 0.5], [x + tw, y]];
    const crown = [];
    if (kind === "pine") {
      for (let i = 0; i < 4; i++) {
        const yy = y - h3 * (0.38 + i * 0.17), ww = h3 * (0.36 - i * 0.07);
        crown.push([[x + lean * h3 * (0.4 + i * 0.15) - ww, yy + h3 * 0.05], [x + lean * h3 * (0.5 + i * 0.15), yy - h3 * 0.2], [x + lean * h3 * (0.4 + i * 0.15) + ww, yy + h3 * 0.05]]);
      }
    } else if (kind === "willow") {
      crown.push(blob(top[0], top[1], h3 * 0.3, h3 * 0.2, seed, 0.22));
      for (let i = 0; i < 5; i++) {
        const sx = top[0] - h3 * 0.28 + i * h3 * 0.14;
        crown.push(strokeOutline(arc([sx, top[1]], [sx - h3 * 0.05, top[1] + h3 * 0.45], 8), h3 * 0.05));
      }
    } else {
      const n = o.lobes || 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n - 0.5) * 1.8, r = h3 * (0.26 + 0.06 * rnd(seed, i));
        crown.push(blob(top[0] + Math.sin(a) * h3 * 0.22, top[1] - Math.cos(a) * h3 * 0.1 + h3 * 0.04, r, r * 0.85, seed + i, 0.14));
      }
    }
    return { trunk, crown, top, kind };
  }
  function house(x, y, w, h3, o = {}) {
    const kind = o.kind || "cottage", rh = h3 * (kind === "temple" ? 0.55 : 0.45), ov2 = w * 0.12, curl = kind === "temple" ? h3 * 0.12 : 0;
    const walls = rect(x - w / 2, y - h3, w, h3);
    const roof = kind === "flat" ? rect(x - w / 2 - ov2 * 0.3, y - h3 - h3 * 0.1, w + ov2 * 0.6, h3 * 0.1) : [[x - w / 2 - ov2, y - h3 + curl * 0.2], [x - w / 2 - ov2 - curl * 0.6, y - h3 - curl], [x - w / 2 - ov2 * 0.2, y - h3 - rh * 0.1], [x, y - h3 - rh], [x + w / 2 + ov2 * 0.2, y - h3 - rh * 0.1], [x + w / 2 + ov2 + curl * 0.6, y - h3 - curl], [x + w / 2 + ov2, y - h3 + curl * 0.2]];
    const door = rect(x - w * 0.1, y - h3 * 0.55, w * 0.2, h3 * 0.55), win2 = rect(x + w * 0.18, y - h3 * 0.7, w * 0.18, h3 * 0.2), win22 = rect(x - w * 0.36, y - h3 * 0.7, w * 0.18, h3 * 0.2);
    return { walls, roof, door, windows: [win2, win22] };
  }
  function waves(x0, x1, y, amp = 8, len2 = 90, phase = 0, base3 = 760, step = 8) {
    const out = [[x0, base3]];
    for (let x = x0; x <= x1 + 0.1; x += step) out.push([x, y + amp * Math.sin(x / len2 * TAU + phase) + amp * 0.4 * Math.sin(x / len2 * 2.3 * TAU + phase * 1.7)]);
    out.push([x1, base3]);
    return out;
  }
  function grass(x, y, h3 = 28, n = 5, seed = 1) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const dx = (i - (n - 1) / 2) * 5, lean = (i - (n - 1) / 2) * 0.22 + (rnd(seed, i) - 0.5) * 0.3, hh = h3 * (0.6 + 0.5 * rnd(seed + 2, i));
      out.push(strokeOutline(arc([x + dx, y], [x + dx + lean * hh, y - hh], -lean * 6, 6), 4.2));
    }
    return out;
  }
  function cloudScroll(cx, cy, w, o = {}) {
    const seed = o.seed || 1, h3 = w * 0.32, body = [];
    const bumps = 4;
    for (let i = 0; i <= bumps; i++) {
      const u = i / bumps, x = cx - w / 2 + u * w;
      const r = h3 * (0.55 + 0.35 * Math.sin(Math.PI * u)) * (0.9 + 0.2 * rnd(seed, i));
      for (let k = 0; k <= 6; k++) {
        const a = Math.PI + k / 6 * Math.PI;
        body.push([x + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r]);
      }
    }
    body.push([cx + w / 2 + h3 * 0.2, cy + h3 * 0.25], [cx - w / 2 - h3 * 0.2, cy + h3 * 0.25]);
    const curls = [spiral(cx - w / 2 + h3 * 0.1, cy - h3 * 0.05, h3 * 0.55, 1.3, 0.75, Math.PI * 0.1, -1), spiral(cx + w / 2 - h3 * 0.1, cy - h3 * 0.05, h3 * 0.55, 1.3, 0.75, Math.PI * 0.9, 1), spiral(cx - w * 0.08, cy - h3 * 0.45, h3 * 0.42, 1.1, 0.7, Math.PI * 0.5, 1)];
    return { body, curls, h: h3 };
  }

  // src/styles/color.js
  var color_exports = {};
  __export(color_exports, {
    hex2rgb: () => hex2rgb,
    kmeans: () => kmeans,
    luma: () => luma,
    mix: () => mix,
    nearest: () => nearest,
    rgb2hex: () => rgb2hex,
    rgba: () => rgba,
    shade: () => shade
  });
  function hex2rgb(c) {
    const s2 = String(c).trim();
    let m = /^#([0-9a-f]{3})$/i.exec(s2);
    if (m) return [...m[1]].map((ch) => parseInt(ch + ch, 16));
    m = /^#([0-9a-f]{6})/i.exec(s2);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    m = /rgba?\(([^)]+)\)/i.exec(s2);
    if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map(Number);
    return [0, 0, 0];
  }
  var rgb2hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  var mix = (a, b, t) => {
    const A = hex2rgb(a), B4 = hex2rgb(b);
    return rgb2hex(A.map((v, i) => v + (B4[i] - v) * t));
  };
  var shade = (c, k) => k >= 0 ? mix(c, "#ffffff", k) : mix(c, "#000000", -k);
  var luma = (c) => {
    const [r, g2, b] = hex2rgb(c);
    return (0.2126 * r + 0.7152 * g2 + 0.0722 * b) / 255;
  };
  function rgba(c, a) {
    const [r, g2, b] = hex2rgb(c);
    return `rgba(${r},${g2},${b},${a})`;
  }
  function nearest(c, palette) {
    const A = hex2rgb(c);
    let best = palette[0], bd = Infinity;
    for (const p of palette) {
      const B4 = hex2rgb(p), d = (A[0] - B4[0]) ** 2 * 0.3 + (A[1] - B4[1]) ** 2 * 0.59 + (A[2] - B4[2]) ** 2 * 0.11;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }
  function kmeans(px4, k = 6, o = {}) {
    let s2 = (o.seed || 7) >>> 0;
    const R2 = () => (s2 = s2 * 1664525 + 1013904223 >>> 0) / 4294967296;
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    const C2 = [px4[Math.floor(R2() * px4.length)].slice()];
    while (C2.length < k) {
      const D = px4.map((p) => Math.min(...C2.map((c) => d2(p, c)))), tot = D.reduce((a, b) => a + b, 0) || 1;
      let r = R2() * tot, i = 0;
      for (; i < D.length - 1 && r > D[i]; i++) r -= D[i];
      C2.push(px4[i].slice());
    }
    let lab = new Array(px4.length).fill(0);
    for (let it = 0; it < (o.iter || 16); it++) {
      lab = px4.map((p) => {
        let bi = 0, bd = Infinity;
        C2.forEach((c, j) => {
          const d = d2(p, c);
          if (d < bd) {
            bd = d;
            bi = j;
          }
        });
        return bi;
      });
      const S2 = C2.map(() => [0, 0, 0, 0]);
      px4.forEach((p, i) => {
        const a = S2[lab[i]];
        a[0] += p[0];
        a[1] += p[1];
        a[2] += p[2];
        a[3]++;
      });
      S2.forEach((a, j) => {
        if (a[3]) C2[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
      });
    }
    const n = C2.map((_, j) => lab.filter((l) => l === j).length);
    return C2.map((c, j) => ({ rgb: c.map(Math.round), hex: rgb2hex(c), share: n[j] / px4.length })).sort((a, b) => b.share - a.share);
  }

  // src/styles/materials.js
  var holesD = (piece, f) => (piece.holes || []).map((h3) => " " + f(h3)).join("");
  var farCol = (piece, k = -0.16) => piece.far ? shade(piece.col, k) : piece.col;
  function svgDefs(v, id, inner) {
    if (document.getElementById(id)) return;
    const w = document.createElement("div");
    w.innerHTML = `<svg id="${id}" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${inner}</defs></svg>`;
    (v.stage || document.body).appendChild(w.firstElementChild);
  }
  var lineOf = (piece, f = 1) => polyD(strokeOutline(piece.line, (piece.w || 3) * f, piece.taper !== false), true);
  var MATERIALS = {
    // 剪纸: scissor-cut edges (seeded normal wobble), flat colour, ornaments cut out as holes (evenodd), lifted shadow
    cut: {
      label: "\u526A\u7EB8\uFF08\u526A\u5200\u6BDB\u8FB9 \xB7 \u5E73\u6D82 \xB7 \u9542\u7A7A \xB7 \u6295\u5F71\uFF09",
      defs(v, P2) {
        if (v && v.stage && window.vk) window.vk.gl.paperCut(v, { prefix: "pc", seed: P2.seed || 4, shadow: P2.shadow || [3, 5, 3, 0.35] });
      },
      group: (P2, kind) => kind === "char" ? 'filter="url(#pc-shadow)"' : kind === "layer" ? 'filter="url(#pc)"' : "",
      paint(p, P2) {
        const amp = P2.cutAmp != null ? P2.cutAmp : 0.9, W = (pts) => polyD(wobble(pts, { amp, step: p.step || 5, seed: p.seed || 1 }), true);
        if (p.line) return `<path d="${W(strokeOutline(p.line, (p.w || 3) * 1.15))}" fill="${farCol(p)}"/>`;
        const holes = (p.holes || []).concat(p.orn || []);
        return `<path d="${W(p.pts)}${holes.map((h3) => " " + W(h3)).join("")}" fill="${farCol(p)}"${holes.length ? ' fill-rule="evenodd"' : ""}${p.op != null ? ` opacity="${p.op}"` : ""}/>`;
      },
      dyn: (P2, col3) => `fill="${col3}"`
    },
    // 水墨: pale wash fill + wobbling brush outline (ink-line filter from vk.installInk)
    ink: {
      label: "\u6C34\u58A8\uFF08\u6DE1\u5F69\u6655\u67D3 + \u6BDB\u7B14\u52FE\u7EBF\uFF09",
      defs(v, P2) {
        if (v && v.stage && window.vk && !document.querySelector("#ink-line")) window.vk.installInk({ seed: P2.seed || 7 });
      },
      group: (P2, kind) => kind === "char" ? 'filter="url(#ink-wob)"' : "",
      paint(p, P2) {
        const ink = P2.ink || "#1f2529", paper2 = P2.paper || "#e4e5d8";
        if (p.line) return `<path d="${lineOf(p, 1.25)}" fill="${ink}" opacity="${p.op != null ? p.op : 0.92}"/>`;
        const wash = mix(farCol(p, -0.1), paper2, P2.wash != null ? P2.wash : 0.28), lw = p.role === "skin" || p.role === "eyeW" ? 1.8 : 2.6;
        return `<path d="${smoothD(p.pts, true)}${holesD(p, (h3) => smoothD(h3, true))}" fill="${wash}" fill-rule="evenodd" stroke="${ink}" stroke-width="${p.lw || lw}" stroke-linejoin="round"${p.op != null ? ` opacity="${p.op}"` : ""}/>`;
      },
      dyn: (P2, col3) => `fill="${mix(col3, P2.paper || "#e4e5d8", 0.2)}" stroke="${P2.ink || "#1f2529"}" stroke-width="1.6" stroke-linejoin="round"`
    },
    // flat vector (product promo): clean smooth shapes, no outline, soft back-side shade
    flat: {
      label: "\u6241\u5E73\u77E2\u91CF\uFF08\u5E73\u6ED1\u5F62 \xB7 \u65E0\u63CF\u8FB9 \xB7 \u4FA7\u5149\uFF09",
      defs() {
      },
      group: () => "",
      paint(p, P2) {
        if (p.line) return `<path d="${lineOf(p)}" fill="${p.col}"/>`;
        return `<path d="${smoothD(p.pts, true)}${holesD(p, (h3) => smoothD(h3, true))}" fill="${farCol(p, -0.22)}" fill-rule="evenodd"${p.op != null ? ` opacity="${p.op}"` : ""}/>`;
      },
      dyn: (P2, col3) => `fill="${col3}"`
    },
    // 皮影: translucent dyed leather, dark tooled outline, carved ornaments (holes), multiply onto the lit screen
    leather: {
      label: "\u76AE\u5F71\uFF08\u534A\u900F\u660E\u67D3\u8272\u76AE \xB7 \u9542\u523B\u82B1\u7EB9 \xB7 \u80CC\u5149\uFF09",
      defs(v) {
        svgDefs(v, "vk-sp-defs", `<filter id="sp-leather" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035 .09" numOctaves="3" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .2  0 0 0 0 .08  0 0 0 -.9 .55" result="v"/><feComposite in="v" in2="SourceAlpha" operator="in" result="vv"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="vv"/></feMerge></filter>`);
      },
      group: (P2, kind) => kind === "char" ? 'filter="url(#sp-leather)" style="mix-blend-mode:multiply"' : kind === "layer" ? 'style="mix-blend-mode:multiply"' : "",
      paint(p, P2) {
        const line = P2.line || "#3a2112";
        if (p.line) return `<path d="${lineOf(p, 1.1)}" fill="${line}"/>`;
        const holes = (p.holes || []).concat(p.orn || []), d = polyD(p.pts, true) + holes.map((h3) => " " + polyD(h3, true)).join("");
        return `<path d="${d}" fill="${farCol(p, -0.12)}" fill-opacity="${p.op != null ? p.op : P2.alpha || 0.8}" fill-rule="evenodd" stroke="${line}" stroke-width="${p.lw || 2.2}" stroke-linejoin="round"/>`;
      },
      dyn: (P2, col3) => `fill="${col3}" fill-opacity=".75" stroke="${P2.line || "#3a2112"}" stroke-width="1.6"`
    },
    // 重彩装饰 (大闹天宫): saturated flat colour, bold dark contour, gilded ornaments
    decor: {
      label: "\u91CD\u5F69\u88C5\u9970\uFF08\u9971\u548C\u5E73\u6D82 \xB7 \u7C97\u58A8\u7EBF \xB7 \u63CF\u91D1\u7EB9\u6837\uFF09",
      defs() {
      },
      group: () => "",
      paint(p, P2) {
        const line = P2.line || "#2a160e", gold = P2.gold || "#e9b949";
        if (p.line) return `<path d="${lineOf(p, 1.15)}" fill="${line}"/>`;
        let s2 = `<path d="${smoothD(p.pts, true)}${holesD(p, (h3) => smoothD(h3, true))}" fill="${farCol(p, -0.14)}" fill-rule="evenodd" stroke="${line}" stroke-width="${p.lw || 3.2}" stroke-linejoin="round"${p.op != null ? ` opacity="${p.op}"` : ""}/>`;
        if (p.orn && p.orn.length) s2 += `<path d="${p.orn.map((h3) => smoothD(h3, true)).join(" ")}" fill="${gold}" stroke="${line}" stroke-width="1.1"/>`;
        return s2;
      },
      dyn: (P2, col3) => `fill="${col3}" stroke="${P2.line || "#2a160e"}" stroke-width="2.4" stroke-linejoin="round"`
    },
    // 赛博霓虹: dark body, glowing coloured contour (SVG blur-merge glow in each stroke's own colour)
    neon: {
      label: "\u9713\u8679\u7EBF\u63CF\uFF08\u6697\u5E95 \xB7 \u53D1\u5149\u8F6E\u5ED3\uFF09",
      defs(v) {
        svgDefs(v, "vk-neon-defs", `<filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b2"/><feColorMatrix in="b2" type="matrix" values="1.6 0 0 0 0  0 1.6 0 0 0  0 0 1.6 0 0  0 0 0 1.4 0" result="b3"/><feMerge><feMergeNode in="b3"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
      },
      group: (P2, kind) => kind === "char" || kind === "layer" ? 'filter="url(#neon-glow)"' : "",
      paint(p, P2) {
        const body = P2.body || "#07050f";
        if (p.line) return `<path d="${polyD(p.line, false)}" fill="none" stroke="${p.col}" stroke-width="${(p.w || 3) * 0.8}" stroke-linecap="round" stroke-linejoin="round"/>`;
        const col3 = p.far ? mix(p.col, body, 0.35) : p.col;
        let s2 = `<path d="${smoothD(p.pts, true)}" fill="${p.fill || body}" fill-opacity="${p.fillOp != null ? p.fillOp : 0.92}" stroke="${col3}" stroke-width="${p.lw || 2.6}" stroke-linejoin="round"/>`;
        if (p.orn && p.orn.length) s2 += `<path d="${p.orn.map((h3) => smoothD(h3, true)).join(" ")}" fill="none" stroke="${col3}" stroke-width="1.3" opacity=".8"/>`;
        return s2;
      },
      dyn: (P2, col3) => `fill="${P2.body || "#07050f"}" fill-opacity=".6" stroke="${col3}" stroke-width="2.4" stroke-linejoin="round"`
    },
    // 像素: flat fills + thick dark outline; the scene is pixelated by the pack's post filter (vk.style … post.pixel)
    pixel: {
      label: "\u50CF\u7D20\uFF08\u5E73\u6D82 + \u7C97\u63CF\u8FB9\uFF0C\u6574\u5E27\u50CF\u7D20\u5316\uFF09",
      defs() {
      },
      group: () => "",
      paint(p, P2) {
        const line = P2.line || "#1a1c2c";
        if (p.line) return `<path d="${lineOf(p, 1.6)}" fill="${line}"/>`;
        return `<path d="${polyD(p.pts, true)}${holesD(p, (h3) => polyD(h3, true))}" fill="${farCol(p, -0.2)}" fill-rule="evenodd" stroke="${line}" stroke-width="${p.lw || 5}" stroke-linejoin="miter" paint-order="stroke"${p.op != null ? ` opacity="${p.op}"` : ""}/>`;
      },
      dyn: (P2, col3) => `fill="${col3}" stroke="${P2.line || "#1a1c2c"}" stroke-width="4" paint-order="stroke"`
    },
    // 蜡笔绘本: waxy fill with paper tooth showing through, rough wobbly outline, boil (seed stepped by the pack)
    crayon: {
      label: "\u8721\u7B14\uFF08\u8721\u8D28\u9897\u7C92 \xB7 \u7EB8\u7EB9\u900F\u51FA \xB7 \u6296\u52A8\u63CF\u8FB9\uFF09",
      defs(v, P2) {
        svgDefs(v, "vk-cr-defs", `<filter id="cr-wax" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency=".9 .12" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.15" result="tooth"/><feComposite in="SourceGraphic" in2="tooth" operator="in" result="wax"/><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="5" result="w"/><feDisplacementMap in="wax" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter><filter id="cr-line" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence class="cr-boil" type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="2" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="4.5" xChannelSelector="R" yChannelSelector="G"/></filter>`);
      },
      group: (P2, kind) => kind === "char" || kind === "layer" ? 'filter="url(#cr-line)"' : "",
      paint(p, P2) {
        const line = P2.line || "#3b2a20";
        if (p.line) return `<path d="${lineOf(p, 1.2)}" fill="${shade(p.col, -0.2)}" opacity=".9"/>`;
        const col3 = farCol(p, -0.14), d = smoothD(p.pts, true) + holesD(p, (h3) => smoothD(h3, true));
        let s2 = `<path d="${d}" fill="${col3}" fill-rule="evenodd" filter="url(#cr-wax)"${p.op != null ? ` opacity="${p.op}"` : ""}/>`;
        if (p.role !== "eye" && p.role !== "mouth" && p.role !== "pupil") s2 += `<path d="${smoothD(p.pts, true)}" fill="none" stroke="${p.outline || shade(col3, -0.42)}" stroke-width="${p.lw || 2.4}" stroke-linejoin="round" opacity=".85"/>`;
        if (p.orn && p.orn.length) s2 += `<path d="${p.orn.map((h3) => smoothD(h3, true)).join(" ")}" fill="${shade(col3, 0.35)}" filter="url(#cr-wax)"/>`;
        return s2;
      },
      dyn: (P2, col3) => `fill="${col3}" stroke="${shade(col3, -0.4)}" stroke-width="2"`
    }
  };
  var material = (id) => {
    if (id && typeof id === "string" && !MATERIALS[id]) unknownName("materials", id, Object.keys(MATERIALS));
    return MATERIALS[id] || MATERIALS.flat;
  };

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
      if (!T[t]) unknownName("themes", t, Object.keys(T));
      return T[t] || T["tech-blue"];
    }
    if (t.extends && !T[t.extends]) unknownName("themes", t.extends, Object.keys(T));
    const base3 = T[t.extends || "tech-blue"] || T["tech-blue"];
    return deepMerge(JSON.parse(JSON.stringify(base3)), t);
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
    const base3 = Math.atan2(ty, tx);
    const a = Math.acos(clamp((l1 * l1 + cd * cd - l2 * l2) / (2 * l1 * cd), -1, 1));
    const sh = base3 - bend * a;
    const ex = Math.cos(sh) * l1, ey = Math.sin(sh) * l1;
    const fore = Math.atan2(Math.sin(base3) * cd - ey, Math.cos(base3) * cd - ex);
    let el2 = (fore - sh) * R2D;
    el2 = (el2 + 540) % 360 - 180;
    return { a1: sh * R2D, a2: fore * R2D, elbow: el2, shoulder: sh * R2D, reach: d / (l1 + l2) };
  }
  function blink(t, o = {}) {
    const per2 = o.period || 4.4, dur = o.dur || 0.24, ph = ((t + (o.offset || 0)) % per2 + per2) % per2;
    if (ph < per2 - dur) return 0;
    return o.smooth ? Math.sin((ph - (per2 - dur)) / dur * Math.PI) : 1;
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
    const base3 = (pose = {}, root = {}) => mat.mul(rootMatrix(root), mat.trs(pose["root.x"] || 0, pose["root.y"] || 0, pose["root.rot"] || 0));
    function matrix(id, pose = {}, root = {}) {
      const chain = [];
      for (let b = byId[id]; b; b = b.parent ? byId[b.parent] : null) chain.unshift(b.id);
      let m = base3(pose, root);
      for (const c of chain) m = mat.mul(m, local(c, pose));
      return m;
    }
    const point = (id, x = 0, y = 0, pose, root) => mat.apply(matrix(id, pose, root), x, y);
    const toLocal = (p, root = {}) => mat.apply(mat.inv(rootMatrix(root)), p[0], p[1]);
    function solveIK(name, target, pose = {}, root = {}, o = {}) {
      const ch = chains[name] || name, [ia, ib, ic] = ch.chain, A = byId[ia], B4 = byId[ib], C2 = byId[ic];
      const F2 = mat.mul(A.parent ? matrix(A.parent, pose, root) : base3(pose, root), mat.trs(A.x + (pose[ia + ".x"] || 0), A.y + (pose[ia + ".y"] || 0)));
      const [tx, ty] = mat.apply(mat.inv(F2), target[0], target[1]);
      const bx = B4.x + (pose[ib + ".x"] || 0), by = B4.y + (pose[ib + ".y"] || 0), cx = C2.x + (pose[ic + ".x"] || 0), cy = C2.y + (pose[ic + ".y"] || 0);
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
        const mix3 = opts.ikMix && opts.ikMix[name] != null ? clamp(valueAt(opts.ikMix[name], t), 0, 1) : 1;
        let target = null;
        const own = name + ".tx" in p ? mat.apply(base3(p, root), p[name + ".tx"], p[name + ".ty"]) : null;
        if (wt && own) target = [own[0] + (wt[0] - own[0]) * mix3, own[1] + (wt[1] - own[1]) * mix3];
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
      const P2 = (id) => point(id, 0, 0, { ...pose, "root.x": 0, "root.y": 0, "root.rot": 0 }, {});
      let s2 = "";
      for (const b of order) {
        const q = P2(b.id);
        if (b.parent) {
          const p = P2(b.parent);
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

  // src/fx/motion.js
  var TAU2 = Math.PI * 2;
  var frac2 = (x) => x - Math.floor(x);
  function gait(o = {}) {
    const S2 = o.stride || 120, duty = o.duty != null ? o.duty : 0.62, lift = o.lift != null ? o.lift : S2 * 0.14;
    const hip = o.hip || 190, leg = o.leg || hip * 1.04, offs = o.offsets || [0, 0.5], ahead = o.ahead != null ? o.ahead : 0.5;
    const flight = o.flight != null ? o.flight : duty < 0.5 ? S2 * 0.08 : 0, toe = o.toe != null ? o.toe : 18;
    function foot(d, phi) {
      const c = d / S2 + phi, k = Math.floor(c), u = c - k;
      const land = (j) => (j - phi) * S2 + S2 * duty * ahead;
      if (u < duty) return { x: land(k), y: 0, contact: true, u, angle: 0 };
      const v = (u - duty) / (1 - duty), e = (1 - Math.cos(Math.PI * v)) / 2;
      return { x: land(k) + S2 * e, y: lift * Math.pow(Math.sin(Math.PI * v), 0.9) * (1 + 0.25 * Math.sin(Math.PI * v) * (1 - v)), contact: false, u, angle: toe * Math.sin(Math.PI * v) * (v < 0.6 ? 1 : (1 - v) / 0.4) };
    }
    function at(d) {
      d = Math.max(0, d);
      const feet = offs.map((p) => foot(d, p));
      let h3 = hip, planted = 0;
      for (const f of feet) if (f.contact) {
        planted++;
        const dx = f.x - d;
        const reach = Math.sqrt(Math.max(0, leg * leg - dx * dx));
        h3 = Math.min(h3, reach);
      }
      if (!planted && flight) {
        const ups = offs.map((p) => {
          const u = frac2(d / S2 + p);
          return u >= duty ? (u - duty) / (1 - duty) : null;
        }).filter((x) => x != null);
        const v = Math.min(...ups.map((x) => Math.min(x, 1 - x))) * 2;
        h3 = hip + flight * Math.sin(Math.PI * clamp(v, 0, 1) / 2);
      }
      return { feet, hipX: d, hipY: h3, phase: frac2(d / S2) };
    }
    function rest(d) {
      for (let i = 0; i < 400; i++) {
        const x = d + i * S2 / 400;
        if (offs.every((p) => frac2(x / S2 + p) < duty - 0.02 && frac2(x / S2 + p) > 0.02)) return x;
      }
      return d;
    }
    return { at, foot, rest, stride: S2, duty, o: { ...o, stride: S2, duty, lift, hip, leg, offsets: offs } };
  }
  function cycle(t, o = {}) {
    const g2 = o.gait || gait(o), per2 = o.period || 1.1;
    return g2.at(Math.max(0, t) * g2.stride / per2);
  }
  function travel(t, keys, ease2 = smooth01) {
    if (t <= keys[0][0]) return 0;
    let d = 0;
    for (let i = 1; i < keys.length; i++) {
      const [t0, x0] = keys[i - 1], [t1, x1] = keys[i];
      if (t >= t1) {
        d += Math.abs(x1 - x0);
        continue;
      }
      return d + Math.abs(x1 - x0) * ease2((t - t0) / (t1 - t0 || 1));
    }
    return d;
  }
  var VISEMES = ["M", "A", "E", "O"];
  function mouth(seg2, lt, o = {}) {
    const closed = { open: 0, shape: "M", i: 0 };
    if (!seg2) return closed;
    const fps = o.fps != null ? o.fps : 12, tq = fps ? Math.floor(lt * fps + 1e-6) / fps : lt, u = tq - seg2.at;
    if (u < -0.05 || seg2.end != null && tq > seg2.end + 0.1) return closed;
    const env2 = seg2.env || seg2.entry && seg2.entry.env;
    if (env2 && env2.rms && env2.rms.length) {
      const fi = u * env2.rate, i0 = Math.floor(fi), w = fi - i0, g2 = (j) => env2.rms[Math.max(0, Math.min(env2.rms.length - 1, j))] || 0;
      if (fi < 0 || i0 >= env2.rms.length) return closed;
      const r = (g2(i0) * (1 - w) + g2(i0 + 1) * w) * (o.gain || 1);
      const open = smooth01((r - (o.threshold != null ? o.threshold : 0.08)) / 0.5);
      if (open < 0.12) return { open, shape: "M", i: 0 };
      const c = env2.cen ? env2.cen[Math.max(0, Math.min(env2.cen.length - 1, i0))] || 0.5 : 0.5;
      const shape = c < 0.2 ? "O" : c > 0.6 && open < 0.75 ? "E" : "A";
      return { open, shape, i: VISEMES.indexOf(shape) };
    }
    const W = seg2.words || [];
    for (let j = 0; j < W.length; j++) {
      const a = W[j].t, b = W[j].end != null ? W[j].end : a + 0.2;
      if (u >= a && u < b) {
        const v = (u - a) / Math.max(0.05, b - a), open = Math.pow(Math.sin(Math.PI * clamp(v, 0, 1)), 0.55);
        if (open < 0.15) return { open, shape: "M", i: 0 };
        const ch = String(W[j].w || "").codePointAt(0) || j, pick = Math.floor(hash(ch * 0.713 + 3.1) * 3) + 1;
        return { open, shape: VISEMES[pick], i: pick };
      }
    }
    if (!W.length && seg2.dur) {
      const open = Math.abs(Math.sin(u * Math.PI * 4));
      return open < 0.2 ? { open, shape: "M", i: 0 } : { open, shape: "A", i: 1 };
    }
    return closed;
  }
  function boilPoints(pts, t, o = {}) {
    const amp = o.amp != null ? o.amp : 1.2;
    if (!amp) return pts;
    const fr = boilFrame(t, o.fps || 12, o.frames || 0), seed = (o.seed || 0) * 13.37 + fr * 71.3, sm5 = o.smooth || 3;
    return pts.map((p, i) => [p[0] + (noise1(i / sm5 + seed) - 0.5) * 2 * amp, p[1] + (noise1(i / sm5 + seed + 91.7) - 0.5) * 2 * amp]);
  }
  function follow(f, t, lag = 0.12, spread = null, n = 6) {
    const sp = spread == null ? lag : spread;
    if (!(sp > 0)) return f(t - lag);
    let acc = null;
    for (let i = 0; i < n; i++) {
      const v = f(t - lag - sp * i / (n - 1));
      if (acc == null) acc = Array.isArray(v) ? v.map(() => 0) : 0;
      if (Array.isArray(v)) v.forEach((x, j) => {
        acc[j] += x / n;
      });
      else acc += v / n;
    }
    return acc;
  }
  function spring2(f, t, o = {}) {
    const w = TAU2 * (o.freq || 2.2), z = o.damping != null ? o.damping : 0.35, win2 = o.window || 1.6, dt = o.dt || 1 / 120;
    const n = Math.ceil(win2 / dt), t0 = t - n * dt, first = f(t0), arr = Array.isArray(first);
    let x = arr ? first.slice() : [first], v = x.map(() => 0);
    for (let i = 1; i <= n; i++) {
      const tt = t0 + i * dt, g2 = f(tt), gv = arr ? g2 : [g2];
      for (let j = 0; j < x.length; j++) {
        v[j] += (w * w * (gv[j] - x[j]) - 2 * z * w * v[j]) * dt;
        x[j] += v[j] * dt;
      }
    }
    return arr ? x : x[0];
  }
  function drag(f, t, o = {}) {
    const h3 = o.h || 1 / 30, gain = o.gain != null ? o.gain : 0.06, max = o.max || 40;
    const vel = (u) => (f(u + h3 / 2) - f(u - h3 / 2)) / h3;
    const v = o.spring === false ? follow(vel, t, o.lag || 0.06) : spring2(vel, t, { freq: o.freq || 2.4, damping: o.damping || 0.45, window: o.window || 1.2, dt: o.dt || 1 / 90 });
    return clamp(-gain * v, -max, max);
  }
  function ribbon(anchor, t, o = {}) {
    const n = o.n || 8, len2 = o.len || 16, lag = o.lag != null ? o.lag : 0.045, hang = o.hang || [0, 1], sag = o.sag != null ? o.sag : 1;
    const fl = o.flutter != null ? o.flutter : 4, fq = o.freq || 1.6, wave = o.wave != null ? o.wave : 0.8, wind = o.wind || [0, 0], seed = o.seed || 0;
    const raw = [];
    for (let i = 0; i <= n; i++) {
      const a = anchor(t - i * lag);
      raw.push([a[0] + (hang[0] * sag * len2 + wind[0]) * i, a[1] + (hang[1] * sag * len2 + wind[1]) * i]);
    }
    const pts = [raw[0].slice()];
    for (let i = 1; i <= n; i++) {
      const p = pts[i - 1], q = raw[i];
      let dx = q[0] - p[0], dy = q[1] - p[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const k = fl * (i / n) * Math.sin(TAU2 * fq * t - wave * i + seed) + fl * 0.4 * (i / n) * (noise1(t * fq * 0.7 + i * 0.37 + seed * 3.1) - 0.5);
      pts.push([p[0] + dx * len2 - dy * k * 0.35, p[1] + dy * len2 + dx * k * 0.35]);
    }
    return pts;
  }
  function ribbonPath(pts, w0 = 10, w1 = 3, o = {}) {
    const n = pts.length;
    if (n < 2) return "";
    const L = [], R2 = [], f = (x) => Math.round(x * 10) / 10;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const u = i / (n - 1), w = (w0 + (w1 - w0) * u) / 2 * (o.twist ? 0.55 + 0.45 * Math.abs(Math.cos(u * Math.PI * o.twist + (o.phase || 0))) : 1);
      L.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]);
      R2.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]);
    }
    return "M" + L.concat(R2.reverse()).map((p) => f(p[0]) + " " + f(p[1])).join(" L") + " Z";
  }
  var motion = { gait, cycle, travel, mouth, VISEMES, boilPoints, follow, spring: spring2, drag, ribbon, ribbonPath };

  // src/styles/puppet.js
  var NS = "http://www.w3.org/2000/svg";
  var f1 = (x) => Math.round(x * 10) / 10;
  var f3 = (x) => Math.round(x * 1e3) / 1e3;
  var S = Math.sin;
  var C = Math.cos;
  var PI2 = Math.PI;
  var sm3 = smooth01;
  var BONES = [
    { id: "hips" },
    { id: "chest", parent: "hips", x: 0, y: -4 },
    { id: "head", parent: "chest", x: 4, y: -126 },
    { id: "tail", parent: "head", x: -30, y: -66 },
    { id: "upperArmN", parent: "chest", x: 2, y: -114 },
    { id: "foreArmN", parent: "upperArmN", y: 58 },
    { id: "handN", parent: "foreArmN", y: 50 },
    { id: "upperArmF", parent: "chest", x: -6, y: -112 },
    { id: "foreArmF", parent: "upperArmF", y: 58 },
    { id: "handF", parent: "foreArmF", y: 50 },
    { id: "thighN", parent: "hips", x: -2, y: 4 },
    { id: "shinN", parent: "thighN", y: 86 },
    { id: "footN", parent: "shinN", y: 84 },
    { id: "thighF", parent: "hips", x: 6, y: 2 },
    { id: "shinF", parent: "thighF", y: 86 },
    { id: "footF", parent: "shinF", y: 84 },
    { id: "flapN", parent: "hips", x: 10, y: 6 },
    { id: "flapB", parent: "hips", x: -14, y: 6 }
  ];
  var IK = {
    armN: { chain: ["upperArmN", "foreArmN", "handN"], bend: -1 },
    armF: { chain: ["upperArmF", "foreArmF", "handF"], bend: -1 },
    legN: { chain: ["thighN", "shinN", "footN"], bend: 1 },
    legF: { chain: ["thighF", "shinF", "footF"], bend: 1 }
  };
  var SOLE = 188;
  var ANKLE = 14;
  var HIP = 180;
  var HEAD_R = 44;
  var HC = [8, -50];
  function skull() {
    const out = [];
    for (let i = 0; i < 44; i++) {
      const a = i / 44 * PI2 * 2 - PI2;
      let rx = 42, ry = 45;
      const nose = 8 * Math.exp(-Math.pow((a - 0.2) / 0.11, 2)), chin = 3 * Math.exp(-Math.pow((a - 0.95) / 0.25, 2)), jaw = a > 0.5 && a < 2.2 ? -4 * S((a - 0.5) / 1.7 * PI2) : 0;
      const r = 1 + (nose + chin + jaw) / 44;
      out.push([HC[0] + C(a) * rx * r, HC[1] + S(a) * ry * r]);
    }
    return out;
  }
  function hairCap(kind) {
    const out = [];
    for (let i = 0; i <= 26; i++) {
      const a = -1.15 - i / 26 * (PI2 * 2 - 1.15 - 2.45 + 0);
      const k = 1.08;
      out.push([HC[0] + C(a) * 42 * k, HC[1] + S(a) * 45 * k]);
    }
    const fringe = kind === "short" || kind === "long" || kind === "pony" ? [[18, -78], [30, -76], [34, -84]] : [[22, -84], [33, -82]];
    return out.concat([[-14, -18], [-10, -36], [-4, -52], [2, -66], ...fringe]);
  }
  var sleeve = (len2, w0, w1) => capsule(0, -6, w0, 0, len2, w1, 8);
  var shoe = () => [[-11, -10], [11, -10], [13, 0], [26, 3], [34, 9], [35, 14], [-12, 14], [-14, 4]];
  function torso(o) {
    const hem = o.robe === "long" ? 64 : 22;
    return [[10, -128], [26, -116], [34, -96], [33, -64], [30, -34], [33, hem - 6], [36, hem], [-34, hem], [-31, hem - 8], [-30, -40], [-31, -80], [-28, -112], [-16, -124], [-6, -130]];
  }
  var MOUTH = [42, -27];
  var VIS = {
    M: () => strokeOutline([[35, -27], [40, -26.4], [45, -27.6]], 2.6, true),
    A: () => ellipse(40.5, -24.5, 5.2, 6.5, -8, 18),
    E: () => ellipse(40, -25.5, 6.8, 3.4, -6, 18),
    O: () => ellipse(40.5, -24.5, 3.8, 4.8, 0, 16)
  };
  var base = { crouch: 0, air: 0, armSwing: 1, look: 0, lean: 0 };
  var CLIPS = {
    idle: (t) => ({ ...base, chest: -1 + S(t * 2) * 0.8, head: S(t * 1.1) * 1.6, upperArmN: -8 + S(t * 2) * 1.5, foreArmN: -18, upperArmF: 8, foreArmF: -16, armSwing: 1 }),
    walk: (t) => ({ ...base, chest: 4, head: -3, foreArmN: -22, foreArmF: -18, armSwing: 1 }),
    run: (t) => ({ ...base, chest: 14, head: -10, upperArmN: 0, foreArmN: -80, upperArmF: 0, foreArmF: -80, armSwing: 1.7, lean: 6 }),
    talk: (t) => {
      const g2 = 0.5 + 0.5 * S(t * 5.3) * S(t * 2.1 + 1);
      return { ...base, chest: -2 + 2 * S(t * 2.4), head: -4 + 5 * S(t * 3.3) * g2, upperArmN: -34 - 18 * g2, foreArmN: -62 - 22 * S(t * 4.1), upperArmF: 8, foreArmF: -20, armSwing: 0, talk: g2 };
    },
    wave: (t) => ({ ...base, chest: -3, head: -6, upperArmN: -118, foreArmN: -50 + 28 * S(t * 9), upperArmF: 10, foreArmF: -20, armSwing: 0 }),
    point: (t) => ({ ...base, chest: 2, head: -4, upperArmN: -84 + 2 * S(t * 3), foreArmN: -6, upperArmF: 12, foreArmF: -24, armSwing: 0 }),
    cheer: (t) => {
      const b = Math.abs(S(t * 6));
      return { ...base, chest: -8, head: -12, upperArmN: -214 - 8 * b, foreArmN: 12, upperArmF: -142 - 10 * b, foreArmF: -24, crouch: 10 * b, armSwing: 0 };
    },
    bow: (t) => ({ ...base, chest: 30, head: 18, upperArmN: -30, foreArmN: -50, upperArmF: -20, foreArmF: -50, crouch: 6, armSwing: 0 }),
    surprise: (t) => ({ ...base, chest: -14, head: -16, upperArmN: -110, foreArmN: -60, upperArmF: -96, foreArmF: -50, crouch: -2, armSwing: 0, look: -0.4, lean: -6 }),
    think: (t) => ({ ...base, chest: 4, head: 8 + 2 * S(t * 1.3), upperArmN: -36, foreArmN: -128, upperArmF: 22, foreArmF: -70, armSwing: 0, look: -0.6 }),
    look: (t) => ({ ...base, chest: -6, head: -22 + 2 * S(t * 1.2), upperArmN: -10, foreArmN: -16, upperArmF: 8, foreArmF: -14, armSwing: 0, look: -1 }),
    sad: (t) => ({ ...base, chest: 12, head: 22, upperArmN: 4, foreArmN: -6, upperArmF: 8, foreArmF: -6, armSwing: 0, look: 1, crouch: 4 }),
    // jump: 0–.25 crouch, .25–.85 airborne, .85–1.1 land (clip-local time; play with local:true)
    jump: (t) => {
      const c = sm3(t / 0.25) * (1 - sm3((t - 0.25) / 0.08)) + sm3((t - 0.85) / 0.06) * (1 - sm3((t - 1) / 0.2)), air = sm3((t - 0.25) / 0.08) * (1 - sm3((t - 0.8) / 0.08));
      return { ...base, chest: 10 * c - 6 * air, head: -6 * air, upperArmN: -40 * c - 172 * air, foreArmN: -20 + 30 * air, upperArmF: -30 * c - 196 * air, foreArmF: -24, crouch: 34 * c, air, armSwing: 0, hop: 120 * Math.max(0, S(PI2 * clamp((t - 0.25) / 0.6))) };
    }
  };
  function puppet(parent, o = {}) {
    const st = o.style || {}, P2 = { ...st.P || {}, ...o.P || {} }, M = material(o.material || st.material || "flat");
    const look = { skin: "skin", hair: "black", cloth: "red", cloth2: "cream", trim: "gold", pants: "cream", shoe: "black", sash: "gold", hairStyle: "bun", ...o.look || {} };
    const col3 = (role) => st.colour ? st.colour(look[role] || role, role) : look[role] || "#888";
    const C_ = {
      skin: col3("skin"),
      skin2: st.colour ? st.colour(look.skin, "skin2") : "#d9a882",
      hair: col3("hair"),
      cloth: col3("cloth"),
      cloth2: col3("cloth2"),
      trim: col3("trim"),
      pants: col3("pants"),
      shoe: col3("shoe"),
      sash: col3("sash"),
      eyeW: st.colour ? st.colour("white", "eyeW") : "#fbf6ea",
      pupil: st.colour ? st.colour("ink", "pupil") : "#1e1b1f",
      mouth: st.colour ? st.colour("mouth", "mouth") : "#a0302a",
      cheek: st.colour ? st.colour("cheek", "cheek") : "#e7897a",
      line: P2.line || "#1e1b1f"
    };
    const orn = o.ornament != null ? o.ornament : P2.ornament != null ? P2.ornament : 1, seedBase = o.seed || 1;
    const hs = look.hairStyle;
    const L = [];
    const add = (bone, z, role, shape, x = {}) => L.push({ bone, z, role, col: x.col || C_[role] || col3(role), ...x, ...shape && Array.isArray(shape[0]) && !x.line ? { pts: shape } : {}, seed: seedBase * 31 + L.length });
    add("flapB", 0, "cloth", [[-8, -6], [10, -6], [12, 50], [-14, 54]], { far: true });
    add("upperArmF", 10, "cloth2", sleeve(58, 14, 11.5), { far: true });
    add("foreArmF", 11, "cloth2", sleeve(50, 11.5, 10), { far: true });
    add("foreArmF", 12, "trim", rect(-11.5, 38, 23, 9), { far: true });
    add("handF", 13, "skin", ellipse(0, 10, 10.5, 11.5, 0, 16), { far: true });
    add("thighF", 20, "pants", capsule(0, -6, 16, 0, 86, 12, 8), { far: true });
    add("shinF", 21, "pants", capsule(0, 0, 12, 0, 80, 9.5, 8), { far: true });
    add("footF", 22, "shoe", shoe(), { far: true });
    if (hs === "long") add("tail", 1, "hair", [[-6, -6], [10, -4], [12, 40], [4, 92], [-20, 96], [-22, 40]], { far: false });
    if (hs === "pony") add("tail", 1, "hair", strokeOutline([[0, 0], [-8, 20], [-12, 46], [-10, 72]], 16), {});
    add("thighN", 32, "pants", capsule(0, -6, 16, 0, 86, 12, 8));
    add("shinN", 33, "pants", capsule(0, 0, 12, 0, 80, 9.5, 8));
    add("shinN", 33.5, "trim", rect(-11, 58, 22, 8));
    add("footN", 34, "shoe", shoe());
    add("head", 38, "skin2", capsule(4, 6, 12, 6, -36, 11, 6));
    const T6 = torso(look), tornOrn = orn ? [ellipse(4, -78, 9, 9, 0, 14), ellipse(-14, -62, 4, 4, 0, 10), ellipse(22, -60, 4, 4, 0, 10), ellipse(4, -50, 3.6, 5, 0, 10)] : [];
    add("chest", 40, "cloth", T6, { orn: tornOrn });
    add("chest", 41, "trim", strokeOutline([[-6, -130], [6, -112], [18, -92], [28, -70]], 9, false));
    add("chest", 41.5, "sash", [[-31, -20], [31, -22], [32, -8], [-30, -6]]);
    add("flapN", 42, "cloth", [[-10, -6], [14, -6], [22, 56], [-6, 60]], { orn: orn ? [ellipse(6, 30, 4, 6, 0, 10)] : [] });
    add("head", 49, "skin2", ellipse(-2, -46, 7.5, 10.5, -6, 14));
    add("head", 50, "skin", skull());
    add("head", 51, "cheek", ellipse(24, -34, 8.5, 5, -8, 14), { op: 0.45 });
    if (hs !== "bald") add("head", 52, "hair", hairCap(hs));
    if (hs === "bun") {
      add("head", 53, "hair", ellipse(-16, -100, 17, 15, -20, 18));
      add("head", 53.5, "trim", rect(-30, -90, 28, 6).map((p) => [p[0], p[1] + (p[0] + 16) * 0.3]));
    }
    if (hs === "twinbuns") {
      add("head", 53, "hair", ellipse(-14, -96, 15, 14, 0, 16));
      add("head", 53, "hair", ellipse(18, -100, 14, 13, 0, 16));
      add("head", 53.4, "trim", ellipse(18, -100, 5, 5, 0, 10));
      add("head", 53.4, "trim", ellipse(-14, -96, 5, 5, 0, 10));
    }
    if (hs === "cap") {
      add("head", 53, "hair", [[44, -66], [40, -92], [16, -108], [-14, -106], [-36, -90], [-40, -64], [-30, -56], [-26, -70], [0, -74], [26, -74]]);
      add("head", 53.5, "trim", strokeOutline([[44, -66], [20, -72], [-4, -73], [-30, -68]], 7, false));
    }
    add("head", 55, "brow", null, { line: [[38, -66], [30, -69], [22, -69]], w: 3.4, col: C_.hair });
    add("head", 56, "eyeW", ellipse(31, -54, 6.2, 6.8, -6, 16), { cls: "pp-eye-open" });
    add("head", 57, "pupil", ellipse(33.2, -53.5, 3.3, 4.4, 0, 12), { cls: "pp-eye-open pp-pupil" });
    add("head", 57, "pupil", null, { line: arc([37, -54], [25, -55], -3.5, 6), w: 2.8, cls: "pp-eye-shut" });
    for (const k of Object.keys(VIS)) add("head", 58, k === "M" ? "pupil" : "mouth", VIS[k](), { cls: "pp-mouth pp-m-" + k });
    add("upperArmN", 60, "cloth2", sleeve(58, 14, 11.5));
    add("foreArmN", 61, "cloth2", sleeve(50, 11.5, 10));
    add("foreArmN", 62, "trim", rect(-11.5, 38, 23, 9));
    add("handN", 63, "skin", ellipse(0, 10, 10.5, 11.5, 0, 16));
    if (M === material("leather")) [["upperArmN", 0, -4], ["foreArmN", 0, 0], ["thighN", 0, -2], ["shinN", 0, 0], ["head", 4, 4]].forEach(([b, x, y]) => add(b, 64, "trim", ellipse(x, y, 3.2, 3.2, 0, 10)));
    if (M.defs && o.video) M.defs(o.video, P2);
    const g2 = document.createElementNS(NS, "g");
    g2.setAttribute("class", "vk-puppet " + (o.cls || ""));
    const attrs = M.group(P2, "char");
    if (attrs) attrs.replace(/(\w[\w-]*)="([^"]*)"/g, (_, k, v) => g2.setAttribute(k, v));
    const scarfG = document.createElementNS(NS, "g");
    scarfG.setAttribute("class", "pp-scarf");
    const inner = document.createElementNS(NS, "g");
    g2.append(scarfG, inner);
    const pieces = L.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z || a.i - b.i);
    inner.innerHTML = pieces.map((p) => `<g class="pp-piece ${p.cls || ""}" data-b="${p.bone}">${/pp-mouth/.test(p.cls || "") ? `<g class="pp-v">${M.paint(p, P2)}</g>` : M.paint(p, P2)}</g>`).join("");
    parent.appendChild(g2);
    const pieceEls = [...inner.children].map((el2, i) => ({ el: el2, bone: pieces[i].bone, last: "", pupil: /pp-pupil/.test(pieces[i].cls || "") }));
    let scarfPath = null;
    if (look.scarf) {
      scarfG.innerHTML = `<path ${M.dyn(P2, col3("scarf") === "scarf" ? C_.trim : st.colour ? st.colour(look.scarf, "scarf") : look.scarf)}/>`;
      scarfPath = scarfG.firstElementChild;
    }
    const Q2 = (s2) => [...inner.querySelectorAll(s2)];
    const E2 = { open: Q2(".pp-eye-open"), shut: Q2(".pp-eye-shut"), pupil: Q2(".pp-pupil"), mouths: Object.fromEntries(Object.keys(VIS).map((k) => [k, Q2(".pp-m-" + k)])) };
    const setOp = (el2, v) => {
      const s2 = String(Math.round(clamp(v) * 1e3) / 1e3);
      if (el2.__op !== s2) {
        el2.__op = s2;
        el2.setAttribute("opacity", s2);
      }
    };
    const rig = createRig({ root: inner, el: () => null, bones: BONES, clips: { ...CLIPS, ...o.clips || {} }, ik: IK, defaults: { ...base } });
    const G3 = gait({ stride: 128, hip: HIP, leg: 184, lift: 18, duty: 0.62, ...o.gait || {} });
    const RUN = gait({ stride: 230, hip: HIP - 6, leg: 184, lift: 34, duty: 0.36, ...o.runGait || {} });
    function mats(pose2) {
      const out = {};
      for (const b of rig.bones) out[b.id] = mat.mul(b.parent ? out[b.parent] : mat.id(), rig.local(b.id, pose2));
      return out;
    }
    function worldRot(id, pose2) {
      let a = 0;
      for (let b = rig.byId[id]; b; b = b.parent ? rig.byId[b.parent] : null) a += b.rot + (pose2[b.id] || 0);
      return a;
    }
    const clipPose = (clip, t) => typeof clip === "function" ? clip(t) : typeof clip === "string" ? (rig.clips[clip] || CLIPS.idle)(t) : clip && clip.clipPose ? clip.clipPose(t) : CLIPS.idle(t);
    function pose(t, s2 = {}) {
      const sc = s2.scale != null ? s2.scale : o.scale || 0.6, dir = s2.facing || 1, d = s2.d || 0;
      let p = { ...clipPose(s2.clip || "idle", t) };
      const gw = s2.run || 0, g0 = G3.at(d), g1 = gw > 0 ? RUN.at(d * RUN.stride / G3.stride) : null;
      const hipH = g1 ? g0.hipY + (g1.hipY - g0.hipY) * gw : g0.hipY;
      const feet = g0.feet.map((f, i) => g1 ? { x: f.x + (g1.feet[i].x - f.x) * gw, y: f.y + (g1.feet[i].y - f.y) * gw, angle: f.angle + (g1.feet[i].angle - f.angle) * gw } : f);
      const gy = (x) => s2.ground ? s2.ground(x) : s2.y != null ? s2.y : 600;
      const air = clamp(p.air || 0), hop = (p.hop || 0) + (s2.lift || 0) / sc;
      const hx = (s2.x || 0) + dir * d * sc, hy = gy(hx) - (hipH - (p.crouch || 0) + hop) * sc;
      const root = { x: hx, y: hy, scale: sc, flip: dir, rot: dir * (p.lean || 0) };
      const sw = p.armSwing != null ? p.armSwing : 1;
      if (sw) {
        const a = (feet[0].x - d) / (G3.stride * 0.5), b = (feet[1].x - d) / (G3.stride * 0.5);
        p.upperArmN = (p.upperArmN || 0) + sw * 22 * b;
        p.upperArmF = (p.upperArmF || 0) + sw * 22 * a;
      }
      const ank = (f, side) => {
        const wx = (s2.x || 0) + dir * f.x * sc, wy = gy(wx) - (f.y + ANKLE) * sc;
        if (!air) return [wx, wy];
        const tx = hx + dir * (side ? -8 : 14) * sc, ty = hy + (HIP - 40) * sc;
        return [wx + (tx - wx) * air, wy + (ty - wy) * air];
      };
      p = rig.solveIK("legN", ank(feet[0], 0), p, root);
      p = rig.solveIK("legF", ank(feet[1], 1), p, root);
      p.footN = (p.footN || 0) - worldRot("footN", { ...p, footN: 0 }) + feet[0].angle * (1 - air) + 20 * air;
      p.footF = (p.footF || 0) - worldRot("footF", { ...p, footF: 0 }) + feet[1].angle * (1 - air) + 20 * air;
      const vx = s2.vx != null ? s2.vx : 0;
      p.flapN = 0.5 * Math.min(0, p.thighN || 0) + 0.15 * Math.max(0, p.thighN || 0) + (s2.flap || 0);
      p.flapB = 0.45 * Math.max(0, p.thighF || 0) + 0.2 * Math.min(0, p.thighF || 0) + (s2.flap || 0);
      p.tail = (p.tail || 0) + 6 * S(t * 2.3) + (s2.tail || 0) - (p.head || 0) * 0.6 - (p.chest || 0) * 0.5;
      return { p, root, sc, dir, hx, hy };
    }
    const point = (bone, x, y, R2) => rig.point(bone, x, y, R2.p, R2.root);
    const api = {
      g: g2,
      inner,
      rig,
      gait: G3,
      runGait: RUN,
      pieces: pieceEls,
      colours: C_,
      pose,
      point: (bone, x, y, t, s2) => point(bone, x, y, pose(t, s2)),
      // point of a bone for an already computed pose R (the value render() returns)
      pointAt: (R2, bone, x = 0, y = 0) => point(bone, x, y, R2),
      HC,
      // subject for the camera (vk shots): head centre + radius, feet, facing
      subject(t, s2) {
        const R2 = pose(t, s2), h3 = point("head", HC[0], HC[1], R2);
        return { head: h3, headR: HEAD_R * 1.1 * R2.sc, feet: [R2.hx, s2.ground ? s2.ground(R2.hx) : s2.y], facing: R2.dir };
      },
      // s (see pose) + {mouth: {open, shape} | seg (voice line) , blink, eyes: 'shut', opacity, scarfWind}
      render(t, s2 = {}) {
        setOp(g2, s2.opacity == null ? 1 : s2.opacity);
        if (s2.opacity != null && s2.opacity <= 1e-3) return null;
        const R2 = pose(t, s2), m = mats(R2.p);
        rig.apply(R2.p, R2.root);
        const lk = R2.p.look || 0, pupT = ` translate(${f1(lk > 0 ? -0.5 * lk : 1.2 * -lk)} ${f1(lk * 2.2)})`;
        for (const pe of pieceEls) {
          const k = m[pe.bone];
          if (!k) continue;
          const str = `matrix(${f3(k[0])} ${f3(k[1])} ${f3(k[2])} ${f3(k[3])} ${f1(k[4])} ${f1(k[5])})` + (pe.pupil ? pupT : "");
          if (str !== pe.last) {
            pe.last = str;
            pe.el.setAttribute("transform", str);
          }
        }
        const bl = s2.eyes === "shut" ? 1 : blink(t + (o.blinkOffset || 0), { period: 3.9, dur: 0.16 });
        E2.open.forEach((e) => setOp(e, 1 - bl));
        E2.shut.forEach((e) => setOp(e, bl));
        const mo = s2.mouth || (s2.seg ? mouth(s2.seg, t) : { open: 0, shape: "M" });
        for (const k of Object.keys(E2.mouths)) E2.mouths[k].forEach((e) => {
          const on = mo.shape === k || k === "M" && !(mo.shape in E2.mouths);
          setOp(e, on ? 1 : 0);
          if (on && k !== "M") {
            const sy = 0.35 + 0.65 * clamp(mo.open);
            const tr = `translate(0 ${f1(MOUTH[1] * (1 - sy))}) scale(1 ${f3(sy)})`;
            if (e.__tr !== tr) {
              e.__tr = tr;
              const v = e.querySelector(".pp-v");
              if (v) v.setAttribute("transform", tr);
            }
          }
        });
        if (scarfPath) {
          const hist = s2.track || (s2.speed ? (u) => ({ ...s2, d: (s2.d || 0) - (t - u) * s2.speed }) : () => s2);
          const anchor = (u) => {
            const Ru = u === t ? R2 : pose(u, hist(u));
            return point("chest", -14, -118, Ru);
          };
          const L0 = (o.scarfLen || 1) * 8 * R2.sc / 0.6, pts = ribbon(anchor, t, { n: 8, len: L0, lag: 0.04, hang: [-0.6 * R2.dir, 0.8], sag: 0.8, flutter: 18 * R2.sc, freq: 1.3, wave: 1.1, wind: [-(s2.scarfWind != null ? s2.scarfWind : 4) * R2.dir * R2.sc, -2.2 * R2.sc], seed: seedBase });
          scarfPath.setAttribute("d", ribbonPath(pts, 22 * R2.sc, 9 * R2.sc, { twist: 1.2, phase: t * 2.2 }));
        }
        return R2;
      }
    };
    return api;
  }
  var puppetBones = { BONES, IK, CLIPS, SOLE, HIP, HEAD_R };

  // src/styles/world.js
  var NS2 = "http://www.w3.org/2000/svg";
  var PLACES = ["mountain", "forest", "village", "river", "sea", "field", "city", "palace", "garden", "sky"];
  var TIMES = ["day", "dawn", "dusk", "night"];
  var PROPS = ["moon", "sun", "stars", "pine", "tree", "willow", "house", "temple", "bridge", "boat", "flowers", "grass", "rock", "clouds", "tower", "lantern"];
  var ALIAS = {
    \u5C71: "mountain",
    \u5C71\u6797: "forest",
    \u6797: "forest",
    \u68EE\u6797: "forest",
    \u6811\u6797: "forest",
    \u6751: "village",
    \u6751\u5E84: "village",
    \u6CB3: "river",
    \u6C5F: "river",
    \u6E56: "river",
    \u6C60\u5858: "river",
    \u6D77: "sea",
    \u7530\u91CE: "field",
    \u8349\u5730: "field",
    \u57CE: "city",
    \u57CE\u5E02: "city",
    \u5BAB: "palace",
    \u5BAB\u6BBF: "palace",
    \u5929\u5BAB: "palace",
    \u56ED: "garden",
    \u82B1\u56ED: "garden",
    \u5929\u7A7A: "sky",
    \u767D\u5929: "day",
    \u6E05\u6668: "dawn",
    \u9ECE\u660E: "dawn",
    \u9EC4\u660F: "dusk",
    \u508D\u665A: "dusk",
    \u591C: "night",
    \u591C\u665A: "night",
    \u6708: "moon",
    \u6708\u4EAE: "moon",
    \u592A\u9633: "sun",
    \u661F: "stars",
    \u661F\u661F: "stars",
    \u677E: "pine",
    \u6811: "tree",
    \u67F3: "willow",
    \u623F\u5B50: "house",
    \u5E99: "temple",
    \u6865: "bridge",
    \u8239: "boat",
    \u82B1: "flowers",
    \u8349: "grass",
    \u77F3: "rock",
    \u4E91: "clouds",
    \u5854: "tower",
    \u706F\u7B3C: "lantern"
  };
  function parseSetting(s2) {
    if (s2 && typeof s2 === "object") return { place: s2.place || "field", time: s2.time || "day", props: s2.props || [], seed: s2.seed || 1, ...s2 };
    const words = String(s2 || "").split(/[\s,，、/|]+/).filter(Boolean).map((w) => ALIAS[w] || w.toLowerCase());
    const out = { place: "field", time: "day", props: [], seed: 1 };
    for (const w of words) {
      if (PLACES.includes(w)) out.place = w;
      else if (TIMES.includes(w)) out.time = w;
      else if (PROPS.includes(w)) out.props.push(w);
      else if (/^seed=?\d+/.test(w)) out.seed = +w.replace(/\D/g, "");
    }
    return out;
  }
  var g = (parent, cls, attrs = "") => {
    const e = document.createElementNS(NS2, "g");
    e.setAttribute("class", cls);
    if (attrs) attrs.replace(/(\w[\w-]*)="([^"]*)"/g, (_, k, v) => e.setAttribute(k, v));
    parent.appendChild(e);
    return e;
  };
  function paintAll(style2, list2) {
    const M = material(style2.worldMaterial || style2.material), P2 = style2.P || {};
    return list2.map((p, i) => M.paint({ seed: i + 1, ...p, col: p.col || style2.colour(p.role, p.role) }, P2)).join("");
  }
  function buildWorld(sc, style2, setting, o = {}) {
    const v = sc.video, W = v.W, H = v.H, S2 = parseSetting(setting), seed = o.seed || S2.seed || 1;
    const gy0 = o.ground != null && typeof o.ground === "number" ? o.ground : Math.round(H * 0.82);
    const ground = typeof o.ground === "function" ? o.ground : S2.place === "river" || S2.place === "sea" ? () => gy0 : (x) => gy0 + (o.flat ? 0 : 6 * Math.sin(x / 210 + seed));
    const wrap = sc.html(`<svg class="vk-world" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"></svg>`);
    const host = sc.cam || sc.el, bgs = [...host.children].filter((c) => c.classList.contains("vk-bg"));
    host.insertBefore(wrap, bgs.length ? bgs[bgs.length - 1].nextSibling : host.firstChild);
    const L = {}, ctx = { sc, v, W, H, S: S2, seed, ground, gy0, style: style2, wrap, layers: L };
    const M = material(style2.worldMaterial || style2.material), P2 = style2.P || {};
    for (const n of ["sky", "far", "mid", "props", "ground", "actors", "front"]) L[n] = g(wrap, "vw-" + n, n === "actors" ? "" : style2.layerAttrs ? style2.layerAttrs(n, ctx) : M.group(P2, n === "sky" ? "" : "layer"));
    const paint2 = (list2) => paintAll(style2, list2);
    const H2 = style2.hooks || {};
    (H2.sky || defaultSky)(L.sky, ctx);
    if (H2.far !== false) (H2.far || defaultFar)(L.far, ctx, paint2);
    if (H2.mid !== false) (H2.mid || defaultMid)(L.mid, ctx, paint2);
    (H2.props || defaultProps)(L.props, ctx, paint2);
    (H2.ground || defaultGround)(L.ground, ctx, paint2);
    if (H2.front) H2.front(L.front, ctx, paint2);
    if (H2.after) H2.after(ctx, paint2);
    if (o.bake !== false && v.bake) ["sky", "far", "mid", "props", "ground"].forEach((n) => {
      if (L[n].childNodes.length && !L[n].hasAttribute("data-live")) v.bake(L[n], { scale: o.bakeScale || 1 });
    });
    return { svg: wrap, ...L, ground, setting: S2, ctx };
  }
  function skyColours(style2, time) {
    const c = (r) => style2.colour(r, r);
    return time === "night" ? [c("night0"), c("night1")] : time === "dusk" ? [c("dusk0"), c("dusk1")] : time === "dawn" ? [c("dawn0"), c("dawn1")] : [c("sky0"), c("sky1")];
  }
  var gid = 0;
  function defaultSky(el2, ctx) {
    const { W, H, S: S2, style: style2 } = ctx, [a, b] = skyColours(style2, S2.time), id = "vk-sky-" + ++gid;
    let s2 = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="url(#${id})"/>`;
    s2 += celestial(ctx);
    el2.innerHTML = s2;
  }
  function celestial(ctx, o = {}) {
    const { W, S: S2, style: style2 } = ctx, c = (r) => style2.colour(r, r), M = material(style2.worldMaterial || style2.material), P2 = style2.P || {};
    let s2 = "";
    const night = S2.time === "night" || S2.props.includes("moon");
    if (S2.props.includes("stars") || S2.time === "night") for (let i = 0; i < 26; i++) {
      const x = rnd(ctx.seed + 3, i) * W, y = 30 + rnd(ctx.seed + 5, i) * 260, r = 1.4 + rnd(ctx.seed + 7, i) * 2.2;
      s2 += M.paint({ pts: star(x, y, r * 1.8, r * 0.7, 4), col: c("star"), role: "star", seed: i }, P2);
    }
    if (night) {
      const x = o.moonX || W * 0.78, y = o.moonY || 128;
      s2 += M.paint({ pts: ellipse(x, y, 46, 46, 0, 40), col: c("moon"), role: "moon", seed: 9 }, P2);
    } else if (S2.time === "dusk" || S2.time === "dawn" || S2.props.includes("sun")) {
      const x = o.sunX || W * (S2.time === "dawn" ? 0.2 : 0.72), y = S2.time === "day" ? 120 : 250;
      s2 += M.paint({ pts: ellipse(x, y, S2.time === "day" ? 50 : 66, S2.time === "day" ? 50 : 66, 0, 44), col: c("sun"), role: "sun", seed: 8 }, P2);
    }
    if (S2.props.includes("clouds") || S2.time === "day") for (let i = 0; i < 3; i++) {
      const x = 160 + i * 420 + rnd(ctx.seed, i) * 120, y = 90 + rnd(ctx.seed + 1, i) * 90;
      s2 += M.paint({ pts: blob(x, y, 90, 26, ctx.seed + i, 0.2), col: c("cloud"), role: "cloud", op: 0.9, seed: 20 + i }, P2);
    }
    return s2;
  }
  function defaultFar(el2, ctx, paint2) {
    const { W, S: S2, seed, gy0 } = ctx, tall = S2.place === "mountain" ? 1.6 : S2.place === "city" ? 0 : 1;
    if (S2.place === "city") return;
    el2.innerHTML = paint2([{ pts: hills(-40, W + 40, gy0 - 250 * tall, 70 * tall, seed + 0.3, { base: gy0 + 40, freq: 4e-3, peaks: S2.place === "mountain" ? 1.4 : 0 }), role: "far" }]);
  }
  function defaultMid(el2, ctx, paint2) {
    const { W, S: S2, seed, gy0 } = ctx, list2 = [];
    if (S2.place === "city") {
      for (let i = 0; i < 14; i++) {
        const w = 60 + rnd(seed, i) * 70, h3 = 120 + rnd(seed + 2, i) * 240, x = i * 96 - 30;
        list2.push({ pts: rect(x, gy0 - h3, w, h3 + 20), role: i % 2 ? "far" : "mid", orn: windowsOf(x, gy0 - h3, w, h3, seed + i) });
      }
      el2.innerHTML = paint2(list2);
      return;
    }
    const amp = S2.place === "mountain" ? 70 : S2.place === "river" || S2.place === "sea" ? 20 : 40;
    list2.push({ pts: hills(-40, W + 40, gy0 - (S2.place === "mountain" ? 130 : 80), amp, seed + 1.7, { base: gy0 + 40, freq: 6e-3 }), role: "mid" });
    el2.innerHTML = paint2(list2);
  }
  function windowsOf(x, y, w, h3, seed) {
    const out = [];
    for (let r = 0; r < Math.floor(h3 / 34); r++) for (let c = 0; c < Math.floor(w / 22); c++) if (rnd(seed, r * 7 + c) > 0.45) out.push(rect(x + 8 + c * 22, y + 12 + r * 34, 9, 14));
    return out;
  }
  function defaultProps(el2, ctx, paint2) {
    const { W, S: S2, seed, ground, gy0 } = ctx, list2 = [], want = new Set(S2.props);
    const P2 = S2.place;
    if (P2 === "forest" || want.has("tree") || want.has("pine") || P2 === "mountain" || P2 === "village" || P2 === "garden") {
      const kind = want.has("pine") || P2 === "mountain" ? "pine" : want.has("willow") ? "willow" : "round";
      const xs = P2 === "forest" ? [90, 250, 980, 1130, 1230] : [110, 1150];
      xs.forEach((x, i) => {
        const h3 = (P2 === "forest" ? 260 : 220) * (0.75 + 0.4 * rnd(seed + 4, i));
        const T6 = tree(x, ground(x) + 4, h3, { kind, seed: seed + i, lean: (rnd(seed + 6, i) - 0.5) * 0.12 });
        list2.push({ pts: T6.trunk, role: "trunk" });
        T6.crown.forEach((c, j) => list2.push({ pts: c, role: j % 2 ? "leaf2" : "leaf" }));
      });
    }
    if (P2 === "village" || want.has("house")) [[930, 170, 140], [1110, 130, 110]].forEach(([x, w, h3], i) => {
      const Hs = house(x, ground(x) + 2, w, h3, { kind: "cottage" });
      list2.push({ pts: Hs.walls, role: "wall" }, { pts: Hs.roof, role: "roof" }, { pts: Hs.door, role: "door" }, ...Hs.windows.map((p) => ({ pts: p, role: "door", op: 0.85 })));
    });
    if (P2 === "palace" || want.has("temple")) {
      const Hs = house(980, ground(980) + 2, 300, 170, { kind: "temple" });
      list2.push({ pts: rect(820, ground(980) - 10, 320, 14), role: "roof" }, { pts: Hs.walls, role: "wall" }, { pts: Hs.roof, role: "roof" }, { pts: Hs.door, role: "door" });
    }
    if (want.has("rock")) list2.push({ pts: blob(1020, gy0 - 20, 70, 40, seed + 9, 0.2), role: "mid" });
    el2.innerHTML = paint2(list2);
  }
  function defaultGround(el2, ctx, paint2) {
    const { W, H, S: S2, seed, ground, gy0 } = ctx, list2 = [];
    if (S2.place === "river" || S2.place === "sea") {
      list2.push({ pts: waves(-40, W + 40, gy0 - 40, 6, 120, seed, H + 60), role: "water" });
      list2.push({ pts: waves(-40, W + 40, gy0 - 8, 4, 80, seed + 2, H + 60), role: "water2", op: 0.9 });
      list2.push({ pts: [[-40, gy0 + 4], [520, gy0 - 6], [660, gy0 + 20], [660, H + 60], [-40, H + 60]], role: "ground" });
    } else {
      const pts = [[-40, H + 60]];
      for (let x = -40; x <= W + 40; x += 20) pts.push([x, ground(x)]);
      pts.push([W + 40, H + 60]);
      list2.push({ pts, role: "ground" });
      const p2 = [[-40, H + 60]];
      for (let x = -40; x <= W + 40; x += 20) p2.push([x, ground(x) + 44 + 8 * Math.sin(x / 90 + seed)]);
      p2.push([W + 40, H + 60]);
      list2.push({ pts: p2, role: "ground2" });
    }
    if (S2.place === "field" || S2.place === "garden" || S2.props.includes("grass") || S2.place === "forest" || S2.place === "mountain") [70, 300, 520, 760, 870, 1060, 1210].forEach((x, i) => grass(x, ground(x) + 6, 22 + 10 * rnd(seed, i), 5, seed + i).forEach((b) => list2.push({ pts: b, role: "leaf" })));
    if (S2.place === "garden" || S2.props.includes("flowers")) [160, 420, 680, 940, 1180].forEach((x, i) => {
      list2.push({ pts: ellipse(x, ground(x) - 14, 8, 8, 0, 12), role: "flower", orn: [ellipse(x, ground(x) - 14, 3, 3, 0, 8)] });
    });
    el2.innerHTML = paint2(list2);
  }

  // src/styles/transitions.js
  var T2 = {};
  var px = (v) => v.toFixed(1) + "px";
  var poly = (pts) => `polygon(${pts.map((p) => px(p[0]) + " " + px(p[1])).join(",")})`;
  var focal = (c) => ({ x: c.o.x == null ? c.W / 2 : c.o.x <= 1 ? c.o.x * c.W : c.o.x, y: c.o.y == null ? c.H / 2 : c.o.y <= 1 ? c.o.y * c.H : c.o.y });
  function tearEdge(e, W, H, o = {}) {
    const J = o.jag || 26, n = o.n || 34, seed = o.seed || 3, tilt = (o.tilt != null ? o.tilt : 0.18) * H;
    const x0 = -J * 2 - tilt + e * (W + J * 4 + tilt * 2), pts = [[-10, -10]];
    for (let i = 0; i <= n; i++) {
      const y = -10 + (H + 20) * i / n, j = (hash(seed * 31 + i) - 0.5) * 2 * J + (i % 2 ? 0.4 : -0.4) * J;
      pts.push([x0 + j + tilt * (i / n - 0.5), y]);
    }
    pts.push([-10, H + 10]);
    return pts;
  }
  T2.tear = (e, c) => ({ in: { clipPath: poly(tearEdge(e, c.W, c.H, c.o)), filter: e < 1 ? "drop-shadow(-4px 0 6px rgba(0,0,0,.35))" : "" }, out: { transform: `translateX(${(-e * 18).toFixed(1)}px)` } });
  function pixelCols(e, W, H, o = {}) {
    const cell = o.cell || 80, cols = Math.ceil(W / cell), rows2 = Math.ceil(H / cell), pts = [[0, 0]];
    for (let i = 0; i < cols; i++) {
      const d = i / cols * 0.55 + hash(i * 7.1 + (o.seed || 1)) * 0.15, k = clamp01((e - d) / 0.3);
      const hgt = Math.round(k * rows2) * cell;
      pts.push([i * cell, hgt], [(i + 1) * cell, hgt]);
    }
    pts.push([cols * cell, 0]);
    return pts;
  }
  T2.pixel = (e, c) => e >= 1 ? {} : { in: { clipPath: poly(pixelCols(e, c.W, c.H, c.o)) } };
  function scallop(e, cx, cy, R2, o = {}) {
    const k = o.lobes || 9, n = 180, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, lobe = Math.abs(Math.sin(a * k / 2 + (o.phase || 0)));
      pts.push([cx + Math.cos(a) * R2 * e * (0.82 + 0.18 * Math.sqrt(lobe)), cy + Math.sin(a) * R2 * e * (0.82 + 0.18 * Math.sqrt(lobe))]);
    }
    return pts;
  }
  T2.cloud = (e, c) => {
    const f = focal(c), R2 = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y)) * 1.25;
    return e >= 1 ? {} : { in: { clipPath: poly(scallop(Math.max(e, 1e-3), f.x, f.y, R2, { phase: e * 1.2 })) } };
  };
  function blobIris(e, cx, cy, R2, o = {}) {
    const n = 96, st = Math.floor((o.frame || 0) / (o.every || 4)), pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, w = 1 + 0.07 * Math.sin(3 * a + st * 1.7) + 0.04 * Math.sin(7 * a - st * 2.3) + 0.025 * (hash(st * 131 + i) - 0.5);
      pts.push([cx + Math.cos(a) * R2 * e * w, cy + Math.sin(a) * R2 * e * w]);
    }
    return pts;
  }
  T2.scribble = (e, c) => {
    const f = focal(c), R2 = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y)) * 1.15;
    return e >= 1 ? {} : { in: { clipPath: poly(blobIris(Math.max(e, 1e-3), f.x, f.y, R2, { frame: c.frame })) } };
  };
  T2.lamp = (e, c) => {
    const r = c.raw, fl = 0.08 * Math.sin(c.frame * 2.7) * Math.sin(Math.PI * r);
    return { in: { opacity: r >= 0.5 ? 1 : 0 }, flash: clamp01(1 - Math.abs(2 * r - 1) * 1.15 + fl), flashColor: c.o.color || "#1c0c05" };
  };
  T2.scan = (e, c) => {
    const r = c.raw, h3 = Math.max(4e-3, e);
    return r >= 1 ? {} : { in: { clipPath: `inset(${((1 - h3) / 2 * 100).toFixed(3)}% 0% ${((1 - h3) / 2 * 100).toFixed(3)}% 0%)`, filter: `brightness(${(1 + 1.4 * (1 - e)).toFixed(3)})` }, out: { filter: `brightness(${(1 - 0.6 * e).toFixed(3)})` } };
  };
  var STYLE_TRANSITIONS = ["tear", "pixel", "cloud", "scribble", "lamp", "scan"];
  var installed = false;
  function installStyleTransitions() {
    if (installed) return STYLE_TRANSITIONS;
    installed = true;
    for (const k of STYLE_TRANSITIONS) if (!registry.transitions[k]) registry.transitions[k] = T2[k];
    return STYLE_TRANSITIONS;
  }

  // src/styles/index.js
  var STYLES = {};
  var ROLES = ["world", "chars", "type", "motion", "sound", "fx"];
  var ROLE_ALIAS = { bg: "world", background: "world", world: "world", scene: "world", scenes: "world", chars: "chars", char: "chars", character: "chars", characters: "chars", type: "type", typography: "type", text: "type", title: "type", titles: "type", motion: "motion", camera: "motion", pacing: "motion", transitions: "motion", sound: "sound", audio: "sound", music: "sound", fx: "fx", effects: "fx" };
  function registerStyle(data, runtime = {}) {
    const pack = { ...data, ...runtime, id: data.id || runtime.id };
    if (!pack.id) throw new Error("[vk.style] pack needs an id");
    if (pack.theme && typeof pack.theme === "object") {
      registry.themes["style:" + pack.id] = resolveTheme(pack.theme);
      pack.themeName = "style:" + pack.id;
    } else pack.themeName = pack.theme || "tech-blue";
    STYLES[pack.id] = pack;
    return pack;
  }
  function parseToken(tok) {
    if (STYLES[tok]) return { id: tok, role: null };
    const m = /^(.+?)[.:/-](bg|background|world|scene|scenes|chars?|characters?|type|typography|text|titles?|motion|camera|pacing|transitions|sound|audio|music|fx|effects)$/.exec(String(tok));
    if (m && STYLES[m[1]]) return { id: m[1], role: ROLE_ALIAS[m[2]] };
    const id = String(tok).split(/[.:/]/)[0];
    unknownName("styles", STYLES[id] ? tok : id, STYLES[id] ? Object.keys(STYLES).flatMap((s2) => [s2, ...ROLES.map((r) => s2 + "." + r)]) : Object.keys(STYLES), { fatal: true });
  }
  function resolveParts(spec) {
    const parts = {};
    const setAll = (id) => ROLES.forEach((r) => {
      parts[r] = STYLES[id];
    });
    if (typeof spec === "string") spec = spec.split(/\s*[+,]\s*/);
    if (Array.isArray(spec)) {
      spec.forEach((tok, i) => {
        const { id, role } = parseToken(tok);
        if (i === 0) setAll(id);
        if (role) parts[role] = STYLES[id];
        else if (i > 0) setAll(id);
      });
    } else if (spec && typeof spec === "object") {
      const base3 = spec.base || spec.world || spec.bg || Object.values(spec)[0];
      setAll(parseToken(base3).id);
      for (const [k, v] of Object.entries(spec)) {
        if (k === "base") continue;
        const r = ROLE_ALIAS[k];
        if (r) parts[r] = STYLES[parseToken(v).id];
      }
    }
    if (!parts.world) throw new Error("[vk.style] empty style spec");
    return parts;
  }
  var lookup = (pack, name, role) => {
    const H = pack.hues || {}, Pl = pack.palette || {};
    if (name != null && typeof name === "string" && /^(#|rgb|hsl)/.test(name)) return name;
    return H[name] || Pl[name] || H[role] || Pl[role] || (role === "skin2" && H.skin ? shade(H.skin, -0.12) : null) || "#888888";
  };
  var Style = class {
    constructor(spec) {
      installStyleTransitions();
      this.spec = spec;
      this.parts = resolveParts(spec);
      const ids = ROLES.map((r) => this.parts[r].id), uniq = [...new Set(ids)];
      this.id = uniq.length === 1 ? uniq[0] : ROLES.map((r) => r + ":" + this.parts[r].id).join(" ");
      this.base = this.parts.world;
      const W = this.parts.world, Ch = this.parts.chars;
      this.worldView = { id: W.id, material: W.worldMaterial || W.material, P: { ...W.P || {}, ...W.worldP || {} }, hooks: W.hooks || {}, layerAttrs: W.layerAttrs, colour: (n, r) => lookup(W, n, r), pack: W, style: this };
      this.charView = { id: Ch.id, material: Ch.material, P: { ...Ch.P || {} }, colour: (n, r) => lookup(Ch, n, r), pack: Ch, style: this };
    }
    get name() {
      return ROLES.every((r) => this.parts[r] === this.base) ? this.base.name : ROLES.map((r) => this.parts[r].name).filter((x, i, a) => a.indexOf(x) === i).join(" + ");
    }
    get palette() {
      return this.base.palette;
    }
    get qa() {
      return [...new Set(ROLES.flatMap((r) => this.parts[r].qa || []))];
    }
    colour(name, role) {
      return lookup(this.base, name, role);
    }
    // video defaults (an explicit cfg value always wins)
    videoCfg(cfg = {}) {
      const T6 = this.parts.type, M = this.parts.motion, W = this.parts.world, Snd = this.parts.sound, d = {};
      d.theme = T6.themeName;
      const vt = W.video || {};
      if (vt.texture) d.texture = vt.texture;
      if (M.transitions && M.transitions.default) d.transition = M.transitions.default;
      if (M.camera && M.camera.push != null) d.push = M.camera.push;
      if (vt.fadeOut != null) d.fadeOut = vt.fadeOut;
      if (Snd.sound && Snd.sound.scoreOptions) d.scoreOptions = Snd.sound.scoreOptions;
      if (T6.video && T6.video.karaoke) d.karaoke = T6.video.karaoke;
      const out = { ...d, ...cfg };
      delete out.style;
      return out;
    }
    install(v) {
      this.video = v;
      v.style = this;
      const seen = /* @__PURE__ */ new Set();
      for (const r of ROLES) {
        const p = this.parts[r];
        if (seen.has(p)) continue;
        seen.add(p);
        if (p.install) p.install(v, this, r);
      }
      const mats = /* @__PURE__ */ new Set([this.worldView.material, this.charView.material]);
      mats.forEach((m) => {
        const M = material(m);
        if (M.defs) M.defs(v, m === this.charView.material ? this.charView.P : this.worldView.P);
      });
      return this;
    }
    // ---- building blocks ----
    world(sc, setting, o = {}) {
      const W = this.parts.world;
      o = { ...W.worldOptions || {}, ...o };
      const w = buildWorld(sc, this.worldView, setting, o);
      if (W.decorate) W.decorate(sc, w, this, o);
      if (o.post !== false) this.post(sc, o, w);
      return w;
    }
    post(sc, o = {}, w) {
      const W = this.parts.world;
      if (W.post && !sc.__vkPost) {
        sc.__vkPost = true;
        W.post(sc, this, o, w);
      }
      return sc;
    }
    character(parent, o = {}) {
      const Ch = this.parts.chars;
      const opts = Ch.charOptions ? Ch.charOptions({ ...o }, this) : o;
      const p = puppet(parent, { style: this.charView, video: this.video || parent.ownerSVGElement && null, ...opts, P: { ...this.charView.P, ...opts.P || {} } });
      if (Ch.charAfter) Ch.charAfter(p, this, opts);
      return p;
    }
    title(sc, text3, o = {}) {
      const T6 = this.parts.type;
      return T6.title ? T6.title(sc, text3, o, this) : defaultTitle(sc, text3, o);
    }
    label(sc, text3, o = {}) {
      const T6 = this.parts.type;
      return T6.label ? T6.label(sc, text3, o, this) : null;
    }
    effect(sc, name = "signature", o = {}) {
      const F2 = this.parts.fx;
      if (!F2.effect) return null;
      return F2.effect(sc, name, o, this);
    }
    transition(kind = "default") {
      const M = this.parts.motion, T6 = M.transitions || {};
      return T6[kind] || T6.default || "fade:0.5";
    }
    sfx(sc, kind, t, gain = 1) {
      const Sd = this.parts.sound, map = Sd.sound && Sd.sound.sfx || {};
      const e = map[kind];
      if (!e) return;
      [].concat(Array.isArray(e[0]) ? e : [e]).forEach(([voice, g2 = 1, f, dt = 0]) => sc.sfx(t + dt, voice, g2 * gain, f));
    }
    music(v, o = {}) {
      const Sd = this.parts.sound;
      return Sd.music ? Sd.music(v || this.video, o, this) : null;
    }
    get pacing() {
      return { scene: 5, hold: 1, transition: 0.6, ...this.parts.motion.pacing || {} };
    }
    get camera() {
      return { push: 0, punch: 0.1, ...this.parts.motion.camera || {} };
    }
    get voice() {
      return { voice: "zh-CN-XiaoxiaoNeural", rate: "+0%", ...(this.parts.sound.sound || {}).voice || {} };
    }
    toJSON() {
      return { id: this.id, name: this.name, parts: Object.fromEntries(ROLES.map((r) => [r, this.parts[r].id])) };
    }
  };
  function defaultTitle(sc, text3, o) {
    return sc.add(window.vk.title(text3, { at: o.at || 0.3, ...o }));
  }
  function style(spec) {
    return spec instanceof Style ? spec : new Style(spec);
  }
  function listStyles() {
    return Object.values(STYLES).map((p) => ({ id: p.id, name: p.name, en: p.en, description: p.description, material: p.material, tags: p.tags || [] }));
  }

  // src/meta/schemas.js
  var schemas_exports = {};
  __export(schemas_exports, {
    BACKGROUNDS: () => BACKGROUNDS,
    BLOCKS: () => BLOCKS,
    COMMON: () => COMMON,
    EASES_EXTRA: () => EASES_EXTRA,
    EASE_FORMS: () => EASE_FORMS,
    ELEMENTS: () => ELEMENTS,
    FORMAT_PARAMS: () => FORMAT_PARAMS,
    FX: () => FX,
    KIND_ALIASES: () => KIND_ALIASES,
    MATERIAL_PARAMS: () => MATERIAL_PARAMS,
    SOUNDS: () => SOUNDS,
    SOUND_PARAMS: () => SOUND_PARAMS,
    STYLE_API: () => STYLE_API,
    STYLE_PARAMS: () => STYLE_PARAMS,
    TEXTURES: () => TEXTURES,
    THEME_PARAMS: () => THEME_PARAMS,
    THREE: () => THREE,
    THREE_MATERIALS: () => THREE_MATERIALS,
    THREE_MATERIAL_PARAMS: () => THREE_MATERIAL_PARAMS,
    THREE_RIGS: () => THREE_RIGS,
    TRANSITIONS: () => TRANSITIONS,
    easeMeta: () => easeMeta,
    param: () => param
  });
  function param(s2) {
    if (s2 && typeof s2 === "object") return s2;
    const parts = String(s2).split("|"), T6 = /^(number|string|boolean|color|time|ease|fx|array|object|function|any|null|enum\(.*\))$/;
    let n = 1;
    while (n < parts.length - 3 && T6.test(parts[n])) n++;
    const [def, range, ...rest] = parts.slice(n), type = parts.slice(0, n).join("|");
    const p = { type: type || "any" }, d = (def || "").trim();
    if (d !== "") p.default = /^-?(\d|\.\d)/.test(d) && !isNaN(+d) ? +d : d === "true" ? true : d === "false" ? false : d === "null" ? null : d.replace(/^'(.*)'$/, "$1");
    if (range && /\.\./.test(range)) p.range = range.split("..").map(Number);
    const desc = rest.join("|").trim();
    if (desc) p.description = desc;
    const m = /^enum\((.*)\)$/.exec(p.type);
    if (m) {
      p.type = "enum";
      p.values = m[1].split("/");
    }
    return p;
  }
  var E = (description, params2 = {}, example, extra = {}) => ({ description, params: params2, example, ...extra });
  var COMMON = {
    // every element factory (vk.title / vk.text / vk.badge / …) and every fx accept these
    node: {
      at: 'time||| entrance time (scene-local s, "b:8" beat, "+0.3" after the previous element; default: cascade)',
      fx: "fx|||entrance effect name(s), space-combinable ('up blur'); false = none",
      d: "number||0..10|entrance duration (s); default depends on the fx",
      ease: "ease|||easing name / cubic-bezier(a,b,c,d) / spring(k,w) / steps(n)",
      each: "number||0..2|stagger between letters/words/items (s)",
      out: "time|||exit time (scene-local s); exit uses outFx (default: the entrance fx reversed)",
      outFx: "fx|||exit effect",
      sfx: "string|||sound played at the entrance (a sounds name)",
      size: "number|string|||font size: number = px at 720p (auto-scaled) or a theme step 'h1' 'h2' 'body' \u2026",
      color: "color|||text colour (CSS) or a palette name (accent, fg, muted \u2026)",
      bg: "color|||element background",
      weight: "number|||font weight",
      font: "enum(display/mono/sans/serif/condensed/brush)|||font family slot",
      align: "enum(left/center/right)|||text alignment",
      w: "number|||width: \u22641 = fraction of the frame, >1 = px",
      maxW: "number|||max width (same units as w)",
      mt: "number|||margin-top (same units as w)",
      pos: 'object|||absolute position {x, y, right, bottom, anchor:"center"|"tl"\u2026}; leaves the centred flow',
      fixed: "boolean|false||not affected by the scene camera",
      class: "string|||extra CSS class (vk-bleed = allowed outside the safe area)",
      id: "string|||element id",
      style: "string|||inline CSS",
      on: "function|||per-frame hook on(el, local, p, t) \u2014 must depend on time only",
      beat: 'object|||beat pulse {scale, brightness, unit:"beat"|"bar", k, beats:[\u2026]}',
      energy: "object|||music-energy modulation {scale:[a,b], brightness:[a,b], band}",
      markAt: "time|||when **/==/__ inline marks animate"
    },
    // vk.scene(name, dur, opts, nodes) options
    scene: {
      bg: "string|object|array|||'dark' | 'light' | 'accent' (palette mode) | CSS colour | {type:'mesh'|'grid'|\u2026} | array of layers",
      mode: "enum(dark/light/accent)|||palette mode for text",
      transition: "string|object|||entrance transition 'name:seconds' or {type, d, ease, focal:{x,y}}",
      cap: 'string|array|||caption text, ["a","b"] split evenly, or [[start,end,text],\u2026]',
      camera: "array|||camera keys [{t, x, y, s, r, ease}]",
      cameraHold: "boolean|false||omitted camera keys keep the previous value",
      shots: 'array|||shot list [{t, shot:"medium", on: subject, punch, pan, dolly}]',
      push: "number|0|0..0.3|slow push-in over the scene",
      shake: "array|||[{t, amp, d}] handheld shakes",
      texture: "object|||per-scene textures {name: opts}",
      layout: "enum(center/left/top/bottom)|center||content layout",
      sfx: "boolean|true||false = no automatic transition whoosh",
      vo: "string|array|||voice-over text (run `vk tts page.html`); arrays = several lines / speakers",
      voLead: "number|||seconds before the voice starts",
      hold: 'number|2.2||extra seconds after the last animation when dur is "auto"',
      snap: "string|||'beat' | 'bar' | 'b:2' \u2014 extend the cut to the grid",
      start: "time|||absolute start (default: previous end \u2212 transition)",
      end: "time|||absolute cut time",
      beat: "object|||whole-frame beat pulse",
      energy: "object|||whole-frame energy modulation"
    },
    // vk.video(cfg)
    video: {
      format: "string|16:9||'16:9' '1080p' '9:16' '1:1' '4:5' (aliases landscape vertical square portrait) \u2014 or w/h",
      w: "number|||custom width (px)",
      h: "number|||custom height (px)",
      fps: "number|30|1..120|frames per second",
      theme: "string|object|tech-blue||theme name or {extends, modes:{dark:{accent}}}",
      style: "string|array|object|||style pack id(s): 'papercut', ['ink','papercut.chars'], {base, chars, \u2026}",
      transition: "string|fade:0.4||default scene transition 'name:seconds'",
      push: "number|0|0..0.3|default slow push-in per scene",
      ease: "ease|||default ease (theme default otherwise)",
      texture: "object|||film-wide textures {grain: {amount}, vignette: .3, \u2026}",
      bpm: "number|||beat grid tempo",
      beatOffset: "number|0||first beat (s)",
      beats: "array|string|||explicit beat times or a `vk analyze` JSON path",
      music: "string|||music file (mixed at render, ducked under voice)",
      musicStart: "number|0||music offset (s)",
      voice: "object|string|||TTS config {manifest, voice, rate, lead, tail, cast:{who:{voice}}}",
      captions: "array|string|||[[start,end,text]] or an align JSON",
      karaoke: "enum(sweep/on/pop)|sweep||word-timed caption style",
      lyrics: "object|string|||lyric align JSON for vk.lyricVideo",
      mix: "object|||{lufs:-14, duck:-10, fadeOut:2}",
      autoSfx: "boolean|false||whoosh on every transition",
      score: "array|||[[t, sound, gain, freq]] offline-synthesised SFX",
      motionBlur: "object|||sub-frame motion blur {shutter:'1/40', samples:4} (vk render)",
      cover: "object|||defaults for cover transitions {colors, n, axis}",
      fadeOut: "number|||fade the last scene to black over N seconds",
      seed: "number|1||seed of Math.random in setup code",
      strict: "boolean|false||unknown names throw (with did-you-mean); Math.random() during a frame throws. CLI vk peek/qa/render turn it on by default",
      draft: "boolean|false||draft preview quality (lower 3D res/AA, no DOF/bloom); vk peek/render --draft set it",
      manual: "boolean|false||call v.start() yourself",
      bake: "boolean|true||static-layer cache (vk.bake)",
      title: "string|||title shown in contact sheets",
      safe: "object|||override title-safe margins {top,right,bottom,left}"
    },
    fx: { t: "number|||start (filled from at)", d: "number|||duration (s)", ease: "ease|||easing", each: "number|||stagger (s)" },
    transition: { d: "number|0.5|0..3|duration (s): the overlap with the previous scene", ease: "ease|inOutCubic||progress easing", focal: "object|||{x, y} focus point (px or 0\u20131) for iris / zoom / shape transitions" },
    texture: { amount: "number|||strength (0\u20131 for most)" },
    background: { type: "string|||background name" }
  };
  var dist = (d) => ({ dist: `number|${d}|0..400|travel distance (px at 720p)` });
  var per = (d, each) => ({ d: `number|${d}|0..5|per-piece duration (s)`, each: `number|${each}|0..1|stagger between pieces (s)`, stagger: "number|||alias of each" });
  var FX = {
    fade: E("opacity 0 \u2192 1", {}, null, { combinable: true }),
    up: E("fade in while sliding up", dist(28), null, { combinable: true }),
    down: E("fade in while sliding down", dist(28), null, { combinable: true }),
    left: E("fade in from the left", dist(44), null, { combinable: true }),
    right: E("fade in from the right", dist(44), null, { combinable: true }),
    scale: E("fade in from 90 % scale", {}, null, { combinable: true }),
    pop: E("pop from 60 % with overshoot (outBack)", {}, null, { combinable: true }),
    zoom: E("fade in from 115 % scale", {}, null, { combinable: true }),
    blur: E("fade in from a 14 px blur", {}, null, { combinable: true }),
    rise: E("rise from below with blur, outExpo", dist(40), null, { combinable: true }),
    wipe: E("clip-path wipe left \u2192 right", {}, null, { combinable: true }),
    "wipe-left": E("clip-path wipe right \u2192 left", {}, null, { combinable: true }),
    "wipe-up": E("clip-path wipe bottom \u2192 top", {}, null, { combinable: true }),
    "wipe-down": E("clip-path wipe top \u2192 bottom", {}, null, { combinable: true }),
    reveal: E("mask reveal: slides up out of its own clip box", {}, "vk.h2('Reveal', { fx: 'reveal' })", { combinable: true }),
    grow: E("scaleX 0 \u2192 1 from the left edge (bars, rules)", {}, null, { combinable: true }),
    "grow-y": E("scaleY 0 \u2192 1 from the bottom", {}, null, { combinable: true }),
    flip: E("3D flip up around the bottom edge", {}, null, { combinable: true }),
    stretch: E('font-stretch 62 % \u2192 100 % + tracking (needs a variable-width font: font:"display")', {}, "vk.title('STRETCH', { fx: 'stretch', font: 'display' })", { combinable: true }),
    none: E("no animation (visible at once)", {}, null, { combinable: true }),
    letters: E("per-letter slide up from a baseline clip (default title fx)", per(0.6, 0.035), "vk.title('Letters', { fx: 'letters', each: .04 })"),
    "letters-fade": E("per-letter fade + rise", per(0.5, 0.03)),
    "letters-blur": E("per-letter un-blur from 130 %", per(0.7, 0.04)),
    domino: E("per-letter 3D domino fall-in", per(0.55, 0.05)),
    words: E("per-word pop 145 % \u2192 100 % (use | to split CJK manually)", per(0.5, 0.09), "vk.title('\u7528|\u4EE3\u7801|\u5199|\u89C6\u9891', { fx: 'words' })"),
    "words-up": E("per-word push up", per(0.6, 0.08)),
    squash: E("per-letter squash & stretch pop", per(0.55, 0.05)),
    assemble: E("letters fly in from seeded scattered positions", { d: "number|0.9|0..5|duration", spread: "number|1|0..5|scatter radius (em)", seed: "number|7||scatter seed" }),
    wave: E("persistent sine wave per letter", { amp: "number|0.12|0..1|amplitude (em)", speed: "number|6|0..30|rad/s" }),
    type: E("typewriter with caret (reserves the final width)", { cps: "number|30|1..200|characters per second", caret: "boolean|true||show caret", reserve: "boolean|true||keep final width", text: "string|||text to type (default: element text)" }, "vk.text('npm i vidkit', { fx: 'type', cps: 14 })"),
    scramble: E("random-glyph decode into the text (seeded)", { d: "number|0.5||per-letter settle time", each: "number|0.04||stagger", rate: "number|20||glyph changes per second", glyphs: "string|||glyph set" }),
    decode: E("alias of scramble", { d: "number|0.5||", each: "number|0.04||", rate: "number|20||" }, null, { aliasOf: "scramble" }),
    count: E("number counter (thousands separator, decimals, prefix/suffix)", { from: "number|0||start value", to: "number|||end value (default: the text)", decimals: "number|0|0..6|decimals", sep: "string|||thousands separator (',')", d: "number|1.2||duration", prefix: "string|||", suffix: "string|||", format: "function|||v => string" }, "vk.title('0', { fx: 'count', to: 2048, sep: ',' })"),
    highlight: E("animate ==marker== spans (highlighter sweep)", { d: "number|0.6||", each: "number|0.25||" }, "vk.text('mark ==this== part')"),
    marker: E("alias of highlight", {}, null, { aliasOf: "highlight" }),
    underline: E("animate __underline__ spans (draw-in)", { d: "number|0.6||", each: "number|0.25||" }),
    swap: E("keyword colour swap at t", { color: "color|accent||target colour", d: "number|0.3||" }),
    stack: E("kinetic stack: each line fills the box width, alternating entrance directions (vk.stack)", { each: "number|0.22||", d: "number|0.55||", width: "number|||box width (px)" }, "vk.stack(['KINETIC', 'TYPE'])"),
    draw: E("SVG stroke draw-on", { d: "number|1.2||", each: "number|||stagger between paths" }, `vk.svg('<path d="M40 220 C 120 40, 220 40, 260 150"/>', { fx: 'draw', viewBox: '0 0 500 300' })`),
    "draw-fill": E("SVG stroke draw then fill", { d: "number|1.2||", fillD: "number|0.5||fill fade duration", each: "number|||" }),
    fill: E("alias of draw-fill", {}, null, { aliasOf: "draw-fill" }),
    morph: E("SVG shape morph through paths / shapes (beat-synced with beats:n)", { paths: "array|||path strings", shapes: "array|||shape names ['circle','star','heart','square',\u2026]", n: "number|120||resample points", r: "number|100||shape radius", cx: "number|0||", cy: "number|0||", beats: "number|||one step every n beats (needs bpm)", each: "number|||seconds per step", d: "number|0.9||" }),
    ink: E("ink bleed-in (blur + scale)", {}, null, { combinable: true, pack: "ink" }),
    brush: E("brush wipe top \u2192 bottom with soft edge", {}, null, { combinable: true, pack: "ink" }),
    "brush-x": E("brush wipe left \u2192 right", {}, null, { combinable: true, pack: "ink" }),
    stamp: E("seal stamp-in (scale 150 % + rotate)", {}, null, { combinable: true, pack: "ink" }),
    slam: E("poster slam: big scale + rotation + offset \u2192 land (vk.mg)", { echo: "number|0|0..6|ghost copies", shadow: "array|||hard shadow [dx, dy, colour]", wobble: "number|||settle wobble", scale: "number|||start scale", rot: "number|||start rotation (deg)", x: "number|0||", y: "number|0||", dir: "number|1||" }, "vk.title('SLAM', { fx: 'slam', echo: 3 })", { lazy: true }),
    echo: E("echo ghosts scale in behind the text (vk.mg)", { echo: "number|3||ghosts", echoStep: "number|||", echoAlpha: "number|||" }, null, { lazy: true }),
    drop: E("per-letter drop with squash & stretch (vk.mg)", { each: "number|||", d: "number|||", shadow: "array|||[dx,dy,colour]" }, "vk.title('MOTION', { fx: 'drop', shadow: [10, 10, '#0008'] })", { lazy: true }),
    "letters-pop": E("per-letter pop + bob (vk.mg)", { each: "number|||", d: "number|||", bob: "number|||" }, null, { lazy: true }),
    "mask-rise": E("per-letter rise from a mask line (vk.mg)", { each: "number|||", d: "number|||" }, null, { lazy: true }),
    "hard-shadow": E('hard drop shadow grows (combine: "pop hard-shadow") (vk.mg)', { shadowColor: "color|||", shadowX: "number|||", shadowY: "number|||" }, "vk.title('POP', { fx: 'pop hard-shadow' })", { lazy: true, combinable: true })
  };
  var dirs = (base3, what) => Object.fromEntries(["left", "right", "up", "down"].map((d) => [`${base3}-${d}`, E(`${what} (${d})`)]));
  var TRANSITIONS = {
    none: E('hard cut (also "cut")'),
    fade: E("new scene fades in over the old"),
    crossfade: E("both scenes cross-fade"),
    dip: E("dip through black (color option)", { color: "color|#000||dip colour" }),
    flash: E("white flash cut", { color: "color|#fff||flash colour" }),
    ...dirs("slide", "new scene slides in"),
    ...dirs("push", "new scene pushes the old one out"),
    ...dirs("whip", "fast whip pan with motion blur"),
    ...dirs("wipe", "clip wipe"),
    wipe: E("alias of wipe-right", {}, null, { aliasOf: "wipe-right" }),
    "zoom-in": E("zoom in + fade"),
    zoom: E("alias of zoom-in", {}, null, { aliasOf: "zoom-in" }),
    "zoom-out": E("zoom out + fade"),
    blur: E("blur cross-dissolve"),
    "zoom-through": E("old scene scales 40\xD7 through the focal point (e.g. a letter hole)", { scale: "number|40||final scale", focal: "object|||{x, y}" }),
    iris: E("circle iris opens from the focal point", { focal: "object|||{x, y}" }),
    circle: E("alias of iris", {}, null, { aliasOf: "iris" }),
    "iris-out": E("old scene closes into a circle"),
    ...Object.fromEntries(["diamond", "star", "hexagon", "triangle", "heart", "square", "blob"].map((s2) => [`shape-${s2}`, E(`${s2}-shaped mask grows from the focal point`, { focal: "object|||{x, y}" })])),
    split: E("vertical split opens"),
    "split-h": E("horizontal split opens"),
    "split-open": E("old scene splits apart from the middle"),
    diagonal: E("diagonal wipe"),
    blinds: E("venetian blinds", { n: "number|8|2..40|slats" }),
    glitch: E("slice displacement + hue jitter"),
    slice: E("alias of glitch", {}, null, { aliasOf: "glitch" }),
    ink: E("ink drop spreads into the new scene", { x: "number|||focal x", y: "number|||focal y" }, null, { pack: "ink" }),
    wash: E("soft blur wash cross-fade", {}, null, { pack: "ink" }),
    stripes: E("cover: n colour bars slide in staggered then out (vk.mg)", { n: "number|6|1..20|bars", colors: "array|||bar colours", axis: "enum(x/y/alt)|alt||direction", stagger: "number|||", travel: "number|||", reverse: "boolean|false||" }, "vk.scene('B', 4, { transition: 'stripes:0.6' }, [])", { lazy: true, cover: true }),
    bars: E("cover: bars grow across from one side then retract (vk.mg)", { n: "number|6|1..20|bars", colors: "array|||", axis: "enum(x/y/alt)|alt||" }, null, { lazy: true, cover: true }),
    tear: E("paper tear edge sweeps across (style packs)", { jag: "number|26||edge jaggedness px", n: "number|34||edge points", tilt: "number|0.18||diagonal tilt", seed: "number|3||" }, null, { lazy: true, pack: "styles" }),
    pixel: E("blocky staggered pixel fill (style packs)", {}, null, { lazy: true, pack: "styles" }),
    cloud: E("scalloped auspicious-cloud iris (style packs)", {}, null, { lazy: true, pack: "styles" }),
    scribble: E("boiling hand-drawn blob iris (style packs)", {}, null, { lazy: true, pack: "styles" }),
    lamp: E("lamp dip to warm dark with flicker (style packs)", { color: "color|#1c0c05||" }, null, { lazy: true, pack: "styles" }),
    scan: E("CRT scan-line opens vertically (style packs)", {}, null, { lazy: true, pack: "styles" })
  };
  var TEXTURES = {
    grain: E("film grain (seeded tiles, 24 fps refresh)", { amount: "number|0.06|0..1|opacity", blend: "string|overlay||CSS blend mode", fps: "number|24||refresh rate" }, "vk.video({ texture: { grain: { amount: .05 } } })"),
    vignette: E("radial vignette", { amount: "number|0.35|0..1|edge darkness", inner: "number|45|0..100|clear radius (%)" }, "vk.video({ texture: { vignette: .3 } })"),
    flicker: E("projector exposure flicker", { amount: "number|0.03|0..1|", fps: "number|24||" }),
    paper: E("static paper fibre multiply", { amount: "number|0.5|0..1|", color: "color|#F4EEE2||", seed: "number|42||" }),
    halftone: E("halftone dot screen", { size: "number|7||cell px", dot: "number|28|0..100|dot size %", color: "color|||", blend: "string|soft-light||", angle: "number|||" }),
    scanlines: E("CRT scanlines (optional roll)", { amount: "number|0.22|0..1|", size: "number|4||line pitch px", roll: "number|||roll speed" }),
    rgb: E("RGB misregistration (SVG filter on the scene stack)", { amount: "number|2|0..20|offset px", angle: "number|0||deg", pulse: "number|||pulse on beats (k)", fn: "function|||t => multiplier" }),
    rice: E("rice-paper fractal fibres + vignette (ink pack)", { amount: "number|0.55|0..1|", size: "number|300||tile px", freq: "number|0.85||", seed: "number|4||", vignette: "number|0.22||", cache: "boolean|true||" }, null, { pack: "ink" })
  };
  var BACKGROUNDS = {
    gradient: E("linear gradient (optional spin)", { colors: "array|||colours (default bg \u2192 surface)", angle: "number|135||deg", spin: "number|0||deg/s" }, "vk.scene('A', 4, { bg: { type: 'gradient', spin: 10 } }, [])"),
    mesh: E("flowing mesh gradient blobs", { colors: "array|||", speed: "number|0.12||", base: "color|||", size: "number|55||blob size %", opacity: "number|1||", blur: "number|||" }),
    grid: E("line grid (drift)", { size: "number|64||cell px", color: "color|||", width: "number|1||", fade: "boolean|||radial fade", opacity: "number|||", drift: "number|10||px/s", dx: "number|0||", dy: "number|||" }),
    dots: E("dot grid (drift)", { size: "number|28||", color: "color|||", r: "number|2||dot radius", fade: "boolean|||", opacity: "number|||", drift: "number|8||" }),
    noise: E("animated value noise (canvas)", { res: "number|64||", from: "color|||", to: "color|||", scale: "number|3.2||", speed: "number|0.15||", contrast: "number|1.6||", opacity: "number|||" }),
    dotwave: E("radial sine dot field + beat rings + hue cycle (vk.mg, canvas)", { step: "number|||px between dots", color: "color|||", hole: "object|||{w, h, soft} keep text area clear", every: "number|||" }, "vk.scene('A', 4, { bg: { type: 'dotwave', hole: { w: 600, h: 200 } } }, [])", { lazy: true })
  };
  var ELEMENTS = {
    title: E("main title (h1); default fx letters", { size: "number|string|||720p px or 'h1'\u2026" }, "vk.title('Hello\\nworld', { at: .2 })"),
    h2: E("section heading; default fx reveal", {}, "vk.h2('Growth ==6.5\xD7==', { fx: 'words' })"),
    sub: E("subtitle line; default fx up", {}, "vk.sub('**accent** words', { at: 1 })"),
    text: E("body paragraph; default fx up", {}, "vk.text('One or two sentences.', { maxW: .5 })"),
    small: E("small print / footnote; default fx fade", {}, "vk.small('source: \u2026')"),
    label: E("eyebrow label above a title; default fx fade", {}, "vk.label('CHAPTER 2')"),
    hero: E("giant wordmark; default fx letters", { cursor: "boolean|false||accent cursor block after the word", outline: "boolean|false||stroked ghost text", size: "number|||720p px" }, "vk.hero('Spark', { cursor: true })"),
    stack: E("kinetic stacked lines, each scaled to fill the width w (default: the full content width \u2014 set w to keep it small); default fx stack", { w: "number|1||width: 0\u20131 = fraction of the frame, >1 = px" }, "vk.stack(['lint', 'peek', 'render'], { w: .32 })"),
    row: E("horizontal flex row of child nodes", { gap: "number|||px", justify: "string|||CSS justify-content", alignItems: "string|||" }, "vk.row([vk.badge('A'), vk.badge('B')], { gap: 16 })"),
    col: E("vertical column of child nodes", { gap: "number|||px", alignItems: "string|||" }, "vk.col([vk.h2('Title'), vk.text('\u2026')])"),
    grid: E("CSS grid of child nodes", { cols: "number|3||", gap: "number|24||px" }, "vk.grid(items, { cols: 4 })"),
    split: E("two columns (left nodes, right nodes)", { ratio: "string|number|'1/1'||'5/7' (of 12) or 0..1", gap: "number|56||px", alignItems: "string|center||" }, "vk.split([vk.h2('Left')], [vk.terminal(['$ vk peek x.html'])], { ratio: '5/7' })"),
    spacer: E("vertical space (px) between nodes in a column", {}, "vk.spacer(24)"),
    html: E("raw HTML string \u2192 element (single root is returned as-is)", { wrap: "boolean|false||always wrap in a div" }, `vk.html('<div class="vk-h2">raw</div>', { fx: 'up' })`),
    svg: E("inline SVG (markup or inner paths with viewBox); default fx draw", { viewBox: "string|'0 0 400 300'||", strokeWidth: "number|4||", w: "number|||px", h: "number|||px" }, `vk.svg('<path d="M20 150 C120 20 280 280 380 150"/>', { w: 400 })`),
    el: E("custom element: fn(ctx) \u2192 Element (ctx.scene, ctx.px, ctx.at)", {}, "vk.el(ctx => { const d = document.createElement('div'); ctx.scene.on(l => { d.textContent = l.toFixed(1); }); return d; })")
  };
  var BLOCKS = {
    terminal: E('terminal window; "$ " lines type, others fade in', { w: "number|||width" }, "vk.terminal(['$ npm i -g x', '\u2713 done'], { w: 640 })"),
    code: E("code block with light syntax colouring, lines appear", { highlight: "array|||1-based lines", w: "number|||", lang: "string|||" }, "vk.code(src, { highlight: [3] })"),
    cards: E("icon/title/text cards grid", { cols: "number|3||" }, "vk.cards([{ icon: '\u26A1', title: 'Fast', text: '\u2026' }], { cols: 3 })"),
    columns: E("side-by-side columns {title, code, text}"),
    kv: E("key/value rows", { keyW: "number|||key column px" }),
    gantt: E("gantt chart {rows:[{label,start,end,hl}], range, unit}"),
    diagram: E("node/edge diagram with auto arrows {w,h,nodes,edges}"),
    quote: E("pull quote", { by: "string|||attribution" }),
    image: E("image with Ken Burns", { w: "number|||", h: "number|||", from: "object|||{s,x,y}", to: "object|||{s,x,y}" }),
    device: E("browser / phone / laptop frame around an image or nodes", { type: "enum(browser/phone/laptop)|browser||", url: "string|||" }),
    cta: E("call-to-action card {title, sub, cmd, url, note}"),
    badge: E("pill label", { hl: "boolean|false||accent fill" }, "vk.badge('NEW', { hl: true })"),
    bar: E("bar chart from [[label, value], \u2026]", { highlight: "number|||index", unit: "string|||", horizontal: "boolean|false||", colors: "boolean|array|||", source: 'string|||data source (write "\u793A\u4F8B\u6570\u636E"/"sample data" when not real)' }, "vk.bar([['Jan', 12], ['Feb', 19]], { highlight: 1, source: 'sample data' })"),
    line: E("line chart {series:[{name, values}], labels}", { area: "boolean|false||", dots: "boolean|false||", source: "string|||" }),
    pie: E("pie chart"),
    donut: E("donut chart", { r: "number|150||", center: "string|||", centerLabel: "string|||" }),
    ticker: E("animated number with unit/label", { decimals: "number|0||", unit: "string|||", label: "string|||", from: "number|0||" }),
    ring: E("progress ring (percent)", { label: "string|||", r: "number|120||" }),
    table: E("table {header, rows, highlight}", { source: "string|||" }),
    lyrics: E("word-timed kinetic lyric line (vk.lyrics(cue, o))", { style: "enum(pop/rise/karaoke/slam)|pop||" }),
    spectrum: E("spectrum bars driven by analysed mel bands", { bars: "number|32||", h: "number|120||", mirror: "boolean|false||" }),
    vtitle: E("vertical calligraphy title + seal (ink)", { sub: "string|||", seal: "string|||" }),
    chapter: E("corner vertical chapter title (ink)", { no: "string|||" }),
    seal: E("red seal stamp (ink)"),
    endcard: E("ink end card"),
    credits: E("scrolling credits")
  };
  var easeDesc = (n) => /^inOut/.test(n) ? `accelerate then decelerate (${n.slice(5).toLowerCase()})` : /^in/.test(n) ? `accelerate (${n.slice(2).toLowerCase()})` : /^out/.test(n) ? `decelerate (${n.slice(3).toLowerCase()})` : n;
  var EASES_EXTRA = {
    linear: "constant speed",
    spring: "damped spring (overshoots); spring(k,w) for custom",
    house: "signature in-out curve cubic-bezier(.7,0,.2,1) \u2014 one curve for a whole film",
    swift: "fast-out settle cubic-bezier(.2,.8,.2,1)",
    smooth: "Material standard cubic-bezier(.4,0,.2,1)",
    snappy: "fast-out long settle (titles)",
    step: "jump at the end",
    outBack: "decelerate with overshoot",
    inBack: "pull back then go",
    inOutBack: "pull back, overshoot",
    outElastic: "elastic wobble settle",
    outBounce: "bounce at the end",
    inBounce: "bounce at the start"
  };
  var easeMeta = (n) => E(EASES_EXTRA[n] || easeDesc(n), {}, `sc.tween(el, { t: .2, d: .6, from: { opacity: 0 }, to: { opacity: 1 }, ease: '${n}' })`);
  var EASE_FORMS = ["cubic-bezier(x1,y1,x2,y2)", "bezier(x1,y1,x2,y2)", "spring(k,w)", "steps(n)"];
  var THEME_PARAMS = {
    extends: "string|tech-blue||base theme",
    modes: "object|||{dark|light|accent: {bg, fg, muted, surface, line, accent, accent2, onAccent}}",
    mode: "enum(dark/light/accent)|dark||default palette mode",
    fonts: "object|||{sans, display, mono, serif, condensed, brush}",
    scale: "object|||type scale px at 720p {hero, h1, h2, h3, body, small, label, caption}",
    ease: "ease|||default ease",
    cascade: "number|||default gap between element entrances (s)",
    chart: "array|||chart palette",
    caption: "object|||{bg, fg, karaoke}",
    radius: "number|||corner radius px"
  };
  var FORMAT_PARAMS = { w: "number|||width px", h: "number|||height px", safe: "object|||title-safe margins {top,right,bottom,left}", zones: "array|||platform UI zones QA checks", captionBottom: "number|||caption baseline px" };
  var MATERIAL_PARAMS = { P: "object|||pack parameters (line, ornament, rough, \u2026)" };
  var STYLE_PARAMS = {
    roles: "string|||compose roles: 'ink' (all) \xB7 ['ink','papercut.chars'] \xB7 {base, world, chars, type, motion, sound, fx}"
  };
  var STYLE_API = 'const S = v.style; S.world(sc, "mountain dusk pine") \xB7 S.character(W.actors, {look}) \xB7 S.title(sc, text, {sub}) \xB7 S.effect(sc, "signature", {at,x,y}) \xB7 S.transition("default"|"soft"|"strong") \xB7 S.sfx(sc, kind, t) \xB7 S.music(v) \xB7 S.qa (checklist)';
  var SOUNDS = {
    kick: "synth kick",
    bass: "bass hit",
    tick: "clock tick",
    hat: "hi-hat",
    pop: "pop",
    chime: "chime (freq)",
    whoosh: "whoosh (transitions)",
    riser: "riser",
    snap: "finger snap",
    step: "soft footstep thud",
    pluck: "Karplus\u2013Strong guqin/pipa pluck (freq)",
    flute: "bamboo flute (freq)",
    drop: "water drop",
    bubbles: "bubbles",
    splash: "splash",
    ripple: "ripple",
    croak: "frog croak",
    quack: "duck quack",
    honk: "goose honk",
    woodfish: "wooden fish",
    gong: "gong",
    "op-daluo": "opera big gong",
    "op-xiaoluo": "opera small gong",
    "op-nao": "opera cymbals",
    "op-naoMute": "muted cymbals",
    "op-bangu": "bangu drum",
    "op-tanggu": "tanggu drum",
    bangzi: "bangzi clapper",
    chip: "chiptune blip",
    chipJump: "chiptune jump",
    chipHit: "chiptune hit",
    chipNoise: "chiptune noise",
    saw: "saw stab",
    zap: "zap",
    thump: "thump",
    marimba: "marimba (freq)",
    kalimba: "kalimba (freq)",
    rustle: "paper rustle",
    shaker: "shaker"
  };
  var SOUND_PARAMS = { t: 'time|||when (absolute s or "m:4")', gain: "number|1|0..4|", freq: "number|||pitch for tonal voices" };
  var THREE = {
    layer: E('sc.three(setup, update, opts) / sc.three(modules, opts): a three.js scene composited into the layer stack (scene layers sit behind text unless z:"front")', {
      res: "number|0.75|0.1..1|internal resolution scale (draft: 0.35)",
      aa: "number|1|1..16|jittered AA sub-samples (draft: 1)",
      motionBlur: "object|boolean|||{shutter, samples}; default inherits vk.video({motionBlur})",
      camera: "function|object|||rig t \u2192 {pos, target, fov, roll} or a fixed state",
      fov: "number|35|10..120|",
      background: "color|||clear colour (default transparent)",
      assets: "object|||{name: url} preloaded before capture (gltf/glb/hdr/png/json)",
      seed: "number|1||seed of ctx.rand (setup only)",
      z: "enum(back/front)|back||scene layers: behind content",
      rect: "array|||[x, y, w, h] sub-rectangle",
      post: "object|||post stack, see three/post",
      look: "string|array|object|||NPR look chain (see three/look); same as post.look",
      key: "function|||lt => string: skip re-render while unchanged"
    }, "sc.three(({ THREE, scene }) => { const m = new THREE.Mesh(new THREE.TorusKnotGeometry(.6, .2, 128, 16), vk.three.materials.chrome()); scene.add(m); return t => { m.rotation.y = t * .8; }; }, { camera: { pos: [0, 0, 4], target: [0, 0, 0] } })"),
    post: E("post stack (every value may be t => value)", {
      exposure: "number|1||",
      tone: "enum(aces/none)|aces||",
      bloom: "object|boolean|||{strength:.55, threshold:1, knee:.6, radius:1, clamp:40}; false = off (draft: off)",
      grade: "string|object|neutral||'teal-orange' 'cool' 'warm' 'bleach' 'mono' 'cyber' or {temperature, tint, lift, gamma, gain, contrast, saturation}",
      vignette: "number|0.18|0..1|",
      grain: "number|0.02|0..0.2|",
      ca: "number|0|0..2|chromatic aberration",
      dof: "object|boolean|false||{focus, aperture:6, maxBlur:14} (draft: off)",
      fade: "number|0|0..1|fade to fadeColor",
      fadeColor: "color|#000||",
      look: "string|array|object|||NPR look chain after the composite (see three/look)"
    }, "{ post: { bloom: { strength: .4 }, grade: 'cool', dof: { aperture: 4 } } }"),
    turntable: E("product turntable: studio env (PMREM), cyclorama, glossy floor + reflection, contact shadow, strip-light sweeps, DOF autofocus", {
      product: "enum(earbuds/earbud/phone/bottle)|earbuds||procedural product",
      model: "string|object|||GLB url or loaded gltf (auto-scaled to height)",
      height: "number|||model height (units)",
      spin: "number|||deg/s",
      angle: "number|||start yaw (deg)",
      tilt: "number|||deg",
      float: "number|||bob amplitude",
      lid: "function|||t => lid angle (earbuds)",
      sweeps: "array|||[{t, d, from, to, color, radius}] strip-light sweeps",
      sweep: "object|null|||periodic sweep {every, t, d, color}; null = off",
      env: "string|studio||'studio' | 'room' | 'loft' | .hdr url",
      backdrop: "object|boolean|||cyclorama colours {top, horizon, glow}",
      floor: "string|object|||'reflect' | {color, reflect}",
      shadow: "object|boolean|||contact shadow {opacity, darkness, size, res}",
      material: "string|object|||three material name (see three.materials) or a THREE.Material",
      animate: "function|||(t, {product, \u2026}) => void per frame"
    }, "sc.three(vk.three.turntable({ product: 'earbuds', spin: 18, sweeps: [{ t: 1, d: 1.4 }] }), { camera: vk.three.rig.orbit({ radius: 5, dur: 5 }) })"),
    particles: E("50k\u2013200k GPU particles morphing between targets (vertex-shader, pure function of t)", {
      n: "number|60000|1000..300000|particle count",
      targets: "object|||{name: 'galaxy'|'sphere'|'torus'|'cloud'|{type,\u2026}|{text, font}|{draw(g,w,h), w, h}|{image|asset}}",
      morph: "array|||[{t, to, d, style:'converge'|'burst'|'swirl'|'direct'}]",
      beat: "object|function|||{amp, k, every} pulse on the video beat grid",
      intensity: "number|0.35|0..2|additive energy per point",
      size: "number|||point size",
      drift: "number|||",
      twinkle: "number|||0..1",
      flare: "number|||",
      position: "array|||[x,y,z]",
      scale: "number|||",
      seed: "number|||"
    }, "sc.three(vk.three.particles({ n: 80000, targets: { g: 'galaxy', logo: { text: 'vidkit', font: '900 220px Archivo' } }, morph: [{ t: 0, to: 'g' }, { t: 2, to: 'logo', d: 2, style: 'converge' }] }), { camera: { pos: [0, 0, 8], target: [0, 0, 0] } })"),
    product: E("vk.three.product(name, o) \u2192 THREE.Group with userData.parts", { color: "color|||body colour" }, "vk.three.product('phone')"),
    mixer: E("time-driven AnimationMixer: const m = vk.three.mixer(root, clips[, {timeline}]) in setup; m.at(t) in update (never mixer.update(dt)); timeline cross-fades clips as a pure function of t", { once: "boolean|false||LoopOnce + clamp", timeline: "array|||[{t, clip, fade:.3, speed:1, loop:true, offset, weight}]", weights: "object|||{clip: weight | t => weight} explicit blend" }, "const m = vk.three.mixer(gltf.scene, gltf.animations); return t => m.at(t);"),
    studioScene: E("procedural studio light scene (for PMREM or as a backdrop)", { intensity: "number|1||", accent: "color|||" }),
    // Phase B
    look: E("NPR look chain after the composite (post.look or layer opt look): preset name, pass list, or {preset, <pass>: {\u2026}|false}. Presets: ink watercolor papercut pixel neon comic blueprint sketch miniature. Passes: toon posterize palette ink outline edges kuwahara paper halftone pixel glow tiltshift mist hatch (vk.three.look.passes for params)", {
      preset: "string|||look preset to start from",
      passes: "array|||[{type, \u2026params}] in order (params may be t => value)",
      "<pass>": "object|false|||override (or drop) one pass of the preset, e.g. outline: {width: 2}"
    }, "sc.three(vk.three.terrain({ type: 'mountains' }), { post: { look: { preset: 'ink', mist: { density: .6 } } } })"),
    diorama: E("stylised diorama module: kind 'papercut' (layered cut-paper shadow box) | 'popup' (pop-up book: hinged flats rise as the book opens, page turns) | 'isometric' (low-poly island on a plinth, ortho camera) | 'tiltshift' (miniature)", {
      kind: "enum(papercut/popup/isometric/tiltshift)|papercut||",
      palette: "string|array|dusk||dusk dawn forest sea ink candy mono or [colours] (back = last)",
      layers: "number|array|5||papercut: count or [{shape, height, color, z, props, rise}]",
      rise: "object|||papercut layers rise in: {t, d, stagger, order}",
      sun: "boolean|object|||glowing disc {x, y, r, color}",
      frame: "object|false|||shadow-box frame",
      open: "object|||popup: {t, d, ease} opening progress",
      pieces: "array|||popup: [{shape, x, z, height, color, at}] hinged flats",
      spreads: "array|||popup: page turns [{t, d, pieces}]",
      seed: "number|||isometric/tiltshift terrain seed",
      zoom: "number|1.4||isometric ortho zoom",
      trees: "number|70||isometric scatter",
      houses: "number|6||",
      water: "object|false|||{level, color, opacity}",
      toon: "boolean|||toon-shaded paper"
    }, "sc.three(vk.three.diorama({ kind: 'papercut', layers: 6, sun: true, rise: { t: 0, stagger: .12 } }), { camera: vk.three.rig.orbit({ target: [0, 0, -1], radius: 10, from: -6, to: 6, dur: 6 }), post: { look: 'papercut' } })"),
    shaderPlate: E("fullscreen raymarch / SDF / GLSL plate rendered into the HDR scene buffer (so AA jitter, motion-blur sub-frames, bloom, grade and looks apply); camera rays follow the vk.three camera rig", {
      preset: "enum(metaballs/tunnel/nebula/rings)|||",
      sdf: "string|||GLSL defining float map(vec3 p) (helpers: sdSphere sdBox sdTorus opSU rot2 fbm pal calcAO \u2026)",
      shade: "string|||GLSL vec3 shade(vec3 p, vec3 n, vec3 rd, float t)",
      background: "string|||GLSL vec3 bg(vec3 rd)",
      glsl: "string|||raw mode: vec4 image(vec2 uv, vec3 ro, vec3 rd)",
      uniforms: "object|||{uName: number|array|t => value}",
      steps: "number|96||march steps",
      maxDist: "number|40||",
      depth: "boolean|false||write gl_FragDepth so meshes intersect the plate"
    }, "sc.three(vk.three.shaderPlate({ preset: 'metaballs' }), { camera: vk.three.rig.orbit({ radius: 5, dur: 6 }), post: { bloom: { strength: .6 } } })"),
    text3d: E("extruded, bevelled 3D text with per-letter in/out animation (pure in t); bundled fonts archivo-black anton instrument-serif, or any typeface JSON (vk font3d)", {
      text: "string|vidkit||\n for lines",
      font: "string|archivo-black||font id or typeface JSON url",
      size: "number|1||",
      depth: "number|||default size\xB7.25",
      bevel: "object|false|||{size, thickness, segments}",
      material: "string|object|||three material name / THREE.Material / {color, roughness, metalness}",
      sideMaterial: "string|object|||",
      color: "color|#f2ede2||",
      align: "enum(left/center/right)|center||",
      letterSpacing: "number|0||\xD7 size",
      lineHeight: "number|1.25||",
      in: "string|object|||rise drop flip scale spin swing type pop, or {preset, t, d, stagger, order, ease}",
      out: "string|object|||exit (same form)",
      wave: "boolean|object|||{amp, speed, freq}",
      spin: "number|||deg/s of the whole block",
      animate: "function|||(letter, i, t, info) custom per-letter motion",
      position: "array|||",
      shadows: "boolean|false||"
    }, "sc.three(vk.three.text3d({ text: 'HELLO', material: 'gold', in: { preset: 'rise', stagger: .06 } }), { camera: { pos: [0, 0, 6], target: [0, 0, 0] }, env: 'studio' })"),
    sim: E("fixed-dt simulation with exact state snapshots every N steps \u2192 seekable at(t), so parallel render workers agree bit-for-bit (snapshots shared through the vk disk cache)", {
      init: "function|||rand => state (numbers + typed arrays; rand is seeded, init only)",
      step: "function|||(state, dt, t, i) => void \u2014 mutate state; pure in (state, i)",
      dt: "number|0.008333||fixed step (s)",
      every: "number|1||snapshot interval (s)",
      duration: "number|10||simulated span (s)",
      key: "string|||extra cache key (bump when captured constants change)",
      seed: "number|1||rand seed"
    }, "const s = vk.three.sim({ duration: 8, init: () => ({ y: 2, v: 0 }), step: (S, dt) => { S.v -= 9.8 * dt; S.y += S.v * dt; if (S.y < 0) { S.y = 0; S.v *= -.8; } } }); // setup: await s.ready(ctx); update: t => s.at(t).y"),
    terrain: E("heightmap terrain module (procedural fbm/hills/mountains/ridged/island/mesa/dunes, a function, or an image heightmap) with colour ramps, slope rock, snow, strata block, water, contour lines and instanced scatter (pine/tree/rock/house) that can grow in", {
      type: "string|fbm||fbm hills mountains ridged island mesa dunes flat | (x, z) => 0..1",
      heightmap: "string|||image url (luminance \u2192 height)",
      size: "number|10||",
      height: "number|2||",
      segments: "number|128||",
      seed: "number|1||",
      colors: "string|array|alpine||alpine island desert ink paper lava mono or [[h, colour], \u2026]",
      flat: "boolean|false||faceted low-poly shading",
      rock: "color|||slope colour",
      snow: "number|||snow line 0..1",
      contours: "object|||{every, color}",
      block: "object|false|||strata skirt {depth}",
      water: "object|false|||{level, color, opacity}",
      scatter: "array|||[{shape, n, minH, maxH, maxSlope, scale, grow:{t, d}}]",
      falloff: "array|||[r0, r1] radial falloff",
      lights: "boolean|true||",
      shadows: "boolean|true||"
    }, "sc.three(vk.three.terrain({ type: 'mountains', colors: 'ink', scatter: [{ shape: 'pine', n: 300, maxH: .5 }] }), { camera: vk.three.rig.orbit({ radius: 12, height: 5, dur: 8 }) })"),
    globe: E("globe module: Natural Earth land (vendored, public domain) or procedural texture, graticule, atmosphere rim, markers that pop in, great-circle arcs that draw on", {
      texture: "string|earth||'earth' | 'procedural' | image url",
      land: "color|||",
      ocean: "color|||",
      graticule: "boolean|object|||",
      atmosphere: "boolean|object|||{color, power}",
      markers: "array|||[{lat, lon, color, at}]",
      arcs: "array|||[{from:[lat,lon], to:[lat,lon], t, d, color, height}]",
      spin: "number|||deg/s",
      lon0: "number|0||initial longitude facing camera",
      tilt: "number|||deg",
      radius: "number|1.5||"
    }, "sc.three(vk.three.globe({ markers: [{ lat: 31.2, lon: 121.5 }], arcs: [{ from: [31.2, 121.5], to: [51.5, -.1], t: 1 }] }), { camera: { pos: [0, 0, 5], target: [0, 0, 0] } })"),
    model: E("glTF/GLB as a scene module: loads (Draco/meshopt), normalises to size, feet on y=0, mixer timeline animation (pure in t), shadows, auto lights, ground disc, spin", {
      url: "string|||glb/gltf url (first argument)",
      size: "number|||height in world units",
      fit: "enum(height/max)|height||",
      center: "boolean|false||centre vertically instead of feet on ground",
      timeline: "array|||[{t, clip, fade, speed, loop, offset, weight}] cross-faded clips",
      clip: "string|||single looping clip",
      weights: "object|||{clip: weight | t => weight}",
      ground: "boolean|object|||{color, radius, shadowOnly}",
      spin: "number|||deg/s",
      rotation: "array|||deg",
      position: "array|||",
      shadows: "boolean|true||",
      lights: "boolean|true||auto lights when the scene has none"
    }, "sc.three(vk.three.model('assets/models/robot.glb', { size: 2, timeline: [{ t: 0, clip: 'Idle' }, { t: 2, clip: 'Walking', fade: .4 }] }), { env: 'studio' })"),
    shapes: E("pure 2D silhouette generators \u2192 THREE.Shape (ridge hills mountains waves forest city pine tree house pagoda cloud circle crescent star bird boat grass rect path): vk.three.shapes.of(spec) for dioramas, extrusions and paper cut-outs", { shape: "string|||name", seed: "number|||", width: "number|||", height: "number|||", d: "string|||SVG path data for shape 'path'" }, "vk.three.shapes.of({ shape: 'pagoda', height: 2 })")
  };
  var THREE_MATERIALS = {
    chrome: "mirror chrome",
    metal: "brushed metal (roughness .32)",
    gold: "gold metal",
    titanium: "titanium metal",
    anodized: "anodized blue metal + clearcoat",
    glass: "transmission glass (ior, thickness, tint)",
    glassLite: "cheap transparent glass",
    ceramic: "glossy ceramic (clearcoat)",
    plastic: "plastic (roughness .45)",
    matte: "matte",
    rubber: "rubber with sheen",
    screen: "emissive phone screen"
  };
  var THREE_MATERIAL_PARAMS = { color: "color|||", roughness: "number|||0..1", env: "number|||env-map intensity", clearcoat: "number|||0..1" };
  var THREE_RIGS = {
    orbit: E("orbit around a target", { target: "array|[0,0,0]||", radius: "number|||", radius2: "number|||end radius", height: "number|||", height2: "number|||", from: "number|||deg", to: "number|||deg", dur: "number|||", fov: "number|||", ease: "ease|||" }),
    dolly: E("dolly between two positions", { from: "array|||[x,y,z]", to: "array|||", target: "array|||", target2: "array|||", dur: "number|||", fov: "number|||", ease: "ease|||" }),
    push: E("push along a direction", { t: "number|||", dur: "number|||", target: "array|||", dir: "array|||", from: "number|||distance", to: "number|||", ease: "ease|||", fov: "number|||" }),
    fly: E("centripetal Catmull-Rom flythrough at constant speed", { points: "array|||[[x,y,z],\u2026]", look: "array|||look-at point", bank: "number|||", dur: "number|||", ease: "ease|||", fov: "number|||" }),
    crane: E("crane up/back", { target: "array|||", radius: "number|||", radius2: "number|||", y0: "number|||", y1: "number|||", angle: "number|||", angle2: "number|||", dur: "number|||", ease: "ease|||" }),
    zoomScale: E('log-distance zoom ("powers of ten")', { from: "number|||", to: "number|||", dur: "number|||", dir: "array|||", fov: "number|||" }),
    keys: E("keyframes [{t, pos, target, fov, ease}]"),
    seq: E("sequence of rigs [{t, rig, blend}]"),
    shake: E("camera shake modifier", { at: "array|||[t0, t1]", amp: "number|||", rot: "number|||", freq: "number|||" }),
    punch: E("punch-in envelope modifier (same as vk.cam)"),
    add: E("compose: add(base, ...modifiers)")
  };
  var KIND_ALIASES = { transition: "transitions", texture: "textures", background: "backgrounds", bg: "backgrounds", block: "blocks", element: "elements", elements: "elements", nodes: "elements", factories: "elements", theme: "themes", format: "formats", sound: "sounds", ease: "eases", easing: "eases", material: "materials", style: "styles", "three.materials": "threeMaterials", "three.rigs": "threeRigs", rigs: "threeRigs" };

  // src/meta/index.js
  var KINDS2 = ["elements", "fx", "transitions", "textures", "backgrounds", "blocks", "eases", "themes", "formats", "sounds", "materials", "styles", "three", "threeMaterials", "threeRigs"];
  var META = registry.meta || (registry.meta = {});
  KINDS2.forEach((k) => {
    META[k] = META[k] || {};
  });
  var normKind = (k) => KIND_ALIASES[k] || k;
  var BUILTIN = { elements: ELEMENTS, fx: FX, transitions: TRANSITIONS, textures: TEXTURES, backgrounds: BACKGROUNDS, blocks: BLOCKS, three: THREE, threeRigs: THREE_RIGS };
  function names(kind) {
    kind = normKind(kind);
    switch (kind) {
      case "eases":
        return Object.keys(EASE).filter((n) => !/[(]/.test(n));
      case "materials":
        return Object.keys(MATERIALS);
      case "styles":
        return Object.keys(STYLES);
      case "elements":
        return Object.keys(ELEMENTS);
      case "three":
        return Object.keys(THREE);
      case "threeMaterials":
        return Object.keys(THREE_MATERIALS);
      case "threeRigs":
        return Object.keys(THREE_RIGS);
      default:
        return [.../* @__PURE__ */ new Set([...Object.keys(registry[kind] || {}), ...Object.keys(lazy[kind] || {}), ...Object.keys(META[kind] || {})])];
    }
  }
  var params = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, param(v)]));
  function inferParams(impl) {
    const src2 = typeof impl === "function" ? impl.toString() : impl && typeof impl.make === "function" ? impl.make.toString() : "";
    const out = {}, re = /\bo\.(\w+)(?:\s*(?:\|\||\?\?)\s*(-?[\d.]+|'[^']*'|"[^"]*"|true|false)|\s*!=\s*null\s*\?\s*o\.\w+\s*:\s*(-?[\d.]+|'[^']*'|"[^"]*"))?/g;
    let m;
    while (m = re.exec(src2)) {
      if (["t"].includes(m[1])) continue;
      const d = m[2] || m[3];
      const p = out[m[1]] || { type: "any" };
      if (d != null) {
        p.default = /^['"]/.test(d) ? d.slice(1, -1) : d === "true" ? true : d === "false" ? false : +d;
        p.type = typeof p.default;
      }
      out[m[1]] = p;
    }
    return out;
  }
  var defaultExample = (kind, n) => ({
    fx: `vk.title('Hello', { fx: '${n}' })`,
    transitions: `vk.scene('Next', 4, { transition: '${n}:0.6' }, [vk.title('Next')])`,
    textures: `vk.video({ texture: { ${/^[a-z]+$/i.test(n) ? n : `'${n}'`}: { amount: .3 } } })`,
    backgrounds: `vk.scene('A', 4, { bg: { type: '${n}' } }, [vk.title('A')])`,
    blocks: `vk.${n}(\u2026)`,
    themes: `vk.video({ theme: '${n}' })`,
    formats: `vk.video({ format: '${n}' })`,
    sounds: `sc.sfx(1.2, '${n}', .8)`,
    eases: `{ ease: '${n}' }`,
    materials: `{ "material": "${n}" }  // style.json; or vk.style.material('${n}')`,
    styles: `vk.video({ style: '${n}' })`,
    threeMaterials: `vk.three.materials.${n}({ color: 0xffffff })`,
    threeRigs: `camera: vk.three.rig.${n}({ \u2026 })`
  })[kind] || null;
  function aliasMap(kind) {
    const R2 = registry[kind] || {}, by = /* @__PURE__ */ new Map(), out = {};
    for (const [n, f] of Object.entries(R2)) {
      if (!f || typeof f !== "object" && typeof f !== "function") continue;
      if (by.has(f)) out[n] = by.get(f);
      else by.set(f, n);
    }
    return out;
  }
  function describe(kind, name) {
    kind = normKind(kind);
    const custom = (META[kind] || {})[name], impl = (registry[kind] || {})[name], base3 = (BUILTIN[kind] || {})[name];
    let m = custom || impl && impl.meta || base3 || null;
    const e = { name, kind };
    if (kind === "eases") m = easeMeta(name);
    else if (kind === "themes") {
      const th = registry.themes[name] || {};
      const d = (th.modes || {})[th.mode || "dark"] || {};
      m = { description: th.label || name, params: {}, palette: { mode: th.mode, bg: d.bg, fg: d.fg, accent: d.accent, accent2: d.accent2 }, fonts: th.fonts && { display: th.fonts.display, sans: th.fonts.sans } };
    } else if (kind === "formats") {
      const f = registry.formats[name] || {};
      m = { description: `${f.w}\xD7${f.h}`, params: {}, size: [f.w, f.h], safe: f.safe, zones: (f.zones || []).map((z) => z.name) };
    } else if (kind === "materials") {
      const M = MATERIALS[name] || {};
      m = { description: M.label || name, params: {} };
    } else if (kind === "styles") {
      const P2 = STYLES[name] || {};
      m = { description: `${P2.name || name}${P2.en ? " \xB7 " + P2.en : ""} \u2014 ${P2.description || ""}`, params: {}, tags: P2.tags || [], material: P2.material, theme: P2.themeName, transitions: P2.transitions && { default: P2.transitions.default, soft: P2.transitions.soft, strong: P2.transitions.strong }, effects: P2.effects && P2.effects.list, qa: P2.qa || [], requires: P2.requires, api: STYLE_API };
    } else if (kind === "sounds") m = { description: SOUNDS[name] || "", params: SOUND_PARAMS };
    else if (kind === "threeMaterials") m = { description: THREE_MATERIALS[name] || "", params: THREE_MATERIAL_PARAMS, requires: "dist/vidkit-three.js" };
    if (m && (kind === "three" || kind === "threeRigs")) m = { ...m, requires: "dist/vidkit-three.js" };
    if (custom && kind !== "eases" && base3) m = { ...base3, ...custom };
    const al = aliasMap(kind), canon = al[name] || m && m.aliasOf;
    Object.assign(e, { description: m && m.description || "", params: m && m.params ? params(m.params) : impl ? inferParams(impl) : {} });
    if (m) {
      for (const k of Object.keys(m)) if (!["description", "params", "example"].includes(k) && m[k] != null) e[k] = m[k];
    }
    if (canon && canon !== name) e.aliasOf = canon;
    const aliases = Object.entries(al).filter(([a, c]) => c === name).map(([a]) => a);
    if (aliases.length) e.aliases = aliases;
    if (!impl && lazy[kind] && lazy[kind][name]) e.lazy = true;
    e.example = m && m.example || defaultExample(kind, name);
    e.source = custom || impl && impl.meta ? "plugin" : "builtin";
    return e;
  }
  function common(kind) {
    const k = normKind(kind);
    const c = { elements: COMMON.node, fx: COMMON.node, transitions: COMMON.transition, textures: COMMON.texture, backgrounds: COMMON.background, themes: THEME_PARAMS, formats: FORMAT_PARAMS, threeMaterials: THREE_MATERIAL_PARAMS, styles: STYLE_PARAMS, materials: MATERIAL_PARAMS }[k];
    return c ? params(c) : null;
  }
  function listDetail(kind, o = {}) {
    kind = normKind(kind);
    const N = o.all || o.detail ? names(kind) : ["elements", "eases", "materials", "styles", "three", "threeMaterials", "threeRigs"].includes(kind) ? names(kind) : Object.keys(registry[kind] || {});
    return o.detail ? N.map((n) => describe(kind, n)) : N;
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
    const names2 = String(fxStr || "fade").trim().split(/\s+/);
    names2.forEach((n) => ensureLazy("fx", n));
    const api = fxApi(scene, isExit);
    names2.forEach((n) => {
      if (!registry.fx[n]) unknownName("fx", n, names("fx"));
    });
    const first = registry.fx[names2[0]];
    if (typeof first === "function") {
      first(el2, o, api);
      return;
    }
    let from = {}, to = {}, instant = {}, ease2 = null, origin = null;
    names2.forEach((nm) => {
      const f = registry.fx[nm];
      if (!f) return;
      if (typeof f === "function") {
        f(el2, o, api);
        return;
      }
      const r = typeof f.make === "function" ? f.make(o, el2) : f;
      Object.assign(from, r.from);
      Object.assign(to, r.to);
      if (r.instant) Object.assign(instant, r.instant);
      if (r.ease && !ease2) ease2 = r.ease;
      if (r.origin) origin = r.origin;
    });
    let e = o.ease || ease2 || defaultEase();
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
    const B4 = beat === true ? { scale: 0.06 } : beat, E2 = energy === true ? { scale: [1, 1.08] } : energy;
    const S2 = v.tl.state(el2);
    return (t) => {
      let sc = 1, rot = 0, br = 1, bv = 0, ev = 0;
      if (B4) {
        bv = beatValue(v, B4, t);
        if (B4.scale) sc *= 1 + B4.scale * bv;
        if (B4.rotate) rot += B4.rotate * bv;
        if (B4.brightness) br *= 1 + B4.brightness * bv;
      }
      if (E2) {
        ev = energyValue(v, E2, t);
        if (E2.scale) sc *= lerp2(E2.scale, ev);
        if (E2.rotate) rot += lerp2(E2.rotate, ev) - (Array.isArray(E2.rotate) ? 0 : 1);
        if (E2.brightness) br *= lerp2(E2.brightness, ev);
      }
      el2.style.scale = Math.abs(sc - 1) > 1e-4 ? sc.toFixed(4) : "";
      el2.style.rotate = Math.abs(rot) > 1e-3 ? rot.toFixed(3) + "deg" : "";
      if (B4 && B4.brightness || E2 && E2.brightness) {
        const own = S2.props.blur || S2.props.brightness;
        const base3 = own ? String(el2.style.filter || "").replace(/\s*brightness\([^)]*\)\s*$/, "") : "";
        el2.style.filter = (base3 ? base3 + " " : "") + (Math.abs(br - 1) > 1e-3 ? `brightness(${br.toFixed(3)})` : "");
      }
      el2.style.setProperty("--beat", bv.toFixed(3));
      el2.style.setProperty("--e", ev.toFixed(3));
    };
  }

  // src/audio/words.js
  var PUNCT = /[\s.,!?;:…、，。！？；：“”‘’"'()（）《》【】\-—~·]/;
  var norm = (s2) => String(s2).replace(new RegExp(PUNCT.source, "g"), "").toLowerCase();
  function mapWords(text3, words) {
    const pieces = [], T6 = String(text3);
    let pos = 0;
    words.forEach((w, wi) => {
      const key = norm(w.w);
      if (!key) return;
      for (let a = pos; a < T6.length; a++) {
        if (PUNCT.test(T6[a])) continue;
        let b = a, acc = "";
        while (b < T6.length && acc.length < key.length) {
          if (!PUNCT.test(T6[b])) acc += T6[b].toLowerCase();
          b++;
        }
        if (acc === key) {
          if (a > pos) pieces.push({ s: T6.slice(pos, a), wi: -1 });
          pieces.push({ s: T6.slice(a, b), wi });
          pos = b;
          return;
        }
        if (a - pos > 40) break;
      }
    });
    if (pos < T6.length) pieces.push({ s: T6.slice(pos), wi: -1 });
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
    // camera keys [{t, x, y, s, r, ease}] (an omitted x/y = frame centre, s = 1 as before; o.hold:true or
    // vk.video({cameraHold:true}) = omitted fields hold the previous key), or a function lt → {x, y, s, r}
    camera(keys, o = {}) {
      this.ensureCam();
      this.el.dataset.camKeys = "1";
      if (typeof keys === "function") {
        this.camCfg.fn = keys;
        return this;
      }
      const hold2 = o.hold != null ? o.hold : this.video.cfg.cameraHold === true;
      this.camCfg.keys = normKeys(keys.map((k) => ({ ...k, t: this.time(k.t) })), this.video.W, this.video.H, { hold: hold2 });
      return this;
    }
    // shot list (core/camera.js shotCamera): wide/medium/close/extreme-close framing of a subject, follow cams,
    // punch-ins, pans, dollies, heads kept in frame. o: {subject, keep: [subject fns], margin, bounds, lag, minS, maxS}
    shots(list2, o = {}) {
      this.ensureCam();
      this.el.dataset.camKeys = "1";
      this.camCfg.fn = shotCamera(list2.map((e) => ({ ...e, t: this.time(e.t || 0) })), { W: this.video.W, H: this.video.H, ...o });
      return this;
    }
    // world point → screen px at scene-local time lt through this scene's camera (keys / shots / push; shake ignored)
    toScreen(p, lt = 0) {
      const c = this.camCfg, W = this.video.W, H = this.video.H;
      const k = c.fn ? c.fn(lt) : c.keys ? camAt(c.keys, lt) : { x: W / 2, y: H / 2, s: 1 };
      const s2 = k.s * (c.push ? 1 + c.push * Math.min(1, lt / (this.dur || 1)) : 1);
      return [W / 2 + (p[0] - k.x) * s2, H / 2 + (p[1] - k.y) * s2];
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
    // canvas painters (vk.accents.*, vk.mg.dotwave/morphSeq/converge …) stacked on one canvas layer: sc.paint([p1, p2], {z, blend, motionBlur})
    paint(painters, o = {}) {
      const P2 = [].concat(painters).filter(Boolean);
      return this.canvas((g2, local, info) => P2.forEach((p) => {
        g2.save();
        p(g2, local, info);
        g2.restore();
      }), o);
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
        unknownName("textures", name, Object.keys(this.video.constructor.registry.textures));
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
      const S2 = this.voSegs || [];
      if (i == null) return this.voEnd || 0;
      const s2 = S2[i];
      return s2 ? s2.end : 0;
    }
    // 0..1 "is talking" envelope at scene-local time for line i (or any line when i is null / a `who` string).
    // Uses TTS word timings; without TTS audio yet, a 4 Hz syllable estimate over the planned span.
    speaking(local, i) {
      const S2 = (this.voSegs || []).filter((s2, j) => i == null || j === i || s2.who === i);
      let v = 0;
      for (const s2 of S2) {
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
    if (name && !F[name]) unknownName("formats", name, Object.keys(F));
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

  // src/runtime/css.js
  function fontFaces(base3) {
    const f = (fam, file, extra = "") => `@font-face{font-family:"${fam}";src:url("${base3}${file}") format("truetype");font-display:block;${extra}}`;
    return f("Noto Sans SC", "NotoSansSC-VF.ttf", "font-weight:100 900;") + f("JetBrains Mono", "JetBrainsMono-VF.ttf", "font-weight:100 800;") + f("Archivo", "Archivo-VF.ttf", "font-weight:100 900;font-stretch:62% 125%;") + f("Anton", "Anton-Regular.ttf", "font-weight:400;") + f("Instrument Serif", "InstrumentSerif-Regular.ttf", "font-weight:400;font-style:normal;") + f("Instrument Serif", "InstrumentSerif-Italic.ttf", "font-weight:400;font-style:italic;") + f("Ma Shan Zheng", "MaShanZheng-Regular.ttf", "font-weight:400;") + // brush calligraphy (ink theme)
    f("Noto Serif SC", "NotoSerifSC-VF.ttf", "font-weight:200 900;") + // serif body/captions (ink theme); fetched only when used
    f("ZCOOL KuaiLe", "ZCOOLKuaiLe-Regular.ttf", "font-weight:400;") + // rounded hand-lettering (crayon picture-book style pack)
    f("Archivo Black", "ArchivoBlack-Regular.ttf", "font-weight:100 900;");
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
.vk-cover{position:absolute;left:0;top:0;width:100%;height:100%;z-index:20;pointer-events:none}
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
  var TAU3 = Math.PI * 2;
  var dbAmp = (db) => Math.pow(10, db / 20);
  function biquad(type, f, q = 0.707, sr = 48e3, gainDb = 0) {
    const w = TAU3 * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), s2 = Math.sin(w), al = s2 / (2 * q), A = Math.pow(10, gainDb / 40);
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
    const n = Math.max(1, Math.floor(sr * dur)), out = new Float32Array(n), rnd2 = mulberry32(o.seed || 7);
    const decay = o.decay || 2.5, bright = o.bright != null ? o.bright : 0.45, pos = o.pos || 0.18;
    const maxD = Math.ceil(sr / Math.max(20, f * Math.pow(2, Math.min(0, o.slide && o.slide.to || 0) / 12) * 0.9)) + 4;
    const buf = new Float32Array(maxD + 2);
    let w = 0;
    const D0 = sr / f, exc = Math.floor(D0);
    const burst3 = new Float32Array(exc), lp = biquad("lowpass", 800 + 7e3 * bright, 0.7, sr), P2 = Math.max(1, Math.round(exc * pos));
    for (let i = 0; i < exc; i++) burst3[i] = lp(rnd2() * 2 - 1);
    for (let i = exc - 1; i >= P2; i--) burst3[i] -= burst3[i - P2];
    const g2 = Math.pow(10, -3 / (f * decay));
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
        semi += v.depth * amt2 * Math.sin(TAU3 * v.rate * t);
      }
      const D = Math.min(maxD - 1, Math.max(2, sr / (f * Math.pow(2, semi / 12)) - 0.5));
      let r = w - D;
      while (r < 0) r += maxD;
      const i0 = Math.floor(r), fr = r - i0, a = buf[i0 % maxD], b = buf[(i0 + 1) % maxD];
      const d = a + (b - a) * fr;
      const s2 = g2 * ((1 - bright * 0.5) * 0.5 * (d + prev) + bright * 0.5 * d);
      prev = d;
      const x = (i < exc ? burst3[i] : 0) + s2;
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
    const n = Math.max(1, Math.floor(sr * dur)), out = new Float32Array(n), rnd2 = mulberry32(o.seed || 11);
    const at = o.attack || 0.12, rel = o.release || 0.25, H = o.harm || [1, 0.32, 0.12, 0.05], br = o.breath != null ? o.breath : 0.25;
    const vib = o.vib || { rate: 5.2, depth: 0.22 }, bp = biquad("bandpass", f * 2, 1.4, sr), bp2 = biquad("bandpass", f * 4, 2, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, e = Math.min(1, t / at) * Math.min(1, (dur - t) / rel);
      const va = Math.min(1, Math.max(0, (t - 0.25) / 0.4)), semi = vib.depth * va * Math.sin(TAU3 * vib.rate * t) + (o.bend ? o.bend * Math.max(0, 1 - t / 0.12) : 0);
      ph += TAU3 * f * Math.pow(2, semi / 12) / sr;
      let s2 = 0;
      for (let k = 0; k < H.length; k++) s2 += H[k] * Math.sin(ph * (k + 1));
      const nz = rnd2() * 2 - 1, breath = (bp(nz) * 1.5 + bp2(nz) * 0.5) * (br * (0.4 + 0.6 * Math.exp(-t / at * 1.5)));
      out[i] = (s2 * 0.6 + breath) * Math.max(0, e);
    }
    return normPeak(out, o.peak != null ? o.peak : 0.8);
  }
  function drop(sr, o = {}) {
    const f0 = o.f || 700, dur = o.dur || 0.18, n = Math.floor(sr * dur), out = new Float32Array(n), rnd2 = mulberry32(o.seed || 3);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, f = f0 * (1 + 1.8 * (1 - Math.exp(-t / 0.018)));
      ph += TAU3 * f / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.045) + (i < 40 ? (rnd2() - 0.5) * 0.6 * (1 - i / 40) : 0);
    }
    return normPeak(out, o.peak || 0.8);
  }
  function bubbles(sr, o = {}) {
    const k = o.count || 5, dur = o.dur || 0.6, out = new Float32Array(Math.floor(sr * dur)), rnd2 = mulberry32(o.seed || 9);
    for (let j = 0; j < k; j++) {
      const d = drop(sr, { f: 900 + rnd2() * 900, dur: 0.09, seed: j + 1, peak: 0.5 + rnd2() * 0.4 });
      mixInto(out, d, Math.floor(j / k * dur * 0.8 * sr + rnd2() * 1500), 1);
    }
    return normPeak(out, o.peak || 0.7);
  }
  function splash(sr, o = {}) {
    const dur = o.dur || 0.45, n = Math.floor(sr * dur), out = new Float32Array(n), rnd2 = mulberry32(o.seed || 5);
    const bp = biquad("bandpass", o.f || 1600, 0.7, sr), lp = biquad("lowpass", 5e3, 0.7, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      out[i] = lp(bp(rnd2() * 2 - 1)) * envAD(t, 0.012, dur / 4) * (1 + 0.5 * Math.sin(TAU3 * 13 * t));
    }
    return normPeak(out, o.peak || 0.7);
  }
  function croak(sr, o = {}) {
    const dur = o.dur || 0.32, n = Math.floor(sr * dur), out = new Float32Array(n), rate = o.rate || 38, fc = o.f || 520;
    const P2 = Math.floor(dur * rate);
    for (let k = 0; k < P2; k++) {
      const t0 = k / rate, amp = Math.sin(Math.PI * (k + 0.5) / P2);
      for (let i = Math.floor(t0 * sr); i < Math.min(n, Math.floor((t0 + 0.02) * sr)); i++) {
        const tau = i / sr - t0;
        out[i] += amp * (Math.sin(TAU3 * fc * tau) * 0.8 + Math.sin(TAU3 * fc * 2.1 * tau) * 0.3 + Math.sin(TAU3 * 140 * tau) * 0.5) * Math.exp(-tau / 45e-4);
      }
    }
    const lp = biquad("lowpass", 2200, 0.8, sr);
    for (let i = 0; i < n; i++) out[i] = lp(out[i]);
    return normPeak(out, o.peak || 0.85);
  }
  function quack(sr, o = {}) {
    const dur = o.dur || 0.24, n = Math.floor(sr * dur), out = new Float32Array(n), f0 = o.f0 || 260, f12 = o.f1 || 190;
    const F2 = (o.formants || [1050, 2400]).map((f, j) => biquad("bandpass", f, j ? 5 : 4, sr)), hp = biquad("highpass", 300, 0.7, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, p = t / dur, f = f0 + (f12 - f0) * p + 8 * Math.sin(TAU3 * 30 * t);
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
    const bp = biquad("bandpass", f * 2.7, 6, sr), rnd2 = mulberry32(o.seed || 2);
    for (let i = 0; i < n; i++) {
      const t = i / sr, ff = f * (1 - 0.45 * Math.min(1, t / 0.08));
      ph += TAU3 * ff / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.045) + bp(rnd2() * 2 - 1) * Math.exp(-t / 6e-3) * 2;
    }
    return normPeak(out, o.peak || 0.8);
  }
  function gong(sr, o = {}) {
    const dur = o.dur || 4, n = Math.floor(sr * dur), out = new Float32Array(n), f = o.f || 110;
    const parts = [[1, 1, 3.2], [2.01, 0.5, 2.4], [2.98, 0.25, 1.6], [4.16, 0.12, 1.1], [5.43, 0.06, 0.8]];
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let s2 = 0;
      for (const [m, a, d] of parts) s2 += a * Math.sin(TAU3 * f * m * t + m) * Math.exp(-t / d) * (1 + 0.15 * Math.sin(TAU3 * 0.7 * m * t));
      out[i] = s2 * Math.min(1, t / 0.01);
    }
    return normPeak(out, o.peak || 0.8);
  }
  function normPeak(x, peak = 0.9) {
    let m = 1e-9;
    for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
    const g2 = peak / m;
    for (let i = 0; i < x.length; i++) x[i] *= g2;
    return x;
  }
  function mixInto(dst, src2, at, gain = 1) {
    const a = Math.max(0, at | 0);
    for (let i = 0; i < src2.length && a + i < dst.length; i++) dst[a + i] += src2[i] * gain;
    return dst;
  }
  function mixStereo(L, R2, src2, at, gain = 1, pan = 0) {
    const a = (pan + 1) * Math.PI / 4, gl2 = Math.cos(a) * gain, gr = Math.sin(a) * gain, s2 = Math.max(0, at | 0);
    for (let i = 0; i < src2.length && s2 + i < L.length; i++) {
      L[s2 + i] += src2[i] * gl2;
      R2[s2 + i] += src2[i] * gr;
    }
  }
  function reverb([L, R2], sr, o = {}) {
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
    return [chan(L, 0), chan(R2, 23)];
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
    const S2 = [0, 2, 4, 7, 9], o = Math.floor(degree / 5), d = (degree % 5 + 5) % 5;
    return root * Math.pow(2, o + S2[d] / 12);
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
  V.step = (k, t, v) => {
    k.noise(t, 0.07, "lowpass", 420, 0.7, 0.55 * v);
    k.tone(t, "sine", 95, 55, 0.09, 0.35 * v);
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
      const rnd2 = mulberry32(77), nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = rnd2() * 2 - 1;
      const env2 = (g2, t, a, peak, dcy) => {
        g2.gain.setValueAtTime(1e-4, t);
        g2.gain.exponentialRampToValueAtTime(Math.max(peak, 1e-4), t + a);
        g2.gain.exponentialRampToValueAtTime(1e-4, t + a + dcy);
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
          const g2 = ac.createGain();
          env2(g2, t, a || 2e-3, peak, len2);
          s2.connect(f);
          f.connect(g2);
          g2.connect(out);
          s2.start(t, rnd2() * 0.5, len2 + (a || 0) + 0.05);
          return f;
        },
        sr: ac.sampleRate,
        cache: /* @__PURE__ */ new Map(),
        // play a synthesised mono buffer (key caches identical sounds); pan −1..1
        buf(t, key, make2, gain = 1, pan = 0) {
          let b = this.cache.get(key);
          if (!b) {
            const x = make2();
            b = ac.createBuffer(1, x.length, ac.sampleRate);
            b.copyToChannel(x, 0);
            this.cache.set(key, b);
          }
          const s2 = ac.createBufferSource();
          s2.buffer = b;
          const g2 = ac.createGain();
          g2.gain.value = gain;
          s2.connect(g2);
          if (pan && ac.createStereoPanner) {
            const p = ac.createStereoPanner();
            p.pan.value = pan;
            g2.connect(p);
            p.connect(out);
          } else g2.connect(out);
          s2.start(t);
          return s2;
        },
        tone(t, type, f0, f12, len2, peak) {
          const o = ac.createOscillator();
          o.type = type;
          o.frequency.setValueAtTime(f0, t);
          if (f12) o.frequency.exponentialRampToValueAtTime(f12, t + len2 * 0.5);
          const g2 = ac.createGain();
          env2(g2, t, 3e-3, peak, len2);
          o.connect(g2);
          g2.connect(out);
          o.start(t);
          o.stop(t + len2 + 0.05);
        }
      };
      if (opts.pad) opts.pad.forEach((f) => {
        const o = ac.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const g2 = ac.createGain();
        const pg = opts.padGain || 0.04;
        g2.gain.setValueAtTime(1e-4, 0);
        g2.gain.exponentialRampToValueAtTime(pg, 1.5);
        g2.gain.setValueAtTime(pg, Math.max(1.6, dur - 1.5));
        g2.gain.exponentialRampToValueAtTime(1e-4, dur);
        o.connect(g2);
        g2.connect(out);
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
    const ui2 = { update(tt) {
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
    return ui2;
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
    const R2 = (el2) => {
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
      const r = R2(el2);
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
      const cr = R2(capEl);
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
  function textBoxes(v) {
    const { stage, W } = v, sr = stage.getBoundingClientRect(), sx = sr.width / W, out = [];
    const opac = (el2) => {
      let o = 1;
      for (let e = el2; e && e !== stage; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden") return 0;
        o *= +cs.opacity;
      }
      return o;
    };
    const tw = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT), seen = /* @__PURE__ */ new Map();
    while (tw.nextNode()) {
      const n = tw.currentNode;
      if (!n.textContent.trim()) continue;
      const el2 = n.parentElement;
      if (!el2 || el2.closest('[data-qa="ignore"]') || el2.closest("svg") && !el2.closest("foreignObject")) continue;
      if (!el2.closest(".vk-scene.on") && !el2.closest(".vk-cap")) continue;
      const o = opac(el2);
      if (o < 0.05) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        if (r.width < 2 || r.height < 2) continue;
        let host = el2;
        while (host.parentElement && host.parentElement !== stage && (getComputedStyle(host).display === "inline" || /\bvk-(c|ch|chi|word|w|wordwrap|line)\b/.test(typeof host.className === "string" ? host.className : ""))) host = host.parentElement;
        const cs = getComputedStyle(el2), b = { l: (r.left - sr.left) / sx, t: (r.top - sr.top) / sx, r: (r.right - sr.left) / sx, b: (r.bottom - sr.top) / sx };
        let e = seen.get(host);
        if (!e) {
          e = { text: (host.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60), l: b.l, t: b.t, r: b.r, b: b.b, color: cs.color, fill: cs.webkitTextFillColor, stroke: parseFloat(cs.webkitTextStrokeWidth) || 0, shadow: cs.textShadow !== "none", size: parseFloat(cs.fontSize) || 16, opacity: o, label: host.tagName.toLowerCase() + (typeof host.className === "string" && host.className.trim() ? "." + host.className.trim().split(/\s+/).slice(0, 2).join(".") : "") };
          seen.set(host, e);
        }
        e.l = Math.min(e.l, b.l);
        e.t = Math.min(e.t, b.t);
        e.r = Math.max(e.r, b.r);
        e.b = Math.max(e.b, b.b);
        e.opacity = Math.min(e.opacity, o);
      }
    }
    return [...seen.values()];
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
      const E2 = this.env, arr = typeof band === "number" ? (E2.bands || [])[band] : E2[band];
      if (!arr || !arr.length) return 0;
      const x = (t + this.leadT + this.start) * E2.rate;
      if (!smooth) return sample(arr, x);
      const r = Math.max(1, Math.round(smooth * E2.rate));
      let s2 = 0, n = 0;
      for (let i = -r; i <= r; i += Math.max(1, Math.floor(r / 6))) {
        s2 += sample(arr, x + i);
        n++;
      }
      return s2 / n;
    }
    // exponential decay since the most recent onset (strength-weighted); min: ignore onsets weaker than this (0..1)
    onsetHit(t, k = 10, min = 0.3) {
      const T6 = this.onsets, tt = t + this.leadT;
      let lo = 0, hi = T6.length - 1, j = -1;
      while (lo <= hi) {
        const m = lo + hi >> 1;
        if (T6[m] <= tt) {
          j = m;
          lo = m + 1;
        } else hi = m - 1;
      }
      for (let i = j; i >= 0 && tt - T6[i] < 1.5; i--) if (this.onsetStrength[i] >= min) return this.onsetStrength[i] * Math.exp(-k * (tt - T6[i]));
      return 0;
    }
    // strong onsets in [a, b) (video time) — e.g. to place sfx or kinetic hits
    onsetsIn(a, b, min = 0.3) {
      return this.onsets.filter((t, i) => t >= a && t < b && this.onsetStrength[i] >= min);
    }
    section(t) {
      const S2 = this.sections;
      for (let i = S2.length - 1; i >= 0; i--) if (t >= S2[i].start) return { ...S2[i], p: clamp01((t - S2[i].start) / (S2[i].end - S2[i].start)) };
      return S2[0] ? { ...S2[0], p: 0 } : null;
    }
  };
  function sample(arr, x) {
    if (x <= 0) return arr[0];
    const i = Math.floor(x);
    if (i >= arr.length - 1) return arr[arr.length - 1];
    const f = x - i;
    return arr[i] * (1 - f) + arr[i + 1] * f;
  }

  // src/fx/mg/math.js
  var math_exports = {};
  __export(math_exports, {
    P: () => P,
    accumAlpha: () => accumAlpha,
    convergeAt: () => convergeAt,
    coverAxis: () => coverAxis,
    coverBars: () => coverBars,
    coverRects: () => coverRects,
    cursorAt: () => cursorAt,
    dotwaveAt: () => dotwaveAt,
    echoGhosts: () => echoGhosts,
    eqLevel: () => eqLevel,
    hardShadow: () => hardShadow,
    lerpPts: () => lerpPts,
    letterDrop: () => letterDrop,
    likePop: () => likePop,
    maskRise: () => maskRise,
    montageSlot: () => montageSlot,
    morphState: () => morphState,
    motionBlurCfg: () => motionBlurCfg,
    outlinePoints: () => outlinePoints,
    parseShutter: () => parseShutter,
    pressAt: () => pressAt,
    recentBeats: () => recentBeats,
    shapeOutline: () => shapeOutline,
    shapeVerts: () => shapeVerts,
    slam: () => slam,
    subTimes: () => subTimes,
    timecode: () => timecode,
    toggleKnob: () => toggleKnob
  });
  var TAU4 = Math.PI * 2;
  var P = (t, s2, d) => clamp01((t - s2) / (d || 1e-9));
  function parseShutter(v, fps = 30) {
    if (v == null || v === false || v === "off" || v === "none") return 0;
    if (typeof v === "number") return v > 0 ? v : 0;
    const s2 = String(v).trim();
    let m = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s2);
    if (m) return +m[2] ? +m[1] / +m[2] : 0;
    m = /^(\d+(?:\.\d+)?)\s*(?:deg|°)$/.exec(s2);
    if (m) return +m[1] / 360 / fps;
    m = /^(\d+(?:\.\d+)?)\s*ms$/.exec(s2);
    if (m) return +m[1] / 1e3;
    const n = parseFloat(s2);
    return n > 0 ? n : 0;
  }
  function motionBlurCfg(o, fps = 30) {
    if (!o) return null;
    if (o === true) o = {};
    else if (typeof o !== "object") o = { shutter: o };
    const shutter = parseShutter(o.shutter != null ? o.shutter : "1/40", fps), samples = Math.max(1, Math.round(+o.samples || 4));
    if (!(shutter > 0) || samples < 2) return null;
    return { shutter, samples, phase: clamp01(+o.phase || 0) };
  }
  function subTimes(t, shutter, samples, phase = 0) {
    if (!(shutter > 0) || !(samples >= 2)) return [t];
    return Array.from({ length: samples }, (_, k) => Math.max(0, t + shutter * (k / (samples - 1) - (1 - phase))));
  }
  var accumAlpha = (k) => 1 / (k + 1);
  function coverBars(local, d, o = {}) {
    const n = Math.max(1, o.n || 6), at = o.at != null ? o.at : 0.5, tc = d * at, st = o.stagger != null ? o.stagger : Math.min(0.018, d / (4 * n));
    const tin = o.travel || Math.max(0.04, Math.min(tc, d - tc) - st * (n - 1));
    const ein = EASE[o.easeIn || "outExpo"] || EASE.outExpo, eout = EASE[o.easeOut || "inExpo"] || EASE.inExpo;
    const bars = [];
    for (let i = 0; i < n; i++) {
      const j = o.reverse ? n - 1 - i : i;
      const pin = P(local, tc - tin - st * (n - 1 - j), tin), pout = P(local, tc + st * j, tin);
      let a, b;
      if (pout > 0) {
        const e = eout(pout);
        if (e >= 1 - 1e-6) continue;
        [a, b] = o.mode === "grow" ? [e, 1] : [e, 1 + e];
      } else if (pin > 0) {
        const e = ein(pin);
        if (e <= 1e-6) continue;
        [a, b] = o.mode === "grow" ? [0, e] : [e - 1, e];
      } else continue;
      bars.push({ i, a: clamp(a, 0, 1), b: clamp(b, 0, 1) });
    }
    return { cut: tc, bars: bars.filter((x) => x.b > x.a) };
  }
  var coverAxis = (axis, index = 0) => axis === "x" || axis === "y" ? axis : index % 2 ? "x" : "y";
  function coverRects(bars, n, axis, W, H) {
    return bars.map(({ i, a, b }) => axis === "x" ? { i, x: a * W - 1, y: i * H / n - 1, w: (b - a) * W + 2, h: H / n + 2 } : { i, x: i * W / n - 1, y: a * H - 1, w: W / n + 2, h: (b - a) * H + 2 });
  }
  function shapeVerts(kind, o = {}) {
    const top = -Math.PI / 2;
    const ngon = (k, R2 = 1, rot = top) => Array.from({ length: k }, (_, i) => {
      const a = rot + i / k * TAU4;
      return [Math.cos(a) * R2, Math.sin(a) * R2];
    });
    switch (kind) {
      case "square":
        return ngon(4, o.r || 1.15, top + Math.PI / 4);
      case "diamond":
        return ngon(4, o.r || 1.15);
      case "triangle":
        return ngon(3, o.r || 1.25);
      case "hexagon":
        return ngon(6, o.r || 1.05);
      case "polygon":
        return ngon(o.sides || 5, o.r || 1.1);
      case "star": {
        const k = o.points || 5, inner = o.inner || 0.45, v = [];
        for (let i = 0; i < k * 2; i++) {
          const a = top + i / (k * 2) * TAU4, r = i % 2 ? inner : 1;
          v.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        return v;
      }
      default:
        return null;
    }
  }
  function outlinePoints(verts, N = 120) {
    const segs = [];
    let L = 0;
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i], b = verts[(i + 1) % verts.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push([a, b, d]);
      L += d;
    }
    const out = [];
    for (let k = 0; k < N; k++) {
      let s2 = k / N * L, i = 0;
      while (s2 > segs[i][2] && i < segs.length - 1) {
        s2 -= segs[i][2];
        i++;
      }
      const [a, b, d] = segs[i], u = d ? s2 / d : 0;
      out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
    }
    return out;
  }
  function shapeOutline(kind, N = 120, o = {}) {
    const v = kind === "circle" ? null : shapeVerts(kind, o);
    if (v) return outlinePoints(startAtTop(v), N);
    return Array.from({ length: N }, (_, i) => {
      const a = -Math.PI / 2 + i / N * TAU4;
      return [Math.cos(a), Math.sin(a)];
    });
  }
  function startAtTop(v) {
    for (let i = 0; i < v.length; i++) {
      const a = v[i], b = v[(i + 1) % v.length];
      if (Math.abs(a[0]) < 1e-12 && a[1] < 0) return v.slice(i).concat(v.slice(0, i));
      if (a[0] < 0 && b[0] > 0) {
        const u = -a[0] / (b[0] - a[0]), y = lerp(a[1], b[1], u);
        if (y < 0) return [[0, y]].concat(v.slice(i + 1), v.slice(0, i + 1));
      }
    }
    return v;
  }
  var lerpPts = (A, B4, p) => A.map((a, i) => [lerp(a[0], B4[i][0], p), lerp(a[1], B4[i][1], p)]);
  function morphState(bp, n, o = {}) {
    const k = clamp(Math.floor(bp + 1e-9), 0, n - 1), lb = bp - k, d = o.d || 0.75;
    const m = k === 0 ? 1 : (EASE[o.ease || "outBack"] || EASE.outBack)(P(lb, 0, d));
    return { k, from: Math.max(0, k - 1), m, lb };
  }
  function dotwaveAt(x, y, t, ba, o = {}) {
    const cx = o.cx != null ? o.cx : 960, cy = o.cy != null ? o.cy : 540, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    const env2 = o.env != null ? o.env : 1;
    const w = Math.sin(d * (o.freq || 0.011) - t * (o.speed || 8.5));
    const rB = ba * (o.ringSpeed || 1500), sw = Math.exp(-Math.pow((d - rB) / (o.ringW || 90), 2));
    const hole = o.hole ? clamp01(Math.max(Math.abs(dx - (o.hole.x || 0)) - o.hole.w / 2, Math.abs(dy - (o.hole.y || 0)) - o.hole.h / 2) / (o.hole.soft || 90)) : 1;
    const size2 = ((o.base != null ? o.base : 3) + (o.amp != null ? o.amp : 15) * Math.max(0, w) * env2 + (o.ringAmp != null ? o.ringAmp : 24) * sw * env2) * hole * env2;
    const hue = (((o.hue != null ? o.hue : 250) + d * (o.hueSpread != null ? o.hueSpread : 0.12) - t * (o.hueSpeed != null ? o.hueSpeed : 140) + w * 25) % 360 + 360) % 360;
    return { size: size2, hue, w, ring: sw };
  }
  function letterDrop(p, o = {}) {
    const e = EASE.outBack(clamp01(p)), c = EASE.outCubic(clamp01(p));
    return { y: lerp(-(o.from != null ? o.from : 800), 0, e), sx: lerp(o.sx != null ? o.sx : 0.8, 1, c), sy: lerp(o.sy != null ? o.sy : 1.5, 1, c) };
  }
  function slam(p, o = {}) {
    const e = EASE[o.ease || "outExpo"](clamp01(p)), dir = o.dir || 1;
    return { s: lerp(o.scale != null ? o.scale : 2.8, 1, e), rot: dir * lerp(o.rot != null ? o.rot : 20, 0, e), x: dir * lerp(o.x || 0, 0, e), y: lerp(o.y || 0, 0, e), a: clamp01(p * (o.fadeK || 8)) };
  }
  function echoGhosts(p, o = {}) {
    const n = o.n || 3, q = 1 - clamp01(p), out = [];
    if (q <= 0) return out;
    for (let g2 = n; g2 >= 1; g2--) out.push({ g: g2, s: 1 + g2 * (o.step != null ? o.step : 0.16) * q, a: (o.alpha != null ? o.alpha : 0.15) * q, dx: (o.dx || 0) * g2 * q, dy: (o.dy || 0) * g2 * q });
    return out;
  }
  var hardShadow = (p, dx = 10, dy = 10) => {
    const e = EASE.outCubic(clamp01(p));
    return { dx: dx * e, dy: dy * e };
  };
  var maskRise = (p, from = 1.15) => lerp(from, 0, EASE.outExpo(clamp01(p)));
  function cursorAt(keys, t) {
    if (!keys.length) return [0, 0];
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i], p = EASE.inOutCubic(P(t, a[0], b[0] - a[0]));
      return [lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
    }
    const l = keys[keys.length - 1];
    return [l[1], l[2]];
  }
  var pressAt = (clicks, t, s2 = 0.88, hold2 = 0.08) => clicks.some((c) => t > c - 0.02 && t < c + hold2) ? s2 : 1;
  function toggleKnob(p) {
    const q = clamp01(p), sq = 1 + 0.25 * Math.sin(Math.PI * q);
    return { x: EASE.outBack(q), sx: sq, sy: 1 / Math.sqrt(sq) };
  }
  function likePop(dt) {
    if (dt < 0) return { s: 1, c: 0, burst: 0 };
    const p = dt / 0.5;
    return { s: 1 + 0.5 * Math.exp(-p * 4.5) * Math.cos(p * 10), c: clamp01(p * 6), burst: clamp01(dt / 0.4) };
  }
  var eqLevel = (t, i, o = {}) => (o.min != null ? o.min : 0.18) + (1 - (o.min != null ? o.min : 0.18)) * (0.5 + 0.5 * Math.sin(t * (o.speed || 11) + i * (o.phase || 1.1)));
  function montageSlot(lt, every, n) {
    const idx = clamp(Math.floor(lt / every + 1e-9), 0, n - 1);
    return { idx, ft: lt - idx * every };
  }
  function timecode(t, fps = 30) {
    const f = Math.floor(t * fps + 1e-6), s2 = Math.floor(f / fps), m = Math.floor(s2 / 60);
    return `${String(m).padStart(2, "0")}:${String(s2 % 60).padStart(2, "0")}:${String(f % fps).padStart(2, "0")}`;
  }
  function convergeAt(i, p, o = {}) {
    const seed = o.seed || 0, a = hash(i + seed) * TAU4 + p * (o.spin != null ? o.spin : 1.5), d = ((o.near || 900) + hash(i + 50 + seed) * (o.far || 500)) * (1 - p);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, size: lerp((o.size || 46) + hash(i + 9 + seed) * (o.sizeVar || 40), o.end || 4, p), rot: p * 6 + i, kind: i % 3 };
  }
  function recentBeats(grid2, t, n = 4, every = 1, from = -Infinity) {
    const tt = t + (grid2.leadT || 0), bi = Math.floor(grid2.index(tt) / every + 1e-6), out = [];
    for (let k = bi - n + 1; k <= bi; k++) {
      const tb = grid2.at(k * every);
      if (tb < from - 1e-6) continue;
      const age = tt - tb;
      if (age >= 0) out.push({ b: k, age });
    }
    return out;
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
      this.mb = o.motionBlur && !o.keep ? motionBlurCfg(o.motionBlur === "video" ? video.cfg.motionBlur : o.motionBlur, video.fps) : null;
    }
    render(local, info) {
      const g2 = this.ctx;
      g2.setTransform(1, 0, 0, 1, 0, 0);
      if (!this.o.keep) g2.clearRect(0, 0, this.el.width, this.el.height);
      const mb = this.mb && !this.video.mbPipeline ? this.mb : null;
      if (!mb) {
        g2.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        g2.save();
        this.draw(g2, local, info);
        g2.restore();
        return;
      }
      if (!this.off) {
        this.off = document.createElement("canvas");
        this.off.width = this.el.width;
        this.off.height = this.el.height;
        this.og = this.off.getContext("2d");
      }
      const og = this.og, ts = subTimes(info.t, mb.shutter, mb.samples, mb.phase), fps = info.fps || this.video.fps;
      g2.globalCompositeOperation = "lighter";
      g2.globalAlpha = 1 / ts.length;
      for (const tt of ts) {
        og.setTransform(1, 0, 0, 1, 0, 0);
        og.clearRect(0, 0, this.off.width, this.off.height);
        og.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        const dl = local - (info.t - tt);
        og.save();
        this.draw(og, dl, { ...info, t: tt, local: dl, frame: Math.floor(tt * fps), sub: true });
        og.restore();
        g2.drawImage(this.off, 0, 0);
      }
      g2.globalCompositeOperation = "source-over";
      g2.globalAlpha = 1;
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
    const el2 = sc.el, T6 = (x) => parseTime(x, v.beats, sc.start);
    el2.querySelectorAll("[data-stagger]").forEach((box) => {
      const kids = [...box.children], each = +box.dataset.stagger || 0.15, t = T6(box.dataset.t);
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
      const o = { t: T6(ds.t), each: ds.each ? +ds.each : void 0, color: ds.color, d: ds.d != null ? +ds.d : void 0, ease: ds.ease, dist: ds.dist ? +ds.dist : void 0 };
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
      if (ds.exit != null) applyFx(it, ds.exitFx || (/^(type|count|swap|letters|words)$/.test(fx) ? "fade" : fx), { t: T6(ds.exit), d: ds.exitD ? +ds.exitD : 0.4 }, sc, true);
    });
    if (el2.dataset.push) sc.push(parseFloat(el2.dataset.push) / (/%$/.test(el2.dataset.push) ? 100 : 1));
    if (el2.dataset.shake) el2.dataset.shake.split(";").filter((x) => x.trim()).forEach((x) => {
      const p = x.split(",");
      sc.shake(T6(p[0]), +p[1], p[2] ? +p[2] : void 0);
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
    const num3 = (v, d) => {
      if (v == null || v === "") return d;
      v = String(v).trim();
      return v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);
    };
    const userUnits = filterEl && filterEl.getAttribute("filterUnits") === "userSpaceOnUse";
    const g2 = (k) => filterEl ? filterEl.getAttribute(k) : null;
    if (userUnits) return { x: num3(g2("x"), b.x - 0.1 * b.width), y: num3(g2("y"), b.y - 0.1 * b.height), width: num3(g2("width"), 1.2 * b.width), height: num3(g2("height"), 1.2 * b.height) };
    const fx = num3(g2("x"), -0.1), fy = num3(g2("y"), -0.1), fw = num3(g2("width"), 1.2), fh = num3(g2("height"), 1.2);
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
  var px2 = (v) => {
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
    let w = px2(svg3.getAttribute("width")), h3 = px2(svg3.getAttribute("height"));
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
    const w = px2(s2.getAttribute("width"));
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
      const g2 = document.createElementNS(SVGNS, "g");
      for (const a of SELF_LIVE) if (el2.hasAttribute(a) && a !== "style" && a !== "id") g2.setAttribute(a, el2.getAttribute(a));
      g2.setAttribute("data-vk-baked", `${pw}x${ph}`);
      g2.appendChild(im);
      el2.replaceWith(g2);
      el2.__vkBaked = g2;
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
  async function bakeTile(svgMarkup, cssW, cssH, scale2 = 1) {
    const res = (window.devicePixelRatio || 1) * scale2, pw = Math.max(1, Math.round(cssW * res)), ph = Math.max(1, Math.round(cssH * res));
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
      this.strict = setStrict(cfg.strict != null ? !!cfg.strict : Q.get("strict") === "1");
      this.draft = cfg.draft != null ? !!cfg.draft : Q.get("draft") === "1";
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
      this.motionBlur = motionBlurCfg(cfg.motionBlur, this.fps);
      this.mbPipeline = Q.get("mb") === "1";
      this.frameT = null;
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
      Math.random = guardedRandom(r);
      this.stage = document.getElementById("stage") || mk("div", null, document.body || document.documentElement);
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
      Object.entries(th.scale).forEach(([n, px4]) => st.setProperty("--vk-fs-" + n, Math.round(px4 * k) + "px"));
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
    // preload work that must finish before capture (vk.three assets, shader compiles …): a promise, or fn() → promise
    // called once web fonts have loaded. Unlike bakeLater it always runs (also with --no-cache).
    waitFor(job) {
      (this.waits || (this.waits = [])).push(job);
      return this;
    }
    runWaits() {
      const W = (this.waits || []).splice(0);
      return W.length ? Promise.all(W.map((j) => typeof j === "function" ? j() : j)) : null;
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
      ensureLazy("transitions", sc.transition.type);
      if (sc.transition.d && !registry.transitions[sc.transition.type]) unknownName("transitions", sc.transition.type, names("transitions"));
      if (sc.transition.ease) getEase(sc.transition.ease);
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
      if (o.camera) sc.camera(o.camera, { hold: o.cameraHold });
      if (o.shots) sc.shots(o.shots, o.shotOptions || {});
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
      const name = typeof spec === "string" ? spec : spec.type;
      ensureLazy("backgrounds", name);
      const f = registry.backgrounds[name];
      if (!f) {
        unknownName("backgrounds", name, names("backgrounds"));
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
        unknownName("textures", name, names("textures"));
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
      this.tl.els.forEach((S2) => {
        if (S2.owner !== sc) return;
        Object.values(S2.props).forEach((arr) => arr.forEach((tr) => {
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
      const S2 = this.scenes;
      this.duration = this.cfg.duration || S2.reduce((m, s2) => Math.max(m, s2.start + s2.dur), 0);
      S2.forEach((sc, i) => {
        if (!sc.cap) return;
        const nx = S2[i + 1];
        const end = Math.min(sc.end, nx ? nx.start + Math.min(0.15, nx.transition.d) : sc.end) - 0.3;
        [].concat(sc.cap).forEach((c, j, arr) => {
          const a = sc.start + (i ? Math.max(0.35, sc.transition.d) : 0.4), span = (end - a) / arr.length;
          if (typeof c === "string") this.caps.push([a + j * span, a + (j + 1) * span - (j < arr.length - 1 ? 0.05 : 0), c]);
          else this.caps.push([sc.start + c[0], sc.start + c[1], c[2], c[3]]);
        });
      });
      this.caps.sort((a, b) => a[0] - b[0]);
      for (const e of this.events) if (typeof e[1] === "string" && !registry.sounds[e[1]]) unknownName("sounds", e[1], names("sounds"));
      if (S2.some((sc) => sc.transition.d && (registry.transitions[sc.transition.type] || {}).cover)) {
        const dpr = this.coverDpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
        this.coverEl = mk("canvas", "vk-cover", this.stage);
        this.coverEl.width = Math.round(this.W * dpr);
        this.coverEl.height = Math.round(this.H * dpr);
        this.coverG = this.coverEl.getContext("2d");
      }
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
      const RP = window.__vkReadyProf = { init: performance.now() };
      window.__ready = Promise.all([
        Promise.all(fontsCheck.map((f) => document.fonts.load(f, "\u4E2D\u6587Aa0"))).catch(() => {
        }),
        Promise.all([...this.stage.querySelectorAll("img")].map((im) => im.decode ? im.decode().catch(() => {
        }) : null))
      ]).then(() => document.fonts.ready).then(() => {
        RP.fonts = performance.now();
        this.afterFonts.forEach((f) => f());
        return this.runBakes();
      }).then(() => {
        RP.bakes = performance.now();
        return this.runWaits();
      }).then(() => {
        RP.waits = performance.now();
        this.booting = true;
        try {
          this.render(this.curT);
        } finally {
          this.booting = false;
        }
        RP.first = performance.now();
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
        __scenes: S2.map((s2) => ({ index: s2.index, name: s2.name, start: s2.start, dur: s2.dur, transition: s2.transition, settle: this.settleOf(s2), vo: s2.vo ? { at: s2.vo.at, dur: s2.vo.dur, missing: !s2.vo.entry } : null })),
        __cues: this.events.map((e) => e[0]),
        __vk: { theme: this.cfg.theme || "tech-blue", format: this.format, safe: this.safe, zones: this.zones, title: this.cfg.title || document.title },
        __text: (t) => {
          if (t != null) this.render(t);
          return visibleText(this.stage);
        },
        // frameT: the nominal frame time when `vk render` samples sub-frames for motion blur (HUDs/timecodes stay sharp on it)
        __seek: (t, frameT) => {
          this.render(t, frameT);
          return Promise.all(this.pendingMedia).then(() => t);
        },
        __motionBlur: this.motionBlur,
        __strict: this.strict,
        __draft: this.draft,
        __beats: this.beatsInfo(),
        // beat/bar grid inside [0, duration] (vk studio draws it on the timeline)
        __qa: (t) => {
          if (t != null) this.render(t);
          return runQA(this);
        },
        __textBoxes: (t) => {
          if (t != null) this.render(t);
          return textBoxes(this);
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
    // the beat grid as plain times (bpm / beats / bars inside the film) — read by `vk studio`; null without bpm/beats
    beatsInfo() {
      const g2 = this.beats, D = this.duration;
      if (!g2 || !g2.active || !(D > 0) || !(g2.beat > 0)) return null;
      const beats = [], bars = [];
      for (let n = Math.ceil(g2.index(0) - 1e-6), t; beats.length < 4e3 && (t = g2.at(n)) <= D + 1e-6; n++) if (t >= -1e-6) beats.push(+t.toFixed(4));
      for (let k = Math.ceil(g2.barIndex(0) - 1e-6), t; bars.length < 1e3 && (t = g2.measure(k)) <= D + 1e-6; k++) if (t >= -1e-6) bars.push(+t.toFixed(4));
      return { bpm: +(+g2.bpm || 60 / g2.beat).toFixed(3), meter: g2.meter, beats, bars };
    }
    /* ---------------- render(t): pure ---------------- */
    render(t, frameT) {
      STRICT.frame++;
      STRICT.t = t;
      try {
        this.renderFrame(t, frameT);
      } finally {
        STRICT.frame--;
      }
    }
    renderFrame(t, frameT) {
      t = Math.max(0, Math.min(t, this.duration - 1e-6));
      this.curT = t;
      this.frameT = frameT != null ? Math.max(0, Math.min(+frameT, this.duration - 1e-6)) : t;
      const S2 = this.scenes, active = [], W = this.W, H = this.H;
      let flash2 = 0, flashColor = "#fff", covers = null;
      for (const sc of S2) {
        const local = t - sc.start, on = local >= 0 && local < sc.dur;
        if (sc.el.classList.contains("on") !== on) sc.el.classList.toggle("on", on);
        if (!on) continue;
        active.push(sc);
        sc.__st = { opacity: "", transform: "", filter: "", clipPath: "", maskImage: "", webkitMaskImage: "", transformOrigin: "", zIndex: String(sc.index + 1) };
      }
      for (const sc of active) {
        const tr = sc.transition, local = t - sc.start;
        if (!tr.d || local >= tr.d) continue;
        const T6 = registry.transitions[tr.type] || registry.transitions.fade;
        const raw = local / tr.d, prev = S2[sc.index - 1];
        const r = T6(getEase(tr.ease || "inOutCubic")(raw), { raw, local, W, H, fps: this.fps, frame: Math.floor(t * this.fps), o: tr, video: this, inScene: sc, outScene: prev }) || {};
        if (r.in) Object.assign(sc.__st, r.in);
        if (r.out && prev && prev.__st) Object.assign(prev.__st, r.out);
        if (r.under && prev && prev.__st) {
          sc.__st.zIndex = String(prev.index);
          prev.__st.zIndex = String(prev.index + 2);
        }
        if (r.flash != null && r.flash > flash2) {
          flash2 = r.flash;
          flashColor = r.flashColor || "#fff";
        }
        if (r.cover) (covers || (covers = [])).push(r.cover);
      }
      if (this.coverG) {
        const g2 = this.coverG;
        g2.setTransform(1, 0, 0, 1, 0, 0);
        g2.clearRect(0, 0, this.coverEl.width, this.coverEl.height);
        if (covers) for (const f of covers) {
          g2.setTransform(this.coverDpr, 0, 0, this.coverDpr, 0, 0);
          g2.save();
          f(g2);
          g2.restore();
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
        if (sc.cam && (c.keys || c.fn || c.push || c.shakes.length || c.extra.length)) {
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
      const info = { t, W, H, fps: this.fps, frame: Math.floor(t * this.fps), frameT: this.frameT, beats: this.beats, video: this };
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
        this.flashEl.style.opacity = flash2;
        if (flash2) this.flashEl.style.background = flashColor;
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
            const P2 = mapWords(c[2], c[3]);
            el2.innerHTML = P2.map((p) => p.wi < 0 ? esc(p.s) : `<span class="kw" data-i="${p.wi}">${esc(p.s)}</span>`).join("");
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
    const src2 = new Error();
    return { o, kind: build.name, build: (ctx) => {
      const prev = SRC.err;
      SRC.err = src2;
      try {
        const el2 = build(ctx, o);
        return el2 ? finish(el2, o, ctx, defFx) : el2;
      } finally {
        SRC.err = prev;
      }
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
      const L = h("div", "vk-col", null, e), R2 = h("div", "vk-col", null, e);
      ctx.build([].concat(left), L);
      ctx.build([].concat(right), R2);
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
      const svgEl2 = w.firstElementChild;
      svgEl2.remove();
      svgEl2.classList.add("vk-svg");
      if (o.w) svgEl2.setAttribute("width", ctx.px(o.w));
      if (o.h) svgEl2.setAttribute("height", ctx.px(o.h));
      return svgEl2;
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
  function shapePath(kind, cx = 0, cy = 0, R2 = 100, o = {}) {
    const p = shapePoints(kind, o.n || SHAPE_N, o);
    return "M" + p.map(([x, y]) => `${(cx + x * R2).toFixed(2)} ${(cy + y * R2).toFixed(2)}`).join(" L") + " Z";
  }
  function shapePolygon(kind, cx, cy, R2, o = {}) {
    const p = shapePoints(kind, o.n || 48, o);
    return "polygon(" + p.map(([x, y]) => `${(cx + x * R2).toFixed(1)}px ${(cy + y * R2).toFixed(1)}px`).join(",") + ")";
  }

  // src/fx/svg.js
  var FX2 = registry.fx;
  function shapesOf(el2) {
    if (/^(path|line|polyline|polygon|circle|ellipse|rect)$/i.test(el2.tagName)) return [el2];
    return [...el2.querySelectorAll("path,line,polyline,polygon,circle,ellipse,rect")];
  }
  FX2.draw = (el2, o, api) => {
    const shapes = shapesOf(el2);
    api.tween(el2, { t: o.t, d: 1e-4, from: { opacity: 0 }, to: { opacity: 1 } });
    api.tween(shapes, { t: o.t, d: o.d || 1.2, ease: o.ease || "inOutCubic", stagger: o.each || o.drawStagger, from: { draw: api.exit ? 1 : 0 }, to: { draw: api.exit ? 0 : 1 } });
  };
  FX2["draw-fill"] = (el2, o, api) => {
    const shapes = shapesOf(el2), d = o.d || 1.2;
    FX2.draw(el2, o, api);
    shapes.forEach((s2) => {
      if (!s2.getAttribute("fill-opacity")) s2.setAttribute("fill-opacity", "0");
    });
    api.tween(shapes, { t: o.fillAt != null ? o.fillAt : o.t + d * 0.75, d: o.fillD || 0.5, ease: "outCubic", stagger: o.each, from: { "attr:fill-opacity": 0 }, to: { "attr:fill-opacity": 1 } });
  };
  FX2.fill = FX2["draw-fill"];
  var tmpSvg = null;
  function resample2(d, n = 120) {
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
  var outlineD = (pts, x, y, r) => "M" + pts.map((p) => (x + p[0] * r).toFixed(2) + " " + (y + p[1] * r).toFixed(2)).join(" L") + " Z";
  FX2.morph = (el2, o, api) => {
    const path2 = el2.tagName.toLowerCase() === "path" ? el2 : el2.querySelector("path");
    if (o.shapes) o = { ...o, paths: o.shapes.map((k) => outlineD(shapeOutline(k, o.n || 120), o.cx || 0, o.cy || 0, o.r || 100)) };
    if (o.beats && api.beats && api.beats.active) {
      const st = o.beats * api.beats.beat;
      o = { ...o, t: o.t + st - api.beats.leadT, each: st, d: o.d || st * 0.75, ease: o.ease || "outBack" };
    }
    const seq = o.paths ? o.paths.slice() : [path2.getAttribute("d"), o.to];
    const allCompat = seq.every((d) => compatible(d, seq[0]));
    const norm2 = allCompat ? seq : seq.map((d) => resample2(d, o.n || 120));
    path2.setAttribute("d", norm2[0]);
    const step = o.each || (o.d || 0.9) + 0.4;
    for (let i = 1; i < norm2.length; i++) api.tween(path2, { t: o.t + (i - 1) * step, d: o.d || 0.9, ease: o.ease || "inOutCubic", from: { "attr:d": norm2[i - 1] }, to: { "attr:d": norm2[i] } });
  };

  // src/fx/text.js
  var FX3 = registry.fx;
  Object.assign(FX3, {
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
      let a = typeof A === "function" ? A(o, el2) : A, b = typeof B4 === "function" ? B4(o, el2) : B4, ease2 = o.ease || defEase;
      if (api.exit) {
        [a, b] = [b, exitTo || a];
        ease2 = o.ease || "inCubic";
      }
      api.tween(pieces, { t: o.t, d: o.d || defD, ease: ease2, stagger: o.stagger || each, from: a, to: b, origin: o.origin });
    };
  }
  FX3.letters = perPiece("clip", { y: "110%" }, { y: "0%" }, "swift", 0.6, 0.035, { y: "-110%" });
  FX3["letters-fade"] = perPiece("chars", { opacity: 0, y: "0.35em" }, { opacity: 1, y: "0em" }, "outCubic", 0.5, 0.03);
  FX3["letters-blur"] = perPiece("chars", { opacity: 0, blur: 12, scale: 1.3 }, { opacity: 1, blur: 0, scale: 1 }, "outExpo", 0.7, 0.04);
  FX3.domino = (el2, o, api) => {
    el2.style.perspective = "800px";
    perPiece("chars", { rotateX: -95, opacity: 0 }, { rotateX: 0, opacity: 1 }, "outBack", 0.55, 0.05)(el2, { origin: "50% 85%", ...o }, api);
  };
  FX3.words = perPiece("words", { opacity: 0, scale: 1.45 }, { opacity: 1, scale: 1 }, "outBack", 0.5, 0.09);
  FX3["words-up"] = perPiece("words", { opacity: 0, y: "0.6em" }, { opacity: 1, y: "0em" }, "outExpo", 0.6, 0.08);
  FX3.squash = (el2, o, api) => {
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
  FX3.assemble = (el2, o, api) => {
    const pieces = split2(el2, "chars"), n = pieces.length, d = o.d || 0.9, spread = o.spread || 1, seed = o.seed || 7;
    pieces.forEach((c, i) => {
      const r12 = hash(i * 3.1 + seed), r2 = hash(i * 5.7 + seed), r3 = hash(i * 9.3 + seed), delay = hash(i * 1.9 + seed) * (o.each != null ? o.each * n : 0.35);
      const from = { opacity: 0, x: `${((r12 - 0.5) * 3 * spread).toFixed(2)}em`, y: `${((r2 - 0.5) * 2.2 * spread).toFixed(2)}em`, rotate: (r3 - 0.5) * 160, scale: 0.3 + r2 };
      const to = { opacity: 1, x: "0em", y: "0em", rotate: 0, scale: 1 };
      api.tween(c, { t: o.t + delay, d, ease: o.ease || "outQuart", from: api.exit ? to : from, to: api.exit ? from : to });
    });
  };
  FX3.wave = (el2, o, api) => {
    const pieces = split2(el2, "chars"), amp = o.amp || 0.12, speed = o.speed || 6;
    pieces.forEach((c, i) => api.fn(c, (local) => {
      const k = clamp01((local - o.t) / 0.4);
      c.style.transform = `translateY(${(-Math.sin(local * speed - i * 0.55) * amp * k).toFixed(3)}em)`;
    }));
  };
  FX3.type = (el2, o, api) => {
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
  FX3.scramble = (el2, o, api) => {
    const full = o.text != null ? o.text : el2.textContent, chars = Array.from(full), each = o.each != null ? o.each : 0.04, d = o.d || 0.5, set2 = o.glyphs || GLYPHS, rate = o.rate || 20;
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
        else if (local >= tShow) s2 += set2[Math.floor(hash(f * 13.1 + i * 7.3) * set2.length)];
        else s2 += "\xA0";
      });
      if (el2.textContent !== s2) el2.textContent = s2;
    });
  };
  FX3.decode = FX3.scramble;
  FX3.count = (el2, o, api) => {
    const a = +o.from || 0, b = o.to != null ? +o.to : parseFloat(el2.textContent) || 0, dec = o.decimals | 0, sep = o.sep == null ? "" : o.sep;
    const d = o.d || 1.2, ease2 = getEase(o.ease || "outExpo"), pre = o.prefix || "", suf = o.suffix || "";
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
      const s2 = fmt(a + (b - a) * ease2(api.exit ? 1 - p : p));
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
  FX3.highlight = sweep("vk-mark");
  FX3.marker = FX3.highlight;
  FX3.underline = sweep("vk-ul");
  FX3.swap = (el2, o, api) => {
    const c0 = getComputedStyle(el2).color, c12 = o.color || api.theme.modes[api.scene.mode || api.theme.mode].accent;
    api.tween(el2, { t: o.t, d: o.d || 0.3, ease: o.ease || "outCubic", from: { color: api.exit ? c12 : c0 }, to: { color: api.exit ? c0 : c12 } });
  };
  FX3.stack = (el2, o, api) => {
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
  var T3 = registry.transitions;
  var pct = (v) => (v * 100).toFixed(3) + "%";
  var focal2 = (c) => ({ x: c.o.x == null ? c.W / 2 : c.o.x <= 1 ? c.o.x * c.W : c.o.x, y: c.o.y == null ? c.H / 2 : c.o.y <= 1 ? c.o.y * c.H : c.o.y });
  T3.none = () => ({});
  T3.fade = (e) => ({ in: { opacity: e } });
  T3.crossfade = (e) => ({ in: { opacity: e }, out: { opacity: 1 - e } });
  var DIRS = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] };
  Object.entries(DIRS).forEach(([d, [dx, dy]]) => {
    const tf = (v) => `translate(${pct(dx * v)},${pct(dy * v)})`;
    T3["slide-" + d] = (e) => ({ in: { transform: tf(1 - e) } });
    T3["push-" + d] = (e) => ({ in: { transform: tf(1 - e) }, out: { transform: tf(-e) } });
    T3["whip-" + d] = (e, c) => {
      const b = Math.sin(Math.PI * c.raw) * 18;
      return { in: { transform: tf(1 - e), filter: `blur(${b.toFixed(2)}px)` }, out: { transform: tf(-e), filter: `blur(${b.toFixed(2)}px)` } };
    };
    const clip = { left: (v) => `inset(0% 0% 0% ${pct(1 - v)})`, right: (v) => `inset(0% ${pct(1 - v)} 0% 0%)`, up: (v) => `inset(${pct(1 - v)} 0% 0% 0%)`, down: (v) => `inset(0% 0% ${pct(1 - v)} 0%)` }[d];
    T3["wipe-" + d] = (e) => ({ in: { clipPath: clip(e) } });
  });
  T3.wipe = T3["wipe-right"] = (e) => ({ in: { clipPath: `inset(0% ${pct(1 - e)} 0% 0%)` } });
  T3["wipe-right"] = T3.wipe;
  T3["zoom-in"] = (e) => ({ in: { opacity: e, transform: `scale(${1.25 - 0.25 * e})` }, out: { transform: `scale(${1 + 0.18 * e})` } });
  T3.zoom = T3["zoom-in"];
  T3["zoom-out"] = (e) => ({ in: { opacity: e, transform: `scale(${0.82 + 0.18 * e})` }, out: { transform: `scale(${1 - 0.1 * e})` } });
  T3.blur = (e) => ({ in: { opacity: e, filter: `blur(${((1 - e) * 22).toFixed(2)}px)` }, out: { filter: `blur(${(e * 22).toFixed(2)}px)` } });
  T3.iris = (e, c) => {
    const f = focal2(c), R2 = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y));
    return { in: { clipPath: `circle(${(e * R2).toFixed(1)}px at ${f.x}px ${f.y}px)` } };
  };
  T3.circle = T3.iris;
  T3["iris-out"] = (e, c) => {
    const f = focal2(c), R2 = Math.hypot(c.W, c.H) / 2 * 1.05;
    return { under: true, out: { clipPath: `circle(${((1 - e) * R2).toFixed(1)}px at ${f.x}px ${f.y}px)` } };
  };
  var COVER = { circle: 1, diamond: 1.45, square: 1.05, triangle: 2.1, hexagon: 1.2, star: 2.35, heart: 1.5, blob: 1.2 };
  ["diamond", "star", "hexagon", "triangle", "heart", "square", "blob"].forEach((k) => {
    T3["shape-" + k] = (e, c) => {
      const f = focal2(c), R2 = Math.hypot(Math.max(f.x, c.W - f.x), Math.max(f.y, c.H - f.y)) * COVER[k] * e;
      return { in: { clipPath: shapePolygon(k, f.x, f.y, Math.max(R2, 0.01), { points: c.o.points }) } };
    };
  });
  T3.split = (e) => ({ in: { clipPath: `inset(0% ${pct((1 - e) / 2)} 0% ${pct((1 - e) / 2)})` } });
  T3["split-h"] = (e) => ({ in: { clipPath: `inset(${pct((1 - e) / 2)} 0% ${pct((1 - e) / 2)} 0%)` } });
  T3["split-open"] = (e) => ({ under: true, out: { clipPath: `polygon(0% 0%, ${pct(0.5 - e / 2)} 0%, ${pct(0.5 - e / 2)} 100%, 0% 100%, 0% 0%, 100% 0%, 100% 100%, ${pct(0.5 + e / 2)} 100%, ${pct(0.5 + e / 2)} 0%, 100% 0%)` } });
  T3.diagonal = (e) => {
    const a = -40 + e * 180;
    return { in: { clipPath: `polygon(0% 0%,${a}% 0%,${a - 40}% 100%,0% 100%)` } };
  };
  T3.blinds = (e, c) => {
    const n = c.o.n || 8, pts = [];
    for (let i = 0; i < n; i++) {
      const y0 = i / n * 100, y1 = y0 + e * 100 / n;
      pts.push(`0% ${y0}%`, `100% ${y0}%`, `100% ${y1}%`, `0% ${y1}%`, `0% ${y0}%`);
    }
    return { in: { clipPath: `polygon(${pts.join(",")})` } };
  };
  T3.flash = (e, c) => ({ in: { opacity: c.raw >= 0.5 ? 1 : 0 }, flash: Math.pow(1 - Math.abs(2 * c.raw - 1), 1.5), flashColor: c.o.color || "#fff" });
  T3.dip = (e, c) => ({ in: { opacity: c.raw >= 0.5 ? 1 : 0 }, flash: 1 - Math.abs(2 * c.raw - 1), flashColor: c.o.color || "#000" });
  T3.glitch = (e, c) => {
    const raw = c.raw;
    if (raw >= 1) return {};
    const f = c.frame, j = hash(f * 1.3) - 0.5;
    if (raw > 0.7) return { in: { transform: `translateX(${(j * 24 * (1 - raw)).toFixed(1)}px)` } };
    const top = hash(f * 3.1) * 70, h3 = 12 + hash(f * 7.7) * 40 * raw / 0.7;
    return { in: { clipPath: `inset(${top.toFixed(1)}% 0% ${Math.max(0, 100 - top - h3).toFixed(1)}% 0%)`, transform: `translateX(${(j * 90).toFixed(1)}px)`, filter: `hue-rotate(${Math.round(hash(f + 2) * 180)}deg) saturate(1.6)` }, out: { transform: `translateX(${(-j * 30).toFixed(1)}px)` } };
  };
  T3.slice = T3.glitch;
  T3["zoom-through"] = (e, c) => {
    const f = focal2(c), s2 = 1 + Math.pow(c.raw, 3) * (c.o.scale || 40);
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
    const px4 = ctx.px, win2 = h("div", "vk-term vk-mono");
    win2.style.cssText = `width:${len(ctx, o.w || 620, "x")};background:var(--surface);border:1px solid var(--line);border-radius:${px4(16)}px;padding:${px4(22)}px ${px4(28)}px;font-size:${size(ctx, o.size || 21)};line-height:1.65;text-align:left;color:var(--fg);box-shadow:0 ${px4(30)}px ${px4(60)}px -${px4(30)}px rgba(0,0,0,.45)`;
    const bar2 = h("div", null, `<i></i><i></i><i></i>${o.title ? `<span>${esc2(o.title)}</span>` : ""}`, win2);
    bar2.style.cssText = `display:flex;gap:${px4(8)}px;align-items:center;margin-bottom:${px4(14)}px;font-size:.8em;color:var(--muted)`;
    [...bar2.querySelectorAll("i")].forEach((i, k) => i.style.cssText = `width:${px4(12)}px;height:${px4(12)}px;border-radius:50%;background:${["#FF5F57", "#FEBC2E", "#28C840"][k]};opacity:.9`);
    if (bar2.querySelector("span")) bar2.querySelector("span").style.marginLeft = px4(10) + "px";
    const t0 = ctx.at(o);
    let t = t0 + 0.35;
    const cps = o.cps || 32, sc = ctx.scene;
    sc.fx(win2, o.winFx || "fade", { t: t0, d: 0.4 });
    lines.forEach((line) => {
      const row2 = h("div", null, null, win2);
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
    return win2;
  }, null);
  B.code = (src2, o = {}) => node(o, function code(ctx) {
    const px4 = ctx.px, pre = h("div", "vk-code vk-mono");
    pre.style.cssText = `width:${len(ctx, o.w || 620, "x")};background:var(--surface);border:1px solid var(--line);border-radius:${px4(14)}px;padding:${px4(22)}px ${px4(26)}px;font-size:${size(ctx, o.size || 20)};line-height:1.6;text-align:left;white-space:pre;color:var(--fg);overflow:hidden`;
    const KW = /\b(const|let|var|function|return|import|from|export|await|async|new|if|else|for|of|in|class|true|false|null|def|fn|pub|use|package|func)\b/g;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.12;
    src2.replace(/\n$/, "").split("\n").forEach((ln, i) => {
      const hs = highlightLine(ln, KW);
      const row2 = h("div", null, hs || " ", pre);
      if (o.highlight && o.highlight.includes(i + 1)) row2.style.cssText = `background:color-mix(in srgb,var(--accent) 22%,transparent);margin:0 -${px4(26)}px;padding:0 ${px4(26)}px`;
      ctx.scene.fx(row2, "left", { t: t0 + i * each, d: 0.35, dist: px4(14) });
    });
    ctx.advance(t0 + src2.split("\n").length * each);
    return pre;
  }, null);
  B.cards = (items, o = {}) => node(o, function cards(ctx) {
    const px4 = ctx.px, g2 = h("div", "vk-cards");
    g2.style.cssText = `display:grid;grid-template-columns:repeat(${o.cols || Math.min(4, items.length)},1fr);gap:${px4(o.gap || 24)}px;width:100%;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.15;
    items.forEach((it, i) => {
      const c = h("div", "vk-card vk-surface", null, g2);
      c.style.cssText += `;padding:${px4(22)}px ${px4(24)}px;display:flex;flex-direction:column;gap:${px4(8)}px;border-radius:var(--vk-radius)`;
      if (it.icon) h("div", null, it.icon, c).style.cssText = `font-size:${px4(34)}px;line-height:1;color:var(--accent)`;
      if (it.tag) h("div", "vk-label", esc2(it.tag), c).style.fontSize = px4(16) + "px";
      h("div", null, md(it.title), c).style.cssText = `font-size:${px4(o.titleSize || 28)}px;font-weight:800;line-height:1.2;color:var(--fg)`;
      if (it.text) h("div", null, md(it.text), c).style.cssText = `font-size:${px4(o.textSize || 19)}px;line-height:1.45;color:var(--muted)`;
      if (it.hl) {
        c.style.background = "var(--accent)";
        c.style.borderColor = "var(--accent)";
        [...c.children].forEach((k) => k.style.color = "var(--on-accent)");
      }
      ctx.scene.fx(c, o.itemFx || "pop", { t: t0 + i * each, d: 0.45 });
    });
    ctx.advance(t0 + items.length * each);
    return g2;
  }, null);
  B.columns = (items, o = {}) => node(o, function columns(ctx) {
    const px4 = ctx.px, g2 = h("div", "vk-columns");
    g2.style.cssText = `display:grid;grid-template-columns:repeat(${items.length},1fr);gap:${px4(28)}px;width:100%;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.3;
    items.forEach((it, i) => {
      const c = h("div", null, null, g2);
      c.style.cssText = `border-left:${px4(3)}px solid var(--line);padding:${px4(4)}px 0 ${px4(4)}px ${px4(18)}px`;
      h("div", null, md(it.title), c).style.cssText = `font-size:${px4(30)}px;font-weight:900;line-height:1.2`;
      if (it.code) h("div", "vk-mono", esc2(it.code), c).style.cssText = `font-size:${px4(18)}px;color:var(--accent2);margin-top:${px4(8)}px`;
      if (it.text) h("div", null, md(it.text), c).style.cssText = `font-size:${px4(19)}px;line-height:1.45;color:var(--muted);margin-top:${px4(8)}px`;
      ctx.scene.fx(c, "up", { t: t0 + i * each, d: 0.5 });
      ctx.scene.tween(c, { t: t0 + i * each + 0.2, d: 0.4, from: { borderLeftColor: ctx.video.color("line", ctx.scene.mode) }, to: { borderLeftColor: ctx.video.color("accent", ctx.scene.mode) } });
    });
    ctx.advance(t0 + items.length * each);
    return g2;
  }, null);
  B.kv = (rows2, o = {}) => node(o, function kv(ctx) {
    const px4 = ctx.px, box = h("div", "vk-kv");
    box.style.cssText = `width:${o.w ? len(ctx, o.w, "x") : "100%"};border-top:${px4(2)}px solid var(--fg);text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.4;
    rows2.forEach(([k, v], i) => {
      const r = h("div", null, null, box);
      r.style.cssText = `display:flex;align-items:center;min-height:${px4(o.rowH || 70)}px;border-bottom:1px solid var(--line);gap:${px4(20)}px`;
      h("div", null, md(k), r).style.cssText = `width:${px4(o.keyW || 200)}px;flex:none;font-weight:900;font-size:${px4(23)}px;color:var(--accent)`;
      h("div", null, md(v), r).style.cssText = `font-size:${px4(22)}px;line-height:1.35`;
      ctx.scene.fx(r, "left", { t: t0 + i * each, d: 0.4 });
    });
    ctx.advance(t0 + rows2.length * each);
    return box;
  }, null);
  B.gantt = (spec, o = {}) => node(o, function gantt(ctx) {
    const px4 = ctx.px, [a, b] = spec.range || [0, Math.max(...spec.rows.map((r) => r.end))];
    const box = h("div", "vk-gantt");
    box.style.cssText = `width:100%;text-align:left;position:relative`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.25;
    spec.rows.forEach((r, i) => {
      const row2 = h("div", null, null, box);
      row2.style.cssText = `display:flex;align-items:center;height:${px4(46)}px;gap:${px4(16)}px`;
      h("div", "vk-mono", md(r.label), row2).style.cssText = `width:${px4(o.labelW || 170)}px;flex:none;font-size:${px4(18)}px;color:var(--muted);text-align:right`;
      const track = h("div", null, null, row2);
      track.style.cssText = `position:relative;flex:1;height:${px4(26)}px;border-left:1px solid var(--line)`;
      const bar2 = h("div", null, r.text ? `<span>${md(r.text)}</span>` : "", track);
      bar2.style.cssText = `position:absolute;top:0;height:100%;left:${(r.start - a) / (b - a) * 100}%;width:${(r.end - r.start) / (b - a) * 100}%;background:${r.hl ? "var(--accent)" : "var(--accent2)"};border-radius:${px4(5)}px;transform-origin:left center;font-size:${px4(15)}px;color:var(--on-accent);display:flex;align-items:center;padding-left:${px4(8)}px;white-space:nowrap;overflow:hidden`;
      ctx.scene.fx(bar2, "grow", { t: t0 + i * each, d: 0.5, ease: "outCubic" });
    });
    if (spec.unit) {
      const ax = h("div", "vk-mono", `${a}${spec.unit} \u2192 ${b}${spec.unit}`, box);
      ax.style.cssText = `margin-left:${px4((o.labelW || 170) + 16)}px;font-size:${px4(15)}px;color:var(--muted);margin-top:${px4(6)}px`;
      ctx.scene.fx(ax, "fade", { t: t0, d: 0.4 });
    }
    ctx.advance(t0 + spec.rows.length * each);
    return box;
  }, null);
  B.diagram = (spec, o = {}) => node(o, function diagram(ctx) {
    const px4 = ctx.px, W = spec.w || 1e3, H = spec.h || 400;
    const box = h("div", "vk-diagram");
    box.style.cssText = `position:relative;width:${px4(W)}px;height:${px4(H)}px;flex:none`;
    const svgEl2 = s("svg", { width: px4(W), height: px4(H), viewBox: `0 0 ${W} ${H}`, fill: "none", stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, box);
    svgEl2.style.cssText = "position:absolute;left:0;top:0;overflow:visible;color:var(--accent)";
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.35, nt = {}, N = {};
    spec.nodes.forEach((n, i) => {
      N[n.id] = n;
      const e = h("div", "vk-node", `<b>${md(n.label)}</b>${n.sub ? `<span>${md(n.sub)}</span>` : ""}`, box);
      e.style.cssText = `position:absolute;left:${px4(n.x)}px;top:${px4(n.y)}px;width:${px4(n.w || 200)}px;height:${px4(n.h || 90)}px;border-radius:${px4(14)}px;border:${px4(2)}px solid ${n.hl ? "var(--accent)" : "var(--fg)"};background:${n.hl ? "var(--accent)" : "var(--surface)"};color:${n.hl ? "var(--on-accent)" : "var(--fg)"};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:${px4(4)}px;${n.dashed ? "border-style:dashed;background:transparent;" : ""}`;
      e.querySelector("b").style.cssText = `font-size:${px4(n.size || 24)}px;font-weight:900;line-height:1.15`;
      const sp = e.querySelector("span");
      if (sp) sp.style.cssText = `font:600 ${px4(15)}px var(--vk-mono);opacity:.8`;
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
      const g2 = s("g", {}, svgEl2);
      s("path", { d }, g2);
      const L = 12, a1 = ang + 2.6, a2 = ang - 2.6;
      s("path", { d: `M${(x2 + L * Math.cos(a1)).toFixed(1)} ${(y2 + L * Math.sin(a1)).toFixed(1)} L${x2} ${y2} L${(x2 + L * Math.cos(a2)).toFixed(1)} ${(y2 + L * Math.sin(a2)).toFixed(1)}` }, g2);
      const te = (o.edgeAt ? ctx.scene.time(o.edgeAt) : Math.max(nt[a], nt[b]) + 0.35) + k * 0.08;
      ctx.scene.fx(g2, "draw", { t: te, d: 0.5 });
      last = Math.max(last, te + 0.5);
      if (lab) {
        const l = h("div", "vk-mono", md(lab), box);
        l.style.cssText = `position:absolute;left:${px4((x1 + x2) / 2)}px;top:${px4((y1 + y2) / 2) - px4(30)}px;transform:translateX(-50%);font-size:${px4(15)}px;color:var(--muted);white-space:nowrap`;
        ctx.scene.fx(l, "fade", { t: te + 0.3, d: 0.3 });
      }
    });
    ctx.advance(last);
    return box;
  }, null);
  B.quote = (text3, o = {}) => node(o, function quote(ctx) {
    const px4 = ctx.px, q = h("figure", "vk-quote");
    q.style.cssText = `margin:0;max-width:${len(ctx, o.w || 900, "x")};text-align:${o.align || "left"};position:relative`;
    const mark = h("div", null, "\u201C", q);
    mark.dataset.qa = "ignore";
    mark.style.cssText = `font-family:var(--vk-serif);font-size:${px4(180)}px;line-height:.6;color:var(--accent);height:${px4(70)}px`;
    const body = h("blockquote", null, md(text3), q);
    body.style.cssText = `margin:0;font-family:${o.serif === false ? "var(--vk-sans)" : "var(--vk-serif)"};font-size:${size(ctx, o.size || 50)};line-height:1.3;font-weight:${o.weight || 500}`;
    const t0 = ctx.at(o);
    ctx.scene.fx(mark, "pop", { t: t0, d: 0.5 });
    ctx.scene.fx(body, o.textFx || "words-up", { t: t0 + 0.25, each: o.each || 0.06 });
    if (o.by) {
      const by = h("figcaption", null, "\u2014 " + md(o.by), q);
      by.style.cssText = `margin-top:${px4(20)}px;font-size:${px4(22)}px;color:var(--muted)`;
      ctx.scene.fx(by, "fade", { t: t0 + 1.2, d: 0.5 });
    }
    ctx.advance(t0 + 1.2);
    return q;
  }, null);
  B.image = (src2, o = {}) => node(o, function image2(ctx) {
    const px4 = ctx.px, box = h("div", "vk-image");
    box.style.cssText = `position:relative;width:${len(ctx, o.w || 640, "x")};height:${len(ctx, o.h || 360, "y")};overflow:hidden;border-radius:${px4(o.radius != null ? o.radius : 14)}px;flex:none;background:var(--surface)`;
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
      c.style.cssText = `position:absolute;left:0;right:0;bottom:0;padding:${px4(10)}px ${px4(16)}px;font-size:${px4(16)}px;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;text-align:left`;
    }
    return box;
  }, "fade");
  B.device = (content, o = {}) => node(o, function device(ctx) {
    const px4 = ctx.px, type = o.type || "browser", fr = h("div", "vk-device vk-device-" + type);
    let screen;
    if (type === "phone") {
      const w = o.w || 260;
      fr.style.cssText = `width:${px4(w)}px;height:${px4(w * 2.05)}px;border-radius:${px4(42)}px;background:#0A0A0A;padding:${px4(12)}px;box-shadow:0 0 0 ${px4(2)}px #333,0 ${px4(30)}px ${px4(60)}px -${px4(20)}px rgba(0,0,0,.5);position:relative;flex:none`;
      screen = h("div", "vk-screen", null, fr);
      screen.style.cssText = `width:100%;height:100%;border-radius:${px4(32)}px;overflow:hidden;position:relative;background:var(--bg)`;
      const notch = h("div", null, null, fr);
      notch.style.cssText = `position:absolute;top:${px4(20)}px;left:50%;transform:translateX(-50%);width:${px4(80)}px;height:${px4(22)}px;border-radius:${px4(12)}px;background:#0A0A0A;z-index:2`;
    } else if (type === "laptop") {
      const w = o.w || 720;
      fr.style.cssText = `width:${px4(w)}px;flex:none;position:relative`;
      const lid = h("div", null, null, fr);
      lid.style.cssText = `width:${px4(w * 0.86)}px;height:${px4(w * 0.86 * 0.62)}px;margin:0 auto;background:#111;border-radius:${px4(16)}px ${px4(16)}px 0 0;padding:${px4(14)}px;box-shadow:0 0 0 ${px4(2)}px #2a2a2a`;
      screen = h("div", "vk-screen", null, lid);
      screen.style.cssText = `width:100%;height:100%;overflow:hidden;position:relative;background:var(--bg);border-radius:${px4(4)}px`;
      const base3 = h("div", null, null, fr);
      base3.style.cssText = `width:100%;height:${px4(18)}px;background:linear-gradient(#C9CDD6,#8E939E);border-radius:0 0 ${px4(14)}px ${px4(14)}px`;
    } else {
      const w = o.w || 720;
      fr.style.cssText = `width:${px4(w)}px;flex:none;border-radius:${px4(14)}px;overflow:hidden;background:var(--surface);border:1px solid var(--line);box-shadow:0 ${px4(30)}px ${px4(60)}px -${px4(30)}px rgba(0,0,0,.45)`;
      const bar2 = h("div", null, `<i></i><i></i><i></i><span>${esc2(o.url || "")}</span>`, fr);
      bar2.style.cssText = `display:flex;gap:${px4(8)}px;align-items:center;height:${px4(40)}px;padding:0 ${px4(14)}px;border-bottom:1px solid var(--line);font:500 ${px4(15)}px var(--vk-mono);color:var(--muted)`;
      [...bar2.querySelectorAll("i")].forEach((i, k) => i.style.cssText = `width:${px4(12)}px;height:${px4(12)}px;border-radius:50%;background:${["#FF5F57", "#FEBC2E", "#28C840"][k]}`);
      const sp = bar2.querySelector("span");
      sp.style.cssText = `margin-left:${px4(12)}px;flex:1;background:var(--bg);border-radius:${px4(8)}px;padding:${px4(4)}px ${px4(12)}px;text-align:left`;
      screen = h("div", "vk-screen", null, fr);
      screen.style.cssText = `position:relative;height:${px4(o.h || w * 0.52)}px;overflow:hidden;background:var(--bg)`;
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
    const px4 = ctx.px, box = h("div", "vk-cta");
    box.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:${px4(20)}px;width:100%`;
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
      term.style.cssText = `background:var(--surface);color:var(--fg);border-radius:${px4(16)}px;padding:${px4(18)}px ${px4(30)}px;font-size:${px4(spec.cmdSize || 26)}px;white-space:nowrap;text-align:left;border:1px solid var(--line)`;
      ctx.scene.fx(term, "fade", { t, d: 0.4 });
      ctx.scene.fx(term.querySelector(".c"), "type", { t: t + 0.3, cps: 32, text: spec.cmd, caretHold: 1 });
      t += 0.3 + spec.cmd.length / 32 + 0.3;
    }
    if (spec.url) {
      const e = h("div", "vk-mono", esc2(spec.url), box);
      e.style.cssText = `font-size:${px4(spec.urlSize || 34)}px;font-weight:700`;
      ctx.scene.fx(e, "up", { t });
      t += 0.5;
    }
    if (spec.note) {
      const e = h("div", null, md(spec.note), box);
      e.style.cssText = `font-size:${px4(24)}px;opacity:.9`;
      ctx.scene.fx(e, "fade", { t });
      t += 0.4;
    }
    ctx.advance(t);
    return box;
  }, null);
  B.badge = (text3, o = {}) => node(o, function badge(ctx) {
    const e = h("span", "vk-badge vk-mono", md(text3));
    const px4 = ctx.px;
    e.style.cssText = `display:inline-block;padding:${px4(6)}px ${px4(16)}px;border-radius:${px4(999)}px;font-size:${px4(o.size || 20)}px;font-weight:700;border:${px4(2)}px solid ${o.hl ? "var(--accent)" : "var(--line)"};background:${o.hl ? "var(--accent)" : "transparent"};color:${o.hl ? "var(--on-accent)" : "var(--fg)"}`;
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
  B2.bar = (data, o = {}) => node(o, function bar2(ctx) {
    const px4 = ctx.px, D = rows(data), max = o.max || niceMax(Math.max(...D.map((d) => d.value)));
    const W = o.w || 900, H = o.h || 380, box = h("div", "vk-chart vk-bar");
    box.style.cssText = `width:${px4(W)}px;flex:none;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.12, sc = ctx.scene;
    const isHl = (d, i) => o.highlight === i || o.highlight === d.label;
    if (o.horizontal) {
      D.forEach((d, i) => {
        const r = h("div", null, null, box);
        r.style.cssText = `display:flex;align-items:center;gap:${px4(14)}px;height:${px4(H / D.length)}px`;
        h("div", null, md(d.label), r).style.cssText = `width:${px4(o.labelW || 160)}px;flex:none;font-size:${px4(20)}px;text-align:right;color:var(--muted)`;
        const tr = h("div", null, null, r);
        tr.style.cssText = `flex:1;position:relative;height:${px4(Math.min(40, H / D.length * 0.62))}px`;
        const b = h("div", null, null, tr);
        b.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:${d.value / max * 100}%;background:${isHl(d, i) ? "var(--accent)" : barCol(ctx, o, i, d)};border-radius:${px4(6)}px;transform-origin:left center`;
        const v = h("div", "vk-mono", "", tr);
        v.style.cssText = `position:absolute;left:calc(${d.value / max * 100}% + ${px4(10)}px);top:50%;transform:translateY(-50%);font-size:${px4(20)}px;font-weight:700;white-space:nowrap`;
        sc.fx(b, "grow", { t: t0 + i * each, d: 0.8, ease: "outExpo" });
        sc.fx(v, "count", { t: t0 + i * each, d: 0.8, to: d.value, format: (x) => fmtNum(x, o) });
        sc.fx(v, "fade", { t: t0 + i * each + 0.1, d: 0.3 });
      });
    } else {
      const plot = h("div", null, null, box);
      plot.style.cssText = `position:relative;height:${px4(H)}px;display:flex;align-items:flex-end;gap:${px4(o.gap || 18)}px;border-bottom:${px4(2)}px solid var(--fg);padding:0 ${px4(8)}px`;
      [0.25, 0.5, 0.75, 1].forEach((g2) => {
        const l = h("div", null, null, plot);
        l.style.cssText = `position:absolute;left:0;right:0;bottom:${g2 * 100}%;border-top:1px dashed var(--line);opacity:.8`;
        const lb = h("div", "vk-mono", fmtNum(max * g2, { ...o, decimals: o.axisDecimals != null ? o.axisDecimals : Number.isInteger(max * 0.25) ? 0 : 1 }), l);
        lb.style.cssText = `position:absolute;right:100%;margin-right:${px4(8)}px;top:-${px4(10)}px;font-size:${px4(14)}px;color:var(--muted);white-space:nowrap`;
      });
      D.forEach((d, i) => {
        const c = h("div", null, null, plot);
        c.style.cssText = `flex:1;position:relative;height:${d.value / max * 100}%;display:flex;flex-direction:column;justify-content:flex-start`;
        const b = h("div", null, null, c);
        b.style.cssText = `position:absolute;inset:0;background:${isHl(d, i) ? "var(--accent)" : barCol(ctx, o, i, d)};border-radius:${px4(6)}px ${px4(6)}px 0 0;transform-origin:center bottom`;
        const v = h("div", "vk-mono", "", c);
        v.style.cssText = `position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:${px4(6)}px;font-size:${px4(o.valueSize || 18)}px;font-weight:700;white-space:nowrap`;
        const l = h("div", null, md(d.label), c);
        l.style.cssText = `position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:${px4(8)}px;font-size:${px4(o.labelSize || 17)}px;color:var(--muted);white-space:nowrap`;
        sc.fx(b, "grow-y", { t: t0 + i * each, d: 0.8, ease: "outExpo" });
        sc.fx(v, "count", { t: t0 + i * each, d: 0.8, to: d.value, format: (x) => fmtNum(x, o) });
        sc.fx(l, "fade", { t: t0 + i * each, d: 0.3 });
      });
      plot.style.marginBottom = px4(38) + "px";
      box.style.paddingLeft = px4(40) + "px";
    }
    if (o.source) {
      const sEl = h("div", null, md(o.source), box);
      sEl.style.cssText = `margin-top:${px4(10)}px;font-size:${px4(14)}px;color:var(--muted);text-align:right`;
      sc.fx(sEl, "fade", { t: t0, d: 0.5 });
    }
    ctx.advance(t0 + D.length * each + 0.6);
    return box;
  }, null);
  B2.line = (data, o = {}) => node(o, function line(ctx) {
    const px4 = ctx.px, W = o.w || 900, H = o.h || 380;
    const series = o.series || [{ name: o.name || "", values: rows(data).map((d2) => d2.value) }];
    const labels = o.labels || (data ? rows(data).map((d2) => d2.label) : series[0].values.map((_, i) => String(i + 1)));
    const all = series.flatMap((s2) => s2.values), min = o.min != null ? o.min : Math.min(0, ...all), max = o.max || niceMax(Math.max(...all));
    const axisDec = o.axisDecimals != null ? o.axisDecimals : Number.isInteger((max - min) / 4) ? 0 : 1;
    const axisTxt = (g2) => fmtNum(min + (max - min) * g2 / 4, { ...o, decimals: axisDec, unit: "" });
    const multi = series.length > 1, endW = multi && o.endLabel !== false ? o.labelRight || 190 : 24;
    const P2 = { l: 18 + Math.max(...[0, 1, 2, 3, 4].map((g2) => axisTxt(g2).length)) * 8.8, r: endW, t: 20, b: 40 };
    const n = labels.length, X2 = (i) => P2.l + (W - P2.l - P2.r) * (n === 1 ? 0.5 : i / (n - 1)), Y = (v) => P2.t + (H - P2.t - P2.b) * (1 - (v - min) / (max - min));
    const box = h("div", "vk-chart vk-line");
    box.style.cssText = `width:${px4(W)}px;height:${px4(H)}px;position:relative;flex:none`;
    const svgEl2 = s("svg", { width: px4(W), height: px4(H), viewBox: `0 0 ${W} ${H}`, fill: "none" }, box);
    const t0 = ctx.at(o), d = o.d || 1.6, sc = ctx.scene;
    const axis = s("g", {}, svgEl2);
    for (let g2 = 0; g2 <= 4; g2++) {
      const v = min + (max - min) * g2 / 4, y = Y(v);
      s("line", { x1: P2.l, x2: W - P2.r, y1: y, y2: y, stroke: "var(--line)", "stroke-width": g2 ? 1 : 2, "stroke-dasharray": g2 ? "4 6" : "" }, axis);
      const tx = s("text", { x: P2.l - 10, y: y + 5, "text-anchor": "end", fill: "var(--muted)", "font-size": 14, "font-family": "JetBrains Mono, monospace" }, axis);
      tx.textContent = axisTxt(g2);
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
        const gid2 = "vkg" + ++gradId;
        const defs = s("defs", {}, svgEl2), lg = s("linearGradient", { id: gid2, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        s("stop", { offset: 0, "stop-color": col3, "stop-opacity": 0.35 }, lg);
        s("stop", { offset: 1, "stop-color": col3, "stop-opacity": 0 }, lg);
        const area2 = s("path", { d: dPath + ` L${pts[pts.length - 1][0]} ${Y(min)} L${pts[0][0]} ${Y(min)} Z`, fill: `url(#${gid2})` }, svgEl2);
        sc.tween(area2, { t: t0 + 0.2, d, ease: "inOutCubic", from: { clipPath: "inset(0% 100% 0% 0%)" }, to: { clipPath: "inset(0% 0% 0% 0%)" } });
      }
      const path2 = s("path", { d: dPath, stroke: col3, "stroke-width": o.strokeWidth || 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svgEl2);
      sc.fx(path2, "draw", { t: t0 + 0.2 + k * 0.3, d, ease: "inOutCubic" });
      if (o.dots !== false) pts.forEach((p, i) => {
        const c = s("circle", { cx: p[0], cy: p[1], r: 5, fill: col3, stroke: "var(--bg)", "stroke-width": 2 }, svgEl2);
        c.style.transformBox = "fill-box";
        c.style.transformOrigin = "center";
        sc.fx(c, "pop", { t: t0 + 0.2 + k * 0.3 + d * (i / Math.max(1, n - 1)), d: 0.3 });
      });
      const lastV = se.values[se.values.length - 1], lp = pts[pts.length - 1];
      if (o.endLabel === false) return;
      const lab = h("div", "vk-mono", "", box);
      lab.style.cssText = `position:absolute;font-size:${px4(o.valueSize || 22)}px;font-weight:800;color:${col3};white-space:nowrap;line-height:1`;
      if (multi) {
        lab.style.left = px4(lp[0] + 14) + "px";
        ends.push({ lab, y: lp[1] });
      } else {
        lab.style.left = px4(lp[0]) + "px";
        lab.style.top = px4(lp[1]) - px4(44) + "px";
        lab.style.transform = "translateX(-80%)";
      }
      sc.fx(lab, "count", { t: t0 + 0.2 + k * 0.3, d, to: lastV, from: se.values[0], format: (x) => (se.name ? se.name + " " : "") + fmtNum(x, o) });
      sc.fx(lab, "fade", { t: t0 + 0.2, d: 0.3 });
    });
    if (ends.length) {
      const gap = (o.valueSize || 22) * 1.25;
      ends.sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + gap);
      const over = ends[ends.length - 1].y - (H - P2.b);
      if (over > 0) ends.forEach((e) => e.y -= over);
      for (let i = ends.length - 2; i >= 0; i--) ends[i].y = Math.min(ends[i].y, ends[i + 1].y - gap);
      ends.forEach((e) => {
        e.lab.style.top = px4(e.y) - px4((o.valueSize || 22) / 2) + "px";
      });
    }
    if (o.source) {
      const sEl = h("div", null, md(o.source), box);
      sEl.style.cssText = `position:absolute;right:0;top:100%;margin-top:${px4(4)}px;font-size:${px4(14)}px;color:var(--muted)`;
      sc.fx(sEl, "fade", { t: t0, d: 0.5 });
    }
    ctx.advance(t0 + d + 0.5);
    return box;
  }, null);
  function pieImpl(donut) {
    return (data, o = {}) => node(o, function pie(ctx) {
      const px4 = ctx.px, D = rows(data), total = D.reduce((m, d2) => m + d2.value, 0), R2 = o.r || 150, th = donut ? o.thickness || 56 : R2;
      const box = h("div", "vk-chart vk-pie");
      box.style.cssText = `display:flex;align-items:center;gap:${px4(48)}px;flex:none`;
      const wrap = h("div", null, null, box);
      wrap.style.cssText = `position:relative;width:${px4(R2 * 2)}px;height:${px4(R2 * 2)}px;flex:none`;
      const svgEl2 = s("svg", { width: px4(R2 * 2), height: px4(R2 * 2), viewBox: `0 0 ${R2 * 2} ${R2 * 2}` }, wrap);
      const rr = R2 - th / 2, C2 = 2 * Math.PI * rr, t0 = ctx.at(o), d = o.d || 1.4, sc = ctx.scene, ease2 = getEase("inOutCubic");
      let acc = 0;
      const segs = [];
      D.forEach((dd, i) => {
        const c = s("circle", { cx: R2, cy: R2, r: rr, fill: "none", stroke: pal(ctx, i, dd), "stroke-width": th, transform: `rotate(-90 ${R2} ${R2})` }, svgEl2);
        segs.push({ c, a: acc / total, b: (acc + dd.value) / total });
        acc += dd.value;
      });
      sc.on((local) => {
        const p = ease2(clamp01((local - t0) / d));
        segs.forEach(({ c, a, b }) => {
          const aa = Math.min(a, p), bb = Math.min(b, p), L = Math.max(0, bb - aa) * C2;
          c.setAttribute("stroke-dasharray", `${L.toFixed(2)} ${C2.toFixed(2)}`);
          c.setAttribute("stroke-dashoffset", (-aa * C2).toFixed(2));
        });
      });
      if (donut) {
        const cen = h("div", null, null, wrap);
        cen.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center`;
        const big = h("div", "vk-mono", "", cen);
        big.style.cssText = `font-size:${px4(o.centerSize || 44)}px;font-weight:800`;
        if (o.center) big.innerHTML = md(o.center);
        else sc.fx(big, "count", { t: t0, d, to: total, format: (x) => fmtNum(x, o) });
        if (o.centerLabel) h("div", null, md(o.centerLabel), cen).style.cssText = `font-size:${px4(17)}px;color:var(--muted)`;
        sc.fx(cen, "fade", { t: t0 + 0.2, d: 0.4 });
      }
      if (o.legend !== false) {
        const lg = h("div", null, null, box);
        lg.style.cssText = `display:flex;flex-direction:column;gap:${px4(12)}px;text-align:left`;
        D.forEach((dd, i) => {
          const r = h("div", null, `<i></i><span>${md(dd.label)}</span><b class="vk-mono">${(dd.value / total * 100).toFixed(o.pctDecimals | 0)}%</b>`, lg);
          r.style.cssText = `display:flex;align-items:center;gap:${px4(12)}px;font-size:${px4(o.legendSize || 21)}px`;
          r.querySelector("i").style.cssText = `width:${px4(16)}px;height:${px4(16)}px;border-radius:${px4(4)}px;background:${pal(ctx, i, dd)};flex:none`;
          r.querySelector("b").style.cssText = `margin-left:auto;padding-left:${px4(16)}px;color:var(--muted)`;
          sc.fx(r, "left", { t: t0 + d * ((segs[i].a + segs[i].b) / 2), d: 0.4, dist: px4(20) });
        });
      }
      ctx.advance(t0 + d + 0.3);
      return box;
    }, null);
  }
  B2.pie = pieImpl(false);
  B2.donut = pieImpl(true);
  B2.ticker = (value, o = {}) => node(o, function ticker(ctx) {
    const px4 = ctx.px, box = h("div", "vk-ticker");
    box.style.cssText = "display:flex;flex-direction:column;align-items:center";
    const n = h("div", "vk-mono", "", box);
    n.style.cssText = `font-size:${size(ctx, o.size || 120)};font-weight:800;line-height:1;letter-spacing:-.03em;color:${o.color ? `var(--${o.color})` : "var(--fg)"}`;
    const t0 = ctx.at(o);
    ctx.scene.fx(n, "count", { t: t0, d: o.d || 1.4, from: o.from || 0, to: value, format: (x) => fmtNum(x, { sep: o.sep, decimals: o.decimals, prefix: o.prefix, unit: o.unit || o.suffix }) });
    if (o.label) {
      const l = h("div", null, md(o.label), box);
      l.style.cssText = `font-size:${px4(o.labelSize || 24)}px;color:var(--muted);margin-top:${px4(10)}px`;
      ctx.scene.fx(l, "up", { t: t0 + 0.3 });
    }
    ctx.advance(t0 + (o.d || 1.4));
    return box;
  }, "fade");
  B2.ring = (pct2, o = {}) => node(o, function ring(ctx) {
    const px4 = ctx.px, R2 = o.r || 110, th = o.thickness || 18, rr = R2 - th / 2, C2 = 2 * Math.PI * rr;
    const box = h("div", "vk-ring");
    box.style.cssText = `position:relative;width:${px4(R2 * 2)}px;height:${px4(R2 * 2)}px;flex:none`;
    const svgEl2 = s("svg", { width: px4(R2 * 2), height: px4(R2 * 2), viewBox: `0 0 ${R2 * 2} ${R2 * 2}` }, box);
    s("circle", { cx: R2, cy: R2, r: rr, fill: "none", stroke: "var(--line)", "stroke-width": th }, svgEl2);
    const arc2 = s("circle", { cx: R2, cy: R2, r: rr, fill: "none", stroke: o.color || "var(--accent)", "stroke-width": th, "stroke-linecap": "round", transform: `rotate(-90 ${R2} ${R2})`, "stroke-dasharray": `0 ${C2}` }, svgEl2);
    const cen = h("div", null, null, box);
    cen.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center";
    const num3 = h("div", "vk-mono", "", cen);
    num3.style.cssText = `font-size:${px4(R2 * 0.38)}px;font-weight:800`;
    if (o.label) h("div", null, md(o.label), cen).style.cssText = `font-size:${px4(Math.max(14, R2 * 0.14))}px;color:var(--muted);margin-top:${px4(4)}px;max-width:${px4(R2 * 1.4)}px;text-align:center;line-height:1.25`;
    const t0 = ctx.at(o), d = o.d || 1.3, e = getEase(o.ease || "outCubic");
    ctx.scene.on((local) => {
      const p = e(clamp01((local - t0) / d)) * pct2 / 100;
      arc2.setAttribute("stroke-dasharray", `${(p * C2).toFixed(2)} ${C2.toFixed(2)}`);
    });
    ctx.scene.fx(num3, "count", { t: t0, d, to: pct2, decimals: o.decimals, format: (x) => x.toFixed(o.decimals | 0) + "%" });
    ctx.advance(t0 + d);
    return box;
  }, "fade");
  B2.table = (spec, o = {}) => node(o, function table(ctx) {
    const px4 = ctx.px, tb = h("table", "vk-table"), t0 = ctx.at(o), each = o.each != null ? o.each : 0.18;
    tb.style.cssText = `border-collapse:collapse;width:${o.w ? len(ctx, o.w, "x") : "100%"};font-size:${px4(o.size || 21)}px;text-align:left`;
    const al = (i) => spec.align && spec.align[i] || (i ? "right" : "left");
    if (spec.header) {
      const tr = h("tr", null, spec.header.map((c, i) => `<th style="text-align:${al(i)}">${md(c)}</th>`).join(""), tb);
      [...tr.children].forEach((th) => th.style.cssText += `;padding:${px4(10)}px ${px4(16)}px;border-bottom:${px4(2)}px solid var(--fg);color:var(--muted);font-weight:700;font-size:.85em`);
      ctx.scene.fx(tr, "fade", { t: t0, d: 0.3 });
    }
    spec.rows.forEach((r, i) => {
      const tr = h("tr", null, r.map((c, j) => `<td style="text-align:${al(j)}">${md(String(c))}</td>`).join(""), tb);
      [...tr.children].forEach((td, j) => td.style.cssText += `;padding:${px4(10)}px ${px4(16)}px;border-bottom:1px solid var(--line);${j ? "font-family:var(--vk-mono)" : "font-weight:700"}`);
      if (spec.highlight === i) [...tr.children].forEach((td) => {
        td.style.background = "var(--accent)";
        td.style.color = "var(--on-accent)";
      });
      ctx.scene.fx(tr, "left", { t: t0 + 0.2 + i * each, d: 0.4, dist: px4(24) });
    });
    if (o.source) {
      const cap = h("caption", null, md(o.source), tb);
      cap.style.cssText = `caption-side:bottom;text-align:right;font-size:${px4(14)}px;color:var(--muted);padding-top:${px4(8)}px`;
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
      const g3 = t.getContext("2d"), im = g3.createImageData(256, 256), r = mulberry32(1e3 + i);
      for (let p = 0; p < im.data.length; p += 4) {
        const val = r() * 255;
        im.data[p] = im.data[p + 1] = im.data[p + 2] = val;
        im.data[p + 3] = 255;
      }
      g3.putImageData(im, 0, 0);
      tiles.push(t);
    }
    const g2 = c.getContext("2d");
    let lastF = -1;
    return { el: c, update(t) {
      const f = Math.floor(t * (o.fps || 24));
      if (f === lastF) return;
      lastF = f;
      g2.save();
      g2.translate(Math.floor(hash(f) * 256) - 256, Math.floor(hash(f + 7) * 256) - 256);
      g2.fillStyle = g2.createPattern(tiles[f % 4], "repeat");
      g2.fillRect(0, 0, v.W + 512, v.H + 512);
      g2.restore();
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
    const g2 = c.getContext("2d"), r = mulberry32(o.seed || 42);
    g2.fillStyle = o.color || "#F4EEE2";
    g2.fillRect(0, 0, 512, 512);
    const im = g2.getImageData(0, 0, 512, 512);
    for (let p = 0; p < im.data.length; p += 4) {
      const n = (r() - 0.5) * 26;
      im.data[p] += n;
      im.data[p + 1] += n;
      im.data[p + 2] += n;
    }
    g2.putImageData(im, 0, 0);
    g2.globalAlpha = 0.08;
    g2.strokeStyle = "#7A6A55";
    for (let i = 0; i < 260; i++) {
      g2.lineWidth = 0.5 + r();
      g2.beginPath();
      const x = r() * 512, y = r() * 512, a = r() * 6.28, l = 6 + r() * 26;
      g2.moveTo(x, y);
      g2.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g2.stroke();
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
  var G2 = registry.backgrounds;
  var div = () => document.createElement("div");
  var col2 = (sc, v, name) => v || `var(--${name})`;
  G2.gradient = (sc, o, v) => {
    const e = div(), cs = o.colors || [v.color("bg", sc.mode), v.color("accent", sc.mode)];
    return { el: e, update(local) {
      const a = (o.angle || 135) + (o.spin || 0) * local;
      e.style.background = `linear-gradient(${a.toFixed(2)}deg, ${cs.join(",")})`;
    } };
  };
  G2.mesh = (sc, o, v) => {
    const e = div(), cs = o.colors || [v.color("accent", sc.mode), v.color("accent2", sc.mode), v.color("accent", sc.mode)], sp = o.speed || 0.12, base3 = o.base || v.color("bg", sc.mode);
    return { el: e, update(local) {
      const t = sc.start + local;
      e.style.background = cs.map((c, i) => {
        const x = 15 + 70 * noise1(t * sp + i * 7.1), y = 15 + 70 * noise1(t * sp + i * 3.7 + 50), r = (o.size || 55) + 10 * noise1(t * sp * 0.7 + i);
        return `radial-gradient(circle at ${x.toFixed(2)}% ${y.toFixed(2)}%, ${c} 0%, transparent ${r.toFixed(1)}%)`;
      }).join(",") + "," + base3;
      e.style.opacity = o.opacity != null ? o.opacity : 1;
      if (o.blur) e.style.filter = `blur(${v.px(o.blur)}px)`;
    } };
  };
  G2.grid = (sc, o, v) => {
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
  G2.dots = (sc, o, v) => {
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
  G2.noise = (sc, o, v) => {
    const c = document.createElement("canvas"), w = o.res || 64, h3 = Math.round(w * v.H / v.W);
    c.width = w;
    c.height = h3;
    c.style.cssText = "width:100%;height:100%;display:block";
    const e = div();
    e.appendChild(c);
    if (o.opacity != null) e.style.opacity = o.opacity;
    const g2 = c.getContext("2d"), im = g2.createImageData(w, h3);
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
      g2.putImageData(im, 0, 0);
    } };
  };

  // src/fx/lyrics.js
  var B3 = registry.blocks;
  var c01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
  var esc3 = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  B3.lyrics = (cue, o = {}) => node({ fx: false, ...o }, function lyrics(ctx) {
    const v = ctx.video, style2 = o.style || "pop", d = o.d || (style2 === "slam" ? 0.16 : 0.22);
    const [, , text3, words] = Array.isArray(cue) ? cue : [cue.start, cue.end, cue.text, cue.words];
    const el2 = h("div", "vk-lyric vk-lyric-" + style2);
    el2.style.cssText = `font-family:${o.font === "sans" ? "var(--vk-sans)" : "var(--vk-display),var(--vk-sans)"};font-weight:${o.weight || 900};line-height:1.12;font-size:${size(ctx, o.size || (style2 === "slam" ? 150 : 64))};text-align:${o.align || "center"};max-width:${len(ctx, o.w || 0.86, "x")};color:${o.color ? `var(--${o.color},${o.color})` : "var(--fg)"}` + (style2 === "slam" ? `;position:relative;width:${len(ctx, o.w || 0.86, "x")};height:1.3em;white-space:nowrap` : "");
    const accent = o.accent || "var(--accent)", dim = o.dim != null ? o.dim : 0.42;
    const P2 = mapWords(text3, words), W = [];
    P2.forEach((p) => {
      if (p.wi < 0) {
        const s3 = h("span", "vk-lp", esc3(p.s), el2);
        s3.style.whiteSpace = "pre";
        if (W.length) W[W.length - 1].tail.push(s3);
        else if (style2 === "slam") s3.style.display = "none";
        return;
      }
      const s2 = h("span", "vk-lw", esc3(p.s), el2);
      s2.style.display = "inline-block";
      s2.style.whiteSpace = "pre";
      if (style2 === "slam") s2.style.cssText += ";position:absolute;left:50%;top:50%;translate:-50% -50%;transform-origin:50% 50%";
      W.push({ s: s2, w: words[p.wi], tail: [] });
    });
    if (style2 === "slam") W.forEach((x) => x.tail.forEach((t) => t.style.display = "none"));
    const lastEnd = W.length ? W[W.length - 1].w.end || W[W.length - 1].w.t + 0.3 : 0;
    ctx.extend(lastEnd - ctx.scene.start + 0.3);
    let fit = null;
    if (style2 === "slam") v.afterFonts.push(() => {
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
        if (style2 === "karaoke") {
          const pr = c01((tt - x.w.t) / Math.max(0.05, (x.w.end || x.w.t + 0.2) - x.w.t));
          s2.style.color = "transparent";
          s2.style.webkitBackgroundClip = "text";
          s2.style.backgroundClip = "text";
          s2.style.backgroundImage = `linear-gradient(90deg, ${accent} ${pr * 100}%, color-mix(in srgb, currentColor ${dim * 100}%, transparent) ${pr * 100}%)`;
          s2.style.transform = on && o.beat ? `scale(${1 + o.beat * bp})` : "";
          return;
        }
        if (style2 === "slam") {
          const e2 = EASE.outCubic(c01(a)), show = on && a >= 0;
          s2.style.opacity = show ? "1" : "0";
          s2.style.transform = show ? `scale(${(fit && fit[i] || 1) * (1.35 - 0.35 * e2) * (1 + (o.beat || 0) * bp)}) rotate(${(hash(i + 7) - 0.5) * 6 * (1 - e2)}deg)` : "scale(.5)";
          s2.style.color = hash(i * 3 + 1) > 0.7 ? accent : "";
          return;
        }
        const e = style2 === "rise" ? EASE.outExpo(c01(a)) : EASE.outBack(c01(a)), vis = a >= 0;
        s2.style.opacity = vis ? String(c01(a * 3)) : "0";
        s2.style.transform = !vis ? "translateY(.35em) scale(.5)" : style2 === "rise" ? `translateY(${(1 - e) * 0.6}em)` : `translateY(${(1 - e) * 0.3}em) scale(${(0.55 + 0.45 * e) * (on ? 1 + (o.beat || 0) * bp : 1)})`;
        if (style2 === "rise") s2.style.filter = vis && a < 1 ? `blur(${(1 - e) * 8}px)` : "";
        s2.style.color = on ? accent : "";
        x.tail.forEach((tn) => tn.style.opacity = s2.style.opacity);
      });
    });
    return el2;
  });
  B3.spectrum = (o = {}) => node({ fx: "fade", ...o }, function spectrum(ctx) {
    const v = ctx.video, n = o.bars || 16, px4 = ctx.px, H = px4(o.h || 120);
    const el2 = h("div", "vk-spectrum");
    el2.style.cssText = `display:flex;align-items:${o.mirror ? "center" : "flex-end"};gap:${px4(o.gap != null ? o.gap : 6)}px;height:${H}px;width:${len(ctx, o.w || 0.6, "x")}`;
    const bars = Array.from({ length: n }, () => {
      const b = h("i", null, null, el2);
      b.style.cssText = `flex:1;height:100%;border-radius:${px4(4)}px;background:${o.color ? `var(--${o.color},${o.color})` : "var(--accent)"};transform-origin:50% ${o.mirror ? "50%" : "100%"}`;
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
    const v = vk2.current, G3 = v.beats, M = v.music, lines = (o.lines || v.lyrics).filter((l) => l[3] && l[3].length);
    if (!lines.length) throw new Error('[vk] lyricVideo: no lyric lines (vk.video({lyrics:"song.align.json"}))');
    const lead = G3.leadT, styles = o.styles || ["pop", "rise", "slam", "karaoke"];
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
        const b = G3.measure(Math.floor(G3.barIndex(x)));
        if (b <= x) return b;
      }
      return G3.at(Math.floor(G3.index(x)));
    };
    const groups = [];
    lines.forEach((l) => {
      let c = cutBefore(l[3][0].t);
      const g2 = groups[groups.length - 1];
      if (g2 && c <= g2.cut + 1e-3) {
        const cb = G3.at(Math.floor(G3.index(l[3][0].t + tol + lead)));
        if (cb > g2.cut + 0.3) c = cb;
        else {
          g2.lines.push(l);
          return;
        }
      }
      groups.push({ cut: c, lines: [l] });
    });
    const lastEnd = Math.max(...lines.map((l) => l[3][l[3].length - 1].end || l[3][l[3].length - 1].t + 0.3));
    const endLyrics = G3.measure(Math.ceil(G3.barIndex(lastEnd + 0.4 + lead)));
    const total = o.end || Math.min(M ? M.duration : Infinity, endLyrics + (o.outro ? G3.meter * G3.beat * 2 : 0));
    const sceneFor = (name, endAbs, opts, nodes) => vk2.scene(name, { ...opts, end: endAbs - lead }, nodes);
    const flashNode = (amt2) => vk2.el((ctx) => {
      const e = document.createElement("div");
      e.style.cssText = "position:absolute;inset:0;background:#fff;pointer-events:none;z-index:5;opacity:0";
      ctx.scene.on((l, p, t) => {
        e.style.opacity = (amt2 * G3.pulse(t, 9)).toFixed(3);
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
    groups.forEach((g2, i) => {
      const sec = secOf(g2.cut + 0.1), hot = secs.length < 2 || sec.energy > medE, si = sec.index || 0, k = perSec[si] = perSec[si] == null ? 0 : perSec[si] + 1;
      const ss = o.sectionStyles && o.sectionStyles[sec.label], style2 = ss ? [].concat(ss)[k % [].concat(ss).length] : styles[(si + k) % styles.length];
      const st = g2.lines.length > 1 && style2 === "slam" ? "pop" : style2;
      const endAbs = i + 1 < groups.length ? groups[i + 1].cut : endLyrics;
      const bg = bgs[(si + k) % bgs.length];
      sceneFor(`${sec.label}${i + 1}`, endAbs, {
        bg,
        mode: bg === "light" || bg === "accent" ? bg : "dark",
        transition: i === 0 && groups[0].cut <= 1.2 ? "none" : trs[(i + si) % trs.length],
        beat: hot ? { scale: o.zoom != null ? o.zoom : 0.035 } : null,
        energy: o.energy !== false ? o.energy || { brightness: [0.8, 1.12], band: "low", smooth: 0.05 } : null
      }, [
        ...g2.lines.map((l, j) => vk2.lyrics(l, { style: st, size: o.size || (st === "slam" ? 150 : g2.lines.length > 1 ? 60 : 84), mt: j ? 18 : 0, beat: hot ? 0.06 : 0 })),
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
      const g2 = c.getContext("2d");
      g2.fillStyle = g2.createPattern(img, "repeat");
      g2.fillRect(0, 0, c.width, c.height);
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
      const tur = [...document.getElementById(id).querySelectorAll(".vk-boil")], base3 = tur.map((t) => +t.getAttribute("seed"));
      tur.forEach((t) => t.closest("filter").setAttribute("data-vk-dynamic", ""));
      let last = -1;
      video.onRender((t) => {
        const f = boil(t, o.boil) % (o.boilFrames || 3);
        if (f === last) return;
        last = f;
        tur.forEach((el2, i) => el2.setAttribute("seed", base3[i] + f * 17));
      });
    }
  }
  function brushPath(pts, width = 6, o = {}) {
    const n = pts.length;
    if (n < 2) return "";
    const W = typeof width === "function" ? width : ((u) => width * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.08)), 0.7));
    const L = [], R2 = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len2 = Math.hypot(dx, dy) || 1;
      const nx = -dy / len2, ny = dx / len2, w = Math.max(0, W(i / (n - 1))) / 2;
      L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      R2.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    const f = (x) => Math.round(x * 100) / 100;
    const side = (arr) => arr.map((q, i) => (i ? "L" : "") + f(q[0]) + "," + f(q[1])).join(" ");
    const capEnd = o.round !== false ? ` Q${f(pts[n - 1][0] + (pts[n - 1][0] - pts[n - 2][0]) * 0.6)},${f(pts[n - 1][1] + (pts[n - 1][1] - pts[n - 2][1]) * 0.6)} ` : " L";
    return `M${side(L)}${capEnd}${side(R2.reverse()).replace(/^/, "")}Z`;
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
  var px3 = (ctx, v, d) => ctx.px(v != null ? v : d) + "px";
  function vtitle(text3, o = {}) {
    return node({ fx: "ink", d: 1.4, pos: { x: 96, y: 58 }, ...o }, function vtitle_(ctx) {
      ensureCSS();
      const e = h("div", "vk-vt");
      e.style.fontSize = px3(ctx, o.size, 118);
      h("div", "vk-vt-main", esc4(text3), e);
      if (o.sub) {
        const s2 = h("div", "vk-vt-sub", esc4(o.sub), e);
        s2.style.fontSize = px3(ctx, o.subSize, 21);
        s2.style.marginTop = px3(ctx, o.subTop, 18);
      }
      if (o.seal) {
        const s2 = h("div", "vk-seal", esc4(o.seal), e);
        s2.style.fontSize = px3(ctx, o.sealSize, 20);
        s2.style.padding = `${ctx.px(8)}px ${ctx.px(6)}px`;
        s2.style.marginTop = px3(ctx, o.sealTop, Math.round((o.size || 118) * [...text3].length * 0.62));
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
      e.style.fontSize = px3(ctx, o.size, 42);
      e.innerHTML = (o.no ? `<span class="vk-chap-no">${esc4(o.no)}</span>` : "") + esc4(text3);
      return e;
    }, "brush");
  }
  function seal(text3, o = {}) {
    return node({ fx: "stamp", d: 0.5, ...o }, function seal_(ctx) {
      ensureCSS();
      const s2 = h("div", "vk-seal", esc4(text3));
      s2.style.fontSize = px3(ctx, o.size, 22);
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
      e.style.fontSize = px3(ctx, o.size, 60);
      e.style.cssText += `;position:absolute;left:${px3(ctx, o.x, 0)};top:0`;
      h("div", "vk-vt-main", esc4(o.big || "\u7EC8"), e);
      if (o.small) {
        const s2 = h("div", "vk-vt-sub", esc4(o.small), e);
        s2.style.fontSize = px3(ctx, o.smallSize, 19);
        s2.style.marginTop = px3(ctx, 12);
      }
      if (o.seal) {
        const s2 = h("div", "vk-seal", esc4(o.seal), e);
        s2.style.fontSize = px3(ctx, 18);
        s2.style.padding = `${ctx.px(7)}px ${ctx.px(5)}px`;
        s2.style.marginTop = px3(ctx, o.sealTop, 180);
      }
      return wrap;
    }, "ink");
  }
  function credits(lines, o = {}) {
    return node({ fx: "fade", d: 1, ...o }, function credits_(ctx) {
      ensureCSS();
      const e = h("div", "vk-credits", [].concat(lines).map(esc4).join("<br>"));
      e.style.fontSize = px3(ctx, o.size, 15);
      return e;
    }, "fade");
  }
  function esc4(s2) {
    return String(s2).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  }
  Object.assign(registry.blocks, { vtitle, chapter, seal, endcard, credits });
  var T4 = registry.transitions;
  T4.ink = (e, c) => {
    const fx = c.o.x == null ? c.W * 0.5 : c.o.x <= 1 ? c.o.x * c.W : c.o.x, fy = c.o.y == null ? c.H * 0.5 : c.o.y <= 1 ? c.o.y * c.H : c.o.y;
    const R2 = Math.hypot(Math.max(fx, c.W - fx), Math.max(fy, c.H - fy)) * 1.35, r = e * R2, soft = R2 * 0.38;
    const m = `radial-gradient(ellipse ${(r * 1.12).toFixed(1)}px ${(r * 0.92).toFixed(1)}px at ${fx.toFixed(0)}px ${fy.toFixed(0)}px, #000 ${Math.max(0, r - soft).toFixed(1)}px, rgba(0,0,0,.55) ${Math.max(0, r - soft * 0.45).toFixed(1)}px, transparent ${r.toFixed(1)}px)`;
    return { in: { maskImage: m, webkitMaskImage: m, filter: `blur(${((1 - e) * 3).toFixed(2)}px)` }, out: { filter: `blur(${(e * 5).toFixed(2)}px)` } };
  };
  T4.wash = (e) => {
    const b = (1 + e * 0.08).toFixed(3);
    return { in: { opacity: e, filter: `blur(${((1 - e) * 6).toFixed(2)}px)` }, out: { filter: `blur(${(e * 8).toFixed(2)}px)${b !== "1.000" ? ` brightness(${b})` : ""}` } };
  };

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
  var warned2 = false;
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
        if (!warned2) console.warn("[vk] WebGL unavailable: vk.gl layers render nothing (vk render --gpu soft|swiftshader keeps WebGL on)");
        warned2 = true;
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
  var BLOOM = NOISE_LOOKUP + CUBIC + `uniform sampler2D uS, uL1, uL2, uL3, uL4, uL5; uniform vec2 uL3Size, uL4Size, uL5Size;
uniform float uStr, uCore, uTintMix, uFlick, uKnee; uniform vec3 uTint;
void main(){
  vec4 a = texture2D(uL1, vUv) * .16 + texture2D(uL2, vUv) * .22 + cubicTex(uL3, vUv, uL3Size) * .24 + cubicTex(uL4, vUv, uL4Size) * .22 + cubicTex(uL5, vUv, uL5Size) * .2;
  vec3 h = mix(a.rgb, uTint * a.a, uTintMix);
  h = h / (1. + uKnee * h);                       // soft knee: big glows do not clip to white
  vec4 c = texture2D(uS, vUv);
  vec3 col = (h * uStr + c.rgb * uCore) * uFlick;
  gl_FragColor = vec4(col, clamp(max(max(col.r, col.g), col.b), 0., 1.));
}`;

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
    const G3 = o.gravity || 0, GX = o.gravityX || 0, K = o.drag || 0;
    function pos(s2, a) {
      if (K < 1e-6) return [s2.x + s2.vx * a + 0.5 * GX * a * a, s2.y + s2.vy * a + 0.5 * G3 * a * a];
      const e = (1 - Math.exp(-K * a)) / K;
      return [s2.x + (s2.vx - GX / K) * e + GX / K * a, s2.y + (s2.vy - G3 / K) * e + G3 / K * a];
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
      const g2 = canvas.getContext("2d", { willReadFrequently: true });
      g2.setTransform(1, 0, 0, 1, 0, 0);
      g2.clearRect(0, 0, canvas.width, canvas.height);
      g2.setTransform(this.res, 0, 0, this.res, -this.rect[0] * this.res, -this.rect[1] * this.res);
      return g2;
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
      draw(g2) {
        const size2 = o.size || 120, font = o.font || '"Ma Shan Zheng","Noto Serif SC",serif';
        g2.font = `${o.weight || 400} ${size2}px ${font}`;
        g2.fillStyle = o.color || "#000";
        g2.textBaseline = o.vertical ? "top" : o.baseline || "alphabetic";
        const chars = [...String(str)];
        if (o.vertical) {
          g2.textAlign = "center";
          const step = size2 * (o.lead || 1.04);
          chars.forEach((ch, i) => {
            const jx = o.jitter ? Math.sin(i * 12.9898) * o.jitter : 0;
            g2.fillText(ch, (o.x || 0) + jx, (o.y || 0) + i * step);
          });
        } else {
          g2.textAlign = o.align || "left";
          if (o.tracking) {
            let x = o.x || 0;
            chars.forEach((ch) => {
              g2.fillText(ch, x, o.y || 0);
              x += g2.measureText(ch).width + o.tracking * size2;
            });
          } else g2.fillText(String(str), o.x || 0, o.y || 0);
        }
      }
    };
  }
  function path(d, o = {}) {
    const ds = [].concat(d), P2 = ds.map((x) => new Path2D(x));
    return {
      static: o.static !== false,
      draw(g2, local, info) {
        g2.save();
        const T6 = o.transform;
        if (Array.isArray(T6)) g2.transform(...T6);
        else if (T6) {
          g2.translate(T6.x || 0, T6.y || 0);
          if (T6.rot) g2.rotate(T6.rot * Math.PI / 180);
          if (T6.scale) g2.scale(T6.scale, T6.scale);
        }
        const fs = o.gradient ? o.gradient(g2) : o.fill || "#000";
        P2.forEach((p, i) => {
          if (fs !== "none") {
            g2.fillStyle = Array.isArray(fs) ? fs[i % fs.length] : fs;
            g2.fill(p, o.rule || "nonzero");
          }
          if (o.stroke) {
            g2.strokeStyle = o.stroke;
            g2.lineWidth = o.width || 2;
            g2.lineCap = "round";
            g2.lineJoin = "round";
            g2.stroke(p);
          }
        });
        g2.restore();
      }
    };
  }
  function image(img, o = {}) {
    return { static: o.static !== false, draw(g2) {
      g2.drawImage(img, o.x || 0, o.y || 0, o.w || img.width, o.h || img.height);
    } };
  }
  function svg2(el2, o = {}) {
    return { static: !!o.static, el: el2, draw(g2) {
      drawSVG(g2, typeof el2 === "string" ? document.querySelector(el2) : el2, o);
    } };
  }
  var SKIP = /* @__PURE__ */ new Set(["defs", "clipPath", "mask", "filter", "linearGradient", "radialGradient", "pattern", "symbol", "marker", "style", "script", "title", "desc", "metadata", "foreignObject"]);
  function drawSVG(g2, root, o = {}) {
    if (!root) return;
    const off = o.offset || [0, 0], base3 = g2.getTransform(), ex = o.exclude ? typeof o.exclude === "string" ? o.exclude : [].concat(o.exclude) : null;
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
            g2.setTransform(base3);
            g2.transform(1, 0, 0, 1, off[0], off[1]);
            g2.transform(m2.a, m2.b, m2.c, m2.d, m2.e, m2.f);
            paint(g2, ref, getComputedStyle(ref), a, true);
          }
        }
        return;
      }
      const m = el2.getCTM();
      if (!m) return;
      g2.setTransform(base3);
      g2.transform(1, 0, 0, 1, off[0], off[1]);
      g2.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      paint(g2, el2, cs, a, false);
    };
    walk(root, 1);
    g2.setTransform(base3);
  }
  var num = (el2, k, d = 0) => {
    const v = el2.getAttribute(k);
    return v == null || v === "" ? d : parseFloat(v);
  };
  function shapePath2(el2) {
    const tag = el2.tagName, P2 = new Path2D();
    if (tag === "path") return new Path2D(el2.getAttribute("d") || "");
    if (tag === "rect") {
      const x = num(el2, "x"), y = num(el2, "y"), w = num(el2, "width"), h3 = num(el2, "height"), rx = num(el2, "rx", num(el2, "ry"));
      if (rx && P2.roundRect) P2.roundRect(x, y, w, h3, rx);
      else P2.rect(x, y, w, h3);
      return P2;
    }
    if (tag === "circle") {
      P2.arc(num(el2, "cx"), num(el2, "cy"), Math.max(0, num(el2, "r")), 0, Math.PI * 2);
      return P2;
    }
    if (tag === "ellipse") {
      P2.ellipse(num(el2, "cx"), num(el2, "cy"), Math.max(0, num(el2, "rx")), Math.max(0, num(el2, "ry")), 0, 0, Math.PI * 2);
      return P2;
    }
    if (tag === "line") {
      P2.moveTo(num(el2, "x1"), num(el2, "y1"));
      P2.lineTo(num(el2, "x2"), num(el2, "y2"));
      return P2;
    }
    if (tag === "polyline" || tag === "polygon") {
      const v = (el2.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < v.length; i += 2) i ? P2.lineTo(v[i], v[i + 1]) : P2.moveTo(v[i], v[i + 1]);
      if (tag === "polygon") P2.closePath();
      return P2;
    }
    return null;
  }
  function paintOf(g2, el2, v, alpha) {
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
    const P2 = (k, d) => {
      const s2 = gr.getAttribute(k);
      if (s2 == null) return d;
      return s2.endsWith("%") ? parseFloat(s2) / 100 : parseFloat(s2);
    };
    const X2 = (u) => user ? u : bb.x + u * bb.width, Y = (u) => user ? u : bb.y + u * bb.height;
    let G3;
    if (gr.tagName === "radialGradient") {
      const cx = P2("cx", 0.5), cy = P2("cy", 0.5), r = P2("r", 0.5);
      if (user) G3 = g2.createRadialGradient(P2("fx", cx), P2("fy", cy), 0, cx, cy, r);
      else {
        G3 = g2.createRadialGradient(P2("fx", cx), P2("fy", cy), 0, cx, cy, r);
        G3.bb = [bb.x, bb.y, Math.max(1e-6, bb.width), Math.max(1e-6, bb.height)];
      }
    } else G3 = g2.createLinearGradient(X2(P2("x1", 0)), Y(P2("y1", 0)), X2(P2("x2", 1)), Y(P2("y2", 0)));
    for (const s2 of stops) {
      const cs = getComputedStyle(s2), off = s2.getAttribute("offset") || "0", o = Math.min(1, Math.max(0, off.endsWith("%") ? parseFloat(off) / 100 : parseFloat(off)));
      const c = rgb(cs.stopColor || s2.getAttribute("stop-color") || "#000"), so = +(cs.stopOpacity || 1);
      G3.addColorStop(o, `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${so})`);
    }
    return G3;
  }
  function paint(g2, el2, cs, a, isUse) {
    const tag = el2.tagName;
    if (tag === "image") {
      try {
        g2.globalAlpha = a;
        g2.drawImage(el2, num(el2, "x"), num(el2, "y"), num(el2, "width"), num(el2, "height"));
      } catch (e) {
      }
      g2.globalAlpha = 1;
      return;
    }
    if (tag === "text") {
      const fs = paintOf(g2, el2, cs.fill, a);
      if (!fs) return;
      g2.globalAlpha = a * +cs.fillOpacity;
      g2.fillStyle = fs;
      g2.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      g2.textAlign = { middle: "center", end: "right" }[cs.textAnchor] || "left";
      g2.fillText(el2.textContent, num(el2, "x"), num(el2, "y"));
      g2.globalAlpha = 1;
      return;
    }
    if (tag === "g" && isUse) {
      for (const c of el2.children) {
        const m = c.transform && c.transform.baseVal.consolidate();
        g2.save();
        if (m) {
          const k = m.matrix;
          g2.transform(k.a, k.b, k.c, k.d, k.e, k.f);
        }
        paint(g2, c, getComputedStyle(c), a * +getComputedStyle(c).opacity, true);
        g2.restore();
      }
      return;
    }
    const P2 = shapePath2(el2);
    if (!P2) return;
    const fill = paintOf(g2, el2, cs.fill, a), stroke = paintOf(g2, el2, cs.stroke, a);
    const rule = cs.fillRule === "evenodd" ? "evenodd" : "nonzero";
    if (fill) {
      g2.globalAlpha = a * +cs.fillOpacity;
      g2.fillStyle = fill;
      if (fill.bb) {
        const [x, y, w, h3] = fill.bb, Q2 = new Path2D();
        Q2.addPath(P2, new DOMMatrix([1 / w, 0, 0, 1 / h3, -x / w, -y / h3]));
        g2.save();
        g2.transform(w, 0, 0, h3, x, y);
        g2.fill(Q2, rule);
        g2.restore();
      } else g2.fill(P2, rule);
    }
    const sw = parseFloat(cs.strokeWidth);
    if (stroke && sw > 0) {
      g2.globalAlpha = a * +cs.strokeOpacity;
      g2.strokeStyle = stroke.bb ? "rgba(0,0,0,0)" : stroke;
      g2.lineWidth = sw;
      g2.lineCap = cs.strokeLinecap || "butt";
      g2.lineJoin = cs.strokeLinejoin || "miter";
      const da = cs.strokeDasharray && cs.strokeDasharray !== "none" ? cs.strokeDasharray.split(/[\s,]+/).map(parseFloat).filter((x) => x >= 0) : null;
      if (da && da.length && da.some((x) => x > 0)) {
        g2.setLineDash(da.length % 2 ? da.concat(da) : da);
        g2.lineDashOffset = parseFloat(cs.strokeDashoffset) || 0;
      }
      g2.stroke(P2);
      g2.setLineDash([]);
    }
    g2.globalAlpha = 1;
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
      const g2 = L.sceneCtx(st.canvas);
      src2.draw(g2, local, info, L);
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
    const dirs2 = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] };
    const wipe = o.wipe ? { dir: Array.isArray(o.wipe.dir) ? o.wipe.dir : dirs2[o.wipe.dir || "down"], dur: o.wipe.dur != null ? o.wipe.dur : 1 } : null;
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
        const P2 = sys.at(local);
        if (!P2.length) return "empty";
        if (P2.every((p) => p.settled)) return "S" + P2.map((p) => p.id).join(",");
        return null;
      },
      render(core, L, local) {
        const P2 = sys.at(local);
        if (!P2.length) return;
        const gl2 = core.gl, prog2 = core.program(PFRAG, PVERT);
        if (data.length < P2.length * 12) data = new Float32Array(P2.length * 12);
        P2.forEach((p, i) => {
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
        gl2.useProgram(prog2.pr);
        core.bindOutput();
        core.blend(o.blend || so.blend || "normal");
        gl2.bindBuffer(gl2.ARRAY_BUFFER, buf);
        gl2.bufferData(gl2.ARRAY_BUFFER, data.subarray(0, P2.length * 12), gl2.DYNAMIC_DRAW);
        ["a0", "a1", "a2"].forEach((n, j) => {
          const l = prog2.attr[n] != null ? prog2.attr[n] : prog2.attr[n] = gl2.getAttribLocation(prog2.pr, n);
          if (l < 0) return;
          gl2.enableVertexAttribArray(l);
          gl2.vertexAttribPointer(l, 4, gl2.FLOAT, false, 48, j * 16);
        });
        const r = L.rect;
        core.uniforms(prog2, { uRes: [L.pw, L.ph], uNX: [r[0], r[1], 1 / L.res, 1 / L.res], uMaxPt: core.maxPoint, uC2: c22, uSoak: o.soak != null ? o.soak : 1 });
        gl2.drawArrays(gl2.POINTS, 0, P2.length);
        core.stats.passes++;
        ["a0", "a1", "a2"].forEach((n) => {
          const l = prog2.attr[n];
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
  function bloom(o = {}) {
    let st;
    return {
      name: "bloom",
      o,
      init() {
        st = maskState(o.src, 5);
      },
      key(local) {
        const sk = srcKey(o.src, local);
        if (sk == null || o.flicker) return null;
        return "bloom" + sk;
      },
      render(core, L, local, info) {
        st.update(core, L, local, info);
        core.pass(BLOOM, {
          ...L.common(0),
          uS: st.level(0),
          uL1: st.level(1),
          uL2: st.level(2),
          uL3: st.level(3),
          uL4: st.level(4),
          uL5: st.level(5),
          uL3Size: st.size(3),
          uL4Size: st.size(4),
          uL5Size: st.size(5),
          uStr: o.strength != null ? o.strength : 1.1,
          uCore: o.core || 0,
          uTint: rgb(o.tint || "#ffffff"),
          uTintMix: o.tint ? o.tintMix != null ? o.tintMix : 0.5 : 0,
          uKnee: o.knee != null ? o.knee : 0.35,
          uFlick: o.flicker ? o.flicker(local) : 1
        }, null, { blend: "add" });
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
    const tur = s2.querySelector("feTurbulence"), base3 = o.seed || 3;
    const els = typeof targets === "string" ? [...(sc.el || v.stage).querySelectorAll(targets)] : [].concat(targets || []);
    els.forEach((e) => {
      if (e instanceof SVGElement) e.setAttribute("filter", `url(#${id})`);
      else e.style.filter = `url(#${id})`;
    });
    let last = null;
    const upd = (t) => {
      const f = boilFrame(t, o.fps || 12, o.frames || 0), sd = String(base3 + f * 7);
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
    bloom,
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

  // src/styles/packs.js
  var PACK_IDS = ["ink", "papercut", "shadow", "opera", "tech", "neon", "pixel", "crayon", "reel"];

  // src/styles/schema.js
  var STYLE_SCHEMA_VERSION = 2;
  var PALETTE_KEYS = ["sky0", "sky1", "far", "mid", "ground", "ground2", "leaf", "trunk"];
  var HUE_KEYS = ["skin", "black", "white", "red", "gold"];
  var isHex = (s2) => typeof s2 === "string" && /^#[0-9A-Fa-f]{6}$/.test(s2);
  function normalizeStyle(raw = {}) {
    const d = { ...raw };
    const fonts = d.fonts || d.typography && d.typography.fonts || [];
    const motion2 = d.motion || {
      grammar: d.pacing && d.pacing.beat || d.camera && d.camera.notes || "",
      pacing: { scene: 5, hold: 1, transition: 0.6, ...d.pacing || {} },
      camera: { ...d.camera || {} },
      transitions: { ...d.transitions || {} }
    };
    if (!motion2.grammar) motion2.grammar = motion2.pacing && motion2.pacing.beat || "";
    const materials = d.materials || {
      world: d.worldMaterial || d.material || "flat",
      chars: d.characters && d.characters.material || d.material || "flat"
    };
    const lineage = d.lineage || { parents: [], weights: [], note: d.extracted ? "extracted starter" : "hand-authored" };
    const renderCost = d.renderCost || inferCost(d);
    const look = d.look !== void 0 ? d.look : d.three && d.three.post && d.three.post.look != null ? d.three.post.look : null;
    const out = {
      ...d,
      schemaVersion: STYLE_SCHEMA_VERSION,
      fonts: [...fonts],
      motion: {
        grammar: motion2.grammar || "",
        pacing: { scene: 5, hold: 1, transition: 0.6, ...motion2.pacing || {} },
        camera: { ...motion2.camera || {} },
        transitions: { ...motion2.transitions || {} }
      },
      look: look == null ? null : look,
      materials: { world: materials.world, chars: materials.chars },
      lineage: {
        parents: [...lineage.parents || []],
        weights: [...lineage.weights || []],
        note: lineage.note || ""
      },
      renderCost: {
        tier: renderCost && renderCost.tier || "medium",
        modules: [...renderCost && renderCost.modules || []],
        notes: renderCost && renderCost.notes || ""
      }
    };
    out.material = out.material || out.materials.chars;
    out.pacing = { ...out.motion.pacing };
    out.camera = { ...out.motion.camera };
    out.transitions = { ...out.motion.transitions };
    if (!out.typography) out.typography = {};
    if (!out.typography.fonts) out.typography.fonts = out.fonts.slice();
    else out.fonts = out.typography.fonts.slice();
    return out;
  }
  function inferCost(d) {
    const mods = [], tags = new Set(d.tags || []);
    if (d.requires && d.requires.some((r) => /three/.test(r))) {
      mods.push("three");
      tags.add("3d");
    }
    if (d.three) mods.push("three-post");
    if (d.look) mods.push("look");
    const tier = mods.includes("three") ? "high" : tags.has("gl") || /gl\.|inkBleed|mist/.test(JSON.stringify(d.effects || {})) ? "medium" : "low";
    return { tier, modules: mods, notes: tier === "high" ? "WebGL / vk.three" : tier === "medium" ? "2D + light GL fx" : "2D SVG" };
  }
  function validateStyle(raw) {
    const d = normalizeStyle(raw), errors = [];
    if (d.schemaVersion !== 2) errors.push("schemaVersion must be 2");
    if (!d.id || !/^[a-z][a-z0-9-]{0,31}$/.test(d.id)) errors.push("id: slug a-z / digits / hyphen");
    for (const k of ["name", "en", "description"]) if (!d[k]) errors.push(`missing ${k}`);
    for (const k of PALETTE_KEYS) if (!isHex(d.palette && d.palette[k])) errors.push(`palette.${k} hex`);
    for (const k of HUE_KEYS) if (!isHex(d.hues && d.hues[k])) errors.push(`hues.${k} hex`);
    if (!Array.isArray(d.fonts)) errors.push("fonts[]");
    if (!d.motion || typeof d.motion.grammar !== "string") errors.push("motion.grammar");
    if (!MATERIALS[d.materials.world]) errors.push(`materials.world unknown: ${d.materials.world}`);
    if (!MATERIALS[d.materials.chars]) errors.push(`materials.chars unknown: ${d.materials.chars}`);
    if (!Array.isArray(d.qa) || d.qa.length < 1) errors.push("qa[]");
    if (!d.lineage || !Array.isArray(d.lineage.parents)) errors.push("lineage.parents");
    return { ok: !errors.length, errors, data: d };
  }
  function lerpNum(a, b, w) {
    return a + (b - a) * w;
  }
  function mixVal(a, b, w) {
    if (typeof a === "number" && typeof b === "number") return lerpNum(a, b, w);
    if (isHex(a) && isHex(b)) return mix(a, b, w);
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      const keys = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)]), out = {};
      for (const k of keys) out[k] = a[k] == null ? b[k] : b[k] == null ? a[k] : mixVal(a[k], b[k], w);
      return out;
    }
    return w < 0.5 ? a : b;
  }
  function concatLook(a, b) {
    const toArr = (x) => {
      if (x == null) return [];
      if (typeof x === "string") return [{ type: "preset", preset: x }];
      if (Array.isArray(x)) return x.map((p) => typeof p === "string" ? { type: p } : { ...p });
      if (x.preset) return [{ type: "preset", preset: x.preset }, ...x.chain || []];
      if (x.chain) return x.chain.slice();
      return [x];
    };
    const chain = [...toArr(a), ...toArr(b)];
    return chain.length ? { chain } : null;
  }
  function mixStyles(aRaw, bRaw, w = 0.5, { id, name, en, note } = {}) {
    const A = normalizeStyle(aRaw), B4 = normalizeStyle(bRaw);
    const wB = Math.max(0, Math.min(1, +w || 0)), wA = 1 - wB;
    const idOut = id || `${A.id}-x-${B4.id}`;
    const palette = mixVal(A.palette, B4.palette, wB);
    const hues = mixVal(A.hues || {}, B4.hues || {}, wB);
    const P2 = mixVal(A.P || {}, B4.P || {}, wB);
    const motion2 = {
      grammar: wB < 0.5 ? A.motion.grammar : B4.motion.grammar,
      pacing: mixVal(A.motion.pacing, B4.motion.pacing, wB),
      camera: mixVal(A.motion.camera, B4.motion.camera, wB),
      transitions: wB < 0.5 ? { ...A.motion.transitions } : { ...B4.motion.transitions }
    };
    const materials = wB < 0.5 ? { ...A.materials } : { ...B4.materials };
    const fonts = wB < 0.5 ? A.fonts.slice() : B4.fonts.slice();
    const look = concatLook(A.look, B4.look);
    const sound = wB < 0.5 ? structuredClone(A.sound) : structuredClone(B4.sound);
    const qa = [.../* @__PURE__ */ new Set([...A.qa || [], ...B4.qa || []])];
    const tags = [.../* @__PURE__ */ new Set([...A.tags || [], ...B4.tags || [], "mixed"])];
    const raw = {
      schemaVersion: 2,
      id: idOut,
      order: Math.max(A.order || 50, B4.order || 50) + 1,
      name: name || `${A.name}\xD7${B4.name}`,
      en: en || `mix ${A.id} ${(wA * 100).toFixed(0)}% + ${B4.id} ${(wB * 100).toFixed(0)}%`,
      description: `Mixed style: ${A.id} (w=${wA.toFixed(2)}) + ${B4.id} (w=${wB.toFixed(2)}). ${note || "Parameter lerp + look-chain concat; hand-tune hooks in style.js."}`,
      tags,
      theme: wB < 0.5 ? A.theme : B4.theme,
      palette,
      hues,
      fonts,
      motion: motion2,
      look,
      materials,
      sound,
      qa,
      lineage: { parents: [A.id, B4.id], weights: [+wA.toFixed(4), +wB.toFixed(4)], note: note || `vk style mix ${A.id} ${B4.id} --w ${wB}` },
      renderCost: {
        tier: A.renderCost.tier === "high" || B4.renderCost.tier === "high" ? "high" : A.renderCost.tier === "medium" || B4.renderCost.tier === "medium" ? "medium" : "low",
        modules: [.../* @__PURE__ */ new Set([...A.renderCost.modules || [], ...B4.renderCost.modules || []])],
        notes: `mix of ${A.id} + ${B4.id}`
      },
      material: materials.chars,
      P: P2,
      video: mixVal(A.video || {}, B4.video || {}, wB),
      typography: { ...wB < 0.5 ? A.typography : B4.typography, fonts },
      characters: wB < 0.5 ? { ...A.characters } : { ...B4.characters },
      effects: wB < 0.5 ? { ...A.effects } : { ...B4.effects },
      demo: wB < 0.5 ? { ...A.demo } : { ...B4.demo },
      pacing: motion2.pacing,
      camera: motion2.camera,
      transitions: motion2.transitions
    };
    if (A.three || B4.three) raw.three = wB < 0.5 ? A.three : B4.three;
    return normalizeStyle(raw);
  }
  function forkStyle(raw, { id, name, en, note } = {}) {
    const A = normalizeStyle(raw);
    const idOut = id || `${A.id}-fork`;
    return normalizeStyle({
      ...structuredClone(A),
      id: idOut,
      name: name || `${A.name} fork`,
      en: en || `fork of ${A.id}`,
      description: `Fork of ${A.id}. ${note || "Edit freely; lineage records the parent."}`,
      tags: [.../* @__PURE__ */ new Set([...A.tags || [], "fork"])],
      lineage: { parents: [A.id], weights: [1], note: note || `vk style fork ${A.id}` }
    });
  }
  function matchBaseFromPrompt(text3 = "") {
    const t = String(text3).toLowerCase();
    const rules = [
      [/水墨|墨|宣纸|写意|ink|sumi|wash/, "ink"],
      [/剪纸|窗花|papercut|paper.?cut|scissors/, "papercut"],
      [/皮影|影子|shadow|silhouette/, "shadow"],
      [/京剧|戏曲|opera|脸谱/, "opera"],
      [/霓虹|赛博|neon|cyber|glow/, "neon"],
      [/像素|8.?bit|pixel|retro.?game/, "pixel"],
      [/蜡笔|彩铅|crayon|pastel|sketch/, "crayon"],
      [/胶片|电影感|reel|film.?grain|cinematic/, "reel"],
      [/科技|产品|three|3d|webgl|turntable/, "tech"]
    ];
    for (const [re, id] of rules) if (re.test(t)) return id;
    if (/暗|夜|黑|dark|noir/.test(t)) return "shadow";
    if (/童|可爱|软|soft|cute/.test(t)) return "crayon";
    return "tech";
  }

  // src/styles/kit.js
  var kit_exports = {};
  __export(kit_exports, {
    attr: () => attr2,
    burst: () => burst,
    clamp: () => clamp2,
    css: () => css2,
    ease: () => ease,
    esc: () => escH,
    overlay: () => overlay,
    placeOpts: () => placeOpts,
    prog: () => prog,
    svgEl: () => svgEl,
    svgLayer: () => svgLayer,
    win: () => win
  });
  var NS3 = "http://www.w3.org/2000/svg";
  var ease = { out: (u) => 1 - Math.pow(1 - clamp01(u), 3), inOut: (u) => smooth01(clamp01(u)), back: (u) => {
    u = clamp01(u);
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
  } };
  var prog = (l, at, d) => clamp01((l - at) / Math.max(1e-6, d));
  var win = (l, at, d = 0.35, out = Infinity, fo = 0.35) => Math.min(prog(l, at, d), 1 - prog(l, out, fo));
  function css2(el2, k, v) {
    const s2 = String(v);
    if (!el2.__c) el2.__c = {};
    if (el2.__c[k] !== s2) {
      el2.__c[k] = s2;
      el2.style[k] = s2;
    }
  }
  function attr2(el2, k, v) {
    const s2 = String(v);
    if (!el2.__a) el2.__a = {};
    if (el2.__a[k] !== s2) {
      el2.__a[k] = s2;
      el2.setAttribute(k, s2);
    }
  }
  function svgLayer(sc, o = {}) {
    const v = sc.video, W = v.W, H = v.H;
    const el2 = sc.html(`<svg class="${o.cls || "vk-style-layer"}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none${o.z != null ? ";z-index:" + o.z : ""}"></svg>`, { fixed: !!o.fixed });
    return el2;
  }
  function svgEl(parent, tag, a = {}, inner) {
    const e = document.createElementNS(NS3, tag);
    for (const k in a) e.setAttribute(k, a[k]);
    if (inner != null) e.innerHTML = inner;
    parent.appendChild(e);
    return e;
  }
  function overlay(sc, html2, o = {}) {
    const el2 = sc.html(`<div class="vk-style-ov" style="position:absolute;left:0;top:0;width:${sc.video.W}px;height:${sc.video.H}px;pointer-events:none;${o.css || ""}">${html2}</div>`, { fixed: o.fixed !== false });
    if (o.z != null) el2.style.zIndex = o.z;
    return el2;
  }
  var escH = (s2) => String(s2).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function placeOpts(sc, o, dx = 0.5, dy = 0.32) {
    const W = sc.video.W, H = sc.video.H;
    const X2 = o.x == null ? W * dx : o.x <= 1 ? o.x * W : o.x, Y = o.y == null ? H * dy : o.y <= 1 ? o.y * H : o.y;
    return { x: X2, y: Y, at: o.at != null ? o.at : 0.3, out: o.out != null ? o.out : Infinity, size: o.size };
  }
  function burst(sc, o = {}) {
    const vk2 = window.vk, t = o.at || 0, fixed = o.fixed !== false;
    const [x, y] = fixed && sc.toScreen ? sc.toScreen([o.x != null ? o.x : 640, o.y != null ? o.y : 360], t) : [o.x || 640, o.y || 360];
    const P2 = vk2.particles({
      seed: o.seed || 3,
      burst: [{ t, n: o.n || 46, dur: o.spawn || 0 }],
      x,
      y,
      angle: o.angle != null ? o.angle : -90,
      spread: o.spread != null ? o.spread : 300,
      speed: o.speed || [220, 620],
      gravity: o.gravity != null ? o.gravity : 700,
      drag: o.drag != null ? o.drag : 1.1,
      life: o.life || [1.1, 1.9],
      size: o.size || [8, 18],
      spin: o.spin || [-260, 260],
      rot: [0, 360],
      sway: o.sway,
      fadeOut: o.fadeOut != null ? o.fadeOut : 0.35,
      alpha: o.alpha || [0.85, 1],
      ...o.particle || {}
    });
    return sc.gl([vk2.gl.particles({ system: P2, shape: o.shape || "petal", colors: o.colors || ["#c0392b"], color2: o.color2, blend: o.blend })], { fixed, blend: o.css, z: o.z, zIndex: o.zIndex != null ? o.zIndex : fixed ? 15 : void 0 });
  }
  var clamp2 = clamp01;

  // src/styles/sound.js
  var V2 = registry.sounds;
  var TAU5 = Math.PI * 2;
  var set = (n, f) => {
    if (!V2[n]) V2[n] = f;
  };
  function daluo(sr) {
    const dur = 2.6, n = Math.floor(sr * dur), out = new Float32Array(n), f = 190, R2 = mulberry32(11);
    const parts = [[1, 1, 1.6], [1.51, 0.55, 1.1], [2.13, 0.42, 0.8], [2.76, 0.3, 0.6], [3.41, 0.22, 0.45], [4.37, 0.14, 0.35], [5.2, 0.1, 0.25]];
    const ph = parts.map(() => 0), bp = biquad("bandpass", 2400, 1.2, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr, bend = 1 - 0.16 * (1 - Math.exp(-t / 0.12));
      let s2 = 0;
      parts.forEach((p, j) => {
        ph[j] += TAU5 * f * p[0] * bend / sr;
        s2 += p[1] * Math.sin(ph[j] + j) * Math.exp(-t / p[2]) * (1 + 0.2 * Math.sin(TAU5 * (3.1 + j) * t));
      });
      out[i] = (s2 + bp(R2() * 2 - 1) * 2.4 * Math.exp(-t / 0.05) + (R2() * 2 - 1) * 0.12 * Math.exp(-t / 0.5)) * Math.min(1, t / 2e-3);
    }
    return normPeak(out, 0.85);
  }
  function xiaoluo(sr) {
    const dur = 1.3, n = Math.floor(sr * dur), out = new Float32Array(n), f = 780, R2 = mulberry32(5);
    const parts = [[1, 1, 0.7], [1.62, 0.35, 0.45], [2.4, 0.22, 0.3], [3.3, 0.12, 0.2]], ph = parts.map(() => 0), bp = biquad("bandpass", 5200, 1.5, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr, bend = 1 + 0.1 * (1 - Math.exp(-t / 0.09));
      let s2 = 0;
      parts.forEach((p, j) => {
        ph[j] += TAU5 * f * p[0] * bend / sr;
        s2 += p[1] * Math.sin(ph[j]) * Math.exp(-t / p[2]);
      });
      out[i] = (s2 + bp(R2() * 2 - 1) * 1.6 * Math.exp(-t / 0.02)) * Math.min(1, t / 1e-3);
    }
    return normPeak(out, 0.7);
  }
  function nao(sr, mute) {
    const dur = mute ? 0.16 : 1.1, n = Math.floor(sr * dur), out = new Float32Array(n), R2 = mulberry32(mute ? 23 : 17);
    const fr = [296, 437, 523, 609, 781, 1003], ph = fr.map(() => 0), hp = biquad("highpass", 3200, 0.7, sr), bp = biquad("bandpass", 7e3, 0.8, sr), dec = mute ? 0.045 : 0.38;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let m = 0;
      fr.forEach((f, j) => {
        ph[j] += f * 1.37 / sr;
        m += ph[j] % 1 < 0.5 ? 1 : -1;
      });
      out[i] = (hp(m * 0.25 + (R2() * 2 - 1)) * 0.8 + bp(R2() * 2 - 1) * 0.7) * Math.exp(-t / dec) * Math.min(1, t / 15e-4);
    }
    return normPeak(out, 0.6);
  }
  function bangu(sr) {
    const n = Math.floor(sr * 0.12), out = new Float32Array(n), R2 = mulberry32(31), bp = biquad("bandpass", 2900, 3, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      ph += TAU5 * (1250 - 500 * Math.min(1, t / 0.03)) / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.018) * 0.8 + bp(R2() * 2 - 1) * 2.5 * Math.exp(-t / 0.01);
    }
    return normPeak(out, 0.75);
  }
  function tanggu(sr) {
    const n = Math.floor(sr * 0.7), out = new Float32Array(n), R2 = mulberry32(41), lp = biquad("lowpass", 900, 0.8, sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      ph += TAU5 * 88 * (1 + 0.6 * Math.exp(-t / 0.03)) / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.22) + lp(R2() * 2 - 1) * Math.exp(-t / 0.03) * 0.9;
    }
    return normPeak(out, 0.85);
  }
  function bar(sr, f, o = {}) {
    const dur = o.dur || 0.9, n = Math.floor(sr * dur), out = new Float32Array(n), modes = o.modes || [[1, 1, 0.38], [3.93, 0.28, 0.06], [9.2, 0.08, 0.02]];
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let s2 = 0;
      for (const [m, a, d] of modes) s2 += a * Math.sin(TAU5 * f * m * t) * Math.exp(-t / d);
      out[i] = s2 * Math.min(1, t / 15e-4);
    }
    return normPeak(out, 0.8);
  }
  function rustle(sr, o = {}) {
    const dur = o.dur || 0.3, n = Math.floor(sr * dur), out = new Float32Array(n), R2 = mulberry32(o.seed || 9), bp = biquad("bandpass", o.f || 2600, 0.8, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr, gr = R2() < 0.25 ? 1 : 0.25;
      out[i] = bp(R2() * 2 - 1) * gr * Math.sin(Math.PI * t / dur);
    }
    return normPeak(out, 0.7);
  }
  set("op-daluo", (k, t, v) => k.buf(t, "op-daluo", () => daluo(k.sr), 0.5 * v));
  set("op-xiaoluo", (k, t, v) => k.buf(t, "op-xiaoluo", () => xiaoluo(k.sr), 0.34 * v));
  set("op-nao", (k, t, v) => k.buf(t, "op-nao", () => nao(k.sr, false), 0.3 * v));
  set("op-naoMute", (k, t, v) => k.buf(t, "op-naoMute", () => nao(k.sr, true), 0.28 * v));
  set("op-bangu", (k, t, v) => k.buf(t, "op-bangu", () => bangu(k.sr), 0.38 * v));
  set("op-tanggu", (k, t, v) => k.buf(t, "op-tanggu", () => tanggu(k.sr), 0.55 * v));
  set("bangzi", (k, t, v, f) => k.buf(t, "bangzi" + (f || 1150), () => woodfish(k.sr, { f: f || 1150, dur: 0.12 }), 0.4 * v));
  set("chip", (k, t, v, f) => k.tone(t, "square", f || 660, f || 660, 0.11, 0.07 * v));
  set("chipJump", (k, t, v, f) => {
    f = f || 330;
    k.tone(t, "square", f, f * 2.6, 0.2, 0.07 * v);
  });
  set("chipHit", (k, t, v) => {
    k.noise(t, 0.12, "lowpass", 1600, 0.8, 0.35 * v);
    k.tone(t, "square", 220, 70, 0.16, 0.08 * v);
  });
  set("chipNoise", (k, t, v) => k.noise(t, 0.05, "highpass", 5e3, 0.7, 0.14 * v));
  set("saw", (k, t, v, f) => {
    f = f || 220;
    k.tone(t, "sawtooth", f, f, 0.32, 0.045 * v);
    k.tone(t, "sawtooth", f * 1.006, f * 1.006, 0.32, 0.03 * v);
  });
  set("zap", (k, t, v) => {
    k.tone(t, "sawtooth", 1900, 180, 0.22, 0.08 * v);
    k.noise(t, 0.1, "bandpass", 3e3, 2, 0.12 * v);
  });
  set("thump", (k, t, v) => {
    k.tone(t, "sine", 120, 38, 0.3, 0.8 * v);
    k.noise(t, 0.06, "lowpass", 600, 0.8, 0.3 * v);
  });
  set("marimba", (k, t, v, f) => k.buf(t, "marimba" + (f || 523), () => bar(k.sr, f || 523.25), 0.32 * v));
  set("kalimba", (k, t, v, f) => k.buf(t, "kalimba" + (f || 784), () => bar(k.sr, f || 784, { dur: 1.4, modes: [[1, 1, 0.6], [5.4, 0.18, 0.05], [2.01, 0.12, 0.3]] }), 0.26 * v));
  set("rustle", (k, t, v) => k.buf(t, "rustle", () => rustle(k.sr), 0.3 * v));
  set("shaker", (k, t, v) => k.noise(t, 0.07, "highpass", 6500, 0.8, 0.1 * v, 0.02));
  function bed(v, spec = {}) {
    const S2 = v.scenes, end = spec.to != null ? spec.to : S2.length ? S2[S2.length - 1].start + S2[S2.length - 1].dur : 10;
    const bpm = spec.bpm || 90, beat = 60 / bpm, step = beat / 4, from = spec.from || 0, G3 = spec.gain != null ? spec.gain : 1;
    const fi = spec.fadeIn != null ? spec.fadeIn : 1, fo = spec.fadeOut != null ? spec.fadeOut : 1.5;
    const env2 = (t) => Math.min(1, (t - from) / Math.max(0.01, fi), (end - t) / Math.max(0.01, fo));
    let count = 0;
    for (const tr of spec.tracks || []) {
      const pat = tr.steps || "x...", notes = tr.notes || [null], rnd2 = mulberry32((spec.seed || 1) * 97 + (tr.seed || count + 1));
      let ni = 0, walk = Math.floor(notes.length / 2);
      const barLen = pat.length * step;
      for (let t0 = from + (tr.from || 0) * barLen; t0 < end - 0.05 && (tr.to == null || t0 < from + tr.to * barLen); t0 += barLen) {
        for (let i = 0; i < pat.length; i++) {
          const c = pat[i];
          if (c === "." || c === "-") continue;
          let t = t0 + i * step + (i % 2 ? (spec.swing || 0) * step : 0) + (tr.dt || 0);
          if (t >= end - 0.05) break;
          const e = env2(t);
          if (e <= 0) continue;
          let f = notes[ni % notes.length];
          if (tr.walk) {
            walk = Math.max(0, Math.min(notes.length - 1, walk + Math.round((rnd2() - 0.5) * 3.2)));
            f = notes[walk];
            if (tr.rest && rnd2() < tr.rest) continue;
          }
          ni++;
          v.sfx(+t.toFixed(3), tr.voice, (tr.gain != null ? tr.gain : 0.6) * G3 * e * (c === "o" ? 0.55 : 1), f || void 0);
          count++;
        }
      }
    }
    return count;
  }
  function scaleNotes(root, iv = [0, 2, 4, 7, 9], oct = 2) {
    const out = [];
    for (let o = 0; o < oct; o++) iv.forEach((s2) => out.push(+(root * Math.pow(2, o + s2 / 12)).toFixed(2)));
    return out;
  }
  var SCALES = { penta: [0, 2, 4, 7, 9], minorPenta: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], insen: [0, 1, 5, 7, 10] };

  // src/styles/story.js
  var VERBS = ["enter", "exit", "walk", "run", "wave", "cheer", "point", "talk", "bow", "surprise", "think", "look", "sad", "jump", "idle", "face", "turn"];
  var GESTURE_DUR = { wave: 1.6, cheer: 1.6, point: 1.5, talk: 1.6, bow: 1.4, surprise: 1.2, think: 2, look: 1.6, sad: 2, jump: 1.1, idle: 0.6 };
  var HAIR = ["bun", "twinbuns", "pony", "long", "short", "cap", "bald"];
  var HUE = ["red", "deepred", "gold", "yellow", "blue", "green", "teal", "brown", "orange", "pink", "purple", "grey", "cream", "black", "white"];
  var VOICES = { girl: "zh-CN-XiaoyiNeural", boy: "zh-CN-YunxiaNeural", kid: "zh-CN-YunxiaNeural", woman: "zh-CN-XiaoxiaoNeural", man: "zh-CN-YunxiNeural", elder: "zh-CN-YunyangNeural", grandma: "zh-CN-XiaoxiaoNeural" };
  var VERB_ZH = { \u8FDB\u573A: "enter", \u8D70\u8FDB: "enter", \u767B\u573A: "enter", \u79BB\u5F00: "exit", \u9000\u573A: "exit", \u8D70: "walk", \u8DD1: "run", \u6325\u624B: "wave", \u6B22\u547C: "cheer", \u6307: "point", \u8BF4: "talk", \u97A0\u8EAC: "bow", \u5403\u60CA: "surprise", \u60F3: "think", \u62AC\u5934: "look", \u96BE\u8FC7: "sad", \u8DF3: "jump", \u7AD9: "idle", \u8F6C\u8EAB: "turn" };
  function castSpec(id, tokens = []) {
    const look = {}, out = { id, look };
    const hues = [];
    for (const t of tokens.map((s2) => String(s2).trim()).filter(Boolean)) {
      if (HAIR.includes(t)) look.hairStyle = t;
      else if (HUE.includes(t)) hues.push(t);
      else if (VOICES[t]) {
        out.kind = t;
        out.voice = out.voice || VOICES[t];
      } else if (/^[a-z]{2}-[A-Z]{2}-/.test(t)) out.voice = t;
      else if (/^(rate|pitch)=/.test(t)) out[t.split("=")[0]] = t.split("=")[1];
      else if (/^\w+=/.test(t)) {
        const [k, v] = t.split("=");
        look[k] = v;
      }
    }
    if (hues[0]) {
      look.cloth = hues[0];
      look.cloth2 = hues[0];
    }
    if (hues[1]) {
      look.trim = hues[1];
      look.sash = hues[1];
      look.scarf = hues[1];
    }
    if (hues[2]) look.pants = hues[2];
    return out;
  }
  var clean = (s2) => s2.replace(/\s+/g, " ").trim();
  function parseStory(src2) {
    if (typeof src2 === "object") return normalise(src2);
    const txt2 = String(src2).replace(/\r/g, "");
    if (/^\s*\{/.test(txt2)) return normalise(JSON.parse(txt2));
    const S2 = { title: "", sub: "", cast: [], scenes: [] };
    let cur = null;
    const cast = (id) => {
      let c = S2.cast.find((x) => x.id === id);
      if (!c) {
        c = castSpec(id);
        S2.cast.push(c);
      }
      return c;
    };
    for (const raw of txt2.split("\n")) {
      const line = raw.trim();
      if (!line || /^<!--/.test(line)) continue;
      let m;
      if (m = /^#\s+(.+)$/.exec(line)) {
        S2.title = clean(m[1]);
        continue;
      }
      if (m = /^##\s+(.+)$/.exec(line)) {
        const [name, setting] = m[1].split(/\s*[@|]\s*/);
        cur = { name: clean(name).replace(/^\d+[.、]?\s*/, "") || "scene " + (S2.scenes.length + 1), setting: clean(setting || ""), lines: [], actions: [] };
        S2.scenes.push(cur);
        continue;
      }
      if (!cur) {
        if (m = /^cast\s+([^:：]+)[:：]\s*(.*)$/i.exec(line)) {
          const c = castSpec(clean(m[1]), m[2].split(/[\s,，]+/));
          const i = S2.cast.findIndex((x) => x.id === c.id);
          if (i >= 0) S2.cast[i] = c;
          else S2.cast.push(c);
          continue;
        }
        if (m = /^([a-z]+)\s*[:：]\s*(.+)$/i.exec(line)) {
          S2[m[1].toLowerCase()] = clean(m[2]);
          continue;
        }
        continue;
      }
      if (m = /^>\s*(?:旁白\s*[:：])?\s*(.+)$/.exec(line)) {
        cur.lines.push({ text: clean(m[1]) });
        continue;
      }
      if (m = /^[-*]\s+(.+)$/.exec(line)) {
        const a = parseAction(clean(m[1]), S2);
        if (a) {
          a.line = cur.lines.length - 1;
          cur.actions.push(a);
          if (a.who) cast(a.who);
        }
        continue;
      }
      if (m = /^([^\s:：>#-][^:：]{0,11})\s*[:：]\s*(.+)$/.exec(line)) {
        const who = clean(m[1]);
        cast(who);
        cur.lines.push({ who, text: clean(m[2]) });
        continue;
      }
      cur.lines.push({ text: clean(line) });
    }
    return normalise(S2);
  }
  function parseAction(s2, S2 = { cast: [] }) {
    const w = s2.split(/\s+/), head = w[0].toLowerCase();
    if (head === "shot" || head === "\u955C\u5934") {
      const ids = S2.cast.map((c) => c.id);
      const on = w.slice(2).join(" ") || null;
      return { do: "shot", shot: w[1] || "medium", on: on && (on === "all" || ids.includes(on) ? on : on) };
    }
    if (head === "punch") return { do: "punch", amount: w[1] ? +w[1] : null };
    if (head === "effect" || head === "\u7279\u6548") return { do: "effect", name: w[1] || "signature" };
    if (head === "sfx") return { do: "sfx", kind: w[1] || "big" };
    if (head === "hold") return { do: "hold", dur: +w[1] || 1 };
    if (head === "transition") return { do: "transition", kind: w[1] || "default" };
    if (head === "title") return { do: "title", text: w.slice(1).join(" ") };
    const verb = VERB_ZH[w[1]] || (w[1] || "idle").toLowerCase();
    if (!VERBS.includes(verb)) return { do: "unknown", text: s2 };
    return { do: verb, who: w[0], arg: w.slice(2).join(" ") || null };
  }
  function normalise(S2) {
    const out = { title: S2.title || "", sub: S2.sub || "", narrator: S2.narrator || S2.voice || null, style: S2.style || null, rate: S2.rate || null, cast: [], scenes: [] };
    out.cast = (S2.cast || []).map((c) => typeof c === "string" ? castSpec(c) : { look: {}, ...c });
    out.scenes = (S2.scenes || []).map((sc, i) => ({ name: sc.name || "scene " + (i + 1), setting: sc.setting || "", lines: (sc.lines || []).map((l) => typeof l === "string" ? { text: l } : l), actions: (sc.actions || []).map((a) => ({ line: -1, ...a })), dur: sc.dur || null, transition: sc.transition || null }));
    for (const sc of out.scenes) for (const x of [...sc.lines, ...sc.actions]) if (x.who && !out.cast.find((c) => c.id === x.who)) out.cast.push(castSpec(x.who));
    return out;
  }
  function sceneCast(sc) {
    const ids = [];
    for (const x of [...sc.actions, ...sc.lines]) if (x.who && !ids.includes(x.who)) ids.push(x.who);
    return ids;
  }
  function slots(n) {
    return n <= 1 ? [0.42] : n === 2 ? [0.33, 0.66] : Array.from({ length: n }, (_, i) => 0.2 + 0.6 * i / (n - 1));
  }
  function actorPlan(actions, who, anchors, o = {}) {
    const speed = o.speed || 150, runSpeed = o.runSpeed || 330, W = o.W || 1280, home = o.home != null ? o.home : W * 0.42;
    const segs = [];
    let x = home, end = 0, visible = true;
    const mine = actions.filter((a) => a.who === who);
    if (mine.length && mine[0].do === "enter") {
      const side = /right|右/.test(mine[0].arg || "") ? 1 : -1;
      x = side > 0 ? W + 140 : -140;
      visible = false;
    }
    const x0 = x;
    for (const a of mine) {
      const t0 = Math.max(anchors(a.line), end);
      if (["enter", "exit", "walk", "run"].includes(a.do)) {
        let to = home;
        if (a.do === "exit") to = /left|左/.test(a.arg || "") ? -160 : /right|右/.test(a.arg || "") ? W + 160 : x < W / 2 ? -160 : W + 160;
        else if (a.do !== "enter" && a.arg) to = /left|左/.test(a.arg) ? W * 0.25 : /right|右/.test(a.arg) ? W * 0.72 : /center|centre|中/.test(a.arg) ? W * 0.5 : isFinite(+a.arg) ? +a.arg : home;
        const sp = a.do === "run" ? runSpeed : speed, d = Math.max(0.4, Math.abs(to - x) / sp + 0.35);
        segs.push({ do: a.do === "run" ? "run" : "walk", t0, t1: t0 + d, from: x, to });
        x = to;
        end = t0 + d;
      } else if (a.do === "face" || a.do === "turn") segs.push({ do: "face", t0, t1: t0, dir: /left|左/.test(a.arg || "") ? -1 : /right|右/.test(a.arg || "") ? 1 : 0 });
      else {
        const d = a.arg && isFinite(+a.arg) ? +a.arg : GESTURE_DUR[a.do] || 1.5;
        segs.push({ do: a.do, t0, t1: t0 + d });
        end = t0 + d;
      }
    }
    return { x0, visible, segs, end };
  }

  // src/styles/film.js
  var ALT_LOOKS = [
    { hairStyle: "twinbuns", cloth: "gold", cloth2: "gold", trim: "red", pants: "brown", sash: "red", scarf: "red" },
    { hairStyle: "cap", cloth: "blue", cloth2: "blue", trim: "gold", pants: "grey", sash: "gold" },
    { hairStyle: "long", cloth: "green", cloth2: "green", trim: "pink", pants: "cream", sash: "pink" },
    { hairStyle: "bald", cloth: "brown", cloth2: "brown", trim: "cream", pants: "grey", sash: "cream" }
  ];
  var sm4 = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  };
  var walkEase = (u) => 0.45 * Math.max(0, Math.min(1, u)) + 0.55 * sm4(u);
  var mixPose = (a, b, w) => {
    if (w <= 0) return a;
    if (w >= 1) return b;
    const o = { ...a };
    for (const k in b) o[k] = typeof a[k] === "number" && typeof b[k] === "number" ? a[k] + (b[k] - a[k]) * w : w < 0.5 ? a[k] : b[k];
    return o;
  };
  function film(vk2, src2, o = {}) {
    const story = parseStory(src2), styleSpec = o.style || story.style || "papercut";
    const S0 = vk2.style(styleSpec);
    const page = (typeof location !== "undefined" ? location.pathname.split("/").pop() : "film.html").replace(/\.html?$/i, "");
    const cast = {};
    story.cast.forEach((c) => {
      if (c.voice || c.rate || c.pitch) cast[c.id] = { ...c.voice ? { voice: c.voice } : {}, ...c.rate ? { rate: c.rate } : {}, ...c.pitch ? { pitch: c.pitch } : {} };
    });
    const sv = S0.voice;
    const v = vk2.video({
      style: styleSpec,
      fps: o.fps || 30,
      title: story.title || "vidkit film",
      voice: { manifest: o.manifest || page + ".vo.json", voice: story.narrator || sv.voice, rate: story.rate || sv.rate || "+0%", lead: 0.6, tail: 0.9, gap: 0.3, maxChars: 18, cast },
      mix: { lufs: -14, duck: -9, fadeOut: 1.5 },
      ...o.video || {}
    });
    const S2 = v.style, CAM = S2.camera, demoLook = S2.parts.chars.demo && S2.parts.chars.demo.look || S2.base.demo && S2.base.demo.look || {};
    const looks = {};
    story.cast.forEach((c, i) => {
      looks[c.id] = { ...i === 0 ? demoLook : ALT_LOOKS[(i - 1) % ALT_LOOKS.length], ...c.look || {} };
    });
    const scale2 = o.scale || 0.7, Wd = v.W || 1280;
    story.scenes.forEach((st, si) => {
      const holds = st.actions.filter((a) => a.do === "hold").reduce((s2, a) => s2 + a.dur, 0);
      const trA = st.actions.find((a) => a.do === "transition");
      const opts = { transition: si === 0 ? void 0 : S2.transition(st.transition || trA && trA.kind || (si === story.scenes.length - 1 ? "soft" : "default")), voTail: 0.9 + holds, hold: 0.6 + holds };
      if (st.lines.length) opts.vo = st.lines.map((l) => l.who ? { who: l.who, text: l.text } : { text: l.text });
      vk2.scene(st.name, st.dur || (st.lines.length ? "auto" : 4), opts, (sc) => {
        const segs = sc.voSegs || [], anchor = (i) => i >= 0 && segs[i] ? segs[i].at : si === 0 ? 0.3 : (sc.transition ? sc.transition.d : 0) + 0.1;
        const W = S2.world(sc, st.setting || "field day", { seed: si + 1, bakeScale: o.bakeScale || 1.5 });
        const side = (id) => {
          const e = st.actions.find((a) => a.who === id && a.do === "enter");
          return !e ? 0 : /right|右/.test(e.arg || "") ? 1 : -1;
        };
        const ids = sceneCast(st), order = ids.map((id, i) => [side(id), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[1]);
        const sl0 = slots(ids.length), sl = ids.map((_, i) => sl0[order.indexOf(i)]);
        const actors = ids.map((id, k) => {
          const ch = S2.character(W.actors, { look: looks[id] || {}, scale: scale2, seed: 3 + k * 7 });
          const plan = actorPlan(st.actions, id, anchor, { W: Wd, home: Wd * sl[k], speed: 150 * scale2 / 0.7, runSpeed: 330 * scale2 / 0.7 });
          let D = 0, x = plan.x0, dir = x > Wd / 2 ? -1 : 1;
          const tl = plan.segs.map((sg) => {
            if (sg.do === "walk" || sg.do === "run") {
              const sgn = Math.sign(sg.to - x) || dir, units = Math.abs(sg.to - x) / scale2, De = ch.gait.rest(D + units);
              const r = { ...sg, dir: sgn, Ds: D, De, xp: x - sgn * D * scale2, xs: x };
              x = x + sgn * (De - D) * scale2;
              D = De;
              dir = sgn;
              r.xe = x;
              return r;
            }
            if (sg.do === "face") {
              if (sg.dir) dir = sg.dir;
              return { ...sg, fdir: dir };
            }
            return sg;
          });
          return { id, k, ch, plan, tl, xEnd: x };
        });
        const byId = Object.fromEntries(actors.map((a) => [a.id, a]));
        function where(a, l) {
          let w = null, last = null, face = null;
          for (const sg of a.tl) {
            if (sg.do === "walk" || sg.do === "run") {
              if (l >= sg.t0 && l < sg.t1) w = sg;
              if (l >= sg.t1) last = sg;
            }
            if (sg.do === "face" && l >= sg.t0) face = { t: sg.t0, dir: sg.fdir };
          }
          if (w) {
            const u = (l - w.t0) / (w.t1 - w.t0), d2 = w.Ds + (w.De - w.Ds) * walkEase(u);
            return { walking: w, d: d2, X: w.xp + w.dir * d2 * scale2, dir: w.dir };
          }
          const X2 = last ? last.xe : a.plan.x0, d = last ? last.De : 0;
          let dir = last ? last.dir : a.plan.x0 > Wd / 2 ? -1 : 1;
          if (face && (!last || face.t >= last.t1)) dir = face.dir;
          else if (!face) {
            let best = null;
            for (const b of actors) {
              if (b === a) continue;
              const bx = b.__X ? b.__X(l) : b.plan.x0;
              if (bx > -60 && bx < Wd + 60 && (best == null || Math.abs(bx - X2) < Math.abs(best - X2))) best = bx;
            }
            if (best != null && Math.abs(best - X2) > 40) dir = Math.sign(best - X2);
          }
          return { walking: null, d, X: X2, dir };
        }
        actors.forEach((a) => {
          a.__X = (l) => {
            let X2 = a.plan.x0;
            for (const sg of a.tl) if ((sg.do === "walk" || sg.do === "run") && l >= sg.t0) X2 = l >= sg.t1 ? sg.xe : sg.xp + sg.dir * (sg.Ds + (sg.De - sg.Ds) * walkEase((l - sg.t0) / (sg.t1 - sg.t0))) * scale2;
            return X2;
          };
        });
        const speakingSeg = (a, l) => segs.find((s2) => s2.who === a.id && l >= s2.at - 0.05 && l <= s2.end + 0.1) || null;
        const gestureAt = (a, l) => a.tl.find((sg) => !["walk", "run", "face"].includes(sg.do) && l >= sg.t0 && l < sg.t1) || null;
        const clips = (a) => a.ch.rig.clips;
        function clipFn(a, l, w) {
          const C2 = clips(a), seg2 = speakingSeg(a, l), g2 = gestureAt(a, l);
          const baseName = w.walking ? w.walking.do === "run" ? "run" : "walk" : seg2 ? "talk" : "idle";
          if (!g2) return C2[baseName];
          const gf = g2.do === "jump" ? () => C2.jump(l - g2.t0) : C2[g2.do] || C2.idle, k = Math.min(sm4((l - g2.t0) / 0.25), sm4((g2.t1 - l) / 0.25));
          return (u) => mixPose(C2[baseName](u), gf(u), g2.do === "jump" ? 1 : k);
        }
        function state(a, l) {
          const w = where(a, l), wn = where(a, l + 0.04), seg2 = speakingSeg(a, l);
          return { x: w.X - w.dir * w.d * scale2, d: w.d, ground: W.ground, facing: w.dir, clip: clipFn(a, l, w), run: w.walking && w.walking.do === "run" ? 1 : 0, speed: (wn.d - w.d) / 0.04, seg: seg2, opacity: w.X < -130 || w.X > Wd + 130 ? 0 : 1 };
        }
        actors.forEach((a) => sc.on((l) => a.ch.render(l, state(a, l))));
        actors.forEach((a) => a.tl.filter((sg) => sg.do === "walk" || sg.do === "run").forEach((sg) => {
          const half = a.ch.gait.stride / 2;
          let n = Math.ceil(sg.Ds / half + 0.01);
          for (let l = sg.t0; l < sg.t1; l += 1 / 30) {
            const d = sg.Ds + (sg.De - sg.Ds) * walkEase((l - sg.t0) / (sg.t1 - sg.t0));
            if (d >= n * half) {
              const X2 = sg.xp + sg.dir * d * scale2;
              if (X2 > 0 && X2 < Wd) S2.sfx(sc, "step", l, 0.6);
              n++;
            }
          }
        }));
        const onStage = (a, l) => {
          const X2 = a.__X(l);
          return X2 > 40 && X2 < Wd - 40;
        };
        const subj = (a, l) => a.ch.subject(l, state(a, l));
        const group = (l) => {
          const in_ = actors.filter((a) => onStage(a, l));
          if (!in_.length) return null;
          const ss = in_.map((a) => subj(a, l));
          const top = ss.reduce((m, s2) => s2.head[1] < m.head[1] ? s2 : m);
          return { head: [ss.reduce((t, s2) => t + s2.head[0], 0) / ss.length, top.head[1]], headR: top.headR, feet: [ss.reduce((t, s2) => t + s2.feet[0], 0) / ss.length, Math.max(...ss.map((s2) => s2.feet[1]))], facing: in_.length === 1 ? ss[0].facing : 0 };
        };
        const STAGE = { x: Wd / 2, y: (v.H || 720) / 2, s: 1 };
        const shotEntry = (t, shot, on, x = {}) => {
          if (!on && /wide/.test(shot)) return { t, cam: STAGE, d: x.d != null ? x.d : 0.8 };
          const a = on && on !== "all" ? byId[on] : null;
          return { t, shot, on: a ? ((l) => subj(a, l)) : ((l) => group(l) || { head: [Wd / 2, 330], headR: 30, feet: [Wd / 2, 600], facing: 0 }), follow: 0.35, d: x.d != null ? x.d : 0.6, lookroom: a ? 0.12 : 0, focus: a ? [a] : null };
        };
        const user = st.actions.filter((a) => a.do === "shot");
        const list2 = [shotEntry(0, si === 0 ? CAM.establish || "wide" : CAM.action || "full", null, { d: 0 })];
        if (user.length) user.forEach((a) => list2.push(shotEntry(Math.max(0, anchor(a.line) - 0.15), a.shot, a.on, {})));
        else segs.forEach((sg, i) => {
          const acts = st.actions.filter((a) => a.line === i && a.do !== "shot" && a.do !== "sfx" && a.do !== "hold");
          const others = acts.some((a) => a.do === "effect" || a.who && a.who !== sg.who), own = acts.some((a) => a.who === sg.who);
          if (sg.who && byId[sg.who] && actors.length) list2.push(others ? shotEntry(Math.max(0.05, sg.at - 0.2), CAM.action || "full", null, {}) : shotEntry(Math.max(0.05, sg.at - 0.2), own ? CAM.action || "full" : CAM.dialog || "medium", sg.who, {}));
          else if (i > 0 && segs[i - 1].who) list2.push(shotEntry(Math.max(0.05, sg.at - 0.2), CAM.action || "full", null, {}));
        });
        const effects = st.actions.filter((a) => a.do === "effect");
        effects.forEach((a) => {
          if (CAM.punch) list2.push({ t: anchor(a.line) + 0.25, punch: CAM.punch });
        });
        const framing = list2.filter((e) => !e.punch).sort((p, q) => p.t - q.t);
        const focusAt = (l) => {
          let f = null;
          for (const e of framing) if (l >= e.t) f = e.focus;
          return f;
        };
        const keep = actors.map((a) => (l) => {
          const f = focusAt(l);
          const b = f ? f[0] : a;
          return (f ? true : onStage(a, l)) ? subj(b, l) : group(l) || subj(b, l);
        });
        sc.shots(list2.filter((e) => e.punch !== 0), { keep: actors.length ? keep : [], margin: 0.06 });
        if (si === 0 && story.title) S2.title(sc, story.title, { sub: story.sub || "", side: actors.length && actors[0].plan.segs.length ? "right" : "left", at: 0.4, out: segs[0] ? Math.max(2.6, segs[0].end + 0.2) : 3 });
        st.actions.filter((a) => a.do === "title").forEach((a) => S2.title(sc, a.text, { at: anchor(a.line), out: anchor(a.line) + 2.4 }));
        effects.forEach((a) => {
          const t = anchor(a.line) + 0.25, who = a.who ? byId[a.who] : actors[actors.length - 1];
          let x = Wd / 2, y = 300;
          if (who) {
            const p = who.ch.point("handN", 0, 22, t, state(who, t));
            x = p[0] + 20 * where(who, t).dir;
            y = p[1];
          }
          S2.effect(sc, a.name || "signature", { at: t, x, y });
        });
        st.actions.filter((a) => a.do === "sfx").forEach((a) => S2.sfx(sc, a.kind, anchor(a.line)));
        sc.maxT = Math.max(sc.maxT || 0, ...actors.map((a) => a.plan.end), ...effects.map((a) => anchor(a.line) + 1.6));
      });
    });
    S2.music(v, { gain: o.musicGain != null ? o.musicGain : 0.5 });
    return v;
  }

  // src/fx/mg/paint.js
  var paint_exports = {};
  __export(paint_exports, {
    REEL: () => REEL,
    accents: () => accents,
    beatStep: () => beatStep,
    burst: () => burst2,
    circle: () => circle,
    converge: () => converge,
    disc: () => disc,
    dotwave: () => dotwave,
    flash: () => flash,
    hud: () => hud,
    morphSeq: () => morphSeq,
    orbit: () => orbit,
    plus: () => plus,
    plusMark: () => plusMark,
    ptsPath: () => ptsPath,
    rings: () => rings,
    streaks: () => streaks,
    triggers: () => triggers
  });
  var TAU6 = Math.PI * 2;
  var REEL = { ink: "#0A0A12", paper: "#F4EFE6", pink: "#FF3B8B", yellow: "#FFD23F", cyan: "#25E1E8", violet: "#5B3BFF" };
  var DEF_COLS = [REEL.pink, REEL.yellow, REEL.cyan, REEL.violet];
  var center = (o, info) => [o.x != null ? o.x : info.W / 2, o.y != null ? o.y : info.H / 2];
  var sceneStart = (info) => info.scene ? info.scene.start : 0;
  var inWin = (o, local) => (o.from == null || local >= o.from) && (o.to == null || local < o.to);
  function triggers(o, local, info, n = 4) {
    if (o.times || o.at != null) {
      const T6 = [].concat(o.times || o.at);
      return T6.map((t0, k) => ({ k, age: local - t0 })).filter((x) => x.age >= 0).slice(-n);
    }
    const B4 = info.beats;
    if (!B4 || !B4.active) return [];
    const start = sceneStart(info) + (o.from || 0);
    return recentBeats(B4, info.t, n, o.every || 1, start - (B4.leadT || 0)).map((x) => ({ k: x.b, age: x.age }));
  }
  function circle(g2, x, y, r, fill, stroke, lw = 1, a = 1) {
    if (!(r > 0)) return;
    g2.save();
    g2.globalAlpha *= clamp01(a);
    g2.beginPath();
    g2.arc(x, y, r, 0, TAU6);
    if (fill) {
      g2.fillStyle = fill;
      g2.fill();
    }
    if (stroke) {
      g2.lineWidth = lw;
      g2.strokeStyle = stroke;
      g2.stroke();
    }
    g2.restore();
  }
  function plusMark(g2, x, y, s2, rot, col3, lw = 10) {
    if (!(s2 > 0)) return;
    g2.save();
    g2.translate(x, y);
    g2.rotate(rot);
    g2.strokeStyle = col3;
    g2.lineWidth = lw;
    g2.lineCap = "round";
    g2.beginPath();
    g2.moveTo(-s2, 0);
    g2.lineTo(s2, 0);
    g2.moveTo(0, -s2);
    g2.lineTo(0, s2);
    g2.stroke();
    g2.restore();
  }
  function ptsPath(g2, pts, x, y, R2, rot) {
    const ca = Math.cos(rot), sa = Math.sin(rot);
    g2.beginPath();
    pts.forEach((p, i) => {
      const px4 = p[0] * R2, py = p[1] * R2, X2 = x + px4 * ca - py * sa, Y = y + px4 * sa + py * ca;
      i ? g2.lineTo(X2, Y) : g2.moveTo(X2, Y);
    });
    g2.closePath();
  }
  var rings = (o = {}) => (g2, local, info) => {
    if (!inWin(o, local)) return;
    const [x, y] = center(o, info), cols = o.colors || DEF_COLS, sp = o.speed || 1150, max = o.max || 1300, w = o.width || 8;
    for (const { k, age } of triggers(o, local, info, o.n || 4)) {
      const a0 = age - (o.delay != null ? o.delay : 0.12);
      if (a0 < 0) continue;
      const r = a0 * sp, a = clamp01(1 - r / max);
      if (a <= 0) continue;
      circle(g2, x, y, r, null, cols[(k % cols.length + cols.length) % cols.length], w * a + 1, a * (o.alpha != null ? o.alpha : 0.9));
    }
  };
  var streaks = (o = {}) => (g2, local, info) => {
    if (!inWin(o, local)) return;
    const n = o.n || 9, W = info.W, H = info.H, vert = o.dir === "y", L = vert ? H : W, pad = o.pad != null ? o.pad : 300;
    const tr = triggers({ ...o, at: o.every ? void 0 : o.at != null ? o.at : 0.04 }, local, info, 1)[0];
    if (!tr) return;
    g2.save();
    g2.strokeStyle = o.color || REEL.paper;
    g2.globalAlpha = o.alpha != null ? o.alpha : 0.45;
    g2.lineWidth = o.width || 4;
    g2.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const s2 = i * (o.stagger != null ? o.stagger : 0.025), pos = (o.y0 != null ? o.y0 : 110) + i * (o.gap || 112) + i * 37 % 46, d = o.d || 0.6;
      let head = lerp(-pad, L + pad, EASE.outCubic(P(tr.age, s2, d))), tail = lerp(-pad, L + pad, EASE.inOutCubic(P(tr.age, s2 + (o.lag != null ? o.lag : 0.12), d)));
      if (o.reverse) {
        head = L - head;
        tail = L - tail;
      }
      if (Math.abs(head - tail) < 0.5 || (o.reverse ? head > tail : head < tail)) continue;
      g2.beginPath();
      if (vert) {
        g2.moveTo(pos, tail);
        g2.lineTo(pos, head);
      } else {
        g2.moveTo(tail, pos);
        g2.lineTo(head, pos);
      }
      g2.stroke();
    }
    g2.restore();
  };
  var burst2 = (o = {}) => (g2, local, info) => {
    if (!inWin(o, local)) return;
    const [x, y] = center(o, info), n = o.n || 16, tr = triggers({ every: 0.5, ...o }, local, info, 1)[0];
    if (!tr) return;
    const bp = EASE.outExpo(P(tr.age, 0, o.d || 0.3));
    if (bp >= 1 && !o.hold) return;
    g2.save();
    g2.strokeStyle = o.color || REEL.ink;
    g2.lineWidth = o.width || 5;
    g2.globalAlpha = o.alpha != null ? o.alpha : 0.3;
    g2.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU6 + tr.k * (o.twist != null ? o.twist : 0.5), r0 = (o.r0 || 260) + (o.spread || 700) * bp, r12 = r0 + (o.len || 130) * (1 - bp);
      g2.beginPath();
      g2.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      g2.lineTo(x + Math.cos(a) * r12, y + Math.sin(a) * r12);
      g2.stroke();
    }
    g2.restore();
  };
  var flash = (o = {}) => (g2, local, info) => {
    if (!inWin(o, local)) return;
    const tr = triggers(o, local, info, 1)[0];
    if (!tr) return;
    const a = (o.amount != null ? o.amount : 0.55) * (o.linear ? 1 - P(tr.age, 0, o.d || 0.07) : Math.exp(-tr.age * (o.k || 14)));
    if (a < 3e-3) return;
    g2.save();
    g2.globalAlpha = a;
    g2.fillStyle = o.color || "#fff";
    g2.fillRect(0, 0, info.W, info.H);
    g2.restore();
  };
  var orbit = (o = {}) => (g2, local, info) => {
    if (!inWin(o, local)) return;
    const [x, y] = center(o, info), n = o.n || 14, B4 = info.beats, kick = o.kick && B4 && B4.active ? o.kick * B4.pulse(info.t, 8) : 0;
    const col3 = typeof o.color === "function" ? o.color(local, info) : o.color || REEL.paper;
    for (let i = 0; i < n; i++) {
      const a = local * (o.speed || 2.2) + i * TAU6 / n, rad = (o.r || 500) + (o.wobble != null ? o.wobble : 40) * Math.sin(local * 4 + i) + kick;
      circle(g2, x + Math.cos(a) * rad, y + Math.sin(a) * rad * (o.ry || 0.7), o.size || 9, col3);
    }
  };
  var plus = (o = {}) => (g2, local, info) => {
    if (!inWin(o, local)) return;
    const pts = o.points || [[150, 190], [1770, 900], [1760, 210], [170, 880]], B4 = info.beats;
    const kick = o.kick && B4 && B4.active ? 1 + o.kick * B4.pulse(info.t, 10) : 1;
    pts.forEach(([x, y], i) => {
      const p = EASE.outBack(P(local, (o.at != null ? o.at : 0.25) + i * (o.stagger != null ? o.stagger : 0.08), o.d || 0.4));
      plusMark(g2, x, y, (o.size || 34) * p * kick, local * (o.spin != null ? o.spin : 2) + i, o.color || REEL.ink, o.width || 10);
    });
  };
  var disc = (o = {}) => (g2, local, info) => {
    if (!inWin(o, local)) return;
    const [x, y] = center(o, info), B4 = info.beats, k = o.pulse && B4 && B4.active ? 1 + o.pulse * B4.pulse(info.t, 9) : 1;
    const e = (EASE[o.ease || "outBack"] || EASE.outBack)(P(local, o.at || 0, o.d || 0.55));
    circle(g2, x + (o.dx ? Math.sin(local * 2) * o.dx : 0), y + (o.dy ? Math.cos(local * 2.3) * o.dy : 0), (o.r || 410) * e * k, o.color || REEL.pink, o.stroke, o.width, o.alpha != null ? o.alpha : 1);
  };
  var accents = { rings, streaks, burst: burst2, flash, orbit, plus, disc };
  var dotwave = (o = {}) => (g2, local, info) => {
    const cols = o.cols || 32, rows2 = o.rows || 18, step = o.step || 60, x0 = o.x0 != null ? o.x0 : step / 2, y0 = o.y0 != null ? o.y0 : step / 2;
    if (o.bg) {
      g2.fillStyle = o.bg;
      g2.fillRect(0, 0, info.W, info.H);
    }
    const env2 = EASE.outCubic(P(local, o.at != null ? o.at : 0.05, o.d || 0.5)), B4 = info.beats;
    const tb = triggers({ every: o.every || 1, from: o.from }, local, info, 1)[0];
    const ba = tb ? tb.age : local % (B4 && B4.beat || 0.46875);
    const [cx, cy] = center(o, info), hole = o.hole ? { x: o.hole.x != null ? o.hole.x - cx : 0, y: o.hole.y != null ? o.hole.y - cy : 0, w: o.hole.w, h: o.hole.h, soft: o.hole.soft } : null;
    const sat = o.sat != null ? o.sat : 95, light = o.light != null ? o.light : 62, min = o.min != null ? o.min : 0.8;
    const q = { ...o, cx, cy, env: env2, hole };
    for (let j = 0; j < rows2; j++) for (let i = 0; i < cols; i++) {
      const x = x0 + i * step, y = y0 + j * step, d = dotwaveAt(x, y, local, ba, q);
      if (d.size < min) continue;
      g2.fillStyle = `hsl(${d.hue.toFixed(1)},${sat}%,${light}%)`;
      g2.beginPath();
      g2.arc(x, y, d.size, 0, TAU6);
      g2.fill();
    }
  };
  var OUTLINES = /* @__PURE__ */ new Map();
  var outline = (k, N, o) => {
    const key = k + ":" + N + ":" + JSON.stringify(o || {});
    if (!OUTLINES.has(key)) OUTLINES.set(key, shapeOutline(k, N, o));
    return OUTLINES.get(key);
  };
  var morphSeq = (o = {}) => {
    const shapes = o.shapes || ["circle", "square", "triangle", "star"], N = o.N || 120;
    const pals = o.palettes || [{ bg: REEL.violet, fill: REEL.yellow, fg: REEL.paper }, { bg: REEL.ink, fill: REEL.pink, fg: REEL.paper }, { bg: REEL.cyan, fill: REEL.ink, fg: REEL.ink }, { bg: REEL.paper, fill: REEL.violet, fg: REEL.ink }];
    return (g2, local, info) => {
      const B4 = info.beats, beatSec = B4 && B4.active ? B4.beat : 0.46875, lead = B4 ? B4.leadT || 0 : 0;
      const t0 = sceneStart(info) + (o.at || 0), bp = B4 && B4.active ? B4.index(info.t + lead) - B4.index(t0) : (local - (o.at || 0)) / beatSec;
      const st = morphState(Math.max(0, bp), shapes.length, { d: o.d }), th = pals[st.k % pals.length], lb = st.lb * beatSec;
      const A = outline(shapes[st.from], N, o.shape), Bp = outline(shapes[st.k], N, o.shape);
      let pts = st.k === 0 ? A.map((p) => {
        const s2 = EASE.outBack(P(lb, 0.1, 0.4));
        return [p[0] * s2, p[1] * s2];
      }) : lerpPts(A, Bp, st.m);
      const [x, y] = center(o, info), R2 = (o.r || 300) * (1 + (o.pulse != null ? o.pulse : 0.12) * Math.exp(-lb * 7)), rot = (local - (o.at || 0)) * (o.spin != null ? o.spin : 1.15) + st.k * 0.5;
      if (o.background !== false) {
        g2.fillStyle = th.bg;
        g2.fillRect(0, 0, info.W, info.H);
      }
      for (let e = o.echoes != null ? o.echoes : 4; e >= 1; e--) {
        ptsPath(g2, pts, x, y, R2 * (1 + e * 0.15), rot - e * 0.16);
        g2.lineWidth = o.echoWidth || 5;
        g2.strokeStyle = th.fill;
        g2.globalAlpha = 0.55 / e;
        g2.stroke();
      }
      g2.globalAlpha = 1;
      ptsPath(g2, pts, x, y, R2, rot);
      g2.fillStyle = th.fill;
      g2.fill();
      if (o.cut !== false) {
        ptsPath(g2, pts, x, y, R2 * (o.cut || 0.42), -rot * 1.6);
        g2.fillStyle = th.bg;
        g2.fill();
      }
      if (o.orbit !== false) orbit({ x, y, r: o.orbitR || 500, color: th.fg, ...o.orbit || {} })(g2, local, info);
      if (o.counter !== false) {
        const c = o.counter || {}, fs = c.size || 250;
        g2.save();
        g2.globalAlpha = 0.5 + 0.5 * Math.exp(-lb * 6);
        g2.font = `${c.weight || 400} ${fs}px ${c.font || '"Archivo Black","Archivo","Noto Sans SC",sans-serif'}`;
        g2.textAlign = "center";
        g2.textBaseline = "middle";
        g2.lineWidth = c.stroke || 5;
        g2.strokeStyle = th.fg;
        g2.lineJoin = "round";
        g2.strokeText(String(st.k + 1).padStart(2, "0"), c.x || 1620, c.y || 290);
        g2.restore();
      }
      if (o.flash !== false) {
        const a = (o.flash != null ? o.flash : 0.55) * Math.exp(-lb * 14);
        if (a > 3e-3) {
          g2.save();
          g2.globalAlpha = a;
          g2.fillStyle = "#fff";
          g2.fillRect(0, 0, info.W, info.H);
          g2.restore();
        }
      }
    };
  };
  function beatStep(info, at = 0, n = 4) {
    const B4 = info.beats, lead = B4 ? B4.leadT || 0 : 0, t0 = sceneStart(info) + at;
    const bp = B4 && B4.active ? B4.index(info.t + lead) - B4.index(t0) : 0;
    return Math.max(0, Math.min(n - 1, Math.floor(bp + 1e-9)));
  }
  var converge = (o = {}) => (g2, local, info) => {
    const [x, y] = center(o, info), cols = o.colors || [REEL.yellow, REEL.pink, REEL.cyan, REEL.violet, REEL.paper], at = o.at || 0;
    if (o.bg) {
      g2.fillStyle = o.bg;
      g2.fillRect(0, 0, info.W, info.H);
    }
    const conv = EASE.inExpo(P(local, at + 0.02, o.d || 0.5));
    if (local < at + (o.d || 0.5) + 0.05) for (let i = 0; i < (o.n || 30); i++) {
      const c = convergeAt(i, conv, { seed: o.seed || 0 });
      g2.save();
      g2.translate(x + c.x, y + c.y);
      g2.rotate(c.rot);
      g2.fillStyle = cols[i % cols.length];
      g2.beginPath();
      if (c.kind === 0) g2.arc(0, 0, c.size / 2, 0, TAU6);
      else if (c.kind === 1) g2.rect(-c.size / 2, -c.size / 2, c.size, c.size);
      else {
        g2.moveTo(0, -c.size * 0.6);
        g2.lineTo(c.size * 0.55, c.size * 0.4);
        g2.lineTo(-c.size * 0.55, c.size * 0.4);
        g2.closePath();
      }
      g2.fill();
      g2.restore();
    }
    const ir = o.iris !== false ? o.iris || {} : null;
    if (ir) circle(g2, x, y, EASE.outExpo(P(local, ir.at != null ? ir.at : at + 0.5, ir.d || 0.5)) * (ir.r || Math.hypot(info.W, info.H) / 2 * 1.13), ir.color || REEL.paper);
    const st = o.star !== false ? o.star || {} : null;
    if (st) {
      const sx = st.x != null ? st.x : x, sy = st.y != null ? st.y : 330, sa = st.at != null ? st.at : at + 0.72, mp = P(local, sa, 0.5);
      if (mp > 0) {
        g2.save();
        g2.translate(sx, sy);
        g2.rotate(lerp(-1.4, 0, EASE.outExpo(P(local, sa, 0.9))) + local * 0.25);
        const s2 = EASE.outBack(mp) * (st.scale || 1);
        g2.scale(s2, s2);
        g2.lineCap = "round";
        g2.strokeStyle = st.color || REEL.pink;
        g2.lineWidth = st.width || 26;
        for (let i = 0; i < (st.rays || 8); i++) {
          g2.rotate(TAU6 / (st.rays || 8));
          g2.beginPath();
          g2.moveTo(0, -40);
          g2.lineTo(0, -(i % 2 ? 92 : 118));
          g2.stroke();
        }
        g2.restore();
        circle(g2, sx, sy, 20 * EASE.outBack(mp) * (st.scale || 1), st.dot || REEL.yellow);
      }
    }
  };
  var hud = (o = {}) => (g2, local, info) => {
    const t = info.frameT != null ? info.frameT : info.t, W = info.W, H = info.H, v = info.video, dur = o.duration || (v ? v.duration : 15), B4 = info.beats;
    const m = o.margin != null ? o.margin : 40, L = o.corner || 46, ins = o.inset != null ? o.inset : 84, fs = o.size || 22, col3 = o.color || "#fff";
    g2.save();
    g2.strokeStyle = col3;
    g2.fillStyle = col3;
    g2.lineWidth = o.width || 4;
    g2.lineCap = "butt";
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, dx, dy]) => {
      g2.beginPath();
      g2.moveTo(x, y + dy * L);
      g2.lineTo(x, y);
      g2.lineTo(x + dx * L, y);
      g2.stroke();
    });
    g2.font = `500 ${fs}px ${o.font || '"JetBrains Mono",monospace'}`;
    g2.textBaseline = "middle";
    if (o.rec !== false && Math.floor(t * 2) % 2 === 0) {
      g2.beginPath();
      g2.arc(ins, ins, 7, 0, TAU6);
      g2.fill();
    }
    g2.textAlign = "left";
    if (o.title) g2.fillText(o.title, ins + 20, ins);
    g2.textAlign = "right";
    if (o.timecode !== false) g2.fillText(timecode(t, o.fps || (v ? v.fps : 30)), W - ins, ins);
    g2.textAlign = "left";
    if (o.meta) g2.fillText(o.meta, ins, H - ins);
    const bars = o.bars || 0;
    if (bars) {
      const bi = B4 && B4.active ? Math.floor(B4.barIndex(t + (B4.leadT || 0)) + 1e-6) : Math.floor(t / dur * bars);
      g2.textAlign = "right";
      g2.fillText(`${o.barLabel || "BAR"} ${Math.max(1, Math.min(bars, bi + 1))}/${bars}`, W - ins, H - ins);
    }
    if (o.progress !== false) {
      const x0 = ins, x1 = W - ins, y = H - ins + 26;
      g2.globalAlpha = 0.3;
      g2.fillRect(x0, y, x1 - x0, 4);
      g2.globalAlpha = 1;
      g2.fillRect(x0, y, (x1 - x0) * clamp01(t / dur), 4);
      for (let k = 0; k <= bars; k++) if (bars) g2.fillRect(x0 + (x1 - x0) * k / bars - 1, y - 6, 2, 16);
    }
    g2.restore();
  };

  // src/fx/mg/cover.js
  var COVER_COLORS = ["#FFD23F", "#FF3B8B", "#25E1E8", "#5B3BFF", "#F4EFE6", "#0A0A12"];
  function make(mode) {
    const T6 = (e, c) => {
      const o = { ...c.video && c.video.cfg.cover || {}, ...c.o }, d = o.d || 0.5, n = o.n || 6;
      const k = c.inScene ? c.inScene.index : 0, cols = o.colors || COVER_COLORS, axis = coverAxis(o.axis || "alt", k);
      const { cut, bars } = coverBars(c.local, d, { n, mode, at: o.at, stagger: o.stagger, travel: o.travel, reverse: o.reverse, easeIn: o.easeIn, easeOut: o.easeOut });
      const rects = coverRects(bars, n, axis, c.W, c.H);
      return {
        in: { opacity: c.local >= cut ? 1 : 0 },
        cover: rects.length ? (g2) => {
          for (const r of rects) {
            g2.fillStyle = cols[(k + r.i) % cols.length];
            g2.fillRect(r.x, r.y, r.w, r.h);
          }
        } : null
      };
    };
    T6.cover = true;
    return T6;
  }
  var COVER_TRANSITIONS = { stripes: make("slide"), bars: make("grow") };
  function installCover() {
    for (const [k, f] of Object.entries(COVER_TRANSITIONS)) if (!registry.transitions[k]) registry.transitions[k] = f;
    return Object.keys(COVER_TRANSITIONS);
  }

  // src/fx/mg/text.js
  var num2 = (v, d) => v == null ? d : +v;
  var shadowCss = (sh, k = 1) => {
    if (!sh) return "";
    const [dx, dy, c] = Array.isArray(sh) ? sh : [10, 10, sh];
    return `${(dx * k).toFixed(2)}px ${(dy * k).toFixed(2)}px 0 ${c || "rgba(10,10,18,.4)"}`;
  };
  function ghosts(el2, n) {
    if (!n) return [];
    if (getComputedStyle(el2).position === "static") el2.style.position = "relative";
    const html2 = el2.innerHTML, out = [];
    for (let g2 = 0; g2 < n; g2++) {
      const s2 = document.createElement("span");
      s2.className = "vk-ghost";
      s2.dataset.qa = "ignore";
      s2.setAttribute("aria-hidden", "true");
      s2.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:-1;white-space:inherit;opacity:0;text-shadow:none";
      s2.innerHTML = html2;
      el2.appendChild(s2);
      out.push(s2);
    }
    el2.style.isolation = "isolate";
    return out;
  }
  function slamFx(defaults) {
    return (el2, o, api) => {
      o = { ...defaults, ...o };
      const d = num2(o.d, 0.4), G3 = ghosts(el2, o.echo === true ? 3 : o.echo || 0), sh = o.shadow;
      if (o.origin) el2.style.transformOrigin = o.origin;
      api.fn(el2, (local) => {
        let p = clamp01((local - o.t) / d);
        if (api.exit) p = 1 - p;
        const s2 = slam(p, { scale: num2(o.scale, 2.8), rot: num2(o.rot, 20), x: o.x || 0, y: o.y || 0, dir: o.dir || 1, ease: o.ease || "outExpo" });
        let wy = 0, wr = 0;
        if (o.wobble) {
          const w = o.wobble, k = clamp01((local - w.at) / 0.2);
          if (k > 0) {
            wy = Math.sin(local * (w.speed || 9) + (w.phase || 0)) * (w.amp != null ? w.amp : 16) * k;
            wr = Math.sin(local * (w.speed || 9) + (w.phase || 0) * 1.1) * (w.rot != null ? w.rot : 3) * k;
          }
        }
        el2.style.opacity = p > 0 ? s2.a.toFixed(3) : "0";
        el2.style.transform = `translate(${s2.x.toFixed(2)}px,${(s2.y + wy).toFixed(2)}px) rotate(${(s2.rot + wr).toFixed(3)}deg) scale(${s2.s.toFixed(4)})`;
        if (sh) el2.style.textShadow = shadowCss(sh, 1);
        const E2 = echoGhosts(p, { n: G3.length, step: o.echoStep, alpha: o.echoAlpha });
        G3.forEach((g2, i) => {
          const e = E2[i];
          if (!e || p <= 0) {
            g2.style.opacity = "0";
            return;
          }
          g2.style.opacity = (e.a / Math.max(0.05, s2.a)).toFixed(3);
          g2.style.transform = `scale(${e.s.toFixed(4)})`;
        });
      });
    };
  }
  function perLetter(mode, fnStyle, defEach, defD) {
    return (el2, o, api) => {
      const pieces = split2(el2, mode), each = num2(o.each, defEach), d = num2(o.d, defD);
      pieces.forEach((c, i) => {
        c.style.transformOrigin = o.origin || "50% 100%";
        api.fn(c, (local) => {
          let p = clamp01((local - o.t - i * each) / d);
          if (api.exit) p = 1 - p;
          fnStyle(c, p, local, i, o);
        });
      });
    };
  }
  var bob = (o, local, i) => o.bob ? Math.sin(local * (o.bob.speed || 6) + i * (o.bob.phase || 0.8)) * (o.bob.amp != null ? o.bob.amp : 10) : 0;
  var MG_FX = {
    slam: slamFx({}),
    echo: slamFx({ scale: 1.6, rot: 0, echo: 3, d: 0.45 }),
    drop: perLetter("chars", (c, p, local, i, o) => {
      const s2 = letterDrop(p, { from: num2(o.from, 800), sx: o.sx, sy: o.sy });
      c.style.opacity = p > 0 ? "1" : "0";
      c.style.transform = `translateY(${(s2.y + (p >= 1 ? bob(o, local, i) : 0)).toFixed(2)}px) scale(${s2.sx.toFixed(4)},${s2.sy.toFixed(4)})`;
      if (o.shadow) c.style.textShadow = shadowCss(o.shadow);
    }, 0.055, 0.5),
    "letters-pop": perLetter("chars", (c, p, local, i, o) => {
      const e = EASE.outBack(p);
      c.style.opacity = p > 0 ? "1" : "0";
      c.style.transform = `translateY(${bob(o, local, i).toFixed(2)}px) scale(${e.toFixed(4)})`;
      if (o.shadow) c.style.textShadow = shadowCss(o.shadow);
    }, 0.07, 0.5),
    "mask-rise": perLetter("letters", (c, p) => {
      c.style.transform = `translateY(${maskRise(p, 1.2).toFixed(4)}em)`;
    }, 0.05, 0.5),
    "hard-shadow": { make: (o) => {
      const c = o.shadowColor || "rgba(10,10,18,.9)", dx = num2(o.shadowX, 10), dy = num2(o.shadowY, 10);
      return { from: { textShadow: `0px 0px 0px ${c}` }, to: { textShadow: `${dx}px ${dy}px 0px ${c}` } };
    } }
  };
  function installText() {
    for (const [k, f] of Object.entries(MG_FX)) if (!registry.fx[k]) registry.fx[k] = f;
    return Object.keys(MG_FX);
  }

  // src/fx/mg/ui.js
  var cardDef = (o) => ({ fx: "right", dist: 360, ease: "outBack", d: 0.5, ...o });
  var T5 = (ctx, v, d = 0) => v == null ? d : ctx.scene.time(v);
  function card(ctx, o, bg, fg) {
    const px4 = ctx.px, c = h("div", "vk-ui-card");
    c.style.cssText = `position:relative;display:flex;align-items:center;gap:${px4(18)}px;box-sizing:border-box;width:${o.w ? px4(o.w) + "px" : "100%"};min-height:${px4(o.h || 96)}px;padding:${px4(16)}px ${px4(22)}px;border-radius:${px4(o.radius != null ? o.radius : 24)}px;background:${bg};color:${fg};text-align:left;flex:none`;
    return c;
  }
  var labelCss = (px4, size2, col3, font = "var(--vk-sans)", w = 800) => `font:${w} ${px4(size2)}px/1.1 ${font};color:${col3};white-space:nowrap`;
  var mix2 = (a, b, k) => {
    const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16)), pb = b.match(/\w\w/g).map((x) => parseInt(x, 16));
    return "#" + pa.map((v, i) => Math.round(lerp(v, pb[i], k)).toString(16).padStart(2, "0")).join("");
  };
  var ui = {
    ringCard: (o = {}) => node(cardDef(o), function uiRingCard(ctx) {
      const px4 = ctx.px, bg = o.color || REEL.pink, fg = o.fg || REEL.ink, c = card(ctx, o, bg, fg), R2 = px4(o.r || 30), sw = px4(o.stroke || 9);
      const sv = s("svg", { width: 2 * R2 + sw, height: 2 * R2 + sw, viewBox: `${-R2 - sw / 2} ${-R2 - sw / 2} ${2 * R2 + sw} ${2 * R2 + sw}` }, c);
      s("circle", { r: R2, fill: "none", stroke: "rgba(10,10,18,.25)", "stroke-width": sw }, sv);
      const arc2 = s("circle", { r: R2, fill: "none", stroke: fg, "stroke-width": sw, "stroke-linecap": "round", transform: "rotate(-90)", "stroke-dasharray": `0 ${2 * Math.PI * R2}` }, sv);
      const col3 = h("div", null, null, c);
      col3.style.cssText = "display:flex;flex-direction:column;gap:" + px4(4) + "px";
      h("div", null, o.label || "", col3).style.cssText = labelCss(px4, o.labelSize || 22, fg);
      const num3 = h("div", null, "0" + (o.suffix != null ? o.suffix : "%"), col3);
      num3.style.cssText = labelCss(px4, o.valueSize || 38, fg, "var(--vk-display)", 900);
      const t0 = T5(ctx, o.fillAt, ctx.at(o) + 0.25), d = o.fillD || 0.9, L = 2 * Math.PI * R2, max = o.value != null ? o.value : 78;
      ctx.scene.on((local) => {
        const p = EASE.outExpo(P(local, t0, d));
        arc2.setAttribute("stroke-dasharray", `${(L * max / 100 * p).toFixed(2)} ${L.toFixed(2)}`);
        num3.textContent = Math.round(max * p) + (o.suffix != null ? o.suffix : "%");
      });
      return c;
    }),
    toggle: (o = {}) => node(cardDef(o), function uiToggle(ctx) {
      const px4 = ctx.px, c = card(ctx, o, o.bg || "#2A2A44", o.fg || REEL.paper), on = o.color || REEL.cyan;
      c.style.padding = `${px4(14)}px ${px4(16)}px`;
      c.style.gap = px4(12) + "px";
      const col3 = h("div", null, null, c);
      col3.style.cssText = `display:flex;flex-direction:column;gap:${px4(6)}px;flex:1;min-width:0`;
      if (o.label) h("div", null, o.label, col3).style.cssText = labelCss(px4, o.labelSize || 21, o.fg || REEL.paper);
      if (o.sub) h("div", null, o.sub, col3).style.cssText = labelCss(px4, o.subSize || 18, on, "var(--vk-display)", 900);
      const tw = px4(o.trackW || 74), th = px4(o.trackH || 40), kr = th * 0.38, track = h("div", null, null, c);
      track.style.cssText = `position:relative;width:${tw}px;height:${th}px;border-radius:${th / 2}px;flex:none`;
      const knob = h("div", null, null, track);
      knob.style.cssText = `position:absolute;left:${th / 2 - kr}px;top:${th / 2 - kr}px;width:${2 * kr}px;height:${2 * kr}px;border-radius:50%;background:${o.knob || REEL.paper}`;
      const tc = T5(ctx, o.click, ctx.at(o) + 0.6), travel2 = tw - th;
      ctx.scene.on((local) => {
        const k = toggleKnob(P(local, tc, 0.3)), cc = EASE.outCubic(P(local, tc, 0.25));
        track.style.background = mix2(o.off || "#4a4a66", on, cc);
        knob.style.transform = `translateX(${(k.x * travel2).toFixed(2)}px) scale(${k.sx.toFixed(4)},${k.sy.toFixed(4)})`;
      });
      return c;
    }),
    equalizer: (o = {}) => node(cardDef(o), function uiEqualizer(ctx) {
      const px4 = ctx.px, c = card(ctx, o, o.color || REEL.yellow, REEL.ink), n = o.bars || 7, bw = px4(o.barW || 17), H = px4(o.barH || 64);
      c.style.justifyContent = "center";
      c.style.gap = px4(o.gap || 13) + "px";
      const bars = Array.from({ length: n }, () => {
        const b = h("div", null, null, c);
        b.style.cssText = `width:${bw}px;height:${H}px;border-radius:${bw / 2}px;background:${o.fg || REEL.ink};transform-origin:50% 50%;flex:none`;
        return b;
      });
      const t0 = ctx.at(o);
      ctx.scene.on((local) => bars.forEach((b, i) => {
        const g2 = EASE.outCubic(P(local, t0 + i * 0.04, 0.4));
        b.style.transform = `scaleY(${Math.max(0.02, eqLevel(local, i, o) * g2).toFixed(4)})`;
      }));
      return c;
    }),
    like: (o = {}) => node({ fx: "pop", ...o }, function uiLike(ctx) {
      const px4 = ctx.px, r = px4(o.r || 28), wrap = h("div", "vk-ui-like");
      wrap.style.cssText = `position:relative;width:${2 * r}px;height:${2 * r}px;flex:none;align-self:center`;
      const btn = h("div", null, null, wrap);
      btn.style.cssText = `position:absolute;inset:0;border-radius:50%;display:flex;align-items:center;justify-content:center`;
      const sv = s("svg", { width: r * 1.1, height: r * 1.1, viewBox: "-12 -11 24 22" }, btn);
      const heart = s("path", { d: "M0 9 C-9 3 -11 -3 -8 -7 C-5 -10 -1 -8 0 -5 C1 -8 5 -10 8 -7 C11 -3 9 3 0 9Z" }, sv);
      const bs = s("svg", { width: 6 * r, height: 6 * r, viewBox: `${-3 * r} ${-3 * r} ${6 * r} ${6 * r}` }, wrap);
      bs.style.cssText = `position:absolute;left:${-2 * r}px;top:${-2 * r}px;pointer-events:none;overflow:visible`;
      const col3 = o.color || REEL.pink, lines = Array.from({ length: 10 }, () => s("line", { stroke: col3, "stroke-width": px4(4), "stroke-linecap": "round" }, bs));
      const tc = T5(ctx, o.click, ctx.at(o) + 0.5);
      ctx.scene.on((local) => {
        const L = likePop(local - tc);
        btn.style.transform = `scale(${L.s.toFixed(4)})`;
        btn.style.background = mix2(o.off || "#2A2A44", col3, L.c);
        heart.setAttribute("fill", mix2("#9a9ab5", REEL.paper, L.c));
        const bp = L.burst, e = EASE.outCubic(bp), vis = bp > 0 && bp < 1;
        lines.forEach((ln, i) => {
          const a = i / 10 * Math.PI * 2, r0 = r * lerp(1.38, 2.2, e), r12 = r0 + r * lerp(0.1, 0.67, e);
          ln.setAttribute("opacity", vis ? (1 - bp).toFixed(3) : 0);
          ln.setAttribute("x1", (Math.cos(a) * r0).toFixed(1));
          ln.setAttribute("y1", (Math.sin(a) * r0).toFixed(1));
          ln.setAttribute("x2", (Math.cos(a) * r12).toFixed(1));
          ln.setAttribute("y2", (Math.sin(a) * r12).toFixed(1));
        });
      });
      return wrap;
    }),
    chips: (labels = [], o = {}) => node({ fx: "none", ...o }, function uiChips(ctx) {
      const px4 = ctx.px, box = h("div", "vk-ui-chips"), cols = o.colors || [REEL.yellow, REEL.cyan, REEL.pink, REEL.violet];
      box.style.cssText = `display:flex;flex-direction:${o.row ? "row" : "column"};align-items:flex-start;gap:${px4(o.gap || 26)}px`;
      const t0 = ctx.at(o), each = o.each != null ? o.each : 0.12;
      const chips = labels.map((s2, i) => {
        const c = h("div", "vk-ui-chip", s2, box);
        c.style.cssText = `padding:${px4(12)}px ${px4(22)}px;border-radius:${px4(40)}px;background:${cols[i % cols.length]};${labelCss(px4, o.size || 23, o.fg || REEL.ink, "var(--vk-mono)", 700)}`;
        return c;
      });
      ctx.scene.on((local) => chips.forEach((c, i) => {
        const p = EASE.outBack(P(local, t0 + i * each, 0.5)), y = o.bob === false ? 0 : Math.sin(local * 4 + i) * px4(4);
        c.style.opacity = local >= t0 + i * each ? 1 : 0;
        c.style.transform = `translate(${lerp(px4(o.dist || 370), 0, p).toFixed(1)}px,${y.toFixed(1)}px)`;
      }));
      return box;
    }),
    // pointer: keys [[t, x, y]] (x/y ≤ 1 → stage fraction, else px at 720p) placed absolutely in its parent (use in sc.add at scene level)
    cursor: (o = {}) => node({ fx: "none", ...o }, function uiCursor(ctx) {
      const px4 = ctx.px, W = ctx.W, H = ctx.H, xy = (x, y) => [Math.abs(x) <= 1 ? x * W : px4(x), Math.abs(y) <= 1 ? y * H : px4(y)];
      const keys = (o.keys || [[0, 0.5, 0.5]]).map((k) => [T5(ctx, k[0]), ...xy(k[1], k[2])]), clicks = (o.clicks || []).map((c) => T5(ctx, c));
      const root = h("div", "vk-ui-cursor vk-abs");
      root.dataset.qa = "ignore";
      root.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:30";
      const rc = o.rippleColor || REEL.pink, ripples = o.ripple === false ? [] : clicks.map(() => {
        const r = h("div", null, null, root);
        r.style.cssText = `position:absolute;left:0;top:0;width:${px4(94)}px;height:${px4(94)}px;margin:${-px4(47)}px 0 0 ${-px4(47)}px;border-radius:50%;border:${px4(4)}px solid ${rc};box-sizing:border-box;opacity:0`;
        return r;
      });
      const cur = h("div", null, null, root), sz = px4(o.size || 44);
      cur.style.cssText = `position:absolute;left:0;top:0;width:${sz}px;height:${sz}px;transform-origin:0 0`;
      const sv = s("svg", { width: sz, height: sz, viewBox: "0 0 24 24" }, cur);
      s("path", { d: "M2 1 L2 19 L7 14.5 L10.5 22 L13.5 20.6 L10 13.3 L16.5 13 Z", fill: o.fill || REEL.paper, stroke: o.stroke || REEL.ink, "stroke-width": 1.6, "stroke-linejoin": "round" }, sv);
      const tIn = keys[0][0] - 0.05;
      ctx.scene.on((local) => {
        const [x, y] = cursorAt(keys, local), a = P(local, tIn, 0.12), s2 = pressAt(clicks, local);
        cur.style.opacity = a.toFixed(3);
        cur.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s2})`;
        ripples.forEach((r, i) => {
          const p = P(local, clicks[i], 0.4), [rx, ry] = cursorAt(keys, clicks[i]);
          r.style.opacity = p > 0 && p < 1 ? (1 - p).toFixed(3) : 0;
          r.style.transform = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) scale(${Math.max(0.01, EASE.outCubic(p)).toFixed(4)})`;
        });
      });
      return root;
    })
  };

  // src/fx/mg/montage.js
  var R = REEL;
  var MONTAGE_PALETTES = [
    { bg: R.pink, fg: R.paper, acc: R.ink },
    { bg: R.ink, fg: R.yellow, acc: R.paper },
    { bg: R.cyan, fg: R.ink, acc: R.violet },
    { bg: R.paper, fg: R.violet, acc: R.ink },
    { bg: R.violet, fg: R.paper, acc: R.yellow },
    { bg: R.yellow, fg: R.ink, acc: R.violet },
    { bg: R.ink, fg: R.cyan, acc: R.pink },
    { bg: R.pink, fg: R.ink, acc: R.paper }
  ];
  function slotLen(ctx, v) {
    const B4 = ctx.video.beats, spb = B4 && B4.active ? B4.beat : 0.5;
    if (v == null) return spb / 2;
    if (typeof v === "string" && v.startsWith("b:")) return parseFloat(v.slice(2)) * spb;
    return +v;
  }
  var montage = (words = [], o = {}) => node({ fx: "none", ...o }, function montage2(ctx) {
    const px4 = ctx.px, W = ctx.W, H = ctx.H, n = words.length, every = slotLen(ctx, o.every), pals = o.palettes || MONTAGE_PALETTES;
    const root = h("div", "vk-montage vk-abs");
    root.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:0`;
    const nl = o.lines != null ? o.lines : 16, sv = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
    sv.style.cssText = "position:absolute;left:0;top:0";
    const lines = Array.from({ length: nl }, () => s("line", { "stroke-width": px4(3.4), "stroke-linecap": "round", opacity: 0.3 }, sv));
    const mk2 = (cls, css3) => {
      const e = h("div", cls, null, root);
      e.style.cssText = "position:absolute;white-space:nowrap;line-height:1;" + css3;
      return e;
    };
    const big = mk2("vk-montage-word", `left:50%;top:${(o.y != null ? o.y : 0.4) * 100}%;font:900 ${px4(o.size || 373)}px var(--vk-display-cn, var(--vk-sans));letter-spacing:-.02em`);
    const sub2 = mk2("vk-montage-sub", `left:50%;top:${(o.subY != null ? o.subY : 0.75) * 100}%;font:400 ${px4(o.subSize || 113)}px var(--vk-display)`);
    const ctr = o.counter === false ? null : mk2("vk-montage-ctr", `left:${px4(93)}px;top:${px4(127)}px;font:700 ${px4(23)}px var(--vk-mono);transform:translateY(-50%)`);
    const dotBox = o.dots === false ? null : mk2("", `left:50%;top:${px4(631)}px;display:flex;gap:${px4(12)}px;transform:translateX(-50%)`);
    const dots = dotBox ? words.map(() => {
      const d = h("i", null, null, dotBox);
      d.style.cssText = `display:block;width:${px4(19)}px;height:${px4(19)}px`;
      return d;
    }) : [];
    const fl = h("div", null, null, root);
    fl.dataset.qa = "ignore";
    fl.style.cssText = "position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none";
    const t0 = ctx.at(o), lead = ctx.video.beats ? ctx.video.beats.leadT || 0 : 0;
    let last = -1;
    ctx.scene.on((local) => {
      const lt = Math.max(0, local - t0 + lead), { idx, ft } = montageSlot(lt, every, n), th = pals[idx % pals.length], dir = idx % 2 ? 1 : -1, w = [].concat(words[idx] || "");
      root.style.background = th.bg;
      if (idx !== last) {
        last = idx;
        big.textContent = w[0];
        sub2.textContent = w[1] || "";
        big.style.color = idx % 2 ? "transparent" : th.fg;
        big.style.webkitTextStroke = idx % 2 ? `${px4(6.7)}px ${th.fg}` : "";
        big.style.textShadow = idx % 2 ? "none" : `${px4(10.7)}px ${px4(10.7)}px 0 ${th.acc}80`;
        sub2.style.color = idx % 2 ? th.fg : th.acc;
        if (ctr) {
          ctr.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
          ctr.style.color = th.acc;
        }
        dots.forEach((d, i) => {
          d.style.background = th.acc;
          d.style.opacity = i <= idx ? 1 : 0.25;
        });
        lines.forEach((l) => l.setAttribute("stroke", th.acc));
      }
      const e = EASE.outExpo(P(ft, 0, 0.14)), scl = lerp(1.5, 1, e), rot = dir * lerp(3.4, 0, e), ox = dir * lerp(px4(160), 0, e);
      big.style.transform = `translate(-50%,-50%) translateX(${ox.toFixed(1)}px) rotate(${rot.toFixed(3)}deg) scale(${scl.toFixed(4)})`;
      const ss = lerp(1.2, 1, e);
      sub2.style.transform = `translate(-50%,-50%) translateX(${(-ox * 0.6).toFixed(1)}px) scale(${ss.toFixed(4)})`;
      const bp = EASE.outExpo(P(ft, 0, 0.3));
      lines.forEach((l, i) => {
        const a = i / nl * Math.PI * 2 + idx * 0.5, r0 = px4(173) + px4(467) * bp, r12 = r0 + px4(87) * (1 - bp);
        l.setAttribute("x1", (W / 2 + Math.cos(a) * r0).toFixed(1));
        l.setAttribute("y1", (H / 2 + Math.sin(a) * r0).toFixed(1));
        l.setAttribute("x2", (W / 2 + Math.cos(a) * r12).toFixed(1));
        l.setAttribute("y2", (H / 2 + Math.sin(a) * r12).toFixed(1));
      });
      fl.style.opacity = o.flash === false ? 0 : ((o.flash || 0.55) * (1 - P(ft, 0, 0.07))).toFixed(3);
    });
    return root;
  });

  // src/fx/mg/lockup.js
  var lockup = (o = {}) => node({ fx: "none", ...o }, function lockup2(ctx) {
    const px4 = ctx.px, W = ctx.W, H = ctx.H, k = H / 1080, at = ctx.at(o), sc = ctx.scene, ink = o.ink || REEL.ink;
    const cols = o.colors || [REEL.yellow, REEL.pink, REEL.cyan, REEL.violet, REEL.paper];
    sc.canvas(converge({
      at,
      bg: o.bg || ink,
      colors: cols,
      seed: o.seed,
      x: W / 2,
      y: H / 2,
      iris: o.iris === false ? false : { color: o.paper || REEL.paper, ...o.iris || {} },
      star: o.star === false ? false : { y: H * 0.305, scale: k, color: o.accent || REEL.pink, dot: o.dot || REEL.yellow, width: 26 * k, ...o.star || {} }
    }), { z: "back", motionBlur: o.motionBlur });
    const root = h("div", "vk-lockup vk-abs");
    root.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
    const abs = (cls, html2, y, css3) => {
      const e = h("div", cls, html2, root);
      e.style.cssText = `position:absolute;left:50%;top:${y * 100}%;transform:translate(-50%,-50%);white-space:nowrap;line-height:1;${css3}`;
      return e;
    };
    const title2 = abs("vk-lockup-title", o.title || "VIDKIT", 0.565, `font:400 ${px4(o.titleSize || 167)}px var(--vk-display);color:${ink};letter-spacing:.01em`);
    sc.fx(title2, "mask-rise", { t: at + 0.85, each: 0.05, d: 0.5 });
    const subW = abs("vk-lockup-sub", "", 0.74, `font:900 ${px4(o.subSize || 43)}px var(--vk-sans);color:${ink};padding:0 ${px4(9)}px`);
    const bar2 = h("div", null, null, subW);
    bar2.style.cssText = `position:absolute;left:0;right:0;top:58%;height:${px4(19)}px;background:${o.bar || REEL.yellow};transform-origin:0 50%;transform:scaleX(0);z-index:0`;
    const subT = h("span", null, o.sub || "", subW);
    subT.style.cssText = "position:relative;z-index:1;display:inline-block";
    const tag = o.tagline ? abs("vk-lockup-tag", o.tagline, 0.825, `font:700 ${px4(24)}px var(--vk-sans);color:${o.muted || "#6a6a78"}`) : null;
    const dots = h("div", null, null, root);
    dots.style.cssText = `position:absolute;left:50%;top:${H * 0.884}px;transform:translate(-50%,-50%);display:flex;gap:${px4(10)}px`;
    const D = cols.slice(0, 4).concat(ink).map((c) => {
      const d = h("i", null, null, dots);
      d.style.cssText = `display:block;width:${px4(17.3)}px;height:${px4(17.3)}px;border-radius:50%;background:${c}`;
      return d;
    });
    let fade = null;
    if (o.fadeOut != null) {
      fade = h("div", null, null, sc.el);
      fade.dataset.qa = "ignore";
      fade.style.cssText = `position:absolute;inset:0;background:${o.fadeColor || ink};opacity:0;z-index:25;pointer-events:none`;
    }
    const tf = o.fadeOut != null ? sc.time(o.fadeOut) : 0;
    sc.on((local) => {
      const sa = P(local, at + 1.1, 0.3), sp = EASE.outExpo(P(local, at + 1.15, 0.45));
      subW.style.opacity = sa;
      subT.style.transform = `translateY(${((1 - sa) * px4(16)).toFixed(1)}px)`;
      bar2.style.transform = `scaleX(${sp.toFixed(4)})`;
      if (tag) tag.style.opacity = P(local, at + 1.3, 0.3);
      D.forEach((d, i) => {
        d.style.transform = `scale(${Math.max(0, EASE.outBack(P(local, at + 1.35 + i * 0.06, 0.3))).toFixed(4)})`;
      });
      if (fade) fade.style.opacity = P(local, tf, 0.1);
    });
    return root;
  });

  // src/fx/mg/index.js
  function installDotwave() {
    registry.backgrounds.dotwave = (sc, o, v) => {
      const c = document.createElement("canvas"), dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1)), g2 = c.getContext("2d");
      c.width = Math.round(v.W * dpr);
      c.height = Math.round(v.H * dpr);
      c.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
      const step = o.step || Math.round(v.H / 18), draw2 = dotwave({ cols: Math.ceil(v.W / step), rows: Math.ceil(v.H / step), step, bg: o.color || o.bg, ...o });
      return { el: c, update(local) {
        g2.setTransform(1, 0, 0, 1, 0, 0);
        g2.clearRect(0, 0, c.width, c.height);
        g2.setTransform(dpr, 0, 0, dpr, 0, 0);
        const t = sc.start + local;
        draw2(g2, local, { t, local, W: v.W, H: v.H, fps: v.fps, frameT: v.frameT, beats: v.beats, scene: sc, video: v });
      } };
    };
  }
  lazyRegister("transitions", Object.keys(COVER_TRANSITIONS), installCover);
  lazyRegister("fx", Object.keys(MG_FX), installText);
  lazyRegister("backgrounds", ["dotwave"], installDotwave);
  var accents2 = accents;
  var mg = {
    ...math_exports,
    ...paint_exports,
    COVER_COLORS,
    MONTAGE_PALETTES,
    cover: COVER_TRANSITIONS,
    textFx: MG_FX,
    install() {
      installCover();
      installText();
      installDotwave();
    }
    // eager registration (e.g. for a gallery of everything)
  };
  var hudLayer = (video, o = {}) => video.canvas(hud(o), { blend: o.blend || "difference", zIndex: o.zIndex || 35 });

  // src/index.js
  var import_meta4 = {};
  var version = "0.2.0";
  var current = null;
  var env = { base: (() => {
    try {
      return new URL("../", import_meta4.url).href;
    } catch (e) {
      return "";
    }
  })() };
  var vk = {
    version,
    // ---- authoring ----
    // cfg.style: a style pack id / combination (see vk.style) — supplies theme, texture, transition, push … defaults
    video(cfg = {}) {
      const S2 = cfg.style ? style(cfg.style) : null;
      current = new Video(S2 ? S2.videoCfg(cfg) : cfg, env);
      if (S2) S2.install(current);
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
    // vk.list(kind) → names · vk.list(kind, {detail:true}) → [{name, description, params:{p:{type, default, range, description}}, example, aliases, …}]
    // vk.list() → kinds · kinds: fx transitions textures backgrounds blocks eases themes formats sounds materials styles three threeMaterials threeRigs
    list(kind, o) {
      if (kind == null) return KINDS2.slice();
      const k = normKind(kind);
      return o || !registry[k] || k === "meta" ? listDetail(k, o || {}) : list(k);
    },
    describe: (kind, name) => describe(kind, name),
    commonParams: common,
    names,
    schemas: schemas_exports,
    suggest,
    lev,
    get strict() {
      return STRICT.on;
    },
    setStrict,
    unknownMessage,
    unknownName,
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
    resample: resample2,
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
    // camera shot maths (core/camera.js) — also used by sc.shots(list, o)
    cam: { SHOTS, frameShot, keepInFrame, clampView, punchEnv, smoothFollow, headBox, shotCamera, normKeys, subjectHeight },
    // reusable motion (fx/motion.js): gait/foot locking, lip-sync visemes, line boil, follow-through
    motion,
    // generic profile puppet on vk.rig, drawn in a style's character material
    puppet: Object.assign((parent, o = {}) => puppet(parent, { video: current, ...o, style: o.style ? o.style.colour ? o.style : style(o.style).charView : current && current.style ? current.style.charView : void 0 }), puppetBones),
    // style packs (styles/<id>/): vk.style('ink') → Style; vk.style.list(); vk.style.register(json, runtimeFactory)
    style: Object.assign((spec) => style(spec), {
      list: listStyles,
      get: (id) => STYLES[id],
      get packs() {
        return STYLES;
      },
      ROLES,
      Style,
      parseSetting,
      material,
      MATERIALS,
      kit: kit_exports,
      bed,
      scaleNotes,
      SCALES,
      transitions: STYLE_TRANSITIONS,
      installTransitions: installStyleTransitions,
      register: (data, make2) => registerStyle(normalizeStyle(typeof data === "object" ? data : {}), typeof make2 === "function" ? make2(vk) : make2 || {}),
      normalize: normalizeStyle,
      validate: validateStyle,
      mix: mixStyles,
      fork: forkStyle,
      matchBase: matchBaseFromPrompt,
      ids: PACK_IDS,
      // Runtime load: styles/boot.mjs (browser / CLI inject) or `import { loadAllNode, loadForVk } from './styles/loader.js'` (Node).
      // Not inlined here so dist/vidkit.js never embeds pack sources — new styles need no rebuild.
      load: async (id, o = {}) => {
        if (typeof process !== "undefined" && process.versions && process.versions.node) {
          const m = await import("./styles/loader.js");
          return m.loadForVk(vk, id, o);
        }
        throw new Error("[vk.style.load] in the browser use styles/boot.mjs (CLI inject does this) or vk.style.register(json, factory)");
      },
      loadAll: async (o = {}) => {
        if (typeof process !== "undefined" && process.versions && process.versions.node) {
          const m = await import("./styles/loader.js");
          return m.loadAllForVk(vk, o);
        }
        throw new Error("[vk.style.loadAll] in the browser import styles/boot.mjs and await boot(vk)");
      }
    }),
    // story → styled narrated film (styles/film.js); vk make generates pages that call this
    film: Object.assign((story, o) => film(vk, story, o), { parse: parseStory }),
    // motion-graphics pack (fx/mg): maths + painters, beat accents, UI micro-interactions, keyword montage, lockup, HUD
    mg,
    accents: accents2,
    ui,
    montage,
    lockup,
    hud: (o) => hudLayer(current, o),
    geom: geom_exports,
    color: color_exports,
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
  var base2 = src ? new URL("../", src).href : "";
  index_default._setEnv({ base: base2 });
  window.vk = index_default;
})();
