"""Wall axes -> planar wall union. No endpoint buffers or raster contour tracing."""
import numpy as np
from itertools import combinations
from shapely.geometry import LineString, Point, MultiPoint
from shapely.ops import unary_union

def cross(a,b): return float(a[0]*b[1]-a[1]*b[0])
def intersect(p,u,q,v):
    den=cross(u,v)
    if abs(den)<1e-9:return None
    return p+u*(cross(q-p,v)/den)

def snap_axes(rows,tol=8):
    """Only intersections of original axes; don't bend walls or close unrelated gaps."""
    data={i:np.array([a,b],float) for i,a,b in rows}; choices={}
    for i,j in combinations(data,2):
        a,b=data[i]; c,d=data[j]; u=(b-a)/np.linalg.norm(b-a); v=(d-c)/np.linalg.norm(d-c)
        if abs(cross(u,v))<.10:continue
        p=intersect(a,u,c,v)
        if p is None:continue
        if any(np.dot(p-z[0],z[1]-z[0])/np.linalg.norm(z[1]-z[0]) < -tol or np.dot(p-z[1],z[1]-z[0])/np.linalg.norm(z[1]-z[0]) > tol for z in [data[i],data[j]]):continue
        for k in [i,j]:
            for e in [0,1]:
                dist=np.linalg.norm(p-data[k][e])
                if dist<=tol:
                    other=j if k==i else i
                    direction=data[k][e]-data[k][1-e]
                    extension=float(np.dot(p-data[k][e],direction/np.linalg.norm(direction)))
                    # A short extension can turn a nearby exact corner into a T.
                    # Only do this when the other wall ends at that intersection.
                    anchored=min(np.linalg.norm(p-q) for q in data[other])<1e-6
                    priority=0 if anchored and extension>1e-6 else 1
                    choices.setdefault((k,e),[]).append((priority,dist,p,other))
    result={k:v.copy() for k,v in data.items()}; edits=[]
    for (k,e),c in choices.items():
        _,dist,p,j=min(c,key=lambda v:(v[0],v[1]));result[k][e]=p
        if dist>1e-7:edits.append(dict(wall=k,end=e,host=j,shiftPx=round(float(dist),3)))
    return [(i,*result[i]) for i in data],edits

def build_walls(rows,widths):
    """Flat caps; bounded exact miters for L; union for T/X; bevel for acute L."""
    axes={i:np.array([a,b],float) for i,a,b in rows}; h={i:widths[i]/2 for i in axes}
    bands={i:LineString(q).buffer(h[i],cap_style=2) for i,q in axes.items()}
    nodes={}
    for i,q in axes.items():
        for e in [0,1]:nodes.setdefault(tuple(np.round(q[e],7)),[]).append((i,e))
    patches=[];audit=[]; eps=1e-5
    for key,ends in nodes.items():
        p=np.array(key); arms=[]; through=[]
        for i,e in ends:
            q=axes[i]; u=q[1-e]-q[e];u/=np.linalg.norm(u);arms.append((i,u,h[i]))
        for i,q in axes.items():
            if i in {a[0] for a in arms}:continue
            L=LineString(q);s=L.project(Point(p))
            if L.distance(Point(p))<eps and eps<s<L.length-eps:through.append(i)
        if through or len(arms)>2:
            kind='X' if len(arms)+2*len(through)>=4 else 'T'
        elif len(arms)==1:kind='FREE'
        else:
            i,u,hu=arms[0];j,v,hv=arms[1];n=np.array([-u[1],u[0]]);m=np.array([-v[1],v[0]]);det=cross(u,v)
            if abs(det)<1e-6:kind='STRAIGHT'
            else:
                sign=np.sign(det);a=p-sign*hu*n;b=p+sign*hv*m;corner=intersect(a,u,b,v)
                # Only allow bounded miters. Very acute joints get a flat bevel.
                points=[p,a,b];kind='L_BEVEL'
                if corner is not None and np.linalg.norm(corner-p)<=2.5*max(hu,hv):points.append(corner);kind='L_MITER'
                patch=MultiPoint(points).convex_hull
                if patch.area>1e-8:patches.append(patch)
        audit.append(dict(point=list(key),walls=[i for i,_ in ends]+through,type=kind))
    geom=unary_union([*bands.values(),*patches]);assert geom.is_valid
    # Every free tip must end on its perpendicular cap; no geometry beyond it nearby.
    for row in audit:
        if row['type']!='FREE':continue
        i=row['walls'][0];p=np.array(row['point']);q=axes[i];other=q[1] if np.linalg.norm(q[0]-p)<eps else q[0];u=(p-other)/np.linalg.norm(p-other);n=np.array([-u[1],u[0]]);half=h[i];
        probes=[Point(p+u*.05+n*half*f) for f in [-.8,0,.8]]
        row['flatCapClear']=not any(geom.covers(z) for z in probes)
    return geom,audit

if __name__=='__main__':
    for angle in [15,30,45,60,90,120,150,165]:
        a=np.radians(angle); rows=[('a',(0,0),(100,0)),('b',(0,0),(100*np.cos(a),100*np.sin(a)))];g,audit=build_walls(rows,{'a':20,'b':10});assert g.is_valid and g.geom_type=='Polygon' and all(x.get('flatCapClear',True) for x in audit)
    for rows in [[('a',(-50,0),(50,0)),('b',(0,0),(0,50))],[('a',(-50,0),(50,0)),('b',(0,-50),(0,50))]]:
        g,audit=build_walls(rows,{'a':20,'b':10});assert g.is_valid and g.geom_type=='Polygon' and all(x.get('flatCapClear',True) for x in audit)
    print('10 synthetic geometries passed (8 angles, T, X)')