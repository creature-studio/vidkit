// collectInfo(window) → plain JSON description of a loaded vidkit page (the globals vk.video() publishes).
// Self-contained on purpose: the studio UI calls it on the preview iframe's window, and cli/studio.mjs hands the
// same function to Playwright's page.evaluate() for its headless twin — so both sides see identical metadata.
export function collectInfo(w) {
  w = w || window;
  const pick = (o, keys) => o ? Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]])) : null;
  const meta = w.__vk || {};
  return {
    ready: true,
    title: meta.title || (w.document && w.document.title) || '',
    duration: w.__duration, fps: w.__fps, size: w.__size,
    frames: Math.round((w.__duration || 0) * (w.__fps || 30)),
    format: meta.format || null, theme: meta.theme || null, safe: meta.safe || null, zones: meta.zones || [],
    scenes: (w.__scenes || []).map(s => ({ index: s.index, name: s.name, start: s.start, dur: s.dur, end: s.start + s.dur, transition: s.transition, settle: s.settle, vo: s.vo })),
    captions: (w.__captions || []).map(c => [c[0], c[1], typeof c[2] === 'string' ? c[2].replace(/<[^>]+>/g, '') : String(c[2])]),
    beats: w.__beats || null,
    cues: w.__cues || [],
    music: w.__music || null,
    voice: (w.__voice || []).map(v => pick(v, ['t', 'dur', 'src', 'gain', 'text', 'scene', 'who'])),
    voMissing: (w.__voMissing || []).length,
    motionBlur: w.__motionBlur || null,
    strict: !!w.__strict, draft: !!w.__draft,
    hasScore: typeof w.SCORE === 'function',
    bake: w.__bake || null,
    errors: (w.__vkErrors || []).slice(-20),
  };
}
