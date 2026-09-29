// vk doctor — check the render capture backend, the Python audio toolchain (tools/setup-audio.sh) and ffmpeg
import os from 'node:os';
import { vkaudio, python } from './py.mjs';
import { headlessShellPath } from './cdp.mjs';
export default async function doctor() {
  const hs = headlessShellPath();
  console.log('[vk doctor] capture:', hs ? `beginframe (chrome-headless-shell ${hs})` : 'screenshot only (chrome-headless-shell not found: npx playwright install chromium)', `· ${os.cpus().length} cores → ${hs ? os.cpus().length : Math.max(1, Math.min(4, os.cpus().length - 1))} render workers`);
  console.log('[vk doctor] python:', python()); process.stdout.write(await vkaudio(['doctor']));
}
