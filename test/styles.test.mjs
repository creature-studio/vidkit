// Style library: geometry, colour / k-means, setting parser, style-pack data, combination rules, transitions, music bed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as G from '../src/styles/geom.js';
import { kmeans, mix, hex2rgb, nearest, luma } from '../src/styles/color.js';
import { parseSetting } from '../src/styles/world.js';
import { registerStyle, resolveParts, parseToken, Style, STYLES, ROLES } from '../src/styles/index.js';
import { normalizeStyle, mixStyles, forkStyle, matchBaseFromPrompt, validateStyle } from '../src/styles/schema.js';
import { tearEdge, pixelCols, scallop } from '../src/styles/transitions.js';
import { bed, scaleNotes } from '../src/styles/sound.js';
import { MATERIALS } from '../src/styles/materials.js';
import '../src/fx/ink.js';   // registers the ink theme some packs extend

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const packs = fs.readdirSync(path.join(ROOT, 'styles')).filter(d => fs.existsSync(path.join(ROOT, 'styles', d, 'style.json')));
const data = Object.fromEntries(packs.map(id => [id, normalizeStyle(JSON.parse(fs.readFileSync(path.join(ROOT, 'styles', id, 'style.json'), 'utf8')))]));
packs.forEach(id => registerStyle(data[id], {}));

test('geom: shapes, bbox/area, wobble keeps the outline close, resample spacing', () => {
  const r = G.rect(0, 0, 100, 50); close(Math.abs(G.area(r)), 5000); assert.deepEqual(G.bbox(r), [0, 0, 100, 50]);
  const e = G.ellipse(0, 0, 10, 10, 0, 64); close(Math.abs(G.area(e)), Math.PI * 100, 2);
  const w = G.wobble(G.rect(0, 0, 100, 100), { amp: 1, step: 5, seed: 3 }); const b = G.bbox(w); assert.ok(b[0] > -3 && b[2] < 103);
  assert.deepEqual(G.wobble(r, { seed: 3 }), G.wobble(r, { seed: 3 }));
  const rs = G.resample([[0, 0], [100, 0]], 10, false); assert.ok(rs.length >= 10);
  assert.match(G.polyD(r), /^M0 0 L100 0 L100 50 L0 50 Z$/);
});
test('color: mix / nearest / luma, deterministic k-means finds the clusters', () => {
  assert.equal(mix('#000000', '#ffffff', .5), '#808080'); assert.deepEqual(hex2rgb('#ff8000'), [255, 128, 0]);
  assert.equal(nearest('#f01010', ['#00ff00', '#ff0000', '#0000ff']), '#ff0000'); assert.ok(luma('#ffffff') > .99);
  const px = []; for (let i = 0; i < 300; i++) px.push(i % 3 === 0 ? [250, 10 + i % 7, 10] : i % 3 === 1 ? [10, 240, 12 + i % 5] : [20, 20, 230 - i % 9]);
  const a = kmeans(px, 3, { seed: 2 }), b = kmeans(px, 3, { seed: 2 });
  assert.deepEqual(a, b);
  const hexes = a.map(c => c.hex || c.color || c); assert.equal(hexes.length, 3);
});
test('parseSetting: english + chinese words, unknown words ignored', () => {
  assert.deepEqual(parseSetting('mountain dusk moon pine'), { place: 'mountain', time: 'dusk', props: ['moon', 'pine'], seed: 1 });
  const z = parseSetting('山 黄昏 月亮 松'); assert.equal(z.place, 'mountain'); assert.equal(z.time, 'dusk'); assert.deepEqual(z.props, ['moon', 'pine']);
  assert.equal(parseSetting('').place, 'field'); assert.equal(parseSetting({ place: 'city' }).time, 'day');
});
test('style packs: every style.json is complete and uses a known material', () => {
  assert.ok(packs.length >= 6, 'at least 6 packs');
  const need = ['id', 'name', 'en', 'description', 'theme', 'palette', 'hues', 'material', 'transitions', 'typography', 'sound', 'pacing', 'camera', 'characters', 'effects', 'demo', 'qa'];
  for (const id of packs) {
    const d = data[id]; for (const k of need) assert.ok(d[k] != null, `${id}.${k}`);
    assert.equal(d.id, id); assert.ok(MATERIALS[d.material], `${id} material ${d.material}`);
    for (const r of ['sky0', 'sky1', 'far', 'mid', 'ground', 'ground2', 'leaf', 'trunk']) assert.match(d.palette[r], /^#[0-9a-f]{6}$/i, `${id}.palette.${r}`);
    for (const r of ['skin', 'black', 'white', 'red', 'gold']) assert.match(d.hues[r], /^#[0-9a-f]{6}$/i, `${id}.hues.${r}`);
    assert.ok(d.qa.length >= 4, `${id} qa checklist`);
    assert.ok(fs.existsSync(path.join(ROOT, 'styles', id, 'style.js')) && fs.existsSync(path.join(ROOT, 'styles', id, 'preview.html')), `${id} files`);
    // v2 open style system
    assert.equal(d.schemaVersion, 2, `${id} schemaVersion`);
    assert.ok(Array.isArray(d.fonts), `${id}.fonts`);
    assert.ok(d.motion && typeof d.motion.grammar === 'string', `${id}.motion.grammar`);
    assert.ok(d.materials && MATERIALS[d.materials.world] && MATERIALS[d.materials.chars], `${id}.materials`);
    assert.ok(d.lineage && Array.isArray(d.lineage.parents), `${id}.lineage`);
    assert.ok(d.renderCost && d.renderCost.tier, `${id}.renderCost`);
  }
  // distinct looks among hand-authored bases (scaffolds/mixes/forks intentionally inherit a parent palette)
  const bases = packs.filter(id => !(data[id].lineage && data[id].lineage.parents && data[id].lineage.parents.length));
  const sig = bases.map(id => data[id].material + data[id].palette.sky0); assert.equal(new Set(sig).size, sig.length);
  assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'style.schema.json')), 'published schema');
  assert.ok(fs.existsSync(path.join(ROOT, 'styles', 'manifest.json')), 'runtime manifest');
});
test('style combination: base + role overrides (array, role tokens, object form)', () => {
  assert.deepEqual(parseToken('papercut-chars'), { id: 'papercut', role: 'chars' });
  assert.deepEqual(parseToken('ink.bg'), { id: 'ink', role: 'world' });
  assert.throws(() => parseToken('nope'));
  let p = resolveParts(['ink', 'papercut.chars']); assert.equal(p.world.id, 'ink'); assert.equal(p.chars.id, 'papercut'); assert.equal(p.sound.id, 'ink');
  p = resolveParts(['ink-bg', 'papercut-chars']); assert.equal(p.world.id, 'ink'); assert.equal(p.chars.id, 'papercut'); assert.equal(p.type.id, 'ink');
  p = resolveParts({ base: 'neon', chars: 'pixel', sound: 'opera' }); assert.equal(p.world.id, 'neon'); assert.equal(p.chars.id, 'pixel'); assert.equal(p.sound.id, 'opera');
  p = resolveParts('ink,papercut'); ROLES.forEach(r => assert.equal(p[r].id, 'papercut'));
  const S = new Style(['ink', 'papercut.chars']);
  assert.equal(S.charView.material, 'cut'); assert.equal(S.worldView.material, 'ink');
  assert.equal(S.charView.colour('red'), data.papercut.hues.red); assert.equal(S.worldView.colour('far', 'far'), data.ink.palette.far);
  const cfg = S.videoCfg({ fps: 24, transition: 'fade:0.3' }); assert.equal(cfg.transition, 'fade:0.3'); assert.equal(cfg.fps, 24); assert.equal(cfg.theme, 'ink');
  assert.equal(new Style('papercut').videoCfg({}).transition, data.papercut.transitions.default);
});
test('transitions: tear edge sweeps across, pixel columns fill monotonically, scallop scales with e', () => {
  const x0 = Math.max(...tearEdge(0, 1280, 720).slice(1, -1).map(p => p[0])), x1 = Math.min(...tearEdge(1, 1280, 720).slice(1, -1).map(p => p[0]));
  assert.ok(x0 < 0 && x1 > 1280);
  const area = e => pixelCols(e, 1280, 720).reduce((s, p) => s + p[1], 0);
  assert.equal(area(0), 0); assert.ok(area(.5) > 0 && area(.5) <= area(.8)); assert.equal(Math.max(...pixelCols(1, 1280, 720).map(p => p[1])), 720);
  assert.ok(Math.max(...scallop(.5, 0, 0, 100).map(p => Math.hypot(...p))) <= 50 + 1e-9);
});
test('music bed: deterministic event list inside the video, notes from the scale', () => {
  const mk = () => { const ev = []; const v = { scenes: [{ start: 0, dur: 6 }], sfx: (t, n, g, f) => ev.push([t, n, +g.toFixed(4), f]) }; bed(v, { bpm: 120, seed: 3, tracks: [{ voice: 'pluck', steps: 'x.x.x.x.', notes: scaleNotes(220), walk: true }, { voice: 'kick', steps: 'x...' }] }); return ev; };
  const a = mk(), b = mk(); assert.deepEqual(a, b); assert.ok(a.length > 10);
  assert.ok(a.every(e => e[0] >= 0 && e[0] < 6));
  const notes = new Set(scaleNotes(220)); assert.ok(a.filter(e => e[1] === 'pluck').every(e => notes.has(e[3])));
});

test('style mix / fork / matchBase (v2)', () => {
  const m = mixStyles(data.ink, data.neon, .4, { id: 'ink-x-neon-test' });
  assert.equal(m.schemaVersion, 2);
  assert.deepEqual(m.lineage.parents, ['ink', 'neon']);
  assert.equal(m.lineage.weights.length, 2);
  assert.ok(validateStyle(m).ok, validateStyle(m).errors);
  const f = forkStyle(data.papercut, { id: 'papercut-fork-test' });
  assert.deepEqual(f.lineage.parents, ['papercut']);
  assert.equal(matchBaseFromPrompt('水墨远山'), 'ink');
  assert.equal(matchBaseFromPrompt('赛博霓虹雨夜'), 'neon');
  assert.equal(matchBaseFromPrompt('像素冒险'), 'pixel');
});
