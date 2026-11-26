#!/usr/bin/env python3
"""Solid orthogonal wall proposal detector. Outputs axes in pixels, no cuts.
Requires scale estimate; review is required. No specific plan coordinates are used.
"""
import cv2 as cv, numpy as np, json, argparse
from pathlib import Path

def detect(im,ppm):
    g=cv.cvtColor(im,cv.COLOR_BGR2GRAY)
    ink=(g<110).astype('uint8'); t=ppm*.2
    m=cv.morphologyEx(ink,cv.MORPH_OPEN,np.ones((max(3,round(t*.25)),)*2,np.uint8))
    out=[]
    for axis in ('h','v'):
        n=max(10,round(t*1.2)); k=(max(3,round(t*.25)),n) if axis=='h' else (n,max(3,round(t*.25)))
        q=cv.morphologyEx(m,cv.MORPH_OPEN,np.ones(k,np.uint8)); _,_,stats,cent=cv.connectedComponentsWithStats(q)
        for (x,y,w,h,area),p in zip(stats[1:],cent[1:]):
            L,S=(w,h) if axis=='h' else (h,w)
            if L<max(12,round(t*.7)) or not t*.35<=S<=t*1.4 or L/S<1.1 or area/(w*h)<.65: continue
            c=float(p[1] if axis=='h' else p[0]); start=int(x if axis=='h' else y);end=start+int(L)-1
            out.append(dict(axis=axis,c=c,start=start,end=end))
    return out

def merge(rows,ppm):
    t=.2*ppm; groups=[]
    for r in sorted(rows,key=lambda x:(x['axis'],x['c'],x['start'])):
        q=next((q for q in groups if q['axis']==r['axis'] and abs(q['c']-r['c'])<.32*t and max(q['start'],r['start'])-min(q['end'],r['end'])<=1.35*ppm),None)
        if q is None:groups.append(dict(r,parts=[r]))
        else:q['start']=min(q['start'],r['start']);q['end']=max(q['end'],r['end']);q['parts'].append(r);q['c']=float(np.average([p['c'] for p in q['parts']],weights=[p['end']-p['start'] for p in q['parts']]))
    for q in groups:
        for k in ('start','end'):
            neighbors=[r['c'] for r in groups if r['axis']!=q['axis'] and r['start']-t<=q['c']<=r['end']+t and abs(r['c']-q[k])<=t]
            if neighbors:q[k]=min(neighbors,key=lambda c:abs(c-q[k]))
    return groups

def main():
    p=argparse.ArgumentParser();p.add_argument('image');p.add_argument('--ppm',type=float,required=True);p.add_argument('--out',required=True);a=p.parse_args();im=cv.imread(a.image);rows=detect(im,a.ppm);walls=merge(rows,a.ppm);out=Path(a.out);out.with_suffix('.json').write_text(json.dumps(walls,indent=2));v=im.copy()
    for w in walls:
        A,B=[(round(w[k]),round(w['c'])) if w['axis']=='h' else (round(w['c']),round(w[k])) for k in ('start','end')];cv.line(v,A,B,(210,100,20),round(.2*a.ppm))
    cv.imwrite(str(out.with_suffix('.png')),cv.addWeighted(im,.5,v,.5,0));print(len(rows),'solid bands;',len(walls),'merged axes');print([(w['axis'],round(w['c']),round(w['start']),round(w['end'])) for w in walls])
if __name__=='__main__':main()