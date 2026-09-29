#!/usr/bin/env node
// vk — vidkit CLI
import path from 'node:path';
import { PKG } from '../cli/lib.mjs';
const cmds = { render: 'render', stills: 'stills', contact: 'contact', qa: 'qa', preview: 'preview', new: 'new' };
const [cmd, ...rest] = process.argv.slice(2);
const HELP = `${PKG.name} ${PKG.version} — deterministic HTML/JS → video

usage:
  vk render  page.html -o out.mp4 [--fps 30] [--scale 2] [--format 16:9|9:16|1:1|4:5] [--audio music.m4a]
                                  [--audio-offset s] [--grain 6] [--workers 4] [--from s --to s] [--crf 18]
                                  [--preset medium] [--png | --quality 95] [--srt] [--no-score] [--score-gain-max 2] [--keep]
  vk stills  page.html [--at 1.5,4,9.2] [-o dir] [--scale 2]      PNG stills (default: each scene's settled frame)
  vk contact page.html [-o sheet.png] [--times a,b | --settle] [--cols 4]  contact sheet (2 frames per scene, or 1 settled)
  vk qa      page.html [--sample 0.5] [--json=report.json]         layout/safe-area/caption/fonts/blank-frame QA + text snapshot
  vk preview page.html [--port 5173] [--host 0.0.0.0] [--dev]      dev server: live reload + scrubber
  vk new     video.html [--format 9:16] [--theme bold]             scaffold a page
`;
if (!cmd || cmd === '-h' || cmd === '--help' || !cmds[cmd]) { console.log(HELP); process.exit(cmd && !cmds[cmd] && cmd !== '-h' && cmd !== '--help' ? 1 : 0); }
try { const m = await import(`../cli/${cmds[cmd]}.mjs`); await m.default(rest); if (cmd !== 'preview') process.exit(0); }
catch (e) { console.error('[vk] ' + (e && e.message || e)); process.exit(1); }
