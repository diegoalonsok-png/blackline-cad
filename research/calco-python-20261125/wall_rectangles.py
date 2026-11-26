"""Extract reviewable orthogonal wall rectangles from a refined binary mask.
20 cm is a prior, not a fixed thickness. No inference of unmarked openings.
"""
import math
import cv2 as cv
import numpy as np

def extract_rectangles(mask, ppm):
    if not np.isfinite(ppm) or ppm < 10 or mask.ndim != 2:
        raise ValueError('Invalid scale or mask')
    ink=(mask>0).astype(np.uint8)
    minlen=max(7,round(.45*ppm)|1); out=[]
    for vertical in (False,True):
        src=ink.T.copy() if vertical else ink
        clean=cv.morphologyEx(src,cv.MORPH_OPEN,np.ones((1,minlen),np.uint8))
        groups=[]; active=[]
        for y,row in enumerate(clean):
            edges=np.flatnonzero(np.diff(np.r_[0,row,0]))
            next_active=[]; used=set()
            for a,b in zip(edges[::2],edges[1::2]):
                if b-a<minlen:continue
                best=None; score=.72
                for idx in active:
                    if idx in used:continue
                    q=groups[idx]; overlap=max(0,min(b,q[3])-max(a,q[2]))/max(b-a,q[3]-q[2])
                    if overlap>score:best,score=idx,overlap
                if best is None:
                    best=len(groups);groups.append([y,y+1,int(a),int(b)])
                else:
                    q=groups[best];q[1]=y+1;q[2]=max(q[2],int(a));q[3]=min(q[3],int(b))
                used.add(best);next_active.append(best)
            active=next_active
        for y0,y1,a,b in groups:
            t=y1-y0; length=b-a; meters=t/ppm
            if not .075<=meters<=.42 or length<max(minlen,3*t):continue
            c=(y0+y1)/2
            out.append(dict(a=[c,a] if vertical else [a,c],b=[c,b] if vertical else [b,c],t=t,thickness_m=round(meters,4),prior_distance_m=round(abs(meters-.20),4)))
    return sorted(out,key=lambda q:(-math.dist(q['a'],q['b']),q['prior_distance_m']))

def self_test():
    for ppm in (50,100,160):
        for t in (.10,.15,.20,.30):
            m=np.zeros((4*ppm,8*ppm),np.uint8);thick=round(t*ppm)
            m[ppm:ppm+thick,ppm:3*ppm]=1
            m[ppm:ppm+thick,4*ppm:7*ppm]=1
            rects=extract_rectangles(m,ppm)
            assert len(rects)==2,(ppm,t,rects)
            assert all(abs(q['thickness_m']-t)<=1/ppm for q in rects)
            assert all(max(q['a'][0],q['b'][0])<=3*ppm or min(q['a'][0],q['b'][0])>=4*ppm for q in rects)
    print('12 cases passed: 4 thicknesses, 3 scales; opening preserved')

if __name__=='__main__':self_test()
