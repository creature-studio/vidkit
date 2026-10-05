#!/usr/bin/env python3
"""vidkit audio toolchain (Phase 2). Called by the node CLI (`vk analyze|align|tts|sync`), usable standalone.

  vkaudio.py analyze music.mp3 [-o music.beats.json] [--backend auto|beat_this|librosa] [--rate 50] [--bands 8]
  vkaudio.py align audio.wav [--text script.txt] [--lang zh|en] [--model small] [--separate] [-o audio.align.json]
  vkaudio.py tts request.json                    (request: {backend, voice, rate, outdir, items:[{id, text}]})
  vkaudio.py separate song.mp3 [-o vocals.wav]    (demucs htdemucs two-stem vocals)
  vkaudio.py sync video.mp4 [--beats x.beats.json --music-start s] [--words x.words.json]
  vkaudio.py doctor

Every command writes JSON (UTF-8) and prints a one-line summary. All times are seconds in the audio file's own
timeline (the engine applies `musicStart` offsets). Deterministic for a given input + model version.
"""
import argparse, json, math, os, re, subprocess, sys, shutil, hashlib, time, warnings

warnings.filterwarnings('ignore')
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
CACHE = os.path.expanduser(os.environ.get('VK_CACHE', '~/.cache/vidkit'))


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def r3(x):
    return float(round(float(x), 3))


def write_json(path, obj):
    os.makedirs(os.path.dirname(os.path.abspath(path)) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    return path


def load_audio(path, sr=22050):
    """Decode any format ffmpeg understands → mono float32 at sr (librosa ≥1.0 no longer falls back to audioread)."""
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def ffprobe_duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
    return float(out.strip() or 0)


def integrated_lufs(path):
    """EBU R128 integrated loudness + true peak via ffmpeg ebur128."""
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    txt = p.stderr[p.stderr.rfind('Summary:'):]
    I = re.search(r'I:\s+(-?[\d.]+) LUFS', txt)
    tp = re.search(r'Peak:\s+(-?[\d.]+) dBFS', txt)
    lra = re.search(r'LRA:\s+(-?[\d.]+) LU', txt)
    return {'integrated': float(I.group(1)) if I else None, 'truePeak': float(tp.group(1)) if tp else None, 'lra': float(lra.group(1)) if lra else None}


# ----------------------------------------------------------------------------------------------------------- analyze
def track_beats(y, sr, path, backend):
    """→ (beats, downbeats, tool). beat_this (CPJKU, ISMIR 2024) when available: beats + downbeats; else librosa."""
    if backend in ('auto', 'beat_this'):
        try:
            from beat_this.inference import Audio2Beats
            a2b = Audio2Beats(checkpoint_path='final0', device='cpu', dbn=False)
            b, d = a2b(y, sr)
            return [float(x) for x in b], [float(x) for x in d], 'beat_this final0 (CPJKU, ISMIR 2024)'
        except Exception as e:  # noqa
            if backend == 'beat_this':
                raise
            log('[analyze] beat_this unavailable (%s) → librosa' % str(e).splitlines()[0][:120])
    import librosa
    _, bt = librosa.beat.beat_track(y=y, sr=sr, units='time', trim=False, tightness=100)
    return [float(x) for x in bt], None, 'librosa.beat.beat_track %s' % librosa.__version__


def analyze(a):
    import numpy as np, librosa
    t0 = time.time()
    path = a.audio
    sr = 22050
    y = load_audio(path, sr)
    dur = len(y) / sr
    beats, downbeats, tool = track_beats(y, sr, path, a.backend)
    beats = np.array(beats)

    # onsets (spectral flux, ~5.8 ms resolution)
    hop_o = 128
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_o)
    ofr = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop_o, backtrack=False, units='frames', wait=int(0.06 * sr / hop_o), delta=0.07)
    otimes = librosa.frames_to_time(ofr, sr=sr, hop_length=hop_o)
    ostr = oenv[ofr] / (oenv.max() + 1e-9) if len(ofr) else np.array([])

    raw = beats.copy()
    shifts = []
    # 1) de-jitter: local least-squares line through ±smooth beats (neural trackers quantise to 20 ms frames);
    #    only where the local tempo is steady, so rubato / tempo changes survive
    if a.smooth > 0 and len(beats) > 2 * a.smooth + 1:
        sm = beats.copy(); w = a.smooth
        for i in range(len(beats)):
            lo, hi = max(0, i - w), min(len(beats), i + w + 1)
            idx = np.arange(lo, hi); seg = beats[lo:hi]
            d = np.diff(seg)
            if len(d) >= 2 and d.std() < .08 * d.mean():
                k, c = np.polyfit(idx, seg, 1)
                sm[i] = k * i + c
        beats = sm
    # 2) global phase: shift the grid so beats sit on the audible transients (median offset to strong onsets ≤ refine ms)
    if a.refine > 0 and len(otimes):
        win = a.refine / 1000.0
        strong = otimes[ostr >= np.median(ostr)] if len(ostr) else otimes
        d = np.array([strong[np.argmin(np.abs(strong - b))] - b for b in beats])
        d = d[np.abs(d) <= win]
        if len(d) > len(beats) * .3:
            off = float(np.median(d)); beats = beats + off; shifts = [off]
    # 3) optional per-beat snap to the nearest strong onset (live / expressive playing)
    if a.snap > 0 and len(otimes):
        med = float(np.median(ostr)) if len(ostr) else 0
        for i, b in enumerate(beats):
            j = int(np.argmin(np.abs(otimes - b)))
            if abs(otimes[j] - b) <= a.snap / 1000.0 and ostr[j] >= med:
                beats[i] = otimes[j]
    beats = np.maximum.accumulate(beats)
    ibi = np.diff(beats)
    bpm = 60.0 / float(np.median(ibi)) if len(ibi) else 0
    if len(beats) > 8:  # global tempo = slope of a robust line fit through the beat times (median IBI is biased by 20 ms quantisation)
        idx = np.arange(len(beats)); med = float(np.median(ibi))
        keep = np.r_[True, np.abs(ibi - med) < .25 * med]
        slope = np.polyfit(idx[keep], beats[keep], 1)[0]
        bpm = 60.0 / slope

    # downbeats: neural when available (snapped to refined beats), else phase with the strongest low-frequency onsets
    if downbeats is not None and len(downbeats):
        db_idx = sorted(set(int(np.argmin(np.abs(raw - d))) for d in downbeats))
    else:
        S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop_o))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
        low = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[freqs < 200]), sr=sr, hop_length=hop_o)
        bf = np.clip(librosa.time_to_frames(beats, sr=sr, hop_length=hop_o), 0, len(low) - 1)
        scores = [float(np.mean(low[bf[p::4]])) if len(bf[p::4]) else 0 for p in range(4)]
        ph = int(np.argmax(scores))
        db_idx = list(range(ph, len(beats), 4))
        tool += ' + low-band downbeat phase heuristic'
    # beat position inside its bar (1-based) and meter
    pos = []
    k = 0
    for i in range(len(beats)):
        while k + 1 < len(db_idx) and db_idx[k + 1] <= i:
            k += 1
        pos.append(i - db_idx[k] + 1 if db_idx and i >= db_idx[0] else ((i - db_idx[0]) % 4 + 5 if db_idx else (i % 4) + 1))
    gaps = np.diff(db_idx)
    meter = int(np.bincount(gaps).argmax()) if len(gaps) else 4
    pos = [((p - 1) % meter) + 1 for p in pos]
    downs = beats[db_idx] if db_idx else np.array([])

    # energy envelopes at `rate` Hz
    hop_e = int(round(sr / a.rate))
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop_e, center=True)[0]
    db = 20 * np.log10(rms + 1e-6)
    top = float(np.percentile(db, 99.5))
    floor = top - a.range
    loud = np.clip((db - floor) / (top - floor), 0, 1)
    rmsn = np.clip(rms / (np.percentile(rms, 99.5) + 1e-9), 0, 1)
    M = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=2048, hop_length=hop_e, n_mels=max(a.bands, 3), fmin=30, fmax=11000)
    Mdb = librosa.power_to_db(M, ref=np.max)
    bands = []
    for row in Mdb:  # per-band contrast: p10 → 0, p99.5 → 1 (compressed masters otherwise sit near 1 all the time)
        lo_, hi = np.percentile(row, 10), np.percentile(row, 99.5)
        bands.append(np.clip((row - lo_) / max(hi - lo_, 6), 0, 1) ** 1.3)
    S2 = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop_e)) ** 2
    fr = librosa.fft_frequencies(sr=sr, n_fft=2048)

    def band(lo, hi):
        e = 10 * np.log10(S2[(fr >= lo) & (fr < hi)].sum(axis=0) + 1e-10)
        l_, h = np.percentile(e, 10), np.percentile(e, 99.5)
        return np.clip((e - l_) / max(h - l_, 6), 0, 1)
    low, mid, high = band(20, 200), band(200, 2000), band(2000, 11025)
    n = min(len(loud), len(low), Mdb.shape[1])

    # sections: Foote novelty on bar-synchronous chroma+MFCC (+ loudness jumps), boundaries snapped to downbeats
    sections = []
    try:
        hop_f = 512
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop_f)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop_f, n_mfcc=13)
        F = np.vstack([librosa.util.normalize(chroma, axis=0), (mfcc - mfcc.mean(1, keepdims=True)) / (mfcc.std(1, keepdims=True) + 1e-9) * .5])
        grid = downs if len(downs) >= 8 else beats[::4]
        gf = librosa.time_to_frames(grid, sr=sr, hop_length=hop_f)
        Fs = librosa.util.sync(F, gf, aggregate=np.median)          # columns: [0,g0), [g0,g1), …
        Fs = Fs[:, 1:]                                              # bar i = [grid[i], grid[i+1])
        nb = Fs.shape[1]
        Xn = Fs / (np.linalg.norm(Fs, axis=0, keepdims=True) + 1e-9)
        SSM = Xn.T @ Xn
        L = 4
        g = np.exp(-np.linspace(-1.5, 1.5, 2 * L) ** 2)
        K = np.outer(g, g) * np.outer(np.r_[-np.ones(L), np.ones(L)], np.r_[-np.ones(L), np.ones(L)])
        P = np.pad(SSM, L, mode='edge')
        nov = np.array([np.sum(K * P[i:i + 2 * L, i:i + 2 * L]) for i in range(nb)])
        nov = np.maximum(nov, 0)
        tb = librosa.time_to_frames(grid, sr=sr, hop_length=hop_e)
        lbar = np.array([loud[tb[i]:tb[i + 1]].mean() if i + 1 < len(tb) and tb[i + 1] > tb[i] else loud[min(tb[i], len(loud) - 1)] for i in range(nb)])
        jump = np.abs(np.diff(np.r_[lbar[0], lbar]))
        score = nov / (nov.max() + 1e-9) + .6 * jump / (jump.max() + 1e-9)
        inner = score[2:max(3, nb - 2)]                              # kernel edges (intro/fade-out padding) excluded from the stats
        thr = inner.mean() + .5 * inner.std()
        cand = [i for i in range(2, nb - 2) if score[i] >= score[max(2, i - 2):min(nb - 2, i + 3)].max() and score[i] > thr]
        cand.sort(key=lambda i: -score[i])
        if os.environ.get('VK_DEBUG'): log('[sections] grid', len(grid), 'score', np.round(score, 2).tolist(), 'cand', cand)
        chosen = []
        for i in cand:  # at least 4 bars apart, at most ~1 section per 12 s
            if all(abs(i - j) >= 4 for j in chosen) and len(chosen) < max(2, int(dur / 12)):
                chosen.append(i)
        bounds = [0.0] + sorted(float(grid[i]) for i in chosen) + [dur]
        feats = []
        for s0, s1 in zip(bounds[:-1], bounds[1:]):
            m = ((grid >= s0 - 1e-3) & (grid < s1 - 1e-3))[:nb]
            v = Xn[:, m].mean(1) if m.any() else Xn.mean(1)
            e0, e1 = int(s0 * a.rate), max(int(s0 * a.rate) + 1, int(s1 * a.rate))
            feats.append((v / (np.linalg.norm(v) + 1e-9), float(loud[e0:e1].mean())))
        labels, protos = [], []
        for v, _ in feats:
            sims = [float(v @ p) for p in protos]
            if sims and max(sims) > .96:
                labels.append(chr(65 + int(np.argmax(sims))))
            else:
                protos.append(v)
                labels.append(chr(65 + len(protos) - 1))
        for (s0, s1), lab, (_, en) in zip(zip(bounds[:-1], bounds[1:]), labels, feats):
            sections.append({'start': r3(s0), 'end': r3(s1), 'label': lab, 'energy': r3(en)})
    except Exception as e:  # noqa
        log('[analyze] sections failed:', e)
        sections = [{'start': 0.0, 'end': r3(dur), 'label': 'A', 'energy': r3(loud.mean())}]

    q = lambda arr: [float(round(float(x), 3)) for x in arr[:n]]
    res = {
        'vidkit': 'beats', 'version': 1, 'source': os.path.basename(path), 'duration': r3(dur), 'sr': sr,
        'tool': {'beats': tool, 'onsets': 'librosa.onset (spectral flux, hop 5.8 ms)', 'librosa': librosa.__version__, 'smooth': a.smooth, 'refineMs': a.refine,
                 'phaseShiftMs': r3(shifts[0] * 1000) if shifts else 0, 'snapMs': a.snap},
        'bpm': r3(bpm), 'meter': meter,
        'beats': [r3(b) for b in beats], 'beatPos': pos,
        'downbeats': [r3(b) for b in downs],
        'onsets': [r3(t) for t in otimes], 'onsetStrength': [r3(s) for s in ostr],
        'loudness': integrated_lufs(path),
        'envelope': {'rate': a.rate, 'loud': q(loud), 'rms': q(rmsn), 'low': q(low), 'mid': q(mid), 'high': q(high),
                     'bands': [q(b) for b in bands[:a.bands]] if a.bands else []},
        'sections': sections,
    }
    out = a.out or re.sub(r'\.[^.]+$', '', path) + '.beats.json'
    write_json(out, res)
    print('[analyze] %s  %.1fs  bpm=%.2f  beats=%d  bars=%d (meter %d)  onsets=%d  sections=%s  %s  (%.1fs) → %s' % (
        os.path.basename(path), dur, bpm, len(beats), len(downs), meter, len(otimes), ''.join(s['label'] for s in sections),
        'LUFS %.1f' % res['loudness']['integrated'] if res['loudness']['integrated'] is not None else '', time.time() - t0, out))
    return res


# ----------------------------------------------------------------------------------------------------------- separate
def separate(audio, out=None, model='htdemucs'):
    """Demucs two-stem separation → vocals wav (cached by content hash)."""
    h = hashlib.sha1(open(audio, 'rb').read()).hexdigest()[:12]
    out = out or os.path.join(CACHE, 'demucs', h + '.vocals.wav')
    if os.path.exists(out):
        return out
    import demucs.separate
    tmp = os.path.join(CACHE, 'demucs', 'tmp-' + h)
    os.makedirs(tmp, exist_ok=True)
    log('[separate] demucs %s --two-stems vocals (CPU, ~0.5-1× realtime)…' % model)
    demucs.separate.main(['--two-stems', 'vocals', '-n', model, '-o', tmp, '--filename', '{stem}.{ext}', audio])
    src = os.path.join(tmp, model, 'vocals.wav')
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    shutil.move(src, out)
    shutil.rmtree(tmp, ignore_errors=True)
    return out


# ----------------------------------------------------------------------------------------------------------- align
CJK = re.compile(r'[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]')
PUNCT = re.compile(r'^[\s\.,!?;:…、，。！？；：“”‘’"\'()（）《》【】\-—~·]+$')


def split_units(word, start, end, chars):
    """Split a whisper token into display units: CJK → one unit per character (time split by character count),
    punctuation stays attached to the previous unit; latin words stay whole."""
    w = word.strip()
    if not w:
        return []
    if not chars or not CJK.search(w):
        return [{'w': w, 't': r3(start), 'end': r3(end)}]
    units = []
    for ch in w:
        if units and (PUNCT.match(ch) or not (CJK.search(ch) or ch.isalnum())):
            units[-1]['w'] += ch
        elif units and ch.isalnum() and not CJK.search(ch) and not CJK.search(units[-1]['w'][-1]):
            units[-1]['w'] += ch  # digits / latin inside a CJK token stay together
        else:
            units.append({'w': ch})
    n = len(units)
    for i, u in enumerate(units):
        u['t'] = r3(start + (end - start) * i / n)
        u['end'] = r3(start + (end - start) * (i + 1) / n)
    return units


def load_model(name):
    import stable_whisper
    return stable_whisper.load_faster_whisper(name, device='cpu', compute_type='int8')


def detect_lang(text):
    return 'zh' if CJK.search(text or '') else 'en'


def align_text(model, audio, lines, lang):
    """Forced alignment of known lines → per-line words (with char mapping back to the original lines)."""
    joined = ' '.join(lines)
    samples = load_audio(audio, 16000) if isinstance(audio, str) else audio   # 16 kHz mono float32, decoded by ffmpeg
    res = model.align(samples, joined, language=lang, vad=False, verbose=None)
    words = [(w.word, float(w.start), float(w.end)) for s in res.segments for w in s.words]
    # map words back to lines by counting non-space characters
    bounds, c = [], 0
    for ln in lines:
        c += len(re.sub(r'\s+', '', ln))
        bounds.append(c)
    out = [{'text': ln, 'words': []} for ln in lines]
    pos, li = 0, 0
    for w, s, e in words:
        k = len(re.sub(r'\s+', '', w))
        if k == 0:
            continue
        mid = pos + k / 2
        while li < len(bounds) - 1 and mid > bounds[li]:
            li += 1
        out[li]['words'].append((w, s, e))
        pos += k
    return out


def finish_lines(raw, chars=True):
    lines = []
    for L in raw:
        units = []
        for w, s, e in L['words']:
            units += split_units(w, s, e, chars)
        units = [u for u in units if not PUNCT.match(u['w'])] or units
        if not units:
            continue
        lines.append({'start': units[0]['t'], 'end': units[-1]['end'], 'text': L['text'].strip(), 'words': units})
    return lines


def repair_and_refine(lines, audio=None, snap=True):
    """Post-process forced alignment: (1) repair gross outliers (a word parked >1 s away from its line-mates, a known
    failure at phrase edges), (2) snap word starts to vocal onsets (phrase-initial words are often ~0.1-0.3 s late)."""
    import numpy as np
    for L in lines:
        W = L['words']
        if len(W) < 2:
            continue
        md = float(np.clip(np.median([w['end'] - w['t'] for w in W]), .12, .5))
        # clusters split at >1 s gaps; the biggest one is trusted, stragglers are chained onto it
        cl, cur = [], [0]
        for i in range(1, len(W)):
            if W[i]['t'] - W[i - 1]['end'] > 1.0:
                cl.append(cur); cur = []
            cur.append(i)
        cl.append(cur)
        if len(cl) > 1:
            best = max(cl, key=lambda c: sum(len(W[i]['w']) for i in c))
            for i in range(best[-1] + 1, len(W)):
                W[i]['t'] = r3(W[i - 1]['end'] + .04); W[i]['end'] = r3(W[i]['t'] + md)
            for i in range(best[0] - 1, -1, -1):
                W[i]['end'] = r3(W[i + 1]['t'] - .04); W[i]['t'] = r3(W[i]['end'] - md)
    if snap and audio:
        import librosa
        sr, hop = 16000, 160
        y = load_audio(audio, sr)
        env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
        on = librosa.frames_to_time(librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, backtrack=True, delta=.05), sr=sr, hop_length=hop)
        if len(on):
            prev_end = -9
            for L in lines:
                for i, w in enumerate(L['words']):
                    initial = i == 0 or w['t'] - prev_end > .25
                    c = on[(on >= max(w['t'] - .3, prev_end)) & (on <= w['t'] + .02)] if initial else []
                    if len(c):
                        nt = float(c[np.argmin(np.abs(c - w['t']))])
                        w['t'] = r3(nt); w['end'] = r3(max(w['end'], nt + .05))
                    prev_end = w['t'] + .03
                L['start'] = L['words'][0]['t']; L['end'] = L['words'][-1]['end']
    return lines


def align(a):
    t0 = time.time()
    audio = a.audio
    src = audio
    if a.separate:
        audio = separate(audio)
    text = None
    if a.text:
        text = open(a.text, encoding='utf-8').read()
    lines_in = [l.strip() for l in (text or '').splitlines() if l.strip() and not l.strip().startswith('#')]
    lang = a.lang or (detect_lang(text) if text else None)
    model = load_model(a.model)
    if lines_in:
        raw = align_text(model, audio, lines_in, lang)
        mode = 'forced-align'
    else:
        res = model.transcribe(load_audio(audio, 16000), language=lang, word_timestamps=True, vad=False, verbose=None,
                               initial_prompt='以下是普通话的句子，使用简体中文。' if lang == 'zh' else None)
        lang = lang or res.language
        raw = [{'text': s.text.strip(), 'words': [(w.word, float(w.start), float(w.end)) for w in s.words]} for s in res.segments]
        mode = 'transcribe'
    lines = finish_lines(raw, chars=not a.words_only)
    if not a.no_refine:
        lines = repair_and_refine(lines, audio)
    res = {'vidkit': 'align', 'version': 1, 'audio': os.path.basename(src), 'separated': bool(a.separate), 'lang': lang, 'mode': mode,
           'tool': 'stable-ts %s + faster-whisper %s (%s, int8 CPU)' % (_ver('stable_whisper'), _ver('faster_whisper'), a.model),
           'lines': lines}
    out = a.out or re.sub(r'\.[^.]+$', '', src) + '.align.json'
    write_json(out, res)
    nw = sum(len(l['words']) for l in lines)
    print('[align] %s  %s  lang=%s  lines=%d  units=%d  (%.1fs) → %s' % (os.path.basename(src), mode, lang, len(lines), nw, time.time() - t0, out))
    return res


def _ver(mod):
    try:
        m = __import__(mod)
        return getattr(m, '__version__', '?')
    except Exception:
        return 'n/a'


# ----------------------------------------------------------------------------------------------------------- tts
async def _edge(text, voice, rate, pitch, out_mp3):
    import edge_tts
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary='WordBoundary')
    words = []
    with open(out_mp3, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append((ch['text'], ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7))
    return words


def tts(a):
    import asyncio
    req = json.load(open(a.request, encoding='utf-8'))
    backend = req.get('backend', 'edge')
    voice = req.get('voice') or ('zh-CN-YunxiNeural' if backend == 'edge' else 'zh_CN-huayan-medium')
    rate, pitch = req.get('rate', '+0%'), req.get('pitch', '+0Hz')
    outdir = req['outdir']
    os.makedirs(outdir, exist_ok=True)
    model = None
    results = []
    for it in req['items']:
        text = it['text']
        base = os.path.join(outdir, it['id'])
        ext = '.mp3' if backend == 'edge' else '.wav'
        audio, meta = base + ext, base + '.json'
        if os.path.exists(audio) and os.path.exists(meta) and not req.get('force'):
            results.append(json.load(open(meta, encoding='utf-8')))
            continue
        t0 = time.time()
        if backend == 'edge':
            for attempt in range(3):
                try:
                    raw = asyncio.run(_edge(text, voice, rate, pitch, audio))
                    break
                except Exception as e:  # network hiccup
                    if attempt == 2:
                        raise
                    log('[tts] edge retry', e)
                    time.sleep(2)
            lines = finish_lines(_map_words_to_text(text, raw), chars=True)
            how = 'edge-tts WordBoundary'
        elif backend == 'piper':
            vpath = voice if voice.endswith('.onnx') else os.path.join(CACHE, 'piper', voice + '.onnx')
            if not os.path.exists(vpath):
                raise SystemExit('piper voice not found: %s (download .onnx + .onnx.json from huggingface.co/rhasspy/piper-voices)' % vpath)
            exe = os.path.join(os.path.dirname(sys.executable), 'piper')
            subprocess.run([exe, '-m', vpath, '-f', audio, '--sentence-silence', '0.25'], input=text, text=True, check=True, capture_output=True)
            model = model or load_model(req.get('alignModel', 'small'))
            lines = finish_lines(align_text(model, audio, [text], detect_lang(text)), chars=True)
            how = 'piper + stable-ts forced alignment'
        else:
            raise SystemExit('unknown tts backend ' + backend)
        dur = ffprobe_duration(audio)
        words = [w for l in lines for w in l['words']]
        r = {'id': it['id'], 'text': text, 'file': os.path.basename(audio), 'duration': r3(dur), 'voice': voice, 'backend': backend, 'words': words, 'timing': how}
        env = _mouth_env(audio)
        if env:
            r['env'] = env
        write_json(meta, r)
        results.append(r)
        log('[tts] %s %.2fs %d units (%.1fs) %s' % (it['id'], dur, len(words), time.time() - t0, text[:40]))
    print(json.dumps({'items': results}, ensure_ascii=False))


def _mouth_env(audio, rate=50):
    """Lip-sync envelope: per 1/rate s window, rms loudness (0..1, normalised to the clip's 95th percentile) and
    spectral centroid (0..1 between the clip's 5th/95th voiced percentiles; low = rounded 'O', high = spread 'E'). Needs numpy; returns None without it."""
    try:
        import numpy as np
    except Exception:
        return None
    sr = 16000
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    hop = sr // rate
    n = len(x) // hop
    if n < 2:
        return None
    fr = x[:n * hop].reshape(n, hop) * np.hanning(hop)[None, :]
    rms = np.sqrt((fr ** 2).mean(axis=1))
    ref = np.percentile(rms, 95) or 1.0
    rms = np.clip(rms / ref, 0, 1)
    spec = np.abs(np.fft.rfft(fr, axis=1))
    f = np.fft.rfftfreq(hop, 1.0 / sr)
    band = f <= 4000
    cen = (spec[:, band] * f[band][None, :]).sum(axis=1) / (spec[:, band].sum(axis=1) + 1e-9)
    voiced = cen[rms > .25]
    lo, hi = (np.percentile(voiced, 5), np.percentile(voiced, 95)) if len(voiced) > 4 else (0.0, 4000.0)
    cen = (cen - lo) / max(1.0, hi - lo)   # relative to this voice: 0 = darkest (rounded), 1 = brightest (spread)
    return {'rate': rate, 'rms': [round(float(v), 3) for v in rms], 'cen': [round(float(v), 3) for v in np.clip(cen, 0, 1)]}


def _map_words_to_text(text, words):
    """edge-tts boundaries omit punctuation; keep them as (word, start, end) for finish_lines."""
    return [{'text': text, 'words': words}]


# ----------------------------------------------------------------------------------------------------------- sync
def sync(a):
    """Measure A/V sync of a rendered MP4.
    Beat mode: visual hit frames (sharp luma rises) vs audio onsets detected in the MP4's own soundtrack.
    Words mode: re-align the MP4 soundtrack against the caption text and compare with the caption word times."""
    import numpy as np, librosa
    path = a.video
    fps_s = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip()
    num, den = (fps_s.strip().strip(',').split('/') + ['1'])[:2]
    fps = float(num) / float(den)
    frame = 1 / fps
    report = {'video': os.path.basename(path), 'fps': fps}
    sr = 22050
    y = load_audio(path, sr)
    if a.words:
        W = json.load(open(a.words, encoding='utf-8'))
        caps = [c for c in W['captions'] if c.get('words')]
        lines = [c['text'] for c in caps]
        tmpwav = os.path.join(CACHE, 'sync-%d.wav' % os.getpid())
        os.makedirs(CACHE, exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vn', '-ac', '1', '-ar', '16000', tmpwav], check=True)
        model = load_model(a.model)
        raw = align_text(model, tmpwav, lines, detect_lang(''.join(lines)))
        got = finish_lines(raw, chars=True)
        os.remove(tmpwav)
        diffs = []
        gmap = {l['text']: l for l in got}
        for c in caps:
            g = gmap.get(c['text'].strip())
            if not g:
                continue
            gw = g['words']
            for i, w in enumerate(c['words']):
                if i < len(gw):
                    diffs.append(w['t'] - gw[i]['t'])
        d = np.array(diffs)
        report['words'] = {'n': int(len(d)), 'medianMs': r3(np.median(d) * 1000), 'meanAbsMs': r3(np.mean(np.abs(d)) * 1000),
                           'p90AbsMs': r3(np.percentile(np.abs(d), 90) * 1000), 'within1Frame': r3(np.mean(np.abs(d) <= frame + 1e-3)),
                           'within100ms': r3(np.mean(np.abs(d) <= .1)),
                           'note': 'caption highlight time − independently re-aligned word start in the final mix (negative = highlight early)'}
    if a.beats or not a.words:
        # audio onsets from the rendered soundtrack
        hop = 128
        oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
        of = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, backtrack=False, wait=int(.06 * sr / hop), delta=.07)
        on = librosa.frames_to_time(of, sr=sr, hop_length=hop)
        # visual hits: per-frame mean luma; a hit = a positive jump well above the typical frame-to-frame change
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', 'scale=64:36,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
        fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 36 * 64).astype(np.float32)
        luma = fr.mean(1)
        dl = np.diff(luma, prepend=luma[0])
        thr = max(a.min_jump, np.percentile(np.abs(dl), 90) * 1.5)
        hits = [i for i in range(1, len(dl) - 1) if dl[i] > thr and dl[i] >= dl[i - 1] and dl[i] >= dl[i + 1]]
        vt = np.array(hits) / fps
        report['visualHits'] = int(len(vt))
        report['audioOnsets'] = int(len(on))
        if len(vt) and len(on):
            d = np.array([t - on[np.argmin(np.abs(on - t))] for t in vt])
            m = np.abs(d) < .25
            d = d[m]
            report['hitsVsOnsets'] = {'matched': int(m.sum()), 'medianMs': r3(np.median(d) * 1000), 'meanMs': r3(np.mean(d) * 1000),
                                      'frames': {str(k): int(np.sum(np.round(d / frame) == k)) for k in range(-3, 4)},
                                      'within1Frame': r3(np.mean((d >= -frame - 1e-3) & (d <= frame + 1e-3))),
                                      'late': int(np.sum(d > frame / 2)),
                                      'note': 'visual hit frame time − nearest audio onset in the MP4 (negative = picture leads)'}
        if a.beats:
            B = json.load(open(a.beats, encoding='utf-8'))
            bt = np.array(B['beats']) - (a.music_start or 0)
            bt = bt[(bt >= 0) & (bt <= len(luma) / fps)]
            if len(vt) and len(bt):
                d = np.array([t - bt[np.argmin(np.abs(bt - t))] for t in vt])
                d = d[np.abs(d) < .25]
                report['hitsVsBeats'] = {'matched': int(len(d)), 'medianMs': r3(np.median(d) * 1000), 'late': int(np.sum(d > frame / 2)),
                                         'onBeatOrOneFrameEarly': r3(np.mean((d >= -frame - 1e-3) & (d <= frame / 2))),
                                         'frames': {str(k): int(np.sum(np.round(d / frame) == k)) for k in range(-3, 4)},
                                         'within1Frame': r3(np.mean((d >= -frame - 1e-3) & (d <= frame + 1e-3)))}
            # the soundtrack itself: are the analysed beats still where the mux put them? (offset / drift check)
            if len(on) and len(bt):
                d = np.array([b - on[np.argmin(np.abs(on - b))] for b in bt])
                d = d[np.abs(d) < .06]
                report['beatsVsMuxedOnsets'] = {'matched': int(len(d)), 'medianMs': r3(np.median(d) * 1000) if len(d) else None,
                                                'note': 'analysed beat times vs onsets re-detected in the MP4 audio: ≈0 means the mux kept the music aligned'}
    if a.out:
        write_json(a.out, report)
    print(json.dumps(report, ensure_ascii=False, indent=1))
    return report


# ----------------------------------------------------------------------------------------------------------- doctor
def doctor(a):
    ok = {}
    for mod in ['numpy', 'librosa', 'soundfile', 'faster_whisper', 'stable_whisper', 'edge_tts', 'piper', 'torch', 'demucs', 'beat_this']:
        try:
            m = __import__(mod)
            ok[mod] = getattr(m, '__version__', 'ok')
        except Exception as e:
            ok[mod] = None
    ok['ffmpeg'] = shutil.which('ffmpeg')
    for k, v in ok.items():
        print('  %-15s %s' % (k, v or 'MISSING'))
    return ok


def main():
    p = argparse.ArgumentParser(prog='vkaudio')
    sp = p.add_subparsers(dest='cmd', required=True)
    x = sp.add_parser('analyze'); x.add_argument('audio'); x.add_argument('-o', '--out')
    x.add_argument('--backend', default='auto', choices=['auto', 'beat_this', 'librosa'])
    x.add_argument('--rate', type=int, default=50, help='envelope sample rate (Hz)')
    x.add_argument('--bands', type=int, default=8, help='mel bands in the envelope (0 = none)')
    x.add_argument('--range', type=float, default=36, help='dB range mapped to loud 0..1')
    x.add_argument('--smooth', type=int, default=4, help='de-jitter beats with a local line fit over ±N beats (0 = off)')
    x.add_argument('--refine', type=float, default=40, help='shift the beat grid by the median offset to strong onsets within ±ms (0 = off)')
    x.add_argument('--snap', type=float, default=0, help='additionally snap each beat to a strong onset within ±ms (live music)')
    x = sp.add_parser('align'); x.add_argument('audio'); x.add_argument('-o', '--out'); x.add_argument('--text'); x.add_argument('--lang')
    x.add_argument('--model', default='small'); x.add_argument('--separate', action='store_true'); x.add_argument('--words-only', action='store_true')
    x.add_argument('--no-refine', action='store_true', help='skip outlier repair + onset snapping')
    x = sp.add_parser('tts'); x.add_argument('request')
    x = sp.add_parser('separate'); x.add_argument('audio'); x.add_argument('-o', '--out')
    x = sp.add_parser('sync'); x.add_argument('video'); x.add_argument('--beats'); x.add_argument('--music-start', type=float, default=0)
    x.add_argument('--words'); x.add_argument('--model', default='small'); x.add_argument('--min-jump', type=float, default=4.0); x.add_argument('-o', '--out')
    sp.add_parser('doctor')
    a = p.parse_args()
    if a.cmd == 'separate':
        print(separate(a.audio, a.out))
        return
    {'analyze': analyze, 'align': align, 'tts': tts, 'sync': sync, 'doctor': doctor}[a.cmd](a)


if __name__ == '__main__':
    main()
