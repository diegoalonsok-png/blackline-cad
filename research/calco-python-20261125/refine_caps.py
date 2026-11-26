"""Recover short, high-contrast closed wall stubs attached to accepted bands.
An alternative mask, not proof of architectural correctness.
"""
import cv2 as cv
import numpy as np

def attached_stubs(im, ppm, baseline):
    g=cv.cvtColor(im,cv.COLOR_BGR2GRAY) if im.ndim==3 else im
    base=(baseline>0).astype(np.uint8); out=base.copy()
    if not base.any():return out
    h,w=g.shape; reach=max(2,round(.045*ppm)); near=cv.dilate(base,np.ones((2*reach+1,2*reach+1),np.uint8))
    for threshold in (90,115):
        ink=(g<threshold).astype(np.uint8)
        _,labels,stats,_=cv.connectedComponentsWithStats(1-ink,connectivity=4)
        for i,(x,y,bw,bh,area) in enumerate(stats[1:],1):
            if x==0 or y==0 or x+bw==w or y+bh==h:continue
            L,S=max(bw,bh),min(bw,bh)
            if not max(2,.045*ppm)<=S<=.35*ppm or not .12*ppm<=L<=.8*ppm or L/S<1.7 or area/(bw*bh)<.8:continue
            x0,y0=max(0,x-1),max(0,y-1);x1,y1=min(w,x+bw+1),min(h,y+bh+1)
            reg=(labels[y0:y1,x0:x1]==i).astype(np.uint8);ring=(cv.dilate(reg,np.ones((3,3),np.uint8))>0)&(reg==0)
            local=g[y0:y1,x0:x1]
            if not ring.any() or np.mean(local[ring]<130)<.8 or np.median(local[reg>0])-np.median(local[ring])<95:continue
            candidate=reg|((ring)&(local<155)).astype(np.uint8)
            if not np.any(candidate & near[y0:y1,x0:x1]):continue
            if (candidate&base[y0:y1,x0:x1]).sum()>.7*candidate.sum():continue
            out[y0:y1,x0:x1]|=candidate
    return out
