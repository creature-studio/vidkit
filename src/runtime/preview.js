// Browser preview: scrubber with scene ticks, scene jump list, captions toggle, safe-area overlay, fullscreen,
// offline-rendered SFX playback. Keys: Space play · ←/→ ±1s (Shift ±5s) · ,/. frame step · Home · f · c · s (safe area).
// The preview t is persisted in sessionStorage so `vk preview` live-reload resumes at the same time.
import { makeScore } from '../audio/score.js';

export function buildPreviewUI(v, Q) {
  const { stage, W, H } = v, DUR = v.duration, FPS = v.fps;
  const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  const wrap = document.createElement('div'); wrap.className = 'vk-wrap';
  const h1 = document.createElement('h1'); h1.innerHTML = (v.cfg.title || document.title || 'vidkit') + `<small>${DUR.toFixed(1)}s · ${W}×${H} · ${FPS}fps · ${v.cfg.theme || 'tech-blue'}</small>`;
  const frame = document.createElement('div'); frame.className = 'vk-frame'; frame.title = '点击播放/暂停 (Space)';
  stage.parentNode.insertBefore(wrap, stage); wrap.appendChild(h1); wrap.appendChild(frame); frame.appendChild(stage);
  // safe-area overlay
  const safe = document.createElement('div'); safe.className = 'vk-safe';
  const s = v.safe;
  safe.innerHTML = `<div style="position:absolute;left:${s.left}px;top:${s.top}px;right:${s.right}px;bottom:${s.bottom}px;outline:2px dashed rgba(0,255,160,.9)"></div>` +
    v.zones.map(z => `<div style="position:absolute;left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px;background:rgba(255,40,80,.28);outline:1px solid rgba(255,40,80,.9);font:600 20px monospace;color:#fff;padding:6px">${z.name}</div>`).join('');
  stage.appendChild(safe);
  const ctr = document.createElement('div'); ctr.className = 'vk-controls';
  ctr.innerHTML = '<button class="vk-play" type="button">播放</button><div class="vk-seek"><div class="vk-ticks"></div><input type="range" min="0" step="1" aria-label="进度"></div><span class="vk-time"></span><button class="vk-cc" type="button">字幕</button><button class="vk-sa" type="button">安全区</button><button class="vk-fs" type="button">全屏</button>';
  wrap.appendChild(ctr);
  const list = document.createElement('div'); list.className = 'vk-scenelist';
  list.innerHTML = v.scenes.map((sc, i) => `<button type="button" data-i="${i}">${i + 1}. ${sc.name}</button>`).join('');
  wrap.appendChild(list);
  ctr.querySelector('.vk-ticks').innerHTML = v.scenes.map(sc => `<i style="left:${(sc.start / DUR * 100).toFixed(2)}%"></i>`).join('');
  const play = ctr.querySelector('.vk-play'), seek = ctr.querySelector('input'), time = ctr.querySelector('.vk-time');
  seek.max = Math.round(DUR * 100);
  const key = 'vk-t:' + location.pathname;
  let t = Q.get('t') != null ? +Q.get('t') : (+sessionStorage.getItem(key) || 0), last = 0;
  let scoreBuf = null, actx = null, src = null;
  const stopScore = () => { if (src) { try { src.stop(); } catch (e) { } src = null; } };
  function playScore() {
    if (!window.SCORE || v.audioEl) return;
    try { actx = actx || new AudioContext(); } catch (e) { return; }
    stopScore();
    const start = () => { if (!v.playing) return; src = actx.createBufferSource(); src.buffer = scoreBuf; src.connect(actx.destination); src.start(0, Math.min(t, DUR - .01)); };
    if (scoreBuf) start(); else { const oac = new OfflineAudioContext(2, Math.ceil(48000 * DUR), 48000); window.SCORE(oac); oac.startRendering().then(b => { scoreBuf = b; start(); }); }
  }
  function setPlaying(p) {
    v.playing = p; play.textContent = p ? '暂停' : (t >= DUR - .05 ? '重播' : '播放');
    if (v.audioEl) { if (p) { v.audioEl.currentTime = t; v.audioEl.play().catch(() => { }); } else v.audioEl.pause(); }
    if (p) playScore(); else stopScore();
  }
  const toggle = () => { if (!v.playing && t >= DUR - .05) t = 0; setPlaying(!v.playing); };
  const go = nt => { t = Math.max(0, Math.min(DUR - 1e-3, nt)); if (v.audioEl) v.audioEl.currentTime = t; if (v.playing) playScore(); v.render(t); };
  function tick(now) { const dt = last ? (now - last) / 1000 : 0; last = now; if (v.playing) { t += Math.min(dt, .1); if (t >= DUR) { t = DUR - 1e-3; setPlaying(false); } v.render(t); } requestAnimationFrame(tick); }
  play.onclick = e => { e.stopPropagation(); toggle(); };
  frame.onclick = toggle;
  seek.oninput = () => go(+seek.value / 100);
  list.onclick = e => { const b = e.target.closest('button'); if (b) go(v.scenes[+b.dataset.i].start + .001); };
  ctr.querySelector('.vk-cc').onclick = () => { v.ccOn = !v.ccOn; v.render(t); };
  ctr.querySelector('.vk-sa').onclick = () => safe.classList.toggle('show');
  ctr.querySelector('.vk-fs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else frame.requestFullscreen && frame.requestFullscreen(); };
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.key !== ' ') return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); toggle(); }
    else if (k === 'ArrowRight') go(t + (e.shiftKey ? 5 : 1)); else if (k === 'ArrowLeft') go(t - (e.shiftKey ? 5 : 1));
    else if (k === '.') go(t + 1 / FPS); else if (k === ',') go(t - 1 / FPS);
    else if (k === 'Home') go(0); else if (k === 'f') ctr.querySelector('.vk-fs').click(); else if (k === 'c') ctr.querySelector('.vk-cc').click(); else if (k === 's') safe.classList.toggle('show');
  });
  const fit = () => { const w = frame.clientWidth, hh = frame.clientHeight, sc = Math.min(w / W, hh / H); stage.style.transform = `translate(${(w - W * sc) / 2}px,${(hh - H * sc) / 2}px) scale(${sc})`; };
  window.addEventListener('resize', fit); document.addEventListener('fullscreenchange', fit);
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(frame); fit();
  let lastSave = 0;
  const ui = { update(tt) { seek.value = Math.round(tt * 100); time.textContent = fmt(tt) + ' / ' + fmt(DUR); const cur = v.scenes.findLastIndex(sc => tt >= sc.start); [...list.children].forEach((b, i) => b.classList.toggle('cur', i === cur)); if (Math.abs(tt - lastSave) > .2) { lastSave = tt; sessionStorage.setItem(key, tt.toFixed(2)); } } };
  v.render(t);
  const auto = Q.get('autoplay') === '1';
  window.__ready.then(() => { v.render(t); if (auto) setPlaying(true); });
  requestAnimationFrame(tick);
  return ui;
}
export { makeScore };
