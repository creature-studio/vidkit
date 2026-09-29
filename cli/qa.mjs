// vk qa page.html [--format 9:16] [--sample 0.5] [--json report.json]
// Checks at each scene's settled frame: text overlap/overflow, out-of-frame, safe area, platform UI zones
// (vertical), caption width/wrap, fonts; prints the visible-text snapshot; then samples the whole timeline
// for blank frames (near-uniform luma) including transition midpoints.
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
    const cps = [...c[2]].length / (c[1] - c[0]); if (cps > 7) log('WARN', `caption "${c[2]}" reads fast: ${cps.toFixed(1)} chars/s`);
  }
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
