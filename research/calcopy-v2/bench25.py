"""Reproducible 50-case CALCOPY benchmark: 18 archived plans + 32 labelled synthetic cases.
Real plans need annotated truth before an error percentage may be reported.
"""
import json, pathlib, sys, time
import cv2, numpy as np
from bridge_v2 import analyze_v2

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'calcopy-benchmark-output'
OUT.mkdir(exist_ok=True)

def predict(im,real_width_m=None):
    h,w=im.shape[:2]
    t=time.perf_counter()
    result=json.loads(analyze_v2(cv2.cvtColor(im,cv2.COLOR_BGR2RGBA).tobytes(),w,h,real_width_m))
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


def extended_case(i):
    """25 distinct room layouts with labelled door symbols; 100 px/m."""
    W,H=800,600
    im=np.full((H,W,3),255,np.uint8)
    x=300+35*(i%5); y=265+25*((i//5)%5)
    width=65+10*(i%4); t=(10,15,20)[i%3]
    vertical=bool(i%2)
    hinge_low=bool((i//2)%2); side=1 if (i//4)%2 else -1
    style=('solid','outline','hatch','mixed','gray')[i%5]
    g0=(y-width//2) if vertical else (x-width//2)
    g1=g0+width
    c=y if not vertical else x
    walls=[dict(a=[55,55],b=[745,55],t=30),
           dict(a=[55,55],b=[55,545],t=30),
           dict(a=[745,55],b=[745,545],t=30),
           dict(a=[55,545],b=[745,545],t=30)]
    def wall(a,b,t):
        walls.append(dict(a=a,b=b,t=t))
    if vertical:
        wall([x,55],[x,g0],t);wall([x,g1],[x,545],t)
        wall([55,400],[x,400],15);wall([x,160],[745,160],10)
    else:
        wall([55,y],[g0,y],t);wall([g1,y],[745,y],t)
        wall([200,55],[200,y],15);wall([600,y],[600,545],10)
    truth=mask_for(im.shape,walls)
    for j,q in enumerate(walls):
        mask=mask_for(im.shape,[q]);ys,xs=np.where(mask)
        x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
        kind=('solid','outline','hatch')[j%3] if style=='mixed' else style
        if kind in ('solid','gray'):im[mask.astype(bool)]=70 if kind=='gray' else 20
        else:
            cv2.rectangle(im,(x0,y0),(x1,y1),(20,20,20),1)
            if kind=='hatch':
                for z in range(x0-y1,x1-y0+1,6):
                    p=(max(x0,z+y0),max(y0,x0-z));q=(min(x1,z+y1),min(y1,x1-z))
                    if p[0]<=q[0] and p[1]<=q[1]:cv2.line(im,p,q,(70,70,70),1)
    hinge=g0 if hinge_low else g1
    theta=np.linspace(0,np.pi/2,90)
    u=hinge+(1 if hinge_low else -1)*width*np.cos(theta)
    v=c+side*width*np.sin(theta)
    pts=np.rint(np.column_stack((v,u) if vertical else (u,v))).astype(np.int32)
    cv2.polylines(im,[pts],False,(20,20,20),1)
    p=(c,hinge) if vertical else (hinge,c)
    q=(c+side*width,hinge) if vertical else (hinge,c+side*width)
    cv2.line(im,p,q,(20,20,20),1)
    # Furniture / tiled floor distraction, away from the expected door.
    cv2.rectangle(im,(90,90),(160,150),(30,30,30),1)
    cv2.ellipse(im,(690,490),(18,24),0,0,360,(30,30,30),1)
    if i%3==0:
        for z in range(95,181,20):cv2.line(im,(z,460),(z,520),(100,100,100),1)
        for z in range(460,521,20):cv2.line(im,(95,z),(175,z),(100,100,100),1)
    if i%7==0:im=cv2.imdecode(cv2.imencode('.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,55])[1],cv2.IMREAD_COLOR)
    return im,truth,dict(v=vertical,c=c,g0=g0,g1=g1,hingeAtLo=hinge_low,side=side)

def semantic_overlay(im,result):
    vis=im.copy()
    palette=[(105,195,235),(180,210,125),(225,180,150),(180,150,220),(140,220,210)]
    for j,r in enumerate(result.get('regions',[])):
        m=np.zeros(im.shape[:2],np.uint8)
        for ring in sorted(r.get('rings',[]),key=lambda a:a['hole']):
            pts=np.rint(ring['points']).astype(np.int32)
            if len(pts)>=3:cv2.fillPoly(m,[pts],0 if ring['hole'] else 1)
        q=m.astype(bool)
        vis[q]=(vis[q]*.55+np.array(palette[j%len(palette)])*.45).astype(np.uint8)
    for d in result.get('doors',[]):
        if d['kind']!='swing-door':continue
        g0,g1,c=d['g0'],d['g1'],d['c'];h=g0 if d['hingeAtLo'] else g1
        t=np.linspace(0,np.pi/2,60);radius=g1-g0
        u=h+(1 if d['hingeAtLo'] else -1)*radius*np.cos(t);v=c+d['side']*radius*np.sin(t)
        pts=np.rint(np.column_stack((v,u) if d['v'] else (u,v))).astype(np.int32)
        cv2.polylines(vis,[pts],False,(190,60,30),2)
        a=(c,h) if d['v'] else (h,c);b=(c+d['side']*radius,h) if d['v'] else (h,c+d['side']*radius)
        cv2.line(vis,tuple(map(round,a)),tuple(map(round,b)),(190,60,30),2)
    return vis

def score_door(expected,doors):
    matches=[d for d in doors if d['kind']=='swing-door' and d['v']==expected['v']
             and abs(d['c']-expected['c'])<=12 and abs(d['g0']-expected['g0'])<=15 and abs(d['g1']-expected['g1'])<=15]
    return dict(located=bool(matches),correct_swing=any(d['hingeAtLo']==expected['hingeAtLo'] and d['side']==expected['side'] for d in matches),
                candidates=len(doors),unmatched=len(doors)-len(matches))


def main():
    rows=[]
    cases=[]
    for i in range(1,19):
        path=ROOT/'assets/architecture-references/house/unverified'/f'user-drive-20261125-{i:02}.jpg'
        cases.append((f'real-{i:02}',cv2.imread(str(path)),None))
    for i in range(7):
        im,truth=synthetic(i);cases.append((f'synthetic-{i+1:02}',im,truth))
    expected_doors={}
    for i in range(25):
        im,truth,door=extended_case(i)
        name=f'extended-{i+1:02}'
        cases.append((name,im,truth));expected_doors[name]=door
    for name,im,truth in cases:
        if im is None:
            rows.append(dict(case=name,status='missing'));continue
        try:
            result,elapsed=predict(im,real_width_m=8.0 if truth is not None else None)
            modes={}
            for mode,walls in result['readings'].items():
                m=mask_for(im.shape,walls)
                modes[mode]=dict(walls=len(walls),**(measure(truth,m) if truth is not None else {}))
                vis=overlay(im,m,truth)
                cv2.imwrite(str(OUT/f'{name}-{mode}.jpg'),vis)
                if mode in ('mixed','validated'):cv2.imwrite(str(OUT/f'{name}-{mode}-black.png'),255*(1-m))
            row=dict(case=name,status='executed',seconds=elapsed,default=result['best'],modes=modes,
                     evaluation='annotated synthetic' if truth is not None else 'manual annotation required',validation=result.get('validation'),regions=len(result.get('regions',[])),door_candidates=len(result.get('doors',[])),floor_candidates=len(result.get('floor_grids',[])))
            cv2.imwrite(str(OUT/f'{name}-semantic.jpg'),semantic_overlay(im,result))
            if name in expected_doors:row['door_score']=score_door(expected_doors[name],result.get('doors',[]))
            rows.append(row);print(json.dumps(row),flush=True)
        except Exception as exc:
            rows.append(dict(case=name,status='error',message=str(exc)))
    annotated=[r for r in rows if r.get('evaluation')=='annotated synthetic']
    summary={}
    for mode in ('solid','lines','mixed','validated','metric'):
        metrics=[r['modes'][mode] for r in annotated if mode in r['modes']]
        if metrics:
            tp=sum(m['tp'] for m in metrics);fp=sum(m['fp'] for m in metrics);fn=sum(m['fn'] for m in metrics)
            summary[mode]=dict(cases=len(metrics),error_pct=round(100*(fp+fn)/max(1,tp+fp+fn),2))
    door_rows=[r['door_score'] for r in rows if 'door_score' in r]
    door_summary=dict(expected=25,executed=len(door_rows),located=sum(r['located'] for r in door_rows),correct_swing=sum(r['correct_swing'] for r in door_rows),unmatched=sum(r['unmatched'] for r in door_rows))
    report=dict(cases=rows,synthetic_summary=summary,door_summary=door_summary,real_error_pct=None,
                limitation='Wall masks and synthetic swing doors only. Real-plan ground truth, real scale, block detection, obstruction clearance and full browser integration are not scored.')
    (OUT/'report.json').write_text(json.dumps(report,indent=2))
    print('SUMMARY',json.dumps(summary),flush=True)
    print('DOORS',json.dumps(door_summary),flush=True)
    if any(r['status']!='executed' for r in rows):sys.exit(1)

if __name__=='__main__':main()
