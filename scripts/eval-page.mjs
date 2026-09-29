// Debug helper: evaluate an expression in a page (render mode). usage: node scripts/eval-page.mjs /abs/page.html "expr"
import { chromium } from 'playwright';
import { startServer, pageUrl, LAUNCH } from '/workspace/vidkit/cli/lib.mjs';
const { server, port } = await startServer();
const b = await chromium.launch(LAUNCH); const p = await b.newPage();
p.on('console', m => console.log('CONSOLE', m.text()));
await p.goto(pageUrl(port, process.argv[2], { render: '1' }));
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(process.argv[3] || '(window.__scenes||[]).map(s=>[s.name, +s.start.toFixed(3), +s.dur.toFixed(3), s.transition.type])')));
await b.close(); server.close();
