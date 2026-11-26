"""CALCOPY v2 bridge for Pyodide: RGBA bytes -> two wall readings (solid / double line) in image px."""
import json
import cv2
import numpy as np
import walls_v2 as W

MAX_SIDE = 1600


def _rectangular_junctions(segs):
    """Connect only observed orthogonal wall bands at L/T/X nodes.
    Never fill collinear gaps (possible openings). Use original evidence,
    not successively extended endpoints. Keep constant rectangular width.
    """
    source = [dict(s) for s in segs]
    out = []
    for s in source:
        wall = dict(s)
        for end in ('lo', 'hi'):
            options = []
            for o in source:
                if s['v'] == o['v']:
                    continue
                # Perpendicular bands must physically touch or be within
                # a small raster tolerance; do not bridge an empty room.
                eps = max(1., min(2., .12 * min(s['t'], o['t'])))
                if not o['lo'] - s['t']/2 - eps <= s['c'] <= o['hi'] + s['t']/2 + eps:
                    continue
                d = abs(s[end] - o['c'])
                if d <= o['t']/2 + eps:
                    options.append((d, o['c']))
            if options:
                wall[end] = min(options)[1]
        if wall['hi'] > wall['lo']:
            out.append(wall)
        else:
            out.append(dict(s))
    return out


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


def _mixed(solid, lines):
    """Combine independently observed walls without drawing across gaps.
    Solid evidence wins over overlapping thin-line hypotheses. Keep only
    sufficiently long, non-overlapping remainders of double-line walls.
    """
    out = [dict(s) for s in solid]
    for q in sorted(lines, key=lambda s: -(s['hi'] - s['lo'])):
        intervals = [(q['lo'], q['hi'])]
        for p in out:
            if p['v'] != q['v']:
                continue
            # Require nearly the same axis and plausible common thickness.
            if abs(p['c'] - q['c']) > max(2, .4 * min(p['t'], q['t'])):
                continue
            if max(p['t'], q['t']) > 2.0 * min(p['t'], q['t']):
                continue
            rest = []
            for lo, hi in intervals:
                a, b = max(lo, p['lo']), min(hi, p['hi'])
                if b <= a:
                    rest.append((lo, hi))
                else:
                    if a > lo:
                        rest.append((lo, a))
                    if hi > b:
                        rest.append((b, hi))
            intervals = rest
            if not intervals:
                break
        for lo, hi in intervals:
            if hi - lo >= max(6, 2.5 * q['t']):
                out.append(dict(q, lo=lo, hi=hi))
    return out


def _recover_returns(im, established, T):
    """Recover short double-face wall returns missed by the long-line pass.
    The architectural prior is conditional: an unclassified closed band
    touching the established wall network is a candidate, not proof.
    Single strokes and isolated furniture-like rectangles are not walls.
    No new gap is bridged. Return candidates for the existing review UI.
    """
    if not established or not T:
        return []
    paper = float(np.percentile(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), 90))
    result = []
    for v in (False, True):
        faces, ink = W.thin_lines(im, paper, v)
        # The main detector already handles the long faces.
        for i, p in enumerate(faces):
            for q in faces[i+1:]:
                gap = q['c'] - p['c']
                t = gap + (p['t'] + q['t']) / 2
                if gap > 2.1 * T:
                    break
                if gap < max(3, .45 * T) or t > 2.4 * T:
                    continue
                lo, hi = max(p['lo'], q['lo']), min(p['hi'], q['hi'])
                if hi - lo < max(8, 1.8 * t):
                    continue
                c = (p['c'] + q['c']) / 2
                candidate = dict(v=v, c=c, t=t, lo=lo, hi=hi)
                # Require an actual perpendicular contact near an endpoint.
                contacts = []
                for s in established:
                    if s['v'] == v:
                        continue
                    if not s['lo'] - s['t']/2 <= c <= s['hi'] + s['t']/2:
                        continue
                    if min(abs(lo-s['c']), abs(hi-s['c'])) <= s['t']/2 + max(2,.25*t):
                        contacts.append(s)
                if not contacts:
                    continue
                y0 = max(0, int(np.ceil(p['c'] + p['t']/2)))
                y1 = min(ink.shape[0], int(np.floor(q['c'] - q['t']/2))+1)
                core = ink[y0:y1, int(lo):int(hi)+1]
                if not core.size or core.mean() > .55:
                    continue
                # A continuous middle stroke often means furniture/stairs.
                if core.shape[0] > 2 and core[1:-1].mean(axis=1).max(initial=0) > .8:
                    continue
                result.append(candidate)
                if len(result) >= 250:
                    return []
    return result


def analyze_v2(pixels, w, h):
    rgba = np.frombuffer(bytes(pixels), dtype=np.uint8).reshape(h, w, 4)
    im = cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGR)
    k = min(1.0, MAX_SIDE / max(w, h))
    if k < 1:
        im = cv2.resize(im, (max(1, round(w * k)), max(1, round(h * k))), interpolation=cv2.INTER_AREA)
    H, W_ = im.shape[:2]
    readings, scores, raw, thickness = {}, {}, {}, {}
    for mode in ('solid', 'lines'):
        segs, T, actual, _ = W.detect(im, mode)
        # detect() may fall back to another mode. Never mislabel it.
        segs = segs if T and actual == mode else []
        raw[mode] = segs
        thickness[mode] = T if segs else None
        readings[mode] = _walls(segs, k)
        scores[mode] = _network_score(segs, thickness[mode] or 1)
    combined = _mixed(raw['solid'], raw['lines'])
    primary = max(('solid', 'lines'), key=lambda m: (scores[m], len(raw[m])))
    T = min((v for v in thickness.values() if v), default=1)
    # Recover missing connected returns after the primary classification.
    if combined and any(thickness.values()):
        combined = _mixed(combined, _recover_returns(im, combined, T))
    combined = _rectangular_junctions(combined)
    readings['mixed'] = _walls(combined, k)
    mixed_score = _network_score(combined, T)
    # Prefer mixed only if it adds meaningful connected evidence. The
    # user can still review each independent reading.
    best = primary
    if combined and mixed_score > 1.12 * scores[primary] and len(combined) <= 250:
        best = 'mixed'
    return json.dumps({'best': best, 'readings': readings})
