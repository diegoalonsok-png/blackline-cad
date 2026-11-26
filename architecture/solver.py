"""CAD2D3D architecture solver. Metres in, editable semantic drawing plan out.

No full-room blocks, external dependencies, network requests or CAD UI state.
The CAD adapter is responsible for native walls, hosted openings and block references.
"""
import json
import math
import re
import random
import unicodedata
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

def arrange(w,d,fixtures,door,extra_protected=(),seed=0):
    protected = Rect((w-door)/2,0,door,door)  # full conservative door swing envelope
    order = sorted(fixtures,key=lambda key: CATALOG[key][1]*CATALOG[key][2],reverse=True)
    result=[]
    nodes=0
    rng=random.Random(seed)
    options={key:list(candidates(key,w,d)) for key in set(order)}
    if seed:
        for key in sorted(options): rng.shuffle(options[key])
    def search(i):
        nonlocal nodes
        if i==len(order): return True
        kind=order[i]
        for rot,r in options[kind]:
            nodes+=1
            if nodes>50000: return False
            access=clearance(kind,rot,r)
            if not access.inside(w,d) or r.overlaps(protected,.02) or any(r.overlaps(zone,.02) for zone in extra_protected): continue
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
    layout=arrange(w,d,fixtures,door,seed=spec.get('seed',0))
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

def interpret(text):
    """Local multilingual fallback. A future LLM may supply the same structured brief."""
    s = "".join(ch for ch in unicodedata.normalize("NFD", text.lower())
                if unicodedata.category(ch) != "Mn")
    kinds = {
        "bedroom": r"\b(?:habitacion(?:es)?|dormitorios?|bedrooms?|chambres?|schlafzimmer|quartos?|camer[ae])\b",
        "bathroom": r"\b(?:banos?|bathrooms?|baths?|salle[s]? de bain[s]?|badezimmer|banheiros?|bagni|bagno)\b",
        "kitchen": r"\b(?:cocinas?|kitchens?|cuisines?|kuchen|cozinhas?|cucine?|cucina)\b",
        "living": r"\b(?:livings?|salones?|salas? de estar|living rooms?|salons?|wohnzimmer|salas? de estar|soggiorni?|soggiorno)\b",
    }
    words = dict(zip(("un","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez"),range(1,11)))
    words.update(zip(("one","two","three","four","five","six","seven","eight","nine","ten"),range(1,11)))
    words.update({"una":1,"uno":1,"a":1,"an":1,"une":1,"deux":2,"trois":3,"ein":1,"eine":1,"zwei":2,"drei":3,"um":1,"uma":1,"dois":2,"duas":2,"tres":3,"due":2,"tre":3})
    hits=sorted((m.start(),m.end(),kind) for kind,pattern in kinds.items() for m in re.finditer(pattern,s))
    if not hits: raise ValueError("No supported room type found; specify bedroom, bathroom, kitchen or living room.")
    _,end,kind=hits[0]
    numword=r"(?:\d+|"+"|".join(words)+r")"
    count=re.search(r"\b("+numword+r")\s+"+kinds[kind],s)
    n=words.get(count[1],int(count[1]) if count[1].isdigit() else 1) if count else 1
    bath=next((h for h in hits[1:] if h[2]=="bathroom"),None)
    suite=kind=="bedroom" and (bath is not None or bool(re.search(r"\b(?:ensuite|en suite|en-suite)\b",s)))
    if any(h[2]!=kind and not(suite and h[2]=="bathroom") for h in hits[1:]):
        raise ValueError("Mixed-room floor plans are not supported by the local fallback yet.")
    if suite and n>1 and not re.search(r"\b(?:cada|each|privad[oa]s?|ensuite|en suite|en-suite|chacune?|jeweils|cada um|ciascun[ao])\b",s):
        raise ValueError("Specify whether the bathroom belongs to each bedroom or is shared.")
    if n>1 and not re.search(r"\b(?:pegad[oa]s?|contigu[oa]s?|tandem|fila|al lado|side by side|adjoining|in a row|adjacent|cote a cote|nebeneinander|lado a lado|affiancate)\b",s):
        raise ValueError("Specify the arrangement of the rooms (row or side by side).")
    if re.search(r"\b(?:vestidor|balcon|balcony|pasillo|corridor|dos plantas|two floors)\b",s):
        raise ValueError("Additional requested elements are not supported by the local fallback.")
    number=r"(\d+(?:[.,]\d+)?)"
    dim=number+r"\s*(?:m\b|ft\b|cm\b)?\s*(?:x|×|por|by|par|mal|per)\s*"+number+r"\s*(m\b|ft\b|cm\b)?"
    def size(m):
        if not m:return None
        unit=m[3] or ("ft" if re.search(r"\bft\b",m[0]) else "cm" if re.search(r"\bcm\b",m[0]) else "m")
        scale={"ft":.3048,"cm":.01,"m":1}[unit]
        return float(m[1].replace(",","."))*scale,float(m[2].replace(",","."))*scale
    t=re.search(r"(?:muros?|walls?|murs?|wande|paredes?|muri)\s+(?:de\s+|of\s+)?"+number+r"\s*(cm|mm|m\b)?",s)
    wall=float(t[1].replace(",","."))/(100 if t[2]=="cm" else 1000 if t[2]=="mm" else 1) if t else .15
    default_size={"bedroom":(4.,5.),"bathroom":(2.2,2.6),"kitchen":(4.,5.),"living":(5.,6.)}
    maintext=s[:bath[0]] if suite and bath else s
    m=re.search(dim,maintext)
    width,depth=size(m) or default_size[kind]
    assumptions=[]
    if not m: assumptions.append(f"{kind}: {width} x {depth} m")
    if not t: assumptions.append("wall: 0.15 m")
    def opening(pattern,default):
        match=re.search(pattern+r"\s*(?:de\s+|of\s+)?"+number+r"\s*(cm\b|mm\b|mts?\b|metros?\b|m\b|ft\b)?",s)
        if not match: return default,False
        value=float(match[1].replace(",","."))
        unit=match[2]
        return value*({"cm":.01,"mm":.001,"ft":.3048}.get(unit,1)),True
    door,door_given=opening(r"\b(?:puertas?|doors?)",.80)
    window,window_given=opening(r"\b(?:ventanas?|windows?)",1.20)
    if not door_given: assumptions.append("door: 0.80 m")
    if not window_given: assumptions.append("window: 1.20 m")
    bathtub=bool(re.search(r"\b(?:banadera|banera|bathtub|bath tub|tub|baignoire|badewanne|banheira|vasca)\b",s))
    shower=bool(re.search(r"\b(?:ducha|shower|douche|dusche|chuveiro|doccia)\b",s))
    bath_fixtures=["toilet","bidet","basin"]+(["bathtub"] if bathtub else [])+(["shower"] if shower or not bathtub else [])
    spec={"kind":kind,"count":n,"width":width,"depth":depth,"wall":wall,"door":door,"window":window,"assumptions":assumptions}
    if suite:
        if door!=.8 or window!=1.2: raise ValueError("Custom suite openings are not supported yet.")
        bm=re.search(dim,s[bath[0]:]) if bath else None
        bw,bd=size(bm) or (width,2.4)
        if not bm: assumptions.append(f"bathroom: {bw} x {bd} m")
        spec.update(kind="suite_row",bathWidth=bw,bathDepth=bd,bathFixtures=bath_fixtures)
    elif kind=="bathroom": spec["fixtures"]=bath_fixtures
    elif kind=="kitchen" and re.search(r"\b(?:isla|island|ilot|insel|ilha|isola)\b",s):
        spec["fixtures"]=DEFAULTS["kitchen"]+["island"]
    return spec

def solve_suite_row(spec):
    """Attach one private bathroom behind each bedroom, sharing the partition."""
    w,d,bw,bd,t=map(float,(spec["width"],spec["depth"],spec.get("bathWidth",spec["width"]),
                        spec.get("bathDepth",2.4),spec.get("wall",.15)))
    n=spec["count"]
    if not math.isclose(w,bw,abs_tol=1e-8):
        raise ValueError("This version requires bathroom width equal to bedroom width; no silent resizing.")
    if w<3.6:
        raise ValueError("Bedroom width must be at least 3.60 m for this entrance and window arrangement.")
    # Reuse the dimensional validation, not a pre-drawn room.
    front=solve(dict(kind="bedroom",width=w,depth=d,wall=t,count=n,fixtures=[]))
    rear=solve(dict(kind="bathroom",width=bw,depth=bd,wall=t,count=n,fixtures=spec.get("bathFixtures",DEFAULTS["bathroom"])))
    bedrooms=arrange(w,d,DEFAULTS["bedroom"],.8,extra_protected=(Rect((w-.8)/2,d-.8,.8,.8),))
    plan=front
    plan["assumptions"]=spec.get("assumptions",[])
    plan["connections"]=[]
    dy=d+t
    # Side wall centreline continues through the bathroom: one shared wall per pair of suites.
    for a in plan["walls"]:
        if a["id"].startswith("side"): a["b"][1]+=bd+t
    for a in rear["walls"]:
        if a["id"].startswith("back"):
            plan["walls"].append({**a,"id":"bath-"+a["id"],
                                  "a":[a["a"][0],a["a"][1]+dy],"b":[a["b"][0],a["b"][1]+dy]})
    # Replace rear bedroom window with the private connecting door.
    for a in plan["openings"]:
        if a["host"].startswith("back"):
            a.update(kind="swing-door",width=.8,connects=["room"+a["host"][4:],"bath-room"+a["host"][4:]])
    for i in range(n):
        plan["openings"].append({"host":"front"+str(i),"kind":"framed-window","offset":(w+t)/2-.8/2-1.2/2-.2,"width":1.2,"layer":"OPENINGS"})
        plan["connections"].append({"from":"room"+str(i),"to":"bath-room"+str(i),"via":"back"+str(i),"private":True})
        x=t+i*(w+t)
        for key,rot,r,_ in bedrooms:
            block_id,b1,b2=CATALOG[key]
            ox,oy={0:(0,0),90:(r.w,0),180:(r.w,r.d),270:(0,r.d)}[rot]
            plan["blocks"].append({"catalogId":block_id,"role":key,"point":[x+r.x+ox,t+r.y+oy],
                "rotation":rot,"scale":1,"layer":"FURNITURE","envelope":[x+r.x,t+r.y,r.w,r.d],"nominalSize":[b1,b2]})
    for a in rear["openings"]:
        if a["host"].startswith("back"): plan["openings"].append({**a,"host":"bath-"+a["host"]})
    for a in rear["rooms"]:
        x,y,w0,d0=a["clearBounds"]
        plan["rooms"].append({**a,"id":"bath-"+a["id"],"clearBounds":[x,y+dy,w0,d0],"privateTo":a["id"]})
    for a in rear["blocks"]:
        x,y=a["point"];ex,ey,ew,ed=a["envelope"]
        plan["blocks"].append({**a,"point":[x,y+dy],"envelope":[ex,ey+dy,ew,ed]})
    for a in rear["virtualDimensions"]:
        plan["virtualDimensions"].append({**a,"room":"bath-"+a["room"],
            "between":[("bath-"+b if b.startswith("back") else b.replace("front","back",1) if b.startswith("front") else b) for b in a["between"]]})
    return plan

def solve_variants(spec,amount):
    """Generate independent alternatives in a spaced drawing grid; no copied room blocks."""
    if type(amount) is not int or not 1<=amount<=20:
        raise ValueError("Choose 1–20 alternatives per request.")
    if spec["kind"]=="suite_row" or spec.get("count",1)!=1:
        raise ValueError("Alternative generation currently supports one individual room at a time.")
    result={"schema":"blackline.architecture.v1","units":"m","walls":[],"openings":[],"blocks":[],
            "virtualDimensions":[],"rooms":[],"variants":[]}
    w,d,t=spec["width"],spec["depth"],spec["wall"]
    cols=math.ceil(math.sqrt(amount))
    seen=set()
    for seed in range(amount*5):
        try: plan=solve({**spec,"seed":seed})
        except ValueError: continue
        # Reject duplicates and tiny shifts: use 30 cm positional bins and rotation.
        signature=tuple(sorted((b["role"],b["rotation"],round(b["envelope"][0]/.3),round(b["envelope"][1]/.3)) for b in plan["blocks"]))
        if signature in seen: continue
        seen.add(signature)
        i=len(result["variants"])
        prefix=f"variant{i+1}-"
        dx=(i%cols)*(w+2*t+1.5)
        dy=(i//cols)*(d+2*t+1.5)
        for a in plan["walls"]:
            result["walls"].append({**a,"id":prefix+a["id"],"a":[a["a"][0]+dx,a["a"][1]+dy],"b":[a["b"][0]+dx,a["b"][1]+dy]})
        for a in plan["openings"]:
            result["openings"].append({**a,"host":prefix+a["host"]})
        for a in plan["blocks"]:
            x,y=a["point"];ex,ey,ew,ed=a["envelope"]
            result["blocks"].append({**a,"point":[x+dx,y+dy],"envelope":[ex+dx,ey+dy,ew,ed]})
        for a in plan["rooms"]:
            x,y,rw,rd=a["clearBounds"]
            result["rooms"].append({**a,"id":prefix+a["id"],"clearBounds":[x+dx,y+dy,rw,rd]})
        for a in plan["virtualDimensions"]:
            result["virtualDimensions"].append({**a,"room":prefix+a["room"],"between":[prefix+b for b in a["between"]]})
        result["variants"].append({"id":prefix[:-1],"room":prefix+"room0","number":i+1})
        if len(result["variants"])==amount: break
    if not result["variants"]: raise ValueError("No feasible layout found.")
    result["assumptions"]=list(spec.get("assumptions",[]))+[f"{len(result['variants'])}/{amount} distinct alternatives found; each preserves clear dimensions and fixture sizes."]
    result["brief"]={**spec,"alternatives":amount}
    return result

def solve_instruction(text):
    s="".join(ch for ch in unicodedata.normalize("NFD",text.lower()) if unicodedata.category(ch)!="Mn")
    m=re.search(r"\b(\d+)\s+(?:versiones?|variantes?|alternativas?|versions?|variants?|alternatives?)\s+(?:de\s+|of\s+)?",s)
    amount=int(m[1]) if m else None
    brief_text=(s[:m.start()]+s[m.end():]) if m else text
    spec=interpret(brief_text)
    if amount is not None: return solve_variants(spec,amount)
    plan=solve_suite_row(spec) if spec['kind']=='suite_row' else solve(spec)
    plan['assumptions']=spec['assumptions']
    plan['brief']=spec
    return plan

def compile_semantic_brief(raw):
    """Validate model output before drawing; never execute model-generated code."""
    if not isinstance(raw,dict): raise ValueError("Invalid architectural brief")
    allowed={"kind","count","alternatives","width","depth","wall","door","window","bathWidth","bathDepth","fixtures","bathFixtures","assumptions","unsupported","seed"}
    if set(raw)-allowed: raise ValueError("Unknown brief fields")
    if raw.get("unsupported") or raw.get("kind")=="unsupported":
        raise ValueError("Requisitos aún no soportados: "+", ".join(map(str,raw.get("unsupported",[]))))
    spec={k:v for k,v in raw.items() if v is not None and k!="unsupported"}
    kind=spec.get("kind")
    if kind not in (*DEFAULTS,"suite_row"): raise ValueError("Unsupported room type")
    defaults={"bedroom":(4.,5.),"suite_row":(4.,5.),"bathroom":(2.2,2.6),"kitchen":(4.,5.),"living":(5.,6.)}
    assumptions=list(spec.get("assumptions",[]))
    for k,v in zip(("width","depth","wall","door","window"),(*defaults[kind],.15,.8,1.2)):
        if k not in spec:
            spec[k]=v;assumptions.append(f"{k}: {v:g} m (default)")
        if type(spec[k]) not in (int,float) or not math.isfinite(spec[k]): raise ValueError("Invalid dimension: "+k)
    spec["count"]=spec.get("count",1)
    spec["assumptions"]=assumptions
    for k in ("fixtures","bathFixtures"):
        if k in spec and (not isinstance(spec[k],list) or len(spec[k])>12 or any(not isinstance(x,str) or x not in CATALOG for x in spec[k])):
            raise ValueError("Invalid fixture selection")
    alternatives=spec.pop("alternatives",1)
    if type(alternatives) is not int or not 1<=alternatives<=20: raise ValueError("Choose 1–20 variants")
    if kind=="suite_row":
        if spec["door"]!=.8 or spec["window"]!=1.2 or "fixtures" in spec: raise ValueError("Custom suite openings or bedroom fixtures are not supported yet")
        for k,v in (("bathWidth",spec["width"]),("bathDepth",2.4)):
            if k not in spec: spec[k]=v;assumptions.append(f"{k}: {v:g} m (default)")
        if alternatives!=1: raise ValueError("Suite alternatives are not supported yet")
        plan=solve_suite_row(spec)
    elif alternatives>1:
        return solve_variants(spec,alternatives)
    else: plan=solve(spec)
    plan["brief"]=spec
    plan["assumptions"]=assumptions
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
    for instruction in ("Necesito 3 habitaciones pegadas una al lado de la otra cada una con su baño con bañadera",
                        "Three bedrooms side by side each with a private bathroom with bathtub"):
        p=solve_instruction(instruction)
        assert len(p["rooms"])==6 and len(p["connections"])==3
        assert sum(a["role"]=="bathtub" for a in p["blocks"])==3
        assert sum(a["kind"]=="swing-door" for a in p["openings"])==6
        assert sum(a["kind"]=="framed-window" for a in p["openings"])==6
        assert len(p["walls"])==13 and len(p["virtualDimensions"])==12
        assert all(a["scale"]==1 for a in p["blocks"])
        assert all(a["host"] in {w["id"] for w in p["walls"]} for a in p["openings"])
        for wall in p["walls"]:
            length=math.dist(wall["a"],wall["b"])
            intervals=sorted((a["offset"]-a["width"]/2,a["offset"]+a["width"]/2) for a in p["openings"] if a["host"]==wall["id"])
            assert all(lo>=wall["thickness"]/2-1e-8 and hi<=length-wall["thickness"]/2+1e-8 for lo,hi in intervals)
            assert all(a[1]<=b[0] for a,b in zip(intervals,intervals[1:]))
        rects=[Rect(*a["envelope"]) for a in p["blocks"]]
        assert not any(a.overlaps(b) for i,a in enumerate(rects) for b in rects[i+1:])
    for instruction in ("Una habitación 4x5 con baño", "A bedroom 4 x 5 with bathroom",
                        "Une chambre 4 x 5 avec salle de bain", "Ein Schlafzimmer 4 x 5 mit Badezimmer",
                        "Um quarto 4 x 5 com banheiro", "Una camera 4 x 5 con bagno"):
        spec=interpret(instruction)
        assert spec["kind"]=="suite_row" and spec["count"]==1 and spec["width"]==4 and spec["depth"]==5
    assert interpret("Cocina 5 x 5 con isla")["fixtures"][-1]=="island"
    assert interpret("Bathroom 2.5 x 3 with bathtub")["fixtures"][-1]=="bathtub"
    assert interpret("Bedroom 13 x 16 ft")["width"]==13*.3048
    variants=solve_instruction("5 versiones de habitaciones de 5 x 4")
    assert len(variants["variants"])==5 and len(variants["rooms"])==5
    assert len({a["id"] for a in variants["walls"]})==len(variants["walls"])
    assert all(a["scale"]==1 for a in variants["blocks"])
    assert all(a["clearBounds"][2:]==[5.,4.] for a in variants["rooms"])
    p=solve_instruction("habitacion de 4x 5 mts con cama + ventana de 2 mts y una puerta de 90 cm l acama doble y placad")
    assert p["rooms"][0]["clearBounds"][2:]==[4.,5.]
    assert {a["kind"]:a["width"] for a in p["openings"]}=={"swing-door":.9,"framed-window":2.}
    assert {b["role"] for b in p["blocks"]}=={"bed","wardrobe"}
    p=compile_semantic_brief(dict(kind="bedroom",width=4,depth=5,door=.9,window=2,fixtures=["bed","wardrobe"]))
    assert {a["kind"]:a["width"] for a in p["openings"]}=={"swing-door":.9,"framed-window":2.}
    assert len(p["blocks"])==2
    print("Architecture solver: all checks passed")

if __name__=="__main__":
    if "--selftest" in sys.argv: selftest()
    elif "--text" in sys.argv: print(json.dumps(solve_instruction(sys.stdin.read()),ensure_ascii=False))
    else:
        spec=json.load(sys.stdin)
        print(json.dumps(solve_suite_row(spec) if spec.get("kind")=="suite_row" else solve(spec),ensure_ascii=False))
