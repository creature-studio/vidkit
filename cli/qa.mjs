// vk qa page.html [--format 9:16] [--sample 0.5] [--order-step 1] [--json report.json]
// Checks at each scene's settled frame: text overlap/overflow, out-of-frame, safe area, platform UI zones
// (vertical), caption width/wrap, fonts; prints the visible-text snapshot; then samples the whole timeline
// for blank frames (near-uniform luma) including transition midpoints, and checks render(t) is independent of the
// order frames are rendered in (--order-step s, 0 = off).
import { parseArgs, startServer, pageUrl, launch, probeInfo, workerPage, seek, shot, settleTimes, lumaStats, fmtT, fs, path } from './lib.mjs';
export default async function qa(argv) {
  const opt = parseArgs(argv), abs = path.resolve(opt._[0] || ''); if (!fs.existsSync(abs)) throw new Error('usage: vk qa page.html');
  const { server, port } = await startServer(); const params = { render: '1' }; if (opt.format) params.format = opt.format;
  const url = pageUrl(port, abs, params), browser = await launch(), info = await probeInfo(browser, url);
  const page = await workerPage(browser, url, info, 1, { failFast: false });
  const report = { file: abs, size: info.size, duration: info.dur, scenes: [], captions: [], blank: [], counts: { issue: 0, warn: 0 } };
  const log = (lvl, msg) => { report.counts[lvl === 'WARN' ? 'warn' : 'issue']++; console.log(`  [qa] ${lvl} ${msg}`); };
  console.log(`[vk qa] ${path.basename(abs)}  ${info.size.width}x${info.size.height}  ${info.dur.toFixed(2)}s  ${info.scenes.length} scenes`);
  for (const { scene: s, t } of settleTimes(info)) {
    const r = await page.evaluate(t => window.__qa(t), t), txt = await page.evaluate(() => window.__text());
    console.log(`  [text] ${s.index + 1} ${s.name} t=${fmtT(t)}: ${txt.length > 180 ? txt.slice(0, 180) + '…' : txt || '(none)'}`);
    report.scenes.push({ index: s.index, name: s.name, t, text: txt, issues: r.issues });
    for (const i of r.issues) log(i.level === 'warn' ? 'WARN' : 'ISSUE', `scene ${s.index + 1} t=${fmtT(t)} ${i.type}: ${i.el || ''}${i.other ? '  <->  ' + i.other : ''}${i.zone ? ' [' + i.zone + ']' : ''}${i.scrollW ? ` (${i.scrollW}>${i.clientW})` : ''}${i.w ? ` w=${i.w}` : ''}`);
  }
  for (const c of info.caps) {
    const r = await page.evaluate(t => window.__qa(t), (c[0] + c[1]) / 2);
    const cis = r.issues.filter(i => /^caption/.test(i.type) || (i.type === 'text-overlap' && /vk-cap/.test(i.el + i.other)));
    report.captions.push({ text: c[2], start: c[0], end: c[1], issues: cis, chars: [...c[2]].length });
    for (const i of cis) log(i.level === 'warn' ? 'WARN' : 'ISSUE', `caption "${c[2]}" ${i.type} ${i.w || i.other || i.zone || ''}`);
    const cps = readUnits(c[2]) / (c[1] - c[0]); if (cps > 9) log('WARN', `caption "${c[2]}" reads fast: ${cps.toFixed(1)} units/s (CJK char = 1, other = 0.5; limit 9)`);
  }
  // audio (Phase 2): voice-over coverage, music file, word timing sanity
  for (const s of info.scenes) {
    if (!s.vo) continue; const nx = info.scenes[s.index + 1], vis = nx ? nx.start + (nx.transition.d || 0) * .5 : s.start + s.dur;
    if (s.vo.missing) log('ISSUE', `scene ${s.index + 1} "${s.name}": vo: text has no TTS audio (timing estimated) — run vk tts ${path.basename(abs)}`);
    if (s.vo.at + s.vo.dur > vis + .05) log('ISSUE', `scene ${s.index + 1} "${s.name}": voice-over ends at ${fmtT(s.vo.at + s.vo.dur)}s but the scene hands over at ${fmtT(vis)}s (use dur:'auto')`);
  }
  if (info.music) { const f = decodeURIComponent(new URL(info.music.src).pathname); if (!fs.existsSync(f)) log('ISSUE', `music file not found: ${f}`); }
  info.caps.filter(c => c[3]).forEach(c => { for (let i = 1; i < c[3].length; i++) if (c[3][i].t < c[3][i - 1].t - 1e-3) { log('WARN', `caption "${c[2]}": word times not monotonic at "${c[3][i].w}"`); break; } });
  if (info.voice && info.voice.length) console.log(`  [audio] ${info.voice.length} voice clip(s), ${info.voice.reduce((a, v) => a + v.dur, 0).toFixed(1)}s speech${info.music ? ' + music bed' : ''}`);
  // seek-order determinism: render(t) must depend on t only. Frames are rendered by several workers in chunks, so a
  // value carried over from the previously rendered frame (e.g. set by one sc.on and read by an earlier one) shows up
  // as a one-frame lag that differs between chunk starts and the rest. Compare the DOM state reached from t-1/fps
  // with the state reached after jumping in from elsewhere.
  const orderStep = +(opt.orderStep ?? 1), dt = 1 / (info.fps || 30), orderHits = [];
  if (orderStep > 0) for (let t = orderStep / 2; t < info.dur - dt; t += orderStep) {
    await seek(page, Math.max(0, t - dt)); await seek(page, t); const warm = await page.evaluate(stateSnapshot);
    await seek(page, (t + info.dur / 2) % info.dur); await seek(page, t); const cold = await page.evaluate(stateSnapshot);
    const d = firstDiff(warm, cold); if (d) orderHits.push({ t: +t.toFixed(3), ...d });
  }
  report.seekOrder = orderHits;
  for (const h of orderHits.slice(0, 8)) log('WARN', `render(t) depends on seek history at t=${fmtT(h.t)}: ${h.el} ${h.attr} "${h.a}" (from t-1/fps) vs "${h.b}" (jumped in) — derive it from t instead of a value left by the previous frame`);
  if (orderHits.length > 8) log('WARN', `…and ${orderHits.length - 8} more seek-order differences`);
  // blank-frame sampling
  const step = +(opt.sample || .5), times = [];
  for (let t = 0; t < info.dur; t += step) times.push(+t.toFixed(3));
  info.scenes.forEach(s => { if (s.transition && s.transition.d) times.push(s.start + s.transition.d / 2); });
  times.sort((a, b) => a - b);
  for (const t of times) {
    await seek(page, t); const st = await lumaStats(await shot(page, info, 'png'));
    if (st.sd < 2.5) { report.blank.push({ t, ...st }); log('WARN', `blank-ish frame t=${fmtT(t)} (luma mean ${st.mean.toFixed(0)}, sd ${st.sd.toFixed(2)})`); }
  }
  console.log(`[qa] ${report.counts.issue} issue(s), ${report.counts.warn} warning(s); sampled ${times.length} frames for blanks`);
  if (opt.json) { const f = typeof opt.json === 'string' ? path.resolve(opt.json) : abs.replace(/\.html?$/i, '') + '-qa.json'; fs.writeFileSync(f, JSON.stringify(report, null, 2)); console.log('  report', f); }
  await browser.close(); server.close(); return report;
}

// every element's attributes (incl. inline style) + text under the stage, as a flat list (qa seek-order check)
function stateSnapshot() {
  const root = document.querySelector('.vk-stage') || document.body, out = [];
  const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('class') ? '.' + String(e.getAttribute('class')).trim().split(/\s+/).slice(0, 2).join('.') : '');
  // inactive scenes are not drawn: their leftover state does not matter
  const hidden = [...document.querySelectorAll('.vk-scenes > *:not(.on)')];
  const invisible = c => { const cs = getComputedStyle(c); return cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0'; };
  const walk = (el, fn) => { for (const c of el.children) { if (hidden.includes(c) || invisible(c)) continue; fn(c); walk(c, fn); } };
  let i = 0;
  walk(root, e => {
    i++; const a = {}; for (const x of e.attributes) a[x.name] = x.value;
    if (e.childNodes.length === 1 && e.firstChild.nodeType === 3) a['#text'] = e.firstChild.data;
    // vk.gl layers: their pixels are state too (a GL layer that kept pixels from the previous frame would pass the
    // attribute comparison) → FNV-1a hash of the canvas contents
    if (e.tagName === 'CANVAS' && e.classList.contains('vk-gl')) {
      try { const d = new Uint32Array(e.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, e.width, e.height).data.buffer); let h = 2166136261; for (let k = 0; k < d.length; k++) h = Math.imul(h ^ d[k], 16777619) >>> 0; a['#pixels'] = h.toString(16); } catch (err) { a['#pixels'] = 'err'; }
    }
    out.push([i, name(e), a]);
  });
  return out;
}
function firstDiff(A, B) {
  if (A.length !== B.length) {
    const cnt = L => L.reduce((m, [, n]) => m.set(n, (m.get(n) || 0) + 1), new Map()), ca = cnt(A), cb = cnt(B);
    const d = [...new Set([...ca.keys(), ...cb.keys()])].filter(n => ca.get(n) !== cb.get(n)).slice(0, 3).map(n => `${n} ${ca.get(n) || 0}/${cb.get(n) || 0}`);
    return { el: 'visible elements', attr: d.join(', '), a: String(A.length), b: String(B.length) };
  }
  for (let i = 0; i < A.length; i++) {
    const a = A[i][2], b = B[i][2];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) {
      const clip = v => (v == null ? '∅' : v.length > 60 ? v.slice(0, 60) + '…' : v);
      return { el: A[i][1], attr: k, a: clip(a[k]), b: clip(b[k]) };
    }
  }
  return null;
}
// reading load: a CJK character ≈ one unit, latin letters/digits ≈ half a unit (Netflix zh guideline ≈ 9 chars/s)
function readUnits(s) { let n = 0; for (const ch of s) { if (/\s/.test(ch)) continue; n += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : .5; } return n; }
