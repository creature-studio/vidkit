# Bundled fonts

All bundled fonts are licensed under the **SIL Open Font License 1.1** (full text: `OFL-1.1.txt`), which allows
bundling, embedding and redistribution with software (the fonts may not be sold by themselves; Reserved Font Names
must not be used for modified versions). Rendering them into videos places no restriction on the videos.

| File | Family | Copyright (from the font's name table) | Use in vidkit |
|---|---|---|---|
| `NotoSansSC-VF.ttf` | Noto Sans SC (variable wght 100–900) | © 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source' | Chinese + Latin UI/body/titles (all themes) |
| `JetBrainsMono-VF.ttf` | JetBrains Mono (variable wght 100–800) | © 2020 The JetBrains Mono Project Authors | code, terminal, numbers, labels |
| `Archivo-VF.ttf` | Archivo (variable wght 100–900, wdth 62–125) | © 2020 The Archivo Project Authors (Omnibus-Type) | display font (bold / noir themes); `stretch` fx animates the width axis |
| `Anton-Regular.ttf` | Anton | © 2020 The Anton Project Authors | condensed poster display (`font:'condensed'`) |
| `InstrumentSerif-Regular.ttf`, `InstrumentSerif-Italic.ttf` | Instrument Serif | © 2022 The Instrument Serif Project Authors | editorial theme display / quotes |
| `MaShanZheng-Regular.ttf` | Ma Shan Zheng 马善政毛笔楷书 | © 2018 The Ma Shan Zheng Project Authors (github.com/googlefonts/mashanzheng) | brush calligraphy titles (`ink` theme: vertical titles, chapter titles, seals) |
| `NotoSerifSC-VF.ttf` | Noto Serif SC 思源宋体 (variable wght 200–900) | © 2017-2024 Adobe (http://www.adobe.com/) | serif body / captions (`ink` theme) |
| `ArchivoBlack-Regular.ttf` | Archivo Black | © 2017 The Archivo Black Project Authors (github.com/Omnibus-Type/ArchivoBlack) | heavy poster display (`reel` style pack, `vk.mg` kinetic type, montage, lockup) |
| `ZCOOLKuaiLe-Regular.ttf` | ZCOOL KuaiLe 站酷快乐体 | © 2018 The ZCOOL KuaiLe Project Authors (github.com/googlefonts/zcool-kuaile) | hand-lettered titles (`crayon` style pack) |

Ma Shan Zheng and Noto Serif SC were downloaded from github.com/google/fonts (ofl/mashanzheng, ofl/notoserifsc) on 2026-09-29;
ZCOOL KuaiLe from github.com/google/fonts (ofl/zcoolkuaile) on 2026-10-03; Archivo Black from github.com/google/fonts
(ofl/archivoblack) on 2026-10-04.
Sources: Noto Sans SC and JetBrains Mono were copied from the existing HTML-video toolkit; the others from the
system's Google Fonts collection. Each font's license was checked in its OpenType `name` table (IDs 0/13/14).

## Derived typeface JSON (`fonts/typeface/*.json`, `examples/ink-landscape/mashanzheng-subset.json`)

Glyph outlines converted with `vk font3d` (opentype.js) into the three.js typeface format for `vk.three.text3d`.
They are derivatives of the OFL fonts above and stay under the **SIL OFL 1.1**: `archivo-black.json` ← Archivo Black,
`anton.json` ← Anton, `instrument-serif.json` ← Instrument Serif (Latin-1 + punctuation); the ink-landscape example ships a
15-character subset of Ma Shan Zheng. Same names are kept for attribution (no Reserved Font Name applies to these fonts).
