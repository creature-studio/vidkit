// npm run docs → llms.txt (agent guide) · docs/api.json (full registry with schemas) · docs/vk.d.ts (types)
//   node scripts/docs.mjs --check   exit 1 if any generated file is out of date (test/agent.test.mjs runs this)
// The registry is read from the built bundles (dist/vidkit.js + dist/vidkit-three.js) in a headless page, so run
// `npm run build` first. Hand-written parts live in scripts/docs/llms.md and scripts/docs/vk.d.ts (templates).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, LAUNCH, ROOT, PKG } from '../cli/lib.mjs';

export async function collect() {
  const { server, port } = await startServer({ extra: (req, res, p) => { if (p !== '/__docs.html') return false; res.writeHead(200, { 'content-type': 'text/html' }); res.end(`<!doctype html><meta charset=utf-8><script src="${ROOT}/dist/vidkit.js"></script><script src="${ROOT}/dist/vidkit-three.js"></script>`); return true; } });
  const browser = await chromium.launch(LAUNCH);
  try {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/__docs.html`);
    const api = await page.evaluate(() => {
      const S = vk.schemas, P = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, S.param(v)]));
      const kinds = {};
      for (const k of vk.list()) {
        const entries = vk.list(k, { detail: true, all: true }).map(e => { const x = { ...e }; delete x.kind; return x; }).sort((a, b) => a.name.localeCompare(b.name));
        kinds[k] = { common: vk.commonParams(k), count: entries.length, entries };
      }
      const three = vk.three ? {
        products: Object.keys(vk.three.products).filter(n => n !== 'screenTexture'), materials: Object.keys(vk.three.materials), rigs: Object.keys(vk.three.rig).filter(n => typeof vk.three.rig[n] === 'function'),
        grades: Object.keys(vk.three.grades || {}), envs: ['studio', 'room', 'loft', '<url>.hdr'], particleTargets: ['galaxy', 'sphere', 'torus', 'cloud', '{text, font}', '{draw(g,w,h)}', '{image|asset}'],
        looks: Object.keys(vk.three.look.presets || {}), lookPasses: Object.fromEntries(Object.entries(vk.three.look.passes || {}).map(([k, v]) => [k, { doc: v.doc, defaults: v.d }])),
        dioramas: vk.three.diorama ? vk.three.diorama.kinds : [], palettes: vk.three.diorama ? Object.keys(vk.three.diorama.palettes) : [], plates: Object.keys(vk.three.plates || {}),
        fonts3d: Object.keys(vk.three.fonts3d || {}), letterPresets: vk.three.letterPresets || [], shapes: vk.three.shapes ? vk.three.shapes.names : [], ramps: Object.keys(vk.three.ramps || {}),
      } : null;
      return { version: vk.version, options: { video: P(S.COMMON.video), scene: P(S.COMMON.scene), node: P(S.COMMON.node) }, easeForms: S.EASE_FORMS, three, kinds };
    });
    if (errs.length) throw new Error('page error: ' + errs.join('; '));
    return api;
  } finally { await browser.close(); server.close(); }
}

const q = s => JSON.stringify(s);
const union = (names, open = true) => (names.length ? names.map(q).join(' | ') : 'never') + (open ? ' | (string & {})' : '');
const bare = e => !/[(]/.test(e.name);
export function render(api) {
  const N = k => (api.kinds[k] ? api.kinds[k].entries.filter(bare).map(e => e.name) : []);
  const dts = fs.readFileSync(path.join(ROOT, 'scripts/docs/vk.d.ts'), 'utf8')
    .replace('/*@VERSION@*/', api.version)
    .replace(/\/\*@NAMES:(\w+)@\*\/ *string/g, (_, k) => union(N(k), true))
    .replace('/*@THREE_PRODUCTS@*/ string', union(api.three ? api.three.products : [], false))
    .replace('/*@THREE_GRADES@*/ string', union(api.three ? api.three.grades : [], true))
    .replace('/*@THREE_LOOKS@*/ string', union(api.three ? api.three.looks || [] : [], true))
    .replace('/*@THREE_LOOK_PASSES@*/ string', union(api.three ? Object.keys(api.three.lookPasses || {}) : [], false))
    .replace('/*@THREE_DIORAMAS@*/ string', union(api.three ? api.three.dioramas || [] : [], false))
    .replace('/*@THREE_PLATES@*/ string', union(api.three ? api.three.plates || [] : [], false))
    .replace('/*@THREE_FONTS3D@*/ string', union(api.three ? api.three.fonts3d || [] : [], true))
    .replace('/*@THREE_LETTERS@*/ string', union(api.three ? api.three.letterPresets || [] : [], false));
  // llms.txt: template + a compact name index (one line per kind) — details live in docs/api.json
  const line = (k, label) => { const e = api.kinds[k]; if (!e) return ''; const names = e.entries.filter(x => bare(x) && !x.aliasOf).map(x => x.name + (x.lazy ? '' : '')); return `- ${label || k} (${names.length}): ${names.join(' ')}`; };
  const index = [line('elements', 'elements (vk.<name>(…) text / layout / raw-code nodes)'), line('fx', 'fx (entrance/exit effects)'), line('transitions'), line('textures'), line('backgrounds', 'backgrounds (bg.type)'), line('blocks', 'blocks (vk.<name>(…) element factories)'), line('themes'), line('formats'), line('styles', 'styles (style packs)'), line('eases'), line('sounds', 'sounds (sfx)'), line('materials', 'materials (style material)'), line('three', 'three (vk.three.* modules/options)'), line('threeMaterials', 'threeMaterials (vk.three.materials.*)'), line('threeRigs', 'threeRigs (vk.three.rig.*)')].filter(Boolean).join('\n');
  const llms = fs.readFileSync(path.join(ROOT, 'scripts/docs/llms.md'), 'utf8').replace('@VERSION@', api.version).replace('@INDEX@', index)
    .replace('@LOOKS@', api.three ? (api.three.looks || []).join(' ') : '').replace('@LOOK_PASSES@', api.three ? Object.keys(api.three.lookPasses || {}).join(' ') : '');
  return { 'docs/api.json': JSON.stringify(api, null, 1) + '\n', 'docs/vk.d.ts': dts, 'llms.txt': llms };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const files = render(await collect()); let stale = [];
  for (const [f, s] of Object.entries(files)) {
    const abs = path.join(ROOT, f), cur = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    if (cur === s) continue;
    if (check) stale.push(f); else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, s); console.log('wrote', f, (s.length / 1024).toFixed(1) + ' KB'); }
  }
  if (check) { if (stale.length) { console.error('out of date: ' + stale.join(', ') + ' — run npm run build && npm run docs'); process.exit(1); } console.log('docs up to date'); }
  else console.log('docs: llms.txt, docs/api.json, docs/vk.d.ts (' + PKG.version + ')');
}
