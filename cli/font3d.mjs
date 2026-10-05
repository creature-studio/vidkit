// vk font3d font.ttf [-o out.json] [--chars "abc…" | --chars-file story.txt | --latin] [--name id]
// Convert a TrueType/OpenType font to three.js typeface JSON (the FontLoader / TextGeometry / vk.three.text3d format).
// Default glyph set: ASCII + Latin-1 + common punctuation. For CJK fonts pass --chars (only the characters you
// render; a full CJK typeface would be tens of MB). Needs the optional dependency opentype.js (npm i opentype.js).
// Respect the font licence: the bundled fonts are SIL OFL 1.1 (fonts/LICENSES.md) — derived JSON stays OFL.
import { parseArgs, fs, path } from './lib.mjs';
export const LATIN = (() => { let s = ''; for (let c = 32; c < 127; c++) s += String.fromCharCode(c); for (let c = 160; c < 256; c++) s += String.fromCharCode(c); return s + '–—‘’‚“”„•…‹›€™←→↑↓·'; })();
export async function convert(file, chars, o = {}) {
  let opentype; try { opentype = (await import('opentype.js')).default || await import('opentype.js'); } catch (e) { throw new Error('vk font3d needs the optional dependency opentype.js: npm i opentype.js'); }
  const buf = fs.readFileSync(file), font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const scale = 1000 / font.unitsPerEm, r = v => Math.round(v * scale), glyphs = {}, missing = [];
  for (const ch of [...new Set([...chars])]) {
    const g = font.charToGlyph(ch); if (!g || (g.index === 0 && ch !== ' ')) { missing.push(ch); continue; }
    const cmds = g.path && g.path.commands || [], out = [];
    for (const c of cmds) {
      if (c.type === 'M') out.push('m', r(c.x), r(c.y)); else if (c.type === 'L') out.push('l', r(c.x), r(c.y));
      else if (c.type === 'Q') out.push('q', r(c.x), r(c.y), r(c.x1), r(c.y1));
      else if (c.type === 'C') out.push('b', r(c.x), r(c.y), r(c.x1), r(c.y1), r(c.x2), r(c.y2));
    }
    const bb = g.getBoundingBox ? g.getBoundingBox() : { x1: 0, x2: 0 };
    glyphs[ch] = { ha: r(g.advanceWidth || 0), x_min: r(bb.x1 || 0), x_max: r(bb.x2 || 0), o: out.join(' ') };
  }
  const name = (font.names.fontFamily && (font.names.fontFamily.en || Object.values(font.names.fontFamily)[0])) || path.basename(file);
  const json = { glyphs, familyName: name, ascender: r(font.ascender), descender: r(font.descender), underlinePosition: r((font.tables.post && font.tables.post.underlinePosition) || -100), underlineThickness: r((font.tables.post && font.tables.post.underlineThickness) || 50),
    boundingBox: { xMin: r(font.tables.head.xMin), yMin: r(font.tables.head.yMin), xMax: r(font.tables.head.xMax), yMax: r(font.tables.head.yMax) }, resolution: 1000,
    original_font_information: { format: 0, fontFamily: name, license: (font.names.license && (font.names.license.en || '')) || 'see the source font', source: path.basename(file), generator: 'vidkit vk font3d (opentype.js)' }, cssFontWeight: 'normal', cssFontStyle: 'normal' };
  return { json, missing };
}
export default async function font3d(argv) {
  const opt = parseArgs(argv), file = opt._[0]; if (!file || !fs.existsSync(file)) throw new Error('usage: vk font3d font.ttf [-o out.json] [--chars "…" | --chars-file f.txt]');
  let chars = LATIN; if (opt.chars) chars = String(opt.chars) + ' '; if (opt.charsFile) chars = fs.readFileSync(opt.charsFile, 'utf8').replace(/\s+/g, '') + ' ';
  if (opt.latin && (opt.chars || opt.charsFile)) chars += LATIN;
  const { json, missing } = await convert(file, chars);
  const out = path.resolve(opt.out || file.replace(/\.(ttf|otf)$/i, '') + '.typeface.json');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(json));
  console.log(`[vk font3d] ${Object.keys(json.glyphs).length} glyphs → ${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)` + (missing.length ? `; missing: ${missing.join('')}` : ''));
}
