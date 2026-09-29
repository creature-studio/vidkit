# vidkit

> 用 HTML/JS 代码生成视频的通用框架：**一行一个元素，一帧一个纯函数**。
> 工作名 `vidkit`：改名只需改 `package.json` 的 `name` / `vidkit.global` 与本 README 标题（CLI 命令名在 `package.json` 的 `bin`）。

- **确定性**：每一帧 = `render(t)`，不依赖真实时钟、不读 `Math.random()`（setup 阶段的随机数已被种子化）。任意跳帧、并行渲染、重复渲染结果一致。
- **简单**：`vk.video()` + `vk.scene()` + 元素工厂，写宣传片 / 数据讲解 / 竖屏短视频不需要写一行动画代码。
- **效果丰富**：42 个元素特效、44 个转场（均含别名；去重后 39 / 40）、19 个区块/图表、7 种质感、5 种背景、4 套主题、9 种画幅预设。
- **可下沉**：随时 `scene.on(t => …)`、`vk.el(ctx => …)`、`scene.canvas()`、`scene.webgl()` 写原生代码。
- **可扩展**：所有效果都是插件注册出来的，第三方插件与内置预设能力完全相同（`vk.use(plugin)`）。
- **离线**：字体随包（均为 OFL 1.1），音效由 OfflineAudioContext 合成，渲染不联网。

## 目录

1. [快速开始](#快速开始)
2. [架构](#架构)
3. [场景 API](#场景-api)
4. [预设目录](#预设目录)
5. [主题](#主题)
6. [画幅与安全区](#画幅与安全区)
7. [字幕与音频](#字幕与音频)
8. [下沉到原生代码](#下沉到原生代码)
9. [CLI](#cli)
10. [编写插件](#编写插件)
11. [开发与测试](#开发与测试)
12. [路线图（Phase 2 / 3）](#路线图)
13. [字体许可](#字体许可)

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
├─ cli/                  render · stills · contact · qa · preview · new · lib（服务器、浏览器、ffprobe）
├─ src/
│  ├─ index.js           vk 对象（ES module 入口）
│  ├─ browser.js         IIFE 入口 → window.vk
│  ├─ core/              ease · random · time(BeatGrid) · stagger · interp · camera · timeline · plugin · scene · video
│  ├─ layers/            canvas.js · webgl.js
│  ├─ fx/                apply · text · transitions · svg · shapes · charts · blocks · textures · backgrounds
│  ├─ authoring/         api(元素工厂) · node(公共选项/md) · themes · formats · declarative(data-* 兼容)
│  ├─ audio/score.js     离线音效合成（kick/pop/whoosh…）
│  └─ runtime/           css · preview · qa
├─ dist/                 vidkit.js（IIFE，~165 KB）· vidkit.esm.js
├─ fonts/                Noto Sans SC · JetBrains Mono · Archivo · Anton · Instrument Serif（OFL 1.1）
├─ examples/             promo · explainer · vertical · gallery · plugin-demo · data/ · assets/ · plugins/
├─ scripts/              build · render-examples · list-presets · debug/probe 工具
├─ test/core.test.mjs    缓动/时间/随机/节拍/插值的确定性单测
└─ out/                  渲染产物（git 忽略）
```

**渲染流程**：`vk render` 启动本地静态服务器 → N 个 Chromium worker 各自打开页面（`?render=1`）→ 对每帧调用 `window.__seek(t)`（内部就是 `video.render(t)`）→ 截图（默认 JPEG q95）→ ffmpeg 编码（yuv420p、bt709、`+faststart`）→ 若页面定义了音效 `window.SCORE` 则离线合成 WAV 并混入，或用 `--audio` 指定音乐 → 可选导出 SRT → ffprobe 校验 + blackdetect。

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
  bpm: 128, beatOffset: 0,   // 节拍网格（或 beats: [0.52, 1.01, …] 显式节拍时间 → Phase 2 节拍检测直接填这里）
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
- 词级时间（卡拉 OK）：`v.caption(start, end, text, [{w:'每', t:1.2}, …])` —— 这正是 Phase 2 语音/歌词对齐要接入的数据格式。
- 音乐：`vk render page.html --audio music.m4a --audio-offset 0.5`；节拍网格用 `bpm` 或 `beats:[…]`；`vk.beat(n)`、`vk.pulse(t)`、`vk.hit(t, t0)`、`vk.snap()`，场景时长/入场时间可写 `'b:8'`。
- 音效：页面定义的 `score` / `sfx` 在渲染时由 OfflineAudioContext 离线合成成 WAV，与 `--audio` 混音。

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
```

`vk qa` 检查项：文字重叠、文字溢出容器、出画、标题安全区、平台 UI 区（竖屏）、字幕宽度/换行/阅读速度（中文按 ≤9 字/秒）、字体是否加载、空白帧（含转场中点），并打印每个场景的可见文字快照，方便核对文案。ISSUE 为必须修，WARN 为建议检查（转场中点的 dip/flash 预期会报空白帧）。

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
npm test             # node --test：缓动端点/单调性、cubic-bezier 解析、stagger、BeatGrid、种子随机、插值、代码高亮
npm run examples     # 渲染全部示例到 out/
node scripts/list-presets.mjs   # 打印已注册预设（同步本文档）
node scripts/debug-page.mjs /abs/page.html   # 打印页面报错与 console
```

ES module 用法：`import vk from 'vidkit/src/index.js'`（需要浏览器环境；字体路径通过 `vk._setEnv({ base })` 指定）。

---

## 路线图

### Phase 2 · 音频（接口已预留）

- **导入音乐节拍检测**：离线分析（onset/tempo）→ 直接填入 `vk.video({ beats: [...] })`；`BeatGrid` 已支持显式节拍列表、`pulse/hit/snap/quantize`、`'b:N'` 时间写法、`beatZoom`、`rgb pulse`。
- **词级歌词 / 配音对齐**：forced alignment 结果 → `v.caption(s, e, text, words)`（卡拉 OK 字幕已实现）；新增 `fx:'lyric'` 类预设按词触发。
- **TTS**：`registry.sounds` 之外新增 `voice` 插件种类：文本 → 音频文件 + 词级时间戳，自动生成 `cap` 与场景时长（`dur:'auto'` 已支持按内容伸缩）。
- 音频波形 / 频谱可视化预设（基于离线 FFT 预计算表，保持确定性）。

### Phase 3 · 角色与高级渲染

- **角色 rig**：`registry.layers` 新增 SVG/Canvas 骨骼层，关节关键帧走现有 timeline（`attr:` / `--var` 插值已就绪）。
- **手绘 boil**：`vk.boil(t, rate)` 已在 core/random 中提供（返回按 8–12fps 步进的帧号，作为 `vk.hash` 的种子让线条抖动），Phase 3 配合 SVG filter / 路径扰动做成预设。
- **粒子**：Canvas2D 层 + 无状态粒子范式（见 gallery `canvas2d · particles`），后续封装 `particles` 预设（发射器/力场，从 0 积分到 t）。
- **WebGL 着色器层**：`scene.webgl({frag, uniforms: (local, info) => ({…})})` 已可运行（uTime/uRes/uBeat/uProgress）；Phase 3 增加多 pass、纹理输入（把 DOM 场景作为纹理）与着色器转场。

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

示例数据来源：`examples/data/co2.json` 摘自 Our World in Data《CO₂ and Greenhouse Gas Emissions》（github.com/owid/co2-data，基于 Global Carbon Project，CC BY 4.0，2026-09-29 获取）。`examples/assets/sample-screenshot.svg` 为合成占位图（画面标注"示例截图"）。
