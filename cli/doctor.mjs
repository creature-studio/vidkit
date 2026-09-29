// vk doctor — check the Python audio toolchain (tools/setup-audio.sh) and ffmpeg
import { vkaudio, python } from './py.mjs';
export default async function doctor() { console.log('[vk doctor] python:', python()); process.stdout.write(await vkaudio(['doctor'])); }
