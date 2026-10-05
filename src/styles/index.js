// Style packs ("风格库"): a pack bundles everything that makes a look — palette, fonts/theme, textures, transitions,
// effect presets, character material + drawing conventions, typography (titles, subtitles, seals), a music/sfx kit,
// pacing and camera defaults and a QA checklist. Packs live in styles/<id>/ (style.json data + style.js runtime +
// preview.html) and are bundled into dist/vidkit.js.
//
//   vk.video({ style: 'papercut' })                            whole pack
//   vk.video({ style: ['ink', 'papercut.chars'] })              ink world/typography/sound + paper-cut characters
//   vk.video({ style: { base: 'ink', chars: 'papercut' } })     same, explicit roles
//   const S = v.style  (or vk.style('ink'))
//   S.world(sc, 'mountain dusk moon') · S.character(W.actors, {look}) · S.title(sc, '片名', {sub}) · S.effect(sc, 'signature', {at, x, y})
//   S.transition('default') · S.sfx(sc, 'hit', t) · S.music(v) · S.post(sc) · S.shots(...) · S.qa
// Roles: world (palette, sky/relief/props painters, textures, post) · chars (material, hues, puppet conventions)
//        type (theme: fonts, captions; title/seal blocks) · motion (transitions, pacing, camera) · sound · fx
import { registry } from '../core/plugin.js';
import { resolveTheme } from '../authoring/themes.js';
import { puppet } from './puppet.js';
import { buildWorld, parseSetting } from './world.js';
import { material, MATERIALS } from './materials.js';
import * as color from './color.js';
import * as geom from './geom.js';
import { installStyleTransitions } from './transitions.js';

export const STYLES = {};
export const ROLES = ['world', 'chars', 'type', 'motion', 'sound', 'fx'];
const ROLE_ALIAS = { bg: 'world', background: 'world', world: 'world', scene: 'world', scenes: 'world', chars: 'chars', char: 'chars', character: 'chars', characters: 'chars', type: 'type', typography: 'type', text: 'type', title: 'type', titles: 'type', motion: 'motion', camera: 'motion', pacing: 'motion', transitions: 'motion', sound: 'sound', audio: 'sound', music: 'sound', fx: 'fx', effects: 'fx' };

// register a pack: data (style.json) merged with runtime (style.js default export)
export function registerStyle(data, runtime = {}) {
  const pack = { ...data, ...runtime, id: data.id || runtime.id };
  if (!pack.id) throw new Error('[vk.style] pack needs an id');
  if (pack.theme && typeof pack.theme === 'object') { registry.themes['style:' + pack.id] = resolveTheme(pack.theme); pack.themeName = 'style:' + pack.id; }
  else pack.themeName = pack.theme || 'tech-blue';
  STYLES[pack.id] = pack;
  return pack;
}
// 'papercut' → {id}; 'papercut.chars' | 'papercut:chars' | 'papercut-chars' | 'papercut/chars' → {id, role}
export function parseToken(tok) {
  if (STYLES[tok]) return { id: tok, role: null };
  const m = /^(.+?)[.:/-](bg|background|world|scene|scenes|chars?|characters?|type|typography|text|titles?|motion|camera|pacing|transitions|sound|audio|music|fx|effects)$/.exec(String(tok));
  if (m && STYLES[m[1]]) return { id: m[1], role: ROLE_ALIAS[m[2]] };
  throw new Error('[vk.style] unknown style "' + tok + '" (have: ' + Object.keys(STYLES).join(', ') + ')');
}
// spec → {role: pack}. Arrays: the first entry is the base for every role; later entries override their role (or
// every role when they name no role). Objects: {base, world|bg, chars, type, motion, sound, fx}.
export function resolveParts(spec) {
  const parts = {};
  const setAll = id => ROLES.forEach(r => { parts[r] = STYLES[id]; });
  if (typeof spec === 'string') spec = spec.split(/\s*[+,]\s*/);
  if (Array.isArray(spec)) {
    spec.forEach((tok, i) => { const { id, role } = parseToken(tok); if (i === 0) setAll(id); if (role) parts[role] = STYLES[id]; else if (i > 0) setAll(id); });
    // a role-qualified first entry ('ink-bg') still provides the base for every role
  } else if (spec && typeof spec === 'object') {
    const base = spec.base || spec.world || spec.bg || Object.values(spec)[0];
    setAll(parseToken(base).id);
    for (const [k, v] of Object.entries(spec)) { if (k === 'base') continue; const r = ROLE_ALIAS[k]; if (r) parts[r] = STYLES[parseToken(v).id]; }
  }
  if (!parts.world) throw new Error('[vk.style] empty style spec');
  return parts;
}
const lookup = (pack, name, role) => {
  const H = pack.hues || {}, Pl = pack.palette || {};
  if (name != null && typeof name === 'string' && /^(#|rgb|hsl)/.test(name)) return name;
  return H[name] || Pl[name] || H[role] || Pl[role] || (role === 'skin2' && H.skin ? color.shade(H.skin, -.12) : null) || '#888888';
};

export class Style {
  constructor(spec) {
    installStyleTransitions();
    this.spec = spec; this.parts = resolveParts(spec);
    const ids = ROLES.map(r => this.parts[r].id), uniq = [...new Set(ids)];
    this.id = uniq.length === 1 ? uniq[0] : ROLES.map(r => r + ':' + this.parts[r].id).join(' ');
    this.base = this.parts.world;
    const W = this.parts.world, Ch = this.parts.chars;
    // what the world composer sees
    this.worldView = { id: W.id, material: W.worldMaterial || W.material, P: { ...(W.P || {}), ...(W.worldP || {}) }, hooks: W.hooks || {}, layerAttrs: W.layerAttrs, colour: (n, r) => lookup(W, n, r), pack: W, style: this };
    // what the puppet sees
    this.charView = { id: Ch.id, material: Ch.material, P: { ...(Ch.P || {}) }, colour: (n, r) => lookup(Ch, n, r), pack: Ch, style: this };
  }
  get name() { return ROLES.every(r => this.parts[r] === this.base) ? this.base.name : ROLES.map(r => this.parts[r].name).filter((x, i, a) => a.indexOf(x) === i).join(' + '); }
  get palette() { return this.base.palette; }
  get qa() { return [...new Set(ROLES.flatMap(r => this.parts[r].qa || []))]; }
  colour(name, role) { return lookup(this.base, name, role); }
  // video defaults (an explicit cfg value always wins)
  videoCfg(cfg = {}) {
    const T = this.parts.type, M = this.parts.motion, W = this.parts.world, Snd = this.parts.sound, d = {};
    d.theme = T.themeName;
    const vt = W.video || {};
    if (vt.texture) d.texture = vt.texture;
    if (M.transitions && M.transitions.default) d.transition = M.transitions.default;
    if (M.camera && M.camera.push != null) d.push = M.camera.push;
    if (vt.fadeOut != null) d.fadeOut = vt.fadeOut;
    if (Snd.sound && Snd.sound.scoreOptions) d.scoreOptions = Snd.sound.scoreOptions;
    if (T.video && T.video.karaoke) d.karaoke = T.video.karaoke;
    const out = { ...d, ...cfg }; delete out.style;
    return out;
  }
  install(v) {
    this.video = v; v.style = this;
    const seen = new Set();
    for (const r of ROLES) { const p = this.parts[r]; if (seen.has(p)) continue; seen.add(p); if (p.install) p.install(v, this, r); }
    const mats = new Set([this.worldView.material, this.charView.material]);
    mats.forEach(m => { const M = material(m); if (M.defs) M.defs(v, m === this.charView.material ? this.charView.P : this.worldView.P); });
    return this;
  }
  // ---- building blocks ----
  world(sc, setting, o = {}) {
    const W = this.parts.world;
    o = { ...(W.worldOptions || {}), ...o };
    const w = buildWorld(sc, this.worldView, setting, o);
    if (W.decorate) W.decorate(sc, w, this, o);
    if (o.post !== false) this.post(sc, o, w);
    return w;
  }
  post(sc, o = {}, w) { const W = this.parts.world; if (W.post && !sc.__vkPost) { sc.__vkPost = true; W.post(sc, this, o, w); } return sc; }
  character(parent, o = {}) {
    const Ch = this.parts.chars;
    const opts = Ch.charOptions ? Ch.charOptions({ ...o }, this) : o;
    const p = puppet(parent, { style: this.charView, video: this.video || (parent.ownerSVGElement && null), ...opts, P: { ...this.charView.P, ...(opts.P || {}) } });
    if (Ch.charAfter) Ch.charAfter(p, this, opts);
    return p;
  }
  title(sc, text, o = {}) { const T = this.parts.type; return T.title ? T.title(sc, text, o, this) : defaultTitle(sc, text, o); }
  label(sc, text, o = {}) { const T = this.parts.type; return T.label ? T.label(sc, text, o, this) : null; }
  effect(sc, name = 'signature', o = {}) { const F = this.parts.fx; if (!F.effect) return null; return F.effect(sc, name, o, this); }
  transition(kind = 'default') { const M = this.parts.motion, T = M.transitions || {}; return T[kind] || T.default || 'fade:0.5'; }
  sfx(sc, kind, t, gain = 1) { const Sd = this.parts.sound, map = (Sd.sound && Sd.sound.sfx) || {}; const e = map[kind]; if (!e) return; [].concat(Array.isArray(e[0]) ? e : [e]).forEach(([voice, g = 1, f, dt = 0]) => sc.sfx(t + dt, voice, g * gain, f)); }
  music(v, o = {}) { const Sd = this.parts.sound; return Sd.music ? Sd.music(v || this.video, o, this) : null; }
  get pacing() { return { scene: 5, hold: 1, transition: .6, ...(this.parts.motion.pacing || {}) }; }
  get camera() { return { push: 0, punch: .1, ...(this.parts.motion.camera || {}) }; }
  get voice() { return { voice: 'zh-CN-XiaoxiaoNeural', rate: '+0%', ...((this.parts.sound.sound || {}).voice || {}) }; }
  toJSON() { return { id: this.id, name: this.name, parts: Object.fromEntries(ROLES.map(r => [r, this.parts[r].id])) }; }
}
function defaultTitle(sc, text, o) { return sc.add(window.vk.title(text, { at: o.at || .3, ...o })); }

export function style(spec) { return spec instanceof Style ? spec : new Style(spec); }
export function listStyles() { return Object.values(STYLES).map(p => ({ id: p.id, name: p.name, en: p.en, description: p.description, material: p.material, tags: p.tags || [] })); }
export { material, MATERIALS, color, geom, parseSetting };
