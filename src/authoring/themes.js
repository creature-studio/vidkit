// Themes = palette + fonts + type scale. The scale is in px at a 720px short side and multiplied by
// (short side / 720), so a 9:16 1080×1920 video gets ×1.5 automatically.
import { unknownName } from '../core/strict.js';
import { registry } from '../core/plugin.js';

const SANS = '"Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif';
const MONO = '"JetBrains Mono","Noto Sans Mono CJK SC",ui-monospace,Menlo,Consolas,"Noto Sans SC",monospace';
const T = registry.themes;

T['tech-blue'] = {
  label: '科技蓝（Spark / One 宣传片风格）',
  modes: {
    dark: { bg: '#0B1020', fg: '#FFFFFF', muted: '#9AA6CC', surface: '#151B33', line: '#2A3358', accent: '#3355FF', accent2: '#7C93FF', onAccent: '#FFFFFF' },
    light: { bg: '#E8ECF4', fg: '#0B1020', muted: '#3A4468', surface: '#FFFFFF', line: '#B7BFD6', accent: '#3355FF', accent2: '#7C93FF', onAccent: '#FFFFFF' },
    accent: { bg: '#3355FF', fg: '#FFFFFF', muted: '#DDE3FF', surface: '#0B1020', line: '#6F88FF', accent: '#0B1020', accent2: '#FFFFFF', onAccent: '#FFFFFF' },
  },
  mode: 'dark', warn: '#FF5A36', ok: '#2ED47A', yellow: '#FFC83D',
  chart: ['#3355FF', '#7C93FF', '#2ED47A', '#FFC83D', '#FF5A36', '#B6C0E2'],
  fonts: { sans: SANS, display: SANS, mono: MONO, serif: SANS },
  weight: { display: 900, title: 900, sub: 700 },
  tracking: { display: '-.05em', title: '-.02em' },
  scale: { hero: 260, h1: 84, h2: 60, h3: 36, body: 27, small: 22, label: 22, caption: 30 },
  radius: 18, ease: 'house', cascade: .35,
  marker: 'rgba(51,85,255,.35)', caret: '#7C93FF',
  caption: { bg: 'rgba(8,11,20,.82)', fg: '#FFFFFF', karaoke: '#7C93FF' },
};

T.editorial = {
  label: '暖色杂志风（纸张、衬线、赭红）',
  modes: {
    light: { bg: '#F3ECE0', fg: '#1F1A17', muted: '#6B5E53', surface: '#FFFaf2', line: '#D8CBB8', accent: '#C8492B', accent2: '#2F5D50', onAccent: '#FFF8EE' },
    dark: { bg: '#1F1A17', fg: '#F3ECE0', muted: '#B8A999', surface: '#2B2420', line: '#4A3F37', accent: '#E0673F', accent2: '#8FB8A8', onAccent: '#1F1A17' },
    accent: { bg: '#C8492B', fg: '#FFF8EE', muted: '#F6D2C2', surface: '#1F1A17', line: '#E08A70', accent: '#1F1A17', accent2: '#FFF8EE', onAccent: '#FFF8EE' },
  },
  mode: 'light', warn: '#C8492B', ok: '#2F5D50', yellow: '#D9A441',
  chart: ['#C8492B', '#2F5D50', '#D9A441', '#6B5E53', '#8FB8A8', '#E0673F'],
  fonts: { sans: SANS, display: '"Instrument Serif",' + SANS, mono: MONO, serif: '"Instrument Serif",' + SANS },
  weight: { display: 400, title: 800, sub: 600 },
  tracking: { display: '-.02em', title: '-.01em' },
  scale: { hero: 230, h1: 78, h2: 56, h3: 34, body: 27, small: 22, label: 20, caption: 29 },
  radius: 6, ease: 'smooth', cascade: .4,
  marker: 'rgba(217,164,65,.5)', caret: '#C8492B',
  caption: { bg: 'rgba(31,26,23,.86)', fg: '#F3ECE0', karaoke: '#E0673F' },
};

T.bold = {
  label: '强对比短视频风（黑黄粉、超粗压缩字）',
  modes: {
    dark: { bg: '#0A0A0A', fg: '#FFFFFF', muted: '#BDBDBD', surface: '#1C1C1C', line: '#333333', accent: '#FFE600', accent2: '#FF2E63', onAccent: '#0A0A0A' },
    light: { bg: '#FFE600', fg: '#0A0A0A', muted: '#3D3700', surface: '#FFFFFF', line: '#0A0A0A', accent: '#FF2E63', accent2: '#0A0A0A', onAccent: '#FFFFFF' },
    accent: { bg: '#FF2E63', fg: '#FFFFFF', muted: '#FFD3DE', surface: '#0A0A0A', line: '#FF7A9A', accent: '#FFE600', accent2: '#0A0A0A', onAccent: '#0A0A0A' },
  },
  mode: 'dark', warn: '#FF2E63', ok: '#00E08A', yellow: '#FFE600',
  chart: ['#FFE600', '#FF2E63', '#00E08A', '#3FA9FF', '#FFFFFF', '#FF8A00'],
  fonts: { sans: SANS, display: '"Archivo",' + SANS, mono: MONO, serif: SANS, condensed: '"Anton",' + SANS },
  weight: { display: 900, title: 900, sub: 800 },
  tracking: { display: '-.03em', title: '-.02em' },
  scale: { hero: 250, h1: 96, h2: 68, h3: 40, body: 30, small: 24, label: 24, caption: 32 },
  radius: 14, ease: 'snappy', cascade: .3,
  marker: '#FFE600', caret: '#FFE600',
  caption: { bg: '#0A0A0A', fg: '#FFFFFF', karaoke: '#FFE600' },
};

T.noir = {
  label: '黑白极简（单色 + 一点红）',
  modes: {
    dark: { bg: '#000000', fg: '#F5F5F5', muted: '#8A8A8A', surface: '#141414', line: '#2A2A2A', accent: '#FF3B30', accent2: '#F5F5F5', onAccent: '#FFFFFF' },
    light: { bg: '#F5F5F5', fg: '#000000', muted: '#666666', surface: '#FFFFFF', line: '#CCCCCC', accent: '#FF3B30', accent2: '#000000', onAccent: '#FFFFFF' },
    accent: { bg: '#FF3B30', fg: '#FFFFFF', muted: '#FFD0CC', surface: '#000000', line: '#FF8A80', accent: '#000000', accent2: '#FFFFFF', onAccent: '#FFFFFF' },
  },
  mode: 'dark', warn: '#FF3B30', ok: '#34C759', yellow: '#FFCC00',
  chart: ['#F5F5F5', '#FF3B30', '#8A8A8A', '#FFCC00', '#34C759', '#555555'],
  fonts: { sans: SANS, display: '"Archivo",' + SANS, mono: MONO, serif: '"Instrument Serif",' + SANS },
  weight: { display: 800, title: 800, sub: 600 },
  tracking: { display: '-.04em', title: '-.02em' },
  scale: { hero: 240, h1: 80, h2: 58, h3: 34, body: 26, small: 21, label: 20, caption: 29 },
  radius: 2, ease: 'house', cascade: .35,
  marker: 'rgba(255,59,48,.45)', caret: '#FF3B30',
  caption: { bg: 'rgba(0,0,0,.85)', fg: '#FFFFFF', karaoke: '#FF3B30' },
};

export function resolveTheme(t) {
  if (!t) return T['tech-blue'];
  if (typeof t === 'string') { if (!T[t]) unknownName('themes', t, Object.keys(T)); return T[t] || T['tech-blue']; }
  if (t.extends && !T[t.extends]) unknownName('themes', t.extends, Object.keys(T));
  const base = T[t.extends || 'tech-blue'] || T['tech-blue'];
  return deepMerge(JSON.parse(JSON.stringify(base)), t);
}
function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else a[k] = b[k]; } return a; }
// CSS custom properties for a palette mode
export function modeVars(theme, mode) {
  const m = theme.modes[mode] || theme.modes[theme.mode];
  return { '--bg': m.bg, '--fg': m.fg, '--muted': m.muted, '--surface': m.surface, '--line': m.line, '--accent': m.accent, '--accent2': m.accent2, '--on-accent': m.onAccent,
    // colour for terminal prompts etc. drawn on --surface: accent2 unless it would vanish into the surface
    '--prompt': m.prompt || (m.accent2.toLowerCase() === m.surface.toLowerCase() ? m.muted : m.accent2) };
}
