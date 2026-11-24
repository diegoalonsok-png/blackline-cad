"""CAD2D3D architecture solver. Metres in, editable semantic drawing plan out.

No full-room blocks, external dependencies, network requests or CAD UI state.
The CAD adapter is responsible for native walls, hosted openings and block references.
"""
import json
import math
import sys
from dataclasses import dataclass

# Verified IDs and nominal envelopes from assets/cad2d-arq-generators.js.
# Envelope is for layout only; CAD uses the original individual block at scale 1.
CATALOG = {
    "toilet": ("san-wc", .40, .70),
    "bidet": ("san-bidet", .38, .58),
    "basin": ("san-lav", .60, .48),
    "shower": ("san-ducha", .90, .90),
    "bathtub": ("san-banera", 1.70, .75),
    "bed": ("dor-queen", 2.60, 2.00),
    "wardrobe": ("mob-placard", 1.80, .62),
    "sink": ("kq-bacha", .80, .60),
    "range": ("kq-cocina", .60, .62),
    "fridge": ("kq-heladera", .70, .70),
    "island": ("kq-isla", 2.00, .95),
    "sofa": ("mob-sofa3", 2.30, .92),
    "table6": ("mob-mesa6", 1.80, 1.90),
}
DEFAULTS = {
    "bathroom": ["toilet", "bidet", "basin", "shower"],
    "bedroom": ["bed", "wardrobe"],
    "kitchen": ["sink", "range", "fridge"],
    "living": ["sofa", "table6"],
}
@dataclass(frozen=True)
class Rect:
    x: float
    y: float
    w: float
    d: float
    def overlaps(self, b, gap=0):
        return (self.x < b.x+b.w+gap-1e-8 and b.x < self.x+self.w+gap-1e-8
                and self.y < b.y+b.d+gap-1e-8 and b.y < self.y+self.d+gap-1e-8)
    def inside(self, w, d):
        return self.x >= -1e-8 and self.y >= -1e-8 and self.x+self.w <= w+1e-8 and self.y+self.d <= d+1e-8

def candidates(kind, w, d):
    _, a, b = CATALOG[kind]
    # Candidate positions are computed from actual dimensions; rotate only in 90 degree steps.
    # Prefer wall-adjacent positions; island only in interior, with reserved clear perimeter.
    for rot, fw, fd in ((0,a,b),(90,b,a),(180,a,b),(270,b,a)):
        if kind == "island" and rot >= 180:
            continue
        if fw > w or fd > d:
            continue
        if kind == "island":
            r = Rect((w-fw)/2,(d-fd)/2,fw,fd)
            if Rect(r.x-.9,r.y-.9,fw+1.8,fd+1.8).inside(w,d):
                yield rot,r
            continue
        # Face toward interior: local +Y is the accessible front for these candidates.
        if rot in (0,180):
            y = 0 if rot == 0 else d-fd
            edge = w-fw
            for j in range(math.ceil(edge/.10)+1):
                yield rot,Rect(min(edge,j*.10),y,fw,fd)
        else:
            x = w-fw if rot == 90 else 0
            edge = d-fd
            for j in range(math.ceil(edge/.10)+1):
                yield rot,Rect(x,min(edge,j*.10),fw,fd)

def clearance(kind,rot,r):
    if kind == "island":
        return Rect(r.x-.9,r.y-.9,r.w+1.8,r.d+1.8)
    # Conceptual access allowance; not a building-code or accessibility certification.
    a = .60 if kind in ("toilet","bidet","basin","shower","bathtub") else .75
    return (Rect(r.x,r.y,r.w,r.d+a) if rot==0 else
            Rect(r.x-a,r.y,r.w+a,r.d) if rot==90 else
            Rect(r.x,r.y-a,r.w,r.d+a) if rot==180 else
            Rect(r.x,r.y,r.w+a,r.d))

def arrange(w,d,fixtures,door):
    protected = Rect((w-door)/2,0,door,door)  # full conservative door swing envelope
    order = sorted(fixtures,key=lambda key: CATALOG[key][1]*CATALOG[key][2],reverse=True)
    result=[]
    nodes=0
    def search(i):
        nonlocal nodes
        if i==len(order): return True
        kind=order[i]
        for rot,r in candidates(kind,w,d):
            nodes+=1
            if nodes>50000: return False
            access=clearance(kind,rot,r)
            if not access.inside(w,d) or r.overlaps(protected,.02): continue
            if any(r.overlaps(old,.02) or r.overlaps(a,.02) or access.overlaps(old,.02)
                   for _,_,old,a in result): continue
            result.append((kind,rot,r,access))
            if search(i+1): return True
            result.pop()
        return False
    if not search(0):
        raise ValueError("No feasible layout under current envelope/clearance constraints; enlarge room or change equipment.")
    return result

def solve(spec):
    """Structured brief: kind, width, depth, count, wall, door, window, fixtures.
    Rectangular identical rooms in a row; dimensions are clear internal dimensions.
    """
    kind=spec["kind"]
    if kind not in DEFAULTS: raise ValueError("Unsupported room kind")
    w,d,t,door,window=map(float,(spec["width"],spec["depth"],spec.get("wall",.15),spec.get("door",.80),spec.get("window",1.20)))
    n=spec.get("count",1)
    if type(n) is not int or not 1<=n<=30 or not (1.2<=w<=20 and 1.2<=d<=20 and .08<=t<=.5 and .60<=door<=min(1.2,w-.3) and 0<=window<=w-.3):
        raise ValueError("Invalid room, opening or wall dimensions")
    fixtures=spec.get("fixtures",DEFAULTS[kind])
    if not isinstance(fixtures,list) or len(fixtures)>12 or any(f not in CATALOG for f in fixtures):
        raise ValueError("Unsupported fixtures")
    layout=arrange(w,d,fixtures,door)
    plan={"schema":"blackline.architecture.v1","units":"m","walls":[],"openings":[],"blocks":[],"virtualDimensions":[],"rooms":[]}
    def wall(id,a,b):
        plan["walls"].append({"id":id,"a":a,"b":b,"thickness":t,"layer":"WALLS","join":"native"})
    step=w+t
    for i in range(n+1):
        x=t/2+i*step
        wall("side"+str(i),[x,t/2],[x,d+1.5*t])
    for i in range(n):
        x=t+i*step
        front,back="front"+str(i),"back"+str(i)
        wall(front,[x-t/2,t/2],[x+w+t/2,t/2])
        wall(back,[x-t/2,d+1.5*t],[x+w+t/2,d+1.5*t])
        plan["rooms"].append({"id":"room"+str(i),"kind":kind,"clearBounds":[x,t,w,d]})
        for host,typ,span in [(front,"swing-door",door),(back,"framed-window",window)]:
            if span: plan["openings"].append({"host":host,"kind":typ,"offset":step/2,"width":span,"layer":"OPENINGS"})
        for key,rot,r,access in layout:
            block_id,bw,bd=CATALOG[key]
            # Local origin correction for rotated positive-quadrant block geometry.
            ox,oy={0:(0,0),90:(r.w,0),180:(r.w,r.d),270:(0,r.d)}[rot]
            plan["blocks"].append({"catalogId":block_id,"role":key,"point":[x+r.x+ox,t+r.y+oy],
                 "rotation":rot,"scale":1,"layer":"FIXTURES" if kind in ("bathroom","kitchen") else "FURNITURE",
                 "envelope":[x+r.x,t+r.y,r.w,r.d],"nominalSize":[bw,bd]})
        plan["virtualDimensions"].extend([{"room":"room"+str(i),"axis":"width","value":w,"between":["side"+str(i),"side"+str(i+1)],"editable":True},
              {"room":"room"+str(i),"axis":"depth","value":d,"between":[front,back],"editable":True}])
    return plan

def selftest():
    for kind,w,d,n in [("bedroom",4,5,3),("bathroom",2,2.4,1),("kitchen",4,5,1),("living",5,8,1)]:
        p=solve(dict(kind=kind,width=w,depth=d,count=n))
        assert len(p["walls"])==3*n+1 and len(p["openings"])==2*n
        assert len(p["blocks"])==n*len(DEFAULTS[kind])
        assert all(b["scale"]==1 for b in p["blocks"])
        assert len({a["id"] for a in p["walls"]})==len(p["walls"])
        rects=[Rect(*b["envelope"]) for b in p["blocks"]]
        assert not any(a.overlaps(b) for i,a in enumerate(rects) for b in rects[i+1:])
    assert solve(dict(kind="kitchen",width=5,depth=5,fixtures=["sink","range","fridge","island"]))["blocks"]
    try: solve(dict(kind="bathroom",width=1.2,depth=1.2))
    except ValueError: pass
    else: raise AssertionError("Impossible bathroom should fail")
    print("Architecture solver: all checks passed")

if __name__=="__main__":
    if "--selftest" in sys.argv: selftest()
    else: print(json.dumps(solve(json.load(sys.stdin)),ensure_ascii=False))
