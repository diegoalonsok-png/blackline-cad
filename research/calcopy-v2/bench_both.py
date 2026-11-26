from bench_common import *
import walls_v2 as W
def draw(im,segs):
    vis=(im*.35+255*.65).astype(np.uint8)
    for s in segs:
        a=(int(s['c']),int(s['lo'])) if s['v'] else (int(s['lo']),int(s['c']))
        b=(int(s['c']),int(s['hi'])) if s['v'] else (int(s['hi']),int(s['c']))
        cv2.line(vis,a,b,(0,0,215),max(1,int(round(s['t']))))
    return vis
imgs=[]
for k in KEYS:
    im=load(k);g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);paper=float(np.percentile(g,90))
    sm,T=W.solid(im,paper);hm,Th=W.hollow(im,paper)
    a=draw(im,W.vectorize(sm,T)) if sm is not None else im
    b=draw(im,W.vectorize(hm,Th)) if Th else im
    imgs.append((k+' LLENO',a));imgs.append((k+' HUECO',b))
sheet(imgs[:18],T=330,cols=6,out='both1.jpg');sheet(imgs[18:],T=330,cols=6,out='both2.jpg')
