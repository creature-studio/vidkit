// Static determinism lint for vidkit pages (pure: no browser, no fs) — used by `vk lint`, `vk peek` and tests.
// Every frame must be a pure function of t. The lint parses each inline <script> (and local .js files the page
// loads) with acorn, finds the closures that run while a frame renders (sc.on / v.onRender / sc.canvas / sc.paint /
// api.fn / gl.draw callbacks, the update fn of sc.three(setup, update), {update|draw|render|animate|uniforms|camera|on}
// members, functions whose first parameter is t/local/lt, and every same-file function they call) and flags wall-clock
// and history-dependent APIs inside them. A `// vk-lint-ignore` comment on the line (or the line above) silences it.
import * as acorn from '../vendor/acorn/acorn.mjs';
import { lev, suggest } from '../src/core/names.js';

const RENDER_CALLS = new Set(['on', 'onRender', 'canvas', 'paint', 'fn', 'draw', 'webgl', 'gl']);
const RENDER_KEYS = new Set(['update', 'draw', 'render', 'animate', 'uniforms', 'camera', 'on', 'paint']);
const T_PARAMS = new Set(['t', 'lt', 'local', 'localT', 'time', 'frameT']);
export const RULES = {
  'math-random': { severity: 'error', hint: 'use a seeded generator created in setup (const r = vk.rand(7); … r()) or a hash of the index/time: vk.hash(i), vk.hash2(i, frame), vk.noise1(t)' },
  'wall-clock': { severity: 'error', hint: 'derive everything from t (scene-local seconds) or info.frame — the render worker may draw frame 812 before frame 3' },
  'timer': { severity: 'error', hint: 'vidkit calls render(t) itself; timers / rAF never fire in capture order. Put the work in sc.on(local => …) as a function of time' },
  'three-clock': { severity: 'error', hint: 'THREE.Clock / getDelta measure real time: use the t passed to update(t, info) (and info.frameIdx)' },
  'mixer-update': { severity: 'error', hint: 'AnimationMixer.update(dt) integrates history: use const m = vk.three.mixer(root, clips) in setup, then m.at(t) in update' },
  'rng-in-render': { severity: 'error', hint: 'a seeded generator advances on every call, so its value depends on how many frames were drawn before: call it in setup to pre-compute a table, or use vk.hash(i + frame) / vk.rand(seed) created inside the closure' },
  'accumulate': { severity: 'warn', hint: 'this variable lives outside the render closure and is accumulated every frame, so frame t depends on which frames were rendered before; compute it from t (closed form or an integral from 0 to t)' },
  'timer-toplevel': { severity: 'warn', hint: 'timers / rAF outside render: fine for UI, but anything they change is invisible to `vk render` (frames are rendered in parallel, out of order)' },
  'wall-clock-toplevel': { severity: 'warn', hint: 'the page reads the real clock at build time: two renders on different days differ. Use fixed values' },
  'unknown-name': { severity: 'error', hint: 'see `vk list <kind>` / docs/api.json for valid names' },
  'syntax': { severity: 'error', hint: 'fix the syntax error' },
};

export { lev, suggest };

// <script> blocks of an HTML page → [{code, line0, col0, src, type}]; line0/col0 = position of the code's first char
export function scriptsOf(html) {
  const out = [], re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi; let m;
  while ((m = re.exec(html))) {
    const attrs = m[1], src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs), type = (/\btype\s*=\s*["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
    const start = m.index + m[0].indexOf('>') + 1, before = html.slice(0, start), line0 = before.split('\n').length, col0 = start - before.lastIndexOf('\n') - 1;
    out.push({ code: m[2], line0, col0, src: src ? src[1] : null, type });
  }
  return out;
}

function children(node) {
  const out = [];
  for (const k in node) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc' || k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === 'string') out.push(x); }
    else if (v && typeof v.type === 'string') out.push(v);
  }
  return out;
}
const isFn = n => n && (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration');
const keyName = k => k && (k.type === 'Identifier' ? k.name : k.type === 'Literal' ? String(k.value) : null);
const memberName = n => n && n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier' ? n.property.name : null;
const objName = n => n && n.type === 'MemberExpression' ? (n.object.type === 'Identifier' ? n.object.name : memberName(n.object)) : null;
const paramName = p => p && (p.type === 'Identifier' ? p.name : p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? p.left.name : null);

// lint one JS source. names: {fx:[…], transitions:[…], eases:[…], themes:[…], styles:[…], backgrounds:[…], textures:[…]} for literal checks
export function lintSource(code, { file = 'page.js', line0 = 1, col0 = 0, module = false, names = null } = {}) {
  const issues = [], lines = code.split('\n');
  const add = (rule, node, message, extra = {}) => {
    const l = node.loc.start.line, c = node.loc.start.column;
    if (/vk-lint-ignore/.test(lines[l - 1] || '') || /vk-lint-ignore/.test(lines[l - 2] || '')) return;
    const R = RULES[rule]; issues.push({ rule, severity: R.severity, file, line: l + line0 - 1, col: (l === 1 ? c + col0 : c) + 1, message, hint: R.hint, ...extra });
  };
  let ast;
  const opts = { ecmaVersion: 'latest', locations: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, allowHashBang: true };
  try { ast = acorn.parse(code, { ...opts, sourceType: module ? 'module' : 'script' }); }
  catch (e) {
    try { ast = acorn.parse(code, { ...opts, sourceType: 'module' }); }
    catch (e2) { const l = (e.loc && e.loc.line) || 1, c = (e.loc && e.loc.column) || 0; issues.push({ rule: 'syntax', severity: 'error', file, line: l + line0 - 1, col: (l === 1 ? c + col0 : c) + 1, message: e.message.replace(/ \(\d+:\d+\)$/, ''), hint: RULES.syntax.hint }); return issues; }
  }
  // pass 1: parents, named functions, render roots
  const fnByName = new Map(), roots = new Set(), pendingNames = [], rngNames = new Map();
  const isRngInit = x => x && x.type === 'CallExpression' && (['rand', 'mulberry32'].includes(memberName(x.callee)) || (x.callee.type === 'Identifier' && x.callee.name === 'mulberry32'));
  (function up(n, p) { n.parent = p; for (const c of children(n)) up(c, n); })(ast, null);
  const all = []; (function each(n) { all.push(n); for (const c of children(n)) each(c); })(ast);
  for (const n of all) {
    if (n.type === 'FunctionDeclaration' && n.id) fnByName.set(n.id.name, n);
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && isFn(n.init)) fnByName.set(n.id.name, n.init);
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && isRngInit(n.init)) rngNames.set(n.id.name, n);
    if (n.type === 'CallExpression') {
      const p = memberName(n.callee) || (n.callee.type === 'Identifier' ? null : null), args = n.arguments;
      if (p && RENDER_CALLS.has(p) && !(args[0] && args[0].type === 'Literal' && typeof args[0].value === 'string')) {
        args.forEach(a => { if (isFn(a)) roots.add(a); else if (a.type === 'Identifier') pendingNames.push(a.name); else if (a.type === 'ArrayExpression') a.elements.forEach(e => { if (isFn(e)) roots.add(e); else if (e && e.type === 'Identifier') pendingNames.push(e.name); }); });
      }
      if (p === 'three' && isFn(args[0])) args.slice(1).forEach(a => { if (isFn(a)) roots.add(a); else if (a && a.type === 'Identifier') pendingNames.push(a.name); });
    }
    if ((n.type === 'Property' || n.type === 'MethodDefinition' || n.type === 'PropertyDefinition') && RENDER_KEYS.has(keyName(n.key))) {
      if (isFn(n.value)) roots.add(n.value); else if (n.value && n.value.type === 'Identifier') pendingNames.push(n.value.name);
    }
    if (isFn(n)) {
      const a = paramName(n.params[0]), b = paramName(n.params[1]);
      if (T_PARAMS.has(a) || (b && (b === 'local' || b === 'lt') && n.params.length >= 2)) roots.add(n);
    }
  }
  pendingNames.forEach(nm => fnByName.has(nm) && roots.add(fnByName.get(nm)));
  // pass 2: same-file functions called from render closures are render code too (fixpoint)
  const enclosingFn = n => { for (let p = n.parent; p; p = p.parent) if (isFn(p)) return p; return null; };
  const inRender = n => { for (let f = isFn(n) ? n : enclosingFn(n); f; f = enclosingFn(f)) if (roots.has(f)) return f; return null; };
  for (let changed = true; changed;) {
    changed = false;
    for (const n of all) if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && fnByName.has(n.callee.name)) {
      const f = fnByName.get(n.callee.name); if (!roots.has(f) && inRender(n)) { roots.add(f); changed = true; }
    }
  }
  // pass 3: checks
  const declaredIn = (name, fn) => {   // is `name` declared inside fn (params or body)?
    if (fn.params.some(p => JSON.stringify(p, (k, v) => (k === 'parent' ? undefined : v)).includes(`"name":"${name}"`))) return true;
    let found = false; (function scan(n) { if (found) return; if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.id.name === name) found = true; if (n.type === 'FunctionDeclaration' && n.id && n.id.name === name) found = true; for (const c of children(n)) scan(c); })(fn.body);
    return found;
  };
  for (const n of all) {
    const R = (n.type === 'CallExpression' || n.type === 'NewExpression' || n.type === 'UpdateExpression' || n.type === 'AssignmentExpression') ? inRender(n) : null;
    if (n.type === 'CallExpression') {
      const c = n.callee, m = memberName(c), o = objName(c), id = c.type === 'Identifier' ? c.name : null;
      if (m === 'random' && o === 'Math') { if (R) add('math-random', n, 'Math.random() inside a render closure — the value depends on how many frames were rendered before'); }
      else if ((m === 'now' && (o === 'Date' || o === 'performance'))) { if (R) add('wall-clock', n, `${o}.now() inside a render closure`); else add('wall-clock-toplevel', n, `${o}.now() at build time`); }
      else if (['requestAnimationFrame', 'setTimeout', 'setInterval'].includes(id || (o === 'window' ? m : null))) add(R ? 'timer' : 'timer-toplevel', n, `${id || m}() ${R ? 'inside a render closure' : 'in page code'}`);
      else if (R && id && rngNames.has(id) && !inRender(rngNames.get(id))) add('rng-in-render', n, `${id}() is a seeded generator created outside the render closure`);
      else if (m === 'getDelta' || m === 'getElapsedTime') add('three-clock', n, `.${m}() reads a real-time clock`);
      else if (m === 'update' && c.object && /mixer/i.test(c.object.type === 'Identifier' ? c.object.name : memberName(c.object) || '')) add('mixer-update', n, `${c.object.type === 'Identifier' ? c.object.name : '…' + memberName(c.object)}.update(dt) advances an AnimationMixer by real elapsed time`);
    }
    if (n.type === 'NewExpression') {
      const c = n.callee, nm = c.type === 'Identifier' ? c.name : memberName(c);
      if (nm === 'Date' && !n.arguments.length) R ? add('wall-clock', n, 'new Date() inside a render closure') : add('wall-clock-toplevel', n, 'new Date() at build time');
      if (nm === 'Clock' && (c.type === 'Identifier' || objName(c) === 'THREE')) add('three-clock', n, 'new THREE.Clock() measures real time');
    }
    if (R && (n.type === 'UpdateExpression' || (n.type === 'AssignmentExpression' && n.operator !== '='))) {
      const tgt = n.type === 'UpdateExpression' ? n.argument : n.left;
      if (tgt.type === 'Identifier') {
        // declared outside the outermost render closure that contains this statement → state carried across frames
        let outer = R; for (let f = enclosingFn(R); f; f = enclosingFn(f)) if (roots.has(f)) outer = f;
        let local = false; for (let f = isFn(n) ? n : enclosingFn(n); f; f = f === outer ? null : enclosingFn(f)) { if (declaredIn(tgt.name, f)) { local = true; break; } }
        if (!local && !inLoopInit(n)) add('accumulate', n, `"${tgt.name}" ${n.operator || '='} … accumulates across frames`);
      }
    }
    // literal names: fx / outFx / transition / ease / theme / style / bg {type} / texture keys
    if (names && n.type === 'Property' && !n.computed) {
      const k = keyName(n.key), v = n.value && n.value.type === 'Literal' && typeof n.value.value === 'string' ? n.value.value : null;
      const check = (kind, nm, label) => { const valid = names[kind]; if (!valid || !nm || valid.includes(nm)) return; const s = suggest(nm, valid); add('unknown-name', n.value || n, `unknown ${label} "${nm}"${s.length ? ` — did you mean ${s.map(x => `"${x}"`).join(', ')}?` : ''}`, { kind, name: nm, suggestions: s }); };
      if (v != null && (k === 'fx' || k === 'outFx')) v.trim().split(/\s+/).forEach(x => check('fx', x, 'fx'));
      else if (v != null && k === 'transition') check('transitions', v.split(':')[0], 'transition');
      else if (v != null && k === 'ease' && !/[()]/.test(v)) check('eases', v, 'ease');
      else if (v != null && k === 'theme') check('themes', v, 'theme');
      else if (v != null && k === 'type' && n.parent && n.parent.parent && n.parent.parent.type === 'Property' && keyName(n.parent.parent.key) === 'bg') check('backgrounds', v, 'background');
      else if (v != null && k === 'style' && n.parent && isVideoCall(n.parent)) v.split(/\s*[+,]\s*/).forEach(tok => check('styles', tok.split(/[.:/]/)[0], 'style'));
      else if (k === 'texture' && n.value && n.value.type === 'ObjectExpression') n.value.properties.forEach(q => q.type === 'Property' && !q.computed && check('textures', keyName(q.key), 'texture'));
    }
  }
  return issues;
}
function inLoopInit(n) { const p = n.parent; return p && (p.type === 'ForStatement' && (p.update === n || p.init === n)); }
function isVideoCall(obj) { const c = obj.parent; return c && c.type === 'CallExpression' && memberName(c.callee) === 'video'; }

// lint a page: html text + a reader for local scripts ((relPath) → text | null)
// names a page registers itself (vk.use({fx: {tilt: …}, transitions: {…}}) / vk.register('fx', 'tilt', …)) → {kind: [names]}
const PLUGIN_KINDS = { fx: 'fx', transitions: 'transitions', textures: 'textures', backgrounds: 'backgrounds', themes: 'themes', eases: 'eases', styles: 'styles' };
export function registeredNames(code) {
  const out = {}; let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); } catch (e) { try { ast = acorn.parse(code, { ecmaVersion: 'latest', allowReturnOutsideFunction: true }); } catch (e2) { return out; } }
  const addN = (k, n) => { if (PLUGIN_KINDS[k] && typeof n === 'string') (out[PLUGIN_KINDS[k]] = out[PLUGIN_KINDS[k]] || []).push(n); };
  const objs = [];
  (function each(n) {
    if (n.type === 'CallExpression') {
      const m = memberName(n.callee), a = n.arguments;
      if (m === 'register' && a[0] && a[0].type === 'Literal' && a[1] && a[1].type === 'Literal') addN(a[0].value, a[1].value);
      if (m === 'use' && a[0] && a[0].type === 'ObjectExpression') objs.push(a[0]);
    }
    // plugin objects defined separately: const plugin = { name, fx: {…} } / export default { … } / window.myPlugin = { … }
    if (n.type === 'ObjectExpression' && n.properties.some(p => p.type === 'Property' && keyName(p.key) === 'name') && n.properties.some(p => p.type === 'Property' && PLUGIN_KINDS[keyName(p.key)])) objs.push(n);
    for (const c of children(n)) each(c);
  })(ast);
  for (const o of new Set(objs)) for (const p of o.properties) if (p.type === 'Property' && PLUGIN_KINDS[keyName(p.key)] && p.value.type === 'ObjectExpression') p.value.properties.forEach(q => q.type === 'Property' && !q.computed && addN(keyName(p.key), keyName(q.key)));
  for (const k in out) out[k] = [...new Set(out[k])];
  return out;
}
export function lintPage(html, { file = 'page.html', read = null, names = null } = {}) {
  const issues = [], files = [file];
  // pass 0: names the page / its local scripts register as plugins are valid too
  if (names) {
    const extra = {};
    for (const s of scriptsOf(html)) {
      const code = s.src ? (!/^(https?:)?\/\//.test(s.src) && !/(^|\/)(dist|vendor|node_modules)\//.test(s.src) && read ? read(s.src) : null) : s.code;
      if (code) for (const [k, v] of Object.entries(registeredNames(code))) (extra[k] = extra[k] || []).push(...v);
    }
    if (Object.keys(extra).length) names = Object.fromEntries(Object.entries(names).map(([k, v]) => [k, v && extra[k] ? v.concat(extra[k]) : v]));
  }
  for (const s of scriptsOf(html)) {
    if (s.type && !/javascript|module|^$/.test(s.type)) continue;
    if (s.src) {
      if (/(^|\/)(dist|vendor|node_modules)\//.test(s.src) || /^(https?:)?\/\//.test(s.src) || !read) continue;
      const txt = read(s.src); if (txt == null) continue; files.push(s.src);
      issues.push(...lintSource(txt, { file: s.src, module: s.type === 'module', names: null }));
      continue;
    }
    issues.push(...lintSource(s.code, { file, line0: s.line0, col0: s.col0, module: s.type === 'module', names }));
  }
  return { files, issues, errors: issues.filter(i => i.severity === 'error').length, warnings: issues.filter(i => i.severity === 'warn').length };
}
export function formatIssue(i) { return `${i.file}:${i.line}:${i.col}  ${i.severity === 'error' ? 'error' : 'warn '}  ${i.rule}  ${i.message}\n      hint: ${i.hint}`; }
