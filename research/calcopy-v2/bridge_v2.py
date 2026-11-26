"""CALCOPY v2 bridge for Pyodide: RGBA bytes -> two wall readings (solid / double line) in image px."""
import json
import cv2
import numpy as np
import walls_v2 as W
import semantic_v2 as S

MAX_SIDE = 1600


def _walls(segs, k):
    out = []
    for s in segs:
        c, lo, hi, t = s['c'] / k, s['lo'] / k, s['hi'] / k, s['t'] / k
        a, b = ([c, lo], [c, hi]) if s['v'] else ([lo, c], [hi, c])
        out.append({'a': [round(a[0], 2), round(a[1], 2)], 'b': [round(b[0], 2), round(b[1], 2)], 't': round(t, 2), **{key:s[key] for key in ('wall_role','nominal_cm','thickness_cm','width_review') if key in s}})
    return out


def _network_score(segs, T):
    # A real wall network has junctions; loose parallel strokes do not.
    tol = max(3, .8 * T)
    total = 0.0
    for i, s in enumerate(segs):
        if any(j != i and s['v'] != o['v'] and (W._touch(s, o, tol) or W._touch(o, s, tol)) for j, o in enumerate(segs)):
            total += s['hi'] - s['lo']
    return total


def analyze_v2(pixels, w, h, real_width_m=None):
    rgba = np.frombuffer(bytes(pixels), dtype=np.uint8).reshape(h, w, 4)
    im = cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGR)
    k = min(1.0, MAX_SIDE / max(w, h))
    if k < 1:
        im = cv2.resize(im, (max(1, round(w * k)), max(1, round(h * k))), interpolation=cv2.INTER_AREA)
    H, W_ = im.shape[:2]
    readings, scores, axes = {}, {}, {}
    for mode in ('solid', 'lines'):
        segs, T, _, _ = W.detect(im, mode)
        segs = segs if T else []
        axes[mode] = segs
        readings[mode] = _walls(segs, k)
        scores[mode] = _network_score(segs, T or 1)
    best = max(scores, key=scores.get) if any(scores.values()) else 'solid'
    other = 'lines' if best == 'solid' else 'solid'
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    paper = float(np.percentile(gray, 90))
    ink, _ = W._ink(im, paper, .82)
    # Recover outline candidates before their separate network filter discards them.
    raw_lines, _ = W.line_pairs(im, paper)
    secondary = axes[other] + raw_lines
    mixed = S.fuse(ink, axes[best], secondary)
    readings['mixed'] = _walls(mixed, k)
    # Use original grayscale evidence, including colored masonry, to review
    # proposed black silhouettes. The source-support metric is not accuracy.
    review_ink=(gray<min(paper*.90,paper-18)).astype(np.uint8)
    validated,diagnostics=S.validate_mask(review_ink,mixed,max_passes=3)
    readings['validated']=_walls(validated,k)
    mask=S.black_mask(review_ink.shape,validated)
    regions=S.region_hierarchy(S.enclosed_regions(mask))
    ppm=w*k/real_width_m if real_width_m is not None and real_width_m>0 else 0
    metric,metric_stats=S.metric_wall_review(review_ink,validated,ppm)
    readings['metric']=_walls(metric,k)
    diagnostics['metric']=metric_stats
    floor_grids=S.repeated_floor_grid(review_ink,S.black_mask(review_ink.shape,metric),ppm)
    doors=S.detect_door_symbols(review_ink,metric,ppm)
    for door in doors:
        for key in ('c','g0','g1'):door[key]=round(door[key]/k,2)
    for grid in floor_grids:
        for key in ('x','y','w','h'):grid[key]=round(grid[key]/k,2)
    for region in regions:
        region['kind']=S.classify_region(region,ppm)
        if ppm:
            region['width_m']=round(region['w']/ppm,3)
            region['depth_m']=round(region['h']/ppm,3)
            region['area_m2']=round(region['area']/ppm**2,3)
        for key in ('x','y','w','h'):region[key]=round(region[key]/k,2)
        region['area']=round(region['area']/k**2,2)
        for ring in region.get('rings',[]):ring['points']=[[round(x/k,2),round(y/k,2)] for x,y in ring['points']]
    diagnostics['residual']=S.residual_summary(review_ink,mask)
    # Diagnostic room candidates only; do not alter wall geometry or invent doors.
    return json.dumps({'best': best, 'readings': readings, 'validation':diagnostics,'regions':regions,'floor_grids':floor_grids,'doors':doors})
