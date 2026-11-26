"""Conservative second-pass refinement of candidate wall masks.
Uses original raster evidence, not an assumption that every gap is a wall.
This is research code: masks are not yet CAD entities or opening recognition.
"""
import cv2 as cv
import numpy as np

def refine(im, initial, ppm, max_passes=3):
    gray=cv.cvtColor(im,cv.COLOR_BGR2GRAY) if im.ndim==3 else im
    mask=(initial>0).astype(np.uint8)
    if mask.shape!=gray.shape or not np.isfinite(ppm) or ppm<=0:
        raise ValueError('Invalid image, mask or scale')
    ink=(gray<180).astype(np.uint8)
    gap=max(3,min(15,round(.10*ppm)|1))
    depth=max(3,round(.13*ppm)|1)
    evidence=cv.blur(ink.astype(np.float32),(depth,depth))
    history=[]
    for iteration in range(min(5,max(0,int(max_passes)))):
        old=mask.copy(); proposed=mask.copy()
        for kernel in (np.ones((1,gap),np.uint8),np.ones((gap,1),np.uint8)):
            proposed|=cv.morphologyEx(mask,cv.MORPH_CLOSE,kernel,borderType=cv.BORDER_CONSTANT,borderValue=0)
        addition=(proposed>0)&(mask==0)
        n,labels,stats,_=cv.connectedComponentsWithStats(addition.astype(np.uint8),8)
        for i,(x,y,w,h,area) in enumerate(stats[1:],1):
            region=labels[y:y+h,x:x+w]==i
            local=evidence[y:y+h,x:x+w][region]
            if local.size and local.mean()>=.27 and np.mean(local>=.18)>=.7:
                mask[y:y+h,x:x+w][region]=1
        n,labels,stats,_=cv.connectedComponentsWithStats(mask,8)
        for i,(x,y,w,h,area) in enumerate(stats[1:],1):
            if max(w,h)>=.65*ppm:continue
            region=labels[y:y+h,x:x+w]==i
            if evidence[y:y+h,x:x+w][region].mean()<.12:
                mask[y:y+h,x:x+w][region]=0
        added=int(np.count_nonzero((mask>0)&(old==0)));removed=int(np.count_nonzero((old>0)&(mask==0)))
        history.append(dict(pass_number=iteration+1,added=added,removed=removed))
        if not added and not removed:break
    return mask,history

def self_test():
    for ppm in (50,100,160):
        h,w=round(5*ppm),round(7*ppm);g=np.full((h,w),245,np.uint8);truth=np.zeros_like(g)
        t=round(.2*ppm);y=ppm;x1=ppm;x2=6*ppm;door0=3*ppm;door1=4*ppm
        truth[y:y+t,x1:door0]=1;truth[y:y+t,door1:x2]=1
        truth[y:4*ppm,x1:x1+t]=1;g[truth>0]=20
        initial=truth.copy();a=2*ppm;b=a+max(1,round(.035*ppm));initial[y:y+t,a:b]=0
        initial[3*ppm:3*ppm+t,4*ppm:4*ppm+round(.25*ppm)]=1
        final,log=refine(g,initial,ppm)
        assert np.array_equal(final,truth),(ppm,log,np.count_nonzero(final!=truth))
        assert not final[y:y+t,door0:door1].any()
        assert log[-1]['added']==log[-1]['removed']==0
    print('3 scales: recovered short wall gaps, removed unsupported fragments, preserved 1 m opening; converged.')

if __name__=='__main__':self_test()
