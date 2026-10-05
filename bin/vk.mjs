#!/usr/bin/env node
// vk — vidkit CLI
import path from 'node:path';
import { PKG } from '../cli/lib.mjs';
const cmds = { render: 'render', lint: 'lint', peek: 'peek', list: 'list', stills: 'stills', contact: 'contact', qa: 'qa', preview: 'preview', new: 'new', analyze: 'analyze', align: 'align', tts: 'tts', sync: 'sync', doctor: 'doctor', make: 'make', style: 'style' };
const [cmd, ...rest] = process.argv.slice(2);
const HELP = `${PKG.name} ${PKG.version} — deterministic HTML/JS → video

usage:
  vk render  page.html -o out.mp4 [--fps 30] [--scale 2] [--format 16:9|9:16|1:1|4:5] [--audio music.m4a]
                                  [--audio-offset s] [--grain 6] [--workers 4] [--from s --to s] [--crf 18]
                                  [--preset medium] [--png | --quality 95] [--srt] [--no-score] [--score-gain-max 2] [--keep]
                                  [--lufs -14|off] [--duck -10] [--no-voice]
                                  [--capture beginframe|screenshot] [--gpu soft|swiftshader|off] [--no-cache]
                                  [--timing] [--chunk frames] [--x264-threads n]
                                  [--strict | --no-strict] [--draft]
                                  (default: beginframe capture, workers = CPU cores, static-layer cache on, strict on)
                                  --draft: half scale, CRF 26, veryfast; vk.three res .35, aa 1, no DOF/bloom/motion blur

agent loop (see AGENTS.md / llms.txt):
  vk lint    page.html [more.html …] [--json] [--quiet]      determinism + unknown-name lint (file:line:col + hint)
  vk peek    page.html [--at 0,2.5,5 | --every 1] [--draft] [--json] [-o out/peek/<name>] [--scale .5]
                                  [--no-strict] [--no-determinism] [--no-flicker] [--cols 4]
                                  ONE browser launch: stills + labelled contact sheet + peek.json (layout, contrast,
                                  blank, flicker, determinism checks); exit 1 on errors
  vk list    [kind] [name] [--json]                            registry: kinds → names → params/defaults/example

frames, QA, preview:
  vk stills  page.html [--at 1.5,4,9.2] [-o dir] [--scale 2] [--capture …] [--no-cache]   PNG stills (default: each scene's settled frame)
  vk contact page.html [-o sheet.png] [--times a,b | --settle] [--cols 4]  contact sheet (2 frames per scene, or 1 settled)
  vk qa      page.html [--sample 0.5] [--order-step 1] [--json=report.json] [--no-strict]   layout/safe-area/caption/fonts/blank-frame/
                                                                   seek-order QA + text snapshot
  vk preview page.html [--port 5173] [--host 0.0.0.0] [--dev]      dev server: live reload + scrubber
  vk new     video.html [--format 9:16] [--theme bold]             scaffold a page
             (vk new --style ink --story story.md -o dir/  → same as vk make)

style library (styles/<id>/):
  vk make    --style <id>[,<id>.chars…] --story story.md -o examples/<slug>/ [--name slug] [--tts] [--render] [--force]
                                  story (markdown/JSON scenes, narration, dialogue, actions) → styled narrated film page
  vk style   list | sample [id,…] | gallery [-o out/styles/index.html] [--shot png]
  vk style   extract ref.png [--id name] [--k 6] [-o dir]      k-means palette + grain estimate → starter pack

audio (Phase 2 · Python toolchain: tools/setup-audio.sh):
  vk analyze music.mp3 [-o music.beats.json] [--backend auto|beat_this|librosa] [--rate 50] [--bands 8]
                                  bpm, beats, downbeats/bars, onsets, loudness envelope + bands, sections, LUFS
  vk align   audio.wav [--text script.txt | --lyrics lyrics.txt] [--lang zh|en] [--model small] [--separate]
                                  word/char timestamps (forced alignment; --separate = demucs vocals first)
  vk tts     page.html [--voice zh-CN-YunxiNeural] [--backend edge|piper] [--rate +0%] [--force]
                                  narration for every scene vo: → <page>.vo.json   (vk tts --voices zh · --text "…" -o a.mp3)
  vk sync    out.mp4 [--beats song.beats.json --music-start s] [--words out.words.json]   measure A/V sync
  vk doctor                       check the audio toolchain
`;
if (!cmd || cmd === '-h' || cmd === '--help' || !cmds[cmd]) { console.log(HELP); process.exit(cmd && !cmds[cmd] && cmd !== '-h' && cmd !== '--help' ? 1 : 0); }
try { const name = cmd === 'new' && rest.includes('--story') ? 'make' : cmds[cmd]; const m = await import(`../cli/${name}.mjs`); await m.default(rest); if (cmd !== 'preview') process.exit(process.exitCode || 0); }
catch (e) { console.error('[vk] ' + (e && e.message || e)); process.exit(1); }
