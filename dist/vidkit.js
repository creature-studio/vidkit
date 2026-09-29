/*! vidkit 0.1.0 — deterministic HTML/JS → video. MIT. Bundled fonts: SIL OFL 1.1 (see fonts/LICENSES.md) */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/ease.js
  function bezier(x1, y1, x2, y2) {
    const A = (a, b) => 1 - 3 * b + 3 * a, B3 = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
    const calc = (t, a, b) => ((A(a, b) * t + B3(a, b)) * t + C(a)) * t;
    const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B3(a, b) * t + C(a);
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
  var BeatGrid = class {
    constructor(o = {}) {
      this.fps = o.fps || 30;
      this.set(o);
    }
    set(o = {}) {
      if (o.fps) this.fps = o.fps;
      this.bpm = +o.bpm || 0;
      this.offset = +o.offset || 0;
      this.times = Array.isArray(o.times) && o.times.length ? o.times.slice().sort((a, b) => a - b) : null;
      if (this.times && !this.bpm && this.times.length > 1) this.bpm = 60 / ((this.times[this.times.length - 1] - this.times[0]) / (this.times.length - 1));
      this.beat = this.bpm ? 60 / this.bpm : 0.5;
      return this;
    }
    get active() {
      return !!(this.bpm || this.times);
    }
    // time of beat n (fractional allowed)
    at(n) {
      if (!this.times) return this.offset + n * this.beat;
      const T3 = this.times, i = Math.floor(n), f = n - i;
      if (i < 0) return T3[0] + n * this.beat;
      if (i >= T3.length - 1) return T3[T3.length - 1] + (n - (T3.length - 1)) * this.beat;
      return T3[i] + (T3[i + 1] - T3[i]) * f;
    }
    // fractional beat index at time t (binary search for explicit beats)
    index(t) {
      if (!this.times) return (t - this.offset) / this.beat;
      const T3 = this.times;
      if (t < T3[0]) return (t - T3[0]) / this.beat;
      if (t >= T3[T3.length - 1]) return T3.length - 1 + (t - T3[T3.length - 1]) / this.beat;
      let lo = 0, hi = T3.length - 1;
      while (hi - lo > 1) {
        const m = lo + hi >> 1;
        if (T3[m] <= t) lo = m;
        else hi = m;
      }
      return lo + (t - T3[lo]) / (T3[lo + 1] - T3[lo]);
    }
    // 1 on every beat (one frame early), decays exponentially. every=2 → every other beat
    pulse(t, k = 6, every = 1) {
      return this.active ? Math.exp(-frac(this.index(t + 1 / this.fps) / every) * k) : 0;
    }
    // one-shot accent at t0
    hit(t, t0, k = 8) {
      return t < t0 - 1 / this.fps ? 0 : Math.exp(-k * Math.max(0, t - t0 + 1 / this.fps));
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
  };
  function parseTime(v, grid2, base2 = 0) {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v;
    v = String(v).trim();
    if (v.startsWith("b:")) return grid2.at(+v.slice(2)) - 1 / grid2.fps - base2;
    return +v;
  }
  function parseDur(v, grid2) {
    if (typeof v === "number") return v;
    v = String(v || "");
    return v.startsWith("b:") ? +v.slice(2) * grid2.beat : +v;
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
    beatZoom(amount = 0.02, k = 6, every = 1) {
      this.ensureCam();
      this.camCfg.extra.push((lt) => amount * this.video.beats.pulse(this.start + lt, k, every));
      return this;
    }
    // ---- layers ----
    canvas(draw, o = {}) {
      return this.video.addLayer("canvas", draw, { ...o, scene: this });
    }
    webgl(o = {}) {
      return this.video.addLayer("webgl", null, { ...o, scene: this });
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
    return { "--bg": m.bg, "--fg": m.fg, "--muted": m.muted, "--surface": m.surface, "--line": m.line, "--accent": m.accent, "--accent2": m.accent2, "--on-accent": m.onAccent };
  }

  // src/runtime/css.js
  function fontFaces(base2) {
    const f = (fam, file, extra = "") => `@font-face{font-family:"${fam}";src:url("${base2}${file}") format("truetype");font-display:block;${extra}}`;
    return f("Noto Sans SC", "NotoSansSC-VF.ttf", "font-weight:100 900;") + f("JetBrains Mono", "JetBrainsMono-VF.ttf", "font-weight:100 800;") + f("Archivo", "Archivo-VF.ttf", "font-weight:100 900;font-stretch:62% 125%;") + f("Anton", "Anton-Regular.ttf", "font-weight:400;") + f("Instrument Serif", "InstrumentSerif-Regular.ttf", "font-weight:400;font-style:normal;") + f("Instrument Serif", "InstrumentSerif-Italic.ttf", "font-weight:400;font-style:italic;");
  }
  function stageCSS(v) {
    const { W, H, theme: th } = v, s2 = v.safe;
    return `
#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;transform-origin:0 0;background:#000;color:#fff;
  font-family:var(--vk-sans);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-kerning:normal}
#stage *,#stage *::before,#stage *::after{box-sizing:border-box;transition:none!important}
#stage .vk-scenes{position:absolute;inset:0}
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
  bottom:var(--cap-bottom);font-size:var(--cap-size);max-width:${W - s2.left - s2.right}px;background:${th.caption.bg};color:${th.caption.fg};font-family:var(--vk-sans);
  font-weight:700;padding:.3em .8em;border-radius:12px;line-height:1.35;white-space:${W < H ? "normal;width:max-content" : "nowrap"}}
${W < H ? `.vk-cap{left:${s2.left}px;right:${s2.right}px;transform:none;margin:0 auto;max-width:${W - s2.left - s2.right}px}` : ""}
.vk-cap .kw{transition:none}.vk-cap .kw.on{color:${th.caption.karaoke}}
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
          v.audioEl.currentTime = t;
          v.audioEl.play().catch(() => {
          });
        } else v.audioEl.pause();
      }
      if (p) playScore();
      else stopScore();
    }
    const toggle = () => {
      if (!v.playing && t >= DUR - 0.05) t = 0;
      setPlaying(!v.playing);
    };
    const go = (nt) => {
      t = Math.max(0, Math.min(DUR - 1e-3, nt));
      if (v.audioEl) v.audioEl.currentTime = t;
      if (v.playing) playScore();
      v.render(t);
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
      const A = texts[i], B3 = texts[j];
      let hit = false;
      if (A.el.contains(B3.el) || B3.el.contains(A.el)) continue;
      A.rs.forEach((a) => B3.rs.forEach((b) => {
        const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (ix > Math.max(3, 0.12 * Math.min(a.r - a.l, b.r - b.l)) && iy > 0.35 * Math.min(a.b - a.t, b.b - b.t)) hit = true;
      }));
      if (hit) issues.push({ type: "text-overlap", el: label2(A.el), other: label2(B3.el) });
    }
    if (capEl && +capEl.style.opacity > 0) {
      const cr = R(capEl);
      if (cr.w > W - s2.left - s2.right + 2) issues.push({ type: "caption-too-wide", el: label2(capEl), w: Math.round(cr.w) });
      if (W >= H && capEl.getClientRects().length && cr.h > parseFloat(getComputedStyle(capEl).fontSize) * 2) issues.push({ type: "caption-wraps", el: label2(capEl) });
      for (const z of v.zones) if (cr.r > z.x && cr.l < z.x + z.w && cr.b > z.y && cr.t < z.y + z.h) issues.push({ type: "caption-in-ui-zone", el: label2(capEl), zone: z.name, level: "warn" });
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
    const tf = getComputedStyle(cam).transform;
    return !!tf && tf !== "none" && tf !== "matrix(1, 0, 0, 1, 0, 0)";
  }

  // src/layers/canvas.js
  var CanvasLayer = class {
    constructor(video, draw, o = {}) {
      this.video = video;
      this.draw = draw;
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
      const gl = this.gl = c.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true, antialias: false });
      if (!gl) {
        console.warn("[vk] WebGL unavailable; webgl layer disabled");
        return;
      }
      if (o.init) {
        o.init(gl, this);
        return;
      }
      if (o.frag) this.program = this.compile(o.frag);
    }
    compile(frag) {
      const gl = this.gl, sh = (type, src2) => {
        const s2 = gl.createShader(type);
        gl.shaderSource(s2, src2);
        gl.compileShader(s2);
        if (!gl.getShaderParameter(s2, gl.COMPILE_STATUS)) throw new Error("[vk] shader: " + gl.getShaderInfoLog(s2));
        return s2;
      };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, (frag.includes("precision") ? "" : "precision highp float;\n") + "uniform float uTime,uBeat,uProgress;uniform vec2 uRes;\n" + frag));
      gl.linkProgram(pr);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      return pr;
    }
    render(local, info) {
      const gl = this.gl;
      if (!gl) return;
      gl.viewport(0, 0, this.el.width, this.el.height);
      if (this.o.render) {
        this.o.render(gl, local, info, this);
        return;
      }
      if (!this.program) return;
      gl.useProgram(this.program);
      const u = (n) => gl.getUniformLocation(this.program, n);
      gl.uniform1f(u("uTime"), local);
      gl.uniform2f(u("uRes"), this.el.width, this.el.height);
      gl.uniform1f(u("uBeat"), info.beats ? info.beats.pulse(info.t) : 0);
      gl.uniform1f(u("uProgress"), info.p || 0);
      const extra = this.o.uniforms ? this.o.uniforms(local, info) : {};
      for (const k in extra) {
        const v = extra[k], l = u(k);
        if (Array.isArray(v)) gl["uniform" + v.length + "f"](l, ...v);
        else gl.uniform1f(l, v);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
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
    const el2 = sc.el, T3 = (x) => parseTime(x, v.beats, sc.start);
    el2.querySelectorAll("[data-stagger]").forEach((box) => {
      const kids = [...box.children], each = +box.dataset.stagger || 0.15, t = T3(box.dataset.t);
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
      const o = { t: T3(ds.t), each: ds.each ? +ds.each : void 0, color: ds.color, d: ds.d != null ? +ds.d : void 0, ease: ds.ease, dist: ds.dist ? +ds.dist : void 0 };
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
      if (ds.exit != null) applyFx(it, ds.exitFx || (/^(type|count|swap|letters|words)$/.test(fx) ? "fade" : fx), { t: T3(ds.exit), d: ds.exitD ? +ds.exitD : 0.4 }, sc, true);
    });
    if (el2.dataset.push) sc.push(parseFloat(el2.dataset.push) / (/%$/.test(el2.dataset.push) ? 100 : 1));
    if (el2.dataset.shake) el2.dataset.shake.split(";").filter((x) => x.trim()).forEach((x) => {
      const p = x.split(",");
      sc.shake(T3(p[0]), +p[1], p[2] ? +p[2] : void 0);
    });
    if (el2.dataset.cam) sc.camera(el2.dataset.cam.split(";").filter((s2) => s2.trim()).map((s2) => {
      const p = s2.split(":"), q = p[1].split(",").map(Number);
      return { t: +p[0], x: q[0], y: q[1], s: q[2], r: q[3], ease: p[2] && p[2].trim() };
    }));
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
      this.beats = new BeatGrid({ fps: this.fps, bpm: cfg.bpm, offset: cfg.beatOffset, times: cfg.beats });
      this.tl = new Timeline();
      this.scenes = [];
      this.layers = [];
      this.globalFns = [];
      this.overlays = [];
      this.caps = (cfg.captions || []).slice();
      this.events = Array.isArray(cfg.score) ? cfg.score.slice() : [];
      this.pendingMedia = [];
      this.afterFonts = [];
      this.duration = 0;
      this.curT = 0;
      this.finalized = false;
      this.ui = null;
      this.playing = false;
      this.ccOn = true;
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
      st.setProperty("--vk-condensed", th.fonts.condensed || th.fonts.display);
      Object.entries(th.scale).forEach(([n, px]) => st.setProperty("--vk-fs-" + n, Math.round(px * k) + "px"));
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
      const auto = o.dur === "auto" || o.dur == null;
      sc.dur = auto ? 0 : parseDur(o.dur, this.beats);
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
      if (typeof nodes === "function") nodes(sc, this);
      else if (nodes) this.buildNodes(sc, [].concat(nodes).flat(), sc.content);
      if (auto) sc.dur = Math.max(1.5, sc.maxT + (o.hold != null ? o.hold : 2.2));
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
    addLayer(kind, draw, o) {
      const Cls = kind === "webgl" ? WebGLLayer : kind === "canvas" ? CanvasLayer : registry.layers[kind];
      const layer = new Cls(this, draw, o);
      const host = o.scene ? o.fixed || !o.scene.cam ? o.scene.el : o.scene.cam : this.stage;
      if (layer.el) {
        if (o.z === "back" || o.z === "below") {
          const bgs = [...host.children].filter((c) => c.classList.contains("vk-bg"));
          host.insertBefore(layer.el, bgs.length ? bgs[bgs.length - 1].nextSibling : host.firstChild);
        } else host.appendChild(layer.el);
        if (o.zIndex != null) layer.el.style.zIndex = o.zIndex;
      }
      (o.scene ? o.scene.layers : this.layers).push(layer);
      return layer;
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
    canvas(draw, o = {}) {
      return this.addLayer("canvas", draw, { z: "front", zIndex: 30, ...o });
    }
    sfx(t, name, gain = 1, freq) {
      this.events.push([+t.toFixed(3), name, gain, freq]);
      return this;
    }
    caption(start, end, text2, words) {
      this.caps.push(words ? [start, end, text2, words] : [start, end, text2]);
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
      ];
      this.fontsCheck = fontsCheck;
      window.__ready = Promise.all([
        Promise.all(fontsCheck.map((f) => document.fonts.load(f, "\u4E2D\u6587Aa0"))).catch(() => {
        }),
        Promise.all([...this.stage.querySelectorAll("img")].map((im) => im.decode ? im.decode().catch(() => {
        }) : null))
      ]).then(() => document.fonts.ready).then(() => {
        this.afterFonts.forEach((f) => f());
        this.render(this.curT);
        return true;
      });
      Object.assign(window, {
        __duration: this.duration,
        __fps: this.fps,
        __size: { width: this.W, height: this.H },
        __captions: this.caps,
        __audio: this.cfg.audio ? new URL(this.cfg.audio, location.href).href : null,
        __scenes: S.map((s2) => ({ index: s2.index, name: s2.name, start: s2.start, dur: s2.dur, transition: s2.transition, settle: this.settleOf(s2) })),
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
        sc.__st = { opacity: "", transform: "", filter: "", clipPath: "", transformOrigin: "", zIndex: String(sc.index + 1) };
      }
      for (const sc of active) {
        const tr = sc.transition, local = t - sc.start;
        if (!tr.d || local >= tr.d) continue;
        const T3 = registry.transitions[tr.type] || registry.transitions.fade;
        const raw = local / tr.d, prev = S[sc.index - 1];
        const r = T3(getEase(tr.ease || "inOutCubic")(raw), { raw, local, W, H, fps: this.fps, frame: Math.floor(t * this.fps), o: tr, video: this, inScene: sc, outScene: prev }) || {};
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
          if (c[3]) el2.innerHTML = c[3].map((w) => `<span class="kw">${esc(w.w)}</span>`).join("");
          else el2.textContent = c[2];
        }
        if (c[3]) [...el2.children].forEach((s2, i) => s2.classList.toggle("on", t >= c[3][i].t));
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
  var SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
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
  var txt = (tag, cls, defFx) => (text2, o = {}) => node(o, function text_(ctx) {
    return h(tag, cls, o.html ? text2 : md(text2));
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
    const path = el2.tagName.toLowerCase() === "path" ? el2 : el2.querySelector("path");
    const seq = o.paths ? o.paths.slice() : [path.getAttribute("d"), o.to];
    const allCompat = seq.every((d) => compatible(d, seq[0]));
    const norm = allCompat ? seq : seq.map((d) => resample(d, o.n || 120));
    path.setAttribute("d", norm[0]);
    const step = o.each || (o.d || 0.9) + 0.4;
    for (let i = 1; i < norm.length; i++) api.tween(path, { t: o.t + (i - 1) * step, d: o.d || 0.9, ease: o.ease || "inOutCubic", from: { "attr:d": norm[i - 1] }, to: { "attr:d": norm[i] } });
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
  function perPiece(mode, A, B3, defEase, defD, defEach, exitTo) {
    return (el2, o, api) => {
      const pieces = split2(el2, mode === "words" ? "words" : mode === "clip" ? "letters" : "chars");
      const each = o.each != null ? o.each : defEach;
      let a = typeof A === "function" ? A(o, el2) : A, b = typeof B3 === "function" ? B3(o, el2) : B3, ease = o.ease || defEase;
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
    const px = ctx.px, win = h("div", "vk-term vk-mono");
    win.style.cssText = `width:${len(ctx, o.w || 620, "x")};background:var(--surface);border:1px solid var(--line);border-radius:${px(16)}px;padding:${px(22)}px ${px(28)}px;font-size:${size(ctx, o.size || 21)};line-height:1.65;text-align:left;color:var(--fg);box-shadow:0 ${px(30)}px ${px(60)}px -${px(30)}px rgba(0,0,0,.45)`;
    const bar = h("div", null, `<i></i><i></i><i></i>${o.title ? `<span>${esc2(o.title)}</span>` : ""}`, win);
    bar.style.cssText = `display:flex;gap:${px(8)}px;align-items:center;margin-bottom:${px(14)}px;font-size:.8em;color:var(--muted)`;
    [...bar.querySelectorAll("i")].forEach((i, k) => i.style.cssText = `width:${px(12)}px;height:${px(12)}px;border-radius:50%;background:${["#FF5F57", "#FEBC2E", "#28C840"][k]};opacity:.9`);
    if (bar.querySelector("span")) bar.querySelector("span").style.marginLeft = px(10) + "px";
    const t0 = ctx.at(o);
    let t = t0 + 0.35;
    const cps = o.cps || 32, sc = ctx.scene;
    sc.fx(win, o.winFx || "fade", { t: t0, d: 0.4 });
    lines.forEach((line) => {
      const row2 = h("div", null, null, win);
      row2.style.whiteSpace = "pre-wrap";
      const m = /^\$\s?(.*)$/.exec(line);
      if (m) {
        row2.innerHTML = `<span style="color:var(--accent2)">${esc2(o.prompt || "$")} </span><span class="cmd"></span>`;
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
    const px = ctx.px, pre = h("div", "vk-code vk-mono");
    pre.style.cssText = `width:${len(ctx, o.w || 620, "x")};background:var(--surface);border:1px solid var(--line);border-radius:${px(14)}px;padding:${px(22)}px ${px(26)}px;font-size:${size(ctx, o.size || 20)};line-height:1.6;text-align:left;white-space:pre;color:var(--fg);overflow:hidden`;
    const KW = /\b(const|let|var|function|return|import|from|export|await|async|new|if|else|for|of|in|class|true|false|null|def|fn|pub|use|package|func)\b/g;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.12;
    src2.replace(/\n$/, "").split("\n").forEach((ln, i) => {
      const hs = highlightLine(ln, KW);
      const row2 = h("div", null, hs || " ", pre);
      if (o.highlight && o.highlight.includes(i + 1)) row2.style.cssText = `background:color-mix(in srgb,var(--accent) 22%,transparent);margin:0 -${px(26)}px;padding:0 ${px(26)}px`;
      ctx.scene.fx(row2, "left", { t: t0 + i * each, d: 0.35, dist: px(14) });
    });
    ctx.advance(t0 + src2.split("\n").length * each);
    return pre;
  }, null);
  B.cards = (items, o = {}) => node(o, function cards(ctx) {
    const px = ctx.px, g = h("div", "vk-cards");
    g.style.cssText = `display:grid;grid-template-columns:repeat(${o.cols || Math.min(4, items.length)},1fr);gap:${px(o.gap || 24)}px;width:100%;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.15;
    items.forEach((it, i) => {
      const c = h("div", "vk-card vk-surface", null, g);
      c.style.cssText += `;padding:${px(22)}px ${px(24)}px;display:flex;flex-direction:column;gap:${px(8)}px;border-radius:var(--vk-radius)`;
      if (it.icon) h("div", null, it.icon, c).style.cssText = `font-size:${px(34)}px;line-height:1;color:var(--accent)`;
      if (it.tag) h("div", "vk-label", esc2(it.tag), c).style.fontSize = px(16) + "px";
      h("div", null, md(it.title), c).style.cssText = `font-size:${px(o.titleSize || 28)}px;font-weight:800;line-height:1.2;color:var(--fg)`;
      if (it.text) h("div", null, md(it.text), c).style.cssText = `font-size:${px(o.textSize || 19)}px;line-height:1.45;color:var(--muted)`;
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
    const px = ctx.px, g = h("div", "vk-columns");
    g.style.cssText = `display:grid;grid-template-columns:repeat(${items.length},1fr);gap:${px(28)}px;width:100%;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.3;
    items.forEach((it, i) => {
      const c = h("div", null, null, g);
      c.style.cssText = `border-left:${px(3)}px solid var(--line);padding:${px(4)}px 0 ${px(4)}px ${px(18)}px`;
      h("div", null, md(it.title), c).style.cssText = `font-size:${px(30)}px;font-weight:900;line-height:1.2`;
      if (it.code) h("div", "vk-mono", esc2(it.code), c).style.cssText = `font-size:${px(18)}px;color:var(--accent2);margin-top:${px(8)}px`;
      if (it.text) h("div", null, md(it.text), c).style.cssText = `font-size:${px(19)}px;line-height:1.45;color:var(--muted);margin-top:${px(8)}px`;
      ctx.scene.fx(c, "up", { t: t0 + i * each, d: 0.5 });
      ctx.scene.tween(c, { t: t0 + i * each + 0.2, d: 0.4, from: { borderLeftColor: ctx.video.color("line", ctx.scene.mode) }, to: { borderLeftColor: ctx.video.color("accent", ctx.scene.mode) } });
    });
    ctx.advance(t0 + items.length * each);
    return g;
  }, null);
  B.kv = (rows2, o = {}) => node(o, function kv(ctx) {
    const px = ctx.px, box = h("div", "vk-kv");
    box.style.cssText = `width:${o.w ? len(ctx, o.w, "x") : "100%"};border-top:${px(2)}px solid var(--fg);text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.4;
    rows2.forEach(([k, v], i) => {
      const r = h("div", null, null, box);
      r.style.cssText = `display:flex;align-items:center;min-height:${px(o.rowH || 70)}px;border-bottom:1px solid var(--line);gap:${px(20)}px`;
      h("div", null, md(k), r).style.cssText = `width:${px(o.keyW || 200)}px;flex:none;font-weight:900;font-size:${px(23)}px;color:var(--accent)`;
      h("div", null, md(v), r).style.cssText = `font-size:${px(22)}px;line-height:1.35`;
      ctx.scene.fx(r, "left", { t: t0 + i * each, d: 0.4 });
    });
    ctx.advance(t0 + rows2.length * each);
    return box;
  }, null);
  B.gantt = (spec, o = {}) => node(o, function gantt(ctx) {
    const px = ctx.px, [a, b] = spec.range || [0, Math.max(...spec.rows.map((r) => r.end))];
    const box = h("div", "vk-gantt");
    box.style.cssText = `width:100%;text-align:left;position:relative`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.25;
    spec.rows.forEach((r, i) => {
      const row2 = h("div", null, null, box);
      row2.style.cssText = `display:flex;align-items:center;height:${px(46)}px;gap:${px(16)}px`;
      h("div", "vk-mono", md(r.label), row2).style.cssText = `width:${px(o.labelW || 170)}px;flex:none;font-size:${px(18)}px;color:var(--muted);text-align:right`;
      const track = h("div", null, null, row2);
      track.style.cssText = `position:relative;flex:1;height:${px(26)}px;border-left:1px solid var(--line)`;
      const bar = h("div", null, r.text ? `<span>${md(r.text)}</span>` : "", track);
      bar.style.cssText = `position:absolute;top:0;height:100%;left:${(r.start - a) / (b - a) * 100}%;width:${(r.end - r.start) / (b - a) * 100}%;background:${r.hl ? "var(--accent)" : "var(--accent2)"};border-radius:${px(5)}px;transform-origin:left center;font-size:${px(15)}px;color:var(--on-accent);display:flex;align-items:center;padding-left:${px(8)}px;white-space:nowrap;overflow:hidden`;
      ctx.scene.fx(bar, "grow", { t: t0 + i * each, d: 0.5, ease: "outCubic" });
    });
    if (spec.unit) {
      const ax = h("div", "vk-mono", `${a}${spec.unit} \u2192 ${b}${spec.unit}`, box);
      ax.style.cssText = `margin-left:${px((o.labelW || 170) + 16)}px;font-size:${px(15)}px;color:var(--muted);margin-top:${px(6)}px`;
      ctx.scene.fx(ax, "fade", { t: t0, d: 0.4 });
    }
    ctx.advance(t0 + spec.rows.length * each);
    return box;
  }, null);
  B.diagram = (spec, o = {}) => node(o, function diagram(ctx) {
    const px = ctx.px, W = spec.w || 1e3, H = spec.h || 400;
    const box = h("div", "vk-diagram");
    box.style.cssText = `position:relative;width:${px(W)}px;height:${px(H)}px;flex:none`;
    const svgEl = s("svg", { width: px(W), height: px(H), viewBox: `0 0 ${W} ${H}`, fill: "none", stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, box);
    svgEl.style.cssText = "position:absolute;left:0;top:0;overflow:visible;color:var(--accent)";
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.35, nt = {}, N = {};
    spec.nodes.forEach((n, i) => {
      N[n.id] = n;
      const e = h("div", "vk-node", `<b>${md(n.label)}</b>${n.sub ? `<span>${md(n.sub)}</span>` : ""}`, box);
      e.style.cssText = `position:absolute;left:${px(n.x)}px;top:${px(n.y)}px;width:${px(n.w || 200)}px;height:${px(n.h || 90)}px;border-radius:${px(14)}px;border:${px(2)}px solid ${n.hl ? "var(--accent)" : "var(--fg)"};background:${n.hl ? "var(--accent)" : "var(--surface)"};color:${n.hl ? "var(--on-accent)" : "var(--fg)"};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:${px(4)}px;${n.dashed ? "border-style:dashed;background:transparent;" : ""}`;
      e.querySelector("b").style.cssText = `font-size:${px(n.size || 24)}px;font-weight:900;line-height:1.15`;
      const sp = e.querySelector("span");
      if (sp) sp.style.cssText = `font:600 ${px(15)}px var(--vk-mono);opacity:.8`;
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
        l.style.cssText = `position:absolute;left:${px((x1 + x2) / 2)}px;top:${px((y1 + y2) / 2) - px(30)}px;transform:translateX(-50%);font-size:${px(15)}px;color:var(--muted);white-space:nowrap`;
        ctx.scene.fx(l, "fade", { t: te + 0.3, d: 0.3 });
      }
    });
    ctx.advance(last);
    return box;
  }, null);
  B.quote = (text2, o = {}) => node(o, function quote(ctx) {
    const px = ctx.px, q = h("figure", "vk-quote");
    q.style.cssText = `margin:0;max-width:${len(ctx, o.w || 900, "x")};text-align:${o.align || "left"};position:relative`;
    const mark = h("div", null, "\u201C", q);
    mark.dataset.qa = "ignore";
    mark.style.cssText = `font-family:var(--vk-serif);font-size:${px(180)}px;line-height:.6;color:var(--accent);height:${px(70)}px`;
    const body = h("blockquote", null, md(text2), q);
    body.style.cssText = `margin:0;font-family:${o.serif === false ? "var(--vk-sans)" : "var(--vk-serif)"};font-size:${size(ctx, o.size || 50)};line-height:1.3;font-weight:${o.weight || 500}`;
    const t0 = ctx.at(o);
    ctx.scene.fx(mark, "pop", { t: t0, d: 0.5 });
    ctx.scene.fx(body, o.textFx || "words-up", { t: t0 + 0.25, each: o.each || 0.06 });
    if (o.by) {
      const by = h("figcaption", null, "\u2014 " + md(o.by), q);
      by.style.cssText = `margin-top:${px(20)}px;font-size:${px(22)}px;color:var(--muted)`;
      ctx.scene.fx(by, "fade", { t: t0 + 1.2, d: 0.5 });
    }
    ctx.advance(t0 + 1.2);
    return q;
  }, null);
  B.image = (src2, o = {}) => node(o, function image(ctx) {
    const px = ctx.px, box = h("div", "vk-image");
    box.style.cssText = `position:relative;width:${len(ctx, o.w || 640, "x")};height:${len(ctx, o.h || 360, "y")};overflow:hidden;border-radius:${px(o.radius != null ? o.radius : 14)}px;flex:none;background:var(--surface)`;
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
      c.style.cssText = `position:absolute;left:0;right:0;bottom:0;padding:${px(10)}px ${px(16)}px;font-size:${px(16)}px;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;text-align:left`;
    }
    return box;
  }, "fade");
  B.device = (content, o = {}) => node(o, function device(ctx) {
    const px = ctx.px, type = o.type || "browser", fr = h("div", "vk-device vk-device-" + type);
    let screen;
    if (type === "phone") {
      const w = o.w || 260;
      fr.style.cssText = `width:${px(w)}px;height:${px(w * 2.05)}px;border-radius:${px(42)}px;background:#0A0A0A;padding:${px(12)}px;box-shadow:0 0 0 ${px(2)}px #333,0 ${px(30)}px ${px(60)}px -${px(20)}px rgba(0,0,0,.5);position:relative;flex:none`;
      screen = h("div", "vk-screen", null, fr);
      screen.style.cssText = `width:100%;height:100%;border-radius:${px(32)}px;overflow:hidden;position:relative;background:var(--bg)`;
      const notch = h("div", null, null, fr);
      notch.style.cssText = `position:absolute;top:${px(20)}px;left:50%;transform:translateX(-50%);width:${px(80)}px;height:${px(22)}px;border-radius:${px(12)}px;background:#0A0A0A;z-index:2`;
    } else if (type === "laptop") {
      const w = o.w || 720;
      fr.style.cssText = `width:${px(w)}px;flex:none;position:relative`;
      const lid = h("div", null, null, fr);
      lid.style.cssText = `width:${px(w * 0.86)}px;height:${px(w * 0.86 * 0.62)}px;margin:0 auto;background:#111;border-radius:${px(16)}px ${px(16)}px 0 0;padding:${px(14)}px;box-shadow:0 0 0 ${px(2)}px #2a2a2a`;
      screen = h("div", "vk-screen", null, lid);
      screen.style.cssText = `width:100%;height:100%;overflow:hidden;position:relative;background:var(--bg);border-radius:${px(4)}px`;
      const base2 = h("div", null, null, fr);
      base2.style.cssText = `width:100%;height:${px(18)}px;background:linear-gradient(#C9CDD6,#8E939E);border-radius:0 0 ${px(14)}px ${px(14)}px`;
    } else {
      const w = o.w || 720;
      fr.style.cssText = `width:${px(w)}px;flex:none;border-radius:${px(14)}px;overflow:hidden;background:var(--surface);border:1px solid var(--line);box-shadow:0 ${px(30)}px ${px(60)}px -${px(30)}px rgba(0,0,0,.45)`;
      const bar = h("div", null, `<i></i><i></i><i></i><span>${esc2(o.url || "")}</span>`, fr);
      bar.style.cssText = `display:flex;gap:${px(8)}px;align-items:center;height:${px(40)}px;padding:0 ${px(14)}px;border-bottom:1px solid var(--line);font:500 ${px(15)}px var(--vk-mono);color:var(--muted)`;
      [...bar.querySelectorAll("i")].forEach((i, k) => i.style.cssText = `width:${px(12)}px;height:${px(12)}px;border-radius:50%;background:${["#FF5F57", "#FEBC2E", "#28C840"][k]}`);
      const sp = bar.querySelector("span");
      sp.style.cssText = `margin-left:${px(12)}px;flex:1;background:var(--bg);border-radius:${px(8)}px;padding:${px(4)}px ${px(12)}px;text-align:left`;
      screen = h("div", "vk-screen", null, fr);
      screen.style.cssText = `position:relative;height:${px(o.h || w * 0.52)}px;overflow:hidden;background:var(--bg)`;
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
    const px = ctx.px, box = h("div", "vk-cta");
    box.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:${px(20)}px;width:100%`;
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
      const term = h("div", "vk-mono", `<span style="color:var(--accent2)">$ </span><span class="c"></span>`, box);
      term.style.cssText = `background:var(--surface);color:var(--fg);border-radius:${px(16)}px;padding:${px(18)}px ${px(30)}px;font-size:${px(spec.cmdSize || 26)}px;white-space:nowrap;text-align:left;border:1px solid var(--line)`;
      ctx.scene.fx(term, "fade", { t, d: 0.4 });
      ctx.scene.fx(term.querySelector(".c"), "type", { t: t + 0.3, cps: 32, text: spec.cmd, caretHold: 1 });
      t += 0.3 + spec.cmd.length / 32 + 0.3;
    }
    if (spec.url) {
      const e = h("div", "vk-mono", esc2(spec.url), box);
      e.style.cssText = `font-size:${px(spec.urlSize || 34)}px;font-weight:700`;
      ctx.scene.fx(e, "up", { t });
      t += 0.5;
    }
    if (spec.note) {
      const e = h("div", null, md(spec.note), box);
      e.style.cssText = `font-size:${px(24)}px;opacity:.9`;
      ctx.scene.fx(e, "fade", { t });
      t += 0.4;
    }
    ctx.advance(t);
    return box;
  }, null);
  B.badge = (text2, o = {}) => node(o, function badge(ctx) {
    const e = h("span", "vk-badge vk-mono", md(text2));
    const px = ctx.px;
    e.style.cssText = `display:inline-block;padding:${px(6)}px ${px(16)}px;border-radius:${px(999)}px;font-size:${px(o.size || 20)}px;font-weight:700;border:${px(2)}px solid ${o.hl ? "var(--accent)" : "var(--line)"};background:${o.hl ? "var(--accent)" : "transparent"};color:${o.hl ? "var(--on-accent)" : "var(--fg)"}`;
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
    const px = ctx.px, D = rows(data), max = o.max || niceMax(Math.max(...D.map((d) => d.value)));
    const W = o.w || 900, H = o.h || 380, box = h("div", "vk-chart vk-bar");
    box.style.cssText = `width:${px(W)}px;flex:none;text-align:left`;
    const t0 = ctx.at(o), each = o.each != null ? o.each : 0.12, sc = ctx.scene;
    const isHl = (d, i) => o.highlight === i || o.highlight === d.label;
    if (o.horizontal) {
      D.forEach((d, i) => {
        const r = h("div", null, null, box);
        r.style.cssText = `display:flex;align-items:center;gap:${px(14)}px;height:${px(H / D.length)}px`;
        h("div", null, md(d.label), r).style.cssText = `width:${px(o.labelW || 160)}px;flex:none;font-size:${px(20)}px;text-align:right;color:var(--muted)`;
        const tr = h("div", null, null, r);
        tr.style.cssText = `flex:1;position:relative;height:${px(Math.min(40, H / D.length * 0.62))}px`;
        const b = h("div", null, null, tr);
        b.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:${d.value / max * 100}%;background:${isHl(d, i) ? "var(--accent)" : barCol(ctx, o, i, d)};border-radius:${px(6)}px;transform-origin:left center`;
        const v = h("div", "vk-mono", "", tr);
        v.style.cssText = `position:absolute;left:calc(${d.value / max * 100}% + ${px(10)}px);top:50%;transform:translateY(-50%);font-size:${px(20)}px;font-weight:700;white-space:nowrap`;
        sc.fx(b, "grow", { t: t0 + i * each, d: 0.8, ease: "outExpo" });
        sc.fx(v, "count", { t: t0 + i * each, d: 0.8, to: d.value, format: (x) => fmtNum(x, o) });
        sc.fx(v, "fade", { t: t0 + i * each + 0.1, d: 0.3 });
      });
    } else {
      const plot = h("div", null, null, box);
      plot.style.cssText = `position:relative;height:${px(H)}px;display:flex;align-items:flex-end;gap:${px(o.gap || 18)}px;border-bottom:${px(2)}px solid var(--fg);padding:0 ${px(8)}px`;
      [0.25, 0.5, 0.75, 1].forEach((g) => {
        const l = h("div", null, null, plot);
        l.style.cssText = `position:absolute;left:0;right:0;bottom:${g * 100}%;border-top:1px dashed var(--line);opacity:.8`;
        const lb = h("div", "vk-mono", fmtNum(max * g, { ...o, decimals: o.axisDecimals != null ? o.axisDecimals : Number.isInteger(max * 0.25) ? 0 : 1 }), l);
        lb.style.cssText = `position:absolute;right:100%;margin-right:${px(8)}px;top:-${px(10)}px;font-size:${px(14)}px;color:var(--muted);white-space:nowrap`;
      });
      D.forEach((d, i) => {
        const c = h("div", null, null, plot);
        c.style.cssText = `flex:1;position:relative;height:${d.value / max * 100}%;display:flex;flex-direction:column;justify-content:flex-start`;
        const b = h("div", null, null, c);
        b.style.cssText = `position:absolute;inset:0;background:${isHl(d, i) ? "var(--accent)" : barCol(ctx, o, i, d)};border-radius:${px(6)}px ${px(6)}px 0 0;transform-origin:center bottom`;
        const v = h("div", "vk-mono", "", c);
        v.style.cssText = `position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:${px(6)}px;font-size:${px(o.valueSize || 18)}px;font-weight:700;white-space:nowrap`;
        const l = h("div", null, md(d.label), c);
        l.style.cssText = `position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:${px(8)}px;font-size:${px(o.labelSize || 17)}px;color:var(--muted);white-space:nowrap`;
        sc.fx(b, "grow-y", { t: t0 + i * each, d: 0.8, ease: "outExpo" });
        sc.fx(v, "count", { t: t0 + i * each, d: 0.8, to: d.value, format: (x) => fmtNum(x, o) });
        sc.fx(l, "fade", { t: t0 + i * each, d: 0.3 });
      });
      plot.style.marginBottom = px(38) + "px";
      box.style.paddingLeft = px(40) + "px";
    }
    if (o.source) {
      const sEl = h("div", null, md(o.source), box);
      sEl.style.cssText = `margin-top:${px(10)}px;font-size:${px(14)}px;color:var(--muted);text-align:right`;
      sc.fx(sEl, "fade", { t: t0, d: 0.5 });
    }
    ctx.advance(t0 + D.length * each + 0.6);
    return box;
  }, null);
  B2.line = (data, o = {}) => node(o, function line(ctx) {
    const px = ctx.px, W = o.w || 900, H = o.h || 380;
    const series = o.series || [{ name: o.name || "", values: rows(data).map((d2) => d2.value) }];
    const labels = o.labels || (data ? rows(data).map((d2) => d2.label) : series[0].values.map((_, i) => String(i + 1)));
    const all = series.flatMap((s2) => s2.values), min = o.min != null ? o.min : Math.min(0, ...all), max = o.max || niceMax(Math.max(...all));
    const axisDec = o.axisDecimals != null ? o.axisDecimals : Number.isInteger((max - min) / 4) ? 0 : 1;
    const axisTxt = (g) => fmtNum(min + (max - min) * g / 4, { ...o, decimals: axisDec, unit: "" });
    const multi = series.length > 1, endW = multi && o.endLabel !== false ? o.labelRight || 190 : 24;
    const P = { l: 18 + Math.max(...[0, 1, 2, 3, 4].map((g) => axisTxt(g).length)) * 8.8, r: endW, t: 20, b: 40 };
    const n = labels.length, X2 = (i) => P.l + (W - P.l - P.r) * (n === 1 ? 0.5 : i / (n - 1)), Y = (v) => P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min));
    const box = h("div", "vk-chart vk-line");
    box.style.cssText = `width:${px(W)}px;height:${px(H)}px;position:relative;flex:none`;
    const svgEl = s("svg", { width: px(W), height: px(H), viewBox: `0 0 ${W} ${H}`, fill: "none" }, box);
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
      const path = s("path", { d: dPath, stroke: col3, "stroke-width": o.strokeWidth || 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svgEl);
      sc.fx(path, "draw", { t: t0 + 0.2 + k * 0.3, d, ease: "inOutCubic" });
      if (o.dots !== false) pts.forEach((p, i) => {
        const c = s("circle", { cx: p[0], cy: p[1], r: 5, fill: col3, stroke: "var(--bg)", "stroke-width": 2 }, svgEl);
        c.style.transformBox = "fill-box";
        c.style.transformOrigin = "center";
        sc.fx(c, "pop", { t: t0 + 0.2 + k * 0.3 + d * (i / Math.max(1, n - 1)), d: 0.3 });
      });
      const lastV = se.values[se.values.length - 1], lp = pts[pts.length - 1];
      if (o.endLabel === false) return;
      const lab = h("div", "vk-mono", "", box);
      lab.style.cssText = `position:absolute;font-size:${px(o.valueSize || 22)}px;font-weight:800;color:${col3};white-space:nowrap;line-height:1`;
      if (multi) {
        lab.style.left = px(lp[0] + 14) + "px";
        ends.push({ lab, y: lp[1] });
      } else {
        lab.style.left = px(lp[0]) + "px";
        lab.style.top = px(lp[1]) - px(44) + "px";
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
        e.lab.style.top = px(e.y) - px((o.valueSize || 22) / 2) + "px";
      });
    }
    if (o.source) {
      const sEl = h("div", null, md(o.source), box);
      sEl.style.cssText = `position:absolute;right:0;top:100%;margin-top:${px(4)}px;font-size:${px(14)}px;color:var(--muted)`;
      sc.fx(sEl, "fade", { t: t0, d: 0.5 });
    }
    ctx.advance(t0 + d + 0.5);
    return box;
  }, null);
  function pieImpl(donut) {
    return (data, o = {}) => node(o, function pie(ctx) {
      const px = ctx.px, D = rows(data), total = D.reduce((m, d2) => m + d2.value, 0), R = o.r || 150, th = donut ? o.thickness || 56 : R;
      const box = h("div", "vk-chart vk-pie");
      box.style.cssText = `display:flex;align-items:center;gap:${px(48)}px;flex:none`;
      const wrap = h("div", null, null, box);
      wrap.style.cssText = `position:relative;width:${px(R * 2)}px;height:${px(R * 2)}px;flex:none`;
      const svgEl = s("svg", { width: px(R * 2), height: px(R * 2), viewBox: `0 0 ${R * 2} ${R * 2}` }, wrap);
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
        big.style.cssText = `font-size:${px(o.centerSize || 44)}px;font-weight:800`;
        if (o.center) big.innerHTML = md(o.center);
        else sc.fx(big, "count", { t: t0, d, to: total, format: (x) => fmtNum(x, o) });
        if (o.centerLabel) h("div", null, md(o.centerLabel), cen).style.cssText = `font-size:${px(17)}px;color:var(--muted)`;
        sc.fx(cen, "fade", { t: t0 + 0.2, d: 0.4 });
      }
      if (o.legend !== false) {
        const lg = h("div", null, null, box);
        lg.style.cssText = `display:flex;flex-direction:column;gap:${px(12)}px;text-align:left`;
        D.forEach((dd, i) => {
          const r = h("div", null, `<i></i><span>${md(dd.label)}</span><b class="vk-mono">${(dd.value / total * 100).toFixed(o.pctDecimals | 0)}%</b>`, lg);
          r.style.cssText = `display:flex;align-items:center;gap:${px(12)}px;font-size:${px(o.legendSize || 21)}px`;
          r.querySelector("i").style.cssText = `width:${px(16)}px;height:${px(16)}px;border-radius:${px(4)}px;background:${pal(ctx, i, dd)};flex:none`;
          r.querySelector("b").style.cssText = `margin-left:auto;padding-left:${px(16)}px;color:var(--muted)`;
          sc.fx(r, "left", { t: t0 + d * ((segs[i].a + segs[i].b) / 2), d: 0.4, dist: px(20) });
        });
      }
      ctx.advance(t0 + d + 0.3);
      return box;
    }, null);
  }
  B2.pie = pieImpl(false);
  B2.donut = pieImpl(true);
  B2.ticker = (value, o = {}) => node(o, function ticker(ctx) {
    const px = ctx.px, box = h("div", "vk-ticker");
    box.style.cssText = "display:flex;flex-direction:column;align-items:center";
    const n = h("div", "vk-mono", "", box);
    n.style.cssText = `font-size:${size(ctx, o.size || 120)};font-weight:800;line-height:1;letter-spacing:-.03em;color:${o.color ? `var(--${o.color})` : "var(--fg)"}`;
    const t0 = ctx.at(o);
    ctx.scene.fx(n, "count", { t: t0, d: o.d || 1.4, from: o.from || 0, to: value, format: (x) => fmtNum(x, { sep: o.sep, decimals: o.decimals, prefix: o.prefix, unit: o.unit || o.suffix }) });
    if (o.label) {
      const l = h("div", null, md(o.label), box);
      l.style.cssText = `font-size:${px(o.labelSize || 24)}px;color:var(--muted);margin-top:${px(10)}px`;
      ctx.scene.fx(l, "up", { t: t0 + 0.3 });
    }
    ctx.advance(t0 + (o.d || 1.4));
    return box;
  }, "fade");
  B2.ring = (pct2, o = {}) => node(o, function ring(ctx) {
    const px = ctx.px, R = o.r || 110, th = o.thickness || 18, rr = R - th / 2, C = 2 * Math.PI * rr;
    const box = h("div", "vk-ring");
    box.style.cssText = `position:relative;width:${px(R * 2)}px;height:${px(R * 2)}px;flex:none`;
    const svgEl = s("svg", { width: px(R * 2), height: px(R * 2), viewBox: `0 0 ${R * 2} ${R * 2}` }, box);
    s("circle", { cx: R, cy: R, r: rr, fill: "none", stroke: "var(--line)", "stroke-width": th }, svgEl);
    const arc = s("circle", { cx: R, cy: R, r: rr, fill: "none", stroke: o.color || "var(--accent)", "stroke-width": th, "stroke-linecap": "round", transform: `rotate(-90 ${R} ${R})`, "stroke-dasharray": `0 ${C}` }, svgEl);
    const cen = h("div", null, null, box);
    cen.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center";
    const num = h("div", "vk-mono", "", cen);
    num.style.cssText = `font-size:${px(R * 0.38)}px;font-weight:800`;
    if (o.label) h("div", null, md(o.label), cen).style.cssText = `font-size:${px(Math.max(14, R * 0.14))}px;color:var(--muted);margin-top:${px(4)}px;max-width:${px(R * 1.4)}px;text-align:center;line-height:1.25`;
    const t0 = ctx.at(o), d = o.d || 1.3, e = getEase(o.ease || "outCubic");
    ctx.scene.on((local) => {
      const p = e(clamp01((local - t0) / d)) * pct2 / 100;
      arc.setAttribute("stroke-dasharray", `${(p * C).toFixed(2)} ${C.toFixed(2)}`);
    });
    ctx.scene.fx(num, "count", { t: t0, d, to: pct2, decimals: o.decimals, format: (x) => x.toFixed(o.decimals | 0) + "%" });
    ctx.advance(t0 + d);
    return box;
  }, "fade");
  B2.table = (spec, o = {}) => node(o, function table(ctx) {
    const px = ctx.px, tb = h("table", "vk-table"), t0 = ctx.at(o), each = o.each != null ? o.each : 0.18;
    tb.style.cssText = `border-collapse:collapse;width:${o.w ? len(ctx, o.w, "x") : "100%"};font-size:${px(o.size || 21)}px;text-align:left`;
    const al = (i) => spec.align && spec.align[i] || (i ? "right" : "left");
    if (spec.header) {
      const tr = h("tr", null, spec.header.map((c, i) => `<th style="text-align:${al(i)}">${md(c)}</th>`).join(""), tb);
      [...tr.children].forEach((th) => th.style.cssText += `;padding:${px(10)}px ${px(16)}px;border-bottom:${px(2)}px solid var(--fg);color:var(--muted);font-weight:700;font-size:.85em`);
      ctx.scene.fx(tr, "fade", { t: t0, d: 0.3 });
    }
    spec.rows.forEach((r, i) => {
      const tr = h("tr", null, r.map((c, j) => `<td style="text-align:${al(j)}">${md(String(c))}</td>`).join(""), tb);
      [...tr.children].forEach((td, j) => td.style.cssText += `;padding:${px(10)}px ${px(16)}px;border-bottom:1px solid var(--line);${j ? "font-family:var(--vk-mono)" : "font-weight:700"}`);
      if (spec.highlight === i) [...tr.children].forEach((td) => {
        td.style.background = "var(--accent)";
        td.style.color = "var(--on-accent)";
      });
      ctx.scene.fx(tr, "left", { t: t0 + 0.2 + i * each, d: 0.4, dist: px(24) });
    });
    if (o.source) {
      const cap = h("caption", null, md(o.source), tb);
      cap.style.cssText = `caption-side:bottom;text-align:right;font-size:${px(14)}px;color:var(--muted);padding-top:${px(8)}px`;
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
    const A = hex(o.from || v.color("bg", sc.mode)), B3 = hex(o.to || v.color("accent", sc.mode)), sc2 = o.scale || 3.2, sp = o.speed || 0.15;
    return { el: e, update(local) {
      const t = local * sp;
      for (let y = 0; y < h3; y++) for (let x = 0; x < w; x++) {
        let n = noise2(x / w * sc2 + t, y / h3 * sc2 - t * 0.7) * 0.65 + noise2(x / w * sc2 * 2.1 - t, y / h3 * sc2 * 2.1 + t) * 0.35;
        n = Math.pow(n, o.contrast || 1.6);
        const p = (y * w + x) * 4;
        im.data[p] = A[0] + (B3[0] - A[0]) * n;
        im.data[p + 1] = A[1] + (B3[1] - A[1]) * n;
        im.data[p + 2] = A[2] + (B3[2] - A[2]) * n;
        im.data[p + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    } };
  };

  // src/index.js
  var import_meta = {};
  var version = "0.1.0";
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
