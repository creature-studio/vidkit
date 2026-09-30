// Shared WebGL core for vk.gl: ONE offscreen WebGL context per video renders every GL layer, and each layer copies
// its pixels into its own 2D canvas (drawImage of the GL canvas, synchronous). So there is no per-layer context
// (Chrome drops contexts beyond ~16), nothing is presented by the compositor on its own schedule, and the pixels of a
// layer exist as soon as render(t) returns — the headless beginFrame capture never sees a blank or stale GL frame.
import { VERT, PRELUDE, BLUR, DOWN, COPY, NOISE } from './glsl.js';

const cores = new WeakMap();
export function getCore(video) {
  let c = cores.get(video);
  if (!c) { c = new GLCore(video); cores.set(video, c); }
  return c;
}
let warned = false;
export class GLCore {
  constructor(video) {
    this.video = video; this.W = video.W; this.H = video.H;
    this.dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
    const c = this.canvas = document.createElement('canvas');
    c.width = Math.round(this.W * this.dpr); c.height = Math.round(this.H * this.dpr);
    const attrs = { preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' };
    const gl = this.gl = c.getContext('webgl', attrs) || c.getContext('experimental-webgl', attrs);
    this.ok = !!gl;
    if (!gl) { if (!warned) console.warn('[vk] WebGL unavailable: vk.gl layers render nothing (vk render --gpu soft|swiftshader keeps WebGL on)'); warned = true; return; }
    this.progs = new Map(); this.ready = false;
    video.afterFonts.push(() => { this.ready = true; });         // static masks may use web fonts: cache only after they load
    const b = this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.disable(gl.DEPTH_TEST);
    this.maxPoint = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) || [1, 64])[1];
    this.stats = { frames: 0, passes: 0, uploads: 0, ms: 0 };
  }
  // make sure the drawing buffer can hold a pw×ph layer
  fit(pw, ph) { const c = this.canvas; if (c.width < pw || c.height < ph) { c.width = Math.max(c.width, pw); c.height = Math.max(c.height, ph); } }
  // compile (cached): frag gets the prelude (precision, vUv, hash/noise) unless it declares its own precision
  program(frag, vert = VERT) {
    const key = vert + '\n@@\n' + frag; let p = this.progs.get(key); if (p) return p;
    const gl = this.gl;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('[vk.gl] shader: ' + gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, (/precision\s/.test(frag) ? '' : PRELUDE) + frag));
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('[vk.gl] link: ' + gl.getProgramInfoLog(pr));
    p = { pr, loc: {}, attr: {} }; this.progs.set(key, p); return p;
  }
  uloc(p, n) { return n in p.loc ? p.loc[n] : (p.loc[n] = this.gl.getUniformLocation(p.pr, n)); }
  // set uniforms: number → 1f · [a,b(,c,d)] → nf · {tex} → sampler (auto texture units)
  uniforms(p, u) {
    const gl = this.gl; let unit = 0;
    for (const k in u) {
      const v = u[k], l = this.uloc(p, k); if (l == null) continue;
      if (v && v.tex !== undefined) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(l, unit++); }
      else if (Array.isArray(v)) gl['uniform' + v.length + 'fv'](l, v);
      else if (typeof v === 'boolean') gl.uniform1f(l, v ? 1 : 0);
      else gl.uniform1f(l, +v || 0);
    }
  }
  texture(w, h, filter) {
    const gl = this.gl, tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return { tex, w, h };
  }
  // render target (texture + framebuffer)
  target(w, h) {
    const gl = this.gl, t = this.texture(w, h); t.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); return t;
  }
  upload(t, source) {   // canvas / image → texture (premultiplied, flipped so uv (0,0) = bottom-left)
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); t.w = source.width; t.h = source.height; this.stats.uploads++;
  }
  // draw a full-screen quad with `frag` into target (null = the layer region of the drawing buffer)
  pass(frag, u, target, o = {}) {
    const gl = this.gl, p = typeof frag === 'string' ? this.program(frag) : frag;
    gl.useProgram(p.pr);
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.vw, this.vh); }
    if (o.clear || target) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    this.blend(target ? 'none' : (o.blend || 'normal'));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const loc = p.attr.p != null ? p.attr.p : (p.attr.p = gl.getAttribLocation(p.pr, 'p'));
    for (let i = 1; i < 4; i++) gl.disableVertexAttribArray(i);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.uniforms(p, u);
    gl.drawArrays(gl.TRIANGLES, 0, 6); this.stats.passes++;
  }
  blend(mode) {
    const gl = this.gl;
    if (mode === 'none') { gl.disable(gl.BLEND); return; }
    gl.enable(gl.BLEND);
    if (mode === 'add') gl.blendFunc(gl.ONE, gl.ONE);
    else if (mode === 'multiply') gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);                 // premultiplied "over"
  }
  // Gaussian pyramid of `src` (a texture of w×h): levels[i] (i ≥ 1) = downsampled 2^i and blurred (σ = 1 texel).
  // `levels` holds the targets between calls (allocated once per effect).
  pyramid(src, n, levels = []) {
    let prev = src, w = src.w, h = src.h;
    for (let i = 1; i <= n; i++) {
      w = Math.max(1, Math.ceil(w / 2)); h = Math.max(1, Math.ceil(h / 2));
      if (!levels[i]) levels[i] = { a: this.target(w, h), b: this.target(w, h) };
      const L = levels[i];
      this.pass(DOWN, { uTex: prev, uTexel: [1 / prev.w, 1 / prev.h] }, L.a);
      this.pass(BLUR, { uTex: L.a, uDir: [1 / w, 0] }, L.b);
      this.pass(BLUR, { uTex: L.b, uDir: [0, 1 / h] }, L.a);
      prev = L.a;
    }
    return levels;
  }
  // the scene-space paper noise texture (see glsl.js NOISE), generated once
  noise(seed = 0) {
    const k = 'n' + seed; if (this[k]) return this[k];
    const t = this[k] = this.target(Math.round(this.W), Math.round(this.H));
    this.pass(NOISE, { uSize: [t.w, t.h], uSeed: seed }, t);
    return t;
  }
  // begin a layer: bind the drawing buffer region pw×ph and clear it
  begin(pw, ph) {
    const gl = this.gl; this.fit(pw, ph); this.vw = pw; this.vh = ph;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, pw, ph);
    gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  }
  bindOutput() { const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.vw, this.vh); }
  // copy the layer region (bottom-left pw×ph of the GL buffer) into a 2D context
  blit(ctx, pw, ph) { ctx.drawImage(this.canvas, 0, this.canvas.height - ph, pw, ph, 0, 0, pw, ph); }
}
export { COPY };
