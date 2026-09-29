// print outerHTML of the active scene(s) at time t: node scripts/probe-html.mjs page.html t
import { chromium } from 'playwright';
import { startServer, pageUrl, LAUNCH } from '/workspace/vidkit/cli/lib.mjs';
const { server, port } = await startServer();
const b = await chromium.launch(LAUNCH); const p = await b.newPage({viewport:{width:1280,height:720}});
p.on('pageerror', e => console.log('ERR', e.stack));
await p.goto(pageUrl(port, (await import('node:path')).resolve(process.argv[2]), { render: '1' }));
await p.waitForFunction(() => window.__ready);
console.log(await p.evaluate(t => { window.__seek(t); return [...document.querySelectorAll('.vk-scene')].filter(s => getComputedStyle(s).display !== 'none' && s.style.visibility !== 'hidden').map(s => s.outerHTML.slice(0, 3000)).join('\n----\n'); }, +process.argv[3]));
await b.close(); server.close();
