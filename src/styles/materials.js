// Materials: how a style paints a polygon piece (character parts and world props alike).
//   paint(piece, P) → SVG markup in the piece's own coordinates
//     piece = {pts (closed polygon) | line: polyline + w, holes: [polys] (cut out), orn: [polys] (ornaments: carved /
//              gilded / scribbled depending on the material), col (resolved colour), far (far-side limb → darker),
//              role, seed, op, cls}
//   defs(v, P) installs SVG filters / patterns once per video; group(P, kind) → attributes for a character / layer <g>
//   dyn(P, col) → attributes for a dynamic path (ribbons) whose d is rewritten per frame
// P = the resolved style options (palette + material params). DOM-free except defs().
import { polyD, smoothD, wobble, strokeOutline, ellipse } from './geom.js';
import { shade, mix, rgba } from './color.js';

const esc = s => String(s).replace(/"/g, '&quot;');
const shapeD = (pts, o) => (o.smooth ? smoothD(pts, true) : polyD(pts, true));
const holesD = (piece, f) => (piece.holes || []).map(h => ' ' + f(h)).join('');
const farCol = (piece, k = -.16) => (piece.far ? shade(piece.col, k) : piece.col);
function svgDefs(v, id, inner) {
  if (document.getElementById(id)) return;
  const w = document.createElement('div');
  w.innerHTML = `<svg id="${id}" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${inner}</defs></svg>`;
  (v.stage || document.body).appendChild(w.firstElementChild);
}
const lineOf = (piece, f = 1) => polyD(strokeOutline(piece.line, (piece.w || 3) * f, piece.taper !== false), true);

export const MATERIALS = {
  // 剪纸: scissor-cut edges (seeded normal wobble), flat colour, ornaments cut out as holes (evenodd), lifted shadow
  cut: {
    label: '剪纸（剪刀毛边 · 平涂 · 镂空 · 投影）',
    defs(v, P) { if (v && v.stage && window.vk) window.vk.gl.paperCut(v, { prefix: 'pc', seed: P.seed || 4, shadow: P.shadow || [3, 5, 3, .35] }); },
    group: (P, kind) => (kind === 'char' ? 'filter="url(#pc-shadow)"' : kind === 'layer' ? 'filter="url(#pc)"' : ''),
    paint(p, P) {
      const amp = P.cutAmp != null ? P.cutAmp : .9, W = pts => polyD(wobble(pts, { amp, step: p.step || 5, seed: p.seed || 1 }), true);
      if (p.line) return `<path d="${W(strokeOutline(p.line, (p.w || 3) * 1.15))}" fill="${farCol(p)}"/>`;
      const holes = (p.holes || []).concat(p.orn || []);
      return `<path d="${W(p.pts)}${holes.map(h => ' ' + W(h)).join('')}" fill="${farCol(p)}"${holes.length ? ' fill-rule="evenodd"' : ''}${p.op != null ? ` opacity="${p.op}"` : ''}/>`;
    },
    dyn: (P, col) => `fill="${col}"`,
  },
  // 水墨: pale wash fill + wobbling brush outline (ink-line filter from vk.installInk)
  ink: {
    label: '水墨（淡彩晕染 + 毛笔勾线）',
    defs(v, P) { if (v && v.stage && window.vk && !document.querySelector('#ink-line')) window.vk.installInk({ seed: P.seed || 7 }); },
    group: (P, kind) => (kind === 'char' ? 'filter="url(#ink-wob)"' : ''),
    paint(p, P) {
      const ink = P.ink || '#1f2529', paper = P.paper || '#e4e5d8';
      if (p.line) return `<path d="${lineOf(p, 1.25)}" fill="${ink}" opacity="${p.op != null ? p.op : .92}"/>`;
      const wash = mix(farCol(p, -.1), paper, P.wash != null ? P.wash : .28), lw = p.role === 'skin' || p.role === 'eyeW' ? 1.8 : 2.6;
      return `<path d="${smoothD(p.pts, true)}${holesD(p, h => smoothD(h, true))}" fill="${wash}" fill-rule="evenodd" stroke="${ink}" stroke-width="${p.lw || lw}" stroke-linejoin="round"${p.op != null ? ` opacity="${p.op}"` : ''}/>`;
    },
    dyn: (P, col) => `fill="${mix(col, P.paper || '#e4e5d8', .2)}" stroke="${P.ink || '#1f2529'}" stroke-width="1.6" stroke-linejoin="round"`,
  },
  // flat vector (product promo): clean smooth shapes, no outline, soft back-side shade
  flat: {
    label: '扁平矢量（平滑形 · 无描边 · 侧光）',
    defs() { },
    group: () => '',
    paint(p, P) {
      if (p.line) return `<path d="${lineOf(p)}" fill="${p.col}"/>`;
      return `<path d="${smoothD(p.pts, true)}${holesD(p, h => smoothD(h, true))}" fill="${farCol(p, -.22)}" fill-rule="evenodd"${p.op != null ? ` opacity="${p.op}"` : ''}/>`;
    },
    dyn: (P, col) => `fill="${col}"`,
  },
  // 皮影: translucent dyed leather, dark tooled outline, carved ornaments (holes), multiply onto the lit screen
  leather: {
    label: '皮影（半透明染色皮 · 镂刻花纹 · 背光）',
    defs(v) {
      svgDefs(v, 'vk-sp-defs', `<filter id="sp-leather" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035 .09" numOctaves="3" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .2  0 0 0 0 .08  0 0 0 -.9 .55" result="v"/><feComposite in="v" in2="SourceAlpha" operator="in" result="vv"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="vv"/></feMerge></filter>`);
    },
    group: (P, kind) => (kind === 'char' ? 'filter="url(#sp-leather)" style="mix-blend-mode:multiply"' : kind === 'layer' ? 'style="mix-blend-mode:multiply"' : ''),
    paint(p, P) {
      const line = P.line || '#3a2112';
      if (p.line) return `<path d="${lineOf(p, 1.1)}" fill="${line}"/>`;
      const holes = (p.holes || []).concat(p.orn || []), d = polyD(p.pts, true) + holes.map(h => ' ' + polyD(h, true)).join('');
      return `<path d="${d}" fill="${farCol(p, -.12)}" fill-opacity="${p.op != null ? p.op : (P.alpha || .8)}" fill-rule="evenodd" stroke="${line}" stroke-width="${p.lw || 2.2}" stroke-linejoin="round"/>`;
    },
    dyn: (P, col) => `fill="${col}" fill-opacity=".75" stroke="${P.line || '#3a2112'}" stroke-width="1.6"`,
  },
  // 重彩装饰 (大闹天宫): saturated flat colour, bold dark contour, gilded ornaments
  decor: {
    label: '重彩装饰（饱和平涂 · 粗墨线 · 描金纹样）',
    defs() { },
    group: () => '',
    paint(p, P) {
      const line = P.line || '#2a160e', gold = P.gold || '#e9b949';
      if (p.line) return `<path d="${lineOf(p, 1.15)}" fill="${line}"/>`;
      let s = `<path d="${smoothD(p.pts, true)}${holesD(p, h => smoothD(h, true))}" fill="${farCol(p, -.14)}" fill-rule="evenodd" stroke="${line}" stroke-width="${p.lw || 3.2}" stroke-linejoin="round"${p.op != null ? ` opacity="${p.op}"` : ''}/>`;
      if (p.orn && p.orn.length) s += `<path d="${p.orn.map(h => smoothD(h, true)).join(' ')}" fill="${gold}" stroke="${line}" stroke-width="1.1"/>`;
      return s;
    },
    dyn: (P, col) => `fill="${col}" stroke="${P.line || '#2a160e'}" stroke-width="2.4" stroke-linejoin="round"`,
  },
  // 赛博霓虹: dark body, glowing coloured contour (SVG blur-merge glow in each stroke's own colour)
  neon: {
    label: '霓虹线描（暗底 · 发光轮廓）',
    defs(v) {
      svgDefs(v, 'vk-neon-defs', `<filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b2"/><feColorMatrix in="b2" type="matrix" values="1.6 0 0 0 0  0 1.6 0 0 0  0 0 1.6 0 0  0 0 0 1.4 0" result="b3"/><feMerge><feMergeNode in="b3"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
    },
    group: (P, kind) => (kind === 'char' || kind === 'layer' ? 'filter="url(#neon-glow)"' : ''),
    paint(p, P) {
      const body = P.body || '#07050f';
      if (p.line) return `<path d="${polyD(p.line, false)}" fill="none" stroke="${p.col}" stroke-width="${(p.w || 3) * .8}" stroke-linecap="round" stroke-linejoin="round"/>`;
      const col = p.far ? mix(p.col, body, .35) : p.col;
      let s = `<path d="${smoothD(p.pts, true)}" fill="${p.fill || body}" fill-opacity="${p.fillOp != null ? p.fillOp : .92}" stroke="${col}" stroke-width="${p.lw || 2.6}" stroke-linejoin="round"/>`;
      if (p.orn && p.orn.length) s += `<path d="${p.orn.map(h => smoothD(h, true)).join(' ')}" fill="none" stroke="${col}" stroke-width="1.3" opacity=".8"/>`;
      return s;
    },
    dyn: (P, col) => `fill="${P.body || '#07050f'}" fill-opacity=".6" stroke="${col}" stroke-width="2.4" stroke-linejoin="round"`,
  },
  // 像素: flat fills + thick dark outline; the scene is pixelated by the pack's post filter (vk.style … post.pixel)
  pixel: {
    label: '像素（平涂 + 粗描边，整帧像素化）',
    defs() { },
    group: () => '',
    paint(p, P) {
      const line = P.line || '#1a1c2c';
      if (p.line) return `<path d="${lineOf(p, 1.6)}" fill="${line}"/>`;
      return `<path d="${polyD(p.pts, true)}${holesD(p, h => polyD(h, true))}" fill="${farCol(p, -.2)}" fill-rule="evenodd" stroke="${line}" stroke-width="${p.lw || 5}" stroke-linejoin="miter" paint-order="stroke"${p.op != null ? ` opacity="${p.op}"` : ''}/>`;
    },
    dyn: (P, col) => `fill="${col}" stroke="${P.line || '#1a1c2c'}" stroke-width="4" paint-order="stroke"`,
  },
  // 蜡笔绘本: waxy fill with paper tooth showing through, rough wobbly outline, boil (seed stepped by the pack)
  crayon: {
    label: '蜡笔（蜡质颗粒 · 纸纹透出 · 抖动描边）',
    defs(v, P) {
      svgDefs(v, 'vk-cr-defs', `<filter id="cr-wax" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency=".9 .12" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.15" result="tooth"/><feComposite in="SourceGraphic" in2="tooth" operator="in" result="wax"/><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="5" result="w"/><feDisplacementMap in="wax" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>`
        + `<filter id="cr-line" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence class="cr-boil" type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="2" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="4.5" xChannelSelector="R" yChannelSelector="G"/></filter>`);
    },
    group: (P, kind) => (kind === 'char' || kind === 'layer' ? 'filter="url(#cr-line)"' : ''),
    paint(p, P) {
      const line = P.line || '#3b2a20';
      if (p.line) return `<path d="${lineOf(p, 1.2)}" fill="${shade(p.col, -.2)}" opacity=".9"/>`;
      const col = farCol(p, -.14), d = smoothD(p.pts, true) + holesD(p, h => smoothD(h, true));
      let s = `<path d="${d}" fill="${col}" fill-rule="evenodd" filter="url(#cr-wax)"${p.op != null ? ` opacity="${p.op}"` : ''}/>`;
      if (p.role !== 'eye' && p.role !== 'mouth' && p.role !== 'pupil') s += `<path d="${smoothD(p.pts, true)}" fill="none" stroke="${p.outline || shade(col, -.42)}" stroke-width="${p.lw || 2.4}" stroke-linejoin="round" opacity=".85"/>`;
      if (p.orn && p.orn.length) s += `<path d="${p.orn.map(h => smoothD(h, true)).join(' ')}" fill="${shade(col, .35)}" filter="url(#cr-wax)"/>`;
      return s;
    },
    dyn: (P, col) => `fill="${col}" stroke="${shade(col, -.4)}" stroke-width="2"`,
  },
};
export const material = id => MATERIALS[id] || MATERIALS.flat;
export { esc, rgba };
