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


def black_mask(shape,segs):
    """Rasterize the proposed wall bodies, without round caps or bridging gaps."""
    m=np.zeros(shape[:2],np.uint8)
    for q in segs:
        src=m.T if q['v'] else m
        x0=max(0,int(np.ceil(q['lo'])));x1=min(src.shape[1],int(np.floor(q['hi']))+1)
        y0=max(0,int(np.ceil(q['c']-q['t']/2)));y1=min(src.shape[0],int(np.floor(q['c']+q['t']/2))+1)
        if x1>x0 and y1>y0:src[y0:y1,x0:x1]=1
    return m


def source_support(ink,q):
    """Independent image evidence along the axis, not agreement with our own mask."""
    src=ink.T if q['v'] else ink
    lo=max(0,int(np.ceil(q['lo'])));hi=min(src.shape[1],int(np.floor(q['hi']))+1)
    c,t=q['c'],q['t']
    if hi<=lo:return lo,np.zeros(0,bool)
    def strip(y,r):
        a=max(0,int(round(y))-r);b=min(src.shape[0],int(round(y))+r+1)
        return src[a:b,lo:hi]
    core=strip(c,max(1,int(t*.27)))
    if not core.size:return lo,np.zeros(hi-lo,bool)
    radius=max(1,int(t*.14))
    f1=strip(c-t/2+.5,radius);f2=strip(c+t/2-.5,radius)
    dark=core.mean(axis=0)>=.55
    faces=(f1.max(axis=0)>0)&(f2.max(axis=0)>0) if f1.size and f2.size else np.zeros(hi-lo,bool)
    return lo,dark|faces


def _unsupported_runs(support):
    edges=np.flatnonzero(np.diff(np.pad((~support).astype(np.int8),(1,1))))
    return list(zip(edges[::2],edges[1::2]))


def validate_mask(ink,segs,max_passes=3):
    """Review black wall silhouettes against original pixels; bounded correction.
    Long unsupported intervals may be gaps, not masonry. A crossing wall can
    explain a short break in outline evidence, so protect its junction region.
    Returns source-support diagnostics, never an asserted ground-truth accuracy.
    """
    current=[dict(q) for q in segs]
    before=black_mask(ink.shape,current)
    stats=dict(passes=0,removed=0,split=0,trimmed=0)
    for _ in range(max_passes):
        nxt=[];changed=False
        for q in current:
            lo,support=source_support(ink,q)
            if not support.size:
                nxt.append(q);continue
            # Do not treat a crossing/join as a missing wall face.
            for o in current:
                if o is q or not junction(q,o):continue
                a=max(0,int(np.floor(o['c']-o['t']/2-lo-1)))
                b=min(len(support),int(np.ceil(o['c']+o['t']/2-lo+2)))
                if b>a:support[a:b]=True
            cuts=[(int(a),int(b)) for a,b in _unsupported_runs(support)
                  if b-a>=max(7,1.5*q['t'])]
            if not cuts:
                nxt.append(q);continue
            bounds=[];start=0
            for a,b in cuts:
                if a>start:bounds.append((start,a))
                start=b
            if start<len(support):bounds.append((start,len(support)))
            pieces=[]
            for a,b in bounds:
                if b-a<max(8,2.5*q['t']):continue
                if support[a:b].mean()<.60:continue
                p=dict(q,lo=max(q['lo'],lo+a),hi=min(q['hi'],lo+b-1))
                pieces.append(p)
            # Retain marginal cases for manual review rather than erasing a
            # possibly faint real wall. Strongly unsupported runs can be dropped.
            if not pieces and support.mean()>=.35:
                nxt.append(q);continue
            if not pieces:stats['removed']+=1
            elif len(pieces)>1:stats['split']+=1
            elif pieces[0]['lo']!=q['lo'] or pieces[0]['hi']!=q['hi']:stats['trimmed']+=1
            if len(pieces)!=1 or pieces[0]!=q:changed=True
            nxt.extend(pieces)
        stats['passes']+=1
        current=nxt
        if not changed:break
    after=black_mask(ink.shape,current)
    total=supported=0
    for q in current:
        _,s=source_support(ink,q)
        total+=s.size;supported+=int(s.sum())
    stats.update(mask_before_px=int(before.sum()),mask_after_px=int(after.sum()),
                 source_support_pct=round(100*supported/max(1,total),2))
    return current,stats


def enclosed_regions(mask):
    """Find closed free-space components and identify their surrounding wall network.
    Open rooms are deliberately not invented by sealing door gaps. The result
    is diagnostic: a small compartment is not necessarily a shaft.
    """
    import cv2
    mask=(mask>0).astype(np.uint8)
    H,W=mask.shape
    n,labels,stats,_=cv2.connectedComponentsWithStats(1-mask,connectivity=4)
    nw,wall_labels,wall_stats,_=cv2.connectedComponentsWithStats(mask,connectivity=8)
    main=int(1+np.argmax(wall_stats[1:,4])) if nw>1 else 0
    out=[]
    for i in range(1,n):
        x,y,w,h,a=map(int,stats[i])
        if x==0 or y==0 or x+w==W or y+h==H or min(w,h)<3 or a<16:continue
        # Inspect only a local crop around this cavity, not the whole image.
        x0=max(0,x-1);y0=max(0,y-1);x1=min(W,x+w+1);y1=min(H,y+h+1)
        part=(labels[y0:y1,x0:x1]==i).astype(np.uint8)
        border=(cv2.dilate(part,np.ones((3,3),np.uint8))>0)&(part==0)
        adjacent=wall_labels[y0:y1,x0:x1][border]
        adjacent=adjacent[adjacent>0]
        attached=float((adjacent==main).mean()) if adjacent.size else 0.
        contours,hierarchy=cv2.findContours(part,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
        rings=[]
        if hierarchy is not None:
            for j,contour in enumerate(contours):
                poly=cv2.approxPolyDP(contour,0.75,True).reshape(-1,2)
                if len(poly)<3:continue
                if len(poly)>512:continue
                rings.append(dict(hole=bool(hierarchy[0,j,3]>=0),points=[[int(px)+x0,int(py)+y0] for px,py in poly]))
        out.append(dict(x=x,y=y,w=w,h=h,area=a,rectangularity=round(a/(w*h),3),
                        shape='rectangular' if a/(w*h)>=.98 else 'polygonal',
                        rings=rings,main_wall_fraction=round(attached,3)))
    return sorted(out,key=lambda q:q['area'],reverse=True)[:250]


def classify_region(q,pixels_per_m):
    """Project heuristic, not building-code compliance or definitive room use."""
    if not np.isfinite(pixels_per_m) or pixels_per_m<=0:return 'unscaled'
    w,d=q['w']/pixels_per_m,q['h']/pixels_per_m
    area=q['area']/pixels_per_m**2
    if q['main_wall_fraction']<.5:return 'isolated_object_candidate'
    if min(w,d)<=.60 and max(w,d)<=.90 and area<=.54:return 'technical_void_candidate'
    if min(w,d)<.75 or area<1:return 'small_space_review'
    return 'room_candidate' if q.get('rectangularity',0)>=.98 else 'polygonal_room_candidate'


def residual_summary(ink,wall_mask):
    """Preserve unexplained ink for object/dimension/line review.
    This is coverage of ink, not the user's estimated 5% of entities.
    """
    import cv2
    near=cv2.dilate(wall_mask,np.ones((3,3),np.uint8))
    rest=(ink>0)&(near==0)
    total=int((ink>0).sum())
    return dict(original_ink_px=total,unclassified_ink_px=int(rest.sum()),
                unclassified_ink_pct=round(100*int(rest.sum())/max(1,total),2))


def region_hierarchy(regions):
    """A smaller room can lie inside the envelope of an L-shaped or ring-shaped
    room. Record a possible relationship, not a proven suite or room use.
    Rectangular bounding boxes alone cannot prove containment or access.
    """
    for i,q in enumerate(regions):
        q['id']='region-'+str(i+1)
    for q in regions:
        candidates=[]
        for p in regions:
            if p is q or p['area']<=q['area'] or p.get('rectangularity',1)>=.98:continue
            if min(p['main_wall_fraction'],q['main_wall_fraction'])<.5:continue
            if (p['x']<=q['x'] and p['y']<=q['y'] and
                q['x']+q['w']<=p['x']+p['w'] and q['y']+q['h']<=p['y']+p['h']):
                candidates.append(p)
        if candidates:
            q['possible_parent']=min(candidates,key=lambda p:p['w']*p['h'])['id']
    return regions


def metric_wall_review(ink,segs,pixels_per_m):
    """Physical width gate and contextual nominal width hints.
    Preserve measured dimensions: 30 cm outside and 10/15/20 cm inside
    are architectural priors, not a command to deform the original plan.
    """
    import cv2
    stats=dict(scale_known=False,rejected_thin=0,review_width=0,perimeter=0,interior=0,undetermined=0)
    if not np.isfinite(pixels_per_m) or pixels_per_m<=0:
        return [dict(q) for q in segs],stats
    stats['scale_known']=True
    # Use the native CAD minimum, allowing raster rounding near 10 cm.
    accepted=[]
    for s in segs:
        q=dict(s);cm=100*q['t']/pixels_per_m
        if cm<8:
            stats['rejected_thin']+=1
            continue
        q['thickness_cm']=round(cm,2)
        accepted.append(q)
    m=black_mask(ink.shape,accepted)
    n,labels,st,_=cv2.connectedComponentsWithStats(1-m,connectivity=4)
    # Border-connected background is exterior evidence only when an enclosed
    # space exists on the other side. Open rooms remain undetermined.
    edge=np.unique(np.concatenate((labels[0,:],labels[-1,:],labels[:,0],labels[:,-1])))
    exterior=set(map(int,edge))-{0}
    for q in accepted:
        src=labels.T if q['v'] else labels
        lo=max(0,int(np.ceil(q['lo'])));hi=min(src.shape[1],int(np.floor(q['hi']))+1)
        if hi<=lo:
            role='undetermined'
        else:
            xs=np.linspace(lo,hi-1,min(31,hi-lo)).round().astype(int)
            votes=[]
            for sign in (-1,1):
                y=int(round(q['c']+sign*(q['t']/2+2)))
                if not 0<=y<src.shape[0]:
                    votes.append('unknown');continue
                vals=src[y,xs];vals=vals[vals>0]
                if vals.size<.55*xs.size:
                    votes.append('unknown');continue
                ext=sum(int(v) in exterior for v in vals)/len(vals)
                votes.append('outside' if ext>=.8 else 'inside' if ext<=.2 else 'unknown')
            role='perimeter' if sorted(votes)==['inside','outside'] else 'interior' if votes==['inside','inside'] else 'undetermined'
        q['wall_role']=role;stats[role]+=1
        priors=(30,) if role=='perimeter' else (10,15,20) if role=='interior' else (10,15,20,30)
        cm=q['thickness_cm'];nom=min(priors,key=lambda x:abs(x-cm))
        q['nominal_cm']=nom
        q['width_review']=abs(cm-nom)>max(3,nom*.20)
        stats['review_width']+=int(q['width_review'])
    return accepted,stats


def repeated_floor_grid(ink,wall_mask,pixels_per_m):
    """Conservative floor-grid candidate from thin, regularly spaced line families.
    Both axes and actual intersections are required; never remove these pixels
    from the source or overwrite masonry. Returns a diagnostic bounding region.
    """
    import cv2
    if not np.isfinite(pixels_per_m) or pixels_per_m<=0:return []
    gap_min=max(4,int(.12*pixels_per_m));gap_max=max(gap_min,int(1.5*pixels_per_m))
    near=cv2.dilate(wall_mask,np.ones((3,3),np.uint8))
    residual=((ink>0)&(near==0)).astype(np.uint8)
    # Long thin single strokes, not broad wall bodies.
    width=max(2,int(.055*pixels_per_m))
    length=max(16,int(.65*pixels_per_m))
    lines=[]
    for vertical in (False,True):
        src=residual.T.copy() if vertical else residual
        m=cv2.morphologyEx(src,cv2.MORPH_OPEN,np.ones((1,length),np.uint8))
        n,_,st,_=cv2.connectedComponentsWithStats(m,connectivity=4)
        rows=[]
        for x,y,w,h,a in st[1:]:
            if h<=width and w>=length and a>=.65*w*h:rows.append((float(y+(h-1)/2),int(x),int(x+w-1)))
        lines.append(sorted(rows)[:500])
    def families(rows):
        groups=[]
        for i,(c,a,b) in enumerate(rows):
            for j in range(i+1,min(len(rows),i+12)):
                d,aa,bb=rows[j];step=d-c
                if step>gap_max:break
                if step<gap_min or min(b,bb)-max(a,aa)<length:continue
                chosen=[rows[i],rows[j]]
                for v in rows[j+1:]:
                    diff=v[0]-chosen[-1][0]
                    if diff>step*1.15:break
                    if abs(diff-step)<=max(1.5,.12*step) and min(b,v[2])-max(a,v[1])>=length:chosen.append(v)
                if len(chosen)>=3:
                    groups.append((chosen,step))
                if len(groups)>=60:return groups
        return groups
    out=[]
    for hs,dy in families(lines[0]):
        for vs,dx in families(lines[1]):
            x0,x1=vs[0][0],vs[-1][0];y0,y1=hs[0][0],hs[-1][0]
            if any(a>x0+2 or b<x1-2 for _,a,b in hs):continue
            if any(a>y0+2 or b<y1-2 for _,a,b in vs):continue
            if any(r['x']<=x0 and r['y']<=y0 and r['x']+r['w']>=x1 and r['y']+r['h']>=y1 for r in out):continue
            out.append(dict(x=x0,y=y0,w=x1-x0,h=y1-y0,tile_width_m=round(dx/pixels_per_m,3),
                            tile_depth_m=round(dy/pixels_per_m,3),kind='floor_grid_candidate'))
            if len(out)>=20:return out
    return out


def detect_door_symbols(ink,segs,pixels_per_m):
    """Find door candidates at paired wall ends using source-image symbols.
    Swing: leaf plus quarter arc. Pocket: aligned thin leaf extending into
    a wall pocket. Ambiguous glazing/sliding symbols are review-only.
    """
    import cv2
    if not np.isfinite(pixels_per_m) or pixels_per_m<=0:return []
    dist=cv2.distanceTransform((ink==0).astype(np.uint8),cv2.DIST_L2,3)
    H,W=ink.shape
    out=[]
    for v in (False,True):
        ds=dist.T if v else dist
        walls=sorted([q for q in segs if bool(q['v'])==v],key=lambda q:q['lo'])
        def support(u,s,tol):
            x=np.rint(u).astype(int);y=np.rint(s).astype(int)
            good=(x>=0)&(x<ds.shape[1])&(y>=0)&(y<ds.shape[0])
            return float((ds[y[good],x[good]]<=tol).sum()/max(1,len(x)))
        for i,a in enumerate(walls):
            for j,b in enumerate(walls[i+1:],i+1):
                gap=b['lo']-a['hi'];wm=gap/pixels_per_m
                if wm>1.35:break
                if wm<.55 or abs(a['c']-b['c'])>max(2,.35*min(a['t'],b['t'])):continue
                if max(a['t'],b['t'])>1.6*min(a['t'],b['t']):continue
                c=(a['c']+b['c'])/2;t=(a['t']+b['t'])/2
                if any(q is not a and q is not b and abs(q['c']-c)<t*.4 and q['lo']<b['lo']-gap*.15 and q['hi']>a['hi']+gap*.15 for q in walls):continue
                tol=max(1.5,min(3.5,gap*.045));best=None
                for hinge_low in (True,False):
                    hinge=a['hi'] if hinge_low else b['lo'];direction=1 if hinge_low else -1
                    for side in (-1,1):
                        for face in (c,c+side*t/2):
                            theta=np.linspace(.18,1.42,24)
                            arc=support(hinge+direction*gap*np.cos(theta),face+side*gap*np.sin(theta),tol)
                            d=np.linspace(.18,.92,18)*gap
                            leaf=support(np.full_like(d,hinge),face+side*d,tol)
                            score=min(arc,leaf)
                            if best is None or score>best[0]:best=(score,hinge_low,side,arc,leaf)
                rec=dict(v=v,c=c,g0=a['hi'],g1=b['lo'],width_m=round(wm,3))
                if best and best[0]>=.68:
                    out.append(dict(rec,kind='swing-door',hingeAtLo=best[1],side=best[2],arc_support=round(best[3],3),leaf_support=round(best[4],3)))
                    continue
                # A sliding leaf is parallel to its host. Require thin center
                # strokes through the opening AND into a hollow pocket. A plain
                # window across the gap alone is deliberately not classified.
                src=ink.T if v else ink
                def band(u0,u1,offset):
                    x0=max(0,int(np.ceil(u0)));x1=min(src.shape[1],int(np.floor(u1))+1)
                    y=int(round(c+offset))
                    if x1<=x0 or y<1 or y+1>=src.shape[0]:return 0.
                    return float((src[y-1:y+2,x0:x1].max(axis=0)>0).mean())
                for sign in (-1,1):
                    p0,p1=(a['hi']-.8*gap,a['hi']-.15*gap) if sign<0 else (b['lo']+.15*gap,b['lo']+.8*gap)
                    if (sign<0 and p0<a['lo']) or (sign>0 and p1>b['hi']):continue
                    center=band(a['hi']+.12*gap,b['lo']-.12*gap,0)
                    pocket=band(p0,p1,0)
                    blank=min(1-band(p0,p1,t*.30),1-band(p0,p1,-t*.30))
                    if center>=.7 and pocket>=.7 and blank>=.55:
                        out.append(dict(rec,kind='pocket-door-candidate',pocket_side=sign,review=True))
                        break
                if len(out)>=150:return out
    return out
