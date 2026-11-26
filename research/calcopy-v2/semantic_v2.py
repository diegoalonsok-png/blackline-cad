"""Conservative fusion of wall readings. Coordinates remain image pixels."""
import numpy as np


def length(q):
    return q['hi']-q['lo']


def overlaps(a,b):
    if a['v']!=b['v']:
        return False
    t=min(a['t'],b['t'])
    return (abs(a['c']-b['c'])<=max(1.5,.40*t)
            and min(a['hi'],b['hi'])-max(a['lo'],b['lo'])>=.40*min(length(a),length(b)))


def junction(a,b):
    if a['v']==b['v']:
        return False
    eps=max(1.5,.20*min(a['t'],b['t']))
    return (a['lo']-b['t']/2-eps<=b['c']<=a['hi']+b['t']/2+eps
            and b['lo']-a['t']/2-eps<=a['c']<=b['hi']+a['t']/2+eps)


def evidence(ink,q):
    """Require a sustained dark band or two faces, including a textured core."""
    src=ink.T if q['v'] else ink
    lo=max(0,int(np.ceil(q['lo'])));hi=min(src.shape[1],int(np.floor(q['hi']))+1)
    c,t=q['c'],q['t']
    if hi<=lo or t<3:return None
    def strip(y,r):
        a=max(0,int(round(y))-r);b=min(src.shape[0],int(round(y))+r+1)
        return src[a:b,lo:hi]
    core=strip(c,max(0,int(t*.28)))
    if not core.size:return None
    if (core.mean(axis=0)>.55).mean()>=.70:return 'solid'
    r=max(1,int(t*.12))
    faces=[strip(c-t/2+0.5,r),strip(c+t/2-0.5,r)]
    if not all(f.size and (f.max(axis=0)>0).mean()>=.75 for f in faces):return None
    return 'hatched' if .10<=core.mean()<=.60 else 'outline' if core.mean()<.10 else None


def fuse(ink,primary,secondary):
    """Keep the primary review; add supported, connected, nonduplicate candidates.
    Never bridge a collinear gap or silently delete primary walls.
    """
    out=[dict(q) for q in primary]
    pending=[]
    for s in secondary:
        q=dict(s);kind=evidence(ink,q)
        if kind is None or length(q)<max(8,2.5*q['t']):continue
        q['kind']=kind;pending.append(q)
    while pending:
        deferred=[];changed=False
        for q in sorted(pending,key=length,reverse=True):
            if any(overlaps(q,r) for r in out):continue
            if any(junction(q,r) for r in out):
                out.append(q);changed=True
            else:deferred.append(q)
        if not changed:break
        pending=deferred
    return out
