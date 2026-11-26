"""Reproducible 25-case CALCOPY benchmark: 18 archived plans + 7 ground-truth raster cases.
Real plans need annotated truth before an error percentage may be reported.
"""
import json, pathlib, sys, time
import cv2, numpy as np
from bridge_v2 import analyze_v2

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'calcopy-benchmark-output'
OUT.mkdir(exist_ok=True)

def predict(im):
    h,w=im.shape[:2]
    t=time.perf_counter()
    result=json.loads(analyze_v2(cv2.cvtColor(im,cv2.COLOR_BGR2RGBA).tobytes(),w,h))
    return result,round(time.perf_counter()-t,3)

def mask_for(shape,walls):
    m=np.zeros(shape[:2],np.uint8)
    for q in walls:
        a,b,t=q['a'],q['b'],q['t']
        if abs(a[0]-b[0])>=abs(a[1]-b[1]):
            x0,x1=sorted([a[0],b[0]]);y=(a[1]+b[1])/2
            cv2.rectangle(m,(round(x0),round(y-t/2)),(round(x1),round(y+t/2)),1,-1)
        else:
            y0,y1=sorted([a[1],b[1]]);x=(a[0]+b[0])/2
            cv2.rectangle(m,(round(x-t/2),round(y0)),(round(x+t/2),round(y1)),1,-1)
    return m

def measure(expected,predicted):
    e=expected.astype(bool);p=predicted.astype(bool)
    tp=int((e&p).sum());fn=int((e&~p).sum());fp=int((p&~e).sum())
    union=tp+fn+fp
    return dict(tp=tp,fn=fn,fp=fp,error_pct=round(100*(fn+fp)/max(1,union),2),
                missed_pct=round(100*fn/max(1,tp+fn),2),extra_pct=round(100*fp/max(1,tp+fp),2))

def overlay(im,m,truth=None):
    vis=(im*.55+255*.45).astype(np.uint8)
    if truth is not None:vis[truth.astype(bool)]=(190,210,190)
    q=m.astype(bool);vis[q]=(vis[q]*.35+np.array([40,40,220])*.65).astype(np.uint8)
    return vis

def synthetic(i):
    im=np.full((600,800,3),255,np.uint8)
    walls=[dict(a=[80,80],b=[720,80],t=20),dict(a=[80,80],b=[80,520],t=20),
           dict(a=[720,80],b=[720,520],t=20),dict(a=[80,520],b=[720,520],t=20),
           dict(a=[400,80],b=[400,260],t=10),dict(a=[400,340],b=[400,520],t=15),
           dict(a=[80,300],b=[400,300],t=15),dict(a=[400,420],b=[720,420],t=10)]
    if i==6:walls.append(dict(a=[580,300],b=[580,520],t=20))
    truth=mask_for(im.shape,walls)
    for j,q in enumerate(walls):
        mask=mask_for(im.shape,[q]);ys,xs=np.where(mask);x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
        kind=('solid','outline','hatch','mixed','gray','jpeg','solid')[i]
        if kind=='mixed':kind=('solid','outline','hatch')[j%3]
        if kind in ('solid','gray','jpeg'):im[mask.astype(bool)]=80 if kind=='gray' else 20
        else:
            cv2.rectangle(im,(x0,y0),(x1,y1),(20,20,20),1)
            if kind=='hatch':
                for z in range(x0-y1,x1-y0+1,7):
                    p=(max(x0,z+y0),max(y0,x0-z));r=(min(x1,z+y1),min(y1,x1-z))
                    if p[0]<=r[0] and p[1]<=r[1]:cv2.line(im,p,r,(80,80,80),1)
    # furniture and stairs as distractors, not wall truth
    cv2.rectangle(im,(130,130),(220,240),(20,20,20),1)
    cv2.rectangle(im,(140,140),(210,166),(20,20,20),1)
    cv2.ellipse(im,(650,200),(16,24),0,0,360,(20,20,20),1)
    for y in range(330,400,10):cv2.line(im,(500,y),(560,y),(30,30,30),1)
    if i==5:im=cv2.imdecode(cv2.imencode('.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,45])[1],cv2.IMREAD_COLOR)
    return im,truth

def main():
    rows=[]
    cases=[]
    for i in range(1,19):
        path=ROOT/'assets/architecture-references/house/unverified'/f'user-drive-20261125-{i:02}.jpg'
        cases.append((f'real-{i:02}',cv2.imread(str(path)),None))
    for i in range(7):
        im,truth=synthetic(i);cases.append((f'synthetic-{i+1:02}',im,truth))
    for name,im,truth in cases:
        if im is None:
            rows.append(dict(case=name,status='missing'));continue
        try:
            result,elapsed=predict(im)
            modes={}
            for mode,walls in result['readings'].items():
                m=mask_for(im.shape,walls)
                modes[mode]=dict(walls=len(walls),**(measure(truth,m) if truth is not None else {}))
                vis=overlay(im,m,truth)
                cv2.imwrite(str(OUT/f'{name}-{mode}.jpg'),vis)
                if mode in ('mixed','validated'):cv2.imwrite(str(OUT/f'{name}-{mode}-black.png'),255*(1-m))
            row=dict(case=name,status='executed',seconds=elapsed,default=result['best'],modes=modes,
                     evaluation='annotated synthetic' if truth is not None else 'manual annotation required',validation=result.get('validation'))
            rows.append(row);print(json.dumps(row),flush=True)
        except Exception as exc:
            rows.append(dict(case=name,status='error',message=str(exc)))
    annotated=[r for r in rows if r.get('evaluation')=='annotated synthetic']
    summary={}
    for mode in ('solid','lines','mixed','validated'):
        metrics=[r['modes'][mode] for r in annotated if mode in r['modes']]
        if metrics:
            tp=sum(m['tp'] for m in metrics);fp=sum(m['fp'] for m in metrics);fn=sum(m['fn'] for m in metrics)
            summary[mode]=dict(cases=len(metrics),error_pct=round(100*(fp+fn)/max(1,tp+fp+fn),2))
    report=dict(cases=rows,synthetic_summary=summary,real_error_pct=None,
                limitation='Walls only. Real-plan truth, block detection, opening and full browser integration are not scored.')
    (OUT/'report.json').write_text(json.dumps(report,indent=2))
    print('SUMMARY',json.dumps(summary),flush=True)
    if any(r['status']!='executed' for r in rows):sys.exit(1)

if __name__=='__main__':main()
