# AGENTS.md — making videos with vidkit

vidkit = one HTML page → one deterministic MP4. You write the page with `vk.*` calls and/or raw web code; the CLI
renders `render(t)` for every frame in parallel workers. Read `llms.txt` first (model, golden rules, minimal page,
name index); this file is the workflow, the craft notes and the pitfalls. Registry/schemas: `vk list`, `docs/api.json`,
types `docs/vk.d.ts`. Human docs (Chinese, complete): `README.md`. A small reference page that mixes all three
layers (style + raw canvas + vk.three): `examples/agent-test/agent-test.html`.

Repo: `/workspace/vidkit` (the `vk` command is linked globally; otherwise `node bin/vk.mjs …`). After editing `src/`
run `npm run build` (pages load `dist/`). Run commands from the repo root; outputs go to `out/` (git-ignored).

## Workflow

1. **Brief → beat sheet.** Audience, platform/format (16:9 · 9:16 · 1:1), length, the one message, call to action.
   Use real facts from real sources; never invent numbers. Write a table first: scene · duration · background ·
   on-screen text (≤ 8 words) · caption/narration · layout · key motion · sound. 3–7 s per scene, one idea per scene.
   With music, choose the BPM first and give durations in beats (`'b:8'`).
2. **Pick the look.** A style pack (`vk list styles`) or a theme (`vk list themes`) is a *starting point*: take its
   palette/type/texture/transition and override freely. Read its `qa[]` checklist (`vk list styles <id>`).
3. **Build.** One page: `examples/<slug>/<slug>.html` (or anywhere; script paths are relative to the page).
   Compose primitives (title/h2/sub/stack/bar/cards/code/terminal/device …, `vk list blocks`), and drop to raw code
   wherever a preset does not fit: `sc.html` + `sc.tween` + `sc.on`, `sc.canvas`, `sc.webgl`, `vk.svg`, `vk.el`,
   `sc.three`. Raw code is not a fallback; it is the main tool for anything bespoke.
4. **`vk lint page.html`** — static: wall clock / Math.random / timers / THREE.Clock / mixer.update / accumulated
   state inside render closures, unknown names. Fix all errors (`// vk-lint-ignore` on the line only for false hits).
5. **`vk peek page.html`** (add `--draft` for 3D) → open `out/peek/<name>/peek.json`, then *look at*
   `out/peek/<name>/sheet.png` (and stills you doubt). Fix, re-peek. Use `--at 2.4,2.5` or `--every 0.5` to inspect
   specific moments. Self-review each sheet against: the beat sheet, the style's `qa[]`, and the checklist below.
   Repeat until `ok: true` and every remaining warn is understood. (`vk preview page.html` is for humans.)
6. **`vk render page.html -o out/<slug>.mp4 [--srt] [--scale 1.5]`** (strict by default; `--draft` for a quick
   low-res cut). Then `vk contact page.html -o out/<slug>-sheet.png` for the final contact sheet and check the MP4
   duration/resolution (`ffprobe`). Deliver: MP4, sheet, page path, captions/SRT.

## Determinism (the only hard rule)

Frame i is `render(i / fps)`, rendered by any worker in any order, possibly twice. So in every render-time callback
(`sc.on`, `v.onRender`, `sc.canvas`, `sc.paint`, `sc.three` update, fx functions, `on:` options):
- no `Math.random()` → `vk.hash(i)` (0..1 from an integer), `vk.hash2(i, j)`, `vk.noise1(x)`, `vk.noise2(x, y)`;
  for many randoms build a table in setup: `const r = vk.rand(7); const pts = [...Array(300)].map(() => [r(), r()])`.
  (In strict mode Math.random during a frame throws.)
- no `Date.now()`, `new Date()`, `performance.now()`, `requestAnimationFrame`, `setTimeout`, `setInterval`.
- no state carried between frames (`x += v` per frame, particle arrays updated in place, `mixer.update(dt)`,
  `THREE.Clock`). Write closed forms of t, or integrate from 0 to t inside the call, or precompute per frame index.
- CSS transitions are disabled; CSS `@keyframes` inside a scene are seeked to scene time (decor only).
- Everything async (images, fonts, glTF, fetch) must finish before `__ready`: use `vk.json`, `<img>` in nodes,
  `load.*` in three setup, or `v.waitFor(promise)` for your own async work.

## Craft notes (defaults that look designed)

- **Canvas & grid** (16:9 = 1280×720 design px): 5 % side margins (≥ 64 px), captions own the bottom ~90 px. 9:16 =
  720×1280: centre text, keep it in the middle 60 % (platform UI covers the right rail and the bottom).
- **Type scale (720p)**: brand/number 200–330 px 900; scene title 64–96 px; subtitle 40–56; body 24–30; labels/code
  20–24 mono. Max three sizes per frame.
- **Colour**: background + contrast colour + ONE accent; alternate dark/light scene backgrounds; accent only on the
  most important thing.
- **Motion**: entrances 0.3–0.7 s (titles 0.6–0.9), stagger 0.15–0.3 s/item, 0.03–0.06 s/char; transitions
  0.25–0.6 s; hold ≥ (characters ÷ 5) + 0.8 s after the last element. One focus moving at a time: title → support →
  details → emphasis. Ease: `house` (cubic-bezier(.7,0,.2,1)) or outCubic/outExpo for entrances, inOutCubic for
  moves, never linear entrances. Slow push 3–6 % (`push: .04`); shake only on hits, fast decay.
- **Rhythm**: with `bpm`, land hits on beats (`at: 'b:4'`); beat helpers lead by one frame so cuts feel on time.
- **Captions** = narration: one line per scene, ≤ 22 CJK chars / ~42 Latin chars, complementary to on-screen text.

## 2D building blocks

`vk.video({format, fps, theme | style, transition, push, texture, bpm, captions, score, motionBlur, strict})` ·
`vk.scene(name, dur | 'auto' | 'b:8', {bg, transition, cap, camera, push, shake, texture, layout}, nodes | (sc, v) => …)`.
Node options are shared (llms.txt). Scene methods: `.on .tween .fx .camera .shots .push .shake .canvas .paint .webgl
.three .html .add .sfx`. Charts read arrays or `vk.json('data/x.json')`. Motion-graphics kit: `vk.mg`, `vk.accents`,
`vk.ui`, `vk.montage`, `vk.lockup` (README §动态图形). Inspect any entry before using it (sizing defaults matter, e.g. `vk.stack` fills the whole width unless you pass `w`): `vk list elements stack`, `vk list blocks cards`, `vk list fx slam`.

## Styles

`vk.video({ style: 'tech' })` (or `['ink', 'papercut.chars']`, or `{ base, chars, type, motion, sound, fx }`) sets
theme, textures, default transition, push, mix and caption look; `v.style` gives `S.world(sc, 'mountain dusk')`,
`S.character(...)`, `S.title(sc, …)`, `S.effect(sc, 'signature', …)`, `S.transition('default'|'soft'|'strong')`,
`S.music(v)`. You can use a style just for its theme and write every scene yourself. `three-tech` needs
`dist/vidkit-three.js`.

## 3D: vk.three (optional bundle `dist/vidkit-three.js`, three r186)

- `sc.three(setup, opts)` where `setup(ctx)` runs once per worker (async ok) with `{THREE, scene, camera, renderer,
  rand, load, assets, video, W, H, draft}` and returns `update(local, info)` (pure in local) or `{update, camera}`.
  Or modules: `sc.three([vk.three.turntable({...}), vk.three.particles({...})], opts)`. `v.three(...)` = whole film.
- Opts: `camera` (a rig `vk.three.rig.orbit/dolly/push/fly/crane/keys/seq/shake…` or `{pos, target, fov}`), `res`
  (.75), `aa`, `post {exposure, bloom, grade, vignette, grain, dof, fade}` (values may be `t => v`), `background`
  (default transparent → 3D floats over the 2D scene), `z: 'back' | 'front'`, `rect`, `assets`, `seed`.
- Physically based materials need an environment: `scene.environment = await load.env('studio')` (or use
  turntable, which sets it). `vk.three.materials.chrome()/glass()/plastic({color})…`. Animations:
  `const m = vk.three.mixer(root, clips)` in setup, `m.at(t)` in update.
- Iterate with `vk peek --draft` (res .35, aa 1, no bloom/DOF/motion blur; PMREM + particle targets are cached on
  disk in `~/.cache/vidkit`); render final without `--draft`. 3D is the slow part of a render (≈ 0.5–4 s per
  frame per worker on CPU); keep layers small (`rect`) and `res` modest.

## Motion blur

`vk.video({ motionBlur: { shutter: '1/40', samples: 4 } })` → applied by `vk render` (sub-frame average);
`--shutter 1/60 --samples 6` overrides, `--no-motion-blur` disables. Peek/stills/qa show unblurred frames.
Canvas layers can blur in-page: `sc.canvas(draw, { motionBlur: true })`. vk.three layers blur internally.

## Audio

- Synth SFX share the timeline: `sfx: 'pop'` on nodes, `score: [[1.2, 'kick', 1]]`, `autoSfx` on transitions
  (`vk list sounds`). Music: `music: 'song.mp3'` (+ `vk analyze song.mp3` for beats/sections → `bpm`/`beats`).
- Narration: scene `vo: 'text'` + `dur: 'auto'`, then `vk tts page.html` (edge-tts) writes `<page>.vo.json`;
  `vk render` mixes (ducking, −14 LUFS). Word-level captions: `vk align`. Check with `vk sync out.mp4`.
  The audio toolchain needs `tools/setup-audio.sh` once; `vk doctor` checks it.

## Pitfalls

| Symptom | Fix |
|---|---|
| `unknown fx "slide-up"` (strict error) | names are checked: read the did-you-mean, `vk list fx` |
| peek `nondeterministic` / differs between workers | something reads history or the clock: see Determinism; `vk lint` shows the line |
| peek `flicker` at a moment | a value jumps for one frame (modulo wrap, threshold at an exact frame time): smooth it or move the boundary |
| `blank-frame` / `dark-frame` at a transition midpoint | expected for dip/flash; otherwise a scene starts empty — bring something in at `at: 0` |
| `low-contrast` | text colour too close to what is behind it (measured on pixels): change colour, add a backdrop/shadow |
| `text-overlap` | two texts visible at once in the same place: different `at`/`out`, layout, or shorter copy |
| `outside-safe-area` / `text-cut-by-frame` | move inside, smaller size; intentional bleed → `class: 'vk-bleed'` |
| `fonts-not-loaded`, tofu boxes | use bundled fonts (`font: 'display'|'sans'|'mono'|'serif'|'condensed'`); custom `@font-face` must load from a local file |
| scripts in `<head>` | put them in `<body>` (vk.video mounts the stage there) |
| 3D black / flat metal | no environment: `scene.environment = await load.env('studio')`, or add lights |
| 3D slow peeks | `--draft`, smaller `res`, fewer particles, `rect` |
| wipe on a multi-line title reveals line 2 early | use `reveal`/`letters`, or one element per line |
| text blurry after zoom | end states at scale 1; render with `--scale 1.5`/`2` for crisp output |
| re-reading an image shows the old frame | write to a new file name (`-o out/peek/<name>-2`) before reading again |
