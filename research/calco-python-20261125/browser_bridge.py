"""Browser adapter for the recovered CALCO modules; returns reviewable wall candidates."""
import json
import math
import numpy as np
import cv2
import calco_semantico as semantic
import wall_solid_vision as solid
import wall_hatch_vision as hatch
import wall_junctions as joints

def analyze_rgba(rgba, w, h, ppm):
    if not (1 <= w <= 4096 and 1 <= h <= 4096 and w*h <= 8000000):
        raise ValueError("Invalid raster size")
    if not 10 <= ppm <= 1000:
        raise ValueError("Calibrate the image; required resolution 10–1000 px/m")
    im=cv2.cvtColor(np.frombuffer(rgba, dtype=np.uint8).reshape(h,w,4),cv2.COLOR_RGBA2BGR)
    out=[]
    def add(a,b,t,kind):
        a,b=[list(map(float,p)) for p in (a,b)]
        t=float(t)
        if not all(math.isfinite(v) for v in a+b+[t]) or not .08*ppm<=t<=.5*ppm or math.dist(a,b)<=.1*ppm:
            return
        v=abs(b[0]-a[0])<1e-7
        if not v and abs(b[1]-a[1])>1e-7:return
        i=int(v);c=a[1-i];lo,hi=sorted([a[i],b[i]])
        for q in out:
            if q['vertical']!=v:continue
            if abs(c-q['c'])<.6*max(t,q['t']) and min(hi,q['hi'])-max(lo,q['lo'])>.35*min(hi-lo,q['hi']-q['lo']):
                return
        out.append(dict(a=a,b=b,t=t,kind=kind,vertical=v,c=c,lo=lo,hi=hi))
    for q in semantic.detect_wall_candidates(im,ppm):
        add(q['a'],q['b'],q['pixel_thickness'],'semantic')
    for q in solid.detect(im,ppm):
        c=q['c'];lo=q['start'];hi=q['end']
        add([lo,c] if q['axis']=='h' else [c,lo],[hi,c] if q['axis']=='h' else [c,hi],.2*ppm,'solid nominal')
    candidates,_=hatch.detect(im,(0,0,w,h),ppm)
    for q in candidates:add(q['a'],q['b'],.2*ppm,'hatch nominal')
    if len(out)>250:raise ValueError("Too many candidates; use a cropped plan")
    rows=[(str(i),q['a'],q['b']) for i,q in enumerate(out)]
    if rows:
        snapped,edits=joints.snap_axes(rows,tol=max(1,.08*ppm))
        widths={str(i):q['t'] for i,q in enumerate(out)}
        if all(math.dist(a,b)>.1*ppm for _,a,b in snapped):
            geom,audit=joints.build_walls(snapped,widths)
            if geom.is_valid:
                for i,a,b in snapped:
                    out[int(i)]['a']=a.tolist();out[int(i)]['b']=b.tolist()
    return json.dumps([dict(a=q['a'],b=q['b'],t=q['t'],kind=q['kind']) for q in out])
