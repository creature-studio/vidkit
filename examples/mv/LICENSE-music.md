# Music & voice credits (examples/mv, examples/explainer-vo)

| File | Work | Author | License | Source |
|---|---|---|---|---|
| `examples/assets/music/voxel-revolution-43s.mp3` | "Voxel Revolution" (first 43.5 s, 2.2 s fade-out) | Kevin MacLeod (incompetech.com) | Creative Commons Attribution 4.0 (CC BY 4.0) | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Voxel%20Revolution.mp3 (ISRC USUAN2000025), downloaded 2026-09-29 |
| `examples/assets/music/wallpaper-90s.mp3` | "Wallpaper" (first 90 s; vk render fades it out at the end of the video) | Kevin MacLeod (incompetech.com) | CC BY 4.0 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3, downloaded 2026-09-29 |
| `examples/mv/song.m4a` | the Voxel Revolution excerpt + synthesised vocals of `lyrics.txt` (original lyrics written for this demo) | music: Kevin MacLeod; lyrics: vidkit authors; voice: Microsoft Edge TTS neural voice zh-CN-XiaoxiaoNeural via edge-tts | music CC BY 4.0 (attribution below); see note on TTS | built by `node examples/mv/make-song.mjs` |
| `examples/explainer-vo.vo/*.mp3` | narration of `examples/explainer-vo.html` | Microsoft Edge TTS voice zh-CN-YunxiNeural via edge-tts | see note on TTS | `vk tts examples/explainer-vo.html` |

Required attribution (shown in the videos' end cards and here):

> "Voxel Revolution" Kevin MacLeod (incompetech.com)
> Licensed under Creative Commons: By Attribution 4.0 License — http://creativecommons.org/licenses/by/4.0/
>
> "Wallpaper" Kevin MacLeod (incompetech.com)
> Licensed under Creative Commons: By Attribution 4.0 License — http://creativecommons.org/licenses/by/4.0/

The excerpts were trimmed and faded (a modification, which CC BY 4.0 permits with attribution).

**Note on TTS audio**: edge-tts is an unofficial client of Microsoft Edge's online "Read Aloud" service. Microsoft
publishes no explicit licence for that output; treat the generated narration as fine for demos/internal use and check
Microsoft's terms (or switch to the offline `--backend piper` voice, or a commercially licensed TTS) before
publishing commercially.
