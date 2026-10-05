# vidkit @VERSION@ — agent guide (llms.txt)

vidkit turns ONE HTML page into a video. The page builds a timeline with `vk.*` calls; the renderer calls
`render(t)` for every frame (in parallel workers, out of order) and screenshots it. **Every frame must be a pure
function of t.** Everything below is a starting point, not a menu: presets, styles and modules are shortcuts; raw
DOM / CSS / SVG / canvas / WebGL / three.js code is first-class.

Full registry with param schemas: docs/api.json (`vk list <kind> [name]`) · types: docs/vk.d.ts · workflow + pitfalls:
AGENTS.md · human docs (Chinese): README.md · working examples: examples/ (start with examples/agent-test/).

## Golden rules
1. Time is the only input. In render code (sc.on, sc.canvas, sc.paint, three update, fx fns) never use Math.random,
   Date.now/new Date, performance.now, requestAnimationFrame, setTimeout/setInterval, THREE.Clock/getDelta,
   mixer.update, or variables accumulated across frames. Use t / local / info.frame, `vk.hash(i)`, `vk.hash2(i, j)`,
   `vk.noise1(x)`, a seeded `const r = vk.rand(seed)` called in setup (pre-compute tables), `vk.three.mixer(...).at(t)`.
2. Names must exist. Unknown fx / transition / ease / texture / background / theme / style / material / product names
   are errors under `--strict` (default for vk peek / qa / render) with a did-you-mean. Check with `vk list <kind>`.
3. Coordinates: the stage is a fixed design canvas (16:9 → 1280×720, 9:16 → 720×1280, 1:1 → 1080×1080 …; `v.W`/`v.H`);
   output resolution comes from `--scale`. Sizes in factories are 720p-base pixels; w/maxW/mt ≤ 1 are frame fractions.
4. Scene times are scene-local seconds (`at: 1.2`), beats (`'b:8'`) or relative (`'+0.3'`). Scenes overlap by the
   next scene's transition length.
5. Loop: write → `vk lint` → `vk peek` (read peek.json + look at sheet.png) → fix → repeat → `vk render`.
   A peek with `"ok": true` and no warnings you cannot explain is the bar before rendering.

## Minimal page (2D)
```html
<!doctype html><meta charset="utf-8"><body>
<script src="../../dist/vidkit.js"></script>
<script>
const v = vk.video({ format: '16:9', fps: 30, theme: 'tech-blue', transition: 'push-left:0.6' });
vk.scene('open', 4, { bg: { type: 'grid' }, cap: 'one caption line' }, [
  vk.title('Hello', { fx: 'letters', at: .2 }),
  vk.sub('**accent** and ==highlight== markup', { at: 1 }),
]);
vk.scene('data', 4, { bg: 'light', transition: 'iris:0.7' }, [
  vk.h2('Growth ==6.5×==', { fx: 'words' }),
  vk.bar([['Jan', 12], ['Feb', 19], ['Mar', 27]], { highlight: 2 }),
]);
</script>
```
Paths: `dist/` is relative to the page (examples/<x>/page.html → `../../dist/vidkit.js`). Always put scripts inside <body>.

## Escape hatches (raw code)
```js
vk.scene('custom', 4, (sc, v) => {                       // nodes may be a function: build the scene yourself
  const el = sc.html('<div class="vk-h1">raw DOM</div>', { flow: true });   // flow: joins the centred layout
  sc.tween(el, { t: .2, d: .6, from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 }, ease: 'house' });
  sc.on((local, p, t) => { el.style.letterSpacing = (0.2 - 0.2 * p) + 'em'; });   // every frame; local = scene seconds, p = 0..1
  sc.canvas((g, local, info) => {                        // Canvas2D layer, stage pixels, cleared every frame
    for (let i = 0; i < 200; i++) { const a = local - vk.hash(i) * 2; if (a < 0) continue;
      g.fillRect(640 + Math.cos(i) * 300 * a, 360 + Math.sin(i) * 300 * a, 4, 4); }
  }, { z: 'back' });                                     // z: 'back' (behind text) | 'front'
  sc.webgl({ z: 'back', frag: 'void main(){ gl_FragColor = vec4(gl_FragCoord.xy/uRes, .5+.5*sin(uTime), 1.); }' });
});
vk.el(ctx => document.createElement('div'))              // any element inside a node list
```
Element factories (`vk list elements` · `vk list blocks` for charts/cards/terminal…) share these options: at, d, fx ('up blur' combos, false = none), ease, each, out + outFx, size, color, weight,
font (display|mono|sans|serif|condensed), align, w, maxW, mt, pos {x,y,right,bottom,anchor}, fixed, class, id, style,
on(el, local, p, t). Markup in text: **accent**, ==highlight==, __underline__, `code`, \n.

## 3D (optional bundle)
```html
<script src="../../dist/vidkit.js"></script><script src="../../dist/vidkit-three.js"></script>
```
```js
vk.scene('3d', 5, { bg: '#05070d' }, sc => {
  sc.three(async ({ THREE, scene, load, rand }) => {     // setup: once per worker, may be async; rand = seeded
    scene.environment = await load.env('studio');        // 'studio' | 'room' | 'loft' | x.hdr — metals need an env
    const m = new THREE.Mesh(new THREE.TorusKnotGeometry(1, .3, 160, 24), vk.three.materials.chrome());
    scene.add(m);
    return (local, info) => { m.rotation.y = local * .8; };  // update: pure function of local time
  }, { camera: vk.three.rig.orbit({ radius: 5, speed: 20 }), res: .75, post: { bloom: { strength: .4 } } });   // speed: deg/s
});
// modules: sc.three(vk.three.turntable({ product: 'earbuds' }), opts) · sc.three(vk.three.particles({ targets: ['galaxy', { text: 'HI' }] }))
```
Without `background` the 3D layer is transparent and composites over the scene bg. `vk list three` / `vk list
threeMaterials` / `vk list threeRigs` for options. Use `vk peek --draft` while iterating on 3D (res .35, aa 1, no
bloom/DOF/motion blur); final `vk render` without --draft.

## Styles (starting points)
`vk.video({ style: 'reel' })` applies a style pack's theme, textures, default transition, camera push and sound; you
still write the scenes. Packs: `vk list styles`; each has a `qa[]` checklist (`vk list styles <id>`) — review your
peek sheet against it. Mix: `style: ['ink', 'papercut.chars']`. Override anything (theme, transition, texture) per
video or scene.

## Commands
```text
vk lint page.html                  static determinism + name lint (file:line + hint); exit 1 on errors
vk peek page.html [--at 0,2.5,5 | --every 1] [--draft] [--json] [-o dir]
                                   ONE browser: stills + sheet.png + peek.json (default out/peek/<name>/)
vk list [kind] [name] [--json]     registry: kinds → names → full schema of one entry
vk qa page.html                    layout / caption / determinism QA at fixed steps
vk render page.html -o out.mp4 [--draft] [--scale 1.5] [--srt]
```
peek.json: `{ ok, issues: [{severity: error|warn, code, message, t, hint, el?}], stills: [{t, file, scene}], sheet,
timings, duration, scenes: [{name, start, dur}], warnings, lint }`. Fix every `error`; read every `warn` (a warn at
a transition midpoint can be intended). Issue codes: page-error, unknown-name, lint, text-overlap, text-overflow-x/y,
text-cut-by-frame, outside-safe-area, out-of-frame, in-platform-ui-zone, caption-*, fonts-not-loaded, blank-frame,
dark-frame, low-contrast, flicker, nondeterministic.

Page API: `vk.video({ strict: true })` turns the warnings into thrown errors in the browser too (default: warn).
`vk.list(kind, { detail: true })` returns the schemas at runtime.

## Name index (details: docs/api.json · `vk list <kind> <name>`)
@INDEX@
