// vk style list                                   the style packs (styles/<id>/style.json)
// vk style sample <id>[,<id>…] [-o out/styles]    render each pack's 5 s sample → <id>.mp4 + <id>.png poster
// vk style gallery [-o out/styles/index.html] [--shot out/styles/gallery.png]   static gallery page (+ screenshot)
// vk style extract <image> [--id name] [--k 6] [-o out/style-extract/<id>]     palette/texture starter pack
import { parseArgs, ROOT, fs, path, run, launch, startServer, pageUrl } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import { kmeans, luma, rgb2hex, mix } from '../src/styles/color.js';

const packDir = id => path.join(ROOT, 'styles', id);
export function packs() {
  return fs.readdirSync(path.join(ROOT, 'styles')).filter(d => fs.existsSync(path.join(packDir(d), 'style.json')))
    .map(id => JSON.parse(fs.readFileSync(path.join(packDir(id), 'style.json'), 'utf8')))
    .sort((a, b) => (a.order || 99) - (b.order || 99) || a.id.localeCompare(b.id));
}
export default async function style(argv) {
  const [sub, ...rest] = argv, opt = parseArgs(rest);
  if (sub === 'list' || !sub) { for (const p of packs()) console.log(`${p.id.padEnd(10)} ${p.name}  ${p.en}  — ${p.description}`); return; }
  if (sub === 'sample') return sample(opt);
  if (sub === 'gallery') return gallery(opt);
  if (sub === 'extract') return extract(opt);
  throw new Error('usage: vk style list | sample <id> | gallery | extract <image>');
}
async function sample(opt) {
  const ids = (opt._[0] ? String(opt._[0]).split(',') : packs().map(p => p.id)), dir = path.resolve(opt.out || path.join(ROOT, 'out/styles'));
  fs.mkdirSync(dir, { recursive: true });
  const { default: render } = await import('./render.mjs');
  for (const id of ids) {
    const t0 = Date.now(), mp4 = path.join(dir, id + '.mp4');
    await render([path.join(packDir(id), 'preview.html'), '-o', mp4]);
    const pj = path.join(packDir(id), 'style.json'), posterT = opt.poster || (fs.existsSync(pj) && JSON.parse(fs.readFileSync(pj, 'utf8')).poster) || 1.7;  // style.json may set its own poster time
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(posterT), '-i', mp4, '-frames:v', '1', path.join(dir, id + '.png')]);
    console.log(`[vk style] ${id}: ${((Date.now() - t0) / 1000).toFixed(1)} s → ${path.relative(process.cwd(), mp4)} + poster`);
  }
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function gallery(opt) {
  const out = path.resolve(opt.out || path.join(ROOT, 'out/styles/index.html')), dir = path.dirname(out), P = packs();
  fs.mkdirSync(dir, { recursive: true });
  const card = p => {
    const sw = ['sky0', 'sky1', 'far', 'mid', 'ground'].map(k => p.palette[k]).concat(['red', 'gold', 'blue', 'green'].map(k => p.hues[k]));
    const has = f => fs.existsSync(path.join(dir, f));
    return `<article class="card">
  <div class="media">${has(p.id + '.mp4') ? `<video src="${p.id}.mp4" poster="${p.id}.png" autoplay muted loop playsinline></video>` : has(p.id + '.png') ? `<img src="${p.id}.png" alt="">` : '<div class="missing">vk style sample ' + p.id + '</div>'}</div>
  <div class="body">
    <h2>${esc(p.name)} <span>${esc(p.en)}</span><code class="id">${esc(p.id)}</code></h2>
    <p>${esc(p.description)}</p>
    <div class="sw">${sw.map(c => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
    <div class="tags">${(p.tags || []).map(t => `<b>${esc(t)}</b>`).join('')}<b class="m">${esc(p.material)}</b><b class="m">${esc((p.transitions || {}).default)}</b></div>
    <pre>${p.requires ? p.requires.map(r => `&lt;script src="${esc(r)}"&gt;`).join('\n') + '\n' : ''}vk.video({ style: '${esc(p.id)}' })
${p.requires ? `sc.three(vk.three.turntable(v.style.base.stage3d.turntable({…})))` : `vk make --style ${esc(p.id)} --story story.md -o examples/my-film/`}</pre>
  </div>
</article>`;
  };
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
.body p { margin: 4px 0 10px; color: #cfc8b8; min-height: 2.9em; }
.sw { display: flex; gap: 4px; margin-bottom: 8px; } .sw i { width: 26px; height: 16px; border-radius: 3px; border: 1px solid #0006; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; } .tags b { font: 500 11.5px 'Noto Sans SC'; background: #2c281f; color: #bdb4a0; padding: 2px 7px; border-radius: 99px; } .tags b.m { color: #f2c46d; }
pre { margin: 0; background: #0f0e0b; color: #9fd4a8; padding: 9px 12px; border-radius: 6px; font: 12.5px/1.5 ui-monospace, monospace; overflow: auto; }
</style></head>
<body>
<header><h1>vidkit 风格库 · style library</h1>
<p>${P.length} style packs · each sample is the same 5 s script (title + character + effect + transition; 3D packs: their own WebGL sample) · combine roles: <code>vk.video({ style: ['ink', 'papercut.chars'] })</code></p></header>
<main>
${P.map(card).join('\n')}
</main>
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
// ---- palette / texture extraction (simple and honest: k-means colours + a high-pass grain estimate) ----
function decode(file, w) {
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim().split(',').map(Number);
  const h = Math.max(1, Math.round(w * probe[1] / probe[0]));
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}:flags=area`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  return { w, h, buf };
}
export function grainEstimate({ w, h, buf }) {
  // mean |luma − 3×3 box blur| in 0..255 units → texture amount (paper/film grain/brush texture), plus edge density
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
  const base = JSON.parse(fs.readFileSync(path.join(packDir('tech'), 'style.json'), 'utf8'));
  const pack = {
    id, name: id, en: 'extracted from ' + path.basename(file), description: `Starter pack derived from ${path.basename(file)}: ${k}-colour k-means palette, grain ≈ ${G.grain.toFixed(1)} (mean high-pass luma), edge density ${(G.edgeDensity * 100).toFixed(1)}%. Hand-tune before use.`,
    tags: ['extracted', 'starter'], theme: { extends: luma(pal.paper) > .5 ? 'editorial' : 'tech-blue' }, palette: pal.palette,
    hues: { ...base.hues, ink: pal.ink, black: pal.ink, white: pal.paper, cream: mix(pal.paper, pal.accent, .12), red: pal.accent, gold: pal.accent2 },
    material, P: { line: pal.ink }, video: { texture, fadeOut: .6 }, transitions: { default: 'fade:0.6', soft: 'fade:0.9', strong: 'wipe-left:0.5' },
    typography: { title: 'theme default', subtitle: 'theme default' }, sound: base.sound, pacing: base.pacing, camera: base.camera, characters: { notes: 'generic puppet in the ' + material + ' material' },
    effects: {}, demo: { setting: 'field day clouds', setting2: 'village day', title: id, sub: 'extracted style' },
    qa: ['palette reads like the reference (compare side by side)', 'text contrast ≥ 4.5:1 on titles and captions', 'texture amount matches the reference grain', 'replace the generic world/title/effect hooks in style.js'],
    extracted: { from: path.basename(file), k, clusters: C.map(c => ({ hex: c.hex, share: +c.share.toFixed(3) })), grain: +G.grain.toFixed(2), edgeDensity: +G.edgeDensity.toFixed(4) },
  };
  const dir = path.resolve(opt.out || path.join(ROOT, 'out/style-extract', id)); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'style.json'), JSON.stringify(pack, null, 1));
  fs.writeFileSync(path.join(dir, 'style.js'), `// starter runtime for the extracted "${id}" pack: fill in world/decorate/title/effect/music hooks (see styles/ink/style.js)\nexport default vk => ({});\n`);
  const sw = C.map((c, i) => `<rect x="${i * 100}" y="0" width="100" height="100" fill="${c.hex}"/><text x="${i * 100 + 50}" y="122" font-size="13" text-anchor="middle" font-family="monospace">${c.hex} ${(c.share * 100).toFixed(0)}%</text>`).join('');
  fs.writeFileSync(path.join(dir, 'palette.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="${C.length * 100}" height="132" style="background:#fff">${sw}</svg>`);
  console.log(`[vk style] ${id}: palette ${C.map(c => c.hex + ' ' + (c.share * 100).toFixed(0) + '%').join(', ')} · grain ${G.grain.toFixed(1)} · edges ${(G.edgeDensity * 100).toFixed(1)}% → material ${material}\n  → ${path.relative(process.cwd(), dir)}/style.json, style.js, palette.svg (copy into styles/${id}/ and add it to src/styles/packs.js, or load it at runtime with vk.style.register(json, vk => ({})))`);
}
