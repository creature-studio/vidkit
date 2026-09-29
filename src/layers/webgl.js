// WebGL layer — Phase 1 ships the interface plus a minimal full-screen fragment-shader runner so Phase 3
// (shader post, GPU brush strokes, particles) can plug in without touching the core.
//   scene.webgl({ frag: `…glsl…`, uniforms: (local, info) => ({uAmp: 1}) })
//   scene.webgl({ init(gl, layer){…}, render(gl, local, info, layer){…} })   // bring your own pipeline
// Uniforms always provided to `frag`: uTime (scene-local s), uRes (px), uBeat (pulse 0..1), uProgress (0..1).
// If WebGL is unavailable the layer logs once and renders nothing (DOM/Canvas layers are unaffected).
const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
export class WebGLLayer {
  constructor(video, _draw, o = {}) {
    this.video = video; this.o = o;
    const c = this.el = document.createElement('canvas'); c.className = 'vk-canvas';
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)) * (o.resolution || 1);
    c.width = Math.round(video.W * dpr); c.height = Math.round(video.H * dpr);
    if (o.blend) c.style.mixBlendMode = o.blend;
    const gl = this.gl = c.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) { console.warn('[vk] WebGL unavailable; webgl layer disabled'); return; }
    if (o.init) { o.init(gl, this); return; }
    if (o.frag) this.program = this.compile(o.frag);
  }
  compile(frag) {
    const gl = this.gl, sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('[vk] shader: ' + gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, (frag.includes('precision') ? '' : 'precision highp float;\n') + 'uniform float uTime,uBeat,uProgress;uniform vec2 uRes;\n' + frag));
    gl.linkProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return pr;
  }
  render(local, info) {
    const gl = this.gl; if (!gl) return;
    gl.viewport(0, 0, this.el.width, this.el.height);
    if (this.o.render) { this.o.render(gl, local, info, this); return; }
    if (!this.program) return;
    gl.useProgram(this.program);
    const u = (n) => gl.getUniformLocation(this.program, n);
    gl.uniform1f(u('uTime'), local); gl.uniform2f(u('uRes'), this.el.width, this.el.height);
    gl.uniform1f(u('uBeat'), info.beats ? info.beats.pulse(info.t) : 0); gl.uniform1f(u('uProgress'), info.p || 0);
    const extra = this.o.uniforms ? this.o.uniforms(local, info) : {};
    for (const k in extra) { const v = extra[k], l = u(k); if (Array.isArray(v)) gl['uniform' + v.length + 'f'](l, ...v); else gl.uniform1f(l, v); }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
