// Word-level timing helpers (DOM-free): align/TTS JSON → caption cues, text↔word mapping, caption chunking.
// A word is {w, t, end} in seconds (video time). Chinese is usually one unit per character.

const PUNCT = /[\s.,!?;:…、，。！？；：“”‘’"'()（）《》【】\-—~·]/;
const norm = s => String(s).replace(new RegExp(PUNCT.source, 'g'), '').toLowerCase();

// Locate each word inside `text` in order → pieces [{s, wi}] (wi = word index, -1 for text between words).
// Words that cannot be found (ASR drift) are skipped; their neighbours still map.
export function mapWords(text, words) {
  const pieces = [], T = String(text); let pos = 0;
  words.forEach((w, wi) => {
    const key = norm(w.w); if (!key) return;
    // find the span in T starting at/after pos whose normalised content equals key
    for (let a = pos; a < T.length; a++) {
      if (PUNCT.test(T[a])) continue;
      let b = a, acc = '';
      while (b < T.length && acc.length < key.length) { if (!PUNCT.test(T[b])) acc += T[b].toLowerCase(); b++; }
      if (acc === key) {
        if (a > pos) pieces.push({ s: T.slice(pos, a), wi: -1 });
        pieces.push({ s: T.slice(a, b), wi }); pos = b; return;
      }
      if (a - pos > 40) break;   // give up on this word, keep scanning with the next one
    }
  });
  if (pos < T.length) pieces.push({ s: T.slice(pos), wi: -1 });
  return pieces;
}

// Align JSON ({lines:[{start,end,text,words}]}) → caption cues [start, end, text, words] shifted by -offset.
export function alignToCues(data, o = {}) {
  const off = +o.offset || 0, hold = o.hold != null ? o.hold : .5, pre = o.pre != null ? o.pre : .15;
  const lines = (data.lines || []).filter(l => l.words && l.words.length);
  return lines.map((l, i) => {
    const words = l.words.map(w => ({ w: w.w, t: +(w.t - off).toFixed(3), end: +((w.end != null ? w.end : w.t + .2) - off).toFixed(3) }));
    const next = lines[i + 1], nextStart = next ? next.words[0].t - off - .05 : Infinity;
    const start = Math.max(0, words[0].t - pre), end = Math.min(nextStart, words[words.length - 1].end + hold);
    return [+start.toFixed(3), +Math.max(start + .3, end).toFixed(3), l.text, words];
  });
}

// Split one utterance (text + word timings, e.g. a TTS clip) into caption cues of ≤ maxChars reading units,
// breaking at punctuation first, then anywhere between words. `at` shifts the clip-relative word times.
export function chunkCues(text, words, o = {}) {
  const at = +o.at || 0, maxChars = o.maxChars || 18, hold = o.hold != null ? o.hold : .35;
  const W = words.map(w => ({ ...w, t: w.t + at, end: (w.end != null ? w.end : w.t + .2) + at }));
  const pieces = mapWords(text, W);
  // clauses: runs of pieces ending in hard/soft punctuation
  const clauses = []; let cur = [];
  pieces.forEach(p => { cur.push(p); if (p.wi < 0 && /[，。！？；：,.!?;:]/.test(p.s)) { clauses.push(cur); cur = []; } });
  if (cur.length) clauses.push(cur);
  const units = ps => ps.reduce((n, p) => n + readUnits(p.s), 0);
  const chunks = []; let acc = [];
  clauses.forEach(c => {
    const tiny = acc.length && units(acc) < 5, lim = tiny ? maxChars + 6 : maxChars;   // don't strand a 2-3 char clause
    if (acc.length && units(acc) + units(c) > lim) { chunks.push(acc); acc = []; }
    if (units(c) > maxChars) { // long clause: split between words
      let part = [];
      c.forEach(p => { if (part.length && units(part) + units([p]) > maxChars) { chunks.push(part); part = []; } part.push(p); });
      acc = part;
    } else acc = acc.concat(c);
  });
  if (acc.length) chunks.push(acc);
  const cues = [];
  chunks.forEach(ch => {
    const ws = ch.filter(p => p.wi >= 0).map(p => W[p.wi]); if (!ws.length) return;
    const txt = ch.map(p => p.s).join('').trim().replace(/[，,、；;：:]$/, '');
    cues.push([ws[0].t - .1, ws[ws.length - 1].end + hold, txt, ws.map(w => ({ w: w.w, t: +w.t.toFixed(3), end: +w.end.toFixed(3) }))]);
  });
  for (let i = 0; i < cues.length - 1; i++) cues[i][1] = Math.min(cues[i][1], cues[i + 1][0] - .04);
  return cues.map(c => [+c[0].toFixed(3), +c[1].toFixed(3), c[2], c[3]]);
}

// reading units: CJK char = 1, other visible char = 0.5 (matches vk qa)
export function readUnits(s) { let n = 0; for (const ch of String(s)) { if (/\s/.test(ch) || PUNCT.test(ch)) continue; n += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : .5; } return n; }

// rough speech duration estimate when no TTS audio exists yet (zh ≈ 4.3 chars/s, en ≈ 2.7 words/s)
export function estimateSpeech(text) {
  const cjk = (String(text).match(/[\u3400-\u9fff]/g) || []).length, latin = (String(text).match(/[A-Za-z0-9]+/g) || []).length;
  return +(cjk / 4.3 + latin / 2.7 + (String(text).match(/[，。！？,.!?；;]/g) || []).length * .15).toFixed(2);
}
