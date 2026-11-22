"""Build the two-heads mark as a clean SVG path.

Corners are placed by hand from measurements of the reference scan. The long curves
(outer skull, back of the inner head, inner forehead) are fitted to the scan's
outline with least-squares cubic Beziers so they come out smooth.

Usage: python3 -I brand-src/build-mark.py <reference.png> <crop x0,y0,x1,y1> <out.svg>
"""
import sys, math
import numpy as np
from PIL import Image, ImageFilter

ref, box, out = sys.argv[1], tuple(int(v) for v in sys.argv[2].split(',')), sys.argv[3]
UP = 4

# ---------- outline of the reference (marching squares, crop px) ----------
im = Image.open(ref).convert('L').crop(box)
im = im.resize((im.width * UP, im.height * UP), Image.BICUBIC).filter(ImageFilter.GaussianBlur(UP * 0.8))
a = np.pad(1.0 - np.asarray(im, dtype=float) / 255.0, 2)
H, W = a.shape; T = 0.5; ins = a >= T
pts = {}; adj = {}
def add(k, p1, p2, v1, v2):
    if k not in pts:
        t = (T - v1) / (v2 - v1); pts[k] = (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))
def link(k1, k2): adj.setdefault(k1, []).append(k2); adj.setdefault(k2, []).append(k1)
for y in range(H - 1):
    for x in range(W - 1):
        q = (ins[y, x], ins[y, x + 1], ins[y + 1, x + 1], ins[y + 1, x])
        if all(q) or not any(q): continue
        v = (a[y, x], a[y, x + 1], a[y + 1, x + 1], a[y + 1, x])
        E = {('h', x, y): ((x, y), (x + 1, y), v[0], v[1]), ('v', x + 1, y): ((x + 1, y), (x + 1, y + 1), v[1], v[2]),
             ('h', x, y + 1): ((x, y + 1), (x + 1, y + 1), v[3], v[2]), ('v', x, y): ((x, y), (x, y + 1), v[0], v[3])}
        c = [k for k, (p1, p2, v1, v2) in E.items() if (v1 >= T) != (v2 >= T)]
        for k in c: add(k, *E[k])
        if len(c) == 2: link(*c)
        elif len(c) == 4:
            kk = list(E)
            if (sum(v) / 4 >= T) == bool(q[0]): link(kk[0], kk[1]); link(kk[2], kk[3])
            else: link(kk[0], kk[3]); link(kk[2], kk[1])
seen = set(); loops = []
for s in adj:
    if s in seen: continue
    L = [s]; seen.add(s); prev = None; cur = s
    while True:
        nx = [n for n in adj[cur] if n != prev and n not in seen]
        if not nx: break
        prev, cur = cur, nx[0]; seen.add(cur); L.append(cur)
    if len(L) > 200: loops.append((np.array([pts[k] for k in L]) - 2) / UP)

def arc(p0, p1, sigma=5.0):
    """Contour points between two points, along the shorter way round the loop that holds both."""
    best = None
    for L in loops:
        i = int(np.argmin(np.hypot(*(L - p0).T))); j = int(np.argmin(np.hypot(*(L - p1).T)))
        d = np.hypot(*(L[i] - p0)) + np.hypot(*(L[j] - p1))
        if best is None or d < best[0]: best = (d, L, i, j)
    _, L, i, j = best; n = len(L)
    fwd = (j - i) % n; bwd = (i - j) % n
    idx = [(i + k) % n for k in range(fwd + 1)] if fwd <= bwd else [(i - k) % n for k in range(bwd + 1)]
    seg = L[idx]; seg[0], seg[-1] = p0, p1
    # resample to 0.5 px spacing, then smooth along the run (sigma in px); odd reflection keeps the end tangents
    s_ = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(seg, axis=0).T))])
    t = np.linspace(0, s_[-1], max(8, int(s_[-1] / 0.5)))
    seg = np.stack([np.interp(t, s_, seg[:, 0]), np.interp(t, s_, seg[:, 1])], 1)
    sg = sigma / 0.5; r = int(3 * sg)
    if r >= 1 and len(seg) > 4:
        k = np.exp(-0.5 * (np.arange(-r, r + 1) / sg) ** 2); k /= k.sum()
        r = min(r, len(seg) - 2); k = k[len(k) // 2 - r: len(k) // 2 + r + 1]; k /= k.sum()
        pad = np.vstack([2 * seg[0] - seg[r:0:-1], seg, 2 * seg[-1] - seg[-2:-r - 2:-1]])
        seg = np.stack([np.convolve(pad[:, 0], k, 'valid'), np.convolve(pad[:, 1], k, 'valid')], 1)
    seg[0], seg[-1] = p0, p1
    return seg

# ---------- Schneider-style cubic fitting ----------
def bez(P, t):
    t = t[:, None]; return ((1 - t) ** 3) * P[0] + 3 * ((1 - t) ** 2) * t * P[1] + 3 * (1 - t) * t * t * P[2] + t ** 3 * P[3]
def unit(v): return v / (np.hypot(*v) + 1e-12)
def chord(d): s = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(d, axis=0).T))]); return s / s[-1]
def gen(d, u, t1, t2):
    A1 = 3 * ((1 - u) ** 2 * u)[:, None] * t1; A2 = 3 * ((1 - u) * u * u)[:, None] * t2
    C = np.array([[np.sum(A1 * A1), np.sum(A1 * A2)], [np.sum(A1 * A2), np.sum(A2 * A2)]])
    tmp = d - bez(np.array([d[0], d[0], d[-1], d[-1]]), u)
    X = np.array([np.sum(A1 * tmp), np.sum(A2 * tmp)])
    try: al = np.linalg.solve(C, X)
    except np.linalg.LinAlgError: al = np.array([0, 0])
    seg = np.hypot(*(d[-1] - d[0]))
    if al[0] < 1e-3 * seg or al[1] < 1e-3 * seg: al = np.array([seg / 3, seg / 3])
    return np.array([d[0], d[0] + t1 * al[0], d[-1] + t2 * al[1], d[-1]])
def fit(d, t1, t2, tol):
    u = chord(d)
    for _ in range(6):
        P = gen(d, u, t1, t2)
        # one Newton step of reparameterisation
        B = bez(P, u); t = u[:, None]
        d1 = 3 * ((1 - t) ** 2 * (P[1] - P[0]) + 2 * (1 - t) * t * (P[2] - P[1]) + t * t * (P[3] - P[2]))
        d2 = 6 * ((1 - t) * (P[2] - 2 * P[1] + P[0]) + t * (P[3] - 2 * P[2] + P[1]))
        num = np.sum((B - d) * d1, 1); den = np.sum(d1 * d1 + (B - d) * d2, 1)
        u = np.clip(u - np.where(np.abs(den) > 1e-9, num / den, 0), 0, 1); u[0], u[-1] = 0, 1
    P = gen(d, u, t1, t2); e = np.hypot(*(bez(P, u) - d).T); i = int(np.argmax(e))
    if e[i] <= tol or len(d) < 8: return [P]
    i = min(max(i, 3), len(d) - 4); tc = unit(d[i - 2] - d[i + 2])
    return fit(d[:i + 1], t1, tc, tol) + fit(d[i:], -tc, t2, tol)
def curve(p0, p1, tol=0.45, t_start=None, t_end=None, sigma=5.0):
    d = arc(np.array(p0, float), np.array(p1, float), sigma)
    t1 = unit(np.array(t_start, float)) if t_start is not None else unit(d[min(6, len(d) - 1)] - d[0])
    t2 = unit(np.array(t_end, float)) if t_end is not None else unit(d[max(-7, -len(d))] - d[-1])
    return [('C', P[1], P[2], P[3]) for P in fit(d, t1, t2, tol)]

# ---------- the mark: one closed outline, clockwise on screen ----------
K = 0.5523  # cubic approximation of a quarter circle
def corner(c, din, dout, r):
    c = np.array(c, float); din = unit(np.array(din, float)); dout = unit(np.array(dout, float))
    s = c - din * r; e = c + dout * r
    return [('L', s), ('C', s + din * r * K, e - dout * r * K, e)]

# Measured points (crop px of the reference scan)
TIP = (30.0, 257.0)        # back-of-head tip, also the inner face's nose tip
F = (343.6, 160.0)         # forehead, where the outer skull meets the nose ridge
NOSE = (375.0, 252.5)
LIPTOP = (337.0, 260.8)
CHIN = (337.5, 331.0)
RNECK_R, RNECK_L, BOTTOM = 284.3, 234.5, 407.5
BROW = (67.0, 163.0)       # inner face: forehead turns into the nose slope
TRI_TR = (70.5, 261.5); TRI_BR = (70.5, 318.0)
PINCH = (73.5, 331.5)      # where the triangle meets the left neck block
LNECK_L, LNECK_R, LNECK_TOP = 73.5, 127.0, 333.6

segs = [('M', np.array(TIP))]
segs += curve(TIP, F, tol=1.1, sigma=6)                                         # outer skull, over the top
segs += [('L', np.array([NOSE[0] - 1.6, NOSE[1] - 2.6]))]                                # nose ridge
segs += [('C', np.array([NOSE[0] + 0.4, NOSE[1] + 0.6]), np.array([NOSE[0] - 0.4, NOSE[1] + 3.6]), np.array([NOSE[0] - 3.5, NOSE[1] + 4.0]))]
segs += corner(LIPTOP, (-1, 0.15), (0, 1), 1.6)                        # under the nose, into the lip
segs += corner(CHIN, (0, 1), (-1, 0.03), 4.5)                          # lip, chin step
segs += corner((RNECK_R, 332.5), (-1, 0.03), (0, 1), 2.0)              # chin step, right neck
segs += corner((RNECK_R, BOTTOM), (0, 1), (-1, 0), 8.5)
segs += corner((RNECK_L, BOTTOM), (-1, 0), (0, -1), 8.5)
segs += [('L', np.array([RNECK_L, 346.0]))]
segs += curve((RNECK_L, 346.0), BROW, tol=1.1, t_start=(0, -1), sigma=6)       # back of the inner head, over the top, inner forehead
_a, _b = np.array(BROW), np.array(TIP) + np.array([0.9, 0.6]); _n = unit(np.array([-(_b - _a)[1], (_b - _a)[0]]))
segs += [('C', _a + (_b - _a) / 3 + _n * 1.6, _a + 2 * (_b - _a) / 3 + _n * 1.2, _b)]  # inner nose slope, a slight bow
segs += [('L', np.array(TRI_TR))]                                      # under the inner nose
segs += [('L', np.array(TRI_BR))]                                      # inner lip
segs += [('L', np.array(PINCH))]                                       # inner chin
segs += corner((LNECK_R, LNECK_TOP + 1.2), (1, 0.04), (0, 1), 3.0)     # inner jaw = top of the left neck
segs += corner((LNECK_R, BOTTOM), (0, 1), (-1, 0), 8.5)
segs += corner((LNECK_L, BOTTOM), (-1, 0), (0, -1), 8.5)
segs += [('L', np.array(PINCH)), ('L', np.array(TIP)), ('Z',)]

# ---------- write SVG ----------
samp = []; cur = None
for sg_ in segs:
    if sg_[0] in 'ML': cur = sg_[1]; samp.append(cur)
    elif sg_[0] == 'C':
        P = np.array([cur, sg_[1], sg_[2], sg_[3]]); samp.extend(bez(P, np.linspace(0, 1, 40))); cur = sg_[3]
allp = np.array(samp)
mn, mx = allp.min(0), allp.max(0); pad = 0.0
ox, oy = mn[0] - pad, mn[1] - pad; w, h = mx[0] - mn[0] + 2 * pad, mx[1] - mn[1] + 2 * pad
S = 100 / max(w, h)
def f(p): return f'{(p[0] - ox) * S:.2f}'.rstrip('0').rstrip('.') + ' ' + f'{(p[1] - oy) * S:.2f}'.rstrip('0').rstrip('.')
d = ''.join(s[0] + ' '.join(f(p) for p in s[1:]) if s[0] != 'Z' else 'Z' for s in segs)
vb = f'0 0 {w * S:.2f} {h * S:.2f}'
open(out, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><path d="{d}"/></svg>\n')
print('viewBox', vb, 'path chars', len(d), 'curves', sum(1 for s in segs if s[0] == 'C'))
print('ref-map', ox, oy, S)
