// stagger(each, {from:'start'|'center'|'end'|'random'|index, grid:[cols,rows], seed}) → (i, n) => delay
export function stagger(each, o = {}) {
  return function (i, n) {
    const from = o.from || 'start'; let d;
    if (o.grid) {
      const cols = o.grid[0], rows = o.grid[1] || Math.ceil(n / cols); let cx, cy;
      if (from === 'center') { cx = (cols - 1) / 2; cy = (rows - 1) / 2; }
      else if (from === 'end') { cx = cols - 1; cy = rows - 1; }
      else if (typeof from === 'number') { cx = from % cols; cy = Math.floor(from / cols); }
      else { cx = 0; cy = 0; }
      const x = i % cols, y = Math.floor(i / cols);
      d = Math.hypot(x - cx, y - cy);
    } else if (from === 'center') d = Math.abs(i - (n - 1) / 2);
    else if (from === 'end') d = n - 1 - i;
    else if (from === 'random') { const s = Math.sin((i + 1) * 12.9898 + (o.seed || 0) * 78.233) * 43758.5453; d = (s - Math.floor(s)) * (n - 1); }
    else if (typeof from === 'number') d = Math.abs(i - from);
    else d = i;
    return d * each;
  };
}
export function staggerOf(st) { return typeof st === 'function' ? st : st ? stagger(st) : null; }
