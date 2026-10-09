#!/usr/bin/env python3
"""Assemble the PayTrace demo video from the owner's recording, rendered cards and narration."""
import json, os, re, subprocess, sys

SRC = '../video/owner.mp4'
FPS = 30
BG = '0xf7f9f4'
LEAD = 0.25      # silence before narration starts in each scene
TAIL = 0.55      # silence after narration ends
os.makedirs('segs', exist_ok=True)
os.makedirs('scenes', exist_ok=True)

FULL = (0, 0, 2880, 1620)
Z_WALLET = (1180, 0, 1700, 956)
Z_FORM = (462, 0, 2418, 1360)
Z_CHECKOUT = (330, 150, 2200, 1237)
Z_LEFT = (0, 60, 2130, 1198)
Z_DASH_LOW = (0, 180, 2880, 1620)
Z_VERIFY = (250, 120, 2380, 1339)
MM_TOP = (2120, 60, 740, 1050)
MM_BOTTOM = (2120, 1240, 740, 550)

script = json.load(open('script.json'))
words = {k: json.load(open(f'vo/{k}.json')) for k in script}

def dur(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]))

def W(scene, word, nth=1):
    """Scene-local time at which the narrator starts saying `word`."""
    n = 0
    for a, b, t in words[scene]:
        if t.lower().strip('.,') == word.lower():
            n += 1
            if n == nth:
                return a + LEAD
    raise KeyError(f'{scene}: {word} #{nth}')

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(cmd)); print(r.stderr[-3000:]); sys.exit(1)

ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', str(FPS)]

def footage(out, start, end, crop=FULL, speed=1.0):
    x, y, w, h = crop
    vf = f'crop={w}:{h}:{x}:{y},scale=1920:1080:flags=lanczos,setpts=(PTS-STARTPTS)/{speed},fps={FPS}'
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', str(end - start), '-i', SRC, '-vf', vf, '-an', *ENC, out])

def still(out, png, d, pan=False):
    vf = 'scale=2016:1134,crop=1920:1080:x=\'96*t/%f\':y=\'54*t/%f\'' % (d, d) if pan else 'scale=1920:1080'
    run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-t', str(d), '-i', png, '-vf', vf + ',format=yuv420p', *ENC, out])

def metamask(out, start, end, crop, speed, side='png/mmside.png'):
    """Show a crop of the MetaMask popup beside an explanatory panel."""
    x, y, w, h = crop
    tw = 760 if h > 700 else 820
    th = round(h * tw / w)
    th = min(th, 1000)
    tw = round(w * th / h) // 2 * 2
    px, py = 1960 - tw - 130, (1080 - th) // 2
    d = (end - start) / speed
    fc = (f'[1:v]crop={w}:{h}:{x}:{y},scale={tw}:{th // 2 * 2}:flags=lanczos,setpts=(PTS-STARTPTS)/{speed},fps={FPS}[p];'
          f'[0:v]drawbox=x={px - 10}:y={py - 10}:w={tw + 20}:h={th // 2 * 2 + 20}:color=0x1f4532@0.10:t=fill[b];'
          f'[b][p]overlay={px}:{py}:shortest=1')
    run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-t', str(d), '-i', side,
         '-ss', str(start), '-t', str(end - start), '-i', SRC, '-filter_complex', fc, '-an', *ENC, '-t', str(d), out])

# ---------------------------------------------------------------- edit list
# Each scene: list of shots. ('f', start, end, crop, speed) | ('img', png, dur) | ('pan', png, dur) | ('mm', start, end, crop, speed)
# Card reveals use word timings so the visuals land on the narration.
def states(scene, seq, total):
    """seq: [(png, start_time)] -> img shots filling `total` seconds."""
    shots = []
    for i, (png, t0) in enumerate(seq):
        t1 = seq[i + 1][1] if i + 1 < len(seq) else total
        shots.append(('img', png, round(t1 - t0, 3)))
    return shots

def L(scene, extra=0.0):
    return round(LEAD + dur(f'vo/{scene}.mp3') + TAIL + extra, 3)

SCENES = {
    's01': dict(shots=states('s01', [('png/hook_0.png', 0), ('png/hook_1.png', W('s01', 'which')), ('png/hook_2.png', W('s01', 'is')),
                                     ('png/hook_3.png', W('s01', 'and')), ('png/hook_4.png', W('s01', 'screenshots'))], L('s01', 0.3))),
    's02': dict(shots=states('s02', [('png/intro_0.png', 0), ('png/intro_1.png', W('s02', 'your')), ('png/intro_2.png', W('s02', 'paytrace', 2))], L('s02', 0.4))),
    's03': dict(chip='png/chip1.png', shots=[('f', 0.3, 4.0, FULL, 1.0), ('f', 18.6, 23.8, Z_WALLET, 1.0)]),
    's04': dict(chip='png/chip2.png', shots=[('f', 27.0, 36.6, Z_FORM, 1.7), ('f', 43.2, 49.6, Z_FORM, 1.7)]),
    's05': dict(chip='png/chip3.png', shots=[('f', 59.0, 61.6, Z_FORM, 1.0), ('f', 65.6, 68.0, Z_DASH_LOW, 1.0), ('f', 69.6, 74.6, FULL, 1.6)]),
    's06': dict(chip='png/chip4.png', shots=[('f', 79.9, 82.7, Z_CHECKOUT, 0.33)]),
    's07': dict(chip='png/chip4.png', shots=[('f', 82.7, 85.5, Z_CHECKOUT, 1.0), ('mm', 100.0, 101.3, MM_TOP, 0.33), ('mm', 100.9, 101.74, MM_BOTTOM, 0.5)]),
    's08': dict(chip='png/chip5.png', badge=('png/badge10.png', W('s08', 'received')), shots=[('f', 102.0, 110.5, FULL, 0.75), ('f', 110.5, 113.5, Z_LEFT, 1.0)]),
    's09': dict(chip='png/chip6.png', shots=[('f', 111.0, 118.0, Z_LEFT, 1.4), ('f', 121.5, 126.5, FULL, 1.0)]),
    's10': dict(chip='png/chip7.png', shots=[('f', 136.0, 141.8, FULL, 1.0), ('f', 145.6, 147.6, FULL, 1.0)]),
    's11': dict(chip='png/chip8.png', shots=[('f', 170.2, 173.8, Z_VERIFY, 1.0), ('f', 188.0, 197.6, Z_VERIFY, 1.2)]),
    's12': dict(shots=states('s12', [('png/rules_0.png', 0), ('pages/guide_review.png', W('s12', 'it', 2)), ('png/rules_1.png', W('s12', 'and', 1)),
                                     ('png/rules_2.png', W('s12', 'requests'))], L('s12', 0.8))),
    's13': dict(shots=states('s13', [('png/monad_0.png', 0), ('png/monad_1.png', W('s13', 'for')), ('png/monad_2.png', W('s13', 'that'))], L('s13'))),
    's14': dict(shots=states('s14', [('pages/home_view.png', 0), ('png/built.png', W('s14', 'merchant')), ('png/end.png', W('s14', 'paytrace', 2))], L('s14', 1.8))),
}

def build_scene(name, spec):
    parts = []
    for i, shot in enumerate(spec['shots']):
        out = f'segs/{name}_{i}.mp4'
        kind = shot[0]
        if kind == 'f': footage(out, *shot[1:])
        elif kind == 'mm': metamask(out, *shot[1:])
        elif kind == 'img': still(out, shot[1], shot[2], pan=shot[1].startswith('pages/'))
        parts.append(out)
    with open(f'segs/{name}.txt', 'w') as f:
        f.writelines(f"file '{os.path.basename(p)}'\n" for p in parts)
    raw = f'segs/{name}_raw.mp4'
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'segs/{name}.txt', '-c', 'copy', raw])
    vlen = dur(raw)
    total = max(vlen, L(name))
    vf = f'[0:v]tpad=stop_mode=clone:stop_duration={total - vlen + 0.1:.3f},trim=duration={total:.3f},setpts=PTS-STARTPTS[v0]'
    inputs = ['-i', raw]
    last = 'v0'
    n = 1
    if 'chip' in spec:
        inputs += ['-loop', '1', '-framerate', str(FPS), '-i', spec['chip']]
        vf += f';[{last}][{n}:v]overlay=0:0:shortest=1:enable=\'between(t,0.35,{total - 0.2:.2f})\'[v{n}]'; last = f'v{n}'; n += 1
    if 'badge' in spec:
        png, t0 = spec['badge']
        inputs += ['-loop', '1', '-framerate', str(FPS), '-i', png]
        vf += f';[{last}][{n}:v]overlay=0:0:shortest=1:enable=\'gte(t,{t0:.2f})\'[v{n}]'; last = f'v{n}'; n += 1
    vf += f';[{last}]fade=t=in:st=0:d=0.25:color={BG},fade=t=out:st={total - 0.25:.3f}:d=0.25:color={BG}[vout]'
    audio = f'[{n}:a]adelay={int(LEAD * 1000)}:all=1,apad,atrim=duration={total:.3f},aresample=48000[aout]'
    run(['ffmpeg', '-v', 'error', '-y', *inputs, '-i', f'vo/{name}.mp3', '-filter_complex', vf + ';' + audio,
         '-map', '[vout]', '-map', '[aout]', *ENC, '-c:a', 'aac', '-b:a', '192k', '-t', f'{total:.3f}', f'scenes/{name}.mp4'])
    return total

# ---------------------------------------------------------------- captions
def ass_time(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'

def captions(offsets):
    lines = []
    for name, off in offsets:
        toks = script[name].split()
        ws = words[name]
        times, j = [], 0
        for tok in toks:
            key = re.sub(r"[^a-z0-9']", '', tok.lower())
            k = j
            while k < len(ws) and re.sub(r"[^a-z0-9']", '', ws[k][2].lower()) != key and k < j + 3:
                k += 1
            if k < len(ws) and re.sub(r"[^a-z0-9']", '', ws[k][2].lower()) == key:
                times.append((ws[k][0], ws[k][1])); j = k + 1
            else:
                prev = times[-1] if times else (0, 0)
                times.append((prev[1], prev[1] + 0.25))
        chunk, start = [], None
        chunks = []
        for tok, (a, b) in zip(toks, times):
            if start is None: start = a
            chunk.append(tok)
            text = ' '.join(chunk)
            if tok[-1] in '.?!:' or (tok[-1] == ',' and len(text) > 22) or len(text) > 40:
                chunks.append((start, b, text)); chunk, start = [], None
        if chunk: chunks.append((start, times[-1][1], ' '.join(chunk)))
        for i, (a, b, text) in enumerate(chunks):
            end = chunks[i + 1][0] if i + 1 < len(chunks) else b + 0.4
            lines.append((off + LEAD + a, off + LEAD + min(end, b + 0.6), text))
    head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,DM Sans 9pt,46,&H00FFFFFF,&H00FFFFFF,&H2032451F,&H00000000,-1,0,0,0,100,100,0,0,3,14,0,2,200,200,56,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open('captions.ass', 'w') as f:
        f.write(head)
        for a, b, t in lines:
            f.write(f'Dialogue: 0,{ass_time(a)},{ass_time(b)},Cap,,0,0,0,,{t}\n')

if __name__ == '__main__':
    only = sys.argv[1:]
    offsets, t = [], 0.0
    for name, spec in SCENES.items():
        if not only or name in only:
            d = build_scene(name, spec); print(name, round(d, 2), flush=True)
        offsets.append((name, t)); t += dur(f'scenes/{name}.mp4')
    print('total', round(t, 2))
    captions(offsets)
    with open('scenes/list.txt', 'w') as f:
        f.writelines(f"file '{n}.mp4'\n" for n in SCENES)
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'scenes/list.txt', '-c', 'copy', 'joined.mp4'])
    run(['ffmpeg', '-v', 'error', '-y', '-i', 'joined.mp4', '-vf', 'ass=captions.ass:fontsdir=fonts', *ENC, '-c:a', 'copy', '-movflags', '+faststart', 'paytrace-demo.mp4'])
    print('done', round(dur('paytrace-demo.mp4'), 2))
