// Story → film plan (pure, DOM-free; used by `vk make` and vk.film). Markdown format:
//
//   # 小芽放风筝                       title
//   sub: 一个很短的故事                  optional header lines (key: value) before the first scene
//   narrator: zh-CN-XiaoxiaoNeural      narrator voice (default: the style's voice)
//   cast 小芽: pony yellow girl          cast line: hair style / colour hue names / girl|boy|elder|kid / a voice id
//
//   ## 山坡 @ field day flowers          scene heading: name @ setting words (see vk.style.parseSetting)
//   > 山坡上，住着一个叫小芽的孩子。      narration line
//   小芽: 今天风真大！                   dialogue line (speaker from the cast; unknown names join the cast)
//   - 小芽 enter left                   action: <who> <verb> [arg] — anchored to the line above it (or the scene start)
//   - shot close 小芽                   camera: shot <wide|full|medium|close|…> [who|all]   · - punch
//   - effect                            the style's signature effect (at the last named actor's hand)
//   - sfx big · - hold 1.5 · - transition strong
//
// JSON input uses the same shape as the parsed result: {title, sub, narrator, cast:[{id, look, voice}], scenes:[…]}.
export const VERBS = ['enter', 'exit', 'walk', 'run', 'wave', 'cheer', 'point', 'talk', 'bow', 'surprise', 'think', 'look', 'sad', 'jump', 'idle', 'face', 'turn'];
export const GESTURE_DUR = { wave: 1.6, cheer: 1.6, point: 1.5, talk: 1.6, bow: 1.4, surprise: 1.2, think: 2, look: 1.6, sad: 2, jump: 1.1, idle: .6 };
const HAIR = ['bun', 'twinbuns', 'pony', 'long', 'short', 'cap', 'bald'];
const HUE = ['red', 'deepred', 'gold', 'yellow', 'blue', 'green', 'teal', 'brown', 'orange', 'pink', 'purple', 'grey', 'cream', 'black', 'white'];
export const VOICES = { girl: 'zh-CN-XiaoyiNeural', boy: 'zh-CN-YunxiaNeural', kid: 'zh-CN-YunxiaNeural', woman: 'zh-CN-XiaoxiaoNeural', man: 'zh-CN-YunxiNeural', elder: 'zh-CN-YunyangNeural', grandma: 'zh-CN-XiaoxiaoNeural' };
const VERB_ZH = { 进场: 'enter', 走进: 'enter', 登场: 'enter', 离开: 'exit', 退场: 'exit', 走: 'walk', 跑: 'run', 挥手: 'wave', 欢呼: 'cheer', 指: 'point', 说: 'talk', 鞠躬: 'bow', 吃惊: 'surprise', 想: 'think', 抬头: 'look', 难过: 'sad', 跳: 'jump', 站: 'idle', 转身: 'turn' };

// cast tokens → {look, voice, kind}
export function castSpec(id, tokens = []) {
  const look = {}, out = { id, look };
  const hues = [];
  for (const t of tokens.map(s => String(s).trim()).filter(Boolean)) {
    if (HAIR.includes(t)) look.hairStyle = t;
    else if (HUE.includes(t)) hues.push(t);
    else if (VOICES[t]) { out.kind = t; out.voice = out.voice || VOICES[t]; }
    else if (/^[a-z]{2}-[A-Z]{2}-/.test(t)) out.voice = t;
    else if (/^(rate|pitch)=/.test(t)) out[t.split('=')[0]] = t.split('=')[1];
    else if (/^\w+=/.test(t)) { const [k, v] = t.split('='); look[k] = v; }
  }
  if (hues[0]) { look.cloth = hues[0]; look.cloth2 = hues[0]; }
  if (hues[1]) { look.trim = hues[1]; look.sash = hues[1]; look.scarf = hues[1]; }
  if (hues[2]) look.pants = hues[2];
  return out;
}
const clean = s => s.replace(/\s+/g, ' ').trim();
export function parseStory(src) {
  if (typeof src === 'object') return normalise(src);
  const txt = String(src).replace(/\r/g, '');
  if (/^\s*\{/.test(txt)) return normalise(JSON.parse(txt));
  const S = { title: '', sub: '', cast: [], scenes: [] }; let cur = null;
  const cast = id => { let c = S.cast.find(x => x.id === id); if (!c) { c = castSpec(id); S.cast.push(c); } return c; };
  for (const raw of txt.split('\n')) {
    const line = raw.trim(); if (!line || /^<!--/.test(line)) continue;
    let m;
    if ((m = /^#\s+(.+)$/.exec(line))) { S.title = clean(m[1]); continue; }
    if ((m = /^##\s+(.+)$/.exec(line))) {
      const [name, setting] = m[1].split(/\s*[@|]\s*/);
      cur = { name: clean(name).replace(/^\d+[.、]?\s*/, '') || 'scene ' + (S.scenes.length + 1), setting: clean(setting || ''), lines: [], actions: [] };
      S.scenes.push(cur); continue;
    }
    if (!cur) {
      if ((m = /^cast\s+([^:：]+)[:：]\s*(.*)$/i.exec(line))) { const c = castSpec(clean(m[1]), m[2].split(/[\s,，]+/)); const i = S.cast.findIndex(x => x.id === c.id); if (i >= 0) S.cast[i] = c; else S.cast.push(c); continue; }
      if ((m = /^([a-z]+)\s*[:：]\s*(.+)$/i.exec(line))) { S[m[1].toLowerCase()] = clean(m[2]); continue; }
      continue;
    }
    if ((m = /^>\s*(?:旁白\s*[:：])?\s*(.+)$/.exec(line))) { cur.lines.push({ text: clean(m[1]) }); continue; }
    if ((m = /^[-*]\s+(.+)$/.exec(line))) { const a = parseAction(clean(m[1]), S); if (a) { a.line = cur.lines.length - 1; cur.actions.push(a); if (a.who) cast(a.who); } continue; }
    if ((m = /^([^\s:：>#-][^:：]{0,11})\s*[:：]\s*(.+)$/.exec(line))) { const who = clean(m[1]); cast(who); cur.lines.push({ who, text: clean(m[2]) }); continue; }
    cur.lines.push({ text: clean(line) });   // bare text = narration
  }
  return normalise(S);
}
export function parseAction(s, S = { cast: [] }) {
  const w = s.split(/\s+/), head = w[0].toLowerCase();
  if (head === 'shot' || head === '镜头') { const ids = S.cast.map(c => c.id); const on = w.slice(2).join(' ') || null; return { do: 'shot', shot: w[1] || 'medium', on: on && (on === 'all' || ids.includes(on) ? on : on) }; }
  if (head === 'punch') return { do: 'punch', amount: w[1] ? +w[1] : null };
  if (head === 'effect' || head === '特效') return { do: 'effect', name: w[1] || 'signature' };
  if (head === 'sfx') return { do: 'sfx', kind: w[1] || 'big' };
  if (head === 'hold') return { do: 'hold', dur: +w[1] || 1 };
  if (head === 'transition') return { do: 'transition', kind: w[1] || 'default' };
  if (head === 'title') return { do: 'title', text: w.slice(1).join(' ') };
  const verb = (VERB_ZH[w[1]] || (w[1] || 'idle').toLowerCase());
  if (!VERBS.includes(verb)) return { do: 'unknown', text: s };
  return { do: verb, who: w[0], arg: w.slice(2).join(' ') || null };
}
function normalise(S) {
  const out = { title: S.title || '', sub: S.sub || '', narrator: S.narrator || S.voice || null, style: S.style || null, rate: S.rate || null, cast: [], scenes: [] };
  out.cast = (S.cast || []).map(c => (typeof c === 'string' ? castSpec(c) : { look: {}, ...c }));
  out.scenes = (S.scenes || []).map((sc, i) => ({ name: sc.name || 'scene ' + (i + 1), setting: sc.setting || '', lines: (sc.lines || []).map(l => (typeof l === 'string' ? { text: l } : l)), actions: (sc.actions || []).map(a => ({ line: -1, ...a })), dur: sc.dur || null, transition: sc.transition || null }));
  for (const sc of out.scenes) for (const x of [...sc.lines, ...sc.actions]) if (x.who && !out.cast.find(c => c.id === x.who)) out.cast.push(castSpec(x.who));
  return out;
}
// characters that appear in a scene (named in a line or an action), in order of first mention
export function sceneCast(sc) { const ids = []; for (const x of [...sc.actions, ...sc.lines]) if (x.who && !ids.includes(x.who)) ids.push(x.who); return ids; }
// horizontal slots (fractions of the width) for n actors
export function slots(n) { return n <= 1 ? [.42] : n === 2 ? [.33, .66] : Array.from({ length: n }, (_, i) => .2 + .6 * i / (n - 1)); }
// timeline for one actor: [{do, t0, t1, from, to, ...}] given anchor times (line starts) — pure
export function actorPlan(actions, who, anchors, o = {}) {
  const speed = o.speed || 150, runSpeed = o.runSpeed || 330, W = o.W || 1280, home = o.home != null ? o.home : W * .42;
  const segs = []; let x = home, end = 0, visible = true;
  const mine = actions.filter(a => a.who === who);
  if (mine.length && mine[0].do === 'enter') { const side = /right|右/.test(mine[0].arg || '') ? 1 : -1; x = side > 0 ? W + 140 : -140; visible = false; }
  const x0 = x;
  for (const a of mine) {
    const t0 = Math.max(anchors(a.line), end);
    if (['enter', 'exit', 'walk', 'run'].includes(a.do)) {
      let to = home;
      if (a.do === 'exit') to = /left|左/.test(a.arg || '') ? -160 : /right|右/.test(a.arg || '') ? W + 160 : (x < W / 2 ? -160 : W + 160);
      else if (a.do !== 'enter' && a.arg) to = /left|左/.test(a.arg) ? W * .25 : /right|右/.test(a.arg) ? W * .72 : /center|centre|中/.test(a.arg) ? W * .5 : isFinite(+a.arg) ? +a.arg : home;
      const sp = a.do === 'run' ? runSpeed : speed, d = Math.max(.4, Math.abs(to - x) / sp + .35);
      segs.push({ do: a.do === 'run' ? 'run' : 'walk', t0, t1: t0 + d, from: x, to }); x = to; end = t0 + d;
    } else if (a.do === 'face' || a.do === 'turn') segs.push({ do: 'face', t0, t1: t0, dir: /left|左/.test(a.arg || '') ? -1 : /right|右/.test(a.arg || '') ? 1 : 0 });
    else { const d = a.arg && isFinite(+a.arg) ? +a.arg : (GESTURE_DUR[a.do] || 1.5); segs.push({ do: a.do, t0, t1: t0 + d }); end = t0 + d; }
  }
  return { x0, visible, segs, end };
}
