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
        k=max(3,int(round(T*.32)))
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
    L=max(int(T*1.5),6)
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
    """Merge only overlapping or raster-adjacent runs of comparable width."""
    res=[]
    for s in sorted(segs,key=lambda s:(s['v'],s['c'],s['lo'])):
        for r in res:
            narrow=min(r['t'],s['t'])
            gap=max(s['lo'],r['lo'])-min(s['hi'],r['hi'])
            if (r['v']==s['v'] and abs(r['c']-s['c'])<=max(1,.18*narrow)
                and abs(r['t']-s['t'])<=max(1,.15*narrow) and gap<=1):
                a=max(1,r['hi']-r['lo']);b=max(1,s['hi']-s['lo'])
                r['c']=(r['c']*a+s['c']*b)/(a+b)
                r['t']=(r['t']*a+s['t']*b)/(a+b)
                r['lo']=min(r['lo'],s['lo']);r['hi']=max(r['hi'],s['hi'])
                break
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
    """Resolve L/T/X from original axes, with individual half-width tolerances."""
    original=[dict(s) for s in segs]
    result=[]
    for i,s in enumerate(original):
        q=dict(s)
        for end,opposite,sign in (('lo','hi',-1),('hi','lo',1)):
            p=s[end];best=None
            for j,o in enumerate(original):
                if i==j or o['v']==s['v']:continue
                eps=max(1.5,.20*min(s['t'],o['t']))
                # The intersection must lie on, or immediately beside, both wall bodies.
                if not o['lo']-s['t']/2-eps<=s['c']<=o['hi']+s['t']/2+eps:continue
                d=abs(o['c']-p)
                if d>o['t']/2+eps:continue
                # Never shrink past the opposite end or create a tiny/inverted run.
                if sign*(o['c']-s[opposite])<max(2,s['t']):continue
                candidate=(d,o['c'])
                if best is None or candidate<best:best=candidate
            if best is not None:q[end]=best[1]
        if q['hi']-q['lo']<max(2,s['t']):q=dict(s)
        result.append(q)
    return result
def thin_lines(im,paper,vertical):
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV);g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    ink=((g<paper-35)&(hsv[...,1]<90)).astype(np.uint8)
    src=ink.T.copy() if vertical else ink
    H,W=src.shape;L=max(12,int(.025*max(H,W)))
    m=cv2.morphologyEx(src,cv2.MORPH_CLOSE,np.ones((1,3),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((1,L),np.uint8))
    # Read horizontal row runs independently: a short perpendicular connector
    # must not merge two long wall faces into one rejected thick component.
    groups=[];active=[]
    for y,row in enumerate(m):
        edges=np.flatnonzero(np.diff(np.pad(row.astype(np.int16),(1,1))))
        spans=[(int(x0),int(x1)-1) for x0,x1 in zip(edges[::2],edges[1::2]) if x1-x0>=L]
        next_active=[];used=set()
        for lo,hi in spans:
            matches=[]
            for j,g in enumerate(active):
                if j in used:continue
                a,b=g['spans'][-1];ov=min(b,hi)-max(a,lo)+1
                if ov>=.82*max(b-a+1,hi-lo+1):matches.append((ov,j))
            if matches:
                _,j=max(matches);used.add(j);g=active[j];g['spans'].append((lo,hi));next_active.append(g)
            else:next_active.append(dict(y=y,spans=[(lo,hi)]))
        groups.extend(g for j,g in enumerate(active) if j not in used)
        active=next_active
    groups.extend(active)
    out=[]
    for g in groups:
        t=len(g['spans'])
        if t>max(6,.012*max(H,W)):continue
        a,b=np.median(g['spans'],axis=0)
        if b-a+1<L:continue
        out.append(dict(c=g['y']+(t-1)/2,lo=float(a),hi=float(b),t=float(t)))
    return sorted(out,key=lambda q:q['c']),src
def line_pairs(im,paper):
    """Double-line walls: two parallel strokes at wall-thickness distance."""
    raw=[]
    for vertical in (False,True):
        lines,src=thin_lines(im,paper,vertical)
        for i,p in enumerate(lines):
            for q in lines[i+1:]:
                d=q['c']-p['c']
                if d<4:continue
                if d>.06*max(src.shape):break
                a,b=max(p['lo'],q['lo']),min(p['hi'],q['hi'])
                if b-a<3*d:continue
                y0=int(p['c']+p['t']/2+1);y1=int(q['c']-q['t']/2)
                core=src[y0:y1,int(a):int(b)]
                if core.size==0:continue
                # Empty or textured core, never a continuous stroke inside.
                if core.mean()>.45 or (core.mean(axis=1).max(initial=0)>.8 and core.shape[0]>2):continue
                # Stripes (stairs, decking, hatching) repeat: a wall pair has no third parallel stroke nearby.
                def crowded(lo_c,hi_c):
                    for r in lines:
                        if lo_c<r['c']<hi_c and min(b,r['hi'])-max(a,r['lo'])>.5*(b-a):return True
                    return False
                if crowded(q['c']+1,q['c']+1.3*d) or crowded(p['c']-1.3*d,p['c']-1) or crowded(p['c']+1,q['c']-1):continue
                raw.append(dict(v=vertical,c=(p['c']+q['c'])/2,t=d+(p['t']+q['t'])/2,lo=a,hi=b,gap=d,p=id(p),q=id(q)))
    if not raw:return [],None
    # Dominant wall thickness from long pairs.
    hist={}
    for r in raw:hist[round(r['gap'])]=hist.get(round(r['gap']),0)+(r['hi']-r['lo'])
    d0=max(hist,key=hist.get)
    keep=[r for r in raw if .40*d0<=r['gap']<=2.6*d0]
    # One long face can border several non-overlapping runs at T/X junctions.
    # Reserve only its matched interval, not the entire face. Never merge a gap.
    keep.sort(key=lambda r:(r['gap'],-(r['hi']-r['lo'])));used={};out=[]
    for r in keep:
        def conflicts(key):
            return any(min(r['hi'],hi)-max(r['lo'],lo)>max(1,.10*min(r['hi']-r['lo'],hi-lo))
                       for lo,hi in used.get(key,[]))
        if conflicts(r['p']) or conflicts(r['q']):continue
        for key in (r['p'],r['q']):used.setdefault(key,[]).append((r['lo'],r['hi']))
        out.append(dict(v=r['v'],c=r['c'],t=r['t'],lo=r['lo'],hi=r['hi']))
    return out,d0+2
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
def finish(segs,T):
    segs=merge(segs,T)
    segs=[q for q in segs if q['hi']-q['lo']>=max(2*T,.6*q['t']+T) and q['t']<=3.5*T]
    return wall_network(snap(segs,T),T)
def detect(im,mode='auto'):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);paper=float(np.percentile(g,90));H,W=g.shape
    res={}
    sm,T=solid(im,paper)
    if sm is not None:
        segs=runs(sm,T,False)+runs(sm,T,True);segs=pair_outlines(merge(segs,T),T)
        res['solid']=(finish(segs,T),T)
    ps,Tp=line_pairs(im,paper)
    if Tp:res['lines']=(finish(ps,Tp),Tp)
    if mode != 'auto':
        if mode in res:return res[mode][0],res[mode][1],mode,None
        return [],None,mode,None
    if not res:return [],None,'none',None
    k=max(res,key=lambda k:structure_score(res[k][0],H,W))
    return res[k][0],res[k][1],k,None
