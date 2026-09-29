// vk preview page.html [--port 5173] [--host 127.0.0.1] [--dev]
// Local dev server: serves the page, live-reloads on any change in its folder or in vidkit/dist
// (with --dev also rebuilds dist from src/ on change). The in-page player has a scrubber, scene list,
// frame stepping and a safe-area overlay; the current time survives reloads.
import { parseArgs, startServer, pageUrl, ROOT, fs, path } from './lib.mjs';
export default async function preview(argv) {
  const opt = parseArgs(argv), abs = path.resolve(opt._[0] || ''); if (!fs.existsSync(abs)) throw new Error('usage: vk preview page.html [--port 5173]');
  const clients = new Set();
  const inject = html => html.replace(/<\/body>/i, `<script>(()=>{const es=new EventSource('/__vk/events');es.onmessage=()=>location.reload();})();</script></body>`);
  const extra = (req, res, p) => {
    if (p !== '/__vk/events') return false;
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' }); res.write(': hi\n\n');
    clients.add(res); req.on('close', () => clients.delete(res)); return true;
  };
  const { port } = await startServer({ inject, extra, port: +(opt.port || 5173), host: opt.host || '127.0.0.1' });
  let timer = null;
  const reload = (why) => { clearTimeout(timer); timer = setTimeout(() => { console.log('  ↻', why); clients.forEach(c => c.write('data: reload\n\n')); }, 120); };
  const watch = (dir, filter = () => true, onChange = f => reload(f)) => { try { fs.watch(dir, { recursive: true }, (e, f) => { if (f && filter(f)) onChange(path.join(dir, f)); }); } catch (e) { console.warn('  watch failed', dir, e.message); } };
  watch(path.dirname(abs), f => !/(^|\/)(out|node_modules|\.git)\//.test(f) && !/\.(mp4|png|srt|json)$/.test(f) || /data\/.*\.json$/.test(f));
  watch(path.join(ROOT, 'dist'));
  if (opt.dev) {
    const { context } = await import('esbuild');
    const ctx = await context({ entryPoints: [path.join(ROOT, 'src/browser.js')], bundle: true, format: 'iife', target: 'chrome110', outfile: path.join(ROOT, 'dist/vidkit.js') });
    watch(path.join(ROOT, 'src'), () => true, async f => { try { await ctx.rebuild(); console.log('  rebuilt dist/vidkit.js'); } catch (e) { console.error(e.message); } });
  }
  const url = pageUrl(port, abs).replace('127.0.0.1', opt.host && opt.host !== '0.0.0.0' ? opt.host : '127.0.0.1');
  console.log(`[vk preview] ${url}\n  Space play · ←/→ seek · ,/. frame · s safe area · c captions · f fullscreen · Ctrl+C to stop`);
  return new Promise(() => { });
}
