// Python audio toolchain bridge (tools/vkaudio.py in <repo>/.venv; override with VK_PYTHON).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

export const SCRIPT = path.join(ROOT, 'tools', 'vkaudio.py');
export function python() {
  if (process.env.VK_PYTHON) return process.env.VK_PYTHON;
  const venv = path.join(ROOT, '.venv', 'bin', 'python');
  if (fs.existsSync(venv)) return venv;
  return 'python3';
}
// run vkaudio.py <args>; stderr streams through (progress), stdout is returned
export function vkaudio(args, { quiet = false } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(python(), [SCRIPT, ...args], { stdio: ['ignore', 'pipe', quiet ? 'pipe' : 'inherit'] });
    const out = [], err = [];
    p.stdout.on('data', d => { out.push(d); });
    if (quiet) p.stderr.on('data', d => err.push(d));
    p.on('error', e => rej(new Error(`cannot run ${python()} (${e.message}); install the audio toolchain: tools/setup-audio.sh`)));
    p.on('close', c => c ? rej(new Error(`vkaudio ${args[0]} failed (exit ${c})${quiet ? ': ' + Buffer.concat(err).toString().slice(-800) : ''}\n  hint: tools/setup-audio.sh installs the Python toolchain`)) : res(Buffer.concat(out).toString()));
  });
}
