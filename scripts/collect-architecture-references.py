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
# Reviewed Wikimedia Commons raster references. Preserve original bytes and a
# small, separately generated preview; do not claim unverified floor areas.
from urllib.parse import urlencode, quote, urlparse
from html import unescape
import re, io
from PIL import Image, ImageOps

RASTER_SEEDS=[
 ("commons-bungalow-01","Bungalow · dos dormitorios","Floor plan01.jpg"),
 ("commons-bungalow-02","Bungalow · dos dormitorios, variante","2 bhk Bungalow floor plan.jpg"),
 ("commons-fitzgerald","Casa Fitzgerald · planta baja","GROUND FLOOR PLAN - FITZGERALD HOUSE.jpg"),
 ("commons-same-house","SAME House · planta primera","Clifford O, Reid Architect SAME House Design 2011 19.jpg"),
 ("commons-radlett","Casa en Radlett · planta baja","House at Radlett (ground floor plan).jpg"),
 ("commons-geldart-bungalow","Bungalow de Ernest Geldart · planta","Bungalow drawing -- Floor Plan MET DP804276.jpg"),
 ("commons-hall-parlor","Vivienda americana · hall and parlor","Hall and parlor house floor plan.png"),
 ("commons-fallingwater","Casa de la Cascada · planta","Fallingwaterfloorplan.jpg"),
]
def commons_get(url,limit):
 if urlparse(url).hostname not in {"commons.wikimedia.org","upload.wikimedia.org"}:
  raise ValueError("unexpected source host")
 req=urllib.request.Request(url,headers={"User-Agent":"BlacklineCADReferenceLibrary/1.0 (https://blackline-cad.org/)"})
 with urllib.request.urlopen(req,timeout=30) as response:
  if urlparse(response.geturl()).hostname not in {"commons.wikimedia.org","upload.wikimedia.org"}: raise ValueError("unexpected redirect")
  data=response.read(limit+1)
 if len(data)>limit: raise ValueError("file too large")
 return data
def plain(value):
 return unescape(re.sub(r"<[^>]*>"," ",value)).strip()
for ident,title,filename in RASTER_SEEDS:
 try:
  old=byid.get(ident)
  if old and all((ROOT/old[k]).is_file() for k in ("original","thumb")): continue
  query=urlencode({"action":"query","titles":"File:"+filename,"prop":"imageinfo","iiprop":"url|mime|extmetadata","format":"json","formatversion":2})
  result=json.loads(commons_get("https://commons.wikimedia.org/w/api.php?"+query,2_000_000))
  info=result["query"]["pages"][0]["imageinfo"][0]; meta=info["extmetadata"]
  license=plain(meta["LicenseShortName"]["value"])
  if not re.fullmatch(r"CC0(?: 1\.0)?|CC BY(?:-SA)? [\d.]+|Public domain",license,re.I): raise ValueError("license not accepted: "+license)
  if license.startswith("CC0"): license="CC0"
  author=plain(meta.get("Artist",{}).get("value","")) or "Unknown author"
  license_url=meta.get("LicenseUrl",{}).get("value","")
  mime=info["mime"]; ext={"image/jpeg":".jpg","image/png":".png"}.get(mime)
  if not ext: raise ValueError("not JPG or PNG")
  data=commons_get(info["url"],10_000_000)
  folder=ROOT/"house"/"unverified";folder.mkdir(parents=True,exist_ok=True)
  original=folder/(ident+ext); thumb=folder/(ident+"-thumb.png")
  with Image.open(io.BytesIO(data)) as im:
   if im.format not in ("JPEG","PNG") or im.width*im.height>25_000_000: raise ValueError("invalid image dimensions or format")
   im.load();preview=ImageOps.exif_transpose(im).convert("RGB");preview.thumbnail((480,480),Image.Resampling.LANCZOS);preview.save(thumb,optimize=True)
  original.write_bytes(data)
  byid[ident]={"id":ident,"title":title,"area":None,"category":"house","source":info["descriptionurl"],"license":license,"licenseUrl":license_url,"author":author,"original":str(original.relative_to(ROOT)),"thumb":str(thumb.relative_to(ROOT)),"sha256":hashlib.sha256(data).hexdigest(),"previewChanges":"Resized preview only; original unchanged"}
  print("verified raster",ident)
 except Exception as e: print("failed raster",ident,str(e))
index.write_text(json.dumps(list(byid.values()),ensure_ascii=False,indent=2)+"\n")
if not byid: raise SystemExit("No verified external references could be archived")
