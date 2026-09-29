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

Ma Shan Zheng and Noto Serif SC were downloaded from github.com/google/fonts (ofl/mashanzheng, ofl/notoserifsc) on 2026-09-29.
Sources: Noto Sans SC and JetBrains Mono were copied from the existing HTML-video toolkit; the others from the
system's Google Fonts collection. Each font's license was checked in its OpenType `name` table (IDs 0/13/14).
