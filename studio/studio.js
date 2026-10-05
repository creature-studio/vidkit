// vk studio — client. Plain ES module, no framework. The preview iframe loads the page with ?render=1 (no in-page
// player chrome, stage at native size) and every frame shown is window.__seek(t) — the same deterministic call
// `vk render` makes per output frame. State lives on the server (cli/studio.mjs) so agents can drive the same session.
import { collectInfo } from './collect.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const CID = 'ui-' + Math.random().toString(36).slice(2, 8);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const get = p => fetch(p).then(r => r.json());
const post = (p, b = {}) => fetch(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ origin: CID, ...b }) }).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; });
const fmt = (s, dp = 2) => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(dp); };
const base = p => String(p || '').split('/').pop();

const st = {
  comps: [], file: null, comp: null, info: null, t: 0, playing: false, rate: 1, dir: 1, loop: true, inP: null, outP: null,
  draft: false, strict: true, fps: null, format: null, sel: null, muted: false, zoom: 'fit', tlZoom: 0, jobs: [], lint: null, peek: null,
  tab: 'props', safe: false, outDir: '', root: '',
};

/* ================= preview engine ================= */
const iframe = $('#preview'), viewer = $('#viewer'), wrap = $('#stage-wrap');
let win = null, loadSeq = 0, want = null, busy = false, pendingAck = null, lastReport = 0;
const perf = { n: 0, ms: 0, t0: performance.now(), fps: 0, avg: 0 };
function pageSrc(file) {
  const q = new URLSearchParams({ render: '1' });
  if (st.strict) q.set('strict', '1'); if (st.draft) q.set('draft', '1'); if (st.fps) q.set('fps', st.fps); if (st.format) q.set('format', st.format);
  return file.split('/').map(encodeURIComponent).join('/') + '?' + q;
}
function overlay(on, text) { $('#v-loading').classList.toggle('hide', !on); if (text) $('#v-loading-text').innerHTML = text; }
function showError(msg) { const e = $('#v-error'); if (!msg) { e.hidden = true; return; } e.hidden = false; e.innerHTML = `<b>Page error · 页面错误</b><button class="x" style="float:right;color:#fff" onclick="this.parentNode.hidden=true">×</button>\n${esc(msg)}`; }
async function loadPreview({ keepT = true } = {}) {
  const seq = ++loadSeq; setPlaying(false, true); showError(null);
  overlay(true, `Loading <b>${esc(st.comp ? st.comp.rel : base(st.file))}</b>… 载入中`);
  win = null; st.info = null; $('#scene-list').innerHTML = ''; tl.tracks.innerHTML = ''; tl.labels.innerHTML = '';
  const t0 = performance.now();
  iframe.src = pageSrc(st.file);
  await new Promise(r => { iframe.onload = r; });
  if (seq !== loadSeq) return;
  const w = iframe.contentWindow;
  // style-pack pages finish building after load (module boot): poll for the vk.video() globals
  for (;;) {
    if (seq !== loadSeq) return;
    if (w.__size && w.__ready) break;
    const errs = w.__vkErrors || [];
    if (errs.length && performance.now() - t0 > 1500) { overlay(false); showError(errs.join('\n')); return; }
    if (performance.now() - t0 > 120000) { overlay(false); showError('timed out: vk.video() never finalised (is this a vidkit page?)'); return; }
    if (performance.now() - t0 > 4000) overlay(true, `Building <b>${esc(st.comp ? st.comp.rel : '')}</b>… ${((performance.now() - t0) / 1000).toFixed(0)} s<br><small style="color:var(--fg3)">fonts · bakes · 3D warm-up</small>`);
    await new Promise(r => setTimeout(r, 60));
  }
  try { await w.__ready; } catch (e) { overlay(false); showError(String(e && e.stack || e)); return; }
  if (seq !== loadSeq) return;
  win = w; st.info = collectInfo(w);
  const { width: W, height: H } = st.info.size;
  iframe.width = W; iframe.height = H; iframe.style.width = W + 'px'; iframe.style.height = H + 'px';
  wrap.style.width = W + 'px'; wrap.style.height = H + 'px';
  if (!keepT) st.t = 0;
  st.t = Math.min(st.t, st.info.duration - 1e-3);
  fitStage(); buildSafe(); renderScenes(); buildTimeline(); renderProps(); renderTitle(); setupAudio();
  overlay(false);
  if (st.info.errors.length) showError(st.info.errors.join('\n'));
  requestRender(st.t); updateTimeUI();
  post('/api/client-info', { file: st.file, info: st.info }).catch(() => { });
  console.log(`[studio] loaded ${st.file} in ${Math.round(performance.now() - t0)} ms`);
}
function requestRender(t) { want = t; if (!busy) pump(); }
async function pump() {
  if (!win || !win.__seek) return;
  busy = true;
  while (want != null) {
    const t = want; want = null; const a = performance.now();
    try { await win.__seek(t); } catch (e) { showError(String(e && e.message || e)); setPlaying(false); }
    const ms = performance.now() - a; perf.n++; perf.ms += ms;
    if (pendingAck && Math.abs(pendingAck.t - t) < 1e-6) { post('/api/ack', { id: pendingAck.id }).catch(() => { }); pendingAck = null; }
  }
  busy = false;
}
setInterval(() => {   // preview throughput readout
  const now = performance.now(), dt = (now - perf.t0) / 1000;
  perf.fps = perf.n / dt; perf.avg = perf.n ? perf.ms / perf.n : perf.avg; perf.n = 0; perf.ms = 0; perf.t0 = now;
  $('#vb-fps').textContent = st.info ? `render(t) ${perf.avg.toFixed(1)} ms${st.playing ? ` · ${perf.fps.toFixed(0)} fps` : ''}` : '';
}, 1000);

function fitStage() {
  if (!st.info) return;
  const { width: W, height: H } = st.info.size, vw = viewer.clientWidth, vh = viewer.clientHeight, pad = 28;
  const s = st.zoom === 'fit' ? Math.max(.05, Math.min((vw - pad * 2) / W, (vh - pad * 2) / H)) : +st.zoom;
  let sizer = $('#v-sizer'); if (!sizer) { sizer = document.createElement('div'); sizer.id = 'v-sizer'; sizer.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none'; viewer.appendChild(sizer); }
  const x = Math.max(pad, (vw - W * s) / 2), y = Math.max(pad, (vh - H * s) / 2);
  wrap.style.transform = `translate(${x}px,${y}px) scale(${s})`;
  sizer.style.width = (W * s + x + pad) + 'px'; sizer.style.height = (H * s + y + pad) + 'px';
  st.scale = s;
}
new ResizeObserver(() => { fitStage(); layoutTimeline(); }).observe(viewer);
function buildSafe() {
  const i = st.info, o = $('#safe-ov'); if (!i || !i.safe) { o.innerHTML = ''; return; }
  const s = i.safe;
  o.innerHTML = `<div class="safe" style="left:${s.left}px;top:${s.top}px;right:${s.right}px;bottom:${s.bottom}px"></div>` + (i.zones || []).map(z => `<div class="zone" style="left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px">${esc(z.name)}</div>`).join('');
  o.hidden = !st.safe;
}

/* ================= playback ================= */
let last = 0;
function setT(t, { render = true, report = true } = {}) {
  if (!st.info) { st.t = t; return; }
  st.t = Math.max(0, Math.min(t, st.info.duration - 1e-3));
  if (render) requestRender(st.t);
  updateTimeUI();
  if (report && performance.now() - lastReport > 250) { lastReport = performance.now(); post('/api/ack', { t: st.t, playing: st.playing, origin: 'ui' }).catch(() => { }); }
}
function setPlaying(p, silent) {
  if (p && !st.info) return;
  if (p) { const a = st.inP ?? 0, b = st.outP ?? st.info.duration; if (st.dir > 0 && st.t >= b - .02) st.t = a; if (st.dir < 0 && st.t <= a + .02) st.t = b - 1e-3; }
  st.playing = p; last = 0;
  $('#tr-play').textContent = p ? '❚❚' : '▶';
  audioSync(true);
  if (!silent) post('/api/ack', { t: st.t, playing: p, origin: 'ui' }).catch(() => { });
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, .25) : 0; last = now;   // drop frames, keep ~real time
  if (st.playing && st.info) {
    const a = st.inP ?? 0, b = st.outP ?? st.info.duration;
    let t = st.t + dt * st.rate * st.dir;
    if (st.dir > 0 && t >= b) { if (st.loop) { t = a; audioSync(true); } else { t = b - 1e-3; setPlaying(false); } }
    if (st.dir < 0 && t <= a) { if (st.loop) t = b - 1e-3; else { t = a; setPlaying(false); } }
    setT(t);
    followPlayhead();
  }
  audioSync(false);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
const frameDur = () => 1 / ((st.info && st.info.fps) || 30);
const stepFrame = n => { setPlaying(false); const f = Math.round(st.t / frameDur()) + n; setT(f * frameDur() + 1e-6); followPlayhead(true); };
const curScene = () => st.info ? st.info.scenes.filter(s => st.t >= s.start - 1e-6).pop() : null;
function jumpScene(d) {
  if (!st.info) return; const S = st.info.scenes, c = curScene(); let i = c ? c.index : 0;
  if (d < 0 && c && st.t - c.start > .25) i = c.index; else i = Math.max(0, Math.min(S.length - 1, i + d));
  selectScene(i, true);
}
function selectScene(i, seek) {
  st.sel = i; post('/api/settings', { selectedScene: i }).catch(() => { });
  if (seek && st.info) { const s = st.info.scenes[i]; setPlaying(false); setT(s.start + (s.transition && s.transition.d ? s.transition.d : 0) + .001); followPlayhead(true); }
  renderScenes(); markSelected(); renderProps();
}

/* ================= audio (music + voice-over + SCORE), preview only — the render mixes sample-accurately ================= */
const music = $('#music'); let actx = null, master = null, scoreBuf = null, scoreSrc = null, voiceEls = [], scoreFor = null;
function setupAudio() {
  stopScore(); voiceEls.forEach(v => v.a.pause()); voiceEls = []; scoreBuf = null; scoreFor = null;
  const i = st.info; music.pause();
  if (i.music && i.music.src) { music.src = i.music.src; music.volume = Math.min(1, i.music.gain || 1); } else music.removeAttribute('src');
  voiceEls = (i.voice || []).filter(v => v.src).map(v => { const a = new Audio(v.src); a.preload = 'auto'; return { ...v, a }; });
}
function stopScore() { if (scoreSrc) { try { scoreSrc.stop(); } catch (e) { } scoreSrc = null; } }
async function startScore() {
  if (!win || typeof win.SCORE !== 'function' || (st.info.music && st.info.music.src)) return;
  try { actx = actx || new AudioContext(); master = master || (() => { const g = actx.createGain(); g.connect(actx.destination); return g; })(); } catch (e) { return; }
  master.gain.value = st.muted ? 0 : 1;
  if (!scoreBuf || scoreFor !== st.file) {
    const D = st.info.duration, oac = new win.OfflineAudioContext(2, Math.ceil(48000 * D), 48000);
    win.SCORE(oac); const b = await oac.startRendering();
    scoreBuf = actx.createBuffer(2, b.length, b.sampleRate); for (let c = 0; c < 2; c++) scoreBuf.copyToChannel(b.getChannelData(Math.min(c, b.numberOfChannels - 1)), c); scoreFor = st.file;
  }
  if (!st.playing) return;
  stopScore(); scoreSrc = actx.createBufferSource(); scoreSrc.buffer = scoreBuf; scoreSrc.playbackRate.value = st.rate; scoreSrc.connect(master); scoreSrc.start(0, Math.min(st.t, st.info.duration - .01));
}
function audioSync(hard) {
  if (!st.info) return;
  const fwd = st.playing && st.dir > 0;
  if (hard) {
    stopScore();
    if (music.src) { if (fwd) { music.currentTime = st.t + ((st.info.music || {}).start || 0); music.playbackRate = st.rate; music.muted = st.muted; music.play().catch(() => { }); } else music.pause(); }
    if (fwd) startScore().catch(() => { });
    voiceEls.forEach(v => v.a.pause());
  }
  let speaking = false;
  for (const v of voiceEls) {
    const lt = st.t - v.t, on = fwd && lt >= 0 && lt < v.dur; speaking = speaking || on;
    if (on && v.a.paused) { v.a.currentTime = lt; v.a.volume = Math.min(1, v.gain || 1); v.a.muted = st.muted; v.a.playbackRate = st.rate; v.a.play().catch(() => { }); } else if (!on && !v.a.paused) v.a.pause();
  }
  if (music.src) music.volume = Math.min(1, ((st.info.music || {}).gain || 1) * (speaking ? .35 : 1));
}

/* ================= timeline ================= */
const tl = { scroll: $('#tl-scroll'), content: $('#tl-content'), ruler: $('#tl-ruler'), tracks: $('#tl-tracks'), labels: $('#tl-labels'), ph: $('#tl-playhead'), pxps: 50, rows: [] };
function tlBasePx() { return st.info ? Math.max(4, (tl.scroll.clientWidth - 30) / st.info.duration) : 50; }
function buildTimeline() {
  const i = st.info; if (!i) return;
  const rows = [{ id: 'scenes', label: 'Scenes 场景', color: '#7c5cff', h: 42 }];
  if (i.beats) rows.push({ id: 'beats', label: `♩ ${+i.beats.bpm.toFixed(1)} BPM`, color: '#36d6ff', h: 28 });
  if (i.captions.length) rows.push({ id: 'caps', label: 'Captions 字幕', color: '#8a93a6', h: 30 });
  if (i.voice.length) rows.push({ id: 'vo', label: 'Voice 旁白', color: '#e0a83a', h: 30 });
  if (i.cues.length) rows.push({ id: 'cues', label: 'SFX 音效', color: '#ffb547', h: 28 });
  tl.rows = rows;
  tl.labels.innerHTML = rows.map(r => `<div class="tl-label" style="--h:${r.h}px"><i style="background:${r.color}"></i>${esc(r.label)}</div>`).join('');
  tl.tracks.innerHTML = rows.map(r => `<div class="track" data-row="${r.id}" style="--h:${r.h}px"></div>`).join('');
  const T = id => tl.tracks.querySelector(`[data-row="${id}"]`);
  T('scenes').innerHTML = i.scenes.map(s => `<div class="blk scene${st.sel === s.index ? ' sel' : ''}" data-i="${s.index}" data-a="${s.start}" data-d="${s.dur}" title="${esc(s.name)} · ${s.start.toFixed(2)}–${s.end.toFixed(2)} s${s.transition && s.transition.type ? ' · in: ' + esc(s.transition.type) + ' ' + s.transition.d + 's' : ''}">${s.transition && s.transition.d ? `<span class="x" data-x="${s.transition.d}"></span>` : ''}<b>${s.index + 1}. ${esc(s.name)}</b><small>${s.dur.toFixed(1)}s</small></div>`).join('');
  if (i.beats) { const down = new Set(i.beats.bars.map(b => b.toFixed(3))); T('beats').innerHTML = i.beats.beats.map(b => `<i class="beat${down.has(b.toFixed(3)) ? ' down' : ''}" data-a="${b}"></i>`).join(''); }
  if (i.captions.length) T('caps').innerHTML = i.captions.map(c => `<div class="blk cap" data-a="${c[0]}" data-d="${c[1] - c[0]}" title="${esc(c[2])}">${esc(c[2])}</div>`).join('');
  if (i.voice.length) T('vo').innerHTML = i.voice.map(v => `<div class="blk vo" data-a="${v.t}" data-d="${v.dur}" title="${esc((v.who ? v.who + ': ' : '') + (v.text || ''))}">🎙 ${esc(v.text || base(v.src))}</div>`).join('');
  if (i.cues.length) T('cues').innerHTML = i.cues.map(c => `<i class="cue" data-a="${c}" title="${(+c).toFixed(2)} s"></i>`).join('');
  $('#tl-info').textContent = `${i.scenes.length} scenes · ${fmt(i.duration)} · ${i.frames} frames @ ${i.fps} fps${i.beats ? ` · ${i.beats.bars.length} bars` : ''}`;
  layoutTimeline();
}
function layoutTimeline() {
  const i = st.info; if (!i) return;
  tl.pxps = tlBasePx() * Math.pow(2, st.tlZoom / 100 * 7);
  const px = tl.pxps, W = i.duration * px;
  tl.content.style.width = (W + 30) + 'px';
  for (const el of tl.tracks.querySelectorAll('[data-a]')) {
    el.style.left = (+el.dataset.a * px) + 'px';
    if (el.dataset.d != null) el.style.width = Math.max(2, +el.dataset.d * px - 1) + 'px';
  }
  for (const x of tl.tracks.querySelectorAll('.x')) x.style.width = (+x.dataset.x * px) + 'px', x.style.left = 0;
  const beatsTrack = tl.tracks.querySelector('[data-row="beats"]');
  if (beatsTrack) { const bpx = (60 / i.beats.bpm) * px; beatsTrack.classList.toggle('sparse', bpx < 4); for (const b of beatsTrack.querySelectorAll('.beat:not(.down)')) b.style.display = bpx < 4 ? 'none' : ''; }
  // ruler: a step that keeps labels ≥ 70 px apart
  const steps = [1 / 30, .1, .2, .5, 1, 2, 5, 10, 15, 30, 60, 120], step = steps.find(s => s * px >= 84) || 300, minor = step / 5;
  const dp = step < .1 ? 2 : step < 1 ? 1 : 0;
  let h = '';
  for (let k = 0, t = 0; t <= i.duration + 1e-6; t = ++k * step) h += `<div class="tick major" style="left:${t * px}px"><span>${fmt(t + 1e-9, dp)}</span></div>`;
  if (minor * px >= 8) for (let t = minor, k = 1; t <= i.duration; t = minor * ++k) if (k % 5) h += `<div class="tick minor" style="left:${t * px}px"></div>`;
  if (i.beats) for (const b of i.beats.bars) h += `<div class="bar-tick" style="left:${b * px}px"></div>`;
  tl.ruler.innerHTML = h;
  updateRange(); updateTimeUI();
}
function updateRange() {
  const i = st.info; if (!i) return; const px = tl.pxps, L = $('#tl-range-l'), R = $('#tl-range-r');
  L.style.display = st.inP != null ? 'block' : 'none'; R.style.display = st.outP != null ? 'block' : 'none';
  if (st.inP != null) { L.style.left = 0; L.style.width = st.inP * px + 'px'; }
  if (st.outP != null) { R.style.left = st.outP * px + 'px'; R.style.width = (i.duration - st.outP) * px + 'px'; }
  $('#range-lbl').textContent = st.inP != null || st.outP != null ? `${fmt(st.inP ?? 0)} → ${fmt(st.outP ?? i.duration)}` : '';
  $('#tr-in').classList.toggle('on', st.inP != null); $('#tr-out').classList.toggle('on', st.outP != null);
}
function followPlayhead(center) {
  const x = st.t * tl.pxps, s = tl.scroll, w = s.clientWidth;
  if (x < s.scrollLeft + 20 || x > s.scrollLeft + w - 40) s.scrollLeft = center ? x - w / 2 : x - 40;
}
function setTlZoom(z, anchorT) {
  const s = tl.scroll, at = anchorT ?? st.t, before = at * tl.pxps - s.scrollLeft;
  st.tlZoom = Math.max(0, Math.min(100, z)); $('#tl-zoom').value = st.tlZoom; layoutTimeline();
  s.scrollLeft = at * tl.pxps - before;
}
let scrubbing = false;
function tlTime(e) { const r = tl.content.getBoundingClientRect(); return (e.clientX - r.left) / tl.pxps; }
tl.content.addEventListener('pointerdown', e => {
  if (!st.info || e.button !== 0) return;
  const blk = e.target.closest('.blk.scene'); if (blk) { st.sel = +blk.dataset.i; markSelected(); renderScenes(); renderProps(); post('/api/settings', { selectedScene: st.sel }).catch(() => { }); }
  scrubbing = true; tl.content.setPointerCapture(e.pointerId); setPlaying(false); setT(tlTime(e));
});
tl.content.addEventListener('pointermove', e => { if (scrubbing) setT(tlTime(e)); });
tl.content.addEventListener('pointerup', () => { scrubbing = false; });
tl.scroll.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); setTlZoom(st.tlZoom - e.deltaY * .08, tlTime(e)); }, { passive: false });
function markSelected() { for (const b of tl.tracks.querySelectorAll('.blk.scene')) b.classList.toggle('sel', +b.dataset.i === st.sel); }
// resizable timeline height
(() => { const el = $('#timeline'); let y0 = null, h0 = 0;
  el.addEventListener('pointerdown', e => { const r = el.getBoundingClientRect(); if (e.clientY - r.top > 4) return; y0 = e.clientY; h0 = r.height; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (y0 == null) return; const h = Math.max(120, Math.min(window.innerHeight * .6, h0 - (e.clientY - y0))); document.documentElement.style.setProperty('--tl', h + 'px'); });
  el.addEventListener('pointerup', () => { y0 = null; });
})();

/* ================= UI updates ================= */
function updateTimeUI() {
  const i = st.info; if (!i) return;
  $('#tc-time').textContent = fmt(st.t); $('#tc-dur').textContent = fmt(i.duration);
  $('#tc-frame').textContent = `f ${Math.round(st.t * i.fps)} / ${i.frames}`;
  tl.ph.style.left = (st.t * tl.pxps) + 'px';
  const c = curScene(), idx = c ? c.index : -1;
  for (const el of $$('#scene-list .scn')) {
    const k = +el.dataset.i, on = k === idx; el.classList.toggle('cur', on);
    const s = i.scenes[k], bar = el.querySelector('.bar i'); if (!s) continue; if (bar) bar.style.width = on ? Math.min(100, (st.t - s.start) / s.dur * 100) + '%' : (st.t >= s.end ? '100%' : '0');
  }
}
function renderTitle() {
  const c = st.comp, i = st.info;
  $('#cur-name').textContent = c ? c.rel : base(st.file);
  $('#vb-title').innerHTML = i ? `<b style="color:#fff">${esc(i.title || (c && c.name))}</b> &nbsp;·&nbsp; ${i.size.width}×${i.size.height} · ${i.fps} fps · ${i.duration.toFixed(2)} s${st.draft ? ' · <span class="pill warn">DRAFT</span>' : ''}${st.fps || st.format ? ' · <span class="pill ac">override</span>' : ''}` : '';
  document.title = `${c ? c.name : 'vidkit'} · vidkit Studio`;
}
function renderComps() {
  const q = $('#comp-filter').value.trim().toLowerCase(), list = st.comps.filter(c => !q || (c.rel + ' ' + c.title).toLowerCase().includes(q));
  const groups = {}; for (const c of list) (groups[c.dir || '.'] = groups[c.dir || '.'] || []).push(c);
  $('#comp-list').innerHTML = Object.entries(groups).map(([g, cs]) => `${g !== '.' ? `<div class="comp-group">${esc(g)}</div>` : ''}` + cs.map(c => `<button class="comp${c.file === st.file ? ' on' : ''}" data-f="${esc(c.file)}" title="${esc(c.title || c.rel)}"><span class="ci${c.three ? ' three' : ''}"></span><span class="cn">${esc(c.name)}</span>${c.style ? `<span class="tag">${esc(c.style.split(/[.,]/)[0])}</span>` : c.three ? '<span class="tag">3D</span>' : ''}</button>`).join('')).join('') || '<div class="empty">No match</div>';
  $('#comp-count').textContent = st.comps.length;
}
function renderScenes() {
  const i = st.info; if (!i) { $('#scene-list').innerHTML = ''; return; }
  $('#scene-count').textContent = i.scenes.length;
  $('#scene-list').innerHTML = i.scenes.map(s => `<button class="scn${st.sel === s.index ? ' sel' : ''}" data-i="${s.index}"><span class="si">${String(s.index + 1).padStart(2, '0')}</span><span class="sn">${esc(s.name)}</span><span class="st">${fmt(s.start, 1)}</span><span class="bar"><i></i></span></button>`).join('');
  updateTimeUI();
}

/* ---------- inspector: props ---------- */
const FORMATS = ['', '16:9', '9:16', '1:1', '4:5'], FPSES = ['', 24, 25, 30, 50, 60];
async function renderProps() {
  const i = st.info, c = st.comp, el = $('#tab-props');
  if (!i) { el.innerHTML = '<div class="empty">Loading…</div>'; return; }
  const mb = i.motionBlur, sc = st.sel != null ? i.scenes[st.sel] : null;
  const opt = (vals, cur, lbl) => vals.map(v => `<option value="${v}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${v === '' ? lbl : v}</option>`).join('');
  el.innerHTML = `
  <div class="sec"><div class="sec-h">Composition <span class="zh">作品</span><span class="r">${c && c.three ? '<span class="pill ac">vk.three</span>' : ''}</span></div>
    <div class="kv">
      <span>Title</span><span title="${esc(i.title)}">${esc(i.title || '—')}</span>
      <span>File</span><span title="${esc(st.file)}">${esc(c ? c.rel : st.file)}</span>
      <span>Duration</span><span>${i.duration.toFixed(3)} s · ${i.frames} f</span>
      <span>FPS</span><span>${i.fps}</span>
      <span>Size</span><span>${i.size.width} × ${i.size.height}${i.format ? ` · ${esc(i.format)}` : ''}</span>
      <span>Style</span><span>${esc(c && c.style || '—')}</span>
      <span>Theme</span><span>${esc(i.theme || '—')}</span>
      <span>Motion blur</span><span>${mb ? `<span class="pill ac">on</span> 1/${Math.round(1 / mb.shutter)} s × ${mb.samples}` : '<span class="pill">off</span>'}</span>
      <span>Beat grid</span><span>${i.beats ? `${i.beats.bpm} BPM · ${i.beats.meter}/4 · ${i.beats.beats.length} beats` : '—'}</span>
      <span>Audio</span><span>${[i.music ? '♫ ' + esc(base(i.music.src)) : '', i.voice.length ? `🎙 ${i.voice.length} vo` : '', i.voMissing ? `<span class="pill warn">${i.voMissing} vo missing</span>` : '', i.hasScore ? 'SFX score' : ''].filter(Boolean).join(' · ') || '—'}</span>
      <span>Mode</span><span>${i.strict ? '<span class="pill ok">strict</span>' : '<span class="pill">lenient</span>'} ${i.draft ? '<span class="pill warn">draft</span>' : ''}</span>
    </div></div>
  <div class="sec"><div class="sec-h">Overrides <span class="zh">覆盖</span><span class="r hint" style="margin:0">preview + render</span></div>
    <div class="kv">
      <span>FPS</span><select id="ov-fps">${opt(FPSES, st.fps, `page (${st.fps ? '—' : i.fps})`)}</select>
      <span>Format</span><select id="ov-format">${opt(FORMATS, st.format, `page (${esc(i.format || i.size.width + '×' + i.size.height)})`)}</select>
      <span>Draft</span><label class="toggle"><input type="checkbox" id="ov-draft"${st.draft ? ' checked' : ''}><span class="sw"></span>${st.draft ? 'cheap preview path' : 'full quality'}</label>
    </div>
    <div class="hint">Non-destructive: passed as URL params (<code>?fps= ?format= ?draft=1</code>) exactly like <code>vk render --fps --format --draft</code>. The page file is not touched.</div></div>
  <div class="sec" id="scene-sec"><div class="sec-h">Scene <span class="zh">场景</span><span class="r">${sc ? `<span class="pill ac">#${sc.index + 1}</span>` : ''}</span></div>
    ${sc ? `<div class="kv">
      <span>Name</span><span>${esc(sc.name)}</span>
      <span>Start → End</span><span>${sc.start.toFixed(3)} → ${sc.end.toFixed(3)} s</span>
      <span>Duration</span><span>${sc.dur.toFixed(3)} s · ${Math.round(sc.dur * i.fps)} f</span>
      <span>Transition in</span><span>${sc.transition && sc.transition.type ? `${esc(sc.transition.type)} ${sc.transition.d}s` : '—'}</span>
      <span>Settled at</span><span>${sc.settle != null ? '+' + (+sc.settle).toFixed(2) + ' s' : '—'}</span>
      <span>Voice-over</span><span title="${esc(sc.vo ? JSON.stringify(sc.vo) : '')}">${sc.vo ? `${sc.vo.missing ? '<span class="pill warn">missing</span> ' : ''}${(+sc.vo.dur || 0).toFixed(2)} s` : '—'}</span>
    </div><div id="scene-json" class="row" style="display:block"></div>` : '<div class="empty" style="padding:4px 0">Click a scene in the list or timeline · 选择场景</div>'}
  </div>`;
  $('#ov-fps').onchange = e => applySettings({ fps: e.target.value ? +e.target.value : null });
  $('#ov-format').onchange = e => applySettings({ format: e.target.value || null });
  $('#ov-draft').onchange = e => applySettings({ draft: e.target.checked });
  if (sc) renderSceneJSON(sc);
}
async function renderSceneJSON(sc) {
  const box = $('#scene-json'); if (!box) return;
  const runtime = JSON.stringify({ index: sc.index, name: sc.name, start: +sc.start.toFixed(4), dur: +sc.dur.toFixed(4), transition: sc.transition, settle: sc.settle, vo: sc.vo }, null, 2);
  let src = null;
  if (st.comp && st.comp.story) src = await get(`/api/scene-source?file=${encodeURIComponent(st.file)}&index=${sc.index}`).catch(() => null);
  if (!document.body.contains(box)) return;
  if (src && src.editable) {
    box.innerHTML = `<div class="sec-h" style="margin-top:6px">STORY.scenes[${src.index}] <span class="pill ok" style="margin-left:6px">editable</span></div>
      <textarea class="json" id="sj" spellcheck="false" style="min-height:220px">${esc(JSON.stringify(src.scene, null, 2))}</textarea>
      <div class="row"><button class="btn primary" id="sj-save">Save 保存</button><button class="btn" id="sj-revert">Revert</button><span class="hint" id="sj-msg" style="margin:0"></span></div>
      <div class="hint">Writes the inlined <code>STORY</code> JSON of this <code>vk make</code> page (backup in <code>out/studio/backup/</code>); preview live-reloads.</div>`;
    const ta = $('#sj'), msg = $('#sj-msg');
    ta.oninput = () => { try { JSON.parse(ta.value); ta.classList.remove('bad'); msg.textContent = ''; } catch (e) { ta.classList.add('bad'); msg.textContent = e.message; } };
    $('#sj-revert').onclick = () => renderSceneJSON(sc);
    $('#sj-save').onclick = async () => { try { JSON.parse(ta.value); const r = await post('/api/scene-source', { file: st.file, index: src.index, scene: ta.value }); toast(`Saved scene ${src.index + 1} · backup ${base(r.backup)}`, 'ok'); } catch (e) { toast('Save failed: ' + e.message, 'err'); } };
  } else {
    box.innerHTML = `<div class="sec-h" style="margin-top:6px">Runtime JSON <span class="pill" style="margin-left:6px">read-only</span></div><textarea class="json" readonly spellcheck="false">${esc(runtime)}</textarea>
      <div class="hint">${esc(src && src.reason || 'This scene is JavaScript (vk.scene(…)). Edit the .html in your editor — Studio live-reloads on save and keeps the playhead.')}</div>`;
  }
}

/* ---------- inspector: render + jobs ---------- */
const ro = { range: 'auto', quality: 'auto', scale: '', mb: 'page', out: '' };
function renderRenderTab() {
  const el = $('#tab-render'), i = st.info, hasRange = st.inP != null || st.outP != null;
  const o = (k, vals) => vals.map(([v, l]) => `<option value="${v}"${ro[k] === v ? ' selected' : ''}>${l}</option>`).join('');
  const prev = el.querySelector('.jobs-sec'); const scrollTop = el.scrollTop;
  el.innerHTML = `<div class="sec"><div class="sec-h">Render <span class="zh">渲染</span><span class="r hint" style="margin:0">vk render</span></div>
    <div class="kv">
      <span>Range</span><select id="ro-range">${o('range', [['auto', hasRange ? `In–Out (${fmt(st.inP ?? 0)}–${fmt(st.outP ?? (i ? i.duration : 0))})` : 'Full film 全片'], ['full', 'Full film 全片'], ['scene', 'Selected / current scene']])}</select>
      <span>Quality</span><select id="ro-quality">${o('quality', [['auto', st.draft ? 'Draft (top-bar toggle)' : 'Final (CRF 18)'], ['final', 'Final (CRF 18)'], ['draft', 'Draft (½ size, fast)']])}</select>
      <span>Scale</span><select id="ro-scale">${o('scale', [['', 'default'], ['0.5', '0.5×'], ['1', '1×'], ['1.5', '1.5×'], ['2', '2×']])}</select>
      <span>Motion blur</span><select id="ro-mb">${o('mb', [['page', i && i.motionBlur ? 'page (on)' : 'page (off)'], ['off', 'off (faster)']])}</select>
      <span>File name</span><input type="text" id="ro-out" placeholder="auto → ${esc(st.outDir ? base(st.outDir) : 'out/studio')}/…mp4" value="${esc(ro.out)}">
    </div>
    <div class="row"><button class="btn primary wide" id="ro-go">● Render MP4 渲染</button></div>
    <div class="hint">Runs <code>vk render ${esc(st.comp ? st.comp.rel : '')}${st.fps ? ' --fps ' + st.fps : ''}${st.format ? ' --format ' + st.format : ''}…</code> — the same deterministic <code>__seek(t)</code> path as this preview. Renders queue one at a time.</div></div>
    <div class="sec jobs-sec"><div class="sec-h">Jobs <span class="zh">任务</span><span class="r">${st.jobs.length}</span></div>${st.jobs.map(jobHTML).join('') || '<div class="empty" style="padding:4px 0">No jobs yet</div>'}</div>`;
  el.scrollTop = scrollTop;
  for (const k of ['range', 'quality', 'scale', 'mb']) $('#ro-' + k).onchange = e => { ro[k] = e.target.value; };
  $('#ro-out').oninput = e => { ro.out = e.target.value; };
  $('#ro-go').onclick = startRender;
  bindJobs(el);
}
function jobHTML(j) {
  const pct = Math.round((j.progress || 0) * 100), stc = { running: 'ac', queued: '', done: 'ok', error: 'err', cancelled: 'warn' }[j.status];
  const title = j.kind === 'render' ? `🎬 ${esc(j.name)}${j.draft ? ' (draft)' : ''}` : `◉ peek ${esc(j.name)}`;
  const range = j.from != null || j.to != null ? ` · ${(j.from || 0).toFixed(2)}–${j.to != null ? (+j.to).toFixed(2) : 'end'} s` : '';
  const meta = j.kind === 'render' ? `${j.total ? `${j.frames}/${j.total} f` : ''}${range}${j.ms ? ` · ${(j.ms / 1000).toFixed(1)} s` : ''}${j.bytes ? ` · ${(j.bytes / 1e6).toFixed(2)} MB` : ''}` : (j.result ? `${j.result.ok ? 'ok' : 'issues'} · ${j.result.summary ? j.result.summary.errors + ' err / ' + j.result.summary.warnings + ' warn' : ''}` : '');
  return `<div class="job ${j.status}" data-id="${j.id}"><div class="job-h"><b>${title}</b><span class="pill ${stc}">${j.status}${j.status === 'running' && j.kind === 'render' ? ' ' + pct + '%' : ''}</span></div>
    <div class="meta">#${j.id} · ${esc(meta)}</div>${j.kind === 'render' || j.status === 'running' ? `<div class="prog"><i style="width:${j.status === 'running' && j.kind !== 'render' ? 50 : pct}%"></i></div>` : ''}
    <div class="acts">${j.status === 'done' && j.download ? `<a class="dl" href="${j.download}" download>⬇ Download MP4</a><button data-play="${j.id}">▶ Play</button><button data-copy="${esc(j.out)}">Copy path</button>` : ''}${['running', 'queued'].includes(j.status) ? `<button data-cancel="${j.id}">Cancel</button>` : ''}<button data-log="${j.id}">Log</button></div>
    <pre hidden data-logbox="${j.id}">${esc((j.log || []).join('\n'))}</pre></div>`;
}
const openLogs = new Set();
function bindJobs(el) {
  for (const id of openLogs) { const p = el.querySelector(`[data-logbox="${id}"]`); if (p) { p.hidden = false; p.scrollTop = 1e9; } }
  el.querySelectorAll('[data-log]').forEach(b => b.onclick = () => { const id = +b.dataset.log, p = el.querySelector(`[data-logbox="${id}"]`); p.hidden = !p.hidden; p.hidden ? openLogs.delete(id) : openLogs.add(id); p.scrollTop = 1e9; });
  el.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => post(`/api/jobs/${b.dataset.cancel}/cancel`));
  el.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy); toast('Copied ' + b.dataset.copy, 'info'); });
  el.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { const j = st.jobs.find(x => x.id === +b.dataset.play); if (!j) return; $('#player-title').textContent = base(j.out); const v = $('#player-video'); v.src = j.out.split('/').map(encodeURIComponent).join('/'); $('#player').hidden = false; v.play().catch(() => { }); });
}
async function startRender() {
  if (!st.info) return;
  const b = {};
  if (ro.range === 'full') b.range = false;
  if (ro.range === 'scene') { const s = st.sel != null ? st.info.scenes[st.sel] : curScene(); if (s) { b.from = +s.start.toFixed(3); b.to = +s.end.toFixed(3); } }
  if (ro.quality !== 'auto') b.draft = ro.quality === 'draft';
  if (ro.scale) b.scale = +ro.scale;
  if (ro.mb === 'off') b.motionBlur = false;
  if (ro.out.trim()) b.out = ro.out.trim().replace(/(\.mp4)?$/i, '.mp4');
  const btn = $('#btn-render'); btn.classList.add('busy');
  try { const j = await post('/api/render', b); upsertJob(j); showTab('render'); toast(`Render #${j.id} queued → ${base(j.out)}`, 'info'); }
  catch (e) { toast('Render failed: ' + e.message, 'err'); }
  finally { btn.classList.remove('busy'); }
}
function upsertJob(j) {
  const k = st.jobs.findIndex(x => x.id === j.id), prev = k >= 0 ? st.jobs[k] : null;
  if (k >= 0) st.jobs[k] = j; else st.jobs.unshift(j);
  if (prev && prev.status !== j.status) {
    if (j.status === 'done' && j.kind === 'render') toast(`✓ Render #${j.id} done · ${(j.ms / 1000).toFixed(1)} s — <a href="${j.download}" download>download MP4</a>`, 'ok', 9000);
    if (j.status === 'error') toast(`✗ ${j.kind} #${j.id} failed — see log`, 'err', 8000);
    if (j.kind === 'peek' && j.result) { st.peek = j; renderChecks(); toast(`Peek: ${j.result.ok ? 'ok ✓' : 'issues'} (${j.result.summary.errors} err / ${j.result.summary.warnings} warn)`, j.result.ok ? 'ok' : 'err'); $('#btn-peek').classList.remove('busy'); }
  }
  const running = st.jobs.filter(x => x.status === 'running' || x.status === 'queued').length, rb = $('#render-badge');
  rb.hidden = !running; rb.textContent = running; rb.className = 'badge run';
  if (st.tab === 'render') renderJobsOnly(); if (st.tab === 'checks' && j.kind === 'peek') renderChecks();
}
function renderJobsOnly() {
  const sec = $('#tab-render .jobs-sec'); if (!sec) return renderRenderTab();
  sec.innerHTML = `<div class="sec-h">Jobs <span class="zh">任务</span><span class="r">${st.jobs.length}</span></div>${st.jobs.map(jobHTML).join('')}`; bindJobs(sec);
}

/* ---------- inspector: checks (lint + peek + page errors) ---------- */
function issueHTML(x, sevKey = 'severity') {
  const sev = x[sevKey] === 'error' ? 'err' : x[sevKey] === 'warn' ? 'warn' : '';
  return `<div class="issue${x.t != null ? ' jump' : ''}" ${x.t != null ? `data-t="${x.t}"` : ''}><span class="pill ${sev}">${esc(x[sevKey] || 'info')}</span><span class="m">${x.t != null ? `<b style="font-family:var(--mono)">${(+x.t).toFixed(2)}s</b> ` : ''}${esc(x.message || x.rule)}${x.line ? ` <span style="color:var(--fg3)">:${x.line}</span>` : ''}</span>${x.hint ? `<span class="h">${esc(x.hint)}</span>` : ''}</div>`;
}
function renderChecks() {
  const el = $('#tab-checks'), L = st.lint, P = st.peek && st.peek.result, errs = st.info ? st.info.errors : [];
  el.innerHTML = `<div class="sec"><div class="sec-h">Lint <span class="zh">静态检查</span><span class="r"><button class="btn" id="ck-lint" style="height:24px">Run</button></span></div>
    ${L ? `<div class="row" style="margin:0 0 6px"><span class="pill ${L.errors ? 'err' : 'ok'}">${L.errors} errors</span><span class="pill ${L.warnings ? 'warn' : ''}">${L.warnings} warnings</span><span class="hint" style="margin:0">${esc(L.files.map(base).join(', '))}</span></div>${L.issues.map(x => issueHTML(x)).join('')}` : '<div class="hint">Determinism + unknown-name lint (wall-clock, Math.random, timers in render(t)…)</div>'}</div>
  <div class="sec"><div class="sec-h">Peek <span class="zh">抽帧检查</span><span class="r"><button class="btn" id="ck-peek" style="height:24px">Run</button></span></div>
    ${P ? `<div class="row" style="margin:0 0 6px"><span class="pill ${P.ok ? 'ok' : 'err'}">${P.ok ? 'ok' : 'issues'}</span><span class="pill">${P.summary.frames} frames · ${(P.summary.ms / 1000).toFixed(1)} s</span></div>
      ${P.sheet ? `<img class="sheet" src="${P.sheet.split('/').map(encodeURIComponent).join('/')}?v=${st.peek.endedAt}" title="contact sheet — click to open" onclick="window.open(this.src)">` : ''}
      ${P.issues.slice().sort((a, b) => (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1)).map(x => issueHTML(x)).join('')}` : st.peek && st.peek.status === 'running' ? '<div class="hint">Running vk peek… stills + contact sheet + layout / contrast / flicker / determinism checks</div>' : '<div class="hint">One browser launch: stills + labelled contact sheet + layout, contrast, blank, flicker and determinism checks.</div>'}</div>
  <div class="sec"><div class="sec-h">Page errors <span class="zh">运行错误</span></div>${errs.length ? errs.map(e => `<div class="issue"><span class="pill err">error</span><span class="m">${esc(e)}</span></div>`).join('') : '<div class="hint">None 无</div>'}</div>`;
  $('#ck-lint').onclick = runLint; $('#ck-peek').onclick = runPeek;
  el.querySelectorAll('.issue.jump').forEach(d => d.onclick = () => { setPlaying(false); setT(+d.dataset.t); followPlayhead(true); });
}
async function runLint() {
  const b = $('#btn-lint'); b.classList.add('busy');
  try {
    st.lint = await post('/api/lint', { file: st.file });
    const bd = $('#lint-badge'); bd.hidden = false; bd.textContent = st.lint.errors || st.lint.warnings || '✓'; bd.className = 'badge ' + (st.lint.errors ? '' : st.lint.warnings ? 'warn' : 'ok');
    showTab('checks'); toast(`Lint: ${st.lint.errors} error(s), ${st.lint.warnings} warning(s)`, st.lint.errors ? 'err' : 'ok');
  } catch (e) { toast('Lint failed: ' + e.message, 'err'); } finally { b.classList.remove('busy'); }
}
async function runPeek() {
  $('#btn-peek').classList.add('busy');
  try { const j = await post('/api/peek', {}); st.peek = j; upsertJob(j); showTab('checks'); toast('Peek started (stills + checks)…', 'info'); }
  catch (e) { toast('Peek failed: ' + e.message, 'err'); $('#btn-peek').classList.remove('busy'); }
}
function showTab(t) {
  st.tab = t; $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  for (const k of ['props', 'render', 'checks']) $('#tab-' + k).hidden = k !== t;
  if (t === 'render') renderRenderTab(); if (t === 'checks') renderChecks(); if (t === 'props') renderProps();
}

/* ================= composition switching + settings ================= */
async function openComp(file, { tellServer = true, t = 0 } = {}) {
  st.file = file; st.comp = st.comps.find(c => c.file === file) || null; st.t = t; st.sel = null; st.tlZoom = 0; $('#tl-zoom').value = 0; st.inP = st.outP = null; st.lint = null; st.peek = null;
  $('#lint-badge').hidden = true;
  renderComps(); renderTitle(); updateRange();
  if (tellServer) post('/api/open', { file }).catch(e => toast(e.message, 'err'));
  await loadPreview();
  if (st.tab !== 'props') showTab(st.tab);
}
async function applySettings(s, { tellServer = true } = {}) {
  Object.assign(st, s);
  $('#tg-draft').checked = st.draft; $('#tg-strict').checked = st.strict;
  if (tellServer) post('/api/settings', s).catch(() => { });
  await loadPreview();
}
function setRange(inP, outP, tell = true) {
  st.inP = inP; st.outP = outP;
  if (st.inP != null && st.outP != null && st.outP <= st.inP) [st.inP, st.outP] = [st.outP, st.inP];
  updateRange(); if (st.tab === 'render') renderRenderTab();
  if (tell) post('/api/range', { in: st.inP, out: st.outP }).catch(() => { });
}

/* ================= toasts, quick switcher, help ================= */
function toast(html, kind = 'info', ms = 4500) { const d = document.createElement('div'); d.className = 'toast ' + kind; d.innerHTML = html; $('#toasts').appendChild(d); setTimeout(() => d.remove(), ms); }
let qsSel = 0;
function openQS() { $('#qs').hidden = false; const i = $('#qs-input'); i.value = ''; qsSel = 0; renderQS(); i.focus(); }
function qsItems() { const q = $('#qs-input').value.trim().toLowerCase(); return st.comps.filter(c => !q || (c.rel + ' ' + c.title).toLowerCase().includes(q)); }
function renderQS() { const it = qsItems(); qsSel = Math.max(0, Math.min(qsSel, it.length - 1)); $('#qs-list').innerHTML = it.map((c, k) => `<div class="qs-item${k === qsSel ? ' on' : ''}" data-f="${esc(c.file)}">${c.three ? '◐' : '▭'} <span>${esc(c.rel)}</span><small>${esc(c.title)}</small></div>`).join('') || '<div class="empty">No match</div>'; const on = $('#qs-list .on'); on && on.scrollIntoView({ block: 'nearest' }); }
$('#qs-input').oninput = () => { qsSel = 0; renderQS(); };
$('#qs-input').onkeydown = e => {
  if (e.key === 'ArrowDown') { qsSel++; renderQS(); e.preventDefault(); } else if (e.key === 'ArrowUp') { qsSel--; renderQS(); e.preventDefault(); }
  else if (e.key === 'Enter') { const c = qsItems()[qsSel]; $('#qs').hidden = true; if (c && c.file !== st.file) openComp(c.file); }
  else if (e.key === 'Escape') $('#qs').hidden = true;
};
$('#qs-list').onclick = e => { const it = e.target.closest('.qs-item'); if (!it) return; $('#qs').hidden = true; if (it.dataset.f !== st.file) openComp(it.dataset.f); };
const SHORTCUTS = [
  ['Playback 播放'], ['Space', 'Play / pause'], ['K', 'Pause'], ['L', 'Play forward (again: faster)'], ['J', 'Play reverse (again: faster)'],
  ['← / →', 'Previous / next frame'], ['Shift + ← / →', '1 second back / forward'], ['↑ / ↓', 'Previous / next scene'], ['A · Home', 'Jump to start'], ['E · End', 'Jump to end'], ['G', 'Go to time / frame'], ['M', 'Mute'],
  ['Range 区间'], ['I', 'Set In point'], ['O', 'Set Out point'], ['X', 'Clear In / Out'],
  ['Timeline 时间线'], ['+ / −', 'Zoom in / out'], ['0', 'Fit'], ['Ctrl + wheel', 'Zoom around cursor'], ['Click / drag', 'Scrub'],
  ['View 视图'], ['S', 'Safe area overlay'], ['T', 'Checkerboard'], ['F', 'Fullscreen preview'], ['Ctrl + B', 'Toggle left sidebar'], ['Ctrl + J', 'Toggle right sidebar'],
  ['Actions 操作'], ['R', 'Render (current settings)'], ['P', 'Peek'], ['Shift + L', 'Lint'], ['D', 'Draft toggle'], ['Ctrl + K', 'Quick switcher'], ['PageUp / PageDown', 'Previous / next composition'], ['?', 'This help'], ['Esc', 'Close dialogs'],
];
$('#help-grid').innerHTML = SHORTCUTS.map(([k, d]) => d ? `<div><span>${esc(d)}</span><span>${k.split(' · ').map(x => `<kbd>${esc(x)}</kbd>`).join(' ')}</span></div>` : `<h4>${esc(k)}</h4>`).join('');
$$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) { m.hidden = true; const v = m.querySelector('video'); v && v.pause(); } }));
function gotoPrompt() {
  if (!st.info) return; const s = prompt('Go to time (seconds, m:ss.s) or frame (f120) · 跳转', st.t.toFixed(2)); if (s == null) return;
  let t = /^f\s*\d+/i.test(s) ? +s.replace(/\D/g, '') / st.info.fps : s.includes(':') ? s.split(':').reduce((a, x) => a * 60 + +x, 0) : +s;
  if (Number.isFinite(t)) { setPlaying(false); setT(t); followPlayhead(true); }
}

/* ================= wiring ================= */
$('#btn-open').onclick = openQS; $('#btn-help').onclick = () => { $('#help').hidden = false; };
$('#btn-lint').onclick = runLint; $('#btn-peek').onclick = runPeek; $('#btn-render').onclick = startRender;
$('#tg-draft').onchange = e => applySettings({ draft: e.target.checked });
$('#tg-strict').onchange = e => applySettings({ strict: e.target.checked });
$('#comp-filter').oninput = renderComps;
$('#comp-list').onclick = e => { const b = e.target.closest('.comp'); if (b && b.dataset.f !== st.file) openComp(b.dataset.f); };
$('#scene-list').onclick = e => { const b = e.target.closest('.scn'); if (b) selectScene(+b.dataset.i, true); };
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); };
$('#zoom-seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.zoom = b.dataset.z; $$('#zoom-seg button').forEach(x => x.classList.toggle('on', x === b)); fitStage(); };
const toggleSafe = () => { st.safe = !st.safe; $('#safe-ov').hidden = !st.safe; $('#btn-safe').classList.toggle('on', st.safe); };
const toggleChecker = () => { viewer.classList.toggle('checker'); $('#btn-checker').classList.toggle('on', viewer.classList.contains('checker')); };
$('#btn-safe').onclick = toggleSafe; $('#btn-checker').onclick = toggleChecker; $('#btn-reload').onclick = () => loadPreview();
$('#tr-play').onclick = () => { st.dir = 1; setPlaying(!st.playing); };
$('#tr-prev').onclick = () => stepFrame(-1); $('#tr-next').onclick = () => stepFrame(1);
$('#tr-start').onclick = () => { setT(st.inP ?? 0); followPlayhead(true); }; $('#tr-end').onclick = () => { setT((st.outP ?? st.info.duration) - 1e-3); followPlayhead(true); };
$('#tr-in').onclick = () => setRange(st.inP != null && Math.abs(st.inP - st.t) < 1e-3 ? null : st.t, st.outP);
$('#tr-out').onclick = () => setRange(st.inP, st.outP != null && Math.abs(st.outP - st.t) < 1e-3 ? null : st.t);
$('#tr-loop').onclick = () => { st.loop = !st.loop; $('#tr-loop').classList.toggle('on', st.loop); };
$('#tr-loop').classList.toggle('on', st.loop);
$('#tr-rate').onchange = e => { st.rate = +e.target.value; audioSync(true); };
const toggleMute = () => { st.muted = !st.muted; $('#tr-mute').textContent = st.muted ? '🔇' : '🔊'; music.muted = st.muted; voiceEls.forEach(v => v.a.muted = st.muted); if (master) master.gain.value = st.muted ? 0 : 1; };
$('#tr-mute').onclick = toggleMute;
$('#timecode').onclick = gotoPrompt;
$('#tl-zoom').oninput = e => setTlZoom(+e.target.value);
$('#tl-zin').onclick = () => setTlZoom(st.tlZoom + 12); $('#tl-zout').onclick = () => setTlZoom(st.tlZoom - 12); $('#tl-zfit').onclick = () => setTlZoom(0);
const playDir = d => { if (st.playing && st.dir === d) st.rate = Math.min(8, st.rate * 2); else { st.dir = d; st.rate = 1; } $('#tr-rate').value = [0.25, .5, 1, 2].includes(st.rate) ? st.rate : 2; setPlaying(true); };
document.addEventListener('keydown', e => {
  const tag = e.target.tagName, mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Escape') { $$('.modal').forEach(m => { m.hidden = true; }); $('#player-video').pause(); return; }
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !$('#qs').hidden) return;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openQS(); return; }
  if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); $('#app').classList.toggle('no-left'); setTimeout(() => { fitStage(); layoutTimeline(); }, 0); return; }
  if (mod && e.key.toLowerCase() === 'j') { e.preventDefault(); $('#app').classList.toggle('no-right'); setTimeout(() => { fitStage(); layoutTimeline(); }, 0); return; }
  if (mod || e.altKey) return;
  const k = e.key, i = st.info;
  const act = {
    ' ': () => { st.dir = 1; st.rate = +$('#tr-rate').value; setPlaying(!st.playing); },
    k: () => setPlaying(false), l: () => playDir(1), j: () => playDir(-1), L: () => runLint(),
    ArrowLeft: () => e.shiftKey ? (setPlaying(false), setT(st.t - 1), followPlayhead(true)) : stepFrame(-1),
    ArrowRight: () => e.shiftKey ? (setPlaying(false), setT(st.t + 1), followPlayhead(true)) : stepFrame(1),
    ArrowUp: () => jumpScene(-1), ArrowDown: () => jumpScene(1),
    a: () => $('#tr-start').click(), Home: () => $('#tr-start').click(), e: () => $('#tr-end').click(), End: () => $('#tr-end').click(),
    i: () => setRange(st.t, st.outP), o: () => setRange(st.inP, st.t), x: () => setRange(null, null),
    '+': () => setTlZoom(st.tlZoom + 12), '=': () => setTlZoom(st.tlZoom + 12), '-': () => setTlZoom(st.tlZoom - 12), '0': () => setTlZoom(0),
    s: toggleSafe, t: toggleChecker, f: () => { document.fullscreenElement ? document.exitFullscreen() : viewer.requestFullscreen(); setTimeout(fitStage, 100); },
    m: toggleMute, g: gotoPrompt, r: startRender, p: runPeek, d: () => applySettings({ draft: !st.draft }), '?': () => { $('#help').hidden = false; },
    PageUp: () => { const k2 = st.comps.findIndex(c => c.file === st.file); if (k2 > 0) openComp(st.comps[k2 - 1].file); },
    PageDown: () => { const k2 = st.comps.findIndex(c => c.file === st.file); if (k2 < st.comps.length - 1) openComp(st.comps[k2 + 1].file); },
  }[k];
  if (act && (i || ['PageUp', 'PageDown', '?'].includes(k))) { e.preventDefault(); act(); }
});
document.addEventListener('fullscreenchange', () => setTimeout(fitStage, 50));

/* ================= server events (agents drive the same session) ================= */
function connectEvents() {
  const es = new EventSource('/api/events');
  let reloadTimer = null;
  es.onmessage = ev => {
    const m = JSON.parse(ev.data); if (m.origin === CID) return;
    if (m.type === 'seek') { setPlaying(false, true); if (m.scene != null) { st.sel = m.scene; markSelected(); renderScenes(); } pendingAck = { id: m.id, t: Math.max(0, Math.min(m.t, (st.info ? st.info.duration : 1e9) - 1e-3)) }; setT(m.t, { report: false }); followPlayhead(true); if (!busy && !win) pendingAck = null; }
    else if (m.type === 'play') { if (m.rate) { st.rate = m.rate; } if (m.loop != null) { st.loop = m.loop; $('#tr-loop').classList.toggle('on', st.loop); } st.dir = 1; setPlaying(m.playing, true); }
    else if (m.type === 'open') { if (m.file !== st.file) refreshComps().then(() => openComp(m.file, { tellServer: false })); }
    else if (m.type === 'settings') { const s = m.settings, changed = ['draft', 'strict', 'fps', 'format'].some(k => s[k] !== st[k]); if (m.selectedScene !== undefined && m.selectedScene !== st.sel) { st.sel = m.selectedScene; renderScenes(); markSelected(); if (!changed) renderProps(); } if (changed) applySettings(s, { tellServer: false }); }
    else if (m.type === 'range') setRange(m.in, m.out, false);
    else if (m.type === 'job') upsertJob(m.job);
    else if (m.type === 'reload') { clearTimeout(reloadTimer); reloadTimer = setTimeout(async () => { await refreshComps(); toast('↻ ' + base(m.file) + ' changed — reloaded', 'info', 2500); loadPreview(); }, 200); }
  };
  es.onerror = () => { $('#vb-fps').textContent = 'server disconnected…'; };
}
async function refreshComps() { st.comps = await get('/api/compositions'); st.comp = st.comps.find(c => c.file === st.file) || st.comp; renderComps(); }

(async function init() {
  const s = await get('/api/state');
  Object.assign(st, { comps: s.compositions, outDir: s.outDir, root: s.root, draft: s.settings.draft, strict: s.settings.strict, fps: s.settings.fps, format: s.settings.format, inP: s.range.in, outP: s.range.out, jobs: s.jobs, sel: s.selectedScene });
  $('#tg-draft').checked = st.draft; $('#tg-strict').checked = st.strict;
  connectEvents();
  renderComps();
  const range = s.range, sel = s.selectedScene;
  await openComp(s.file, { tellServer: false, t: s.playhead.t || 0 });
  setRange(range.in, range.out, false);
  if (sel != null && st.info && st.info.scenes[sel]) { st.sel = sel; renderScenes(); markSelected(); renderProps(); }
  window.__studio = { st, setT, setPlaying, openComp, selectScene, setTlZoom, showTab };   // handy for debugging / screenshots
})();
