#!/usr/bin/env python3
"""Orthogonal wall proposal detector. OpenCV only; not a trained semantic model.
Output: candidates + native WALL plan (review required), not exploded lines.
Usage: python wall_vision.py image.png --ppm 110 --out walls
"""
import argparse,json,math
from pathlib import Path
import cv2
import numpy as np

def runs(v):
    a=np.flatnonzero(np.diff(np.r_[False,v,False].astype(np.int8)))
    return zip(a[::2],a[1::2])

def detect(img,ppm,wall=.20):
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    # Dark ink + local contrast for colored or light gray hatching.
    local=cv2.GaussianBlur(gray,(0,0),max(2,ppm*.045))
    ink=((gray<150)|((local.astype(float)-gray)>22)).astype(np.float32)
    t=ppm*wall; minlen=max(16,round(ppm*.38)); out=[]
    for axis,im in [('h',ink),('v',ink.T)]:
        H,W=im.shape
        # Horizontal edge evidence tolerates 1-2px rasterization offsets.
        edge=cv2.dilate(im,np.ones((3,1),np.uint8))
        edge=cv2.blur(edge,(max(5,round(t*.55))|1,1))
        integ=np.vstack([np.zeros((1,W),np.float32),np.cumsum(im,axis=0)])
        for y in range(2,H-2):
            for d in range(max(5,round(t*.64)),round(t*1.35)+1,2):
                z=y+d
                if z>=H-2:break
                inside=(integ[z]-integ[y+1])/max(1,d-1)
                pair=np.minimum(edge[y],edge[z]); center=(y+z)/2
                # Pair of faces OR a solid/hatched band. No fill is required for paired faces.
                filled=cv2.blur(inside[None,:],(max(5,round(t*.65))|1,1))[0]
                support=(pair>.55)|((filled>.53)&(np.maximum(edge[y],edge[z])>.40))
                support=cv2.morphologyEx(support[None,:].astype(np.uint8),cv2.MORPH_CLOSE,np.ones((1,max(3,round(t*.32))),np.uint8))[0].astype(bool)
                for a,b in runs(support):
                    if b-a<minlen:continue
                    density=float(inside[a:b].mean()); p=float(pair[a:b].mean()); score=p+.60*density-.22*abs(d-t)/t
                    out.append(dict(axis=axis,c=center,start=int(a),end=int(b),observed_px=d,score=round(score,3),appearance='filled/hatched' if density>.25 else 'paired outlines'))
    # Suppress overlapping detections of the same band; keep strongest face pair.
    selected=[]
    for v in sorted(out,key=lambda v:(v['score']*min(2,(v['end']-v['start'])/minlen)**.25),reverse=True):
        if any(u['axis']==v['axis'] and abs(u['c']-v['c'])<t*.70 and min(u['end'],v['end'])-max(u['start'],v['start'])>.40*min(u['end']-u['start'],v['end']-v['start']) for u in selected):continue
        selected.append(v)
    # Join collinear candidates over likely door/window openings; no cutouts.
    merged=[]
    for v in sorted(selected,key=lambda x:(x['axis'],x['c'],x['start'])):
        matches=[u for u in merged if u['axis']==v['axis'] and abs(u['c']-v['c'])<=t*.35 and max(u['start'],v['start'])-min(u['end'],v['end'])<=ppm*1.1]
        if matches:
            u=min(matches,key=lambda q:abs(q['c']-v['c'])); a,b=u['end']-u['start'],v['end']-v['start'];u['c']=(u['c']*a+v['c']*b)/(a+b);u['start']=min(u['start'],v['start']);u['end']=max(u['end'],v['end']);u['score']=max(u['score'],v['score']);u['bridged']=True
        else:merged.append(v.copy())
    # Rank network evidence. Do not silently discard isolated walls or assert semantic certainty.
    for v in merged:
        joins=0
        for u in merged:
            if u['axis']==v['axis']:continue
            if v['start']-t<=u['c']<=v['end']+t and u['start']-t<=v['c']<=u['end']+t:joins+=1
        v['junction_candidates']=joins
        v['a']=[v['start'],v['c']] if v['axis']=='h' else [v['c'],v['start']]
        v['b']=[v['end'],v['c']] if v['axis']=='h' else [v['c'],v['end']]
    return sorted(merged,key=lambda v:(-v['junction_candidates'],-v['score']))

def main():
    p=argparse.ArgumentParser();p.add_argument('image');p.add_argument('--ppm',required=True,type=float);p.add_argument('--out',default='walls');p.add_argument('--review',help='JSON list of approved pixel endpoints; only these are exported to native WALL plan');args=p.parse_args()
    if not 10<=args.ppm<=10000:raise ValueError('Invalid scale')
    im=cv2.imread(args.image)
    if im is None:raise ValueError('Invalid image')
    if max(im.shape[:2])>2400:raise ValueError('Resize input to <=2400px and adjust ppm')
    candidates=detect(im,args.ppm);out=Path(args.out)
    out.with_suffix('.candidates.json').write_text(json.dumps(candidates,indent=2))
    overlay=im.copy()
    for i,v in enumerate(candidates):
        a,b=[tuple(map(round,v[k])) for k in ('a','b')];color=(210,105,10) if v['junction_candidates'] else (20,130,220)
        cv2.line(overlay,a,b,color,round(.2*args.ppm));mid=tuple((x+y)//2 for x,y in zip(a,b));cv2.putText(overlay,str(i+1),mid,cv2.FONT_HERSHEY_SIMPLEX,.45,(10,10,10),1)
    cv2.imwrite(str(out.with_suffix('.preview.png')),cv2.addWeighted(im,.55,overlay,.45,0))
    if args.review:
        approved=json.loads(Path(args.review).read_text());h=im.shape[0]
        pt=lambda p:[round(p[0]/args.ppm,5),round((h-p[1])/args.ppm,5)]
        walls=[]
        for i,v in enumerate(approved):
            a,b=pt(v['a']),pt(v['b'])
            if math.dist(a,b)<=.1:raise ValueError('Wall too short')
            walls.append(dict(id=f'wall-{i+1}',a=a,b=b,thickness=.20,layer='WALLS',join='native'))
        plan=dict(schema='blackline.architecture.v1',units='m',walls=walls,openings=[],blocks=[],rooms=[],virtualDimensions=[],brief={'kind':'trace_walls'},status='approximate',assumptions=['Reviewed wall axes; default thickness 0.20 m; user calibrated scale required'])
        out.with_suffix('.wall.json').write_text(json.dumps(plan,indent=2))
    print(f'{len(candidates)} candidates; review required before importing')
if __name__=='__main__':main()