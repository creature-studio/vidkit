# 《小蝌蚪找妈妈》示例 — 素材与许可

- **故事文本 / 画面 / 代码**：本示例原创（经典童话题材的重新讲述；角色为原创 SVG 绘制，未使用任何现有动画的画面）。代码随 vidkit 许可。
- **音乐**：`tadpole.music.m4a` 由 `make-music.mjs` 完全程序合成（Karplus–Strong 古琴式拨弦、笛子加性合成、低音持续音、混响），无任何采样或外部曲目。作者放弃权利，**CC0 1.0**。
- **音效**：水滴、气泡、水花、蛙鸣、鸭叫、鹅叫、木鱼、锣均为 `src/audio/synth.js` 在渲染时离线合成，CC0。
- **配音**：`tadpole.vo/*.mp3` 由 edge-tts 调用微软 Azure 神经网络语音在线服务合成（zh-CN-XiaoxiaoNeural、zh-CN-YunxiaNeural、zh-CN-liaoning-XiaobeiNeural、zh-CN-YunxiNeural、zh-CN-XiaoyiNeural、zh-CN-YunyangNeural、zh-TW-HsiaoChenNeural），使用须遵守微软的服务条款；如需完全自由的配音，可用 `vk tts --backend piper` 重新生成。
- **字体**：Ma Shan Zheng（© 2018 The Ma Shan Zheng Project Authors）、Noto Serif SC（© 2017-2024 Adobe），均为 SIL OFL 1.1，见 `fonts/LICENSES.md`。
