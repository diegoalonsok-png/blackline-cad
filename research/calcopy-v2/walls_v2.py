"""CALCOPY v2 wall detector: raster -> axis-aligned wall centerlines with real thickness (px)."""
import cv2,numpy as np,math
def _ink(im,paper,f):
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV);g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    return ((g<paper*f)&(hsv[...,1]<90)).astype(np.uint8),g
def stroke_width(ink):
    d=cv2.distanceTransform(ink,cv2.DIST_L2,3)
    ridge=(d>=cv2.dilate(d,np.ones((3,3)))-1e-6)&(d>0)
    h=np.bincount(np.round(2*d[ridge]).astype(int),minlength=120)[:120].astype(float)
    score=h*np.arange(120);score[:6]=0
    i=int(np.argmax(score))
    if h[i]<120:return None
    return min(j for j in range(6,120) if score[j]>=.35*score[i])
def solid(im,paper):
    best=None
    for f in (.62,.82):
        ink,g=_ink(im,paper,f);T=stroke_width(ink)
        if not T:continue
        k=max(3,int(round(T*.6)))
        m=cv2.morphologyEx(ink,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(k,k)))
        # Remove broad filled areas (shaded rooms, cores): walls are narrow bands.
        K=int(max(3*T,.045*max(m.shape)))|1
        blob=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(K,K)))
        m=m&(1-cv2.dilate(blob,np.ones((5,5),np.uint8)))
        best=(m,T) if best is None else (best[0]|m,min(best[1],T))
    return best if best else (None,None)
def hollow(im,paper):
    ink,g=_ink(im,paper,.75)
    seal=cv2.morphologyEx(ink,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    white=(1-seal).astype(np.uint8);H,W=white.shape
    n,lab,st,_=cv2.connectedComponentsWithStats(white,connectivity=4)
    d=cv2.distanceTransform(white,cv2.DIST_L2,3)
    mx=np.zeros(n);np.maximum.at(mx,lab.ravel(),d.ravel())
    keep=np.zeros(n,bool);wid=2*mx
    for i in range(1,n):
        x,y,w,h,a=st[i];L=max(w,h)
        if wid[i]<2.5 or wid[i]>max(18,.03*max(H,W)) or L<6*wid[i] or a<L*wid[i]*.45:continue
        if x==0 or y==0 or x+w>=W or y+h>=H:continue
        keep[i]=True
    out=keep[lab].astype(np.uint8)
    out=cv2.dilate(out,np.ones((3,3),np.uint8))&np.maximum(out,seal)
    return out,(np.median(wid[keep])+2 if keep.any() else None)
def network(mask,T):
    """Keep the connected wall network; drop isolated furniture-like islands."""
    near=cv2.dilate(mask,cv2.getStructuringElement(cv2.MORPH_RECT,(int(T*2.2)|1,int(T*2.2)|1)))
    n,lab,st,_=cv2.connectedComponentsWithStats(near,connectivity=8)
    if n<=1:return mask
    span=st[1:,2]+st[1:,3];big=1+int(np.argmax(span))
    keep=np.zeros(n,bool);keep[big]=True
    for i in range(1,n):
        if max(st[i,2],st[i,3])>=.35*max(st[big,2],st[big,3]):keep[i]=True
    return mask*keep[lab]
def runs(mask,T,vertical):
    src=mask.T if vertical else mask
    L=max(int(T*2.5),6)
    m=cv2.morphologyEx(src,cv2.MORPH_OPEN,np.ones((1,L),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m,connectivity=4)
    out=[]
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if w<L:continue
        sub=(lab[y:y+h,x:x+w]==i)
        cols=sub.sum(0).astype(float)
        top=np.argmax(sub,0);bot=h-1-np.argmax(sub[::-1],0)
        # split where thickness changes strongly
        start=0
        for j in range(1,w+1):
            if j==w or abs(cols[j]-cols[start])>max(2,.35*cols[start]):
                if j-start>=L:
                    t=float(np.median(cols[start:j]));c=y+float(np.median((top[start:j]+bot[start:j])/2))
                    out.append(dict(v=vertical,c=c,lo=float(x+start),hi=float(x+j-1),t=t))
                start=j
    return out
def merge(segs,T):
    segs=sorted(segs,key=lambda s:(s['v'],s['c'],s['lo']));res=[]
    for s in segs:
        for r in res:
            if r['v']==s['v'] and abs(r['c']-s['c'])<=max(2,.3*min(r['t'],s['t'])) and abs(r['t']-s['t'])<=max(2,.3*r['t']) and s['lo']-r['hi']<=max(3,.6*T):
                tot=(r['hi']-r['lo'])+(s['hi']-s['lo']);r['c']=(r['c']*(r['hi']-r['lo'])+s['c']*(s['hi']-s['lo']))/tot
                r['hi']=max(r['hi'],s['hi']);break
        else:res.append(dict(s))
    return res
def pair_outlines(segs,T):
    """Two parallel outline strokes with an empty core form one hollow wall."""
    used=set();out=[]
    order=sorted(range(len(segs)),key=lambda i:-(segs[i]['hi']-segs[i]['lo']))
    for i in order:
        if i in used:continue
        s=segs[i];best=None
        for j in order:
            if j==i or j in used:continue
            o=segs[j]
            if o['v']!=s['v']:continue
            gap=abs(o['c']-s['c'])-(o['t']+s['t'])/2
            if gap<1 or gap>3.2*max(s['t'],o['t']):continue
            ov=min(s['hi'],o['hi'])-max(s['lo'],o['lo'])
            if ov<.6*min(s['hi']-s['lo'],o['hi']-o['lo']):continue
            if best is None or gap<best[0]:best=(gap,j)
        if best and s['t']<=2.2*min(segs[best[1]]['t'],8) :
            o=segs[best[1]];used|={i,best[1]}
            a=min(s['c']-s['t']/2,o['c']-o['t']/2);b=max(s['c']+s['t']/2,o['c']+o['t']/2)
            out.append(dict(v=s['v'],c=(a+b)/2,t=b-a,lo=min(s['lo'],o['lo']),hi=max(s['hi'],o['hi'])))
        else:
            used.add(i);out.append(s)
    return out
def snap(segs,T):
    """Extend wall ends to meet perpendicular wall axes (L/T joins)."""
    tol=max(3,1.2*T)
    for s in segs:
        for end in ('lo','hi'):
            p=s[end];best=None
            for o in segs:
                if o['v']==s['v']:continue
                # o is perpendicular: its axis coordinate o['c'] lies along s's run direction
                if not(o['lo']-tol<=s['c']<=o['hi']+tol):continue
                d=abs(o['c']-p)
                if d<=tol+o['t']/2 and (best is None or d<best[0]):best=(d,o['c'])
            if best:s[end]=best[1]
    for s in segs:
        if s['lo']>s['hi']:s['lo'],s['hi']=s['hi'],s['lo']
    return segs
def vectorize(mask,T):
    segs=runs(mask,T,False)+runs(mask,T,True)
    segs=merge(segs,T)
    segs=pair_outlines(segs,T)
    segs=[s for s in segs if s['hi']-s['lo']>=max(2*T,.6*s['t']+T) and s['t']<=3.5*T]
    return wall_network(snap(segs,T),T)
def _touch(s,o,tol):
    """Perpendicular: an end of s reaches o's body. Parallel: collinear continuation."""
    if s['v']!=o['v']:
        if not(o['lo']-tol<=s['c']<=o['hi']+tol):return False
        return min(abs(s['lo']-o['c']),abs(s['hi']-o['c']))<=tol+o['t']/2 or (s['lo']-tol<=o['c']<=s['hi']+tol and o['lo']-tol<=s['c']<=o['hi']+tol)
    # Collinear, similar thickness, separated by at most an opening width (~14 wall thicknesses).
    return abs(s['c']-o['c'])<=max(s['t'],o['t'])*.6 and abs(s['t']-o['t'])<=.45*max(s['t'],o['t']) and min(s['hi'],o['hi'])-max(s['lo'],o['lo'])>-max(tol,14*min(s['t'],o['t']))
def wall_network(segs,T):
    """Diego's rule: rectangles touching other rectangles form the wall network; loose ones are furniture."""
    n=len(segs)
    if n<3:return segs
    tol=max(3,.8*T);parent=list(range(n))
    def f(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    for i in range(n):
        for j in range(i+1,n):
            if _touch(segs[i],segs[j],tol) or _touch(segs[j],segs[i],tol):parent[f(i)]=f(j)
    tot={}
    for i,s in enumerate(segs):tot[f(i)]=tot.get(f(i),0)+s['hi']-s['lo']
    big=max(tot.values())
    return [s for i,s in enumerate(segs) if tot[f(i)]>=.18*big and tot[f(i)]>=6*T]
def structure_score(segs,H,W):
    m=.12*max(H,W)
    return sum(s['hi']-s['lo'] for s in segs if s['hi']-s['lo']>=m)
def detect(im):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);paper=float(np.percentile(g,90));H,W=g.shape
    opts=[]
    sm,T=solid(im,paper)
    if sm is not None:opts.append(('solid',sm,T))
    hm,Th=hollow(im,paper)
    if Th:opts.append(('hollow',hm,Th))
    best=None
    for kind,mask,T in opts:
        segs=vectorize(mask,T);sc=structure_score(segs,H,W)
        if best is None or sc>best[0]:best=(sc,segs,T,kind,mask)
    if not best:return [],None,'none',None
    return best[1],best[2],best[3],best[4]
