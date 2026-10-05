// Browser style boot: register every pack under this styles/ directory (ES modules).
// Used by CLI HTML inject and by preview pages: `await import('../styles/boot.mjs').then(m => m.boot(vk))`.
import { loadAllBrowser, loadOneBrowser } from '../src/styles/loader.js';

const HERE = new URL('./', import.meta.url).href;

export async function boot(vk, { ids, stylesUrl = HERE } = {}) {
  if (!vk || !vk.style) throw new Error('[vk.style.boot] vk not ready');
  // Prefer manifest when present; fall back to scanning via /styles/manifest.json only
  try {
    return await loadAllBrowser(vk, stylesUrl, ids);
  } catch (e) {
    // last resort: try known core ids if manifest missing (should not happen in-repo)
    const fallback = ids || ['ink', 'papercut', 'shadow', 'opera', 'tech', 'neon', 'pixel', 'crayon', 'reel'];
    const out = [];
    for (const id of fallback) {
      try { out.push(await loadOneBrowser(vk, id, stylesUrl)); } catch (err) { console.warn('[vk.style.boot]', id, err.message); }
    }
    return out;
  }
}

export { loadOneBrowser, loadAllBrowser };
