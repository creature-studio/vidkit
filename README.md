# vidkit

> 用 HTML/JS 代码生成视频的通用框架：**一行一个元素，一帧一个纯函数**。
> 工作名 `vidkit`：改名只需改 `package.json` 的 `name` / `vidkit.global` 与本 README 标题（CLI 命令名在 `package.json` 的 `bin`）。

- **确定性**：每一帧 = `render(t)`，不依赖真实时钟、不读 `Math.random()`（setup 阶段的随机数已被种子化）。任意跳帧、并行渲染、重复渲染结果一致。
- **简单**：`vk.video()` + `vk.scene()` + 元素工厂，写宣传片 / 数据讲解 / 竖屏短视频不需要写一行动画代码。
- **效果丰富**：42 个元素特效、44 个转场（均含别名；去重后 39 / 40）、19 个区块/图表、7 种质感、5 种背景、4 套主题、9 种画幅预设。
- **可下沉**：随时 `scene.on(t => …)`、`vk.el(ctx => …)`、`scene.canvas()`、`scene.webgl()` 写原生代码。
- **可扩展**：所有效果都是插件注册出来的，第三方插件与内置预设能力完全相同（`vk.use(plugin)`）。
- **离线**：字体随包（均为 OFL 1.1），音效由 OfflineAudioContext 合成，渲染不联网。
- **音频与节奏（Phase 2）**：`vk analyze` 节拍/强拍/段落/响度分析 → 画面卡点（提前一帧）；`vk align` 中英文词级对齐 → 卡拉 OK 字幕与歌词 MV；`vk tts` 配音驱动场景时长；渲染时自动 ducking + −14 LUFS 响度归一；`vk sync` 实测音画同步。

## 目录

1. [快速开始](#快速开始)
2. [架构](#架构)
3. [场景 API](#场景-api)
4. [预设目录](#预设目录)
5. [主题](#主题)
6. [画幅与安全区](#画幅与安全区)
7. [字幕与音频](#字幕与音频)
8. [音乐、节奏与配音（Phase 2）](#音乐节奏与配音phase-2)
9. [下沉到原生代码](#下沉到原生代码)
10. [CLI](#cli)
11. [编写插件](#编写插件)
12. [开发与测试](#开发与测试)
13. [路线图（Phase 3）](#路线图)
14. [字体与素材许可](#字体许可)

---

## 快速开始

依赖：Node ≥ 18、ffmpeg/ffprobe、Playwright Chromium（`npx playwright install chromium`）。

```bash
cd vidkit && npm install && npm run build   # 生成 dist/vidkit.js（单文件 IIFE）与 dist/vidkit.esm.js
npm link                                     # 可选：全局命令 vk
vk new hello.html --format 9:16 --theme bold # 生成模板
vk preview hello.html                        # 本地预览：热更新 + 进度条 + 场景列表（按 s 显示安全区）
vk qa hello.html                             # 版面 QA（重叠 / 溢出 / 安全区 / 字幕 / 字体 / 空帧）
vk render hello.html -o hello.mp4 --srt      # 逐帧渲染 → H.264 MP4（+ SRT 字幕）
```

最小示例（一个 HTML 文件就是一条视频）：

```html
<script src="../dist/vidkit.js"></script>
<script>
vk.video({ format: '16:9', fps: 30, theme: 'tech-blue', transition: 'push-left:0.6' });

vk.scene('开场', 5, { bg: { type: 'grid' }, cap: 'Spark：AI coding agent 的启动器' }, [
  vk.hero('Spark', { cursor: true, at: .3 }),
  vk.sub('AI coding agent 的**启动器与配置中心**', { at: 1.2 }),
]);

vk.scene('数据', 6, { bg: 'light', transition: 'iris:0.7' }, [
  vk.h2('一年增长 ==6.5 倍==', { fx: 'words' }),
  vk.bar([['一月', 12], ['二月', 19], ['三月', 27]], { highlight: 2, source: '示例数据' }),
]);
</script>
```

### 示例（`examples/`）

| 文件 | 内容 | 输出 |
|---|---|---|
| `promo.html` | 16:9 开源项目宣传片（Spark 仓库真实信息） | `out/promo.mp4` |
| `explainer.html` | 16:9 数据讲解：全球 CO₂ 排放（Our World in Data 真实数据，`data/co2.json`） | `out/explainer.mp4` |
| `vertical.html` | 9:16 竖屏短视频 ~15s，128 BPM 卡点，大字动效，避让平台 UI | `out/vertical.mp4` |
| `mv.html` | 16:9 **节拍同步歌词 MV**：Kevin MacLeod《Voxel Revolution》（CC BY 4.0）+ TTS 人声；节拍/段落来自 `vk analyze`，歌词时间来自 `vk align --separate`，`vk.lyricVideo()` 一行生成（素材制作脚本 `mv/make-song.mjs`） | `out/mv.mp4` |
| `explainer-vo.html` | CO₂ 讲解的**配音版**：每个场景 `vo:` + `dur:'auto'`，时长由 TTS 决定并吸附到背景音乐节拍，逐字高亮字幕，ducking + −14 LUFS | `out/explainer-vo.mp4` |
| `tadpole/tadpole.html` | **水墨动画短片《小蝌蚪找妈妈》**（~126 s）：`ink` 主题 + 宣纸质感 + 墨线滤镜，竖排书法片名/章节名 + 朱印，SVG 角色 rig（蝌蚪群、青蛙、鸭、金鱼、鹅、乌龟），**多角色配音**（6 种 edge-tts 音色），程序合成古琴/笛子配乐（`tadpole/make-music.mjs`，CC0）与水声/蛙鸣/鸭叫音效 | `out/tadpole.mp4` |
| `gallery.html` | **FX Gallery 活文档**：每个预设一小段 + 名称 + 生成它的那行代码 | `out/gallery.mp4` |
| `plugin-demo.html` | 插件示例（`plugins/hello-plugin.js`） | — |

`npm run examples` 会依次对每个示例做 QA、渲染 MP4+SRT、生成联系表与静帧到 `out/`。

---

## 架构

```
┌──────────────────────────── 4. 创作 API（authoring/）───────────────────────────┐
│ vk.video / vk.scene / vk.title … vk.bar … 主题 · 画幅 + 安全区 · 字幕轨 · md 标记 │
├──────────────────────────── 3. 效果预设（fx/）──────────────────────────────────┤
│ text · transitions · svg · charts · blocks · textures · backgrounds · shapes     │
│ （全部通过 registry 注册 = 插件）                                                 │
├──────────────────────────── 2. 渲染层（layers/ + DOM）──────────────────────────┤
│ DOM/CSS 层（文字、布局）· Canvas2D 层（纹理/粒子）· WebGL 层（片元着色器，Phase 3）│
├──────────────────────────── 1. 核心（core/）────────────────────────────────────┤
│ render(t) · ease · timeline/tween · stagger · camera · seeded random · BeatGrid   │
│ scene graph（重叠/转场槽位）· plugin registry + hooks                             │
└──────────────────────────────────────────────────────────────────────────────────┘
  runtime/：注入 CSS、预览播放器、页内 QA        cli/：Playwright 逐帧截图 → ffmpeg
```

```
vidkit/
├─ package.json          name / bin(vk) / scripts
├─ bin/vk.mjs            CLI 入口
├─ cli/                  render · stills · contact · qa · preview · new · lib · analyze · align · tts · sync · doctor · mix(混音/ducking/loudnorm) · py
├─ tools/                vkaudio.py（Python 音频工具链）· setup-audio.sh · requirements-audio.txt
├─ src/
│  ├─ index.js           vk 对象（ES module 入口）
│  ├─ browser.js         IIFE 入口 → window.vk
│  ├─ core/              ease · random · time(BeatGrid) · stagger · interp · camera · timeline · plugin · scene · video
│  ├─ layers/            canvas.js · webgl.js
│  ├─ fx/                apply · text · transitions · svg · shapes · charts · blocks · textures · backgrounds · rhythm · lyrics
│  ├─ authoring/         api(元素工厂) · node(公共选项/md) · themes · formats · declarative(data-* 兼容)
│  ├─ audio/             score(离线音效合成) · music(节拍/包络/段落 MusicInfo) · words(对齐→字幕/卡拉 OK)
│  └─ runtime/           css · preview · qa
├─ dist/                 vidkit.js（IIFE，~200 KB）· vidkit.esm.js
├─ fonts/                Noto Sans SC · JetBrains Mono · Archivo · Anton · Instrument Serif（OFL 1.1）
├─ examples/             promo · explainer · vertical · gallery · mv · explainer-vo · plugin-demo · data/ · assets/(music) · mv/ · plugins/
├─ scripts/              build · render-examples · list-presets · debug/probe 工具
├─ test/                core.test.mjs（缓动/时间/随机/节拍/插值）· audio.test.mjs（节拍网格/小节/提前一帧/词映射/混音表达式/分析器）
└─ out/                  渲染产物（git 忽略）
```

**渲染流程**：`vk render` 启动本地静态服务器 → N 个 Chromium worker 各自打开页面（`?render=1`）→ 对每帧调用 `window.__seek(t)`（内部就是 `video.render(t)`）→ 截图（默认 JPEG q95）→ ffmpeg 编码（yuv420p、bt709、`+faststart`）→ 音频：离线合成音效 WAV + 音乐（`music`/`--audio`）+ 配音（`vk tts` 生成的片段）→ ffmpeg 混音（ducking、两遍 loudnorm）→ 可选导出 SRT → ffprobe 校验 + blackdetect。

**时间模型**：场景在时间轴上首尾重叠，重叠长度 = 下一场景的转场时长（`start = 上一场景结束 − 转场时长`）。场景内所有时间都是**场景本地秒**（或 `'b:8'` 这样的节拍号，或 `'+0.3'` 表示相对上一个元素）。

---

## 场景 API

### `vk.video(cfg)`

```js
const v = vk.video({
  format: '16:9',            // '16:9' | '1080p' | '9:16' | '1:1' | '4:5' | 'vertical' …，或 w/h 自定
  fps: 30,
  theme: 'tech-blue',        // 或 { extends: 'bold', modes: { dark: { accent: '#00E0B0' } } }
  transition: 'fade:0.4',    // 默认转场（名称:时长）
  push: .03,                 // 默认每个场景的缓慢推镜
  texture: { grain: { amount: .05 }, vignette: .3 },   // 全片质感
  bpm: 128, beatOffset: 0,   // 节拍网格；或 beats: [0.52, 1.01, …] 显式节拍；或 beats: 'song.beats.json'（vk analyze 结果）
  music: 'song.mp3', voice: {…}, captions: 'x.align.json', lyrics: {…}, mix: { lufs: -14 },   // Phase 2，见下文
  autoSfx: true,             // 转场自动 whoosh
  score: [[1.2, 'kick', 1]], scoreOptions: { pad: [110, 165, 220], beatKick: 2 },
  captions: [[0.5, 2.5, '手动字幕']],
  seed: 1, manual: false,    // manual:true 时需手动 v.start()
});
```

### `vk.scene(name, dur, opts?, nodes)`

```js
vk.scene('标题', 5, {
  bg: 'dark',                         // 'dark' | 'light' | 'accent'（主题色板模式）| CSS 颜色 | { type:'mesh' } | 数组叠加
  mode: 'dark',                       // 与 bg 背景组件搭配时指定文字色板
  transition: 'iris:0.7',             // 本场景入场转场，也可 { type, d, ease, focal:{x,y} }
  cap: '这一场的字幕',                 // 或 ['分句1', '分句2'] 均分时长，或 [[start, end, text], …]
  camera: [{ t: 0, x: 320, y: 360, s: 1.8 }, { t: 2, s: 1, ease: 'house' }],
  push: .08, shake: [{ t: 1, amp: 18, d: .6 }],
  texture: { rgb: { amount: 3 } },    // 本场景专属质感
  layout: 'center',                   // 'center' | 'left' | 'top' | 'bottom'
  sfx: false,                         // 关闭本场景自动转场音效
}, [ /* 元素节点 */ ]);

vk.scene('自动时长', 'auto', [ … ]);  // 时长 = 最后一个动画结束 + hold(默认 2.2s)
vk.scene('卡点', 'b:8', [ … ]);       // 8 拍
```

返回 `Scene`，可继续链式调用：`.on(fn)` `.tween()` `.fx()` `.camera()` `.push()` `.shake()` `.beatZoom()` `.canvas()` `.webgl()` `.texture()` `.sfx()` `.add()` `.html()`。

### 元素工厂与公共选项

| 工厂 | 默认 fx | 说明 |
|---|---|---|
| `vk.title(text, o)` | `letters` | 大标题 |
| `vk.h2(text, o)` | `reveal` | 二级标题 |
| `vk.sub / text / small / label` | `up` / `fade` | 副标题 / 正文 / 小字 / 眉标 |
| `vk.hero(text, {cursor, outline})` | letters | 字标（带光标 / 描边） |
| `vk.stack(lines, {w})` | `stack` | 动态堆叠大字，每行自动撑满宽度 |
| `vk.row / col / grid / split(left, right, {ratio}) / spacer` | — | 布局 |
| `vk.badge` | `pop` | 胶囊标签 |
| `vk.html(str) / vk.svg(markup) / vk.el(ctx => Element)` | — / `draw` / — | 原生逃生口 |

所有工厂共享选项：`at`（入场时间）、`fx`（特效名，可组合 `'up blur'`，`false` 关闭）、`d`（时长）、`ease`、`each`（逐字/逐项间隔）、`out`（出场时间）+ `outFx`、`sfx`（入场音效）、`size`（数字 = 720p 基准像素，或 `'h1'`… 主题字号）、`color`、`bg`、`weight`、`font`（`display|mono|sans|serif|condensed`）、`align`、`w`/`maxW`/`mt`（0–1 为画面比例，>1 为像素）、`pos:{x,y,right,bottom,anchor}` 绝对定位、`fixed`（不跟随镜头）、`class`、`id`、`style`、`on(el, local, p, t)`。

文字内联标记（`md`）：`**强调色**`、`==荧光笔==`（自动 highlight 扫过）、`__下划线__`（自动 underline 画出）、`` `代码` ``、`\n` 换行。`markAt` 控制标记动画时间。

数据：`vk.json('data/x.json')`（同源同步加载）或 `vk.json('#inline-id')`（`<script type="application/json">`）。

---

## 预设目录

完整清单可用 `vk.list('fx' | 'transitions' | 'blocks' | 'textures' | 'backgrounds' | 'themes' | 'formats' | 'sounds')` 查询；`out/gallery.mp4` 里每个预设都有演示与代码。

### 文字特效（`fx`）

| 名称 | 效果 | 片段 |
|---|---|---|
| `fade` `up` `down` `left` `right` | 淡入 / 方向滑入 | `vk.text('…', {fx:'up'})` |
| `scale` `pop` `zoom` `blur` `rise` | 缩放 / 弹出 / 放大 / 失焦 / 上浮+失焦 | `{fx:'pop'}`、组合 `{fx:'up blur'}` |
| `wipe` `wipe-left` `wipe-up` `wipe-down` `reveal` | clip-path 擦出 / 遮罩上推 | `{fx:'reveal'}` |
| `grow` `grow-y` `flip` `stretch` | 横向/纵向生长、翻转、字宽拉伸（Archivo wdth 轴） | `{fx:'stretch', font:'display'}` |
| `letters` `letters-fade` `letters-blur` `domino` `squash` `assemble` `wave` | 逐字：滑入 / 淡入 / 失焦 / 多米诺 / 挤压弹跳 / 四散汇聚 / 波浪 | `vk.title('…', {fx:'letters', each:.04})` |
| `words` `words-up` | 逐词弹出 / 逐词上推（`|` 手动分词） | `vk.title('用|代码|写|视频', {fx:'words'})` |
| `type` | 打字机（预留最终宽度，光标） | `{fx:'type', cps:14}` |
| `scramble` / `decode` | 乱码解码 | `{fx:'scramble'}` |
| `count` | 数字滚动（千分位、小数、前后缀） | `vk.title('0', {fx:'count', to:2048, sep:','})` |
| `highlight` / `marker` · `underline` | 荧光笔扫过 · 下划线画出 | `vk.text('把 ==重点== 标出来')` |
| `swap` | 关键词换色 | `{fx:'swap', at:1}` |
| `stack` | 动态堆叠（每行撑满盒宽，交替方向入场） | `vk.stack(['KINETIC','TYPE'])` |
| `draw` `draw-fill`/`fill` `morph` | SVG 描边绘制 / 描边后填充 / 形状变形 | 见 SVG |
| `none` | 无动画 | |

### 转场（`transition: 'name:秒'`）

| 类别 | 名称 |
|---|---|
| 基础 | `none` `fade` `crossfade` `dip`（经黑场）`flash`（白闪） |
| 方向（×4：`-left` `-right` `-up` `-down`） | `slide-*`（新场景滑入）`push-*`（新推旧）`whip-*`（快甩+运动模糊）`wipe-*`（擦除；`wipe` = `wipe-right`） |
| 缩放/模糊 | `zoom-in`（=`zoom`）`zoom-out` `blur` `zoom-through`（旧场景放大 40× 穿过焦点，例如字母的孔） |
| 遮罩形状 | `iris`（=`circle`）`iris-out` `shape-diamond` `shape-star` `shape-hexagon` `shape-triangle` `shape-heart` `shape-square` `shape-blob` |
| 分割 | `split`（竖向对开）`split-h`（横向）`split-open`（旧场景从中间裂开）`diagonal` `blinds`（百叶窗） |
| 故障 | `glitch`（=`slice`，切片错位 + 色相抖动） |

焦点可指定：`transition: { type: 'iris', d: .7, focal: { x: 320, y: 360 } }`。

### SVG

```js
vk.svg('<path d="M40 220 C 120 40, 220 40, 260 150"/>', { fx: 'draw', d: 1.6, viewBox: '0 0 500 300', w: 620 })
vk.svg('<rect …/><circle …/>', { fx: 'draw-fill', each: .25 })
vk.svg(`<path d="${vk.shapePath('circle', 150, 150, 120)}"/>`, {
  fx: 'morph', paths: ['circle', 'star', 'heart', 'square'].map(k => vk.shapePath(k, 150, 150, 120)), each: .8 })
```

`vk.shapePath / shapePoints / shapePolygon(kind, cx, cy, r)`：circle、star、diamond、square、triangle、hexagon、polygon、heart、blob（固定顶点数，可直接互相插值）。路径不兼容时 `morph` 自动重采样为 n 个点。

### 图表（数据来自数组或 JSON）

| 名称 | 片段 |
|---|---|
| `vk.bar(data, o)` | `vk.bar([['一月',12],…], {highlight:5, unit:'k', horizontal:false, colors:false, source:'示例数据'})` |
| `vk.line(data, o)` | `vk.line(null, {series:[{name:'A', values:[…]}], labels:[…], area:true, dots:true})`（多条线自动在右侧标注并防重叠） |
| `vk.pie / vk.donut` | `vk.donut([{label:'Go', value:42}, …], {r:150, center:'2024', centerLabel:'占比'})` |
| `vk.ticker(value, o)` | `vk.ticker(98.6, {decimals:1, unit:'%', label:'可用性', from:0})` |
| `vk.ring(pct, o)` | `vk.ring(72, {label:'完成度', r:120})` |
| `vk.table(spec, o)` | `vk.table({header:['方案','耗时'], rows:[[…]], highlight:1}, {source:'…'})` |

数据格式：`[[label, value], …]` 或 `[{label, value, color}, …]`。**图表若非真实数据，请在 `source` 标注"示例数据"**。

### 区块

| 名称 | 片段 |
|---|---|
| `vk.hero` | `vk.hero('Spark', {cursor:true, size:200})` |
| `vk.terminal(lines, o)` | `vk.terminal(['$ npm i -g x', '✓ done'], {w:640})` — `$` 行打字，其余淡入 |
| `vk.code(src, o)` | `vk.code(src, {highlight:[3], w:760})` — 轻量语法着色、逐行出现 |
| `vk.cards(items, o)` | `vk.cards([{icon, title, text, hl}], {cols:3})` |
| `vk.columns(items)` | `vk.columns([{title, code, text}])` |
| `vk.kv(rows, o)` | `vk.kv([['导入', '`cmd` 说明'], …], {keyW:200})` |
| `vk.gantt(spec, o)` | `vk.gantt({rows:[{label, start, end, hl}], range:[0,10], unit:'s'})` |
| `vk.diagram(spec, o)` | `vk.diagram({w, h, nodes:[{id,x,y,w,h,label,sub,hl}], edges:[['a','b']]})` — 箭头自动绘制 |
| `vk.quote(text, o)` | `vk.quote('…', {by:'作者'})` |
| `vk.image(src, o)` | `vk.image('shot.png', {w:880, h:450, from:{s:1}, to:{s:1.2, x:-4}})` — Ken Burns |
| `vk.device(content, o)` | `vk.device('shot.png', {type:'browser', url:'…'})`、`{type:'phone'}`、`{type:'laptop'}`；content 也可以是节点数组 |
| `vk.split(left, right, o)` | 左文右演示，`ratio:'5/7'` 或 `0.44` |
| `vk.cta(spec, o)` | `vk.cta({title, sub, cmd, url, note})` |
| `vk.badge(text, o)` | `vk.badge('NEW', {hl:true})` |

### 质感（`texture: { name: opts }`，全片或单场景）

`grain`（胶片颗粒，24fps 刷新）· `vignette`（暗角）· `flicker`（亮度闪烁）· `paper`（纸纹）· `halftone`（半调网点）· `scanlines`（扫描线，`roll`）· `rgb`（RGB 错位，`pulse` 随节拍）。另外 `vk render --grain 6` 可在 ffmpeg 阶段加噪点。

### 背景（`bg: { type, … }`）

`gradient`（`spin`）· `mesh`（流动渐变网格）· `grid`（`drift`）· `dots`（`drift`）· `noise`（动态噪声，`speed`）。可数组叠加。

### 镜头

`camera: [{t, x, y, s, r, ease}]` 关键帧（平移/缩放/旋转）、`push: .08` 缓推、`shake: [{t, amp, d}]` 抖动（24fps 量化，更像手持）、`scene.beatZoom(.03)` 随节拍脉冲缩放。

### 音效（`sfx`，离线合成）

`kick` `bass` `tick` `hat` `pop` `chime` `whoosh` `riser` `snap` —— `vk.title('…', {sfx:'kick'})` 或 `scene.sfx(1.2, 'pop', .6)`。

---

## 主题

| 名称 | 气质 | 字体 | 色板（dark / light / accent） |
|---|---|---|---|
| `tech-blue` | 科技蓝（沿用原工具包风格） | Noto Sans SC 900 + JetBrains Mono | 深蓝 #0B1020 / 灰白 #E8ECF4 / 品牌蓝 #3355FF |
| `editorial` | 暖色杂志 / 报告 | Instrument Serif 标题 + Noto Sans SC | 米色纸 #F3ECE0 / 深棕 #1F1A17 / 砖红 #C8492B |
| `bold` | 短视频大字（抖音/小红书） | Archivo 900 + Anton 窄体 | 黑 / 明黄 #FFE600 / 玫红 #FF2E63 |
| `noir` | 黑白极简 + 红点缀 | Archivo + Noto Sans SC | 纯黑 / 纯白 / #FF3B30 |

每个主题包含：3 个色板模式、字号阶梯（display/h1/h2/h3/body/small/caption，按画面短边自动缩放）、图表调色板、字幕样式、默认缓动（`house` = `cubic-bezier(.7,0,.2,1)`）。

自定义：`vk.video({ theme: { extends: 'bold', modes: { dark: { accent: '#00E0B0' } } } })` 或 `vk.register('themes', 'mine', {...})`。

---

## 画幅与安全区

| 预设 | 尺寸 | 标题安全区（上/右/下/左） | 说明 |
|---|---|---|---|
| `16:9`（`landscape`） | 1280×720 | 56 / 80 / 64 / 80 | 宣传片、讲解（`--scale 1.5` 出 1080p） |
| `1080p` | 1920×1080 | 84 / 120 / 96 / 120 | 原生 1080p |
| `9:16`（`vertical`） | 1080×1920 | **250 / 160 / 460 / 72** | 抖音 / 小红书：避开顶栏、右侧按钮栏、底部文案区 |
| `1:1`（`square`） | 1080×1080 | 80 / 80 / 96 / 80 | 信息流 |
| `4:5`（`portrait`） | 1080×1350 | 90 / 80 / 120 / 80 | 竖版海报 |

9:16 还定义了平台 UI 区域 `top-bar`、`right-rail`、`bottom-info`：`vk qa` 会检查文字是否落入这些区域，预览里按 `s` 可叠加显示。字幕默认位于底部文案区上方（`captionBottom: 470`），并限制在左右安全边之间。

场景内容默认排布在安全区内（`.vk-content`）；需要出血的装饰元素用 `pos` 绝对定位或加 `class: 'vk-bleed'`。

---

## 字幕与音频

- 每个场景写 `cap`，自动生成字幕轨（避开转场）；`vk render --srt` 同时导出 `.srt`。
- 词级时间（卡拉 OK）：`v.caption(start, end, text, [{w:'每', t:1.2}, …])`，或直接由对齐 / TTS 结果生成（见下一节）。
- 节拍网格：`bpm` 或 `beats:[…]`（显式时间）或 `beats:'song.beats.json'`（分析结果）；场景时长/入场时间可写 `'b:8'`（拍）、`'m:4'`（小节）。
- 音效：页面定义的 `score` / `sfx` 在渲染时由 OfflineAudioContext 离线合成成 WAV，与音乐、配音一起混音。

---

## 音乐、节奏与配音（Phase 2）

Phase 2 把"声音"变成时间轴的一等公民：**先离线分析音频 → 得到 JSON → 页面里用纯函数读取**。渲染依然确定性（分析结果是静态文件，页面不做任何实时音频处理）。

### 安装音频工具链（一次）

```bash
tools/setup-audio.sh          # 在仓库内建 .venv（git 忽略）：librosa · faster-whisper · stable-ts · edge-tts · piper · torch(CPU) · demucs · beat_this
tools/setup-audio.sh --light  # 不装 torch：节拍退化为 librosa（无神经网络 downbeat），无人声分离
vk doctor                     # 检查每个组件是否可用
```

Python ≥ 3.10（测试环境 3.13，纯 CPU）。模型首次使用时下载到 `~/.cache`（whisper：HF Hub；beat_this / demucs：torch hub；piper 音色：`~/.cache/vidkit/piper`）。CLI 按 `VK_PYTHON` → `.venv/bin/python` → `python3` 的顺序找解释器。依赖清单见 `tools/requirements-audio.txt`，全部逻辑在 `tools/vkaudio.py`（可单独调用：`python tools/vkaudio.py analyze|align|tts|separate|sync|doctor`）。

**工具选择与理由**

| 任务 | 选用 | 理由 / 备选 |
|---|---|---|
| 节拍 + 强拍 | **beat_this**（CPJKU, ISMIR 2024） | 当前 SOTA 的节拍/强拍联合模型，CPU 上 40 秒歌曲 3–5 s；不需要 madmom（其在 Python 3.13 上无法安装）。无 torch 时退化为 librosa `beat_track` + 低频相位启发式估计强拍 |
| onset / 响度 / 频段 / 段落 | **librosa** | 纯 Python 轮子、稳定；LUFS 用 ffmpeg `ebur128` 测 |
| 词级对齐 | **stable-ts `align()` + faster-whisper small（int8）** | 已知文本的强制对齐，中文逐字、英文逐词；比 whisperX 依赖少（无需 pyannote/wav2vec2 中文模型） |
| 人声分离 | **demucs htdemucs**（two-stem vocals） | 歌曲先分离再对齐，误差明显下降；结果缓存在 `~/.cache/vidkit/demucs` |
| TTS | **edge-tts**（默认）/ **piper**（离线） | edge-tts 中文音色自然、自带 WordBoundary 词级时间（**需联网**）；piper 完全离线（`zh_CN-huayan-medium`），词时间由强制对齐补出 |
| 混音 | **ffmpeg**（adelay/amix/volume 表达式/loudnorm 两遍） | 无额外依赖，采样级精确 |

### `vk analyze`：音乐分析

```bash
vk analyze song.mp3                 # → song.beats.json
vk analyze song.mp3 -o x.json --backend librosa --rate 50 --bands 8
```

输出（确定性，同一文件结果一致）：

```jsonc
{ "vidkit": "beats", "bpm": 122.0, "meter": 4,
  "beats": [0.52, 1.01, …], "beatPos": [1,2,3,4,1,…], "downbeats": [0.52, 2.49, …],
  "onsets": […], "onsetStrength": […],
  "loudness": { "integrated": -13.9, "unit": "LUFS" },
  "envelope": { "rate": 50, "loud": […], "rms": […], "low": […], "mid": […], "high": […], "bands": [[…] × 8] },  // 0..1
  "sections": [{ "start": 0, "end": 15.7, "label": "A", "energy": .41 }, …],
  "tool": { "beats": "beat_this", … } }
```

节拍后处理：局部直线拟合去抖（`--smooth 4`）+ 与强 onset 的中位偏移对齐（`--refine 40` ms，整体平移网格，不逐拍吸附；`--snap` 可逐拍吸附）；BPM = 节拍时间的稳健线性拟合斜率。段落：小节同步 chroma+MFCC 的 Foote novelty + 响度跳变，边界落在强拍上。

### 在页面里使用音乐

```js
vk.video({
  music: 'song.mp3',            // = audio；render 时自动混入（也可 --audio 覆盖）
  musicStart: 12.5,             // 从音乐第 12.5 秒开始用（所有节拍/包络时间自动平移）
  musicGain: .9,
  beats: 'song.beats.json',     // 或 [0.5, 1.0, …] 显式节拍；或 bpm:120
  lead: 1,                      // "提前一帧"规则：所有 pulse/hit/切点提前 1 帧（默认 1）
  snap: 'bar',                  // dur:'auto' 的场景切点吸附到 'beat' | 'bar' | 'b:2' | 'm:2'
});

vk.beat(16)          // 第 16 拍的时间（秒）          vk.measure(4)   // 第 4 小节第一拍（避免与柱状图 vk.bar 冲突）
vk.beatIndex(t)      // t 处的拍号（小数）            vk.measureIndex(t) / vk.beatInBar(t)
vk.onBeat(t, { unit: 'beat'|'bar'|'onset', k: 6, every: 1 })   // 脉冲 exp(-frac(beat)·k)，拍点=1
vk.pulse(t) / vk.hit(t, t0) / vk.barPulse(t)
vk.energy(t, 'low'|'mid'|'high'|'loud'|0..7, smooth)             // 0..1 响度/频段包络（同样提前一帧）
vk.onsetHit(t, k)    // 最近一个 onset 的冲击包络（按强度加权）
vk.section(t)        // { start, end, label, energy }；vk.sections() 全部段落
vk.quantize(t, 'beat'|'bar')
```

**元素 / 场景级节奏参数**（写 `scale` / `rotate` 独立 CSS 属性，与入场动画叠加而不冲突）：

```js
vk.title('DROP', { beat: { scale: .08, brightness: .3, unit: 'beat', k: 7, beats: [2, 4] } })  // 只在 2、4 拍脉冲
vk.hero('BASS',  { energy: { scale: [1, 1.12], brightness: [.8, 1.3], band: 'low', smooth: .08 } })
vk.scene('副歌', 'm:8', { beat: { scale: .02 }, energy: { brightness: [.85, 1.15] } }, [ … ])     // 整帧（镜头）调制
sc.onBeat(el, { scale: .1 });  sc.energize(el, { scale: [1, 1.2] });  sc.energyZoom(.04, 'low');  sc.beatZoom(.03, 'bar')
```

每帧舞台上还有 CSS 变量 `--beat` `--bar` `--energy` `--low` `--mid` `--high`，纯 CSS 也能跟节奏：`style: 'opacity: calc(.5 + .5 * var(--beat))'`。

**自动卡点切镜**：场景时长写 `'b:8'` / `'m:4'` 时，切点**精确落在网格上再减 lead 帧**（从上一场景切入点算起，已考虑转场重叠）；`end: 'm:16'` 指定绝对切点；`dur:'auto'` + `snap` 会把内容/配音决定的时长延长到下一个拍/小节。音效 `v.sfx('m:4', 'kick')` 也接受节拍时间，与画面共用同一套事件时间。

### `vk align`：词级对齐（中文逐字 / 英文逐词）

```bash
vk align narration.wav --text script.txt            # 已知文本强制对齐（每行一句）
vk align song.m4a --lyrics lyrics.txt --separate    # 歌曲：先 demucs 分离人声，再对齐歌词
vk align talk.mp3 --lang en                          # 无文本：转写 + 词时间戳
```

输出 `{vidkit:'align', lang, lines:[{start, end, text, words:[{w, t, end}]}]}`：中文每个汉字一个单位（标点并入前一个字），英文每词一个单位。后处理 `repair_and_refine`：以句内最大的连续词簇为准修复离群词，再把句首词吸附到人声 onset（窗口 −0.3…+0.02 s）；`--no-refine` 关闭。

接入字幕：

```js
vk.video({ captions: 'talk.align.json', karaoke: 'sweep' })                // 'sweep' 逐字扫色 | 'on' 逐字点亮 | 'pop' 逐字弹跳
vk.video({ lyrics: { src: 'song.align.json', offset: 0, captions: false } })  // 歌词只做时间数据，由 lyricVideo 排版
vk.lyrics(cue, { style: 'pop'|'rise'|'karaoke'|'slam', beat: true, size: 110 })  // 逐词动态字（按词时间触发）
vk.spectrum({ bars: 32, h: 120, mirror: true })                             // 频谱条，由分析得到的 mel 频段驱动
vk.lyricLines                                                               // 当前页面的歌词行（getter）
```

**歌词 MV 预设** `vk.lyricVideo({ intro, outro, styles, sectionStyles, bgs, cut: 'bar'|'beat', cutTolerance: .15, spectrum, flash, zoom, energy })`：每句歌词一个场景（同一小节内的句子合并），切点落在"首字之前最近的小节线"；按段落轮换字体动效与背景；高能段落（能量高于中位数）自动加节拍缩放、白闪与频谱；所有歌词场景亮度跟随低频响度。

### `vk tts`：配音驱动时长

```js
vk.video({ voice: { manifest: 'page.vo.json', voice: 'zh-CN-YunxiNeural', rate: '+5%', lead: .5, tail: .8, maxChars: 16 }, karaoke: 'sweep' });
vk.scene('总量', 'auto', { vo: '2024 年，全球排放约 378 亿吨二氧化碳。', voLead: .4 }, [ … ]);
```

```bash
vk tts page.html                     # 为每个 vo: 合成音频 → page.vo/<hash>.mp3 + page.vo.json（按文本缓存，改一句只重合成一句）
vk tts page.html --backend piper     # 离线
vk tts --voices zh                   # 列出中文音色
vk tts --text "你好，世界" -o hi.mp3   # 单句
```

- `dur:'auto'` 的场景时长 = `voLead + 语音时长 + voTail`（与动画结束时间取大者，再按 `snap` 吸附节拍）。
- 字幕由 TTS 的词边界自动生成并切分（每条 ≤ `maxChars` 字，按标点断句），逐字卡拉 OK 高亮。
- 未运行 `vk tts` 时页面仍可预览（按语速估计时长），`vk qa` 会报 `VO missing`；配音超出场景也会报 ISSUE。
- **多角色配音**：`vo` 可以是多句数组，每句可指定角色（`voice.cast` 里定义音色/语速/音高），逐句生成音频与字幕（字幕不重叠）：

  ```js
  vk.video({ voice: { manifest: 'p.vo.json', voice: 'zh-CN-XiaoxiaoNeural', gap: .3, cast: { tad: { voice: 'zh-CN-YunxiaNeural', rate: '+6%', pitch: '+10Hz' } } } });
  vk.scene('问路', 'auto', { vo: ['旁白一句。', ['tad', '妈妈！', { gap: .6 }], { who: 'duck', text: '嘎嘎！', at: 9 }] }, (sc) => {
    sc.voSegs;            // 构建节点前就已排好：[{text, at, dur, end, words, who}]（场景内时间）
    sc.voAt(1); sc.voEndAt(1); sc.speaking(local, 'tad');   // 第 i 句起止、某角色此刻是否在说话（嘴型 0..1）
  });
  ```
  `vk tts` 按（音色, 语速, 音高）分组合成；默认音色的句子仍按原文本缓存（向后兼容）。
- 常用中文音色（edge-tts）：`zh-CN-XiaoxiaoNeural`（女，温暖）、`zh-CN-YunxiNeural`（男，讲解）、`zh-CN-YunjianNeural`（男，激昂）、`zh-CN-XiaoyiNeural`（女，活泼）、`zh-CN-YunyangNeural`（男，新闻）、`zh-TW-HsiaoChenNeural`、`zh-HK-HiuMaanNeural`；英文 `en-US-AriaNeural` / `en-US-GuyNeural` 等。piper：`zh_CN-huayan-medium`。

### 混音（`vk render` 自动完成）

音乐（按 `musicStart` 截取、配音处自动 ducking：attack 0.25 s / release 0.45 s、结尾淡出）+ 配音（adelay 采样级定位）+ 离线合成音效 → **两遍 loudnorm 到 −14 LUFS / −1.5 dBTP**（`linear=true`，不压缩动态）。

```js
vk.video({ mix: { lufs: -14, duck: -11, fadeOut: 2 } })     // duck = 配音时音乐衰减 dB
```

```bash
vk render page.html -o out.mp4 --srt [--lufs -16|off] [--duck -8] [--no-voice]
# 同时写出 out.audio.json（实测响度报告）与 out.words.json（带词时间的字幕，供 vk sync 使用）
```

只有 `score` 的旧页面保持原行为（峰值归一化、不做 loudnorm）。

### `vk sync`：音画同步测量

```bash
vk sync out/mv.mp4 --beats examples/mv/song.beats.json      # 画面冲击帧（亮度跳变）vs 节拍 / 成片重新检测的 onset
vk sync out/explainer-vo.mp4 --words out/explainer-vo.words.json   # 对成片音频重新对齐，比较字幕词时间
```

报告帧误差直方图、`within1Frame`、`late`、`onBeatOrOneFrameEarly` 等。示例实测（30 fps，详见 `out/*-sync.json`）：

| 成片 | 结果 |
|---|---|
| `out/mv.mp4` | 所有节拍驱动的画面冲击均落在拍点或**提前 1 帧**，无滞后；成片 onset 与分析节拍中位差 ≈ 0 ms |
| `out/explainer-vo.mp4` | 字幕词时间 vs 成片重新对齐：中位 −3.5 ms，无系统偏移（残差为对齐器本身的噪声，p90 ≈ 170 ms） |

### 限制

- 纯 CPU；whisper-small 对齐的逐字误差约 50 ms（中位），快速说唱/密集歌词更差；可 `--model medium` 换精度。
- stable-ts 的 silero VAD 需从 GitHub torch hub 下载，受速率限制影响，故固定 `vad=False`。
- edge-tts 需联网、是微软在线服务（商用条款请自行确认）；piper 中文音色 `huayan` 的数据集许可标注为 Unknown。
- `beat.brightness` / `energy.brightness` 使用 CSS filter，大面积使用会拖慢渲染。
- 预览里的配音播放是近似的（HTML audio 跟随播放头），以渲染结果为准。

---

## 下沉到原生代码

```js
vk.scene('自定义', 4, (sc, v) => {                 // nodes 也可以是函数：拿到 Scene 自己搭
  const el = sc.html('<div class="vk-h1">原生 DOM</div>', { flow: true });   // flow: 进入居中版式；单个元素直接返回，多个返回数组
  sc.tween(el, { t: .2, d: .6, from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 }, ease: 'house' });
  sc.on((local, p, t) => { el.style.letterSpacing = (0.2 - 0.2 * p) + 'em'; });   // 每帧回调：只依赖时间
  sc.canvas((g, local, info) => {                   // Canvas2D 层：无状态粒子 = f(seed, t)
    for (let i = 0; i < 200; i++) { const a = local - vk.hash(i) * 2; if (a < 0) continue;
      g.fillRect(640 + Math.cos(i) * 300 * a, 360 + Math.sin(i) * 300 * a, 4, 4); }
  }, { z: 'back' });
  sc.webgl({ z: 'back', frag: 'void main(){ gl_FragColor = vec4(gl_FragCoord.xy/uRes, .5+.5*sin(uTime), 1.); }' });
});
vk.el(ctx => { /* 在节点列表里插入任意元素，ctx.scene / ctx.px / ctx.at(o) 可用 */ return document.createElement('div'); })
```

规则：渲染路径里只能依赖 `t`；随机用 `vk.hash(i)` / `vk.rand(seed)` / `vk.noise1(x)`；需要状态的效果（物理、拖尾）请写成"从 0 积分到 t"的纯函数或预计算表。

兼容：原工具包 `engine.js` 风格的 `data-*` 声明式页面由 `authoring/declarative.js` 适配，可继续使用。

---

## CLI

```text
vk render  page.html -o out.mp4 [--fps 30] [--scale 2] [--format 16:9|9:16|1:1|4:5] [--audio music.m4a]
                                [--audio-offset s] [--grain 6] [--workers 4] [--from s --to s] [--crf 18]
                                [--preset medium] [--png | --quality 95] [--srt] [--no-score] [--score-gain-max 2] [--keep]
vk stills  page.html [--at 1.5,4,9.2] [-o dir] [--scale 2]   静帧 PNG（默认每个场景动画落定后的一帧）
vk contact page.html [-o sheet.png] [--times a,b | --settle] [--cols 4]   联系表（每场景 2 帧，或 --settle 1 帧）
vk qa      page.html [--sample 0.5] [--json=report.json]      版面 QA + 可见文字快照
vk preview page.html [--port 5173] [--host 0.0.0.0] [--dev]   开发服务器：热更新 + 进度条（--dev 同时监听 src/ 重建）
vk new     video.html [--format 9:16] [--theme bold]          生成模板
                                [--lufs -14|off] [--duck -10] [--no-voice]   ← render 的混音参数

# 音频（Phase 2，需 tools/setup-audio.sh）
vk analyze music.mp3 [-o music.beats.json] [--backend auto|beat_this|librosa] [--rate 50] [--bands 8]
vk align   audio.wav [--text script.txt | --lyrics lyrics.txt] [--lang zh|en] [--model small] [--separate] [-o x.align.json]
vk tts     page.html [--voice zh-CN-YunxiNeural] [--backend edge|piper] [--rate +0%] [--force]   (--voices zh · --text "…" -o a.mp3)
vk sync    out.mp4 [--beats song.beats.json --music-start s] [--words out.words.json]
vk doctor
```

`vk qa` 检查项：文字重叠、文字溢出容器、出画、标题安全区、平台 UI 区（竖屏）、字幕宽度/换行/阅读速度（中文按 ≤9 字/秒）、字体是否加载、空白帧（含转场中点）、配音缺失 / 配音超出场景、音乐文件缺失、词时间非单调，并打印每个场景的可见文字快照，方便核对文案。ISSUE 为必须修，WARN 为建议检查（转场中点的 dip/flash 预期会报空白帧）。

---

## 编写插件

插件可以是对象或函数，注册的效果与内置预设完全平级：

```js
vk.use({
  name: 'hello',
  fx: {
    tilt: { from: { opacity: 0, transform: 'rotate(-8deg) translateY(30px)' }, to: { opacity: 1, transform: 'none' }, ease: 'spring' },
    neon: (el, o, api) => {                       // 函数型：自己安排 tween / 每帧函数
      api.tween(el, { t: o.t, d: .5, from: { opacity: 0 }, to: { opacity: 1 } });
      api.fn(el, local => { el.style.textShadow = `0 0 ${12 + 8 * Math.sin(local * 9)}px var(--accent)`; });
    },
  },
  transitions: { 'spin-in': p => ({ in: { opacity: p, transform: `rotate(${(1 - p) * -90}deg)` }, out: { opacity: 1 - p } }) },
  textures: { tint: (video, o) => { const el = document.createElement('div'); /* … */ video.stage.appendChild(el); return { el, update(t) {} }; } },
  backgrounds: { stripes: (scene, o, video) => ({ el, update(local) {} }) },
  blocks: { myChart: (data, o) => vk.node(o, function myChart(ctx) { /* → Element */ }) },   // 暴露为 vk.myChart
  sounds: { blip: (kit, t, gain) => kit.tone(t, 'square', 880, 440, .08, .3 * gain) },
  layers: { /* 新渲染层类型，Phase 3 的 rig/particles 就从这里接入 */ },
  hooks: { init(video) {}, frame(t, video) {}, qa(report, video) {} },
});
// 或函数形式：vk.use((vk, opts) => { vk.register('fx', 'x', …) }, opts)
```

签名约定：

| 种类 | 签名 |
|---|---|
| `fx` | `(el, o, api) => void`，或 `{from, to, ease, origin, instant}` 对象（可与其它对象预设组合）；`api = {scene, video, tween, fn, after(fontsLoaded), beats, fps, exit}` |
| `transitions` | `(p, ctx) => ({in, out, under, flash, flashColor})`，`p` 为缓动后的 0–1；`in/out` 为作用于新/旧场景的样式 |
| `textures` | `(video, opts) => ({el?, draw?(ctx, t, info), update?(t)})` |
| `backgrounds` | `(scene, opts, video) => ({el, update?(local)})` |
| `blocks` | `(...args) => Node`（用 `vk.node(o, build, defaultFx)` 创建） |

完整可运行示例：`examples/plugins/hello-plugin.js` + `examples/plugin-demo.html`。

---

## 开发与测试

```bash
npm run build        # esbuild → dist/vidkit.js（IIFE, window.vk）+ dist/vidkit.esm.js
npm test             # node --test：缓动端点/单调性、cubic-bezier 解析、stagger、BeatGrid（小节/提前一帧/网格切点）、种子随机、插值、代码高亮、词映射/字幕切分、混音表达式；有 .venv 时额外跑 click-track 分析测试
npm run examples     # 渲染全部示例到 out/
node scripts/list-presets.mjs   # 打印已注册预设（同步本文档）
node scripts/debug-page.mjs /abs/page.html   # 打印页面报错与 console
```

ES module 用法：`import vk from 'vidkit/src/index.js'`（需要浏览器环境；字体路径通过 `vk._setEnv({ base })` 指定）。

---

## 路线图

### Phase 2 · 音频与节奏 ✅（v0.2.0）

已完成：`vk analyze` / `vk align` / `vk tts` / `vk sync`、节奏 API、卡拉 OK 字幕、歌词 MV 预设、配音驱动时长、混音与响度归一（见[音乐、节奏与配音](#音乐节奏与配音phase-2)）。后续可做：真人歌曲的多轨（stem）驱动、whisper medium/large 精度模式、`voice` 插件种类（接入更多 TTS 后端）、实时预览中的波形刷。

### Phase 3 · 角色与高级渲染

- **角色 rig**：`registry.layers` 新增 SVG/Canvas 骨骼层，关节关键帧走现有 timeline（`attr:` / `--var` 插值已就绪）。
- **手绘 boil**：`vk.boil(t, rate)` 已在 core/random 中提供（返回按 8–12fps 步进的帧号，作为 `vk.hash` 的种子让线条抖动），Phase 3 配合 SVG filter / 路径扰动做成预设。
- **粒子**：Canvas2D 层 + 无状态粒子范式（见 gallery `canvas2d · particles`），后续封装 `particles` 预设（发射器/力场，从 0 积分到 t）。
- **WebGL 着色器层**：`scene.webgl({frag, uniforms: (local, info) => ({…})})` 已可运行（uTime/uRes/uBeat/uProgress）；Phase 3 增加多 pass、纹理输入（把 DOM 场景作为纹理）与着色器转场。

---

## 水墨套件（`ink`，Phase 3 预览）

参照《三个和尚》式的水墨动画语言，`src/fx/ink.js` 提供：

- 主题 `theme: 'ink'`（宣纸 #e4e5d8 / 墨 #1f2529 / 朱砂 #b5342a；马善政毛笔字 + 思源宋体；字幕条为宣纸底、红色左边框）与质感 `texture: { rice: {} }`（分形噪声纸纹 multiply + 暗角）。
- `vk.installInk(video, { boil })` 注入 SVG 滤镜：`ink-line`（墨线抖动）、`ink-wob`、`ink-wash`（晕染）、`ink-far`（远山）、`ink-bleed`（湿笔洇开）、`ink-dry`（枯笔）。
- 区块：`vk.vtitle('片名', { sub, seal })` 竖排书法片名 + 印章，`vk.chapter('春水', { no: '一' })` 角落竖排章节名，`vk.seal`、`vk.endcard`、`vk.credits`。
- 转场：`ink`（墨滴晕开遮罩，可设焦点 x/y）、`wash`（模糊交叉淡化）；特效：`ink` / `brush` / `brush-x` / `stamp`。
- 几何与 rig 工具：`vk.brushPath(points, width|fn)`（笔触轮廓）、`vk.sampleLine(fn, n)`、`vk.attr(el, {...})`（带缓存的 SVG 属性写入）；关键帧助手 `vk.bump / plat / hold / inRanges / smooth01 / kfSpline`（按时间参数化的 Catmull-Rom）。
- 纯 DSP 合成（`vk.synth`，Node 与页面通用、确定性）：`pluck`（Karplus–Strong 古琴/琵琶，含滑音/吟猱）、`flute`、`drop`、`bubbles`、`splash`、`croak`、`quack`、`woodfish`、`gong` + `reverb`、`mixStereo`、`penta`（五声音阶）、`wavBytes`。同名 `sfx` 可直接用：`sc.sfx(t, 'croak', .8, 480)`。

完整示例：`examples/tadpole/`（`lib/pond.js` 池塘场景、`lib/rigs.js` 角色、`lib/school.js` 蝌蚪群）。

---

## 字体许可

全部随包字体均为 **SIL Open Font License 1.1**（允许随软件打包、嵌入、再分发；不可单独售卖；修改版不得使用保留字体名；用这些字体渲染出的视频不受限制）。详见 `fonts/LICENSES.md` 与 `fonts/OFL-1.1.txt`。

| 字体 | 用途 |
|---|---|
| Noto Sans SC（可变 100–900） | 中文 + 拉丁，所有主题正文/标题 |
| JetBrains Mono（可变） | 代码、终端、数字 |
| Archivo（可变 wght + wdth） | 展示字体（bold / noir）；`stretch` 特效动画字宽轴 |
| Anton | 窄体海报字（`font:'condensed'`） |
| Instrument Serif（Regular / Italic） | editorial 主题标题、引用 |
| Ma Shan Zheng 马善政毛笔楷书 | `ink` 主题书法标题 |
| Noto Serif SC 思源宋体（可变 200–900） | `ink` 主题正文、字幕 |

示例数据来源：`examples/data/co2.json` 摘自 Our World in Data《CO₂ and Greenhouse Gas Emissions》（github.com/owid/co2-data，基于 Global Carbon Project，CC BY 4.0，2026-09-29 获取）。`examples/assets/sample-screenshot.svg` 为合成占位图（画面标注"示例截图"）。

音乐素材（`examples/assets/music/`，详见 `examples/mv/LICENSE-music.md`）：Kevin MacLeod（incompetech.com）《Voxel Revolution》《Wallpaper》节选，**CC BY 4.0**——使用或再发布成片时必须署名（示例片尾已署名）。MV 中的"人声"为 edge-tts 合成（微软在线服务，条款见 LICENSE-music.md）。
