#!/usr/bin/env node
// vk — vidkit CLI
import path from 'node:path';
import { PKG } from '../cli/lib.mjs';
const cmds = { render: 'render', stills: 'stills', contact: 'contact', qa: 'qa', preview: 'preview', new: 'new', analyze: 'analyze', align: 'align', tts: 'tts', sync: 'sync', doctor: 'doctor' };
const [cmd, ...rest] = process.argv.slice(2);
const HELP = `${PKG.name} ${PKG.version} — deterministic HTML/JS → video

usage:
  vk render  page.html -o out.mp4 [--fps 30] [--scale 2] [--format 16:9|9:16|1:1|4:5] [--audio music.m4a]
                                  [--audio-offset s] [--grain 6] [--workers 4] [--from s --to s] [--crf 18]
                                  [--preset medium] [--png | --quality 95] [--srt] [--no-score] [--score-gain-max 2] [--keep]
                                  [--lufs -14|off] [--duck -10] [--no-voice]
                                  [--capture beginframe|screenshot] [--gpu soft|swiftshader|off] [--no-cache]
                                  [--timing] [--chunk frames] [--x264-threads n]
                                  (default: beginframe capture, workers = CPU cores, static-layer cache on)
  vk stills  page.html [--at 1.5,4,9.2] [-o dir] [--scale 2] [--capture …] [--no-cache]   PNG stills (default: each scene's settled frame)
  vk contact page.html [-o sheet.png] [--times a,b | --settle] [--cols 4]  contact sheet (2 frames per scene, or 1 settled)
  vk qa      page.html [--sample 0.5] [--order-step 1] [--json=report.json]   layout/safe-area/caption/fonts/blank-frame/
                                                                   seek-order QA + text snapshot
  vk preview page.html [--port 5173] [--host 0.0.0.0] [--dev]      dev server: live reload + scrubber
  vk new     video.html [--format 9:16] [--theme bold]             scaffold a page

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
try { const m = await import(`../cli/${cmds[cmd]}.mjs`); await m.default(rest); if (cmd !== 'preview') process.exit(0); }
catch (e) { console.error('[vk] ' + (e && e.message || e)); process.exit(1); }
