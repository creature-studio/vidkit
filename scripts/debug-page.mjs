// Debug helper: load a page in render mode and print console output + page errors with stacks.
// usage: node scripts/debug-page.mjs /abs/page.html
import { chromium } from 'playwright';
import { startServer, pageUrl, LAUNCH } from '/workspace/vidkit/cli/lib.mjs';
const { server, port } = await startServer();
const b = await chromium.launch(LAUNCH); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e.stack));
p.on('console', m => console.log('LOG', m.type(), m.text()));
await p.goto(pageUrl(port, process.argv[2], { render: '1' }));
await p.waitForTimeout(1500);
await b.close(); server.close();
