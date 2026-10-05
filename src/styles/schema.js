// style.json v2: normalize (v1→v2), validate, mix/fork helpers. Pure; no DOM.
// Existing packs keep every v1 field so Style / vk.video({style}) keep working after migration.
import { mix as mixHex, luma } from './color.js';
import { MATERIALS } from './materials.js';

export const STYLE_SCHEMA_VERSION = 2;
export const PALETTE_KEYS = ['sky0', 'sky1', 'far', 'mid', 'ground', 'ground2', 'leaf', 'trunk'];
export const HUE_KEYS = ['skin', 'black', 'white', 'red', 'gold'];

const isHex = s => typeof s === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s);

/** Lift a v1 (or partial v2) pack to a full v2 document; mirrors v2 fields back onto v1 keys. */
export function normalizeStyle(raw = {}) {
  const d = { ...raw };
  const fonts = d.fonts || (d.typography && d.typography.fonts) || [];
  const motion = d.motion || {
    grammar: (d.pacing && d.pacing.beat) || (d.camera && d.camera.notes) || '',
    pacing: { scene: 5, hold: 1, transition: .6, ...(d.pacing || {}) },
    camera: { ...(d.camera || {}) },
    transitions: { ...(d.transitions || {}) },
  };
  if (!motion.grammar) motion.grammar = (motion.pacing && motion.pacing.beat) || '';
  const materials = d.materials || {
    world: d.worldMaterial || d.material || 'flat',
    chars: (d.characters && d.characters.material) || d.material || 'flat',
  };
  const lineage = d.lineage || { parents: [], weights: [], note: d.extracted ? 'extracted starter' : 'hand-authored' };
  const renderCost = d.renderCost || inferCost(d);
  const look = d.look !== undefined ? d.look : (d.three && d.three.post && d.three.post.look != null ? d.three.post.look : null);
  const out = {
    ...d,
    schemaVersion: STYLE_SCHEMA_VERSION,
    fonts: [...fonts],
    motion: {
      grammar: motion.grammar || '',
      pacing: { scene: 5, hold: 1, transition: .6, ...(motion.pacing || {}) },
      camera: { ...(motion.camera || {}) },
      transitions: { ...(motion.transitions || {}) },
    },
    look: look == null ? null : look,
    materials: { world: materials.world, chars: materials.chars },
    lineage: {
      parents: [...(lineage.parents || [])],
      weights: [...(lineage.weights || [])],
      note: lineage.note || '',
    },
    renderCost: {
      tier: (renderCost && renderCost.tier) || 'medium',
      modules: [...((renderCost && renderCost.modules) || [])],
      notes: (renderCost && renderCost.notes) || '',
    },
  };
  // v1 mirrors (Style class + tests read these)
  out.material = out.material || out.materials.chars;
  out.pacing = { ...out.motion.pacing };
  out.camera = { ...out.motion.camera };
  out.transitions = { ...out.motion.transitions };
  if (!out.typography) out.typography = {};
  if (!out.typography.fonts) out.typography.fonts = out.fonts.slice();
  else out.fonts = out.typography.fonts.slice();
  return out;
}

function inferCost(d) {
  const mods = [], tags = new Set(d.tags || []);
  if (d.requires && d.requires.some(r => /three/.test(r))) { mods.push('three'); tags.add('3d'); }
  if (d.three) mods.push('three-post');
  if (d.look) mods.push('look');
  const tier = mods.includes('three') ? 'high' : tags.has('gl') || /gl\.|inkBleed|mist/.test(JSON.stringify(d.effects || {})) ? 'medium' : 'low';
  return { tier, modules: mods, notes: tier === 'high' ? 'WebGL / vk.three' : tier === 'medium' ? '2D + light GL fx' : '2D SVG' };
}

/** Soft validate; returns {ok, errors[]}. */
export function validateStyle(raw) {
  const d = normalizeStyle(raw), errors = [];
  if (d.schemaVersion !== 2) errors.push('schemaVersion must be 2');
  if (!d.id || !/^[a-z][a-z0-9-]{0,31}$/.test(d.id)) errors.push('id: slug a-z / digits / hyphen');
  for (const k of ['name', 'en', 'description']) if (!d[k]) errors.push(`missing ${k}`);
  for (const k of PALETTE_KEYS) if (!isHex(d.palette && d.palette[k])) errors.push(`palette.${k} hex`);
  for (const k of HUE_KEYS) if (!isHex(d.hues && d.hues[k])) errors.push(`hues.${k} hex`);
  if (!Array.isArray(d.fonts)) errors.push('fonts[]');
  if (!d.motion || typeof d.motion.grammar !== 'string') errors.push('motion.grammar');
  if (!MATERIALS[d.materials.world]) errors.push(`materials.world unknown: ${d.materials.world}`);
  if (!MATERIALS[d.materials.chars]) errors.push(`materials.chars unknown: ${d.materials.chars}`);
  if (!Array.isArray(d.qa) || d.qa.length < 1) errors.push('qa[]');
  if (!d.lineage || !Array.isArray(d.lineage.parents)) errors.push('lineage.parents');
  return { ok: !errors.length, errors, data: d };
}

function lerpNum(a, b, w) { return a + (b - a) * w; }
function mixVal(a, b, w) {
  if (typeof a === 'number' && typeof b === 'number') return lerpNum(a, b, w);
  if (isHex(a) && isHex(b)) return mixHex(a, b, w);
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]), out = {};
    for (const k of keys) out[k] = a[k] == null ? b[k] : b[k] == null ? a[k] : mixVal(a[k], b[k], w);
    return out;
  }
  return w < .5 ? a : b;
}

function concatLook(a, b) {
  const toArr = x => {
    if (x == null) return [];
    if (typeof x === 'string') return [{ type: 'preset', preset: x }];
    if (Array.isArray(x)) return x.map(p => typeof p === 'string' ? { type: p } : { ...p });
    if (x.preset) return [{ type: 'preset', preset: x.preset }, ...(x.chain || [])];
    if (x.chain) return x.chain.slice();
    return [x];
  };
  const chain = [...toArr(a), ...toArr(b)];
  return chain.length ? { chain } : null;
}

/** Parameter interpolation + look-chain concat. w = weight of B (0 = A, 1 = B). */
export function mixStyles(aRaw, bRaw, w = .5, { id, name, en, note } = {}) {
  const A = normalizeStyle(aRaw), B = normalizeStyle(bRaw);
  const wB = Math.max(0, Math.min(1, +w || 0)), wA = 1 - wB;
  const idOut = id || `${A.id}-x-${B.id}`;
  const palette = mixVal(A.palette, B.palette, wB);
  const hues = mixVal(A.hues || {}, B.hues || {}, wB);
  const P = mixVal(A.P || {}, B.P || {}, wB);
  const motion = {
    grammar: wB < .5 ? A.motion.grammar : B.motion.grammar,
    pacing: mixVal(A.motion.pacing, B.motion.pacing, wB),
    camera: mixVal(A.motion.camera, B.motion.camera, wB),
    transitions: wB < .5 ? { ...A.motion.transitions } : { ...B.motion.transitions },
  };
  const materials = wB < .5 ? { ...A.materials } : { ...B.materials };
  const fonts = wB < .5 ? A.fonts.slice() : B.fonts.slice();
  const look = concatLook(A.look, B.look);
  const sound = wB < .5 ? structuredClone(A.sound) : structuredClone(B.sound);
  const qa = [...new Set([...(A.qa || []), ...(B.qa || [])])];
  const tags = [...new Set([...(A.tags || []), ...(B.tags || []), 'mixed'])];
  const raw = {
    schemaVersion: 2,
    id: idOut,
    order: Math.max(A.order || 50, B.order || 50) + 1,
    name: name || `${A.name}×${B.name}`,
    en: en || `mix ${A.id} ${(wA * 100).toFixed(0)}% + ${B.id} ${(wB * 100).toFixed(0)}%`,
    description: `Mixed style: ${A.id} (w=${wA.toFixed(2)}) + ${B.id} (w=${wB.toFixed(2)}). ${note || 'Parameter lerp + look-chain concat; hand-tune hooks in style.js.'}`,
    tags, theme: wB < .5 ? A.theme : B.theme,
    palette, hues, fonts, motion, look, materials, sound, qa,
    lineage: { parents: [A.id, B.id], weights: [+wA.toFixed(4), +wB.toFixed(4)], note: note || `vk style mix ${A.id} ${B.id} --w ${wB}` },
    renderCost: {
      tier: (A.renderCost.tier === 'high' || B.renderCost.tier === 'high') ? 'high' : (A.renderCost.tier === 'medium' || B.renderCost.tier === 'medium') ? 'medium' : 'low',
      modules: [...new Set([...(A.renderCost.modules || []), ...(B.renderCost.modules || [])])],
      notes: `mix of ${A.id} + ${B.id}`,
    },
    material: materials.chars,
    P, video: mixVal(A.video || {}, B.video || {}, wB),
    typography: { ...(wB < .5 ? A.typography : B.typography), fonts },
    characters: wB < .5 ? { ...A.characters } : { ...B.characters },
    effects: wB < .5 ? { ...A.effects } : { ...B.effects },
    demo: wB < .5 ? { ...A.demo } : { ...B.demo },
    pacing: motion.pacing, camera: motion.camera, transitions: motion.transitions,
  };
  if (A.three || B.three) raw.three = wB < .5 ? A.three : B.three;
  return normalizeStyle(raw);
}

export function forkStyle(raw, { id, name, en, note } = {}) {
  const A = normalizeStyle(raw);
  const idOut = id || `${A.id}-fork`;
  return normalizeStyle({
    ...structuredClone(A),
    id: idOut,
    name: name || `${A.name} fork`,
    en: en || `fork of ${A.id}`,
    description: `Fork of ${A.id}. ${note || 'Edit freely; lineage records the parent.'}`,
    tags: [...new Set([...(A.tags || []), 'fork'])],
    lineage: { parents: [A.id], weights: [1], note: note || `vk style fork ${A.id}` },
  });
}

/** Keyword → base pack id for scaffolding from a short text prompt. Deterministic. */
export function matchBaseFromPrompt(text = '') {
  const t = String(text).toLowerCase();
  const rules = [
    [/水墨|墨|宣纸|写意|ink|sumi|wash/, 'ink'],
    [/剪纸|窗花|papercut|paper.?cut|scissors/, 'papercut'],
    [/皮影|影子|shadow|silhouette/, 'shadow'],
    [/京剧|戏曲|opera|脸谱/, 'opera'],
    [/霓虹|赛博|neon|cyber|glow/, 'neon'],
    [/像素|8.?bit|pixel|retro.?game/, 'pixel'],
    [/蜡笔|彩铅|crayon|pastel|sketch/, 'crayon'],
    [/胶片|电影感|reel|film.?grain|cinematic/, 'reel'],
    [/科技|产品|three|3d|webgl|turntable/, 'tech'],
  ];
  for (const [re, id] of rules) if (re.test(t)) return id;
  // brightness / mood fallbacks
  if (/暗|夜|黑|dark|noir/.test(t)) return 'shadow';
  if (/童|可爱|软|soft|cute/.test(t)) return 'crayon';
  return 'tech';
}

export function recipeCostTier(modules = []) {
  const m = new Set(modules);
  if ([...m].some(x => /three|globe|terrain|shader|sim|diorama/.test(x))) return 'high';
  if ([...m].some(x => /gl\.|look|particles|bloom/.test(x))) return 'medium';
  return 'low';
}
