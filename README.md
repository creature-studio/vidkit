# vidkit

> 用 HTML/JS 代码生成视频的通用框架：**一行一个元素，一帧一个纯函数**。
> 工作名 `vidkit`：改名只需改 `package.json` 的 `name` / `vidkit.global` 与本 README 标题（CLI 命令名在 `package.json` 的 `bin`）。

- **确定性**：每一帧 = `render(t)`，不依赖真实时钟、不读 `Math.random()`（setup 阶段的随机数已被种子化）。任意跳帧、并行渲染、重复渲染结果一致。
- **简单**：`vk.video()` + `vk.scene()` + 元素工厂，写宣传片 / 数据讲解 / 竖屏短视频不需要写一行动画代码。
- **效果丰富**：42 个元素特效、44 个转场（均含别名；去重后 39 / 40）、19 个区块/图表、7 种质感、5 种背景、4 套主题、9 种画幅预设。
- **可下沉**：随时 `scene.on(t => …)`、`vk.el(ctx => …)`、`scene.canvas()`、`scene.webgl()` 写原生代码。
- **可扩展**：所有效果都是插件注册出来的，第三方插件与内置预设能力完全相同（`vk.use(plugin)`）。
- **离线**：字体随包（均为 OFL 1.1），音效由 OfflineAudioContext 合成，渲染不联网。
- **对 agent 友好**：严格模式（未知名称报错 + did-you-mean + 文件:行号）、带参数 schema 的注册表（`vk list`、`docs/api.json`、`docs/vk.d.ts`、`llms.txt`）、确定性静态检查 `vk lint`、一次启动看全片的 `vk peek`（静帧 + 联系表 + `peek.json` 自动视觉检查）、`--draft` 草稿模式；工作流见 [`AGENTS.md`](AGENTS.md)。
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
14. [风格库（style packs）](#风格库vkstylestylesid)
15. [镜头与动作（Phase 3）](#镜头与动作phase-3)
16. [动态图形套件（`vk.mg`）与运动模糊](#动态图形套件vkmg与运动模糊)
17. [3D：`vk.three`（three.js r186，可选）](#3dvkthreethreejs-r186可选)
18. [面向 agent：严格模式、注册表、lint、peek、草稿](#面向-agent严格模式注册表lintpeek草稿)
19. [字体与素材许可](#字体许可)

---

## 快速开始

依赖：Node ≥ 18、ffmpeg/ffprobe、Playwright Chromium（`npx playwright install chromium`，同时会装上默认捕获用的 chrome-headless-shell；没有时自动回退到 `--capture screenshot`）。

```bash
cd vidkit && npm install && npm run build   # 生成 dist/vidkit.js（单文件 IIFE）与 dist/vidkit.esm.js
npm link                                     # 可选：全局命令 vk
vk new hello.html --format 9:16 --theme bold # 生成模板
vk preview hello.html                        # 本地预览：热更新 + 进度条 + 场景列表（按 s 显示安全区）
vk lint hello.html                           # 确定性静态检查（render 闭包里的 Math.random / Date.now / 定时器 …，未知名称）
vk peek hello.html                           # 一次启动：低清静帧 + 联系表 + peek.json（版面 / 对比度 / 闪烁 / 确定性检查）
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
| `gl-ink-demo.html` | **`vk.gl` WebGL 水墨特效演示**（20 s）：墨滴溅落与题字洇开、远山晕染成形 + 雾带、荷塘水墨化后期 + 水花/落花、剪纸窗花 | `out/gl-ink-demo.mp4` |
| `tadpole/tadpole-gl.html` | 《小蝌蚪找妈妈》片头的 GL 版（原片未改） | `out/tadpole-gl.mp4` |
| `nezha/nezha.html` | **水墨神话短片《哪吒闹海》**（骨骼版）：作者手绘哪吒 SVG 接入 `vk.rig`（idle / float / attack 片段 + IK 出手），程序化混天绫、龙与海浪；`nezha.html` 为早期非骨骼版，`nezha-ref/` 为原始 rig 演示 | `out/nezha-rig.mp4` |
| `wusong/wusong.html` | **上美厂风格剪纸动画短片《武松打虎》**（~69 s）：剪纸角色 rig（武松、吊睛白额虎，`lib/*-rig.js`）+ 水墨景阳冈（`lib/jingyang.js`），`vk.gl` 墨晕片名/落叶/木屑，edge-tts 说书旁白（YunjianNeural），代码合成京剧锣鼓（四击头 / 冲头 / 急急风，`lib/papercut.js`） | `out/wusong.mp4` |
| `gallery.html` | **FX Gallery 活文档**：每个预设一小段 + 名称 + 生成它的那行代码 | `out/gallery.mp4` |
| `plugin-demo.html` | 插件示例（`plugins/hello-plugin.js`） | — |
| `styles/<id>/preview.html` | **风格库**：10 个风格包（含需要 `vidkit-three.js` 的 `three-tech`）各自的 ~5 s 同一样片（片名 + 角色 + 特效 + 转场）；`vk style gallery` 生成画廊页 | `out/styles/<id>.mp4` · `out/styles/index.html` |
| `kite-papercut/` · `kite-ink/` | **`vk make` 生成的短片**：同一个故事 `stories/kite.md`（3 场景、旁白 + 两个角色对白）分别用 `papercut` 与 `ink` 风格生成 | `out/kite-papercut.mp4` · `out/kite-ink.mp4` |
| `reel/reel.html` | **15 s / 128 BPM 动态海报 reel**（8 个一小节场景）：`vk.mg` 全套——彩条覆盖转场卡在小节线、冲击波环 / 速度线 / 放射线 / 白闪、字母砸落挤压拉伸、汉字 slam + 回声残影 + 硬投影、逐拍形变、点阵波浪背景、数据弹性柱、手机里的 UI 微交互、半拍关键词快切、汇聚收束 logo、HUD；子帧运动模糊 + 合成鼓组。`out/reel-original.mp4` 为参考原片逐帧渲染，`out/reel-compare.png` 为对照表 | `out/reel.mp4` |
| `wusong/wusong-v2-scene.html` | 《武松打虎》**打斗两场重做**（一棒劈下 · 骑虎挥拳）：镜头系统（近景/跟拍/打击推近、头部不出画）、脚步锁定的走路、竖直劈棒、可见的拳、帽带跟随运动（原片 `wusong.html` 未改） | `out/wusong-v2-scene.mp4` |
| `three-basics.html` | **`vk.three` 入门**（11 s）：粒子星系 → 文字、耳机转台 + 灯条扫光、手机 orbit + 景深（需 `dist/vidkit-three.js`） | — |
| `agent-test/agent-test.html` | **agent 自测片**（10 s）：只按 `llms.txt` + `AGENTS.md` 写成——`tech` 风格 + 原生 canvas 星空 + 小的 `vk.three` 环面结，lint → peek 循环（见[面向 agent](#面向-agent严格模式注册表lintpeek草稿)） | `out/agent-test.mp4` · `out/agent-test-sheet.png` |
| `three-promo/three-promo.html` | **3D 产品宣传片**（24 s，1080p，虚构耳机 LUMEN Buds）：粒子 logo 组装、转台主镜头 + 扫光、CatmullRom 穿梭、三色并排、crane 片尾，`bars` 覆盖转场，合成器铺底 + edge-tts 中文旁白，运动模糊 | `out/three-promo.mp4` · `out/three-promo-sheet.png` |

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
  runtime/：注入 CSS、预览播放器、页内 QA、静态层缓存   cli/：headless shell BeginFrame 逐帧捕获 → ffmpeg
```

```
vidkit/
├─ package.json          name / bin(vk) / scripts
├─ bin/vk.mjs            CLI 入口
├─ AGENTS.md · llms.txt    agent 工作流 / 简明指南（llms.txt 由 npm run docs 生成）
├─ docs/                 api.json（完整注册表 + 参数 schema）· vk.d.ts（类型）——均由 npm run docs 生成
├─ cli/                  lint · lintcore(acorn AST) · peek · list · render · capture(beginframe/screenshot 捕获) · cdp(CDP pipe 客户端) · stills · contact · qa · preview · new · lib · analyze · align · tts · sync · doctor · mix(混音/ducking/loudnorm) · py
├─ tools/                vkaudio.py（Python 音频工具链）· setup-audio.sh · requirements-audio.txt
├─ src/
│  ├─ index.js           vk 对象（ES module 入口）
│  ├─ browser.js         IIFE 入口 → window.vk
│  ├─ meta/              注册表元数据：schemas.js（每个 fx/转场/质感/背景/区块/元素/three 模块的参数）· index.js（vk.list detail）
│  ├─ core/              strict(严格模式 / Math.random 守卫) · names(Levenshtein) · ease · random · time(BeatGrid) · stagger · interp · camera · timeline · plugin · scene · video
│  ├─ layers/            canvas.js · webgl.js
│  ├─ fx/                apply · text · transitions · svg · shapes · charts · blocks · textures · backgrounds · rhythm · lyrics
│  ├─ authoring/         api(元素工厂) · node(公共选项/md) · themes · formats · declarative(data-* 兼容)
│  ├─ audio/             score(离线音效合成) · music(节拍/包络/段落 MusicInfo) · words(对齐→字幕/卡拉 OK)
│  ├─ runtime/           css · preview · qa · bake(静态层缓存)
│  └─ three/             可选 3D 包入口 index · layer · post · math(纯函数) · loaders · env · materials · products · turntable · particles · cache(PMREM/粒子目标磁盘缓存)
├─ dist/                 vidkit.js（IIFE，~200 KB）· vidkit.esm.js · vidkit-three.js（可选 3D 包，含 three r186）
├─ vendor/               acorn 8（MIT，vk lint 用）· three r186 + addons（MIT）· Draco 解码器（Apache-2.0）· hdri/studio_loft_1k.hdr（Poly Haven CC0）；许可见 vendor/LICENSES.md
├─ fonts/                Noto Sans SC · JetBrains Mono · Archivo · Anton · Instrument Serif（OFL 1.1）
├─ examples/             promo · explainer · vertical · gallery · mv · explainer-vo · plugin-demo · data/ · assets/(music) · mv/ · plugins/
├─ scripts/              build · render-examples · list-presets · debug/probe 工具 · profile-render/profile-cpu · compare-capture/compare-video
├─ test/                core.test.mjs（缓动/时间/随机/节拍/插值）· audio.test.mjs（节拍网格/小节/提前一帧/词映射/混音表达式/分析器）· ink.test.mjs · capture.test.mjs（分块调度/捕获参数/烘焙辅助函数 + 浏览器往返）· agent.test.mjs（did-you-mean、lint 规则、文档是否最新、严格模式、vk list/lint/peek）
└─ out/                  渲染产物（git 忽略）
```

**渲染流程**：`vk render` 启动本地静态服务器 → 探测页面（时长 / 场景 / 音频，Playwright）→ N 个 chrome-headless-shell worker（默认 = CPU 核数）各自打开页面（`?render=1`），先执行一次静态层缓存（`vk.bake`）→ 帧按"连续车道 + 工作窃取"分块（默认 2 秒一块）分给 worker：对每帧调用 `window.__seek(t)`（内部就是 `video.render(t)`）→ `HeadlessExperimental.beginFrame` 一次调用完成合成与截图（JPEG q95）→ 直接写入该块的 ffmpeg stdin（image2pipe，不落盘 PNG）编码为 H.264 分段（yuv420p、bt709）→ 分段 `concat -c copy` → 音频与帧**并行**准备：离线合成音效 WAV + 音乐（`music`/`--audio`）+ 配音（`vk tts` 生成的片段）→ ffmpeg 混音（ducking、两遍 loudnorm）→ mux（`+faststart`）→ 可选导出 SRT → ffprobe 校验 + blackdetect。详见下文[渲染性能](#渲染性能捕获模式与静态层缓存)。

**时间模型**：场景在时间轴上首尾重叠，重叠长度 = 下一场景的转场时长（`start = 上一场景结束 − 转场时长`）。场景内所有时间都是**场景本地秒**（或 `'b:8'` 这样的节拍号，或 `'+0.3'` 表示相对上一个元素）。

### 渲染性能：捕获模式与静态层缓存

**捕获模式（`--capture`）**

| 模式 | 做法 | 适用 |
|---|---|---|
| `beginframe`（默认） | chrome-headless-shell 在 `--enable-begin-frame-control` 下运行（等价于 `--deterministic-mode`：`--run-all-compositor-stages-before-draw`、关闭 checker-imaging / 线程动画）；每帧 `render(t)` 之后发一次 `HeadlessExperimental.beginFrame({screenshot})`，**同一次调用**里完成布局→绘制→合成→JPEG 编码并返回。没有 vsync / 帧率等待，没有 Playwright 往返。CDP 走 `--remote-debugging-pipe`（`cli/cdp.mjs`）。 | 所有页面（DOM / SVG / Canvas / WebGL） |
| `screenshot` | 原来的路径：Playwright `page.screenshot()`，SwiftShader GL 合成。 | 回退 / 对照；找不到 headless shell 时自动使用 |

- `--gpu soft|swiftshader|off`：`soft`（beginframe 默认）= 软件光栅 + 软件合成，WebGL 仍由 SwiftShader 提供；`swiftshader`（screenshot 默认）= 旧的 GL 合成；`off` = `--disable-gpu`（无 WebGL）。无 GPU 的机器上软件合成比 SwiftShader GL 合成快约 2–3 倍（tadpole 单帧截图 141–218 ms → ~60 ms）。
- `--workers N`：beginframe 默认 = CPU 核数（8 核机器上 8 > 10 > 12，更多 worker 只会抢 CPU 与内存）；screenshot 默认 min(4, 核数−1)。
- `--chunk 帧数`：分块大小（beginframe 默认 2 秒 = 60 帧）。每块是一个独立的 H.264 分段，最后 `concat -c copy`；快的 worker 会从最慢的车道尾部"偷"一半，所以片子里的重场景不再决定总时长。
- `--timing`：打印每帧平均的 render(t) / 捕获 / ffmpeg 反压时间与各阶段耗时；`--x264-threads n` 限制每个分段编码器的线程。
- 输出仍是**逐帧精确**的：帧 i 就是 `render(i / fps)`，与旧路径逐帧对齐（错一帧的 PSNR 明显更差，见下表）；音频路径未改（`vk sync` 结果一致）。
- 容器/云主机注意：`/dev/shm` 很小（如 Docker 默认 64 MB）时 begin-frame 模式的渲染进程会崩溃，所以默认带 `--disable-dev-shm-usage`。可用 `VK_CHROME=/path/to/chrome-headless-shell` 指定浏览器、`VK_CAPTURE=screenshot` 全局切回旧路径。

**静态层缓存（`vk.bake`）**

`feTurbulence` / `feDisplacementMap` 墨线、`feGaussianBlur` 晕染、远山、宣纸纹理这类**不随时间变化**的内容，浏览器却会每帧重新跑滤镜（即使只是平移，亚像素位移也会触发重新光栅化）。`vk.bake` 在 `__ready` 之前把它们光栅化**一次**成位图：

```js
vk.bake(svgEl)                        // 根 <svg>：内容换成一张 <image>（svg 元素本身、它的 CSS、你对它做的 transform 动画都保留）
vk.bake(g, { scale: 1.5, pad: 8 })    // svg 内部的 <g>/<path>/…：在自身用户坐标系里连同 filter 一起烘焙（滤镜区域自动计算），
                                      // 元素自身的 transform / opacity / clip-path / mask 仍然是活的，可以继续逐帧动画
<svg data-vk-bake> … </svg>           // 声明式写法（也接受 data-vk-static）
vk.video({ bake: false })             // 整片关闭；vk render / vk stills 的 --no-cache 同效（?cache=0）
```

规则与限制：被烘焙的子树必须是静态的（烘焙后不能再改其内部属性；元素自身的 transform/opacity 可以变）；样式需来自属性 / 行内样式 / 可继承属性——文档 CSS 里针对后代的规则不会带进位图；引用了"抖动"滤镜（`installInk({boil})`）的内容会被自动跳过；位图按 `devicePixelRatio × scale` 光栅化，被放大很多倍的层请给更大的 `scale`；烘焙后的位图在亚像素平移时是重采样而非重新矢量光栅化（差异 < 1 灰阶）。每个 worker 各烘焙一次（tadpole：60 个层、19 MP、约 1.3 s）。`window.__bake` / `vk.bakeStats` 报告烘焙数量与耗时，`vk render` 会打印。

水墨套件已接入：`texture: { rice }` 的分形噪声纸纹只生成一次（一块噪声瓦片 → 全画幅 canvas 图案，内阴影单独一层保持在纸纹之上；`rice: { cache: false }` 回到旧实现）；tadpole 的远山、中景、水面墨线、荷叶/荷花的 `ink-wob` 滤镜都已 `vk.bake`。`wash` 转场去掉了恒等的 `brightness(1)`。实测软件合成下 CSS `brightness()` 很便宜（mv 全画幅 ≈1.3 ms/帧，wash 转场 ≈1.7 ms/帧），真正贵的是模糊（wash ≈11 ms/帧）和 SVG 滤镜。

**确定性检查**：分块并行意味着帧的渲染顺序与时间顺序不同。如果某个值是上一帧留下的（例如一个 `sc.on` 写、另一个更早注册的 `sc.on` 读），它会滞后一帧，并在每个分块开头出错。`vk qa` 现在会比较"从 t−1/fps 走到 t"与"从别处跳到 t"两种情况下可见 DOM 的状态（`--order-step 1` 秒采样，0 关闭），不一致时给出 WARN 和具体元素/属性。tadpole 的光束亮度就是这样发现并修正的（改成 `P.rayBoostAt(t)` 纯函数）。

**实测**（8 核、无 GPU、Chrome for Testing 153 headless shell，1280×720 @30fps）：

| | 旧（screenshot，7 worker） | 新（beginframe + 缓存，8 worker） | 加速 |
|---|---|---|---|
| tadpole 126.4 s / 3792 帧：帧阶段 | 385.0 s（9.9 fps） | 49.4 s（76.7 fps） | 7.8× |
| tadpole 总耗时（含音频、mux、blackdetect） | 6 min 31 s | 56 s | 7.0× |
| 其它示例 6 s 片段（180 帧，帧阶段 fps，旧路径 4 worker） | promo 30.8 · explainer 30.2 · vertical(1080×1920) 12.9 · gallery 47.0 · mv 19.8 · explainer-vo 28.0 | 74.3 · 78.7 · 34.6 · 127.4 · 59.1 · 73.4 | 2.4–3.0× （短片段以浏览器启动/烘焙为主） |

tadpole 每帧耗时构成（旧路径单 worker）：render(t) JS + IPC ≈ 3–10 ms；截图 141–218 ms，其中约 29 ms 是等下一个 vsync/帧、其余是 SwiftShader GL 合成 + SVG 滤镜 + PNG/JPEG 编码。新路径（CPU 时间/帧，约 40–46 ms，之前 ≈ 59 ms）：Viz 软件合成 ≈ 18–21 ms、浏览器主线程 JPEG 编码/base64 ≈ 10 ms、光栅 ≈ 6 ms、渲染进程主线程（render(t)、样式、布局）≈ 2–3 ms；x264（preset medium、CRF 18，宣纸颗粒很费码）≈ 34 ms/帧 CPU，约占总 CPU 的 40%。烘焙前 SVG 滤镜 ≈ 20 ms、远/中景重光栅 ≈ 17 ms、宣纸纹理 ≈ 8–13 ms。若可接受略低的编码质量，`--preset fast` 可再省约 30% 编码 CPU（SSIM 0.9899 → 0.9894）。

画质（`scripts/compare-capture.mjs`：同一时刻无损 PNG，旧路径无缓存 vs 新默认）：tadpole 22 帧 SSIM 0.9942（最低 0.9939）、PSNR 47.7 dB（最低 46.3 dB），差异是抗锯齿与烘焙位图重采样，肉眼不可见。编码后每帧与各自无损源的 SSIM：新 0.9825、旧 0.9819（新分段编码不比旧差）。其它示例（每个 8 帧无损对比）SSIM：promo 0.9969、explainer 0.9957、vertical 0.9977、gallery 0.9996（WebGL 正常）、mv 0.9980、explainer-vo 0.9957，最低均 ≥ 0.995。`vk sync`（tadpole 字幕词时间 vs 成片重对齐）：新 中位 −14.5 ms / 1 帧内 51.3%，旧 −15.0 ms / 51.3%，无变化。

工具：`scripts/profile-render.mjs`（截图路径分解）、`scripts/profile-cpu.mjs`（beginframe 每帧 CPU、`--trace` 输出 Chrome trace）、`scripts/compare-capture.mjs`（两种捕获设置的无损逐帧对比）、`scripts/compare-video.mjs`（两个 MP4 逐帧 SSIM/PSNR）。

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
  motionBlur: { shutter: '1/40', samples: 4 },   // 子帧运动模糊（默认关；vk render 时生效，见 vk.mg 一节）
  cover: { colors: [...], n: 6, axis: 'alt' },     // 覆盖类转场 stripes / bars 的全片默认
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
| `slam` `echo` `drop` `letters-pop` `mask-rise` `hard-shadow` | **动态海报字（`vk.mg`，首次使用时注册）**：大比例+旋转+偏移砸入（`echo:3` 残影、`shadow:[dx,dy,色]` 硬投影、`wobble` 落定后摇摆）/ 回声残影放大入场 / 逐字砸落 + 挤压拉伸 / 逐字弹出 + `bob` / 逐字从遮罩线下升起 / 硬投影长出（可组合 `'pop hard-shadow'`） | `vk.title('MOTION', {fx:'drop', shadow:[10,10,'#0008']})` |
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
| 覆盖（`vk.mg`，画在两个场景之上，首次使用时注册） | `stripes`（n 条彩条错峰滑入 outExpo / 滑出 inExpo，横竖交替，切点在转场正中）`bars`（彩条从一侧长满再向另一侧收走）；选项 `{n, colors, axis:'x'|'y'|'alt', stagger, at, travel, reverse}`，全片默认 `vk.video({cover})` |

焦点可指定：`transition: { type: 'iris', d: .7, focal: { x: 320, y: 360 } }`。

### SVG

```js
vk.svg('<path d="M40 220 C 120 40, 220 40, 260 150"/>', { fx: 'draw', d: 1.6, viewBox: '0 0 500 300', w: 620 })
vk.svg('<rect …/><circle …/>', { fx: 'draw-fill', each: .25 })
vk.svg(`<path d="${vk.shapePath('circle', 150, 150, 120)}"/>`, {
  fx: 'morph', paths: ['circle', 'star', 'heart', 'square'].map(k => vk.shapePath(k, 150, 150, 120)), each: .8 })
```

逐拍形变：`{fx:'morph', shapes:['circle','square','triangle','star'], beats:1, r:120, cx:150, cy:150}`——每 `beats` 拍一步（outBack，提前一帧落拍；需 `bpm`），形状来自 `vk.mg.shapeOutline`（等弧长采样，可直接插值）。画布版（描边回声、内部镂空、每拍换底色、白闪）见 `vk.mg.morphSeq`。

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

`gradient`（`spin`）· `mesh`（流动渐变网格）· `grid`（`drift`）· `dots`（`drift`）· `noise`（动态噪声，`speed`）· `dotwave`（`vk.mg`：径向正弦点阵 + 每拍一圈脉冲环 + HSL 色相循环 + 文字留空 `hole:{w,h,soft}`，canvas）。可数组叠加。

### 镜头

`camera: [{t, x, y, s, r, ease}]` 关键帧（平移/缩放/旋转；省略的 x/y 默认回到画面中心、s 为 1（与旧版一致）；加 `cameraHold: true` / `sc.camera(keys, {hold:true})` 则省略的 x/y/s/r **沿用上一帧**）、`shots: [...]` 景别镜头表（见[镜头与动作](#镜头与动作phase-3)）、`push: .08` 缓推、`shake: [{t, amp, d}]` 抖动（24fps 量化，更像手持）、`scene.beatZoom(.03)` 随节拍脉冲缩放。

### 音效（`sfx`，离线合成）

`kick` `bass` `tick` `hat` `pop` `chime` `whoosh` `riser` `snap`（`reel` 风格包另装 `reel-kick` `reel-hat` `reel-clap` `reel-whoosh` `reel-riser` `reel-blip` `reel-ping` `reel-click` `reel-pop` `reel-chord`）—— `vk.title('…', {sfx:'kick'})` 或 `scene.sfx(1.2, 'pop', .6)`。

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
- `beat.brightness` / `energy.brightness` 使用 CSS filter；软件合成下全画幅约 1–2 ms/帧，代价不大，但 `blur()` 类滤镜昂贵（≈10 ms/帧）。
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
                                [--capture beginframe|screenshot] [--gpu soft|swiftshader|off] [--no-cache]
                                [--timing] [--chunk 帧数] [--x264-threads n]      （--workers 默认 = CPU 核数）
                                [--shutter 1/40 --samples 4 | --no-motion-blur]   子帧运动模糊（覆盖页面 vk.video({motionBlur})）
                                [--strict | --no-strict] [--draft]               未知名称报错（CLI 默认开）· 草稿画质（低分辨率、3D res .35/aa 1/无景深泛光）
vk lint    page.html [more.html …] [--json] [--quiet]          确定性静态检查 + 未知名称（文件:行:列 + 修复提示；有 error 时退出码 1）
vk peek    page.html [--at 0,2.5,5 | --every 1] [--draft] [--json] [-o dir] [--scale .5] [--no-determinism] [--no-flicker]
                                一次浏览器启动：静帧 + 带标注的联系表 + peek.json（有 error 时退出码 1）
vk list    [kind] [name] [--json]                              注册表：种类 → 名称 → 单个条目的参数 schema / 示例
vk stills  page.html [--at 1.5,4,9.2] [-o dir] [--scale 2] [--capture …] [--no-cache]   静帧 PNG（默认每个场景动画落定后的一帧）
vk contact page.html [-o sheet.png] [--times a,b | --settle] [--cols 4]   联系表（每场景 2 帧，或 --settle 1 帧）
vk qa      page.html [--sample 0.5] [--order-step 1] [--json=report.json] [--no-strict]   版面 QA + 渲染顺序确定性 + 可见文字快照（--json 同时写出每场落定帧 JPEG + summary）
vk preview page.html [--port 5173] [--host 0.0.0.0] [--dev]   开发服务器：热更新 + 进度条（--dev 同时监听 src/ 重建）
vk new     video.html [--format 9:16] [--theme bold]          生成模板（带 --story 时等同 vk make）
vk make    --style ink[,papercut.chars] --story story.md -o examples/<slug>/ [--tts] [--render]   故事 → 风格化配音短片页
vk style   list | sample [id,…] | gallery [-o out/styles/index.html] | extract ref.png [--id x] [--k 6]
                                [--lufs -14|off] [--duck -10] [--no-voice]   ← render 的混音参数

# 音频（Phase 2，需 tools/setup-audio.sh）
vk analyze music.mp3 [-o music.beats.json] [--backend auto|beat_this|librosa] [--rate 50] [--bands 8]
vk align   audio.wav [--text script.txt | --lyrics lyrics.txt] [--lang zh|en] [--model small] [--separate] [-o x.align.json]
vk tts     page.html [--voice zh-CN-YunxiNeural] [--backend edge|piper] [--rate +0%] [--force]   (--voices zh · --text "…" -o a.mp3)
vk sync    out.mp4 [--beats song.beats.json --music-start s] [--words out.words.json]
vk doctor
```

`vk qa` 检查项：文字重叠、文字溢出容器、出画、标题安全区、平台 UI 区（竖屏）、字幕宽度/换行/阅读速度（中文按 ≤9 字/秒）、字体是否加载、空白帧（含转场中点）、配音缺失 / 配音超出场景、音乐文件缺失、词时间非单调，并打印每个场景的可见文字快照，方便核对文案。以及 `render(t)` 是否依赖渲染顺序（seek-order）。ISSUE 为必须修，WARN 为建议检查（转场中点的 dip/flash 预期会报空白帧）。

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

元数据（`vk list` / 文档 / 严格模式的名称表都会用到）：`vk.register('fx', 'tilt', impl, { description, params: { amount: 'number|1|0..3|强度' }, example })`，或 `impl.meta = {…}`，或 `vk.use({ …, meta: { fx: { tilt: {…} } } })`；不写时从函数源码里推断 `o.x || 默认值` 形式的参数。`vk lint` 会读页面里的 `vk.use` / `vk.register`，插件注册的名字不会被当成未知名称。

完整可运行示例：`examples/plugins/hello-plugin.js` + `examples/plugin-demo.html`。

---

## 开发与测试

```bash
npm run build        # esbuild → dist/vidkit.js（IIFE, window.vk）+ dist/vidkit.esm.js
npm test             # node --test：缓动端点/单调性、cubic-bezier 解析、stagger、BeatGrid（小节/提前一帧/网格切点）、种子随机、插值、代码高亮、词映射/字幕切分、混音表达式、分块调度（每帧恰好一次/工作窃取）、捕获参数、滤镜区域/引用收集，以及一个真实浏览器往返（beginframe vs screenshot、烘焙 vs 不烘焙 SSIM ≥ 0.99、同一 t 帧字节一致）；有 .venv 时额外跑 click-track 分析测试
npm run examples     # 渲染全部示例到 out/
npm run docs         # 由注册表生成 llms.txt · docs/api.json · docs/vk.d.ts（改了预设/schema 后先 npm run build 再跑；测试会检查它们是否最新）
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
- **`vk.gl` 水墨 WebGL 层** ✅：多 pass 着色器（墨晕、水墨化后期、宣纸、雾带）、确定性粒子、线条 boil、剪纸滤镜（见[WebGL 特效](#webgl-特效vkglsrcfxgl)）。后续：把 DOM 场景整体作为纹理的着色器转场。剪纸角色 rig（上美厂风格）见 `examples/wusong/`。

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

### 骨骼角色（`vk.rig`，`src/fx/rig.js`）

数据定义的骨骼层级 + 纯函数姿态（任意 t 可直接 seek，`vk qa` 顺序检查通过）：

```js
const rig = vk.rig({ root: g, bones: [{ id: 'torso' }, { id: 'upperArmR', parent: 'shoulderR' }, { id: 'lowerArmR', parent: 'upperArmR', x: 74, y: 4 }, …],
  clips: { idle: t => ({ upperArmL: 145 + 5 * Math.sin(t), 'root.y': 4 * Math.sin(2 * t), 'armR.tx': 205, 'armR.ty': -145 }) },
  ik: { armR: { chain: ['upperArmR', 'lowerArmR', 'handR'], bend: 1 } } });          // 元素：[data-bone="id"]
const act = rig.play([{ at: 0, clip: 'idle' }, { at: 3.8, clip: 'attack', blend: .4 }],
  { ik: { armR: t => [x, y] /* 世界坐标，或关键帧 [[t,[x,y]],…] */ }, ikMix: { armR: [[3.8, 0], [4.4, 1]] } });
sc.on(l => act.render(l, { x: 640, y: 380, scale: .55, flip: -1 }));
```

- 姿态 = 普通对象：`骨骼id` 角度（叠加在静止旋转上）、`id.x / id.y / id.s`、`root.x / root.y / root.rot`（根内运动：起伏、倾身）、`<ik>.tx / .ty / .w`（片段自带的 IK 目标与权重，根局部坐标），其余为自由通道（如 `energy`）。
- IK 在链根的父坐标系里用矩阵求解（不用 getCTM，考虑根的旋转/缩放/镜像与骨骼偏移）；`rig.point(bone, x, y, pose, root)` 求任意骨骼点的世界坐标（例如乾坤圈出手位置）。
- `rig.sample(track, t)` 片段交叉淡化（可链式），`vk.rig.blink(t, {period, dur})`、`vk.rig.solve2BoneIK`、`vk.rig.blend`、`vk.rig.mat`；`rig.debug(true)` 显示骨骼调试层（默认关）。
- 示例：`examples/nezha/`（`lib/nezha-rig.js` 用作者手绘的哪吒 SVG：idle / float / attack 片段 + brace / bow / dive / throw，程序化混天绫随 energy 与方向摆动）。

### WebGL 特效（`vk.gl`，`src/fx/gl/`）

一个按时间纯函数渲染的 WebGL 层：水墨晕染、SVG 水墨化后期、着色器宣纸、确定性粒子、线条 boil、剪纸滤镜。**没有 requestAnimationFrame / performance.now / Math.random**，噪声全部带种子；每个层在 `render(t)` 里同步重绘（或在缓存键不变时保留像素），所以任意 seek 顺序得到同一帧（`vk qa` 会对每个 `canvas.vk-gl` 做像素哈希比对）。

```js
sc.gl([                                                              // 场景层（v.gl([...]) = 全片层）
  vk.gl.paper(),                                                     // 着色器宣纸（云絮 + 纤维 + 杂点 + 暗角）
  vk.gl.inkBleed({ src: vk.gl.text('水墨丹青', { x: 1010, y: 104, size: 118, vertical: true }),
                   at: 1.5, draw: .9, dur: 3, spread: 8, wipe: { dir: 'down', dur: 1.7 } }),   // 写字 + 洇开
  vk.gl.particles({ preset: 'splatter', burst: [{ t: 2, n: 70 }], x: 460, y: 380 }),          // 墨点飞溅
], { rect: [0, 0, 1280, 720], scale: 1, z: 'front' | 'back', blend: 'multiply', opacity });
```

**层选项**：`rect`（只渲染这块区域，性能关键）、`scale`（内部分辨率倍数，如 `.75`）、`z: 'back'`（插到背景之后、内容之下）、`blend`（CSS mix-blend-mode）、`opacity`、`class`。返回的层有 `.el`（2D canvas，可移动到任意 DOM 位置，例如放进池塘根节点里某个 SVG 之上）。

**遮罩/颜色来源**（场景像素坐标）：`vk.gl.text(str, {x, y, size, font, vertical, lead, tracking})`、`vk.gl.path(d | [d…], {fill, gradient, stroke, transform})`、`vk.gl.image(img, rect)`、`vk.gl.draw((g, local) => …, {static, key})`、`vk.gl.svg(el, {offset, exclude, static})`（把活的 SVG 子树画到 canvas：path/rect/circle/ellipse/line/poly/image/text/use、描边虚线、线性/径向渐变、透明度；**忽略 SVG filter**——由 GL 效果代替）。`static` 来源只在字体加载后画一次并保留 GPU 金字塔。

**效果**：

| 效果 | 作用 | 主要选项 |
|---|---|---|
| `paper(o)` | 宣纸（`mode:'overlay'` 输出 multiply 图，配合层 `blend:'multiply'` 叠在任意场景上） | `color amount fibres vignette specks seed` |
| `inkBleed(o)` | 墨晕：遮罩先"落笔"（`draw` 秒内墨心凝聚），再沿纸纤维向外洇开（湿边 √t 扩散、水痕 tide line、纤维毛细、积墨、斑驳、颗粒）；`soft:1` 保留遮罩灰度（远山淡墨） | `src at draw dur spread haloEnd color density halo rim fibre mottle grain pool warp wipe:{dir,dur} fade:[t0,t1] seed` |
| `inkWash(o)` | 水墨化后期：把彩色 SVG 变成湿墨（边缘积墨加深、柔和晕边、水痕、纸纹颗粒、12fps 抖动）；源元素在 DOM 中被隐藏 | `src hide boil wobble dark edge bleed grain mottle tide alpha ink` |
| `particles(o)` | GL 点精灵粒子：`drop / splat / mist / petal / spark / dot`；落地的墨滴变成晕开的墨点并在"定型"后缓存 | 同 `vk.particles` + `shape color color2 colors blend soak` |
| `mist(o)` | 飘动的雾带（山间留白） | `y height speed density scale color seed` |
| `shader(o)` | 自定义片元着色器（有 `uTime uStep uProgress uRes`、`scenePx() paperN() fbm()`） | `frag uniforms step key blend` |

**粒子（纯数学，`vk.particles`）**：每个粒子的状态是 `(seed, i, t)` 的闭式解（线性阻力 + 重力的解析弹道、值噪声摆动、`floor` 侧视落地 / `landAt` 俯视落地），发射在固定槽位（`burst:[{t, n, x, y}]` 或 `rate` + `from/to`），发射器 `point / line / box / radius`。`P.at(t)` 返回 `[{id, x, y, size, alpha, rot, landed, settled…}]`，与求值顺序无关。预设：`inkDrops splatter spray petals sparks mist`。

**线条 boil / 手绘抖动**（确定性、按 12fps "一拍二" 步进）：
- `vk.gl.boil(sc, targets, {fps: 12, amp, freq, octaves, frames})`：SVG 湍流位移滤镜，种子由场景时间步进计算。
- `vk.gl.jitter(d, t, {fps, amp, seed, frames, smooth})`：路径点扰动（同一"张"内不变，下一张重画；A/H/V 命令保持不变），`vk.gl.jitterPoints`。

**剪纸（上美厂风格预备）**：`vk.gl.paperCut(v, {prefix: 'pc', rough, grain, shadow: [dx, dy, blur, opacity]})` 注入 `#pc-cut`（剪刀毛边）、`#pc-grain`（纸纤维明暗）、`#pc-shadow`（纸片投影）与 `#pc`（三者合一），用于 `<g filter="url(#pc)">` 的平涂形状（配合 `fill-rule="evenodd"` 做窗花镂空）。

**捕获与性能**：
- 所有 GL 效果共用每个视频一个离屏 WebGL1 上下文（`preserveDrawingBuffer`，预乘 alpha），每层把结果同步 `drawImage` 到自己的 2D canvas（`willReadFrequently`，CPU 后备），因此截图不会空白，也不依赖合成器时序。
- 默认捕获（beginframe，chrome-headless-shell，`--gpu soft` = SwiftShader）与 `vk qa / stills / contact`（Playwright Chromium + SwiftShader）都有 WebGL，**无需额外 Chrome 参数**；`--gpu off` 会关闭 WebGL（层会打印一次警告并保持透明）。
- 缓存：每个效果给出缓存键（`paper` 恒定、`inkBleed` 完成后恒定、粒子全部定型后恒定），键不变就跳过 GL。尽量用 `rect` 缩小区域、`scale:.75` 降低内部分辨率、遮罩用 `static`。`vk.gl.stats()` 查看 pass 数与耗时。
- 示例：`examples/gl-ink-demo.html`（20 s：墨滴溅落 + 竖排题字洇开、远山分层晕染 + 雾带 + 渔舟 jitter + 水纹 boil、荷塘 SVG 水墨化 + 水花 + 落花、剪纸窗花），`examples/tadpole/tadpole-gl.html`（《小蝌蚪找妈妈》片头的 GL 版：片名湿笔书写、池塘活动层水墨化、落水滴与水花、宣纸纤维叠加；原文件未改动）。

---

## 风格库（`vk.style`，`styles/<id>/`）

一个**风格包**＝一个目录，全部离线可用（字体随包，纹理/材质为程序生成的 SVG 滤镜或 `vk.gl` 着色器，音乐为代码合成）：

```text
styles/<id>/style.json    数据：调色板 palette（天空/远山/中景/地面/树…）与色相 hues（角色用色名 red/gold/blue…）、
                          材质 material（cut 剪纸 / ink 墨线 / flat 扁平 / leather 皮影 / decor 重彩描金 / neon 霓虹 /
                          pixel 像素 / crayon 蜡笔）、主题 theme（字体/字幕条）、video{texture, fadeOut}、转场
                          transitions{default, soft, strong}、排版 typography、声音 sound{voice, sfx 映射, music}、
                          节奏 pacing、镜头 camera{establish, dialog, action, push, punch}、角色约定 characters、
                          特效预设 effects、样片 demo、QA 清单 qa[]
styles/<id>/style.js      运行时钩子（vk => ({ decorate, post, title, label, effect, music, charAfter, … })）
styles/<id>/preview.html  ~5 s 样片（styles/demo.js：同一脚本 = 片名 + 走路入画的角色 + 招牌特效 + 转场）
```

| id | 名称 | 一句话 |
|---|---|---|
| `ink` | 水墨 | 宣纸、淡墨远山 + 浓墨勾线、雾带留白，竖排书法片名 + 朱印，`vk.gl.inkBleed` 题字洇开，古琴竹笛 |
| `papercut` | 剪纸（上美厂） | 彩纸层叠、剪刀毛边与镂空、纸片投影，红色题匾，纸屑花瓣迸散，锣鼓点 |
| `shadow` | 皮影 | 油灯幕布（微颤）、半透明染色驴皮人物 + 镂刻花纹 + 操纵签子，雕花牌匾，梆子 |
| `opera` | 重彩装饰（大闹天宫） | 石青石绿朱红金黄平涂、粗墨线、层叠祥云与天宫殿宇，金光放射，急急风锣鼓 |
| `tech` | 科技宣传 | 深蓝底、发光透视网格、电光蓝强调色、Archivo 粗体大标题，脉冲环，鼓点 + 合成器 |
| `neon` | 赛博霓虹 | 雨夜都市、霓虹线描人物、霓虹招牌点亮 + `vk.gl.bloom` 辉光、CRT 扫描线，琶音 |
| `pixel` | 像素 | 16 色（Sweetie-16）、整帧 4 px 像素化（确定性 SVG 滤镜）、打字机标题，金币迸出，芯片音乐 |
| `crayon` | 蜡笔绘本 | 画纸纹理、蜡质颗粒、线条每秒 8 次“沸腾”、站酷快乐体彩色标题，涂鸦星星，卡林巴 |
| `reel` | 动态海报 | 纸白 / 墨黑 + 粉黄青紫平涂、Archivo Black 超粗字 slam + 残影 + 硬投影、默认 `stripes` 彩条转场、冲击波环 + 放射线 + 白闪、128 BPM 合成鼓组（kick / hat / clap / whoosh / riser / 结尾和弦） |

```js
const v = vk.video({ style: 'papercut' });                    // 主题、质感、默认转场、缓推、混音参数、字幕风格
const v = vk.video({ style: ['ink', 'papercut.chars'] });     // 组合：水墨世界 + 剪纸角色（也可 'ink-bg' / 'papercut-chars'）
const v = vk.video({ style: { base: 'neon', chars: 'pixel', sound: 'opera' } });   // 按角色拆分：world/chars/type/motion/sound/fx
const S = v.style;                                             // 或 vk.style('ink')
vk.scene('开场', 5, { transition: S.transition('default') }, sc => {
  const W = S.world(sc, 'mountain dusk pine moon');           // 场景词：地点/时间/道具（中英均可：山 黄昏 松 月亮）
  const hero = S.character(W.actors, { look: { hairStyle: 'bun', cloth: 'red' }, scale: .7 });   // 通用侧面角色，按风格材质绘制
  S.title(sc, '片名', { sub: 'subtitle' });  S.effect(sc, 'signature', { at: 1, x: 600, y: 300 });
  sc.on(l => hero.render(l, { x: 300, ground: W.ground, d: walked(l), clip: 'walk' }));   // d = 走过的距离 → 脚步锁定
  S.sfx(sc, 'step', .4);
});
S.music(v);                                                    // 风格配乐（确定性合成 bed）
```

- `vk.style.list()` / `.get(id)` / `.register(json, vk => runtime)`（注册自己的风格包）；现有 `theme:` 用法完全不变（风格包的主题注册为 `style:<id>`）。
- `vk.style.kit`（svgLayer / overlay / burst / ease…）、`vk.style.material(id)`、`vk.style.bed(v, {bpm, tracks})` 步进音序器、`vk.style.transitions`（tear 撕纸 / pixel 像素擦除 / cloud 祥云 / scribble 涂鸦 / lamp 灯灭 / scan 扫描；首次使用风格包时才注册进 `vk.transitions`，不用风格的页面转场表不变；单独使用可先调 `vk.style.installTransitions()`）。
- 画廊：`vk style sample` 渲染全部样片（MP4 + 海报 PNG），`vk style gallery` 生成 `out/styles/index.html`（卡片：海报、循环样片、简介、色板、用法片段）并截图 `gallery.png`。

### 故事 → 短片：`vk make`

```bash
vk make --style papercut --story examples/stories/kite.md -o examples/kite-papercut/   # 生成页面（故事内联为可编辑数据）
vk tts examples/kite-papercut/kite-papercut.html                                       # edge-tts 旁白/对白 + 词时间 + 口型包络
vk render examples/kite-papercut/kite-papercut.html -o out/kite-papercut.mp4           # 或 vk make … --tts --render
```

故事格式（markdown；也接受同结构的 JSON）：

```markdown
# 小芽的风筝
sub: 一个很短的故事
cast 小芽: girl                         ← 发型(bun/twinbuns/pony/long/short/cap/bald)、颜色名、girl/boy/elder…、音色 id
cast 阿公: elder cap blue gold grey

## 山顶 @ mountain day pine             ← 场景名 @ 场景词
- 阿公 enter right                      ← 动作：enter/exit/walk/run/wave/cheer/point/talk/bow/surprise/think/look/sad/jump/face
> 阿公和小芽，爬上了山顶。               ← 旁白
阿公: 风来了，松手吧！                   ← 对白（按角色分配音色，说话时口型同步）
- 小芽 cheer                            ← 动作挂在上一行台词开始时
- effect                                ← 风格招牌特效（+ 打击推近）；也可 - shot close 小芽 · - sfx big · - hold 1.5
```

`vk.film(story, {style})` 把它变成：每个故事场景一个 `dur:'auto'` 场景（时长由配音决定）、风格世界、角色站位（从左入场的占左侧位，不交叉）、脚步锁定的走路（停在双脚着地的位置）、手势淡入淡出、对白口型（`vk.motion.mouth`：有 TTS 包络时按响度/频谱质心选口型，否则按词时间）、镜头表（风格的 establish/dialog/action 景别；有人在别人台词时动作就用双人镜头）、片名、特效、脚步声与配乐。

`vk style extract ref.png [--id x] [--k 6]`：参考图 → 风格包起步文件（`style.json` + 空 `style.js` + `palette.svg`）。做法很简单：96 px 缩略图上的确定性 k-means 取 k 色（按占比排序，最亮→天空/纸，最暗→墨线，最饱和→强调色），384 px 图上的高通亮度均值估计颗粒（→ texture grain/rice 强度），边缘密度粗判材质。它只是起点，世界/标题/特效钩子仍需手写。

## 镜头与动作（Phase 3）

**镜头**（`src/core/camera.js`，纯函数）：

```js
sc.shots([
  { t: 0, shot: 'full', on: sub, follow: .35 },               // 景别 + 跟拍（平滑滞后 .35 s）
  { t: 2.1, shot: 'medium-close', on: sub, lookroom: .1 },     // 切近景（视线方向留白）
  { t: 2.8, shot: 'full', s: 1.45, on: sub, d: .3 },           // d：混合时长（视窗矩形插值，不漂移）
  { t: 3.7, punch: .16, at: [x, y], d: .55 },                  // 打击推近（快起慢回）
  { t: 5, pan: [x, y], d: 1.2 }, { t: 7, dolly: 1.3, at: [x, y] },
], { keep: [sub, sub2], margin: .05 });                        // 每帧把这些头部框保持在画内（必要时拉远）
// sub(t) → { head: [x, y], headR, feet: [x, y], facing }：通常由 rig.point 求出（puppet.subject(t, state) 现成）
```

景别：`extreme-wide / wide / full / medium-wide / medium / medium-close / close / extreme-close`（别名 ws/ms/mcu/cu/ecu）。`vk.cam.frameShot / keepInFrame / clampView / punchEnv / smoothFollow / shotCamera` 可单独使用；`sc.toScreen([x, y], t)` 把世界坐标换成屏幕坐标。相机关键帧默认行为不变（省略 x/y 回到 640/360）；`vk.video({cameraHold: true})` 或 `sc.camera(keys, {hold: true})` 让省略的 x/y/s/r 沿用上一帧，避免“只写 s 就跳回中心”。镜头表 `shots` 不受此开关影响。

**动作**（`vk.motion`，`src/fx/motion.js`，纯函数）：

- `gait({stride, duty, hip, leg, lift})` → `.at(d)`：给定走过的距离 d，返回两只脚（着地时世界 x 恒定 = 不滑步）与髋高；根的速度由步幅推出；`.rest(d)` 给出双脚着地的停步距离。配合 IK 腿：`rig.solveIK('legN', ankle, pose, root)`。
- `mouth(seg, t)` 口型（M/A/E/O 四个 viseme，12 fps 步进）：优先用 `vk tts` 写入的响度/质心包络（`env`），否则用词时间。
- `boilPoints(points, t, {fps, amp})` 线条沸腾；`follow / spring / drag` 跟随与弹簧（确定性固定步长积分）；`ribbon(anchor, t, {n, len, lag})` 不可伸长的飘带（每段等长，滞后于锚点的历史位置）+ `ribbonPath` 描边。

示例：`examples/wusong/wusong-v2-scene.html`（与原片同一套 rig 与配音）。

## 动态图形套件（`vk.mg`）与运动模糊

从一支 15 s / 128 BPM / 8 个一小节场景的 Canvas 动态海报 reel 中提炼出的可复用能力（`src/fx/mg/`）。全部**按需启用**：
`stripes` / `bars` 转场、`slam` 等文字特效与 `dotwave` 背景在页面第一次用到名字时才注册，不用它们的页面注册表（及 FX Gallery 的计数）与原来完全一致。
完整示例：`examples/reel/reel.html` → `out/reel.mp4`（与参考原片的对照：`out/reel-original.mp4`、`out/reel-compare.png`）。

**子帧运动模糊**（默认关）：每个输出帧 = 快门窗口内 N 个子时刻的平均（窗口结束于帧时刻，`t` 在 0 处截断）。

```js
vk.video({ motionBlur: { shutter: '1/40', samples: 4 } })   // shutter: '1/40' | '180deg' | '25ms' | 0.025 秒
```
```bash
vk render page.html                          # 页面开了 motionBlur 就用；
vk render page.html --shutter 1/60 --samples 6   # 命令行覆盖；--no-motion-blur / --shutter 0 关闭
```
`vk render` 在捕获管线里做：每帧按子时刻 seek N 次，ffmpeg `tmix` 等权平均后再编码（`info.frameT` 保持名义帧时刻，HUD 等不糊）。
canvas 图层也可单独在页内模糊：`sc.canvas(draw, { motionBlur: true | 'video' | {shutter, samples} })`（预览即可见；`vk render` 管线模糊时自动跳过，不会糊两次）。
`vk stills` / `vk contact` / `vk qa` 不做运动模糊。reel 示例 1080p 450 帧 8 核：无模糊 13.6 s，4 子帧 32.9 s。

**画布绘制器**（`(g, local, info) => …`，用 `sc.paint([p1, p2], {z, blend, motionBlur})` 叠在一个 canvas 层上，坐标为舞台像素）：

| 名称 | 作用 |
|---|---|
| `vk.accents.rings({every:1, delay, speed, max, colors})` | 每拍一圈扩散冲击波环（颜色轮换、随半径淡出）；`at`/`times` 改为场景内指定时刻 |
| `vk.accents.streaks({at, n, dir:'x'|'y', reverse})` | 速度线：头 outCubic、尾 inOutCubic 追赶 |
| `vk.accents.burst({every:.5, n, r0, spread, len})` | 放射线，每拍 / 半拍重新触发 |
| `vk.accents.flash({every:1, amount, k})` | 每拍白闪（指数衰减） |
| `vk.accents.orbit({n, r, ry, speed, kick})` · `plus({points, kick})` · `disc({r, at, pulse, dx, dy})` | 环绕圆点 · 旋转十字 · 弹出圆盘 |
| `vk.mg.morphSeq({at, shapes, palettes, echoes, cut, counter, flash})` | 圆→方→三角→星，每拍一形（outBack）、描边回声、反向旋转内镂空、每拍换底色、轮廓数字、白闪 |
| `vk.mg.dotwave(o)` / `bg:{type:'dotwave', hole:{w,h}}` | 点阵波浪背景 |
| `vk.mg.converge({at, iris, star})` | 形状螺旋汇聚（inExpo）→ 纸色圆形展开 → 旋转星标 |
| `vk.mg.hud(o)` / `vk.hud({title, meta, bars, duration})` | 裁切角标、REC 闪点、时间码 MM:SS:FF、BAR n/8、进度条；全片 canvas，`difference` 混合 |

节拍类绘制器读取视频的 `BeatGrid`（`bpm`），与其它节拍工具一样提前一帧落拍；只取场景开始之后的拍。

**节点**（像其它元素一样 `sc.add()`；尺寸为 720p 像素自动缩放，时间为场景内秒或 `'b:N'`）：

| 名称 | 作用 |
|---|---|
| `vk.ui.ringCard({label, value, fillAt})` | 进度环卡片 + 数字滚动 |
| `vk.ui.toggle({label, sub, click})` | 开关，滑块移动时挤压变形、颜色过渡 |
| `vk.ui.equalizer({bars})` · `vk.ui.like({click})` | 均衡器 · 点赞（回弹 + 放射线） |
| `vk.ui.chips([...], {colors})` | 胶囊标签错峰滑入 + 轻微浮动 |
| `vk.ui.cursor({keys:[[t, x, y]…], clicks:[t…]})` | 光标路径（inOutCubic），点击缩小 + 涟漪；x/y ≤ 1 为画面比例 |
| `vk.montage(words, {every:'b:0.5', palettes, counter, dots, flash})` | 半拍一词的关键词快切：每词一套配色、砸入（交替方向）、奇数描边 / 偶数硬投影、放射线、`0n / 08` 计数、进度点、白闪 |
| `vk.lockup({title, sub, tagline, at, fadeOut})` | 汇聚收束 logo：形状汇聚 + 纸色圆展开 + 星标 + `mask-rise` 标题 + 高亮条 + 色点 + 淡出到墨色 |

UI 组件可以直接放进 `vk.device(vk.col([...]), {type:'phone'})`。纯数学（`vk.mg.subTimes` / `coverBars` / `shapeOutline` / `morphState` / `dotwaveAt` / `letterDrop` / `slam` / `echoGhosts` / `cursorAt` / `toggleKnob` / `likePop` / `montageSlot` / `timecode` / `convergeAt` / `recentBeats` …）见 `src/fx/mg/math.js`，测试在 `test/mg.test.mjs`。

## 3D：`vk.three`（three.js r186，可选）

`dist/vidkit-three.js`（约 860 KB，可离线使用）是**独立的可选包**，里面打包了 three r186（`vendor/three/`，MIT）、所需 addons（GLTF/Draco/HDR/Font loaders、RoomEnvironment、RoundedBox/TextGeometry、BufferGeometryUtils/SkeletonUtils），以及 vidkit 的 3D 层和各模块。不加载这个文件的页面完全不受影响，核心 `dist/vidkit.js` 只多了一个 `video.waitFor()` 钩子。

```html
<script src="../dist/vidkit.js"></script>
<script src="../dist/vidkit-three.js"></script>   <!-- 加载后才有 vk.three / sc.three / 风格包 three-tech -->
```

### 图层 API

```js
sc.three(setup, update, opts)        // setup({THREE, scene, camera, renderer, rand, load, assets, layer}) → 可返回 Promise / update / {update, camera}
                                     // update(localT, info)：必须是 t 的纯函数（每个子帧样本调用一次）
sc.three(module | [modules], opts)   // modules = vk.three.turntable(…) / vk.three.particles(…) / {setup, update}
v.three(...)                         // 全片层（默认 z:'front'）；场景层默认 z:'back'（在文字后面）
```

`opts` 包括：`res`（内部分辨率比例，默认 **0.75**，输出仍按 dpr 全分辨率）、`aa`（抖动子帧数，兼作抗锯齿）、`motionBlur`（`{shutter, samples}`，默认继承 `vk.video({motionBlur})`）、`camera`（rig 函数或 `{pos, target, fov, roll}`）、`fov`、`background`（不设则透明，按预乘 alpha 叠进图层栈，辉光也会透出）、`assets {name: url}`、`seed`、`z`/`zIndex`/`rect`，以及 `post`：

| post 键 | 默认 | 说明 |
|---|---|---|
| `exposure` · `tone` | 1 · `'aces'` | HDR 曝光 + ACES（three 的拟合版） |
| `bloom {strength, threshold, knee, radius, clamp}` | .55 · 1 · .6 · 1 · 40 | 便宜的下采样/上采样泛光（13-tap Karis 预滤 + tent 上采样）。所有子帧**先在 HDR 里累加，再做一次泛光** |
| `grade` | `'neutral'` | 预设 `teal-orange` `cool` `warm` `bleach` `mono` `cyber`，或 `{temperature, tint, lift, gamma, gain, contrast, saturation, shadows, highlights, split}` |
| `vignette` · `grain` · `ca` | .18 · .02 · 0 | 暗角、胶片颗粒（带 dither）、色差 |
| `dof {focus, aperture, maxBlur}` | 关 | 深度采样景深；turntable 会自动对焦到产品 |
| `fade` · `fadeColor` | 0 | 渐隐到某个颜色（1 = 全黑） |

所有 post 值都可以写成 `t => …`。

**预加载与确定性**：`load.gltf/hdr/env/texture/image/font/json` 都会进 `video.waitFor()`，所以 `window.__ready`（也就是开始捕获）会等它们全部完成，接着编译 shader 并预热一帧。整条路径不读真实时钟：`AnimationMixer` 用 `vk.three.mixer(root, clips).at(t)` 按时间设置，`vk.three.frameIdx(t, fps)` 给出帧号，随机数只用种子 `rand`。所有 3D 状态都是 t 的纯函数，所以多个 worker 并行渲染得到的帧逐像素相同。`vk qa` 现在会再开一个全新页面（模拟另一个 worker），在若干时间点比较 three 层的像素哈希，输出 `[three] … identical across 2 workers`；不一致就算 ISSUE。

**运动模糊**：three 层在层内做子帧累加，子帧时间来自 `motionBlurCfg`，再叠加 Halton 抖动作 AA，累加在泛光之前完成。`vk render --shutter … --samples …` 走管线模糊时，three 层按名义帧时间渲染一次，然后在 N 次管线子 seek 中保持像素不变，因此不会被模糊两次，3D 也只算一遍。`--shutter 0` 会同时关掉层内模糊。

### 模块

| 模块 | 说明 |
|---|---|
| `vk.three.turntable({product \| model, spin, angle, tilt, float, lid, sweeps, sweep:{every,…}, env, backdrop, floor, shadow, material, animate})` | 产品转台。环境有 `'studio'`（程序化影棚：顶灯箱 + 竖灯条 + 轮廓条 + 前灯箱 + 低位反光板，PMREM）、`'room'`（RoomEnvironment）、`'loft'`（随包的 Poly Haven CC0 HDRI，1k）或任意 `.hdr`。另有无缝弧形背景、带径向淡出的光面地板 + 镜像反射、模糊接触阴影、**灯条扫光**（有限距离的竖直灯条在材质 shader 里解析计算反射，带视差，平面上也会滑过）、DOF 自动对焦。`product` 可选 `'earbuds'` `'earbud'` `'phone'` `'bottle'`（程序化），也可以用 `model:'x.glb'`（自动缩放到 `height`，带动画就自动挂上 mixer） |
| `vk.three.particles({n, targets, morph, beat, intensity, size, drift, twinkle, flare, position, scale})` | 5–20 万粒子，变形全部在顶点 shader 里完成。target 可以是 `galaxy` `sphere` `torus` `cloud`、`{text, font}`、`{draw(g,w,h)}`（2D canvas 画的 logo）、`{asset \| image}`（图片）。`morph:[{t, to, d, style:'converge'\|'burst'\|'swirl'\|'direct'}]` 带逐粒子错峰；`beat:{amp,k,every}` 跟随 `vk.video({bpm})` 的节拍网格（也可以传函数）；采用加色混合，`intensity` 按密度调整 |
| `vk.three.materials.*` | `chrome` `metal` `gold` `titanium` `anodized` `glass`（transmission）`glassLite` `ceramic` `plastic` `matte` `rubber` `screen` |
| `vk.three.product(name, o)` · `vk.three.studioScene(o)` · `vk.three.sweep()` | 单独取用产品、影棚场景、扫光注入 |

### 镜头 rig（`vk.three.rig`，纯函数 `t → {pos, target, fov, roll}`）

`orbit` · `dolly` · `push` · `fly({points, look, bank})`（向心 CatmullRom，按弧长匀速）· `crane` · `zoomScale`（对数距离，"powers of ten"）· `keys([{t, pos, target, fov, ease}])` · `seq([{t, rig, blend}])` · `shake({at, amp, rot, freq})` · `punch`（与 `vk.cam` 用同一个 punch 包络）· `add(base, ...mods)`；另有 `vk.three.path(points)` / `kf` / `rig.lerp`。纯数学函数（rig、路径、采样计划、ACES/调色、粒子目标、mask 采样）的测试在 `test/three.test.mjs`。

### 风格包 `three-tech`（3D 科技）

`styles/three-tech/` 由 `dist/vidkit-three.js` 注册，核心包里没有它。它提供近黑影棚、电光青 + 紫两种强调色、`cyber` 调色、扫描线片名、粒子 + 光环特效、96 bpm 合成器脉冲铺底，以及 `v.style.base.stage3d.{layer, turntable, particles}` 预设。样片 `out/styles/three-tech.mp4`，已收进画廊。style.json 新增两个可选字段：`requires`（需要额外加载的脚本，画廊卡片会显示）和 `poster`（`vk style sample` 截取海报帧的时间）。

### 示例与性能

- `examples/three-basics.html`（11 s）：粒子星系变文字、耳机转台 + 扫光、手机 orbit + DOF。
- `examples/three-promo/three-promo.html`（24 s，1080p）：虚构耳机 "LUMEN Buds" 的宣传片。依次是粒子 logo 组装（zoomScale 推进 + 节拍脉冲 + burst + shake）、`bars` 覆盖转场、转台主镜头（开盖 + 两道扫光 + DOF）、CatmullRom 穿梭 + 浮尘、三色并排、crane 片尾。另有 three-tech 铺底 + edge-tts 中文旁白（`vk tts` 生成 `three-promo.vo.json`）+ 逐字字幕，运动模糊开启。
  ```
  vk render examples/three-promo/three-promo.html -o out/three-promo.mp4 --scale 1.5
  ```

**渲染耗时**（8 核，SwiftShader 无 GPU，beginframe，8 个 worker，层内运动模糊 4 个子帧，`res` .75）：

| 片子 | 帧数 · 分辨率 | 帧阶段 | 每个 worker 每帧 render(t) + 捕获 | 总耗时 |
|---|---|---|---|---|
| `three-promo`（`--scale 1.5`） | 723 · 1920×1080 | 497 s（1.5 fps，墙钟 ≈ 0.69 s/帧） | 3.6 s + 0.77 s | 8 分 30 秒（含音频混音） |
| `three-basics` | 330 · 1280×720 | 109 s（3.0 fps） | 1.66 s + 0.17 s | 1 分 56 秒 |
| `three-tech` 样片 | 165 · 1280×720 | — | — | 64 s |

**冷启动**：每个 worker 启动时要做 PMREM 预滤波、粒子目标采样和 shader 编译。现在 PMREM 环境与粒子目标按内容哈希（three 版本、GL 渲染器、参数、生成函数源码、栅格化像素）缓存到磁盘（`~/.cache/vidkit`，`VK_CACHE_DIR` 可改；`?cache3d=0` 关闭），同一次渲染的 8 个 worker 与之后的渲染共用；`__ready` 前只在 64 px 的内部尺寸上预热一帧（编译程序、上传缓冲），不再在 t=0 全尺寸画一遍。three-promo 实测（8 核，8 个 worker 同时打开到第一帧，平均每个 worker）：旧 57.5 s → 无缓存 16.3 s → 有缓存 9.3 s → `--draft` 8.0 s；单 worker 12.0 s → 3.0 s（+首帧 1.0 s）。缓存命中与未命中的帧与旧版逐像素相同。

**草稿**：`vk peek --draft` / `vk render --draft`（或 `vk.video({draft:true})`）让 3D 层用 `res` ≤ .35、`aa` 1、关闭层内运动模糊、景深与泛光（2D 页面 render 默认 `--scale .5`、CRF 26、preset veryfast）。想再加速可以调低 `res` 或 `motionBlur.samples`，或者用 `aa: 1`。

### 限制

- 只支持 WebGL2（SwiftShader 软渲染），不支持 WebGPU。
- DOF 是单遍深度采样的近似，前景边缘可能有轻微光晕；扫光是解析灯条，不是真实的环境贴图更新。
- 接触阴影每个输出帧渲染一次（取第一个子帧），不是每个子帧都渲染。
- 没有随包提供 TextGeometry 用的 typeface 字体，文字建议用粒子文字或 DOM 叠加。
- 地板反射是镜像克隆，不处理遮挡和粗糙度模糊。

## 面向 agent：严格模式、注册表、lint、peek、草稿

目标：让 agent（和人）写页面时**更快发现错误**，但不限制创作——预设、风格、模块只是起点，原生 DOM / CSS / SVG / Canvas / WebGL / three.js 代码始终是一等公民。agent 的入口文档：`llms.txt`（模型、黄金规则、最小示例、名称索引）与 [`AGENTS.md`](AGENTS.md)（工作流、手艺要点、坑）。

**严格模式**（`vk.video({ strict: true })`；`vk peek` / `vk qa` / `vk render` 默认开启，`--no-strict` 关闭；页面 API 默认仍只警告，旧页面行为不变）：
- 未知的 fx / 转场 / 缓动 / 质感 / 背景 / 主题 / 风格 / 音效 / 3D 材质 / 产品 / 环境 / 调色 / 粒子目标名直接抛错，信息里带 did-you-mean（注册表上的 Levenshtein）、可用名称列表，以及写下这个元素的页面 `文件:行号`；
- 渲染一帧期间调用 `Math.random()` 抛错（非严格模式只警告一次；setup 阶段的种子随机序列不变）。

**注册表元数据**：每个条目都有 `{description, params:{名: {type, default, range, description}}, example}`（`src/meta/schemas.js`；插件见[编写插件](#编写插件)）。
```js
vk.list()                              // 种类：elements fx transitions textures backgrounds blocks eases themes formats sounds materials styles three threeMaterials threeRigs
vk.list('fx')                          // 名称（与旧版相同）
vk.list('fx', { detail: true })        // [{name, description, params, example, aliases, …}]
```
命令行 `vk list` / `vk list fx` / `vk list three layer` / `vk list options`（vk.video / vk.scene / 元素公共选项）。`npm run docs` 由同一份注册表生成 `llms.txt`、`docs/api.json`、`docs/vk.d.ts`，并提交进仓库；`npm test` 会检查它们是否最新。

**`vk lint page.html`**（acorn AST，`vendor/acorn`）：找出渲染时会执行的闭包（`sc.on` / `v.onRender` / `sc.canvas` / `sc.paint` / `api.fn` / three 的 `update`、`{update|draw|render|…}` 成员、第一个参数叫 `t`/`local` 的函数，以及它们在同文件里调用的函数），标出 `Math.random`、`Date.now` / `new Date()`、`performance.now`、`requestAnimationFrame`、`setTimeout` / `setInterval`、`THREE.Clock` / `getDelta`、`mixer.update`、在闭包里调用的种子生成器、跨帧累加的外部变量，以及字面量里的未知名称——每条带行号和修复提示（`vk.rand(seed)` 在 setup 里预计算、`vk.hash(i)`、`t`、`vk.three.mixer(...).at(t)`）。页面里 `vk.use` / `vk.register` 注册的名字会先收集，不算未知。行尾或上一行写 `// vk-lint-ignore` 可忽略。现有示例：除 `nezha-ref/nezha-rig-demo.html`（不是 vidkit 页面，3 条顶层定时器/时钟警告）外均为 0 error / 0 warning。

**`vk peek page.html`**：一次浏览器启动完成 agent 的"看片"循环：静态 lint → 打开页面（严格模式）→ 在 t=0（封面）与每个场景的入场中/落定两个时刻截低清静帧（或 `--at` / `--every`）→ 页内版面 QA → 像素分析 → 第二个全新页面在若干时刻重渲染做确定性比对 → 带标注的联系表。输出目录（默认 `out/peek/<name>/`）里有 `still-*.jpg`、`sheet.png`、`peek.json`：
`{ ok, issues: [{severity, code, message, t, times?, hint, el?}], stills: [{t, file, scene}], sheet, timings, duration, scenes, warnings, lint, determinism }`。
检查项（code）：`page-error`（含严格模式错误）、`unknown-name`、`lint/*`、`text-overlap`、`text-overflow-x/y`、`text-cut-by-frame`、`outside-safe-area`、`out-of-frame`、`in-platform-ui-zone`、`caption-*`、`fonts-not-loaded`、`blank-frame` / `blank-first-frame` / `dark-frame`、`low-contrast`（在渲染出的像素上测文字与背景对比度）、`flicker`（t−1/fps · t · t+1/fps 三帧中间一帧突变）、`nondeterministic`（同一 t 在全新页面上渲染结果不同；无损 PNG 比对，容忍几级栅格噪声，并保存 `fresh-t*.png` 供对照）。落定帧上的版面问题是 error，入场动画中是 warn；有 error 时退出码 1。实测（8 核、无 GPU）：promo 51.8 s / 27 帧 6.9 s，vertical 14.7 s（1080×1920）6.2 s，reel 15 s（1080p）8.2 s；examples/agent-test（10 s，含 3D）`--draft` 2.5 s。

**草稿模式**：`vk peek --draft` / `vk render --draft`（见 [3D 示例与性能](#示例与性能)）。

**示例**：`examples/agent-test/agent-test.html`——只按 `llms.txt` + `AGENTS.md` 写成的 10 s 自测片：`tech` 风格 + 原生 canvas 星空（无状态）+ 一个小的 `vk.three` 环面结，经 lint → peek 循环后渲染为 `out/agent-test.mp4`（联系表 `out/agent-test-sheet.png`）。

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
| ZCOOL KuaiLe 站酷快乐体 | `crayon` 风格包手写标题 |
| Archivo Black | `reel` 风格包 / `vk.mg` 海报大字、快切、logo 收束 |

示例数据来源：`examples/data/co2.json` 摘自 Our World in Data《CO₂ and Greenhouse Gas Emissions》（github.com/owid/co2-data，基于 Global Carbon Project，CC BY 4.0，2026-09-29 获取）。`examples/assets/sample-screenshot.svg` 为合成占位图（画面标注"示例截图"）。

音乐素材（`examples/assets/music/`，详见 `examples/mv/LICENSE-music.md`）：Kevin MacLeod（incompetech.com）《Voxel Revolution》《Wallpaper》节选，**CC BY 4.0**——使用或再发布成片时必须署名（示例片尾已署名）。MV 中的"人声"为 edge-tts 合成（微软在线服务，条款见 LICENSE-music.md）。

第三方代码与素材（`vendor/`，详见 `vendor/LICENSES.md`）：three.js r186 及其 examples/jsm addons（MIT，© 2010-2026 three.js authors）；Google Draco 解码器（Apache-2.0）；Poly Haven《Photo Studio Loft Hall》HDRI（CC0，已降采样到 1k）。这些都只打包进可选的 `dist/vidkit-three.js`。
