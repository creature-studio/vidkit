// print scene list JSON: node scripts/probe-scenes.mjs page.html
import { chromium } from 'playwright';
import { startServer, pageUrl, LAUNCH } from '/workspace/vidkit/cli/lib.mjs';
const { server, port } = await startServer();
const b = await chromium.launch(LAUNCH); const p = await b.newPage();
await p.goto(pageUrl(port, (await import('node:path')).resolve(process.argv[2]), { render: '1' }));
await p.waitForFunction(() => window.__ready);
console.log(JSON.stringify(await p.evaluate(() => window.__scenes)));
await b.close(); server.close();
