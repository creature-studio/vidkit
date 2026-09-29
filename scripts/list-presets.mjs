// Print every registered preset name per kind (used to keep README's catalog in sync): node scripts/list-presets.mjs
import { chromium } from 'playwright';
import { startServer, pageUrl, LAUNCH } from '/workspace/vidkit/cli/lib.mjs';
import path from 'node:path';
const { server, port } = await startServer();
const b = await chromium.launch(LAUNCH); const p = await b.newPage();
await p.goto(pageUrl(port, path.resolve('examples/gallery.html'), { render: '1' }));
await p.waitForFunction(() => window.__ready);
console.log(JSON.stringify(await p.evaluate(() => Object.fromEntries(['fx', 'transitions', 'textures', 'backgrounds', 'blocks', 'themes', 'formats', 'sounds'].map(k => [k, vk.list(k)]))), null, 1));
await b.close(); server.close();
