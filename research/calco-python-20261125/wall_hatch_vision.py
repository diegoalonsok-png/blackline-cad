#!/usr/bin/env python3
"""Propose wall axes from a hatched orthogonal architectural plan.
The ROI and scale are supplied or estimated separately; reviewed axes are required
for native CAD export. No furniture tracing and no opening cuts.
"""
import argparse,json,math
from pathlib import Path
import cv2
import numpy as np

def detect(im,roi,ppm):
    x0,y0,x1,y1=roi
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    ink=((gray<145)&(np.ptp(im.astype(np.int16),axis=2)<50)).astype(np.uint8)
    valid=np.zeros_like(ink);valid[y0:y1,x0:x1]=1;ink&=valid
    t=ppm*.2;k=max(5,round(t*.44)|1)
    h=cv2.morphologyEx(ink,cv2.MORPH_OPEN,np.ones((1,k),np.uint8))
    v=cv2.morphologyEx(ink,cv2.MORPH_OPEN,np.ones((k,1),np.uint8))
    residual=ink&~(h|v)
    win=max(5,round(t*.56)|1)
    density=cv2.blur(residual.astype(np.float32),(win,win))
    mask=(density>.14).astype(np.uint8)&valid
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    out=[]
    for axis in ['h','v']:
        length=max(12,round(t*1.25));ker=np.ones((1,length) if axis=='h' else (length,1),np.uint8)
        filtered=cv2.morphologyEx(mask,cv2.MORPH_OPEN,ker)
        _,_,stats,_=cv2.connectedComponentsWithStats(filtered)
        for x,y,w,h,area in stats[1:]:
            long,short=(w,h) if axis=='h' else (h,w)
            if long<max(22,round(t*1.55)) or short<t*.22 or short>t*1.3 or long/short<2.2:continue
            c=y+(h-1)/2 if axis=='h' else x+(w-1)/2
            a=[int(x),float(c)] if axis=='h' else [float(c),int(y)]
            b=[int(x+w-1),float(c)] if axis=='h' else [float(c),int(y+h-1)]
            out.append(dict(axis=axis,a=a,b=b,texture='hatched',length_px=int(long)))
    return out,mask

def draw(im,axes,ppm,review=False):
    overlay=im.copy()
    for v in axes:
        a,b=[tuple(round(i) for i in v[k]) for k in ('a','b')]
        cv2.line(overlay,a,b,(210,100,15),round(ppm*.2))
    out=cv2.addWeighted(im,.60,overlay,.40,0)
    for v in axes:
        a,b=[tuple(round(i) for i in v[k]) for k in ('a','b')]
        cv2.line(out,a,b,(210,100,15),2,cv2.LINE_AA)
        if review:
            for p in (a,b):cv2.circle(out,p,2,(220,100,20),-1)
    return out

def main():
    p=argparse.ArgumentParser();p.add_argument('image');p.add_argument('--roi',nargs=4,type=int,required=True);p.add_argument('--ppm',type=float,required=True);p.add_argument('--out',required=True);p.add_argument('--review');a=p.parse_args()
    im=cv2.imread(a.image)
    if im is None:raise ValueError('image unreadable')
    if not 10<=a.ppm<=1000:raise ValueError('invalid scale')
    x0,y0,x1,y1=a.roi
    if not (0<=x0<x1<=im.shape[1] and 0<=y0<y1<=im.shape[0]):raise ValueError('invalid ROI')
    out=Path(a.out);axes,mask=detect(im,a.roi,a.ppm)
    out.with_suffix('.candidates.json').write_text(json.dumps(axes,indent=2))
    cv2.imwrite(str(out.with_suffix('.automatic.png')),draw(im,axes,a.ppm))
    print('Automatic texture candidates:',len(axes))
    if a.review:
        approved=json.loads(Path(a.review).read_text());walls=[]
        pt=lambda p:[round((p[0]-x0)/a.ppm,5),round((y1-p[1])/a.ppm,5)]
        for i,v in enumerate(approved):
            A,B=pt(v['a']),pt(v['b'])
            if math.dist(A,B)<=.1:raise ValueError('wall too short')
            walls.append(dict(id=f'wall-{i+1}',a=A,b=B,thickness=.2,layer='WALLS',join='native'))
        plan=dict(schema='blackline.architecture.v1',units='m',walls=walls,openings=[],blocks=[],rooms=[],virtualDimensions=[],brief={'kind':'trace_walls'},status='approximate',assumptions=['Axes reviewed manually; approximate scale; no openings or furniture inserted'])
        out.with_suffix('.wall.json').write_text(json.dumps(plan,indent=2))
        cv2.imwrite(str(out.with_suffix('.review.png')),draw(im,approved,a.ppm,True))
        clean=np.full_like(im,255)
        for v in approved:
            A,B=[tuple(round(i) for i in v[k]) for k in ('a','b')];cv2.line(clean,A,B,(45,45,45),round(a.ppm*.2),cv2.LINE_8)
        cv2.imwrite(str(out.with_suffix('.clean.png')),clean)
        print('Reviewed native walls:',len(walls))
if __name__=='__main__':main()