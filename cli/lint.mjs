// vk lint page.html [more.html …] [--json] [--quiet]
// Static determinism lint (cli/lintcore.mjs): wall-clock / Math.random / timers / THREE.Clock / mixer.update inside
// render closures, state accumulated across frames, unknown fx/transition/ease/theme/style/background/texture names.
// Exit code 1 when there is at least one error.
import { parseArgs, ROOT, fs, path } from './lib.mjs';
import { lintPage, lintSource, formatIssue } from './lintcore.mjs';

export function registryNames() {
  try {
    const api = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/api.json'), 'utf8')), K = api.kinds || {};
    const n = k => (K[k] ? K[k].entries.flatMap(e => [e.name, ...(e.aliases || [])]) : null);
    return { fx: n('fx'), transitions: n('transitions'), eases: n('eases'), themes: n('themes'), styles: n('styles'), backgrounds: n('backgrounds'), textures: n('textures') };
  } catch (e) { return null; }
}
export function lintFile(abs, names = registryNames()) {
  const html = fs.readFileSync(abs, 'utf8'), dir = path.dirname(abs);
  const read = rel => { try { return fs.readFileSync(path.resolve(dir, rel.split(/[?#]/)[0]), 'utf8'); } catch (e) { return null; } };
  const isHtml = /\.html?$/i.test(abs);
  if (!isHtml) { const issues = lintSource(html, { file: path.basename(abs), names }); return { file: abs, files: [abs], issues, errors: issues.filter(i => i.severity === 'error').length, warnings: issues.filter(i => i.severity === 'warn').length }; }
  const r = lintPage(html, { file: path.basename(abs), read, names });
  return { file: abs, ...r };
}
export default async function lint(argv) {
  const opt = parseArgs(argv, ['quiet']), files = opt._.map(f => path.resolve(f));
  if (!files.length || files.some(f => !fs.existsSync(f))) throw new Error('usage: vk lint page.html [more.html …] [--json]');
  const names = registryNames(), reports = files.map(f => lintFile(f, names));
  if (opt.json) { const out = JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 1); if (typeof opt.json === 'string') fs.writeFileSync(opt.json, out); else console.log(out); }
  else for (const r of reports) {
    if (!opt.quiet || r.issues.length) console.log(`[vk lint] ${path.relative(process.cwd(), r.file) || r.file}  ${r.errors} error(s), ${r.warnings} warning(s)${r.files.length > 1 ? `  (+ ${r.files.slice(1).join(', ')})` : ''}`);
    for (const i of r.issues) console.log('  ' + formatIssue(i));
  }
  const errs = reports.reduce((a, r) => a + r.errors, 0);
  if (errs) process.exitCode = 1;
  return reports;
}
