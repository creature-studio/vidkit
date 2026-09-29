// vk new my-video.html [--format 9:16] [--theme bold]  — scaffold a page wired to the bundled build
import { parseArgs, ROOT, fs, path } from './lib.mjs';
export default async function create(argv) {
  const opt = parseArgs(argv), f = path.resolve(opt._[0] || 'video.html');
  if (fs.existsSync(f)) throw new Error('exists: ' + f);
  const rel = path.relative(path.dirname(f), path.join(ROOT, 'dist/vidkit.js')).split(path.sep).join('/');
  const fmt = opt.format || '16:9', theme = opt.theme || 'tech-blue';
  fs.writeFileSync(f, `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>新视频</title></head>
<body>
<script src="${rel}"></script>
<script>
const v = vk.video({ format: '${fmt}', fps: 30, theme: '${theme}', title: '新视频', autoSfx: true, texture: { vignette: .25 } });

vk.scene('开场', 4, { bg: 'dark' }, [
  vk.label('VIDKIT'),
  vk.title('用代码写视频', { fx: 'letters' }),
  vk.sub('每一帧都是时间的纯函数', { at: '+0.6' }),
]);

vk.scene('要点', 5, { bg: 'light', transition: 'wipe-left', cap: '字幕写在场景里，自动生成字幕轨和 SRT。' }, [
  vk.h2('三个要点'),
  vk.cards([{ title: '确定性', text: 'render(t) 纯函数' }, { title: '预设', text: '文字/转场/图表' }, { title: '插件', text: 'vk.use(plugin)' }], { cols: 3 }),
]);
</script>
</body></html>
`);
  console.log('created', f, '\n  preview: vk preview', path.relative(process.cwd(), f), '\n  render:  vk render', path.relative(process.cwd(), f), '-o out.mp4');
}
