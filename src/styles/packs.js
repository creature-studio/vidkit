// Style packs are NO LONGER compile-time imports. Runtime loader:
//   Node / tests:  await vk.style.loadAll()   (fs discover styles/<id>/)
//   Browser/CLI:   styles/boot.mjs via HTML inject (cli/lib.mjs) or `await import('../styles/boot.mjs').then(m => m.boot(vk))`
//   Manual:        vk.style.register(json, factory)  /  await vk.style.load(id)
// three-tech still self-registers from dist/vidkit-three.js (needs THREE).
// This module keeps a static id list only for docs/fallbacks — regenerate via styles/manifest.json.
export const PACK_IDS = ['ink', 'papercut', 'shadow', 'opera', 'tech', 'neon', 'pixel', 'crayon', 'reel'];
export const PACKS = []; // intentionally empty — do not reintroduce hard imports
