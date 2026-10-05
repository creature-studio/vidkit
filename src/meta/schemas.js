// Registry metadata: a schema for every built-in fx / transition / texture / background / block / sound / ease /
// theme / format / material / style / vk.three module. Pure data (no DOM): `vk.list(kind, {detail:true})`,
// `npm run docs` (llms.txt · docs/api.json · docs/vk.d.ts) and strict-mode suggestions read it.
// Param shorthand: 'type|default|range|description'   (type: number · string · boolean · color · time · ease · fx ·
// enum(a/b/c) · array · object · function · number|function …; range 'a..b'; any part may be empty)
export function param(s) {
  if (s && typeof s === 'object') return s;
  // the type may itself be a union ('number|string|…'): leading parts that are type names belong to it
  const parts = String(s).split('|'), T = /^(number|string|boolean|color|time|ease|fx|array|object|function|any|null|enum\(.*\))$/;
  let n = 1; while (n < parts.length - 3 && T.test(parts[n])) n++;
  const [def, range, ...rest] = parts.slice(n), type = parts.slice(0, n).join('|');
  const p = { type: type || 'any' }, d = (def || '').trim();
  if (d !== '') p.default = /^-?(\d|\.\d)/.test(d) && !isNaN(+d) ? +d : d === 'true' ? true : d === 'false' ? false : d === 'null' ? null : d.replace(/^'(.*)'$/, '$1');
  if (range && /\.\./.test(range)) p.range = range.split('..').map(Number);
  const desc = rest.join('|').trim(); if (desc) p.description = desc;
  const m = /^enum\((.*)\)$/.exec(p.type); if (m) { p.type = 'enum'; p.values = m[1].split('/'); }
  return p;
}
const E = (description, params = {}, example, extra = {}) => ({ description, params, example, ...extra });

/* ---------------- shared option sets ---------------- */
export const COMMON = {
  // every element factory (vk.title / vk.text / vk.badge / …) and every fx accept these
  node: {
    at: 'time||| entrance time (scene-local s, "b:8" beat, "+0.3" after the previous element; default: cascade)',
    fx: "fx|||entrance effect name(s), space-combinable ('up blur'); false = none",
    d: 'number||0..10|entrance duration (s); default depends on the fx',
    ease: 'ease|||easing name / cubic-bezier(a,b,c,d) / spring(k,w) / steps(n)',
    each: 'number||0..2|stagger between letters/words/items (s)',
    out: 'time|||exit time (scene-local s); exit uses outFx (default: the entrance fx reversed)',
    outFx: 'fx|||exit effect',
    sfx: 'string|||sound played at the entrance (a sounds name)',
    size: "number|string|||font size: number = px at 720p (auto-scaled) or a theme step 'h1' 'h2' 'body' …",
    color: 'color|||text colour (CSS) or a palette name (accent, fg, muted …)',
    bg: 'color|||element background',
    weight: 'number|||font weight', font: 'enum(display/mono/sans/serif/condensed/brush)|||font family slot',
    align: 'enum(left/center/right)|||text alignment', w: 'number|||width: ≤1 = fraction of the frame, >1 = px', maxW: 'number|||max width (same units as w)',
    mt: 'number|||margin-top (same units as w)', pos: 'object|||absolute position {x, y, right, bottom, anchor:"center"|"tl"…}; leaves the centred flow',
    fixed: 'boolean|false||not affected by the scene camera', class: 'string|||extra CSS class (vk-bleed = allowed outside the safe area)', id: 'string|||element id',
    style: 'string|||inline CSS', on: 'function|||per-frame hook on(el, local, p, t) — must depend on time only',
    beat: 'object|||beat pulse {scale, brightness, unit:"beat"|"bar", k, beats:[…]}', energy: 'object|||music-energy modulation {scale:[a,b], brightness:[a,b], band}',
    markAt: 'time|||when **/==/__ inline marks animate',
  },
  // vk.scene(name, dur, opts, nodes) options
  scene: {
    bg: "string|object|array|||'dark' | 'light' | 'accent' (palette mode) | CSS colour | {type:'mesh'|'grid'|…} | array of layers",
    mode: 'enum(dark/light/accent)|||palette mode for text', transition: "string|object|||entrance transition 'name:seconds' or {type, d, ease, focal:{x,y}}",
    cap: 'string|array|||caption text, ["a","b"] split evenly, or [[start,end,text],…]', camera: 'array|||camera keys [{t, x, y, s, r, ease}]',
    cameraHold: 'boolean|false||omitted camera keys keep the previous value', shots: 'array|||shot list [{t, shot:"medium", on: subject, punch, pan, dolly}]',
    push: 'number|0|0..0.3|slow push-in over the scene', shake: 'array|||[{t, amp, d}] handheld shakes', texture: 'object|||per-scene textures {name: opts}',
    layout: 'enum(center/left/top/bottom)|center||content layout', sfx: 'boolean|true||false = no automatic transition whoosh',
    vo: 'string|array|||voice-over text (run `vk tts page.html`); arrays = several lines / speakers', voLead: 'number|||seconds before the voice starts',
    hold: 'number|2.2||extra seconds after the last animation when dur is "auto"', snap: "string|||'beat' | 'bar' | 'b:2' — extend the cut to the grid",
    start: 'time|||absolute start (default: previous end − transition)', end: 'time|||absolute cut time', beat: 'object|||whole-frame beat pulse', energy: 'object|||whole-frame energy modulation',
  },
  // vk.video(cfg)
  video: {
    format: "string|16:9||'16:9' '1080p' '9:16' '1:1' '4:5' (aliases landscape vertical square portrait) — or w/h",
    w: 'number|||custom width (px)', h: 'number|||custom height (px)', fps: 'number|30|1..120|frames per second',
    theme: "string|object|tech-blue||theme name or {extends, modes:{dark:{accent}}}", style: "string|array|object|||style pack id(s): 'papercut', ['ink','papercut.chars'], {base, chars, …}",
    transition: "string|fade:0.4||default scene transition 'name:seconds'", push: 'number|0|0..0.3|default slow push-in per scene', ease: 'ease|||default ease (theme default otherwise)',
    texture: 'object|||film-wide textures {grain: {amount}, vignette: .3, …}', bpm: 'number|||beat grid tempo', beatOffset: 'number|0||first beat (s)',
    beats: 'array|string|||explicit beat times or a `vk analyze` JSON path', music: 'string|||music file (mixed at render, ducked under voice)', musicStart: 'number|0||music offset (s)',
    voice: 'object|string|||TTS config {manifest, voice, rate, lead, tail, cast:{who:{voice}}}', captions: 'array|string|||[[start,end,text]] or an align JSON',
    karaoke: 'enum(sweep/on/pop)|sweep||word-timed caption style', lyrics: 'object|string|||lyric align JSON for vk.lyricVideo', mix: 'object|||{lufs:-14, duck:-10, fadeOut:2}',
    autoSfx: 'boolean|false||whoosh on every transition', score: 'array|||[[t, sound, gain, freq]] offline-synthesised SFX', motionBlur: "object|||sub-frame motion blur {shutter:'1/40', samples:4} (vk render)",
    cover: 'object|||defaults for cover transitions {colors, n, axis}', fadeOut: 'number|||fade the last scene to black over N seconds', seed: 'number|1||seed of Math.random in setup code',
    strict: 'boolean|false||unknown names throw (with did-you-mean); Math.random() during a frame throws. CLI vk peek/qa/render turn it on by default',
    draft: 'boolean|false||draft preview quality (lower 3D res/AA, no DOF/bloom); vk peek/render --draft set it', manual: 'boolean|false||call v.start() yourself',
    bake: 'boolean|true||static-layer cache (vk.bake)', title: 'string|||title shown in contact sheets', safe: 'object|||override title-safe margins {top,right,bottom,left}',
  },
  fx: { t: 'number|||start (filled from at)', d: 'number|||duration (s)', ease: 'ease|||easing', each: 'number|||stagger (s)' },
  transition: { d: 'number|0.5|0..3|duration (s): the overlap with the previous scene', ease: 'ease|inOutCubic||progress easing', focal: 'object|||{x, y} focus point (px or 0–1) for iris / zoom / shape transitions' },
  texture: { amount: 'number|||strength (0–1 for most)' },
  background: { type: 'string|||background name' },
};

/* ---------------- fx ---------------- */
const dist = d => ({ dist: `number|${d}|0..400|travel distance (px at 720p)` });
const per = (d, each) => ({ d: `number|${d}|0..5|per-piece duration (s)`, each: `number|${each}|0..1|stagger between pieces (s)`, stagger: 'number|||alias of each' });
export const FX = {
  fade: E('opacity 0 → 1', {}, null, { combinable: true }),
  up: E('fade in while sliding up', dist(28), null, { combinable: true }), down: E('fade in while sliding down', dist(28), null, { combinable: true }),
  left: E('fade in from the left', dist(44), null, { combinable: true }), right: E('fade in from the right', dist(44), null, { combinable: true }),
  scale: E('fade in from 90 % scale', {}, null, { combinable: true }), pop: E('pop from 60 % with overshoot (outBack)', {}, null, { combinable: true }),
  zoom: E('fade in from 115 % scale', {}, null, { combinable: true }), blur: E('fade in from a 14 px blur', {}, null, { combinable: true }),
  rise: E('rise from below with blur, outExpo', dist(40), null, { combinable: true }),
  wipe: E('clip-path wipe left → right', {}, null, { combinable: true }), 'wipe-left': E('clip-path wipe right → left', {}, null, { combinable: true }),
  'wipe-up': E('clip-path wipe bottom → top', {}, null, { combinable: true }), 'wipe-down': E('clip-path wipe top → bottom', {}, null, { combinable: true }),
  reveal: E('mask reveal: slides up out of its own clip box', {}, "vk.h2('Reveal', { fx: 'reveal' })", { combinable: true }),
  grow: E('scaleX 0 → 1 from the left edge (bars, rules)', {}, null, { combinable: true }), 'grow-y': E('scaleY 0 → 1 from the bottom', {}, null, { combinable: true }),
  flip: E('3D flip up around the bottom edge', {}, null, { combinable: true }),
  stretch: E('font-stretch 62 % → 100 % + tracking (needs a variable-width font: font:"display")', {}, "vk.title('STRETCH', { fx: 'stretch', font: 'display' })", { combinable: true }),
  none: E('no animation (visible at once)', {}, null, { combinable: true }),
  letters: E('per-letter slide up from a baseline clip (default title fx)', per(.6, .035), "vk.title('Letters', { fx: 'letters', each: .04 })"),
  'letters-fade': E('per-letter fade + rise', per(.5, .03)), 'letters-blur': E('per-letter un-blur from 130 %', per(.7, .04)),
  domino: E('per-letter 3D domino fall-in', per(.55, .05)),
  words: E('per-word pop 145 % → 100 % (use | to split CJK manually)', per(.5, .09), "vk.title('用|代码|写|视频', { fx: 'words' })"),
  'words-up': E('per-word push up', per(.6, .08)),
  squash: E('per-letter squash & stretch pop', per(.55, .05)),
  assemble: E('letters fly in from seeded scattered positions', { d: 'number|0.9|0..5|duration', spread: 'number|1|0..5|scatter radius (em)', seed: 'number|7||scatter seed' }),
  wave: E('persistent sine wave per letter', { amp: 'number|0.12|0..1|amplitude (em)', speed: 'number|6|0..30|rad/s' }),
  type: E('typewriter with caret (reserves the final width)', { cps: 'number|30|1..200|characters per second', caret: 'boolean|true||show caret', reserve: 'boolean|true||keep final width', text: 'string|||text to type (default: element text)' }, "vk.text('npm i vidkit', { fx: 'type', cps: 14 })"),
  scramble: E('random-glyph decode into the text (seeded)', { d: 'number|0.5||per-letter settle time', each: 'number|0.04||stagger', rate: 'number|20||glyph changes per second', glyphs: 'string|||glyph set' }),
  decode: E('alias of scramble', { d: 'number|0.5||', each: 'number|0.04||', rate: 'number|20||' }, null, { aliasOf: 'scramble' }),
  count: E('number counter (thousands separator, decimals, prefix/suffix)', { from: 'number|0||start value', to: 'number|||end value (default: the text)', decimals: 'number|0|0..6|decimals', sep: "string|||thousands separator (',')", d: 'number|1.2||duration', prefix: 'string|||', suffix: 'string|||', format: 'function|||v => string' }, "vk.title('0', { fx: 'count', to: 2048, sep: ',' })"),
  highlight: E('animate ==marker== spans (highlighter sweep)', { d: 'number|0.6||', each: 'number|0.25||' }, "vk.text('mark ==this== part')"), marker: E('alias of highlight', {}, null, { aliasOf: 'highlight' }),
  underline: E('animate __underline__ spans (draw-in)', { d: 'number|0.6||', each: 'number|0.25||' }),
  swap: E('keyword colour swap at t', { color: 'color|accent||target colour', d: 'number|0.3||' }),
  stack: E('kinetic stack: each line fills the box width, alternating entrance directions (vk.stack)', { each: 'number|0.22||', d: 'number|0.55||', width: 'number|||box width (px)' }, "vk.stack(['KINETIC', 'TYPE'])"),
  draw: E('SVG stroke draw-on', { d: 'number|1.2||', each: 'number|||stagger between paths' }, "vk.svg('<path d=\"M40 220 C 120 40, 220 40, 260 150\"/>', { fx: 'draw', viewBox: '0 0 500 300' })"),
  'draw-fill': E('SVG stroke draw then fill', { d: 'number|1.2||', fillD: 'number|0.5||fill fade duration', each: 'number|||' }), fill: E('alias of draw-fill', {}, null, { aliasOf: 'draw-fill' }),
  morph: E('SVG shape morph through paths / shapes (beat-synced with beats:n)', { paths: 'array|||path strings', shapes: "array|||shape names ['circle','star','heart','square',…]", n: 'number|120||resample points', r: 'number|100||shape radius', cx: 'number|0||', cy: 'number|0||', beats: 'number|||one step every n beats (needs bpm)', each: 'number|||seconds per step', d: 'number|0.9||' }),
  ink: E('ink bleed-in (blur + scale)', {}, null, { combinable: true, pack: 'ink' }), brush: E('brush wipe top → bottom with soft edge', {}, null, { combinable: true, pack: 'ink' }),
  'brush-x': E('brush wipe left → right', {}, null, { combinable: true, pack: 'ink' }), stamp: E('seal stamp-in (scale 150 % + rotate)', {}, null, { combinable: true, pack: 'ink' }),
  slam: E('poster slam: big scale + rotation + offset → land (vk.mg)', { echo: 'number|0|0..6|ghost copies', shadow: 'array|||hard shadow [dx, dy, colour]', wobble: 'number|||settle wobble', scale: 'number|||start scale', rot: 'number|||start rotation (deg)', x: 'number|0||', y: 'number|0||', dir: 'number|1||' }, "vk.title('SLAM', { fx: 'slam', echo: 3 })", { lazy: true }),
  echo: E('echo ghosts scale in behind the text (vk.mg)', { echo: 'number|3||ghosts', echoStep: 'number|||', echoAlpha: 'number|||' }, null, { lazy: true }),
  drop: E('per-letter drop with squash & stretch (vk.mg)', { each: 'number|||', d: 'number|||', shadow: 'array|||[dx,dy,colour]' }, "vk.title('MOTION', { fx: 'drop', shadow: [10, 10, '#0008'] })", { lazy: true }),
  'letters-pop': E('per-letter pop + bob (vk.mg)', { each: 'number|||', d: 'number|||', bob: 'number|||' }, null, { lazy: true }),
  'mask-rise': E('per-letter rise from a mask line (vk.mg)', { each: 'number|||', d: 'number|||' }, null, { lazy: true }),
  'hard-shadow': E('hard drop shadow grows (combine: "pop hard-shadow") (vk.mg)', { shadowColor: 'color|||', shadowX: 'number|||', shadowY: 'number|||' }, "vk.title('POP', { fx: 'pop hard-shadow' })", { lazy: true, combinable: true }),
};

/* ---------------- transitions ---------------- */
const dirs = (base, what) => Object.fromEntries(['left', 'right', 'up', 'down'].map(d => [`${base}-${d}`, E(`${what} (${d})`)]));
export const TRANSITIONS = {
  none: E('hard cut (also "cut")'), fade: E('new scene fades in over the old'), crossfade: E('both scenes cross-fade'),
  dip: E('dip through black (color option)', { color: 'color|#000||dip colour' }), flash: E('white flash cut', { color: 'color|#fff||flash colour' }),
  ...dirs('slide', 'new scene slides in'), ...dirs('push', 'new scene pushes the old one out'), ...dirs('whip', 'fast whip pan with motion blur'), ...dirs('wipe', 'clip wipe'),
  wipe: E('alias of wipe-right', {}, null, { aliasOf: 'wipe-right' }),
  'zoom-in': E('zoom in + fade'), zoom: E('alias of zoom-in', {}, null, { aliasOf: 'zoom-in' }), 'zoom-out': E('zoom out + fade'), blur: E('blur cross-dissolve'),
  'zoom-through': E('old scene scales 40× through the focal point (e.g. a letter hole)', { scale: 'number|40||final scale', focal: 'object|||{x, y}' }),
  iris: E('circle iris opens from the focal point', { focal: 'object|||{x, y}' }), circle: E('alias of iris', {}, null, { aliasOf: 'iris' }), 'iris-out': E('old scene closes into a circle'),
  ...Object.fromEntries(['diamond', 'star', 'hexagon', 'triangle', 'heart', 'square', 'blob'].map(s => [`shape-${s}`, E(`${s}-shaped mask grows from the focal point`, { focal: 'object|||{x, y}' })])),
  split: E('vertical split opens'), 'split-h': E('horizontal split opens'), 'split-open': E('old scene splits apart from the middle'), diagonal: E('diagonal wipe'),
  blinds: E('venetian blinds', { n: 'number|8|2..40|slats' }), glitch: E('slice displacement + hue jitter'), slice: E('alias of glitch', {}, null, { aliasOf: 'glitch' }),
  ink: E('ink drop spreads into the new scene', { x: 'number|||focal x', y: 'number|||focal y' }, null, { pack: 'ink' }), wash: E('soft blur wash cross-fade', {}, null, { pack: 'ink' }),
  stripes: E('cover: n colour bars slide in staggered then out (vk.mg)', { n: 'number|6|1..20|bars', colors: 'array|||bar colours', axis: 'enum(x/y/alt)|alt||direction', stagger: 'number|||', travel: 'number|||', reverse: 'boolean|false||' }, "vk.scene('B', 4, { transition: 'stripes:0.6' }, [])", { lazy: true, cover: true }),
  bars: E('cover: bars grow across from one side then retract (vk.mg)', { n: 'number|6|1..20|bars', colors: 'array|||', axis: 'enum(x/y/alt)|alt||' }, null, { lazy: true, cover: true }),
  tear: E('paper tear edge sweeps across (style packs)', { jag: 'number|26||edge jaggedness px', n: 'number|34||edge points', tilt: 'number|0.18||diagonal tilt', seed: 'number|3||' }, null, { lazy: true, pack: 'styles' }),
  pixel: E('blocky staggered pixel fill (style packs)', {}, null, { lazy: true, pack: 'styles' }), cloud: E('scalloped auspicious-cloud iris (style packs)', {}, null, { lazy: true, pack: 'styles' }),
  scribble: E('boiling hand-drawn blob iris (style packs)', {}, null, { lazy: true, pack: 'styles' }), lamp: E('lamp dip to warm dark with flicker (style packs)', { color: 'color|#1c0c05||' }, null, { lazy: true, pack: 'styles' }),
  scan: E('CRT scan-line opens vertically (style packs)', {}, null, { lazy: true, pack: 'styles' }),
};

/* ---------------- textures / backgrounds ---------------- */
export const TEXTURES = {
  grain: E('film grain (seeded tiles, 24 fps refresh)', { amount: 'number|0.06|0..1|opacity', blend: 'string|overlay||CSS blend mode', fps: 'number|24||refresh rate' }, 'vk.video({ texture: { grain: { amount: .05 } } })'),
  vignette: E('radial vignette', { amount: 'number|0.35|0..1|edge darkness', inner: 'number|45|0..100|clear radius (%)' }, 'vk.video({ texture: { vignette: .3 } })'),
  flicker: E('projector exposure flicker', { amount: 'number|0.03|0..1|', fps: 'number|24||' }),
  paper: E('static paper fibre multiply', { amount: 'number|0.5|0..1|', color: 'color|#F4EEE2||', seed: 'number|42||' }),
  halftone: E('halftone dot screen', { size: 'number|7||cell px', dot: 'number|28|0..100|dot size %', color: 'color|||', blend: 'string|soft-light||', angle: 'number|||' }),
  scanlines: E('CRT scanlines (optional roll)', { amount: 'number|0.22|0..1|', size: 'number|4||line pitch px', roll: 'number|||roll speed' }),
  rgb: E('RGB misregistration (SVG filter on the scene stack)', { amount: 'number|2|0..20|offset px', angle: 'number|0||deg', pulse: 'number|||pulse on beats (k)', fn: 'function|||t => multiplier' }),
  rice: E('rice-paper fractal fibres + vignette (ink pack)', { amount: 'number|0.55|0..1|', size: 'number|300||tile px', freq: 'number|0.85||', seed: 'number|4||', vignette: 'number|0.22||', cache: 'boolean|true||' }, null, { pack: 'ink' }),
};
export const BACKGROUNDS = {
  gradient: E('linear gradient (optional spin)', { colors: 'array|||colours (default bg → surface)', angle: 'number|135||deg', spin: 'number|0||deg/s' }, "vk.scene('A', 4, { bg: { type: 'gradient', spin: 10 } }, [])"),
  mesh: E('flowing mesh gradient blobs', { colors: 'array|||', speed: 'number|0.12||', base: 'color|||', size: 'number|55||blob size %', opacity: 'number|1||', blur: 'number|||' }),
  grid: E('line grid (drift)', { size: 'number|64||cell px', color: 'color|||', width: 'number|1||', fade: 'boolean|||radial fade', opacity: 'number|||', drift: 'number|10||px/s', dx: 'number|0||', dy: 'number|||' }),
  dots: E('dot grid (drift)', { size: 'number|28||', color: 'color|||', r: 'number|2||dot radius', fade: 'boolean|||', opacity: 'number|||', drift: 'number|8||' }),
  noise: E('animated value noise (canvas)', { res: 'number|64||', from: 'color|||', to: 'color|||', scale: 'number|3.2||', speed: 'number|0.15||', contrast: 'number|1.6||', opacity: 'number|||' }),
  dotwave: E('radial sine dot field + beat rings + hue cycle (vk.mg, canvas)', { step: 'number|||px between dots', color: 'color|||', hole: 'object|||{w, h, soft} keep text area clear', every: 'number|||' }, "vk.scene('A', 4, { bg: { type: 'dotwave', hole: { w: 600, h: 200 } } }, [])", { lazy: true }),
};

/* ---------------- blocks (element factories, exposed as vk.<name>) ---------------- */
// core element factories (src/authoring/api.js): text, layout and raw-code nodes. All take the common node options.
export const ELEMENTS = {
  title: E('main title (h1); default fx letters', { size: "number|string|||720p px or 'h1'…" }, "vk.title('Hello\\nworld', { at: .2 })"),
  h2: E('section heading; default fx reveal', {}, "vk.h2('Growth ==6.5×==', { fx: 'words' })"),
  sub: E('subtitle line; default fx up', {}, "vk.sub('**accent** words', { at: 1 })"),
  text: E('body paragraph; default fx up', {}, "vk.text('One or two sentences.', { maxW: .5 })"),
  small: E('small print / footnote; default fx fade', {}, "vk.small('source: …')"),
  label: E('eyebrow label above a title; default fx fade', {}, "vk.label('CHAPTER 2')"),
  hero: E('giant wordmark; default fx letters', { cursor: 'boolean|false||accent cursor block after the word', outline: 'boolean|false||stroked ghost text', size: 'number|||720p px' }, "vk.hero('Spark', { cursor: true })"),
  stack: E('kinetic stacked lines, each scaled to fill the width w (default: the full content width — set w to keep it small); default fx stack', { w: 'number|1||width: 0–1 = fraction of the frame, >1 = px' }, "vk.stack(['lint', 'peek', 'render'], { w: .32 })"),
  row: E('horizontal flex row of child nodes', { gap: 'number|||px', justify: 'string|||CSS justify-content', alignItems: 'string|||' }, "vk.row([vk.badge('A'), vk.badge('B')], { gap: 16 })"),
  col: E('vertical column of child nodes', { gap: 'number|||px', alignItems: 'string|||' }, "vk.col([vk.h2('Title'), vk.text('…')])"),
  grid: E('CSS grid of child nodes', { cols: 'number|3||', gap: 'number|24||px' }, 'vk.grid(items, { cols: 4 })'),
  split: E('two columns (left nodes, right nodes)', { ratio: "string|number|'1/1'||'5/7' (of 12) or 0..1", gap: 'number|56||px', alignItems: 'string|center||' }, "vk.split([vk.h2('Left')], [vk.terminal(['$ vk peek x.html'])], { ratio: '5/7' })"),
  spacer: E('vertical space (px) between nodes in a column', {}, 'vk.spacer(24)'),
  html: E('raw HTML string → element (single root is returned as-is)', { wrap: 'boolean|false||always wrap in a div' }, "vk.html('<div class=\"vk-h2\">raw</div>', { fx: 'up' })"),
  svg: E('inline SVG (markup or inner paths with viewBox); default fx draw', { viewBox: "string|'0 0 400 300'||", strokeWidth: 'number|4||', w: 'number|||px', h: 'number|||px' }, "vk.svg('<path d=\"M20 150 C120 20 280 280 380 150\"/>', { w: 400 })"),
  el: E('custom element: fn(ctx) → Element (ctx.scene, ctx.px, ctx.at)', {}, "vk.el(ctx => { const d = document.createElement('div'); ctx.scene.on(l => { d.textContent = l.toFixed(1); }); return d; })"),
};
export const BLOCKS = {
  terminal: E('terminal window; "$ " lines type, others fade in', { w: 'number|||width' }, "vk.terminal(['$ npm i -g x', '✓ done'], { w: 640 })"),
  code: E('code block with light syntax colouring, lines appear', { highlight: 'array|||1-based lines', w: 'number|||', lang: 'string|||' }, 'vk.code(src, { highlight: [3] })'),
  cards: E('icon/title/text cards grid', { cols: 'number|3||' }, "vk.cards([{ icon: '⚡', title: 'Fast', text: '…' }], { cols: 3 })"),
  columns: E('side-by-side columns {title, code, text}'), kv: E('key/value rows', { keyW: 'number|||key column px' }),
  gantt: E('gantt chart {rows:[{label,start,end,hl}], range, unit}'), diagram: E('node/edge diagram with auto arrows {w,h,nodes,edges}'),
  quote: E('pull quote', { by: 'string|||attribution' }), image: E('image with Ken Burns', { w: 'number|||', h: 'number|||', from: 'object|||{s,x,y}', to: 'object|||{s,x,y}' }),
  device: E('browser / phone / laptop frame around an image or nodes', { type: 'enum(browser/phone/laptop)|browser||', url: 'string|||' }), cta: E('call-to-action card {title, sub, cmd, url, note}'),
  badge: E('pill label', { hl: 'boolean|false||accent fill' }, "vk.badge('NEW', { hl: true })"),
  bar: E('bar chart from [[label, value], …]', { highlight: 'number|||index', unit: 'string|||', horizontal: 'boolean|false||', colors: 'boolean|array|||', source: 'string|||data source (write "示例数据"/"sample data" when not real)' }, "vk.bar([['Jan', 12], ['Feb', 19]], { highlight: 1, source: 'sample data' })"),
  line: E('line chart {series:[{name, values}], labels}', { area: 'boolean|false||', dots: 'boolean|false||', source: 'string|||' }), pie: E('pie chart'), donut: E('donut chart', { r: 'number|150||', center: 'string|||', centerLabel: 'string|||' }),
  ticker: E('animated number with unit/label', { decimals: 'number|0||', unit: 'string|||', label: 'string|||', from: 'number|0||' }), ring: E('progress ring (percent)', { label: 'string|||', r: 'number|120||' }),
  table: E('table {header, rows, highlight}', { source: 'string|||' }), lyrics: E('word-timed kinetic lyric line (vk.lyrics(cue, o))', { style: 'enum(pop/rise/karaoke/slam)|pop||' }),
  spectrum: E('spectrum bars driven by analysed mel bands', { bars: 'number|32||', h: 'number|120||', mirror: 'boolean|false||' }),
  vtitle: E('vertical calligraphy title + seal (ink)', { sub: 'string|||', seal: 'string|||' }), chapter: E('corner vertical chapter title (ink)', { no: 'string|||' }),
  seal: E('red seal stamp (ink)'), endcard: E('ink end card'), credits: E('scrolling credits'),
};

/* ---------------- eases ---------------- */
const easeDesc = n => /^inOut/.test(n) ? `accelerate then decelerate (${n.slice(5).toLowerCase()})` : /^in/.test(n) ? `accelerate (${n.slice(2).toLowerCase()})` : /^out/.test(n) ? `decelerate (${n.slice(3).toLowerCase()})` : n;
export const EASES_EXTRA = {
  linear: 'constant speed', spring: 'damped spring (overshoots); spring(k,w) for custom', house: 'signature in-out curve cubic-bezier(.7,0,.2,1) — one curve for a whole film',
  swift: 'fast-out settle cubic-bezier(.2,.8,.2,1)', smooth: 'Material standard cubic-bezier(.4,0,.2,1)', snappy: 'fast-out long settle (titles)', step: 'jump at the end',
  outBack: 'decelerate with overshoot', inBack: 'pull back then go', inOutBack: 'pull back, overshoot', outElastic: 'elastic wobble settle', outBounce: 'bounce at the end', inBounce: 'bounce at the start',
};
export const easeMeta = n => E(EASES_EXTRA[n] || easeDesc(n), {}, `sc.tween(el, { t: .2, d: .6, from: { opacity: 0 }, to: { opacity: 1 }, ease: '${n}' })`);
export const EASE_FORMS = ['cubic-bezier(x1,y1,x2,y2)', 'bezier(x1,y1,x2,y2)', 'spring(k,w)', 'steps(n)'];

/* ---------------- themes / formats / materials / styles: descriptions come from their data ---------------- */
export const THEME_PARAMS = {
  extends: 'string|tech-blue||base theme', modes: 'object|||{dark|light|accent: {bg, fg, muted, surface, line, accent, accent2, onAccent}}', mode: 'enum(dark/light/accent)|dark||default palette mode',
  fonts: 'object|||{sans, display, mono, serif, condensed, brush}', scale: 'object|||type scale px at 720p {hero, h1, h2, h3, body, small, label, caption}', ease: 'ease|||default ease', cascade: 'number|||default gap between element entrances (s)',
  chart: 'array|||chart palette', caption: 'object|||{bg, fg, karaoke}', radius: 'number|||corner radius px',
};
export const FORMAT_PARAMS = { w: 'number|||width px', h: 'number|||height px', safe: 'object|||title-safe margins {top,right,bottom,left}', zones: 'array|||platform UI zones QA checks', captionBottom: 'number|||caption baseline px' };
export const MATERIAL_PARAMS = { P: 'object|||pack parameters (line, ornament, rough, …)' };
export const STYLE_PARAMS = {
  roles: "string|||compose roles: 'ink' (all) · ['ink','papercut.chars'] · {base, world, chars, type, motion, sound, fx}",
};
export const STYLE_API = 'const S = v.style; S.world(sc, "mountain dusk pine") · S.character(W.actors, {look}) · S.title(sc, text, {sub}) · S.effect(sc, "signature", {at,x,y}) · S.transition("default"|"soft"|"strong") · S.sfx(sc, kind, t) · S.music(v) · S.qa (checklist)';

/* ---------------- sounds ---------------- */
export const SOUNDS = {
  kick: 'synth kick', bass: 'bass hit', tick: 'clock tick', hat: 'hi-hat', pop: 'pop', chime: 'chime (freq)', whoosh: 'whoosh (transitions)', riser: 'riser', snap: 'finger snap', step: 'soft footstep thud',
  pluck: 'Karplus–Strong guqin/pipa pluck (freq)', flute: 'bamboo flute (freq)', drop: 'water drop', bubbles: 'bubbles', splash: 'splash', ripple: 'ripple', croak: 'frog croak', quack: 'duck quack', honk: 'goose honk',
  woodfish: 'wooden fish', gong: 'gong', 'op-daluo': 'opera big gong', 'op-xiaoluo': 'opera small gong', 'op-nao': 'opera cymbals', 'op-naoMute': 'muted cymbals', 'op-bangu': 'bangu drum', 'op-tanggu': 'tanggu drum', bangzi: 'bangzi clapper',
  chip: 'chiptune blip', chipJump: 'chiptune jump', chipHit: 'chiptune hit', chipNoise: 'chiptune noise', saw: 'saw stab', zap: 'zap', thump: 'thump', marimba: 'marimba (freq)', kalimba: 'kalimba (freq)', rustle: 'paper rustle', shaker: 'shaker',
};
export const SOUND_PARAMS = { t: 'time|||when (absolute s or "m:4")', gain: 'number|1|0..4|', freq: 'number|||pitch for tonal voices' };

/* ---------------- vk.three ---------------- */
export const THREE = {
  layer: E('sc.three(setup, update, opts) / sc.three(modules, opts): a three.js scene composited into the layer stack (scene layers sit behind text unless z:"front")', {
    res: 'number|0.75|0.1..1|internal resolution scale (draft: 0.35)', aa: 'number|1|1..16|jittered AA sub-samples (draft: 1)', motionBlur: "object|boolean|||{shutter, samples}; default inherits vk.video({motionBlur})",
    camera: 'function|object|||rig t → {pos, target, fov, roll} or a fixed state', fov: 'number|35|10..120|', background: 'color|||clear colour (default transparent)', assets: 'object|||{name: url} preloaded before capture (gltf/glb/hdr/png/json)',
    seed: 'number|1||seed of ctx.rand (setup only)', z: "enum(back/front)|back||scene layers: behind content", rect: 'array|||[x, y, w, h] sub-rectangle', post: 'object|||post stack, see three/post', look: 'string|array|object|||NPR look chain (see three/look); same as post.look', key: 'function|||lt => string: skip re-render while unchanged',
  }, "sc.three(({ THREE, scene }) => { const m = new THREE.Mesh(new THREE.TorusKnotGeometry(.6, .2, 128, 16), vk.three.materials.chrome()); scene.add(m); return t => { m.rotation.y = t * .8; }; }, { camera: { pos: [0, 0, 4], target: [0, 0, 0] } })"),
  post: E('post stack (every value may be t => value)', {
    exposure: 'number|1||', tone: "enum(aces/none)|aces||", bloom: 'object|boolean|||{strength:.55, threshold:1, knee:.6, radius:1, clamp:40}; false = off (draft: off)', grade: "string|object|neutral||'teal-orange' 'cool' 'warm' 'bleach' 'mono' 'cyber' or {temperature, tint, lift, gamma, gain, contrast, saturation}",
    vignette: 'number|0.18|0..1|', grain: 'number|0.02|0..0.2|', ca: 'number|0|0..2|chromatic aberration', dof: 'object|boolean|false||{focus, aperture:6, maxBlur:14} (draft: off)', fade: 'number|0|0..1|fade to fadeColor', fadeColor: 'color|#000||', look: 'string|array|object|||NPR look chain after the composite (see three/look)',
  }, "{ post: { bloom: { strength: .4 }, grade: 'cool', dof: { aperture: 4 } } }"),
  turntable: E('product turntable: studio env (PMREM), cyclorama, glossy floor + reflection, contact shadow, strip-light sweeps, DOF autofocus', {
    product: "enum(earbuds/earbud/phone/bottle)|earbuds||procedural product", model: 'string|object|||GLB url or loaded gltf (auto-scaled to height)', height: 'number|||model height (units)', spin: 'number|||deg/s', angle: 'number|||start yaw (deg)', tilt: 'number|||deg',
    float: 'number|||bob amplitude', lid: 'function|||t => lid angle (earbuds)', sweeps: 'array|||[{t, d, from, to, color, radius}] strip-light sweeps', sweep: 'object|null|||periodic sweep {every, t, d, color}; null = off',
    env: "string|studio||'studio' | 'room' | 'loft' | .hdr url", backdrop: 'object|boolean|||cyclorama colours {top, horizon, glow}', floor: "string|object|||'reflect' | {color, reflect}", shadow: 'object|boolean|||contact shadow {opacity, darkness, size, res}',
    material: 'string|object|||three material name (see three.materials) or a THREE.Material', animate: 'function|||(t, {product, …}) => void per frame',
  }, "sc.three(vk.three.turntable({ product: 'earbuds', spin: 18, sweeps: [{ t: 1, d: 1.4 }] }), { camera: vk.three.rig.orbit({ radius: 5, dur: 5 }) })"),
  particles: E('50k–200k GPU particles morphing between targets (vertex-shader, pure function of t)', {
    n: 'number|60000|1000..300000|particle count', targets: "object|||{name: 'galaxy'|'sphere'|'torus'|'cloud'|{type,…}|{text, font}|{draw(g,w,h), w, h}|{image|asset}}", morph: "array|||[{t, to, d, style:'converge'|'burst'|'swirl'|'direct'}]",
    beat: 'object|function|||{amp, k, every} pulse on the video beat grid', intensity: 'number|0.35|0..2|additive energy per point', size: 'number|||point size', drift: 'number|||', twinkle: 'number|||0..1', flare: 'number|||', position: 'array|||[x,y,z]', scale: 'number|||', seed: 'number|||',
  }, "sc.three(vk.three.particles({ n: 80000, targets: { g: 'galaxy', logo: { text: 'vidkit', font: '900 220px Archivo' } }, morph: [{ t: 0, to: 'g' }, { t: 2, to: 'logo', d: 2, style: 'converge' }] }), { camera: { pos: [0, 0, 8], target: [0, 0, 0] } })"),
  product: E('vk.three.product(name, o) → THREE.Group with userData.parts', { color: 'color|||body colour' }, "vk.three.product('phone')"),
  mixer: E('time-driven AnimationMixer: const m = vk.three.mixer(root, clips[, {timeline}]) in setup; m.at(t) in update (never mixer.update(dt)); timeline cross-fades clips as a pure function of t', { once: 'boolean|false||LoopOnce + clamp', timeline: 'array|||[{t, clip, fade:.3, speed:1, loop:true, offset, weight}]', weights: 'object|||{clip: weight | t => weight} explicit blend' }, 'const m = vk.three.mixer(gltf.scene, gltf.animations); return t => m.at(t);'),
  studioScene: E('procedural studio light scene (for PMREM or as a backdrop)', { intensity: 'number|1||', accent: 'color|||' }),
  // Phase B
  look: E("NPR look chain after the composite (post.look or layer opt look): preset name, pass list, or {preset, <pass>: {…}|false}. Presets: ink watercolor papercut pixel neon comic blueprint sketch miniature. Passes: toon posterize palette ink outline edges kuwahara paper halftone pixel glow tiltshift mist hatch (vk.three.look.passes for params)", {
    preset: "string|||look preset to start from", passes: "array|||[{type, …params}] in order (params may be t => value)", '<pass>': "object|false|||override (or drop) one pass of the preset, e.g. outline: {width: 2}",
  }, "sc.three(vk.three.terrain({ type: 'mountains' }), { post: { look: { preset: 'ink', mist: { density: .6 } } } })"),
  diorama: E("stylised diorama module: kind 'papercut' (layered cut-paper shadow box) | 'popup' (pop-up book: hinged flats rise as the book opens, page turns) | 'isometric' (low-poly island on a plinth, ortho camera) | 'tiltshift' (miniature)", {
    kind: "enum(papercut/popup/isometric/tiltshift)|papercut||", palette: "string|array|dusk||dusk dawn forest sea ink candy mono or [colours] (back = last)", layers: "number|array|5||papercut: count or [{shape, height, color, z, props, rise}]",
    rise: "object|||papercut layers rise in: {t, d, stagger, order}", sun: "boolean|object|||glowing disc {x, y, r, color}", frame: "object|false|||shadow-box frame", open: "object|||popup: {t, d, ease} opening progress",
    pieces: "array|||popup: [{shape, x, z, height, color, at}] hinged flats", spreads: "array|||popup: page turns [{t, d, pieces}]", seed: "number|||isometric/tiltshift terrain seed", zoom: "number|1.4||isometric ortho zoom",
    trees: "number|70||isometric scatter", houses: "number|6||", water: "object|false|||{level, color, opacity}", toon: "boolean|||toon-shaded paper",
  }, "sc.three(vk.three.diorama({ kind: 'papercut', layers: 6, sun: true, rise: { t: 0, stagger: .12 } }), { camera: vk.three.rig.orbit({ target: [0, 0, -1], radius: 10, from: -6, to: 6, dur: 6 }), post: { look: 'papercut' } })"),
  shaderPlate: E("fullscreen raymarch / SDF / GLSL plate rendered into the HDR scene buffer (so AA jitter, motion-blur sub-frames, bloom, grade and looks apply); camera rays follow the vk.three camera rig", {
    preset: "enum(metaballs/tunnel/nebula/rings)|||", sdf: "string|||GLSL defining float map(vec3 p) (helpers: sdSphere sdBox sdTorus opSU rot2 fbm pal calcAO …)", shade: "string|||GLSL vec3 shade(vec3 p, vec3 n, vec3 rd, float t)",
    background: "string|||GLSL vec3 bg(vec3 rd)", glsl: "string|||raw mode: vec4 image(vec2 uv, vec3 ro, vec3 rd)", uniforms: "object|||{uName: number|array|t => value}", steps: "number|96||march steps", maxDist: "number|40||", depth: "boolean|false||write gl_FragDepth so meshes intersect the plate",
  }, "sc.three(vk.three.shaderPlate({ preset: 'metaballs' }), { camera: vk.three.rig.orbit({ radius: 5, dur: 6 }), post: { bloom: { strength: .6 } } })"),
  text3d: E("extruded, bevelled 3D text with per-letter in/out animation (pure in t); bundled fonts archivo-black anton instrument-serif, or any typeface JSON (vk font3d)", {
    text: "string|vidkit||\n for lines", font: "string|archivo-black||font id or typeface JSON url", size: "number|1||", depth: "number|||default size·.25", bevel: "object|false|||{size, thickness, segments}",
    material: "string|object|||three material name / THREE.Material / {color, roughness, metalness}", sideMaterial: "string|object|||", color: "color|#f2ede2||", align: "enum(left/center/right)|center||", letterSpacing: "number|0||× size", lineHeight: "number|1.25||",
    in: "string|object|||rise drop flip scale spin swing type pop, or {preset, t, d, stagger, order, ease}", out: "string|object|||exit (same form)", wave: "boolean|object|||{amp, speed, freq}", spin: "number|||deg/s of the whole block", animate: "function|||(letter, i, t, info) custom per-letter motion", position: "array|||", shadows: "boolean|false||",
  }, "sc.three(vk.three.text3d({ text: 'HELLO', material: 'gold', in: { preset: 'rise', stagger: .06 } }), { camera: { pos: [0, 0, 6], target: [0, 0, 0] }, env: 'studio' })"),
  sim: E("fixed-dt simulation with exact state snapshots every N steps → seekable at(t), so parallel render workers agree bit-for-bit (snapshots shared through the vk disk cache)", {
    init: "function|||rand => state (numbers + typed arrays; rand is seeded, init only)", step: "function|||(state, dt, t, i) => void — mutate state; pure in (state, i)", dt: "number|0.008333||fixed step (s)", every: "number|1||snapshot interval (s)", duration: "number|10||simulated span (s)", key: "string|||extra cache key (bump when captured constants change)", seed: "number|1||rand seed",
  }, "const s = vk.three.sim({ duration: 8, init: () => ({ y: 2, v: 0 }), step: (S, dt) => { S.v -= 9.8 * dt; S.y += S.v * dt; if (S.y < 0) { S.y = 0; S.v *= -.8; } } }); // setup: await s.ready(ctx); update: t => s.at(t).y"),
  terrain: E("heightmap terrain module (procedural fbm/hills/mountains/ridged/island/mesa/dunes, a function, or an image heightmap) with colour ramps, slope rock, snow, strata block, water, contour lines and instanced scatter (pine/tree/rock/house) that can grow in", {
    type: "string|fbm||fbm hills mountains ridged island mesa dunes flat | (x, z) => 0..1", heightmap: "string|||image url (luminance → height)", size: "number|10||", height: "number|2||", segments: "number|128||", seed: "number|1||",
    colors: "string|array|alpine||alpine island desert ink paper lava mono or [[h, colour], …]", flat: "boolean|false||faceted low-poly shading", rock: "color|||slope colour", snow: "number|||snow line 0..1", contours: "object|||{every, color}", block: "object|false|||strata skirt {depth}",
    water: "object|false|||{level, color, opacity}", scatter: "array|||[{shape, n, minH, maxH, maxSlope, scale, grow:{t, d}}]", falloff: "array|||[r0, r1] radial falloff", lights: "boolean|true||", shadows: "boolean|true||",
  }, "sc.three(vk.three.terrain({ type: 'mountains', colors: 'ink', scatter: [{ shape: 'pine', n: 300, maxH: .5 }] }), { camera: vk.three.rig.orbit({ radius: 12, height: 5, dur: 8 }) })"),
  globe: E("globe module: Natural Earth land (vendored, public domain) or procedural texture, graticule, atmosphere rim, markers that pop in, great-circle arcs that draw on", {
    texture: "string|earth||'earth' | 'procedural' | image url", land: "color|||", ocean: "color|||", graticule: "boolean|object|||", atmosphere: "boolean|object|||{color, power}", markers: "array|||[{lat, lon, color, at}]", arcs: "array|||[{from:[lat,lon], to:[lat,lon], t, d, color, height}]",
    spin: "number|||deg/s", lon0: "number|0||initial longitude facing camera", tilt: "number|||deg", radius: "number|1.5||",
  }, "sc.three(vk.three.globe({ markers: [{ lat: 31.2, lon: 121.5 }], arcs: [{ from: [31.2, 121.5], to: [51.5, -.1], t: 1 }] }), { camera: { pos: [0, 0, 5], target: [0, 0, 0] } })"),
  model: E("glTF/GLB as a scene module: loads (Draco/meshopt), normalises to size, feet on y=0, mixer timeline animation (pure in t), shadows, auto lights, ground disc, spin", {
    url: "string|||glb/gltf url (first argument)", size: "number|||height in world units", fit: "enum(height/max)|height||", center: "boolean|false||centre vertically instead of feet on ground",
    timeline: "array|||[{t, clip, fade, speed, loop, offset, weight}] cross-faded clips", clip: "string|||single looping clip", weights: "object|||{clip: weight | t => weight}", ground: "boolean|object|||{color, radius, shadowOnly}", spin: "number|||deg/s", rotation: "array|||deg", position: "array|||", shadows: "boolean|true||", lights: "boolean|true||auto lights when the scene has none",
  }, "sc.three(vk.three.model('assets/models/robot.glb', { size: 2, timeline: [{ t: 0, clip: 'Idle' }, { t: 2, clip: 'Walking', fade: .4 }] }), { env: 'studio' })"),
  shapes: E("pure 2D silhouette generators → THREE.Shape (ridge hills mountains waves forest city pine tree house pagoda cloud circle crescent star bird boat grass rect path): vk.three.shapes.of(spec) for dioramas, extrusions and paper cut-outs", { shape: "string|||name", seed: "number|||", width: "number|||", height: "number|||", d: "string|||SVG path data for shape 'path'" }, "vk.three.shapes.of({ shape: 'pagoda', height: 2 })"),
};
export const THREE_MATERIALS = {
  chrome: 'mirror chrome', metal: 'brushed metal (roughness .32)', gold: 'gold metal', titanium: 'titanium metal', anodized: 'anodized blue metal + clearcoat', glass: 'transmission glass (ior, thickness, tint)', glassLite: 'cheap transparent glass',
  ceramic: 'glossy ceramic (clearcoat)', plastic: 'plastic (roughness .45)', matte: 'matte', rubber: 'rubber with sheen', screen: 'emissive phone screen',
};
export const THREE_MATERIAL_PARAMS = { color: 'color|||', roughness: 'number|||0..1', env: 'number|||env-map intensity', clearcoat: 'number|||0..1' };
export const THREE_RIGS = {
  orbit: E('orbit around a target', { target: 'array|[0,0,0]||', radius: 'number|||', radius2: 'number|||end radius', height: 'number|||', height2: 'number|||', from: 'number|||deg', to: 'number|||deg', dur: 'number|||', fov: 'number|||', ease: 'ease|||' }),
  dolly: E('dolly between two positions', { from: 'array|||[x,y,z]', to: 'array|||', target: 'array|||', target2: 'array|||', dur: 'number|||', fov: 'number|||', ease: 'ease|||' }),
  push: E('push along a direction', { t: 'number|||', dur: 'number|||', target: 'array|||', dir: 'array|||', from: 'number|||distance', to: 'number|||', ease: 'ease|||', fov: 'number|||' }),
  fly: E('centripetal Catmull-Rom flythrough at constant speed', { points: 'array|||[[x,y,z],…]', look: 'array|||look-at point', bank: 'number|||', dur: 'number|||', ease: 'ease|||', fov: 'number|||' }),
  crane: E('crane up/back', { target: 'array|||', radius: 'number|||', radius2: 'number|||', y0: 'number|||', y1: 'number|||', angle: 'number|||', angle2: 'number|||', dur: 'number|||', ease: 'ease|||' }),
  zoomScale: E('log-distance zoom ("powers of ten")', { from: 'number|||', to: 'number|||', dur: 'number|||', dir: 'array|||', fov: 'number|||' }),
  keys: E('keyframes [{t, pos, target, fov, ease}]'), seq: E('sequence of rigs [{t, rig, blend}]'), shake: E('camera shake modifier', { at: 'array|||[t0, t1]', amp: 'number|||', rot: 'number|||', freq: 'number|||' }),
  punch: E('punch-in envelope modifier (same as vk.cam)'), add: E('compose: add(base, ...modifiers)'),
};

export const KIND_ALIASES = { transition: 'transitions', texture: 'textures', background: 'backgrounds', bg: 'backgrounds', block: 'blocks', element: 'elements', elements: 'elements', nodes: 'elements', factories: 'elements', theme: 'themes', format: 'formats', sound: 'sounds', ease: 'eases', easing: 'eases', material: 'materials', style: 'styles', 'three.materials': 'threeMaterials', 'three.rigs': 'threeRigs', rigs: 'threeRigs' };
