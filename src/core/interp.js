// Value interpolation: every number inside a string is interpolated; colours are normalised to rgba() first.
// lerpStr('inset(0 100% 0 0)', 'inset(0 0% 0 0)', .5) → 'inset(0 50% 0 0)'. Also used for SVG path morphing
// between *compatible* paths (same commands, same number count).
const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
export function hexToRgba(h) {
  h = h.slice(1); if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16), a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r},${g},${b},${+a.toFixed(3)})`;
}
export function normColor(s) {
  return String(s).replace(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi, hexToRgba)
    .replace(/rgb\(\s*([^,)]+),\s*([^,)]+),\s*([^,)]+)\)/g, 'rgba($1,$2,$3,1)');
}
export function lerpStr(a, b, p) {
  if (a === b) return b;
  const na = a.match(NUM) || [], nb = b.match(NUM) || [];
  if (na.length !== nb.length || !na.length) return p < 1 ? a : b;
  let i = 0;
  return b.replace(NUM, () => { const x = parseFloat(na[i]), y = parseFloat(nb[i]); i++; return String(Math.round((x + (y - x) * p) * 1000) / 1000); });
}
export function numbersOf(s) { return (String(s).match(NUM) || []).length; }
export function compatible(a, b) { return String(a).replace(NUM, '#') === String(b).replace(NUM, '#'); }

export const TF = { x: 'px', y: 'px', z: 'px', scale: '', scaleX: '', scaleY: '', rotate: 'deg', rotateX: 'deg', rotateY: 'deg', skewX: 'deg', skewY: 'deg' };
export const UNITLESS = { opacity: 1, zIndex: 1, fontWeight: 1, lineHeight: 1, flexGrow: 1, flexShrink: 1, order: 1, draw: 1, scale: 1, scaleX: 1, scaleY: 1, fontStretch: 0 };
export const TF_ID = { x: '0px', y: '0px', z: '0px', scale: '1', scaleX: '1', scaleY: '1', rotate: '0deg', rotateX: '0deg', rotateY: '0deg', skewX: '0deg', skewY: '0deg', opacity: '1', blur: '0px', draw: '1', brightness: '1' };
export function toStr(prop, v) {
  if (typeof v === 'number') {
    if (prop in TF) return v + TF[prop];
    if (prop === 'blur') return v + 'px';
    if (prop === 'fontStretch') return v + '%';
    if (UNITLESS[prop] || prop === 'brightness' || prop.startsWith('attr:') || prop.startsWith('--')) return String(v);
    return v + 'px';
  }
  return normColor(v);
}
export function camel(p) { return p.startsWith('--') || p.startsWith('attr:') ? p : p.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }
// compose transform shorthands into a CSS transform string
export function composeTransform(tf) {
  let s = '';
  if (tf.z) s += `translate3d(${tf.x || '0px'},${tf.y || '0px'},${tf.z}) `;
  else if (tf.x || tf.y) s += `translate(${tf.x || '0px'},${tf.y || '0px'}) `;
  if (tf.rotate) s += `rotate(${tf.rotate}) `;
  if (tf.rotateX) s += `rotateX(${tf.rotateX}) `;
  if (tf.rotateY) s += `rotateY(${tf.rotateY}) `;
  if (tf.scale) s += `scale(${tf.scale}) `;
  if (tf.scaleX || tf.scaleY) s += `scale(${tf.scaleX || 1},${tf.scaleY || 1}) `;
  if (tf.skewX) s += `skewX(${tf.skewX}) `;
  if (tf.skewY) s += `skewY(${tf.skewY}) `;
  return s.trim();
}
