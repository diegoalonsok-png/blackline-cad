"""Fetch explicitly CC0 architectural drawings; preserve DXF and render PNG previews.
No arbitrary Pinterest/Google copying. Source permissions checked before adding seeds."""
import hashlib, json, pathlib, urllib.request
import ezdxf
from ezdxf.addons.drawing import Frontend, RenderContext
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
ROOT=pathlib.Path("assets/architecture-references")
SEEDS=[
 ("house-100-innerscene","Vivienda 100 m² · cuatro dormitorios",100,"house","four-bedroom-house-ground-floor-100-m2-ce86071a","https://files.innerscene.com/library/four-bedroom-house-ground-floor-100-m2-ce86071a/0aa69b4a6c4a2712ffd2/four-bedroom-house-ground-floor-100-m2.dxf"),
 ("house-modern-innerscene","Vivienda moderna · dos plantas 14 × 10 m",None,"house","modern-house-14-x-10-m-ground-and-first-floor-plans-1-100-3a2ca76f","https://files.innerscene.com/library/modern-house-14-x-10-m-ground-and-first-floor-plans-1-100-3a2ca76f/be6be9d922a8883733c0/modern-house-14-x-10-m-ground-and-first-floor-plans-1-100.dxf"),
]
ROOT.mkdir(parents=True,exist_ok=True)
index=ROOT/"index.json"
rows=json.loads(index.read_text()) if index.exists() else []
byid={x["id"]:x for x in rows}
for ident,title,area,category,slug,url in SEEDS:
 try:
  source="https://www.innerscene.com/tools/library/drawings/"+slug
  req=urllib.request.Request(url,headers={"User-Agent":"BlacklineCADReferenceLibrary/1.0"})
  with urllib.request.urlopen(req,timeout=30) as r:
   data=r.read(10_000_001)
  if len(data)>10_000_000 or len(data)<100: raise ValueError("unexpected size")
  folder=ROOT/category/(str(area) if area is not None else "unverified")
  folder.mkdir(parents=True,exist_ok=True)
  dxf=folder/(ident+".dxf"); png=folder/(ident+".png"); thumb=folder/(ident+"-thumb.png")
  tmp=folder/(ident+".tmp.dxf");tmp.write_bytes(data)
  try:
   doc=ezdxf.readfile(tmp)
   if not len(doc.modelspace()): raise ValueError("empty DXF")
   fig=plt.figure(figsize=(10,8),facecolor="white");ax=fig.add_axes([0.02,0.02,.96,.96])
   try:
    Frontend(RenderContext(doc),MatplotlibBackend(ax)).draw_layout(doc.modelspace(),finalize=True)
    ax.set_axis_off()
    fig.savefig(png,dpi=170,bbox_inches="tight",facecolor="white")
    fig.savefig(thumb,dpi=55,bbox_inches="tight",facecolor="white")
   finally: plt.close(fig)
   tmp.replace(dxf)
  finally: tmp.unlink(missing_ok=True)
  byid[ident]={"id":ident,"title":title,"area":area,"category":category,"source":source,"license":"CC0","author":"Innerscene","original":str(dxf.relative_to(ROOT)),"image":str(png.relative_to(ROOT)),"thumb":str(thumb.relative_to(ROOT)),"sha256":hashlib.sha256(data).hexdigest()}
  print("verified",ident)
 except Exception as e: print("failed",ident,str(e))
index.write_text(json.dumps(list(byid.values()),ensure_ascii=False,indent=2)+"\n")
if not byid: raise SystemExit("No verified external references could be archived")
