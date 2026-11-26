"""Experimental parallel-face evidence. Never substitutes geometry automatically."""
import cv2 as cv,numpy as np,math

def pair_mask(im,ppm,base):
 g=cv.cvtColor(im,cv.COLOR_BGR2GRAY) if im.ndim==3 else im
 out=np.zeros_like(g); minlen=max(10,round(.4*ppm))
 for vertical in (False,True):
  src=g.T.copy() if vertical else g; prior=base.T.copy() if vertical else base; dest=np.zeros_like(src)
  ink=(src<125).astype('uint8'); ink=cv.morphologyEx(ink,cv.MORPH_CLOSE,np.ones((1,3),np.uint8));lines=cv.morphologyEx(ink,cv.MORPH_OPEN,np.ones((1,minlen),np.uint8));_,_,stats,_=cv.connectedComponentsWithStats(lines)
  bands=sorted((y+(h-1)/2,x,x+w-1) for x,y,w,h,a in stats[1:] if w>=minlen and h<=max(3,.05*ppm))
  if len(bands)>1500:continue
  for i,(c,lo,hi) in enumerate(bands):
   for d,l2,h2 in bands[i+1:]:
    t=d-c
    if t>.42*ppm:break
    if t<.075*ppm:continue
    l,r=max(lo,l2),min(hi,h2)
    if r-l<max(minlen,2.7*t):continue
    y0,y1=round(c),round(d)+1
    patch=prior[y0:y1,l:r+1]
    if patch.mean()<.40:continue
    dest[y0:y1,l:r+1]=1
  out|=dest.T if vertical else dest
 return out

def prune_alternative(im,ppm,baseline):
    base=(baseline>0).astype(np.uint8)
    paired=pair_mask(im,ppm,base)
    # Extend evidence along either axis, but never add wall pixels to the baseline.
    L=max(3,round(.9*ppm)|1)
    support=cv.dilate(paired,np.ones((1,L),np.uint8))|cv.dilate(paired,np.ones((L,1),np.uint8))
    alternative=base&support
    return alternative, dict(baseline=int(base.sum()),removed=int((base&~alternative).sum()),paired=int(paired.sum()))
