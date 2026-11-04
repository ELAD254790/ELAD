import os, sys, math, subprocess, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps, ImageChops
from timeline import *

HERE = os.path.dirname(os.path.abspath(__file__))
FD = os.path.join(HERE, 'fonts'); ID = os.path.join(HERE, 'img'); AD = os.path.join(HERE, 'audio')

# ---------------------------------------------------------------- palette
NAVY = (8, 12, 26); NAVY2 = (14, 22, 44)
LIME = (196, 218, 58); LIME_D = (120, 140, 20)
PURP = (93, 46, 94); PURP_B = (156, 62, 156)
RED = (255, 77, 90); WHITE = (255, 255, 255); GRAY = (150, 160, 180)

FONTS = {
    'h3': 'Heebo-300.ttf', 'h4': 'Heebo-400.ttf', 'h7': 'Heebo-700.ttf', 'h8': 'Heebo-800.ttf', 'h9': 'Heebo-900.ttf',
    'r9': 'Rubik-900.ttf', 'osw': 'Oswald-700.ttf', 'm4': 'Mono-400.ttf', 'm7': 'Mono-700.ttf', 'sec': 'Secular.ttf',
}

@functools.lru_cache(None)
def font(k, size):
    return ImageFont.truetype(os.path.join(FD, FONTS[k]), size, layout_engine=ImageFont.Layout.RAQM)

def is_heb(s): return any('֐' <= c <= '׿' for c in s)

@functools.lru_cache(None)
def tsprite(s, fk, size, fill=WHITE, stroke=0, sfill=(0, 0, 0)):
    f = font(fk, size)
    kw = dict(direction='rtl', language='he') if is_heb(s) else {}
    d0 = ImageDraw.Draw(Image.new('L', (1, 1)))
    bb = d0.textbbox((0, 0), s, font=f, anchor='ls', stroke_width=stroke, **kw)
    pad = 8 + stroke
    w = bb[2] - bb[0] + pad * 2; h = bb[3] - bb[1] + pad * 2
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    fill4 = fill if len(fill) == 4 else fill + (255,)
    d.text((pad - bb[0], pad - bb[1]), s, font=f, fill=fill4, anchor='ls', stroke_width=stroke, stroke_fill=sfill, **kw)
    return im

def twidth(s, fk, size):
    f = font(fk, size)
    kw = dict(direction='rtl', language='he') if is_heb(s) else {}
    return f.getlength(s, **kw)

@functools.lru_cache(None)
def glow_of(key_sprite_id, radius, color):
    spr = _GLOW_SRC[key_sprite_id]
    a = spr.getchannel('A')
    pad = radius * 3
    big = Image.new('L', (spr.width + pad * 2, spr.height + pad * 2), 0)
    big.paste(a, (pad, pad))
    big = big.filter(ImageFilter.GaussianBlur(radius))
    g = Image.new('RGBA', big.size, color + (0,)); g.putalpha(big)
    return g, pad
_GLOW_SRC = {}

def glow(spr, radius=14, color=LIME):
    k = id(spr); _GLOW_SRC[k] = spr
    return glow_of(k, radius, color)

def put(fr, spr, x, y, a=1.0, scale=1.0, anchor='c'):
    """composite spr onto fr. anchor c=center, r=right-middle, l=left-middle, tl"""
    if a <= 0.003 or spr is None: return
    if scale != 1.0:
        nw, nh = max(1, int(spr.width * scale)), max(1, int(spr.height * scale))
        spr = spr.resize((nw, nh), Image.BILINEAR)
    if a < 0.999:
        spr = spr.copy(); al = spr.getchannel('A').point(lambda v: int(v * a)); spr.putalpha(al)
    w, h = spr.size
    if anchor == 'c': x0, y0 = x - w / 2, y - h / 2
    elif anchor == 'r': x0, y0 = x - w, y - h / 2
    elif anchor == 'l': x0, y0 = x, y - h / 2
    else: x0, y0 = x, y
    x0, y0 = int(round(x0)), int(round(y0))
    sx0, sy0 = max(0, -x0), max(0, -y0)
    sx1, sy1 = min(w, W - x0), min(h, H - y0)
    if sx1 <= sx0 or sy1 <= sy0: return
    if (sx0, sy0, sx1, sy1) != (0, 0, w, h): spr = spr.crop((sx0, sy0, sx1, sy1))
    fr.alpha_composite(spr, (x0 + sx0, y0 + sy0))

def put_glow(fr, spr, x, y, a=1.0, radius=14, color=LIME, ga=0.8, scale=1.0):
    g, pad = glow(spr, radius, color)
    put(fr, g, x, y, a * ga, scale)
    put(fr, spr, x, y, a, scale)

# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def lin(t, t0, t1): return clamp((t - t0) / (t1 - t0)) if t1 != t0 else float(t >= t0)
def eo(x): return 1 - (1 - x) ** 3
def eio(x): return 3 * x * x - 2 * x * x * x
def eback(x, s=1.7): x -= 1; return x * x * ((s + 1) * x + s) + 1
def fade(t, t0, t1, fi=0.25, fo=0.25):
    return clamp(min((t - t0) / fi if fi else 1, (t1 - t) / fo if fo else 1))
def mix(a, b, x): return a + (b - a) * x

# ---------------------------------------------------------------- photos
def grade(im, sat=1.0, con=1.0, bri=1.0, tint=(0, 0, 0), tint_a=0.0, warm=0.0):
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Contrast(im).enhance(con)
    im = ImageEnhance.Brightness(im).enhance(bri)
    a = np.asarray(im).astype(np.float32)
    if warm:
        a[..., 0] *= 1 + 0.08 * warm; a[..., 2] *= 1 - 0.08 * warm
    if tint_a:
        a = a * (1 - tint_a) + np.array(tint, np.float32) * tint_a * (a.mean(axis=2, keepdims=True) / 128)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def load(name, up=1):
    im = Image.open(os.path.join(ID, name)).convert('RGB')
    if up != 1:
        im = im.resize((int(im.width * up), int(im.height * up)), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(2, 80, 2))
    return im

def edges(im, color=LIME, gain=3.0):
    e = im.convert('L').filter(ImageFilter.FIND_EDGES)
    e = e.point(lambda v: min(255, int(max(0, v - 18) * gain)))
    e = e.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.new('RGBA', im.size, color + (0,)); out.putalpha(e)
    return out

P = {}
def assets():
    if P: return
    tired = load('tired.png', 1.5)
    P['tired'] = grade(tired, 1.05, 1.08, 1.0, warm=0.6)
    P['tired_cold'] = grade(tired, 0.25, 1.15, 0.8, (60, 110, 160), 0.35)
    P['tired_edge'] = edges(tired)
    P['tired_bw'] = grade(tired, 0.0, 1.3, 0.75)
    run = load('run.png', 1.5)
    P['run'] = grade(run, 1.18, 1.08, 1.04, warm=0.8)
    P['run_m'] = grade(run, 0.55, 1.0, 0.95)
    gym = load('gym.png', 1.5)
    P['gym'] = grade(gym, 1.05, 1.06, 1.02, warm=0.3)
    P['gym_blur'] = grade(gym, 0.6, 0.9, 0.45).filter(ImageFilter.GaussianBlur(22))
    P['gym_m'] = grade(gym, 0.35, 1.05, 0.9)
    P['tablet'] = grade(load('tablet.png', 2.05), 1.05, 1.06, 1.0, warm=0.3)
    P['curl'] = grade(load('curl.png', 2.05), 1.08, 1.08, 1.02, warm=0.4)
    P['curl_m'] = grade(load('curl.png', 1.0), 0.8, 1.0, 1.0)
    P['shoulders'] = grade(load('shoulders.png', 2.05), 1.2, 1.08, 1.05, warm=0.8)
    P['logo'] = Image.open(os.path.join(ID, 'logo.png')).convert('RGBA')
    # scale factors source->stored
    P['_s'] = {'tired': 1.5, 'run': 1.5, 'gym': 1.5, 'tablet': 2.05, 'curl': 2.05, 'shoulders': 2.05}
    # grain + vignette
    r = np.random.default_rng(3)
    P['grain'] = [np.clip(r.normal(0, 9, (H // 2, W // 2)), -40, 40).astype(np.float32) for _ in range(6)]
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.6)) ** 2)
    P['vig'] = np.clip(1 - 0.55 * np.clip(d - 0.45, 0, 1) ** 1.4, 0, 1).astype(np.float32)[..., None]
    P['vo_rms'] = np.load(os.path.join(AD, 'vo_rms.npy'))
    P['mus_rms'] = np.load(os.path.join(AD, 'mus_rms.npy'))

def cam(key, cx, cy, vh, src_scale_key=None, shake=(0, 0)):
    """cx,cy,vh in ORIGINAL source pixel coords. returns RGBA W×H"""
    im = P[key]
    s = P['_s'][src_scale_key or key.split('_')[0]]
    vw = vh * W / H
    cx, cy, vh, vw = cx * s + shake[0], cy * s + shake[1], vh * s, vw * s
    if vh > im.height: vw *= im.height / vh; vh = im.height
    if vw > im.width: vh *= im.width / vw; vw = im.width
    cx = clamp(cx, vw / 2, im.width - vw / 2); cy = clamp(cy, vh / 2, im.height - vh / 2)
    box = (cx - vw / 2, cy - vh / 2, cx + vw / 2, cy + vh / 2)
    return im.resize((W, H), Image.BILINEAR, box=box).convert('RGBA'), box, s

def src2scr(x, y, box, s):
    return ((x * s - box[0]) / (box[2] - box[0]) * W, (y * s - box[1]) / (box[3] - box[1]) * H)

# ---------------------------------------------------------------- UI pieces
def layer(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))

def rrect(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle([int(v) for v in box], radius=r, fill=fill, outline=outline, width=width)

def brackets(d, box, L_=46, col=LIME + (255,), w=5):
    x0, y0, x1, y1 = box
    for (x, y, sx, sy) in [(x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)]:
        d.line([(x, y + sy * L_), (x, y), (x + sx * L_, y)], fill=col, width=w, joint='curve')

def chip(text, fk='h8', size=34, bg=LIME, fg=NAVY, padx=22, pady=10, r=12):
    t = tsprite(text, fk, size, fg)
    w, h = t.width + padx * 2 - 16, t.height + pady * 2 - 16
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im); rrect(d, (0, 0, w - 1, h - 1), r, fill=bg + (255,) if len(bg) == 3 else bg)
    im.alpha_composite(t, ((w - t.width) // 2, (h - t.height) // 2))
    return im
chip = functools.lru_cache(None)(chip)

def wrap(text, fk, size, maxw):
    words = text.split(' '); lines = []; cur = []
    for w_ in words:
        test = ' '.join(cur + [w_])
        if cur and twidth(test, fk, size) > maxw:
            lines.append(cur); cur = [w_]
        else: cur.append(w_)
    if cur: lines.append(cur)
    return lines

def draw_words_rtl(fr, lines, fk, size, right_x, top_y, colors, lh=1.25, alphas=None, center=False):
    """lines: list of list of words; colors: flat list per word; draws right to left."""
    idx = 0; sp = twidth(' ', fk, size)
    for li, ws in enumerate(lines):
        y = top_y + li * size * lh
        widths = [twidth(w_, fk, size) for w_ in ws]
        total = sum(widths) + sp * (len(ws) - 1)
        x = right_x if not center else W / 2 + total / 2
        for w_, ww in zip(ws, widths):
            spr = tsprite(w_, fk, size, colors[idx])
            a = 1.0 if alphas is None else alphas[idx]
            put(fr, spr, x - ww / 2 - 8 + 8, y, a, anchor='c') if False else put(fr, spr, x + 8, y, a, anchor='r')
            x -= ww + sp; idx += 1

def caption_box(fr, who, text, t, t0, t1, mode='type', karaoke_t=None, vo_rms_frame=None):
    """bottom caption.  who: 'dad' | 'kid' | 'coach' """
    a = fade(t, t0, t1, 0.18, 0.22)
    if a <= 0: return
    fk, size = 'h8', 58
    maxw = 900
    lines = wrap(text, fk, size, maxw)
    nwords = sum(len(l) for l in lines)
    nl = len(lines)
    base_y = 1640 - (nl - 1) * size * 1.25
    lay = layer(); d = ImageDraw.Draw(lay)
    # backing gradient panel
    top = base_y - 120
    rrect(d, (60, top, W - 60, 1640 + 60), 26, fill=(6, 9, 20, int(170 * a)))
    if who == 'coach':
        d.line([(W - 60, top + 26), (W - 60, 1640 + 34)], fill=PURP_B + (int(255 * a),), width=8)
    elif who == 'kid':
        d.line([(W - 60, top + 26), (W - 60, 1640 + 34)], fill=LIME + (int(255 * a),), width=8)
    else:
        d.line([(W - 60, top + 26), (W - 60, 1640 + 34)], fill=(220, 225, 235, int(255 * a)), width=8)
    fr.alpha_composite(lay)
    # label chip
    if who == 'coach': c = chip('המאמנת', 'h8', 30, PURP_B, WHITE)
    elif who == 'kid': c = chip('הבן', 'h8', 30, LIME, NAVY)
    else: c = chip('אבא', 'h8', 30, (230, 232, 240), NAVY)
    put(fr, c, W - 100, top + 52, a, anchor='r')
    # waveform for coach (real voice amplitude)
    if who == 'coach' and vo_rms_frame is not None:
        lay2 = layer(); d2 = ImageDraw.Draw(lay2)
        fi = int(t * FPS)
        for k in range(26):
            v = P['vo_rms'][clamp(fi - k, 0, len(P['vo_rms']) - 1).__int__()] if fi - k >= 0 else 0
            hh = 6 + 50 * v * (0.6 + 0.4 * math.sin(k * 1.7 + t * 9) ** 2)
            x = W - 100 - c.width - 40 - k * 13
            d2.line([(x, top + 52 - hh / 2), (x, top + 52 + hh / 2)], fill=PURP_B + (int(230 * a * (1 - k / 30)),), width=6)
        fr.alpha_composite(lay2)
    # text
    if mode == 'type':
        prog = lin(t, t0 + 0.05, t0 + 0.05 + len(text) * 0.035)
        shown = prog * nwords
        alphas = [a * clamp(shown - i) for i in range(nwords)]
        colors = [WHITE] * nwords
    else:  # karaoke
        ks, ke = karaoke_t
        lens = [len(w_) + 1 for l in lines for w_ in l]
        tot = sum(lens); acc = 0; colors = []; alphas = []
        for L_ in lens:
            ws = ks + (ke - ks) * acc / tot; acc += L_
            on = t >= ws
            colors.append(LIME if on else WHITE)
            alphas.append(a * (1.0 if on else 0.55))
    draw_words_rtl(fr, lines, fk, size, W - 100, base_y, colors, alphas=alphas)

def vo_caption(fr, t, idx, hold=0.35, who='coach'):
    name, st, text = VO[idx]
    dur = VO_DUR[idx]
    caption_box(fr, who, text, t, st - 0.15, st + dur + hold, mode='karaoke', karaoke_t=(st + 0.05, st + dur - 0.25), vo_rms_frame=True)

import wave
VO_DUR = []
for n_, st_, tx_ in VO:
    with wave.open(os.path.join(AD, n_ + '.wav')) as w_:
        VO_DUR.append(w_.getnframes() / w_.getframerate())

def scoreboard(fr, t, home, away, clock, clock_col=WHITE, a=1.0, flash=0.0, y=150):
    if a <= 0: return
    lay = layer(); d = ImageDraw.Draw(lay)
    bw, bh = 760, 112
    x0 = (W - bw) / 2; y0 = y - bh / 2
    rrect(d, (x0, y0, x0 + bw, y0 + bh), 20, fill=(6, 9, 20, int(205 * a)), outline=LIME + (int(140 * a),), width=2)
    # score cell
    rrect(d, (W / 2 - 150, y0 + 12, W / 2 + 150, y0 + bh - 12), 12, fill=LIME + (int(255 * a),))
    if flash > 0:
        rrect(d, (W / 2 - 150, y0 + 12, W / 2 + 150, y0 + bh - 12), 12, fill=(255, 255, 255, int(255 * a * flash)))
    # clock tab
    rrect(d, (W / 2 - 95, y0 + bh - 4, W / 2 + 95, y0 + bh + 54), 10, fill=(6, 9, 20, int(225 * a)))
    fr.alpha_composite(lay)
    put(fr, tsprite('אבא', 'h9', 50), W / 2 + 175, y, a, anchor='l')
    put(fr, tsprite('עייפות', 'h7', 46, (200, 205, 220)), W / 2 - 175, y, a, anchor='r')
    put(fr, tsprite(f'{away} : {home}', 'm7', 60, NAVY), W / 2, y, a)
    put(fr, tsprite(clock, 'm7', 38, clock_col), W / 2, y0 + bh + 25, a)

def chapter(fr, t, t0, t1, minute, title):
    a = fade(t, t0, t1, 0.2, 0.2)
    if a <= 0: return
    k = eo(lin(t, t0, t0 + 0.45))
    c = chip(minute, 'm7', 50, LIME, NAVY, 26, 12, 10)
    xr = W - 70 + (1 - k) * 300
    put(fr, c, xr, 170, a, anchor='r')
    ts = tsprite(title, 'h9', 64)
    tk = eo(lin(t, t0 + 0.12, t0 + 0.6))
    put(fr, ts, xr - c.width - 26 + (1 - tk) * 120, 166, a * tk, anchor='r')
    lay = layer(); d = ImageDraw.Draw(lay)
    lw = 940 * eo(lin(t, t0 + 0.2, t0 + 0.9))
    d.line([(W - 70, 232), (W - 70 - lw, 232)], fill=LIME + (int(200 * a),), width=3)
    # tick marks like a pitch ruler
    for i in range(0, int(lw), 40):
        d.line([(W - 70 - i, 232), (W - 70 - i, 244 if i % 200 == 0 else 238)], fill=LIME + (int(150 * a),), width=2)
    fr.alpha_composite(lay)
    put(fr, tsprite('SPACE // COMEBACK', 'm4', 24, (170, 180, 200)), 70, 270, a * 0.9, anchor='l')

def grid_bg(t, col=NAVY, gcol=(40, 60, 100), spacing=60, a=70):
    im = Image.new('RGBA', (W, H), col + (255,))
    d = ImageDraw.Draw(im)
    off = (t * 20) % spacing
    for x in np.arange(-spacing + off, W + spacing, spacing):
        d.line([(x, 0), (x, H)], fill=gcol + (a,), width=1)
    for y in np.arange(-spacing + off, H + spacing, spacing):
        d.line([(0, y), (W, y)], fill=gcol + (a,), width=1)
    return im

def sphere_lines(cx, cy, r, rot, tilt=0.35):
    lines = []
    for lat in np.linspace(-75, 75, 6):
        la = math.radians(lat); pts = []
        for lo in np.linspace(0, 360, 49):
            lo_ = math.radians(lo) + rot
            x, y, z = math.cos(la) * math.cos(lo_), math.sin(la), math.cos(la) * math.sin(lo_)
            y2 = y * math.cos(tilt) - z * math.sin(tilt); z2 = y * math.sin(tilt) + z * math.cos(tilt)
            pts.append((cx + x * r, cy + y2 * r, z2))
        lines.append(pts)
    for lo in np.linspace(0, 180, 7)[:-1]:
        lo_ = math.radians(lo) + rot; pts = []
        for la in np.linspace(-90, 90, 37):
            la_ = math.radians(la)
            x, y, z = math.cos(la_) * math.cos(lo_), math.sin(la_), math.cos(la_) * math.sin(lo_)
            y2 = y * math.cos(tilt) - z * math.sin(tilt); z2 = y * math.sin(tilt) + z * math.cos(tilt)
            pts.append((cx + x * r, cy + y2 * r, z2))
        lines.append(pts)
    return lines

def draw_sphere(d, cx, cy, r, rot, a=1.0, col=LIME, w=3):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col + (int(255 * a),), width=w + 1)
    for pts in sphere_lines(cx, cy, r, rot):
        for p, q in zip(pts, pts[1:]):
            z = (p[2] + q[2]) / 2
            aa = int(255 * a * (0.25 + 0.75 * (z > 0)))
            d.line([p[:2], q[:2]], fill=col + (aa,), width=w if z > 0 else max(1, w - 2))

def check(d, cx, cy, s, col, w=8):
    d.line([(cx - s * 0.5, cy), (cx - s * 0.12, cy + s * 0.38), (cx + s * 0.55, cy - s * 0.42)], fill=col, width=w, joint='curve')

# ---------------------------------------------------------------- scenes
def scene_A(t):
    T = t
    # camera: from kid & ball to dad, push in, freeze at FREEZE
    tc = min(t, FREEZE)
    k = eio(lin(tc, 0, FREEZE))
    cx = mix(1120, 650, k); cy = mix(500, 470, k); vh = mix(941, 800, k)
    shake = (0, 0)
    for bt in BALL_HOOK:
        if 0 <= t - bt < 0.15: shake = (math.sin((t - bt) * 120) * 6 * (1 - (t - bt) / 0.15), 0)
    frozen = t >= FREEZE
    if frozen:  # slow zoom continues after freeze (still frame)
        z = eo(lin(t, FREEZE, 4.2))
        cx, cy, vh = 650, mix(470, 450, z), mix(800, 720, z)
    key = 'tired_cold' if frozen else 'tired'
    fr, box, s = cam(key, cx, cy, vh, 'tired', shake)
    if frozen:
        # blend from warm to cold quickly
        warm, _, _ = cam('tired', cx, cy, vh, 'tired')
        bl = lin(t, FREEZE, FREEZE + 0.35)
        if bl < 1: fr = Image.blend(warm, fr, bl)
        ea = lin(t, FREEZE + 0.1, FREEZE + 0.8)
        ed, _, _ = cam('tired_edge', cx, cy, vh, 'tired')
        # reveal edges with scan line
        sy = int(mix(0, H, eo(lin(t, FREEZE, FREEZE + 0.8))))
        if sy > 0:
            ed = ed.copy(); m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).rectangle([0, 0, W, sy], fill=int(255 * 0.75))
            ed.putalpha(ImageChops.multiply(ed.getchannel('A'), m))
            fr.alpha_composite(ed)
        lay = layer(); d = ImageDraw.Draw(lay)
        if t < FREEZE + 0.9:
            d.rectangle([0, sy - 4, W, sy + 4], fill=LIME + (200,))
            d.rectangle([0, sy - 40, W, sy - 4], fill=LIME + (40,))
        # brackets around dad
        bx0, by0 = src2scr(250, 120, box, s); bx1, by1 = src2scr(960, 900, box, s)
        kk = eback(lin(t, FREEZE + 0.15, FREEZE + 0.6))
        pad = (1 - kk) * 120
        if kk > 0: brackets(d, (bx0 - pad + 20, max(330, by0 - pad), min(W - 20, bx1 + pad), min(1450, by1 + pad)), 60, LIME + (int(255 * clamp(kk)),), 6)
        # data tags
        hx, hy = src2scr(560, 420, box, s)
        kx, ky = src2scr(820, 640, box, s)
        a1 = lin(t, FREEZE + 0.35, FREEZE + 0.6)
        a2 = lin(t, FREEZE + 0.55, FREEZE + 0.8)
        if a1 > 0:
            d.ellipse([hx - 12, hy - 12, hx + 12, hy + 12], outline=RED + (int(255 * a1),), width=4)
            d.line([(hx, hy), (hx - 120, hy - 140), (60, hy - 140)], fill=RED + (int(220 * a1),), width=3)
        if a2 > 0:
            d.ellipse([kx - 12, ky - 12, kx + 12, ky + 12], outline=LIME + (int(255 * a2),), width=4)
            d.line([(kx, ky), (kx + 60, 930), (W - 60, 930)], fill=LIME + (int(220 * a2),), width=3)
        fr.alpha_composite(lay)
        if a1 > 0:
            pulse = 1 + 0.06 * max(0, math.sin((t - FREEZE) * 2 * math.pi * 172 / 60)) ** 8
            put(fr, tsprite('דופק', 'h7', 34, (255, 190, 195)), 70, hy - 200, a1, anchor='l')
            put(fr, tsprite('172', 'm7', 96, RED), 70, hy - 140 + 52, a1, pulse, anchor='l')
            put(fr, tsprite('BPM', 'm4', 28, RED), 70 + 200, hy - 140 + 70, a1, anchor='l')
        if a2 > 0:
            put(fr, tsprite('זמן עד עצירה', 'h7', 34, (230, 240, 190)), W - 70, 880, a2, anchor='r')
            put(fr, tsprite('00:40', 'm7', 96, LIME), W - 70, 990, a2, anchor='r')
        # big 40
        if t >= 2.0:
            k2 = eback(lin(t, 2.0, 2.35), 2.2)
            big = tsprite('40 שניות.', 'r9', 210, WHITE)
            put_glow(fr, big, W / 2, 1230, clamp(k2), 20, (0, 0, 0), 0.9, scale=mix(1.5, 1.0, clamp(k2)))
    # freeze flash
    if FREEZE <= t < FREEZE + 0.12:
        fl = Image.new('RGBA', (W, H), (255, 255, 255, int(255 * (1 - (t - FREEZE) / 0.12) * 0.9)))
        fr.alpha_composite(fl)
    # scoreboard + clock
    if t < FREEZE:
        sec = int(40 * t / FREEZE); clk = f'00:{sec:02d}'; cc = WHITE
    else:
        clk = '00:40'; cc = RED if int((t - FREEZE) * 3) % 2 == 0 else (255, 160, 170)
    scoreboard(fr, t, 0, 1, clk, cc, a=lin(t, 0, 0.2))
    caption_box(fr, 'kid', 'אבא, עוד אחד!', t, 0.12, 1.45)
    caption_box(fr, 'dad', 'ארבעים שניות. זה כמה שאני מחזיק עם הבן שלי.', t, 1.9, 4.25)
    return fr

def scene_B(t):
    lt = t - 4.2
    k = eio(lin(lt, 0, 4.0))
    fr, box, s = cam('tired_cold', mix(1240, 1080, k), mix(520, 480, k), mix(640, 900, k), 'tired')
    # extra darkening
    dark = Image.new('RGBA', (W, H), (4, 8, 20, int(110 + 40 * k)))
    fr.alpha_composite(dark)
    # sonar rings at echo hits
    lay = layer(); d = ImageDraw.Draw(lay)
    for bt in BALL_ECHO:
        dt = t - bt
        if 0 <= dt < 1.4:
            for j in range(3):
                rr = (dt - j * 0.15) * 600
                if rr > 0:
                    aa = int(200 * (1 - dt / 1.4) * (1 - j * 0.3))
                    d.ellipse([200 - rr, 1350 - rr * 0.35, 200 + rr, 1350 + rr * 0.35], outline=(180, 200, 230, aa), width=3)
    fr.alpha_composite(lay)
    # typed line
    txt = 'והוא כבר הפסיק לבקש.'
    n = len(txt.split(' '))
    prog = lin(t, 4.75, 5.9) * n
    words = txt.split(' ')
    al = [clamp(prog - i) for i in range(n)]
    a = fade(t, 4.6, 8.2, 0.2, 0.3)
    draw_words_rtl(fr, [words], 'h9', 96, 0, 1180, [WHITE] * n, alphas=[x * a for x in al], center=True)
    # faint line under
    lay = layer(); d = ImageDraw.Draw(lay)
    lw = 500 * eo(lin(t, 5.9, 6.8))
    d.line([(W / 2 + lw / 2, 1275), (W / 2 - lw / 2, 1275)], fill=(200, 210, 230, int(160 * a)), width=2)
    fr.alpha_composite(lay)
    # incoming 3D ball (match cut)
    if t >= BALL_MATCH - 0.55:
        kk = lin(t, BALL_MATCH - 0.55, BALL_MATCH)
        r = mix(30, 1400, kk ** 3)
        cxy = (mix(200, W / 2, kk), mix(1450, H / 2, kk))
        lay = layer(); d = ImageDraw.Draw(lay)
        draw_sphere(d, cxy[0], cxy[1], r, t * 9, 1.0, LIME, max(3, int(r / 60)))
        fr.alpha_composite(lay)
    return fr

def door_scene(t, show_text=True):
    lt = t - 8.2
    fr = Image.new('RGBA', (W, H), NAVY + (255,))
    # vertical gradient
    g = np.linspace(0, 1, H)[:, None]
    base = (np.array([4, 6, 14]) * (1 - g) + np.array([14, 22, 46]) * g)
    fr = Image.fromarray(np.repeat(base[:, None, :], W, axis=1).reshape(H, W, 3).astype(np.uint8)).convert('RGBA')
    lay = layer(); d = ImageDraw.Draw(lay)
    # perspective floor grid
    hz = 1420
    for i in range(-12, 13):
        d.line([(W / 2 + i * 30, hz), (W / 2 + i * 260, H)], fill=LIME + (40,), width=2)
    for j in range(1, 10):
        y = hz + (H - hz) * (j / 9) ** 1.8
        d.line([(0, y), (W, y)], fill=LIME + (35,), width=2)
    # door frame
    dx0, dy0, dx1, dy1 = 170, 430, 910, 1420
    d.rectangle([dx0 - 26, dy0 - 26, dx1 + 26, dy1], outline=(90, 100, 130, 255), width=10)
    d.rectangle([dx0, dy0, dx1, dy1], fill=(20, 34, 60, 120))
    d.line([(W / 2, dy0), (W / 2, dy1)], fill=(90, 100, 130, 255), width=8)
    fr.alpha_composite(lay)
    # reflection of dad in the glass
    refl, box, s = cam('tired_bw', 620, 470, 941, 'tired')
    refl = ImageOps.mirror(refl).crop((dx0, dy0, dx1, dy1))
    refl.putalpha(int(255 * 0.22 * lin(lt, 0, 1.2)))
    fr.alpha_composite(refl, (dx0, dy0))
    lay = layer(); d = ImageDraw.Draw(lay)
    # machines behind the glass (wireframe)
    mc = (150, 165, 200, 200)
    # treadmill (left)
    d.polygon([(220, 1250), (470, 1250), (520, 1330), (240, 1330)], outline=mc, width=3)
    d.line([(450, 1250), (420, 1050), (330, 1050)], fill=mc, width=4)
    d.rectangle([300, 1020, 440, 1060], outline=mc, width=3)
    # dumbbell rack (right)
    d.line([(600, 1200), (880, 1200)], fill=mc, width=4); d.line([(600, 1290), (880, 1290)], fill=mc, width=4)
    for i in range(4):
        x = 630 + i * 70
        d.ellipse([x - 22, 1150, x + 22, 1196], outline=mc, width=3)
        d.ellipse([x - 25, 1238, x + 25, 1288], outline=mc, width=3)
    d.line([(600, 1200), (600, 1330)], fill=mc, width=4); d.line([(880, 1200), (880, 1330)], fill=mc, width=4)
    # leg press (center back)
    d.line([(440, 900), (640, 760)], fill=mc, width=4); d.line([(470, 940), (670, 800)], fill=mc, width=4)
    d.rectangle([600, 720, 700, 830], outline=mc, width=3)
    d.line([(430, 980), (560, 980), (560, 900)], fill=mc, width=4)
    # glass sheen
    sx = mix(-300, 1300, lin(lt, 0.4, 4.0))
    d.polygon([(sx, dy0), (sx + 90, dy0), (sx - 250, dy1), (sx - 340, dy1)], fill=(255, 255, 255, 18))
    fr.alpha_composite(lay)
    # neon logo sign above the door (flicker on)
    fl = 1.0
    if lt < 0.9: fl = [0, 1, 0, 0, 1, 0.4, 1, 0, 1][int(lt * 10) % 9]
    lg = P['logo'].resize((360, int(360 * P['logo'].height / P['logo'].width)), Image.LANCZOS)
    put_glow(fr, lg, W / 2, 300, fl * 0.85, 24, PURP_B, 0.9)
    # tags
    tags = [('??? מה עושים עם זה', (380, 1000), (380, 860)), ('כמה משקל?', (740, 1170), (740, 1080)), ('כולם יסתכלו עליי', (560, 760), (560, 600))]
    for (txt, anc, pos), tt0 in zip(tags, TAGS_C):
        a = lin(t, tt0, tt0 + 0.12)
        if a <= 0: continue
        jit = 0
        if t - tt0 < 0.25: jit = int(math.sin(t * 300) * 14)
        lay = layer(); d = ImageDraw.Draw(lay)
        d.ellipse([anc[0] - 10, anc[1] - 10, anc[0] + 10, anc[1] + 10], fill=RED + (int(230 * a),))
        d.line([anc, pos], fill=RED + (int(200 * a),), width=3)
        fr.alpha_composite(lay)
        c = chip(txt, 'h8', 40, (60, 18, 26), (255, 140, 150), 24, 12, 10)
        cc = chip(txt, 'h8', 40, (200, 40, 60), (255, 220, 225), 24, 12, 10)
        if jit:
            put(fr, cc, pos[0] + jit, pos[1], a * 0.6)
        put(fr, c, pos[0] - jit // 2, pos[1], a)
        # border
    if show_text:
        caption_box(fr, 'dad', 'רציתי להתחיל. אבל אין לי מושג מה עושים שם. ולא רציתי להיראות טיפש.', t, 8.6, 12.0)
        if t >= 12.0:
            dk = lin(t, 12.0, 12.3)
            fr.alpha_composite(Image.new('RGBA', (W, H), (3, 5, 12, int(190 * dk))))
            a1 = eo(lin(t, 12.05, 12.35))
            put(fr, tsprite('זה לא פחד מהמשקל.', 'r9', 96, WHITE), W / 2, 880 - (1 - a1) * 40, a1)
            a2 = eback(lin(t, 12.8, 13.15))
            s2 = tsprite('זה פחד מלא לדעת.', 'r9', 118, LIME)
            put_glow(fr, s2, W / 2, 1040, clamp(a2), 22, LIME, 0.55, scale=mix(1.25, 1.0, clamp(a2)))
    return fr

_DOOR_LAST = {}
def scene_C(t): return door_scene(t)

def scene_D(t):
    lt = t - 14.2
    k = eio(lin(lt, 0, 3.4))
    fr, box, s = cam('gym', mix(1260, 720, k), mix(430, 470, k), mix(820, 720, k), 'gym')
    # bloom/light from door
    bl = 1 - lin(lt, 0, 1.0)
    if bl > 0:
        fr.alpha_composite(Image.new('RGBA', (W, H), (255, 250, 230, int(200 * bl))))
    # door halves sliding apart
    op = eio(lin(lt, 0.0, 0.8))
    if op < 1:
        if 'img' not in _DOOR_LAST: _DOOR_LAST['img'] = door_scene(14.19, show_text=False)
        dimg = _DOOR_LAST['img']
        left = dimg.crop((0, 0, W // 2, H)); right = dimg.crop((W // 2, 0, W, H))
        off = int(op * W / 2)
        fr.alpha_composite(left, (0, 0)) if off == 0 else put(fr, left, -off, 0, 1, anchor='tl')
        put(fr, right, W // 2 + off, 0, 1, anchor='tl')
        # light slit
        lay = layer(); d = ImageDraw.Draw(lay)
        d.rectangle([W / 2 - off - 6, 0, W / 2 + off + 6, H], fill=(255, 255, 240, int(120 * (1 - op))))
        fr.alpha_composite(lay)
    # light streaks before drop
    if lt > 2.6:
        kk = lin(lt, 2.6, 3.4)
        lay = layer(); d = ImageDraw.Draw(lay)
        for i in range(10):
            y = (i * 197 + lt * 2400) % H
            d.line([(0, y), (W, y - 60)], fill=LIME + (int(70 * kk),), width=3)
        fr.alpha_composite(lay)
        fr.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(120 * kk ** 3))))
    # trainer marker
    if lt > 0.5:
        a = fade(t, 14.7, 17.3, 0.3, 0.3)
        tx, ty = src2scr(1300, 230, box, s)
        a *= 1 - lin(lt, 1.6, 2.0)
        lay = layer(); d = ImageDraw.Draw(lay)
        brackets(d, (tx - 170, ty - 200, tx + 170, ty + 200), 34, PURP_B + (int(255 * a),), 5)
        fr.alpha_composite(lay)
        put(fr, chip('המאמנת שלך', 'h8', 34, PURP_B, WHITE), clamp(tx, 200, W - 200), ty + 250, a)
    vo_caption(fr, t, 0)
    # whistle moment
    if t >= WHISTLE:
        a = eback(lin(t, WHISTLE, WHISTLE + 0.2))
        put(fr, chip('שריקת פתיחה', 'h9', 54, LIME, NAVY, 34, 16, 14), W / 2, 960, clamp(a), mix(1.4, 1, clamp(a)))
    return fr

def scene_E(t):
    lt = t - DROP
    k = lin(lt, 0, 7.0)
    fr, box, s = cam('tablet', 275, mix(420, 450, k), mix(941, 800, k), 'tablet')
    # dark lower gradient
    g = np.clip((np.linspace(0, 1, H) - 0.42) / 0.3, 0, 1) ** 1.2
    if 'gradE' not in P:
        al = (g * 225).astype(np.uint8)
        gi = Image.new('RGBA', (W, H), NAVY + (0,)); gi.putalpha(Image.fromarray(np.repeat(al[:, None], W, 1)))
        P['gradE'] = gi
    fr.alpha_composite(P['gradE'])
    # tactics board panel
    pa = eo(lin(lt, 1.0, 1.5))
    if pa > 0:
        px0, py0, px1, py1 = 70, 1000 + (1 - pa) * 80, W - 70, 1440 + (1 - pa) * 80
        lay = layer(); d = ImageDraw.Draw(lay)
        rrect(d, (px0, py0, px1, py1), 22, fill=(8, 22, 26, int(225 * pa)), outline=LIME + (int(180 * pa),), width=3)
        # chalk pitch lines
        cc = (255, 255, 255, int(28 * pa))
        d.line([(W / 2, py0 + 14), (W / 2, py1 - 14)], fill=cc, width=3)
        d.ellipse([W / 2 - 90, (py0 + py1) / 2 - 90, W / 2 + 90, (py0 + py1) / 2 + 90], outline=cc, width=3)
        d.rectangle([px0 + 14, (py0 + py1) / 2 - 120, px0 + 120, (py0 + py1) / 2 + 120], outline=cc, width=3)
        d.rectangle([px1 - 120, (py0 + py1) / 2 - 120, px1 - 14, (py0 + py1) / 2 + 120], outline=cc, width=3)
        fr.alpha_composite(lay)
        items = [('לחיצת רגליים', 'מתחילים מכאן'), ('חתירה', 'לב-ריאה'), ('משקולת יד', '6 ק"ג, לא יותר')]
        for i, ((name, note), ft) in enumerate(zip(items, E_FLIPS)):
            y = py0 + 75 + i * 140
            ra = eo(lin(lt, 1.2 + i * 0.15, 1.6 + i * 0.15)) * pa
            if ra <= 0: continue
            flip = lin(t, ft - 0.12, ft + 0.12)
            sx = abs(math.cos(flip * math.pi))
            done = flip >= 0.5
            lay = layer(); d = ImageDraw.Draw(lay)
            cx = W - 150
            rr = 44
            col = LIME if done else RED
            ew = rr * max(0.06, sx)
            d.ellipse([cx - ew, y - rr, cx + ew, y + rr], fill=(col if done else (70, 20, 28)) + (int(255 * ra),), outline=col + (int(255 * ra),), width=4)
            if done and sx > 0.3:
                check(d, cx, y + 2, 46 * sx, NAVY + (255,), 9)
            # row separator
            if i < 2: d.line([(px0 + 40, y + 70), (px1 - 40, y + 70)], fill=(255, 255, 255, int(30 * ra)), width=2)
            fr.alpha_composite(lay)
            if not done and sx > 0.3:
                put(fr, tsprite('?', 'h9', 60, RED), cx, y, ra, (sx, 1)[0] if False else 1.0)
            nm = tsprite(name, 'h9', 54, WHITE if done else (150, 160, 180))
            put(fr, nm, cx - 80, y - 4, ra, anchor='r')
            if done:
                na = eo(lin(t, ft + 0.05, ft + 0.35))
                put(fr, tsprite(note, 'h7', 44, LIME), cx - 80 - nm.width - 24 + (1 - na) * 40, y - 2, ra * na, anchor='r')
            else:
                put(fr, tsprite('???', 'm7', 44, (120, 60, 70)), cx - 80 - nm.width - 24, y, ra, anchor='r')
    chapter(fr, t, DROP + 0.9, SC['E'][1], "01'", 'מאפס')
    vo_caption(fr, t, 1)
    # title slam on drop
    if lt < 1.05:
        a = 1 - lin(lt, 0.8, 1.05)
        fr.alpha_composite(Image.new('RGBA', (W, H), (4, 6, 14, int(200 * a))))
        kk = eback(lin(lt, 0, 0.25), 2.5)
        shake = math.sin(lt * 80) * 18 * (1 - lin(lt, 0, 0.4))
        lg = P['logo'].resize((520, int(520 * P['logo'].height / P['logo'].width)), Image.LANCZOS)
        put_glow(fr, lg, W / 2 + shake, 760, a * clamp(kk), 30, PURP_B, 0.9, scale=mix(1.6, 1, clamp(kk)))
        cb = tsprite('COMEBACK', 'osw', 190, LIME)
        put_glow(fr, cb, W / 2 - shake, 1080, a * clamp(kk), 26, LIME, 0.5, scale=mix(0.6, 1, clamp(kk)))
        put(fr, tsprite('חוזרים למשחק', 'h9', 70, WHITE), W / 2, 1230, a * lin(lt, 0.15, 0.35))
        if lt < 0.1: fr.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(230 * (1 - lt / 0.1)))))
    return fr

def scene_F(t):
    t0, t1 = SC['F']; lt = t - t0
    k = lin(lt, 0, t1 - t0)
    fr, box, s = cam('gym_blur', mix(800, 900, k), 470, 941, 'gym')
    fr.alpha_composite(Image.new('RGBA', (W, H), NAVY + (150,)))
    chapter(fr, t, t0, t1, "15'", 'תוכנית לחיים של אבא')
    # fixture board
    rows = [('ב׳', '06:30', 'אימון', '45 דק׳', 'gym'), ('ב׳', '17:00', 'חוג כדורגל של הבן', '', 'fam'),
            ('ג׳', '19:30', 'ארוחת ערב משפחתית', '', 'fam'), ('ד׳', '21:00', 'אימון', 'הילדים ישנים', 'gym'),
            ('ו׳', '08:00', 'אימון בוקר', '45 דק׳', 'gym'), ('שבת', '', 'משחק בפארק עם הבן', '', 'fam')]
    put(fr, tsprite('השבוע של אבא', 'h9', 58, WHITE), W - 80, 340, fade(t, t0 + 0.3, t1, 0.3, 0.2), anchor='r')
    put(fr, tsprite('WEEK 01', 'm7', 34, LIME), 80, 342, fade(t, t0 + 0.3, t1, 0.3, 0.2), anchor='l')
    for i, (day, hr, what, note, kind) in enumerate(rows):
        rt = t0 + BEAT * (2 + i)
        a = eo(lin(t, rt, rt + 0.3)) * fade(t, t0, t1, 0.01, 0.2)
        if a <= 0: continue
        y = 420 + i * 116
        xoff = (1 - a) * 200
        lay = layer(); d = ImageDraw.Draw(lay)
        is_gym = kind == 'gym'
        rrect(d, (70 + xoff, y, W - 70 + xoff, y + 100), 16, fill=((20, 32, 14, int(220 * a)) if is_gym else (34, 18, 40, int(200 * a))),
              outline=(LIME if is_gym else PURP_B) + (int(200 * a),), width=3)
        rrect(d, (W - 70 - 170 + xoff, y, W - 70 + xoff, y + 100), 16, fill=(LIME if is_gym else PURP_B) + (int(255 * a),))
        fr.alpha_composite(lay)
        put(fr, tsprite(day, 'h9', 46, NAVY if is_gym else WHITE), W - 70 - 85 + xoff, y + 36, a)
        if hr: put(fr, tsprite(hr, 'm7', 30, NAVY if is_gym else WHITE), W - 70 - 85 + xoff, y + 74, a)
        put(fr, tsprite(what, 'h8', 48, WHITE), W - 70 - 200 + xoff, y + 50, a, anchor='r')
        if is_gym:
            put(fr, chip('SPACE', 'osw', 26, LIME, NAVY, 16, 6, 8), 110 + xoff, y + 50, a, anchor='l')
        if note:
            put(fr, tsprite(note, 'h4', 32, (200, 210, 180)), 250 + xoff, y + 50, a, anchor='l')
    # stat line
    sa = eback(lin(t, t0 + BEAT * 9, t0 + BEAT * 9 + 0.35))
    if sa > 0:
        put_glow(fr, tsprite('3 אימונים · 45 דקות', 'r9', 86, LIME), W / 2, 1185, clamp(sa) * fade(t, t0, t1, 0, 0.2), 18, LIME, 0.45, mix(1.3, 1, clamp(sa)))
        put(fr, tsprite('מסביב לחיים שלך', 'h8', 56, WHITE), W / 2, 1280, clamp(sa) * fade(t, t0, t1, 0, 0.2))
    vo_caption(fr, t, 2)
    return fr

def scene_G(t):
    t0, t1 = SC['G']; lt = t - t0
    k = eio(lin(lt, 0, t1 - t0))
    cx, cy, vh = mix(272, 290, k), mix(470, 580, k), mix(941, 740, k)
    fr, box, s = cam('curl', cx, cy, vh, 'curl')
    lay = layer(); d = ImageDraw.Draw(lay)
    # skeleton (source coords in curl.png 544x941)
    rep = (lt * 1.2) % 1.0
    curl_k = 0.5 - 0.5 * math.cos(rep * 2 * math.pi)
    sh = (115, 565); el = (305, 800); wr_ = (mix(400, 385, curl_k), mix(660, 615, curl_k))
    back = [(70, 470), (55, 640), (60, 860)]
    S = lambda p: src2scr(p[0], p[1], box, s)
    a = eo(lin(lt, 0.4, 1.0)) * fade(t, t0, t1, 0, 0.25)
    if a > 0:
        ps = [S(sh), S(el), S(wr_)]
        d.line(ps, fill=LIME + (int(230 * a),), width=6, joint='curve')
        for p in ps:
            d.ellipse([p[0] - 14, p[1] - 14, p[0] + 14, p[1] + 14], fill=NAVY + (int(255 * a),), outline=LIME + (int(255 * a),), width=5)
        # angle arc at elbow
        e = ps[1]
        a1 = math.degrees(math.atan2(ps[0][1] - e[1], ps[0][0] - e[0])); a2 = math.degrees(math.atan2(ps[2][1] - e[1], ps[2][0] - e[0]))
        lo, hi = sorted([a1, a2])
        if hi - lo > 180: lo, hi = hi, lo + 360
        d.arc([e[0] - 70, e[1] - 70, e[0] + 70, e[1] + 70], lo, hi, fill=LIME + (int(255 * a),), width=5)
        bp = [S(p) for p in back]
        d.line(bp, fill=(255, 255, 255, int(170 * a)), width=4)
        for p in bp: d.ellipse([p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8], fill=(255, 255, 255, int(220 * a)))
        fr.alpha_composite(lay)
        ang = int(abs(hi - lo))
        put(fr, chip(f'מרפק {ang}°', 'h8', 36, LIME, NAVY), min(W - 150, ps[2][0] + 60), ps[2][1] - 150, a)
        b_ = bp[1]
        ba = eo(lin(lt, 1.4, 1.8)) * a
        put(fr, chip('גב ניטרלי ✓' if False else 'גב ניטרלי', 'h8', 34, (240, 242, 248), NAVY), max(30, b_[0] + 40), b_[1] - 100, ba, anchor='l')
    # trainer tag
    ta = eo(lin(lt, 0.5, 0.9)) * (1 - lin(lt, 3.6, 4.0))
    if ta > 0:
        tx, ty = S((395, 170))
        lay = layer(); d = ImageDraw.Draw(lay)
        brackets(d, (tx - 140, ty - 140, tx + 140, ty + 150), 30, PURP_B + (int(255 * ta),), 5)
        fr.alpha_composite(lay)
        put(fr, chip('ליווי אישי · בכל אימון', 'h8', 34, PURP_B, WHITE), min(W - 230, tx), ty + 200, ta)
    # rep counter
    reps = min(12, 4 + int(lt * 1.2))
    ra = fade(t, t0 + 0.6, t1, 0.3, 0.25)
    put(fr, tsprite('חזרות', 'h7', 30, (200, 210, 225)), 80, 400, ra, anchor='l')
    put(fr, tsprite(f'{reps:02d}/12', 'm7', 72, LIME), 80, 460, ra, anchor='l')
    chapter(fr, t, t0, t1, "30'", 'אף פעם לא לבד')
    vo_caption(fr, t, 3)
    return fr

_CARD = {}
def card(key, cx, cy, vh, label, sat):
    if key + label in _CARD: return _CARD[key + label]
    im, box, s = cam(key, cx, cy, vh, key.split('_')[0])
    im = im.resize((300, 533), Image.LANCZOS).crop((0, 40, 300, 460))
    im = ImageEnhance.Color(im.convert('RGB')).enhance(sat).convert('RGBA')
    out = Image.new('RGBA', (316, 436), (0, 0, 0, 0))
    d = ImageDraw.Draw(out); rrect(d, (0, 0, 315, 435), 18, fill=LIME + (255,))
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], 14, fill=255)
    out.paste(im, (8, 8), m)
    _CARD[key + label] = out
    return out

def scene_H(t):
    t0, t1 = SC['H']; lt = t - t0
    fr = grid_bg(t)
    chapter(fr, t, t0, t1, "45'", 'הסיבולת חוזרת')
    # timer
    vals = [40, 180, 900, 2700]
    i = sum(1 for s_ in H_STEPS if t >= s_) - 1
    i = max(0, i)
    if i < 3:
        nxt = H_STEPS[i + 1] if i + 1 < 4 else t1
        roll = lin(t, nxt - 0.45, nxt)
        v = vals[i] + (vals[min(3, i + 1)] - vals[i]) * eio(roll) if i + 1 < 4 else vals[i]
    else: v = vals[3]
    m_, s_ = int(v) // 60, int(v) % 60
    put(fr, tsprite('זמן במשחק', 'h7', 36, (200, 210, 225)), W / 2, 330, fade(t, t0, t1, 0.3, 0.2))
    tsp = tsprite(f'{m_:02d}:{s_:02d}', 'm7', 190, LIME)
    put_glow(fr, tsp, W / 2, 450, fade(t, t0, t1, 0.3, 0.2), 20, LIME, 0.4)
    # cards
    cards = [('gym_m', 640, 330, 520, 'חודש 01', 0.35), ('curl_m', 230, 330, 470, 'חודש 03', 0.75), ('shoulders', 280, 330, 520, 'חודש 06', 1.15)]
    for j, (key, cx, cy, vh, lab, sat) in enumerate(cards):
        ct = H_STEPS[j + 1] - 0.35 if j > 0 else H_STEPS[0] + 0.5
        a = eback(lin(t, ct, ct + 0.35)) * fade(t, t0, t1, 0, 0.2)
        if a <= 0: continue
        c = card(key, cx, cy, vh, lab, sat)
        x = W - 70 - 158 - j * 330
        put(fr, c, x, 820 + (1 - clamp(a)) * 120, clamp(a))
        put(fr, chip(lab, 'h9', 34, NAVY2, LIME if j == 2 else WHITE, 18, 8, 10), x, 1060, clamp(a))
    # graph
    lay = layer(); d = ImageDraw.Draw(lay)
    gx0, gx1, gy0, gy1 = 90, W - 90, 1110, 1270
    ga = fade(t, t0 + 0.3, t1, 0.3, 0.2)
    for j in range(5):
        y = gy0 + (gy1 - gy0) * j / 4
        d.line([(gx0, y), (gx1, y)], fill=(60, 80, 120, int(120 * ga)), width=1)
    prog = lin(t, t0 + 0.4, t1 - 0.8)
    pts = []
    n = 60
    for j in range(int(n * prog) + 1):
        x = j / n
        yv = x ** 1.6 * 0.9 + 0.05 * math.sin(x * 18) * (1 - x)
        pts.append((gx1 - (gx1 - gx0) * x, gy1 - (gy1 - gy0) * yv))   # right-to-left time
    if len(pts) > 1:
        poly = pts + [(pts[-1][0], gy1), (pts[0][0], gy1)]
        d.polygon(poly, fill=LIME + (int(40 * ga),))
        d.line(pts, fill=LIME + (int(255 * ga),), width=6, joint='curve')
        p = pts[-1]; d.ellipse([p[0] - 12, p[1] - 12, p[0] + 12, p[1] + 12], fill=WHITE + (int(255 * ga),))
    fr.alpha_composite(lay)
    # heart rate
    hr = int(mix(172, 128, eio(lin(t, t0 + 1.0, t1 - 1.0))))
    col = tuple(int(mix(a_, b_, lin(hr, 172, 128))) for a_, b_ in zip(RED, LIME))
    put(fr, tsprite('דופק במאמץ', 'h7', 34, (200, 210, 225)), W - 90, 1322, ga, anchor='r')
    put(fr, tsprite(f'{hr}', 'm7', 64, col), W - 90 - 220, 1322, ga, anchor='r')
    put(fr, tsprite('BPM', 'm4', 28, col), W - 90 - 350, 1330, ga, anchor='r')
    vo_caption(fr, t, 4)
    return fr

def scene_I(t):
    t0, t1 = SC['I']; lt = t - t0
    cut2 = t0 + BEAT * 9
    if t < cut2:
        k = eio(lin(t, t0, cut2))
        fr, box, s = cam('run', mix(1150, 560, k), 470, 941, 'run')
        # warm light leak
        if 'leak' not in P:
            lk = Image.new('RGBA', (W // 4, H // 4), (0, 0, 0, 0)); dl = ImageDraw.Draw(lk)
            dl.ellipse([-120, -120, 150, 150], fill=(255, 190, 110, 90))
            P['leak'] = lk.filter(ImageFilter.GaussianBlur(40)).resize((W, H), Image.BILINEAR)
        put(fr, P['leak'], int(60 * math.sin(t * 1.3)), 0, 0.9, anchor='tl')
        # HUD outline but positive
        if lt > 0.8:
            a = eo(lin(lt, 0.8, 1.2)) * fade(t, t0, cut2, 0, 0.2)
            lay = layer(); d = ImageDraw.Draw(lay)
            dx0, dy0 = src2scr(230, 110, box, s); dx1, dy1 = src2scr(820, 900, box, s)
            brackets(d, (max(20, dx0), max(330, dy0), min(W - 20, dx1), min(1450, dy1)), 60, LIME + (int(255 * a),), 6)
            fr.alpha_composite(lay)
            put(fr, tsprite('דופק', 'h7', 34, (230, 240, 190)), 70, 420, a, anchor='l')
            put(fr, tsprite('128', 'm7', 96, LIME), 70, 500, a, anchor='l')
            put(fr, tsprite('BPM', 'm4', 28, LIME), 270, 515, a, anchor='l')
        caption_box(fr, 'kid', 'אבא, עוד אחד!', t, t0 + 0.1, t0 + 1.5)
        # score flips
        s1 = t0 + BEAT * 3; s2 = t0 + BEAT * 6
        home = 0 + (t >= s1) + (t >= s2)
        fl = max(0, 1 - (t - s1) / 0.25) if t >= s1 else 0
        if t >= s2: fl = max(0, 1 - (t - s2) / 0.25)
        sec = int(mix(40, 2700, lin(t, t0, cut2)))
        scoreboard(fr, t, home, 1, f'{sec // 60:02d}:{sec % 60:02d} ▶' if False else f'{sec // 60:02d}:{sec % 60:02d}', LIME, 1.0, fl)
        if t >= s2:
            a = eback(lin(t, s2, s2 + 0.3), 2.2)
            st = tsprite('קאמבק!', 'r9', 150, LIME)
            put_glow(fr, st, W / 2, 1160, clamp(a) * fade(t, s2, cut2, 0, 0.15), 22, LIME, 0.5, mix(1.6, 1, clamp(a)))
            put(fr, chip('חזר למשחק', 'h9', 46, LIME, NAVY, 28, 12, 12), W / 2, 1300, clamp(a) * fade(t, s2, cut2, 0, 0.15))
    else:
        k = eio(lin(t, cut2, t1))
        fr, box, s = cam('shoulders', 275, mix(470, 440, k), mix(941, 820, k), 'shoulders')
        scoreboard(fr, t, 2, 1, '45:00', LIME, 1.0)
        put(fr, chip('45:00  ממשיך', 'm7', 34, NAVY2, LIME, 20, 10, 10), W / 2, 290, 1.0) if False else None
        caption_box(fr, 'dad', 'עוד עשרה.', t, cut2 + 0.35, t1 - 0.05)
        # light particles
        lay = layer(); d = ImageDraw.Draw(lay)
        r = np.random.default_rng(5)
        for j in range(40):
            x = (r.uniform(0, W) + t * r.uniform(-40, 40)) % W
            y = (r.uniform(0, H) - t * r.uniform(30, 120)) % H
            rr = r.uniform(2, 6)
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(255, 230, 160, int(r.uniform(60, 160))))
        fr.alpha_composite(lay)
    # ECG transition into the close
    ecg0 = t1 - 0.45
    if t >= ecg0:
        kk = lin(t, ecg0, t1)
        fr.alpha_composite(Image.new('RGBA', (W, H), (10, 4, 14, int(200 * kk))))
        lay = layer(); d = ImageDraw.Draw(lay)
        xh = W - W * kk * 1.1
        pts = []
        for x in range(W, int(max(0, xh)), -6):
            u = (W - x) / W
            y = H / 2
            ph = (u * 2.2) % 1
            if 0.40 < ph < 0.44: y -= 260 * math.sin((ph - 0.4) / 0.04 * math.pi)
            elif 0.44 < ph < 0.48: y += 120 * math.sin((ph - 0.44) / 0.04 * math.pi)
            pts.append((x, y))
        if len(pts) > 1:
            d.line(pts, fill=LIME + (255,), width=7, joint='curve')
        fr.alpha_composite(lay)
    return fr

def scene_J(t):
    t0, t1 = SC['J']; lt = t - t0
    if 'bgJ' not in P:
        yy, xx = np.mgrid[0:H, 0:W]
        dd = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - 800) / H) ** 2)
        c1 = np.array([120, 52, 122]); c2 = np.array([40, 14, 44])
        img = c1 * np.clip(1 - dd * 1.6, 0, 1)[..., None] + c2 * (1 - np.clip(1 - dd * 1.6, 0, 1))[..., None]
        P['bgJ'] = Image.fromarray(img.astype(np.uint8)).convert('RGBA')
    fr = P['bgJ'].copy()
    # rotating ring + pulse line remnants
    lay = layer(); d = ImageDraw.Draw(lay)
    for j in range(3):
        rr = 470 + j * 70 + 10 * math.sin(t * 2 + j)
        d.arc([W / 2 - rr, 760 - rr * 0.55, W / 2 + rr, 760 + rr * 0.55], (t * 40 + j * 120) % 360, (t * 40 + j * 120 + 200) % 360, fill=(LIME if j == 0 else PURP_B) + (90,), width=3)
    fr.alpha_composite(lay)
    kk = eback(lin(lt, 0, 0.35), 2.0)
    lg = P['logo'].resize((760, int(760 * P['logo'].height / P['logo'].width)), Image.LANCZOS) if 'logoJ' not in P else P['logoJ']
    P['logoJ'] = lg
    put_glow(fr, lg, W / 2, 760, clamp(kk), 34, (0, 0, 0), 0.6, mix(0.4, 1, clamp(kk)))
    if lt < 0.12: fr.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(220 * (1 - lt / 0.12)))))
    a1 = eo(lin(t, VO[5][1], VO[5][1] + 0.35))
    put(fr, tsprite('הוא לא צריך אבא מושלם.', 'h8', 74, WHITE), W / 2, 1210 + (1 - a1) * 30, a1)
    a2 = eback(lin(t, SILENCE_LINE, SILENCE_LINE + 0.35))
    s2 = tsprite('הוא צריך אבא שמשחק איתו.', 'r9', 76, LIME)
    put_glow(fr, s2, W / 2, 1335, clamp(a2), 22, LIME, 0.4, mix(1.2, 1, clamp(a2)))
    a3 = eback(lin(t, VO[6][1] - 0.15, VO[6][1] + 0.2))
    if a3 > 0:
        btn = chip('בוא לאימון היכרות', 'h9', 60, LIME, NAVY, 50, 26, 50)
        pulse = 1 + 0.03 * math.sin((t - VO[6][1]) * 7)
        put_glow(fr, btn, W / 2, 1560, clamp(a3), 26, LIME, 0.5, mix(0.6, 1, clamp(a3)) * pulse)
        put(fr, tsprite('אנחנו מראים לך הכל.', 'h7', 46, WHITE), W / 2, 1690, lin(t, VO[6][1] + 0.3, VO[6][1] + 0.6))
    return fr

SCENES = [('A', scene_A), ('B', scene_B), ('C', scene_C), ('D', scene_D), ('E', scene_E), ('F', scene_F), ('G', scene_G), ('H', scene_H), ('I', scene_I), ('J', scene_J)]

def post(fr, t, fi):
    a = np.asarray(fr.convert('RGB')).astype(np.float32)
    a *= P['vig']
    g = P['grain'][fi % 6]
    g = np.repeat(np.repeat(g, 2, 0), 2, 1)[..., None]
    a += g * 0.6
    # cut flashes/glitch at scene boundaries
    for c in ['B', 'E', 'F', 'G', 'H', 'I']:
        dt = t - SC[c][0]
        if 0 <= dt < 0.1 and c not in ('B', 'E'):
            sh = int(18 * (1 - dt / 0.1))
            a[..., 0] = np.roll(a[..., 0], sh, axis=1); a[..., 2] = np.roll(a[..., 2], -sh, axis=1)
    return np.clip(a, 0, 255).astype(np.uint8)

def frame(fi):
    assets()
    t = fi / FPS
    for k, fn in SCENES:
        if SC[k][0] <= t < SC[k][1] or k == 'J' and t >= SC[k][0]:
            fr = fn(t); break
    return post(fr, t, fi).tobytes()

if __name__ == '__main__':
    import multiprocessing as mp
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        assets()
        os.makedirs(os.path.join(HERE, 'test'), exist_ok=True)
        for ts in sys.argv[2:]:
            t = float(ts); fi = int(round(t * FPS))
            Image.frombytes('RGB', (W, H), frame(fi)).resize((540, 960), Image.LANCZOS).save(os.path.join(HERE, 'test', f'f_{t:05.2f}.jpg'), quality=88)
        sys.exit()
    out = os.path.join(HERE, 'video_noaudio.mp4')
    nfr = int(DUR * FPS)
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    with mp.Pool(4) as pool:
        for i, b_ in enumerate(pool.imap(frame, range(nfr), chunksize=4)):
            ff.stdin.write(b_)
            if i % 150 == 0: print('frame', i, flush=True)
    ff.stdin.close(); ff.wait()
    print('ok', out)
