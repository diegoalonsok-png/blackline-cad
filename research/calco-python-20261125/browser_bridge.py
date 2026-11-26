"""Browser adapter for the recovered CALCO modules; returns reviewable wall candidates."""
import json
import math
import numpy as np
import cv2
import calco_semantico as semantic
import wall_solid_vision as solid
import wall_hatch_vision as hatch
import wall_junctions as joints

def outline_candidates(im,ppm):
    """Parallel contour faces for unfilled wall drawings; candidates only."""
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    ink=(gray<155).astype(np.uint8)
    minlen=max(12,round(.45*ppm));out=[]
    for vertical in (False,True):
        src=ink.T.copy() if vertical else ink
        mask=cv2.morphologyEx(src,cv2.MORPH_CLOSE,np.ones((1,3),np.uint8))
        mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((1,minlen),np.uint8))
        _,_,stats,cent=cv2.connectedComponentsWithStats(mask)
        lines=sorted((float(c[1]),int(x),int(x+w-1)) for (x,y,w,h,a),c in zip(stats[1:],cent[1:]) if w>=minlen and h<=max(3,round(.045*ppm)))
        if len(lines)>1500:continue
        for i,(c,lo,hi) in enumerate(lines):
            for d,lo2,hi2 in lines[i+1:]:
                t=d-c
                if t>.35*ppm:break
                if t<.10*ppm:continue
                a,b=max(lo,lo2),min(hi,hi2)
                if b-a<max(minlen,2.8*t):continue
                y0=math.ceil(c+t*.2);y1=math.floor(d-t*.2)+1
                core=src[y0:y1,a:b+1]
                if not core.size or core.mean()>.23:continue
                cc=(c+d)/2
                out.append(dict(a=[cc,a] if vertical else [a,cc],b=[cc,b] if vertical else [b,cc],t=t))
                if len(out)>1000:return []
    return sorted(out,key=lambda q:-math.dist(q['a'],q['b']))

def wide_outline_candidates(gray,ppm):
    """Detect wide hollow masonry from dark parallel faces, including short returns."""
    out=[]
    minimum=max(9,round(.30*ppm))
    for vertical in (False,True):
        src=gray.T.copy() if vertical else gray
        ink=(src<125).astype(np.uint8)
        mask=cv2.morphologyEx(ink,cv2.MORPH_CLOSE,np.ones((1,3),np.uint8))
        mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((1,minimum),np.uint8))
        # Row runs avoid losing faces when a perpendicular junction joins components.
        lines=[]
        for y,row in enumerate(mask):
            edges=np.flatnonzero(np.diff(np.r_[0,row,0].astype(np.int16)))
            for lo,hi in zip(edges[::2],edges[1::2]):
                if hi-lo>=minimum:lines.append((y,int(lo),int(hi)))
        if len(lines)>6000:continue
        for i,(c,lo,hi) in enumerate(lines):
            for d,l2,h2 in lines[i+1:]:
                t=d-c
                if t>1.20*ppm:break
                if t<=.35*ppm:continue
                a,b=max(lo,l2),min(hi,h2)
                if b-a<max(minimum,1.15*t):continue
                if min(hi-lo,h2-l2)<.55*max(hi-lo,h2-l2):continue
                core=ink[c+1:d,a:b]
                if not core.size or core.mean()>.20:continue
                # Avoid pairing across an intervening continuous partition.
                if np.max(core.mean(axis=1))>.65:continue
                if min(ink[c,a:b].mean(),ink[d,a:b].mean())<.80:continue
                cc=(c+d)/2
                out.append(dict(a=[cc,a] if vertical else [a,cc],b=[cc,b-1] if vertical else [b-1,cc],t=t))
                break
    return sorted(out,key=lambda q:-math.dist(q['a'],q['b']))

def wall_evidence(gray,q,ppm):
    """Require sustained dark band or two dark faces; reject isolated furniture strokes."""
    src=gray.T if q['vertical'] else gray
    lo=max(0,math.ceil(q['lo']));hi=min(src.shape[1],math.floor(q['hi'])+1)
    c=q['c'];t=q['t'];r=max(1,round(.025*ppm))
    if hi<=lo:return False
    def strip(y,radius):
        a=max(0,round(y)-radius);b=min(src.shape[0],round(y)+radius+1)
        return src[a:b,lo:hi]
    core=strip(c,max(1,round(t*.35)))
    if not core.size:return False
    dark=(core<110)
    coverage=float(np.mean(np.mean(dark,axis=0)>.55))
    if coverage>=.70:return True
    faces=[strip(c-t/2,r),strip(c+t/2,r)]
    paired=all(f.size and np.mean(np.min(f,axis=0)<135)>=.65 for f in faces)
    if paired:return True
    if q['kind']=='hatch nominal':
        # Preserve sustained hatch texture, not a single diagonal or chair arc.
        return hi-lo>=.45*ppm and np.mean(dark)>=.18 and np.mean(np.any(dark,axis=0))>=.75
    return False

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
        if not all(math.isfinite(v) for v in a+b+[t]) or not .08*ppm<=t<=(1.2 if kind=='wide outline' else .5)*ppm or math.dist(a,b)<=.1*ppm:
            return
        v=abs(b[0]-a[0])<1e-7
        if not v and abs(b[1]-a[1])>1e-7:return
        i=int(v);c=a[1-i];lo,hi=sorted([a[i],b[i]])
        for q in out:
            if q['vertical']!=v:continue
            if abs(c-q['c'])<.35*min(t,q['t']) and min(hi,q['hi'])-max(lo,q['lo'])>.65*min(hi-lo,q['hi']-q['lo']):
                if kind=='outline review' and hi-lo>1.25*(q['hi']-q['lo']) and lo<=q['lo'] and hi>=q['hi']:
                    q.update(a=a,b=b,t=t,kind=kind,c=c,lo=lo,hi=hi)
                return
        out.append(dict(a=a,b=b,t=t,kind=kind,vertical=v,c=c,lo=lo,hi=hi))
    for q in semantic.detect_wall_candidates(im,ppm):
        add(q['a'],q['b'],q['pixel_thickness'],'semantic')
    for q in solid.detect(im,ppm):
        c=q['c'];lo=q['start'];hi=q['end']
        add([lo,c] if q['axis']=='h' else [c,lo],[hi,c] if q['axis']=='h' else [c,hi],.2*ppm,'solid nominal')
    candidates,_=hatch.detect(im,(0,0,w,h),ppm)
    for q in candidates:add(q['a'],q['b'],.2*ppm,'hatch nominal')
    for q in outline_candidates(im,ppm):add(q['a'],q['b'],q['t'],'outline review')
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    out=[q for q in out if wall_evidence(gray,q,ppm)]
    for q in wide_outline_candidates(gray,ppm):
        add(q['a'],q['b'],q['t'],'wide outline')
    out=[q for q in out if wall_evidence(gray,q,ppm)]
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
