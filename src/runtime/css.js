// Runtime stylesheet. Fonts are bundled in /fonts (all SIL OFL 1.1) and loaded relative to the vidkit build.
export function fontFaces(base) {
  const f = (fam, file, extra = '') => `@font-face{font-family:"${fam}";src:url("${base}${file}") format("truetype");font-display:block;${extra}}`;
  return f('Noto Sans SC', 'NotoSansSC-VF.ttf', 'font-weight:100 900;') +
    f('JetBrains Mono', 'JetBrainsMono-VF.ttf', 'font-weight:100 800;') +
    f('Archivo', 'Archivo-VF.ttf', 'font-weight:100 900;font-stretch:62% 125%;') +
    f('Anton', 'Anton-Regular.ttf', 'font-weight:400;') +
    f('Instrument Serif', 'InstrumentSerif-Regular.ttf', 'font-weight:400;font-style:normal;') +
    f('Instrument Serif', 'InstrumentSerif-Italic.ttf', 'font-weight:400;font-style:italic;') +
    f('Ma Shan Zheng', 'MaShanZheng-Regular.ttf', 'font-weight:400;') +          // brush calligraphy (ink theme)
    f('Noto Serif SC', 'NotoSerifSC-VF.ttf', 'font-weight:200 900;');            // serif body/captions (ink theme); fetched only when used
}

export function stageCSS(v) {
  const { W, H, theme: th } = v, s = v.safe;
  return `
#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;transform-origin:0 0;background:#000;color:#fff;
  font-family:var(--vk-sans);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-kerning:normal}
#stage *,#stage *::before,#stage *::after{box-sizing:border-box;transition:none!important}
#stage .vk-scenes{position:absolute;inset:0;z-index:0;isolation:isolate} /* own stacking context: scene z-indexes never cover overlays/captions */
#stage .vk-scene{position:absolute;inset:0;display:none;overflow:hidden;background:var(--bg);color:var(--fg)}
#stage .vk-scene.on{display:block}
#stage .vk-cam{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#stage .vk-bg{position:absolute;inset:0;pointer-events:none}
#stage .vk-content{position:absolute;left:${s.left}px;top:${s.top}px;right:${s.right}px;bottom:${s.bottom}px;display:flex;flex-direction:column;
  justify-content:center;align-items:center;text-align:center;gap:var(--vk-gap)}
#stage .vk-content.left{align-items:flex-start;text-align:left}
#stage .vk-content.top{justify-content:flex-start}#stage .vk-content.bottom{justify-content:flex-end}
#stage .vk-content.free{display:block}
#stage .vk-abs,#stage .abs{position:absolute}
#stage .vk-canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
#stage .vk-row{display:flex;gap:var(--vk-gap);align-items:center;justify-content:center}
#stage .vk-col{display:flex;flex-direction:column;gap:calc(var(--vk-gap)*.6)}
#stage .vk-mono,#stage .mono{font-family:var(--vk-mono)}
#stage .vk-display{font-family:var(--vk-display)}
#stage .vk-hero{font-family:var(--vk-display);font-size:var(--vk-fs-hero);font-weight:${th.weight.display};line-height:1.02;letter-spacing:${th.tracking.display};margin:0}
#stage .vk-h1{font-family:var(--vk-display);font-size:var(--vk-fs-h1);font-weight:${th.weight.title};line-height:1.1;letter-spacing:${th.tracking.title};margin:0}
#stage .vk-h2{font-size:var(--vk-fs-h2);font-weight:${th.weight.title};line-height:1.14;letter-spacing:${th.tracking.title};margin:0}
#stage .vk-h3{font-size:var(--vk-fs-h3);font-weight:${th.weight.sub};line-height:1.25;margin:0}
#stage .vk-body{font-size:var(--vk-fs-body);line-height:1.55;color:var(--muted);margin:0}
#stage .vk-small{font-size:var(--vk-fs-small);line-height:1.5;color:var(--muted)}
#stage .vk-label{font-family:var(--vk-mono);font-size:var(--vk-fs-label);font-weight:600;letter-spacing:.06em;color:var(--accent2)}
#stage .vk-accent{color:var(--accent)}
#stage .vk-muted{color:var(--muted)}
#stage .vk-surface{background:var(--surface);border:1px solid var(--line);border-radius:var(--vk-radius)}
#stage .vk-mark{background-image:linear-gradient(var(--vk-marker),var(--vk-marker));background-repeat:no-repeat;background-position:0 88%;background-size:var(--p,0%) 40%;padding:0 .08em;margin:0 -.08em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
#stage .vk-ul{background-image:linear-gradient(var(--accent),var(--accent));background-repeat:no-repeat;background-position:0 100%;background-size:var(--p,0%) .09em;padding-bottom:.06em}
#stage .vk-em{color:var(--accent)}
.vk-wordwrap{display:inline-block;white-space:nowrap}.vk-ch{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .02em .14em;margin:0 -.02em -.14em}
.vk-chi,.vk-word,.vk-c{display:inline-block;white-space:pre}
.vk-flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:40;pointer-events:none}
.vk-ov{position:absolute;left:0;top:0;width:100%;height:100%;z-index:41;pointer-events:none}
.vk-caret::after{content:"\\258D";color:var(--vk-caret);margin-left:2px}
.vk-cap{position:absolute;left:50%;transform:translateX(-50%);text-align:center;opacity:0;z-index:50;pointer-events:none;
  bottom:var(--cap-bottom);font-size:var(--cap-size);max-width:${W - s.left - s.right}px;background:${th.caption.bg};color:${th.caption.fg};font-family:${th.caption.font || 'var(--vk-sans)'};
  font-weight:${th.caption.weight || 700};padding:${th.caption.padding || '.3em .8em'};border-radius:${th.caption.radius != null ? th.caption.radius : 12}px;line-height:1.35;white-space:${W < H ? 'normal;width:max-content' : 'nowrap'}${th.caption.border ? `;border-left:${th.caption.border}` : ''}${th.caption.tracking ? `;letter-spacing:${th.caption.tracking}` : ''}${th.caption.shadow ? `;box-shadow:${th.caption.shadow}` : ''}}
${W < H ? `.vk-cap{left:${s.left}px;right:${s.right}px;transform:none;margin:0 auto;max-width:${W - s.left - s.right}px}` : ''}
.vk-cap .kw{transition:none}.vk-cap .kw.on{color:${th.caption.karaoke}}
.vk-cap[data-style=sweep] .kw{color:transparent;-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(90deg,${th.caption.karaoke} calc(var(--p,0)*100%),${th.caption.fg} calc(var(--p,0)*100% + .5px))}
.vk-cap[data-style=pop] .kw{display:inline-block;transform:scale(calc(1 + .12*var(--p,0)*(1 - var(--p,0))*4))}.vk-cap[data-style=pop] .kw.on{color:${th.caption.karaoke}}
html.vk-render,html.vk-render body{margin:0;padding:0;background:#000;overflow:hidden;width:${W}px;height:${H}px}
.vk-wrap{max-width:${W < H ? 480 : 1120}px;margin:0 auto;padding:20px 16px 32px;font-family:var(--vk-sans)}
.vk-wrap h1{font-size:18px;margin:0 0 12px}.vk-wrap h1 small{font-weight:400;opacity:.6;margin-left:8px}
.vk-frame{position:relative;width:100%;aspect-ratio:${W}/${H};background:#000;border-radius:14px;overflow:hidden;cursor:pointer}
.vk-frame:fullscreen{border-radius:0;aspect-ratio:auto}
.vk-controls{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:14px}
.vk-controls button{font:inherit;background:#fff;color:#0B1020;border:1px solid #D3D8E6;border-radius:10px;padding:7px 14px;cursor:pointer}
.vk-controls button.vk-play{background:#3355FF;border-color:#3355FF;color:#fff;font-weight:700;min-width:70px}
.vk-seek{position:relative;flex:1;min-width:0}.vk-seek input{width:100%;accent-color:#3355FF}
.vk-ticks{position:absolute;left:0;right:0;top:-6px;height:6px;pointer-events:none}.vk-ticks i{position:absolute;top:0;width:2px;height:6px;background:#8A94B8}
.vk-time{font-family:var(--vk-mono);min-width:110px;text-align:right;opacity:.7}
.vk-scenelist{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;font-size:12px}.vk-scenelist button{font:inherit;padding:3px 8px;border-radius:8px;border:1px solid #D3D8E6;background:transparent;color:inherit;cursor:pointer}
.vk-scenelist button.cur{background:#3355FF;color:#fff;border-color:#3355FF}
.vk-safe{position:absolute;inset:0;pointer-events:none;z-index:60;display:none}.vk-safe.show{display:block}
@media (prefers-color-scheme:dark){body{background:#080B14;color:#E7EBFA}.vk-controls button{background:#111729;color:#E7EBFA;border-color:#222A45}}`;
}
