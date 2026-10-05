// Bundle src/ → dist/vidkit.js (IIFE, window.vk) and dist/vidkit.esm.js
import { build } from 'esbuild';
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const banner = `/*! ${pkg.name} ${pkg.version} — deterministic HTML/JS → video. MIT. Bundled fonts: SIL OFL 1.1 (see fonts/LICENSES.md) */`;
await build({ entryPoints: ['src/browser.js'], bundle: true, format: 'iife', target: 'chrome110', outfile: 'dist/vidkit.js', banner: { js: banner }, legalComments: 'none',
  // Keep pack loader off the IIFE graph (CLI inject uses styles/boot.mjs). schema.js stays bundled via static import.
  external: ['./styles/loader.js'] });
await build({ entryPoints: ['src/index.js'], bundle: true, format: 'esm', target: 'chrome110', outfile: 'dist/vidkit.esm.js', banner: { js: banner },
  external: ['node:fs', 'node:path', 'node:url'] });
// optional 3D bundle (vk.three): three r186 (vendor/three, MIT) + vidkit's three layer/modules; attaches to window.vk
const vendorThree = { name: 'vendor-three', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: new URL('../vendor/three/build/three.module.js', import.meta.url).pathname })); } };
await build({ entryPoints: ['src/three/index.js'], bundle: true, format: 'iife', target: 'chrome110', outfile: 'dist/vidkit-three.js', minify: true, plugins: [vendorThree], legalComments: 'eof',
  // addons that resolve files with import.meta.url (DRACOLoader's decoder) see their vendored location instead
  define: { 'import.meta.url': 'VK_THREE_META_URL' },
  banner: { js: `/*! ${pkg.name} ${pkg.version} — vk.three (optional 3D bundle; load after dist/vidkit.js). MIT. Includes three.js r186 (MIT, © 2010-2026 three.js authors) — see vendor/LICENSES.md */\nvar VK_THREE_META_URL = (function () { try { return new URL('../vendor/three/examples/jsm/loaders/x.js', document.currentScript.src).href; } catch (e) { return location.href; } })();` } });
console.log('built dist/vidkit-three.js', (fs.statSync('dist/vidkit-three.js').size / 1024).toFixed(1) + ' KB');
console.log('built dist/vidkit.js', (fs.statSync('dist/vidkit.js').size / 1024).toFixed(1) + ' KB');
