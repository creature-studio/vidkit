// Declarative adapter (engine.js compatible): <section class="scene" data-dur data-in data-cap data-cam data-push
// data-shake> with children using data-t / data-fx / data-d / data-ease / data-exit / data-stagger …
// Lets older HTML-video pages run on vidkit unchanged apart from the <script> tag.
import { Scene } from '../core/scene.js';
import { parseDur, parseTime } from '../core/time.js';
import { applyFx } from '../fx/apply.js';

export function parseDeclarative(v, sections) {
  let cursor = 0;
  sections.forEach((el, i) => {
    const d = el.dataset, sc = new Scene(v, { el, name: el.id || d.name || `scene${i + 1}` });
    const tin = (d.in || (i === 0 ? 'none' : (v.cfg.transition || 'fade:0.25'))).split(':');
    sc.transition = tin[0] === 'none' ? { type: 'none', d: 0 } : { type: tin[0] === 'wipe' ? 'wipe-right' : tin[0], d: +(tin[1] || .5) };
    sc.dur = parseDur(d.dur || 5, v.beats);
    const overlap = d.overlap ? parseDur(d.overlap, v.beats) : 0;
    sc.start = d.start != null ? parseTime(d.start, v.beats) : cursor - overlap;
    if (overlap) sc.transition.d = overlap;
    cursor = sc.start + sc.dur;
    sc.mode = [...el.classList].find(c => v.theme.modes[c]) || v.theme.mode;
    v.applyThemeVars(el, sc.mode);
    el.style.zIndex = String(i + 1);
    sc.cap = d.cap || null;
    v.scenes.push(sc);
    parseScene(v, sc);
  });
}
function parseScene(v, sc) {
  const el = sc.el, T = x => parseTime(x, v.beats, sc.start);
  el.querySelectorAll('[data-stagger]').forEach(box => {
    const kids = [...box.children], each = +box.dataset.stagger || .15, t = T(box.dataset.t);
    kids.forEach((k, i) => { if (k.dataset.t == null) k.dataset.t = String(+(t + i * each).toFixed(3)); ['fx', 'd', 'ease', 'exit'].forEach(a => { if (k.dataset[a] == null && box.dataset[a] != null) k.dataset[a] = box.dataset[a]; }); });
    delete box.dataset.t; box.removeAttribute('data-fx');
  });
  el.querySelectorAll('[data-t]').forEach(it => {
    const ds = it.dataset, fx = ds.fx || 'fade';
    const o = { t: T(ds.t), each: ds.each ? +ds.each : undefined, color: ds.color, d: ds.d != null ? +ds.d : undefined, ease: ds.ease, dist: ds.dist ? +ds.dist : undefined };
    if (fx === 'type') { o.cps = +ds.cps || 30; o.text = ds.text; o.caret = ds.caret !== '0'; }
    if (fx === 'count') { o.from = ds.from; o.to = ds.to; o.decimals = ds.decimals; o.sep = ds.sep; }
    if (!/^(type|count|swap|letters|words)$/.test(fx)) it.style.opacity = '0';
    applyFx(it, fx, o, sc, false);
    if (ds.exit != null) applyFx(it, ds.exitFx || (/^(type|count|swap|letters|words)$/.test(fx) ? 'fade' : fx), { t: T(ds.exit), d: ds.exitD ? +ds.exitD : .4 }, sc, true);
  });
  if (el.dataset.push) sc.push(parseFloat(el.dataset.push) / (/%$/.test(el.dataset.push) ? 100 : 1));
  if (el.dataset.shake) el.dataset.shake.split(';').filter(x => x.trim()).forEach(x => { const p = x.split(','); sc.shake(T(p[0]), +p[1], p[2] ? +p[2] : undefined); });
  if (el.dataset.cam) sc.camera(el.dataset.cam.split(';').filter(s => s.trim()).map(s => { const p = s.split(':'), q = p[1].split(',').map(Number); return { t: +p[0], x: q[0], y: q[1], s: q[2], r: q[3], ease: p[2] && p[2].trim() }; }));
}
