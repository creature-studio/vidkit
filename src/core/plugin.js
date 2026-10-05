// Plugin registry. Everything that is an "effect" registers itself here, so presets and third-party
// plugins are first-class and identical in power:
//   fx          name → (el, o, api) => void       element effect (entrance/exit/emphasis); or {from,to,ease,instant,origin}
//   transitions name → (p, ctx) => ({in, out, flash, flashColor, under})   scene transition, p = eased 0..1
//   textures    name → (video, opts) => ({el?, draw?(ctx,t,info), update?(t)})   full-frame overlay
//   backgrounds name → (scene, opts, video) => ({el, update?(local)})
//   blocks      name → (…args) => Node        authoring factories, exposed as vk[name]
//   themes / formats / sounds (sfx voices) / layers (render layer kinds)
//   hooks       init(video) · frame(t, video) · qa(report, video)
export const registry = {
  fx: {}, transitions: {}, textures: {}, backgrounds: {}, blocks: {}, themes: {}, formats: {}, sounds: {}, layers: {},
  hooks: { init: [], frame: [], qa: [] },
  plugins: [],
};
const KINDS = ['fx', 'transitions', 'textures', 'backgrounds', 'blocks', 'themes', 'formats', 'sounds', 'layers'];

export function register(kind, name, impl) {
  if (!registry[kind]) throw new Error('[vk] unknown registry kind ' + kind);
  registry[kind][name] = impl; return impl;
}

// plugin forms: function(vk, opts) | {name, install(vk, opts)} | {name, fx:{…}, transitions:{…}, …, hooks:{…}}
export function use(vk, plugin, opts) {
  if (!plugin) return vk;
  const name = plugin.name || (typeof plugin === 'function' && plugin.name) || 'anonymous';
  if (registry.plugins.some(p => p.plugin === plugin)) return vk;
  registry.plugins.push({ name, plugin });
  if (typeof plugin === 'function') { plugin(vk, opts || {}); return vk; }
  KINDS.forEach(k => { if (plugin[k]) Object.entries(plugin[k]).forEach(([n, impl]) => register(k, n, impl)); });
  if (plugin.hooks) Object.entries(plugin.hooks).forEach(([h, fn]) => registry.hooks[h] && registry.hooks[h].push(fn));
  if (plugin.install) plugin.install(vk, opts || {});
  if (plugin.blocks) Object.entries(plugin.blocks).forEach(([n, f]) => { if (!(n in vk)) vk[n] = f; });
  return vk;
}
export function list(kind) { return Object.keys(registry[kind] || {}); }
// opt-in effect packs: names that register themselves the first time a page uses them, so pages that never do see
// exactly the same registry as before (e.g. the FX gallery's preset counts). lazy[kind][name] = installer()
export const lazy = { fx: {}, transitions: {}, backgrounds: {}, textures: {}, sounds: {} };
export function lazyRegister(kind, names, install) { [].concat(names).forEach(n => { lazy[kind][n] = install; }); }
export function ensureLazy(kind, name) {
  if (!name || registry[kind][name] || !lazy[kind] || !lazy[kind][name]) return !!(name && registry[kind] && registry[kind][name]);
  lazy[kind][name](); return !!registry[kind][name];
}
