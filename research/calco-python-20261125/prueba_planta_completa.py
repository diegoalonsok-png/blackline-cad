#!/usr/bin/env python3
"""Offline reviewed semantic fixture, NOT an automatic recognizer or production importer.
Coordinates are annotations of inspect39.png. The JSON records the native WALL and
BLOCK operations; preview boolean cuts only simulate the CAD's dynamic openings.
Requires shapely, matplotlib, Pillow. No dimension entities unless --cotas.
"""
import argparse, json, math
from pathlib import Path
from PIL import Image
from shapely.geometry import LineString, Point, box
from shapely.ops import unary_union
from shapely import affinity
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Ellipse, Arc, Polygon
P=75.0 # provisional uniform pixels per model unit; NOT calibrated
OX,OY=101,716
T=.20
# axes in raster coords; continuous before openings, no furniture lines.
AXES=[('N',(108,64),(462,64)),('S',(108,710),(462,710)),('W',(108,64),(108,710)),('E',(462,64),(462,710)),('D',(337,64),(337,397)),('B',(337,292),(462,292)),('L',(108,397),(262,397)),('C',(262,353),(262,397)),('H',(414,397),(462,397)),('J',(321,397),(337,397))]
# host, kind, endpoint interval on raster axis, hinge point, inward leaf direction
OPEN=[('N','framed-window',171,275,None,None),('N','framed-window',379,415,None,None),('S','framed-window',171,275,None,None),('S','swing-door',339,396,(396,710),(0,-1)),('D','swing-door',306,358,(337,358),(-1,0)),('B','swing-door',350,400,(350,292),(0,-1))]
# existing block IDs and verified available size ranges; choose variant without stretching.
# Point is the origin of the actual block's local 0..W, 0..D frame. Rotations in CAD degrees.
# Fallback definitions preserve visually distinctive objects when checked variants do not fit.
BLOCKS=[
 ('bed','TEST_BED_SINGLE_NIGHTSTAND_FREE','FURNITURE',(156,251),0,(131/P,159/P),'custom'),
 ('nightstand','dor-mesa-luz','FURNITURE',(122,119),0,(.45,.40),'library'),
 ('closet','TEST_SLIDING_CLOSET','FURNITURE',(115,390),0,(140/P,38/P),'custom'),
 ('bath','san-banera','FIXTURES',(347,130),0,(1.4,.7),'library'),
 ('wc','san-wc','FIXTURES',(454,183),90,(.4,.7),'library'),
 ('basin','san-lav','FIXTURES',(454,260),90,(.6,.48),'library'),
 ('sofa','mob-sofa2','FURNITURE',(181.5,668),90,(2.0,.9),'library'),
 ('coffee','mob-ratona','FURNITURE',(259,642),90,(1.3,.6),'library'),
 ('counter','kq-mesada','KITCHEN',(455,643),90,(3.2,.55),'library'),
 ('hob','kq-anafe4','KITCHEN',(455,486),90,(.6,.6),'library'),
 ('sink','TEST_KITCHEN_SINGLE_SINK','KITCHEN',(452,642),90,(.65,.48),'custom'),
]
TEXT=[('BEDROOM',(222,291)),('BATH',(382,212)),('HALL',(377,373)),('LIVING ROOM / KITCHEN',(282,494))]
def pt(p):return [(p[0]-OX)/P,(OY-p[1])/P]
def pix(p):return (OX+p[0]*P,OY-p[1]*P)
def vec(p):return (p[0],-p[1])
def opening_rows():
    rows=[]; walls={i:(a,b) for i,a,b in AXES}
    for host,kind,lo,hi,hinge,swing in OPEN:
        a,b=walls[host]; horizontal=a[1]==b[1]; axis=0 if horizontal else 1
        A=(lo,a[1]) if horizontal else (a[0],lo);B=(hi,a[1]) if horizontal else (a[0],hi)
        offset=((lo+hi)/2-a[axis])/P; width=(hi-lo)/P
        assert offset-width/2>T/2 and offset+width/2<math.dist(a,b)/P-T/2,host
        row=dict(host=host,kind=kind,offset=offset,width=width,layer='WINDOWS' if hinge is None else 'DOORS')
        if hinge:
            # Native primitive opens towards local +Y. Reverse start and angle when needed.
            q0,q1=pt(A),pt(B); u=((q1[0]-q0[0])/width,(q1[1]-q0[1])/width); n=(-u[1],u[0]); v=vec(swing)
            rev=sum(x*y for x,y in zip(n,v))<0
            start,end=(q1,q0) if rev else (q0,q1)
            h=pt(hinge); mirror=math.dist(h,end)<math.dist(h,start)
            theta=math.degrees(math.atan2(end[1]-start[1],end[0]-start[0]))
            pred=(-math.sin(math.radians(theta)),math.cos(math.radians(theta)))
            assert sum(x*y for x,y in zip(pred,v))>.999
            assert math.dist(end if mirror else start,h)<1e-8
            row['orientation']={'mirror':mirror,'reverseHostDirection':rev,'rotation':theta,'hinge':h,'swingVector':list(v),'insertionPoint':start,'leafCount':1}
        else:row['windowType']='framed; leaf count not reliably identifiable'
        rows.append(row)
    return rows
# Compact preview definitions based on the native catalogue geometry; not a copy of a live CAD instance.
# Primitive coords in metres. Each object is one block definition, never loose model-space primitives.
def shapes(id,w,d):
    R=lambda x,y,W,D,r=0:('r',x,y,W,D,r)
    L=lambda a,b,c,e:('l',a,b,c,e)
    E=lambda x,y,rx,ry:('e',x,y,rx,ry)
    if id.startswith('TEST_BED'):return [R(0,0,w,d),L(0,d*.59,w,d*.59),L(0,d*.78,w,d*.78),R(.07,d*.79,w/2-.1,d*.18,.035),R(w/2+.03,d*.79,w/2-.1,d*.18,.035)]
    if id=='TEST_SLIDING_CLOSET':return [R(0,0,w,d),L(0,d-.06,w*.53,d-.06),L(w*.47,d-.12,w,d-.12)]
    if id=='TEST_KITCHEN_SINGLE_SINK':return [R(0,0,w,d),R(.07,.05,w-.14,d-.1,.10),E(w*.5,d*.30,.025,.025),L(w*.5,.04,w*.5,.12)]
    if id=='dor-mesa-luz':return [R(0,0,w,d),E(w/2,d/2,.088,.088),E(w/2,d/2,.032,.032)]
    if id=='san-banera':return [R(0,0,w,d),R(.08,.08,w-.16,d-.16,.18),E(w-.22,d/2,.035,.035),E(w-.06,d/2,.025,.025)]
    if id=='san-wc':return [R(.03,0,.34,.17,.03),E(.2,.45,.18,.25),E(.2,.47,.12,.18),L(.08,.2,.32,.2)]
    if id=='san-lav':return [R(0,0,w,d),E(w/2,d*.55,min(.21,w*.36),min(.15,d*.32)),E(w/2,d*.55,.02,.02),E(w/2,.07,.022,.022),L(w/2,.07,w/2,.13)]
    if id=='mob-sofa2':return [R(0,0,w,d,.06),R(.15,.2,w-.30,d-.38),L(w/2,.2,w/2,d-.18),R(0,d-.20,w,.20)]
    if id=='mob-ratona':return [R(0,0,w,d),R(.05,.05,w-.10,d-.10)]
    if id=='kq-mesada':return [R(0,0,w,d),L(0,d-.04,w,d-.04)]
    if id=='kq-anafe4':return [R(.03,.05,w-.06,d-.10)]+[E(x,y,r,r) for x,y,r in [(.17,.19,.085),(.17,.43,.07),(.43,.19,.07),(.43,.43,.085),(.17,.19,.0383),(.17,.43,.0315),(.43,.19,.0315),(.43,.43,.0383)]]
    raise ValueError(id)
def transformed_box(w,d,point,rotation):return affinity.translate(affinity.rotate(box(0,0,w,d),rotation,origin=(0,0)),*point)
def wall_shape():
    lines=[LineString([pt(a),pt(b)]) for _,a,b in AXES]
    pieces=[l.buffer(T/2,cap_style=2,join_style=2) for l in lines]
    # Add the missing outer corner square only at true non-collinear axis junctions.
    for i,l in enumerate(lines):
        for other in lines[i+1:]:
            p=l.intersection(other)
            if p.geom_type=='Point' and not p.is_empty:pieces.append(box(p.x-T/2,p.y-T/2,p.x+T/2,p.y+T/2))
    return unary_union(pieces)
def polygon_patch(ax,g,color,alpha):
    for p in ([g] if g.geom_type=='Polygon' else list(g.geoms)):
        ax.add_patch(Polygon(list(p.exterior.coords),closed=True,fc=color,ec=color,lw=.55,alpha=alpha))
        # drawing uses individual non-overlapping rings; restore interior voids in compound path instead
        for r in p.interiors:
            from matplotlib.path import Path as MPath
            from matplotlib.patches import PathPatch
            # parent drawn below via compound path in render instead

def draw_geom(ax,g,color,alpha):
    from matplotlib.path import Path as MPath
    from matplotlib.patches import PathPatch
    from shapely.geometry.polygon import orient
    for p in ([g] if g.geom_type=='Polygon' else list(g.geoms)):
        p=orient(p,sign=1);verts=[];codes=[]
        for ring in [p.exterior,*p.interiors]:
            c=list(ring.coords);verts+=c;codes += [MPath.MOVETO]+[MPath.LINETO]*(len(c)-2)+[MPath.CLOSEPOLY]
        ax.add_patch(PathPatch(MPath(verts,codes),facecolor=color,edgecolor=color,lw=.45,alpha=alpha))
def render(source,plan,out,overlay=False):
    from matplotlib.transforms import Affine2D
    fig,ax=plt.subplots(figsize=(6.8,9.6),dpi=160);fig.patch.set_facecolor('white');ax.set_aspect('equal');ax.axis('off')
    if overlay:
        im=Image.open(source);ax.imshow(im,extent=((0-OX)/P,(im.width-OX)/P,(OY-im.height)/P,OY/P),alpha=.75)
    wall=wall_shape();cuts=[]
    for host,kind,lo,hi,hinge,swing in OPEN:
        a,b=next((a,b) for i,a,b in AXES if i==host);horizontal=a[1]==b[1];A=pt((lo,a[1]) if horizontal else (a[0],lo));B=pt((hi,a[1]) if horizontal else (a[0],hi));cuts.append(LineString([A,B]).buffer(T/2+.002,cap_style=2))
    draw_geom(ax,wall.difference(unary_union(cuts)), '#1d70a2' if overlay else '#263b46',.52 if overlay else 1)
    for row,(host,kind,lo,hi,hinge,swing) in zip(plan['openings'],OPEN):
        a,b=next((a,b) for i,a,b in AXES if i==host);horizontal=a[1]==b[1];A=pt((lo,a[1]) if horizontal else (a[0],lo));B=pt((hi,a[1]) if horizontal else (a[0],hi));c='#168456' if hinge else '#b58020';
        if not hinge:
            for d in [-T*.34,0,T*.34]:
                dx,dy=(0,d) if horizontal else (d,0);ax.plot([A[0]+dx,B[0]+dx],[A[1]+dy,B[1]+dy],color=c,lw=.9)
        else:
            h=pt(hinge);v=vec(swing);r=row['width'];closed=B if math.dist(h,A)<math.dist(h,B) else A;theta0=math.atan2(closed[1]-h[1],closed[0]-h[0]);theta1=math.atan2(v[1],v[0]);delta=(theta1-theta0+math.pi)%(2*math.pi)-math.pi
            ax.plot([h[0],h[0]+r*v[0]],[h[1],h[1]+r*v[1]],color=c,lw=1.5);ang=[theta0+delta*i/24 for i in range(25)];ax.plot([h[0]+r*math.cos(t) for t in ang],[h[1]+r*math.sin(t) for t in ang],color=c,lw=.85)
    for b in plan['blocks']:
        w,d=b['nominalSize'];color='#964d74' if b['source']=='custom' else ('#845c36' if overlay else '#53616a');tr=Affine2D().rotate_deg(b['rotation']).translate(*b['point'])+ax.transData
        for g in shapes(b['catalogId'],w,d):
            typ,*v=g
            if typ=='r':
                x,y,W,D,r=v;patch=FancyBboxPatch((x,y),W,D,boxstyle=f'round,pad=0,rounding_size={r}',fill=False,ec=color,lw=1.0) if r else Rectangle((x,y),W,D,fill=False,ec=color,lw=1.0);patch.set_transform(tr);ax.add_patch(patch)
            elif typ=='l':ax.plot([v[0],v[2]],[v[1],v[3]],color=color,lw=.85,transform=tr)
            else:x,y,rx,ry=v;patch=Ellipse((x,y),2*rx,2*ry,fill=False,ec=color,lw=.85,transform=tr);ax.add_patch(patch)
    if not overlay:
        for label,p in TEXT:ax.text(*pt(p),label,fontsize=8,ha='center',va='center',color='#48545b')
    if plan['dimensions']:
        y=-.32;ax.annotate('',xy=(pt((462,710))[0],y),xytext=(pt((108,710))[0],y),arrowprops={'arrowstyle':'<->'});ax.text(2.45,y-.1,'Referencia provisional',ha='center',fontsize=7)
    ax.set_xlim(-.35,5.25);ax.set_ylim(-.5,9.15);ax.set_title('Prueba 048 · '+('superposición' if overlay else 'reconstrucción semántica'),fontsize=12,color='#263b46',pad=9);fig.subplots_adjust(left=.03,right=.97,bottom=.025,top=.95);fig.savefig(out,bbox_inches='tight',pad_inches=.13);plt.close(fig)
def main():
    p=argparse.ArgumentParser();p.add_argument('--source',default='inspect39.png');p.add_argument('--out',default='planta_completa_048');p.add_argument('--cotas',action='store_true');a=p.parse_args();out=Path(a.out)
    walls=[dict(id=i,a=pt(x),b=pt(y),thickness=T,layer='WALLS',join='native') for i,x,y in AXES];openings=opening_rows();blocks=[];custom={}
    for role,id,layer,point,rotation,size,source in BLOCKS:
        geom=transformed_box(*size,pt(point),rotation);minx,miny,maxx,maxy=geom.bounds
        blocks.append(dict(role=role,catalogId=id,layer=layer,point=pt(point),rotation=rotation,scale=1,nominalSize=list(size),envelope=[minx,miny,maxx-minx,maxy-miny],source=source))
        if source=='custom':custom[id]={'layer':'0','primitives':shapes(id,*size),'operation':'DRAW_THEN_BLOCK','insertionPoint':[0,0]}
    # This is a semantic offline fixture; additions require adapter support in the published engine.
    plan=dict(schema='blackline.architecture.v1',units='m',walls=walls,openings=openings,blocks=blocks,rooms=[],virtualDimensions=[],brief={'kind':'trace_offline_reviewed'},status='approximate',scale={'status':'provisional','pixelsPerUnit':P,'finalCalibrationRequired':True,'uniform':True},customBlockDefinitions=custom,texts=[{'text':label,'point':pt(p),'layer':'TEXTS'} for label,p in TEXT],dimensions=([{'kind':'reference','status':'provisional'}] if a.cotas else []),review={'source':'Reference 048, manual visual annotations','automaticRecognition':False,'nativeInsertionTested':False,'unconfirmed':['plain cabinet above cooktop: refrigerator not identified','window leaf count','source printed dimensions 4 x 8 m inconsistent with raster aspect ratio']})
    # Validation: connected wall union, unique block IDs per role, all openings on a host,
    # no exploded model-space furniture, exact door direction and hinge, no default dimensions.
    assert wall_shape().geom_type=='Polygon';assert len({b['role'] for b in blocks})==len(blocks);assert len(walls)==10;assert len(openings)==6;assert len([o for o in openings if 'orientation' in o])==3;assert bool(plan['dimensions'])==a.cotas
    byrole={b['role']:b for b in blocks}
    footprint=lambda b: transformed_box(*b['nominalSize'],b['point'],b['rotation'])
    assert footprint(byrole['sofa']).intersection(footprint(byrole['coffee'])).area<1e-8
    report={'walls':len(walls),'wall_components':1,'doors':3,'windows':3,'library_refs':sum(b['source']=='library' for b in blocks),'custom_refs':sum(b['source']=='custom' for b in blocks),'texts':len(TEXT),'dimensions':len(plan['dimensions']),'door_orientation_checks':3,'native_import':'not tested; adapter needed for door orientations, custom definitions and texts'}
    out.with_suffix('.json').write_text(json.dumps(plan,indent=2,ensure_ascii=False));out.with_suffix('.report.json').write_text(json.dumps(report,indent=2));render(a.source,plan,out.with_suffix('.png'));render(a.source,plan,out.with_suffix('.overlay.png'),True);print(json.dumps(report))
if __name__=='__main__':main()