// IIFE bundle entry: window.vk. Fonts resolve relative to the bundle: <root>/dist/vidkit.js → <root>/fonts/
import vk from './index.js';
const src = (document.currentScript && document.currentScript.src) || '';
const base = src ? new URL('../', src).href : '';
vk._setEnv({ base });
window.vk = vk;
