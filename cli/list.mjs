// vk list [kind] [name] [--detail] [--json]   the registry from docs/api.json (npm run docs regenerates it)
//   vk list                → kinds with counts      vk list fx        → names + one-line descriptions
//   vk list fx pop         → params of one entry    vk list fx --detail / --json  → full schemas
import { parseArgs, ROOT, fs, path } from './lib.mjs';
import { suggest } from '../src/core/names.js';
const ALIAS = { transition: 'transitions', texture: 'textures', background: 'backgrounds', bg: 'backgrounds', block: 'blocks', theme: 'themes', format: 'formats', sound: 'sounds', ease: 'eases', material: 'materials', style: 'styles', rigs: 'threeRigs' };
export default async function list(argv) {
  const opt = parseArgs(argv, ['detail']), api = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/api.json'), 'utf8'));
  const [k0, name] = opt._, K = api.kinds;
  if (!k0) { if (opt.json) return console.log(JSON.stringify(Object.fromEntries(Object.entries(K).map(([k, v]) => [k, v.count])))); for (const [k, v] of Object.entries(K)) console.log(`${k.padEnd(15)} ${String(v.count).padStart(3)}  ${v.entries.slice(0, 8).map(e => e.name).join(' ')}…`); console.log('\nvk list <kind> · vk list <kind> <name> · --json   (options of vk.video / vk.scene / nodes: vk list options)'); return; }
  if (k0 === 'options') { const o = name ? { [name]: api.options[name] } : api.options; if (opt.json) return console.log(JSON.stringify(o, null, 1)); for (const [g, ps] of Object.entries(o)) { console.log(`${g}:`); printParams(ps); } return; }
  const kind = ALIAS[k0] || k0, entry = K[kind];
  if (!entry) throw new Error(`unknown kind "${k0}"${suggest(k0, Object.keys(K)).length ? ` — did you mean ${suggest(k0, Object.keys(K)).join(' or ')}?` : ''}; kinds: ${Object.keys(K).join(' ')}`);
  if (name) {
    const e = entry.entries.find(e => e.name === name || (e.aliases || []).includes(name));
    if (!e) { const s = suggest(name, entry.entries.map(e => e.name)); throw new Error(`unknown ${kind} "${name}"${s.length ? ` — did you mean ${s.join(' or ')}?` : ''}`); }
    if (opt.json) return console.log(JSON.stringify(e, null, 1));
    console.log(`${kind} ${e.name}${e.aliases ? ` (aliases: ${e.aliases.join(', ')})` : ''}${e.aliasOf ? ` (alias of ${e.aliasOf})` : ''}${e.lazy ? ' [lazy]' : ''}${e.requires ? ` [requires ${e.requires}]` : ''}\n  ${e.description}`);
    if (Object.keys(e.params || {}).length) { console.log('params:'); printParams(e.params); }
    if (entry.common) { console.log('common (all ' + kind + '):'); printParams(entry.common); }
    if (e.qa && e.qa.length) console.log('qa checklist:\n' + e.qa.map(q => '  - ' + q).join('\n'));
    if (e.example) console.log('example:\n  ' + e.example);
    return;
  }
  if (opt.json || opt.detail) return console.log(JSON.stringify(opt.detail ? entry : entry.entries.map(e => e.name), null, 1));
  for (const e of entry.entries) console.log(`${e.name.padEnd(18)} ${e.aliasOf ? `→ ${e.aliasOf}` : (e.description || '').slice(0, 100)}`);
}
function printParams(ps) {
  for (const [k, p] of Object.entries(ps || {})) console.log(`  ${k.padEnd(14)} ${(p.type + (p.values ? `(${p.values.join('|')})` : '')).padEnd(22)} ${p.default !== undefined ? 'default ' + JSON.stringify(p.default) + ' ' : ''}${p.range ? `[${p.range.join('..')}] ` : ''}${p.description || ''}`);
}
