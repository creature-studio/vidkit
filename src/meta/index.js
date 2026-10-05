// vk.list(kind, {detail:true}) / vk.describe(kind, name): the registry with schemas (src/meta/schemas.js) attached.
// Plugins add metadata with vk.register(kind, name, impl, meta), impl.meta = {...}, or vk.use({..., meta: {fx: {name: meta}}}).
import { registry, lazy } from '../core/plugin.js';
import { EASE } from '../core/ease.js';
import { MATERIALS } from '../styles/materials.js';
import { STYLES } from '../styles/index.js';
import * as S from './schemas.js';

export const KINDS = ['elements', 'fx', 'transitions', 'textures', 'backgrounds', 'blocks', 'eases', 'themes', 'formats', 'sounds', 'materials', 'styles', 'three', 'threeMaterials', 'threeRigs'];
export const META = registry.meta || (registry.meta = {});
KINDS.forEach(k => { META[k] = META[k] || {}; });
export const normKind = k => S.KIND_ALIASES[k] || k;
const BUILTIN = { elements: S.ELEMENTS, fx: S.FX, transitions: S.TRANSITIONS, textures: S.TEXTURES, backgrounds: S.BACKGROUNDS, blocks: S.BLOCKS, three: S.THREE, threeRigs: S.THREE_RIGS };
export function setMeta(kind, name, meta) { kind = normKind(kind); (META[kind] || (META[kind] = {}))[name] = meta; return meta; }

// every valid name of a kind (incl. opt-in lazy names and aliases) — strict mode / lint suggestions use this
export function names(kind) {
  kind = normKind(kind);
  switch (kind) {
    case 'eases': return Object.keys(EASE).filter(n => !/[(]/.test(n));
    case 'materials': return Object.keys(MATERIALS);
    case 'styles': return Object.keys(STYLES);
    case 'elements': return Object.keys(S.ELEMENTS);
    case 'three': return Object.keys(S.THREE);
    case 'threeMaterials': return Object.keys(S.THREE_MATERIALS);
    case 'threeRigs': return Object.keys(S.THREE_RIGS);
    default: return [...new Set([...Object.keys(registry[kind] || {}), ...Object.keys((lazy[kind]) || {}), ...Object.keys(META[kind] || {})])];
  }
}
const params = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, S.param(v)]));
// undocumented function presets (third-party plugins): o.foo / o.foo || 3 / o.foo != null ? o.foo : 3 → params
export function inferParams(impl) {
  const src = typeof impl === 'function' ? impl.toString() : impl && typeof impl.make === 'function' ? impl.make.toString() : '';
  const out = {}, re = /\bo\.(\w+)(?:\s*(?:\|\||\?\?)\s*(-?[\d.]+|'[^']*'|"[^"]*"|true|false)|\s*!=\s*null\s*\?\s*o\.\w+\s*:\s*(-?[\d.]+|'[^']*'|"[^"]*"))?/g; let m;
  while ((m = re.exec(src))) { if (['t'].includes(m[1])) continue; const d = m[2] || m[3]; const p = out[m[1]] || { type: 'any' }; if (d != null) { p.default = /^['"]/.test(d) ? d.slice(1, -1) : d === 'true' ? true : d === 'false' ? false : +d; p.type = typeof p.default; } out[m[1]] = p; }
  return out;
}
const defaultExample = (kind, n) => ({
  fx: `vk.title('Hello', { fx: '${n}' })`, transitions: `vk.scene('Next', 4, { transition: '${n}:0.6' }, [vk.title('Next')])`,
  textures: `vk.video({ texture: { ${/^[a-z]+$/i.test(n) ? n : `'${n}'`}: { amount: .3 } } })`, backgrounds: `vk.scene('A', 4, { bg: { type: '${n}' } }, [vk.title('A')])`,
  blocks: `vk.${n}(…)`, themes: `vk.video({ theme: '${n}' })`, formats: `vk.video({ format: '${n}' })`, sounds: `sc.sfx(1.2, '${n}', .8)`, eases: `{ ease: '${n}' }`,
  materials: `{ "material": "${n}" }  // style.json; or vk.style.material('${n}')`, styles: `vk.video({ style: '${n}' })`, threeMaterials: `vk.three.materials.${n}({ color: 0xffffff })`, threeRigs: `camera: vk.three.rig.${n}({ … })`,
}[kind] || null);

// identity aliases (two names → the same implementation object)
function aliasMap(kind) {
  const R = registry[kind] || {}, by = new Map(), out = {};
  for (const [n, f] of Object.entries(R)) { if (!f || typeof f !== 'object' && typeof f !== 'function') continue; if (by.has(f)) out[n] = by.get(f); else by.set(f, n); }
  return out;   // alias → canonical
}
export function describe(kind, name) {
  kind = normKind(kind);
  const custom = (META[kind] || {})[name], impl = (registry[kind] || {})[name], base = (BUILTIN[kind] || {})[name];
  let m = custom || (impl && impl.meta) || base || null;
  const e = { name, kind };
  if (kind === 'eases') m = S.easeMeta(name);
  else if (kind === 'themes') { const th = registry.themes[name] || {}; const d = (th.modes || {})[th.mode || 'dark'] || {}; m = { description: th.label || name, params: {}, palette: { mode: th.mode, bg: d.bg, fg: d.fg, accent: d.accent, accent2: d.accent2 }, fonts: th.fonts && { display: th.fonts.display, sans: th.fonts.sans } }; }
  else if (kind === 'formats') { const f = registry.formats[name] || {}; m = { description: `${f.w}×${f.h}`, params: {}, size: [f.w, f.h], safe: f.safe, zones: (f.zones || []).map(z => z.name) }; }
  else if (kind === 'materials') { const M = MATERIALS[name] || {}; m = { description: M.label || name, params: {} }; }
  else if (kind === 'styles') { const P = STYLES[name] || {}; m = { description: `${P.name || name}${P.en ? ' · ' + P.en : ''} — ${P.description || ''}`, params: {}, tags: P.tags || [], material: P.material, theme: P.themeName, transitions: P.transitions && { default: P.transitions.default, soft: P.transitions.soft, strong: P.transitions.strong }, effects: P.effects && P.effects.list, qa: P.qa || [], requires: P.requires, api: S.STYLE_API }; }
  else if (kind === 'sounds') m = { description: S.SOUNDS[name] || '', params: S.SOUND_PARAMS };
  else if (kind === 'threeMaterials') m = { description: S.THREE_MATERIALS[name] || '', params: S.THREE_MATERIAL_PARAMS, requires: 'dist/vidkit-three.js' };
  if (m && (kind === 'three' || kind === 'threeRigs')) m = { ...m, requires: 'dist/vidkit-three.js' };
  if (custom && kind !== 'eases' && base) m = { ...base, ...custom };
  const al = aliasMap(kind), canon = al[name] || (m && m.aliasOf);
  Object.assign(e, { description: (m && m.description) || '', params: m && m.params ? params(m.params) : (impl ? inferParams(impl) : {}) });
  if (m) for (const k of Object.keys(m)) if (!['description', 'params', 'example'].includes(k) && m[k] != null) e[k] = m[k];
  if (canon && canon !== name) e.aliasOf = canon;
  const aliases = Object.entries(al).filter(([a, c]) => c === name).map(([a]) => a); if (aliases.length) e.aliases = aliases;
  if (!impl && lazy[kind] && lazy[kind][name]) e.lazy = true;
  e.example = (m && m.example) || defaultExample(kind, name);
  e.source = custom || (impl && impl.meta) ? 'plugin' : 'builtin';
  return e;
}
export function common(kind) { const k = normKind(kind); const c = { elements: S.COMMON.node, fx: S.COMMON.node, transitions: S.COMMON.transition, textures: S.COMMON.texture, backgrounds: S.COMMON.background, themes: S.THEME_PARAMS, formats: S.FORMAT_PARAMS, threeMaterials: S.THREE_MATERIAL_PARAMS, styles: S.STYLE_PARAMS, materials: S.MATERIAL_PARAMS }[k]; return c ? params(c) : null; }
// vk.list(kind) → names (unchanged); vk.list(kind, {detail:true}) → [{name, description, params, example, …}]
// vk.list() → kinds; vk.list('all', {detail:true}) → {kind: entries}
export function listDetail(kind, o = {}) {
  kind = normKind(kind);
  const N = o.all || o.detail ? names(kind) : (['elements', 'eases', 'materials', 'styles', 'three', 'threeMaterials', 'threeRigs'].includes(kind) ? names(kind) : Object.keys(registry[kind] || {}));
  return o.detail ? N.map(n => describe(kind, n)) : N;
}
export { S as schemas };
