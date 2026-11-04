import numpy as np, subprocess, sys, os, wave
from timeline import *

SR = 48000
N = int(DUR * SR) + SR
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))

L = np.zeros(N); R = np.zeros(N)          # music bus (stereo)
FX = np.zeros((2, N))                     # sfx bus (not ducked as much)
VOB = np.zeros(N)                          # voice bus


def t2i(t): return int(round(t * SR))

def add(bus, sig, t, gain=1.0, pan=0.0):
    i = t2i(t)
    if i >= N: return
    if sig.ndim == 1:
        lg = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2); rg = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        s = sig[:N - i] * gain
        if bus is None:
            L[i:i + len(s)] += s * lg; R[i:i + len(s)] += s * rg
        else:
            bus[0, i:i + len(s)] += s * lg; bus[1, i:i + len(s)] += s * rg
    else:
        s = sig[:, :N - i] * gain
        if bus is None:
            L[i:i + s.shape[1]] += s[0]; R[i:i + s.shape[1]] += s[1]
        else:
            bus[:, i:i + s.shape[1]] += s

def tt(d): return np.arange(int(d * SR)) / SR

def env(d, a=0.002, r=None, curve=6.0):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4))
    e *= np.exp(-curve * t / d) if r is None else np.exp(-t / r)
    return e

from scipy.signal import lfilter, butter
def lp(x, fc):
    bb, aa = butter(2, min(fc, SR * 0.45) / (SR / 2), 'low')
    return lfilter(bb, aa, x)

def hp(x, fc): return x - lp(x, fc)

def bp(x, lo, hi): return lp(hp(x, lo), hi)

def noise(d): return rng.standard_normal(int(d * SR))

def nf(n): return 440.0 * 2 ** ((n - 69) / 12)

def fft_conv(x, ir):
    n = len(x) + len(ir)
    nn = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nn) * np.fft.rfft(ir, nn), nn)[:n]

def make_ir(d=2.2, decay=3.0, seed=1):
    r = np.random.default_rng(seed)
    t = tt(d)
    irl = r.standard_normal(len(t)) * np.exp(-decay * t)
    irr = r.standard_normal(len(t)) * np.exp(-decay * t)
    irl = lp(irl, 6000); irr = lp(irr, 6000)
    irl[:int(0.012 * SR)] = 0; irr[:int(0.017 * SR)] = 0
    return irl / np.abs(irl).sum() * 40, irr / np.abs(irr).sum() * 40

# ---------------------------------------------------------------- instruments
def kick(gain=1.0, d=0.45):
    t = tt(d)
    f = 48 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    click = noise(0.006) * np.linspace(1, 0, int(0.006 * SR)) * 0.4
    s[:len(click)] += click
    return np.tanh(s * 1.8) * gain

def ball_bounce(d=0.55):
    # leather ball: low thump + slap
    t = tt(d)
    f = 70 + 90 * np.exp(-t * 40)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    slap = bp(noise(0.05), 600, 3500) * np.exp(-tt(0.05) * 90) * 0.9
    s[:len(slap)] += slap
    return np.tanh(s * 1.6)

def clap():
    d = 0.32; s = np.zeros(int(d * SR))
    for k, off in enumerate([0, 0.011, 0.021, 0.03]):
        nn = bp(noise(d - off), 900, 5000) * np.exp(-tt(d - off) * (60 if k < 3 else 13))
        s[int(off * SR):] += nn
    return s * 0.7

def stomp():
    d = 0.5; t = tt(d)
    s = np.sin(2 * np.pi * np.cumsum(60 + 60 * np.exp(-t * 20)) / SR) * np.exp(-t * 9)
    s += lp(noise(d), 800) * np.exp(-t * 18) * 0.8
    return np.tanh(s * 1.5) * 0.8

def hat(open_=False):
    d = 0.25 if open_ else 0.05
    return hp(noise(d), 7000) * np.exp(-tt(d) * (14 if open_ else 90)) * (0.35 if open_ else 0.25)

def saw(f, d, detune=0.0):
    t = tt(d)
    ph = (t * f * (1 + detune)) % 1.0
    return 2 * ph - 1

def supersaw(f, d, voices=5, spread=0.012):
    s = np.zeros(int(d * SR))
    for v in range(voices):
        dt = (v - (voices - 1) / 2) * spread / voices
        s += saw(f, d, dt) * (1.0 if v == voices // 2 else 0.7)
    return s / voices

def pluck(f, d=0.35):
    s = supersaw(f, d, 3, 0.008)
    s = lp(s, 2500 + 0 * f) * np.exp(-tt(d) * 9)
    return s

def bass(f, d):
    s = saw(f, d) * 0.6 + np.sin(2 * np.pi * f * tt(d)) * 0.8
    s = lp(s, 380)
    e = np.minimum(1, tt(d) / 0.005) * np.minimum(1, (d - tt(d)) / 0.02)
    return np.tanh(s * e * 1.4) * 0.6

def pad(freqs, d):
    s = sum(supersaw(f, d, 5, 0.02) for f in freqs) / len(freqs)
    s = lp(s, 1800)
    e = np.minimum(1, tt(d) / 0.4) * np.minimum(1, (d - tt(d)) / 0.4)
    return s * e

def piano(f, d=4.0):
    t = tt(d)
    s = np.zeros_like(t)
    for h, amp in [(1, 1), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06), (6, 0.04)]:
        s += amp * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * np.exp(-t * (0.7 + 0.5 * h))
    s += bp(noise(0.02), 1000, 6000) * np.exp(-tt(0.02) * 200) * 0.05 if False else 0
    return s * np.minimum(1, t / 0.003) * 0.5

def heartbeat(gain=1.0):
    d = 0.42; out = np.zeros(int(d * SR))
    for off, g in [(0, 1.0), (0.14, 0.7)]:
        t = tt(0.18)
        s = np.sin(2 * np.pi * np.cumsum(45 + 30 * np.exp(-t * 30)) / SR) * np.exp(-t * 22) * g
        i = int(off * SR); out[i:i + len(s)] += s
    return lp(out, 160) * gain * 0.9

def breath(d, inhale=True):
    t = tt(d)
    e = np.sin(np.pi * t / d) ** 1.5
    nn = bp(noise(d), 500 if inhale else 300, 2600 if inhale else 1800)
    return nn * e * 0.35

def vowel(f, d, vib=5.5, seed=0):
    # crowd "oh" : glottal-ish pulse train through formant bandpasses (o: 450, 800, 2830)
    r = np.random.default_rng(seed)
    t = tt(d)
    fm = f * (1 + 0.012 * np.sin(2 * np.pi * vib * t + r.uniform(0, 6)) + r.uniform(-0.01, 0.01))
    ph = np.cumsum(fm) / SR
    src = (2 * (ph % 1) - 1) + 0.5 * np.sign(np.sin(2 * np.pi * ph))
    src += r.standard_normal(len(t)) * 0.08
    out = bp(src, 380, 560) * 1.0 + bp(src, 700, 950) * 0.55 + bp(src, 2500, 3100) * 0.12
    e = np.minimum(1, t / 0.06) * np.minimum(1, (d - t) / 0.12)
    return out * e

def crowd_oh(f, d, n=7):
    sL = np.zeros(int(d * SR)); sR = np.zeros(int(d * SR))
    for k in range(n):
        v = vowel(f * (2 if k % 3 == 0 else 1), d, 5 + k * 0.3, seed=k + int(f))
        p = (k / (n - 1)) * 2 - 1
        delay = int(rng.uniform(0, 0.03) * SR)
        v = np.concatenate([np.zeros(delay), v])[:len(sL)]
        sL += v * (1 - p) / 2; sR += v * (1 + p) / 2
    return np.vstack([sL, sR]) / n * 2.2

def riser(d):
    t = tt(d)
    f = 200 * (12 ** (t / d))
    s = supersaw(1, d) * 0  # placeholder
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1) - 1) * 0.25 + (2 * ((ph * 1.005) % 1) - 1) * 0.25
    nn = noise(d)
    # rising noise: crossfade lp cutoffs
    lo = lp(nn, 800); mid = lp(nn, 3000); hi = nn
    x = t / d
    nz = lo * (1 - x) + mid * x * (1 - x) * 2 + hi * x ** 2
    return (s * 0.5 + nz * 0.5) * (x ** 2.2)

def whoosh(d=0.9, up=True):
    t = tt(d); x = t / d
    nn = noise(d)
    a = lp(nn, 600); b_ = lp(nn, 4500)
    m = x if up else 1 - x
    e = np.sin(np.pi * x) ** 2
    return (a * (1 - m) + b_ * m) * e * 0.6

def whistle(d=0.55):
    t = tt(d)
    trill = 1 + 0.5 * (np.sin(2 * np.pi * 28 * t) > 0)
    f = 2850 + 60 * np.sin(2 * np.pi * 28 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * (trill - 1))
    s += bp(noise(d), 2400, 4200) * 0.25
    e = np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)
    return s * e * 0.35

def impact(d=2.5):
    t = tt(d)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 80 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.2)
    crash = hp(noise(d), 4000) * np.exp(-t * 2.5) * 0.35
    thud = lp(noise(d), 400) * np.exp(-t * 12) * 0.8
    return np.tanh((boom + thud) * 1.6) * 0.9 + crash

def click(f=3200, d=0.03):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 160) * 0.35

def blip(f1=1400, f2=2200, d=0.12):
    t = tt(d)
    f = f1 + (f2 - f1) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 25) * 0.25

def scan(d=0.7):
    t = tt(d)
    f = 600 + 2600 * t / d
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.08 + bp(noise(d), 2000, 6000) * 0.05
    return s * np.sin(np.pi * t / d)

def glitch(d=0.18):
    t = tt(d)
    sq = np.sign(np.sin(2 * np.pi * rng.uniform(150, 600) * t))
    s = sq * (np.floor(t * 60) % 2) * 0.15 + hp(noise(d), 2500) * 0.12
    return s * np.exp(-t * 8)

def tick(): return click(5200, 0.012) * 0.6

def bell(f=1318.5, d=3.0):
    t = tt(d); s = np.zeros_like(t)
    for h, a in [(1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.1)]:
        s += a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.2 + h * 0.8))
    return s * 0.3

def tape_stop(d=0.6):
    t = tt(d)
    f = 220 * (1 - t / d) ** 2 + 20
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - t / d) * 0.25 + lp(noise(d), 300) * (1 - t / d) * 0.2

def glass(d=1.2):
    t = tt(d); s = np.zeros_like(t)
    for f in [2093, 2637, 3136, 4186]:
        s += np.sin(2 * np.pi * f * t) * np.exp(-t * 3.5) * 0.08
    return s + whoosh(d, True) * 0.5

# ---------------------------------------------------------------- arrangement
irL, irR = make_ir(2.4, 2.4)

# ===== PRE-DROP (0 .. 17.6) =====
for t in BALL_HOOK:
    add(FX, ball_bounce(), t, 0.6, pan=0.3)
add(FX, np.vstack([hp(noise(0.25), 300) * np.exp(-tt(0.25) * 12) * 0.25] * 2), FREEZE - 0.03)
add(FX, tape_stop(), FREEZE, 0.9)
add(FX, impact(2.0), FREEZE, 0.45)
# heartbeat at 172 bpm, then slowing
tb = FREEZE + 0.1
while tb < 4.0:
    add(FX, heartbeat(0.9), tb); tb += 60 / 172
# heavy breathing
for k, t in enumerate(np.arange(1.7, 4.2, 0.62)):
    add(FX, breath(0.5 if k % 2 == 0 else 0.42, k % 2 == 0), t, 0.55, pan=-0.2)
# HUD on freeze
add(FX, scan(0.8), FREEZE + 0.05, 1.0)
for k in range(6): add(FX, tick(), FREEZE + 0.2 + k * 0.07, 1.0, pan=0.4)
add(FX, blip(900, 1800), 2.0, 1.0)

# pain: single piano note + echoing ball
add(None, piano(nf(57), 6.0), 4.25, 0.55)          # A3
add(None, piano(nf(64), 5.0), 6.1, 0.28)           # E4 soft
echo_ball = None
for t in BALL_ECHO:
    sig = ball_bounce() * 0.55
    n_ = int(1.8 * SR)
    sp = np.zeros(n_); sp[:len(sig)] = sig
    wl = fft_conv(sp, irL)[:n_] * 2.5; wr = fft_conv(sp, irR)[:n_] * 2.5
    # slap-back echo off the wall
    d_ = int(0.16 * SR); e_ = np.zeros(n_); e_[d_:] = sp[:-d_] * 0.45
    add(FX, np.vstack([sp + wl + e_, sp + wr + e_ * 0.8]), t, 0.8)
add(FX, ball_bounce(), BALL_MATCH, 1.0)
add(FX, impact(1.6), BALL_MATCH + 0.02, 0.35)
add(FX, whoosh(0.5, False), BALL_MATCH - 0.4, 0.5)

# fear: low drone + slow heartbeat + glitches on tags
drone_d = 6.0
dr = (np.sin(2 * np.pi * nf(33) * tt(drone_d)) * 0.5 + lp(saw(nf(45), drone_d), 300) * 0.3)
dr *= np.minimum(1, tt(drone_d) / 1.5) * np.minimum(1, (drone_d - tt(drone_d)) / 0.4)
add(None, dr, 8.2, 0.3)
add(None, piano(nf(53), 5.0), 8.25, 0.3)           # F3 -> darker
tb = 8.4
while tb < 14.0:
    add(FX, heartbeat(0.45), tb); tb += 60 / 110
for t in TAGS_C:
    add(FX, glitch(0.22), t, 1.0, pan=rng.uniform(-0.5, 0.5))
add(FX, scan(1.0), 8.6, 0.8)
add(FX, impact(1.4), 12.05, 0.25)

# turn: door + riser + snare roll + whistle
add(FX, glass(1.4), DOOR, 1.0)
add(FX, whoosh(1.0, True), DOOR - 0.1, 0.8)
add(None, riser(DROP - DOOR), DOOR, 0.55)
add(None, pad([nf(57), nf(61), nf(64), nf(69)], DROP - DOOR + 0.2), DOOR, 0.35)
# snare roll accelerating
t = DOOR + 0.6; step = BEAT
while t < DROP - 0.03:
    sn = bp(noise(0.12), 1500, 7000) * np.exp(-tt(0.12) * 30) * 0.6
    g = 0.25 + 0.75 * (t - DOOR) / (DROP - DOOR)
    add(None, sn, t, g)
    t += step
    if t > DOOR + 1.6: step = BEAT / 2
    if t > DOOR + 2.4: step = BEAT / 4
add(FX, whistle(0.5), WHISTLE, 1.0, pan=0.1)

# ===== POST-DROP =====
add(FX, impact(3.0), DROP, 0.85)
# chord progression A  E  F#m  D  (1 bar each)
prog = [(57, [57, 61, 64]), (52, [56, 59, 64]), (54, [57, 61, 66]), (50, [57, 62, 66])]
arp_pat = [0, 1, 2, 1, 2, 0, 1, 2]
melody = [  # crowd chant notes per bar (midi), 2-bar phrase: oh-oh-oh-oh
    [(0, 1.5, 69), (1.5, 1.0, 71), (2.5, 1.5, 73)],
    [(0, 1.5, 71), (1.5, 1.0, 69), (2.5, 1.5, 68)],
    [(0, 1.5, 69), (1.5, 1.0, 71), (2.5, 1.5, 73)],
    [(0, 1.0, 76), (1.0, 1.0, 74), (2.0, 2.0, 73)],
]
END_MUSIC = LOGO_HIT
nbeats = int(round((END_MUSIC - DROP) / BEAT))
H_start = SC['H'][0]; I_start = SC['I'][0]
for k in range(nbeats):
    t = DROP + k * BEAT
    bar = k // 4; bi = k % 4
    root, chord = prog[bar % 4]
    in_H = H_start <= t < I_start
    in_build = H_start + 12 * BEAT <= t < I_start
    # drums
    if not in_build or bi in (0, 2):
        add(None, kick(0.95), t)
    if in_build:
        add(None, kick(0.6), t + BEAT / 2)
    if bi in (1, 3):
        add(None, clap(), t, 0.55, pan=0.0)
        if t >= SC['F'][0]: add(None, stomp(), t, 0.5)
    add(None, hat(True), t + BEAT / 2, 0.8, pan=0.25)
    for s16 in range(4):
        add(None, hat(False), t + s16 * BEAT / 4, 0.55 if s16 % 2 else 0.35, pan=-0.3)
    # bass offbeat 8ths
    for e8 in range(2):
        add(None, bass(nf(root - 12), BEAT / 2 * 0.9), t + e8 * BEAT / 2, 0.7 if e8 else 0.45)
    # arp plucks (16ths) from F onwards, 8ths in E
    sub = 2 if t < SC['F'][0] else 4
    for s in range(sub):
        n = chord[arp_pat[(k * sub + s) % 8]] + 12
        add(None, pluck(nf(n), 0.3), t + s * BEAT / sub, 0.20, pan=0.5 if s % 2 else -0.5)
    # pad per bar
    if bi == 0:
        add(None, pad([nf(c) for c in chord] + [nf(root)], 4 * BEAT), t, 0.22 if not in_H else 0.3)
    # crowd chant: from F onwards every other phrase; full in I
    if bi == 0 and (t >= SC['F'][0]):
        phrase_bar = bar % 4
        use = t >= I_start or (bar % 4 in (0, 1) and t < SC['G'][0]) or in_H
        if use:
            for (st, ln, n) in melody[phrase_bar]:
                ch = crowd_oh(nf(n - 12), ln * BEAT * 0.95)
                add(None, ch, t + st * BEAT, 0.55 if t >= I_start else 0.35)
# build riser before the goal
add(None, riser(6 * BEAT), I_start - 6 * BEAT, 0.4)
add(FX, impact(2.5), I_start, 0.7)
add(FX, whistle(0.35), I_start - 0.05, 0.6)

# HUD sound design for chapters
for t in E_FLIPS: add(FX, blip(1200, 2400), t, 1.0, pan=0.3); add(FX, click(), t, 1.0)
for i in range(6): add(FX, click(2600, 0.03), SC['F'][0] + BEAT * (2 + i), 0.9, pan=-0.3)
add(FX, scan(0.9), SC['G'][0] + 0.2, 0.9)
for i in range(4): add(FX, blip(800 + i * 300, 1600 + i * 300), H_STEPS[i], 1.0)
for c in ['E', 'F', 'G', 'H', 'I']:
    add(FX, whoosh(0.55, True), SC[c][0] - 0.3, 0.5)
add(FX, tick(), SC['I'][0] + 0.6, 1.0)

# ===== CLOSE =====
add(FX, impact(3.5), LOGO_HIT, 1.0)
add(None, pad([nf(57), nf(64), nf(69), nf(73)], SILENCE_LINE - LOGO_HIT + 0.3), LOGO_HIT, 0.4)
add(FX, bell(nf(81), 3.5), 58.4, 0.8)
add(FX, bell(nf(76), 3.0), 58.4, 0.4)

# reverb on music bus
wetL = fft_conv(L, irL)[:N]; wetR = fft_conv(R, irR)[:N]
L = L + wetL * 0.22; R = R + wetR * 0.22
fxL = FX[0] + fft_conv(FX[0], irL)[:N] * 0.15
fxR = FX[1] + fft_conv(FX[1], irR)[:N] * 0.15

# ===== VOICE =====
def read_wav(p):
    with wave.open(p) as w:
        d = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        return d
vo_env = np.zeros(N)
for name, st, _ in VO:
    v = read_wav(os.path.join(HERE, 'audio', name + '.wav'))
    i = t2i(st); VOB[i:i + len(v)] += v[:N - i]
    vo_env[max(0, i - int(0.15 * SR)):i + len(v) + int(0.25 * SR)] = 1
# voice gets a touch of room
VOB = VOB * 1.0 + fft_conv(VOB, irL)[:N] * 0.05
# smooth ducking envelope
k = int(0.12 * SR)
ker = np.ones(k) / k
vo_env = np.convolve(vo_env, ker, mode='same')
duck = 1 - 0.55 * vo_env

# fade-out for silence on the final line
m_env = np.ones(N)
s0 = t2i(SILENCE_LINE - 0.5); s1 = t2i(SILENCE_LINE)
m_env[s0:s1] = np.linspace(1, 0, s1 - s0); m_env[s1:] = 0
# pre-drop and close sfx kept
fx_env = np.ones(N)
f0 = t2i(SILENCE_LINE - 0.3); fx_env[f0:t2i(58.3)] = np.linspace(1, 0.0, t2i(58.3) - f0)

mL = L * duck * m_env * 0.8 + fxL * fx_env * (1 - 0.3 * vo_env) * 0.75 + VOB * 1.25
mR = R * duck * m_env * 0.8 + fxR * fx_env * (1 - 0.3 * vo_env) * 0.75 + VOB * 1.25

# master: soft clip + normalize
mix = np.vstack([mL, mR])[:, :t2i(DUR)]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.abs(mix).max() / 0.95
fo = int(0.4 * SR); mix[:, -fo:] *= np.linspace(1, 0, fo)

out = os.path.join(HERE, 'audio', 'mix.wav')
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
# voice envelope for on-screen waveform (per frame rms)
fr = int(SR / FPS)
nfr = int(DUR * FPS)
rms = np.array([np.sqrt(np.mean(VOB[i * fr:(i + 1) * fr] ** 2)) for i in range(nfr)])
np.save(os.path.join(HERE, 'audio', 'vo_rms.npy'), rms / (rms.max() + 1e-9))
# music energy per frame (for beat-reactive visuals)
mus = (L + R)[:t2i(DUR)]
mrms = np.array([np.sqrt(np.mean(mus[i * fr:(i + 1) * fr] ** 2)) for i in range(nfr)])
np.save(os.path.join(HERE, 'audio', 'mus_rms.npy'), mrms / (mrms.max() + 1e-9))
print('done', out)
