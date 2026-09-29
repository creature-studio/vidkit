#!/usr/bin/env bash
# Create vidkit's Python audio toolchain in <repo>/.venv (git-ignored).
#   tools/setup-audio.sh            full: librosa, faster-whisper, stable-ts, edge-tts, piper, torch(CPU), demucs, beat_this
#   tools/setup-audio.sh --light    no torch: librosa beats (no neural downbeats), no vocal separation
# Models are downloaded lazily on first use into ~/.cache (whisper: HF hub, beat_this: torch hub, demucs: torch hub,
# piper voices: ~/.cache/vidkit/piper). Override the interpreter with VK_PYTHON=/path/to/python.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PYTHON:-python3}
[ -x .venv/bin/python ] || "$PY" -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r tools/requirements-audio.txt
if [ "${1:-}" != "--light" ]; then
  .venv/bin/pip install -q torch torchaudio --index-url https://download.pytorch.org/whl/cpu
  .venv/bin/pip install -q "demucs>=4" "beat_this @ git+https://github.com/CPJKU/beat_this.git"
fi
.venv/bin/python tools/vkaudio.py doctor
