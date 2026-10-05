// Runtime style loader: discover styles/<id>/ and register via ES modules — no compile-time pack imports.
// Node: fs + dynamic import. Browser: fetch JSON + import(style.js) from a styles root URL.
import { normalizeStyle, validateStyle } from './schema.js';

export function stylesDir(root) {
  // root = repo root (Node) or absolute URL ending with /styles or /styles/
  return root;
}

/** List pack ids under styles/ (Node). */
export function discoverStyleIds(fs, path, root) {
  const dir = path.join(root, 'styles');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(d => {
    try { return fs.statSync(path.join(dir, d)).isDirectory() && fs.existsSync(path.join(dir, d, 'style.json')); }
    catch { return false; }
  }).sort();
}

export function readStyleJson(fs, path, root, id) {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'styles', id, 'style.json'), 'utf8'));
  return normalizeStyle(raw);
}

/** Node: dynamic-import every pack and register. skip = Set of ids already present (e.g. three-tech). */
export async function loadAllNode(vk, { root, fs, path, skip = new Set() } = {}) {
  const ids = discoverStyleIds(fs, path, root);
  const out = [];
  for (const id of ids) {
    if (skip.has(id) || (vk.style.get && vk.style.get(id))) { out.push(id); continue; }
    const jsonPath = path.join(root, 'styles', id, 'style.json');
    const jsPath = path.join(root, 'styles', id, 'style.js');
    const data = normalizeStyle(JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
    const href = pathToFileUrl(jsPath);
    const mod = await import(href);
    vk.style.register(data, mod.default);
    out.push(id);
  }
  return out;
}

function pathToFileUrl(p) {
  const sep = p.startsWith('/') ? '' : '/';
  return 'file://' + sep + p.split('\\').join('/');
}

/** Browser: load one pack from a styles root URL (…/styles). */
export async function loadOneBrowser(vk, id, stylesUrl) {
  if (vk.style.get && vk.style.get(id)) return id;
  const base = stylesUrl.replace(/\/?$/, '/');
  const data = normalizeStyle(await fetch(base + id + '/style.json').then(r => { if (!r.ok) throw new Error('style.json ' + id + ' ' + r.status); return r.json(); }));
  const mod = await import(base + id + '/style.js');
  vk.style.register(data, mod.default);
  return id;
}

/** Browser: discover via manifest.json (written by CLI / docs) or a provided id list. */
export async function loadAllBrowser(vk, stylesUrl, ids) {
  const base = stylesUrl.replace(/\/?$/, '/');
  let list = ids;
  if (!list) {
    try {
      const man = await fetch(base + 'manifest.json').then(r => r.ok ? r.json() : null);
      list = (man && man.ids) || [];
    } catch { list = []; }
  }
  if (!list.length) throw new Error('[vk.style] no pack ids to load from ' + base);
  const out = [];
  for (const id of list) out.push(await loadOneBrowser(vk, id, base));
  return out;
}

export function writeManifest(fs, path, root) {
  const ids = discoverStyleIds(fs, path, root);
  const packs = ids.map(id => {
    const d = readStyleJson(fs, path, root, id);
    return {
      id: d.id, name: d.name, en: d.en, tags: d.tags || [], material: d.material,
      order: d.order || 99, requires: d.requires || [],
      lineage: d.lineage, renderCost: d.renderCost, fonts: d.fonts,
    };
  }).sort((a, b) => (a.order || 99) - (b.order || 99) || a.id.localeCompare(b.id));
  const man = { schemaVersion: 2, ids: packs.map(p => p.id), packs };
  fs.writeFileSync(path.join(root, 'styles', 'manifest.json'), JSON.stringify(man, null, 2) + '\n');
  return man;
}

export { normalizeStyle, validateStyle };

/** vk.style.load / loadAll implementation (imported dynamically; kept out of the IIFE by build external). */
export async function loadForVk(vk, id, o = {}) {
  if (vk.style.get && vk.style.get(id)) return vk.style.get(id);
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = o.root || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const data = normalizeStyle(JSON.parse(fs.readFileSync(path.join(root, 'styles', id, 'style.json'), 'utf8')));
    const mod = await import(pathToFileUrl(path.join(root, 'styles', id, 'style.js')));
    return vk.style.register(data, mod.default);
  }
  const base = (o.stylesUrl || new URL('../styles/', typeof location !== 'undefined' ? location.href : import.meta.url).href).replace(/\/?$/, '/');
  return loadOneBrowser(vk, id, base);
}

export async function loadAllForVk(vk, o = {}) {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = o.root || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    return loadAllNode(vk, { root, fs, path, skip: new Set(Object.keys(vk.style.packs || {})) });
  }
  const { boot } = await import('../../styles/boot.mjs');
  return boot(vk, o);
}
