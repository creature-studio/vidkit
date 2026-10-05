// vk style list | sample | gallery | extract | new | mix | fork
// Open style system (v2): packs live in styles/<id>/ and load at runtime (no packs.js rebuild).
import { parseArgs, ROOT, fs, path, run, launch, startServer, pageUrl } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import { kmeans, luma, rgb2hex, mix } from '../src/styles/color.js';
import { normalizeStyle, validateStyle, mixStyles, forkStyle, matchBaseFromPrompt } from '../src/styles/schema.js';
import { writeManifest, discoverStyleIds, readStyleJson } from '../src/styles/loader.js';

const packDir = id => path.join(ROOT, 'styles', id);
export function packs() {
  writeManifest(fs, path, ROOT);
  return fs.readdirSync(path.join(ROOT, 'styles')).filter(d => fs.existsSync(path.join(packDir(d), 'style.json')))
    .map(id => normalizeStyle(JSON.parse(fs.readFileSync(path.join(packDir(id), 'style.json'), 'utf8'))))
    .sort((a, b) => (a.order || 99) - (b.order || 99) || a.id.localeCompare(b.id));
}
export default async function style(argv) {
  const [sub, ...rest] = argv, opt = parseArgs(rest, ['force', 'no-peek', 'no-3d', 'json']);
  if (sub === 'list' || !sub) {
    for (const p of packs()) {
      const lin = (p.lineage && p.lineage.parents && p.lineage.parents.length)
        ? ` ← ${p.lineage.parents.join('+')}` : '';
      const cost = (p.renderCost && p.renderCost.tier) || '?';
      console.log(`${p.id.padEnd(14)} ${String(p.name).padEnd(10)} ${p.en}  [${cost}]${lin}  — ${p.description}`);
    }
    return;
  }
  if (sub === 'sample') return sample(opt);
  if (sub === 'gallery') return gallery(opt);
  if (sub === 'extract') return extract(opt);
  if (sub === 'new') return styleNew(opt);
  if (sub === 'mix') return styleMix(opt);
  if (sub === 'fork') return styleFork(opt);
  throw new Error('usage: vk style list | sample | gallery | extract <img> | new --from "…" | new --ref img | mix a b --w .6 | fork <id>');
}

async function sample(opt) {
  const ids = (opt._[0] ? String(opt._[0]).split(',') : packs().map(p => p.id)), dir = path.resolve(opt.out || path.join(ROOT, 'out/styles'));
  fs.mkdirSync(dir, { recursive: true });
  const { default: render } = await import('./render.mjs');
  for (const id of ids) {
    const t0 = Date.now(), mp4 = path.join(dir, id + '.mp4');
    await render([path.join(packDir(id), 'preview.html'), '-o', mp4, ...(opt.draft ? ['--draft'] : [])]);
    const pj = path.join(packDir(id), 'style.json'), posterT = opt.poster || (fs.existsSync(pj) && JSON.parse(fs.readFileSync(pj, 'utf8')).poster) || 1.7;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(posterT), '-i', mp4, '-frames:v', '1', path.join(dir, id + '.png')]);
    console.log(`[vk style] ${id}: ${((Date.now() - t0) / 1000).toFixed(1)} s → ${path.relative(process.cwd(), mp4)} + poster`);
  }
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function gallery(opt) {
  const out = path.resolve(opt.out || path.join(ROOT, 'out/styles/index.html')), dir = path.dirname(out), P = packs();
  fs.mkdirSync(dir, { recursive: true });
  const recipes = listRecipes();
  const card = p => {
    const sw = ['sky0', 'sky1', 'far', 'mid', 'ground'].map(k => p.palette[k]).concat(['red', 'gold', 'blue', 'green'].map(k => (p.hues || {})[k]).filter(Boolean));
    const has = f => fs.existsSync(path.join(dir, f));
    const lin = (p.lineage && p.lineage.parents && p.lineage.parents.length)
      ? `<div class="lin">lineage: ${p.lineage.parents.map(esc).join(' + ')}${p.lineage.weights && p.lineage.weights.length ? ` (${p.lineage.weights.map(w => (+w).toFixed(2)).join('/')})` : ''} · ${esc(p.lineage.note || '')}</div>` : '';
    const cost = p.renderCost || {};
    const rtags = (p.tags || []).concat(recipes.filter(r => (r.styles || []).includes(p.id)).flatMap(r => r.tags || [])).slice(0, 12);
    return `<article class="card">
  <div class="media">${has(p.id + '.mp4') ? `<video src="${p.id}.mp4" poster="${p.id}.png" autoplay muted loop playsinline></video>` : has(p.id + '.png') ? `<img src="${p.id}.png" alt="">` : '<div class="missing">vk style sample ' + p.id + '</div>'}</div>
  <div class="body">
    <h2>${esc(p.name)} <span>${esc(p.en)}</span><code class="id">${esc(p.id)}</code></h2>
    <p>${esc(p.description)}</p>
    ${lin}
    <div class="meta"><b class="cost">${esc(cost.tier || '?')}</b>${(cost.modules || []).map(m => `<b>${esc(m)}</b>`).join('')}<span class="costn">${esc(cost.notes || '')}</span></div>
    <div class="sw">${sw.map(c => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
    <div class="tags">${rtags.map(t => `<b>${esc(t)}</b>`).join('')}<b class="m">${esc(p.material)}</b><b class="m">${esc((p.transitions || {}).default)}</b></div>
    <pre>${p.requires ? p.requires.map(r => `&lt;script src="${esc(r)}"&gt;`).join('\n') + '\n' : ''}vk.video({ style: '${esc(p.id)}' })
${p.requires ? `sc.three(vk.three.turntable(v.style.base.stage3d.turntable({…})))` : `vk make --style ${esc(p.id)} --story story.md -o examples/my-film/`}</pre>
  </div>
</article>`;
  };
  const recipeBlock = recipes.length ? `<section class="recipes"><h2>recipes</h2>
  <ul>${recipes.map(r => `<li><a href="../../recipes/${esc(r.file)}">${esc(r.title || r.id)}</a> · <b class="cost">${esc(r.cost || '?')}</b> ${(r.tags || []).map(t => `<b>${esc(t)}</b>`).join('')} · modules: ${(r.modules || []).map(esc).join(', ')}</li>`).join('\n')}</ul></section>` : '';
  fs.writeFileSync(out, `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>vidkit 风格库 · style library</title>
<style>
@font-face { font-family: 'Noto Serif SC'; src: url('${path.relative(dir, path.join(ROOT, 'fonts/NotoSerifSC-VF.ttf')).split(path.sep).join('/')}'); font-weight: 200 900; }
@font-face { font-family: 'Noto Sans SC'; src: url('${path.relative(dir, path.join(ROOT, 'fonts/NotoSansSC-VF.ttf')).split(path.sep).join('/')}'); font-weight: 100 900; }
:root { color-scheme: dark; }
body { margin: 0; background: #14130f; color: #ece6d8; font: 15px/1.45 'Noto Sans SC', sans-serif; }
header { padding: 34px 48px 8px; } header h1 { font: 700 34px 'Noto Serif SC', serif; margin: 0 0 6px; letter-spacing: .04em; }
header p { margin: 0; color: #a59f90; } header code { color: #f2c46d; }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(560px, 1fr)); gap: 26px; padding: 22px 48px 48px; }
.card { background: #1f1d18; border: 1px solid #34302699; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 24px #0007; }
.media { aspect-ratio: 16/9; background: #000; } .media video, .media img { width: 100%; height: 100%; display: block; object-fit: cover; }
.missing { color: #777; display: grid; place-items: center; height: 100%; font-family: monospace; }
.body { padding: 14px 18px 16px; } h2 { margin: 0 0 4px; font: 700 22px 'Noto Serif SC', serif; } h2 span { font: 500 14px 'Noto Sans SC'; color: #a59f90; margin-left: 8px; }
.id { float: right; font: 13px ui-monospace, monospace; color: #f2c46d; background: #2c281f; padding: 2px 8px; border-radius: 4px; }
.body p { margin: 4px 0 8px; color: #cfc8b8; min-height: 2.9em; }
.lin { font: 12.5px ui-monospace, monospace; color: #9fd4a8; margin: 0 0 8px; }
.meta { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 8px; } .meta .cost { background: #3a2f14; color: #f2c46d; } .costn { color: #8a8374; font-size: 12px; margin-left: 6px; }
.sw { display: flex; gap: 4px; margin-bottom: 8px; } .sw i { width: 26px; height: 16px; border-radius: 3px; border: 1px solid #0006; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; } .tags b, .meta b, .recipes b { font: 500 11.5px 'Noto Sans SC'; background: #2c281f; color: #bdb4a0; padding: 2px 7px; border-radius: 99px; } .tags b.m { color: #f2c46d; }
pre { margin: 0; background: #0f0e0b; color: #9fd4a8; padding: 9px 12px; border-radius: 6px; font: 12.5px/1.5 ui-monospace, monospace; overflow: auto; }
.recipes { padding: 0 48px 48px; } .recipes h2 { font: 700 22px 'Noto Serif SC'; } .recipes ul { list-style: none; padding: 0; } .recipes li { margin: 8px 0; color: #cfc8b8; } .recipes a { color: #f2c46d; }
</style></head>
<body>
<header><h1>vidkit 风格库 · style library</h1>
<p>${P.length} style packs (schema v2) · lineage + render cost on each card · combine roles: <code>vk.video({ style: ['ink', 'papercut.chars'] })</code> · new packs: <code>vk style new --from "…"</code> (scaffold + peek, not magic)</p></header>
<main>
${P.map(card).join('\n')}
</main>
${recipeBlock}
</body></html>
`);
  console.log('[vk style] gallery →', path.relative(process.cwd(), out));
  const shot = opt.shot === undefined ? path.join(dir, 'gallery.png') : opt.shot;
  if (shot && shot !== 'false') {
    const { server, port } = await startServer(), browser = await launch(), pg = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await pg.goto(pageUrl(port, out, {})); await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
    await pg.waitForTimeout(800);
    await pg.screenshot({ path: path.resolve(shot), fullPage: true }); await browser.close(); server.close();
    console.log('[vk style] screenshot →', path.relative(process.cwd(), path.resolve(shot)), '(headless Chromium has no H.264: cards show the poster frames)');
  }
}

function listRecipes() {
  const dir = path.join(ROOT, 'recipes');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(file => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const fm = parseFrontMatter(raw);
    return { file, id: fm.id || file.replace(/\.html$/, ''), title: fm.title, tags: fm.tags || [], modules: fm.modules || [], styles: fm.styles || [], cost: fm.cost || fm.renderCost || '?', ...fm };
  }).sort((a, b) => String(a.id).localeCompare(b.id));
}
function parseFrontMatter(html) {
  const m = html.match(/<!--\s*vk-recipe\s*([\s\S]*?)-->/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\n/)) {
    const mm = /^\s*([\w-]+)\s*:\s*(.+?)\s*$/.exec(line);
    if (!mm) continue;
    const k = mm[1], v = mm[2];
    if (v.startsWith('[') && v.endsWith(']')) out[k] = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    else out[k] = v;
  }
  return out;
}

function scaffoldRuntime(id, baseId) {
  return `// Scaffolded runtime for "${id}" (from base "${baseId}"). Honest starter: reuse the base pack's hooks via composition.
// Edit hooks / title / effect / music; \`vk style new\` only fills schema + this shell + peek checks — not a magic look transfer.
import base from '../${baseId}/style.js';
export default vk => {
  const B = base(vk);
  return {
    ...B,
    // override examples:
    // title(sc, text, o = {}, S) { return B.title(sc, text, o, S); },
    // effect(sc, name, o = {}, S) { return B.effect(sc, name, o, S); },
  };
};
`;
}
function scaffoldPreview(id, { three = false } = {}) {
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>${id} · vidkit style pack preview</title></head>
<body>
<script src="../../dist/vidkit.js"></script>
${three ? '<script src="../../dist/vidkit-three.js"></script>\n' : ''}<script src="../demo.js"></script>
<script>
const q = new URLSearchParams(location.search).get('style');
vkStyleDemo(q ? q.split(',') : '${id}');
</script>
</body>
</html>
`;
}
function writePack(id, data, { baseId = 'tech', force = false, three = false } = {}) {
  const dir = packDir(id);
  if (fs.existsSync(dir) && !force) throw new Error(`styles/${id}/ exists (pass --force)`);
  fs.mkdirSync(dir, { recursive: true });
  const n = normalizeStyle({ ...data, id });
  const v = validateStyle(n);
  if (!v.ok) throw new Error('invalid style: ' + v.errors.join('; '));
  fs.writeFileSync(path.join(dir, 'style.json'), JSON.stringify(v.data, null, 2) + '\n');
  if (!fs.existsSync(path.join(dir, 'style.js')) || force) fs.writeFileSync(path.join(dir, 'style.js'), scaffoldRuntime(id, baseId));
  if (!fs.existsSync(path.join(dir, 'preview.html')) || force) fs.writeFileSync(path.join(dir, 'preview.html'), scaffoldPreview(id, { three }));
  writeManifest(fs, path, ROOT);
  return v.data;
}

async function peekLoop(id, { tries = 2, draft = true } = {}) {
  const { default: peek } = await import('./peek.mjs');
  const outDir = path.join(ROOT, 'out', 'style-new', id);
  fs.mkdirSync(outDir, { recursive: true });
  const args = [path.join(packDir(id), 'preview.html'), '-o', outDir, '--at', '1,2.5', ...(draft ? ['--draft'] : [])];
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      await peek(args);
      const report = JSON.parse(fs.readFileSync(path.join(outDir, 'peek.json'), 'utf8'));
      last = report;
      const issues = report.issues || [];
      if (report.ok === true || issues.length === 0) return { ok: true, report, outDir, tries: i + 1 };
      console.warn(`[vk style new] peek try ${i + 1}: issues remain`);
    } catch (e) {
      last = { error: e.message };
      console.warn(`[vk style new] peek try ${i + 1} failed:`, e.message);
    }
  }
  return { ok: false, report: last, outDir, tries };
}

async function styleNew(opt) {
  const from = opt.from, ref = opt.ref || opt._[0];
  if (!from && !ref) throw new Error('usage: vk style new --from "short description" | --ref image.png [--id slug] [--force]');
  let id = opt.id, baseId = 'tech', data;
  if (ref && fs.existsSync(ref)) {
    // reuse extract pipeline into styles/<id>/
    const tmp = path.join(ROOT, 'out', 'style-extract', '_new_tmp');
    await extract({ _: [ref], id: id || 'extracted', k: opt.k || 6, out: tmp });
    const extracted = normalizeStyle(JSON.parse(fs.readFileSync(path.join(tmp, 'style.json'), 'utf8')));
    id = id || extracted.id;
    baseId = matchBaseFromPrompt(extracted.description || '') || 'tech';
    data = {
      ...extracted,
      id,
      name: opt.name || extracted.name || id,
      en: opt.en || extracted.en,
      description: (from ? from + ' · ' : '') + extracted.description,
      lineage: { parents: [baseId], weights: [1], note: `vk style new --ref ${path.basename(ref)} (palette/grain extract + base ${baseId} runtime)` },
      fonts: extracted.fonts && extracted.fonts.length ? extracted.fonts : readStyleJson(fs, path, ROOT, baseId).fonts,
      look: readStyleJson(fs, path, ROOT, baseId).look,
    };
  } else {
    baseId = matchBaseFromPrompt(from);
    const base = readStyleJson(fs, path, ROOT, baseId);
    id = id || slugFromPrompt(from);
    data = {
      ...structuredClone(base),
      id,
      name: opt.name || from.slice(0, 12),
      en: opt.en || from,
      description: `${from} — scaffolded from base "${baseId}" via keyword match. Hand-tune palette/hooks; generation is scaffolding + peek checks, not magic.`,
      tags: [...new Set([...(base.tags || []), 'scaffolded', 'from-prompt'])],
      lineage: { parents: [baseId], weights: [1], note: `vk style new --from ${JSON.stringify(from)} → base ${baseId}` },
      order: (base.order || 50) + 20,
    };
  }
  const three = !!(data.requires && data.requires.length) || baseId === 'three-tech';
  writePack(id, data, { baseId, force: !!opt.force, three });
  console.log(`[vk style new] wrote styles/${id}/ (base=${baseId}, schema v2). Honest scaffold — edit style.js for a real look.`);
  if (opt.noPeek) return;
  const peek = await peekLoop(id, { tries: 2, draft: true });
  if (peek.ok) console.log(`[vk style new] peek OK → ${path.relative(process.cwd(), peek.outDir)} (${peek.tries} try)`);
  else {
    console.log(`[vk style new] peek remaining issues → ${path.relative(process.cwd(), peek.outDir)}`);
    if (peek.report) console.log(JSON.stringify(peek.report.errors || peek.report, null, 2).slice(0, 1200));
  }
  // optional 3D sample plate when look / three available
  if (!opt.no3d && (data.look || three)) {
    try {
      await write3dSample(id, data);
    } catch (e) { console.warn('[vk style new] 3D sample skipped:', e.message); }
  }
}

function slugFromPrompt(s) {
  const map = { '水墨': 'inkish', '剪纸': 'cutpaper', '霓虹': 'neonish', '像素': 'pixely', '皮影': 'shadowy', '科技': 'techy', '蜡笔': 'waxy', '京剧': 'operatic', '胶片': 'filmy', '蓝': 'lan', '红': 'hong', '金': 'jin', '夜': 'ye', '春': 'chun', '海': 'hai', '山': 'shan', '城': 'cheng', '梦': 'meng', '光': 'guang', '纸': 'zhi', '新': 'xin' };
  let t = String(s);
  for (const [a, b] of Object.entries(map)) t = t.split(a).join(b + '-');
  t = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!t || !/^[a-z]/.test(t)) t = 'style-' + (t || 'x');
  return t.slice(0, 28);
}

async function write3dSample(id, data) {
  const dir = packDir(id);
  const look = data.look || (data.tags || []).includes('ink') ? 'ink' : null;
  if (!look) return;
  const html = `<!doctype html><html><head><meta charset=utf-8><title>${id} 3d sample</title></head><body>
<script src="../../dist/vidkit.js"></script><script src="../../dist/vidkit-three.js"></script>
<script>
const v = vk.video({ fps: 30, theme: 'editorial' });
vk.scene('s', 3, {}, sc => {
  sc.three(vk.three.terrain({ type: 'hills', colors: 'ink', size: 8, height: 1.2 }), {
    background: 0xe8e4d8, camera: vk.three.rig.orbit({ radius: 9, height: 3, dur: 3 }),
    post: { look: ${JSON.stringify(look)} }
  });
});
</script></body></html>`;
  const sample = path.join(dir, 'sample3d.html');
  fs.writeFileSync(sample, html);
  const { default: peek } = await import('./peek.mjs');
  await peek([sample, '-o', path.join(ROOT, 'out', 'style-new', id + '-3d'), '--draft', '--at', '1']);
  console.log(`[vk style new] 3D sample peek → out/style-new/${id}-3d`);
}

async function styleMix(opt) {
  const a = opt._[0], b = opt._[1]; if (!a || !b) throw new Error('usage: vk style mix <a> <b> [--w .6] [--id slug] [--force]');
  const w = opt.w != null ? +opt.w : .5;
  const A = readStyleJson(fs, path, ROOT, a), B = readStyleJson(fs, path, ROOT, b);
  const id = opt.id || `${a}-x-${b}`.slice(0, 32);
  const mixed = mixStyles(A, B, w, { id, note: opt.note || `vk style mix ${a} ${b} --w ${w}` });
  // runtime: prefer heavier-weight parent's style.js
  const baseId = w < .5 ? a : b;
  writePack(id, mixed, { baseId, force: !!opt.force });
  console.log(`[vk style mix] ${a}×${b} w=${w} → styles/${id}/ lineage=${JSON.stringify(mixed.lineage)}`);
  if (!opt.noPeek) await peekLoop(id, { tries: 1 });
}

async function styleFork(opt) {
  const src = opt._[0]; if (!src) throw new Error('usage: vk style fork <id> [--id new-id] [--force]');
  const A = readStyleJson(fs, path, ROOT, src);
  const id = opt.id || `${src}-fork`;
  const forked = forkStyle(A, { id, note: opt.note || `vk style fork ${src}` });
  writePack(id, forked, { baseId: src, force: !!opt.force });
  console.log(`[vk style fork] ${src} → styles/${id}/`);
}

// ---- palette / texture extraction (simple and honest: k-means colours + a high-pass grain estimate) ----
function decode(file, w) {
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim().split(',').map(Number);
  const h = Math.max(1, Math.round(w * probe[1] / probe[0]));
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}:flags=area`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  return { w, h, buf };
}
export function grainEstimate({ w, h, buf }) {
  const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = .2126 * buf[3 * i] + .7152 * buf[3 * i + 1] + .0722 * buf[3 * i + 2];
  let hp = 0, n = 0, edges = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += L[(y + dy) * w + x + dx];
    const d = Math.abs(L[y * w + x] - s / 9); if (d > 18) edges++; else { hp += d; n++; }
  }
  return { grain: n ? hp / n : 0, edgeDensity: edges / Math.max(1, (w - 2) * (h - 2)) };
}
export function starterPalette(clusters) {
  const by = clusters.slice().sort((a, b) => luma(b.hex) - luma(a.hex)), light = by[0].hex, dark = by[by.length - 1].hex;
  const sat = c => { const [r, g, b] = c.rgb; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
  const vivid = clusters.slice().sort((a, b) => sat(b) * Math.sqrt(b.share) - sat(a) * Math.sqrt(a.share));
  const mids = by.slice(1, -1); const m = i => (mids[i] || mids[mids.length - 1] || by[0]).hex;
  return {
    palette: { sky0: light, sky1: mix(light, m(0), .35), far: m(0), mid: m(Math.min(1, mids.length - 1)), ground: m(Math.max(0, mids.length - 1)), ground2: mix(m(Math.max(0, mids.length - 1)), dark, .3), leaf: m(Math.min(1, mids.length - 1)), trunk: mix(dark, m(0), .3), line: dark },
    accent: vivid[0].hex, accent2: (vivid[1] || vivid[0]).hex, ink: dark, paper: light,
  };
}
async function extract(opt) {
  const file = opt._[0]; if (!file || !fs.existsSync(file)) throw new Error('usage: vk style extract <image> [--id name] [--k 6] [-o dir]');
  const id = opt.id || path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'extracted';
  const k = +(opt.k || 6), small = decode(file, 96), big = decode(file, 384);
  const px = []; for (let i = 0; i < small.w * small.h; i++) px.push([small.buf[3 * i], small.buf[3 * i + 1], small.buf[3 * i + 2]]);
  const C = kmeans(px, k, { seed: 7, iter: 20 }), G = grainEstimate(big), pal = starterPalette(C);
  const texture = G.grain > 6 ? { grain: { amount: +Math.min(1, G.grain / 16).toFixed(2) } } : G.grain > 3 ? { rice: { amount: +(G.grain / 12).toFixed(2) } } : {};
  const material = G.edgeDensity > .12 ? 'crayon' : G.grain > 6 ? 'cut' : 'flat';
  const base = normalizeStyle(JSON.parse(fs.readFileSync(path.join(packDir('tech'), 'style.json'), 'utf8')));
  const pack = normalizeStyle({
    id, name: id, en: 'extracted from ' + path.basename(file), description: `Starter pack derived from ${path.basename(file)}: ${k}-colour k-means palette, grain ≈ ${G.grain.toFixed(1)} (mean high-pass luma), edge density ${(G.edgeDensity * 100).toFixed(1)}%. Hand-tune before use.`,
    tags: ['extracted', 'starter'], theme: { extends: luma(pal.paper) > .5 ? 'editorial' : 'tech-blue' }, palette: { ...base.palette, ...pal.palette, accent: pal.accent },
    hues: { ...base.hues, ink: pal.ink, black: pal.ink, white: pal.paper, cream: mix(pal.paper, pal.accent, .12), red: pal.accent, gold: pal.accent2 },
    fonts: base.fonts, materials: { world: material, chars: material }, material, P: { line: pal.ink }, video: { texture, fadeOut: .6 },
    motion: { grammar: 'starter pacing from tech', pacing: base.pacing, camera: base.camera, transitions: { default: 'fade:0.6', soft: 'fade:0.9', strong: 'wipe-left:0.5' } },
    look: null, sound: base.sound, characters: { material, notes: 'generic puppet in the ' + material + ' material' },
    effects: {}, demo: { setting: 'field day clouds', setting2: 'village day', title: id, sub: 'extracted style' },
    qa: ['palette reads like the reference (compare side by side)', 'text contrast ≥ 4.5:1 on titles and captions', 'texture amount matches the reference grain', 'replace the generic world/title/effect hooks in style.js'],
    lineage: { parents: ['tech'], weights: [1], note: 'extracted starter' },
    renderCost: { tier: 'low', modules: ['svg'], notes: 'extracted scaffold' },
    extracted: { from: path.basename(file), k, clusters: C.map(c => ({ hex: c.hex, share: +c.share.toFixed(3) })), grain: +G.grain.toFixed(2), edgeDensity: +G.edgeDensity.toFixed(4) },
  });
  const dir = path.resolve(opt.out || path.join(ROOT, 'out/style-extract', id)); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'style.json'), JSON.stringify(pack, null, 2));
  fs.writeFileSync(path.join(dir, 'style.js'), `// starter runtime for the extracted "${id}" pack: fill in world/decorate/title/effect/music hooks (see styles/ink/style.js)\nexport default vk => ({});\n`);
  const sw = C.map((c, i) => `<rect x="${i * 100}" y="0" width="100" height="100" fill="${c.hex}"/><text x="${i * 100 + 50}" y="122" font-size="13" text-anchor="middle" font-family="monospace">${c.hex} ${(c.share * 100).toFixed(0)}%</text>`).join('');
  fs.writeFileSync(path.join(dir, 'palette.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="${C.length * 100}" height="132" style="background:#fff">${sw}</svg>`);
  console.log(`[vk style] ${id}: palette ${C.map(c => c.hex + ' ' + (c.share * 100).toFixed(0) + '%').join(', ')} · grain ${G.grain.toFixed(1)} · edges ${(G.edgeDensity * 100).toFixed(1)}% → material ${material}\n  → ${path.relative(process.cwd(), dir)}/style.json, style.js, palette.svg (copy into styles/${id}/ or use vk style new --ref; runtime-loaded, no packs.js rebuild)`);
}
