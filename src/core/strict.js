// Strict mode: unknown registry names throw (with did-you-mean + the valid names) instead of warning and silently
// falling back; Math.random() while a frame renders throws. Off by default for pages (back-compat: a warning);
// `vk.video({strict:true})` turns it on, and `vk peek` / `vk qa` / `vk render` load pages with ?strict=1 (opt out with
// --no-strict or vk.video({strict:false})).
import { suggest } from './names.js';

// shared through globalThis: dist/vidkit-three.js bundles its own copy of this module and must see the same state
const G = typeof globalThis !== 'undefined' ? globalThis : {};
export const STRICT = G.__vkStrictState || (G.__vkStrictState = { on: false, frame: 0, t: null, warnedRandom: false });
// the authoring call site of the node being built (an Error captured by vk.title(…) etc.): errors point at that line
export const SRC = G.__vkSrcState || (G.__vkSrcState = { err: null });
export function setStrict(on) { STRICT.on = !!on; return STRICT.on; }
// "page.html:12:5" — the first stack frame outside vidkit's own bundles/sources
export function userFrame(stack) {
  if (stack == null && SRC.err) { const f = userFrame(SRC.err.stack || ''); if (f) return f; }
  if (stack == null) { const L = Error.stackTraceLimit; Error.stackTraceLimit = 60; stack = new Error().stack; Error.stackTraceLimit = L; }
  for (const line of String(stack || '').split('\n').slice(1)) {
    const m = /\(?((?:https?|file):\/\/[^\s()]+?):(\d+):(\d+)\)?\s*$/.exec(line);
    if (!m) continue;
    const url = m[1]; if (/\/dist\/vidkit[^/]*\.js$|\/src\/(core|fx|authoring|styles|runtime|audio|three|layers|meta)\/|\/vendor\//.test(url)) continue;
    let f = url; try { f = decodeURIComponent(new URL(url).pathname).split('/').pop(); } catch (e) { }
    return `${f}:${m[2]}:${m[3]}`;
  }
  return null;
}
const LABEL = { fx: 'fx', transitions: 'transition', textures: 'texture', backgrounds: 'background', eases: 'ease', themes: 'theme', materials: 'material', styles: 'style', formats: 'format', sounds: 'sound', blocks: 'block', threeMaterials: 'vk.three material', products: 'vk.three product', grades: 'vk.three grade', envs: 'vk.three env', targets: 'particle target' };
export function unknownMessage(kind, name, valid, where) {
  const s = suggest(name, valid), at = where || userFrame();
  return `[vk] unknown ${LABEL[kind] || kind} "${name}"${s.length ? ` — did you mean ${s.map(x => `"${x}"`).join(' or ')}?` : ''}${at ? ` (at ${at})` : ''}\n  valid ${LABEL[kind] || kind} names: ${[...new Set(valid)].join(', ')}`;
}
// report an unknown name: throws in strict mode (or when `fatal`, e.g. the call would crash anyway), else warns once
const warned = G.__vkWarned || (G.__vkWarned = new Set());
export function unknownName(kind, name, valid, { fatal = false, where } = {}) {
  const msg = unknownMessage(kind, name, valid, where);
  if (STRICT.on || fatal) { const e = new Error(msg); e.vkStrict = true; e.kind = kind; e.vkName = name; throw e; }
  const key = kind + ':' + name; if (!warned.has(key)) { warned.add(key); if (typeof console !== 'undefined') console.warn(msg.split('\n')[0] + ' — falling back (use vk.video({strict:true}) to make this an error)'); }
  return null;
}
// Math.random() guard: seeded sequence for setup code (unchanged); while render(t) runs it is history-dependent →
// strict: throw; otherwise warn once (the value is still the seeded sequence, so old pages render exactly as before)
export function guardedRandom(r) {
  return function random() {
    if (STRICT.frame > 0 && (STRICT.on || !STRICT.warnedRandom)) {
      const L = Error.stackTraceLimit; Error.stackTraceLimit = 60; const st = new Error().stack || ''; Error.stackTraceLimit = L;
      // three.js and vidkit internals may create objects (UUIDs) lazily during a frame: not pixel-relevant
      if (!/vidkit-three\.js|three\.module\.js|three\.core\.js|\/src\/three\//.test(st.split('\n').slice(2, 4).join('\n'))) {
        const at = userFrame(st), msg = `[vk] Math.random() called while rendering t=${STRICT.t != null ? STRICT.t.toFixed(3) : '?'}${at ? ` (at ${at})` : ''}: its value depends on which frames were rendered before (parallel workers render out of order). Use vk.hash(i + frame) / vk.noise1(t), or a vk.rand(seed) created and consumed in setup`;
        if (STRICT.on) { const e = new Error(msg); e.vkStrict = true; throw e; }
        if (!STRICT.warnedRandom) { STRICT.warnedRandom = true; console.warn(msg); }
      }
    }
    return r();
  };
}
