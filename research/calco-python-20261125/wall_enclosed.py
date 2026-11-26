"""High-contrast enclosed-band proposal; no plan-specific coordinates.
Separate raster evidence from CAD wall width. Wide structural masses are flagged for review.
"""
import cv2 as cv
import numpy as np

def enclosed_bands(im,ppm):
    g=cv.cvtColor(im,cv.COLOR_BGR2GRAY) if im.ndim==3 else im
    h,w=g.shape; out=np.zeros_like(g,dtype=np.uint8); regions=[]
    for threshold in (90,115,135):
        ink=cv.morphologyEx((g<threshold).astype(np.uint8),cv.MORPH_CLOSE,np.ones((3,3),np.uint8))
        _,labels,stats,_=cv.connectedComponentsWithStats(1-ink,connectivity=4)
        for i,(x,y,bw,bh,area) in enumerate(stats[1:],1):
            if x==0 or y==0 or x+bw==w or y+bh==h or area<max(24,.025*ppm**2):continue
            if max(bw,bh)<.5*ppm:continue
            x0,y0=max(0,x-1),max(0,y-1);x1,y1=min(w,x+bw+1),min(h,y+bh+1)
            reg=(labels[y0:y1,x0:x1]==i).astype(np.uint8);local=g[y0:y1,x0:x1]
            dt=cv.distanceTransform(np.pad(reg,1),cv.DIST_L2,5)[1:-1,1:-1]; radii=dt[reg>0]
            r50=float(np.median(radii));r90=float(np.percentile(radii,90));rmax=float(radii.max())
            if not max(1.5,.018*ppm)<=r50<=.20*ppm:continue
            if r90<max(2,.035*ppm) or rmax>.65*ppm:continue
            ring=(cv.dilate(reg,np.ones((3,3),np.uint8))>0)&(reg==0)
            if not ring.any():continue
            dark=float(np.mean(local[ring]<100));contrast=float(np.median(local[reg>0])-np.median(local[ring]))
            if dark<.62 or contrast<80:continue
            core=(dt>=max(1.5,.55*r50)).astype(np.uint8);long=max(10,round(.55*ppm),round(5*r90))
            runs=cv.morphologyEx(core,cv.MORPH_OPEN,np.ones((1,long),np.uint8))|cv.morphologyEx(core,cv.MORPH_OPEN,np.ones((long,1),np.uint8))
            if not runs.any():continue
            # Wide components with no long thin spine are not walls.
            if float(runs.sum())/max(1,core.sum())<.32:continue
            if max(bw,bh)<max(.5*ppm,4*r90):continue
            # Only restore a one-pixel boundary if the image contains dark ink there.
            recovered=reg|((ring)&(local<155)).astype(np.uint8)
            fresh=int(np.count_nonzero((out[y0:y1,x0:x1]==0)&(recovered>0)))
            if fresh:regions.append(dict(bbox=[int(x),int(y),int(bw),int(bh)],added=fresh,threshold=threshold,r90=round(r90,2),wide_review=bool(rmax*2>.5*ppm)))
            out[y0:y1,x0:x1]|=recovered
    return out,regions

def select_enclosed_mode(im,ppm,baseline):
    """Propose an alternative only for strong-ink outlined drawings missed by baseline.
    Preserve the baseline for review; do not silently substitute candidate geometry.
    """
    mask,regions=enclosed_bands(im,ppm)
    strong=[r for r in regions if r['threshold']==90]
    strong_area=sum(r['added'] for r in strong)
    old_area=int(np.count_nonzero(baseline)); new_area=int(mask.sum())
    ys,xs=np.where(mask>0)
    two_sides=False
    if len(xs):
        x0,x1,y0,y1=int(xs.min()),int(xs.max())+1,int(ys.min()),int(ys.max())+1
        sub=mask[y0:y1,x0:x1];H,W=sub.shape;mx=max(1,round(.18*W));my=max(1,round(.18*H))
        cols=sub.sum(axis=0)/H;rows=sub.sum(axis=1)/W
        two_sides=bool((cols[:mx].max()>=.85 and cols[-mx:].max()>=.85) or (rows[:my].max()>=.85 and rows[-my:].max()>=.85))
    recommend=bool(two_sides and len(strong)>=3 and any(r['wide_review'] for r in strong) and strong_area>=.85*new_area and new_area>=2.5*max(1,old_area))
    return mask,dict(recommend_review=recommend,baseline_pixels=old_area,enclosed_pixels=new_area,strong_regions=len(strong),two_continuous_sides=two_sides,wide_regions=sum(r['wide_review'] for r in regions),regions=regions)
