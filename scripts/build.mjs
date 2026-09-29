// Bundle src/ → dist/vidkit.js (IIFE, window.vk) and dist/vidkit.esm.js
import { build } from 'esbuild';
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const banner = `/*! ${pkg.name} ${pkg.version} — deterministic HTML/JS → video. MIT. Bundled fonts: SIL OFL 1.1 (see fonts/LICENSES.md) */`;
await build({ entryPoints: ['src/browser.js'], bundle: true, format: 'iife', target: 'chrome110', outfile: 'dist/vidkit.js', banner: { js: banner }, legalComments: 'none' });
await build({ entryPoints: ['src/index.js'], bundle: true, format: 'esm', target: 'chrome110', outfile: 'dist/vidkit.esm.js', banner: { js: banner } });
console.log('built dist/vidkit.js', (fs.statSync('dist/vidkit.js').size / 1024).toFixed(1) + ' KB');
