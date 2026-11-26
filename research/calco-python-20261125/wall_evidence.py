"""Research-only evidence verification of candidate wall rectangles."""
import cv2 as cv
import numpy as np
import math
from wall_rectangles import extract_rectangles
from wall_black_mask import rectangle_mask

def evidence_rectangles(im, mask, ppm):
    gray=cv.cvtColor(im,cv.COLOR_BGR2GRAY) if im.ndim==3 else im
    accepted=[]; rejected=[]
    for q in extract_rectangles(mask,ppm):
        a,b=q['a'],q['b']; v=abs(a[0]-b[0])<1e-7; g=gray.T if v else gray
        c=a[0] if v else a[1];lo,hi=sorted((a[1],b[1]) if v else (a[0],b[0]));t=q['t']
        x0=max(0,math.ceil(lo));x1=min(g.shape[1],math.floor(hi));y0=max(0,round(c-t/2));y1=min(g.shape[0],round(c+t/2))
        if x1<=x0 or y1<=y0:continue
        core=(g[y0:y1,x0:x1]<170).mean(axis=0);d=max(1,round(.035*ppm))
        top=g[max(0,y0-d):min(g.shape[0],y0+d+1),x0:x1];bot=g[max(0,y1-d):min(g.shape[0],y1+d+1),x0:x1]
        edges=(top.min(axis=0)<175)&(bot.min(axis=0)<175)
        coverage=float(((core>=.46)|edges).mean()); item=dict(q,evidence=round(coverage,4))
        (accepted if coverage>=.68 else rejected).append(item)
    return accepted,rejected,rectangle_mask(gray.shape,accepted)

if __name__=='__main__':
    for ppm in (50,100,160):
        for t in (.10,.15,.20,.30):
            g=np.full((4*ppm,8*ppm),245,np.uint8);truth=np.zeros_like(g);th=round(t*ppm)
            truth[ppm:ppm+th,ppm:3*ppm]=1;truth[ppm:ppm+th,4*ppm:7*ppm]=1
            g[truth>0]=20; initial=truth.copy(); initial[2*ppm:2*ppm+th,ppm:4*ppm]=1
            a,r,out=evidence_rectangles(g,initial,ppm)
            assert len(a)==2 and len(r)==1,(ppm,t,a,r)
            assert not out[2*ppm:2*ppm+th,ppm:4*ppm].any()
            assert not out[ppm:ppm+th,3*ppm+2:4*ppm-2].any()
    print('12/12 synthetic fixtures: unsupported rectangles rejected; opening preserved')

def gray_wall_fallback(im, ppm):
    """Find long, filled light-gray bands, only used when primary pass yields no accepted rectangle."""
    g=cv.cvtColor(im,cv.COLOR_BGR2GRAY) if im.ndim==3 else im
    mask=np.zeros_like(g)
    ink=(g<205).astype(np.uint8)
    for thickness in (.08,.10,.15,.20,.25,.30):
        t=max(3,round(ppm*thickness));length=max(12,round(.6*ppm),5*t)
        for shape in ((t,length),(length,t)):
            mask|=cv.morphologyEx(ink,cv.MORPH_OPEN,np.ones(shape,np.uint8))
    candidates=extract_rectangles(mask,ppm)
    out=[]
    for q in candidates:
        m=rectangle_mask(g.shape,[q]).astype(bool)
        if m.any() and float((g[m]<215).mean())>=.75:out.append(dict(q,evidence=round(float((g[m]<215).mean()),4),kind='gray-fill-review'))
    return out,rectangle_mask(g.shape,out)
