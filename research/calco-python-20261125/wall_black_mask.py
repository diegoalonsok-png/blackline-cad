"""Experimental wall interior recovery. Pixel mask, not definitive CAD geometry."""
import cv2 as cv
import numpy as np

def closed_wall_fill(im,ppm):
    gray=cv.cvtColor(im,cv.COLOR_BGR2GRAY) if im.ndim==3 else im
    H,W=gray.shape; out=np.zeros((H,W),np.uint8)
    for threshold in (130,155,180):
        ink=(gray<threshold).astype(np.uint8)
        ink=cv.morphologyEx(ink,cv.MORPH_CLOSE,np.ones((3,3),np.uint8))
        _,labels,stats,_=cv.connectedComponentsWithStats(1-ink,connectivity=4)
        for i,(x,y,w,h,area) in enumerate(stats[1:],1):
            if x==0 or y==0 or x+w==W or y+h==H or area<max(30,.035*ppm**2):continue
            if max(w,h)<.6*ppm:continue
            reg=(labels[y:y+h,x:x+w]==i).astype(np.uint8)
            dist=cv.distanceTransform(np.pad(reg,1),cv.DIST_L2,5)[1:-1,1:-1]
            radius=float(dist.max())
            if not max(2,.065*ppm)<=radius<=max(3,.18*ppm):continue
            if max(w,h)<3.8*2*radius:continue
            minlen=max(9,round(max(.55*ppm,5.5*radius)))
            band=(dist>=max(1,.45*radius)).astype(np.uint8)
            run=cv.morphologyEx(band,cv.MORPH_OPEN,np.ones((1,minlen),np.uint8)) | cv.morphologyEx(band,cv.MORPH_OPEN,np.ones((minlen,1),np.uint8))
            if not np.any(run):continue
            y0,x0=max(0,y-1),max(0,x-1);y1,x1=min(H,y+h+1),min(W,x+w+1)
            region=(labels[y0:y1,x0:x1]==i).astype(np.uint8)
            ring=(cv.dilate(region,np.ones((3,3),np.uint8))>0)&(region==0)
            if not ring.any() or np.mean(gray[y0:y1,x0:x1][ring]<100)<.35:continue
            out[y:y+h,x:x+w]|=reg
    return out

def rectangle_mask(shape,walls):
    mask=np.zeros(shape,np.uint8)
    for q in walls:
        a,b=np.asarray(q['a'],float),np.asarray(q['b'],float);v=b-a;L=np.linalg.norm(v)
        if L<1e-6:continue
        n=np.array([-v[1],v[0]])/L*q['t']/2
        cv.fillConvexPoly(mask,np.rint([a+n,b+n,b-n,a-n]).astype(np.int32),1)
    return mask
