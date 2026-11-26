#!/usr/bin/env python3
"""Prototype: detect orthogonal wall candidates with OpenCV, then export reviewed CAD plan.
Requires opencv-python and numpy. No OCR or AI service. Coordinates in input annotations are pixels.
Usage: python calco_semantico.py image.png --ppm 110 --review prueba_revision.json --out prueba
Without --review only unvalidated wall candidates are produced; never import these automatically.
"""
import argparse,json,math,pathlib
import cv2,numpy as np

def detect_wall_candidates(img,ppm):
    # Thick, dense or hatched bands, not individual furniture strokes.
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    dark=(gray<155).astype(np.float32)
    border=max(2,round(ppm*.055));dark[:border]=0;dark[-border:]=0;dark[:,:border]=0;dark[:,-border:]=0
    k=max(3,round(ppm*.14)|1)
    dense=(cv2.blur(dark,(k,k))>.37).astype(np.uint8)*255
    minimum=max(12,round(ppm*.5));out=[]
    for axis,kernel in [('h',(minimum,3)),('v',(3,minimum))]:
        mask=cv2.morphologyEx(dense,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,kernel))
        _,_,stats,_=cv2.connectedComponentsWithStats(mask)
        for x,y,w,h,n in stats[1:]:
            length,thick=(w,h) if axis=='h' else (h,w)
            if length<minimum or not ppm*.075<=thick<=ppm*.38:continue
            a,b=([int(x),float(y+h/2)],[int(x+w),float(y+h/2)]) if axis=='h' else ([float(x+w/2),int(y)],[float(x+w/2),int(y+h)])
            out.append(dict(axis=axis,a=a,b=b,pixel_thickness=int(thick),status='candidate'))
    return out

def reviewed_plan(review,ppm,shape):
    h,w=shape[:2];origin=review.get('origin',[0,h])
    def pt(p):return [round((p[0]-origin[0])/ppm,5),round((origin[1]-p[1])/ppm,5)]
    plan=dict(schema='blackline.architecture.v1',units='m',walls=[],openings=[],blocks=[],rooms=[],virtualDimensions=[],connections=[],variants=[],brief={'kind':'trace_reviewed'},status='approximate',assumptions=['20 cm default wall thickness; scale provisional; pixel annotations manually reviewed'],texts=[],dimensions=[])
    for v in review['walls']:
        a,b=pt(v['a']),pt(v['b']);assert math.dist(a,b)>.1
        plan['walls'].append(dict(id=v['id'],a=a,b=b,thickness=.20,layer='WALLS',join='native'))
    hosts={v['id']:v for v in plan['walls']}
    for v in review['openings']:
        host=hosts[v['host']];a,b=host['a'],host['b'];length=math.dist(a,b);p=pt(v['center']);u=[(b[i]-a[i])/length for i in range(2)];offset=sum((p[i]-a[i])*u[i] for i in range(2));width=v['pixels']/ppm
        if not .3<=width<=5 or not .10<offset-width/2<offset+width/2<length-.10:raise ValueError(f'Opening too near wall endpoint: {v}')
        plan['openings'].append(dict(host=v['host'],kind=v['kind'],offset=round(offset,5),width=round(width,5),layer='OPENINGS'))
    for host in hosts:
        intervals=sorted((o['offset']-o['width']/2,o['offset']+o['width']/2) for o in plan['openings'] if o['host']==host)
        if any(a[1]>=b[0] for a,b in zip(intervals,intervals[1:])):raise ValueError('Overlapping openings')
    for v in review['blocks']:
        # Nominal block size and insertion point must be verified against CAD library.
        plan['blocks'].append(dict(catalogId=v['id'],role=v['role'],point=pt(v['point']),nominalSize=v['size'],rotation=v['rotation'],scale=1,layer=v['layer']))
    plan['texts']=[dict(text=v['text'],point=pt(v['point'])) for v in review.get('texts',[])]
    return plan

def main():
    p=argparse.ArgumentParser();p.add_argument('image');p.add_argument('--ppm',type=float,required=True);p.add_argument('--review');p.add_argument('--out',default='calco');args=p.parse_args()
    if not 10<=args.ppm<=10000:raise ValueError('Invalid pixels per metre')
    im=cv2.imread(args.image);assert im is not None,'Invalid image'
    cand=detect_wall_candidates(im,args.ppm);out=pathlib.Path(args.out)
    out.with_suffix('.candidates.json').write_text(json.dumps(cand,indent=2));preview=im.copy()
    for v in cand:cv2.line(preview,tuple(map(round,v['a'])),tuple(map(round,v['b'])),(0,0,230),2)
    cv2.imwrite(str(out.with_suffix('.candidates.png')),preview)
    print(f'{len(cand)} automatic wall candidates (unvalidated)')
    if not args.review:return
    r=json.loads(pathlib.Path(args.review).read_text());plan=reviewed_plan(r,args.ppm,im.shape);out.with_suffix('.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2));
    overlay=im.copy()
    for v in r['walls']:cv2.line(overlay,tuple(v['a']),tuple(v['b']),(200,85,15),round(.2*args.ppm))
    for v in r['openings']:
        host=next(w for w in r['walls'] if w['id']==v['host']);a=np.array(host['a']);b=np.array(host['b']);u=(b-a)/np.linalg.norm(b-a);c=np.array(v['center']);d=u*v['pixels']/2;cv2.line(overlay,tuple(np.rint(c-d).astype(int)),tuple(np.rint(c+d).astype(int)),(40,170,35) if v['kind']=='swing-door' else (10,165,220),round(.2*args.ppm))
    preview=cv2.addWeighted(im,.48,overlay,.52,0);cv2.imwrite(str(out.with_suffix('.review.png')),preview)
    print(f"Reviewed plan: {len(plan['walls'])} walls, {len(plan['openings'])} dynamic openings, {len(plan['blocks'])} block placements, {len(plan['texts'])} text suggestions")
if __name__=='__main__':main()