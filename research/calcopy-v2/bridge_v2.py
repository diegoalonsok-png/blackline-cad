"""CALCOPY v2 bridge for Pyodide: RGBA bytes -> two wall readings (solid / double line) in image px."""
import json
import cv2
import numpy as np
import walls_v2 as W

MAX_SIDE = 1600


def _walls(segs, k):
    out = []
    for s in segs:
        c, lo, hi, t = s['c'] / k, s['lo'] / k, s['hi'] / k, s['t'] / k
        a, b = ([c, lo], [c, hi]) if s['v'] else ([lo, c], [hi, c])
        out.append({'a': [round(a[0], 2), round(a[1], 2)], 'b': [round(b[0], 2), round(b[1], 2)], 't': round(t, 2)})
    return out


def _network_score(segs, T):
    # A real wall network has junctions; loose parallel strokes do not.
    tol = max(3, .8 * T)
    total = 0.0
    for i, s in enumerate(segs):
        if any(j != i and s['v'] != o['v'] and (W._touch(s, o, tol) or W._touch(o, s, tol)) for j, o in enumerate(segs)):
            total += s['hi'] - s['lo']
    return total


def analyze_v2(pixels, w, h):
    rgba = np.frombuffer(bytes(pixels), dtype=np.uint8).reshape(h, w, 4)
    im = cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGR)
    k = min(1.0, MAX_SIDE / max(w, h))
    if k < 1:
        im = cv2.resize(im, (max(1, round(w * k)), max(1, round(h * k))), interpolation=cv2.INTER_AREA)
    H, W_ = im.shape[:2]
    readings, scores = {}, {}
    for mode in ('solid', 'lines'):
        segs, T, _, _ = W.detect(im, mode)
        segs = segs if T else []
        readings[mode] = _walls(segs, k)
        scores[mode] = _network_score(segs, T or 1)
    best = max(scores, key=scores.get) if any(scores.values()) else 'solid'
    return json.dumps({'best': best, 'readings': readings})
