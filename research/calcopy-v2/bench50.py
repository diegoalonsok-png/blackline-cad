"""50 NEW controlled architectural rasters, plus distinct additional gallery files.
No real-plan accuracy is claimed without manually annotated truth.
"""
import json, hashlib, pathlib, random, sys
import cv2
import numpy as np
from bench25 import ROOT, OUT, predict, mask_for, measure, overlay
from semantic_v2 import black_mask

def fixture(i):
    rng=random.Random(20261126+i)
    w,h=900,700
    im=np.full((h,w,3),255,np.uint8)
    x0,y0,x1,y1=70,65,830,635
    x=rng.randrange(320,530,10); y=rng.randrange(265,435,10)
    a=rng.randrange(130,190,10); b=a+80
    door_y=rng.randrange(130,220,10); door_end=door_y+80
    t=rng.choice([12,16,20]); ext=rng.choice([20,24,30])
    walls=[]
    def wall(p,q,t): walls.append(dict(a=list(p),b=list(q),t=t))
    wall((x0,y0),(x1,y0),ext);wall((x0,y1),(x1,y1),ext)
    wall((x0,y0),(x0,y1),ext);wall((x1,y0),(x1,y1),ext)
    wall((x,y0),(x,door_y),t);wall((x,door_end),(x,y1),t)
    wall((x0,y),(a,y),t);wall((b,y),(x,y),t)
    if i%5>=1:wall((x,y+70),(x1,y+70),rng.choice([12,16,20]))
    if i%5>=2:wall((650,y0),(650,y+70),12)
    if i%5>=3:wall((x0+135,y),(x0+135,y1),16)
    if i%5==4:wall((x,y1-100),(x1,y1-100),12)
    # Pale room color does not represent a wall.
    if i%3==0:
        for rect,color in [((x0+20,y0+20,x-20,y-20),(242,249,220)),((x+20,y0+20,x1-20,y+45),(235,225,252)),((x0+20,y+20,x-20,y1-20),(228,244,250))]:
            l,u,r,d=rect;cv2.rectangle(im,(l,u),(r,d),color,-1)
    truth=mask_for(im.shape,walls)
    kinds=['solid','outline','hatch','mixed','gray']
    for j,q in enumerate(walls):
        m=mask_for(im.shape,[q]);ys,xs=np.where(m);l,r,u,d=xs.min(),xs.max(),ys.min(),ys.max()
        kind=kinds[(i//5)%5]
        if kind=='mixed':kind=kinds[j%3]
        if kind in ('solid','gray'):im[m>0]=70 if kind=='gray' else 20
        else:
            cv2.rectangle(im,(l,u),(r,d),(25,25,25),1)
            if kind=='hatch':
                for z in range(l-d,r-u+1,8):
                    p=(max(l,z+u),max(u,l-z));q2=(min(r,z+d),min(d,r-z))
                    if p[0]<=q2[0] and p[1]<=q2[1]:cv2.line(im,p,q2,(80,80,80),1)
    doors=[]
    for v,c,g0,g1,low,side in [(True,x,door_y,door_end,bool(i%2),1 if i%4<2 else -1),(False,y,a,b,bool(i%3),-1 if i%2 else 1)]:
        hinge=g0 if low else g1;sgn=1 if low else -1;gap=g1-g0
        def pt(u,s):return (int(round(s)),int(round(u))) if v else (int(round(u)),int(round(s)))
        if i%10==9 and not v:
            # double glazing, no door truth
            for offset in (-3,3):cv2.line(im,pt(g0,c+offset),pt(g1,c+offset),(35,35,35),1)
            continue
        theta=np.linspace(0,np.pi/2,80)
        pts=np.array([pt(hinge+sgn*gap*np.cos(th),c+side*gap*np.sin(th)) for th in theta],np.int32)
        cv2.polylines(im,[pts],False,(25,25,25),1)
        cv2.line(im,pt(hinge,c),pt(hinge,c+side*gap),(25,25,25),1)
        doors.append(dict(v=v,c=c,g0=g0,g1=g1,hingeAtLo=low,side=side))
    # furniture, table/chairs, tiles and stairs as non-wall distractors.
    cv2.rectangle(im,(x0+30,y0+30),(x0+110,y0+120),(30,30,30),1)
    cv2.ellipse(im,(760,155),(22,30),0,0,360,(30,30,30),1)
    if i%2:
        for xx in range(685,806,24):cv2.line(im,(xx,470),(xx,590),(110,110,110),1)
        for yy in range(470,591,24):cv2.line(im,(685,yy),(805,yy),(110,110,110),1)
    if i%4==0:im=cv2.imdecode(cv2.imencode('.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,55])[1],cv2.IMREAD_COLOR)
    return im,truth,doors

def door_metrics(expected,actual):
    matched=set();correct=0;located=0
    for e in expected:
        options=[(j,d) for j,d in enumerate(actual) if j not in matched and d.get('kind')=='swing-door' and d['v']==e['v'] and abs(d['c']-e['c'])<=12 and abs(d['g0']-e['g0'])<=15 and abs(d['g1']-e['g1'])<=15]
        if not options:continue
        j,d=min(options,key=lambda p:abs(p[1]['c']-e['c'])+abs(p[1]['g0']-e['g0']))
        matched.add(j);located+=1;correct+=int(d['hingeAtLo']==e['hingeAtLo'] and d['side']==e['side'])
    return dict(expected=len(expected),located=located,correct_orientation=correct,missed=len(expected)-located,extra=len(actual)-len(matched))

def main():
    folder=OUT/'bench50';folder.mkdir(parents=True,exist_ok=True)
    rows=[]
    def run(name,im,truth,doors):
        try:
            result,elapsed=predict(im,9.0 if truth is not None else None)
            row=dict(case=name,status='executed',seconds=elapsed,regions=len(result.get('regions',[])),doors=len(result.get('doors',[])),modes={})
            for mode,walls in result['readings'].items():
                m=mask_for(im.shape,walls)
                row['modes'][mode]=dict(walls=len(walls),**(measure(truth,m) if truth is not None else {}))
                if mode=='metric':cv2.imwrite(str(folder/(name+'-overlay.jpg')),overlay(im,m,truth))
            if doors is not None:row['door_metrics']=door_metrics(doors,result.get('doors',[]))
            else:row['evaluation']='real plan: annotation required; scale unknown'
            rows.append(row);print(json.dumps(row),flush=True)
        except Exception as e:rows.append(dict(case=name,status='error',error=str(e)))
    for i in range(50):
        im,truth,doors=fixture(i);run(f'controlled-{i+1:02}',im,truth,doors)
    seen=set();extra=0
    root=ROOT/'assets/architecture-references/house'
    # Exclude all prior 18 test images, and reject identical copies by digest.
    for p in root.rglob('*'):
        if p.is_file() and p.name.startswith('user-drive-20261125-'):seen.add(hashlib.sha256(p.read_bytes()).digest())
    for p in sorted(root.rglob('*')):
        if extra>=50:break
        if not p.is_file() or p.suffix.lower() not in ('.png','.jpg','.jpeg') or p.name.startswith('user-drive-20261125-'):continue
        if any(s in p.stem.lower() for s in ('thumb','preview','icon','render','house-100-innerscene')):continue
        digest=hashlib.sha256(p.read_bytes()).digest()
        if digest in seen:continue
        seen.add(digest)
        im=cv2.imread(str(p))
        if im is None:continue
        extra+=1;run(f'additional-gallery-{extra:02}',im,None,None)
    controlled=[q for q in rows if q['case'].startswith('controlled-') and q['status']=='executed']
    summary={}
    for mode in ('solid','lines','mixed','validated','metric'):
        m=[q['modes'][mode] for q in controlled if mode in q['modes']]
        tp=sum(q['tp'] for q in m);fp=sum(q['fp'] for q in m);fn=sum(q['fn'] for q in m)
        summary[mode]=dict(cases=len(m),error_pct=round(100*(fp+fn)/max(1,tp+fp+fn),2))
    dsum={key:sum(q['door_metrics'][key] for q in controlled) for key in ('expected','located','correct_orientation','missed','extra')}
    report=dict(controlled_executed=len(controlled),additional_gallery_candidates=extra,wall_summary=summary,door_summary=dsum,real_accuracy=None,cases=rows)
    (folder/'report.json').write_text(json.dumps(report,indent=2))
    print('BENCH50 SUMMARY',json.dumps({k:v for k,v in report.items() if k!='cases'}),flush=True)
    if len(controlled)!=50 or any(q['status']=='error' for q in rows):sys.exit(1)
if __name__=='__main__':main()
